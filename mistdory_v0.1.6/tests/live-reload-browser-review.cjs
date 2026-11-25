'use strict';

// Verify the real Live Server watcher/socket under the development CSP.
// Only exclusively-created probe files are added, then removed from the version.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const PROJECT_ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const BASE = new URL(process.env.MISTDORY_QA_URL || 'http://127.0.0.1:8005/');
const CHROME = process.env.MISTDORY_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_ROOT = fs.realpathSync(process.env.MISTDORY_QA_TEMP || os.tmpdir());
const RUN_PREFIX = 'mistdory-live-reload-browser-';
const PROBE_PREFIX = 'mistdory-live-reload-probe-';
const HTML_PAGES = ['index.html', 'videos.html', 'about.html', 'font-preview.html'];
const results = [];
const errors = [];
const violations = [];
const sockets = new Map();
const socketFrames = [];
const navigations = [];
const responses = [];
const probes = [];
const sourceHashes = new Map();
let runDir, profile, chrome, browser, page;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function check(name, success, detail = '') {
  results.push({ name, success: Boolean(success), detail });
  process.stdout.write((success ? 'PASS ' : 'FAIL ') + name + (detail ? ': ' + detail : '') + '\n');
}
async function waitFor(predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let failure;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch (error) { failure = error; }
    await sleep(80);
  }
  throw new Error('Timeout waiting for ' + label + (failure ? ': ' + failure.message : ''));
}
class CDP {
  constructor(socket) {
    this.socket = socket; this.sequence = 0; this.pending = new Map(); this.listeners = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = this.pending.get(message.id);
        if (!item) return;
        this.pending.delete(message.id); clearTimeout(item.timer);
        if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params);
      }
    });
    socket.addEventListener('close', () => {
      for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error('CDP closed')); }
      this.pending.clear();
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new CDP(socket);
  }
  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }
  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
async function evaluate(fn, ...args) {
  const expression = '(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')';
  const value = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
  return value.result.value;
}
function hash(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }
function policy(html) {
  const matches = [...html.matchAll(/<meta\b[^>]*>/gi)].filter(match => /http-equiv\s*=\s*(["'])Content-Security-Policy\1/i.test(match[0]));
  if (matches.length !== 1) throw new Error('Expected one CSP meta tag');
  const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i.exec(matches[0][0]);
  if (!content) throw new Error('CSP content missing');
  return Object.fromEntries(content[2].split(';').map(value => value.trim()).filter(Boolean)
    .map(value => { const [name, ...sources] = value.split(/\s+/); return [name.toLowerCase(), sources]; }));
}
function createProbe(extension) {
  const nonce = crypto.randomUUID();
  const basename = PROBE_PREFIX + nonce + extension;
  const filename = path.resolve(PROJECT_ROOT, basename);
  const content = extension === '.css' ? '/* Owned live-reload probe ' + nonce + ' */\n' : 'Owned live-reload probe ' + nonce + '\n';
  if (path.dirname(filename).toLowerCase() !== PROJECT_ROOT.toLowerCase()) throw new Error('Probe escaped project root');
  const descriptor = fs.openSync(filename, 'wx');
  const identity = fs.fstatSync(descriptor);
  probes.push({ filename, basename, content, device: identity.dev, inode: identity.ino });
  try { fs.writeFileSync(descriptor, content); } finally { fs.closeSync(descriptor); }
  return filename;
}

async function launch() {
  runDir = fs.mkdtempSync(path.join(TEMP_ROOT, RUN_PREFIX));
  profile = path.join(runDir, 'chrome-profile'); fs.mkdirSync(profile);
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--remote-allow-origins=*', '--user-data-dir=' + profile, 'about:blank'],
  { windowsHide: true, cwd: TEMP_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
  let endpoint, stderr = '', failure;
  chrome.on('error', error => { failure = error; });
  chrome.stderr.on('data', chunk => {
    stderr = (stderr + chunk.toString()).slice(-12000);
    const found = /DevTools listening on (ws:\/\/\S+)/.exec(stderr); if (found) endpoint = found[1];
  });
  await waitFor(() => {
    if (failure) throw failure;
    if (endpoint) return true;
    const marker = path.join(profile, 'DevToolsActivePort');
    if (!fs.existsSync(marker)) return false;
    const [port, socketPath] = fs.readFileSync(marker, 'utf8').trim().split(/\r?\n/);
    if (port && socketPath) endpoint = 'ws://127.0.0.1:' + port + socketPath;
    return Boolean(endpoint);
  }, 'Chrome endpoint');
  browser = await CDP.connect(endpoint);
  const target = await browser.send('Target.createTarget', { url: 'about:blank' });
  const targets = await fetch('http://127.0.0.1:' + new URL(endpoint).port + '/json/list').then(response => response.json());
  page = await CDP.connect(targets.find(item => item.id === target.targetId).webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Runtime.addBinding', { name: '__mistdoryReportCsp' });
  page.on('Runtime.bindingCalled', event => {
    if (event.name === '__mistdoryReportCsp') violations.push(JSON.parse(event.payload));
  });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: "document.addEventListener('securitypolicyviolation', event => __mistdoryReportCsp(JSON.stringify({directive:event.effectiveDirective,blockedURI:event.blockedURI,url:location.href})));" });
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  page.on('Page.frameNavigated', event => { if (!event.frame.parentId) navigations.push({ url: event.frame.url, at: Date.now() }); });
  page.on('Network.responseReceived', event => responses.push({ url: event.response.url, status: event.response.status }));
  page.on('Network.webSocketCreated', event => sockets.set(event.requestId, { url: event.url, status: null }));
  page.on('Network.webSocketHandshakeResponseReceived', event => {
    const socket = sockets.get(event.requestId); if (socket) socket.status = event.response.status;
  });
  page.on('Network.webSocketFrameReceived', event => socketFrames.push({ id: event.requestId, text: event.response.payloadData, at: Date.now() }));
}

async function main() {
  if (BASE.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(BASE.hostname) || BASE.pathname !== '/') {
    throw new Error('This review requires the loopback Live Server origin with a root pathname');
  }
  const port = Number(BASE.port || 80);
  const socketOrigin = 'ws://127.0.0.1' + (port === 80 ? '' : ':' + port);
  const socketUrl = socketOrigin + '/__mistdory_live_reload__/ws';
  for (const name of HTML_PAGES) {
    const filename = path.join(PROJECT_ROOT, name);
    sourceHashes.set(name, hash(filename));
    const source = fs.readFileSync(filename, 'utf8');
    const production = policy(source);
    const response = await fetch(new URL(name, BASE));
    const served = await response.text();
    const development = policy(served);
    const expected = { ...production, 'connect-src': [...production['connect-src'], socketOrigin] };
    check(name + ': dev response changes only the exact socket connection source', response.ok && JSON.stringify(development) === JSON.stringify(expected));
    check(name + ': source stays production-only and reload code is external', production['connect-src'].join(' ') === "'self'"
      && !source.includes('__mistdory_live_reload__') && served.includes('src="/__mistdory_live_reload__.js"')
      && !served.includes('<script>'));
  }
  await launch();
  // About exercises the shared client without third-party iframe loading delays.
  const pageUrl = new URL('about.html?lang=en', BASE).href;
  await page.send('Page.navigate', { url: pageUrl });
  await waitFor(() => evaluate(() => document.readyState === 'complete' && Boolean(window.MistSite)), 'initial About document');
  await waitFor(() => [...sockets.values()].some(socket => socket.url === socketUrl && socket.status === 101)
    && socketFrames.some(frame => frame.text === 'connected'), 'actual reload WebSocket handshake');
  check('external reload client receives HTTP 200 and opens its intended WebSocket',
    responses.some(response => response.status === 200 && new URL(response.url).pathname === '/__mistdory_live_reload__.js')
    && [...sockets.values()].some(socket => socket.url === socketUrl && socket.status === 101));

  const firstTimeOrigin = await evaluate(() => performance.timeOrigin);
  const previousNavigations = navigations.length;
  const previousConnected = socketFrames.filter(frame => frame.text === 'connected').length;
  const reloadStarted = Date.now();
  createProbe('.txt');
  await waitFor(() => socketFrames.some(frame => frame.text === 'reload' && frame.at >= reloadStarted)
    && navigations.length > previousNavigations, 'watcher-generated reload and main-frame navigation');
  await waitFor(() => evaluate(() => document.readyState === 'complete' && Boolean(window.MistSite)), 'reloaded About document');
  await waitFor(() => socketFrames.filter(frame => frame.text === 'connected').length > previousConnected, 'socket reconnection after full reload');
  const reloadedTimeOrigin = await evaluate(() => performance.timeOrigin);
  check('a real file-add event causes full browser reload under the CSP', reloadedTimeOrigin > firstTimeOrigin
    && navigations.slice(previousNavigations).some(event => event.url === pageUrl));

  const cssBefore = await evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href));
  const cssNavigations = navigations.length;
  const cssStarted = Date.now();
  createProbe('.css');
  await waitFor(() => socketFrames.some(frame => frame.text === 'refreshcss' && frame.at >= cssStarted), 'watcher-generated CSS refresh message');
  await waitFor(() => evaluate(before => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .some(link => link.href.includes('_liveReload=') && !before.includes(link.href)), cssBefore), 'stylesheet refresh token');
  const refreshedStyles = await evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => link.href).filter(href => href.includes('_liveReload=')));
  await waitFor(() => refreshedStyles.every(href => responses.some(response => response.url === href && response.status === 200)),
    'refreshed stylesheets to return HTTP 200');
  check('a real CSS file-add refreshes styles without full navigation', navigations.length === cssNavigations
    && await evaluate(() => performance.timeOrigin) === reloadedTimeOrigin);
  check('Live Server reload does not cause CSP violations', violations.length === 0, JSON.stringify(violations));
  check('Live Server reload does not cause uncaught application exceptions', errors.length === 0, errors.join(' | '));
  for (const [name, expected] of sourceHashes) check(name + ': source bytes remain unchanged', hash(path.join(PROJECT_ROOT, name)) === expected);
}

function removeProbes() {
  const failures = [];
  for (const probe of probes) {
    try {
      if (!fs.existsSync(probe.filename)) continue;
      const parent = fs.realpathSync(path.dirname(probe.filename));
      const actual = fs.lstatSync(probe.filename);
      if (parent.toLowerCase() !== PROJECT_ROOT.toLowerCase() || path.basename(probe.filename) !== probe.basename
        || !probe.basename.startsWith(PROBE_PREFIX) || actual.isSymbolicLink() || !actual.isFile()
        || actual.dev !== probe.device || actual.ino !== probe.inode) {
        throw new Error('Refusing to remove a probe that no longer matches the owned fixture');
      }
      fs.unlinkSync(probe.filename);
    } catch (error) { failures.push(error.message); }
  }
  if (failures.length) throw new Error(failures.join('; '));
}
async function cleanup() {
  if (browser) { try { await Promise.race([browser.send('Browser.close'), sleep(2000)]); } catch {} }
  if (page) { try { page.close(); } catch {} }
  if (browser) { try { browser.close(); } catch {} }
  if (chrome?.pid && chrome.exitCode === null) {
    await Promise.race([once(chrome, 'exit').catch(() => {}), sleep(2500)]);
    if (chrome.exitCode === null) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  let probeFailure;
  try { removeProbes(); } catch (error) { probeFailure = error; }
  if (profile && fs.existsSync(profile)) {
    const realProfile = fs.realpathSync(profile);
    const realRun = fs.realpathSync(runDir);
    if (path.dirname(realRun).toLowerCase() !== TEMP_ROOT.toLowerCase() || !path.basename(realRun).startsWith(RUN_PREFIX)
      || path.dirname(realProfile).toLowerCase() !== realRun.toLowerCase() || path.basename(realProfile) !== 'chrome-profile') {
      throw new Error('Refusing profile cleanup outside the verified disposable folder');
    }
    fs.rmSync(realProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
  if (probeFailure) throw probeFailure;
}
(async () => {
  try { await main(); }
  catch (error) { check('Live Server browser review completed', false, error.stack || String(error)); }
  finally {
    try { await cleanup(); check('owned reload probes are removed', probes.every(probe => !fs.existsSync(probe.filename))); }
    catch (error) { check('owned browser/probe cleanup', false, error.message); }
    if (runDir) {
      fs.writeFileSync(path.join(runDir, 'results.json'), JSON.stringify({ base: BASE.href, results, errors, violations,
        sockets: [...sockets.values()], socketFrames, navigations, probes: probes.map(probe => probe.basename) }, null, 2));
      process.stdout.write('ARTIFACTS ' + runDir + '\n');
    }
    const failed = results.filter(result => !result.success);
    process.stdout.write('RESULT ' + (results.length - failed.length) + '/' + results.length + ' passed; ' + failed.length + ' failed\n');
    process.exitCode = failed.length ? 1 : 0;
  }
})();
