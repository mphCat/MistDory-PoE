'use strict';

// Package runtime files only. Never mutate the source or an existing output folder.
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '..');
const version = /^mistdory_v(\d+\.\d+\.\d+)$/.exec(path.basename(source))?.[1];
if (!version) throw new Error('Active source folder must identify its release version');
const pages = ['index.html', 'videos.html', 'about.html', 'font-preview.html'];
const runtime = [...pages, 'css', 'js', 'data', 'assets'];
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/prepare-pages.cjs <new-output-directory>');
const output = path.resolve(destination);
const relative = path.relative(source, output);
if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
  throw new Error('Output must be outside the active source directory');
}
if (fs.existsSync(output)) throw new Error('Output already exists; choose a new directory');
for (const entry of runtime) {
  if (!fs.existsSync(path.join(source, entry))) throw new Error('Missing runtime entry: ' + entry);
}
fs.mkdirSync(output);
for (const entry of runtime) fs.cpSync(path.join(source, entry), path.join(output, entry), { recursive: true });
fs.writeFileSync(path.join(output, '.nojekyll'), '');
for (const page of pages) {
  const originalHtml = fs.readFileSync(path.join(output, page), 'utf8');
  const html = originalHtml.replace(/(<span data-site-version>)[^<]*(<\/span>)/g, '$1v' + version + '$2');
  if (html !== originalHtml) fs.writeFileSync(path.join(output, page), html);
  if (!html.includes('Content-Security-Policy') || html.includes('__mistdory_live_reload__')) {
    throw new Error('Expected unchanged production policy and no development reload client: ' + page);
  }
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
    const value = match[1].split(/[?#]/)[0];
    if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) continue;
    if (value.startsWith('/')) throw new Error('Root-absolute asset is incompatible with the project URL: ' + value);
    if (!fs.existsSync(path.resolve(output, value))) throw new Error('Missing local page dependency: ' + value);
  }
}
console.log('Pages artifact ready: ' + output);
console.log('Included: ' + runtime.join(', ') + ', .nojekyll');
console.log('Excluded: historical versions, scripts, tests and project documentation. Font licenses remain included.');