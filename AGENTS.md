# Project language conventions

- Communicate with the user in Vietnamese, including progress updates and final responses.
- Use English for Git commit messages and GitHub-facing descriptions, documentation, and project notes.
- Preserve original YouTube video titles and functional multilingual search data or test fixtures.
- The v5.4 website supports English and Vietnamese user interfaces; keep technical documentation and Git messages in English. Localized interface text is an intended exception to the documentation convention.

## Active website

- The active website is `mistdory_v5.4/`. Start implementation searches there unless the user names another version or requests a comparison.
- Earlier version folders, archives and legacy root website files are historical references. Do not scan them for routine changes to the active website.
- Preserve existing work outside the requested scope. When a commit is requested, stage the intended paths explicitly.

## Targeted code navigation

- When starting a new session or answering a project-status request, use [HANDOFF.md](mistdory_v5.4/HANDOFF.md) as the quick resume pack. Check current Git state before reporting delivery; the pack is a summary, not proof that a push or deployment succeeded. It need not be reread before every small edit.
- If the relevant file or symbol is already known, go directly to it. Otherwise, consult only the matching feature entry in [the active project map](mistdory_v5.4/PROJECT_MAP.md).
- Use scoped `rg` searches for the feature's function, selector, DOM ID or JSON key, then read the surrounding implementation. Avoid reading every source file before a small edit.
- Expand to shared dependencies, callers, CSS overrides and affected pages when the change requires it. The map is a starting point, not a restriction against necessary investigation; verify its pointers against current code.
- Search all relevant selector occurrences before changing shared CSS, including later overrides, media queries and language/game variants.
- Inspect only relevant JSON fields or records. Avoid printing whole video catalogs when changing a guide link, featured selection or layout.
- Use `STATUS.md` for current progress and deferred scope, `CHANGELOG.md` for version history/comparisons, and `README.md` or `scripts/README.md` for setup, refresh and publishing tasks. These documents are not a mandatory reading stack for every edit.
- Choose verification that matches the affected feature; use the map's verification routes. Documentation-only changes need link/path and diff checks, not a full browser or video-refresh run.

## Keep navigation current

- Update the relevant map entry when feature locations, shared dependencies, function names, selectors, data keys or verification commands change. Ordinary text or color edits do not require rewriting the map.
- Use stable symbols and relative paths as pointers rather than fixed line numbers. Keep detailed implementation and current progress in their existing sources.
- When a new active version is explicitly created, update the active-version pointer and map link in this file, and create or adapt the map inside that version. Keep historical version maps scoped to their own versions.
- Refresh the active handoff pack at version wrap-up or after a material change to delivery, verification or next work. When creating a new active version, update the resume-pack link here as well.
