# MistDory public v0.0.1 — Path of Exile Content Hub

A personal Path of Exile content hub featuring builds, crafting guides, and featured videos — with a live PoE 1 / PoE 2 realm switcher.

**Resume pack:** [HANDOFF.md](HANDOFF.md) summarizes completed work, current delivery, pending decisions and where to edit each feature for the next session.

**Progress tracker:** [Public v0.0.1 preparation and pending publication](STATUS.md). This release is the internal v5.5 successor to the committed v5.4 checkpoint. Public numbering starts at v0.0.1; deployment is tracked separately.

**Project navigation:** [Project Map](PROJECT_MAP.md) provides the architecture overview, feature locations, dependencies and verification routes. Repository-wide working instructions are in [AGENTS.md](../AGENTS.md).

**Security review:** [Local technical/security assessment](SECURITY_REVIEW.md) records the implemented URL/CSP/popup protections, resource checks and GitHub Pages/account verification still required.

## Public v0.0.1 (internal v5.5)

This version lives in its own `mistdory_public_v0.0.1` directory. Run preview, content refresh and release commands from this directory to keep its files separate from earlier versions.

- The header's independent **EN / VN** language switch slides left to blue **EN** or right to red **VN**, separately from the PoE 1 / PoE 2 game switch. Home, All videos, About, the build picker and the typography preview support both interface languages, including accessibility labels, loading/error/retry states, guide labels, counts and dates.
- Language changes apply immediately and preserve the selected game, search, filters and archive page. The preference is saved as `mistdory.language` in browser localStorage. An explicit `?lang=en` or `?lang=vi` URL takes priority, and internal links carry the selected language. The **VN** label represents the standard Vietnamese locale code `vi`; English is the default when no preference is available.
- Original YouTube video titles remain unchanged in both languages. Translation is applied to interface copy without rewriting the source catalogs, and the existing public-only refresh workflow remains unchanged.
- A centered 1180px content frame keeps the hero, guides and video archive aligned, with responsive side gutters.
- The homepage starts with six videos, sorted by **Latest**. **All videos** opens `videos.html`, with at most ten videos per page and shareable game/search/category/sort/page parameters. Search always checks the full catalog and tolerates spaces, punctuation, accents and keyword order (for example `Blood Mage` and `bloodmage`). Categories without public content are hidden automatically.
- The selected game is remembered in browser localStorage; an explicit `?game=poe1` or `?game=poe2` URL takes priority. This needs no additional server or account. Switching games resets search/category and pagination.
- Game catalogs load independently with HTTP/structure checks and a 15-second timeout. If one fails, the other remains usable; the selected unavailable game shows a Try again action and clears stale content. Recovery preserves normal URL, filtering and pagination behavior.
- **WIP Projects** replaces the duplicated Videos guide panel. It contains curated project or testing links; Build experiments, Mechanic tests and Upcoming guides remain **(Soon)** until actual project details and links are supplied. The full video collection stays in Home's video section and `videos.html`.
- **Builds** opens a shared PoE 1 / PoE 2 Build Sheet picker, with a separate PoE 2 Mobalytics link. **Document** offers game-specific patch notes, news/official site and mechanics references. Available rows in all four guide panels are clickable across their full width; unavailable rows show **(Soon)** beside their label and do not navigate.
- Buttons use darker red/purple hover and focus backgrounds for readable white text; whole-row links use a subtle dark tint and visible focus outline.
- **Latest** uses real publication timestamps; **Most viewed** uses exact numeric YouTube view counts. Metrics are snapshots recorded on each card and in `source`, rather than live counters or playlist-rank estimates. Only verified public videos are shown.
- A fixed resource dock links to Awakened Trade, PoE wiki, Craft of Exile, PoEDB, Path of Building and **About**. `js/site.js` measures its height so it never covers the bottom of a page. On small screens its links form two rows.
- `about.html` introduces MistDory using first-party channel/video sources, linked beside the topics and in the Sources section. Edit its text directly to refine the introduction. Its additional styles are in `css/about.css`.
- English display headings and branding use **Oxanium SemiBold (600)**, with Cinzel as the fallback. Vietnamese interface headings use **Barlow** for consistent accented lettering; branding retains its display font. All six Google Fonts families used by the site/comparison page are self-hosted as 28 official WOFF2 files, with OFL licenses, source URLs and hashes in [font sources](assets/fonts/SOURCES.md). Visiting the site no longer requires Google Fonts CDN access. Niagara comparisons still use device-installed fonts only.
- Featured YouTube embeds send the site's actual origin and an explicit referrer policy. A Watch on YouTube link below the player offers direct access if the current browser/preview cannot play it. Browser codecs and preview restrictions remain outside the site's control.
- A shared URL policy rejects dangerous link protocols and unsafe image paths at rendering/opening boundaries and during offline validation. Discord tabs explicitly use `noopener,noreferrer`. All four HTML pages have an early CSP meta tag allowing local scripts/fonts, the two YouTube thumbnail hosts and the YouTube embed host. Controls use external JavaScript listeners. Failed thumbnails fall back to their YouTube image and then a bundled SVG.

For interactive development, use `node scripts/preview-live.cjs`: it adapts the installed Live Server to the site's CSP while keeping reload code out of published HTML. Both homepage and About must be served over HTTP. The website itself has no package installation or build step.

Before each release, run the public-only YouTube refresh and offline release check from this folder:

```powershell
.\scripts\prepare-release.ps1
```

The script uses Node.js or the VS Code runtime, verifies both playlists and auxiliary video links, and updates both catalogs only after a complete successful audit. It does not publish or run on visitor devices. The timestamp shown below the video filters is the actual last successful data check in UTC+7, not the current page-load time. See [the refresh instructions](scripts/README.md) for dry-run, execution-policy and verification details.

## Folder Structure

```
mistdory_public_v0.0.1/
├── assets/
│   ├── fonts/             ← Official WOFF2 files, six OFL licenses, manifest and sources
│   └── images/            ← Local thumbnail fallback SVG
├── css/
│   ├── fonts.css          ← Same-origin font-face declarations
│   └── style.css          ← Shared site styles
├── data/
│   ├── poe1.json          ← PoE 1 content (edit this to add your content)
│   └── poe2.json          ← PoE 2 content (edit this to add your content)
├── js/
│   ├── i18n.js            ← Language preference, shared translations and DOM updates
│   ├── page-translations.js ← About and typography-preview translations
│   ├── main.js            ← Home/archive rendering, catalog translations and view state
│   ├── site.js            ← Language switch, build picker, game preference, dock sizing
│   ├── font-preview.js    ← Live typography-preview controls
│   ├── url-policy.js      ← Shared browser/Node URL boundaries
│   └── catalog-utils.js   ← Search, sorting and pagination
├── scripts/              ← CSP-compatible Live Server launcher and release workflow
├── tests/                ← Offline, security, resource and browser checks
├── .gitignore
├── README.md
├── HANDOFF.md            ← Quick resume pack and next-session briefing
├── PROJECT_MAP.md        ← Architecture overview and feature navigation
├── STATUS.md             ← v5.4 implementation and verification status
├── SECURITY_REVIEW.md    ← Hardening status, evidence and hosting limits
├── index.html             ← Main page (six-video preview)
├── videos.html            ← Video archive (maximum ten per page)
├── about.html             ← Creator profile and sources
└── font-preview.html      ← Bilingual typography comparison
```

## Maintaining the translations

Technical documentation, project notes and commit messages use English. The bilingual product interface is an intentional exception: visitor-facing copy supports English and Vietnamese.

Retain the English terms Builds/build and Crafting in Vietnamese interface copy. The build picker title is "Chọn build theo game" in Vietnamese, and its choices are "PoE 1 Builds" and "PoE 2 Builds" in both languages.

Use `data-i18n` on text-only elements and the matching `data-i18n-aria-label`, `data-i18n-placeholder` or `data-i18n-content` attributes for translated attributes. Keep nested links, icons and brand markup outside translated text nodes. Shared copy lives in `js/i18n.js`, About/typography copy in `js/page-translations.js`, and dynamic catalog messages and guide labels in `js/main.js`. Register new curated copy in the translation table so both languages remain complete. Keep original YouTube titles and game, skill, item and tool names intact.

## How to Add Your Content

Curated guide labels and links live in `data/poe1.json` and `data/poe2.json`. The WIP Projects panel is `guideRows.gc1`; the other three panels are `gc2` through `gc4`. Refresh preserves all four curated groups, including WIP Projects, rather than filling a guide panel with the video catalog. YouTube links in any group are still checked against the public-only policy. Video cards are generated from the approved YouTube playlists by the refresh script; use that workflow instead of entering card objects by hand.

### YouTube playlist catalog

The playlists were first imported on 2026-10-26 and successfully refreshed on 2026-10-28. Current public counts are:

| Homepage tab | Source playlist | Verified public videos |
| --- | --- | ---: |
| PoE 1 | [POE](https://www.youtube.com/playlist?list=PLlj4MOKpBOsb-ZAzTmHLpCap5m_mnMeht) | 34 |
| PoE 2 | [PoE2](https://www.youtube.com/playlist?list=PLlj4MOKpBOsZ38hhrZ1vGERMbzF3TaZYx) | 56 |

All retained videos belong to `@mistdory`. Public eligibility requires a signed-out YouTube watch response with explicit `isUnlisted: false`, `isPrivate: false`, playability `OK`, and matching channel/video IDs. Being playable or appearing in a public playlist is insufficient. Private, unlisted, unavailable, and unverified videos are excluded from cards, guide links, and featured videos. The six additional PoE 1 Shorts linked under Miscellaneous also passed this visibility check.

Each JSON file records its playlist/import time and latest visibility audit in `source`; individual video entries record `privacyStatus` and `privacyVerifiedAt`. Cards use YouTube video IDs and retain playlist order. The featured video uses the selected verified public card, falling back to the first retained public playlist entry. The separate livestream playlist is outside this catalog.

Publishing a YouTube upload alone does not change this static website. To import new videos automatically:

1. Add each upload to the correct **POE** or **PoE2** playlist linked above and make it public.
2. From this version's directory, run `scripts/prepare-release.ps1`. It discovers new playlist entries, verifies public visibility, updates metadata and generates the cards without manual JSON entry.
3. Review the changed files and preview, then publish the updated version through the normal release process.

Browser refresh fetches the latest JSON already published by the site, not a fresh YouTube audit. Live synchronization would require a configured YouTube Data API integration or a separate scheduled publishing job; neither is enabled in this version. See [the refresh workflow](scripts/README.md).

The homepage shows verified video totals; unverified build/crafting totals are omitted. Most viewed and Latest sorting are available only when every card has the corresponding numeric view count or full publication date. Relative video ages are not converted into publication dates.

### Add a YouTube video to the hero

After a successful refresh, choose an existing public card in the matching game's `cards` array and copy its string `id` into `meta.ytId`. The featured video must already be present in that public catalog. Refresh preserves a valid selection and falls back to the first retained public playlist entry when the selected video is removed.

### Add your Discord links

Find `"mainDiscordUrl"` and `"cowbDiscordUrl"` and replace the placeholder with your actual Discord invite URL:
```json
"mainDiscordUrl": "https://discord.gg/your-invite-code"
```

### Customize an imported card

For an existing verified card, you may edit its description, tags, version label, image and type (`BUILD`, `CRAFTING` or `VIDEO`). Refresh preserves these curated fields. Leave its video ID, URL, publication date, view count and verification metadata to the importer; generated IDs are YouTube ID strings, not numeric counters.

### Add a thumbnail image

Create `images/thumbnails/` if needed, place a `.jpg` or `.png` there and set `"image": "images/thumbnails/yourfile.jpg"` on an imported card.

Local relative asset paths must stay inside this version. The production CSP permits local images and `https://img.youtube.com` / `https://i.ytimg.com`; using another remote image provider requires a reviewed policy change. Invalid or unavailable image sources use the thumbnail fallback chain without changing the video's destination.

## How to Run Locally

Because the site fetches JSON files, you need a simple local server (browsers block file fetching by default).

Do not double-click `index.html` to preview Home or All videos. An address starting with `file://` prevents JSON loading; refreshing or pressing Try again keeps the same restriction. Open the HTTP preview address below in your normal browser instead. Keep the local server running while reviewing the site.

**Interactive development — Live Server adapter:**
```bash
cd mistdory_public_v0.0.1
node scripts/preview-live.cjs
```
The launcher finds an installed `live-server` module or the existing VS Code Live Server extension. `MISTDORY_LIVE_SERVER_MODULE` can select an existing module path. It binds to `127.0.0.1`, injects an external local reload client into preview responses and adds only that local WebSocket to the response's CSP. Published HTML remains unchanged. Do not use the extension's ordinary **Open with Live Server** command: its default inline injection is blocked by the production policy.

Open `http://127.0.0.1:8003/`; use `?lang=vi` for Vietnamese. `PORT` selects another port. Keep the process running while reviewing. On the current Windows machine, Node is absent from PATH; the existing VS Code runtime can run the same launcher:

```powershell
$previewScript = (Resolve-Path .\scripts\preview-live.cjs).Path
$previewRuntime = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
$env:ELECTRON_RUN_AS_NODE = '1'
Push-Location ([IO.Path]::GetTempPath())
try { & $previewRuntime $previewScript } finally { Pop-Location }
```

**Production-policy testing — plain local server:**
```bash
cd mistdory_public_v0.0.1
node tests/local-preview.cjs
```
This serves the unchanged production CSP without reload injection. If interactive preview occupies port 8003, use a separate terminal with `PORT=8004` and point browser tests at `http://127.0.0.1:8004`. This setting does not publish the site.

## Verification

With Node.js available, run the existing offline checks from `mistdory_public_v0.0.1`:

```text
node --test tests/catalog-utils.test.cjs tests/catalog-loading.test.cjs tests/url-policy.test.cjs tests/live-preview.test.cjs
node scripts/self-test.cjs
node scripts/verify-catalog.cjs
```

Start the plain preview, then run the browser suites. Set `MISTDORY_QA_URL` to its origin; `security-browser-review.cjs` defaults to port 8004 while the other browser runners default to port 8003.

```text
node tests/language-browser-review.cjs
node tests/qc-browser-review.cjs
node tests/security-browser-review.cjs
```

Set `MISTDORY_QA_NETWORK=1` for the security review to fetch and decode all catalog thumbnails with bounded concurrency. The default security run isolates third-party requests and tests URL rejection, CSP, local font loading and image fallback. Use the plain helper for these production-policy checks; the Live Server adapter has a deliberately different development response and its own offline tests.

Browser reviews use a locally installed Chrome and disposable profiles. General interface suites do not prove media playback. Use `tests/featured-video-diagnostic.cjs` for actual featured-video playback, which requires outbound YouTube access. See [STATUS.md](STATUS.md) for completed results and explicitly pending runtime checks.

With the interactive launcher running, verify real watcher/WebSocket reload using `node tests/live-reload-browser-review.cjs`. Set `MISTDORY_QA_URL=http://127.0.0.1:8003/` for the default launcher port; this runner otherwise defaults to port 8005. It exclusively creates and removes its own temporary probe files, without rewriting application files.

## How to Publish This Version

Publish the contents of `mistdory_public_v0.0.1/` as the site artifact, preserving the relative HTML, CSS, JavaScript and data paths. When serving this repository directly, the version's entry point is `mistdory_public_v0.0.1/index.html`; the repository root may contain an older website.

GitHub Pages serves the HTML, JavaScript, CSS, JSON, fonts and image assets. It does not run Node or Live Server; the development launcher is only for the maintainer's computer. The published HTML contains the production CSP and no injected reload script/WebSocket permission. No hosting or publishing settings have been changed by these local hardening edits.

For GitHub Pages, configure the publishing branch/folder or build artifact to contain this version's site files. Selecting `main` and `/ (root)` does not automatically select the nested `mistdory_public_v0.0.1` application. Confirm the published homepage is the intended version after deployment. These instructions do not change hosting configuration or publish the site.

## Customisation Tips

| What to change | Where |
|---|---|
| Site name | `index.html` — change "MistDory" text |
| Nav links | `index.html` — edit the `<ul class="nav-links">` section |
| Guide row titles & links | `data/poe1.json` and `data/poe2.json` under `"guideRows"`; add matching translations in `js/main.js` |
| Interface languages | `js/i18n.js`, `js/page-translations.js` and translated dynamic messages in `js/main.js` |
| Colors | `css/style.css` — edit the `:root` variables at the top |
| Fonts | `css/fonts.css` and `assets/fonts/` — preserve licenses and update the source/hash manifest when replacing official files |
| URL safety and resource policy | `js/url-policy.js`, the CSP meta tag in all four HTML pages, and the security review |
