# MistDory v0.1.4 — Bilingual interface status

> Historical snapshot. Active development is now [v0.1.5](../mistdory_v0.1.5/HANDOFF.md). Version paths were normalized on 2026-11-11; see [version naming history](../VERSION_HISTORY.md). References below to then-uncommitted work describe the earlier checkpoint; that work has since been committed.

Updated on **2026-11-10**. Track the current version here; historical changes are in [CHANGELOG.md](CHANGELOG.md).

## Version and delivery

- **Working directory:** `mistdory_v0.1.4`, copied from the local v0.1.3 site, including its latest documentation changes.
- **Previous committed reference:** v0.1.3 at [`71f1efe`](https://github.com/mphCat/MistDory-PoE/commit/71f1efed4a4e59fdecfa60b84fc274179f8d94bd).
- **v0.1.4 delivery:** source release on `main`, recorded in the [v0.1.4 Git history](https://github.com/mphCat/MistDory-PoE/commits/main/mistdory_v0.1.4). Production deployment is outside this source release.
- **v0.1.4 wrap-up:** this source checkpoint includes hardening, local resource assets and the [resume pack](HANDOFF.md). Consult Git history for the actual commit/push state; production deployment remains separate.
- **Interactive preview:** run `node scripts/preview-live.cjs` from this directory, then open `http://127.0.0.1:8003/`. Use `tests/local-preview.cjs` on another port for unchanged production-policy testing.

## Changes from committed v0.1.3

This comparison uses committed v0.1.3 at `71f1efe`. The local v0.1.3 directory also contains uncommitted edits and is not the release baseline.

| Area | Committed v0.1.3 | v0.1.4 |
| --- | --- | --- |
| Interface language | Fixed interface copy | English/Vietnamese across Home, All videos, About, Builds and the typography preview |
| Header | Game selector and existing navigation | Independent EN/VN control with blue EN, red VN and a sliding indicator |
| Preferences and links | Remember the game and carry browsing state in URLs | Also remember language, support explicit `lang=en` / `lang=vi` overrides and retain language across internal pages |
| Switching language | No shared language state | Translate immediately while preserving game, search, category, sort, archive page and original video titles |
| Headings | Oxanium display headings | Retain Oxanium branding and English headings; use Barlow for Vietnamese interface headings and accented letters |
| Player navigation | Replace the selected embed URL | Replace the player when the featured video changes to avoid adding a child-frame history step; retain it when only language changes |
| Typography preview | Fixed preview copy | Bilingual labels and font-loading messages, including safe handling when fonts finish loading before DOMContentLoaded |
| Local preview and checks | Version-specific preview and existing catalog/browser checks | Add the port 8003 preview helper, language/browser regression coverage and language-state integration tests |
| Security boundaries and resources | Encoded output with no application CSP or shared URL boundary | Validate links/images, isolate Discord tabs, apply a production CSP on all pages, self-host fonts and provide thumbnail fallback |

The WIP panel, full-row resource links, darker button hover, independent catalog loading, six-video Home preview and ten-video archive are inherited from v0.1.3. Both JSON catalogs are unchanged, retaining 34 PoE 1 videos and 56 PoE 2 videos from the existing snapshot.

## Completed implementation

- Separate v0.1.4 directory with its own pages, scripts, catalogs and preview.
- An EN/VN language switch at the upper right of the header: blue EN on the left, red VN on the right, with a sliding indicator independent of the game switch.
- English/Vietnamese interface copy for Home, All videos, About, the build picker and the typography preview, including metadata, accessibility labels, guides, filters, pagination, counts, dates, loading failures and retry actions.
- Immediate language changes that retain the game, search, category, sort and archive page. Browser storage remembers the language; an explicit `lang=en` or `lang=vi` URL takes priority, and internal links retain it.
- Original YouTube video titles, source catalogs, IDs, URLs and public-only content refresh behavior are preserved.
- Technical documentation, project notes and commit messages remain English. Visitor-facing Vietnamese copy is the intended exception.
- [Repository instructions](../AGENTS.md) and the [Project Map](PROJECT_MAP.md) provide scoped code navigation for v0.1.4. The README links to both; the map includes an architecture overview and feature-specific verification routes.
- Shared URL validation in `js/url-policy.js` protects rendered/opened links and offline catalog verification. Unsafe card/guide destinations remain inert; Discord popups explicitly use `noopener,noreferrer`.
- All four HTML pages have an early production CSP and referrer policy. Game/search/filter/Retry controls use `bindCatalogControls()` listeners instead of inline event attributes.
- All six Google Fonts families are served locally: **28 WOFF2 files, 418,772 binary bytes**, with six OFL licenses, source metadata and hashes. Niagara options remain device-local. Thumbnail failures fall back through YouTube to a bundled SVG.
- `scripts/preview-live.cjs` adapts the installed Live Server for development: external local reload client, a preview-only local WebSocket permission, loopback binding and Host/Origin checks. GitHub Pages serves static production files and does not run this launcher.

Main implementation files: [i18n.js](js/i18n.js), [page-translations.js](js/page-translations.js), [site.js](js/site.js), [main.js](js/main.js) and [style.css](css/style.css).

## Verification completed

The checks below were rerun after hardening on **2026-11-10**, using the plain helper so browser suites exercise the production CSP rather than a development response.

- **82/82 Chrome browser checks passed** across English/Vietnamese and both games, with no uncaught first-party JavaScript errors. Coverage includes switch colors/alignment and keyboard access, all 90 original video titles, cross-page/reload persistence, URL overrides, unavailable browser storage, filters/pagination, open build-dialog translation, catalog failure/retry and Back/Forward across games and languages.
- Checks also cover clicking the already selected language, immediate font-load completion before DOMContentLoaded, and Vietnamese layouts at **390 × 844** without viewport overflow or header overlap. Desktop screenshots were captured at **1440 × 1000**. Browser artifacts are retained under `%TEMP%/mistdory-v54-language-review-*`.
- **61/61 offline tests passed:** 30 loading/integration, 8 catalog utility, 13 URL-policy and 10 Live Server adapter tests. The offline catalog workflow self-test also passed, covering public-only proof, refresh failures and preservation of curated content.
- **191/191 desktop QC assertions** and **46/46 security/resource browser assertions passed** under the production CSP, with no uncaught first-party errors or CSP violations. Resource checks decoded **90/90 catalog thumbnails** through real network requests; local font checks passed while Google Fonts CDN requests were blocked.
- Both featured videos played with advancing media time, `readyState=4`, no media error and explicit public/playable watch metadata in the installed Chrome environment. Evidence: `%TEMP%/mistdory-v54-featured-diagnostic-ijUKOx/`. This is environment-specific evidence, not a guarantee against later removal, regional restrictions or network failures.
- **18/18 interactive Live Server browser assertions passed:** all four pages retain production source bytes, the external reload client connects, real file changes reload the page, and CSS changes refresh styles without full navigation. No CSP violations or uncaught application exceptions occurred. Evidence: `%TEMP%/mistdory-live-reload-browser-LttqEy/`.
- Offline catalog verification passed for both stored catalogs. This validates the snapshot structure; it is not a new networked YouTube visibility audit.
- Both v0.1.4 JSON catalogs are byte-for-byte identical to v0.1.3. Localization changes no video titles, URLs, IDs or metadata snapshots.
- These are local checks with the resource/playback scope stated above. They do not establish complete WCAG/Lighthouse conformance or behavior on every browser, country and production host.

## Technical and security review

- The initial review identified conditional catalog-URL validation gaps, missing CSP/inline-handler compatibility and missing explicit Discord popup isolation. All three are now addressed in local code and exercised by the hardening checks.
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) retains the original conditions, implemented fixes, resource evidence and remaining limits. A passed diagnostic does not certify all possible security controls.
- GitHub Pages on its default `github.io` address is the intended host. Production URL/headers, GitHub account protection and publishing configuration still require verification. Hardening did not refresh YouTube data or change hosting settings.

## Content still pending

| Item | Current status | Input needed |
| --- | --- | --- |
| WIP Projects in both games | Interface complete; Build experiments, Mechanic tests and Upcoming guides remain Soon placeholders | Actual project names, descriptions, links and status |
| About avatar | Approved About content still uses the MD monogram | Personal avatar image |
| PoE 1 Soon guides | Act Tips, Leveling Common Mistake and Atlas Passives Guide have no links | Actual content or links |
| PoE 2 Soon guides | Rune Crafting Basics, Socket Strategy, Currency Efficiency, Loot Filter PoE 2, Endgame Atlas and Top 10 Tips PoE 2 have no links | Actual content or links |
| Crafting and FAQ navigation | Marked Soon in both interface languages | Content and destination pages when selected for implementation |

## Retained scope and release notes

- Home retains six videos; the archive retains ten videos per page. Existing independent catalog loading, public-only guards, search and game preference remain in place.
- The source snapshot still records the **2026-10-28, 17:35 UTC+7** refresh with **34 PoE 1** and **56 PoE 2** videos. Localization does not refresh YouTube metadata or establish current visibility.
- Browser refresh reloads the published JSON snapshot. Scheduled YouTube synchronization and visitor-triggered YouTube audits are not enabled.
- A dedicated mobile/touch optimization pass, complete WCAG/Lighthouse assessment, advanced SEO and verification on every browser/production host remain outside this change. Narrow-width language checks do not constitute that broader audit.
- Previously deferred Discord keyboard behavior and other deferred features remain deferred.
- Preview Home and All videos over HTTP with the CSP-compatible Live Server launcher or plain helper. Opening `index.html` directly with `file://` prevents browser JSON fetching; repeatedly reloading that file does not resolve the loading error.
- Before publishing, run the [catalog refresh and release verification](scripts/README.md), review the result and confirm hosting serves `mistdory_v0.1.4`. A commit or push alone does not deploy this website.

### League Start checkpoint — 2026-11-11

- Add the Home PoE 1 3.30 Excalidraw roadmap card, bilingual description, decorative diagram, external arrow and fixed GMT+7/UTC content timestamps.
- Add the matching non-interactive PoE 2 1.0 Soon card with an unknown last-update time. Cards follow the selected game and use compact mobile artwork.
- Preserve catalog snapshots. This checkpoint is source-only; no Pages deployment was performed.