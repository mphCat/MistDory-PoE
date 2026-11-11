# Refresh video catalogs before a release

The website remains a static site. Refreshing the JSON files runs on the maintainer's computer before publishing; visitors do not need a server or YouTube API key.

For each new upload, add it to the appropriate POE or PoE2 playlist and make it public, then run the launcher below. New eligible cards are discovered and generated automatically; individual video entries do not need to be typed into JSON.

A visitor refreshing the page only downloads the latest published JSON snapshot. It does not run this Node workflow or independently audit YouTube. A scheduled publishing job or a configured YouTube Data API client would be a separate integration, and is not enabled here.

From `mistdory_v0.1.2` in PowerShell:

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

New public videos in the playlists are added automatically. Exact view counts, publication dates, titles, and durations are refreshed from watch metadata. The Videos guide group, featured video, and displayed counts follow the public catalog. Other guide groups and curated descriptions/tags are preserved; auxiliary YouTube links are independently checked and removed if no longer public. No rejected IDs or links are written to served metadata.

The two JSON files are staged and replaced only after all checks pass. Original bytes are backed up outside the served site, and restored if a replacement fails. Concurrent catalog edits detected during the refresh abort the write. Network or validation failures leave both source catalogs unchanged. A filesystem/process failure during the brief two-file replacement can still require recovery from the reported temporary backup directory; two separate files cannot provide a single filesystem-level atomic commit.

Successful snapshots include `source.refreshedAt`, `source.visibilityCheckedAt`, `source.metricsCheckedAt`, and `source.lastRefresh` with start/end times and count-only audit results. Each retained YouTube item includes its public-state proof and verification time. Release verification requires a complete snapshot no older than 24 hours. These timestamps describe the last audit; YouTube visibility and view counts can change afterward.

Review the resulting JSON diff, confirm the on-page update time, and then follow the project's normal publishing process. Re-run the refresh if more than 24 hours pass before publishing.
