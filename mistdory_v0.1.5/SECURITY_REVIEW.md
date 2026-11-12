# MistDory v0.1.4 — Technical and security review

Reviewed and hardened locally on **2026-11-10**, following the initial assessment at source commit `047814d`. Intended hosting is GitHub Pages on its default `github.io` address. Current hardening edits are local; no deployment/account settings were changed.

## Current assessment

The three application findings from the initial review are now addressed in local code: catalog URL validation, CSP-compatible event binding/production policy, and explicit Discord popup isolation. The original conditions are retained below so a future reviewer can distinguish the initial risks from the fixes.

This remains a scoped source/local-browser assessment. GitHub account security, actual production headers, hosting configuration, all browsers and all geographic playback conditions have not been certified.

## Implemented boundaries

- [url-policy.js](js/url-policy.js) is shared by browser rendering/opening and maintainer-side catalog verification. External destinations require valid HTTPS without credentials/control characters; images can also use safe relative paths within this version. Script/data/file schemes and unsafe paths are rejected. Invalid card/guide destinations remain inert.
- All four HTML pages deliver an early production CSP: scripts/fonts are local; images may use the site, `img.youtube.com` and `i.ytimg.com`; frames may use `www.youtube.com`; objects, base URLs and forms are restricted. Inline script execution is not enabled. Inline styles remain allowed for existing style variables and the typography comparison.
- [main.js](js/main.js) binds game/search/filter/Retry controls with `bindCatalogControls()` listeners and opens validated Discord destinations with `noopener,noreferrer`. Existing game/language/history behavior and the deferred keyboard scope are retained.
- Fonts are served from the site: **28 official WOFF2 files, 418,772 binary bytes**, six OFL licenses and exact source/hash metadata in [font sources](assets/fonts/SOURCES.md). Vietnamese subsets are retained where provided by each family. Niagara comparisons remain device-local.
- Thumbnail errors use a bounded custom-image → YouTube → [local SVG](assets/images/video-placeholder.svg) fallback chain. This preserves usable cards when an image request fails; it does not replace the video's external destination.

## Original findings and resolution

### S1 — Medium, conditional: unsafe catalog URL schemes — addressed locally

The initial validator checked URL string structure but not scheme safety. An isolated JSON fixture allowed `javascript:` values into card/guide hrefs and a captured Discord popup call. The fixture did not execute those URLs or change stored JSON.

This required control of published catalog data through a broken import, unsafe manual edit or an attacker with publishing access. No visitor query/search route to modifying the server's catalog was demonstrated. Current source links were HTTPS or placeholders.

The shared policy now rejects unsafe values before rendering/opening and in [offline catalog verification](scripts/catalog-lib.cjs). Negative URL cases, inert destinations and current catalog acceptance are tested. Text encoding remains in place because protocol validation and output encoding address different contexts. See [OWASP URL guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).

### S2 — Medium: missing CSP and incompatible inline handlers — addressed locally

The initial pages had no application CSP. A disposable strict-policy test blocked the original inline game handler; filters and Retry used the same attribute pattern.

Production CSP meta tags are now present in [Home](index.html), [All videos](videos.html), [About](about.html) and [typography preview](font-preview.html). Controls use external listeners. Local fonts, current thumbnails, UI state and fallback behavior pass the production-policy browser checks without first-party CSP violations. See [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

A meta policy cannot enforce `frame-ancestors`; no anti-framing header protection is claimed. Confirm actual host headers before reporting clickjacking protection. See [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

### S3 — Low: Discord popup opener isolation — addressed locally

The initial callbacks used `window.open(url, '_blank')` without explicit isolation. Current destinations were trusted HTTPS invites; exploitation depended on destination/redirect and browser behavior. Both callbacks now use validated URLs and the explicit `noopener,noreferrer` features, with browser assertions covering the calls.

## Development preview and GitHub Pages

Use [preview-live.cjs](scripts/preview-live.cjs) for interactive development. It reuses the installed Live Server module/VS Code extension, binds to loopback, checks Host/Origin/path boundaries, injects an external local reload client into responses and adds only its local WebSocket to the response policy. The ordinary extension's inline injection is blocked by production CSP and is not the supported launcher for this version.

Use [local-preview.cjs](tests/local-preview.cjs) for unchanged production-policy testing on another port. Source HTML retains its production policy and contains no development reload injection. GitHub Pages will serve static HTML/CSS/JavaScript/JSON/fonts/images; it does not run Node or Live Server. No hosting/publishing configuration changed in this implementation.

## Confirmed verification

- **61/61 offline tests:** 30 loading/integration, 8 catalog utility, 13 URL policy and 10 Live Server adapter checks. Refresh self-test and offline catalog verification also pass.
- **46/46 security/resource browser assertions**, **82/82 bilingual assertions** and **191/191 desktop QC assertions** pass with the production CSP and no uncaught first-party errors/CSP violations.
- **90/90 catalog thumbnails** decoded through real network requests. Fonts loaded from the same origin while Google Fonts CDN endpoints were blocked. Binary/license hashes and all 32 font faces were checked.
- Both featured videos played in the installed Chrome environment with advancing media time, `readyState=4`, no media error and explicit public/playable watch metadata. Evidence: `%TEMP%/mistdory-v54-featured-diagnostic-ijUKOx/`.
- **18/18 interactive Live Server browser assertions:** the real watcher triggers page reload and CSS-only refresh under the development CSP, WebSocket connection works, and all four production HTML files remain byte-for-byte unchanged. No CSP violations or uncaught exceptions occurred. Evidence: `%TEMP%/mistdory-live-reload-browser-LttqEy/`.

The initial review found no critical/high-severity visitor-controlled exploit and no common API-token/private-key pattern in the current v0.1.4 source scan. This did not inspect every Git-history object or account setting. The application has no login/upload/comment/write API in the reviewed source; browser storage holds language/game preferences. Normal visitors cannot replace server JSON through developer tools or query parameters.

## Remaining operational work and limits

1. Verify GitHub passkey/2FA, recovery methods, repository collaborators and publishing-token permissions. Account compromise can replace the entire site despite browser-level protections. Current settings were not audited. [GitHub passkeys](https://docs.github.com/en/authentication/authenticating-with-a-passkey/about-passkeys).
2. Confirm the actual Pages URL serves v0.1.4, HTTPS redirects/certificate and response headers. The expected project URL was inaccessible through the initial review tool; this did not establish whether Pages was enabled. Default modern `github.io` Pages sites support automatic HTTPS; a custom domain is optional. [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
3. Handle request-flood availability at the hosting layer. This work performed no flood/load test or DDoS certification. GitHub Pages has usage limits and possible rate limiting; frontend JavaScript cannot stop requests before they reach hosting. [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
4. The unchanged catalog snapshot remains **2026-10-28**, with **34 PoE 1 / 56 PoE 2** cards. Thumbnail decoding/playback checks are not a new complete YouTube visibility audit. Run the [release refresh](scripts/README.md) before publishing. Videos can later be removed, restricted by region or unavailable through a viewer's network; the YouTube player/direct link remains the source of those notices.
5. WIP/Soon content and avatar remain pending in [STATUS.md](STATUS.md). Dedicated mobile/touch, complete accessibility/performance audits and every browser/production-host combination remain outside this change.

The maintainer-side refresh keeps HTTPS-host/redirect/size/time limits, explicit public-only proof and transactional catalog safeguards. It parses metadata rather than executing watch scripts, and visitors do not run it. No account, branch-protection, DNS or infrastructure settings were changed.


## Optional counter boundary — 2026-11-12

A separate Worker/D1 counter is now prepared in source but is not activated. It introduces a public POST endpoint with exact-origin CORS, prepared SQL, atomic cooldown/count updates, HMAC IP pseudonyms and expiring cooldown rows. This endpoint is not authentication-protected; CORS does not prevent direct client abuse. It intentionally returns only the total and generic errors. The static website has no login, visitor content upload or catalog write API. Counter quotas, Cloudflare account configuration and live deployment require verification. Activation requires adding only the deployed counter's exact origin to connect-src; script/font CSP stays unchanged.
