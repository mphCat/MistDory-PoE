'use strict';

// Production-policy review using a disposable Chrome profile and no packages.
// Serve this version with tests/local-preview.cjs; Live Server injects dev code.
// MISTDORY_QA_NETWORK=1 additionally audits every catalog thumbnail, six at a time.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const BASE = (process.env.MISTDORY_QA_URL || 'http://127.0.0.1:8004').replace(/\/$/, '');
const CHROME = process.env.MISTDORY_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_ROOT = fs.realpathSync(process.env.MISTDORY_QA_TEMP || os.tmpdir());
const RUN_PREFIX = 'mistdory-v54-security-review-';
const NETWORK = process.env.MISTDORY_QA_NETWORK === '1';
const BASE_BLOCKS = ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*', '*://www.youtube.com/embed/*', '*://www.youtube-nocookie.com/embed/*'];
const results = [];
const errors = [];
const violations = [];
const observations = [];
const screenshots = [];
const catalogs = {};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let runDir, profileDir, chrome, browser, page, fixtureId;

function check(name, success, detail = '') {
  results.push({ name, success: Boolean(success), detail });
  process.stdout.write((success ? 'PASS ' : 'FAIL ') + name + (detail ? ': ' + detail : '') + '\n');
}

async function waitFor(predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error('Timeout waiting for ' + label + (lastError ? ': ' + lastError.message : ''));
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const listener of [...(this.listeners.get(message.method) || [])]) listener(message.params);
      }
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('CDP closed')); }
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
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
    return () => this.listeners.get(method)?.delete(listener);
  }
  send(method, params = {}, timeout = 20000) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function evaluate(fn, ...args) {
  const expression = '(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')';
  const response = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, 40000);
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function navigate(route) {
  const target = new URL(route, BASE + '/');
  let committed = false;
  const stop = page.on('Page.frameNavigated', event => { if (!event.frame.parentId && event.frame.url === target.href) committed = true; });
  try {
    await page.send('Page.navigate', { url: target.href });
    await waitFor(() => committed, 'navigation ' + route);
    await waitFor(() => evaluate(() => document.readyState === 'complete'), 'document ' + route);
  } finally { stop(); }
}

async function ready(game) {
  await waitFor(() => evaluate(expected => document.documentElement.dataset.realm === expected
    && document.documentElement.dataset.loadState === 'ready'
    && document.querySelectorAll('#cardGrid .card').length > 0, game), game + ' catalog');
}

async function block(extra = []) {
  await page.send('Network.setBlockedURLs', { urls: [...BASE_BLOCKS, ...extra] });
}

async function click(selector) {
  const found = await evaluate(value => {
    const target = document.querySelector(value);
    if (!target) return false;
    target.click(); return true;
  }, selector);
  if (!found) throw new Error('Missing target: ' + selector);
}

async function checkPolicyAndFonts(route) {
  await navigate(route);
  if (route.startsWith('index.html') || route.startsWith('videos.html')) await ready('poe1');
  const info = await evaluate(async () => {
    const policy = document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.content || '';
    const directives = Object.fromEntries(policy.split(';').filter(Boolean).map(part => {
      const [name, ...values] = part.trim().split(/\s+/); return [name, values];
    }));
    const inline = [...document.querySelectorAll('*')].flatMap(element => [...element.attributes]
      .filter(attribute => /^on/i.test(attribute.name)).map(attribute => element.tagName + ':' + attribute.name));
    const loaded = [];
    for (const [family, weight, sample] of [['Barlow', 400, 'MistDory Hướng dẫn'], ['Oxanium', 600, 'MistDory 0123456789'], ['Cinzel', 400, 'MistDory 0123456789']]) {
      const faces = await document.fonts.load(weight + ' 20px "' + family + '"', sample);
      loaded.push({ family, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') });
    }
    const fontResources = performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\.(woff2?|ttf|otf)(?:[?#]|$)/i.test(name));
    return { policy, directives, inline, loaded, fontResources, origin: location.origin,
      externalFontReferences: [...document.querySelectorAll('link[href]')].map(link => link.href).filter(url => /fonts\.(googleapis|gstatic)\.com/i.test(url)) };
  });
  const same = (values, expected) => Array.isArray(values) && values.length === 1 && values[0] === expected;
  check(route + ': production CSP restricts scripts, fonts and connections to self',
    same(info.directives['script-src'], "'self'") && same(info.directives['font-src'], "'self'")
    && same(info.directives['connect-src'], "'self'"), info.policy);
  check(route + ': CSP disallows plugins, base URL rewriting and form submission',
    same(info.directives['object-src'], "'none'") && same(info.directives['base-uri'], "'none'")
    && same(info.directives['form-action'], "'none'"));
  check(route + ': CSP permits the actual YouTube frame and thumbnail sources',
    info.directives['frame-src']?.includes('https://www.youtube.com')
    && info.directives['img-src']?.includes("'self'") && info.directives['img-src']?.includes('https://img.youtube.com')
    && info.directives['img-src']?.includes('https://i.ytimg.com'));
  check(route + ': no inline event-handler attributes remain', info.inline.length === 0, info.inline.join(', '));
  check(route + ': production fonts load with Google font CDNs blocked', info.loaded.every(item => item.loaded), JSON.stringify(info.loaded));
  check(route + ': loaded font resources are same-origin and external font links are absent', info.fontResources.length > 0
    && info.fontResources.every(url => new URL(url).origin === info.origin) && info.externalFontReferences.length === 0, JSON.stringify(info.fontResources));
  const anchors = await evaluate(() => [...document.querySelectorAll('a[target="_blank"]')]
    .every(link => link.relList.contains('noopener') && link.relList.contains('noreferrer')));
  check(route + ': external new-tab links retain explicit isolation', anchors);
  observations.push({ route, fontResources: info.fontResources });
}

async function renderedImages(label) {
  const decoded = await evaluate(async () => {
    const images = [...document.querySelectorAll('#cardGrid img')];
    for (const image of images) image.loading = 'eager';
    return Promise.all(images.map(async image => {
      const deadline = Date.now() + 18000;
      while (Date.now() < deadline && !(image.complete && image.naturalWidth > 0)) await new Promise(resolve => setTimeout(resolve, 100));
      return { src: image.currentSrc || image.src, width: image.naturalWidth, fallback: image.src.endsWith('/assets/images/video-placeholder.svg') };
    }));
  });
  check(label + ': every rendered card image decodes under the active policy', decoded.length > 0 && decoded.every(image => image.width > 0), JSON.stringify(decoded));
  observations.push({ label, renderedImages: decoded });
}

async function checkInteractions() {
  await navigate('index.html?game=poe1&lang=en');
  await ready('poe1');
  await click('#btnPoe2');
  await ready('poe2');
  check('game switching works through native controls under CSP', await evaluate(() => document.querySelector('#btnPoe2').getAttribute('aria-pressed') === 'true'));
  await click('[data-language="vi"]');
  check('language switching works under CSP', await evaluate(() => document.documentElement.lang === 'vi'));
  await click('[data-language="en"]');
  const query = catalogs.poe2.cards[0].title;
  await evaluate(value => {
    const input = document.querySelector('#searchInput'); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
  }, query);
  check('search input listener updates results and URL under CSP', await evaluate(expected => new URL(location.href).searchParams.get('q') === expected
    && document.querySelectorAll('#cardGrid .card').length > 0, query));
  await evaluate(() => {
    document.querySelector('#searchInput').value = '';
    document.querySelector('#searchInput').dispatchEvent(new Event('input', { bubbles: true }));
    const select = document.querySelector('#sortFilter'); select.value = 'views'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('sort listener updates the active URL state under CSP', await evaluate(() => new URL(location.href).searchParams.get('sort') === 'views'));
  await click('.builds-trigger');
  check('Builds dialog still opens under CSP', await evaluate(() => document.querySelector('#buildsDialog').open));
  await click('.builds-close');
  const popups = await evaluate(() => {
    const calls = []; const nativeOpen = window.open;
    window.open = (...args) => { calls.push(args); return null; };
    document.querySelector('#discordMain').click(); document.querySelector('#discordCowb').click();
    window.open = nativeOpen; return calls;
  });
  check('valid Discord destinations open with noopener and noreferrer', popups.length === 2 && popups.every(args =>
    /^https:\/\//.test(args[0]) && args[1] === '_blank' && /(?:^|,)\s*noopener\s*(?:,|$)/.test(args[2] || '')
    && /(?:^|,)\s*noreferrer\s*(?:,|$)/.test(args[2] || '')), JSON.stringify(popups));
  await renderedImages('Home');
  await navigate('videos.html?game=poe1&lang=en');
  await ready('poe1');
  await renderedImages('Archive');
  await block([new URL('data/poe2.json', BASE + '/').href + '*']);
  await navigate('index.html?game=poe2&lang=en');
  await waitFor(() => evaluate(() => document.documentElement.dataset.loadState === 'error'), 'blocked catalog failure');
  check('failed catalog exposes an enabled retry control', await evaluate(() => !document.querySelector('#retryCatalogBtn').hidden && !document.querySelector('#retryCatalogBtn').disabled));
  await block();
  await click('#retryCatalogBtn');
  await ready('poe2');
  check('Retry recovers the selected game under CSP', await evaluate(() => document.querySelector('#catalogStatus').hidden));
}

async function checkThumbnailFallback() {
  await block(['*://img.youtube.com/*', '*://i.ytimg.com/*']);
  await navigate('index.html?game=poe1&lang=en');
  await ready('poe1');
  await renderedImages('Blocked YouTube thumbnails');
  const state = await evaluate(() => [...document.querySelectorAll('#cardGrid img')].map(image => ({ src: image.src, width: image.naturalWidth })));
  check('blocked YouTube thumbnails display the same-origin SVG fallback', state.length > 0
    && state.every(image => image.src.endsWith('/assets/images/video-placeholder.svg') && image.width > 0), JSON.stringify(state));
  await block();
}

function fixtureSource(mode) {
  return '(' + function (fixtureMode) {
    window.__securityProbe = 0;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const response = await nativeFetch(input, options);
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.origin !== location.origin || !/\/data\/poe[12]\.json$/.test(url.pathname)) return response;
      const data = await response.clone().json();
      if (fixtureMode === 'url') {
        data.cards[0].url = 'javascript:window.__securityProbe=1';
        data.cards[0].image = 'data:image/svg+xml,unsafe';
        data.guideRows.gc2.rows[0].url = 'javascript:window.__securityProbe=1';
        data.meta.mainDiscordUrl = 'javascript:window.__securityProbe=1';
      } else {
        const payload = '"><img data-security-injected src=x onerror="window.__securityProbe=1">';
        data.meta.sub = payload; data.meta.ytHint = payload;
        for (const card of data.cards) { card.title = payload; card.desc = payload; card.tags = [payload]; card.ver = payload; card.duration = payload; }
        for (const group of Object.values(data.guideRows)) for (const row of group.rows) { row.label = payload; row.ver = payload; }
      }
      return new Response(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    };
  }.toString() + ')(' + JSON.stringify(mode) + ');';
}

async function checkPoisonedCatalogs() {
  for (const mode of ['url', 'html']) {
    const installed = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: fixtureSource(mode) });
    fixtureId = installed.identifier;
    await navigate('index.html?game=poe1&lang=en&sort=playlist');
    await ready('poe1');
    if (mode === 'url') {
      const state = await evaluate(() => {
        const calls = []; const nativeOpen = window.open;
        window.open = (...args) => { calls.push(args); return null; };
        document.querySelector('#discordMain').click(); window.open = nativeOpen;
        const card = document.querySelector('#cardGrid .card');
        return { cardTag: card.tagName, disabled: card.getAttribute('aria-disabled'), href: card.getAttribute('href'),
          unsafeHrefs: document.querySelectorAll('a[href^="javascript:"], a[href^="data:"]').length,
          unsafeImages: document.querySelectorAll('img[src^="data:"], img[src^="javascript:"]').length,
          guideUnavailable: Boolean(document.querySelector('#gc2 .guide-row-unavailable')),
          calls, marker: window.__securityProbe };
      });
      check('poisoned card URL stays visible as an inert disabled card', state.cardTag === 'DIV' && state.disabled === 'true' && state.href === null, JSON.stringify(state));
      check('poisoned guide/image/Discord URLs cannot navigate or open a popup', state.unsafeHrefs === 0 && state.unsafeImages === 0
        && state.guideUnavailable && state.calls.length === 0 && state.marker === 0);
    } else {
      check('HTML payloads remain literal text without injected DOM or inline handlers', await evaluate(() =>
        window.__securityProbe === 0 && !document.querySelector('[data-security-injected]') && !document.querySelector('#cardGrid [onerror]')
        && document.querySelector('.card-title').textContent.includes('<img data-security-injected')
        && document.querySelector('#heroSub').textContent.includes('<img data-security-injected')));
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: fixtureId }); fixtureId = undefined;
  }
}

async function checkAllThumbnails() {
  if (!NETWORK) { observations.push({ thumbnailAudit: 'Skipped; set MISTDORY_QA_NETWORK=1 for the full live catalog audit.' }); return; }
  await navigate('index.html?game=poe1&lang=en');
  await ready('poe1');
  const cards = Object.values(catalogs).flatMap(catalog => catalog.cards);
  const images = await evaluate(values => values.map(card => ({ id: card.id, url: getYtThumb(card.url) })), cards);
  const outcomes = [];
  for (let offset = 0; offset < images.length; offset += 6) {
    const batch = await evaluate(async entries => Promise.all(entries.map(entry => new Promise(resolve => {
      const image = new Image();
      const timer = setTimeout(() => { image.onload = image.onerror = null; image.src = ''; resolve({ ...entry, loaded: false, reason: 'timeout' }); }, 18000);
      image.onload = () => { clearTimeout(timer); resolve({ ...entry, loaded: image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight }); };
      image.onerror = () => { clearTimeout(timer); resolve({ ...entry, loaded: false, reason: 'image error' }); };
      if (!entry.url) { clearTimeout(timer); resolve({ ...entry, loaded: false, reason: 'missing thumbnail URL' }); return; }
      image.src = entry.url;
    }))), images.slice(offset, offset + 6));
    outcomes.push(...batch);
    process.stdout.write('THUMBNAILS ' + outcomes.length + '/' + images.length + '\n');
  }
  const failed = outcomes.filter(item => !item.loaded);
  check('all ' + images.length + ' catalog YouTube thumbnails decode under production CSP', images.length > 0 && failed.length === 0, JSON.stringify({ loaded: outcomes.length - failed.length, failed }));
  observations.push({ thumbnailAudit: outcomes });
}

async function main() {
  for (const game of ['poe1', 'poe2']) {
    const response = await fetch(new URL('data/' + game + '.json', BASE + '/'));
    if (!response.ok) throw new Error(game + ' catalog HTTP ' + response.status);
    catalogs[game] = await response.json();
  }
  runDir = fs.mkdtempSync(path.join(TEMP_ROOT, RUN_PREFIX));
  profileDir = path.join(runDir, 'chrome-profile'); fs.mkdirSync(profileDir);
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--remote-allow-origins=*', '--user-data-dir=' + profileDir, 'about:blank'],
  { windowsHide: true, cwd: TEMP_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError, browserUrl, stderr = '';
  chrome.on('error', error => { launchError = error; });
  chrome.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) browserUrl = match[1]; });
  await waitFor(() => {
    if (launchError) throw launchError;
    if (browserUrl) return true;
    const marker = path.join(profileDir, 'DevToolsActivePort');
    if (!fs.existsSync(marker)) return false;
    const [port, socketPath] = fs.readFileSync(marker, 'utf8').trim().split(/\r?\n/);
    if (!port || !socketPath) return false;
    browserUrl = 'ws://127.0.0.1:' + port + socketPath; return true;
  }, 'disposable Chrome endpoint');
  browser = await CDP.connect(browserUrl);
  const created = await browser.send('Target.createTarget', { url: 'about:blank' });
  const targets = await fetch('http://127.0.0.1:' + new URL(browserUrl).port + '/json/list').then(response => response.json());
  const target = targets.find(item => item.id === created.targetId);
  if (!target) throw new Error('Missing isolated Chrome target');
  page = await CDP.connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Runtime.addBinding', { name: '__securityAuditPolicyEvent' });
  page.on('Runtime.bindingCalled', event => {
    if (event.name === '__securityAuditPolicyEvent') { try { violations.push(JSON.parse(event.payload)); } catch { violations.push({ invalidPayload: true }); } }
  });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: "document.addEventListener('securitypolicyviolation', event => { window.__securityAuditPolicyEvent(JSON.stringify({ directive: event.effectiveDirective, blocked: event.blockedURI, page: location.href })); });" });
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await block();
  for (const route of ['index.html?game=poe1&lang=en', 'videos.html?game=poe1&lang=en', 'about.html?lang=en', 'font-preview.html?lang=en']) await checkPolicyAndFonts(route);
  await checkInteractions();
  await checkThumbnailFallback();
  await checkPoisonedCatalogs();
  await checkAllThumbnails();
  check('no unexpected CSP violations occurred', violations.length === 0, JSON.stringify(violations));
  check('no uncaught first-party JavaScript exceptions occurred', errors.length === 0, errors.join(' | '));
}

async function cleanup() {
  if (browser) { try { await Promise.race([browser.send('Browser.close'), sleep(2000)]); } catch {} }
  if (page) { try { page.close(); } catch {} }
  if (browser) { try { browser.close(); } catch {} }
  if (chrome?.pid && chrome.exitCode === null) {
    await Promise.race([once(chrome, 'exit').catch(() => {}), sleep(2500)]);
    if (chrome.exitCode === null) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  if (profileDir && fs.existsSync(profileDir)) {
    const realTemp = fs.realpathSync(TEMP_ROOT), realRun = fs.realpathSync(runDir), realProfile = fs.realpathSync(profileDir);
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    if (!same(path.dirname(realRun), realTemp) || !path.basename(realRun).startsWith(RUN_PREFIX)
      || !same(path.dirname(realProfile), realRun) || path.basename(realProfile) !== 'chrome-profile'
      || !same(realProfile, path.resolve(profileDir))) throw new Error('Refusing unsafe Chrome profile cleanup');
    fs.rmSync(realProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

(async () => {
  try { await main(); }
  catch (error) { check('security browser review completed', false, error.stack || String(error)); }
  finally {
    try { await cleanup(); } catch (error) { check('disposable browser cleanup', false, error.message); }
    const failed = results.filter(result => !result.success);
    if (runDir) {
      fs.writeFileSync(path.join(runDir, 'results.json'), JSON.stringify({ base: BASE, network: NETWORK, results, errors, violations, observations, screenshots }, null, 2));
      process.stdout.write('ARTIFACTS ' + runDir + '\n');
    }
    process.stdout.write('RESULT ' + (results.length - failed.length) + '/' + results.length + ' passed; ' + failed.length + ' failed\n');
    process.exitCode = failed.length ? 1 : 0;
  }
})();
