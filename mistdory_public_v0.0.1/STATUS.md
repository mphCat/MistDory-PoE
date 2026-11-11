# MistDory public v0.0.1 — release preparation

Updated **2026-11-11**. Internal milestone: **v5.5**. Active directory: `mistdory_public_v0.0.1/`.

## Delivery

This is the first public-numbered source candidate, copied from the committed v5.4 League Start checkpoint. It has not been deployed. GitHub Pages remains the intended host; configuration, actual HTTPS URL, account/access review and production checks remain pending.

## Scope

- All v5.4 hub features, EN/VN interfaces, catalogs, URL validation, production CSP, self-hosted fonts and local preview support are retained.
- PoE 1 3.30 League Start opens Excalidraw; PoE 2 1.0 is Soon without a link. Both include a localized roadmap description and decorative diagram.
- PoE 1's fixed content timestamp is shown in GMT+7 and UTC. PoE 2 shows Last updated: — until content exists.
- Video data is unchanged: 34 + 56 videos from the 2026-10-28 snapshot. Release refresh remains outstanding.

## Verification

The v5.4 historical checks (61 offline, 191 desktop, 82 bilingual, 46 security/resource and 18 Live Server assertions) predate the roadmap addition. Do not describe them as newly run for this candidate. Consult the source history and current command results for fresh verification.

## Pending

See [HANDOFF.md](HANDOFF.md) for publication steps. Avatar, actual WIP projects, Soon guides, Crafting/FAQ and PoE 2 roadmap remain pending. Dedicated mobile/touch, complete accessibility/performance/SEO reviews and automated YouTube synchronization remain deferred.
## Fresh source-transition verification — 2026-11-11

- 61/61 offline tests passed using VS Code's Node runtime with `--test --test-isolation=none` (the sandbox blocked the normal child-process runner).
- Offline `scripts/verify-catalog.cjs` returned `valid: true` for 34/56 public videos. This did not refresh YouTube visibility.
- SHA-256 checks matched Home HTML, shared CSS, translations and both catalogs against the committed v5.4 checkpoint.
- Full browser suites were not rerun during the version-only transition. Production publication remains pending.