import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { env } from '../../src/config/env.js';
import {
  canEvaluateWeeklyReport,
  canFinalizeWeeklyReport,
  canReadCenterDailyReport,
  OrganizationRole,
  ReportStatus,
  WeeklyApprovalStatus
} from '../../src/domain/reports.js';
import {
  normalizeWeeklyFinalReviewPayload,
  WEEKLY_REPORT_ERROR
} from '../../src/domain/weeklyReports.js';
import {
  getDailyReportExportDto,
  listDailyReports
} from '../../src/repositories/dailyReportRepository.js';
import { getWeeklyReportExportDtoForAuthorizedRead } from '../../src/repositories/weeklyReportRepository.js';
import { resolveReadableDepartment } from '../../src/routes/centerDailyReports.js';
import { generateCenterDailyReportWorkbook } from '../../src/services/centerDailyReportExportService.js';
import { generateDailyReportWorkbook } from '../../src/services/dailyReportExportService.js';
import {
  calculateRuleWeeklyScore,
  evaluateWeeklyReportScore
} from '../../src/services/weeklyReportEvaluationService.js';
import {
  composeWeeklyPrefillWithAi,
  getWeeklyReportAiCapability,
  isReportAiConfigured
} from '../../src/services/weeklyReportPrefillAiService.js';
import { generateWeeklyReportWorkbook } from '../../src/services/weeklyReportExportService.js';
import { cleanupReportExportFile } from '../../src/services/reportExportFile.js';
import { createSimpleXlsxWorkbook } from '../../src/utils/simpleXlsxWorkbook.js';
import { readZipEntries } from '../../src/utils/ooxmlZip.js';

function user(organizationRole, overrides = {}) {
  return {
    id: 1,
    account: 'tester',
    name: 'Tester',
    displayName: 'Tester',
    department: 'rd_center',
    organizationRole,
    isPlatformAdmin: false,
    ...overrides
  };
}

test('daily report list keeps project name when project code is not assigned', async () => {
  const executor = {
    async execute() {
      return [[{
        id: 316,
        user_id: 387,
        report_date: '2026-07-10',
        project_id: 793,
        status: ReportStatus.SUBMITTED,
        project_code: null,
        project_name: 'Test-lixiang',
        project_manager: null,
        project_manager_user_id: null,
        project_status: 'normal',
        submitted_by_user_id: 387,
        submitted_at: null,
        created_at: null,
        updated_at: null
      }]];
    }
  };

  const reports = await listDailyReports({ userId: 387 }, executor);

  assert.equal(reports[0].project.projectName, 'Test-lixiang');
  assert.equal(reports[0].project.projectCode, null);
});

function zipEntryText(buffer, name) {
  const entry = readZipEntries(buffer).find((candidate) => candidate.name === name);
  assert.ok(entry, `${name} should exist`);
  return entry.data.toString('utf8');
}

async function withExportRoot(callback) {
  const previousRoot = env.reports.exportRoot;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'report-export-test-'));
  env.reports.exportRoot = directory;
  try {
    return await callback(directory);
  } finally {
    env.reports.exportRoot = previousRoot;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function withInvalidExportRoot(callback) {
  const previousRoot = env.reports.exportRoot;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'report-export-invalid-'));
  const filePath = path.join(directory, 'not-a-directory');
  await fs.writeFile(filePath, 'blocks child directories');
  env.reports.exportRoot = filePath;
  try {
    return await callback();
  } finally {
    env.reports.exportRoot = previousRoot;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function setAiConfig(overrides) {
  const previous = { ...env.reportAi };
  Object.assign(env.reportAi, overrides);
  return () => {
    Object.assign(env.reportAi, previous);
  };
}

function prefillSuggestion() {
  return {
    weekStart: '2026-07-06',
    weekEnd: '2026-07-12',
    basisHash: 'basis-1',
    summaries: [
      {
        suggestionKey: 'task-1',
        sourceType: 'weekly_plan',
        projectLabel: 'P-001 / Digital platform',
        workTask: 'Build report export',
        workTarget: 'Finish deterministic export',
        plannedDate: '2026-07-07',
        completionStatus: 'completed',
        completionDescription: 'Done',
        completedDate: '2026-07-07',
        dailyEvidence: [
          {
            reportDate: '2026-07-07',
            workContent: 'Finished deterministic export',
            completionProgress: '100%'
          }
        ]
      }
    ]
  };
}

function weeklyReport() {
  return {
    id: 10,
    userId: 2,
    weekStart: '2026-07-06',
    weekEnd: '2026-07-12',
    status: ReportStatus.SUBMITTED,
    approvalStatus: WeeklyApprovalStatus.APPROVED,
    aiScore: null,
    finalScore: null,
    summaries: [
      {
        workTask: 'Digital platform',
        workTarget: 'Finish export and AI controls',
        plannedDate: '2026-07-07',
        completionStatus: 'completed',
        completionDescription: 'Done',
        completedDate: '2026-07-07',
        projectLabel: 'P-001 / Digital platform'
      }
    ],
    plans: [
      {
        workTask: 'Digital platform',
        workTarget: 'Verify scoring',
        plannedDate: '2026-07-13',
        responsiblePerson: 'Tester'
      }
    ]
  };
}

function dailyExportExecutor({ ownerUserId = 2 } = {}) {
  return {
    async execute(sql, params = []) {
      if (sql.includes('FROM daily_reports dr') && sql.includes('WHERE dr.id = ?')) {
        const [reportId, userId] = params;
        if (Number(reportId) !== 10 || Number(userId) !== Number(ownerUserId)) {
          return [[]];
        }
        return [[
          {
            id: 10,
            user_id: ownerUserId,
            report_date: '2026-07-08',
            project_id: 100,
            status: ReportStatus.SUBMITTED,
            submitted_by_user_id: ownerUserId,
            submitted_at: '2026-07-08 18:00:00',
            created_at: '2026-07-08 17:00:00',
            updated_at: '2026-07-08 18:00:00',
            project_code: 'P-001',
            project_name: 'Digital platform',
            project_manager: 'PM',
            project_manager_user_id: 20,
            project_status: 'active'
          }
        ]];
      }
      if (sql.includes('FROM daily_report_items') || sql.includes('FROM daily_report_plans')) {
        return [[]];
      }
      if (sql.includes('FROM daily_report_attachments')) {
        return [[]];
      }
      if (sql.includes('FROM users')) {
        return [[
          {
            id: ownerUserId,
            account: 'employee',
            display_name: '员工',
            department: 'rd_center',
            organization_role: OrganizationRole.EMPLOYEE,
            role: '工程师'
          }
        ]];
      }
      if (sql.includes('FROM project_stages')) {
        return [[{ stage_name: '立项' }]];
      }
      throw new Error(`Unexpected daily export query: ${sql}`);
    }
  };
}

function weeklyExportExecutor(targetUser) {
  return {
    async execute(sql) {
      if (sql.includes('FROM weekly_reports wr') && sql.includes('INNER JOIN users u')) {
        return [[
          {
            id: 10,
            user_id: targetUser.id,
            week_start: '2026-07-06',
            week_end: '2026-07-12',
            status: ReportStatus.SUBMITTED,
            submitted_by_user_id: targetUser.id,
            submitted_at: '2026-07-12 18:00:00',
            approval_status: WeeklyApprovalStatus.APPROVED,
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
            created_at: '2026-07-12 17:00:00',
            updated_at: '2026-07-12 18:00:00',
            account: targetUser.account,
            display_name: targetUser.displayName,
            department: targetUser.department,
            organization_role: targetUser.organizationRole,
            role: targetUser.role || '',
            is_enabled: 1,
            is_platform_admin: targetUser.isPlatformAdmin ? 1 : 0,
            submitted_by_display_name: targetUser.displayName,
            submitted_by_account: targetUser.account
          }
        ]];
      }
      if (sql.includes('FROM weekly_report_summaries') || sql.includes('FROM weekly_report_plans')) {
        return [[]];
      }
      throw new Error(`Unexpected weekly export query: ${sql}`);
    }
  };
}

test('simple xlsx workbook contains workbook and worksheet entries', () => {
  const buffer = createSimpleXlsxWorkbook({
    sheetName: 'Export',
    rows: [['标题'], ['项目', '日报导出']]
  });
  const entryNames = readZipEntries(buffer).map((entry) => entry.name);
  const worksheet = zipEntryText(buffer, 'xl/worksheets/sheet1.xml');

  assert.ok(entryNames.includes('xl/workbook.xml'));
  assert.ok(entryNames.includes('xl/worksheets/sheet1.xml'));
  assert.match(worksheet, /日报导出/);
});

test('daily report export writes an xlsx and reports controlled export failure', async () => {
  await withExportRoot(async () => {
    const download = await generateDailyReportWorkbook({
      report: {
        reportDate: '2026-07-08',
        project: { projectCode: 'P-001', projectName: 'Digital platform' },
        items: [{ workContent: 'Complete daily export', completionProgress: '100%' }],
        plans: [{ plannedWorkContent: 'Verify weekly export' }],
        attachments: []
      },
      user: { account: 'employee', name: '员工' },
      currentStageName: '立项'
    });
    const buffer = await fs.readFile(download.filePath);
    const worksheet = zipEntryText(buffer, 'xl/worksheets/sheet1.xml');

    assert.equal(download.fileName.endsWith('.xlsx'), true);
    assert.match(worksheet, /项目工作日报/);
    assert.match(worksheet, /Complete daily export/);
    await cleanupReportExportFile(download.filePath);
  });

  await withInvalidExportRoot(async () => {
    await assert.rejects(
      () =>
        generateDailyReportWorkbook({
          report: { reportDate: '2026-07-08', project: {}, items: [], plans: [], attachments: [] },
          user: { account: 'employee' }
        }),
      (error) => error.code === 'DAILY_REPORT_EXPORT_FAILED'
    );
  });
});

test('weekly report export writes scoring fields and reports controlled export failure', async () => {
  await withExportRoot(async () => {
    const download = await generateWeeklyReportWorkbook({
      report: {
        ...weeklyReport(),
        aiScore: { totalScore: 86, grade: 'B' },
        aiEvaluationSource: 'fallback_rule',
        finalScore: 88,
        finalComment: '符合预期'
      },
      user: { account: 'employee', name: '员工', department: 'rd_center', role: '工程师' }
    });
    const buffer = await fs.readFile(download.filePath);
    const worksheet = zipEntryText(buffer, 'xl/worksheets/sheet1.xml');

    assert.match(worksheet, /周绩效考核表/);
    assert.match(worksheet, /最终评分/);
    assert.doesNotMatch(worksheet, /最终等级/);
    assert.match(worksheet, /符合预期/);
    await cleanupReportExportFile(download.filePath);
  });

  await withInvalidExportRoot(async () => {
    await assert.rejects(
      () => generateWeeklyReportWorkbook({ report: weeklyReport(), user: { account: 'employee' } }),
      (error) => error.code === WEEKLY_REPORT_ERROR.EXPORT_FAILED
    );
  });
});

test('center daily export writes scoped center data and reports controlled export failure', async () => {
  const reportDto = {
    department: 'rd_center',
    reportDate: '2026-07-08',
    generatedBy: { account: 'manager', name: '中心负责人' },
    totals: {
      employeeCount: 1,
      previousPlanCount: 1,
      completedItemCount: 1,
      tomorrowPlanCount: 1
    },
    employees: [
      {
        name: '员工',
        previousPlans: [{ projectLabel: 'P-001', workContent: 'Plan work', responsiblePerson: '员工' }],
        completedItems: [{ projectLabel: 'P-001', workContent: 'Done work', completionProgress: '100%' }],
        tomorrowPlans: [{ projectLabel: 'P-001', workContent: 'Next work', responsiblePerson: '员工' }]
      }
    ]
  };

  await withExportRoot(async () => {
    const download = await generateCenterDailyReportWorkbook(reportDto);
    const buffer = await fs.readFile(download.filePath);
    const worksheet = zipEntryText(buffer, 'xl/worksheets/sheet1.xml');

    assert.match(worksheet, /中心日报/);
    assert.match(worksheet, /今日工作完成情况/);
    assert.match(worksheet, /Done work/);
    await cleanupReportExportFile(download.filePath);
  });

  await withInvalidExportRoot(async () => {
    await assert.rejects(
      () => generateCenterDailyReportWorkbook(reportDto),
      (error) => error.code === 'CENTER_DAILY_REPORT_EXPORT_FAILED'
    );
  });
});

test('daily report export denies reports owned by another user', async () => {
  await assert.rejects(
    () =>
      getDailyReportExportDto(
        { reportId: 10, userId: 1 },
        dailyExportExecutor({ ownerUserId: 2 })
      ),
    (error) => error.code === 'DAILY_REPORT_NOT_FOUND'
  );
});

test('weekly report export follows owner and reviewer permissions', async () => {
  const employee = user(OrganizationRole.EMPLOYEE, {
    id: 20,
    account: 'employee',
    displayName: '员工',
    department: 'rd_center'
  });
  const sameCenterManager = user(OrganizationRole.CENTER_MANAGER, {
    id: 30,
    account: 'manager',
    displayName: '研发中心负责人',
    department: 'rd_center'
  });
  const otherCenterManager = user(OrganizationRole.CENTER_MANAGER, {
    id: 31,
    account: 'other_manager',
    displayName: '制造中心负责人',
    department: 'manufacturing_center'
  });
  const unrelatedEmployee = user(OrganizationRole.EMPLOYEE, {
    id: 32,
    account: 'other_employee',
    displayName: '其他员工',
    department: 'rd_center'
  });
  const centerManagerTarget = user(OrganizationRole.CENTER_MANAGER, {
    id: 40,
    account: 'center_manager',
    displayName: '中心负责人',
    department: 'rd_center'
  });
  const generalManager = user(OrganizationRole.GENERAL_MANAGER, {
    id: 50,
    account: 'gm',
    displayName: '总经理',
    department: null
  });

  await assert.rejects(
    () =>
      getWeeklyReportExportDtoForAuthorizedRead(
        { reportId: 10, requesterUser: unrelatedEmployee },
        weeklyExportExecutor(employee)
      ),
    (error) => error.code === WEEKLY_REPORT_ERROR.FORBIDDEN
  );

  const ownerExport = await getWeeklyReportExportDtoForAuthorizedRead(
    { reportId: 10, requesterUser: employee },
    weeklyExportExecutor(employee)
  );
  assert.equal(ownerExport.user.id, employee.id);

  const managerExport = await getWeeklyReportExportDtoForAuthorizedRead(
    { reportId: 10, requesterUser: sameCenterManager },
    weeklyExportExecutor(employee)
  );
  assert.equal(managerExport.user.id, employee.id);

  await assert.rejects(
    () =>
      getWeeklyReportExportDtoForAuthorizedRead(
        { reportId: 10, requesterUser: otherCenterManager },
        weeklyExportExecutor(employee)
      ),
    (error) => error.code === WEEKLY_REPORT_ERROR.FORBIDDEN
  );

  const gmExport = await getWeeklyReportExportDtoForAuthorizedRead(
    { reportId: 10, requesterUser: generalManager },
    weeklyExportExecutor(centerManagerTarget)
  );
  assert.equal(gmExport.user.id, centerManagerTarget.id);
});

test('center daily export scope follows center-reader permissions', () => {
  const centerManager = user(OrganizationRole.CENTER_MANAGER, {
    id: 30,
    department: 'rd_center'
  });
  const generalManager = user(OrganizationRole.GENERAL_MANAGER, {
    id: 50,
    department: null
  });
  const assistant = user(OrganizationRole.GENERAL_MANAGER_ASSISTANT, {
    id: 51,
    department: null
  });

  assert.equal(canReadCenterDailyReport(centerManager), true);
  assert.equal(
    resolveReadableDepartment({
      auth: { user: centerManager },
      query: { department: 'rd_center' },
      body: {}
    }),
    'rd_center'
  );
  assert.throws(
    () =>
      resolveReadableDepartment({
        auth: { user: centerManager },
        query: { department: 'manufacturing_center' },
        body: {}
      }),
    (error) => error.code === 'CENTER_SCOPE_FORBIDDEN'
  );

  assert.equal(canReadCenterDailyReport(generalManager), true);
  assert.equal(
    resolveReadableDepartment({
      auth: { user: generalManager },
      query: { department: 'manufacturing_center' },
      body: {}
    }),
    'manufacturing_center'
  );
  assert.equal(canReadCenterDailyReport(assistant), true);
  assert.equal(
    resolveReadableDepartment({
      auth: { user: assistant },
      query: { department: 'operations_center' },
      body: {}
    }),
    'operations_center'
  );
});

test('AI prefill is disabled-safe when config is absent', async () => {
  const restore = setAiConfig({ enabled: false, endpoint: '', model: '', apiKey: '' });
  try {
    assert.equal(isReportAiConfigured(), false);
    assert.deepEqual(getWeeklyReportAiCapability(), {
      prefillAiAvailable: false,
      evaluationAiAvailable: false,
      message: 'AI 未配置，当前使用规则草稿和规则评分。'
    });
    const suggestion = await composeWeeklyPrefillWithAi(prefillSuggestion());

    assert.equal(suggestion.ai.available, false);
    assert.equal(suggestion.ai.applied, false);
    assert.equal(suggestion.summaries[0].workTarget, 'Finish deterministic export');
  } finally {
    restore();
  }
});

test('AI capability reports availability without leaking endpoint model or key', () => {
  const restore = setAiConfig({
    enabled: true,
    endpoint: 'https://ai.example.internal',
    model: 'secret-model',
    apiKey: 'secret-api-key'
  });
  try {
    const capability = getWeeklyReportAiCapability();
    const serialized = JSON.stringify(capability);

    assert.equal(capability.prefillAiAvailable, true);
    assert.equal(capability.evaluationAiAvailable, true);
    assert.equal(serialized.includes('https://ai.example.internal'), false);
    assert.equal(serialized.includes('secret-model'), false);
    assert.equal(serialized.includes('secret-api-key'), false);
  } finally {
    restore();
  }
});

test('AI prefill only rewrites editable draft text fields', async () => {
  const suggestion = await composeWeeklyPrefillWithAi(prefillSuggestion(), async () => ({
    items: [
      {
        suggestionKey: 'task-1',
        workTarget: '使用 AI 整理后的目标',
        completionDescription: '使用 AI 整理后的说明',
        plannedDate: '2099-01-01',
        completionStatus: 'not_completed'
      }
    ]
  }));

  assert.equal(suggestion.ai.available, true);
  assert.equal(suggestion.ai.applied, true);
  assert.equal(suggestion.summaries[0].workTarget, '使用 AI 整理后的目标');
  assert.equal(suggestion.summaries[0].completionDescription, '使用 AI 整理后的说明');
  assert.equal(suggestion.summaries[0].plannedDate, '2026-07-07');
  assert.equal(suggestion.summaries[0].completionStatus, 'completed');
});

test('weekly rule evaluation is deterministic and AI fallback does not block scoring', async () => {
  const workdayContext = {
    expectedWorkdates: ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'],
    resolvedRestMode: 'double_rest',
    restModeAnchorWeekStart: null,
    workdaySource: 'default_double_rest'
  };
  const comparisonRows = [
    {
      date: '2026-07-07',
      weeklyTask: 'Digital platform',
      weeklySummaryText: 'Finish export',
      dailyWorkContent: 'Finish export',
      dailyCompletionProgress: '100%',
      matchStatus: 'matched'
    }
  ];
  const dailyEvidence = [
    {
      reportDate: '2026-07-07',
      workContent: 'Finish export',
      completionProgress: '100%'
    }
  ];
  const ruleScore = calculateRuleWeeklyScore({
    comparisonRows,
    dailyEvidence,
    expectedWorkdates: workdayContext.expectedWorkdates,
    workdayContext
  });

  assert.equal(ruleScore.source, 'fallback_rule');
  assert.equal(ruleScore.components.submittedWorkdayCount, 1);

  const evaluated = await evaluateWeeklyReportScore({
    weeklyReport: weeklyReport(),
    dailyEvidence,
    comparisonRows,
    expectedWorkdates: workdayContext.expectedWorkdates,
    workdayContext,
    aiClient: async () => {
      throw new Error('AI unavailable');
    }
  });

  assert.equal(evaluated.source, 'fallback_rule');
  assert.equal(evaluated.error, 'AI unavailable');
  assert.equal(evaluated.score.source, 'fallback_rule');
});

test('weekly scoring and final review permissions follow current organization roles', () => {
  const centerManager = user(OrganizationRole.CENTER_MANAGER, { id: 10, department: 'rd_center' });
  const employee = user(OrganizationRole.EMPLOYEE, { id: 11, department: 'rd_center' });
  const generalManager = user(OrganizationRole.GENERAL_MANAGER, { id: 12, department: null });
  const targetCenterManager = user(OrganizationRole.CENTER_MANAGER, { id: 13, department: 'rd_center' });

  assert.equal(canEvaluateWeeklyReport(centerManager, employee), true);
  assert.equal(canEvaluateWeeklyReport(generalManager, targetCenterManager), false);
  assert.equal(canFinalizeWeeklyReport(centerManager, employee), true);
  assert.equal(canFinalizeWeeklyReport(generalManager, targetCenterManager), true);
});

test('weekly final review payload keeps only score and comment', () => {
  assert.deepEqual(normalizeWeeklyFinalReviewPayload({ finalScore: 88.456, finalGrade: 'B', finalComment: '通过' }), {
    finalScore: 88.46,
    finalComment: '通过'
  });

  assert.throws(
    () => normalizeWeeklyFinalReviewPayload({ finalScore: 101 }),
    (error) => error.code === WEEKLY_REPORT_ERROR.INVALID_FINAL_REVIEW
  );
});

test('weekly final review persistence clears the legacy grade column', async () => {
  const source = await fs.readFile(
    new URL('../../src/repositories/weeklyReportRepository.js', import.meta.url),
    'utf8'
  );
  const saveBlock = /export async function saveWeeklyReportFinalReview[\s\S]+?return getWeeklyReportByIdForSystem\(reportId\);/m.exec(source)?.[0] || '';

  assert.match(saveBlock, /final_grade\s*=\s*NULL/);
  assert.doesNotMatch(saveBlock, /finalReview\.finalGrade/);
});

test('weekly return and content update paths invalidate cached scoring fields', async () => {
  const source = await fs.readFile(
    new URL('../../src/repositories/weeklyReportRepository.js', import.meta.url),
    'utf8'
  );
  const updateBlock = /export async function updateWeeklyReport[\s\S]+?WHERE id = \? AND user_id = \?/m.exec(source)?.[0] || '';
  const returnBlock = /if \(approval\.action === 'return'\) \{[\s\S]+?WHERE id = \?/m.exec(source)?.[0] || '';
  const requiredAssignments = [
    'ai_score = NULL',
    'ai_evaluated_at = NULL',
    'ai_evaluation_source = NULL',
    'ai_evaluation_error = NULL',
    'final_score = NULL',
    'final_grade = NULL',
    'final_comment = NULL',
    'final_reviewed_by_user_id = NULL',
    'final_reviewed_at = NULL'
  ];

  for (const assignment of requiredAssignments) {
    assert.match(updateBlock, new RegExp(assignment.replaceAll(' ', '\\s+')));
    assert.match(returnBlock, new RegExp(assignment.replaceAll(' ', '\\s+')));
  }
});
