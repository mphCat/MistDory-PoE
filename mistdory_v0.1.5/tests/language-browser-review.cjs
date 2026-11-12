'use strict';

// Dependency-free browser regression checks for the v5.4 EN/VN experience.
// Serve this version locally, then run with Node 22+ (or VS Code's Node runtime).
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const BASE = process.env.MISTDORY_QA_URL || 'http://127.0.0.1:8003';
const CHROME = process.env.MISTDORY_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_ROOT = fs.realpathSync(process.env.MISTDORY_QA_TEMP || 'C:\\Users\\minh.pham\\AppData\\Local\\Temp');
const RUN_PREFIX = 'mistdory-v54-language-review-';
const THIRD_PARTY_BLOCKS = ['*://www.youtube.com/embed/*', '*://www.youtube-nocookie.com/embed/*', '*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*', '*://img.youtube.com/*'];
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
async function readyRealm(game) {
  await waitFor(() => evaluate(expected => document.documentElement.dataset.realm === expected
    && document.documentElement.dataset.loadState === 'ready'
    && document.querySelectorAll('#cardGrid .card').length > 0, game), game + ' ready');
}

async function setLanguage(language) {
  await click('[data-language="' + language + '"]');
  await waitFor(() => evaluate(expected => window.MistI18n?.getLanguage() === expected
    && document.documentElement.lang === expected, language), language + ' language');
  await sleep(350); // Let the visible sliding indicator reach its final position.
}

async function blockCatalogs(games = []) {
  await page.send('Network.setBlockedURLs', {
    urls: [...THIRD_PARTY_BLOCKS, ...games.map(game => new URL('/data/' + game + '.json', BASE).href + '*')]
  });
}

async function state() {
  return evaluate(() => ({
    game: document.documentElement.dataset.realm,
    search: document.querySelector('#searchInput')?.value,
    category: document.querySelector('#catFilter')?.value,
    sort: document.querySelector('#sortFilter')?.value,
    page: new URL(location.href).searchParams.get('page'),
    ids: [...document.querySelectorAll('#cardGrid .card')].map(card => card.dataset.videoId),
    iframe: document.querySelector('#ytWrap iframe')?.src || null
  }));
}

async function checkTitles(game, label) {
  const actual = await evaluate(() => [...document.querySelectorAll('#cardGrid .card')].map(card => ({
    id: card.dataset.videoId,
    title: [...card.querySelector('.card-title').childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim(),
    alt: card.querySelector('img')?.alt
  })));
  const originals = new Map(catalogs[game].cards.map(card => [card.id, card.title]));
  check(label + ': source video titles and image alternatives are unchanged', actual.length > 0
    && actual.every(card => originals.get(card.id) === card.title && (card.alt == null || originals.get(card.id) === card.alt)));
  return actual.map(card => card.id);
}

async function checkTranslated(selector, source, label) {
  const value = await evaluate((target, english) => ({
    actual: document.querySelector(target)?.textContent.trim(),
    expected: window.MistI18n.t(english)
  }), selector, source);
  check(label, value.expected !== source && value.actual === value.expected, JSON.stringify(value));
}

async function checkSwitch(language) {
  const info = await evaluate(expected => {
    const control = document.querySelector('.language-switch');
    const slider = control?.querySelector('.language-slider');
    const selected = control?.querySelector('[data-language="' + expected + '"]');
    const box = slider?.getBoundingClientRect();
    const button = selected?.getBoundingClientRect();
    const color = slider ? getComputedStyle(slider).backgroundColor.match(/[\d.]+/g)?.map(Number) : null;
    return {
      labels: [...(control?.querySelectorAll('button') || [])].map(item => item.textContent.trim()),
      pressed: selected?.getAttribute('aria-pressed'),
      aligned: Boolean(box && button && Math.abs(box.x + box.width / 2 - button.x - button.width / 2) < 4),
      color,
      right: control && control.getBoundingClientRect().right,
      logoRight: document.querySelector('.nav-logo')?.getBoundingClientRect().right,
      visible: Boolean(control?.getClientRects().length)
    };
  }, language);
  check(language + ' switch has EN/VN labels and selected state', info.visible && info.labels.join('|') === 'EN|VN' && info.pressed === 'true');
  check(language + ' indicator slides under the selected button', info.aligned);
  check(language + ' indicator has the requested color', Boolean(info.color)
    && (language === 'en' ? info.color[2] > info.color[0] + 30 : info.color[0] > info.color[2] + 30), String(info.color));
  if (info.logoRight) check('language control sits on the right side of the header', info.right > info.logoRight);
}

async function checkActiveLanguageClick(language, label) {
  const snapshot = () => evaluate(() => ({
    language: MistI18n.getLanguage(),
    game: document.documentElement.dataset.realm,
    count: document.querySelector('#videoCount')?.textContent,
    cardCount: document.querySelectorAll('#cardGrid .card').length,
    totalVideos: document.querySelector('#statVideos')?.textContent,
    hero: document.querySelector('#heroSub')?.textContent,
    hint: document.querySelector('#ytHint')?.textContent,
    headings: [...document.querySelectorAll('.guide-card-title')].map(item => item.textContent),
    ids: [...document.querySelectorAll('#cardGrid .card')].map(card => card.dataset.videoId),
    search: document.querySelector('#searchInput')?.value,
    category: document.querySelector('#catFilter')?.value,
    sort: document.querySelector('#sortFilter')?.value,
    page: new URL(location.href).searchParams.get('page'),
    pageStatus: document.querySelector('#pageStatus')?.textContent
  }));
  const before = await snapshot();
  await setLanguage(language);
  const after = await snapshot();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  check(label + ': clicking the active ' + language + ' button preserves loaded text and view state', unchanged,
    unchanged ? '' : JSON.stringify({ before, after }));
}

async function checkCatalogLanguage(game, archive) {
  const route = archive ? 'videos.html' : 'index.html';
  await navigate('/' + route + '?game=' + game + '&lang=en&sort=playlist' + (archive ? '&page=2' : ''));
  await readyRealm(game);
  const english = await state();
  const englishCount = await evaluate(() => document.querySelector('#videoCount').textContent);
  await checkTitles(game, route + ' EN ' + game);
  if (game === 'poe2') await checkActiveLanguageClick('en', route + ' ' + game);
  await setLanguage('vi');
  check(route + ' ' + game + ': switching language preserves game, filters, page, cards and featured player',
    JSON.stringify(await state()) === JSON.stringify(english));
  check(route + ' ' + game + ': result counts are translated', await evaluate(before => {
    const value = document.querySelector('#videoCount').textContent;
    return value !== before && /[đĐăâêôơưạ-ỹ]/i.test(value);
  }, englishCount));
  check(route + ' ' + game + ': timestamp and sort labels are translated', await evaluate(() => {
    const timestamp = document.querySelector('#catalogUpdated').textContent;
    return /[đĐăâêôơưạ-ỹ]/i.test(timestamp)
      && document.querySelector('#sortFilter option[value="latest"]').textContent === MistI18n.t('Latest');
  }));
  await checkTitles(game, route + ' VN ' + game);
  if (archive) {
    const pagination = await evaluate(total => {
      const links = [...document.querySelectorAll('#videoPagination a')];
      const current = Number(document.querySelector('#videoPagination [aria-current="page"]')?.textContent);
      return {
        actual: document.querySelector('#pageStatus').textContent,
        expected: MistI18n.t('Page {page} of {total}', { page: current, total: Math.ceil(total / 10) }),
        english: 'Page ' + current + ' of ' + Math.ceil(total / 10),
        links: links.map(link => ({ href: link.href, language: new URL(link.href).searchParams.get('lang') }))
      };
    }, catalogs[game].cards.length);
    check(game + ': pagination is translated and language is carried into page links',
      pagination.actual === pagination.expected && pagination.actual !== pagination.english
      && pagination.links.length > 0 && pagination.links.every(link => link.language === 'vi'), JSON.stringify(pagination));
  } else {
    check(game + ': guide headings and unavailable labels are translated', await evaluate(() =>
      document.querySelector('#gc1 .guide-card-title').textContent === MistI18n.t('WIP Projects')
      && document.querySelector('#gc1 .guide-soon').textContent !== '(Soon)'));
  }
  if (game === 'poe2') await checkActiveLanguageClick('vi', route + ' ' + game);
  await setLanguage('en');
  check(route + ' ' + game + ': switching back restores English without losing state',
    JSON.stringify(await state()) === JSON.stringify(english)
    && await evaluate(before => document.querySelector('#videoCount').textContent === before, englishCount));
}

async function checkAllVideoTitles() {
  for (const game of ['poe1', 'poe2']) {
    const collected = [];
    for (let number = 1; number <= Math.ceil(catalogs[game].cards.length / 10); number++) {
      await navigate('/videos.html?game=' + game + '&lang=vi&sort=playlist&page=' + number);
      await readyRealm(game);
      collected.push(...await checkTitles(game, game + ' VN archive page ' + number));
    }
    check(game + ': every source title was checked in Vietnamese mode', collected.length === catalogs[game].cards.length
      && new Set(collected).size === catalogs[game].cards.length);
  }
}

async function checkFiltersAndDialog() {
  await navigate('/videos.html?game=poe2&lang=en&sort=views&page=2&q=blood');
  await readyRealm('poe2');
  const before = await state();
  await setLanguage('vi');
  check('search query and active sort survive language change', JSON.stringify(await state()) === JSON.stringify(before));
  await setInput('#searchInput', 'no-such-video-qa-9248');
  const emptyVi = await evaluate(() => document.querySelector('.no-results')?.textContent);
  check('empty-result state is localized', Boolean(emptyVi) && /[đĐăâêôơưạ-ỹ]/i.test(emptyVi));
  await setLanguage('en');
  check('empty-result state returns to English', await evaluate(() => document.querySelector('.no-results')?.textContent === 'No results found'));
  await click('.builds-trigger');
  const dialogEnglish = await evaluate(() => document.querySelector('#buildsDialog').innerText);
  await setLanguage('vi');
  check('build picker remains open and is translated immediately', await evaluate(beforeText => {
    const dialog = document.querySelector('#buildsDialog');
    return dialog.open && dialog.innerText !== beforeText
      && dialog.querySelector('#buildsDialogTitle').textContent === MistI18n.t('Choose your build sheet');
  }, dialogEnglish));
  await click('.builds-close');
}

async function checkPersistenceAndAbout() {
  await navigate('/index.html?game=poe2&lang=en');
  await readyRealm('poe2');
  await setLanguage('vi');
  const aboutLink = await evaluate(() => document.querySelector('.resource-dock a[href*="about.html"]').href);
  check('About link carries game and language', new URL(aboutLink).searchParams.get('game') === 'poe2'
    && new URL(aboutLink).searchParams.get('lang') === 'vi');
  await navigate(aboutLink);
  const viLead = await evaluate(() => document.querySelector('.about-lead').textContent);
  check('About opens in Vietnamese with translated introduction', await evaluate(() => MistI18n.getLanguage() === 'vi')
    && /[đĐăâêôơưạ-ỹ]/i.test(viLead));
  const viLinks = await evaluate(() => [...document.querySelectorAll('.about-page a')].map(link => link.href));
  await setLanguage('en');
  check('About English mode keeps all source destinations', await evaluate((links, lead) =>
    JSON.stringify([...document.querySelectorAll('.about-page a')].map(link => link.href)) === JSON.stringify(links)
    && document.querySelector('.about-lead').textContent !== lead, viLinks, viLead));
  await setLanguage('vi');
  await navigate('/index.html?game=poe2');
  await readyRealm('poe2');
  check('saved preference survives navigation without an explicit language', await evaluate(() => MistI18n.getLanguage() === 'vi'));
  await page.send('Page.reload');
  await waitFor(() => evaluate(() => document.readyState === 'complete' && document.documentElement.dataset.loadState === 'ready'), 'reload');
  check('saved preference survives reload', await evaluate(() => MistI18n.getLanguage() === 'vi'));
  await navigate('/index.html?game=poe2&lang=en');
  await readyRealm('poe2');
  check('explicit URL language overrides saved preference', await evaluate(() => MistI18n.getLanguage() === 'en'));
  await page.send('Page.bringToFront');
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const focus = await evaluate(() => {
    window.focus();
    const button = document.querySelector('[data-language="vi"]');
    button.focus({ preventScroll: true });
    return { focused: document.activeElement === button, documentFocused: document.hasFocus(), activeTag: document.activeElement?.tagName };
  });
  check('native keyboard target is the focused Vietnamese button', focus.focused && focus.documentFocused, JSON.stringify(focus));
  if (!focus.focused || !focus.documentFocused) throw new Error('Native keyboard target could not be focused: ' + JSON.stringify(focus));
  // Native Enter includes the carriage-return text/keypress default action.
  // A textless CDP keyDown omits that action and does not activate a button.
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor(() => evaluate(() => MistI18n.getLanguage() === 'vi'), 'keyboard language selection');
  check('language buttons support keyboard activation', true);
  for (const [key, code, language] of [['ArrowLeft', 37, 'en'], ['ArrowRight', 39, 'vi']]) {
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
    await waitFor(() => evaluate(expected => MistI18n.getLanguage() === expected
      && document.activeElement?.dataset.language === expected, language), key + ' language and focus');
    check(key + ' selects and focuses the expected language', true);
  }
}

async function checkRecoveryAndStorage() {
  await blockCatalogs(['poe2']);
  await navigate('/index.html?game=poe2&lang=vi');
  await waitFor(() => evaluate(() => document.documentElement.dataset.loadState === 'error'), 'injected catalog failure');
  check('failure message and retry button are localized', await evaluate(() => {
    const message = document.querySelector('#catalogStatusText').textContent;
    const retry = document.querySelector('#retryCatalogBtn');
    return /[đĐăâêôơưạ-ỹ]/i.test(message) && !retry.hidden && retry.textContent === MistI18n.t('Try again');
  }));
  await setLanguage('en');
  check('failed catalog can change language without losing retry', await evaluate(() =>
    /could not be loaded/i.test(document.querySelector('#catalogStatusText').textContent)
    && !document.querySelector('#retryCatalogBtn').hidden));
  await blockCatalogs();
  await click('#retryCatalogBtn');
  await readyRealm('poe2');
  await checkTitles('poe2', 'retry recovery');
  const injected = await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value() { throw new Error('QA storage disabled'); } }); Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() { throw new Error('QA storage disabled'); } });"
  });
  try {
    await navigate('/index.html?game=poe1&lang=vi');
    await readyRealm('poe1');
    check('explicit language works with browser storage unavailable', await evaluate(() => MistI18n.getLanguage() === 'vi'));
    await setLanguage('en');
    check('language switch works with browser storage unavailable', await evaluate(() => MistI18n.getLanguage() === 'en'));
  } finally { await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier }); }
}

async function checkLanguageHistory() {
  await navigate('/index.html?game=poe1&lang=en&q=craft&category=VIDEO&sort=views');
  await readyRealm('poe1');
  await evaluate(() => {
    window.__qaHistoryTrace = [];
    const snapshot = name => window.__qaHistoryTrace.push({
      name, url: location.href, language: MistI18n.getLanguage(),
      game: document.documentElement.dataset.realm,
      query: document.querySelector('#searchInput')?.value,
      category: document.querySelector('#catFilter')?.value,
      sort: document.querySelector('#sortFilter')?.value
    });
    window.addEventListener('popstate', () => {
      snapshot('popstate end');
      setTimeout(() => snapshot('popstate next task'), 0);
    });
  });
  const original = await state();
  await click('#btnPoe2');
  await readyRealm('poe2');
  await setLanguage('vi');
  const next = await state();
  const beforeBack = await page.send('Page.getNavigationHistory');
  await evaluate(() => history.back());
  async function historyWait(predicate, label, beforeNavigation) {
    try { await waitFor(predicate, label); }
    catch (error) {
      const actual = await evaluate(() => ({
        url: location.href, language: window.MistI18n?.getLanguage(),
        htmlLanguage: document.documentElement.lang,
        realm: document.documentElement.dataset.realm,
        loadState: document.documentElement.dataset.loadState,
        urlQuery: new URL(location.href).searchParams.get('q'),
        inputQuery: document.querySelector('#searchInput')?.value,
        category: document.querySelector('#catFilter')?.value,
        sort: document.querySelector('#sortFilter')?.value,
        videoCount: document.querySelector('#videoCount')?.textContent,
        ids: [...document.querySelectorAll('#cardGrid .card')].map(card => card.dataset.videoId),
        historyLength: history.length, historyState: history.state,
        userActivation: { active: navigator.userActivation?.isActive, hasBeenActive: navigator.userActivation?.hasBeenActive },
        trace: window.__qaHistoryTrace
      }));
      const afterNavigation = await page.send('Page.getNavigationHistory');
      throw new Error(error.message + '\nHISTORY_DIAGNOSTIC ' + JSON.stringify({
        original, next, actual, beforeNavigation, afterNavigation, errors
      }));
    }
  }
  await historyWait(() => evaluate(() => MistI18n.getLanguage() === 'en'
    && document.documentElement.dataset.realm === 'poe1'
    && document.documentElement.dataset.loadState === 'ready'
    && document.querySelector('#searchInput').value === 'craft'), 'Back restores English PoE 1 search', beforeBack);
  const restored = await state();
  check('Back restores the original English game, query, category, sort and results',
    JSON.stringify(restored) === JSON.stringify(original), JSON.stringify({ original, restored }));
  const beforeForward = await page.send('Page.getNavigationHistory');
  await evaluate(() => history.forward());
  await historyWait(() => evaluate(() => MistI18n.getLanguage() === 'vi'
    && document.documentElement.dataset.realm === 'poe2'
    && document.documentElement.dataset.loadState === 'ready'), 'Forward restores Vietnamese PoE 2', beforeForward);
  const forwarded = await state();
  check('Forward restores Vietnamese and the second game without overwriting the history destination',
    JSON.stringify(forwarded) === JSON.stringify(next), JSON.stringify({ expected: next, actual: forwarded }));
}

async function checkFontLab() {
  await navigate('/font-preview.html?lang=en');
  await evaluate(() => { const input = document.querySelector('#fontCormorant'); input.checked = true; input.dispatchEvent(new Event('change')); });
  const before = await evaluate(() => ({ title: document.querySelector('#labTitle').textContent, status: document.querySelector('#selectedLoadStatus').textContent }));
  await setLanguage('vi');
  check('font lab explanatory content and status are localized without resetting font selection', await evaluate(previous =>
    document.querySelector('#labTitle').textContent !== previous.title
    && document.querySelector('#selectedLoadStatus').textContent !== previous.status
    && document.querySelector('#fontCormorant').checked
    && document.querySelector('#selectedFontName').textContent === 'Cormorant Garamond', before));
}

async function checkImmediateFontCompletion() {
  const injected = await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "window.__qaFontLoadStates = []; Object.defineProperty(document.fonts, 'load', { configurable: true, value() { window.__qaFontLoadStates.push(document.readyState); return Promise.resolve([]); } });"
  });
  try {
    await navigate('/font-preview.html?lang=vi');
    const status = await evaluate(() => {
      const options = [...document.querySelectorAll('[data-font-status]')].map(item => {
        const key = item.dataset.fontStatus;
        return {
          key,
          state: item.closest('[data-font-state]')?.dataset.fontState,
          actual: item.textContent,
          expected: MistI18n.t(['utmniagara', 'niagara'].includes(key)
            ? 'Font not found on this device' : 'Font could not load · Check your connection')
        };
      });
      return {
        loadStates: window.__qaFontLoadStates,
        options,
        selectedState: document.querySelector('#selectedPreview').dataset.fontState,
        selectedActual: document.querySelector('#selectedLoadStatus').textContent,
        selectedExpected: MistI18n.t('Could not load the font. Check your connection to Google Fonts and reload the page.')
      };
    });
    check('font race fixture completes every font request before DOMContentLoaded',
      status.loadStates.length === 7 && status.loadStates.every(value => value === 'loading'), JSON.stringify(status.loadStates));
    const correct = status.options.length === 7
      && status.options.every(option => option.state === 'error' && option.actual === option.expected)
      && status.selectedState === 'error' && status.selectedActual === status.selectedExpected;
    check('immediate font failures keep localized error statuses after DOMContentLoaded', correct, correct ? '' : JSON.stringify(status));
  } finally {
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier });
  }
}

async function checkMobile() {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const route of ['index.html?game=poe1&lang=vi', 'videos.html?game=poe2&lang=vi', 'about.html?lang=vi', 'font-preview.html?lang=vi']) {
    await navigate('/' + route);
    if (!/about|font-preview/.test(route)) await readyRealm(route.includes('poe2') ? 'poe2' : 'poe1');
    const layout = await evaluate(() => {
      const visible = element => element && element.getClientRects().length > 0;
      const controls = [...document.querySelectorAll('.nav-logo, .nav-cta, .language-switch')].filter(visible).map(element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      });
      const overlap = controls.some((first, index) => controls.slice(index + 1).some(second =>
        Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
        && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1));
      const language = document.querySelector('.language-switch')?.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, overlap,
        switchVisible: Boolean(language && language.left >= 0 && language.right <= innerWidth + 1) };
    });
    check('390px Vietnamese layout ' + route + ': no overflow or header overlap', !layout.overflow && !layout.overlap && layout.switchVisible, JSON.stringify(layout));
  }
  await screenshot('mobile-vietnamese-font-lab.png');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}

async function checkViewCounterFooter() {
  for (const width of [1440, 390]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 });
    for (const route of ['index.html', 'videos.html', 'about.html']) {
      await navigate('/' + route + '?lang=vi');
      await evaluate(() => document.querySelector('.footer').scrollIntoView({ block: 'center' }));
      await sleep(150);
      const footer = await evaluate(() => {
        const copy = document.querySelector('.footer-copy').getBoundingClientRect();
        const views = document.querySelector('.footer-views').getBoundingClientRect();
        const dock = document.querySelector('.resource-dock').getBoundingClientRect();
        return {
          label: document.querySelector('.footer-views [data-i18n]').textContent,
          value: document.getElementById('totalPageViews').textContent,
          noOverflow: document.documentElement.scrollWidth <= innerWidth,
          aboveDock: views.bottom <= dock.top + 1,
          aligned: innerWidth > 600 ? Math.abs(copy.top - views.top) < 5 : views.top >= copy.bottom - 1
        };
      });
      check(width + 'px counter footer ' + route + ': localized neutral value and usable layout',
        footer.label === 'Lượt xem' && footer.value === '—' && footer.noOverflow && footer.aboveDock && footer.aligned, JSON.stringify(footer));
      if (route === 'index.html') await screenshot(width + 'px-counter-footer.png');
    }
  }
}
async function main() {
  for (const game of ['poe1', 'poe2']) {
    const response = await fetch(new URL('data/' + game + '.json', BASE));
    if (!response.ok) throw new Error(game + ' catalog HTTP ' + response.status);
    catalogs[game] = await response.json();
  }
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
  const targets = await fetch('http://127.0.0.1:' + new URL(browserUrl).port + '/json/list').then(response => response.json());
  const target = targets.find(item => item.id === created.targetId);
  if (!target) throw new Error('Missing created Chrome target');
  page = await CDP.connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await blockCatalogs();
  page.on('Runtime.exceptionThrown', params => errors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  if (process.env.MISTDORY_QA_CASE === 'history') {
    await checkLanguageHistory();
    check('no uncaught first-party JavaScript errors', errors.length === 0, errors.join(' | '));
    return;
  }

  await navigate('/index.html?game=poe1&lang=en');
  await readyRealm('poe1');
  check('v5.4 exposes the language API', await evaluate(() => Boolean(window.MistI18n?.t && window.MistI18n?.setLanguage)));
  await checkSwitch('en');
  await screenshot('desktop-english-home.png');
  await setLanguage('vi');
  await checkSwitch('vi');
  await screenshot('desktop-vietnamese-home.png');
  for (const game of ['poe1', 'poe2']) for (const archive of [false, true]) await checkCatalogLanguage(game, archive);
  await checkAllVideoTitles();
  await checkFiltersAndDialog();
  await checkPersistenceAndAbout();
  await checkRecoveryAndStorage();
  await checkLanguageHistory();
  await checkFontLab();
  await checkImmediateFontCompletion();
  await checkMobile();
  await checkViewCounterFooter();
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
