const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { Pool } = require('pg');
const { assertDisposableDatabaseUrl, assertLocalHttpUrl, verifyDatabaseIdentity } = require('./test-target.cjs');

async function main() {
  const required = ['PYNEATH_SOLO_API_URL', 'PYNEATH_SOLO_DATABASE_URL', 'PYNEATH_SOLO_WEB_ORIGIN'];
  for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}; integration tests must not silently skip`);
  const base = assertLocalHttpUrl(process.env.PYNEATH_SOLO_API_URL, 'PYNEATH_SOLO_API_URL', '/api/v1');
  assertLocalHttpUrl(process.env.PYNEATH_SOLO_WEB_ORIGIN, 'PYNEATH_SOLO_WEB_ORIGIN');
  const target = assertDisposableDatabaseUrl(process.env.PYNEATH_SOLO_DATABASE_URL, 'PYNEATH_SOLO_DATABASE_URL');
  const database = new Pool({ connectionString: process.env.PYNEATH_SOLO_DATABASE_URL, connectionTimeoutMillis: 3000 });
  try {
    await verifyDatabaseIdentity(database, target.database);
    await database.query('select 1 from identity_accounts limit 1');
  } finally { await database.end(); }
  const ready = await fetch(new URL('/health/ready', base), { signal: AbortSignal.timeout(5000) });
  if (!ready.ok) throw new Error('Test API is not ready');
  const files = ['solo-http', 'pact-lists-http', 'camp-invites-http'].map(name => resolve(__dirname, `../dist-test/test/${name}.test.js`));
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) throw new Error('HTTP integration tests failed');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
