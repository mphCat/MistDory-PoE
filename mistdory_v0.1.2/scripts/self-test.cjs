'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const lib = require('./catalog-lib.cjs');
const workflow = require('./refresh-videos.cjs');

const ID = 'bSMMEhPMAy8';
function player(overrides = {}) {
  const value = {
    playabilityStatus: { status: 'OK' },
    videoDetails: { videoId: ID, channelId: lib.CHANNEL_ID, isPrivate: false, title: 'PoE 3.29 Sample', viewCount: '10476', lengthSeconds: '428' },
    microformat: { playerMicroformatRenderer: { ownerChannelId: lib.CHANNEL_ID, isUnlisted: false, publishDate: '2026-08-09T11:36:43-07:00' } }
  };
  overrides(value);
  return '<script>var ytInitialPlayerResponse = ' + JSON.stringify(value) + ';</script>';
}
function playlistHtml(realm, visible = 1, count = 1) {
  const playlistId = lib.REALMS[realm].playlistId;
  const value = {
    header: { owner: { browseEndpoint: { browseId: lib.CHANNEL_ID } }, stats: { simpleText: count + ' videos' } },
    contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, content: { playlistVideoListRenderer: { contents: visible ? [{ playlistVideoRenderer: { videoId: ID, index: { simpleText: '1' }, title: { simpleText: 'Sample' }, navigationEndpoint: { watchEndpoint: { videoId: ID, playlistId, index: 0 } } } }] : [] } } } }] } },
    // Recommended videos must never become playlist candidates.
    sidebar: { recommended: { playlistVideoRenderer: { videoId: 'Y33s-eQPEqA' } } }
  };
  return '<script>var ytInitialData = ' + JSON.stringify(value) + ';</script>';
}

async function main() {
  assert.equal(lib.parseWatchPage(player(() => {}), 200, ID).status, 'public');
  assert.equal(lib.parseWatchPage(player(value => { value.microformat.playerMicroformatRenderer.isUnlisted = true; }), 200, ID).status, 'unlisted');
  assert.equal(lib.parseWatchPage(player(value => { delete value.microformat.playerMicroformatRenderer.isUnlisted; }), 200, ID).status, 'unverified');
  assert.equal(lib.parseWatchPage(player(value => { delete value.videoDetails.isPrivate; }), 200, ID).status, 'unverified');
  assert.equal(lib.parseWatchPage(player(value => { value.videoDetails.channelId = 'different-owner'; }), 200, ID).status, 'unverified');
  assert.equal(lib.parseWatchPage(player(value => { value.playabilityStatus = { status: 'LOGIN_REQUIRED' }; }), 200, ID).status, 'unverified');
  assert.equal(lib.parseWatchPage(player(() => {}), 503, ID).status, 'unverified');
  assert.equal(lib.parseWatchPage(player(value => { value.playabilityStatus = { status: 'ERROR', reason: 'Private video' }; }), 200, ID).status, 'private');
  assert.equal(lib.parseWatchPage(player(value => { value.videoDetails.viewCount = '10K'; }), 200, ID).viewCount, null);
  assert.equal(lib.parseWatchPage(player(() => {}), 200, ID).publishedAt, '2026-08-09T18:36:43.000Z');
  assert.equal(lib.parsePlaylistPage(playlistHtml('poe1'), 'poe1').entries.length, 1);
  await assert.rejects(workflow.loadPlaylist('poe1', async () => ({ status: 200, text: playlistHtml('poe1', 1, 2) })), /incomplete playlist/);
  const sourceBefore = Object.fromEntries(Object.keys(lib.REALMS).map(realm => [realm, fs.readFileSync(lib.catalogFilename(realm))]));
  await assert.rejects(workflow.refresh({ dryRun: true, fetcher: async () => { throw new Error('simulated network failure'); } }), /simulated network failure/);
  for (const realm of Object.keys(lib.REALMS)) assert.ok(sourceBefore[realm].equals(fs.readFileSync(lib.catalogFilename(realm))), 'Failure changed catalog');
  // Exercise failure after the first replacement using disposable files only.
  const tempRoot = fs.realpathSync(os.tmpdir());
  const transactionDir = fs.mkdtempSync(path.join(tempRoot, 'mistdory-transaction-test-'));
  const originalFilename = lib.catalogFilename;
  const originalRename = fs.renameSync;
  try {
    lib.catalogFilename = realm => path.join(transactionDir, realm + '.json');
    const before = {};
    for (const realm of Object.keys(lib.REALMS)) {
      before[realm] = Buffer.from(JSON.stringify({ original: realm }));
      fs.writeFileSync(lib.catalogFilename(realm), before[realm]);
    }
    let renames = 0;
    fs.renameSync = (...args) => { if (++renames === 2) throw new Error('simulated replacement failure'); return originalRename(...args); };
    assert.throws(() => workflow.writeTransaction({ poe1: { next: true }, poe2: { next: true } }, before), /simulated replacement failure/);
    for (const realm of Object.keys(lib.REALMS)) assert.ok(before[realm].equals(fs.readFileSync(lib.catalogFilename(realm))), 'Rollback did not restore original');
    fs.renameSync = originalRename;
    fs.writeFileSync(lib.catalogFilename('poe2'), 'concurrent edit');
    assert.throws(() => workflow.writeTransaction({ poe1: {}, poe2: {} }, before), /catalog changed during refresh/);
    assert.ok(before.poe1.equals(fs.readFileSync(lib.catalogFilename('poe1'))), 'Drift check overwrote first catalog');
    assert.equal(fs.readFileSync(lib.catalogFilename('poe2'), 'utf8'), 'concurrent edit');
  } finally {
    fs.renameSync = originalRename; lib.catalogFilename = originalFilename;
    const relative = path.relative(tempRoot, path.resolve(transactionDir));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(transactionDir).startsWith('mistdory-transaction-test-'));
    fs.rmSync(transactionDir, { recursive: true });
  }
  lib.verifyCatalogs(lib.readCatalogs());
  const noProof = lib.readCatalogs();
  delete noProof.poe1.cards[0].publicVerification;
  assert.throws(() => lib.verifyCatalogs(noProof, { requireRefresh: true }), /unlisted state is not explicitly false/);
  const fixturesIndex = process.argv.indexOf('--fixtures');
  if (fixturesIndex >= 0) {
    const fixtureDir = process.argv[fixturesIndex + 1];
    assert.ok(fixtureDir, '--fixtures requires an existing fixture directory');
    for (const realm of Object.keys(lib.REALMS)) {
      const parsed = lib.parsePlaylistPage(fs.readFileSync(path.join(fixtureDir, 'mistdory-playlist-' + realm + '.html'), 'utf8'), realm);
      assert.equal(parsed.entries.length + parsed.hiddenCount, parsed.reportedCount);
      console.log('Cached ' + realm + ': ' + parsed.entries.length + ' visible / ' + parsed.reportedCount + ' total');
    }
    const parsed = lib.parseWatchPage(fs.readFileSync(path.join(fixtureDir, 'mistdory-poe1-privacy-' + ID + '.html'), 'utf8'), 200, ID);
    assert.equal(parsed.status, 'public'); assert.ok(Number.isSafeInteger(parsed.viewCount));
    const auditResults = Object.keys(lib.REALMS).flatMap(realm => JSON.parse(fs.readFileSync(path.join(fixtureDir, 'mistdory-' + realm + '-public-audit.json'), 'utf8')).results);
    const audit = new Map(auditResults.map(item => [item.videoId, item]));
    const metrics = new Map(JSON.parse(fs.readFileSync(path.join(fixtureDir, 'mistdory-v52-video-metadata.json'), 'utf8')).results.map(item => [item.id, item]));
    const dryRun = await workflow.refresh({ dryRun: true, fetcher: async url => {
      const target = new URL(url);
      if (target.pathname === '/playlist') {
        const realm = Object.keys(lib.REALMS).find(key => lib.REALMS[key].playlistId === target.searchParams.get('list'));
        assert.ok(realm, 'Unexpected playlist request');
        return { status: 200, text: fs.readFileSync(path.join(fixtureDir, 'mistdory-playlist-' + realm + '.html'), 'utf8') };
      }
      const id = target.searchParams.get('v');
      const record = audit.get(id); const metric = metrics.get(id);
      assert.ok(record, 'Missing offline watch fixture');
      const evidence = record.evidence;
      const response = {
        playabilityStatus: { status: evidence.playabilityStatus, reason: evidence.playabilityReason },
        videoDetails: { videoId: evidence.playerVideoId, channelId: evidence.ownerChannelId || evidence.channelId, title: metric?.title || evidence.playerTitle || record.title, isPrivate: evidence.isPrivate, viewCount: String(metric?.views ?? 0), lengthSeconds: '0' },
        microformat: { playerMicroformatRenderer: { ownerChannelId: evidence.ownerChannelId || evidence.channelId, isUnlisted: evidence.isUnlisted, publishDate: metric?.publishedAt || evidence.publishDate } }
      };
      return { status: evidence.httpStatus, text: '<script>var ytInitialPlayerResponse = ' + JSON.stringify(response) + ';</script>' };
    } });
    assert.equal(dryRun.catalogs.poe1.cards.length, 34);
    assert.equal(dryRun.catalogs.poe2.cards.length, 56);
    for (const realm of Object.keys(lib.REALMS)) {
      assert.ok(sourceBefore[realm].equals(fs.readFileSync(lib.catalogFilename(realm))), 'Dry-run wrote a catalog');
      assert.deepEqual(dryRun.catalogs[realm].guideRows.gc2, lib.readCatalogs()[realm].guideRows.gc2, 'Manual Document links changed');
    }
  }
  console.log('Passed: explicit public-state proof, unlisted/private rejection, exact metadata, playlist scoping, incomplete/failure safeguards, current offline catalogs. No network or catalog writes.');
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
