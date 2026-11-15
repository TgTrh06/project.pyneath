# UI renovation delivery contract

Approved scope: responsive frontend, forest/chestnut light and night themes, restrained tactile motion, and existing solo/Circle/Pact API integration. No dependency, backend, schema, migration, seed or deployment changes.

## Identity
Warm parchment and forest/moss surfaces; light wood primary controls and chestnut secondary accents. SVN-Engine remains on prominent display headings, with Be Vietnam Pro for navigation, body and smaller headings. Center public content in a `min(1360px, 90vw)` canvas and limit reading copy to about 680px. The signed-in Wanderer workspace has a full-width sticky navbar, a 224px left navigation rail from 1024px upward, and a flexible content area capped at 1120px with fluid gutters; smaller screens use the existing menu dialog. Prefer spacing and quiet surfaces over decorative frames; controls use 12px corners, content panels 16px, and dialogs 20px. Buttons and navigation use background and outline feedback without underlines, with shallow press depth and 160ms control transitions. Preserve the chestnut Marten gripping the example's thin top rail, centered rising mobile menu, compact reveal-on-scroll public header and borderless footer. Public and app dialogs use a short 200ms entry/exit; reduced motion removes translations.

## Delivery slices
1. Semantic tokens, theme bootstrap, shared controls and states.
2. Public/app navigation, landing content, authentication return destination.
3. Return, server-derived session timer, reconnect, checkout and Open Seed.
4. Private Circle membership/invite controls and Pact state/permission handling.
5. History, milestones, profile/privacy settings and validation.

## Screen/state/API acceptance
| Screen | Required states | API | Acceptance |
|---|---|---|---|
| Return | loading/error, timezone, active session, seed, start | me/return, me/profile, focus-sessions, me/open-seed | One primary action; 280/500 limits remain distinct; stable start retry key |
| Session | loading/error, active, reconnecting, ended, checkout | focus-sessions/:id, check-out, realtime | No automatic join on GET failure; timer uses serverNow; no pause claim; no outcome changes after terminal state |
| Circle | loading/error/empty, owner/member, invite result | circles and membership subresources | Explicit acceptance; private token not logged/persisted; creator excluded by account ID |
| Pact | invited/accepted/declined, scheduled/active/terminal | pacts/:id, respond, cancel, start | Server-authoritative permissions; creator-only start/cancel; explicit join |
| Memory | independent loading/error/empty lists | me/focus-history, me/memory | No ranking/streak; no invented pagination or private text |
| Settings | loading/error, saving, export, delete confirmation | me/profile, me/data-export, me/account | Theme is browser-local; deletion requires password and confirmation |

## Known backend limits
No invite preview/list endpoint or pending Pact inbox. No shared-session intention input endpoint. No persisted presence preference. Expiry finalizes participants as stopped; do not offer outcome editing afterwards. Circle create/update responses differ from GET; refetch detail rather than cast. Backend still authorizes all operations.

## Validation
Web lint, tests, build; 320/390/768/1100/1280/1920 responsive checks; both themes, keyboard/dialog focus, reduced motion, contrast and long Vietnamese text. Local integration only if existing API/database are ready; never reset or migrate a database to obtain evidence. Record any unverified checks explicitly.

## Implementation evidence — 2026-09-16

Later solo-core integration evidence is recorded in [the 2026-09-17 verification](../07-testing/solo-core-verification.md). The API-unavailable note below describes the earlier UI review, not that later integration run.

- The Wanderer workspace layout was checked in isolated headless Edge at 320, 390, 768, 1023, 1024, 1280 and 1920 CSS pixels in both themes using a CSS fixture: no horizontal overflow, a 68px sticky navbar, a 224px sidebar from 1024px, and a 1120px content cap on wide screens. Light/dark mobile and desktop screenshots were visually inspected. A separate mounted `AppLayout` component fixture confirmed desktop navigation, mobile menu opening, Escape closure with trigger focus restored, and navigation from the menu back to focused main content. These checks used fixture content, not a live signed-in backend session.
- The softer 2XL layout was checked in isolated headless Chrome at 320, 390, 768, 960, 1100, 1280 and 1920 CSS pixels in both themes. Public canvas width followed `min(1360px, 90vw)` except for the 16px gutters on narrow phones; no horizontal overflow was observed. The hero stayed on two lines and Marten remained centered over the example's top rail. The demo updated after selection, and Escape closed the public menu and restored trigger focus. At that point, a CSS fixture confirmed the former signed-in shell widths and navigation breakpoint; this was not a signed-in backend session test. The later Wanderer workspace layout replaces those former dimensions.
- Web typecheck/build passed; 19 focused Vitest tests passed (including theme precedence, private invite routes/redaction, stable retry keys, timezone conversion/DST gaps, server timer arithmetic, Open Seed semantics and Pact permissions).
- Isolated headless Edge exercised the running Vite frontend. Landing plus Return, Circles, Circle detail, Pact, Memory, Settings and Session were checked in light/dark at 320, 390, 768, 1100, 1280 and 1920 CSS pixels; no document horizontal overflow was detected. Desktop/mobile screenshots were visually inspected for representative public and app screens.
- Public menu: reduced-motion animation is disabled; Escape closes the dialog and restores focus to its trigger. App mobile menu opens as a centered rising dialog.
- Theme checks: system light/dark changes propagate; explicit light stays light despite dark system preference; manual choice persists through reload.
- Controlled HTTP fixtures exercised Return → start → Session → checkout → Return; the POST start includes an idempotency key, and preserving the seed omits openSeed from checkout. These are frontend fixture checks, not backend integration evidence.
- Fixture invite/auth flow preserved the invite destination across the register switch and required a separate explicit accept action. Generated invite tokens were absent from localStorage; current-link revoke required confirmation and removed the displayed link after success.
- Independent history failure left the milestones section visible. A computed foreground/background scan of representative light/dark screens found no enabled static text below the applicable 4.5:1/3:1 thresholds; this is not a blanket accessibility certification.
- API at the configured local proxy target 127.0.0.1:8081 was not listening. Real cookie/CSRF persistence, two-account backend membership/Pact flows, realtime delivery/reconnect and database deletion/export were not integration-tested. No migration, seed, reset, dependency installation or deployment was performed.
- Physical-device keyboard occlusion and assistive-technology behavior still need device testing; the browser checks above do not substitute for those checks.


## Woodland RPG UI delivery — 2026-11-14

Approved scope: soften the complete frontend using the existing forest scenes and Marten, with shared 12px control / 16px panel / 20px dialog tokens, shallow wood primary buttons, and action/navigation links without underlines. API contracts, backend, data, dependencies, scene assets, and deployment were unchanged. Existing uncommitted work was retained.

### Changed areas

- Shared controls and theme tokens: `shared/styles/global.css`, `renovation.css`, `forest-pages.css`, and `camps.css`.
- Navigation and dialogs: `app/app-forest.css`, `shared/components/site/site.css`, `SiteHeader.tsx`, `shared/components/select-menu.css`, and `shared/scene/lodge.css`. Public menu close timing now matches the 200ms animation. `app/App.tsx` gives the reminder a distinct React key from its sibling layout, fixing the duplicate-key warning observed in Camp.
- Feature styles: landing, Return, Solo/shared Focus, memory, assistance, and Pact reminder CSS. `features/return/StudyDashboard.tsx` assigns shared primary/secondary styles to save/cancel and a class for its spacing; business behavior is unchanged.
- The design foundations document records the palette, shape, control, and motion rules. Paths above are relative to `apps/web/src`.

### Validation evidence

- TypeScript build and web boundary lint passed: 148 files, no runtime cycles, Three.js canvases remain lazy.
- Vitest: 28 files / 114 tests passed using the thread pool. Both Node boundary tests passed. The initial fork run and temporary-directory checks failed because of Windows sandbox process/path errors; successful reruns used the installed tools without installing packages.
- Production Vite build passed after the final edits. Existing dependency annotation warnings from Zod and chunk-size warnings remain (main JS approximately 518kB and lazy LodgeCanvas approximately 1,023kB before gzip).
- Headless Edge checked 120 screen/theme/viewport combinations: Return, Camps, Pacts, Pact detail, Memory, Settings, Camp, landing, login, and register at 320 / 390 / 768 / 1023 / 1024 / 1440px in light and dark. No document horizontal overflow, underlined controls, undersized inspected action targets, or text-contrast failures on inspected enabled controls with an opaque CSS background were found. This is a focused control audit, not a complete accessibility certification.
- The matrix surfaced an existing duplicate React key in Camp. After fixing it, the focused Camp checks and the interaction suite completed without unexpected console/page errors; the original matrix log retains the pre-fix warnings.
- Twelve additional Solo/shared-session layouts passed at 390 / 768 / 1024px in both themes. The interaction suite passed at 320px light/reduced-motion and 1440px dark/normal-motion: Return → Solo → checkout, save failure/retry with draft preservation, study-step editing, sound/recovery panels, Camp management/roster dialogs, memory dropdown keyboard navigation, menu focus restoration, mobile navigation clearance, and auth password visibility.
- Fourteen supplemental state/hover audits passed: disabled and loading actions, Return load failure/retry, empty Camp memory action, Camp dialogs, landing hover/focus/selection, and contextual focus-ring colors in both themes. Pressed primary movement was observed as 2px normally and absent under reduced motion.
- Screenshots were inspected for mobile/desktop Return, landing, Settings, Camp, Solo, shared Focus, checkout, and the recovery panel. Vietnamese long text was used in the focus flow. `git diff --check` passed.

Local evidence is under the ignored `.openai/rpg-ui-qa/` directory, with layout, interaction, focus-layout, and supplemental JSON reports, screenshots, and a before-edit backup of affected files. The browser tests used intercepted HTTP fixtures and static scene preferences; they did not exercise a live backend/database or realtime server. Physical mobile keyboards, screen readers, and 3D performance were not revalidated. No production release was performed.


## Available-width layout delivery — 2026-11-14

The user approved the detailed layout plan after requesting use of the empty right-hand side across all pages. This change builds on the woodland RPG controls above; it does not add product behavior, dependencies, images, API contracts, migrations, or deployment.

### Implementation

- Shared frame: `app/app-forest.css` and `shared/styles/forest-pages.css` use the available workspace up to 1600px, 32/24/16px gutters, content-container queries, and a consistent forest overlay. Auth remains centered at 480px; invite confirmation remains at 720px.
- Return: `features/return/ReturnView.tsx` and `return.css` put the heading above the workspace, keep start/resume/seed controls on the left, and put StudyDashboard, upcoming appointments, and forest summary on the right. Existing conditional loading/profile/session behavior remains intact.
- Lists and detail: `features/camps/CampsView.tsx`, `features/pacts/PactsView.tsx`, and `PactView.tsx` group the main action with its heading, use cards for lists, and split Pact actions from participant/context information.
- Memory and settings: `features/memory/MemoryView.tsx`, `memory.css`, `features/settings/CoreSettingsView.tsx`, and `shared/components/ForestSection.tsx` provide preview/history columns and independent settings sections. Profile and preferences start open; resize does not mount alternate component copies.
- Focus: `features/focus/SessionView.tsx` and `solo.css` replace absolute panel positioning with document flow. Timer and actions share one wrapper so a long intention cannot push the actions away from the timer. Ending/checkout fields and tool dialogs use their available width.
- Camp: `features/camps/CampView.tsx`, `scene/CampLodge.tsx`, and `shared/scene/lodge.css` bound the existing canvas, place actions beside it, and widen management, roster, and composer dialogs. Scene assets and interaction logic are unchanged.
- Landing: `features/landing/LandingPage.tsx` and `landing-forest.css` move the single TrailPreview into the hero's right column and remove the viewport-height requirement.
- `design-system-foundations.md` now documents these layout rules. Source paths above are relative to `apps/web/src`. Existing uncommitted changes were preserved; the before-edit snapshot is in `.openai/wide-ui-before/`.

### Observed validation

- Final TypeScript build and boundary lint passed (148 source files, no runtime cycles, canvas imports remain lazy). All 114 Vitest tests in 28 files passed. Both Node boundary tests passed; the sandbox rerun needed a workspace temporary directory because Windows generated an overlong temporary path. Final Vite build passed with the existing Zod annotation and large-chunk warnings (main JavaScript about 518kB, lazy LodgeCanvas about 1,023kB before gzip). No CSS-value-only tests were added.
- The layout matrix passed 330 route/theme/width combinations across Return, Camps, Pacts, Pact detail, Memory, Settings, Camp, invite, landing, login, and register. Widths: 320, 390, 768, 847, 848, 863, 864, 1023, 1024, 1051, 1052, 1117, 1118, 1440, and 1920px. The intermediate pairs exercise navigation and container thresholds. No page errors, document overflow, underlined inspected controls, undersized inspected action targets, or enabled-control contrast failures against opaque CSS backgrounds were found.
- Sixteen additional state scenarios produced 66 audits across both themes: long Return drafts through resize; Solo/shared timer continuity; ended form drafts; independent settings sections and save; account deletion cancellation; forest draft/conflict/reload/cancel; independent history failure; Camp selection/date preservation; expanded management; long Camp names; create-dialog draft; Pact filtering/pagination; denied Pact; and invite requiring explicit acceptance.
- After the final Focus grouping, 22 additional audits checked eight widths in both themes, confirmed a 24px clock-to-action gap even with a long intention, and checked tool focus restoration, Return resume, seed editor draft/cancel, and profile setup.
- The existing RPG interaction suite passed again: Return → Solo → checkout → Return, save failure/retry, study-step edits, sound/recovery dialogs, Camp dialogs, memory keyboard dropdown, menu focus restoration, mobile footer clearance, and auth controls. The supplemental suite passed 26 audits including shared Focus, disabled/loading/error/retry, and landing hover/focus/selection. Reduced motion was exercised alongside normal motion.
- A separate software-rendered WebGL check rendered the bounded Camp canvas at desktop/mobile sizes without remounting it and opened/closed the composer. This verifies rendering and resize behavior, not physical GPU performance or every canvas hit target.
- Representative screenshots were visually inspected for Return, memory, settings, landing, Focus, checkout, Camp, and mobile composer. Original user screenshot and after screenshots are in `.openai/wide-ui-qa/`; machine-readable reports are `layout-results.json`, `state-results.json`, `final-focus-return.json`, and `3d-result.json`.

Browser flows used intercepted HTTP fixtures with realtime deliberately disconnected. They do not establish real backend/database persistence or multi-account realtime behavior. Physical mobile keyboard and screen-reader checks remain outside this desktop-browser verification; a short viewport was used for form reflow. No production release was performed.


## Keep memory summaries in the Memory tab — 2026-11-14

Approved follow-up: remove the personal/shared memory summary sections from Return and Camp to reduce distraction. Return still shows study progress and upcoming appointments; Camp still shows its operational controls and scene status. The Memory tab retains personal/shared milestones, history, pagination, and arrangement editing. Scene growth, Camp access revalidation, and the existing Focus ending notice remain unchanged.

Changed files (relative to `apps/web/src`):
- `features/return/ReturnView.tsx`, `return.css`: remove the personal summary mount/import and its spacing rule.
- `features/camps/CampView.tsx`, `scene/CampLodge.tsx`: remove the Camp summary and its unused retry prop; retain scene data and loading/error guards.
- `features/memory/PersonalForest.tsx`, `public-api.ts`, `memory.css`: remove the unused personal summary implementation/export/styles; retain provider, journal, and Focus arrival notice.
- `features/memory/CampForestSummary.tsx` removed. Its three obsolete summary tests were removed; the still-applicable scene placement test moved from `CampForestSummary.test.tsx` to `ForestGrowth.test.tsx`.
- `shared/scene/lodge.css`: remove summary-only styles and its entry from the shared token selector.
- Design foundations updated to document where summaries belong. Existing uncommitted work was preserved.

Validation: TypeScript and boundary lint passed (147 source files); all 111 Vitest tests in 28 files and both Node boundary tests passed. Vite build passed with the existing Zod annotation and large-chunk warnings. `git diff --check` passed. No CSS-value-only tests were introduced.

Headless Edge completed 68 focused audits in light/dark: Return, Camp, personal Memory, and Camp Memory at 320/390/768/1024/1440/1920px; absence of summaries in empty/loading/error states; start/resume; Camp composer, roster, and management with Escape/focus restoration; history pagination; arrangement draft preservation through resize and successful save. No page errors or inspected overflow/underline/target-size/opaque-control-contrast failures were found. Mobile Return footer clearance was verified. Desktop Return and mobile Camp screenshots were visually inspected; the panels naturally collapse after the summary is removed.

Evidence and screenshots: `.openai/memory-sections-qa/results.json` and adjacent PNGs. Before-edit copies: `.openai/memory-sections-before/`. These are frontend HTTP fixture checks with static scenes, not live-backend or real-device verification. No backend/database/dependency changes or production deployment were performed.


## Signed-in workspace width — 2026-11-14

Approved follow-up: cap the signed-in working area at 1200px including gutters (1136px of content with 32px desktop gutters), centered within the space after navigation. The limit applies to Return, management pages, bounded Camp detail, and Solo/shared Focus. Existing container queries still determine one or two columns from the actual available width; dialogs, auth, invite, public landing, and the scenic backgrounds retain their own sizes. This keeps short forms and sparse cards from stretching across a 1600px work area. No route, API, persistence, dependency, or scene asset changed. Existing uncommitted work was preserved.

Affected CSS: `app/app-forest.css`, `shared/styles/forest-pages.css`, `features/return/return.css`, `shared/scene/lodge.css`, and `features/focus/solo.css`. The design foundations document states the new cap. The before-edit snapshot is under `.openai/workspace-width-before/`.

Validation: TypeScript and web boundary lint passed (147 source files); all 111 Vitest tests in 28 files and both Node boundary tests passed. Vite build passed with the existing Zod annotation and large-chunk warnings. A headless Edge audit covered 130 route/theme/viewport combinations across Return, Camps, Pacts, Memory, Settings, Camp, and Focus at 320, 390, 768, 1024, 1051, 1052, 1199, 1200, 1440, and 1920px. The working area measured 1200px at 1440 and 1920px, and no audited page had horizontal overflow, underlined controls, undersized action targets, or opaque-control contrast failures. Return and Camp screenshots were visually inspected in light and dark themes. The Return to Focus flow, timer continuity through resize, and dialog focus restoration were checked with isolated HTTP fixtures. Results and screenshots are in `.openai/workspace-width-qa/`. This browser check does not establish live backend behavior or physical-device performance. `git diff --check` passed; no production release was performed.


## Landing-width workspace, top navigation and Dashboard — 2026-11-14

Approved follow-up: replace the 1200px cap and desktop sidebar with a forest top bar and a 1600px content area aligned to landing sections. The desktop top bar carries Return, Dashboard, Camp, Pacts, Memory and Settings from 1200px upward. Narrower tablets use the account menu; phones keep four frequent destinations plus Menu in a five-item bottom bar. Camp uses the same top bar with a separate contextual back action. Focus retains its compact in-session toolbar. Return now keeps the start/resume flow, Open Seed, upcoming appointments and a quiet link to Dashboard; it no longer loads study statistics. Existing drafts and route behavior remain.

Dashboard owns the existing recent-step editing, pagination, unrecorded Solo sessions and Open Seed link. It adds 7/30-day summaries, daily self-reported step bars with an accessible data table, equal-length prior-period comparisons, and closed Solo/Camp session counts. The API extends the existing private `/me/study-dashboard` response additively with local-date buckets. Its existing 7-day counters remain available for compatibility; the charts use the requested period's buckets. Steps use their original recorded date after edits. Session totals include the signed-in account's completed sessions by start date. No new table, migration, dependency, reward, ranking, or production release was involved.

Affected source: `apps/web/src/app/{App.tsx,AppLayout.tsx,router.ts,routePaths.ts}`, `shared/types/domain.ts`, `shared/api/clients/focus.ts`, `features/dashboard/*`, `features/return/{ReturnView.tsx,return.css}`, `app/app-forest.css`, `shared/styles/forest-pages.css`, `shared/scene/lodge.css`, `features/focus/solo.css`, `packages/contracts/src/focus.ts`, and the Focus API controller, service, port and repository. The design foundations and route/aggregation tests were updated. Prior uncommitted changes were preserved.

Validation: web and API lint passed (151 and 129 TypeScript files respectively); web Vitest passed 29 files/112 tests plus two Node boundary tests. The API suite passed 102 tests with 14 pre-existing database-gated skips. The focused PostgreSQL test ran against a unique temporary schema in the local `btp_review` database and passed account isolation, 7/30-day series, local-midnight boundaries, edits and deletion cascade. Web/API builds passed with the existing Zod annotation and large-chunk warnings. Headless Edge audited 140 page/theme/viewport combinations at 320, 390, 768, 1023, 1024, 1199, 1200, 1440, 1600 and 1920px; no audited document overflow, control underline, undersized target or opaque-control contrast failure occurred. At 1440 and 1920px, Return, Dashboard and Camp content measured 1376 and 1600px. The Dashboard period switch, menu focus restoration and Return → Focus flow with timer continuity passed in fixture checks. Representative desktop and mobile screenshots were inspected. Evidence is under `.openai/dashboard-topbar-qa/`; the frontend browser checks use intercepted HTTP fixtures and do not establish physical-device or live multi-account behavior. No production deployment was performed.


## Content grouping, disclosure and Account dropdown — 2026-11-14

Approved follow-up: distinguish text-heavy areas across Return, AI assistance, Dashboard, Focus ending, Camp, Pact, Memory, Settings, and landing FAQ with spacing, light surfaces and thin borders. Return's optional assistance moves to the context column on wide screens and follows the start form on mobile. The Return appointment disclosure starts closed when empty and open when populated; user toggles survive unrelated rerenders. Settings sections also retain user toggles. Shared and feature-specific summaries use one clear indicator, at least a 44px target, and visible focus. FAQ, Camp member/management, scene settings, Dashboard data, and Return options use the same open/closed cues.

The five primary destinations are Return, Dashboard, Camp, Pacts and Memory. Settings is removed from primary navigation and is available with Sign out in the two-item Account dropdown. Desktop uses one top row, tablet a second top-bar row, phones a five-item bottom bar, and immersive Camp keeps a compact five-item top row on phones. Account closes on a second click, outside click or Escape, with trigger focus restored on Escape. The browser-local theme choice is in Settings; existing scene controls remain available.

Changed frontend areas: `app/AppLayout.tsx`, `app/app-forest.css`, `shared/components/{ForestSection.tsx,FirstTimeHint.tsx}`, shared and scene styles, Return and assistance JSX/CSS, Dashboard JSX/CSS, Settings preferences, Pact list JSX, memory, Focus and landing CSS. The design foundations document records the new rules. Routes, API contracts, backend, database, dependencies and scene assets were not changed for this follow-up; prior uncommitted work was retained.

Final validation: TypeScript build and web boundary lint passed; 29 Vitest files/112 tests and both Node boundary tests passed. Vite build and `git diff --check` passed. Headless Edge audited 104 route/theme/viewport combinations at 320, 390, 768, 1024, 1199, 1200 and 1440px with no audited document overflow, underlined control, undersized visible target, opaque-control contrast failure or page error. Twelve supplemental screens covered Pact detail and Camp invite at 320, 768 and 1440px in both themes, including keyboard open/close for Pact detail. Four additional checks exercised AI context and suggestion with intercepted responses at 390px dark and 1440px light. Eight flow checks exercised Return → Focus → checkout → Dashboard, Camp nested disclosures/dialog focus, settings state across a theme rerender, and Return/landing disclosure keyboard activation at 320px light and 1440px dark. Representative screenshots were inspected. Evidence is under `.openai/account-disclosure-qa/`; fixture scripts are `.openai/account-disclosure-check.cjs`, `.openai/pact-detail-check.cjs`, `.openai/assistance-layout-check.cjs`, and `.openai/final-flow-check.cjs`.

The browser checks use isolated HTTP fixtures, static scene preferences and a local Vite server; they do not verify live backend/realtime delivery or physical-device screen reader and keyboard behavior. Reduced motion was enabled in the browser matrix. No production release was performed.
