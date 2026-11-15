const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const apiRequire = createRequire(resolve(__dirname, '../apps/api/package.json'));
const { io } = apiRequire('socket.io-client');
const { Pool } = apiRequire('pg');
const { assertDisposableDatabaseUrl, assertLocalHttpUrl, verifyDatabaseIdentity } = require('../apps/api/scripts/test-target.cjs');

function integer(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return value;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function workloadSlot(index) {
  const slot = index % 20;
  if (slot < 12) return 'read';
  if (slot < 16) return 'camp';
  if (slot < 19) return 'mutation';
  return 'profile';
}

function delay(milliseconds) { return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds)); }

class LoadUser {
  constructor(index, base, origin, metrics) {
    this.index = index; this.base = base; this.origin = origin; this.metrics = metrics;
    this.cookies = new Map(); this.csrf = ''; this.sessionId = ''; this.toggle = false;
  }
  cookieHeader() { return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '); }
  captureCookies(response) {
    const values = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
    for (const value of values) {
      const pair = value.split(';', 1)[0]; const separator = pair.indexOf('=');
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  async request(path, { method = 'GET', body, idempotency, label, measured = true } = {}) {
    const started = performance.now();
    let response;
    try {
      response = await fetch(new URL(this.base.pathname.replace(/\/$/, '') + path, this.base.origin), {
        method,
        headers: {
          Origin: this.origin.origin,
          ...(this.cookieHeader() ? { Cookie: this.cookieHeader() } : {}),
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(method !== 'GET' && this.csrf ? { 'X-XSRF-TOKEN': this.csrf } : {}),
          ...(idempotency ? { 'Idempotency-Key': idempotency } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      this.captureCookies(response);
      const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
      if (data.csrfToken) this.csrf = data.csrfToken;
      if (measured) this.metrics.push({ label: label ?? `${method} ${path}`, duration: performance.now() - started, ok: response.ok, status: response.status });
      if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}`);
      return data;
    } catch (error) {
      if (measured && !response) this.metrics.push({ label: label ?? `${method} ${path}`, duration: performance.now() - started, ok: false, status: 0 });
      throw error;
    }
  }
  async prepare(runId, provisioned = false) {
    if (!provisioned) {
      await this.request('/auth/session', { measured: false });
      await this.request('/auth/register', {
        method: 'POST', measured: false,
        body: { email: `load-${runId}-${this.index}@example.test`, password: `Load-test-password-${runId}` },
      });
      await this.request('/me/profile', { method: 'PATCH', measured: false, body: { timezone: 'Asia/Ho_Chi_Minh' } });
    }
    const result = await this.request('/focus-sessions', {
      method: 'POST', measured: false, idempotency: randomUUID(),
      body: { intention: `Kiểm thử tải ${this.index}`, durationMinutes: 5 },
    });
    this.sessionId = result.session.id;
  }
  async measuredAction(index) {
    const slot = workloadSlot(index);
    if (slot === 'read') {
      const paths = ['/me/return', '/me/study-dashboard?offset=0&days=7', '/me/focus-history', '/me/preferences', '/me/memory'];
      return this.request(paths[index % paths.length], { label: 'core-read' });
    }
    if (slot === 'camp') {
      return this.request(index % 2 ? '/camps' : '/me/pacts?group=upcoming&limit=10', { label: 'camp-pact-read' });
    }
    if (slot === 'mutation') {
      this.toggle = !this.toggle;
      return this.request('/me/preferences', { method: 'PATCH', body: { sharePresence: this.toggle }, label: 'core-write' });
    }
    return this.request('/me/profile', { label: 'profile-read' });
  }
  async finish() {
    await this.request(`/focus-sessions/${this.sessionId}/check-out`, { method: 'POST', measured: false, body: { outcome: 'progress' } });
  }
}

async function provisionUsers(users, rawDatabaseUrl, runId) {
  const target = assertDisposableDatabaseUrl(rawDatabaseUrl, 'PYNEATH_LOAD_DATABASE_URL');
  if (!target.database.startsWith('pyneath_load')) throw new Error('PYNEATH_LOAD_DATABASE_URL must use a pyneath_load database');
  const pool = new Pool({ connectionString: rawDatabaseUrl, connectionTimeoutMillis: 3000, max: 1 });
  const client = await pool.connect();
  try {
    await verifyDatabaseIdentity(client, target.database);
    await client.query('begin');
    for (const user of users) {
      const accountId = randomUUID(), token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await client.query('insert into identity_accounts (id, email, password_hash) values ($1, $2, $3)',
        [accountId, `load-${runId}-${user.index}@example.test`, 'load-test-session-only']);
      await client.query("insert into profiles (account_id, display_name, timezone) values ($1, null, 'Asia/Ho_Chi_Minh')", [accountId]);
      await client.query("insert into identity_sessions (token_hash, account_id, csrf_token, expires_at) values ($1, $2, $3, now() + interval '2 hours')",
        [tokenHash, accountId, csrf]);
      user.cookies.set('PYNEATH_SESSION', token); user.csrf = csrf;
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release(); await pool.end();
  }
}

function once(socket, event, timeout = 10_000) {
  return new Promise((resolveEvent, reject) => {
    const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timed out waiting for ${event}`)); }, timeout);
    const handler = payload => { clearTimeout(timer); resolveEvent(payload); };
    socket.once(event, handler);
  });
}

async function realtimeRun(users, socketsPerUser, origin, metrics) {
  const sockets = [];
  const root = users[0].base.origin;
  await Promise.all(users.flatMap(user => Array.from({ length: socketsPerUser }, async () => {
    const started = performance.now();
    const socket = io(`${root}/realtime`, { transports: ['websocket'], extraHeaders: { Cookie: user.cookieHeader(), Origin: origin.origin }, reconnection: false, timeout: 10_000 });
    sockets.push({ socket, user });
    await Promise.race([once(socket, 'connect'), once(socket, 'connect_error').then(error => Promise.reject(error))]);
    metrics.connect.push(performance.now() - started);
    const snapshot = once(socket, 'session.snapshot');
    socket.emit('session.subscribe', { sessionId: user.sessionId });
    await snapshot;
  })));

  await Promise.all(users.map(async user => {
    const own = sockets.filter(entry => entry.user === user);
    const started = performance.now();
    const updates = own.map(({ socket }) => once(socket, 'presence.updated').then(payload => {
      if (payload.sessionId !== user.sessionId || payload.presence !== 'break') throw new Error('Unexpected realtime presence payload');
      metrics.propagation.push(performance.now() - started);
    }));
    own[0].socket.emit('presence.set', { sessionId: user.sessionId, presence: 'break' });
    await Promise.all(updates);
  }));
  sockets.forEach(({ socket }) => socket.disconnect());
}

function summarize(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.label) ?? { durations: [], total: 0, errors: 0 };
    group.durations.push(record.duration); group.total++; if (!record.ok) group.errors++;
    groups.set(record.label, group);
  }
  return Object.fromEntries([...groups].map(([label, group]) => [label, {
    requests: group.total, errors: group.errors,
    errorRate: group.total ? group.errors / group.total : 0,
    p50Ms: Math.round(percentile(group.durations, .5)), p95Ms: Math.round(percentile(group.durations, .95)), p99Ms: Math.round(percentile(group.durations, .99)),
  }]));
}

async function main() {
  const base = assertLocalHttpUrl(process.env.PYNEATH_LOAD_API_URL, 'PYNEATH_LOAD_API_URL', '/api/v1');
  const origin = assertLocalHttpUrl(process.env.PYNEATH_LOAD_WEB_ORIGIN, 'PYNEATH_LOAD_WEB_ORIGIN');
  const userCount = integer('PYNEATH_LOAD_USERS', 100, 1, 1000);
  const durationSeconds = integer('PYNEATH_LOAD_DURATION_SECONDS', 30, 5, 7200);
  const intervalMs = integer('PYNEATH_LOAD_INTERVAL_MS', 5000, 100, 60000);
  const socketsPerUser = integer('PYNEATH_LOAD_SOCKETS_PER_USER', 3, 1, 10);
  const records = [], realtime = { connect: [], propagation: [] };
  const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const users = Array.from({ length: userCount }, (_, index) => new LoadUser(index, base, origin, records));

  console.log(JSON.stringify({ phase: 'prepare', users: userCount }));
  const preparationStarted = performance.now();
  const databaseUrl = process.env.PYNEATH_LOAD_DATABASE_URL;
  if (userCount > 10 && !databaseUrl) throw new Error('More than 10 users require marked disposable DB provisioning to preserve the auth rate limit');
  if (databaseUrl) await provisionUsers(users, databaseUrl, runId);
  const batchSize = Math.min(10, userCount);
  for (let offset = 0; offset < users.length; offset += batchSize) await Promise.all(users.slice(offset, offset + batchSize).map(user => user.prepare(runId, Boolean(databaseUrl))));
  const preparationMs = Math.round(performance.now() - preparationStarted);

  console.log(JSON.stringify({ phase: 'http', durationSeconds }));
  const deadline = performance.now() + durationSeconds * 1000;
  await Promise.all(users.map(async user => {
    let index = user.index;
    while (performance.now() < deadline) {
      const started = performance.now();
      await user.measuredAction(index++).catch(() => undefined);
      await delay(Math.max(0, intervalMs - (performance.now() - started)));
    }
  }));

  console.log(JSON.stringify({ phase: 'realtime', connections: userCount * socketsPerUser }));
  await realtimeRun(users, socketsPerUser, origin, realtime);
  await Promise.all(users.map(user => user.finish()));

  const http = summarize(records);
  const report = {
    status: 'passed', users: userCount, sockets: userCount * socketsPerUser,
    preparationMs,
    http,
    realtime: { connectP95Ms: Math.round(percentile(realtime.connect, .95)), propagationP95Ms: Math.round(percentile(realtime.propagation, .95)), samples: realtime.propagation.length },
  };
  const total = records.length, errors = records.filter(record => !record.ok).length;
  if (!total || errors / total >= .01 || (http['core-read']?.p95Ms ?? 0) > 500 || (http['core-write']?.p95Ms ?? 0) > 1000 || report.realtime.propagationP95Ms > 1000) report.status = 'failed';
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'passed') process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
module.exports = { percentile, workloadSlot, summarize };
