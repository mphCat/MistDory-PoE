# MistDory — Path of Exile Community Hub

A home for MistDory's Path of Exile content: videos, builds, guides and community resources for PoE 1 and PoE 2.

The website offers English and Vietnamese interfaces, separate game catalogs, searchable videos and curated links to useful tools. Original YouTube video titles are preserved in both languages.

## Purpose and experience

MistDory brings channel content and useful Path of Exile references together so viewers can find a video, choose a build or reach a guide without searching across multiple platforms.

- Switch between PoE 1 and PoE 2 content independently of the interface language.
- Watch featured videos and browse the video archive with search, category filters, sorting and pagination.
- Open game-specific build sheets, community tools and curated learning resources.
- Learn about MistDory and reach the creator's public community channels.

Some project and guide entries are marked **Soon** until their content is available.

## Current version

**[v5.4](../mistdory_v5.4/)** is the active website. Its agreed implementation and local verification are complete; GitHub Pages configuration and production verification remain pending.

Earlier version directories and legacy files at the repository root are retained as historical references. Start new website work in `mistdory_v5.4/`.

## Project information

- [Project briefing](../mistdory_v5.4/HANDOFF.md) — completed work, delivery status and next steps.
- [Current status](../mistdory_v5.4/STATUS.md) — verification and remaining content.
- [Version history](../mistdory_v5.4/CHANGELOG.md) — changes across releases.
- [Development guide](../mistdory_v5.4/README.md) — local preview and content maintenance.
- [Project map](../mistdory_v5.4/PROJECT_MAP.md) — architecture and feature locations.

## About this repository

This repository contains a static website built with HTML, CSS and JavaScript, with JSON video catalogs. The published website requires no application backend or build step. YouTube catalog updates use a separate local verification workflow before publication.

For developers, the active source is organized as follows:

| Location inside `mistdory_v5.4/` | Responsibility |
| --- | --- |
| `index.html`, `videos.html`, `about.html` | Home, video archive and creator introduction |
| `js/` | Catalog rendering, navigation, language state and URL validation |
| `css/`, `assets/` | Layout, self-hosted fonts and local image fallback |
| `data/` | Separate PoE 1 / PoE 2 catalog snapshots and curated resources |
| `scripts/` | Local preview and public-only YouTube catalog refresh workflow |
| `tests/` | Offline tests and browser verification runners |

Serve the active directory over HTTP for local preview; opening HTML directly with `file://` prevents catalog loading. Follow the [development guide](../mistdory_v5.4/README.md) for supported commands and the [project map](../mistdory_v5.4/PROJECT_MAP.md) before editing a feature.

The website has no login, visitor write API or automatic per-visit YouTube synchronization. Video data is a published snapshot, refreshed through the maintenance workflow. GitHub Pages is the intended production host; deployment status is tracked separately from source commits.
