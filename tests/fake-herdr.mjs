import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_HERDR_LOG, `${JSON.stringify(args)}\n`);
if (process.env.FAKE_HERDR_MISSING && args[0] === 'agent' && args[1] === 'get') {
  process.stderr.write('agent not found\n');
  process.exit(1);
}
if (process.env.FAKE_HERDR_KEYS_FAILURE && args[0] === 'pane' && args[1] === 'send-keys') {
  process.stderr.write('send keys failed\n');
  process.exit(1);
}
if (args[0] === 'tab' && args[1] === 'get') {
  process.stdout.write(JSON.stringify({ result: { tab: { label: process.env.FAKE_HERDR_TAB_LABEL } } }));
  process.exit(0);
}
process.stdout.write(JSON.stringify({ ok: true, args }));
