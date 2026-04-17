/* ── MistDory — main.js ───────────────────────────────────────────────────
   All site logic: data loading, realm switching, card rendering, filtering.
   To customise content edit data/poe1.json and data/poe2.json — no JS needed.
────────────────────────────────────────────────────────────────────────── */

let DATA    = {};   /* filled after JSON fetch */
let realm   = 'poe1';

/* ── BOOT ──────────────────────────────────────────────────────────────── */
async function init() {
  try {
    const [r1, r2] = await Promise.all([
      fetch('data/poe1.json').then(r => r.json()),
      fetch('data/poe2.json').then(r => r.json())
    ]);
    DATA = { poe1: r1, poe2: r2 };
    applyRealm('poe1');
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

/* ── REALM SWITCH ──────────────────────────────────────────────────────── */
window.switchRealm = function(r) {
  realm = r;
  applyRealm(r);
};

function applyRealm(r) {
  const p2  = r === 'poe2';
  const d   = DATA[r];

  /* slider */
  document.getElementById('btnPoe1').classList.toggle('active', !p2);
  document.getElementById('btnPoe2').classList.toggle('active',  p2);
  document.getElementById('realmSlider').className = 'realm-slider' + (p2 ? ' poe2' : '');
  document.getElementById('realmLabel').textContent =
    'Currently showing ' + (p2 ? 'Path of Exile 2' : 'Path of Exile 1') + ' content';

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
    el.textContent = d.meta.stats[i];
    el.className   = 'stat-num' + (p2 ? ' poe2' : '');
  });

  /* youtube — use meta.ytId if set, else fall back to featured video row */
  let ytId    = d.meta.ytId;
  let ytHint  = d.meta.ytHint;
  if (!ytId) {
    const featuredRow = d.guideRows.gc1 && d.guideRows.gc1.rows.find(r => r.featured);
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
    rowWrap.innerHTML = section.rows.map(row => {
      /* Button label priority:
         1. row.btnLabel  — explicit override in JSON
         2. url === '#'   — "Soon"
         3. scrollable + real URL — "Watch"
         4. non-scrollable + real URL — "Open"           */
      const btnLabel = row.btnLabel
        || (row.url === '#' ? 'Soon' : (section.scrollable ? 'Watch' : 'Open'));
      return `
      <div class="guide-row">
        <span class="guide-row-label">
          ${row.ver ? `<span class="row-ver-badge">${row.ver}</span>` : ''}
          ${row.label}
        </span>
        <a href="${row.url}" class="guide-btn${p2 ? ' poe2' : ''}"
           ${row.url !== '#' ? 'target="_blank" rel="noopener"' : ''}>${btnLabel}</a>
      </div>`;
    }).join('');
  });

  /* footer accent */
  document.getElementById('footerAccent').style.color = p2 ? 'var(--purple)' : 'var(--red)';

  /* cards */
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
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      wrap.appendChild(iframe);
    }
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
window.filterCards = function() { renderCards(); };

function renderCards() {
  const p2     = realm === 'poe2';
  const cards  = DATA[realm].cards;
  const search = document.getElementById('searchInput').value.toLowerCase();
  const cat    = document.getElementById('catFilter').value;
  const sort   = document.getElementById('sortFilter').value;
  const grid   = document.getElementById('cardGrid');

  const PIN = { BUILD: '★', CRAFTING: '◆', VIDEO: '▶' };
  const TYPE_CLASS = {
    BUILD:    'type-build',
    CRAFTING: 'type-craft',
    VIDEO:    'type-video'
  };

  let filtered = cards.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search) ||
      c.desc.toLowerCase().includes(search)  ||
      c.tags.some(t => t.toLowerCase().includes(search));
    const matchCat = !cat || c.type === cat;
    return matchSearch && matchCat;
  });

  if (sort === 'name')   filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'type')   filtered.sort((a, b) => a.type.localeCompare(b.type));
  if (sort === 'newest') filtered.sort((a, b) => parseFloat(b.ver) - parseFloat(a.ver));
  if (sort === 'views')  filtered.sort((a, b) => (a.viewRank || 99) - (b.viewRank || 99));

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  grid.innerHTML = filtered.map(c => {
    /* Thumbnail resolution order:
       1. c.image set manually in JSON
       2. VIDEO card with a real YouTube URL → auto-fetch YouTube thumbnail
       3. Fallback placeholder text                                         */
    const thumbSrc = c.image || (c.type === 'VIDEO' ? getYtThumb(c.url) : null);
    const thumb = thumbSrc
      ? `<img src="${thumbSrc}" alt="${c.title}" loading="lazy" />`
      : `<span class="card-thumb-placeholder">Thumbnail</span>`;

    return `
      <a class="card${p2 ? ' poe2' : ''}" href="${c.url}"${c.url !== '#' ? ' target="_blank"' : ''}>
        <div class="card-thumb">
          ${thumb}
          <div class="card-pin${p2 ? ' poe2' : ''}">${PIN[c.type]}</div>
        </div>
        <div class="card-body">
          <div class="card-title">
            ${c.title}
            ${c.viewRank === 1 ? '<span class="card-most-viewed">★ Most Viewed</span>' : ''}
          </div>
          <div class="card-meta">
            <span class="badge-type ${TYPE_CLASS[c.type]}">${c.type}</span>
            <span class="badge-ver-small">${c.ver}</span>
          </div>
          <div class="card-desc">${c.desc}</div>
          <div class="card-tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </a>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', init);
