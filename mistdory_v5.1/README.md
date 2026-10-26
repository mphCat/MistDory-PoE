# MistDory — Path of Exile Content Hub

A personal Path of Exile content hub featuring builds, crafting guides, and featured videos — with a live PoE 1 / PoE 2 realm switcher.

## Folder Structure

```
mistdory/
├── css/
│   └── style.css          ← All site styles
├── data/
│   ├── poe1.json          ← PoE 1 content (edit this to add your content)
│   └── poe2.json          ← PoE 2 content (edit this to add your content)
├── images/
│   └── thumbnails/        ← Drop card thumbnail images here
├── js/
│   └── main.js            ← Site logic (realm switch, cards, filters)
├── .gitignore
├── README.md
└── index.html             ← Main page
```

## How to Add Your Content

All content lives in `data/poe1.json` and `data/poe2.json`. Open either file in any text editor and update the fields. No coding required.

### YouTube playlist catalog

The homepage contains a playlist snapshot imported on 2026-10-26, with each video's visibility checked individually on 2026-10-26:

| Homepage tab | Source playlist | Verified public videos | Unlisted videos removed | Private videos removed |
| --- | --- | ---: | ---: | ---: |
| PoE 1 | [POE](https://www.youtube.com/playlist?list=PLlj4MOKpBOsb-ZAzTmHLpCap5m_mnMeht) | 34 | 0 | 23 |
| PoE 2 | [PoE2](https://www.youtube.com/playlist?list=PLlj4MOKpBOsZ38hhrZ1vGERMbzF3TaZYx) | 56 | 1 | 1 |

All retained videos belong to `@mistdory`. Public eligibility requires a signed-out YouTube watch response with explicit `isUnlisted: false`, `isPrivate: false`, playability `OK`, and matching channel/video IDs. Being playable or appearing in a public playlist is insufficient. Private, unlisted, unavailable, and unverified videos are excluded from cards, guide links, and featured videos. The six additional PoE 1 Shorts linked under Miscellaneous also passed this visibility check.

Each JSON file records its playlist/import time and latest visibility audit in `source`; individual video entries record `privacyStatus` and `privacyVerifiedAt`. Cards use YouTube video IDs and retain playlist order. The featured video is the first retained public video in that realm's playlist. The separate livestream playlist is outside this catalog.

This is a static snapshot: new uploads, playlist changes, and later visibility changes do not update the JSON automatically. Recheck each video's visibility before refreshing the catalog. The homepage shows verified video totals; unverified build/crafting totals are omitted. Most Viewed and Newest sorting are available only when every card has the corresponding numeric view count or full publication date. Abbreviated view counts are preserved as text, and relative video ages are not converted into publication dates.

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

**Option 1 — VS Code:**  
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
