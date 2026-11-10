'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const urlPolicy = require('../js/url-policy.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHANNEL_ID = 'UCGoxZMQWwjm3a77wH3nz3PA';
const REALMS = {
  poe1: { label: 'PoE 1', playlistId: 'PLlj4MOKpBOsb-ZAzTmHLpCap5m_mnMeht', title: 'POE' },
  poe2: { label: 'PoE 2', playlistId: 'PLlj4MOKpBOsZ38hhrZ1vGERMbzF3TaZYx', title: 'PoE2' }
};
const VALID_ID = /^[A-Za-z0-9_-]{11}$/;

function videoId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    let id;
    if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) {
      id = url.searchParams.get('v');
      if (!id && /^\/(?:shorts|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    return VALID_ID.test(id || '') ? id : null;
  } catch { return null; }
}

function watchUrl(id) {
  assert.match(id, VALID_ID);
  return 'https://www.youtube.com/watch?v=' + id;
}

function dateIsValid(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value));
}

function jsonObjectAt(text, start) {
  while (/\s/.test(text[start] || '') && start < text.length) start++;
  if (text[start] !== '{') return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('Incomplete YouTube JSON object');
}

function initialJson(html, name) {
  const match = new RegExp('(?:var\\s+)?' + name + '\\s*=\\s*').exec(html);
  return match ? jsonObjectAt(html, match.index + match[0].length) : null;
}

function clientContext(html) {
  const config = {};
  const matcher = /ytcfg\.set\s*\(\s*/g;
  for (let match; (match = matcher.exec(html));) {
    try {
      const value = jsonObjectAt(html, match.index + match[0].length);
      if (value) Object.assign(config, value);
    } catch (error) {
      // Some unrelated timing settings use JavaScript single quotes. Never evaluate them.
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  const context = config.INNERTUBE_CONTEXT;
  const version = context?.client?.clientVersion || config.INNERTUBE_CLIENT_VERSION;
  if (!version) throw new Error('YouTube did not supply its public client context');
  return { client: { ...(context?.client || {}), clientName: 'WEB', clientVersion: version, hl: 'en' } };
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  if (visitor(node) === false) return;
  for (const value of Object.values(node)) walk(value, visitor);
}

function firstNode(node, predicate) {
  let found;
  walk(node, value => {
    if (found) return false;
    if (predicate(value)) { found = value; return false; }
  });
  return found;
}

function textValue(node) {
  if (typeof node === 'string') return node;
  if (node?.simpleText) return node.simpleText;
  if (node?.content) return node.content;
  return Array.isArray(node?.runs) ? node.runs.map(run => run.text || '').join('') : '';
}

function parsePlaylistItems(scope, playlistId, offset = 0) {
  const entries = [];
  const tokens = new Set();
  function add(row, endpoint, title, position) {
    const id = row.videoId || endpoint?.videoId;
    if (!VALID_ID.test(id || '')) return;
    if (endpoint?.playlistId && endpoint.playlistId !== playlistId) return;
    entries.push({ id, title: title || id, playlistId, playlistPosition: position || offset + entries.length + 1 });
  }
  walk(scope, node => {
    if (node.playlistVideoRenderer) {
      const row = node.playlistVideoRenderer;
      const endpoint = row.navigationEndpoint?.watchEndpoint;
      const index = Number(textValue(row.index));
      const position = Number.isSafeInteger(index) && index > 0 ? index : (Number.isSafeInteger(endpoint?.index) ? endpoint.index + 1 : null);
      add(row, endpoint, textValue(row.title), position);
      return false;
    }
    if (node.lockupViewModel) {
      const row = node.lockupViewModel;
      if (row.contentType && row.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return false;
      const command = firstNode(row, value => value.watchEndpoint?.playlistId === playlistId && VALID_ID.test(value.watchEndpoint.videoId || ''));
      if (command) {
        const endpoint = command.watchEndpoint;
        add({}, endpoint, textValue(row.metadata?.lockupMetadataViewModel?.title), Number.isSafeInteger(endpoint.index) ? endpoint.index + 1 : null);
      }
      return false;
    }
    const continuation = node.continuationItemRenderer || node.continuationItemViewModel;
    if (continuation) {
      walk(continuation, value => { if (typeof value.continuationCommand?.token === 'string') tokens.add(value.continuationCommand.token); });
      return false;
    }
    if (typeof node.nextContinuationData?.continuation === 'string') tokens.add(node.nextContinuationData.continuation);
  });
  return { entries, tokens: [...tokens] };
}

function parsePlaylistPage(html, realm) {
  const data = initialJson(html, 'ytInitialData');
  if (!data || data.error) throw new Error(realm + ': missing playlist page data');
  const source = REALMS[realm];
  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || data.contents?.singleColumnBrowseResultsRenderer?.tabs;
  const tab = tabs?.find(item => item.tabRenderer?.selected)?.tabRenderer || tabs?.find(item => item.tabRenderer?.content)?.tabRenderer;
  if (!tab?.content) throw new Error(realm + ': unsupported playlist layout; existing data was not changed');
  const identityScope = [data.header, data.sidebar];
  if (!firstNode(identityScope, value => value.browseEndpoint?.browseId === CHANNEL_ID)) {
    throw new Error(realm + ': playlist ownership could not be verified');
  }
  let reportedCount = null;
  walk(identityScope, value => {
    for (const field of ['text', 'content', 'simpleText']) {
      const match = /^(\d[\d,]*) videos?$/i.exec(textValue(value[field]).trim());
      if (match && reportedCount === null) reportedCount = Number(match[1].replaceAll(',', ''));
    }
  });
  if (!Number.isSafeInteger(reportedCount) || reportedCount < 0) throw new Error(realm + ': playlist count is unavailable; completeness cannot be proven');
  let hiddenCount = 0;
  let unnumberedHiddenAlert = false;
  for (const alert of data.alerts || []) {
    const text = textValue((alert.alertRenderer || alert.alertWithButtonRenderer)?.text);
    const match = /([\d,]+) unavailable videos? (?:are|is) hidden/i.exec(text);
    if (match) hiddenCount = Math.max(hiddenCount, Number(match[1].replaceAll(',', '')));
    else if (/unavailable.*hidden/i.test(text)) unnumberedHiddenAlert = true;
  }
  if (unnumberedHiddenAlert) throw new Error(realm + ': hidden-video count is ambiguous');
  const parsed = parsePlaylistItems(tab.content, source.playlistId);
  return {
    ...parsed, reportedCount, hiddenCount,
    title: data.metadata?.playlistMetadata?.title || data.header?.pageHeaderRenderer?.pageTitle || source.title,
    context: parsed.tokens.length ? clientContext(html) : null
  };
}

function parseContinuation(data, playlistId, offset) {
  if (!data || data.error) throw new Error('YouTube continuation returned an error');
  const scopes = [];
  for (const action of [...(data.onResponseReceivedActions || []), ...(data.onResponseReceivedCommands || [])]) {
    if (action.appendContinuationItemsAction) scopes.push(action.appendContinuationItemsAction.continuationItems);
    if (action.reloadContinuationItemsCommand) scopes.push(action.reloadContinuationItemsCommand.continuationItems);
  }
  for (const value of Object.values(data.continuationContents || {})) scopes.push(value);
  // A context-only response is the terminal recommendation request seen after a complete playlist.
  if (!scopes.length && !data.responseContext) throw new Error('Unsupported continuation response');
  return parsePlaylistItems(scopes, playlistId, offset);
}

function durationText(seconds) {
  if (!/^\d+$/.test(String(seconds ?? ''))) return '';
  const value = Number(seconds);
  if (!Number.isSafeInteger(value)) return '';
  const sec = String(value % 60).padStart(2, '0');
  const min = Math.floor(value / 60) % 60;
  return value >= 3600 ? Math.floor(value / 3600) + ':' + String(min).padStart(2, '0') + ':' + sec : Math.floor(value / 60) + ':' + sec;
}

function parseWatchPage(html, httpStatus, id) {
  assert.match(id, VALID_ID);
  const player = initialJson(html, 'ytInitialPlayerResponse');
  const details = player?.videoDetails;
  const microformat = player?.microformat?.playerMicroformatRenderer;
  const playable = player?.playabilityStatus;
  const channelId = microformat?.ownerChannelId || details?.channelId || null;
  const conflictingOwner = microformat?.ownerChannelId && details?.channelId && microformat.ownerChannelId !== details.channelId;
  if (details?.videoId && details.videoId !== id) throw new Error('Watch response has a different video ID');
  let status = 'unverified';
  if (httpStatus !== 200) status = 'unverified';
  else if (details?.isPrivate === true || /private video/i.test(playable?.reason || '')) status = 'private';
  else if (microformat?.isUnlisted === true) status = 'unlisted';
  else if (playable?.status === 'UNPLAYABLE' || playable?.status === 'ERROR') status = 'unavailable';
  else if (conflictingOwner) status = 'unverified';
  else if (channelId && channelId !== CHANNEL_ID) status = 'foreign';
  else if (microformat?.isUnlisted === false && details?.isPrivate === false && playable?.status === 'OK' && channelId === CHANNEL_ID && details?.videoId === id) status = 'public';
  const rawCount = details?.viewCount;
  const viewCount = typeof rawCount === 'string' && /^\d+$/.test(rawCount) && Number.isSafeInteger(Number(rawCount)) ? Number(rawCount) : null;
  const publishDate = microformat?.publishDate;
  const publishedAt = dateIsValid(publishDate) ? (publishDate.includes('T') ? new Date(publishDate).toISOString() : publishDate) : null;
  return {
    id, status, channelId, title: details?.title || '', viewCount, publishedAt,
    duration: durationText(details?.lengthSeconds), checkedAt: new Date().toISOString(),
    verification: { isUnlisted: microformat?.isUnlisted ?? null, isPrivate: details?.isPrivate ?? null, playabilityStatus: playable?.status || null, channelId, videoId: details?.videoId || null }
  };
}

function assertPublicProof(item, id) {
  assert.equal(item?.isUnlisted, false, id + ': unlisted state is not explicitly false');
  assert.equal(item?.isPrivate, false, id + ': private state is not explicitly false');
  assert.equal(item?.playabilityStatus, 'OK', id + ': video is not playable');
  assert.equal(item?.channelId, CHANNEL_ID, id + ': wrong channel');
  assert.equal(item?.videoId, id, id + ': mismatched video ID');
}

function catalogFilename(realm) {
  assert.ok(REALMS[realm], 'Unknown realm');
  return path.join(PROJECT_ROOT, 'data', realm + '.json');
}

function readCatalogs() {
  return Object.fromEntries(Object.keys(REALMS).map(realm => [realm, JSON.parse(fs.readFileSync(catalogFilename(realm), 'utf8'))]));
}

function verifyCatalogs(catalogs, { requireRefresh = false, maxAgeHours = 24 } = {}) {
  const allIds = new Set();
  const summary = [];
  for (const [realm, config] of Object.entries(REALMS)) {
    const data = catalogs[realm];
    assert.ok(Array.isArray(data?.cards), realm + ': missing cards');
    assert.equal(data.source?.channelId, CHANNEL_ID, realm + ': unexpected channel');
    assert.equal(data.source?.playlistId, config.playlistId, realm + ': unexpected playlist');
    assert.equal(data.source?.visibilityPolicy, 'public-only', realm + ': public-only policy missing');
    assert.equal(data.source.publicVideoCount, data.cards.length, realm + ': incorrect public count');
    assert.equal(data.meta?.stats?.[2], String(data.cards.length), realm + ': incorrect displayed count');
    const placeholder = value => typeof value === 'string' && (!value.trim() || value.trim() === '#');
    for (const key of ['mainDiscordUrl', 'cowbDiscordUrl']) {
      assert.ok(placeholder(data.meta?.[key]) || urlPolicy.safeExternalUrl(data.meta?.[key]), realm + ': unsafe ' + key);
    }
    let previousPosition = -1;
    const cardIds = new Set();
    for (const card of data.cards) {
      assert.match(card.id, VALID_ID);
      assert.ok(urlPolicy.safeExternalUrl(card.url), realm + ': unsafe video URL');
      assert.equal(videoId(card.url), card.id, realm + ': bad video URL');
      if (card.image != null) assert.ok(placeholder(card.image) || urlPolicy.safeImageUrl(card.image), card.id + ': unsafe image URL');
      assert.equal(card.privacyStatus, 'public', card.id + ': not public');
      assert.ok(dateIsValid(card.privacyVerifiedAt), card.id + ': missing visibility timestamp');
      assert.ok(typeof card.title === 'string' && card.title.trim(), card.id + ': missing title');
      assert.ok(typeof card.desc === 'string' && Array.isArray(card.tags), card.id + ': invalid searchable metadata');
      assert.ok(['VIDEO', 'BUILD', 'CRAFTING'].includes(card.type), card.id + ': unsupported type');
      assert.ok(Number.isSafeInteger(card.viewCount) && card.viewCount >= 0, card.id + ': exact view count is missing');
      assert.ok(dateIsValid(card.publishedAt), card.id + ': publication date is missing');
      assert.ok(Number.isSafeInteger(card.playlistPosition) && card.playlistPosition >= previousPosition, card.id + ': playlist ordering changed');
      previousPosition = card.playlistPosition;
      assert.ok(!allIds.has(card.id), card.id + ': duplicate or cross-realm video');
      allIds.add(card.id); cardIds.add(card.id);
      if (card.publicVerification || requireRefresh) assertPublicProof(card.publicVerification, card.id);
    }
    for (const key of ['gc1', 'gc2', 'gc3', 'gc4']) {
      const group = data.guideRows?.[key];
      assert.ok(group && typeof group.title === 'string' && group.title.trim() && Array.isArray(group.rows), realm + ': curated guide group ' + key + ' is missing or invalid');
    }
    let auxiliaryLinks = 0;
    for (const group of Object.values(data.guideRows)) {
      assert.ok(Array.isArray(group.rows), realm + ': invalid guide rows');
      for (const row of group.rows) {
        assert.ok(row && typeof row.label === 'string' && typeof row.url === 'string', realm + ': invalid curated guide row');
        assert.ok(placeholder(row.url) || urlPolicy.safeExternalUrl(row.url), realm + ': unsafe curated guide URL');
        const id = videoId(row.url);
        if (!id) continue;
        assert.equal(row.privacyStatus, 'public', id + ': guide link is not public');
        assert.ok(dateIsValid(row.privacyVerifiedAt), id + ': guide visibility timestamp missing');
        if (row.publicVerification || requireRefresh) assertPublicProof(row.publicVerification, id);
        if (!cardIds.has(id)) auxiliaryLinks++;
      }
    }
    if (data.cards.length) assert.ok(cardIds.has(data.meta?.ytId), realm + ': featured video is not in public catalog');
    else assert.equal(data.meta?.ytId, '', realm + ': empty catalog still embeds a video');
    if (requireRefresh) {
      const refresh = data.source.lastRefresh;
      assert.equal(refresh?.complete, true, realm + ': no complete release refresh');
      assert.equal(refresh?.publicVideoListComplete, true, realm + ': playlist was not fully checked');
      assert.ok(dateIsValid(data.source.refreshedAt), realm + ': refresh timestamp missing');
      assert.equal(refresh.completedAt, data.source.refreshedAt, realm + ': refresh timestamps disagree');
      assert.equal(data.source.visibilityCheckedAt, refresh.completedAt, realm + ': visibility time differs from refresh');
      assert.equal(data.source.metricsCheckedAt, refresh.completedAt, realm + ': metrics time differs from refresh');
      assert.equal(data.source.metricsVideoCount, data.cards.length, realm + ': metric coverage differs from cards');
      assert.equal(refresh.publicVideoCount, data.cards.length, realm + ': refresh public count differs from cards');
      assert.ok(Number.isSafeInteger(refresh.reportedPlaylistCount) && Number.isSafeInteger(refresh.visiblePlaylistOccurrences) && Number.isSafeInteger(refresh.hiddenUnavailableCount), realm + ': playlist completeness counts missing');
      assert.equal(refresh.visiblePlaylistOccurrences + refresh.hiddenUnavailableCount, refresh.reportedPlaylistCount, realm + ': playlist counts do not reconcile');
      assert.ok(dateIsValid(refresh.startedAt) && Date.parse(refresh.startedAt) <= Date.parse(refresh.completedAt), realm + ': invalid refresh interval');
      const age = Date.now() - Date.parse(refresh.completedAt);
      assert.ok(age >= -60000 && age <= maxAgeHours * 3600000, realm + ': refresh is stale; run refresh-videos.cjs again');
      for (const item of [...data.cards, ...Object.values(data.guideRows).flatMap(group => group.rows).filter(row => videoId(row.url))]) {
        assert.ok(Date.parse(item.privacyVerifiedAt) >= Date.parse(refresh.startedAt) - 1000 && Date.parse(item.privacyVerifiedAt) <= Date.parse(refresh.completedAt) + 1000, realm + ': stale per-video verification');
      }
      for (const card of data.cards) assert.equal(card.metricsCheckedAt, card.privacyVerifiedAt, card.id + ': metric audit differs from public audit');
    }
    summary.push({ realm, publicVideos: data.cards.length, auxiliaryLinks, refreshedAt: data.source.refreshedAt || data.source.metricsCheckedAt || data.source.visibilityCheckedAt });
  }
  return summary;
}

module.exports = { PROJECT_ROOT, CHANNEL_ID, REALMS, VALID_ID, videoId, watchUrl, dateIsValid, initialJson, clientContext, parsePlaylistItems, parsePlaylistPage, parseContinuation, parseWatchPage, assertPublicProof, catalogFilename, readCatalogs, verifyCatalogs };
