const { Pool } = require('pg');
const { assertDisposableDatabaseUrl, verifyDatabaseIdentity } = require('./test-target.cjs');
async function main() {
  const raw = process.env.PYNEATH_TEST_DATABASE_URL;
  const target = assertDisposableDatabaseUrl(raw, 'PYNEATH_TEST_DATABASE_URL');
  const pool = new Pool({ connectionString: raw, connectionTimeoutMillis: 3000 });
  try { await verifyDatabaseIdentity(pool, target.database); } finally { await pool.end(); }
  console.log('PostgreSQL integration prerequisites verified');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
