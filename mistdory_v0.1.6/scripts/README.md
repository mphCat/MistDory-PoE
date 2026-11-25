# Refresh video catalogs before a release

The website remains a static site. Refreshing the JSON files runs on the maintainer's computer before publishing; visitors do not need a server or YouTube API key.

For each new upload, add it to the appropriate POE or PoE2 playlist and make it public, then run the launcher below. New eligible cards are discovered and generated automatically; individual video entries do not need to be typed into JSON.

A visitor refreshing the page only downloads the latest published JSON snapshot. It does not run this Node workflow or independently audit YouTube. A scheduled publishing job or a configured YouTube Data API client would be a separate integration, and is not enabled here.

From `mistdory_v0.1.6` in PowerShell:

```powershell
.\scripts\prepare-release.ps1 -DryRun
.\scripts\prepare-release.ps1
```

The launcher uses Node.js in PATH, or the existing VS Code Node runtime when Node.js is unavailable. An explicit executable can be supplied with `-NodePath`. It does not install tools, elevate permissions, commit, push, or deploy. PowerShell execution policy and network permissions still apply.

If Windows blocks local PowerShell scripts, the reviewed launcher can be run with a process-only policy override (this does not change the system policy):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-release.ps1
```

With Node.js installed, the individual commands are:

```text
node scripts/refresh-videos.cjs --dry-run
node scripts/refresh-videos.cjs
node scripts/verify-catalog.cjs --require-refresh --max-age-hours 24
node scripts/self-test.cjs
```

`refresh-videos.cjs --check` is an alias for the networked dry run. `verify-catalog.cjs` without `--require-refresh` is an offline structural check; it does not claim to determine current YouTube visibility.

## What a successful refresh means

Both official playlists are checked to completion, including pagination and numbered hidden-video counts. A video is retained only when its signed-out watch page explicitly reports `isUnlisted=false`, `isPrivate=false`, playable status `OK`, the requested video ID, and Mist Dory's channel ID. Playlist membership or playback alone is insufficient. Private, unlisted, unavailable, and other creators' videos are excluded. Unknown visibility, layout changes, ambiguous counts, timeouts, or incomplete pagination fail the entire refresh.

New public videos in the playlists are added automatically. Exact view counts, publication dates, titles, and durations are refreshed from watch metadata. The featured video and displayed counts follow the public catalog. All four guide groups are curated: WIP Projects, Document, Leveling/Crafting Recipes, and Miscellaneous. Their titles, panel metadata and non-video rows are preserved; no panel is repopulated from the video cards. YouTube links in every group, including WIP Projects, are independently checked and removed if no longer public. Curated card descriptions/tags are also preserved. No rejected IDs or links are written to served metadata.

The two JSON files are staged and replaced only after all checks pass. Original bytes are backed up outside the served site, and restored if a replacement fails. Concurrent catalog edits detected during the refresh abort the write. Network or validation failures leave both source catalogs unchanged. A filesystem/process failure during the brief two-file replacement can still require recovery from the reported temporary backup directory; two separate files cannot provide a single filesystem-level atomic commit.

Successful snapshots include `source.refreshedAt`, `source.visibilityCheckedAt`, `source.metricsCheckedAt`, and `source.lastRefresh` with start/end times and count-only audit results. Each retained YouTube item includes its public-state proof and verification time. Release verification requires a complete snapshot no older than 24 hours. These timestamps describe the last audit; YouTube visibility and view counts can change afterward.

Review the resulting JSON diff, confirm the on-page update time, and then follow the project's normal publishing process. Re-run the refresh if more than 24 hours pass before publishing.

The refresh also reads the official channel Shorts tab and all continuation pages. Each card receives `isShort`; short duration alone does not classify a video as a Short. Unrecognized channel/layout or incomplete Shorts pagination aborts the refresh before writing. Home and Videos show long-form videos by default, with Shorts under a separate category. Run `node tests/shorts.test.cjs` for parser/pagination safeguards.
# Curated PoE 1 guides

The [guide hub](../guides.html) reads [guides-poe1.json](../data/guides-poe1.json), a manually curated snapshot separate from the generated video catalogs. `refresh-videos.cjs` does not update this file. Source: [Mist Path of Exile 1 workbook](https://docs.google.com/spreadsheets/d/1nMhuegfqKisuEikG2I4FI14MhHIpsAQUVjU3y09OTCQ/edit), inspected 2026-11-25. Source links retain sheet IDs and row ranges. HTML from all six visible tabs and 13 embedded images were inspected; downstream PoBs/planners, comments, revision history and game mechanics were not independently verified. No raw workbook exports are shipped.

- `atlas`: 14 source-linked entries across 3.30/3.29/3.27. Retain testing warnings and archive labels. Do not silently promote `source-notes` to a recommendation.
- `builds`: eight 3.30 source snapshots grouped by build/ascendancy; preserve exact PoB mappings and original linked-video titles. Video patch can differ from build-sheet patch.
- `regex`: exact cell text, including surrounding quotes and case. Verify against the source before changing. Clipboard failure must remain visible; textarea permits manual selection.
- `farms`: historical raw fields, not calculated income. Source ambiguities and rare jackpots must remain explicit; never infer exchange rates or net profit.
- `crafting`: two owner-authorized placeholders, `status: "awaiting-video"`, `videoUrl: null`. When the owner supplies a public YouTube walkthrough, verify its public status through the established catalog workflow, then add its URL, original title, applicable patch, item target and steps. Update the renderer to show a video link only for a verified populated record; current placeholders deliberately render no action or iframe. Do not add placeholder video IDs or invented recipes.

Validation: `node --test tests/guides.test.cjs`; package with `node scripts/prepare-pages.cjs <new-output-directory>`. Preview the five shared Guides sections and dedicated Crafting page in EN/VN at desktop/mobile widths, Atlas patch filtering, deep links, clipboard denial/manual fallback, load failure/retry, and `?game=poe2` scope notice. Header links carry realm/language; the PoE 1 Builds dialog opens source tab 3.30. The public game catalogs and their audit timestamps are not changed by guide maintenance.

Browser regression: start the local preview, then run `MISTDORY_QA_URL=http://127.0.0.1:8003 node tests/guides-browser-review.cjs` (set the environment variable using your shell's syntax). `MISTDORY_QA_CHROME` optionally overrides Chrome. The runner uses a disposable headless profile and temporary screenshots; it also verifies language changes during loading/failure and remembered-game versus explicit-URL precedence.

Guides navigation: desktop uses a persistent left sidebar; mobile uses a sticky keyboard-accessible selector. Header height is measured dynamically to set scroll offsets. The sidebar has exactly Atlas, Ultimatum, Build Progress, Regex and Farm Experiments. Build URLs use `?build=cws` for the parent; leaves are `?build=cws-chieftain`, `?build=cws-gladiator` and `?build=ravagebomb`, usually with `#builds`. Leaf views filter the eight unchanged source records by family/ascendancy; CWS parent exposes its two child links without flattening snapshots. Native URL navigation provides Back/Forward support. Language and realm-return links preserve selected leaf state. Crafting is a separate `crafting.html` page, and legacy `guides.html#crafting` redirects with the current realm/language. Both pages are included in the runtime packager and Live Server adapter allowlists. Restart the adapter after changing its page allowlist; keep the user preview running when requested.
