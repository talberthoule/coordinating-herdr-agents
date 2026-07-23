# Agent Guidance

This file mirrors the Stacking Work Across Lanes, Merge Train Coordination, and Coordination Transport Reliability workflows from [skills/coordinating-herdr-agents/SKILL.md](skills/coordinating-herdr-agents/SKILL.md) so they are visible to any agent working in this repository. Keep AGENTS.md, CLAUDE.md, and SKILL.md in sync when editing them.

## Stacking Work Across Lanes

When one effort fans out into multiple lanes, stack git state, not processes. A lane is a branch plus a tracker issue, not a running pane: at any moment only a pane or two should be executing, while every other lane exists as a committed branch any agent can resume.

1. Commit every checkpoint on the lane's own branch. An uncommitted worktree can be resumed only by re-entering that exact worktree; a committed branch can be rebased, stacked on, reviewed, or deleted from anywhere.
2. Keep stacks shallow: review and merge the foundation branch early, then base new lanes on the default branch. Branch B off feature branch A only when B genuinely needs A's code before A can merge.
3. Independent work always branches from the default branch, never from a sibling feature branch, so an abandoned direction costs exactly one branch. When a base moves, restack dependents with `git rebase --update-refs`.
4. A lane gets a running process — dev server, compose stack, benchmark container — only while actively needed. Pause a lane by committing and stopping its processes; a dormant worktree costs nothing. Keep runtime/integration testing centralized in the one checkout the toolchain binds.
5. Record stack order and merge sequence in the shared tracker (for example Linear blocked-by relations), never only in pane scrollback, so the merge plan survives context loss on every pane.
6. Decide direction with a cheap plan or spec artifact before fanning out implementation lanes; fanning out first and choosing direction second is the most expensive way to learn the direction was wrong.

## Merge Train Coordination

When multiple lanes converge on one default branch, run the merge as a train with a single integrator:

1. One integrator pane owns default-branch merges, the tracker status table, and branch-name assignment. Lanes never touch the default branch or remotes, nothing is marked Done before independent review plus merge plus gates, and the integrator corrects premature Done.
2. Run a standing read-only review lane with a strict queue in which reviews preempt the reviewer's own implementation lane. In the verdict loop, BLOCK sends fixes to the owning lane on the same frozen branch and the new sha is re-reviewed. A reviewer never reviews its own branch — the integrator covers that.
3. After every merge, re-run all gates and broadcast the moved default branch with its new sha to in-flight lanes so they rebase or branch from the current tip.
4. When the user delegates pane confirmations, ration them: approve autonomously anything in-lane — a design consistent with the tracked issue, read-only inspection, test runs, commits on the lane's own branch, tracker updates. Always escalate remote pushes, default-branch mutations, data deletion, credentials or secrets, visibility changes, and scope expansion.
5. Independent review is load-bearing, not ceremony: in one nine-lane train, 4 of 5 first-round reviews returned real blockers that lane-local green tests missed — zero-based test clocks versus production monotonic time, mocked lifecycles hiding races, best-effort rollback, and false-success reporting.

## Coordination Transport Reliability

A send is keystrokes typed into the target composer plus a delayed Enter, so delivery races the target pane's input state. The race is lost most often when the target is busy — mid-turn, clearing its conversation, or sitting in an unfocused workspace. Field-tested rules:

1. The wrapper types the `message` field verbatim. Never put a placeholder there; `args` must mirror `message` exactly.
2. Keep sends compact — well under 1000 characters including the source prefix. A long send that loses the composer race arrives with its first 1024 characters dropped, cut mid-word with the source prefix gone, and a short send that loses the same race can vanish outright. Put details in the shared tracker and reference issue or comment IDs instead of inlining them.
3. Number multi-point sends (part 1/2, part 2/2) so truncation is detectable. On receiving a truncated part, recover the full text from the sender's session log before acting, and say so in the ACK.
4. The typed Enter can be swallowed by the target pane's TUI state (a modal or paused prompt), leaving the message stuck in the composer. After every send, verify within about 20 seconds that the target flips to working or shows the text processing; if not, re-send — the fresh Enter submits the stuck composer. Sweep panes for stuck composers on each coordination wake.
5. Pane read is ground truth; ACKs arrive out of order and go stale. When correcting a mis-assignment, make the corrective message the last word in every affected queue, then verify convergence by pane read, not ACK.
6. Verify claimed branches and commits in git before acting on any branch-ready claim.
7. Do not reply to ACKs of ACKs.
8. Inbound sends stomp any in-progress typing in the target composer, including the user's, so suppress unsolicited routine chatter toward user-facing coordinator panes — lanes volunteer only substantive events (branch- or patch-ready with sha, verdicts, blockers, decision questions). A message explicitly marked ACK-requested still requires a compact ACK: silence cannot prove delivery, because a stuck composer is indistinguishable from understood. The sender owns delivery recovery — wait about 20 seconds, then pane read, then resend — so a human pressing Enter is never the fallback. Broadcast protocol changes with an explicit do-not-acknowledge marker so the change itself does not trigger an ACK storm.
