/* ── MistDory — main.js ───────────────────────────────────────────────────
   All site logic: data loading, realm switching, card rendering, filtering.
   To customise content edit data/poe1.json and data/poe2.json — no JS needed.
────────────────────────────────────────────────────────────────────────── */

let DATA    = {};   /* filled after JSON fetch */
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

/* ── BOOT ──────────────────────────────────────────────────────────────── */
async function init() {
  try {
    const [r1, r2] = await Promise.all([
      fetch('data/poe1.json').then(r => r.json()),
      fetch('data/poe2.json').then(r => r.json())
    ]);
    DATA = { poe1: r1, poe2: r2 };
    restoreViewState();
    applyRealm(realm);
    writeViewUrl();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('videoCount').textContent = 'Unable to load videos. Please refresh the page.';
  }
}

/* ── REALM SWITCH ──────────────────────────────────────────────────────── */
window.switchRealm = function(r) {
  if (!DATA[r]) return;
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

  /* youtube — use meta.ytId if set, else fall back to featured video row */
  let ytId    = d.cards.some(card => card.id === d.meta.ytId && card.privacyStatus === 'public') ? d.meta.ytId : '';
  let ytHint  = d.meta.ytHint;
  if (!ytId) {
    const featuredRow = d.guideRows.gc1 && d.guideRows.gc1.rows.find(row => row.featured && row.privacyStatus === 'public');
    if (featuredRow) {
      const match = featuredRow.url.match(/(?:youtu\.be\/|v=)([\w-]+)/);
      if (match) { ytId = match[1]; ytHint = featuredRow.label; }
    }
  }
  setYoutube(ytId, ytHint, p2);

  /* guides grid */
  document.getElementById('guideTitle').className = 'section-title' + (p2 ? ' poe2' : '');
  Object.keys(d.guideRows).forEach(gcId => {
    const section  = d.guideRows[gcId];
    const card     = document.getElementById(gcId);
    card.className = 'guide-card' + (p2 ? ' poe2' : '') + (section.scrollable ? ' scrollable' : '');
    card.querySelector('.guide-card-title').textContent = section.title;
    const rowWrap = card.querySelector('.guide-rows-wrap');
    rowWrap.innerHTML = section.rows.filter(row => !getYtThumb(row.url) || row.privacyStatus === 'public').map(row => {
      const available = typeof row.url === 'string' && row.url.trim() !== '' && row.url !== '#' && row.available !== false;
      const btnLabel = row.btnLabel === 'Watch' || getYtThumb(row.url) || row.type === 'VIDEO' || gcId === 'gc1' ? 'Watch' : 'Open';
      const buttonClass = 'guide-btn' + (p2 ? ' poe2' : '');
      const action = available
        ? `<a href="${escapeHtml(row.url)}" class="${buttonClass}" target="_blank" rel="noopener noreferrer">${btnLabel}</a>`
        : `<button type="button" class="${buttonClass} nav-soon" aria-disabled="true" aria-label="${escapeHtml(row.label)} — coming soon"><span class="nav-label">${btnLabel}</span><span class="nav-soon-label" aria-hidden="true">Soon</span></button>`;
      return `
      <div class="guide-row">
        <span class="guide-row-label">
          ${row.ver ? `<span class="row-ver-badge">${escapeHtml(row.ver)}</span>` : ''}
          ${escapeHtml(row.label)}
        </span>
        ${action}
      </div>`;
    }).join('');
  });
  }

  /* footer accent */
  const footerAccent = document.getElementById('footerAccent');
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

  wrap.className     = 'yt-wrap' + (p2 ? ' poe2' : '');
  btn.className      = 'yt-play-btn' + (p2 ? ' poe2' : '');
  document.getElementById('ytHint').textContent = ytHint;

  let iframe = wrap.querySelector('iframe');

  if (ytId) {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      wrap.appendChild(iframe);
    }
    iframe.title = ytHint || 'Featured video from MistDory';
    iframe.src  = 'https://www.youtube.com/embed/' + ytId + '?rel=0';
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
  if (!DATA.poe1 || !DATA.poe2) return;
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
