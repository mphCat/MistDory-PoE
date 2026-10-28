'use strict';

// Desktop-only end-to-end review for the approved v5.2 QC fixes.
// Run with Node 22+ and a locally running preview. No packages are required.
// Runtime output/profile/screenshot files go into a verified disposable temp folder.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');

const BASE = process.env.MISTDORY_QA_URL || 'http://127.0.0.1:8001';
const CHROME = process.env.MISTDORY_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_ROOT = fs.realpathSync(process.env.MISTDORY_QA_TEMP || 'C:\\Users\\minh.pham\\AppData\\Local\\Temp');
const RUN_PREFIX = 'mistdory-qc-review-';
const BUILD_SHEETS = {
  poe1: 'https://docs.google.com/spreadsheets/d/1nMhuegfqKisuEikG2I4FI14MhHIpsAQUVjU3y09OTCQ/edit?gid=2005846808#gid=2005846808',
  poe2: 'https://docs.google.com/spreadsheets/d/1aGhWarz7gICqplYfhh7JxqnGgUu7kUDhYwDtnMv2AGk/edit?gid=1434431165#gid=1434431165'
};
const results = [];
const errors = [];
const screenshots = [];
const catalogs = {};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let runDir;
let profileDir;
let chrome;
let browser;
let page;

function check(name, success, detail) {
  results.push({ name, success: Boolean(success), detail: detail || '' });
  process.stdout.write((success ? 'PASS ' : 'FAIL ') + name + (detail ? ': ' + detail : '') + '\n');
}

async function waitFor(predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) { lastError = error; }
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
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('CDP connection closed'));
      }
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
  event(method, predicate, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const cancel = this.on(method, params => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        cancel();
        resolve(params);
      });
      const timer = setTimeout(() => {
        cancel();
        reject(new Error('CDP event timeout: ' + method));
      }, timeout);
    });
  }
  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP command timeout: ' + method));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function evaluate(fn, ...args) {
  const expression = typeof fn === 'string' ? fn : '(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')';
  const response = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

async function navigate(route) {
  const url = new URL(route, BASE);
  const committed = page.event('Page.frameNavigated', params => {
    if (params.frame.parentId) return false;
    try { return new URL(params.frame.url).pathname === url.pathname; } catch { return false; }
  });
  await page.send('Page.navigate', { url: url.href });
  await committed;
  await waitFor(() => evaluate(() => document.readyState === 'complete'), 'page document');
  await sleep(100);
}

async function readyCatalog(realm) {
  await waitFor(() => evaluate(expected => {
    const summary = document.querySelector('#videoCount');
    return document.documentElement.dataset.realm === expected
      && summary && !/loading/i.test(summary.textContent)
      && document.querySelector('#cardGrid');
  }, realm), realm + ' rendered catalog');
}

async function ids() {
  return evaluate(() => [...document.querySelectorAll('#cardGrid .card')].map(card => card.dataset.videoId));
}

async function click(selector) {
  const found = await evaluate(target => {
    const element = document.querySelector(target);
    if (!element) return false;
    element.click();
    return true;
  }, selector);
  if (!found) throw new Error('Missing click target: ' + selector);
  await sleep(120);
}

async function setInput(selector, value, event = 'input') {
  const found = await evaluate((target, next, eventName) => {
    const input = document.querySelector(target);
    if (!input) return false;
    input.value = next;
    input.dispatchEvent(new Event(eventName, { bubbles: true }));
    return true;
  }, selector, value, event);
  if (!found) throw new Error('Missing form control: ' + selector);
  await sleep(120);
}

async function screenshot(name) {
  await evaluate(async () => {
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))]);
  });
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const filename = path.join(runDir, name);
  fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
  screenshots.push(filename);
  process.stdout.write('SCREENSHOT ' + filename + '\n');
}

function sameIds(a, b) { return a.length === b.length && a.every((id, index) => id === b[index]); }
function unique(a) { return [...new Set(a)]; }
function linear(color) {
  return color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
}
function contrast(foreground, background) {
  const parse = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
  const luma = color => {
    const values = linear(parse(color));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const a = luma(foreground), b = luma(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function textContrast(name, selector, backgroundSelector, pseudo = null) {
  const colors = await evaluate((target, parent, pseudoElement) => {
    const element = document.querySelector(target);
    const background = element?.closest(parent) || document.querySelector(parent);
    if (!element || !background) return null;
    return {
      foreground: getComputedStyle(element, pseudoElement).color,
      background: getComputedStyle(background).backgroundColor
    };
  }, selector, backgroundSelector, pseudo);
  if (!colors) {
    check(name, false, 'Missing text or background element');
    return;
  }
  const ratio = contrast(colors.foreground, colors.background);
  check(name, ratio >= 4.5, ratio.toFixed(2) + ':1; ' + JSON.stringify(colors));
}

async function checkTimestamp(realm) {
  const visible = await evaluate(() => {
    const element = document.querySelector('#catalogUpdated');
    if (!element) return null;
    const stamp = element.querySelector('time[datetime]');
    const style = getComputedStyle(element);
    return {
      text: element.textContent.trim(),
      stamp: stamp?.dateTime || element.dataset.updatedAt || element.getAttribute('datetime') || '',
      shown: !element.hidden && style.display !== 'none' && style.visibility !== 'hidden'
    };
  });
  check(realm + ' update timestamp is visible', visible && visible.shown && Boolean(visible.text), JSON.stringify(visible));
  if (!visible) return;
  const source = catalogs[realm].source || {};
  const stamps = [source.refreshedAt, source.updatedAt, source.metricsCheckedAt, source.visibilityCheckedAt, source.importedAt]
    .map(value => Date.parse(value)).filter(Number.isFinite);
  const shown = Date.parse(visible.stamp);
  if (visible.stamp) {
    check(realm + ' displayed timestamp matches a catalog source timestamp',
      Number.isFinite(shown) && stamps.includes(shown) && shown <= Date.now() + 60000,
      visible.stamp);
  } else {
    check(realm + ' update text contains a real catalog date',
      stamps.some(value => {
        const date = new Date(value);
        const day = String(date.getUTCDate());
        const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        return visible.text.includes(String(date.getUTCFullYear()))
          && (visible.text.includes(month) || visible.text.includes(date.toISOString().slice(0, 10)))
          && visible.text.includes(day);
      }), visible.text);
  }
}

async function checkCategories(realm) {
  const expected = unique(catalogs[realm].cards.map(card => card.type));
  const actual = await evaluate(() => [...document.querySelectorAll('#catFilter option')]
    .map(option => ({ value: option.value, hidden: option.hidden, disabled: option.disabled })));
  check(realm + ' categories with data are available', expected.every(type => actual.some(option => option.value === type && !option.hidden && !option.disabled)));
  check(realm + ' empty category choices are hidden',
    actual.filter(option => option.value && !expected.includes(option.value)).every(option => option.hidden && option.disabled),
    JSON.stringify(actual));
}

async function checkBuilds(route) {
  await navigate(route);
  await click('.builds-trigger');
  const info = await evaluate(() => {
    const dialog = document.querySelector('#buildsDialog');
    return {
      open: Boolean(dialog?.open),
      links: dialog ? [...dialog.querySelectorAll('a[data-build-game]')].map(anchor => ({
        game: anchor.dataset.buildGame, href: anchor.href, target: anchor.target, rel: anchor.rel
      })) : []
    };
  });
  check(route + ' Builds opens the dialog', info.open);
  check(route + ' both Build Sheet destinations are correct', ['poe1', 'poe2'].every(realm =>
    info.links.some(anchor => anchor.game === realm && anchor.href === BUILD_SHEETS[realm]
      && anchor.target === '_blank' && anchor.rel.includes('noopener'))), JSON.stringify(info.links));
  await click('#buildsDialog .builds-close');
  check(route + ' Builds close button dismisses dialog', await evaluate(() => !document.querySelector('#buildsDialog').open));
  await click('.builds-trigger');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await sleep(100);
  check(route + ' Escape dismisses Builds dialog', await evaluate(() => !document.querySelector('#buildsDialog').open));
  await click('.builds-trigger');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 4, y: 4, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 4, y: 4, button: 'left', clickCount: 1 });
  await sleep(100);
  check(route + ' clicking the backdrop dismisses Builds dialog', await evaluate(() => !document.querySelector('#buildsDialog').open));
  if (await evaluate(() => document.querySelector('#buildsDialog').open)) await click('#buildsDialog .builds-close');
}

async function checkUnavailableGuides(realm) {
  const unavailable = await evaluate(() => [...document.querySelectorAll('.guide-btn[aria-disabled="true"]')]
    .map(element => ({
      tag: element.tagName, href: element.getAttribute('href'),
      label: element.querySelector('.nav-label')?.textContent.trim(),
      soon: element.querySelector('.nav-soon-label')?.textContent.trim()
    })));
  check(realm + ' unavailable guides have Open/Watch and Soon states', unavailable.length > 0
    && unavailable.every(item => item.tag === 'BUTTON' && item.href === null
      && ['Open', 'Watch'].includes(item.label) && item.soon === 'Soon'), JSON.stringify(unavailable));
  if (!unavailable.length) return;
  const point = await evaluate(() => {
    const button = document.querySelector('.guide-btn[aria-disabled="true"]');
    button.scrollIntoView({ block: 'center' });
    const box = button.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await sleep(250);
  check(realm + ' hovering unavailable guide reveals Soon', await evaluate(() => {
    const button = document.querySelector('.guide-btn[aria-disabled="true"]');
    return Number(getComputedStyle(button.querySelector('.nav-label')).opacity) < 0.1
      && Number(getComputedStyle(button.querySelector('.nav-soon-label')).opacity) > 0.9;
  }));
  const before = await evaluate(() => ({ href: location.href, y: scrollY }));
  await click('.guide-btn[aria-disabled="true"]');
  const after = await evaluate(() => ({ href: location.href, y: scrollY }));
  check(realm + ' unavailable guide never navigates or jumps page', before.href === after.href && Math.abs(before.y - after.y) < 2);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 200 });
  await evaluate(() => scrollTo(0, 0));
}

async function checkHome(realm) {
  await navigate('/index.html?game=' + realm);
  await readyCatalog(realm);
  const current = await ids();
  check(realm + ' homepage shows at most six public videos', current.length === Math.min(6, catalogs[realm].cards.length)
    && current.every(id => catalogs[realm].cards.some(card => card.id === id)));
  await checkCategories(realm);
  await checkTimestamp(realm);
  const docs = await evaluate(() => [...document.querySelectorAll('#gc2 .guide-rows-wrap a')].map(anchor => ({ href: anchor.href, label: anchor.textContent.trim() })));
  check(realm + ' Document has available Open resources rather than Build Sheets',
    docs.length > 0 && docs.every(anchor => anchor.label === 'Open'
      && !Object.values(BUILD_SHEETS).includes(anchor.href)), JSON.stringify(docs));
  await checkUnavailableGuides(realm);
  await textContrast(realm + ' inactive game label contrast', '.realm-btn:not(.active)', '.realm-toggle');
  await textContrast(realm + ' Watch link contrast', '#gc1 a.guide-btn', '.guide-card');
  await textContrast(realm + ' search placeholder contrast', '#searchInput', '.search-wrap input', '::placeholder');
  await textContrast(realm + ' CoWB Discord contrast', '#discordCowb', '#discordCowb');
  if (await evaluate(() => Boolean(document.querySelector('.row-ver-badge')))) {
    await textContrast(realm + ' patch badge contrast', '.row-ver-badge', '.row-ver-badge');
  }
  await setInput('#searchInput', 'mistdory-no-match-qc-9e71');
  check(realm + ' empty search returns zero results', (await ids()).length === 0);
  await textContrast(realm + ' empty result text contrast', '.no-results', 'body');
  await setInput('#searchInput', 'craft');
  const archiveLink = await evaluate(() => {
    const link = document.querySelector('#allVideosBtn');
    return link ? { tag: link.tagName, href: link.href } : null;
  });
  const target = archiveLink ? new URL(archiveLink.href) : null;
  check(realm + ' All videos links to archive with current game and search',
    archiveLink?.tag === 'A' && target.pathname.endsWith('/videos.html')
      && target.searchParams.get('game') === realm && target.searchParams.get('q') === 'craft',
    JSON.stringify(archiveLink));
  await setInput('#searchInput', '');
}

async function checkArchive(realm) {
  await navigate('/videos.html?game=' + realm + '&sort=playlist&page=1');
  await readyCatalog(realm);
  check(realm + ' archive identifies its page type', await evaluate(() => document.body.dataset.page === 'videos'));
  await checkCategories(realm);
  await checkTimestamp(realm);
  const expectedCards = [...catalogs[realm].cards].sort((a, b) => a.playlistPosition - b.playlistPosition);
  const pages = Math.max(1, Math.ceil(expectedCards.length / 10));
  const collected = [];
  for (let number = 1; number <= pages; number++) {
    await navigate('/videos.html?game=' + realm + '&sort=playlist&page=' + number);
    await readyCatalog(realm);
    const displayed = await ids();
    const expected = expectedCards.slice((number - 1) * 10, number * 10).map(card => card.id);
    check(realm + ' archive page ' + number + ' has correct items and maximum ten',
      displayed.length <= 10 && sameIds(displayed, expected), displayed.length + '/' + expected.length);
    check(realm + ' archive page ' + number + ' has page status', await evaluate(() => Boolean(document.querySelector('#pageStatus')?.textContent.trim())));
    if (pages > 1) {
      const pagination = await evaluate(() => {
        const pager = document.querySelector('#videoPagination');
        return { links: pager?.querySelectorAll('a.page-link').length || 0, current: pager?.querySelector('[aria-current="page"]')?.textContent.trim() || '' };
      });
      check(realm + ' archive page ' + number + ' exposes pagination and current page',
        pagination.links > 0 && new RegExp('(^|\\D)' + number + '(\\D|$)').test(pagination.current), JSON.stringify(pagination));
    }
    collected.push(...displayed);
  }
  check(realm + ' all archive pages cover only this realm without duplicates',
    collected.length === expectedCards.length && unique(collected).length === expectedCards.length
      && expectedCards.every(card => collected.includes(card.id)));
  await navigate('/videos.html?game=' + realm + '&sort=playlist&page=9999');
  await readyCatalog(realm);
  check(realm + ' out-of-range page clamps to final page',
    sameIds(await ids(), expectedCards.slice((pages - 1) * 10).map(card => card.id)));
  await navigate('/videos.html?game=' + realm + '&sort=playlist&page=-4');
  await readyCatalog(realm);
  check(realm + ' negative page clamps to first page', sameIds(await ids(), expectedCards.slice(0, 10).map(card => card.id)));
  for (const [sort, metric] of [['latest', card => Date.parse(card.publishedAt)], ['views', card => card.viewCount]]) {
    await setInput('#sortFilter', sort, 'change');
    const current = await ids();
    const highest = Math.max(...catalogs[realm].cards.map(metric));
    check(realm + ' ' + sort + ' puts a highest-ranked video first',
      catalogs[realm].cards.some(card => card.id === current[0] && metric(card) === highest));
    check(realm + ' ' + sort + ' updates URL and resets pagination', await evaluate(value => {
      const query = new URL(location.href).searchParams;
      return query.get('sort') === value && (!query.has('page') || query.get('page') === '1');
    }, sort));
  }
  const originalTopSix = new Set([...catalogs[realm].cards].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 6).map(card => card.id));
  const beyond = catalogs[realm].cards.find(card => !originalTopSix.has(card.id));
  if (beyond) {
    await setInput('#searchInput', beyond.title);
    check(realm + ' search scans videos beyond homepage six', (await ids()).includes(beyond.id), beyond.id);
  }
  if (realm === 'poe2') {
    await setInput('#searchInput', 'Blood Mage');
    const spaced = await ids();
    const spacedSummary = await evaluate(() => document.querySelector('#videoCount').textContent.trim());
    await setInput('#searchInput', 'bloodmage');
    check('Blood Mage and bloodmage return the same matching archive',
      spaced.length > 0 && sameIds(spaced, await ids())
        && spacedSummary === await evaluate(() => document.querySelector('#videoCount').textContent.trim()));
    await setInput('#searchInput', 'craft');
    const craft = await ids();
    await setInput('#searchInput', 'crafting');
    check('craft and crafting support the same known keyword', craft.length > 0 && sameIds(craft, await ids()));
  }
  await setInput('#searchInput', '');
}

async function checkRememberedGame() {
  await navigate('/index.html?game=poe1');
  await readyCatalog('poe1');
  await click('#btnPoe2');
  await readyCatalog('poe2');
  check('game switch writes URL and browser memory', await evaluate(() => {
    return new URL(location.href).searchParams.get('game') === 'poe2'
      && localStorage.getItem('mistdory.realm') === 'poe2';
  }));
  await navigate('/index.html');
  await readyCatalog('poe2');
  check('homepage without game URL remembers PoE 2', await evaluate(() => document.documentElement.dataset.realm === 'poe2'));
  const reloaded = page.event('Page.frameNavigated', params => !params.frame.parentId && params.frame.url.includes('/index.html'));
  await page.send('Page.reload', { ignoreCache: true });
  await reloaded;
  await readyCatalog('poe2');
  check('reload retains selected game', await evaluate(() => document.documentElement.dataset.realm === 'poe2'));
  await navigate('/index.html?game=poe1');
  await readyCatalog('poe1');
  check('explicit game URL takes precedence over remembered game', await evaluate(() => document.documentElement.dataset.realm === 'poe1'));
}

async function main() {
  for (const realm of ['poe1', 'poe2']) {
    const response = await fetch(new URL('data/' + realm + '.json', BASE));
    if (!response.ok) throw new Error(realm + ' catalog HTTP ' + response.status);
    catalogs[realm] = await response.json();
    check(realm + ' source catalog remains public-only', catalogs[realm].cards.length > 0
      && catalogs[realm].cards.every(card => card.privacyStatus === 'public'));
    check(realm + ' Build Sheets removed from Document data', catalogs[realm].guideRows.gc2.rows.every(row => !Object.values(BUILD_SHEETS).includes(row.url)));
  }
  const combined = [...catalogs.poe1.cards, ...catalogs.poe2.cards].map(card => card.id);
  check('source catalogs do not mix video IDs across games', unique(combined).length === combined.length);

  runDir = fs.mkdtempSync(path.join(TEMP_ROOT, RUN_PREFIX));
  profileDir = path.join(runDir, 'chrome-profile');
  fs.mkdirSync(profileDir);
  chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--remote-allow-origins=*', '--user-data-dir=' + profileDir, 'about:blank'
  ], { windowsHide: true, cwd: TEMP_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError;
  let browserUrl;
  let stderr = '';
  chrome.on('error', error => { launchError = error; });
  chrome.stderr.on('data', chunk => {
    stderr = (stderr + chunk.toString()).slice(-16000);
    const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) browserUrl = match[1];
  });
  await waitFor(() => {
    if (launchError) throw launchError;
    if (browserUrl) return true;
    const marker = path.join(profileDir, 'DevToolsActivePort');
    if (!fs.existsSync(marker)) return false;
    const [port, socketPath] = fs.readFileSync(marker, 'utf8').trim().split(/\r?\n/);
    if (!port || !socketPath) return false;
    browserUrl = 'ws://127.0.0.1:' + port + socketPath;
    return true;
  }, 'disposable Chrome endpoint');
  browser = await CDP.connect(browserUrl);
  const created = await browser.send('Target.createTarget', { url: 'about:blank' });
  const port = new URL(browserUrl).port;
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(response => response.json());
  const target = targets.find(item => item.id === created.targetId);
  if (!target) throw new Error('Missing created Chrome target');
  page = await CDP.connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  // Only the first-party UI is under test; avoid third-party player readiness blocking navigation.
  await page.send('Network.setBlockedURLs', { urls: ['*://www.youtube.com/embed/*', '*://www.youtube-nocookie.com/embed/*'] });
  page.on('Runtime.exceptionThrown', params => errors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await checkRememberedGame();
  for (const realm of ['poe1', 'poe2']) {
    await checkHome(realm);
    await checkArchive(realm);
  }
  await checkBuilds('/index.html?game=poe1');
  await checkBuilds('/about.html?game=poe2');
  await checkBuilds('/videos.html?game=poe2');
  await navigate('/index.html?game=poe1');
  await readyCatalog('poe1');
  await screenshot('desktop-home.png');
  await click('.builds-trigger');
  await screenshot('desktop-builds-popup.png');
  await click('#buildsDialog .builds-close');
  await navigate('/videos.html?game=poe2&sort=views&page=2');
  await readyCatalog('poe2');
  await screenshot('desktop-video-archive.png');
  check('no uncaught first-party JavaScript errors', errors.length === 0, errors.join(' | '));
}

async function cleanup() {
  if (browser) {
    try { await Promise.race([browser.send('Browser.close'), sleep(2000)]); } catch {}
  }
  if (page) { try { page.close(); } catch {} }
  if (browser) { try { browser.close(); } catch {} }
  if (chrome?.pid && chrome.exitCode === null) {
    await Promise.race([once(chrome, 'exit').catch(() => {}), sleep(2500)]);
    if (chrome.exitCode === null) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  if (profileDir && fs.existsSync(profileDir)) {
    const realTemp = fs.realpathSync(TEMP_ROOT);
    const realRun = fs.realpathSync(runDir);
    const realProfile = fs.realpathSync(profileDir);
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    const safe = same(path.dirname(realRun), realTemp)
      && path.basename(realRun).startsWith(RUN_PREFIX)
      && same(path.dirname(realProfile), realRun)
      && path.basename(realProfile) === 'chrome-profile'
      && same(realProfile, path.resolve(profileDir));
    if (!safe) throw new Error('Refusing to remove a profile outside the verified QA folder');
    fs.rmSync(realProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

(async () => {
  try { await main(); }
  catch (error) { check('QC browser review completed', false, error.stack || String(error)); }
  finally {
    try { await cleanup(); } catch (error) { check('disposable browser cleanup', false, error.message); }
    const failed = results.filter(result => !result.success);
    if (runDir) {
      fs.writeFileSync(path.join(runDir, 'results.json'), JSON.stringify({ base: BASE, results, errors, screenshots }, null, 2));
      process.stdout.write('ARTIFACTS ' + runDir + '\n');
    }
    process.stdout.write('RESULT ' + (results.length - failed.length) + '/' + results.length + ' passed; ' + failed.length + ' failed\n');
    process.exitCode = failed.length ? 1 : 0;
  }
})();
