/* Development-only client injected into loopback Live Server responses. */
(function () {
  'use strict';
  if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) return;
  const source = document.currentScript;
  let address;
  try {
    address = new URL(source.dataset.websocketUrl);
    if (address.protocol !== 'ws:' || address.hostname !== '127.0.0.1'
      || address.port !== window.location.port || address.username || address.password) return;
  } catch { return; }

  function refreshCss() {
    for (const sheet of document.querySelectorAll('link[rel="stylesheet"]')) {
      const url = new URL(sheet.href, window.location.href);
      if (url.origin !== window.location.origin) continue;
      url.searchParams.set('_liveReload', String(Date.now()));
      sheet.href = url.href;
    }
  }
  function connect() {
    let socket;
    try { socket = new WebSocket(address.href); } catch { return; }
    socket.addEventListener('message', event => {
      if (event.data === 'reload') window.location.reload();
      else if (event.data === 'refreshcss') refreshCss();
    });
    socket.addEventListener('close', () => window.setTimeout(connect, 1000));
    socket.addEventListener('error', () => {});
  }
  connect();
})();
