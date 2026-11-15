const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const DISPOSABLE_DATABASE = /^pyneath_(?:ci|test|e2e|load|restore)(?:_[a-z0-9_]+)?$/;
const TEST_APPLICATION_NAME = 'pyneath-test-suite';

function parseUrl(raw, name) {
  if (!raw) throw new Error(`Missing ${name}; integration tests must not silently skip`);
  try { return new URL(raw); }
  catch { throw new Error(`${name} must be a valid URL`); }
}

function assertLoopback(url, name) {
  if (!LOOPBACK_HOSTS.has(url.hostname)) throw new Error(`${name} must target a loopback service`);
}

function assertDisposableDatabaseUrl(raw, name = 'database URL') {
  const url = parseUrl(raw, name);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`${name} must use PostgreSQL`);
  assertLoopback(url, name);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!DISPOSABLE_DATABASE.test(database)) {
    throw new Error(`${name} must name an explicitly disposable pyneath test database`);
  }
  if (url.searchParams.get('application_name') !== TEST_APPLICATION_NAME) {
    throw new Error(`${name} must include application_name=${TEST_APPLICATION_NAME}`);
  }
  return { url, database };
}

function assertLocalHttpUrl(raw, name, expectedPath = '/') {
  const url = parseUrl(raw, name);
  if (url.protocol !== 'http:') throw new Error(`${name} must use local HTTP`);
  assertLoopback(url, name);
  if (url.username || url.password || url.search || url.hash) throw new Error(`${name} must not contain credentials, query or fragment`);
  if (url.pathname.replace(/\/$/, '') !== expectedPath.replace(/\/$/, '')) throw new Error(`${name} must use path ${expectedPath}`);
  return url;
}

async function verifyDatabaseIdentity(pool, expectedDatabase) {
  const result = await pool.query("select current_database() as database, current_setting('application_name', true) as application_name");
  const row = result.rows[0];
  if (row?.database !== expectedDatabase || row?.application_name !== TEST_APPLICATION_NAME) {
    throw new Error('Connected database identity does not match the disposable test target');
  }
}

module.exports = { TEST_APPLICATION_NAME, assertDisposableDatabaseUrl, assertLocalHttpUrl, verifyDatabaseIdentity };
