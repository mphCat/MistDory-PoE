# MistDory v0.1.5 — resume pack

Updated **2026-11-11**. Active source: `mistdory_v0.1.5/`.

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
2. Configure GitHub Pages to publish only this active website's runtime assets; no workflow exists yet.
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