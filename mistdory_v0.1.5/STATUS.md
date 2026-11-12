# MistDory v0.1.5 — release preparation

Updated **2026-11-11**. Unified release series: **v0.1.5**. Active directory: `mistdory_v0.1.5/`.

## Delivery

This is the v0.1.5 public source candidate, copied from the committed v0.1.4 League Start checkpoint. It is deployed at https://mphcat.github.io/MistDory-PoE/ (verified 2026-11-12). GitHub Pages is the verified host. Initial HTTP/resource checks passed; account/access review and full production-browser checks remain pending.

## Scope

- All v0.1.4 hub features, EN/VN interfaces, catalogs, URL validation, production CSP, self-hosted fonts and local preview support are retained.
- PoE 1 3.30 League Start opens Excalidraw; PoE 2 1.0 is Soon without a link. Both include a localized roadmap description and decorative diagram.
- PoE 1's fixed content timestamp is shown in GMT+7 and UTC. PoE 2 shows Last updated: — until content exists.
- Current video data: 36 PoE 1 + 56 PoE 2 videos, refreshed 2026-11-12 at 08:42:43 GMT+7 / 01:42:43 UTC. Historical checks below retain their original snapshot counts.

## Verification

The v0.1.4 historical checks (61 offline, 191 desktop, 82 bilingual, 46 security/resource and 18 Live Server assertions) predate the roadmap addition. Do not describe them as newly run for this candidate. Consult the source history and current command results for fresh verification.

## Pending

See [HANDOFF.md](HANDOFF.md) for publication steps. Avatar, actual WIP projects, Soon guides, Crafting/FAQ and PoE 2 roadmap remain pending. Dedicated mobile/touch, complete accessibility/performance/SEO reviews and automated YouTube synchronization remain deferred.
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