# MistDory — v5.4 resume pack

Updated **2026-11-10**. Read this for a quick project briefing, then open only the feature needed for the task. This is a readable handoff, not an archive of source code or the full conversation.

## Start here next session

- Active website: **`mistdory_v5.4/`**. Earlier version folders and legacy root website files are historical references.
- v5.4 implementation and local hardening are complete for the agreed scope. The next task is a user choice: content updates, an explicitly requested new version, or GitHub Pages/account verification.
- This pack belongs to the v5.4 source wrap-up on `main`. Determine the actual commit and synchronization from Git; do not infer deployment from a commit or push.
- Follow the repository-root [AGENTS.md](../AGENTS.md): communicate in Vietnamese, write technical documentation/Git messages in English, preserve original video titles and bilingual interface behavior.

From the repository root, use these read-only checks before reporting delivery:

```text
git status --short --branch
git log -1 --oneline -- AGENTS.md mistdory_v5.4
git rev-list --left-right --count HEAD...origin/main
```

`origin/main` is a local tracking reference and may be stale; fetch it when current remote verification is needed. Previously observed root deletions and edits in v5.2/v5.3 are unrelated local work. Do not restore, delete or include them in a v5.4 commit implicitly.

## What the project does

A static Path of Exile community hub for MistDory: separate PoE 1/PoE 2 content, English/Vietnamese UI, six Home videos, a searchable/sortable archive with ten videos per page, Builds selection, curated resources and an About page. There is no application backend, login or visitor write API, and no package/build step for the published website.

| Milestone | Work carried forward |
| --- | --- |
| v5.1 (`44cdf79`) | Mist's public-only YouTube catalog, game separation and navigation/account destinations |
| v5.2 (`0ce9786`) | Centered layout, Oxanium headings, Home/archive browsing, flexible search, Builds dialog, fixed resource dock, About and pre-release catalog refresh |
| v5.3 (`71f1efe`) | WIP Projects replaces duplicated guide videos; full-row resource links, darker hover, independent catalog loading/retry and featured-player fallback |
| v5.4 initial (`66fe442`) | EN/VN switch, remembered language/URL state, translated pages, original titles preserved and safer player/history behavior |
| v5.4 navigation (`047814d`) | Scoped repository instructions and a browsable feature/architecture map |
| v5.4 wrap-up | URL validation, production CSP/external event listeners, isolated Discord tabs, self-hosted fonts, thumbnail fallback, CSP-compatible Live Server and this handoff pack |

The full history is in [CHANGELOG.md](CHANGELOG.md). Use [STATUS.md](STATUS.md) for detailed current scope and [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for findings, implemented fixes and remaining operational limits.

## Choose the part to edit

Paths below are relative to this version. [PROJECT_MAP.md](PROJECT_MAP.md) supplies exact functions, selectors, dependencies and verification routes when needed.

| User's requested part | First files to inspect |
| --- | --- |
| Header, Support/Videos, Builds popup or footer | [site.js](js/site.js), matching markup in the three main HTML pages, relevant selectors in [style.css](css/style.css) |
| Home hero or featured video | [index.html](index.html), `applyRealm()` / `setYoutube()` in [main.js](js/main.js), matching catalog `meta` |
| Video cards, search, filters or archive pages | [main.js](js/main.js), [catalog-utils.js](js/catalog-utils.js), [videos.html](videos.html) |
| WIP, Document, Leveling/Crafting or Miscellaneous | Matching `guideRows.gc1`–`gc4` in [poe1.json](data/poe1.json) / [poe2.json](data/poe2.json), renderer/translations in `main.js` |
| About or the future avatar | [about.html](about.html), [about.css](css/about.css), [page-translations.js](js/page-translations.js) |
| Language preference or translated UI | [i18n.js](js/i18n.js), `page-translations.js`, dynamic translations in `main.js` |
| Typography, font assets or comparison page | [fonts.css](css/fonts.css), [font provenance](assets/fonts/SOURCES.md), relevant shared CSS, [font-preview.html](font-preview.html) |
| URL/resource security | [url-policy.js](js/url-policy.js), four HTML CSP meta tags, `main.js`, [catalog-lib.cjs](scripts/catalog-lib.cjs) |
| Interactive preview or reload | [preview-live.cjs](scripts/preview-live.cjs), [live-reload-client.js](scripts/live-reload-client.js) |
| New YouTube uploads or metadata | [Refresh instructions](scripts/README.md); run the importer rather than manually inventing card/verification records |

Search the relevant symbol or selector first. Shared header/footer markup is repeated in Home, Videos and About; language, game and CSS overrides can cross file boundaries. Expand investigation when necessary, rather than treating this table as a hard file limit.

## Preview and publishing model

- Interactive development: `node scripts/preview-live.cjs`, normally **http://127.0.0.1:8003/**. `PORT` selects a free alternative. Confirm the process is actually running; a prior-session preview is not guaranteed to survive.
- The launcher reuses installed Live Server, injects an external same-origin reload client and permits its exact local WebSocket only in development responses. Production HTML on disk remains unchanged. The ordinary extension's inline injection is not the supported CSP-compatible workflow.
- Production-policy QA: `node tests/local-preview.cjs` on another port, with `MISTDORY_QA_URL` set to its origin. Direct `file://` opening cannot load the JSON catalogs.
- On the inspected Windows machine, Node/npm are absent from PATH. Use the existing VS Code `Code.exe` runtime with `ELECTRON_RUN_AS_NODE=1`, absolute script paths and temporary working directory. Long-running hidden preview processes need stdout/stderr redirected to temporary logs; retain the PID. See [README.md](README.md) and the map for details.
- Intended public host: **GitHub Pages**, initially its default `github.io` address. Hosting/account configuration and a verified production URL remain outstanding. A future `.net` domain is optional. GitHub serves the static site; it does not run the local Live Server or Node scripts.

## Data and security facts to preserve

- Stored snapshot: **34 PoE 1 + 56 PoE 2 videos**, last full refresh **2026-10-28, 17:35 UTC+7**. The hardening work did not change either catalog's bytes or audit timestamps.
- F5 reloads published JSON; it does not audit YouTube or discover new uploads. Add uploads to the correct public playlist and use the existing refresh workflow before publishing. Scheduled/per-visitor YouTube synchronization is not implemented.
- Public-only import requires explicit privacy/playability/channel proof. Do not treat playlist membership, thumbnail loading or one successful playback as a replacement for that audit.
- All four HTML pages carry production CSP. Scripts and fonts are same-origin; supported YouTube thumbnail/embed origins remain allowed. Do not weaken production script policy just to accommodate development reload code.
- Six Google Fonts families are self-hosted: 28 WOFF2 files, 418,772 binary bytes, six OFL licenses and source/hash manifests. Niagara samples remain device-local and are not redistributed.
- Invalid destinations are inert; thumbnails have a local SVG fallback. Keep `noopener,noreferrer` on Discord popups and the embedded player's explicit referrer policy.

## Verification at wrap-up

Completed on **2026-11-10**, before this documentation-only wrap-up:

| Check | Result |
| --- | --- |
| Offline tests | **61/61**: 30 loading, 8 catalog utility, 13 URL policy, 10 Live Server adapter |
| Refresh self-test and offline catalog verification | Passed; stored catalogs unchanged |
| Desktop Chrome regression | **191/191** |
| Bilingual browser regression | **82/82** |
| Production-CSP security/resource review | **46/46**, including **90/90 real thumbnail decodes** and local font loading while Google font CDNs were blocked |
| Real Live Server watcher/reload | **18/18**, including CSS-only refresh and unchanged production HTML |
| Featured playback | Both games advanced playback time, readyState 4, no media error in the installed Chrome environment |

Do not rerun every suite for a prose-only edit. Choose checks using the map. These results do not certify every browser, country, future YouTube state, GitHub account or production host. Temporary test artifacts may no longer exist in a later session; the reproducible runners are in `tests/`.

## Still pending or intentionally deferred

- **Publishing/operations:** verify GitHub passkey/2FA, recovery/access/token permissions; configure and confirm Pages serves v5.4 over HTTPS; inspect its actual headers. No deployment was performed during local hardening.
- **Content:** personal avatar image; real WIP project names/status/links; the Soon guide entries and future Crafting/FAQ destinations. The existing About text is accepted.
- **Deferred:** dedicated mobile/touch optimization, full accessibility/performance audit, advanced SEO, Discord keyboard semantics, click-to-load featured player and automated YouTube synchronization.
- **Suggestions not selected:** clearer external cue for the Videos header link, patch/version filtering and adding About's hardcoded video references to the refresh audit. These are not active tasks.

## What to tell the user next time

After checking Git, give a short Vietnamese briefing: the active version and actual delivery state; what is complete; which content/hosting work remains; and one or two relevant next steps. If the user names a feature, go directly to that route instead of repeating a full project review. Never describe Soon placeholders as active projects or a source push as a deployment.

Refresh this pack at the next version wrap-up or after a material delivery/scope change. If a new active version is explicitly created, update this pack's successor and the links in root `AGENTS.md`; preserve this version's history.
