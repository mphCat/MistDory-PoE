'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { parseItems, loadShorts } = require('../scripts/shorts-lib.cjs');
const { CHANNEL_ID } = require('../scripts/catalog-lib.cjs');
const html = contents => '<script>var ytInitialData = ' + JSON.stringify({ metadata: { channelMetadataRenderer: { externalId: CHANNEL_ID } }, contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, content: { richGridRenderer: { contents } } } }] } } }) + ';</script><script>ytcfg.set({"INNERTUBE_CLIENT_VERSION":"test"});</script>';
const endpoint = id => ({ reelWatchEndpoint: { videoId: id } });
const more = { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'next' } } } };
test('Shorts parser ignores unrelated video IDs and sort-chip tokens', () => {
  assert.deepEqual(parseItems([endpoint('PmpImj1uLqU'), { videoId: 'Kz1xk_tOggI' }, { continuationCommand: { token: 'sort' } }]), { ids: ['PmpImj1uLqU'], tokens: [] });
});
test('Shorts loader follows continuation and deduplicates IDs', async () => {
  let calls = 0;
  const ids = await loadShorts(async () => ++calls === 1 ? { status: 200, text: html([endpoint('PmpImj1uLqU'), more]) } : { status: 200, text: JSON.stringify({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [endpoint('PmpImj1uLqU'), endpoint('Kz1xk_tOggI')] } }] }) });
  assert.deepEqual([...ids], ['PmpImj1uLqU', 'Kz1xk_tOggI']); assert.equal(calls, 2);
});
test('Shorts loader rejects unknown layouts and repeated continuation', async () => {
  await assert.rejects(loadShorts(async () => ({ status: 200, text: html([]).replace(CHANNEL_ID, 'foreign') })), /Unexpected Shorts channel/);
  let calls = 0;
  await assert.rejects(loadShorts(async () => ++calls === 1 ? { status: 200, text: html([more]) } : { status: 200, text: JSON.stringify({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [more] } }] }) }), /Incomplete Shorts pagination/);
});
