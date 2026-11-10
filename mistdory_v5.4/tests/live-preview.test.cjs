'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { previewPort, developmentHtml, createPreviewMiddleware, isAllowedUpgrade, startPreview } = require('../scripts/preview-live.cjs');
const tempRoot = fs.realpathSync(os.tmpdir());
const fixture = fs.mkdtempSync(path.join(tempRoot, 'mistdory-live-preview-test-'));
const sourceHtml = '<!doctype html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; connect-src \'self\'; font-src \'self\';"></head><body><h1>Preview fixture</h1></body>';
for (const name of ['index.html', 'videos.html', 'about.html', 'font-preview.html']) fs.writeFileSync(path.join(fixture, name), sourceHtml);

test.after(() => {
  const realFixture = fs.realpathSync(fixture);
  assert.equal(path.dirname(realFixture).toLowerCase(), tempRoot.toLowerCase());
  assert.ok(path.basename(realFixture).startsWith('mistdory-live-preview-test-'));
  fs.rmSync(realFixture, { recursive: true });
});

function request(url, { method = 'GET', host = '127.0.0.1:8123', root = fixture } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = { statusCode: 200, setHeader(name, value) { headers[name.toLowerCase()] = value; },
      end(body) { resolve({ status: this.statusCode, headers, body: body || '', next: false }); } };
    try { createPreviewMiddleware({ root, port: 8123 })({ url, method, headers: { host } }, res,
      () => resolve({ next: true, headers })); } catch (error) { reject(error); }
  });
}

test('development HTML widens only connect-src and uses an external reload script', () => {
  const html = developmentHtml(sourceHtml, 8123);
  assert.ok(html.includes("script-src 'self';"));
  assert.ok(html.includes("connect-src 'self' ws://127.0.0.1:8123;"));
  assert.ok(html.includes("font-src 'self';"));
  assert.ok(html.includes('src="/__mistdory_live_reload__.js"'));
  assert.ok(html.includes('data-websocket-url="ws://127.0.0.1:8123/__mistdory_live_reload__/ws"'));
  assert.ok(!html.includes('unsafe-inline'));
  assert.ok(!html.includes('<script>'));
});

test('all four pages are transformed as response copies without changing disk files', async () => {
  for (const name of ['index.html', 'videos.html', 'about.html', 'font-preview.html']) {
    const response = await request('/' + name + '?lang=vi');
    assert.equal(response.status, 200);
    assert.ok(response.body.includes('/__mistdory_live_reload__.js'));
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(fs.readFileSync(path.join(fixture, name), 'utf8'), sourceHtml);
  }
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/index.html', { host: 'localhost:8123' })).status, 200);
});

test('reload client is served as JavaScript and HEAD never returns a body', async () => {
  const client = await request('/__mistdory_live_reload__.js');
  assert.equal(client.status, 200);
  assert.match(client.headers['content-type'], /^text\/javascript/);
  assert.ok(client.body.includes('new WebSocket'));
  assert.ok(!/sessionStorage|localStorage|eval\(/.test(client.body));
  const head = await request('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(head.headers['content-length'] > 0);
});

test('unexpected hosts and write methods are rejected', async () => {
  for (const host of ['attacker.invalid:8123', '127.0.0.1:9000', '', 'localhost.evil:8123']) {
    assert.equal((await request('/', { host })).status, 400);
  }
  const response = await request('/', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
});

test('malformed, traversal and absolute request targets fail safely', async () => {
  for (const url of ['/%00', '/%', '/../index.html', '/%2e%2e/index.html', '/..%5cindex.html',
    '/%252e%252e/index.html', '//attacker.invalid/index.html', 'http://attacker.invalid/index.html']) {
    assert.equal((await request(url)).status, 400, url);
  }
});

test('ordinary assets pass to Live Server while missing CSP fails closed for pages', async () => {
  assert.equal((await request('/css/style.css')).next, true);
  assert.equal((await request('/data/poe1.json')).next, true);
  assert.throws(() => developmentHtml('<html><body>No policy</body></html>', 8123), /one CSP/);
  assert.throws(() => developmentHtml(sourceHtml.replace("connect-src 'self';", "connect-src *;"), 8123), /connect-src/);
  assert.throws(() => developmentHtml(sourceHtml.replace('</head>', sourceHtml.match(/<meta[^>]+>/)[0] + '</head>'), 8123), /one CSP/);
});

test('preview ports must identify an exact nonzero listening port', () => {
  for (const value of [0, -1, 65536, NaN, 'bad', 1.5]) assert.throws(() => previewPort(value), /PORT/);
  assert.equal(previewPort('8003'), 8003);
});

test('reload WebSocket upgrades require the intended path and same local page origin', () => {
  const request = { method: 'GET', url: '/__mistdory_live_reload__/ws',
    headers: { host: '127.0.0.1:8123', origin: 'http://127.0.0.1:8123' } };
  assert.equal(isAllowedUpgrade(request, 8123), true);
  assert.equal(isAllowedUpgrade({ ...request, headers: { host: 'localhost:8123', origin: 'http://localhost:8123' } }, 8123), true);
  for (const modified of [
    { ...request, url: '/unrelated' },
    { ...request, url: '/index.html/ws' },
    { ...request, method: 'POST' },
    { ...request, headers: { ...request.headers, origin: 'https://attacker.invalid' } },
    { ...request, headers: { ...request.headers, origin: 'null' } },
    { ...request, headers: { host: request.headers.host } },
    { ...request, headers: { ...request.headers, host: 'attacker.invalid:8123' } }
  ]) assert.equal(isAllowedUpgrade(modified, 8123), false);
});

test('occupied ports shut down the watcher/server without vendor fallback', () => {
  const server = new EventEmitter();
  let fallback = false, closes = 0, shutdowns = 0;
  const failures = [];
  server.close = () => { closes++; };
  server.address = () => null;
  const liveServer = { start() {
    server.on('error', () => { fallback = true; });
    return server;
  }, shutdown() { shutdowns++; } };
  startPreview({ port: 8123, liveServer, onStartupError: error => failures.push(error.message) });
  server.emit('error', Object.assign(new Error('Address in use'), { code: 'EADDRINUSE' }));
  assert.equal(fallback, false);
  assert.equal(closes, 1);
  assert.equal(shutdowns, 1);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /127\.0\.0\.1:8123/);
  assert.match(failures[0], /EADDRINUSE/);
  assert.match(failures[0], /free PORT/);
});

test('unexpected fallback ports or non-loopback listeners are closed', () => {
  for (const bound of [{ address: '127.0.0.1', port: 9123 }, { address: '0.0.0.0', port: 8123 }]) {
    const server = new EventEmitter();
    let closes = 0, shutdowns = 0;
    const failures = [];
    server.address = () => bound;
    server.close = () => { closes++; };
    startPreview({ port: 8123, liveServer: { start: () => server, shutdown: () => { shutdowns++; } },
      onStartupError: error => failures.push(error.message) });
    server.emit('listening');
    assert.equal(closes, 1);
    assert.equal(shutdowns, 1);
    assert.equal(failures.length, 1);
  }
});
