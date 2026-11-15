# Production-readiness test runbook

This runbook turns the production-readiness plan into repeatable gates for the web app, API, PostgreSQL data lifecycle, realtime transport, and optional Assistance/ML capabilities. It is split into local/offline, target-environment, and externally authorized phases so that a test run cannot silently become a deployment or paid-provider run.

## Release rules

- A P0 or P1 failure blocks the affected capability. A skipped mandatory gate is `BLOCKED`, not `PASS`.
- Core web/API can be assessed with Assistance disabled. Provider-backed or self-hosted Assistance needs its own capability decision.
- Use fictional accounts and content only. Never aim destructive or load tooling at an ordinary development, staging, or production database.
- Every evidence bundle records commit, dirty-tree identity, configuration, UTC timestamps, environment topology, command, result, and known limitations.
- Product fixes, staging changes, provider calls, GPU work, deployment, and production changes require separate authorization.

## Test layers and ownership

| Layer | Purpose | Mandatory evidence |
| --- | --- | --- |
| Static and architecture | Types, lint, module boundaries, generated-contract agreement, dependency audit | Command log and exact violations |
| Unit and component | Domain rules, policies, state reducers, UI behavior, accessibility semantics | Deterministic test report |
| API and database integration | Authentication, CSRF, ownership, lifecycle, races, migrations, persistence | Disposable PostgreSQL report |
| Contract and realtime | Shared Zod payloads, socket authentication, room authorization, revocation, reconnect | HTTP/socket report including negative cases |
| Browser journeys | P0 user outcomes on desktop/mobile engines | Playwright traces/screenshots on failure |
| Accessibility and responsive | Keyboard, focus, semantics, zoom, screen readers, physical devices | Axe report plus signed manual checklist |
| Performance and resilience | Latency, error rate, concurrency, recovery, resource ceilings | Fixed-topology load/soak report |
| Backup and restore | Recoverability and schema/data fidelity | Backup hash, timings, metadata/count comparison |
| Assistance/ML | Protocol, dataset, leakage, review, evaluation, export and serving quality | Versioned protocol/model/dataset evidence |
| Operations and security | TLS, proxy, cookies, secrets, alerts, retention, rollback | Staging rehearsal and configuration evidence |

## Phase 0 — freeze the subject

Record these before testing:

```powershell
git rev-parse HEAD
git status --short
node --version
pnpm --version
python --version
docker version
```

Capture feature flags, browser versions, PostgreSQL version, API/web origins, host resources, and whether the tree is dirty. A changed commit or working tree invalidates earlier release evidence unless the affected gates are rerun.

## Phase 1 — local/offline gates

Install exactly the locked dependencies, then run:

```powershell
pnpm install --frozen-lockfile
pnpm audit:security
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
node ml/scripts/export_protocol.cjs --check
python ml/scripts/check_boundaries.py
python -m unittest discover -s ml/tests -v
python -m unittest discover -s ml/scripts -p 'test_pyneath_dataset.py' -v
```

The default browser suite is isolated from real services and covers deterministic landing, keyboard, focus, responsive, mobile-menu and WCAG A/AA smoke behavior across Chromium, Firefox, WebKit and mobile emulations. It is not a substitute for live P0 journeys or manual accessibility.

## Phase 2 — disposable PostgreSQL/API gates

The guard permits only loopback PostgreSQL URLs whose database name starts with `pyneath_ci`, `pyneath_test`, `pyneath_e2e`, `pyneath_load`, or `pyneath_restore`, and whose query contains `application_name=pyneath-test-suite`. The scripts also verify the connected database identity.

Example PowerShell setup, using a disposable database created for the run:

```powershell
$env:PYNEATH_TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/pyneath_test_RUN?application_name=pyneath-test-suite'
node apps/api/scripts/check-test-database.cjs
pnpm test:api
```

Start an API configured with the same database and a loopback web origin. Then run lifecycle/race suites:

```powershell
$env:PYNEATH_SOLO_API_URL = 'http://127.0.0.1:8081/api/v1'
$env:PYNEATH_SOLO_DATABASE_URL = $env:PYNEATH_TEST_DATABASE_URL
$env:PYNEATH_SOLO_WEB_ORIGIN = 'http://127.0.0.1:5173'
node apps/api/scripts/run-http-tests.cjs
```

Mandatory cases include registration/session/logout, CSRF, ownership, validation, Solo start/checkout/return, study progress, private notes, Open Seeds, Pact lifecycle/privacy/races, Camp invitation races, socket authentication and authorization, reconnect, snapshot consistency, revocation, and logout cleanup. Zero unexpected 5xx responses and zero cross-user data disclosure are absolute gates.

## Phase 3 — live browser journeys

Set the live flag only when the API and disposable database are ready:

```powershell
$env:PYNEATH_E2E_LIVE = '1'
$env:PYNEATH_E2E_API_URL = 'http://127.0.0.1:8081/api/v1'
$env:PYNEATH_E2E_REALTIME_URL = 'http://127.0.0.1:8081'
pnpm test:e2e --project=chromium-desktop
```

The release casebook must cover:

1. Register, timezone/preferences, logout/login and expired-session recovery.
2. Solo 5/25/50, early and normal checkout, return summary, Dashboard projection.
3. Study steps with partial completion, private note, Open Seed, reopen/edit and persistence after a new session.
4. Pact create/invite/accept, simultaneous presence, disconnect/reconnect, checkout, access revocation and owner/member privacy.
5. Camp create/invite/accept/decline/expiry/race, member visibility and memory projection.
6. Assistance disabled, unavailable, timeout, refusal, provider failure and successful response without leaking private fields.

Run Chromium on every pull request. Run Firefox/WebKit parity on main and before release. Capture trace, screenshot, console errors, failed requests and correlation IDs for every failure.

## Phase 4 — accessibility and physical devices

Automated axe scans cover stable P0 pages but are only the first gate. Manually verify:

- keyboard-only operation, visible focus, logical order, skip links, dialogs, focus restoration and no keyboard trap;
- NVDA + Chrome/Firefox on Windows and VoiceOver + Safari on macOS/iPhone;
- semantic headings, names, descriptions, live announcements and error recovery;
- 200% zoom, text spacing, reduced motion, contrast, forced-colors/high-contrast mode;
- current physical Android Chrome and iPhone Safari, portrait/landscape, safe areas and on-screen keyboard;
- 320, 375, 390, 768, 1024 and 1440 CSS-pixel widths with no hidden action or horizontal overflow.

Record device/OS/browser/assistive-technology versions, tester, date, flow, result and evidence link. Any inaccessible P0 action is P1.

## Phase 5 — performance, realtime and resilience

Use a separate load generator. Fix the target before comparison: API 2 vCPU/4 GiB, PostgreSQL 2 vCPU/4 GiB, production build/config, Assistance disabled unless explicitly testing it. Record database settings and network placement.

```powershell
$env:PYNEATH_LOAD_API_URL = 'http://127.0.0.1:8081/api/v1'
$env:PYNEATH_LOAD_WEB_ORIGIN = 'http://127.0.0.1:5173'
$env:PYNEATH_LOAD_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/pyneath_load_RUN?application_name=pyneath-test-suite'
$env:PYNEATH_LOAD_USERS = '100'
$env:PYNEATH_LOAD_SOCKETS_PER_USER = '3'
$env:PYNEATH_LOAD_DURATION_SECONDS = '1800'
pnpm test:load:core
```

Workload mix is 60% core reads, 20% Camp/Pact reads, 15% writes and 5% profile reads. Gates: HTTP error rate below 1%, core read/write p95 below 500 ms, presence propagation p95 below 1,000 ms, no missing event, no unbounded memory/connection growth. Run a 30-minute hold, a two-hour soak, a burst/ramp test, dependency restart/reconnect, and post-stress functional recovery. Treat single-host results as diagnostic only.

## Phase 6 — backup/restore and migration rehearsal

Create a custom-format backup from a marked source database, restore into a distinct marked restore database, then verify:

```powershell
$env:PYNEATH_RESTORE_SOURCE_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/pyneath_test_RUN?application_name=pyneath-test-suite'
$env:PYNEATH_RESTORE_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/pyneath_restore_RUN?application_name=pyneath-test-suite'
pnpm test:restore
```

Retain the encrypted backup location, SHA-256, backup/restore timings, tool versions and result. The verifier compares all non-system table columns, named constraints and exact row counts. Staging must additionally rehearse upgrade, rollback/forward-fix, RPO/RTO, retention and provider recovery.

## Phase 7 — Assistance and ML capability gates

Offline gates require protocol/contract agreement, architectural boundaries, deterministic dataset validation, PII/provenance/license checks, split isolation, leakage checks, frozen independent holdout, and reproducible evaluation. Training additionally requires a reviewed dataset/model card, seeded run manifest, GPU/resource approval, checkpoint evidence, export integrity and a GGUF benchmark on target hardware.

Provider-backed quality runs require explicit approval for cost and data handling. Record provider/model version, region, retention/training policy, redaction, exact prompt/protocol checksum, sampling parameters, per-case outputs, human rubric, refusal/safety results, latency and spend. Never promote on automated scores alone.

## Phase 8 — staging operations and release decision

On an approved staging topology, verify TLS/headers, reverse proxy and WebSocket upgrade, secure cookies, CORS/CSRF, secret injection/rotation, rate limits, logs without sensitive payloads, metrics, alerts, health/readiness, graceful shutdown, rollback/forward-fix, backup schedule and incident contacts.

Issue one decision per capability: `PASS`, `FAIL`, or `BLOCKED`. A release packet contains the source identity, matrix, defect list, browser/manual evidence, API/database reports, load/resource graphs, restore proof, ML/provider evidence where enabled, residual risks, approvers and rollback owner.

## Cleanup

Stop test processes and remove only explicitly named disposable containers/databases created for the run. Verify resolved names before deletion. Do not remove shared volumes, ordinary local databases or existing services. Confirm cleanup and note whether retained evidence contains fictional data only.
