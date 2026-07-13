import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCoordinationRequest } from './core.mjs';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function run(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { env, windowsHide: true });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (exitCode) => resolvePromise({
      exitCode: exitCode ?? 1,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    }));
  });
}

export async function executeCoordinationRequest(request, options = {}) {
  validateCoordinationRequest(request);
  const command = options.command || process.env.HERDR_BIN || (process.platform === 'win32' ? 'herdr.exe' : 'herdr');
  const prefixArgs = options.prefixArgs || [];
  const env = options.env || process.env;
  if (request.origin === 'proactive') {
    const check = await run(command, [...prefixArgs, 'agent', 'get', request.target.id], env);
    if (check.exitCode !== 0) throw new Error(`target agent does not exist: ${request.target.id}`);
  }
  if (request.args[0] === 'agent' && request.args[1] === 'send') {
    const sourcePane = env.HERDR_PANE_ID;
    let sourceLabel;
    if (env.HERDR_TAB_ID) {
      const source = await run(command, [...prefixArgs, 'tab', 'get', env.HERDR_TAB_ID], env);
      try { sourceLabel = JSON.parse(source.stdout).result?.tab?.label; } catch { /* use pane id */ }
    }
    const source = sourceLabel ? `"${String(sourceLabel).replace(/\s+/g, ' ').trim()}" (${sourcePane})` : sourcePane || 'another session';
    const text = `[Herdr from ${source}] ${request.message}`;
    const typed = await run(command, [...prefixArgs, 'pane', 'send-text', request.target.id, text], env);
    if (typed.exitCode !== 0) return typed;
    // ponytail: fixed gap avoids Herdr/Codex's paste/Enter race; remove when pane run submits reliably.
    await wait(options.inputDelayMs ?? 100);
    return run(command, [...prefixArgs, 'pane', 'send-keys', request.target.id, 'enter'], env);
  }
  return run(command, [...prefixArgs, ...request.args], env);
}

async function stdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  if (!process.argv.includes('--stdin')) throw new Error('use --stdin with a JSON coordination request');
  const request = JSON.parse(await stdin());
  const result = await executeCoordinationRequest(request);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
