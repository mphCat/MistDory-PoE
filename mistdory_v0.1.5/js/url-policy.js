/* Shared URL boundaries for browser rendering and maintainer-side validation. */
(function (root, factory) {
  'use strict';
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  if (root) root.MistUrlPolicy = policy;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;

  function textValue(value) {
    if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value) || value.includes('\\')) return '';
    return value.trim();
  }

  function decodedValue(value, recursive = false) {
    let decoded = value;
    for (let depth = 0; depth < (recursive ? 8 : 1); depth++) {
      let next;
      try { next = decodeURIComponent(decoded); }
      catch { return depth === 0 ? null : decoded; }
      if (CONTROL_CHARACTERS.test(next) || next.includes('\\')) return null;
      if (next === decoded) return decoded;
      decoded = next;
    }
    if (recursive && /%(?:25|2e|2f|5c)/i.test(decoded)) return null;
    return decoded;
  }

  function safeExternalUrl(value) {
    const source = textValue(value);
    if (!/^https:\/\//i.test(source) || decodedValue(source) === null) return '';
    try {
      const url = new URL(source);
      const authority = source.slice(source.indexOf('//') + 2).split(/[/?#]/, 1)[0];
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || authority.includes('@')) return '';
      return url.href;
    } catch { return ''; }
  }

  function safeImageUrl(value) {
    const source = textValue(value);
    if (!source) return '';
    if (/^https:/i.test(source)) return safeExternalUrl(source);
    if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('/') || source.startsWith('?') || source.startsWith('#')) return '';
    if (decodedValue(source, true) === null) return '';
    const rawPath = source.split(/[?#]/, 1)[0];
    const inspectedPath = decodedValue(rawPath, true);
    if (!inspectedPath || inspectedPath.startsWith('/') || /[:?#]/.test(inspectedPath)
      || /(?:^|\/)\.\.(?:\/|$)/.test(inspectedPath)) return '';
    try {
      const base = new URL('https://local.invalid/website-version/');
      const resolved = new URL(source, base);
      if (resolved.origin !== base.origin || !resolved.pathname.startsWith(base.pathname)) return '';
      return source;
    } catch { return ''; }
  }

  return Object.freeze({ safeExternalUrl, safeImageUrl });
});
