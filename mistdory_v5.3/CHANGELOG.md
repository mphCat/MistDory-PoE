# MistDory — Changelog

All notable changes to this project are documented here.
Format: `vX — date — summary`

---

## v5.3 — 2026-11-04

### WIP Projects and version separation
- Create a separate `mistdory_v5.3` directory from the latest working site so new work has its own files, preview and refresh scripts.
- Replace the first guide panel's duplicated video list with **WIP Projects** for curated testing and project links.
- Show Build experiments, Mechanic tests and Upcoming guides as **(Soon)** until project information is supplied; do not present them as active projects.
- Use full-row links and inline (Soon) labels consistently across all four guide panels.
- Preserve WIP Projects during video refresh and include any future YouTube links in that panel in the public-only audit.
- Keep the featured player, six-video Home preview and ten-video archive as the places to browse videos.

### Guide rows and hover contrast — 2026-11-04
- Make available rows in Document, Leveling/Crafting Recipes and Miscellaneous clickable across the full row, removing separate Open/Watch buttons from those panels.
- Show (Soon) beside unavailable row labels at rest, with no link or action.
- Darken red and purple button hover/focus backgrounds, including Support Mist and About's primary YouTube action.
- Clarify that the existing release refresh automatically discovers new public playlist videos; browser refresh only reloads the published JSON snapshot.
- Replace outdated manual numeric-card examples with the playlist import and verified featured-video selection instructions.

### Loading reliability and featured playback — 2026-11-03
- Load each game's catalog independently; a failed or slow response no longer blocks the available game.
- Check HTTP status and catalog structure, apply a 15-second request timeout, and offer a per-game Try again action on Home and All videos.
- Clear stale cards, player and guides for unavailable games; preserve game switching, filters, pagination and Back/Forward through recovery.
- Add explicit embedded-player referrer policy, the actual site origin, and a direct Watch on YouTube link that follows the featured video and clears when unavailable.
- Confirm both featured videos remain public, allow embedding and play with advancing media time in the installed Chrome test environment. The reported preview/browser-specific playback error was not reproduced there.
- Keep the accepted About content; a personal avatar will be added when supplied.

## v5.2 — 2026-10-26

### QC follow-up — 2026-10-28
- Hide empty video categories automatically and improve contrast for small labels, inactive game controls, guide actions, placeholders and the CoWB badge.
- Standardize guide actions as Open/Watch; unavailable actions change to Soon on hover/focus and cannot navigate.
- Remember the chosen game locally, with explicit URL parameters taking priority; carry game and video filters into the archive.
- Add a shared Builds popup for PoE 1 / PoE 2 Build Sheets and retain the PoE 2 Mobalytics destination.
- Replace Document's Build Sheet links with game-specific patch notes, official news/site and mechanics references.
- Support keyword searches regardless of spaces, punctuation, accents or keyword order.
- Add `videos.html`, with a maximum of ten videos per page; Home retains a six-video preview.
- Add a public-only pre-release refresh/verification workflow and show the real catalog-check timestamp in UTC+7.
- Preserve the deferred Discord keyboard behavior, shared JSON-load failure handling, guide heading markup, player-loading behavior and mobile layout.

### Typography update — 2026-10-28
- Extend Oxanium SemiBold to the guide-panel titles (Videos, Document, Leveling, Miscellaneous) in both realms, with tighter letter spacing.

### Typography update — 2026-10-27
- Replace the temporary UTM Niagara headings with Oxanium SemiBold (600) for branding and large headings on Home and About.
- Restore sizes suited to Oxanium's wider letterforms and load it through Google Fonts, removing the local-font activation requirement.
- Preserve body text, controls, video titles and guide labels, with Cinzel as the fallback for display headings.
- Keep the separate font comparison page available for selecting a replacement later.

### Added
- Six-video homepage preview, All videos/Show less toggle, matching-result count, and Latest/Most viewed sorting from verified publication dates and exact view counts.
- Fixed resource dock with five Path of Exile tools and a local About page.
- About MistDory introduction, public account links and cited first-party sources.
- Shared dock-height measurement to reserve scrolling space beneath the fixed panel.

### Changed
- Centered hero and archive inside a shared 1180px frame with wider desktop gutters and responsive layouts.
- Search scans the complete realm catalog; switching games resets the preview to six videos.
- Added public-video guards, accessible sort/search labels, and a safe initial loading state.
- Preserved the public-only PoE 1/PoE 2 separation from v5.1.

## v5 — 2025-04-16
### Added
- Document column (gc2) — renamed from "Written Guides", now links to PoE 1 and PoE 2 Google Sheets
- Leveling column (gc3) — Loot Filter moved here as row #1, Alternative Leveling as row #2, Act Tips and Leveling Common Mistake as placeholders
- Miscellaneous column (gc4) — Atlas Guide placeholder + 6 Moment Shorts, scrollable
- YouTube auto-thumbnail — VIDEO cards now auto-fetch their thumbnail from YouTube (no manual image needed)

### Changed
- All 4 guide columns now scrollable, max-height tightened to show exactly 3 rows before scrolling
- Discord buttons now use real invite links (Main + CoWB) across both PoE 1 and PoE 2
- Guide row button labels now smart: explicit `btnLabel` wins → placeholder rows show "Soon" → scrollable + real link shows "Watch" → non-scrollable + real link shows "Open"
- Loot Filter moved from Miscellaneous to Leveling (top row)

### Pending
- Leveling: Act Tips and Leveling Common Mistake links not added yet
- Miscellaneous: Atlas Passives Guide link not added yet
- PoE 2 Video Guides, Crafting, Miscellaneous content still placeholder
- Build and Crafting cards not real content yet
- Stats numbers not updated yet
- Footer links not added yet

---

## v4 — 2025-04-13
### Added
- Card grid now shows all 10 videos as cards ordered by most viewed (view rank)
- "Most Viewed" sort option added to the sort dropdown (set as default)
- Golden ★ Most Viewed badge on the #1 ranked card
- Featured hero YouTube embed — Occultist CoWB Uber Melting 3.28 auto-loads in hero
- `viewRank` field added to cards in poe1.json for future re-ranking

### Changed
- Sort dropdown default changed from "Sort by Name" to "Most Viewed"
- Card descriptions written for all 10 video cards

---

## v3 — 2025-04-13
### Added
- Version badges (3.28, 3.27 etc.) shown on each Video Guide row
- Videos sorted newest-to-oldest (3.28 → 3.25) in the guide list
- `featured` flag support in JSON rows for hero video selection
- Scrollable Video Guides column with crimson scrollbar

### Changed
- Video Guides list reordered: 3.28 entries at top, descending by patch version

---

## v2 — 2025-04-13
### Added
- Real Video Guide content — 10 YouTube links with titles added to poe1.json
- Scrollable guide card for Video Guides column (max-height with overflow scroll)
- Guide rows now dynamically rendered from JSON via `guide-rows-wrap` div

### Changed
- Grid columns renamed: Video Guides · Written Guides · Leveling · Miscellaneous
  (replaced Crafting Recipes with Leveling; CoWB column idea deferred)
- Button label on video rows changed to "Watch" (was "Click Here")

---

## v1 — 2025-04-13
### Added
- Initial project scaffolded as multi-file GitHub-ready structure
- `index.html` — clean HTML, no inline styles or scripts
- `css/style.css` — all styles centralized with CSS variables
- `js/main.js` — all logic: realm switch, card render, filter, sort
- `data/poe1.json` — PoE 1 content (meta, guide rows, cards)
- `data/poe2.json` — PoE 2 content (meta, guide rows, cards)
- `images/thumbnails/` — folder ready for card thumbnail images
- `.gitignore` — ignores OS files and node_modules
- `README.md` — full usage guide, folder structure, deploy instructions
- PoE 1 / PoE 2 realm switcher (crimson ↔ purple sliding toggle)
- Two Discord badges: Main (blue) + CoWB (green) with labels
- Hero section: title, tagline, stats, YouTube embed placeholder
- Guides & Info 4-column grid
- Card grid with search, category filter, sort dropdown
- Minimal footer: © 2025 MistDory
