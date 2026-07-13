# Herdr Agent Coordination

An Agent Skill for coordinating Codex and Claude Code sessions through the Herdr CLI. It lets agents inspect related Herdr tabs, avoid duplicate work, send audited messages to other agents, and review coordination events in a local web UI.

No orchestration framework is added: Herdr remains the coordination layer and the agents use its CLI directly.

## Requirements

- Windows PowerShell
- Node.js
- Herdr CLI
- Codex CLI and Claude Code on `PATH`

## Install

Clone or copy this repository to:

```text
%USERPROFILE%\.codex\skills\coordinating-herdr-agents
```

Then run:

```powershell
& "$HOME\.codex\skills\coordinating-herdr-agents\scripts\install.ps1"
```

The installer preserves existing profile hooks, configures the audited coordination hooks for both runtimes, and shares the Codex skill with Claude Code through a junction. If prompted, enable `hooks = true` under `[features]` in `~/.codex/config.toml`, then review and trust the hooks in a fresh Codex session with `/hooks`.

## What it does

- Discovers Herdr workspaces, tabs, panes, and agents.
- Reads relevant agent context before duplicating or overlapping work.
- Sends cross-agent messages with visible source attribution and a reliable delayed Enter.
- Records attempted, succeeded, and failed mutations with source, target, and local time.
- Opens a loopback-only audit viewer with origin, runtime, and status filters.
- Blocks raw Herdr mutations and obvious secrets from audited messages.

Audit state is stored locally under `%LOCALAPPDATA%\Herdr\coordination-audit`.

## Test

```powershell
node --test --test-concurrency=1 tests/*.test.mjs
```

## Uninstall

```powershell
& "$HOME\.codex\skills\coordinating-herdr-agents\scripts\uninstall.ps1"
```

Add `-PurgeAuditHistory` only when you also want to delete the local audit log.

## License

MIT
