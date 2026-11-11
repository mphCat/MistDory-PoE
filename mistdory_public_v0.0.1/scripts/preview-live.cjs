'use strict';

// Live Server development adapter. Published HTML keeps its production CSP.
const fs = require('node:fs');
const path = require('node:path');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RELOAD_PATH = '/__mistdory_live_reload__.js';
const SOCKET_PATH = '/__mistdory_live_reload__/ws';
const HTML_PAGES = new Set(['/index.html', '/videos.html', '/about.html', '/font-preview.html']);

function previewPort(value = process.env.PORT || 8003) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  return port;
}

function developmentHtml(html, port) {
  const socketUrl = 'ws://127.0.0.1:' + port + '/__mistdory_live_reload__/ws';
  const socketOrigin = 'ws://127.0.0.1:' + port;
  let policyCount = 0;
  const transformed = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (!/\bhttp-equiv\s*=\s*(["'])Content-Security-Policy\1/i.test(tag)) return tag;
    policyCount++;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i.exec(tag);
    if (!content) throw new Error('Preview HTML has no readable CSP content');
    const directives = content[2].split(';').map(value => value.trim()).filter(Boolean);
    const connect = directives.filter(value => /^connect-src(?:\s|$)/i.test(value));
    if (connect.length !== 1 || !connect[0].split(/\s+/).includes("'self'")) {
      throw new Error("Preview CSP must have one connect-src directive containing 'self'");
    }
    const policy = directives.map(value => /^connect-src(?:\s|$)/i.test(value)
      ? value + ' ' + socketOrigin : value).join('; ') + ';';
    return tag.replace(content[0], 'content=' + content[1] + policy + content[1]);
  });
  if (policyCount !== 1 || !/<\/body\s*>/i.test(transformed)) {
    throw new Error('Preview HTML must contain one CSP meta tag and a closing body');
  }
  const client = '<script src="' + RELOAD_PATH + '" data-websocket-url="' + socketUrl + '"></script>';
  return transformed.replace(/<\/body\s*>/i, client + '\n</body>');
}

function createPreviewMiddleware({ root = PROJECT_ROOT, port = 8003 } = {}) {
  port = previewPort(port);
  root = path.resolve(root);
  const allowedHosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
  if (port === 80) { allowedHosts.add('127.0.0.1'); allowedHosts.add('localhost'); }
  const clientPath = path.join(__dirname, 'live-reload-client.js');
  return function previewMiddleware(req, res, next) {
    function send(status, type, body) {
      res.statusCode = status;
      res.setHeader('Content-Type', type + '; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(req.method === 'HEAD' ? undefined : body);
    }
    if (!allowedHosts.has(String(req.headers.host || '').toLowerCase())) return send(400, 'text/plain', 'Unexpected preview host');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return send(405, 'text/plain', 'Method not allowed');
    }
    let pathname;
    try {
      if (!req.url.startsWith('/') || req.url.startsWith('//')) throw new Error('Invalid request target');
      pathname = decodeURIComponent(req.url.split(/[?#]/, 1)[0]);
      if (/[\\\u0000]/.test(pathname) || /%(?:2e|2f|5c|00|25)/i.test(pathname)
        || pathname.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid path');
    } catch { return send(400, 'text/plain', 'Bad request'); }
    if (pathname === RELOAD_PATH) {
      return fs.readFile(clientPath, 'utf8', (error, source) => error
        ? send(500, 'text/plain', 'Reload client unavailable') : send(200, 'text/javascript', source));
    }
    if (pathname === '/') pathname = '/index.html';
    if (!HTML_PAGES.has(pathname)) return next();
    const filename = path.join(root, pathname.slice(1));
    fs.readFile(filename, 'utf8', (error, html) => {
      if (error) return send(404, 'text/plain', 'Not found');
      try { send(200, 'text/html', developmentHtml(html, port)); }
      catch (failure) { send(500, 'text/plain', failure.message); }
    });
  };
}

function isAllowedUpgrade(request, port) {
  port = previewPort(port);
  const authority = hostname => hostname + (port === 80 ? '' : ':' + port);
  const hosts = new Set(['127.0.0.1:' + port, 'localhost:' + port, authority('127.0.0.1'), authority('localhost')]);
  const origins = new Set(['http://' + authority('127.0.0.1'), 'http://' + authority('localhost')]);
  return request.method === 'GET' && request.url === SOCKET_PATH
    && hosts.has(String(request.headers.host || '').toLowerCase())
    && origins.has(String(request.headers.origin || '').toLowerCase());
}

function guardWebSockets(server, port) {
  // The installed Live Server's generic upgrade handler also supports proxies.
  // This launcher exposes only the one local reload socket, never a proxy.
  const handlers = server.listeners('upgrade');
  for (const handler of handlers) server.removeListener('upgrade', handler);
  server.on('upgrade', (request, socket, head) => {
    if (!isAllowedUpgrade(request, port)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    try { for (const handler of handlers) handler.call(server, request, socket, head); }
    catch { socket.destroy(); }
  });
}

function findLiveServer(explicitPath = process.env.MISTDORY_LIVE_SERVER_MODULE) {
  const candidates = explicitPath ? [explicitPath] : ['live-server'];
  if (!explicitPath && process.env.USERPROFILE) {
    for (const folder of ['.vscode', '.vscode-insiders']) {
      const extensions = path.join(process.env.USERPROFILE, folder, 'extensions');
      let entries;
      try { entries = fs.readdirSync(extensions); } catch { continue; }
      for (const entry of entries.filter(name => /^ritwickdey\.liveserver-/i.test(name))
        .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))) {
        candidates.push(path.join(extensions, entry, 'node_modules', 'live-server'));
      }
    }
  }
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) {
      if (explicitPath) throw new Error('Could not load MISTDORY_LIVE_SERVER_MODULE: ' + error.message);
    }
  }
  throw new Error('Live Server was not found. Use the installed VS Code Live Server extension, install live-server separately, or set MISTDORY_LIVE_SERVER_MODULE to its existing module path.');
}

function startPreview({ port = previewPort(), liveServer = findLiveServer(), onStartupError = error => {
  console.error(error.message); process.exitCode = 1;
} } = {}) {
  port = previewPort(port);
  const server = liveServer.start({
    root: PROJECT_ROOT, host: '127.0.0.1', port, open: false, logLevel: 1,
    useBrowserExtension: true,
    middleware: [createPreviewMiddleware({ port })]
  });
  guardWebSockets(server, port);
  let failed = false;
  const fail = error => {
    if (failed) return;
    failed = true;
    // Own the startup policy rather than allowing a vendor retry on another port.
    try { liveServer.shutdown(); } catch {}
    try { server.close(() => {}); } catch {}
    onStartupError(new Error('Live preview could not bind http://127.0.0.1:' + port + '/ ('
      + (error.code || error.message) + '). Stop the process using that port or choose a free PORT.'));
  };
  server.removeAllListeners('error');
  server.on('error', fail);
  server.prependListener('listening', () => {
    const bound = server.address();
    if (!bound || bound.port !== port || bound.address !== '127.0.0.1') {
      fail(new Error('Unexpected listening address; requested loopback port ' + port));
    }
  });
  return server;
}

if (require.main === module) {
  try { startPreview(); }
  catch (error) { console.error('Live preview failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { previewPort, developmentHtml, createPreviewMiddleware, isAllowedUpgrade, findLiveServer, startPreview };
