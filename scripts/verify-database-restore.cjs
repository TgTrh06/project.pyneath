const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const apiRequire = createRequire(resolve(__dirname, '../apps/api/package.json'));
const { Pool } = apiRequire('pg');
const { assertDisposableDatabaseUrl, verifyDatabaseIdentity } = require('../apps/api/scripts/test-target.cjs');

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function snapshot(pool) {
  const [columns, constraints, tables] = await Promise.all([
    pool.query(`select table_schema, table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
      from information_schema.columns
      where table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name, ordinal_position`),
    pool.query(`select constraint_schema, table_name, constraint_name, constraint_type
      from information_schema.table_constraints
      where constraint_schema not in ('pg_catalog', 'information_schema')
        and not (constraint_type = 'CHECK' and constraint_name ~ '^[0-9_]+_not_null$')
      order by constraint_schema, table_name, constraint_name`),
    pool.query(`select table_schema, table_name
      from information_schema.tables
      where table_type = 'BASE TABLE' and table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name`),
  ]);
  const counts = [];
  for (const table of tables.rows) {
    const result = await pool.query(`select count(*)::bigint as count from ${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)}`);
    counts.push({ ...table, count: result.rows[0].count });
  }
  return { columns: columns.rows, constraints: constraints.rows, counts };
}

async function main() {
  const sourceRaw = process.env.PYNEATH_BACKUP_SOURCE_URL;
  const restoreRaw = process.env.PYNEATH_BACKUP_RESTORE_URL;
  const sourceTarget = assertDisposableDatabaseUrl(sourceRaw, 'PYNEATH_BACKUP_SOURCE_URL');
  const restoreTarget = assertDisposableDatabaseUrl(restoreRaw, 'PYNEATH_BACKUP_RESTORE_URL');
  if (sourceTarget.database === restoreTarget.database) throw new Error('Source and restore databases must differ');
  const source = new Pool({ connectionString: sourceRaw, connectionTimeoutMillis: 3000, max: 1 });
  const restore = new Pool({ connectionString: restoreRaw, connectionTimeoutMillis: 3000, max: 1 });
  try {
    await verifyDatabaseIdentity(source, sourceTarget.database);
    await verifyDatabaseIdentity(restore, restoreTarget.database);
    const [expected, actual] = await Promise.all([snapshot(source), snapshot(restore)]);
    assert.deepEqual(actual, expected, 'Restored schema, constraints or exact table counts differ from the source');
    console.log(JSON.stringify({ status: 'passed', source: sourceTarget.database, restore: restoreTarget.database, tables: expected.counts.length }));
  } finally {
    await Promise.allSettled([source.end(), restore.end()]);
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { quoteIdentifier, snapshot };
