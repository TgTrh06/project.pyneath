const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDisposableDatabaseUrl, assertLocalHttpUrl, verifyDatabaseIdentity } = require('./test-target.cjs');

test('accepts only explicitly marked loopback disposable databases', () => {
  const target = assertDisposableDatabaseUrl('postgresql://user:pass@127.0.0.1:5432/pyneath_ci?application_name=pyneath-test-suite');
  assert.equal(target.database, 'pyneath_ci');
  for (const raw of [
    'postgresql://user:pass@127.0.0.1:5432/pyneath_review?application_name=pyneath-test-suite',
    'postgresql://user:pass@db.example/pyneath_test?application_name=pyneath-test-suite',
    'postgresql://user:pass@127.0.0.1:5432/pyneath_test',
    'https://127.0.0.1/pyneath_test?application_name=pyneath-test-suite'
  ]) assert.throws(() => assertDisposableDatabaseUrl(raw));
});

test('accepts only exact loopback HTTP integration targets', () => {
  assert.equal(assertLocalHttpUrl('http://127.0.0.1:8081/api/v1', 'API', '/api/v1').port, '8081');
  assert.throws(() => assertLocalHttpUrl('https://127.0.0.1:8081/api/v1', 'API', '/api/v1'));
  assert.throws(() => assertLocalHttpUrl('http://example.test/api/v1', 'API', '/api/v1'));
  assert.throws(() => assertLocalHttpUrl('http://127.0.0.1:8081/wrong', 'API', '/api/v1'));
});

test('verifies the connected database and application marker', async () => {
  await verifyDatabaseIdentity({ query: async () => ({ rows: [{ database: 'pyneath_test_run', application_name: 'pyneath-test-suite' }] }) }, 'pyneath_test_run');
  await assert.rejects(() => verifyDatabaseIdentity({ query: async () => ({ rows: [{ database: 'pyneath_review', application_name: 'pyneath-test-suite' }] }) }, 'pyneath_test_run'));
  await assert.rejects(() => verifyDatabaseIdentity({ query: async () => ({ rows: [{ database: 'pyneath_test_run', application_name: '' }] }) }, 'pyneath_test_run'));
});
