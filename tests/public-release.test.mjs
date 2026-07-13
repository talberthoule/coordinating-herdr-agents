import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('public repository contains the installable skill', async () => {
  for (const path of ['SKILL.md', 'README.md', 'LICENSE', 'agents/openai.yaml', 'scripts/install.ps1']) {
    await assert.doesNotReject(readFile(join(root, path)));
  }
});

test('public repository excludes private identifiers', async () => {
  const forbidden = ['Pres' + 'idio', 'th' + 'oule', 'Anlysis' + '-Inference-Engine', 'C:' + '\\Users\\'];
  const pending = [root];
  while (pending.length) {
    const dir = pending.pop();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (/\.(?:md|mjs|ps1|yaml)$/.test(entry.name)) {
        const content = await readFile(path, 'utf8');
        for (const value of forbidden) assert.ok(!content.includes(value), `${path} contains ${value}`);
      }
    }
  }
});
