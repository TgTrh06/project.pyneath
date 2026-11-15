# ADR-0033 — Required account-owned Assistance context

Status: accepted for local implementation on 2026-11-15 by `accept plan`. No deployment or paid verification authorized.

## Decision

Every UI suggestion uses `POST /api/v1/me/assistance`. Before quota reservation and inference, the service reads both the authenticated account's current Focus context and Open Seed. Both keys are required in a validated snapshot; `null` means the source was read successfully and has no data. No history or other participant's content is added. The existing own-context reader controls the Focus projection; Seed exports text only.

A failed, malformed or incomplete read, or a read exceeding three seconds, returns `context_unavailable`. It does not contact the provider or reserve an Assistance request. Late read completion cannot trigger inference. Each explicit retry reads fresh data. The snapshot reflects reads during that request, not a transactionally synchronized cross-module snapshot.

All configured adapters receive the same snapshot. Gemini now receives it in the initial structured-output request, with no model-selected tools or second inference round. OpenAI and local adapters also include context. Beeknoee/OpenRouter retain their bounded single-request design. Adapter-only offline evaluations may omit synthetic context; the application's service path cannot. Context and input remain untrusted data, never executable instructions. Existing output validation, quota, safety checks, authentication and CSRF apply. Logs contain outcomes and numeric usage, never source content.

## UI and contract

Remove the preview, selection checkboxes, grant tokens and five-minute expiry. The UI states that clicking a suggestion sends the entered text, current Focus state and Open Seed through the configured provider. Loading a page does not request AI. Editing, choosing, saving and starting/stopping a session remain separate explicit actions.

The metadata endpoint `/me/assistance/tools/config` remains for provider disclosure. Retire `GET /me/assistance/tools/context` and `POST /me/assistance/tools`; remove grant schemas. Replace `context_expired` with `context_unavailable`. This supersedes the selected-grant requirement in ADR-0031/0032 and Gemini's earlier optional tool-selection flow. Web/API/contracts must be updated together; stale clients need a refresh. Existing historical evaluation evidence is unchanged and does not validate this new behavior.

## Verification and rollback

Use isolated tests for ownership, client injection, unauthenticated/CSRF requests, absent sources, changed sources, invalid/failed/timed-out reads, provider payloads, no quota/provider on read failure, and UI retry/manual-input preservation. Verify desktop/mobile with mocked data; do not send real account content to external models for validation.

Evaluation runners use the same primary endpoint and reset synthetic Seed between cases. Historical `stale_grant` fixture IDs are retained for evidence stability; the technical mock now checks failed mandatory reads. These cases must be identified as different behavior when comparing evaluations.

No database migration or new dependency. Roll back the matching Assistance web/API/contracts changes together, preserving unrelated work. Deployment, process restarts in production and paid inference require separate authorization.
