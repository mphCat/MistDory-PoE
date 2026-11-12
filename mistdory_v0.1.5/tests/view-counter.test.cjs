'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const service = path.resolve(__dirname, '../../services/view-counter');
const backend = import(pathToFileURL(path.join(service, 'worker.mjs')).href);

function database(t) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(fs.readFileSync(path.join(service, 'schema.sql'), 'utf8'));
  t.after(() => sql.close());
  const wrap = (query, values = []) => ({
    query, values,
    bind(...next) { return wrap(query, next); },
    async run() { return sql.prepare(query).run(...values); }
  });
  const db = {
    prepare: query => wrap(query),
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = statements.map(s => ({ results: sql.prepare(s.query).all(...s.values) }));
        sql.exec('COMMIT');
        return results;
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
  return { sql, db };
}

test('counter SQL: first view counts, rapid reloads use a sliding 10-second boundary', async t => {
  const { db } = database(t);
  const { recordView } = await backend;
  assert.equal(await recordView(db, 'visitor-a', 1000), 1);
  assert.equal(await recordView(db, 'visitor-a', 9000), 1);
  assert.equal(await recordView(db, 'visitor-a', 19000), 1, 'exactly 10 seconds is still suppressed');
  assert.equal(await recordView(db, 'visitor-a', 29001), 2, 'more than 10 seconds after preceding request counts');
});

test('counter SQL: different IP hashes and parallel requests retain an accurate shared total', async t => {
  const { db } = database(t);
  const { recordView } = await backend;
  await Promise.all(Array.from({ length: 20 }, () => recordView(db, 'shared-ip', 1000)));
  assert.equal(await recordView(db, 'another-ip', 1000), 2);
  assert.equal(await recordView(db, 'shared-ip', 500), 2, 'out-of-order timestamps never rewind the cooldown');
  assert.equal(await recordView(db, 'shared-ip', 11000), 2);
});

test('counter SQL: expired-hash cleanup and schema reapply preserve the cumulative total', async t => {
  const { sql, db } = database(t);
  const { recordView } = await backend;
  await recordView(db, 'old-hash', 1000);
  sql.prepare('DELETE FROM view_cooldowns WHERE last_seen < ?').run(2000);
  sql.exec(fs.readFileSync(path.join(service, 'schema.sql'), 'utf8'));
  assert.equal(sql.prepare('SELECT total FROM view_totals WHERE id = 1').get().total, 1);
  assert.equal(await recordView(db, 'old-hash', 90000000), 2);
});

test('worker: only the configured origin and POST can count, missing IP fails closed', async t => {
  const { db } = database(t);
  const { default: worker } = await backend;
  const env = { DB: db, IP_HASH_SECRET: 'test-only-secret-32-characters-long', SITE_ORIGIN: 'https://mphcat.github.io' };
  const send = (origin, method, ip) => worker.fetch(new Request('https://counter.example/views', {
    method, headers: { Origin: origin, ...(ip ? { 'CF-Connecting-IP': ip } : {}) }
  }), env);
  assert.equal((await send('https://other.example', 'POST', '203.0.113.1')).status, 403);
  assert.equal((await send(env.SITE_ORIGIN, 'GET', '203.0.113.1')).status, 405);
  assert.equal((await send(env.SITE_ORIGIN, 'OPTIONS')).status, 204);
  assert.equal((await send(env.SITE_ORIGIN, 'POST')).status, 400);
  const response = await send(env.SITE_ORIGIN, 'POST', '203.0.113.1');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { total: 1 });
});

test('worker: stores keyed hashes, never raw IPs or secrets, and errors do not expose details', async t => {
  const { sql, db } = database(t);
  const { default: worker, hashVisitor } = await backend;
  const secret = 'test-only-secret-32-characters-long';
  const ip = '203.0.113.9';
  const request = new Request('https://counter.example/views', { method: 'POST', headers: { Origin: 'https://mphcat.github.io', 'CF-Connecting-IP': ip } });
  await worker.fetch(request, { DB: db, IP_HASH_SECRET: secret });
  const row = sql.prepare('SELECT * FROM view_cooldowns').get();
  assert.equal(row.visitor_hash, await hashVisitor(ip, secret));
  assert.equal(row.visitor_hash.length, 64);
  assert.ok(!JSON.stringify(row).includes(ip));
  assert.notEqual(await hashVisitor(ip, secret + 'different'), row.visitor_hash);
  const response = await worker.fetch(request, { DB: { batch() { throw new Error('private database details'); }, prepare: db.prepare }, IP_HASH_SECRET: secret });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Counter unavailable' });
});

function client({ enabled = true, origin = 'https://mphcat.github.io', pathname = '/MistDory-PoE/', response = { total: 1234 }, failed = false } = {}) {
  const target = { textContent: '' };
  let locale = 'en-GB';
  const listeners = new Map();
  const calls = [];
  const sandbox = {
    document: { getElementById: () => target }, Intl, URL, AbortController, setTimeout, clearTimeout,
    window: {
      location: { origin, pathname },
      MistViewCounterConfig: { endpoint: enabled ? 'https://counter.example' : '', siteOrigin: 'https://mphcat.github.io', sitePath: '/MistDory-PoE/' },
      MistI18n: { getLocale: () => locale },
      addEventListener(name, fn) { listeners.set(name, fn); }
    },
    async fetch(url, options) {
      calls.push({ url, options });
      if (failed) throw new Error('Offline');
      return { ok: true, async json() { return response; } };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../js/view-counter.js'), 'utf8'), sandbox);
  return { target, calls, async settle() { await new Promise(resolve => setImmediate(resolve)); }, language() { locale = 'vi-VN'; listeners.get('mistdory:languagechange')(); } };
}

test('client: one count per load; language changes reformat without another request', async () => {
  const app = client();
  await app.settle();
  assert.equal(app.target.textContent, '1,234');
  assert.equal(app.calls[0].options.method, 'POST');
  assert.equal(app.calls[0].options.credentials, 'omit');
  app.language();
  assert.equal(app.target.textContent, '1.234');
  assert.equal(app.calls.length, 1);
});

test('client: local previews, another project path and unconfigured endpoints never count', async () => {
  for (const config of [{ enabled: false }, { origin: 'http://127.0.0.1:8003' }, { pathname: '/another-site/' }]) {
    const app = client(config);
    await app.settle();
    assert.equal(app.calls.length, 0);
    assert.equal(app.target.textContent, '—');
  }
});

test('client: failures and invalid totals stay neutral; a real zero is displayed', async () => {
  for (const config of [{ failed: true }, { response: { total: -1 } }, { response: { total: '<script>' } }]) {
    const app = client(config);
    await app.settle();
    assert.equal(app.target.textContent, '—');
  }
  const app = client({ response: { total: 0 } });
  await app.settle();
  assert.equal(app.target.textContent, '0');
});