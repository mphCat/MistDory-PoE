'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { safeExternalUrl, safeImageUrl } = require('../js/url-policy.js');
const catalog = require('../scripts/catalog-lib.cjs');

test('external links accept canonical HTTPS without changing destinations', () => {
  assert.equal(safeExternalUrl(' HTTPS://Example.COM:443/guide?q=build#section '), 'https://example.com/guide?q=build#section');
  assert.equal(safeExternalUrl('https://docs.google.com/spreadsheets/d/sample/edit?gid=1#gid=1'), 'https://docs.google.com/spreadsheets/d/sample/edit?gid=1#gid=1');
  assert.equal(safeExternalUrl('https://example.com/?q=%C4%91%C3%B3'), 'https://example.com/?q=%C4%91%C3%B3');
});

test('external links reject script, insecure, relative and ambiguous URL forms', () => {
  for (const value of [null, {}, '', '#', '/about.html', '//example.com/path', 'http://example.com', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,unsafe', 'file:///C:/secret', 'blob:https://example.com/id', 'https:example.com', 'https:/example.com', 'https:\\example.com', 'https://']) {
    assert.equal(safeExternalUrl(value), '', String(value));
  }
});

test('external links reject credentials and literal or encoded control characters', () => {
  for (const value of ['https://user:password@example.com', 'https://user@example.com', 'https://@example.com', 'https://example.com/\npath', '\thttps://example.com', 'https://example.com/%0apath', 'https://example.com/?q=%00', 'https://example.com/%5cpath', 'https://example.com/%ZZ']) {
    assert.equal(safeExternalUrl(value), '', JSON.stringify(value));
  }
});

test('images accept HTTPS and local relative assets inside this version', () => {
  for (const value of ['images/avatar.webp', './images/avatar.png', 'assets/fonts/../image.png']) {
    assert.equal(safeImageUrl(value), value.includes('..') ? '' : value, value);
  }
  assert.equal(safeImageUrl('images/avatar%20one.png?v=2#preview'), 'images/avatar%20one.png?v=2#preview');
  assert.equal(safeImageUrl('https://img.youtube.com/vi/bSMMEhPMAy8/hqdefault.jpg'), 'https://img.youtube.com/vi/bSMMEhPMAy8/hqdefault.jpg');
});

test('images reject absolute/scheme-relative paths and encoded traversal', () => {
  for (const value of ['//evil.example/image.png', '/images/avatar.png', '../secret.png', 'images/../../secret.png', 'images/..%2fsecret.png', 'images/%2e%2e/secret.png', 'images/%252e%252e%252fsecret.png', 'images/%25252e%25252e%25252fsecret.png', '%2f%2fevil.example/image.png', 'images\\secret.png', 'images/%5csecret.png', 'https%3a%2f%2fevil.example/image.png', 'images/image%3f/../secret.png', 'images/%00.png', 'data:image/svg+xml,unsafe', 'javascript:alert(1)', 'file:///C:/image.png', '#placeholder', '?image=avatar.png']) {
    assert.equal(safeImageUrl(value), '', value);
  }
});

test('the same policy API is available to browser scripts without CommonJS', () => {
  const sandbox = { window: {}, URL };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'url-policy.js'), 'utf8'), sandbox);
  assert.equal(sandbox.window.MistUrlPolicy.safeExternalUrl('https://example.com'), 'https://example.com/');
  assert.equal(sandbox.window.MistUrlPolicy.safeImageUrl('../image.png'), '');
});

test('both current catalogs retain their valid URLs and public-only verification', () => {
  const original = catalog.readCatalogs();
  const before = JSON.stringify(original);
  const summary = catalog.verifyCatalogs(original);
  assert.deepEqual(summary.map(item => item.realm), ['poe1', 'poe2']);
  assert.equal(JSON.stringify(original), before, 'validation must not mutate source catalogs');
});

for (const [name, mutate, expected] of [
  ['Discord', data => { data.meta.mainDiscordUrl = 'javascript:alert(1)'; }, /unsafe mainDiscordUrl/],
  ['guide', data => { data.guideRows.gc2.rows[0].url = 'data:text/html,unsafe'; }, /unsafe curated guide URL/],
  ['unavailable guide', data => { data.guideRows.gc1.rows[0] = { label: 'Pending', available: false, url: 'javascript:alert(1)' }; }, /unsafe curated guide URL/],
  ['card', data => { data.cards[0].url = 'http://www.youtube.com/watch?v=' + data.cards[0].id; }, /unsafe video URL/],
  ['image', data => { data.cards[0].image = '../secret.png'; }, /unsafe image URL/]
]) {
  test('offline catalog validation rejects an unsafe ' + name + ' destination', () => {
    const catalogs = catalog.readCatalogs();
    mutate(catalogs.poe1);
    assert.throws(() => catalog.verifyCatalogs(catalogs), expected);
  });
}

test('catalog placeholders remain valid and do not become clickable URLs', () => {
  const catalogs = catalog.readCatalogs();
  catalogs.poe1.meta.cowbDiscordUrl = '#';
  catalogs.poe1.guideRows.gc1.rows.push({ label: 'Pending', url: '', available: false });
  catalogs.poe1.cards[0].image = '#';
  assert.doesNotThrow(() => catalog.verifyCatalogs(catalogs));
  assert.equal(safeExternalUrl('#'), '');
  assert.equal(safeImageUrl('#'), '');
});
