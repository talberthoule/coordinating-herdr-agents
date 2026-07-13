import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { appendAuditEvent, listAuditEvents, readAuditState } from '../skills/coordinating-herdr-agents/scripts/core.mjs';
import { createAuditServer } from '../skills/coordinating-herdr-agents/scripts/audit-server.mjs';
import { ensureAuditViewer } from '../skills/coordinating-herdr-agents/scripts/hook-lib.mjs';

async function fixture() {
  const stateDir = await mkdtemp(join(tmpdir(), 'herdr-viewer-'));
  await appendAuditEvent(stateDir, {
    event_id: 'one', phase: 'attempted', runtime: 'codex', origin: 'proactive',
    action: 'herdr.exec', source: { type: 'agent', id: 'w1:pH' }, target: { type: 'agent', id: 'w2:p1' }, reason: 'test',
    message_redacted: 'resume', message_sha256: '0'.repeat(64),
  });
  return stateDir;
}

test('viewer binds loopback, requires token, and exposes filtered events', async (t) => {
  const stateDir = await fixture();
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  assert.equal(viewer.address.address, '127.0.0.1');
  assert.equal((await fetch(`${viewer.url}/api/events`)).status, 401);
  const response = await fetch(`${viewer.url}/api/events?token=test-token&origin=proactive`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).events.length, 1);
});

test('viewer resolves source and target panes to a plain-text route', async (t) => {
  const stateDir = await fixture();
  const snapshotProvider = async () => ({
    panes: [
      { pane_id: 'w1:pH', workspace_id: 'w1', tab_id: 'w1:tH' },
      { pane_id: 'w2:p1', workspace_id: 'w2', tab_id: 'w2:t1' },
    ],
    workspaces: [
      { workspace_id: 'w1', label: 'example-repository' },
      { workspace_id: 'w2', label: 'backchannel' },
    ],
    tabs: [
      { tab_id: 'w1:tH', label: 'herdr-skill' },
      { tab_id: 'w2:t1', label: 'linear' },
    ],
  });
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false, snapshotProvider });
  t.after(() => viewer.close());
  const response = await fetch(`${viewer.url}/api/events?token=test-token`);
  const [event] = (await response.json()).events;
  assert.equal(event.source_display, 'example-repository / herdr-skill');
  assert.equal(event.target_display, 'backchannel / linear');
});

test('viewer filters audit events by attempted, succeeded, or failed status', async (t) => {
  const stateDir = await fixture();
  await appendAuditEvent(stateDir, {
    event_id: 'two', phase: 'succeeded', runtime: 'codex', origin: 'proactive',
    action: 'herdr.exec', target: { type: 'agent', id: 'w2:p1' }, reason: 'test',
    message_redacted: 'resume', message_sha256: '0'.repeat(64),
  });
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  const response = await fetch(`${viewer.url}/api/events?token=test-token&status=succeeded`);
  assert.deepEqual((await response.json()).events.map((event) => event.phase), ['succeeded']);
});

test('viewer reads filters from explicit elements instead of window.origin', async (t) => {
  const stateDir = await fixture();
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  const page = await (await fetch(`${viewer.url}/?token=test-token`)).text();
  assert.match(page, /document\.getElementById\('origin'\)/);
  assert.doesNotMatch(page, /origin\.value/);
});

test('viewer offers a status filter and formats local time with a short zone name', async (t) => {
  const stateDir = await fixture();
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  const page = await (await fetch(`${viewer.url}/?token=test-token`)).text();
  assert.match(page, /<select id="status"/);
  assert.match(page, /timeZoneName:'short'/);
  assert.match(page, /e\.occurred_at/);
  assert.match(page, /e\.source_display/);
});

test('Viewed & close acknowledges the displayed sequence', async (t) => {
  const stateDir = await fixture();
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  const response = await fetch(`${viewer.url}/api/viewed-close?token=test-token`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sequence: 1 }),
  });
  assert.equal(response.status, 204);
  assert.equal((await readAuditState(stateDir)).acknowledged_sequence, 1);
});

test('clear endpoint refuses unseen history and clears viewed history after confirmation', async (t) => {
  const stateDir = await fixture();
  const viewer = await createAuditServer({ stateDir, token: 'test-token', port: 0, autoExit: false });
  t.after(() => viewer.close());
  let response = await fetch(`${viewer.url}/api/clear?token=test-token`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmed: true }),
  });
  assert.equal(response.status, 409);
  await fetch(`${viewer.url}/api/viewed-close?token=test-token`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sequence: 1 }),
  });
  response = await fetch(`${viewer.url}/api/clear?token=test-token`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmed: true }),
  });
  assert.equal(response.status, 204);
  assert.deepEqual(await listAuditEvents(stateDir), []);
});

test('concurrent proactive activations share one viewer process', async () => {
  const stateDir = await fixture();
  const urls = await Promise.all(Array.from({ length: 4 }, () => ensureAuditViewer(stateDir, { openBrowser: false })));
  const unique = [...new Set(urls)];
  try {
    assert.equal(unique.length, 1);
  } finally {
    await Promise.allSettled(unique.map((url) => fetch(url.replace('/?', '/api/viewed-close?'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sequence: 1 }),
    })));
  }
});
