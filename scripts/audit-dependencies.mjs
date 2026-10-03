import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { evaluateAudit } from './audit-policy.mjs';

if (!process.env.npm_execpath) throw new Error('Run through pnpm run audit:ci');
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--prod', '--json'], {
  encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
});
writeFileSync('artifacts-audit.json', result.stdout || '{}');
if (result.error) throw result.error;
const report = JSON.parse(result.stdout);
const { counts, passed } = evaluateAudit(report);
console.log(`Production audit: ${JSON.stringify(counts)}. Policy: critical blocks CI; other advisories remain in the report.`);
if (![0, 1].includes(result.status)) throw new Error(`Audit execution failed (exit ${result.status})`);
process.exitCode = passed ? 0 : 1;
