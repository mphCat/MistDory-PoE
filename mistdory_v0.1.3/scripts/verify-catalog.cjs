'use strict';

const lib = require('./catalog-lib.cjs');

function main() {
  const args = process.argv.slice(2);
  let requireRefresh = false; let maxAgeHours = 24;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--require-refresh') requireRefresh = true;
    else if (args[index] === '--max-age-hours') {
      maxAgeHours = Number(args[++index]);
      if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new Error('--max-age-hours must be positive');
    } else if (args[index] === '--help') {
      console.log('Usage: node scripts/verify-catalog.cjs [--require-refresh] [--max-age-hours 24]\nOffline structural validation. Release mode also requires complete, recent public verification.');
      return;
    } else throw new Error('Unknown argument: ' + args[index]);
  }
  console.log(JSON.stringify({ valid: true, requireRefresh, summary: lib.verifyCatalogs(lib.readCatalogs(), { requireRefresh, maxAgeHours }) }, null, 2));
}

try { main(); } catch (error) { console.error('Catalog verification failed: ' + error.message); process.exitCode = 1; }
