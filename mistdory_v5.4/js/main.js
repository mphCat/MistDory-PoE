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
const CatalogI18n = window.MistI18n;

CatalogI18n.addTranslations({
  'Catalog update time unavailable': 'Chưa có thời gian cập nhật danh mục',
  'Catalog updated:': 'Danh mục được cập nhật:',
  '{game} content could not be loaded. Try again or switch to the other game.': 'Không tải được nội dung {game}. Hãy thử lại hoặc chuyển sang game còn lại.',
  'Loading {game} content…': 'Đang tải nội dung {game}…',
  'Videos are temporarily unavailable for this game.': 'Video của game này tạm thời chưa khả dụng.',
  'Loading videos…': 'Đang tải video…',
  'Currently showing {game} content': 'Đang hiển thị nội dung {game}',
  "Public videos from Mist's POE playlist. Browse the collection below.": 'Các video công khai từ danh sách phát POE của Mist. Khám phá bộ sưu tập bên dưới.',
  "Public videos from Mist's PoE2 playlist. Browse the collection below.": 'Các video công khai từ danh sách phát PoE2 của Mist. Khám phá bộ sưu tập bên dưới.',
  'Featured video — {title}': 'Video nổi bật — {title}',
  'Featured video from MistDory': 'Video nổi bật của MistDory',
  'WIP Projects': 'Dự án đang phát triển',
  'Document': 'Tài liệu',
  'Leveling': 'Leveling',
  'Crafting Recipes': 'Công thức Crafting',
  'Miscellaneous': 'Tổng hợp',
  'Build experiments': 'Thử nghiệm build',
  'Mechanic tests': 'Kiểm tra cơ chế',
  'Upcoming guides': 'Hướng dẫn sắp ra mắt',
  'PoE 1 Patch Notes': 'Chi tiết cập nhật PoE 1',
  'PoE 2 Patch Notes': 'Chi tiết cập nhật PoE 2',
  'Official News': 'Tin chính thức',
  'Official PoE 2 Site': 'Trang PoE 2 chính thức',
  'Mechanics Reference': 'Tài liệu tham khảo cơ chế',
  'Loot Filter': 'Bộ lọc vật phẩm',
  'Alternative Leveling': 'Leveling nhanh như chớp',
  'Act Tips': 'Mẹo khi leveling',
  'Leveling Common Mistake': 'Lỗi thường gặp khi lên cấp',
  'Atlas Passives Guide': 'Hướng dẫn điểm Atlas Passive',
  'Moment — Short #1': 'Khoảnh khắc — Video ngắn #1',
  'Moment — Short #2': 'Khoảnh khắc — Video ngắn #2',
  'Moment — Short #3': 'Khoảnh khắc — Video ngắn #3',
  'Moment — Short #4': 'Khoảnh khắc — Video ngắn #4',
  'Moment — Short #5': 'Khoảnh khắc — Video ngắn #5',
  'Moment — Short #6': 'Khoảnh khắc — Video ngắn #6',
  'Rune Crafting Basics': 'Crafting Rune cơ bản',
  'Socket Strategy': 'Socket sao cho đúng',
  'Currency Efficiency': 'Sử dụng tiền tệ hiệu quả',
  'Loot Filter PoE 2': 'Bộ lọc vật phẩm PoE 2',
  'Endgame Atlas': 'Atlas cuối game',
  'Top 10 Tips PoE 2': '10 mẹo hữu ích cho PoE 2',
  '(Soon)': '(Sắp có)',
  'Page {page} of {total}': 'Trang {page} / {total}',
  'Previous': 'Trước',
  'Next': 'Tiếp',
  'Showing {start}–{end} of {total} videos': 'Hiển thị {start}–{end} trong tổng số {total} video',
  'No results found': 'Không tìm thấy kết quả',
  'Thumbnail': 'Ảnh thu nhỏ',
  '★ Most Viewed': '★ Xem nhiều nhất',
  'BUILD': 'BUILD',
  'CRAFTING': 'CRAFTING',
  'VIDEO': 'VIDEO',
  '{count} views': '{count} lượt xem'
});

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
    target.textContent = CatalogI18n.t('Catalog update time unavailable');
    return;
  }
  const iso = new Date(value).toISOString();
  const label = new Date(value).toLocaleString(CatalogI18n.getLocale(), {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  });
  target.innerHTML = escapeHtml(CatalogI18n.t('Catalog updated:')) + ' <time datetime="' + iso + '">' + escapeHtml(label) + ' (UTC+7)</time>';
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
    ? CatalogI18n.t('{game} content could not be loaded. Try again or switch to the other game.', { game: gameName })
    : CatalogI18n.t('Loading {game} content…', { game: gameName });
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
  document.getElementById('videoCount').textContent = CatalogI18n.t(isError ? 'Videos are temporarily unavailable for this game.' : 'Loading videos…');
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
    CatalogI18n.t('Currently showing {game} content', { game: p2 ? 'Path of Exile 2' : 'Path of Exile 1' });
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
  document.getElementById('heroSub').textContent   = CatalogI18n.t(d.meta.sub);

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
  // Translate the player label while keeping the video's original title intact.
  const rawHint = featuredCard
    ? (featuredCard.id === d.meta.ytId ? d.meta.ytHint : 'Featured video — ' + featuredCard.title)
    : '';
  const ytHint = rawHint.startsWith('Featured video — ')
    ? CatalogI18n.t('Featured video — {title}', { title: rawHint.slice('Featured video — '.length) })
    : CatalogI18n.t(rawHint);
  setYoutube(featuredCard?.id || '', ytHint, p2);

  /* guides grid */
  document.getElementById('guideTitle').className = 'section-title' + (p2 ? ' poe2' : '');
  ['gc1', 'gc2', 'gc3', 'gc4'].forEach(gcId => {
    const section  = d.guideRows[gcId];
    const card     = document.getElementById(gcId);
    card.className = 'guide-card' + (p2 ? ' poe2' : '') + (section.scrollable ? ' scrollable' : '');
    card.querySelector('.guide-card-title').textContent = CatalogI18n.t(section.title);
    const rowWrap = card.querySelector('.guide-rows-wrap');
    rowWrap.innerHTML = section.rows.filter(row => !getYtThumb(row.url) || row.privacyStatus === 'public').map(row => {
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const available = Boolean(url && url !== '#' && row.available !== false);
      const label = `${row.ver ? `<span class="row-ver-badge">${escapeHtml(row.ver)}</span>` : ''}${escapeHtml(CatalogI18n.t(row.label))}`;
      return available
        ? `<a href="${escapeHtml(url)}" class="guide-row guide-row-link" target="_blank" rel="noopener noreferrer"><span class="guide-row-label">${label}</span></a>`
        : `<div class="guide-row guide-row-unavailable"><span class="guide-row-label">${label} <span class="guide-soon">${escapeHtml(CatalogI18n.t('(Soon)'))}</span></span></div>`;
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
    const embedUrl = new URL('https://www.youtube.com/embed/' + ytId);
    embedUrl.searchParams.set('rel', '0');
    if (/^https?:$/.test(window.location.protocol)) embedUrl.searchParams.set('origin', window.location.origin);
    // A new player avoids adding a child-frame navigation to browser history.
    // Keep the existing player when only the interface language changes.
    if (iframe && iframe.src !== embedUrl.href) { iframe.remove(); iframe = null; }
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.src = embedUrl.href;
      wrap.appendChild(iframe);
    }
    iframe.title = ytHint || CatalogI18n.t('Featured video from MistDory');
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
  document.getElementById('pageStatus').textContent = CatalogI18n.t('Page {page} of {total}', { page: page.page, total: page.totalPages });
  nav.hidden = page.totalPages <= 1;
  const link = (number, label, current = false) => `<a class="page-link" data-page="${number}" href="${escapeHtml(window.MistSite.url('videos.html', { ...viewValues(number), page: number }))}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  const previousLabel = escapeHtml(CatalogI18n.t('Previous'));
  const nextLabel = escapeHtml(CatalogI18n.t('Next'));
  const previous = page.page > 1 ? link(page.page - 1, previousLabel) : '<span class="page-link" aria-disabled="true">' + previousLabel + '</span>';
  const next = page.page < page.totalPages ? link(page.page + 1, nextLabel) : '<span class="page-link" aria-disabled="true">' + nextLabel + '</span>';
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

window.addEventListener('mistdory:languagechange', () => {
  // Re-render in place without changing filters, pagination or featured playback.
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
  document.getElementById('videoCount').textContent = CatalogI18n.t('Showing {start}–{end} of {total} videos', { start: page.start, end: page.end, total: filtered.length });
  renderPagination(page);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results">' + escapeHtml(CatalogI18n.t('No results found')) + '</div>';
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
      : `<span class="card-thumb-placeholder">${escapeHtml(CatalogI18n.t('Thumbnail'))}</span>`;

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
            ${mostViews > 0 && c.viewCount === mostViews ? '<span class="card-most-viewed">' + escapeHtml(CatalogI18n.t('★ Most Viewed')) + '</span>' : ''}
          </div>
          <div class="card-meta">
            <span class="badge-type ${TYPE_CLASS[c.type]}">${escapeHtml(CatalogI18n.t(c.type))}</span>
            ${c.ver ? `<span class="badge-ver-small">${escapeHtml(c.ver)}</span>` : ''}
            ${Number.isFinite(c.viewCount) ? `<span class="card-views">${escapeHtml(CatalogI18n.t('{count} views', { count: c.viewCount.toLocaleString(CatalogI18n.getLocale()) }))}</span>` : ''}
            ${c.publishedAt ? `<time class="card-date" datetime="${escapeHtml(c.publishedAt)}">${new Date(c.publishedAt).toLocaleDateString(CatalogI18n.getLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>` : ''}
          </div>
          ${c.desc ? `<div class="card-desc">${escapeHtml(CatalogI18n.t(c.desc))}</div>` : ''}
          <div class="card-tags">${c.tags.map(tag => `<span class="tag">${escapeHtml(CatalogI18n.t(tag))}</span>`).join('')}</div>
        </div>
      </a>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', init);
