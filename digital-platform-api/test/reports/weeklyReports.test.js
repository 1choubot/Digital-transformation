import assert from 'node:assert/strict';
import test from 'node:test';
import { WeeklyRestMode } from '../../src/domain/reports.js';
import {
  getPreviousWeeklyPeriod,
  normalizeWeeklyReportPayload
} from '../../src/domain/weeklyReports.js';
import {
  buildWeeklyEvaluationInput,
  calculateRuleWeeklyScore,
  evaluateWeeklyReportScore
} from '../../src/services/weeklyReportEvaluationService.js';

// A compact submitted weekly report fixture reused by scoring tests.
function weeklyReportFixture(overrides = {}) {
  return {
    weekStart: '2026-06-15',
    weekEnd: '2026-06-21',
    status: 'submitted',
    summaries: [
      {
        workTask: '日报接口开发',
        workTarget: '完成日报保存与导出',
        plannedDate: '2026-06-16',
        completionStatus: 'completed',
        completionDescription: '已完成',
        completedDate: '2026-06-16'
      }
    ],
    plans: [
      {
        workTask: '周报页面',
        workTarget: '准备前端联调',
        plannedDate: '2026-06-22',
        responsiblePerson: 'Tester'
      }
    ],
    ...overrides
  };
}

// Submitted daily evidence must include only completed-work fields.
function dailyEvidenceFixture() {
  return [
    {
      reportDate: '2026-06-16',
      projectCode: 'P-001',
      projectName: '数字化平台',
      workContent: '完成日报接口开发',
      completionProgress: '100%'
    },
    {
      reportDate: '2026-06-16',
      projectCode: 'P-002',
      projectName: '数字化平台',
      workContent: '同日另一个项目日报',
      completionProgress: '50%'
    },
    {
      reportDate: '2026-06-17',
      projectCode: 'P-001',
      projectName: '数字化平台',
      workContent: '日报导出联调',
      completionProgress: '100%'
    }
  ];
}

// Comparison rows mirror the weekly-vs-daily API and are the primary scoring input.
function comparisonRowsFixture() {
  return [
    {
      date: '2026-06-16',
      weekday: '周二',
      weeklyTask: '日报接口开发',
      weeklySummaryText: '已完成',
      dailyProjectName: '数字化平台',
      dailyWorkContent: '完成日报接口开发',
      dailyCompletionProgress: '100%',
      dailyCompletedAt: '2026-06-16',
      weeklyCompletedDate: '2026-06-16',
      matchStatus: 'matched',
      matchReason: '关键词匹配'
    },
    {
      date: '2026-06-17',
      weekday: '周三',
      weeklyTask: '日报导出',
      weeklySummaryText: '联调中',
      dailyProjectName: '数字化平台',
      dailyWorkContent: '日报导出联调',
      dailyCompletionProgress: '50%',
      dailyCompletedAt: '2026-06-17',
      weeklyCompletedDate: '2026-06-17',
      matchStatus: 'unmatched',
      matchReason: '未发现明显关键词匹配'
    }
  ];
}

// Workday context mirrors repository output after resolving weekly rest anchors.
function workdayContextFixture(restMode = WeeklyRestMode.DOUBLE_REST, anchorWeekStart = null) {
  return {
    resolvedRestMode: restMode,
    restModeAnchorWeekStart: anchorWeekStart,
    workdaySource: anchorWeekStart ? 'alternating_manual_rest_mode' : 'default_double_rest'
  };
}

test('weekly report payload validates natural week and submit-required rows', () => {
  const normalized = normalizeWeeklyReportPayload(weeklyReportFixture());
  assert.equal(normalized.weekStart, '2026-06-15');
  assert.equal(normalized.weekEnd, '2026-06-21');
  assert.equal(normalized.summaries.length, 1);

  assert.throws(
    () => normalizeWeeklyReportPayload(weeklyReportFixture({ weekStart: '2026-06-16' })),
    /natural Monday-Sunday week/
  );
  assert.throws(
    () => normalizeWeeklyReportPayload(weeklyReportFixture({ plans: [{ workTask: '', workTarget: '' }] })),
    /Weekly report plans are required|Missing weekly plan fields/
  );
});

test('previous weekly period resolves to the prior natural week', () => {
  assert.deepEqual(getPreviousWeeklyPeriod('2026-06-24'), {
    weekStart: '2026-06-15',
    weekEnd: '2026-06-21'
  });
});

test('rule score counts same-day multi-project reports once and ignores non-workday gaps', () => {
  const score = calculateRuleWeeklyScore({
    comparisonRows: comparisonRowsFixture(),
    dailyEvidence: dailyEvidenceFixture(),
    expectedWorkdates: ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'],
    workdayContext: workdayContextFixture()
  });

  assert.equal(score.components.submittedWorkdayCount, 2);
  assert.equal(score.components.expectedWorkdayCount, 5);
  assert.equal(score.components.matchedComparisonRowCount, 1);
  assert.equal(score.components.weeklyComparisonRowCount, 2);
  assert.equal(score.workdaySource, 'default_double_rest');
});

test('evaluation input uses comparisonRows and excludes weekly plans and daily next-day plans', () => {
  const input = buildWeeklyEvaluationInput({
    weeklyReport: weeklyReportFixture(),
    comparisonRows: comparisonRowsFixture(),
    workdayContext: workdayContextFixture()
  });

  assert.equal(input.comparisonRows.length, 2);
  assert.equal(input.comparisonRows[0].weeklyTask, '日报接口开发');
  assert.equal(input.summaries, undefined);
  assert.equal(input.dailyCompletedWork, undefined);
});

test('AI success response is cached as ai source', async () => {
  const result = await evaluateWeeklyReportScore({
    weeklyReport: weeklyReportFixture(),
    dailyEvidence: dailyEvidenceFixture(),
    comparisonRows: comparisonRowsFixture(),
    expectedWorkdates: ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'],
    workdayContext: workdayContextFixture(),
    deepseekClient: async () => ({ totalScore: 91, grade: 'A', summary: 'ok', suggestions: ['keep going'] })
  });

  assert.equal(result.source, 'ai');
  assert.equal(result.score.totalScore, 91);
  assert.equal(result.error, null);
});

test('AI timeout or adapter error falls back to rule score without 500 behavior', async () => {
  const result = await evaluateWeeklyReportScore({
    weeklyReport: weeklyReportFixture(),
    dailyEvidence: dailyEvidenceFixture(),
    comparisonRows: comparisonRowsFixture(),
    expectedWorkdates: ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'],
    workdayContext: workdayContextFixture(),
    deepseekClient: async () => {
      throw new Error('timeout');
    }
  });

  assert.equal(result.source, 'fallback_rule');
  assert.equal(result.score.source, 'fallback_rule');
  assert.match(result.error, /timeout/);
});

test('AI non-json and invalid schema responses fall back to rule score', async () => {
  const invalidResponses = [
    async () => 'not-json',
    async () => ({ grade: 'A' })
  ];

  for (const deepseekClient of invalidResponses) {
    const result = await evaluateWeeklyReportScore({
      weeklyReport: weeklyReportFixture(),
      dailyEvidence: dailyEvidenceFixture(),
      comparisonRows: comparisonRowsFixture(),
      expectedWorkdates: ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'],
      workdayContext: workdayContextFixture(WeeklyRestMode.SINGLE_REST, '2026-06-15'),
      deepseekClient
    });

    assert.equal(result.source, 'fallback_rule');
    assert.equal(result.score.restModeAnchorWeekStart, '2026-06-15');
    assert.equal(result.score.workdaySource, 'alternating_manual_rest_mode');
  }
});
