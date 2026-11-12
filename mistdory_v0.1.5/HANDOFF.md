# MistDory v0.1.5 — resume pack

Updated **2026-11-12**, at session wrap-up. Active source: **`mistdory_v0.1.5/`**.

## Start here next session

- Live website: **https://mphcat.github.io/MistDory-PoE/**, hosted on GitHub Pages. The repository is public.
- v0.1.5 is published. League Start cards, refreshed YouTube catalogs, cumulative views, footer spacing and the footer release label are implemented and pushed.
- Latest verified application deployment: `93834f1` (footer version). Earlier checkpoints: `0790993` counter activation, `bfe9b50` footer inset, `47bb285` CSS cache refresh, `c36aaf7` catalog refresh. Determine the actual newest commit and remote sync from Git; the final handoff commit naturally follows these application commits.
- Follow root [AGENTS.md](../AGENTS.md): speak Vietnamese; technical notes/Git messages are English. Use [PROJECT_MAP.md](PROJECT_MAP.md) to locate the requested feature.
- Earlier version folders are historical. [VERSION_HISTORY.md](../VERSION_HISTORY.md) maps old names to v0.1.1–v0.1.5. No Git history, tags or GitHub Releases were rewritten.

Read-only delivery checks from the repository root:

```text
git status --short --branch
git log -5 --oneline
git rev-list --left-right --count HEAD...origin/main
```

The tracking ref can be stale; fetch when fresh remote verification is needed. Known root deletions and untracked legacy folders/archives/debug.log are unrelated local work. Do not restore, remove, stage or commit them implicitly. Historical v5.2/v5.3 edits were already checkpointed as `094384b` before migration.

## Current website

- Static bilingual EN/VN PoE 1/PoE 2 hub, six Home videos, ten per archive page, search/filter/sort, Builds dialog, curated resources and About. Original YouTube titles are preserved.
- Home League Start: PoE 1 **3.30** opens the supplied Excalidraw roadmap; PoE 2 **1.0** is non-interactive Soon. Both have a localized roadmap description and diagram. PoE 1 has fixed GMT+7/UTC content-update times; PoE 2 has Last updated: —.
- Current catalogs: **36 PoE 1 + 56 PoE 2** public videos, refreshed **2026-11-12 08:42:43 GMT+7 / 01:42:43 UTC**. Newest PoE 1 video: `THMUtEBnGM0`, “PoE - 3.30 | Patch Note Review And My League Start Plan”. Also added `N5GXihQ39qE`, the slow-run practice video. Existing featured selections and curated guide destinations were preserved.
- Copyright and Page views / Lượt xem share a row on desktop, with 32px horizontal inset; small screens use 18px and stacked content. A subtle **v0.1.5** line follows. `prepare-pages.cjs` derives the deployed version from the active directory; keep preview markup in sync when creating a new version.
- Shared CSS currently uses `?v=20261112-footer-version`. Pages can cache resources for ten minutes; update the asset revision for a stylesheet release that must bypass older browser caches. Ctrl+F5 is useful while checking an existing session.

## View counter service

- Backend: **https://mistdory-view-counter.caculated-bitsh.workers.dev**, separate Cloudflare Worker + D1. Source/setup: [services/view-counter](../services/view-counter/README.md). Main website remains on GitHub Pages.
- Client: [view-counter.js](js/view-counter.js), [view-counter-config.js](js/view-counter-config.js). Production origin/path only; local previews send no counts and show —. Errors show — rather than a fabricated zero. Language switching reformats without another request.
- One cumulative total across Home/Videos/About. Same public IP counts again only after **more than 10 seconds since its preceding request**; each request renews the sliding cooldown. Concurrent updates are protected by transactional D1 batches and SQL triggers.
- Cloudflare stores keyed IP hashes in D1, not raw IPs. No cookies or fingerprints are used. Shared NAT/VPN IPs share a cooldown; this is approximate page-view activity, not unique-person analytics or complete bot protection.
- User configured binding `DB`, `SITE_ORIGIN` and a server-side `IP_HASH_SECRET` of at least 32 characters. Never request, log or commit that secret. No service credentials are in the frontend.
- **Still confirm/configure:** hourly Worker Cron Trigger **`0 * * * *`** under Settings > Trigger Events. It prunes hash records older than 24 hours; it never resets the cumulative total. User has not confirmed this step. Counting works without it, but expired hashes otherwise accumulate.
- Live verification returned 1, then 1 on immediate reload, then 2 after 11 seconds. Chrome then displayed 3 on the live site. Test views were intentionally retained; never reset the total without an explicit request.

## Publishing and preview

- [pages.yml](../.github/workflows/pages.yml): push to `main` affecting the active version, counter service or workflow runs offline tests, validates stored catalogs, packages runtime files and deploys Pages. Manual dispatch is available on main.
- [prepare-pages.cjs](scripts/prepare-pages.cjs): output contains four HTML pages, CSS/JS/data/assets and .nojekyll. Historical versions, scripts/tests and project documentation are excluded; font licenses remain included.
- For a future active version, update workflow paths/source, root AGENTS, repository overview and feature map. Keep counter endpoint/database stable so the total survives website releases.
- Interactive preview: `node scripts/preview-live.cjs`. The local counter-preview process was started at **http://127.0.0.1:8006/** using `tests/local-preview.cjs`; it may not survive a new session. Old port 8003 can point to a historical/renamed folder. Confirm the server root.
- On this machine Node/npm are absent from PATH. Use the installed VS Code `Code.exe` runtime with `ELECTRON_RUN_AS_NODE=1`, absolute script paths, temporary logs and hidden processes. Follow README/scripts instructions; never rely on a GUI executable returning synchronously without waiting/piping its output.

## Verification recorded this session

| Check | Result and limits |
| --- | --- |
| Full online YouTube refresh | 100 candidate watch pages audited; release verification and refresh self-test passed; 36/56 retained videos |
| Offline suites | **69/69** after adding eight SQL/Worker/client checks; actual SQLite schema exercised |
| Local Chrome bilingual/layout review | **88/88**, including footer alignment, translations, no overflow/dock overlap on three pages at 1440px and 390px |
| Live counter Chrome checks | **6/6**: real cross-origin totals on three pages, translation without recount, mobile visibility, no first-party JS errors |
| Live footer inset Chrome checks | **6/6**: measured 32px desktop and 18px mobile; no overflow |
| Footer version packaging/public HTML | Packager passed; v0.1.5 found on live Home, Videos and About; deployment for `93834f1` succeeded |

Older v0.1.4 security/resource, playback, desktop QC and reload results are historical evidence in [STATUS.md](STATUS.md) and [SECURITY_REVIEW.md](SECURITY_REVIEW.md). A complete production playback/accessibility/performance audit was not rerun here. Do not equate HTTP success with verified YouTube playback.

## Remaining work

1. Confirm the Cloudflare hourly cleanup trigger.
2. Fill content when supplied: avatar, actual WIP projects, Soon guides/Crafting/FAQ, PoE 2 roadmap.
3. Broader production-browser/YouTube playback, mobile/touch, accessibility/performance and advanced SEO work remain deferred. Account 2FA/recovery/access and backup practices have not been audited.
4. YouTube updates remain manual: add uploads to the correct official playlist, run [prepare-release.ps1](scripts/prepare-release.ps1), review, verify and publish. F5 reloads published JSON; it does not discover uploads. Continuous/scheduled YouTube synchronization is not implemented.

Use [STATUS.md](STATUS.md) for detailed chronology and deferred work, [CHANGELOG.md](CHANGELOG.md) for release history, and [PROJECT_MAP.md](PROJECT_MAP.md) for feature entry points. Refresh this pack after the next material change to delivery or scope.