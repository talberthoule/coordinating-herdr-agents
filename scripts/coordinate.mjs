import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCoordinationRequest } from './core.mjs';

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
    return run(command, [...prefixArgs, 'pane', 'run', request.target.id, request.message], env);
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
