---
name: coordinating-herdr-agents
description: Use when a user references Herdr spaces, workspaces, tabs, panes, agents, paused work, handoffs, or duplicate effort; or when unexplained Git state suggests parallel work, such as an unexpected branch or HEAD, unfamiliar dirty files, files changing during inspection, a shared worktree, or another active tool or agent.
---

# Coordinating Herdr Agents

## Overview

Treat Herdr as shared working context. Inspect relevant tabs before searching elsewhere or repeating work; coordinate proactively when an existing agent can prevent duplication or unblock a handoff.

## Suspected Parallel Work

Run a silent Herdr check when at least one concrete signal suggests another writer: an unexpected branch or `HEAD`, unfamiliar changes that may overlap the task, a file changing during inspection, or explicit evidence of another active tool, agent, or shared worktree. A dirty tree by itself, expected user edits, and unrelated generated files are not enough.

1. Snapshot Herdr and narrow candidates to panes whose cwd or worktree belongs to the same repository.
2. Read likely owners' actual plans before inferring overlap from tab labels or filenames.
3. If no same-repository ownership or task overlap appears, continue silently without messaging.
4. If target-file overlap is confirmed or ownership remains unclear, coordinate before editing or mutating Git state.

## Workflow

1. Run `herdr api snapshot` immediately.
2. Identify relevant workspace, tab, pane, and agent IDs from labels and status.
3. Read likely panes with `herdr pane read <pane-id> --source recent-unwrapped`. Read more than one when ownership is unclear.
4. Continue the work locally when no handoff is needed — but if the repo's working tree is shared, first confirm you may hold it (see Shared Git Working Trees).
5. Send a proactive message when an existing relevant agent owns paused work, has context worth preserving, or should avoid duplicating current work.

Read-only inspection is silent: it creates no audit entry and opens no viewer.

## Shared Git Working Trees

Agents in the same repo usually share ONE git working tree. Git state is therefore a coordination surface, not private scratch space:

- `HEAD` can move mid-session — a branch you did not create can appear between two of your own tool calls.
- `git status` can show another agent's uncommitted edits.
- Any `checkout`, `checkout -b`, `merge`, or `stash` sweeps their in-flight work onto your branch.

Before your first git mutation or file edit, snapshot, then read `git branch --show-current` and `git status --short`. If another agent holds the tree, either **take an isolated worktree** (`git worktree add <path outside the repo> -b <branch> main`) or **take a lane that never touches the tree** (review, docs, issue-tracker hygiene).

Two corollaries that are easy to get wrong:

- **Never park on `main` in a worktree.** Git forbids the same branch in two worktrees, so holding `main` silently blocks the tree-holder's `git checkout main; git merge --ff-only <branch>` at merge time. You break the merge step for everyone else without touching a file.
- **Review needs no checkout.** `git diff main...<branch>`, `git show <rev>:<path>`, and `git log` fully review a pushed branch read-only — which is exactly what makes a reviewer lane safe to run alongside a coding agent.

Also check whether the project's containers/toolchain bind the *main* checkout; if they do, a worktree cannot run the stack, and it suits docs/review/analysis rather than code that needs integration testing.

## Overlapping Loops

Long-running loops are the main source of duplicated effort, and **labels lie** — two differently-named loops can be near-identical in scope. Read the other agent's pane for its *plan or todo list*, not just the files it has touched. If its plan already covers your task, do not race it: stand down to a non-conflicting lane and say so, recording the split in the shared tracker (Linear/Jira/etc.) so it survives context loss on both sides.

## Mutation Boundary

Proactive coordination may only request `herdr agent send` for an existing agent. The audited wrapper prefixes the source tab/pane, types the message, and sends Enter after a short delay, so report it as sent; a later status read is still required before claiming the agent resumed. Do not proactively start agents, run other pane commands, focus UI, close panes, rename items, or alter layout.

A direct user request may authorize broader Herdr actions. Mark those `user-directed`; they remain audited but do not auto-open the viewer.

Every mutation must use the audited wrapper. Read [references/command-policy.md](references/command-policy.md) before the first mutation in a turn. Raw Herdr mutations are denied by the profile hook.

## Example

After snapshot and pane-read show that `w2:p1` owns a paused installer build, run a single PowerShell command containing literal JSON:

```powershell
@'
{"origin":"proactive","action":"herdr.exec","args":["agent","send","w2:p1","Resume the official installer build and report blockers here."],"target":{"type":"agent","id":"w2:p1"},"reason":"Continue paused work without duplicating it","message":"Resume the official installer build and report blockers here."}
'@ | node "$HOME\.codex\skills\coordinating-herdr-agents\scripts\coordinate.mjs" --stdin
```

On Linux, use the same literal JSON through a quoted heredoc:

```sh
node "$HOME/.codex/skills/coordinating-herdr-agents/scripts/coordinate.mjs" --stdin <<'JSON'
{"origin":"proactive","action":"herdr.exec","args":["agent","send","w2:p1","Resume the official installer build and report blockers here."],"target":{"type":"agent","id":"w2:p1"},"reason":"Continue paused work without duplicating it","message":"Resume the official installer build and report blockers here."}
JSON
```

The hook records attempted and outcome events, redacts obvious secrets, and opens the loopback audit viewer for proactive sends. Use **Viewed & close** to acknowledge; closing the tab alone leaves entries unseen.

## Quick Reference

| Need | Action |
|---|---|
| Discover other work | `herdr api snapshot` |
| Suspect parallel code changes | Match same-repo panes, read likely owners, message only for overlap |
| Recover pane context | `herdr pane read <id> --source recent-unwrapped` |
| Coordinate ownership | Audited `agent send` wrapper |
| Perform user-requested mutation | Audited wrapper with `origin: user-directed` |
| Inspect audit | Viewer opens automatically after proactive send |

## Common Mistakes

- Do not say another Herdr tab is inaccessible. Snapshot and read it.
- Do not search the repository, GitHub, or the web for paused Herdr work before inspecting Herdr.
- Do not repeat work merely because another agent is idle; read its pane and stage a handoff when relevant.
- Do not claim a submitted prompt started an agent turn until a later status read shows the agent working.
- Do not place credentials in coordination messages. The wrapper blocks obvious secrets.
- Do not `checkout`, `checkout -b`, `merge`, or `stash` in a shared working tree before confirming who holds it — you will sweep another agent's uncommitted work onto your branch.
- Do not park on `main` in a worktree. It blocks the tree-holder's merge, and nothing tells you that you did it.
- Do not rely on a submitted `agent send` to stop an imminent collision. It is a queued message, not an interrupt. Escalate time-critical conflicts to the user.
- Do not judge overlap by tab label. Read the other agent's plan; near-identical work often hides behind different names.
- Do not treat a dirty worktree alone as proof of parallel work.
