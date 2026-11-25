# MistDorySite Development - operating guide

Updated: 2026-11-25 (Asia/Saigon).

## Entry point

Use the working Codex sidebar in the MistDory repository. Project agent definitions live in `.codex/agents/`. They inherit the current session's model and permissions; no model, credential or global configuration override is installed.

Start a fresh Codex conversation after adding definitions so discovery can occur. Ask the parent chat to act as Coordinator and read `.codex/agents/mist_coordinator.toml`, this guide and `TASKS.md`. A named agent picker or direct agent-session shortcut is not assumed.

Example startup prompt:

```text
Act as Mist Coordinator. Read AGENTS.md, .codex/agents/mist_coordinator.toml,
agent-team/WORKFLOW.md, agent-team/TASKS.md and agent-team/HANDOFF.md.
Check Git status and resume the next authorized task. Delegate implementation
to Mist Builder and independent review to Mist Reviewer using their project
definitions. Preserve unrelated changes. Report evidence and remaining work.
```

For direct role work, start another conversation and ask it to read the relevant TOML definition, root AGENTS.md, this guide and the specific task record. This explicitly supplies role instructions; it does not prove automatic named-profile discovery.

## Task cycle

1. Coordinator records the request, allowed paths, baseline HEAD and initial dirty paths, acceptance criteria, authorization, next owner and status in `TASKS.md`.
2. Builder works only on assigned paths. Capture a scoped diff or equivalent before/after evidence when the baseline is already dirty; HEAD alone cannot identify the task's changes.
3. Freeze affected files during review. Reviewer checks original requirements and the identified diff independently, returning findings and test limits without editing product files.
4. Builder fixes findings; Reviewer rechecks changed behavior. Coordinator records unresolved issues and actual delivery state.
5. Before stopping, save the next action and owner. Future sessions resume from files; prior agent processes and chat context are not durable task storage.

Use these status labels: `planned`, `in_progress`, `ready_for_review`, `changes_requested`, `reviewed`, `blocked`, `done`. Record delivery separately: local, committed SHA, pushed SHA, deployed SHA and live verification evidence. A blocked task needs the exact missing input or external condition.

Each handoff includes task ID, requirements, baseline and changed paths, evidence/commands/results, findings, untested scope, next action and owner. Never copy secrets into task records or logs.

## Operating limits

Coordinator owns records; Builder owns implementation; Reviewer owns findings. Reviewer read-only restrictions are behavioral, not an enforced independent sandbox. Parent-session permissions still apply to all agents.

Definitions are persistent instructions, not continuously running processes. No schedule, unattended runner, notification destination or publishing authorization is configured. Local unattended operation still requires a separately tested runner, machine availability, authentication and explicit scheduling/delivery decisions.

## Verification and compatibility

Three project TOML profiles have been prepared from the documented custom-agent schema. On 2026-11-25, the live `collaboration.spawn_agent` schema exposed `mist_coordinator`, `mist_builder` and `mist_reviewer` as supported `agent_type` values with matching descriptions. TEAM-004 then verified actual named Builder implementation, independent named Reviewer verification, returned results and continuations for fixes/rechecks. The parent adopted Coordinator instructions directly; no spawned Coordinator child was tested. No generic fallback was required. This is a verified manual operating cycle, not a background runner or standing release authorization.

On the first bounded user-authorized task, record whether named profiles load, whether fallback instructions are needed, whether results return and whether continuation works. Do not mark the team operational until Builder-to-Reviewer handoff succeeds on actual work.

Reference: [Codex subagents and custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents).
