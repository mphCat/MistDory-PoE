/* Shared, dependency-free catalog helpers for Home and the video archive. */
(function (root, factory) {
  'use strict';
  const utilities = factory();
  if (typeof module === 'object' && module.exports) module.exports = utilities;
  if (root) root.MistCatalogUtils = utilities;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const MAX_PAGE_SIZE = 10;

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      // Blood Mage is one class name: keep its word order distinct from Mageblood.
      .replace(/\bblood\s+mage\b/g, 'bloodmage');
  }

  function compactText(value) {
    return normalizeText(value).replace(/\s+/g, '');
  }

  function matchesSearch(card, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;
    const tags = card && Array.isArray(card.tags) ? card.tags : [];
    const fields = [card && card.title, card && card.desc, card && card.ver, ...tags]
      .filter(value => value != null)
      .map(compactText)
      .filter(Boolean);
    // All typed keywords must match, but their order and spacing do not matter.
    // Craft/crafting is an explicit vocabulary alias, not general fuzzy stemming.
    const keywords = normalizedQuery.split(/\s+/).map(word => word === 'crafting' ? 'craft' : word);
    return keywords.every(keyword => fields.some(field => field.includes(keyword)));
  }

  function sortVideos(cards, sort) {
    const decorated = (Array.isArray(cards) ? cards : []).map((card, index) => ({ card, index }));
    const position = item => Number.isFinite(item.card.playlistPosition) ? item.card.playlistPosition : Number.MAX_SAFE_INTEGER;
    const tieBreak = (a, b) => position(a) - position(b) || a.index - b.index;
    const descending = (a, b) => a === b ? 0 : a > b ? -1 : 1;

    decorated.sort((a, b) => {
      let order = 0;
      if (sort === 'views') {
        const aViews = Number.isFinite(a.card.viewCount) ? a.card.viewCount : -Infinity;
        const bViews = Number.isFinite(b.card.viewCount) ? b.card.viewCount : -Infinity;
        order = descending(aViews, bViews);
      } else if (sort === 'latest' || sort === 'newest') {
        const aDate = a.card.publishedAt ? Date.parse(a.card.publishedAt) : NaN;
        const bDate = b.card.publishedAt ? Date.parse(b.card.publishedAt) : NaN;
        order = descending(Number.isFinite(aDate) ? aDate : -Infinity, Number.isFinite(bDate) ? bDate : -Infinity);
      } else if (sort === 'name') {
        order = String(a.card.title || '').localeCompare(String(b.card.title || ''), 'en', { sensitivity: 'base' });
      } else if (sort === 'type') {
        order = String(a.card.type || '').localeCompare(String(b.card.type || ''), 'en', { sensitivity: 'base' });
      }
      return order || tieBreak(a, b);
    });
    return decorated.map(item => item.card);
  }

  function paginate(items, requestedPage, requestedLimit = MAX_PAGE_SIZE) {
    const list = Array.isArray(items) ? items : [];
    const numericLimit = Math.floor(Number(requestedLimit));
    const limit = Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(MAX_PAGE_SIZE, numericLimit)
      : MAX_PAGE_SIZE;
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const numericPage = Math.floor(Number(requestedPage));
    const page = Number.isFinite(numericPage) ? Math.min(totalPages, Math.max(1, numericPage)) : 1;
    const offset = (page - 1) * limit;
    const displayed = list.slice(offset, offset + limit);
    return {
      items: displayed,
      page,
      totalPages,
      totalItems,
      start: displayed.length ? offset + 1 : 0,
      end: offset + displayed.length
    };
  }

  function getAvailableCategories(cards) {
    return [...new Set((Array.isArray(cards) ? cards : [])
      .filter(card => card && card.privacyStatus === 'public' && typeof card.type === 'string' && card.type.trim())
      .map(card => card.type))];
  }

  return Object.freeze({ matchesSearch, sortVideos, paginate, getAvailableCategories });
});
