## 1. Planning and Legacy Audit

- [x] 1.1 Confirm current baseline is `main@b350a30`
- [x] 1.2 Confirm unrelated dirty/untracked items remain out of scope
- [x] 1.3 Create OpenSpec change `complete-daily-weekly-reporting-legacy-features-v1`
- [x] 1.4 Audit legacy branch status and HEAD without merge or checkout
- [x] 1.5 Inventory legacy export, AI, evaluation, final-review, route, frontend, and migration files
- [x] 1.6 Compare current 017 schema with legacy migrations and SQL dump
- [x] 1.7 Record schema conclusion that 018 is only needed if implementation finds a real gap
- [x] 1.8 Document no direct merge, no SQL dump import, no file platform, no PDF, no 71-item change boundaries

## 2. Schema, Config, and Dependencies

- [x] 2.1 Decide whether export uses explicit `exceljs` dependency or current OOXML utilities
- [x] 2.2 Add only necessary API dependencies and lockfile updates
- [x] 2.3 Add report export template/root config and AI endpoint/model/key/enable config
- [x] 2.4 Keep AI disabled-safe by default when key/config is absent
- [x] 2.5 Confirm `018_extend_daily_weekly_reporting_legacy_features.sql` is not needed because 017 has the required schema elements
- [x] 2.6 Confirm no 018 execution is needed for this implementation

## 3. Backend Export Implementation

- [x] 3.1 Port/adapt daily report export DTO and service
- [x] 3.2 Add daily report export endpoint with current auth and business errors
- [x] 3.3 Port/adapt weekly report export DTO and service
- [x] 3.4 Add weekly report export endpoint with current auth and business errors
- [x] 3.5 Port/adapt center daily report export service
- [x] 3.6 Add center daily export endpoint with current center-scope permissions
- [x] 3.7 Ensure export failures do not leak local template paths
- [x] 3.8 Ensure exports do not call file platform, create PDF, or write stage-document generated files

## 4. Backend AI and Scoring Implementation

- [x] 4.1 Port/adapt weekly AI prefill compose service
- [x] 4.2 Add AI compose endpoint with basisHash check and disabled-safe response
- [x] 4.3 Port/adapt weekly evaluation service with AI-or-rule scoring
- [x] 4.4 Add weekly evaluate endpoint with permission and state gates
- [x] 4.5 Add final-review endpoint with permission and state gates
- [x] 4.6 Clear or invalidate AI/final scoring when weekly content is returned, edited, or resubmitted
- [x] 4.7 Ensure AI output can only alter draft suggestion text, never facts, status, approval, or submission
- [x] 4.8 Ensure no API key is committed or hard-coded
- [x] 4.9 Add authenticated weekly AI capability endpoint without leaking endpoint/model/key

## 5. Frontend Implementation

- [x] 5.1 Add report export API client functions
- [x] 5.2 Add daily report export button and export loading/failure states
- [x] 5.3 Add weekly report export button and export loading/failure states
- [x] 5.4 Add center daily report export button and export loading/failure states
- [x] 5.5 Add weekly AI compose button with unavailable/disabled states
- [x] 5.6 Add weekly scoring panel and evaluate action with permission/status messaging
- [x] 5.7 Add final-review form/action with permission/status messaging
- [x] 5.8 Reuse current App/router/API style and do not bring back legacy app shell
- [x] 5.9 Disable weekly AI compose when AI capability is unavailable and show rule-fallback messaging

## 6. Tests

- [x] 6.1 Preserve existing 25 `test:reports` tests
- [x] 6.2 Add tests for daily report export permission and controlled failure
- [x] 6.3 Add tests for weekly report export permission and controlled failure
- [x] 6.4 Add tests for center daily export permission and center scoping
- [x] 6.5 Add tests for AI unavailable behavior
- [x] 6.6 Add tests that AI compose returns draft suggestions and does not submit
- [x] 6.7 Add tests for weekly evaluation permission and state gates
- [x] 6.8 Add tests for final-review permission and state gates
- [x] 6.9 Add tests for return/resubmit scoring invalidation behavior
- [x] 6.10 Add route/repository-path export permission tests for daily, weekly, and center daily exports
- [x] 6.11 Add tests for AI capability unavailable/configured behavior and configuration non-leakage

## 7. Manual Verification

- [x] 7.1 Manually verify daily report create/save/submit/backfill/image attachment still works
- [x] 7.2 Manually verify daily report export
- [x] 7.3 Manually verify weekly deterministic prefill, submit, return, resubmit, approve
- [x] 7.4 Manually verify weekly export
- [x] 7.5 Manually verify weekly AI unavailable or AI configured path
- [x] 7.6 Manually verify weekly scoring and final review
- [x] 7.7 Manually verify center daily query, schedule config, and export
- [x] 7.8 Manually verify employee, center manager, general manager, platform admin, and no-permission behavior

## 8. Regression and Validation

- [x] 8.1 Run `cd digital-platform-api && cmd /c npm.cmd run test:reports`
- [x] 8.2 Run `cd digital-platform-api && cmd /c npm.cmd run check`
- [x] 8.3 Run `cd digital-platform-web && cmd /c npm.cmd run build`
- [x] 8.4 Run `cmd /c openspec validate complete-daily-weekly-reporting-legacy-features-v1 --strict`
- [x] 8.5 Run `cmd /c openspec validate --all --strict`
- [x] 8.6 Run `cmd /c openspec list`
- [x] 8.7 Confirm initiation-stage smoke does not regress
- [x] 8.8 Confirm no file-platform integration, no PDF, no 71-item change, no initiation-flow rollback

## 9. Completion Boundaries

- [x] 9.1 Confirm OpenSpec tasks are all checked
- [x] 9.2 Confirm no direct legacy branch merge occurred
- [x] 9.3 Confirm `digital_platform_with_data.sql` was not imported
- [x] 9.4 Confirm unrelated dirty/untracked items were not processed
- [x] 9.5 Stop before archive/commit and return for review
