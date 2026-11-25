'use strict';
const assert = require('node:assert/strict');
const lib = require('./catalog-lib.cjs');
function parseItems(value) {
  const ids = new Set(), tokens = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.reelWatchEndpoint?.videoId) ids.add(node.reelWatchEndpoint.videoId);
    if (node.reelItemRenderer?.videoId) ids.add(node.reelItemRenderer.videoId);
    const token = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (token) tokens.push(token);
    for (const child of Object.values(node)) walk(child);
  }
  walk(value);
  for (const id of ids) assert.match(id, lib.VALID_ID);
  return { ids: [...ids], tokens };
}
async function loadShorts(fetcher) {
  const response = await fetcher('https://www.youtube.com/channel/' + lib.CHANNEL_ID + '/shorts?hl=en');
  assert.equal(response.status, 200, 'Shorts tab unavailable');
  const initial = lib.initialJson(response.text, 'ytInitialData');
  assert.equal(initial?.metadata?.channelMetadataRenderer?.externalId, lib.CHANNEL_ID, 'Unexpected Shorts channel');
  const tab = initial.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(item => item.tabRenderer?.selected)?.tabRenderer;
  assert.ok(tab?.content?.richGridRenderer, 'Unrecognized Shorts tab');
  let parsed = parseItems(tab.content.richGridRenderer.contents);
  const ids = new Set(parsed.ids), seen = new Set();
  while (parsed.tokens.length) {
    assert.equal(parsed.tokens.length, 1, 'Ambiguous Shorts pagination');
    const token = parsed.tokens[0];
    assert.ok(!seen.has(token) && seen.size < 100, 'Incomplete Shorts pagination');
    seen.add(token);
    const next = await fetcher('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { context: lib.clientContext(response.text), continuation: token });
    assert.equal(next.status, 200, 'Shorts continuation unavailable');
    const body = JSON.parse(next.text);
    const actions = body.onResponseReceivedActions || body.onResponseReceivedEndpoints;
    assert.ok(Array.isArray(actions) && actions.some(action => action.appendContinuationItemsAction), 'Unrecognized Shorts continuation');
    parsed = parseItems(actions.map(action => action.appendContinuationItemsAction?.continuationItems || []));
    parsed.ids.forEach(id => ids.add(id));
  }
  return ids;
}
module.exports = { parseItems, loadShorts };
