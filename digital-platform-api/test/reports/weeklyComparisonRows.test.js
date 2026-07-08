import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeeklyComparisonRows, mapWeeklyReportRow } from '../../src/repositories/weeklyReportRepository.js';

test('weekly comparison emits daily-only rows when a date has no weekly summaries', () => {
  const comparison = buildWeeklyComparisonRows(
    {
      summaries: [
        {
          workTask: 'Route integration',
          workTarget: 'Complete reporting routes',
          completedDate: '2026-06-16'
        }
      ]
    },
    [
      {
        dailyReportItemId: 101,
        reportDate: '2026-06-16',
        projectCode: 'P-001',
        projectName: 'Digital platform',
        projectLabel: 'P-001 / Digital platform',
        workContent: 'Complete reporting routes',
        completionProgress: '100%'
      },
      {
        dailyReportItemId: 102,
        reportDate: '2026-06-17',
        projectCode: 'P-002',
        projectName: 'Weekly comparison',
        projectLabel: 'P-002 / Weekly comparison',
        workContent: 'Prepare evidence that only exists in the daily report',
        completionProgress: '80%'
      }
    ]
  );

  const dailyOnlyRow = comparison.rows.find((row) => row.date === '2026-06-17');

  assert.equal(dailyOnlyRow?.matchStatus, 'daily_only');
  assert.equal(dailyOnlyRow.weeklyTask, null);
  assert.equal(dailyOnlyRow.dailyProjectLabel, 'P-002 / Weekly comparison');
});

test('weekly comparison keeps duplicate daily rows separate by item id', () => {
  const comparison = buildWeeklyComparisonRows(
    {
      summaries: []
    },
    [
      {
        dailyReportItemId: 201,
        reportDate: '2026-06-18',
        projectCode: 'P-003',
        projectName: 'Duplicate work',
        projectLabel: 'P-003 / Duplicate work',
        workContent: 'Same repeated work',
        completionProgress: '50%'
      },
      {
        dailyReportItemId: 202,
        reportDate: '2026-06-18',
        projectCode: 'P-003',
        projectName: 'Duplicate work',
        projectLabel: 'P-003 / Duplicate work',
        workContent: 'Same repeated work',
        completionProgress: '80%'
      }
    ]
  );

  const dailyOnlyRows = comparison.rows.filter((row) => row.date === '2026-06-18');

  assert.equal(dailyOnlyRows.length, 2);
  assert.deepEqual(
    dailyOnlyRows.map((row) => row.dailyCompletionProgress).sort(),
    ['50%', '80%']
  );
});

test('weekly report DTO exposes submitter and submitted time', () => {
  const mapped = mapWeeklyReportRow({
    id: 1,
    user_id: 10,
    week_start: '2026-07-06',
    week_end: '2026-07-12',
    status: 'submitted',
    submitted_by_user_id: 10,
    submitted_by_display_name: '张三',
    submitted_by_account: 'zhangsan',
    submitted_at: '2026-07-08 18:30:00',
    approval_status: 'pending',
    approval_comment: null,
    approval_reviewed_by_user_id: null,
    approval_reviewed_at: null,
    ai_score: null,
    ai_evaluated_at: null,
    ai_evaluation_source: null,
    ai_evaluation_error: null,
    final_score: null,
    final_grade: null,
    final_comment: null,
    final_reviewed_by_user_id: null,
    final_reviewed_at: null,
    created_at: '2026-07-08 18:29:00',
    updated_at: '2026-07-08 18:30:00'
  });

  assert.equal(mapped.submittedByUserId, 10);
  assert.equal(mapped.submittedByName, '张三');
  assert.equal(mapped.submittedAt, '2026-07-08 18:30:00');
});
