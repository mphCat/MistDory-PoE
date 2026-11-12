# MistDory v0.1.5 — resume pack

Updated **2026-11-12**. Active source: `mistdory_v0.1.5/`.

## Version transition

- **v0.1.5** is the current public release candidate in `mistdory_v0.1.5/`.
- The former v5.1–v5.4 folders are now v0.1.1–v0.1.4. The former public v0.0.1 candidate (internal v5.5) is now v0.1.5; there is one active version series.
- See [VERSION_HISTORY.md](../VERSION_HISTORY.md) for the exact old/new mapping. Historical commits retain their original paths; no Git history, tag or GitHub Release was rewritten.
- GitHub Pages deployment and initial HTTPS/resource checks succeeded on 2026-11-12; see the verified deployment section below. Account protection and full production-browser checks remain pending.
## Current behavior

- Inherits the v0.1.4 bilingual static PoE 1/PoE 2 hub, public video catalogs, URL policy, CSP, local fonts and Live Server adapter.
- Home League Start cards: PoE 1 3.30 opens the provided Excalidraw roadmap in a new tab; PoE 2 1.0 remains Soon, with no destination and unknown update time.
- Both cards have a localized roadmap description and diagram. PoE 1 records the content update in GMT+7 and UTC; page reload does not change it.
- Current catalog snapshot: 36 PoE 1 + 56 PoE 2 videos, refreshed 2026-11-12 at 08:42:43 GMT+7 / 01:42:43 UTC. Older verification entries below describe their historical snapshot.

## Resume and verify

- Follow [AGENTS.md](../AGENTS.md), [PROJECT_MAP.md](PROJECT_MAP.md), [STATUS.md](STATUS.md) and [README.md](README.md).
- Preview with `node scripts/preview-live.cjs` from this directory. Port 8003 may still serve the historical directory; use `PORT=8006` for an independent preview and confirm its source before reviewing.
- v0.1.4 browser suites were recorded on 2026-11-10 before the roadmap changes. They are inherited evidence, not fresh public-version browser results.
- Check Git status/history and remote synchronization before reporting delivery. Preserve unrelated root/v0.1.2/v0.1.3 edits.

## Next work

1. Review the public candidate, refresh and verify the YouTube catalogs before publishing.
2. Keep deploying through `.github/workflows/pages.yml`; verify the Actions run and live URL after each release.
3. Complete a production-browser pass for navigation, language/game state and YouTube playback.
4. Content backlog: avatar, real WIP links, Soon guides/Crafting/FAQ and the PoE 2 roadmap. Broader mobile/accessibility/performance work remains deferred.
## Fresh source-transition verification — 2026-11-11

- 61/61 offline tests passed using VS Code's Node runtime with `--test --test-isolation=none` (the sandbox blocked the normal child-process runner).
- Offline `scripts/verify-catalog.cjs` returned `valid: true` for 34/56 public videos. This did not refresh YouTube visibility.
- SHA-256 checks matched Home HTML, shared CSS, translations and both catalogs against the committed v0.1.4 checkpoint.
- Full browser suites were not rerun during the version-only transition. Production publication remains pending.
## Unified-directory migration verification — 2026-11-11

- Historical pending work was saved in commit `094384b` before renaming directories.
- After renaming, offline suites passed: v0.1.2 34/34, v0.1.3 36/36, v0.1.4 61/61 and v0.1.5 61/61 (192 total).
- Relative Markdown file destinations resolve across the five version folders and active repository navigation. Font-preview Home links and translation keys use the matching version.
- Full browser suites and production checks were not rerun for this directory/documentation migration. Existing preview processes may retain old paths and must be restarted before further review.
## GitHub Pages deployment — 2026-11-12

- Workflow: [pages.yml](../.github/workflows/pages.yml). It verifies offline tests and stored catalogs, then packages only the active runtime using [prepare-pages.cjs](scripts/prepare-pages.cjs).
- Configure repository Settings > Pages > Source as **GitHub Actions**. Pushes to `main` affecting the active version/workflow trigger deployment; manual workflow dispatch is available on `main`.
- Artifact root contains the four HTML pages, `css/`, `js/`, `data/`, `assets/` and `.nojekyll`. Historical versions, maintenance scripts, tests and technical documents are excluded; font licenses remain in assets.
- Expected project URL: `https://mphcat.github.io/MistDory-PoE/`. Report actual publication only after the Actions deployment and public endpoint are verified.
- Catalog checks validate the stored snapshot, not current YouTube visibility. The 2026-10-28 34/56-video snapshot is intentionally retained for this deployment; a new refresh remains maintenance work.
- For a future version folder, update the workflow source/path filter together with repository navigation.

### Deployment preparation verification — 2026-11-12

- GitHub API confirms the repository is public, with default branch main.
- 61/61 offline tests passed; offline catalog verification returned valid=true.
- The Pages packager produced the runtime-only artifact and confirmed production Home HTML was byte-for-byte unchanged. HTML local dependency and production-policy checks passed.
- Workflow delivery and actual production publication are separate; check the Actions run before reporting success.

## Verified public deployment — 2026-11-12

- Website: **https://mphcat.github.io/MistDory-PoE/**.
- First deployment succeeded: [Actions run 43131703288](https://github.com/mphCat/MistDory-PoE/actions/runs/43131703288), source commit `30d7f63`.
- HTTPS requests returned 200 for Home, Videos, About, font preview, shared CSS/JavaScript, both JSON catalogs, the local thumbnail fallback and a self-hosted WOFF2 font.
- Deployed Home contains both League Start cards and production CSP, with no development reload client. Catalog counts remain 34/56.
- Artifact contents were checked locally: maintenance scripts/tests, technical documentation and historical versions are not packaged. The public HANDOFF path returned 404; additional excluded-path HTTP probes encountered transient GitHub 503 responses, so those responses are not evidence of a 404.
- Full browser/YouTube playback regression on the production host was not run in this deployment session. Account 2FA/recovery/access settings remain unverified.
- Future updates to the active version on main deploy automatically. Refresh the old catalog snapshot and fill Soon content as subsequent maintenance.
## YouTube catalog refresh — 2026-11-12, 08:42:43 GMT+7 / 01:42:43 UTC

- Completed the official-playlist refresh and verified 100 distinct signed-out watch pages. Retained only explicit public, playable, first-party videos.
- PoE 1 increased from 34 to **36** videos; PoE 2 remains **56**. No previously retained video was removed.
- Added `THMUtEBnGM0` (PoE - 3.30 | Patch Note Review And My League Start Plan) and `N5GXihQ39qE` (PoE 1 | WARNING! Slow Run Practice | 26mins/acts you can be better).
- Updated titles, exact metrics, publication metadata and public-state proofs. Curated guide labels/destinations, descriptions/tags and featured choices remain unchanged; guide-video verification times were renewed.
- Release verification with a 24-hour maximum age and the refresh self-test passed. 61/61 offline tests passed after fixing the fallback test helper to accept its fixture's expected featured ID rather than the stored catalog's configured hero.
- The website remains snapshot-based; visitor reloads fetch published JSON and do not run a YouTube audit. This entry records a refresh, not continuous YouTube synchronization.
## Cumulative view counter — implementation prepared, activation pending (2026-11-12)

- Added a bilingual Page views / Lượt xem total beside the copyright on Home, Videos and About, with responsive wrapping.
- Optional backend source is in [services/view-counter](../services/view-counter/README.md), using Cloudflare Workers + D1. The main website stays on GitHub Pages.
- Same public IP only counts again after a gap of more than 10 seconds since its preceding request. Every reload renews this sliding window. SQL triggers and transactional batches keep concurrent updates consistent; the cumulative total is never automatically reset.
- The backend stores HMAC-SHA256 IP hashes, not raw IPs; hourly cleanup expires hashes after 24 hours without touching the total. Household/VPN users can share the cooldown. This is not unique-person analytics or complete bot protection.
- 69/69 offline tests passed, including 8 new client/Worker/actual-SQL tests. Tests do not establish Cloudflare deployment correctness.
- **Not activated:** `js/view-counter-config.js` has an empty endpoint; local/production displays a dash and sends no count. No Cloudflare account connection, database, secret or deployed URL has been configured by this session.
- Next: user creates/binds D1 and deploys the Worker using the service guide; configure the public endpoint and exact CSP origin, then verify live persistence/cooldown before publishing frontend activation. Never put Cloudflare credentials or the hash secret into the repo/chat.

### Counter browser verification — 2026-11-12

- 88/88 Chrome checks passed, including footer label/value, copyright alignment, no horizontal overflow and no dock overlap at 1440px and 390px on Home, Videos and About.
- Screenshots were inspected in the local preview. Cloudflare endpoint remains unconfigured; these are not live backend checks.
- Preview: http://127.0.0.1:8006/. The production website remains on the previous committed/pushed release until counter activation is completed.

## Counter activation — 2026-11-12

- User deployed and configured the Worker at https://mistdory-view-counter.caculated-bitsh.workers.dev with D1 binding and server-side secret. The secret was not shared or stored in the repository.
- Production frontend now points to that endpoint; only its exact HTTPS origin is added to connect-src on Home, Videos and About. Scripts/fonts policy is unchanged.
- Live POST verification: first request returned 1; immediate repeat remained 1. A request after more than 10 seconds was checked before publishing. Test requests are real views and are retained in the total.
- The earlier pending-activation notes are historical. Cloudflare cron setup is not yet verified; add hourly `0 * * * *` under Trigger Events to expire old IP hash records without resetting the total.
- Website-side verification and Pages deployment are reported separately from the backend check.
### Counter verified on production — 2026-11-12

- Pages deployment succeeded for source `0790993`: https://github.com/mphCat/MistDory-PoE/actions/runs/43150362626.
- Live Worker test returned totals 1, 1, then 2 after an 11-second idle gap; the total was not reset after testing.
- 6/6 real Chrome production checks passed: Home displays a numeric count, language switching does not send another count, Videos and About show the shared total, mobile footer is visible, and three real cross-origin requests completed without first-party JavaScript errors. Home displayed 3 during the browser check.
- Both implementation and activation commits are pushed. The counter is now active at https://mphcat.github.io/MistDory-PoE/.
- Remaining account-side task: configure/confirm the Worker hourly Cron Trigger `0 * * * *` so expired hash records are pruned. Counting works without it, but stale hashes otherwise accumulate. The total is never pruned.

### Footer release version — 2026-11-12

- Display v0.1.5 as a subtle line below the footer row on Home, Videos and About; align right on desktop and left on mobile.
- During packaging, derive the label from the active mistdory_vX.Y.Z directory committed in Git. This is a release number, not a claim that a Git tag or GitHub Release exists. Refresh the shared CSS asset URL to avoid stale styling.
