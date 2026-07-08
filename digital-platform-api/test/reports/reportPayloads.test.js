import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CENTER_DAILY_REPORT_ERROR,
  normalizeCenterDailyReportDate,
  normalizeCenterDailyReportDepartment,
  normalizeCenterDailyScheduleTime,
  normalizeScheduleEnabled
} from '../../src/domain/centerDailyReports.js';
import {
  assertDailyReportEditable,
  DAILY_REPORT_ERROR,
  DailyTaskSourceType,
  normalizeDailyReportPayload
} from '../../src/domain/dailyReports.js';
import { BUSINESS_DEPARTMENT } from '../../src/domain/organization.js';
import { ReportStatus } from '../../src/domain/reports.js';
import {
  normalizeWeeklyApprovalPayload,
  normalizeWeeklyReportPayload,
  WEEKLY_REPORT_ERROR
} from '../../src/domain/weeklyReports.js';

function dailyPayload(overrides = {}) {
  return {
    reportDate: '2026-06-24',
    projectId: 1,
    status: ReportStatus.SUBMITTED,
    items: [
      {
        sourceType: DailyTaskSourceType.AD_HOC,
        executionStatus: 'completed',
        workContent: 'Complete report route integration',
        completionProgress: '100%',
        completedAt: '17:30',
        responsiblePerson: 'Tester'
      }
    ],
    plans: [
      {
        plannedWorkContent: 'Verify weekly prefill',
        responsiblePerson: 'Tester',
        plannedCompleteAt: '18:00',
        collaboratingCenter: BUSINESS_DEPARTMENT.RD_CENTER,
        collaborationItem: 'API alignment'
      }
    ],
    ...overrides
  };
}

function weeklyPayload(overrides = {}) {
  return {
    weekStart: '2026-06-15',
    weekEnd: '2026-06-21',
    status: ReportStatus.SUBMITTED,
    summaries: [
      {
        projectId: 1,
        sourceType: 'ad_hoc',
        workTask: 'Digital platform',
        workTarget: 'Complete reporting minimal slice',
        plannedDate: '2026-06-16',
        completionStatus: 'completed',
        completionDescription: 'Done',
        completedDate: '2026-06-16'
      }
    ],
    plans: [
      {
        projectId: 1,
        workTask: 'Digital platform',
        workTarget: 'Continue validation',
        plannedDate: '2026-06-22',
        responsiblePerson: 'Tester'
      }
    ],
    ...overrides
  };
}

test('daily report payload normalizes submitted rows and times', () => {
  const normalized = normalizeDailyReportPayload(dailyPayload());

  assert.equal(normalized.status, ReportStatus.SUBMITTED);
  assert.equal(normalized.reportDate, '2026-06-24');
  assert.equal(normalized.projectId, 1);
  assert.equal(normalized.items[0].sourceType, DailyTaskSourceType.AD_HOC);
  assert.equal(normalized.items[0].completedAt, '17:30:00');
  assert.equal(normalized.plans[0].plannedCompleteAt, '18:00:00');
});

test('daily report draft permits blank completed time for attachment autosave', () => {
  const normalized = normalizeDailyReportPayload(
    dailyPayload({
      status: ReportStatus.DRAFT,
      items: [
        {
          workContent: '',
          completionProgress: '',
          completedAt: ''
        }
      ],
      plans: []
    })
  );

  assert.equal(normalized.status, ReportStatus.DRAFT);
  assert.equal(normalized.items[0].completedAt, null);
  assert.equal(normalized.items[0].sourceType, DailyTaskSourceType.LEGACY_UNKNOWN);
});

test('submitted daily reports are not editable after submission', () => {
  assert.doesNotThrow(() => assertDailyReportEditable(ReportStatus.DRAFT));
  assert.throws(
    () => assertDailyReportEditable(ReportStatus.SUBMITTED),
    (error) => error.code === DAILY_REPORT_ERROR.UPDATE_SUBMITTED
  );
});

test('daily report submit requires structured task source and execution status', () => {
  assert.throws(
    () =>
      normalizeDailyReportPayload(
        dailyPayload({
          items: [
            {
              workContent: 'Missing source',
              completionProgress: '50%',
              completedAt: '12:00'
            }
          ]
        })
      ),
    (error) => error.code === DAILY_REPORT_ERROR.REQUIRED_FIELDS
  );
});

test('weekly report payload validates natural weeks and preserves source metadata', () => {
  const normalized = normalizeWeeklyReportPayload(
    weeklyPayload({
      summaries: [
        {
          projectId: 1,
          sourceType: 'weekly_plan',
          sourcePlanTaskKey: '11111111-1111-4111-8111-111111111111',
          workTask: 'Digital platform',
          workTarget: 'Complete reporting minimal slice',
          plannedDate: '2026-06-16',
          completionStatus: 'in_progress',
          completionDescription: 'In progress',
          completedDate: null
        }
      ],
      plans: [
        {
          taskKey: '22222222-2222-4222-8222-222222222222',
          projectId: 1,
          workTask: 'Digital platform',
          workTarget: 'Continue validation',
          plannedDate: '2026-06-22',
          responsiblePerson: 'Tester'
        }
      ]
    })
  );

  assert.equal(normalized.weekStart, '2026-06-15');
  assert.equal(normalized.weekEnd, '2026-06-21');
  assert.equal(normalized.summaries[0].sourceType, 'weekly_plan');
  assert.equal(normalized.summaries[0].sourcePlanTaskKey, '11111111-1111-4111-8111-111111111111');
  assert.equal(normalized.summaries[0].completedDate, null);
  assert.equal(normalized.plans[0].taskKey, '22222222-2222-4222-8222-222222222222');
});

test('weekly report submit rejects non-Monday week starts', () => {
  assert.throws(
    () => normalizeWeeklyReportPayload(weeklyPayload({ weekStart: '2026-06-16' })),
    (error) => error.code === WEEKLY_REPORT_ERROR.INVALID_WEEK
  );
});

test('weekly approval requires a return comment but not an approve comment', () => {
  assert.deepEqual(normalizeWeeklyApprovalPayload({ action: 'approve', comment: '' }), {
    action: 'approve',
    comment: null
  });

  assert.throws(
    () => normalizeWeeklyApprovalPayload({ action: 'return', comment: '' }),
    (error) => error.code === WEEKLY_REPORT_ERROR.APPROVAL_COMMENT_REQUIRED
  );
});

test('center daily report filters use current department model and strict schedule time', () => {
  assert.equal(normalizeCenterDailyReportDate('2026-07-08'), '2026-07-08');
  assert.equal(normalizeCenterDailyReportDepartment(BUSINESS_DEPARTMENT.RD_CENTER), BUSINESS_DEPARTMENT.RD_CENTER);
  assert.equal(normalizeCenterDailyScheduleTime('18:30'), '18:30');
  assert.equal(normalizeScheduleEnabled(undefined), true);
  assert.equal(normalizeScheduleEnabled('false'), false);

  assert.throws(
    () => normalizeCenterDailyReportDepartment('job_title_center'),
    (error) => error.code === CENTER_DAILY_REPORT_ERROR.INVALID_DEPARTMENT
  );
});
