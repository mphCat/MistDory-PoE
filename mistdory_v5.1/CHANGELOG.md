# MistDory — Changelog

All notable changes to this project are documented here.
Format: `vX — date — summary`

---

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
