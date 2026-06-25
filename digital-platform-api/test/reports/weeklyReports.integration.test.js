import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { createApp } from '../../src/app.js';
import { closePool, pool } from '../../src/db/pool.js';
import { generateSessionToken, hashPassword } from '../../src/domain/auth.js';
import { OrganizationRole, ReportStatus, WeeklyRestMode } from '../../src/domain/reports.js';
import { createSession } from '../../src/repositories/sessionRepository.js';
import { getWeeklyReportExportDto } from '../../src/repositories/weeklyReportRepository.js';
import { resolveWeeklyReportWorkdayContext } from '../../src/repositories/weeklyReportRepository.js';
import { generateWeeklyReportWorkbook } from '../../src/services/weeklyReportExportService.js';

// Use one prefix so cleanup removes only records created by this test file.
const testPrefix = `m4_codex_${Date.now()}`;

// Build a valid submitted weekly report body for API tests.
function buildWeeklyPayload(overrides = {}) {
  return {
    weekStart: '2026-06-15',
    weekEnd: '2026-06-21',
    status: ReportStatus.SUBMITTED,
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
        workTask: '周报前端联调',
        workTarget: '完成页面对接',
        plannedDate: '2026-06-22',
        responsiblePerson: 'M4测试员工'
      }
    ],
    ...overrides
  };
}

// Create a user row that authenticates through the session middleware.
async function insertUser({ account, organizationRole, department = 'rd_center', isPlatformAdmin = 0 }) {
  const [result] = await pool.execute(
    `INSERT INTO users (
      account,
      display_name,
      department,
      organization_role,
      role,
      job_title,
      is_enabled,
      is_platform_admin,
      password_hash,
      password_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
    [
      account,
      account,
      department,
      organizationRole,
      organizationRole,
      '测试岗位',
      isPlatformAdmin,
      hashPassword('Password@123')
    ]
  );

  const token = generateSessionToken();
  await createSession(result.insertId, token);

  return {
    id: result.insertId,
    token,
    account,
    department,
    organizationRole
  };
}

// Create a visible project for submitted daily report evidence.
async function insertProject({ projectCode, projectManagerUserId }) {
  const [result] = await pool.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_manager,
      project_manager_user_id,
      participating_departments,
      status
    ) VALUES (?, ?, 'M4 customer', 'M4 manager', ?, JSON_ARRAY('rd_center'), 'normal')`,
    [projectCode, `${projectCode} name`, projectManagerUserId]
  );

  return result.insertId;
}

// Insert one daily report and one completed-work item used by weekly scoring.
async function insertDailyReport({ userId, projectId, reportDate, status = ReportStatus.SUBMITTED }) {
  const [reportResult] = await pool.execute(
    `INSERT INTO daily_reports (
      user_id,
      report_date,
      project_id,
      status
    ) VALUES (?, ?, ?, ?)`,
    [userId, reportDate, projectId, status]
  );

  await pool.execute(
    `INSERT INTO daily_report_items (
      daily_report_id,
      sort_order,
      work_content,
      completion_progress,
      completed_at,
      responsible_person,
      deviation_and_corrective_action
    ) VALUES (?, 1, ?, '100%', '17:30:00', 'M4测试员工', '')`,
    [reportResult.insertId, `完成日报接口开发 ${reportDate}`]
  );

  await pool.execute(
    `INSERT INTO daily_report_plans (
      daily_report_id,
      sort_order,
      planned_work_content,
      responsible_person,
      planned_complete_at,
      collaborating_center,
      collaboration_item
    ) VALUES (?, 1, 'this text must not enter weekly scoring', 'M4测试员工', '18:00:00', 'rd_center', '联调')`,
    [reportResult.insertId]
  );

  return reportResult.insertId;
}

// Start the API on a random port for HTTP-level assertions.
async function startServer() {
  const app = createApp();
  // Force route-level evaluation into deterministic fallback mode for integration tests.
  app.locals.weeklyReportDeepseekClient = async (evaluationInput) => {
    assert.equal(Array.isArray(evaluationInput.comparisonRows), true);
    assert.equal(evaluationInput.dailyCompletedWork, undefined);
    assert.equal(evaluationInput.summaries, undefined);
    throw new Error('integration fallback');
  };
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

// Send JSON requests to the test server.
async function requestJson(baseUrl, route, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body: parsed
  };
}

// Remove rows in child-to-parent order to satisfy foreign keys.
async function cleanupTestRows() {
  const [userRows] = await pool.execute('SELECT id FROM users WHERE account LIKE ?', [`${testPrefix}%`]);
  const userIds = userRows.map((row) => row.id);
  if (userIds.length > 0) {
    await pool.query('DELETE FROM weekly_reports WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM daily_reports WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM auth_sessions WHERE user_id IN (?)', [userIds]);
  }

  await pool.execute('DELETE FROM report_weekly_rest_mode_anchors WHERE week_start IN (?, ?)', [
    '2026-06-15',
    '2026-06-22'
  ]);
  await pool.execute('DELETE FROM projects WHERE project_code LIKE ?', [`${testPrefix}%`]);
  if (userIds.length > 0) {
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
  }

  const exportDir = path.resolve('..', 'daily_and_weekly_files', 'weekly', '2026', '06');
  try {
    const files = await fs.readdir(exportDir);
    await Promise.all(
      files
        .filter((fileName) => fileName.startsWith('周绩效考核表-研发中心'))
        .map((fileName) => fs.rm(path.join(exportDir, fileName), { force: true }))
    );
  } catch {
    // The export directory is created lazily, so absence is a clean state.
  }
}

test('M4 weekly report backend flow covers CRUD, evaluation, overview, and export', async () => {
  await cleanupTestRows();
  const server = await startServer();

  try {
    const employee = await insertUser({
      account: `${testPrefix}_employee`,
      organizationRole: OrganizationRole.EMPLOYEE
    });
    const otherEmployee = await insertUser({
      account: `${testPrefix}_other`,
      organizationRole: OrganizationRole.EMPLOYEE
    });
    const centerManager = await insertUser({
      account: `${testPrefix}_manager`,
      organizationRole: OrganizationRole.CENTER_MANAGER
    });
    const generalManager = await insertUser({
      account: `${testPrefix}_gm`,
      organizationRole: OrganizationRole.GENERAL_MANAGER,
      department: null
    });
    const generalManagerAssistant = await insertUser({
      account: `${testPrefix}_assistant`,
      organizationRole: OrganizationRole.GENERAL_MANAGER_ASSISTANT,
      department: null
    });
    const systemAdmin = await insertUser({
      account: `${testPrefix}_admin`,
      organizationRole: OrganizationRole.SYSTEM_ADMIN,
      department: null,
      isPlatformAdmin: 1
    });
    const projectId = await insertProject({
      projectCode: `${testPrefix}_P`,
      projectManagerUserId: employee.id
    });

    await insertDailyReport({ userId: employee.id, projectId, reportDate: '2026-06-16' });
    await insertDailyReport({ userId: employee.id, projectId, reportDate: '2026-06-17' });
    await insertDailyReport({ userId: employee.id, projectId, reportDate: '2026-06-18', status: ReportStatus.DRAFT });
    await pool.execute(
      `INSERT INTO report_weekly_rest_mode_anchors (
        week_start,
        rest_mode,
        created_by_user_id,
        updated_by_user_id
      ) VALUES ('2026-06-15', ?, ?, ?)`,
      [WeeklyRestMode.SINGLE_REST, generalManager.id, generalManager.id]
    );
    const resolvedContext = await resolveWeeklyReportWorkdayContext('2026-06-15');
    assert.equal(resolvedContext.resolvedRestMode, WeeklyRestMode.SINGLE_REST);

    const forbiddenCreate = await requestJson(server.baseUrl, '/api/weekly-reports', {
      token: generalManager.token,
      method: 'POST',
      body: buildWeeklyPayload()
    });
    assert.equal(forbiddenCreate.status, 403);

    const missingFields = await requestJson(server.baseUrl, '/api/weekly-reports', {
      token: employee.token,
      method: 'POST',
      body: buildWeeklyPayload({ summaries: [{ workTask: '', workTarget: '' }] })
    });
    assert.equal(missingFields.status, 400);

    const created = await requestJson(server.baseUrl, '/api/weekly-reports', {
      token: employee.token,
      method: 'POST',
      body: buildWeeklyPayload()
    });
    assert.equal(created.status, 201);
    const reportId = created.body.data.report.id;

    const duplicate = await requestJson(server.baseUrl, '/api/weekly-reports', {
      token: employee.token,
      method: 'POST',
      body: buildWeeklyPayload()
    });
    assert.equal(duplicate.status, 409);

    const forbiddenRead = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}`, {
      token: otherEmployee.token
    });
    assert.equal(forbiddenRead.status, 403);

    const managerRead = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}`, {
      token: centerManager.token
    });
    assert.equal(managerRead.status, 200);
    assert.equal(managerRead.body.data.targetUser.organizationRole, OrganizationRole.EMPLOYEE);

    const comparisonTable = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/comparison-table`, {
      token: centerManager.token
    });
    assert.equal(comparisonTable.status, 200);
    assert.equal(comparisonTable.body.data.rows.some((row) => row.weeklySummaryText === '完成日报保存与导出'), true);
    assert.equal(comparisonTable.body.data.rows[0].dailyCompletedAt, '2026-06-16');

    const employeeComparisonTable = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/comparison-table`, {
      token: employee.token
    });
    assert.equal(employeeComparisonTable.status, 403);

    const employeeSelfEvaluate = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/evaluate`, {
      token: employee.token,
      method: 'POST'
    });
    assert.equal(employeeSelfEvaluate.status, 403);

    const evaluated = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/evaluate`, {
      token: centerManager.token,
      method: 'POST'
    });
    assert.equal(evaluated.status, 200);
    assert.equal(evaluated.body.data.cached, false);
    assert.equal(evaluated.body.data.report.aiEvaluationSource, 'fallback_rule');
    assert.equal(evaluated.body.data.report.aiScore.resolvedRestMode, WeeklyRestMode.SINGLE_REST);
    assert.equal(evaluated.body.data.report.aiScore.components.submittedWorkdayCount, 2);

    const cached = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/evaluate`, {
      token: centerManager.token,
      method: 'POST'
    });
    assert.equal(cached.status, 200);
    assert.equal(cached.body.data.cached, true);

    const employeeFinalReview = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}/final-review`, {
      token: centerManager.token,
      method: 'PUT',
      body: {
        finalScore: 88.5,
        finalGrade: 'B',
        finalComment: '人工确认分'
      }
    });
    assert.equal(employeeFinalReview.status, 200);
    assert.equal(employeeFinalReview.body.data.report.finalScore, 88.5);

    const centerManagerReport = await requestJson(server.baseUrl, '/api/weekly-reports', {
      token: centerManager.token,
      method: 'POST',
      body: buildWeeklyPayload({
        summaries: [
          {
            ...buildWeeklyPayload().summaries[0],
            workTask: '中心管理周报',
            completionDescription: '中心负责人个人周报'
          }
        ]
      })
    });
    assert.equal(centerManagerReport.status, 201);
    const centerManagerReportId = centerManagerReport.body.data.report.id;

    const centerManagerSelfEvaluate = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}/evaluate`,
      {
        token: centerManager.token,
        method: 'POST'
      }
    );
    assert.equal(centerManagerSelfEvaluate.status, 403);

    const generalManagerEvaluate = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}/evaluate`,
      {
        token: generalManager.token,
        method: 'POST'
      }
    );
    assert.equal(generalManagerEvaluate.status, 403);

    const assistantReadCenterManagerReport = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}`,
      { token: generalManagerAssistant.token }
    );
    assert.equal(assistantReadCenterManagerReport.status, 200);
    assert.equal(assistantReadCenterManagerReport.body.data.targetUser.organizationRole, OrganizationRole.CENTER_MANAGER);

    const centerManagerComparison = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}/comparison-table`,
      { token: generalManager.token }
    );
    assert.equal(centerManagerComparison.status, 403);

    const assistantFinalReview = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}/final-review`,
      {
        token: generalManagerAssistant.token,
        method: 'PUT',
        body: {
          finalScore: 90,
          finalGrade: 'A',
          finalComment: '总助不应可评分'
        }
      }
    );
    assert.equal(assistantFinalReview.status, 403);

    const generalManagerFinalReview = await requestJson(
      server.baseUrl,
      `/api/weekly-reports/${centerManagerReportId}/final-review`,
      {
        token: generalManager.token,
        method: 'PUT',
        body: {
          finalScore: 92,
          finalGrade: 'A',
          finalComment: '总经理人工确认'
        }
      }
    );
    assert.equal(generalManagerFinalReview.status, 200);
    assert.equal(generalManagerFinalReview.body.data.report.finalScore, 92);
    // Final review time must stay as a local MySQL datetime string for UI display.
    assert.match(generalManagerFinalReview.body.data.report.finalReviewedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(generalManagerFinalReview.body.data.report.finalReviewedAt.includes('T'), false);
    assert.equal(generalManagerFinalReview.body.data.report.finalReviewedAt.includes('Z'), false);

    const updated = await requestJson(server.baseUrl, `/api/weekly-reports/${reportId}`, {
      token: employee.token,
      method: 'PUT',
      body: buildWeeklyPayload({
        summaries: [
          {
            ...buildWeeklyPayload().summaries[0],
            completionDescription: '修改后应清空评分'
          }
        ]
      })
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.report.aiScore, null);
    assert.equal(updated.body.data.report.finalScore, null);

    const overview = await requestJson(
      server.baseUrl,
      '/api/weekly-reports/comparison-overview?weekStart=2026-06-15&department=rd_center',
      { token: centerManager.token }
    );
    assert.equal(overview.status, 200);
    assert.equal(overview.body.data.reports.some((item) => item.reportId === reportId), true);
    assert.equal(overview.body.data.reports.some((item) => item.reportId === centerManagerReportId), false);

    const generalManagerOverview = await requestJson(
      server.baseUrl,
      '/api/weekly-reports/comparison-overview?weekStart=2026-06-15',
      { token: generalManager.token }
    );
    assert.equal(generalManagerOverview.status, 200);
    assert.equal(generalManagerOverview.body.data.reports.some((item) => item.reportId === centerManagerReportId), true);
    assert.equal(generalManagerOverview.body.data.reports.some((item) => item.reportId === reportId), false);
    // Overview rows feed the weekly report list, so they use the same local datetime format.
    const reviewedOverviewRow = generalManagerOverview.body.data.reports.find(
      (item) => item.reportId === centerManagerReportId
    );
    assert.match(reviewedOverviewRow.finalReviewedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const assistantOverview = await requestJson(
      server.baseUrl,
      '/api/weekly-reports/comparison-overview?weekStart=2026-06-15',
      { token: generalManagerAssistant.token }
    );
    assert.equal(assistantOverview.status, 200);
    assert.equal(assistantOverview.body.data.reports.some((item) => item.reportId === centerManagerReportId), true);

    const systemAdminOverview = await requestJson(
      server.baseUrl,
      '/api/weekly-reports/comparison-overview?weekStart=2026-06-15',
      { token: systemAdmin.token }
    );
    assert.equal(systemAdminOverview.status, 403);

    const exportDto = await getWeeklyReportExportDto({ reportId, userId: employee.id });
    const download = await generateWeeklyReportWorkbook(exportDto);
    assert.match(download.fileName, /^周绩效考核表-研发中心/);
    assert.match(download.filePath, /weekly[\\/]+2026[\\/]+06/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(download.filePath);
    const worksheet = workbook.getWorksheet('Sheet1');
    assert.equal(worksheet.getCell('B2').value, employee.account);
    assert.equal(worksheet.getCell('D2').value, '研发中心');
    assert.equal(worksheet.getCell('F2').value, '测试岗位');
    assert.equal(worksheet.getCell('B5').value, '日报接口开发');
    assert.equal(worksheet.getCell('C5').value, '完成日报保存与导出');
    assert.equal(worksheet.getCell('F5').value, '修改后应清空评分');
    assert.equal(worksheet.getCell('B16').value, '周报前端联调');
    assert.equal(worksheet.getCell('F16').value, null);
    assert.equal(worksheet.getCell('B24').value, employee.account);
  } finally {
    await server.close();
    await cleanupTestRows();
    await closePool();
  }
});
