/* Local preview for this version; serves only files inside the version directory. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8003);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
http.createServer((request, response) => {
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.includes('\0')) throw new Error('Invalid path');
    filename = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid path');
  } catch {
    response.writeHead(400); response.end('Bad request'); return;
  }
  fs.readFile(filename, (error, bytes) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    const type = types[path.extname(filename)] || 'application/octet-stream';
    const charset = /^(text\/|application\/json|image\/svg\+xml)/.test(type) ? '; charset=utf-8' : '';
    response.writeHead(200, { 'Content-Type': type + charset, 'Cache-Control': 'no-store' });
    response.end(bytes);
  });
}).listen(port, '127.0.0.1', () => process.stdout.write('Local preview: http://127.0.0.1:' + port + '/\n'));
