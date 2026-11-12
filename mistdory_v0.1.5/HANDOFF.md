# MistDory v0.1.5 — resume pack

Updated **2026-11-12**. Active source: `mistdory_v0.1.5/`.

## Version transition

- **v0.1.5** is the current public release candidate in `mistdory_v0.1.5/`.
- The former v5.1–v5.4 folders are now v0.1.1–v0.1.4. The former public v0.0.1 candidate (internal v5.5) is now v0.1.5; there is one active version series.
- See [VERSION_HISTORY.md](../VERSION_HISTORY.md) for the exact old/new mapping. Historical commits retain their original paths; no Git history, tag or GitHub Release was rewritten.
- Source preparation does not mean deployment. GitHub Pages configuration, production HTTPS checks and account verification remain pending.
## Current behavior

- Inherits the v0.1.4 bilingual static PoE 1/PoE 2 hub, public video catalogs, URL policy, CSP, local fonts and Live Server adapter.
- Home League Start cards: PoE 1 3.30 opens the provided Excalidraw roadmap in a new tab; PoE 2 1.0 remains Soon, with no destination and unknown update time.
- Both cards have a localized roadmap description and diagram. PoE 1 records the content update in GMT+7 and UTC; page reload does not change it.
- Catalog snapshot remains 34 PoE 1 + 56 PoE 2 videos, last refreshed 2026-10-28 at 17:35 GMT+7.

## Resume and verify

- Follow [AGENTS.md](../AGENTS.md), [PROJECT_MAP.md](PROJECT_MAP.md), [STATUS.md](STATUS.md) and [README.md](README.md).
- Preview with `node scripts/preview-live.cjs` from this directory. Port 8003 may still serve the historical directory; use `PORT=8006` for an independent preview and confirm its source before reviewing.
- v0.1.4 browser suites were recorded on 2026-11-10 before the roadmap changes. They are inherited evidence, not fresh public-version browser results.
- Check Git status/history and remote synchronization before reporting delivery. Preserve unrelated root/v0.1.2/v0.1.3 edits.

## Next work

1. Review the public candidate, refresh and verify the YouTube catalogs before publishing.
2. Deploy through `.github/workflows/pages.yml`; verify the actual Actions run and production URL before reporting publication.
3. Commit/push the publishing setup when authorized, then verify the deployed HTTPS URL, navigation, assets and playback.
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
