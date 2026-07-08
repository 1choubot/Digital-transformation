## 1. Planning

- [x] 1.1 Confirm current main branch, HEAD, and unrelated dirty/untracked items
- [x] 1.2 Audit legacy `feat/weekly-report-prefill-from-daily` branch status, HEAD, log, and branch tracking
- [x] 1.3 Compare legacy branch delta against `origin/main@80ccaeb` and current main delta against `80ccaeb..3c4203c`
- [x] 1.4 Identify overlapping files and high-risk global entry points
- [x] 1.5 Audit current and legacy migration numbering conflicts
- [x] 1.6 Inspect `digital_platform_with_data.sql` table coverage and current-main table gaps
- [x] 1.7 Confirm SQL dump must not overwrite current database
- [x] 1.8 Confirm no direct merge, no database change, no SQL import, and no 71-item checklist change boundary

## 2. Backend Implementation

- [x] 2.1 Port report domain modules from the legacy branch into current main
- [x] 2.2 Port daily, weekly, center daily, and report settings repositories
- [x] 2.3 Port minimum scheduler and deterministic weekly prefill services; defer export, AI, and complex evaluation services
- [x] 2.4 Port `dailyReportAttachmentStorage` using digital-platform internal storage only
- [x] 2.5 Rewire report routes into current `app.js` without overwriting current project or initiation routes
- [x] 2.6 Adapt report APIs to current auth middleware and current error response format
- [x] 2.7 Adapt report role, center, approver, and responsibility logic to current user/organization model without `users.job_title`
- [x] 2.8 Preserve current initiation-stage generated-file and project-code flow behavior

## 3. Database Implementation

- [x] 3.1 Recreate daily/weekly report migrations after the current main latest migration
- [x] 3.2 Re-evaluate the legacy `users.job_title` requirement against current user schema and do not add it in this slice
- [x] 3.3 Implement report tables, indexes, foreign keys, and tracking columns against current schema
- [x] 3.4 Do not add optional sample-data import script because this slice does not need sample SQL data
- [x] 3.5 Ensure no full SQL dump import or database overwrite path exists

## 4. Frontend Implementation

- [x] 4.1 Port daily report, weekly report, center daily report, and weekly review API clients
- [x] 4.2 Port report constants and page components
- [x] 4.3 Wire report pages into current router and navigation
- [x] 4.4 Review and adapt `api/http.js` without regressing current login, error handling, project, or initiation APIs
- [x] 4.5 Use scoped report page styles without overwriting project workspace or initiation generated-file UI
- [x] 4.6 Ensure report pages handle loading, empty, error, and permission states

## 5. Tests and Documentation

- [x] 5.1 Review legacy `digital-platform-api/test/dailyReports/**`; defer DB/export integration tests that depend on old schema or deferred export
- [x] 5.2 Port and adapt lightweight `digital-platform-api/test/reports/**` domain tests
- [x] 5.3 Add unit coverage for daily report save/submit payload validation
- [x] 5.4 Add unit coverage for weekly workday rules and weekly payload validation used by deterministic prefill
- [x] 5.5 Add unit coverage for weekly approval payload and reviewer permission rules
- [x] 5.6 Add unit coverage for center daily report query and schedule validation
- [x] 5.7 Update current planning docs with implementation decisions and deferred boundaries
- [x] 5.8 Allow daily report draft rows to keep blank completed time while submitted rows remain validated
- [x] 5.9 Record daily report submitter and submitted time in schema and repository writes
- [x] 5.10 Enable general-manager approval for center-manager weekly reports
- [x] 5.11 Expose center daily schedule controls and start the disabled-by-default backend scheduler
- [x] 5.12 Preserve hash-router URLs after daily report draft save/reset
- [x] 5.13 Cover weekly comparison `daily_only` rows when submitted daily evidence has no weekly summary
- [x] 5.14 Reject updates and attachment mutations for submitted daily reports
- [x] 5.15 Render submitted daily reports as read-only and use router `navigate()` for internal URL changes
- [x] 5.16 Use daily report item id as the weekly comparison evidence key
- [x] 5.17 Persist and expose weekly report submitter and submitted time on `weekly_reports`
- [x] 5.18 Reject submitted daily report attachment uploads before multipart parsing

## 6. Verification

- [x] 6.1 Run `cd digital-platform-api && cmd /c npm.cmd run check`
- [x] 6.2 Run `cd digital-platform-web && cmd /c npm.cmd run build`
- [x] 6.3 Run `cmd /c openspec validate integrate-daily-weekly-reporting-from-legacy-branch-v1 --strict`
- [x] 6.4 Run `cmd /c openspec validate --all --strict`
- [x] 6.5 Run日报/周报核心流程自动化测试 (`npm run test:reports`)
- [x] 6.6 Manually verify daily report, backfill, weekly prefill, weekly approval, and center daily report flows
- [x] 6.7 Run or equivalently cover initiation-stage smoke to confirm no regression

## 7. Future Boundaries

- [x] 7.1 Do not directly merge the legacy branch
- [x] 7.2 Do not overwrite current database or import the full SQL dump
- [x] 7.3 Do not connect to the file platform
- [x] 7.4 Do not generate PDF
- [x] 7.5 Do not change v20260629 / 71 stage-document item count
- [x] 7.6 Do not migrate old project history in this planning change
- [x] 7.7 Defer AI prefill, complex scoring/final review, report export, export beautification, and sample SQL import
