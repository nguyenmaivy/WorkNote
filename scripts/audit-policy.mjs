export function evaluateAudit(report) {
  const counts = report?.metadata?.vulnerabilities;
  if (!counts || !['low', 'moderate', 'high', 'critical'].every(level => Number.isInteger(counts[level]) && counts[level] >= 0)) {
    throw new Error('Audit did not return a valid vulnerability report');
  }
  return { counts, passed: counts.critical === 0 };
}
