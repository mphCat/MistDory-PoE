'use strict';

// Signed-out YouTube metadata only. A playable video can still be unlisted.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const lib = require('./catalog-lib.cjs');

const MAX_PAGES = 20;
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(['www.youtube.com', 'youtube.com']);

function request(url, body, redirects = 0) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname) || target.username || target.password) throw new Error('Unexpected YouTube request destination');
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = https.request(target, {
      method: payload ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: payload ? 'application/json' : 'text/html',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length, Origin: 'https://www.youtube.com' } : {})
      }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        if (!res.headers.location || redirects >= 3) return finish(new Error('Unexpected YouTube redirect'));
        let next;
        try { next = new URL(res.headers.location, target).href; } catch (error) { return finish(error); }
        request(next, body, redirects + 1).then(value => finish(null, value), finish);
        return;
      }
      const chunks = []; let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { req.destroy(); finish(new Error('YouTube response exceeded size limit')); }
        else chunks.push(chunk);
      });
      res.on('end', () => finish(null, { status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', finish);
      res.on('aborted', () => finish(new Error('YouTube response was interrupted')));
    });
    timer = setTimeout(() => { req.destroy(); finish(new Error('YouTube request timed out')); }, 30000);
    req.on('error', finish);
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchPage(url, body) {
  let failure;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await request(url, body);
      if (result.status === 429 || result.status >= 500) throw new Error('YouTube HTTP ' + result.status);
      return result;
    } catch (error) {
      failure = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 600 * attempt));
    }
  }
  throw failure;
}

async function loadPlaylist(realm, fetcher = fetchPage) {
  const config = lib.REALMS[realm];
  const page = await fetcher('https://www.youtube.com/playlist?list=' + config.playlistId + '&hl=en');
  assert.equal(page.status, 200, realm + ': playlist HTTP ' + page.status);
  const initial = lib.parsePlaylistPage(page.text, realm);
  const observations = new Map();
  const add = entries => {
    for (const entry of entries) observations.set(entry.id + '@' + entry.playlistPosition, entry);
  };
  add(initial.entries);
  let tokens = initial.tokens;
  const usedTokens = new Set();
  let pages = 1;
  while (observations.size + initial.hiddenCount < initial.reportedCount) {
    const token = tokens.find(value => !usedTokens.has(value));
    if (!token || pages >= MAX_PAGES) throw new Error(realm + ': incomplete playlist; catalogs were not changed');
    usedTokens.add(token);
    const response = await fetcher('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { context: initial.context, continuation: token });
    assert.equal(response.status, 200, realm + ': continuation HTTP ' + response.status);
    const parsed = lib.parseContinuation(JSON.parse(response.text), config.playlistId, observations.size);
    add(parsed.entries); tokens = parsed.tokens; pages++;
  }
  assert.equal(observations.size + initial.hiddenCount, initial.reportedCount, realm + ': playlist count did not reconcile');
  const unique = new Map();
  for (const item of [...observations.values()].sort((a, b) => a.playlistPosition - b.playlistPosition)) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return { ...initial, entries: [...unique.values()], visibleOccurrences: observations.size, pages };
}

async function mapLimited(items, workers, callback) {
  let index = 0;
  const results = new Map();
  let failure;
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, async () => {
    while (!failure && index < items.length) {
      const item = items[index++];
      try { results.set(item, await callback(item)); }
      catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
  return results;
}

function auxiliaryIds(catalog) {
  return Object.entries(catalog.guideRows || {}).filter(([key]) => key !== 'gc1').flatMap(([, group]) => group.rows || []).map(row => lib.videoId(row.url)).filter(Boolean);
}

function makeCatalog(realm, old, playlist, results, startedAt, completedAt) {
  const data = structuredClone(old);
  const existing = new Map(old.cards.map(card => [card.id, card]));
  const rejected = {};
  const cards = [];
  for (const entry of playlist.entries) {
    const result = results.get(entry.id);
    assert.ok(result && result.status !== 'unverified', realm + ': unverified playlist video');
    if (result.status !== 'public') { rejected[result.status] = (rejected[result.status] || 0) + 1; continue; }
    assert.ok(result.title.trim() && Number.isSafeInteger(result.viewCount) && lib.dateIsValid(result.publishedAt), realm + ': public video metadata is incomplete');
    const prior = existing.get(entry.id);
    const version = /\b((?:0|3)\.\d+(?:\.\d+)?)\b/.exec(result.title)?.[1] || '';
    cards.push({
      ...(prior || { type: 'VIDEO', ver: version, desc: '', tags: [lib.REALMS[realm].label, ...(version ? [version] : [])], image: '' }),
      id: entry.id, playlistPosition: entry.playlistPosition,
      title: result.title, url: lib.watchUrl(entry.id), duration: result.duration,
      viewCount: result.viewCount, viewCountText: String(result.viewCount), publishedAt: result.publishedAt,
      privacyStatus: 'public', privacyVerifiedAt: result.checkedAt, metricsCheckedAt: result.checkedAt,
      publicVerification: result.verification
    });
  }
  data.cards = cards;
  data.meta.stats[2] = String(cards.length);
  if (!cards.some(card => card.id === data.meta.ytId)) data.meta.ytId = cards[0]?.id || '';
  const featured = cards.find(card => card.id === data.meta.ytId);
  data.meta.ytHint = featured ? 'Featured video — ' + featured.title : '';
  data.guideRows.gc1.rows = cards.map(card => ({ label: card.title, ver: card.ver, btnLabel: 'Watch', url: card.url, privacyStatus: 'public', privacyVerifiedAt: card.privacyVerifiedAt, publicVerification: card.publicVerification }));
  let removedAdditionalVideoLinks = 0;
  for (const [key, group] of Object.entries(data.guideRows)) {
    if (key === 'gc1') continue;
    group.rows = group.rows.filter(row => {
      const id = lib.videoId(row.url);
      if (!id) return true;
      const result = results.get(id);
      assert.ok(result && result.status !== 'unverified', realm + ': unverified auxiliary video');
      if (result.status !== 'public') { removedAdditionalVideoLinks++; return false; }
      row.privacyStatus = 'public'; row.privacyVerifiedAt = result.checkedAt; row.publicVerification = result.verification;
      return true;
    });
  }
  data.source = {
    ...data.source,
    playlistTitle: playlist.title,
    importedAt: data.source.importedAt || completedAt, refreshedAt: completedAt,
    visibilityPolicy: 'public-only', visibilityCheckedAt: completedAt,
    metricsCheckedAt: completedAt, metricsMethod: 'Signed-out watch page videoDetails.viewCount and playerMicroformatRenderer.publishDate',
    metricsSource: 'https://www.youtube.com/watch', metricsVideoCount: cards.length,
    publicVideoCount: cards.length, unavailableVideoCount: playlist.hiddenCount,
    unavailableNotices: playlist.hiddenCount ? [playlist.hiddenCount + ' unavailable videos are hidden'] : [],
    lastVisibilityAudit: {
      method: 'Complete official playlist plus signed-out watch pages; explicit isUnlisted=false, isPrivate=false, expected owner and playable video ID',
      candidateVideoCount: playlist.entries.length, retainedPublicVideoCount: cards.length,
      removedVideoCounts: rejected, removedAdditionalVideoLinks
    },
    lastRefresh: {
      complete: true, publicVideoListComplete: true, startedAt, completedAt,
      reportedPlaylistCount: playlist.reportedCount, visiblePlaylistOccurrences: playlist.visibleOccurrences,
      hiddenUnavailableCount: playlist.hiddenCount, playlistPageCount: playlist.pages,
      verifiedCandidateCount: playlist.entries.length, publicVideoCount: cards.length,
      auxiliaryLinksChecked: new Set(auxiliaryIds(old)).size
    }
  };
  return data;
}

function writeTransaction(catalogs, originalBytes) {
  const token = crypto.randomBytes(8).toString('hex');
  const tempRoot = fs.realpathSync(os.tmpdir());
  const backupRoot = fs.mkdtempSync(path.join(tempRoot, 'mistdory-refresh-'));
  const stages = []; const replaced = [];
  let keepBackup = false;
  try {
    for (const realm of Object.keys(lib.REALMS)) {
      const file = lib.catalogFilename(realm);
      assert.ok(fs.readFileSync(file).equals(originalBytes[realm]), realm + ': catalog changed during refresh; rerun to preserve those edits');
      fs.writeFileSync(path.join(backupRoot, realm + '.json'), originalBytes[realm], { flag: 'wx' });
      const stage = file + '.' + token + '.tmp';
      fs.writeFileSync(stage, JSON.stringify(catalogs[realm], null, 2) + '\n', { flag: 'wx' });
      stages.push({ realm, file, stage });
    }
    // Check both immediately before the first replacement; never overwrite edits observed during the fetch.
    for (const item of stages) assert.ok(fs.readFileSync(item.file).equals(originalBytes[item.realm]), item.realm + ': catalog changed before write');
    for (const item of stages) { fs.renameSync(item.stage, item.file); replaced.push(item); }
  } catch (error) {
    const rollbackErrors = [];
    for (const item of replaced.reverse()) {
      try { fs.copyFileSync(path.join(backupRoot, item.realm + '.json'), item.file); }
      catch (rollbackError) { rollbackErrors.push(rollbackError.message); }
    }
    if (rollbackErrors.length) {
      keepBackup = true;
      throw new Error(error.message + '; rollback failed: ' + rollbackErrors.join('; ') + '. Original catalogs retained in ' + backupRoot);
    }
    throw error;
  } finally {
    for (const item of stages) if (fs.existsSync(item.stage)) fs.unlinkSync(item.stage);
    const absoluteBackup = path.resolve(backupRoot);
    const relative = path.relative(tempRoot, absoluteBackup);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(absoluteBackup).startsWith('mistdory-refresh-'), 'Unsafe temporary cleanup destination');
    if (!keepBackup) fs.rmSync(absoluteBackup, { recursive: true });
  }
}

async function refresh({ dryRun = false, fetcher = fetchPage } = {}) {
  const startedAt = new Date().toISOString();
  const originalBytes = Object.fromEntries(Object.keys(lib.REALMS).map(realm => [realm, fs.readFileSync(lib.catalogFilename(realm))]));
  const old = Object.fromEntries(Object.entries(originalBytes).map(([realm, bytes]) => [realm, JSON.parse(bytes)]));
  // Keep manual guide edits; validate only structural identity before a fresh online audit.
  for (const realm of Object.keys(lib.REALMS)) {
    assert.equal(old[realm].source.channelId, lib.CHANNEL_ID);
    assert.equal(old[realm].source.playlistId, lib.REALMS[realm].playlistId);
  }
  const playlists = {};
  for (const realm of Object.keys(lib.REALMS)) {
    console.log('Reading ' + realm + ' official playlist...');
    playlists[realm] = await loadPlaylist(realm, fetcher);
  }
  const candidates = [...new Set(Object.keys(lib.REALMS).flatMap(realm => [...playlists[realm].entries.map(item => item.id), ...auxiliaryIds(old[realm])]))];
  console.log('Verifying ' + candidates.length + ' distinct signed-out watch pages...');
  const results = await mapLimited(candidates, 3, async id => {
    const response = await fetcher(lib.watchUrl(id) + '&hl=en');
    const result = lib.parseWatchPage(response.text, response.status, id);
    if (result.status === 'unverified') throw new Error('Public visibility could not be explicitly verified for a candidate; catalogs were not changed');
    return result;
  });
  const completedAt = new Date().toISOString();
  const next = Object.fromEntries(Object.keys(lib.REALMS).map(realm => [realm, makeCatalog(realm, old[realm], playlists[realm], results, startedAt, completedAt)]));
  const summary = lib.verifyCatalogs(next, { requireRefresh: true });
  if (!dryRun) writeTransaction(next, originalBytes);
  console.log(JSON.stringify({ dryRun, complete: true, catalogsWritten: !dryRun, completedAt, summary }, null, 2));
  return { catalogs: next, summary };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/refresh-videos.cjs [--dry-run|--check]\nFull public-only YouTube refresh. --check is a networked, no-write dry run.');
  } else if (args.some(arg => !['--dry-run', '--check'].includes(arg))) {
    console.error('Unknown argument; use --help.'); process.exitCode = 1;
  } else {
    refresh({ dryRun: args.includes('--dry-run') || args.includes('--check') }).catch(error => { console.error('Refresh blocked: ' + error.message); process.exitCode = 1; });
  }
}

module.exports = { request, fetchPage, loadPlaylist, mapLimited, auxiliaryIds, makeCatalog, writeTransaction, refresh };
