## Context

Current main is `main@3c4203c`. The legacy reporting branch is `feat/weekly-report-prefill-from-daily@cccfffc` under `D:\0707\Digital-transformation`, based on its `origin/main@80ccaeb`.

The legacy branch contributes daily reports, weekly reports, center daily reports, weekly approval, weekly prefill from daily reports, attachments, exports, API tests, report pages, and documentation. Current main has moved forward with initiation-stage template generation and project-code flow changes. Directly merging the old branch would reintroduce outdated entry points and migration numbering conflicts.

This implementation slice ports the minimum usable reporting path: daily report save/submit/backfill, daily report image attachments, weekly report create/edit/submit, deterministic weekly prefill from submitted daily reports, weekly approval, and center daily report query/schedule configuration. AI prefill, complex scoring/final review, report export, export beautification, and sample SQL import remain deferred.

Observed overlap is small at the raw file level: only `digital-platform-web/src/api/http.js` overlaps between the legacy branch delta and current-main delta from `80ccaeb..3c4203c`. Integration risk remains high because the legacy branch also edits global entry points such as backend `app.js`, route registration, user repository, frontend router, app shell, and styles.

## Goals / Non-Goals

**Goals:**

- Plan a safe module-by-module port of daily report, weekly report, center daily report, weekly approval, and weekly prefill functionality into current main.
- Preserve the current main initiation flow, generated template files, project-code-in-1.3 rule, and v20260629 / 71-item stage-document checklist.
- Define database migration handling so legacy `013-027` report migrations are recreated after current main's migration sequence.
- Define how the SQL dump can be used only as sample/reference data.
- Define backend, frontend, and verification boundaries before implementation starts.

**Non-Goals:**

- Do not directly merge the legacy branch into current main.
- Do not overwrite or import the current database from `digital_platform_with_data.sql`.
- Do not import sample SQL data or overwrite any existing data.
- Do not expose AI prefill, complex scoring/final review, or report export in this minimum slice.
- Do not connect to the file platform, generate PDF, change stage-document item count, or migrate old project history.

## Decisions

### Decision 1: Port modules manually instead of merging the legacy branch

The implementation phase should copy and adapt report-specific modules, then wire them into the current main entry points. Global files must use current main as the base.

Alternatives considered:

- Direct merge: rejected because the source branch is based on `80ccaeb`, includes conflicting migration numbers, and may overwrite current initiation-stage work.
- Cherry-pick all report commits: rejected as a default strategy because report commits also include global UI and route changes that need current-main-aware review.

### Decision 2: Regenerate report migrations after current main

Current main already owns migration numbers `013-016` for initiation-stage work. The legacy branch also uses `013-027` for report tables and related alterations. Implementation must recreate report migrations after the current latest migration, preserving SQL semantics but using new filenames and checking compatibility with current schema.

Alternatives considered:

- Keep legacy migration filenames: rejected because duplicate numbering would make schema initialization ambiguous.
- Import the SQL dump: rejected because the dump is missing current main tables such as `project_stage_document_forms`, `project_stage_document_generated_files`, and `project_stage_document_form_images`.

### Decision 3: Treat `digital_platform_with_data.sql` as sample data only

The dump contains daily/weekly report tables and sample records, but it does not represent current main's schema. It may inform test data or an optional later test-only import script, but cannot be used to initialize or overwrite the active database.

### Decision 4: Adapt report features to current auth, user, and organization model

The legacy branch touches `routes/me.js`, `routes/users.js`, and `userRepository.js`, and includes a `012_alter_users_add_job_title.sql` migration. This slice does not add `users.job_title`; reporting permissions and visibility use current `department`, `organization_role`, and `is_platform_admin` fields.

### Decision 5: Keep report storage internal and independent from stage-document file generation

Daily report attachments use digital-platform internal storage. Report export is not exposed in this slice. Reporting must not call the file platform, must not alter initiation generated-file storage, and must not change the v20260629 / 71-item checklist.

## Risks / Trade-offs

- **Migration collision** -> Recreate report migrations after current main and review every table/alter statement against current schema.
- **Global entry point drift** -> Hand-merge `app.js`, route registration, `errorHandler`, frontend router, `App.vue`, styles, and `api/http.js` using current main as the source of truth.
- **Auth/user semantics mismatch** -> Use current organization fields; do not add `job_title` in this slice.
- **SQL dump temptation** -> Keep the dump read-only; if sample data becomes necessary, create a test-only import script after schema migrations are implemented.
- **Regression of initiation flow** -> Include existing initiation-stage smoke checks in the verification plan after reporting functionality is ported.
- **Deferred capability drift** -> Keep AI, complex scoring, and export APIs out of the frontend and route surface until a later change enables them deliberately.

## Migration Plan

1. Recreate report migrations after the current main migration sequence.
2. Port backend report domain/repository/service/storage modules.
3. Wire report routes into current `app.js`, current auth middleware, current error handling, and current user/organization APIs.
4. Port frontend report APIs, constants, pages, and navigation into current router and app shell.
5. Port and adapt deterministic/domain report tests that do not require the old branch DB/test harness.
6. Do not add a sample-data import script in this slice; never import the full SQL dump into the active database.
7. Run API check, Web build, OpenSpec validation, report unit tests, and initiation-stage regression smoke.

## Implementation Notes

- `017_create_daily_weekly_reporting_core.sql` recreates report tables after current main migration `016` and does not import data. Current `package.json` has no general migrate script, so handoff/deployment notes must explicitly require applying this migration before enabling daily/weekly report pages in a new environment.
- Frontend uses current `api/http.js`; no legacy interceptor or app shell was copied over current main.
- The backend exposes no AI compose, weekly evaluation, final-review, or report export routes in this slice.
- The frontend hides AI, complex scoring/final-review, and export controls.
- Legacy DB integration tests are not copied because they depend on old migration numbering, `users.job_title`, Excel export dependencies, and export/AI services that are deferred.
- Daily report draft rows may keep `completed_at` empty so first-time photo upload can autosave a draft without failing database constraints; submitted reports still require structured completion fields and record `submitted_by_user_id` / `submitted_at`.
- Weekly approval supports the two intended reviewer paths: center managers approve employee weekly reports in their own center, and general managers approve center-manager weekly reports.
- Center daily schedule controls are visible to permitted managers and the backend scheduler starts only when `CENTER_DAILY_SCHEDULER_ENABLED=true`; the scheduler validates due data but does not generate export files in this slice.
- Weekly-vs-daily comparison rows include `daily_only` evidence even when a date has submitted daily work but no weekly summary.
- Submitted daily reports are immutable: update, attachment upload, and attachment delete operations are rejected so submitted audit fields and weekly/center report source data cannot be cleared or mutated.
- Daily report page navigation uses the shared hash-router `navigate()` function after draft creation/reset so URL and in-memory route params stay synchronized.
- Weekly-vs-daily comparison uses `daily_report_items.id` as the stable daily evidence key and keeps duplicate same-day/same-project/same-content rows separate.
- Weekly reports persist current submitter and submitted time directly on `weekly_reports` and expose those fields in the API DTO; `weekly_report_approval_history` remains the transition audit log.
- Daily report attachment upload target validation checks submitted-report immutability before the multipart file body is parsed.
