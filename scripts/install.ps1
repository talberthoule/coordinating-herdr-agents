[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$claudeHome = Join-Path $HOME '.claude'
$codexHooks = Join-Path $codexHome 'hooks.json'
$claudeSettings = Join-Path $claudeHome 'settings.json'
$claudeSkills = Join-Path $claudeHome 'skills'
$claudeLink = Join-Path $claudeSkills 'coordinating-herdr-agents'
$stateDir = Join-Path $env:LOCALAPPDATA 'Herdr\coordination-audit'

foreach ($command in @('node', 'herdr', 'codex', 'claude')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command is not available on PATH: $command"
    }
}

New-Item -ItemType Directory -Force -Path $codexHome, $claudeHome, $claudeSkills, $stateDir | Out-Null
& node (Join-Path $skillRoot 'scripts\configure-hooks.mjs') install $codexHooks $claudeSettings $skillRoot
if ($LASTEXITCODE -ne 0) { throw 'Failed to configure Codex and Claude Code hooks.' }

if (Test-Path -LiteralPath $claudeLink) {
    $item = Get-Item -LiteralPath $claudeLink -Force
    $targets = @($item.Target | ForEach-Object { [IO.Path]::GetFullPath($_) })
    if ($item.LinkType -ne 'Junction' -or $targets -notcontains [IO.Path]::GetFullPath($skillRoot)) {
        throw "Claude skill path already exists and is not the expected junction: $claudeLink"
    }
} else {
    New-Item -ItemType Junction -Path $claudeLink -Target $skillRoot | Out-Null
}

$codexConfig = Join-Path $codexHome 'config.toml'
if (-not (Test-Path -LiteralPath $codexConfig) -or -not (Select-String -LiteralPath $codexConfig -Pattern '^\s*hooks\s*=\s*true\s*$' -Quiet)) {
    Write-Warning 'Codex hooks are not enabled in config.toml. Add `hooks = true` under `[features]`.'
}

Write-Host "Installed coordinating-herdr-agents for Codex and Claude Code."
Write-Host "Shared audit state: $stateDir"
Write-Host 'In a fresh Codex session, run /hooks and explicitly trust the new profile hooks. This installer does not bypass trust review.'
