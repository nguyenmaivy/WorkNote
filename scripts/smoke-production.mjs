import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:net';

// Ephemeral port + isolated cwd prevent changing real notebook/upload data.
const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolveClose => probe.close(resolveClose));
const directory = mkdtempSync(join(tmpdir(), 'worknote-smoke-'));
if (!resolve(directory).startsWith(resolve(tmpdir()) + '\\') && !resolve(directory).startsWith(resolve(tmpdir()) + '/')) throw new Error('Unsafe cleanup path');
const { cpSync } = await import('node:fs');
cpSync('dist', join(directory, 'dist'), { recursive: true });
const child = spawn(process.execPath, [resolve('dist/server.cjs')], {
  cwd: directory,
  env: { ...process.env, NODE_ENV: 'production', PORT: String(port), LOCAL_LLM_ENABLED: 'false', LOCAL_LLM_AUTOSTART: 'false', ALLOW_CLOUD_LLM_FALLBACK: 'false', GEMINI_API_KEY: '', GROQ_API_KEY: '', OPENROUTER_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', data => { logs = (logs + data).slice(-8000); });
child.stderr.on('data', data => { logs = (logs + data).slice(-8000); });
const exited = once(child, 'exit');
const url = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited early: ${logs}`);
    try {
      const response = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* startup may still be in progress */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  assert.ok(ready, `Production server did not start: ${logs}`);
  const html = await fetch(url);
  assert.equal(html.status, 200);
  const body = await html.text();
  const asset = body.match(/src="(\/assets\/[^"]+\.js)"/);
  assert.ok(asset, 'Production HTML must reference a built JS asset');
  assert.equal((await fetch(url + asset[1])).status, 200);
  const status = await (await fetch(`${url}/api/status`)).json();
  assert.equal(status.providers.hasAny, false);
  const json = { 'Content-Type': 'application/json' };
  const invalid = await fetch(`${url}/api/notebook/pages`, { method: 'POST', headers: json, body: '{}' });
  assert.equal(invalid.status, 400);
  const created = await fetch(`${url}/api/notebook/pages`, { method: 'POST', headers: json, body: JSON.stringify({ title: 'CI smoke notebook' }) });
  assert.equal(created.status, 201);
  const { page } = await created.json();
  const detail = await fetch(`${url}/api/notebook/pages/${page.id}`);
  assert.equal((await detail.json()).page.title, 'CI smoke notebook');
  assert.equal((await fetch(`${url}/api/notebook/pages/${page.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(`${url}/api/notebook/pages/${page.id}`)).status, 404);
  console.log('Production smoke passed: HTML, built asset, provider status, validation, notebook CRUD.');
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  await exited;
  rmSync(directory, { recursive: true, force: true });
}
