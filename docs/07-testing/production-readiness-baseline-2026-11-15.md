# Production readiness baseline — 2026-11-15

This record freezes the first local, offline observation for the approved production-readiness test plan. It is evidence of the starting state, not a release decision.

## Source identity

- Branch: `ai`
- Commit: `8c7be19b37532fc16560fdaef98ed732dfb6a83f`
- Scope: the complete working tree, including tracked and untracked product changes present at the start of the run
- Hosted providers, paid inference, GPU training, staging and deployment: not exercised

The working tree was already dirty. Existing product changes were preserved. Test results below therefore apply to this exact working-tree state and must be rerun if it changes.

## Baseline results

| Area | Result | Evidence and limitation |
| --- | --- | --- |
| Web component tests | 115 passed | `vitest run src` |
| Web architecture | Failed | `App.tsx` imports `features/pacts/PactRealtime.tsx` directly instead of the feature public entry |
| API tests without PostgreSQL | 86 passed, 17 failed, 14 skipped | Realtime gateway suites cannot construct `PresenceGateway` because their test module does not provide `PACT_ACCESS`; PostgreSQL suites were intentionally skipped without a disposable target |
| Tooling/evaluation scripts | 16 passed | All root `scripts/*.test.cjs` were run explicitly; the old root test command only ran the audit test after workspace tests |
| ML offline unit tests | 54 passed, 1 error | Zod/protocol agreement rejects the current generated protocol as drifted from the built contracts |
| Web lint | Failed | Same cross-feature import violation as the web architecture test |
| API lint | Passed | TypeScript test/tooling checks and module boundaries passed |
| Web build | Passed with warnings | Existing Zod annotation and large chunk warnings remain; largest reported chunk was about 1.02 MB before gzip |
| API build | Passed | Nest build completed |

## Initial defects

1. **PR-BL-001 — Web boundary regression (P1 release blocker).** The application imports the Pact realtime component through a private feature path. This breaks both the web lint and architecture test.
2. **PR-BL-002 — Realtime test composition regression (P1 test blocker).** Seventeen realtime tests fail before exercising behavior because `PACT_ACCESS` is absent from the affected test modules. This prevents the suite from proving logout, revocation, authorization and snapshot behavior.
3. **PR-BL-003 — ML protocol drift (P1 ML gate blocker).** The exported Assistance protocol does not match the current shared contract. The drift must be reviewed and regenerated deliberately before any dataset freeze or model evaluation.
4. **PR-BL-004 — Database coverage not executed (P1 evidence gap).** Fourteen PostgreSQL/HTTP tests were skipped because no marked disposable database was supplied for this baseline.
5. **PR-BL-005 — Web bundle warning (P2 performance risk).** Production build succeeds, but the main 3D lodge chunk is about 1.02 MB before gzip and needs measurement against the approved lab targets.

## Harness correction in this slice

- Root tooling tests are now a named, mandatory phase and cover every `scripts/*.test.cjs` file.
- API script tests run before the compiled API suite.
- PostgreSQL and live HTTP preflights require a loopback database named for testing and the connection marker `application_name=pyneath-test-suite`.
- The connected database identity is verified before any integration suite starts.

Product defects in this baseline are recorded rather than silently repaired by the test-harness change. Each affected gate remains failed or blocked until a focused fix is approved and verified.

## Executed local verification

The approved offline/local plan was then exercised against disposable services. No paid provider, GPU, remote service or existing local database was used.

| Gate | Result | Evidence |
| --- | --- | --- |
| Test-target guard | Passed | 3/3 tests; rejects non-loopback targets, ordinary local databases and connections without `application_name=pyneath-test-suite` |
| Root evaluation/tooling | Passed | 18/18 after adding the restore/load utilities; all `scripts/*.test.cjs` are part of the root test command |
| PostgreSQL API integration | Failed overall | 114 passed, 17 failed, 3 skipped. All database suites enabled by `PYNEATH_TEST_DATABASE_URL` passed; 17 realtime fixture failures remain PR-BL-002. The three live HTTP files require a running API and were run separately. |
| Live HTTP lifecycle | Passed | 24/24 assertions across Solo, Pact lists/lifecycle and Camp invitations against a migrated PostgreSQL 17 database |
| Browser matrix, isolated landing | Passed | 8 passed and 12 applicability skips across Chromium, Firefox, WebKit, mobile Chrome and mobile Safari. Keyboard skip-link activation, mobile dialog/focus restoration, no horizontal overflow and the primary CTA were exercised. |
| Automated accessibility | Passed for scanned page | Axe reported no WCAG A/AA violation on the deterministic landing state. This does not replace NVDA, VoiceOver or physical-device checks. |
| Live browser core journey | Passed | Chromium with real API/PostgreSQL: register, profile timezone, Solo start, early checkout, partial study step, private note, Open Seed, return view and Dashboard projection |
| ML protocol | Passed after regeneration | Exported v2.1 protocol checksum now matches the current shared contract source: `e660f112c092c8f4cf8d28c10dd0673ee3a6144adfdaf878c8b1b373b47f61a4` |
| ML offline suite | Passed | 55/55 architecture/review/training/evaluation tests, 10/10 dataset validator tests and the 50-file boundary/cycle check |
| Backup/restore | Passed locally | PostgreSQL custom backup restored into a second marked disposable database; exact columns, named constraints and row counts matched across 19 tables. Backup took about 0.34 seconds and restore about 0.57 seconds for this small fictional dataset. |
| 10-user load smoke | Passed | 100 measured HTTP requests with no errors; read p95 37 ms, Camp/Pact read p95 22 ms, write p95 21 ms; 30 sockets, realtime propagation p95 170 ms |
| 100-user/300-socket indicative load | Failed realtime threshold | 600 HTTP requests with no errors; core read p95 208 ms, Camp/Pact read p95 172 ms, profile read p95 134 ms, write p95 191 ms. Socket connect p95 was 437 ms; presence propagation p95 was 1,376 ms against the 1,000 ms gate. |

The 100-user run used API, PostgreSQL and the load generator on one host. Docker reported 12 CPUs and about 8 GB total memory, while the approved target requires separate API and database allocations of 2 vCPU/4 GiB each plus a separate load generator. Existing user containers were left running. The load result is therefore diagnostic and cannot prove the production topology; its realtime failure remains actionable and must be reproduced after the target environment exists.

The local backup artifact contains fictional test data only and is ignored by Git at `.openai/pyneath_test_20261115.dump`; SHA-256: `C5E1A672F4BFD09F8778FE4492CF141DB08E36461982F9A15A601462DCA60948`.

## Additional defects and open gates

6. **PR-BL-006 — Realtime propagation exceeds the target under the indicative 100-user burst (P1 performance blocker).** All 300 subscribers received the expected presence event, but p95 was 1,376 ms. Reproduce on the fixed 2 vCPU/4 GiB API and database topology with a separate load generator before tuning or release.
7. **PR-BL-007 — Target load environment unavailable (P1 evidence gap).** The current host cannot allocate the approved 4 GiB to both API and PostgreSQL while preserving existing user services and running the generator. The 30-minute hold, two-hour soak, post-stress recovery and resource ceilings remain unverified.
8. **PR-BL-008 — Manual accessibility/device evidence missing (P1 release blocker).** NVDA, VoiceOver, physical Android/iPhone, real Safari and 200% zoom across all P0 flows are not verified by Playwright emulation.
9. **PR-BL-009 — External production controls unverified (P1 release blocker).** TLS, reverse proxy, secure cookies, WebSocket upgrade, secrets, alert routing, provider retention and production backup cadence require an approved staging topology.
10. **PR-BL-010 — Model and provider quality gates incomplete (capability blocker).** Offline pipeline logic passes, but independent holdout authorship, complete human scoring, GPU training, GGUF hardware benchmark and any paid quality-v2/provider run remain absent. Core can still be evaluated with Assistance disabled.

## Current release decision

| Capability | Decision | Reason |
| --- | --- | --- |
| Core web/API | **FAIL** | Web architecture violation, realtime test composition failure, manual device/accessibility evidence gap and incomplete target-topology performance evidence |
| PostgreSQL data lifecycle | **PASS locally / BLOCKED for production** | Database and live HTTP suites plus local restore pass; provider backup/retention and target RPO/RTO rehearsal are not configured |
| AI provider integrations | **BLOCKED** | Offline adapters and budget tooling pass, but no provider/model is authorized or fully human-reviewed for production data |
| Self-hosted model | **BLOCKED** | Offline pipeline gates pass; reviewed dataset, independent holdout, GPU run, export and hardware serving evidence are missing |
| Production deployment | **BLOCKED** | No approved staging/production infrastructure exists and deployment was outside this authorization |

All disposable API processes and PostgreSQL containers created for these runs were stopped and removed after evidence collection. Existing local PostgreSQL containers and their volumes were not changed.
