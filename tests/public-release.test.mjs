import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('public repository contains both plugin manifests and one canonical skill runtime', async () => {
  for (const path of [
    '.codex-plugin/plugin.json',
    '.claude-plugin/plugin.json',
    '.agents/plugins/marketplace.json',
    '.claude-plugin/marketplace.json',
    'hooks/hooks.json',
    'hooks/claude.json',
    'skills/coordinating-herdr-agents/SKILL.md',
    'skills/coordinating-herdr-agents/agents/openai.yaml',
    'skills/coordinating-herdr-agents/references/command-policy.md',
    'skills/coordinating-herdr-agents/scripts/hook.mjs',
    'skills/coordinating-herdr-agents/scripts/coordinate.mjs',
    'install.ps1',
    'install.sh',
    'uninstall.ps1',
    'uninstall.sh',
    'README.md',
    'LICENSE',
  ]) {
    await assert.doesNotReject(readFile(join(root, path)));
  }
  await assert.rejects(readFile(join(root, 'scripts', 'hook.mjs')), /ENOENT/);
});

test('marketplace manifests expose the herdr plugin id', async () => {
  const codexPlugin = JSON.parse(await readFile(join(root, '.codex-plugin/plugin.json'), 'utf8'));
  const claudePlugin = JSON.parse(await readFile(join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const codexMarket = JSON.parse(await readFile(join(root, '.agents/plugins/marketplace.json'), 'utf8'));
  const claudeMarket = JSON.parse(await readFile(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(codexPlugin.name, 'coordinating-herdr-agents');
  assert.equal(claudePlugin.name, 'coordinating-herdr-agents');
  assert.equal(codexMarket.name, 'herdr');
  assert.equal(claudeMarket.name, 'herdr');
  assert.equal(codexMarket.plugins[0].name, 'coordinating-herdr-agents');
  assert.equal(claudeMarket.plugins[0].name, 'coordinating-herdr-agents');
});

test('root Windows installers resolve the canonical skill runtime', async () => {
  const install = await readFile(join(root, 'install.ps1'), 'utf8');
  const uninstall = await readFile(join(root, 'uninstall.ps1'), 'utf8');
  assert.match(install, /skills\\coordinating-herdr-agents/);
  assert.match(uninstall, /skills\\coordinating-herdr-agents/);
  assert.match(install, /scripts\\configure-hooks\.mjs/);
  assert.match(uninstall, /scripts\\configure-hooks\.mjs/);
});

test('public repository excludes private local identifiers', async () => {
  const forbidden = ['Pres' + 'idio', 'Anlysis' + '-Inference-Engine', 'C:' + '\\Users\\'];
  const pending = [root];
  while (pending.length) {
    const dir = pending.pop();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.git')) pending.push(path);
      else if (/\.(?:json|md|mjs|ps1|sh|yaml|yml)$/.test(entry.name)) {
        const content = await readFile(path, 'utf8');
        for (const value of forbidden) assert.ok(!content.includes(value), `${path} contains ${value}`);
      }
    }
  }
});
