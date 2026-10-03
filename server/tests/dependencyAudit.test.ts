import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAudit } from '../../scripts/audit-policy.mjs';

describe('Dependency audit gate', () => {
  const report = (critical: number) => ({ metadata: { vulnerabilities: { low: 4, moderate: 21, high: 33, critical } } });
  it('retains noncritical advisories while applying the documented threshold', () => {
    assert.deepEqual(evaluateAudit(report(0)), { counts: report(0).metadata.vulnerabilities, passed: true });
  });
  it('blocks a critical advisory', () => {
    assert.equal(evaluateAudit(report(1)).passed, false);
  });
  it('rejects registry errors and malformed reports instead of allowing CI', () => {
    for (const invalid of [{ error: { code: 'REGISTRY_UNAVAILABLE' } }, {}, { metadata: { vulnerabilities: { critical: 0 } } }]) {
      assert.throws(() => evaluateAudit(invalid), /valid vulnerability report/);
    }
  });
});
