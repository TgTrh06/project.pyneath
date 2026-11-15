# Production-readiness verification matrix

Use this matrix as the release checklist. `Required` means a skip blocks the relevant capability. Link evidence rather than pasting secrets or personal data.

| ID | Area | Scenario / assertion | Level | Required | Release gate |
| --- | --- | --- | --- | --- | --- |
| STA-01 | Workspace | Lockfile install, audit, lint, type/build and architecture boundaries | CI | Yes | No high/critical production dependency issue; no lint/type/boundary failure |
| STA-02 | Contracts | Generated Assistance protocol and shared Zod schemas agree | CI | When Assistance enabled | Exact checksum/version agreement |
| AUT-01 | Auth | Register, login, logout, expiry, revoked session, invalid credentials | API + browser | Yes | Correct status/state; no residual socket/session access |
| AUT-02 | Web security | CSRF, CORS/origin, cookie flags and rate limits | API + staging | Yes | Negative cases rejected; production cookie/header policy verified |
| OWN-01 | Privacy | Cross-account reads/writes for Solo, notes, Seeds, Pact and Camp | API | Yes | Zero disclosure or mutation outside authorization |
| SOL-01 | Solo | Start 5/25/50, conflicting start, early/normal checkout and return | Unit + DB + browser | Yes | Lifecycle and timestamps deterministic; race has one valid outcome |
| STU-01 | Study | Partial steps, note, Open Seed, reopen/edit and persistence | DB + browser | Yes | No progress loss or private-note exposure |
| MEM-01 | Memory | Return, Dashboard and forest projections after state changes | API + browser | Yes | Projection matches canonical persisted state |
| PCT-01 | Pact | Create/invite/accept, presence, checkout, revocation and privacy | DB + socket + browser | Yes | Authorization enforced throughout lifecycle |
| PCT-02 | Pact races | Concurrent join/checkout/revoke/disconnect/reconnect | DB + socket | Yes | Idempotent/consistent result; no stale authorized room |
| CMP-01 | Camp | Create/invite/accept/decline/expiry and member visibility | DB + browser | Yes | Invitation and membership invariants hold |
| CMP-02 | Camp races | Concurrent accept/decline/expiry | DB/API | Yes | One consistent terminal state, no duplicate membership |
| RT-01 | Realtime | Handshake auth, subscribe authorization, snapshot and ordering | Socket | Yes | Unauthorized clients rejected; snapshot/event state converges |
| RT-02 | Realtime | 100 users × 3 sockets presence fan-out | Target load | Yes | p95 <1,000 ms; no missing event |
| UI-01 | Browser | P0 journeys in Chromium; parity in Firefox/WebKit | Browser | Yes | No P0 journey failure or unexpected console/request error |
| UI-02 | Responsive | 320–1440 widths, portrait/landscape, safe area and virtual keyboard | Browser + device | Yes | No hidden action, overlap or horizontal overflow |
| A11Y-01 | Automated | Axe WCAG A/AA on stable P0 pages | Browser | Yes | No serious/critical violation |
| A11Y-02 | Manual | Keyboard, focus, 200% zoom, reduced motion and contrast | Manual | Yes | Every P0 action operable and perceivable |
| A11Y-03 | Screen reader | NVDA/Chrome or Firefox; VoiceOver/Safari | Manual | Yes | Names, structure, errors and live updates understandable |
| DEV-01 | Physical device | Current Android Chrome and iPhone Safari | Manual | Yes | P0 journeys pass on real hardware |
| PERF-01 | HTTP | Fixed-topology 60/20/15/5 workload | Target load | Yes | <1% error; core p95 <500 ms |
| PERF-02 | Stability | 30-min hold, 2-hour soak, burst and post-stress recovery | Target load | Yes | No leak/exhaustion; functional gates recover |
| RES-01 | Resilience | API/DB/network interruption and socket reconnect | Staging | Yes | Bounded failure, consistent recovery, useful telemetry |
| DB-01 | Migration | Fresh install and upgrade from supported previous schema | DB/staging | Yes | Migration completes; application smoke passes |
| DB-02 | Backup | Custom backup, restore to distinct target and fidelity check | DB/staging | Yes | Columns/constraints/counts match; RPO/RTO within target |
| OPS-01 | Edge | TLS, proxy, headers, WebSocket upgrade and health endpoints | Staging | Yes | Production-equivalent configuration passes |
| OPS-02 | Observability | Logs, metrics, correlation IDs, alerts and sensitive-data review | Staging | Yes | Actionable alerting; no secret/private payload leakage |
| OPS-03 | Recovery | Graceful shutdown, rollback or forward-fix and incident contacts | Staging | Yes | Rehearsed recovery with owner and timing |
| ML-01 | Dataset | Schema, provenance, license/consent, PII, dedupe and splits | Offline | Self-hosted only | Reviewed versioned dataset; frozen independent holdout |
| ML-02 | Quality | Deterministic eval plus independent human rubric | Offline/provider | Assistance only | Approved thresholds with no safety/privacy regression |
| ML-03 | Training | Seeded run, resources, checkpoints, model card and export | GPU | Self-hosted only | Reproducible accepted run; artifact hashes recorded |
| ML-04 | Serving | GGUF quality, latency, memory and concurrency on target hardware | Target hardware | Self-hosted only | Meets approved quality/SLO/resource budget |
| PRV-01 | Provider | Region, retention/training policy, redaction, cost and failure modes | Provider/staging | Provider Assistance only | Explicit approval and policy/SLO evidence |
| REL-01 | Release packet | Evidence links, defects, residual risk, approvals and rollback owner | Review | Yes | All mandatory gates pass or capability is disabled/blocked |

## Current local evidence — 2026-11-15

The detailed record is in `production-readiness-baseline-2026-11-15.md`. Local database lifecycle, HTTP races, the core live browser journey, offline ML checks and a fictional-data restore passed. Core remains `FAIL`; provider, self-hosted ML and production deployment remain `BLOCKED`. Primary blockers are the web boundary failure, realtime fixture composition failures, 100-user realtime p95 of 1,376 ms, and missing target-topology/manual/staging evidence.
