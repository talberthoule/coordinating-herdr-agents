# Dual-Plugin and Linux Distribution Design

## Goal

Make Herdr Agent Coordination a genuine two-command plugin install for Codex and Claude Code, while retaining simple native installers for Windows and Linux. Rewrite the README to lead with the coordination value and show useful workflows before implementation detail.

## Product promise

Multiple Codex and Claude Code sessions can share Herdr without guessing who owns work, duplicating a task, or losing the source of a handoff. The skill provides a conservative coordination protocol; local hooks require all Herdr mutations to pass through its audited wrapper.

Primary use cases:

- discover active and paused work before editing;
- resume the correct session instead of duplicating it;
- hand off work with visible source attribution;
- divide parallel feature, review, and investigation lanes;
- detect shared-worktree conflicts early;
- inspect a local audit trail of cross-agent actions.

## Distribution

The public repository becomes a marketplace for both hosts under the marketplace name `herdr`.

Codex:

```sh
codex plugin marketplace add talberthoule/coordinating-herdr-agents
codex plugin add coordinating-herdr-agents@herdr
```

Claude Code:

```sh
claude plugin marketplace add talberthoule/coordinating-herdr-agents
claude plugin install coordinating-herdr-agents@herdr
```

Both plugins contain the skill and hooks. Users still review and trust hooks through the host's normal security flow.

Standard CLI fallback:

- Windows: clone the repository and run `./install.ps1`.
- Linux: clone the repository and run `./install.sh`.
- Matching root-level uninstall scripts reverse only this project's hook and skill entries.

No package registry, daemon, dependency framework, or duplicated Codex/Claude runtime is introduced.

## Repository layout

Use the plugin layout shared by both hosts:

- `.codex-plugin/plugin.json`: Codex manifest;
- `.claude-plugin/plugin.json`: Claude manifest;
- `.agents/plugins/marketplace.json`: Codex marketplace;
- `.claude-plugin/marketplace.json`: Claude marketplace;
- `skills/coordinating-herdr-agents/`: the single skill, metadata, references, and Node runtime;
- `hooks/hooks.json`: Codex hook events;
- `hooks/claude.json`: Claude events, including `PostToolUseFailure`;
- root `install.*` and `uninstall.*`: manual fallbacks;
- root `tests/`: cross-platform behavior tests.

Existing skill/runtime files move into the canonical skill directory instead of being copied. Tests update their imports. This keeps standalone skill installation possible and prevents two implementations from drifting.

## Hook behavior

Plugin hooks invoke the same `hook.mjs` used by manual installs. The plugin command resolves the script through `CLAUDE_PLUGIN_ROOT`, which Codex exposes as a compatibility variable and Claude Code exposes natively.

`hook.mjs` keeps accepting an explicit runtime from the manual installer. When absent, it identifies Codex from `PLUGIN_ROOT`; otherwise it identifies Claude Code from `CLAUDE_PLUGIN_ROOT`.

Codex and Claude use separate declarative hook files only because their supported event sets differ. Both cover `PreToolUse` and `PostToolUse`; Claude retains `PostToolUseFailure`.

## Linux portability

The POSIX installer uses `/bin/sh`, standard utilities, symlinks, and the existing Node hook configurator. Node and Herdr are required. It configures whichever supported hosts are present and fails only when neither Codex nor Claude Code is installed. The Windows installer adopts the same behavior.

The audited command recognizer adds the literal POSIX heredoc form documented by the skill. PowerShell here-strings remain supported. One parser test proves each form is accepted and a raw Herdr mutation remains blocked.

State remains local to the user. Platform-specific browser auto-open behavior is optional; printing the audit URL is sufficient on Linux.

## README

The README order is:

1. concise problem and outcome;
2. two-command Codex and Claude installs;
3. one-minute first use;
4. concrete use cases;
5. how the audited safety boundary works;
6. standard Windows/Linux installation;
7. requirements, testing, troubleshooting, and uninstall.

Claims stay bounded: this is a coordination and guardrail layer over Herdr, not an autonomous orchestration framework.

## Verification

- run the existing Node test suite after path changes;
- add focused tests for POSIX command parsing and runtime detection;
- validate the Codex plugin and marketplace manifests;
- run `claude plugin validate` on the repository;
- smoke-test both marketplaces from a clean local clone, then repeat against the public Git source after release;
- run tests on Windows and Ubuntu in CI.

## Acceptance criteria

- Codex and Claude each install the skill and hooks with the documented two commands;
- a new session can discover the coordination skill and review/trust its hooks;
- the manual installer works on Windows and Linux;
- audited messages retain source attribution on both shells;
- existing Windows behavior and tests remain intact;
- the README makes the benefit and common workflows clear before setup details.
