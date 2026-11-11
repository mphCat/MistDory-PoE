# MistDory v5.3 — Progress and changes from v5.2

Updated on **04/11/2026**. Track the current status here; the change history is in [CHANGELOG.md](CHANGELOG.md).

## Reference points

- **Finalized v5.2:** commit [`0ce9786`](https://github.com/mphCat/MistDory-PoE/commit/0ce97861ba64976613e54bc024c1397b282f53f3).
- **v5.3 code committed and pushed:** [`71f1efe`](https://github.com/mphCat/MistDory-PoE/commit/71f1efed4a4e59fdecfa60b84fc274179f8d94bd).
- **Current working directory:** `mistdory_v5.3`; preview at `http://127.0.0.1:8002/` while Live Server is running.
- The local `mistdory_v5.2` directory still has uncommitted edits from before the versions were separated. The table below therefore compares against **v5.2 as saved in Git**, so changes carried forward into v5.3 are included.

## Completed in v5.3

| Item | Finalized v5.2 | Current v5.3 |
| --- | --- | --- |
| Version separation | Work in `mistdory_v5.2` | Separate directory, preview, data and scripts in `mistdory_v5.3` |
| First Guides & Info column | Videos list duplicates videos in the main section | **WIP Projects** replaces the duplicate list; the interface is complete, with actual project content pending |
| Documentation and project rows | Separate Open/Watch buttons beside each row | Entire rows are clickable; unavailable items show **(Soon)** beside the name and do not navigate |
| Hover/focus colors | Some buttons switch to bright red backgrounds, reducing white-text contrast | Darker red/purple backgrounds match the game; also applied to Support Mist and the YouTube button on About |
| Data loading | Both JSON files load together; one failure can block content initialization | Games load independently; HTTP and structure checks, a 15-second timeout and **Try again** |
| Error recovery | Generic error message | Clear stale content to avoid showing the wrong game; game switching, Back/Forward and retries remain available; restore filters/pagination |
| Featured video | Direct embed with no fallback link outside the player | Referrer policy, actual origin and **Watch on YouTube**; selected from public cards independently of the WIP column |
| Content refresh | Rebuild the Videos column from the card list | Preserve all four curated content groups; also check any YouTube links added to WIP later |
| Video import instructions | Manual card-entry examples do not match the new validator | Explain how to add videos to the correct playlist and run the importer; remove numeric-ID examples that cause data errors |
| Testing | v5.2 test suite | Add checks for per-game failures, Retry, late responses, full-row links, hover and WIP preservation during refresh |

Main related files: [main.js](js/main.js), [style.css](css/style.css), [PoE 1 data](data/poe1.json), [PoE 2 data](data/poe2.json) and [the refresh workflow](scripts/README.md).

## Features retained from v5.2

These features were already complete and are not counted as new v5.3 features:

- Home shows 6 videos; All videos shows up to 10 videos per page.
- Flexible search, Latest/Most viewed and hidden empty categories; URLs retain the game/filters/page, and the browser remembers the game.
- Builds popup for choosing PoE 1/PoE 2 Build Sheets, plus Mobalytics, YouTube and Support Mist links.
- Centered layout, Oxanium font, fixed resource footer and About page.
- Public-only video imports from two playlists, with view counts, publication dates and update timestamps.

## Current stage

**After commit `71f1efe`, no coding work is in progress.** The project is waiting for content and a decision on the next step. “WIP Projects” is the name of a website section; it does not confirm that actual projects are being tested.

| Pending item | Actual status | Input needed |
| --- | --- | --- |
| WIP Projects in both games | Interface complete; Build experiments, Mechanic tests and Upcoming guides are all **(Soon)** placeholders | Actual project names, descriptions/links and status supplied by Mist |
| About avatar | About content approved; currently uses **MD** initials | Personal avatar image |
| PoE 1 Soon content | No links yet for Act Tips, Leveling Common Mistake and Atlas Passives Guide | Actual content or links |
| PoE 2 Soon content | No links yet for Rune Crafting Basics, Socket Strategy, Currency Efficiency, Loot Filter PoE 2, Endgame Atlas and Top 10 Tips PoE 2 | Actual content or links |
| Crafting and FAQ in the header | Currently marked Soon | Content/destination pages when implementation is chosen |

## Not implemented or outside the current scope

- **YouTube synchronization on each visitor's F5 refresh or on a schedule:** no API or scheduled task is enabled. F5 currently reloads only the published JSON. The importer already discovers new videos when the administrator runs refresh; individual cards do not need manual entry.
- **Mobile/touch:** no dedicated optimization pass has been completed; this work was agreed to be deferred.
- **Discord keyboard access:** existing behavior is retained as previously decided; badges have not been converted to links reachable with Tab.
- **Semantic headings, loading the player only after Play is clicked, and advanced SEO:** not implemented; these items have been explained or deferred.

The following QC suggestions **have not been selected for implementation** and should not be marked “in progress”:

- Clarify that the header's Videos button opens YouTube through its label or a ↗ symbol.
- Add a patch/version filter.
- Include video references written directly in About in the refresh script's audit scope.

## Verification and operation

- Comparing the data with finalized v5.2 confirms that all 34 PoE 1 cards, 56 PoE 2 cards, metadata and the other three guide groups are preserved. The duplicate video list in `gc1` is replaced with WIP; videos in the main section and archive have not been removed.
- Latest checks before the v5.3 commit: **191/191 browser checks**, **28/28 data-loading tests** and **8/8 catalog utility tests** all passed. The refresh script's regression test also checked WIP preservation and the public-only policy.
- Testing covered Chrome desktop/local preview. A full WCAG/Lighthouse assessment, dedicated mobile checks and verification across all browsers/production hosting have not been completed.
- The player error “your browser can't play this video” was not reproduced in the tested Chrome environment: both featured videos played with advancing media time. This result does not confirm playback in every preview environment.
- The video snapshot still records the **28/10/2026, 17:35 UTC+7** refresh: 34 PoE 1 videos and 56 PoE 2 videos. Committing v5.3 code does not automatically refresh this snapshot.
- Before the next website release: run [refresh and release checks](scripts/README.md), review the changes and confirm that hosting serves the intended version. **Committing/pushing code does not mean the website has been deployed.**

## How to update this tracker

- When a task is complete, move it to the completed section and add a changelog entry.
- When coding starts on a selected task, record it in the “Current stage” section. If no implementation is in progress, retain the current waiting status.
- Remove a Soon label only when actual content/links are available. Do not mark projects or the avatar complete just because their interface exists.
