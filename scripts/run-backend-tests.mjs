import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2];
if (!['unit', 'integration'].includes(mode)) throw new Error('Choose unit or integration');
const integration = new Set(['tutor.test.ts', 'embedServiceSemantic.test.ts']);
const files = readdirSync('server/tests').filter(name => name.endsWith('.test.ts') && integration.has(name) === (mode === 'integration'));
if (!files.length) throw new Error(`No ${mode} tests found`);
// Unit tests cannot read .env, call cloud providers or load the user's notebook store.
const isolatedDirectory = mkdtempSync(join(tmpdir(), 'worknote-tests-'));
if (!resolve(isolatedDirectory).startsWith(resolve(tmpdir()) + '\\') && !resolve(isolatedDirectory).startsWith(resolve(tmpdir()) + '/')) throw new Error('Unsafe cleanup path');
try {
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href, '--test', ...files.map(name => resolve('server/tests', name))], {
    stdio: 'inherit',
    cwd: mode === 'unit' ? isolatedDirectory : process.cwd(),
    env: {
      ...process.env, NODE_ENV: 'test',
      GEMINI_API_KEY: '', GROQ_API_KEY: '', OPENROUTER_API_KEY: '',
      LOCAL_LLM_API_KEY: '', LOCAL_LLM_ENABLED: 'true', LOCAL_LLM_AUTOSTART: 'false', ALLOW_CLOUD_LLM_FALLBACK: 'false',
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  // Only the exact directory created by mkdtemp is removed; user data is never a target.
  rmSync(isolatedDirectory, { recursive: true, force: true });
}
