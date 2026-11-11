# MistDory public v0.0.1 — resume pack

Updated **2026-11-11**. Active source: `mistdory_public_v0.0.1/`.

## Version transition

- Public release numbering begins at **v0.0.1**. This is the internal **v5.5** milestone following the committed v5.4 checkpoint.
- `mistdory_v5.4/` and earlier folders are pre-public history. The `public` folder prefix separates the new release series without duplicating a second v5.5 working tree.
- Source preparation does not mean deployment: GitHub Pages configuration, production URL/HTTPS checks and account verification remain pending. No push or deployment is implied by this pack.

## Current behavior

- Inherits the v5.4 bilingual static PoE 1/PoE 2 hub, public video catalogs, URL policy, CSP, local fonts and Live Server adapter.
- Home League Start cards: PoE 1 3.30 opens the provided Excalidraw roadmap in a new tab; PoE 2 1.0 remains Soon, with no destination and unknown update time.
- Both cards have a localized roadmap description and diagram. PoE 1 records the content update in GMT+7 and UTC; page reload does not change it.
- Catalog snapshot remains 34 PoE 1 + 56 PoE 2 videos, last refreshed 2026-10-28 at 17:35 GMT+7.

## Resume and verify

- Follow [AGENTS.md](../AGENTS.md), [PROJECT_MAP.md](PROJECT_MAP.md), [STATUS.md](STATUS.md) and [README.md](README.md).
- Preview with `node scripts/preview-live.cjs` from this directory. Port 8003 may still serve the historical directory; use `PORT=8006` for an independent preview and confirm its source before reviewing.
- v5.4 browser suites were recorded on 2026-11-10 before the roadmap changes. They are inherited evidence, not fresh public-version browser results.
- Check Git status/history and remote synchronization before reporting delivery. Preserve unrelated root/v5.2/v5.3 edits.

## Next work

1. Review the public candidate, refresh and verify the YouTube catalogs before publishing.
2. Configure GitHub Pages to publish only this active website's runtime assets; no workflow exists yet.
3. Commit/push the publishing setup when authorized, then verify the deployed HTTPS URL, navigation, assets and playback.
4. Content backlog: avatar, real WIP links, Soon guides/Crafting/FAQ and the PoE 2 roadmap. Broader mobile/accessibility/performance work remains deferred.
## Fresh source-transition verification — 2026-11-11

- 61/61 offline tests passed using VS Code's Node runtime with `--test --test-isolation=none` (the sandbox blocked the normal child-process runner).
- Offline `scripts/verify-catalog.cjs` returned `valid: true` for 34/56 public videos. This did not refresh YouTube visibility.
- SHA-256 checks matched Home HTML, shared CSS, translations and both catalogs against the committed v5.4 checkpoint.
- Full browser suites were not rerun during the version-only transition. Production publication remains pending.