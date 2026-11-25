/* One request per page load; IP cooldown and the persistent total belong to the server. */
(function () {
  'use strict';
  const target = document.getElementById('totalPageViews');
  if (!target) return;
  const config = window.MistViewCounterConfig;
  let total = null;
  function render() {
    target.textContent = total === null ? '—' : new Intl.NumberFormat(window.MistI18n.getLocale()).format(total);
  }
  window.addEventListener('mistdory:languagechange', render);
  render();
  if (!config?.endpoint || window.location.origin !== config.siteOrigin
      || !window.location.pathname.startsWith(config.sitePath)) return;
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return;
  } catch { return; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  fetch(endpoint.href.replace(/\/$/, '') + '/views', {
    method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
  }).then(response => {
    if (!response.ok) throw new Error('Counter unavailable');
    return response.json();
  }).then(data => {
    if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid counter');
    total = data.total;
    render();
  }).catch(() => { /* Keep the neutral placeholder; never fabricate a zero or block the page. */ })
    .finally(() => clearTimeout(timeout));
})();