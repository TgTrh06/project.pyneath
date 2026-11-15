const test = require('node:test');
const assert = require('node:assert/strict');
const { percentile, workloadSlot, summarize } = require('./load-core.cjs');

test('load metrics use nearest-rank percentiles and preserve the 60/20/15/5 workload', () => {
  assert.equal(percentile([1, 2, 3, 4, 100], .95), 100);
  const counts = { read: 0, camp: 0, mutation: 0, profile: 0 };
  for (let index = 0; index < 20; index++) counts[workloadSlot(index)]++;
  assert.deepEqual(counts, { read: 12, camp: 4, mutation: 3, profile: 1 });
  assert.deepEqual(summarize([{ label: 'read', duration: 10, ok: true }, { label: 'read', duration: 20, ok: false }]).read,
    { requests: 2, errors: 1, errorRate: .5, p50Ms: 10, p95Ms: 20, p99Ms: 20 });
});
