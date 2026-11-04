'use strict';

// Offline integration tests for the actual browser entry point. The DOM adapter
// models only browser interfaces used by main.js; fetch responses and navigation
// are controlled inputs. No network, packages, browser profile or catalog writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const utilities = require('../js/catalog-utils.js');

const root = path.resolve(__dirname, '..');
const realCatalogs = Object.fromEntries(['poe1', 'poe2'].map(game => [game,
  JSON.parse(fs.readFileSync(path.join(root, 'data', game + '.json'), 'utf8'))
]));
const clone = value => structuredClone(value);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

class Element {
  constructor(tagName = 'div', document = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.className = '';
    this._html = '';
    this._text = '';
    this.listeners = new Map();
    this.style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].filter(Boolean).join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
      toggle: (name, enabled) => {
        const next = enabled === undefined ? !this.classList.contains(name) : enabled;
        if (next) this.classList.add(name); else this.classList.remove(name);
        return next;
      }
    };
  }
  set id(value) { this._id = value; if (this.ownerDocument) this.ownerDocument.nodes.set(value, this); }
  get id() { return this._id || ''; }
  set href(value) { this.attributes.set('href', String(value)); }
  get href() { return this.attributes.get('href') || ''; }
  set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(value) { this._text = String(value ?? ''); this._html = ''; this.children = []; }
  get textContent() { return this._text || this._html.replace(/<[^>]*>/g, '') + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'hidden') this.hidden = true;
    if (name === 'disabled') this.disabled = true;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden') this.hidden = false;
    if (name === 'disabled') this.disabled = false;
  }
  toggleAttribute(name, force) {
    const enabled = force === undefined ? !this.attributes.has(name) : force;
    if (enabled) this.setAttribute(name, ''); else this.removeAttribute(name);
    return enabled;
  }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.innerHTML = ''; this.append(...children); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback)); }
  dispatchEvent(event) {
    event.target ||= this;
    for (const callback of this.listeners.get(event.type) || []) callback(event);
    return true;
  }
  click() { if (!this.disabled) { this.onclick?.({ target: this, button: 0 }); this.dispatchEvent({ type: 'click', target: this, button: 0 }); } }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  matches(selector) {
    return selector.split(',').some(part => {
      const simple = part.trim().split(/\s+/).pop();
      const attribute = /\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]/.exec(simple);
      const plain = simple.replace(/\[[^\]]+\]/g, '');
      const id = /#([\w-]+)/.exec(plain)?.[1];
      const classes = [...plain.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
      const tag = /^[a-z][\w-]*/i.exec(plain)?.[0];
      return (!tag || this.tagName === tag.toUpperCase()) && (!id || this.id === id)
        && classes.every(name => this.classList.contains(name))
        && (!attribute || (this.getAttribute(attribute[1]) !== null && (attribute[2] === undefined || this.getAttribute(attribute[1]) === attribute[2])));
    });
  }
  closest(selector) { let node = this; while (node) { if (node.matches(selector)) return node; node = node.parentElement; } return null; }
  querySelectorAll(selector) {
    const descendants = [];
    const visit = node => { for (const child of node.children) { if (child.matches(selector)) descendants.push(child); visit(child); } };
    visit(this);
    return descendants;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
  get selectedOptions() { return this.options.filter(option => option.value === this.value); }
}

class Document {
  constructor(archive) {
    this.nodes = new Map();
    this.listeners = new Map();
    this.documentElement = new Element('html', this);
    this.head = this.documentElement.appendChild(new Element('head', this));
    this.body = this.documentElement.appendChild(new Element('body', this));
    this.body.dataset.page = archive ? 'videos' : '';
    this.readyState = 'complete';
    this.add('navAccent', 'span');
    this.add('footerAccent', 'span');
    this.add('btnPoe1', 'button');
    this.add('btnPoe2', 'button');
    this.add('realmSlider');
    this.add('realmLabel');
    const filters = this.body.appendChild(new Element('div', this));
    filters.className = 'filter-bar';
    this.add('searchInput', 'input', filters);
    const categories = this.add('catFilter', 'select', filters);
    for (const value of ['', 'BUILD', 'CRAFTING', 'VIDEO']) this.option(categories, value);
    const sort = this.add('sortFilter', 'select', filters);
    for (const value of ['latest', 'views', 'playlist', 'name']) this.option(sort, value);
    sort.value = 'latest';
    this.add('videoCount', 'p');
    this.add('catalogUpdated', 'p');
    this.add('cardGrid');
    this.add('videosTitle', archive ? 'h1' : 'h2');
    const status = this.add('catalogStatus');
    status.setAttribute('role', 'status');
    status.hidden = true;
    this.add('catalogStatusText', 'p', status);
    this.add('retryCatalogBtn', 'button', status);
    if (archive) {
      this.add('pageStatus', 'p');
      this.add('videoPagination', 'nav');
    } else {
      this.add('allVideosBtn', 'a');
      const hero = this.add('heroSection', 'section');
      hero.className = 'hero';
      for (const id of ['heroAccent', 'poeBadge', 'verBadge', 'heroSub', 'discordMain', 'discordCowb']) this.add(id, 'span', hero);
      for (const id of ['statBuilds', 'statCraft', 'statVideos']) {
        const holder = hero.appendChild(new Element('div', this));
        this.add(id, 'span', holder);
      }
      const wrap = this.add('ytWrap', 'div', hero);
      const placeholder = this.add('ytPlaceholder', 'div', wrap);
      this.add('ytPlayBtn', 'div', placeholder);
      this.add('ytHint', 'div', placeholder);
      const actions = this.add('featuredVideoActions', 'div', hero);
      actions.hidden = true;
      this.add('featuredVideoLink', 'a', actions);
      const guides = this.body.appendChild(new Element('section', this));
      guides.className = 'section';
      this.add('guideTitle', 'div', guides);
      for (const id of ['gc1', 'gc2', 'gc3', 'gc4']) {
        const card = this.add(id, 'div', guides);
        card.className = 'guide-card';
        const title = card.appendChild(new Element('div', this));
        title.className = 'guide-card-title';
        const rows = card.appendChild(new Element('div', this));
        rows.className = 'guide-rows-wrap';
      }
      const divider = this.body.appendChild(new Element('div', this));
      divider.className = 'divider';
    }
  }
  createElement(tag) { return new Element(tag, this); }
  add(id, tag = 'div', parent = this.body) { const item = this.createElement(tag); item.id = id; parent.appendChild(item); return item; }
  option(parent, value) { const item = parent.appendChild(this.createElement('option')); item.value = value; item.setAttribute('value', value); return item; }
  getElementById(id) { return this.nodes.get(id) || null; }
  querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector); }
  querySelector(selector) { return this.documentElement.querySelector(selector); }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  dispatchEvent(event) { for (const callback of this.listeners.get(event.type) || []) callback(event); }
}

function response(game, kind = 'ok') {
  if (kind === 'network') return Promise.reject(new TypeError('Network unavailable'));
  const code = kind === '404' ? 404 : kind === '500' ? 500 : 200;
  return Promise.resolve({
    ok: code === 200, status: code, statusText: code === 200 ? 'OK' : 'Unavailable',
    async json() {
      if (kind === 'json') throw new SyntaxError('Unexpected token');
      if (kind === 'shape') return { meta: {}, cards: [] };
      const data = clone(realCatalogs[game]);
      if (kind === 'source-null') data.source = null;
      if (kind === 'extra-guide') data.guideRows.future = { title: 'Future group', rows: [] };
      return data;
    }
  });
}

function createApp({ archive = false, game = 'poe1', failures = {}, search = '', page = 1 } = {}) {
  const document = new Document(archive);
  let currentUrl = new URL('http://preview.test/' + (archive ? 'videos.html' : 'index.html'));
  currentUrl.searchParams.set('game', game);
  if (search) currentUrl.searchParams.set('q', search);
  if (archive) currentUrl.searchParams.set('page', String(page));
  const entries = [currentUrl.href];
  let entryIndex = 0;
  let remembered = 'poe1';
  const listeners = new Map();
  const requests = [];
  const timers = new Set();
  const rules = new Map(Object.entries(failures));
  const errors = [];
  const location = {};
  for (const key of ['href', 'pathname', 'search', 'hash', 'origin', 'protocol']) Object.defineProperty(location, key, { get: () => currentUrl[key] });
  const history = {
    replaceState(state, title, value) { currentUrl = new URL(value, currentUrl); entries[entryIndex] = currentUrl.href; },
    pushState(state, title, value) { currentUrl = new URL(value, currentUrl); entries.splice(++entryIndex); entries.push(currentUrl.href); },
    back() { if (entryIndex > 0) { currentUrl = new URL(entries[--entryIndex]); fire('popstate', { type: 'popstate' }); } },
    forward() { if (entryIndex + 1 < entries.length) { currentUrl = new URL(entries[++entryIndex]); fire('popstate', { type: 'popstate' }); } }
  };
  const fire = (name, event) => { for (const callback of listeners.get(name) || []) callback(event); };
  const sandbox = {
    URL, URLSearchParams, AbortController, DOMException, structuredClone,
    document, location, history,
    console: { error: (...parts) => errors.push(parts.map(String).join(' ')), warn() {}, log() {} },
    setTimeout(callback, delay) { const handle = setTimeout(() => { timers.delete(handle); callback(); }, delay); handle.unref?.(); timers.add(handle); return handle; },
    clearTimeout(handle) { clearTimeout(handle); timers.delete(handle); },
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(callback); },
    removeEventListener(name, callback) { listeners.set(name, (listeners.get(name) || []).filter(item => item !== callback)); },
    fetch(url, options) {
      const match = /\/?(poe[12])\.json(?:\?|$)/.exec(String(url));
      if (!match) throw new Error('Unexpected fetch in catalog loading test: ' + url);
      const requestedGame = match[1];
      requests.push({ game: requestedGame, options });
      const rule = rules.get(requestedGame);
      return typeof rule === 'function' ? rule(requestedGame, options) : response(requestedGame, rule || 'ok');
    },
    MistCatalogUtils: utilities,
    MistSite: {
      getRealm() { const fromUrl = currentUrl.searchParams.get('game'); return ['poe1', 'poe2'].includes(fromUrl) ? fromUrl : remembered; },
      rememberRealm(value) { remembered = value; },
      url(filename, values = {}) {
        const result = new URL(filename, currentUrl); result.search = '';
        for (const [key, value] of Object.entries(values)) if (value !== '' && value != null) result.searchParams.set(key, String(value));
        return result.pathname + result.search + result.hash;
      }
    },
    open() {},
    // The player is a separately tested boundary. No third-party script is
    // executed or simulated as successful playback by this offline harness.
    navigator: { userAgent: 'CatalogLoadingTest' }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8'), context, { filename: 'main.js' });
  const app = {
    document, window: sandbox, history, requests, errors,
    node: id => document.getElementById(id),
    ids: () => [...document.getElementById('cardGrid').innerHTML.matchAll(/data-video-id="([^"]+)"/g)].map(match => match[1]),
    setResponse: (realm, kind) => rules.set(realm, kind),
    boot: () => document.dispatchEvent({ type: 'DOMContentLoaded' }),
    location: () => new URL(currentUrl),
    state: () => document.documentElement.dataset.loadState,
    selectedGame: () => document.documentElement.dataset.realm,
    dispose: () => { for (const handle of timers) clearTimeout(handle); timers.clear(); }
  };
  return app;
}

async function until(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Did not reach ' + label);
}
async function ready(app, game) {
  await until(() => app.selectedGame() === game && app.state() === 'ready', game + ' ready');
  assert.ok(app.ids().length > 0, 'ready realm has cards');
  const own = new Set(realCatalogs[game].cards.map(card => card.id));
  assert.ok(app.ids().every(id => own.has(id)), 'all rendered cards belong to selected realm');
  assert.equal(app.node('catalogStatus').hidden, true, 'successful state dismisses status banner');
  assert.equal(app.node('searchInput').disabled, false);
  if (app.node('heroSection')) {
    const expected = realCatalogs[game].meta.ytId;
    const frame = app.node('ytWrap').querySelector('iframe');
    assert.ok(frame, 'ready realm has a featured iframe');
    assert.equal(frame.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
    assert.equal(new URL(frame.src).searchParams.get('origin'), app.location().origin);
    assert.equal(app.node('featuredVideoActions').hidden, false);
    assert.equal(app.node('featuredVideoLink').href, 'https://www.youtube.com/watch?v=' + expected);
  }
}
async function failed(app, game) {
  await until(() => app.selectedGame() === game && app.state() === 'error', game + ' error');
  assert.equal(app.node('catalogStatus').hidden, false, 'failed realm displays status');
  assert.match(app.node('catalogStatusText').textContent, /unable|could not|failed|unavailable|try again|load/i);
  assert.equal(app.node('retryCatalogBtn').hidden, false, 'retry action is exposed');
  assert.deepEqual(app.ids(), [], 'failed realm shows no old cards');
  assert.equal(app.node('searchInput').disabled, true);
  const hero = app.node('heroSection');
  if (hero) {
    assert.equal(hero.hidden, true, 'failed realm hides stale hero');
    assert.equal(app.node('ytWrap').querySelector('iframe'), null, 'stale featured iframe removed');
    assert.equal(app.node('featuredVideoActions').hidden, true, 'failed realm hides the direct featured-video action');
    assert.equal(app.node('featuredVideoLink').getAttribute('href'), null, 'stale direct featured-video destination removed');
    for (const rows of app.document.querySelectorAll('.guide-rows-wrap')) assert.equal(rows.innerHTML, '', 'stale guide links cleared');
  }
  if (app.node('videoPagination')) assert.equal(app.node('videoPagination').hidden, true);
}

for (const archive of [false, true]) {
  const label = archive ? 'archive' : 'home';
  for (const kind of ['404', 'json', 'shape', 'network']) {
    test(label + ': PoE 2 ' + kind + ' failure leaves PoE 1 usable and never shows mixed content', async t => {
      const app = createApp({ archive, failures: { poe2: kind } });
      t.after(app.dispose);
      app.boot();
      await ready(app, 'poe1');
      assert.equal(app.ids().length, archive ? 10 : 6);
      app.window.switchRealm('poe2');
      await failed(app, 'poe2');
      assert.equal(app.location().searchParams.get('game'), 'poe2');
      app.window.switchRealm('poe1');
      await ready(app, 'poe1');
    });
  }

  test(label + ': an explicitly selected failed PoE 1 stays selected while PoE 2 remains accessible', async t => {
    const app = createApp({ archive, failures: { poe1: '500' } });
    t.after(app.dispose);
    app.boot();
    await failed(app, 'poe1');
    assert.equal(app.location().searchParams.get('game'), 'poe1');
    app.window.switchRealm('poe2');
    await ready(app, 'poe2');
  });

  for (const kind of ['source-null', 'extra-guide']) {
    test(label + ': ' + kind + ' metadata is handled without leaving a half-rendered ready state', async t => {
      const app = createApp({ archive, game: 'poe2', failures: { poe2: kind } });
      t.after(app.dispose);
      app.boot();
      await until(() => app.selectedGame() === 'poe2'
        && (app.state() === 'error' || (app.state() === 'ready' && app.ids().length > 0)), 'complete render or recoverable metadata error');
      if (app.state() === 'error') await failed(app, 'poe2');
      else await ready(app, 'poe2');
      app.window.switchRealm('poe1');
      await ready(app, 'poe1');
    });
  }

  test(label + ': both failures are recoverable by retrying only the selected game', async t => {
    const app = createApp({ archive, failures: { poe1: '500', poe2: 'json' } });
    t.after(app.dispose);
    app.boot();
    await failed(app, 'poe1');
    app.setResponse('poe1', 'ok');
    await app.window.retryRealm();
    await ready(app, 'poe1');
    assert.equal(app.requests.filter(request => request.game === 'poe1').length, 2);
    assert.equal(app.requests.filter(request => request.game === 'poe2').length, 1, 'healthy recovery does not refetch the other realm');
    app.window.switchRealm('poe2');
    await failed(app, 'poe2');
  });

  test(label + ': Back and Forward restore game and filters when only one catalog is available', async t => {
    const search = archive ? 'PoE' : 'CoWB';
    const app = createApp({ archive, search, page: archive ? 2 : 1, failures: { poe2: '404' } });
    t.after(app.dispose);
    app.boot();
    await ready(app, 'poe1');
    const before = app.ids();
    app.window.switchRealm('poe2');
    await failed(app, 'poe2');
    app.history.back();
    await ready(app, 'poe1');
    assert.equal(app.node('searchInput').value, search);
    if (archive) assert.equal(app.location().searchParams.get('page'), '2');
    assert.deepEqual(app.ids(), before);
    app.history.forward();
    await failed(app, 'poe2');
  });

  test(label + ': a slow second response cannot block or replace the first selected realm', async t => {
    const pending = deferred();
    const app = createApp({ archive, failures: { poe2: () => pending.promise } });
    t.after(app.dispose);
    app.boot();
    await ready(app, 'poe1');
    const before = app.ids();
    pending.resolve(await response('poe2'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.selectedGame(), 'poe1');
    assert.deepEqual(app.ids(), before);
    app.window.switchRealm('poe2');
    await ready(app, 'poe2');
  });

  test(label + ': switching to a still-loading game clears stale content and permits switching back', async t => {
    const pending = deferred();
    const app = createApp({ archive, failures: { poe2: () => pending.promise } });
    t.after(app.dispose);
    app.boot();
    await ready(app, 'poe1');
    const before = app.ids();
    app.window.switchRealm('poe2');
    assert.equal(app.selectedGame(), 'poe2');
    assert.equal(app.state(), 'loading');
    assert.equal(app.node('catalogStatus').hidden, false);
    assert.equal(app.node('retryCatalogBtn').hidden, true, 'pending requests have no redundant retry button');
    assert.deepEqual(app.ids(), []);
    assert.equal(app.node('searchInput').disabled, true);
    if (app.node('heroSection')) assert.equal(app.node('heroSection').hidden, true);
    app.window.switchRealm('poe1');
    await ready(app, 'poe1');
    pending.resolve(await response('poe2'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.selectedGame(), 'poe1');
    assert.deepEqual(app.ids(), before);
    app.window.switchRealm('poe2');
    await ready(app, 'poe2');
  });

  test(label + ': repeated retry is deduplicated and late recovery cannot overwrite another selected realm', async t => {
    const app = createApp({ archive, failures: { poe1: '404' } });
    t.after(app.dispose);
    app.boot();
    await failed(app, 'poe1');
    const recovery = deferred();
    app.setResponse('poe1', () => recovery.promise);
    const first = app.window.retryRealm();
    const repeated = app.window.retryRealm();
    await until(() => app.requests.filter(request => request.game === 'poe1').length === 2, 'one retry fetch');
    app.window.switchRealm('poe2');
    await ready(app, 'poe2');
    const before = app.ids();
    recovery.resolve(await response('poe1'));
    await Promise.all([first, repeated]);
    assert.equal(app.requests.filter(request => request.game === 'poe1').length, 2, 'only one pending retry request');
    assert.equal(app.selectedGame(), 'poe2');
    assert.equal(app.location().searchParams.get('game'), 'poe2');
    assert.deepEqual(app.ids(), before);
    app.window.switchRealm('poe1');
    await ready(app, 'poe1');
  });
}

for (const game of ['poe1', 'poe2']) {
  test('home: ' + game + ' missing featured selection falls back to a public card rather than a project video', async t => {
    const data = clone(realCatalogs[game]);
    const projectVideoId = 'abcdefghijk';
    data.meta.ytId = projectVideoId;
    data.guideRows.gc1.rows.push({ label: 'Curated project video', url: 'https://www.youtube.com/watch?v=' + projectVideoId,
      privacyStatus: 'public', featured: true });
    const expectedId = data.cards.find(card => card.privacyStatus === 'public').id;
    const app = createApp({ game });
    t.after(app.dispose);
    app.setResponse(game, () => Promise.resolve({ ok: true, status: 200, async json() { return data; } }));
    app.boot();
    await ready(app, game);
    const frame = app.node('ytWrap').querySelector('iframe');
    assert.ok(frame, 'a verified catalog video remains available');
    assert.equal(new URL(frame.src).pathname, '/embed/' + expectedId);
    assert.equal(app.node('featuredVideoLink').href, 'https://www.youtube.com/watch?v=' + expectedId);
    assert.notEqual(expectedId, projectVideoId);
    assert.match(app.node('gc1').querySelector('.guide-rows-wrap').innerHTML, /Curated project video/,
      'curated project content remains independent from the hero selection');
  });

  test('home: ' + game + ' resource rows are direct links, placeholders stay inert and non-public videos stay hidden', async t => {
    const data = clone(realCatalogs[game]);
    data.guideRows.gc1.rows.push({ label: 'Testing project resource', url: 'https://example.com/project' });
    data.guideRows.gc1.rows.push({ label: 'Excluded private project clip', url: 'https://www.youtube.com/watch?v=abcdefghijk', privacyStatus: 'private' });
    data.guideRows.gc2.rows.push({ label: 'Read <notes> & craft', url: '#' });
    data.guideRows.gc4.rows.push({ label: 'Excluded private clip', url: 'https://www.youtube.com/watch?v=abcdefghijk', privacyStatus: 'private' });
    const app = createApp({ game });
    t.after(app.dispose);
    app.setResponse(game, () => Promise.resolve({ ok: true, status: 200, async json() { return data; } }));
    app.boot();
    await ready(app, game);
    const groups = ['gc1', 'gc2', 'gc3', 'gc4'].map(id => app.node(id).querySelector('.guide-rows-wrap').innerHTML);
    for (const html of groups) {
      assert.doesNotMatch(html, /\bguide-btn\b|<button\b/, 'resource rows have no separate action buttons');
      for (const match of html.matchAll(/<a\b([^>]*)>/g)) {
        assert.match(match[1], /class="[^"]*\bguide-row-link\b/);
        assert.match(match[1], /target="_blank"/);
        assert.match(match[1], /rel="[^"]*noopener[^"]*noreferrer/);
        assert.doesNotMatch(match[1], /href="#"/, 'unavailable resources are never placeholder anchors');
      }
    }
    assert.equal(app.node('gc1').querySelector('.guide-card-title').textContent, 'WIP Projects');
    assert.match(groups[0], /Testing project resource/, 'curated project links render like other resources');
    assert.doesNotMatch(groups[0], /Excluded private project clip|abcdefghijk/, 'private project video links are absent');
    assert.match(groups[1], /Read &lt;notes&gt; &amp; craft/, 'custom resource labels are escaped');
    assert.match(groups[0], /\(Soon\)/, 'a WIP placeholder includes visible Soon text');
    assert.match(groups[0], /guide-row-unavailable/, 'a WIP placeholder is a non-interactive row');
    assert.doesNotMatch(groups[3], /Excluded private clip|abcdefghijk/, 'private video links are absent');
  });
}
