'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/guides-poe1.json');
const policy = require('../js/url-policy.js');
test('guide sources have safe links, stable unique IDs and explicit patch boundaries', () => {
  const ids = new Set();
  for (const list of [data.atlas, data.builds, data.regex, data.crafting, data.farms]) for (const item of list) {
    assert.ok(item.id && !ids.has(item.id)); ids.add(item.id);
    for (const key of ['url','pob','source']) if (item[key]) assert.equal(policy.safeExternalUrl(item[key]),item[key]);
  }
  assert.equal(data.atlas.length,14);
  assert.equal(data.atlas.filter(item=>item.patch==='3.30').length,2);
  assert.equal(data.atlas.find(item=>item.id==='ultimatum-thread').status,'testing');
  assert.ok(data.atlas.filter(item=>item.patch!=='3.30').every(item=>item.status==='archived'));
});
test('build variants preserve PoB mapping and cross-patch video labels', () => {
  assert.equal(data.builds[0].pob,'https://pobb.in/Mysp1u5S_9kJ');
  assert.equal(data.builds[2].pob,'https://pobb.in/oGzXvuUWDwXk');
  assert.equal(data.builds[3].pob,'https://pobb.in/pFRwMTqydMEc');
  assert.equal(data.builds[7].pob,'https://pobb.in/s8eA2nk9KaG9');
  assert.ok(data.builds.slice(3).every(item=>item.video.patch==='3.29'&&item.patch==='3.30'));
});
test('crafting remains unavailable without fabricated video destinations',()=>{
  assert.equal(data.crafting.length,2);
  assert.ok(data.crafting.every(item=>item.status==='awaiting-video'&&item.videoUrl===null));
});
test('runtime package includes the guide page and no recipe is inferred from farm results',()=>{
  assert.match(fs.readFileSync(path.join(__dirname,'../scripts/prepare-pages.cjs'),'utf8'),/'guides.html'/);
  assert.match(fs.readFileSync(path.join(__dirname,'../scripts/prepare-pages.cjs'),'utf8'),/'crafting.html'/);
  assert.equal(data.builds.length,8);
  assert.equal(data.builds.filter(item=>item.group==='Fire CWS Chieftain').length,1);
  assert.equal(data.builds.filter(item=>item.group==='Fire CWS Gladiator').length,4);
  assert.equal(data.builds.filter(item=>item.group==='Ravage Bomb').length,3);
  assert.equal(data.farms.find(item=>item.id==='ultimatum-t16').jackpot,'x2 Mir');
  assert.ok(data.farms.every(item=>!Object.hasOwn(item,'netProfit')));
  assert.ok(data.regex.every(item=>item.value.length>0));
});
