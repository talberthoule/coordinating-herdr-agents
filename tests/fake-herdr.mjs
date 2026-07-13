import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_HERDR_LOG, `${JSON.stringify(args)}\n`);
if (process.env.FAKE_HERDR_MISSING && args[0] === 'agent' && args[1] === 'get') {
  process.stderr.write('agent not found\n');
  process.exit(1);
}
if (process.env.FAKE_HERDR_RUN_FAILURE && args[0] === 'pane' && args[1] === 'run') {
  process.stderr.write('run failed\n');
  process.exit(1);
}
process.stdout.write(JSON.stringify({ ok: true, args }));
