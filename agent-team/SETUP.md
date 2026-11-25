# MistDorySite Development - setup design

Team name: **MistDorySite Development**. Role identifiers remain `mist_coordinator`, `mist_builder` and `mist_reviewer`.

Updated: 2026-11-25 (Asia/Saigon). Status: three project-local profiles discovered; named Builder/Reviewer manual implementation-review-fix-recheck cycle verified in TEAM-004. Parent Coordinator acts through explicit user/role instructions; no background automation is enabled. Older pending statements below describe earlier investigation stages; TASKS and HANDOFF contain current evidence.

## Scope and agreed direction

- Run on this Windows machine first, in `D:\MINH\github\mistdory site`.
- Website implementation remains in `mistdory_v0.1.6/`. This directory contains internal team setup documentation, not website content.
- Follow root `AGENTS.md`: communicate with the user in Vietnamese; write technical notes and Git messages in English.
- The user wants to assess each role's scope, working methods and actual capability before enabling automation. No recurring work is enabled.
- Preferred team design: the user normally talks to Coordinator; Builder and Reviewer receive separate task contexts. Direct interaction with each role should also be possible if the selected runtime supports it.
- This is a desired architecture, not a verified capability of the installed VS Code integration. Separate chats alone do not establish automatic delegation or messaging.

## Roles

| Role | Responsibility | Initial operating boundary | Required output |
| --- | --- | --- | --- |
| Mist Builder | Implement requested code, bilingual UI, catalog and related script changes; update relevant documentation | Edit only task-related files, preserve unrelated work, run appropriate checks; no autonomous release actions | Change summary, affected files, validation evidence, limitations and review handoff |
| Mist Reviewer | Independently assess requirements, diff and behavior; check regressions and relevant security, privacy, licensing or compliance concerns | Read product source and run checks; initially do not fix product source; use authoritative sources when needed | Reproducible findings, locations, impact and priority, tested scope and untested areas |
| Mist Coordinator | Clarify outcome, divide work, track ownership and findings, route fixes and summarize evidence | Initially manage task records and status rather than product code; delegation depends on verified runtime tools | Task plan, acceptance criteria, open issues, next owner and accurate delivery state |

Reviewer findings are not security guarantees or legal certification. An absence of findings applies only to the checked scope.

## Working cycle

1. Coordinator records the request, baseline, scope and acceptance criteria.
2. Builder implements and validates a bounded change.
3. Reviewer checks the original requirements and a stable, identified diff independently.
4. Builder addresses findings; Reviewer rechecks as needed.
5. Coordinator reports evidence and outstanding decisions.

Only one role should edit a given product file at a time. All task handoffs should identify the relevant revision or working diff, checks performed, remaining issues and next owner. Do not assume separate sessions share conversation history.

Distinguish local implementation, tests passed, review completed, committed, pushed, deployed and live-verified states. Do not report a later state from evidence of an earlier one.

## Interaction options to verify

- One conversation switching roles: simple but weaker review independence.
- Three independent sessions: direct access to each role, but handoff is manual until orchestration is implemented.
- Coordinator with delegated agents: closest to the requested team, but verify creation, messaging, results and agent lifetime; child agents may not be directly openable as user-facing sessions.

Role instructions do not themselves enforce filesystem or tool permissions. Actual restrictions require runtime configuration.

## Initial evaluation and authorization

Use one bounded manual task to evaluate implementation, independent review and evidence-based coordination. Choose the task with the user after the runtime is working. Do not spawn agents solely to test this documentation.

No schedules, notification integrations, API keys, cloud runners or automatic commit/push/deploy permissions have been configured. The user subsequently authorized prioritizing persistent three-agent setup; project-local TOML definitions and operating records have been added. Future product changes and delivery actions require an applicable user request.

## Persistent setup

- Definitions: [Coordinator](../.codex/agents/mist_coordinator.toml), [Builder](../.codex/agents/mist_builder.toml), [Reviewer](../.codex/agents/mist_reviewer.toml).
- Startup, handoff protocol and compatibility limits: [WORKFLOW.md](WORKFLOW.md).
- Durable task state: [TASKS.md](TASKS.md).
- Keep the existing model and parent permissions. Reviewer read-only behavior is an instruction, not a dedicated sandbox.
- Use the working Codex sidebar. The separate VS Code Agents ChatGPT sign-in issue is unresolved and does not block preparing these project files.
- Named-profile loading and an actual implementation/review cycle must still be verified. No agent process or recurring runner has been started by this setup.

See [HANDOFF.md](HANDOFF.md) for current investigation evidence and restart steps.
