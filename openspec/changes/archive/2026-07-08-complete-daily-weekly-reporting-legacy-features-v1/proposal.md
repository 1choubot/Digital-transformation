## Why

`b350a30` has integrated the minimum usable daily/weekly reporting slice, while the legacy branch still contains deferred reporting capabilities: Excel exports, AI wording assistance, AI/rule evaluation, and final manual review. These capabilities need to be completed without merging the old branch or regressing the current initiation-stage flow.

## What Changes

- Hand-port the remaining daily/weekly reporting features from `D:\0707\Digital-transformation` into current `main@b350a30`.
- Add daily report, weekly report, and center daily report Excel export endpoints and frontend download controls.
- Add configurable AI weekly prefill wording assistance, with safe disabled behavior when AI credentials are absent.
- Add weekly AI/rule scoring and final manual review surfaces with backend state and permission gates.
- Add the required configuration, dependencies, tests, and manual verification coverage.
- Keep current 017 reporting schema as the baseline; add `018_extend_daily_weekly_reporting_legacy_features.sql` only if implementation discovers a real schema gap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-weekly-reporting`: complete deferred reporting export, AI assistance, scoring, final review, frontend entry, permission, and verification requirements.
- `technical-architecture`: update reporting architecture requirements for safe legacy-feature hand-porting, Excel generation dependencies, AI configuration, schema reproducibility, and boundary preservation.

## Impact

- Backend report routes, repositories, services, env config, error handling, package dependencies, and report tests.
- Frontend report API clients and existing daily report, weekly report, weekly review, and center daily report pages.
- Optional schema migration if current 017 does not cover the remaining legacy fields.
- OpenSpec docs/specs/tasks for the new hand-porting slice.
- No direct merge, no SQL dump import, no file-platform integration, no PDF generation, no stage-document checklist changes, and no initiation-stage workflow changes.
