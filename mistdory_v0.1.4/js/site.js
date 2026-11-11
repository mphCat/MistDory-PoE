/* Shared layout, local game preference and build-sheet picker. No backend required. */
function updateDockHeight() {
  const dock = document.querySelector('.resource-dock');
  if (dock) document.documentElement.style.setProperty('--dock-height', Math.ceil(dock.getBoundingClientRect().height) + 'px');
}

updateDockHeight();
if (typeof ResizeObserver !== 'undefined') {
  const dock = document.querySelector('.resource-dock');
  if (dock) new ResizeObserver(updateDockHeight).observe(dock);
}
window.addEventListener('resize', updateDockHeight);
if (document.fonts) document.fonts.ready.then(updateDockHeight);

const REALM_STORAGE_KEY = 'mistdory.realm';
const VALID_REALMS = ['poe1', 'poe2'];

function getPreferredRealm() {
  const fromUrl = new URL(window.location.href).searchParams.get('game');
  if (VALID_REALMS.includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(REALM_STORAGE_KEY);
    if (VALID_REALMS.includes(saved)) return saved;
  } catch { /* URL navigation still works when browser storage is unavailable. */ }
  return 'poe1';
}

function siteUrl(path, values = {}) {
  const url = new URL(path, window.location.href);
  url.search = '';
  for (const [name, value] of Object.entries({ lang: window.MistI18n.getLanguage(), ...values })) {
    if (value !== '' && value != null) url.searchParams.set(name, String(value));
  }
  return url.pathname + url.search + url.hash;
}

function syncRealmLinks(game) {
  document.querySelectorAll('.nav-logo, .nav-links a, [data-home-link]').forEach(link => {
    if (!link.matches('.nav-logo, [data-home-link]') && !new URL(link.href).pathname.endsWith('/index.html')) return;
    link.href = siteUrl('index.html', { game });
  });
  document.querySelectorAll('.resource-dock a').forEach(link => {
    if (!new URL(link.href).pathname.endsWith('/about.html')) return;
    link.href = siteUrl('about.html', { game });
  });
}

function rememberRealm(game) {
  if (!VALID_REALMS.includes(game)) return;
  try { localStorage.setItem(REALM_STORAGE_KEY, game); } catch { /* Optional preference storage. */ }
  syncRealmLinks(game);
}

window.MistSite = { getRealm: getPreferredRealm, rememberRealm, url: siteUrl };
rememberRealm(getPreferredRealm());

const buildTriggers = document.querySelectorAll('.builds-trigger');
if (buildTriggers.length) {
  const dialog = document.createElement('dialog');
  dialog.id = 'buildsDialog';
  dialog.className = 'builds-dialog';
  dialog.setAttribute('aria-labelledby', 'buildsDialogTitle');
  dialog.innerHTML = `
    <div class="builds-dialog-header">
      <div><p class="section-kicker" data-i18n="Mist's build library">Mist's build library</p><h2 id="buildsDialogTitle" data-i18n="Choose your build sheet">Choose your build sheet</h2></div>
      <button class="builds-close" type="button" aria-label="Close build picker" data-i18n-aria-label="Close build picker">×</button>
    </div>
    <p class="builds-dialog-intro" data-i18n="Pick your game. Each sheet opens in a new tab.">Pick your game. Each sheet opens in a new tab.</p>
    <a class="build-choice" data-build-game="poe1" href="https://docs.google.com/spreadsheets/d/1nMhuegfqKisuEikG2I4FI14MhHIpsAQUVjU3y09OTCQ/edit?gid=2005846808#gid=2005846808" target="_blank" rel="noopener noreferrer"><span class="build-game">I</span><span><strong data-i18n="PoE 1 Builds">PoE 1 Builds</strong><small data-i18n="Path of Exile 1 builds by Mist">Path of Exile 1 builds by Mist</small></span><span aria-hidden="true">↗</span></a>
    <a class="build-choice build-choice--poe2" data-build-game="poe2" href="https://docs.google.com/spreadsheets/d/1aGhWarz7gICqplYfhh7JxqnGgUu7kUDhYwDtnMv2AGk/edit?gid=1434431165#gid=1434431165" target="_blank" rel="noopener noreferrer"><span class="build-game">II</span><span><strong data-i18n="PoE 2 Builds">PoE 2 Builds</strong><small data-i18n="Path of Exile 2 builds by Mist">Path of Exile 2 builds by Mist</small></span><span aria-hidden="true">↗</span></a>
    <a class="builds-mobalytics" href="https://mobalytics.gg/poe-2/profile/mistdory-1t55av/builds" target="_blank" rel="noopener noreferrer" data-i18n="Also explore PoE 2 builds on Mobalytics ↗">Also explore PoE 2 builds on Mobalytics ↗</a>`;
  document.body.appendChild(dialog);
  buildTriggers.forEach(trigger => trigger.addEventListener('click', () => {
    dialog.showModal();
    buildTriggers.forEach(item => item.setAttribute('aria-expanded', 'true'));
  }));
  dialog.querySelector('.builds-close').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => buildTriggers.forEach(item => item.setAttribute('aria-expanded', 'false')));
}

/* The language preference is independent of the selected game. */
const languageHost = document.querySelector('.nav-inner, .lab-header');
if (languageHost) {
  const actions = document.createElement('div');
  actions.className = 'nav-actions';
  const support = languageHost.querySelector('.nav-cta');
  if (support) actions.appendChild(support);
  const control = document.createElement('div');
  control.className = 'language-switch';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', window.MistI18n.t('Website language'));
  control.innerHTML = '<span class="language-slider" aria-hidden="true"></span><button type="button" data-language="en" aria-label="English" lang="en">EN</button><button type="button" data-language="vi" aria-label="Tiếng Việt" lang="vi">VN</button>';
  control.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => window.MistI18n.setLanguage(button.dataset.language));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const language = ['ArrowLeft', 'Home'].includes(event.key) ? 'en' : 'vi';
      window.MistI18n.setLanguage(language);
      control.querySelector('[data-language="' + language + '"]').focus();
    });
  });
  let pointerStart;
  control.addEventListener('pointerdown', event => { pointerStart = event.clientX; });
  control.addEventListener('pointerup', event => {
    if (pointerStart != null && Math.abs(event.clientX - pointerStart) > 18) {
      window.MistI18n.setLanguage(event.clientX > pointerStart ? 'vi' : 'en');
    }
    pointerStart = null;
  });
  control.addEventListener('pointercancel', () => { pointerStart = null; });
  actions.appendChild(control);
  languageHost.appendChild(actions);
}

window.addEventListener('mistdory:languagechange', () => {
  syncRealmLinks(getPreferredRealm());
  updateDockHeight();
});
window.MistI18n.apply();
