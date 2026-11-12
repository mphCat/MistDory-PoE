# MistDory v0.1.5 — release preparation

Updated **2026-11-11**. Unified release series: **v0.1.5**. Active directory: `mistdory_v0.1.5/`.

## Delivery

This is the v0.1.5 public source candidate, copied from the committed v0.1.4 League Start checkpoint. It has not been deployed. GitHub Pages remains the intended host; configuration, actual HTTPS URL, account/access review and production checks remain pending.

## Scope

- All v0.1.4 hub features, EN/VN interfaces, catalogs, URL validation, production CSP, self-hosted fonts and local preview support are retained.
- PoE 1 3.30 League Start opens Excalidraw; PoE 2 1.0 is Soon without a link. Both include a localized roadmap description and decorative diagram.
- PoE 1's fixed content timestamp is shown in GMT+7 and UTC. PoE 2 shows Last updated: — until content exists.
- Video data is unchanged: 34 + 56 videos from the 2026-10-28 snapshot. Release refresh remains outstanding.

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
