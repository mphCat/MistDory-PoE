'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesSearch, sortVideos, paginate, getAvailableCategories } = require('../js/catalog-utils.js');

test('search joins or separates words and ignores case, punctuation and accents', () => {
  const card = { title: 'PoE 2 | BloodMage - Cast on Ward Break', desc: '', tags: ['Cường hóa', 'Sekhema'] };
  for (const query of ['blood mage', 'BLOODMAGE', 'Blood-Mage', 'castonwardbreak', 'Ward Break Cast', 'cuong hoa', 'sekhema blood mage']) {
    assert.equal(matchesSearch(card, query), true, query);
  }
  assert.equal(matchesSearch({ title: 'Blood Mage', tags: [] }, 'bloodmage'), true);
  assert.equal(matchesSearch(card, 'blood mage ranger'), false);
  assert.equal(matchesSearch(card, ''), true);
  assert.equal(matchesSearch(card, '   '), true);
});

test('search matches every keyword in any order across confirmed metadata', () => {
  const card = { title: 'Spark Gemling', desc: 'League starter walkthrough', tags: ['budget', '0.5.5'] };
  assert.equal(matchesSearch(card, 'budget spark'), true);
  assert.equal(matchesSearch(card, 'spark budget'), true);
  assert.equal(matchesSearch(card, 'starter 0.5.5'), true);
  assert.equal(matchesSearch(card, 'spark expensive'), false);
  assert.equal(matchesSearch({ title: 'Cheap Gloves Craft', tags: [] }, 'crafting gloves'), true);
  assert.equal(matchesSearch({ title: 'Gear Crafting', tags: [] }, 'craft'), true);
  assert.equal(matchesSearch(null, 'spark'), false);
});

test('Blood Mage spacing is equivalent without confusing the class with Mageblood', () => {
  const bloodMage = { title: 'Blood Mage Spark guide', tags: ['budget'] };
  const mageblood = { title: 'I got my Mageblood from a Wise man', tags: [] };
  for (const query of ['Blood Mage', 'bloodmage', 'Blood-Mage', 'blood   mage']) {
    assert.equal(matchesSearch(bloodMage, query), true, query);
    assert.equal(matchesSearch(mageblood, query), false, query);
  }
  assert.equal(matchesSearch(bloodMage, 'budget blood mage'), true);
  assert.equal(matchesSearch(bloodMage, 'spark bloodmage budget'), true);
  assert.equal(matchesSearch(mageblood, 'mageblood'), true);
  assert.equal(matchesSearch({ title: 'Cast on Ward Break' }, 'Ward Break Cast'), true);
  assert.equal(matchesSearch({ title: 'Crafting Gloves guide' }, 'craftinggloves'), true);
});

test('real PoE2 catalog returns identical Blood Mage matches with or without spaces', () => {
  const { cards } = require('../data/poe2.json');
  const results = query => cards.filter(card => matchesSearch(card, query)).map(card => card.id);
  const classIds = cards.filter(card => /bloodmage/i.test(card.title)).map(card => card.id);
  assert.ok(classIds.length > 0);
  assert.ok(cards.some(card => card.id === 'VYGNYhSaYyw' && /mageblood/i.test(card.title)));
  assert.deepEqual(results('Blood Mage'), classIds);
  assert.deepEqual(results('bloodmage'), classIds);
  assert.equal(results('Blood Mage').includes('VYGNYhSaYyw'), false);
});

test('sort latest and views use real values and break ties by playlist order', () => {
  const cards = [
    { id: 'older', title: 'B', playlistPosition: 1, viewCount: 900, publishedAt: '2026-09-01T00:00:00Z' },
    { id: 'newer-later', title: 'a', playlistPosition: 3, viewCount: 100, publishedAt: '2026-10-10T00:00:00Z' },
    { id: 'newer-first', title: 'A', playlistPosition: 2, viewCount: 100, publishedAt: '2026-10-10T00:00:00Z' },
    { id: 'unknown', title: 'C', playlistPosition: 4, viewCount: null, publishedAt: null }
  ];
  const originalIds = cards.map(card => card.id);
  assert.deepEqual(sortVideos(cards, 'latest').map(card => card.id), ['newer-first', 'newer-later', 'older', 'unknown']);
  assert.deepEqual(sortVideos(cards, 'views').map(card => card.id), ['older', 'newer-first', 'newer-later', 'unknown']);
  assert.deepEqual(sortVideos(cards, 'name').map(card => card.id), ['newer-first', 'newer-later', 'older', 'unknown']);
  assert.deepEqual(sortVideos(cards, 'playlist').map(card => card.id), ['older', 'newer-first', 'newer-later', 'unknown']);
  assert.deepEqual(cards.map(card => card.id), originalIds);
  assert.notEqual(sortVideos(cards, 'latest'), cards);
});

test('ten-item archive pages have stable ranges without overlap or loss', () => {
  const items = Array.from({ length: 26 }, (_, index) => index + 1);
  const first = paginate(items, 1);
  const second = paginate(items, 2);
  const third = paginate(items, 3);
  assert.deepEqual(first, { items: [1,2,3,4,5,6,7,8,9,10], page: 1, totalPages: 3, totalItems: 26, start: 1, end: 10 });
  assert.deepEqual(second.items, [11,12,13,14,15,16,17,18,19,20]);
  assert.equal(second.start, 11);
  assert.equal(second.end, 20);
  assert.deepEqual(third.items, [21,22,23,24,25,26]);
  assert.equal(third.start, 21);
  assert.equal(third.end, 26);
  assert.deepEqual([...first.items, ...second.items, ...third.items], items);
});

test('pagination clamps bad pages and never exceeds the ten-video limit', () => {
  const items = Array.from({ length: 34 }, (_, index) => index);
  assert.equal(paginate(items, 999).page, 4);
  assert.equal(paginate(items, -1).page, 1);
  assert.equal(paginate(items, 'garbage').page, 1);
  assert.equal(paginate(items, Infinity).page, 1);
  assert.equal(paginate(items, 1, 50).items.length, 10);
  assert.equal(paginate(items, 1, 0).items.length, 10);
  assert.equal(paginate(items, 1, 6).items.length, 6);
  assert.deepEqual(paginate([], 7), { items: [], page: 1, totalPages: 1, totalItems: 0, start: 0, end: 0 });
});

test('available categories come only from public records and reflect later additions', () => {
  const cards = [
    { type: 'VIDEO', privacyStatus: 'public' },
    { type: 'VIDEO', privacyStatus: 'public' },
    { type: 'BUILD', privacyStatus: 'private' },
    { type: 'CRAFTING', privacyStatus: 'unlisted' }
  ];
  assert.deepEqual(getAvailableCategories(cards), ['VIDEO']);
  assert.deepEqual(getAvailableCategories([...cards, { type: 'BUILD', privacyStatus: 'public' }]), ['VIDEO', 'BUILD']);
  assert.deepEqual(getAvailableCategories([]), []);
});
