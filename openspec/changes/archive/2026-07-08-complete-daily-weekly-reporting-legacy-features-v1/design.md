## Context

Current main is `main@b350a30`. The completed reporting slice includes daily report save/submit/backfill, daily image attachments, weekly create/edit/submit, deterministic daily-to-weekly prefill, weekly approval, center daily query/schedule, and the core reporting schema in `017_create_daily_weekly_reporting_core.sql`.

The legacy reference branch is `D:\0707\Digital-transformation` at `feat/weekly-report-prefill-from-daily@cccfffc`. It remains a read-only source branch. This change must not merge or checkout that branch over current main. The deferred legacy features are concentrated in:

- Backend services: `dailyReportExportService.js`, `weeklyReportExportService.js`, `centerDailyReportExportService.js`, `weeklyReportPrefillAiService.js`, `weeklyReportEvaluationService.js`.
- Backend routes: additional daily export, weekly AI compose/evaluate/final-review/export, and center daily export endpoints.
- Backend repositories: export DTO builders, weekly evaluation target, evaluation persistence, final review persistence, and overview fields.
- Frontend APIs/pages: export download calls, AI compose action, weekly evaluate/final-review controls, and center daily export controls.
- Legacy migrations/SQL: weekly AI/final-review columns from legacy `017` and `022`, plus approval fields from legacy `027`.

Current `017_create_daily_weekly_reporting_core.sql` already includes the old branch's weekly AI/evaluation/final-review columns and approval history table. Therefore this change should not add `018_extend_daily_weekly_reporting_legacy_features.sql` unless implementation discovers a concrete schema gap. The local SQL dump `digital_platform_with_data.sql` remains a sample/reference only and must not be imported to overwrite the current database.

## Goals / Non-Goals

**Goals:**

- Complete the legacy reporting features through a manual, current-main-aware port.
- Provide Excel export for daily report, weekly report, and center daily report.
- Provide AI weekly prefill wording assistance behind explicit configuration and safe unavailable behavior.
- Provide weekly AI/rule scoring and final manual review with backend permission/state gates.
- Keep export/AI/score failures as business errors or controlled unavailable responses rather than 500s where the failure is expected.
- Add tests and manual verification coverage while preserving the 25 existing report tests and initiation-stage smoke.

**Non-Goals:**

- Do not merge the legacy branch.
- Do not import or apply the full SQL dump.
- Do not integrate the file platform.
- Do not generate PDF.
- Do not change v20260629 / 71 stage-document item count.
- Do not alter the initiation-stage workflow or template-file generation behavior.
- Do not handle unrelated dirty/untracked files.

## Decisions

### Decision 1: Use current main as the integration base

Legacy files can be used as references, but global entry points (`app.js`, route files, `App.vue`, router, styles, HTTP client, auth, error handler) must be hand-merged into current main. This preserves the b350a30 reporting slice fixes, including submitted daily immutability, weekly submitter tracking, hash-router behavior, center-manager weekly approval by GM, and the current project/initiation routes.

Alternative rejected: direct merge or wholesale file replacement, because the legacy branch predates current initiation changes and contains old migration numbering and user schema assumptions.

### Decision 2: Keep schema reproducible through current migrations

Current `017_create_daily_weekly_reporting_core.sql` already contains `ai_score`, `ai_evaluated_at`, `ai_evaluation_source`, `ai_evaluation_error`, `final_score`, `final_grade`, `final_comment`, `final_reviewed_by_user_id`, and `final_reviewed_at`. These satisfy the legacy scoring/final-review persistence needs. No `018` migration should be created unless implementation finds a field/table missing from 017.

If an `018` is needed, it must be schema-only, idempotent, numbered after 017, manually executed locally, and verified by information-schema checks. It must not import sample data.

### Decision 3: Export remains internal Excel download

Exports generate `.xlsx` workbooks on demand and stream them through authenticated API responses. The implementation uses current main's internal OOXML zip utilities (`ooxmlZip`, `ooxmlRenderer`, `simpleXlsxWorkbook`) instead of adding `exceljs`, because the legacy branch used `exceljs` without declaring it. No new npm dependency or lockfile update is required for this slice. Export files are generated into a controlled temporary/internal export location and cleaned up after download where practical.

Exports must not call the file platform, create PDF, or add stage-document records. Missing templates or generation failures should return a controlled report export error.

### Decision 4: AI is optional and disabled-safe

AI prefill/wording and weekly evaluation must be controlled by environment configuration. Missing API key/configuration must produce a predictable unavailable response and the frontend must hide or disable AI-only actions. The backend exposes an authenticated `GET /api/weekly-reports/ai-capability` endpoint that returns only availability booleans and a user-facing message; it must not expose endpoint, model, key, or other sensitive deployment configuration. AI output can only become editable draft text or a cached evaluation suggestion; it must never auto-submit a weekly report.

API keys must stay in environment variables and must not be committed. The response/persisted weekly evaluation must expose source, generation/evaluation time, and failure reason where applicable. Weekly evaluation uses existing `weekly_reports.ai_*` columns; AI prefill compose can return per-request metadata without mutating report status.

### Decision 5: Scoring is separate from approval but state-gated

The weekly approval state remains the workflow source of truth:

- Employee weekly reports are approved/returned by center managers.
- Center-manager weekly reports are approved/returned by general managers.
- Evaluation/final review must use backend permission checks; frontend visibility is only a convenience.
- First implementation should allow scoring/final review only after the report is submitted and approved, unless a testable legacy requirement proves otherwise.
- When a weekly report is returned or resubmitted, cached AI score/final review should be cleared or invalidated so stale scoring is not treated as final for a changed report.

## Risks / Trade-offs

- **Excel template dependency** -> Resolved by using generated OOXML workbooks for this slice; no external template or undeclared dependency is required.
- **AI configuration ambiguity** -> Default to unavailable when credentials are missing and keep ordinary report flows unaffected.
- **Stale scores after return/resubmit** -> Clear evaluation/final-review fields when the report is returned or edited/resubmitted.
- **Legacy `job_title` dependency** -> Do not add `users.job_title`; use current `organization_role`, `department`, `role`, and display name.
- **Route expansion risk** -> Add route tests for permission/state gates and keep existing report tests intact.
- **Schema drift between local DB and repo** -> If no 018 is needed, explicitly document that 017 already carries the required fields; if 018 is created, execute and verify it locally.

## Migration Plan

1. Confirm current DB has 017 applied.
2. Compare 017 against legacy SQL dump and legacy migrations.
3. No 018 migration is required for this implementation because 017 already includes the needed AI/evaluation/final-review fields.
4. If a future schema gap is discovered, add a schema-only migration numbered after 017 and verify it locally.
5. Never import `digital_platform_with_data.sql`.

## Implementation Notes

- Report export template availability is no longer a blocker in this slice because generated OOXML workbooks are used.
- AI compose is disabled in the frontend when AI config is missing; ordinary deterministic weekly prefill remains available.
- Weekly evaluation uses deterministic rule scoring as the fallback when AI config or AI calls are unavailable, and the review page states that fallback without disabling scoring.
- Weekly scoring and final review are only accepted after the weekly report is submitted and approved.
