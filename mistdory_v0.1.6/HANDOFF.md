# MistDory v0.1.6 - release resume pack

Updated: 2026-11-25 (Asia/Saigon). Active source: `mistdory_v0.1.6/`.

## Resume after a crash

Read root AGENTS.md, this file, then agent-team/HANDOFF.md and TASKS.md. Inspect Git status and fetch before reporting remote delivery. Prior agents and temporary evidence paths may no longer exist; persisted records and committed source are the durable state.

This release gathers the recovered working session: refreshed public catalogs (42 PoE 1 / 56 PoE 2), separate Shorts filtering (3 Shorts per game), source-derived Guides, dedicated Crafting placeholders, five-section sticky guide navigation and CWS parent/child build routes. Original titles and source data are preserved. v0.1.5 remains an untouched local recovery source; unrelated root deletions, archives and legacy folders remain outside the release commit.

## Team and ownership

Team: MistDorySite Development. Coordinator owns scope, task register, handoffs and delivery; Builder owns assigned implementation; independent Reviewer checks frozen changes and returns findings. Profiles: `.codex/agents/`; operating instructions: agent-team/WORKFLOW.md. Named Builder/Reviewer implementation and fix/recheck cycles were verified in TEAM-004/005. A new session must start new agents; old agent IDs are historical evidence. No recurring runner, schedule or notification channel exists.

TEAM-006 authorizes this release, commit and push. Earlier local-only restrictions in TEAM-004/005 describe those tasks at the time; they do not override this release authorization. No standing permission for future unrelated publishing is implied.

## Verification and delivery

TEAM-004/005 were independently reviewed before the crash. TEAM-005 recorded 55/55 scoped tests, 91/91 Chrome assertions and 9/9 additional history/dock checks. Release migration passed 79/79 offline tests, stored catalog validation, refresh self-test and six-page runtime packaging. On this Windows sandbox, tests used Code.exe --test --test-isolation=none after default process isolation returned EPERM. Independent migration review is recorded in TEAM-006. Read its latest delivery entry for commit/push/deployment evidence; do not infer deployment from a successful commit or push.

The full language browser suite previously returned 86/89 with three baseline Shorts expectation mismatches, reproduced on the baseline. A complete green browser suite is not claimed. Game mechanics, external planner/trade behavior, YouTube playback, farm economics and broad accessibility/performance remain outside verified scope.

GitHub Pages workflow targets v0.1.6, runs offline tests and catalog validation, then packages six HTML pages and runtime assets only. Counter Worker/D1 endpoint and cumulative total remain shared and unchanged. Never reset the count. Node is absent from PATH on this machine; use the installed VS Code Code.exe with ELECTRON_RUN_AS_NODE=1 as documented in PROJECT_MAP.md.

## Next owner and work

1. Coordinator: verify the release push and Pages workflow result; report the actual deployed SHA separately. Check current remote state, not an old tracking ref.
2. Coordinator: confirm whether local preview port8003 survived the crash and what source it serves before reusing it. Old preview was rooted in v0.1.5; release source is v0.1.6. Do not assume old PIDs remain valid or stop unrelated processes.
3. Owner supplies Crafting walkthrough videos, avatar/WIP details and PoE 2 roadmap. Keep placeholders until supplied.
4. Confirm the Cloudflare hourly cleanup trigger `0 * * * *`; counting works without confirmation, expired hash cleanup remains unconfirmed.
5. A future bounded task may reconcile the three Shorts browser expectations; preserve honest baseline reporting meanwhile.
6. Scheduling/automation requires a separately authorized tested runner and agreed schedule/report destination. Definitions alone do not execute daily.

Use PROJECT_MAP.md for targeted navigation, STATUS.md for detailed prior work and CHANGELOG.md for history. Prior session detail remains in ../mistdory_v0.1.5/HANDOFF.md and agent-team/TASKS.md; historical statements there are not current delivery status.
