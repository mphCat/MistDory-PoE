# MistDory v5.2 — Path of Exile Content Hub

A personal Path of Exile content hub featuring builds, crafting guides, and featured videos — with a live PoE 1 / PoE 2 realm switcher.

## Version 5.2

- A centered 1180px content frame keeps the hero, guides and video archive aligned, with responsive side gutters.
- The homepage starts with six videos, sorted by **Latest**. **All videos** opens `videos.html`, with at most ten videos per page and shareable game/search/category/sort/page parameters. Search always checks the full catalog and tolerates spaces, punctuation, accents and keyword order (for example `Blood Mage` and `bloodmage`). Categories without public content are hidden automatically.
- The selected game is remembered in browser localStorage; an explicit `?game=poe1` or `?game=poe2` URL takes priority. This needs no additional server or account. Switching games resets search/category and pagination.
- **Builds** opens a shared PoE 1 / PoE 2 Build Sheet picker, with a separate PoE 2 Mobalytics link. **Document** now offers game-specific patch notes, news/official site and mechanics references. Guide actions use **Open** or **Watch**; unavailable actions show **Soon** on hover/focus and do not navigate.
- **Latest** uses real publication timestamps; **Most viewed** uses exact numeric YouTube view counts. Metrics are snapshots recorded on each card and in `source`, rather than live counters or playlist-rank estimates. Only verified public videos are shown.
- A fixed resource dock links to Awakened Trade, PoE wiki, Craft of Exile, PoEDB, Path of Building and **About**. `js/site.js` measures its height so it never covers the bottom of a page. On small screens its links form two rows.
- `about.html` introduces MistDory using first-party channel/video sources, linked beside the topics and in the Sources section. Edit its text directly to refine the introduction. Its additional styles are in `css/about.css`.
- Large headings, branding and guide-panel titles use **Oxanium SemiBold (600)** from Google Fonts, with responsive sizes adjusted for its wider shapes. Cinzel remains the fallback if the web font cannot load. Body text, controls, video titles and guide row labels keep their existing fonts. The separate comparison page retains Niagara and the other candidates for reference.

Open this version's folder in VS Code and use **Open with Live Server** on `index.html`. Both homepage and About must be served over HTTP. No package installation or build step is required.

Before each release, run the public-only YouTube refresh and offline release check from this folder:

```powershell
.\scripts\prepare-release.ps1
```

The script uses Node.js or the VS Code runtime, verifies both playlists and auxiliary video links, and updates both catalogs only after a complete successful audit. It does not publish or run on visitor devices. The timestamp shown below the video filters is the actual last successful data check in UTC+7, not the current page-load time. See [the refresh instructions](scripts/README.md) for dry-run, execution-policy and verification details.

## Folder Structure

```
mistdory_v5.2/
├── css/
│   └── style.css          ← All site styles
├── data/
│   ├── poe1.json          ← PoE 1 content (edit this to add your content)
│   └── poe2.json          ← PoE 2 content (edit this to add your content)
├── images/
│   └── thumbnails/        ← Drop card thumbnail images here
├── js/
│   ├── main.js            ← Shared Home/archive rendering and view state
│   ├── site.js            ← Build picker, game preference, dock sizing
│   └── catalog-utils.js   ← Search, sorting and pagination
├── scripts/              ← Pre-release YouTube refresh and verification
├── tests/                ← Catalog helper tests and desktop browser review
├── .gitignore
├── README.md
├── index.html             ← Main page (six-video preview)
├── videos.html            ← Video archive (maximum ten per page)
└── about.html             ← Creator profile and sources
```

## How to Add Your Content

All content lives in `data/poe1.json` and `data/poe2.json`. Open either file in any text editor and update the fields. No coding required.

### YouTube playlist catalog

The playlists were first imported on 2026-10-26 and successfully refreshed on 2026-10-28. Current public counts are:

| Homepage tab | Source playlist | Verified public videos |
| --- | --- | ---: |
| PoE 1 | [POE](https://www.youtube.com/playlist?list=PLlj4MOKpBOsb-ZAzTmHLpCap5m_mnMeht) | 34 |
| PoE 2 | [PoE2](https://www.youtube.com/playlist?list=PLlj4MOKpBOsZ38hhrZ1vGERMbzF3TaZYx) | 56 |

All retained videos belong to `@mistdory`. Public eligibility requires a signed-out YouTube watch response with explicit `isUnlisted: false`, `isPrivate: false`, playability `OK`, and matching channel/video IDs. Being playable or appearing in a public playlist is insufficient. Private, unlisted, unavailable, and unverified videos are excluded from cards, guide links, and featured videos. The six additional PoE 1 Shorts linked under Miscellaneous also passed this visibility check.

Each JSON file records its playlist/import time and latest visibility audit in `source`; individual video entries record `privacyStatus` and `privacyVerifiedAt`. Cards use YouTube video IDs and retain playlist order. The featured video is the first retained public video in that realm's playlist. The separate livestream playlist is outside this catalog.

This is a static snapshot: new uploads, playlist changes, and later visibility changes do not update the JSON automatically. Run `scripts/prepare-release.ps1` before each release; review current counts and timestamps in each JSON file's `source`. The homepage shows verified video totals; unverified build/crafting totals are omitted. Most viewed and Latest sorting are available only when every card has the corresponding numeric view count or full publication date. Relative video ages are not converted into publication dates.

### Add a YouTube video to the hero

In `data/poe1.json`, find `"ytId": ""` and paste your YouTube video ID inside the quotes.

Example — for `https://www.youtube.com/watch?v=dQw4w9WgXcQ`:
```json
"ytId": "dQw4w9WgXcQ"
```

### Add your Discord links

Find `"mainDiscordUrl"` and `"cowbDiscordUrl"` and replace the placeholder with your actual Discord invite URL:
```json
"mainDiscordUrl": "https://discord.gg/your-invite-code"
```

### Add or edit a card

Find the `"cards"` array and add or edit an entry:
```json
{
  "id": 7,
  "title": "Your Build Name",
  "type": "BUILD",
  "ver": "v3.25",
  "desc": "Short description of the build.",
  "tags": ["tag1", "tag2"],
  "image": "images/thumbnails/your-image.jpg",
  "url": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
}
```

**Type options:** `"BUILD"` · `"CRAFTING"` · `"VIDEO"`

### Add a thumbnail image

Drop any `.jpg` or `.png` into `images/thumbnails/` and set `"image": "images/thumbnails/yourfile.jpg"` in the JSON.

## How to Run Locally

Because the site fetches JSON files, you need a simple local server (browsers block file fetching by default).

**Option 1 — VS Code:**<br>
Install the **Live Server** extension, right-click `index.html` → Open with Live Server.

**Option 2 — Python (any OS):**
```bash
cd mistdory
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## How to Deploy on GitHub Pages

1. Create a new repository on GitHub (name it anything, e.g. `mistdory`)
2. Upload all files keeping the folder structure intact
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch and `/ (root)` folder
5. Click **Save** — your site will be live at `https://yourusername.github.io/mistdory/`

## Customisation Tips

| What to change | Where |
|---|---|
| Site name | `index.html` — change "MistDory" text |
| Nav links | `index.html` — edit the `<ul class="nav-links">` section |
| Guide row titles & links | `data/poe1.json` and `data/poe2.json` under `"guideRows"` |
| Colors | `css/style.css` — edit the `:root` variables at the top |
| Fonts | `css/style.css` — change the Google Fonts import URL |
