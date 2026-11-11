/* ── MistDory — main.js ───────────────────────────────────────────────────
   All site logic: data loading, realm switching, card rendering, filtering.
   To customise content edit data/poe1.json and data/poe2.json — no JS needed.
────────────────────────────────────────────────────────────────────────── */

let DATA    = {};   /* filled after JSON fetch */
const LOAD_STATE = Object.fromEntries(['poe1', 'poe2'].map(game => [game, { status: 'idle', error: null, promise: null }]));
const CATALOG_TIMEOUT_MS = 15000;
let realm   = 'poe1';
let currentPage = 1;
const IS_ARCHIVE = document.body.dataset.page === 'videos';
const Catalog = window.MistCatalogUtils;
const VIDEO_PREVIEW_LIMIT = 6;

function restoreViewState() {
  const params = new URL(window.location.href).searchParams;
  realm = window.MistSite.getRealm();
  document.getElementById('searchInput').value = params.get('q') || '';
  const category = params.get('category') || '';
  document.getElementById('catFilter').value = ['BUILD', 'CRAFTING', 'VIDEO'].includes(category) ? category : '';
  const sort = params.get('sort');
  document.getElementById('sortFilter').value = ['latest', 'views', 'playlist', 'name'].includes(sort) ? sort : 'latest';
  currentPage = Number(params.get('page')) || 1;
}

function viewValues(page = currentPage) {
  return {
    game: realm,
    q: document.getElementById('searchInput').value.trim(),
    category: document.getElementById('catFilter').value,
    sort: document.getElementById('sortFilter').value,
    page: IS_ARCHIVE ? page : null
  };
}

function writeViewUrl(method = 'replaceState') {
  const url = window.MistSite.url(IS_ARCHIVE ? 'videos.html' : 'index.html', viewValues());
  history[method](null, '', url + window.location.hash);
}

function updateCategoryOptions(cards) {
  const select = document.getElementById('catFilter');
  const available = new Set(Catalog.getAvailableCategories(cards));
  Array.from(select.options).forEach(option => {
    if (!option.value) return;
    option.hidden = !available.has(option.value);
    option.disabled = option.hidden;
  });
  if (!available.has(select.value)) select.value = '';
}

function updateCatalogTime(source = {}) {
  source = source && typeof source === 'object' ? source : {};
  const target = document.getElementById('catalogUpdated');
  const value = source.refreshedAt || source.metricsCheckedAt || source.visibilityCheckedAt || source.importedAt;
  if (!value || !Number.isFinite(Date.parse(value))) {
    target.textContent = 'Catalog update time unavailable';
    return;
  }
  const iso = new Date(value).toISOString();
  const label = new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  });
  target.innerHTML = 'Catalog updated: <time datetime="' + iso + '">' + escapeHtml(label) + ' (UTC+7)</time>';
}

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
}

function updateSortOptions(cards) {
  const sort = document.getElementById('sortFilter');
  const available = {
    views: cards.length > 0 && cards.every(card => Number.isFinite(card.viewCount)),
    latest: cards.length > 0 && cards.every(card => card.publishedAt && Number.isFinite(Date.parse(card.publishedAt)))
  };
  for (const [value, enabled] of Object.entries(available)) {
    const option = sort.querySelector('option[value="' + value + '"]');
    option.disabled = !enabled;
    option.hidden = !enabled;
  }
  if (sort.selectedOptions[0].disabled) sort.value = 'playlist';
}

/* Validate the fields used by the renderer before accepting a catalog. */
function validateCatalog(data) {
  const isText = value => typeof value === 'string';
  const validMeta = data?.meta && ['ver', 'badge', 'sub', 'ytId', 'ytHint', 'mainDiscordUrl', 'cowbDiscordUrl'].every(key => isText(data.meta[key]))
    && Array.isArray(data.meta.stats) && data.meta.stats.length === 3;
  const validGuides = ['gc1', 'gc2', 'gc3', 'gc4'].every(key => {
    const group = data?.guideRows?.[key];
    return group && isText(group.title) && Array.isArray(group.rows)
      && group.rows.every(row => row && isText(row.label) && isText(row.url));
  });
  const validCards = Array.isArray(data?.cards) && data.cards.every(card => card
    && ['id', 'title', 'url', 'type', 'desc'].every(key => isText(card[key]))
    && ['VIDEO', 'BUILD', 'CRAFTING'].includes(card.type)
    && Array.isArray(card.tags) && card.tags.every(isText));
  if (!validMeta || !validGuides || !validCards) throw new Error('Catalog has an unsupported structure');
  return data;
}

function loadRealm(game, { force = false } = {}) {
  const state = LOAD_STATE[game];
  if (!state) return Promise.resolve();
  if (state.promise) return state.promise;
  if (state.status === 'ready' && !force) return Promise.resolve(DATA[game]);
  state.status = 'loading';
  state.error = null;
  delete DATA[game];
  if (game === realm) applyRealm(game);
  state.promise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
    try {
      const response = await fetch('data/' + game + '.json', { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error('Catalog HTTP ' + response.status);
      const catalog = validateCatalog(await response.json());
      DATA[game] = catalog;
      state.status = 'ready';
    } catch (error) {
      delete DATA[game];
      state.status = 'error';
      state.error = error;
      console.warn('Could not load ' + game + ' catalog:', error);
    } finally {
      clearTimeout(timeout);
      state.promise = null;
    }
    // A background request must never replace a different game selected meanwhile.
    if (game === realm) {
      applyRealm(game);
      writeViewUrl();
    }
    return DATA[game];
  })();
  return state.promise;
}

/* Each successful request renders immediately, independently of its sibling. */
async function init() {
  restoreViewState();
  applyRealm(realm);
  writeViewUrl();
  await Promise.allSettled(['poe1', 'poe2'].map(game => loadRealm(game)));
}

window.retryRealm = function() { return loadRealm(realm, { force: true }); };

function showCatalogState(ready) {
  const state = LOAD_STATE[realm];
  const isError = state.status === 'error';
  const gameName = realm === 'poe2' ? 'Path of Exile 2' : 'Path of Exile 1';
  document.documentElement.dataset.loadState = ready ? 'ready' : state.status;
  const status = document.getElementById('catalogStatus');
  status.hidden = ready;
  document.getElementById('catalogStatusText').textContent = isError
    ? gameName + ' content could not be loaded. Try again or switch to the other game.'
    : 'Loading ' + gameName + ' content…';
  document.getElementById('retryCatalogBtn').hidden = !isError;
  document.getElementById('retryCatalogBtn').disabled = !isError;
  ['searchInput', 'catFilter', 'sortFilter'].forEach(id => { document.getElementById(id).disabled = !ready; });
  const allVideos = document.getElementById('allVideosBtn');
  if (allVideos) allVideos.hidden = !ready;
  const hero = document.getElementById('heroSection');
  if (hero) hero.hidden = !ready;
  const guides = document.getElementById('guideTitle')?.closest('.section');
  if (guides) guides.hidden = !ready;
  const divider = document.querySelector('.divider');
  if (divider) divider.hidden = !ready;
  if (ready) return;
  document.getElementById('cardGrid').innerHTML = '';
  document.getElementById('videoCount').textContent = isError ? 'Videos are temporarily unavailable for this game.' : 'Loading videos…';
  document.getElementById('catalogUpdated').textContent = '';
  const pagination = document.getElementById('videoPagination');
  if (pagination) { pagination.hidden = true; pagination.innerHTML = ''; }
  const pageStatus = document.getElementById('pageStatus');
  if (pageStatus) pageStatus.textContent = '';
  if (hero) {
    setYoutube('', '', realm === 'poe2');
    document.getElementById('heroSub').textContent = '';
    ['gc1', 'gc2', 'gc3', 'gc4'].forEach(id => { document.getElementById(id).querySelector('.guide-rows-wrap').innerHTML = ''; });
  }
}

/* ── REALM SWITCH ──────────────────────────────────────────────────────── */
window.switchRealm = function(r) {
  if (!LOAD_STATE[r]) return;
  realm = r;
  currentPage = 1;
  document.getElementById('searchInput').value = '';
  document.getElementById('catFilter').value = '';
  applyRealm(r);
  writeViewUrl('pushState');
};

function applyRealm(r) {
  realm = r;
  const p2  = r === 'poe2';
  const d   = DATA[r];
  document.documentElement.style.setProperty('--accent', p2 ? 'var(--purple)' : 'var(--red)');
  document.documentElement.style.setProperty('--accent-hover', p2 ? 'var(--purple-hover)' : 'var(--red-hover)');
  document.documentElement.style.setProperty('--accent-text', p2 ? '#c4b5fd' : '#fca5a5');
  document.documentElement.dataset.realm = r;
  window.MistSite.rememberRealm(r);
  document.getElementById('navAccent').style.color = p2 ? 'var(--purple)' : 'var(--red)';

  /* slider */
  document.getElementById('btnPoe1').classList.toggle('active', !p2);
  document.getElementById('btnPoe2').classList.toggle('active',  p2);
  document.getElementById('btnPoe1').setAttribute('aria-pressed', String(!p2));
  document.getElementById('btnPoe2').setAttribute('aria-pressed', String(p2));
  document.getElementById('realmSlider').className = 'realm-slider' + (p2 ? ' poe2' : '');
  document.getElementById('realmLabel').textContent =
    'Currently showing ' + (p2 ? 'Path of Exile 2' : 'Path of Exile 1') + ' content';
  const footerAccent = document.getElementById('footerAccent');
  if (footerAccent) footerAccent.style.color = p2 ? 'var(--purple)' : 'var(--red)';
  const ready = LOAD_STATE[r].status === 'ready' && Boolean(d);
  showCatalogState(ready);
  if (!ready) return;

  if (document.getElementById('heroSection')) {
  /* hero */
  document.getElementById('heroSection').className = 'hero' + (p2 ? ' poe2-active' : '');
  document.getElementById('heroAccent').className  = p2 ? 'poe2' : '';
  document.getElementById('navAccent').style.color = p2 ? 'var(--purple)' : 'var(--red)';
  document.getElementById('poeBadge').className    = 'badge badge-poe' + (p2 ? ' poe2' : '');
  document.getElementById('poeBadge').textContent  = d.meta.badge;
  document.getElementById('verBadge').textContent  = d.meta.ver;
  document.getElementById('heroSub').textContent   = d.meta.sub;

  /* discord links */
  document.getElementById('discordMain').onclick =
    () => window.open(d.meta.mainDiscordUrl, '_blank');
  document.getElementById('discordCowb').onclick =
    () => window.open(d.meta.cowbDiscordUrl, '_blank');

  /* stats */
  ['statBuilds','statCraft','statVideos'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.parentElement.hidden = d.meta.stats[i] == null;
    el.textContent = d.meta.stats[i] ?? '';
    el.className   = 'stat-num' + (p2 ? ' poe2' : '');
  });

  /* Featured playback comes from the public catalog, independently of project notes. */
  const featuredCard = d.cards.find(card => card.id === d.meta.ytId && card.privacyStatus === 'public')
    || d.cards.find(card => card.privacyStatus === 'public');
  const ytHint = featuredCard
    ? (featuredCard.id === d.meta.ytId ? d.meta.ytHint : 'Featured video — ' + featuredCard.title)
    : '';
  setYoutube(featuredCard?.id || '', ytHint, p2);

  /* guides grid */
  document.getElementById('guideTitle').className = 'section-title' + (p2 ? ' poe2' : '');
  ['gc1', 'gc2', 'gc3', 'gc4'].forEach(gcId => {
    const section  = d.guideRows[gcId];
    const card     = document.getElementById(gcId);
    card.className = 'guide-card' + (p2 ? ' poe2' : '') + (section.scrollable ? ' scrollable' : '');
    card.querySelector('.guide-card-title').textContent = section.title;
    const rowWrap = card.querySelector('.guide-rows-wrap');
    rowWrap.innerHTML = section.rows.filter(row => !getYtThumb(row.url) || row.privacyStatus === 'public').map(row => {
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const available = Boolean(url && url !== '#' && row.available !== false);
      const label = `${row.ver ? `<span class="row-ver-badge">${escapeHtml(row.ver)}</span>` : ''}${escapeHtml(row.label)}`;
      return available
        ? `<a href="${escapeHtml(url)}" class="guide-row guide-row-link" target="_blank" rel="noopener noreferrer"><span class="guide-row-label">${label}</span></a>`
        : `<div class="guide-row guide-row-unavailable"><span class="guide-row-label">${label} <span class="guide-soon">(Soon)</span></span></div>`;
    }).join('');
  });
  }

  /* footer accent */
  if (footerAccent) footerAccent.style.color = p2 ? 'var(--purple)' : 'var(--red)';

  /* cards */
  updateCategoryOptions(d.cards);
  updateSortOptions(d.cards);
  updateCatalogTime(d.source);
  renderCards();
}

/* ── YOUTUBE ───────────────────────────────────────────────────────────── */
function setYoutube(ytId, ytHint, p2) {
  const wrap = document.getElementById('ytWrap');
  const ph   = document.getElementById('ytPlaceholder');
  const btn  = document.getElementById('ytPlayBtn');
  const actions = document.getElementById('featuredVideoActions');
  const watchLink = document.getElementById('featuredVideoLink');
  const validId = typeof ytId === 'string' && /^[\w-]{11}$/.test(ytId);
  if (actions) actions.hidden = !validId;
  if (watchLink) {
    if (validId) watchLink.href = 'https://www.youtube.com/watch?v=' + ytId;
    else watchLink.removeAttribute('href');
  }

  wrap.className     = 'yt-wrap' + (p2 ? ' poe2' : '');
  btn.className      = 'yt-play-btn' + (p2 ? ' poe2' : '');
  document.getElementById('ytHint').textContent = ytHint;

  let iframe = wrap.querySelector('iframe');

  if (validId) {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      wrap.appendChild(iframe);
    }
    iframe.title = ytHint || 'Featured video from MistDory';
    const embedUrl = new URL('https://www.youtube.com/embed/' + ytId);
    embedUrl.searchParams.set('rel', '0');
    if (/^https?:$/.test(window.location.protocol)) embedUrl.searchParams.set('origin', window.location.origin);
    iframe.src = embedUrl.href;
    ph.style.display = 'none';
  } else {
    if (iframe) iframe.remove();
    ph.style.display = 'flex';
  }
}

/* ── YOUTUBE THUMBNAIL HELPER ──────────────────────────────────────────── */
/* Extracts video ID from any YouTube URL format and returns the thumbnail.
   Works with: youtu.be/ID  |  ?v=ID  |  /shorts/ID                       */
function getYtThumb(url) {
  if (!url || url === '#') return null;
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/)([\w-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

/* ── CARDS ─────────────────────────────────────────────────────────────── */
window.filterCards = function() {
  if (LOAD_STATE[realm].status !== 'ready') return;
  currentPage = 1;
  renderCards();
  writeViewUrl();
};

function renderPagination(page) {
  const nav = document.getElementById('videoPagination');
  if (!nav) return;
  document.getElementById('pageStatus').textContent = 'Page ' + page.page + ' of ' + page.totalPages;
  nav.hidden = page.totalPages <= 1;
  const link = (number, label, current = false) => `<a class="page-link" data-page="${number}" href="${escapeHtml(window.MistSite.url('videos.html', { ...viewValues(number), page: number }))}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  const previous = page.page > 1 ? link(page.page - 1, 'Previous') : '<span class="page-link" aria-disabled="true">Previous</span>';
  const next = page.page < page.totalPages ? link(page.page + 1, 'Next') : '<span class="page-link" aria-disabled="true">Next</span>';
  nav.innerHTML = previous + Array.from({ length: page.totalPages }, (_, i) => link(i + 1, String(i + 1), i + 1 === page.page)).join('') + next;
}

document.getElementById('videoPagination')?.addEventListener('click', event => {
  const link = event.target.closest('a[data-page]');
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  currentPage = Number(link.dataset.page);
  renderCards();
  writeViewUrl('pushState');
  document.getElementById('videosTitle').scrollIntoView({ block: 'start' });
});

window.addEventListener('popstate', () => {
  restoreViewState();
  applyRealm(realm);
});

function renderCards() {
  if (!DATA[realm]) return;
  const p2     = realm === 'poe2';
  const cards  = DATA[realm].cards.filter(card => card.privacyStatus === 'public');
  const search = document.getElementById('searchInput').value;
  const cat    = document.getElementById('catFilter').value;
  const sort   = document.getElementById('sortFilter').value;
  const grid   = document.getElementById('cardGrid');
  const hasViewCounts = cards.length > 0 && cards.every(card => Number.isFinite(card.viewCount));
  const mostViews = hasViewCounts ? Math.max(...cards.map(card => card.viewCount)) : 0;

  const PIN = { BUILD: '★', CRAFTING: '◆', VIDEO: '▶' };
  const TYPE_CLASS = {
    BUILD:    'type-build',
    CRAFTING: 'type-craft',
    VIDEO:    'type-video'
  };

  let filtered = cards.filter(c => {
    const matchSearch = Catalog.matchesSearch(c, search);
    const matchCat = !cat || c.type === cat;
    return matchSearch && matchCat;
  });

  filtered = Catalog.sortVideos(filtered, sort);
  const page = Catalog.paginate(filtered, IS_ARCHIVE ? currentPage : 1, IS_ARCHIVE ? 10 : VIDEO_PREVIEW_LIMIT);
  currentPage = page.page;
  const displayed = page.items;
  const allButton = document.getElementById('allVideosBtn');
  if (allButton) allButton.href = window.MistSite.url('videos.html', { ...viewValues(), page: 1 });
  document.getElementById('videoCount').textContent = 'Showing ' + page.start + '–' + page.end + ' of ' + filtered.length + ' videos';
  renderPagination(page);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  grid.innerHTML = displayed.map(c => {
    /* Thumbnail resolution order:
       1. c.image set manually in JSON
       2. Card with a real YouTube URL → auto-fetch YouTube thumbnail
       3. Fallback placeholder text                                         */
    const thumbSrc = c.image || getYtThumb(c.url);
    const thumb = thumbSrc
      ? `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(c.title)}" loading="lazy" width="320" height="180" />`
      : `<span class="card-thumb-placeholder">Thumbnail</span>`;

    return `
      <a class="card${p2 ? ' poe2' : ''}" data-video-id="${escapeHtml(c.id)}" href="${escapeHtml(c.url)}"${c.url !== '#' ? ' target="_blank" rel="noopener noreferrer"' : ''}>
        <div class="card-thumb">
          ${thumb}
          ${c.duration ? `<span class="card-duration">${escapeHtml(c.duration)}</span>` : ''}
          <div class="card-pin${p2 ? ' poe2' : ''}">${PIN[c.type]}</div>
        </div>
        <div class="card-body">
          <div class="card-title">
            ${escapeHtml(c.title)}
            ${mostViews > 0 && c.viewCount === mostViews ? '<span class="card-most-viewed">★ Most Viewed</span>' : ''}
          </div>
          <div class="card-meta">
            <span class="badge-type ${TYPE_CLASS[c.type]}">${escapeHtml(c.type)}</span>
            ${c.ver ? `<span class="badge-ver-small">${escapeHtml(c.ver)}</span>` : ''}
            ${Number.isFinite(c.viewCount) ? `<span class="card-views">${c.viewCount.toLocaleString('en-US')} views</span>` : ''}
            ${c.publishedAt ? `<time class="card-date" datetime="${escapeHtml(c.publishedAt)}">${new Date(c.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>` : ''}
          </div>
          ${c.desc ? `<div class="card-desc">${escapeHtml(c.desc)}</div>` : ''}
          <div class="card-tags">${c.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>
      </a>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', init);
