# AI Assistance quality v2 — candidate and evaluation gate

**Status, 2026-11-13:** candidate implementation and mock regression are ready. **No v2 inference has run and no new Beeknoee credit has been used.** The v1 baseline remains [unchanged](assistance-quality-v1-results.md).

## Candidate hypothesis

The Luna candidate uses prompt `pyneath-assistance-v2.4-beeknoee-v3` and quality policy `assistance-policy-v1.1`. It is active only with `API_ASSISTANCE_QUALITY_V2=true` and Beeknoee; the default Beeknoee prompt is `pyneath-assistance-v2.2-beeknoee-v2`. The shared v2.2 prompt specializes every provider in student learning for IT and software engineering; the v2.4 candidate adds natural Vietnamese tone and tighter grounding in the stated technical task. It gives a first action when stuck and avoids inventing notes/documents for an underspecified Open Seed. A narrow output guard turns self-delegating suggestions such as “write down a small next task” into a manual fallback without a second model call. The UI tells the user to add a sentence describing the task; it preserves their input and keeps quota/timeout wording distinct. This domain prompt change has only mock regression coverage; it has not been evaluated with fresh model inference, so no quality improvement is claimed.

This is a **hypothesis**, not a measured quality gain. A fallback is valid when context is genuinely insufficient, but the final report must also show suggestion coverage on sufficiently informative cases. Model behavior, case pass rate and impact on previously good cases are still unknown.

## Baseline human review — required before paid calls

The [blind worksheet](evidence/assistance-quality-v1-human-review.md) contains the 48 synthetic v1 requests, selected context and recorded response without the assistant's previous scores or development/holdout labels. A person should fill all 48 `Điểm` fields with `pass`/`fail`, all `Lý do` fields, plus reviewer and date. The unobserved `stuck_recovery-12` is a required failure. Do not change the case text or regenerate the worksheet after filling it. `scripts/assistance-eval-v2-run.cjs` compares the worksheet with its frozen template and rejects an incomplete or altered review before inference. Candidate results will use the **same rubric and reviewer** for a paired comparison; the old 38/48 remains assistant-provisional until the review is complete.

## Offline validation completed

- API tests: 97 passed, 13 optional DB tests skipped. Includes one-call Luna guard, context access, response errors and OpenRouter regression.
- Web tests: 113 Vitest and 2 architecture tests passed. New fallback copy test verifies insufficient-context guidance and separate quota wording.
- API/web lint and builds passed. Vite emitted its existing Zod annotation and large-chunk warnings.
- V2 ledger/runner tests: 4 passed for a durable 60-call/100đ cap, 12/48 phase limits, unique probe/final IDs, single-writer lock, Usage mismatch rejection, and mandatory human baseline gate.
- The v1 mock matrix passed 12/12 again with the candidate code; rerun before the paid probe if the source changes. No real-user screen-reader or participant test is claimed here.
- Temporary local browser preview with mocked config only: at 320px in light and dark, the new guidance was visible and `document.documentElement.scrollWidth` remained 320px; Tab focused the request button. The test page/server were removed. This is not a screen-reader check.

## Paid evaluation runbook after the human review

1. Check clean local-only environment, selected Beeknoee/Luna `json_schema`, `API_ASSISTANCE_QUALITY_V2=true`, fake accounts, and an isolated PostgreSQL database `pyneath_assistance_eval_v2` on `127.0.0.1:55438`. Apply only existing migrations there. `scripts/assistance-eval-v2-server.cjs` refuses any other DB, API port (`127.0.0.1:18087`), model or diagnostics setting.
2. Read Management balance, current price and Usage with `node scripts/assistance-eval-v2-run.cjs preflight`; verify no unrelated account usage. Stop if the price/fee cannot be bounded. No OpenRouter call.
3. Start the local API with the v2 server hook. Run `node scripts/assistance-eval-v2-run.cjs probe` for 12 development cases: eight v1 problem cases and four controls. Inspect each response and stop for authorization, safety, schema or control regression.
4. If probe is acceptable, run `node scripts/assistance-eval-v2-run.cjs final` on the frozen 48 v1 content cases. Holdout cases are sent only in this final stage. Each probe/final case has a distinct ledger ID; paid attempts are never retried automatically.
5. Ledger is ignored under `.openai/assistance-quality-v2/`. Stop at **60 provider attempts or 100đ**, whichever comes first. Reserve before sending from the current price and max tokens; reconcile Management Usage after every attempt. Unknown charges, timeout or account balance drift halt further inference. If conservative reservation prevents finishing all 48 final cases, report missing cases; do not exceed the cap.
6. Grade candidate responses against the same rubric. Report paired case changes, each capability, development/holdout, suggestion coverage for informative requests, fallback categories, latency, Usage cost and missing responses. Keep candidate only if human-reviewed content reaches at least 42/48, each capability at least 13/16, all 12 technical mock cases pass and no serious authorization or autonomy regression occurs. Otherwise keep the v1 prompt for demo and document the failure.

The v1 holdout was written by the same author and is already visible in historical results. Even a passing v2 score on these nine cases is an internal regression result, not an independent accuracy estimate. A separately authored holdout and independent scoring remain later work. After any run, stop the temporary API and remove the isolated test database; retain only the versioned report and ignored local ledger for audit.
