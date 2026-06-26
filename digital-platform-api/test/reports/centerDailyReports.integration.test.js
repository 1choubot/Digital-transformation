import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { createApp } from '../../src/app.js';
import { closePool, pool } from '../../src/db/pool.js';
import { generateSessionToken, hashPassword } from '../../src/domain/auth.js';
import { OrganizationRole, ReportStatus } from '../../src/domain/reports.js';
import { createSession } from '../../src/repositories/sessionRepository.js';
import {
  getCenterDailyReportDto,
  getCenterDailySchedule,
  saveCenterDailySchedule
} from '../../src/repositories/centerDailyReportRepository.js';
import { generateCenterDailyReportWorkbook } from '../../src/services/centerDailyReportExportService.js';
import { runDueCenterDailyReportExports } from '../../src/services/centerDailyReportScheduler.js';

// Use one prefix so cleanup removes only rows created by this test file.
const testPrefix = `m6_codex_${Date.now()}`;

// Create a user that authenticates through the existing session middleware.
async function insertUser({ account, organizationRole, department = 'rd_center', isPlatformAdmin = 0 }) {
  const [result] = await pool.execute(
    `INSERT INTO users (
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled,
      is_platform_admin,
      password_hash,
      password_updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
    [account, account, department, organizationRole, organizationRole, isPlatformAdmin, hashPassword('Password@123')]
  );

  const token = generateSessionToken();
  await createSession(result.insertId, token);

  return {
    id: result.insertId,
    token,
    account,
    name: account,
    department,
    organizationRole,
    isPlatformAdmin
  };
}

// Create a project that can be referenced by daily reports.
async function insertProject({ projectCode, department = 'rd_center', projectManagerUserId = null }) {
  const [result] = await pool.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_manager,
      project_manager_user_id,
      participating_departments,
      status
    ) VALUES (?, ?, ?, ?, ?, JSON_ARRAY(?), 'normal')`,
    [projectCode, `${projectCode} name`, 'M6 customer', 'M6 manager', projectManagerUserId, department]
  );

  return result.insertId;
}

// Insert one report with one completed item and one next-day plan.
async function insertDailyReport({ userId, projectId, reportDate, status = ReportStatus.SUBMITTED, workContent }) {
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
    ) VALUES (?, 1, ?, '100%', '17:30', 'M6 Tester', '')`,
    [reportResult.insertId, workContent]
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
    ) VALUES (?, 1, ?, 'M6 Tester', '18:00', 'rd_center', '接口联调')`,
    [reportResult.insertId, `${workContent} next`]
  );

  return reportResult.insertId;
}

// Start the Express app on an ephemeral port for HTTP-level permission checks.
async function startServer() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

// Send JSON requests to the ephemeral app.
async function requestJson(baseUrl, path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
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

// Remove all database rows owned by this integration test.
async function cleanupTestRows() {
  const [userRows] = await pool.execute('SELECT id FROM users WHERE account LIKE ?', [`${testPrefix}%`]);
  const userIds = userRows.map((row) => row.id);
  if (userIds.length > 0) {
    await pool.query('DELETE FROM center_daily_report_schedules WHERE updated_by_user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM daily_reports WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM auth_sessions WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
  }

  await pool.execute('DELETE FROM projects WHERE project_code LIKE ?', [`${testPrefix}%`]);
}

test('M6 center daily report aggregates submitted reports and enforces center permissions', async () => {
  await cleanupTestRows();
  const server = await startServer();

  try {
    const rdEmployee = await insertUser({
      account: `${testPrefix}_rd_employee`,
      organizationRole: OrganizationRole.EMPLOYEE,
      department: 'rd_center'
    });
    const rdEmployeeTwo = await insertUser({
      account: `${testPrefix}_rd_employee_two`,
      organizationRole: OrganizationRole.EMPLOYEE,
      department: 'rd_center'
    });
    const rdManager = await insertUser({
      account: `${testPrefix}_rd_manager`,
      organizationRole: OrganizationRole.CENTER_MANAGER,
      department: 'rd_center'
    });
    const marketingManager = await insertUser({
      account: `${testPrefix}_marketing_manager`,
      organizationRole: OrganizationRole.CENTER_MANAGER,
      department: 'marketing_center'
    });
    const generalManager = await insertUser({
      account: `${testPrefix}_gm`,
      organizationRole: OrganizationRole.GENERAL_MANAGER,
      department: null
    });
    const systemAdmin = await insertUser({
      account: `${testPrefix}_admin`,
      organizationRole: OrganizationRole.SYSTEM_ADMIN,
      department: null,
      isPlatformAdmin: 1
    });
    const project = await insertProject({
      projectCode: `${testPrefix}_P`,
      projectManagerUserId: rdEmployee.id
    });
    const secondProject = await insertProject({
      projectCode: `${testPrefix}_P2`,
      projectManagerUserId: rdEmployeeTwo.id
    });
    const otherProject = await insertProject({
      projectCode: `${testPrefix}_OTHER`,
      department: 'marketing_center'
    });

    await insertDailyReport({
      userId: rdEmployee.id,
      projectId: project,
      reportDate: '2026-06-17',
      workContent: '昨日计划来源'
    });
    await insertDailyReport({
      userId: rdEmployee.id,
      projectId: project,
      reportDate: '2026-06-18',
      workContent: '中心日报完成项'
    });
    await insertDailyReport({
      userId: rdEmployeeTwo.id,
      projectId: secondProject,
      reportDate: '2026-06-18',
      workContent: '第二员工第二项目完成项'
    });
    await insertDailyReport({
      userId: rdEmployee.id,
      projectId: otherProject,
      reportDate: '2026-06-18',
      status: ReportStatus.DRAFT,
      workContent: '草稿不应汇总'
    });
    const marketingEmployee = await insertUser({
      account: `${testPrefix}_marketing_employee`,
      organizationRole: OrganizationRole.EMPLOYEE,
      department: 'marketing_center'
    });
    await insertDailyReport({
      userId: marketingEmployee.id,
      projectId: otherProject,
      reportDate: '2026-06-18',
      workContent: '其他中心不应汇总'
    });

    const managerRead = await requestJson(
      server.baseUrl,
      '/api/center-daily-reports?date=2026-06-18&department=rd_center',
      { token: rdManager.token }
    );
    assert.equal(managerRead.status, 200);
    assert.equal(managerRead.body.data.report.employees.length, 2);
    assert.equal(managerRead.body.data.report.totals.completedItemCount, 2);
    assert.equal(managerRead.body.data.report.totals.previousPlanCount, 1);
    assert.equal(
      managerRead.body.data.report.employees.some((employee) =>
        employee.completedItems.some((item) => item.workContent === '中心日报完成项')
      ),
      true
    );
    assert.equal(
      managerRead.body.data.report.employees.some((employee) =>
        employee.completedItems.some((item) => item.workContent === '第二员工第二项目完成项')
      ),
      true
    );

    const forbiddenCrossCenter = await requestJson(
      server.baseUrl,
      '/api/center-daily-reports?date=2026-06-18&department=marketing_center',
      { token: rdManager.token }
    );
    assert.equal(forbiddenCrossCenter.status, 403);

    const generalManagerRead = await requestJson(
      server.baseUrl,
      '/api/center-daily-reports?date=2026-06-18&department=rd_center',
      { token: generalManager.token }
    );
    assert.equal(generalManagerRead.status, 200);

    const emptyState = await requestJson(
      server.baseUrl,
      '/api/center-daily-reports?date=2026-06-20&department=rd_center',
      { token: generalManager.token }
    );
    assert.equal(emptyState.status, 200);
    assert.equal(emptyState.body.data.report.employees.length, 0);

    const forbiddenSchedule = await requestJson(server.baseUrl, '/api/center-daily-reports/schedule', {
      token: generalManager.token,
      method: 'PUT',
      body: {
        department: 'rd_center',
        isEnabled: true,
        generateTime: '19:30'
      }
    });
    assert.equal(forbiddenSchedule.status, 403);

    const ownSchedule = await requestJson(server.baseUrl, '/api/center-daily-reports/schedule', {
      token: rdManager.token,
      method: 'PUT',
      body: {
        department: 'rd_center',
        isEnabled: true,
        generateTime: '19:30'
      }
    });
    assert.equal(ownSchedule.status, 200);
    assert.equal(ownSchedule.body.data.schedule.generateTime, '19:30');

    const forbiddenOtherSchedule = await requestJson(server.baseUrl, '/api/center-daily-reports/schedule', {
      token: marketingManager.token,
      method: 'PUT',
      body: {
        department: 'rd_center',
        isEnabled: true,
        generateTime: '20:00'
      }
    });
    assert.equal(forbiddenOtherSchedule.status, 403);

    const adminSchedule = await requestJson(server.baseUrl, '/api/center-daily-reports/schedule', {
      token: systemAdmin.token,
      method: 'PUT',
      body: {
        department: 'rd_center',
        isEnabled: false,
        generateTime: '18:00'
      }
    });
    assert.equal(adminSchedule.status, 200);
    assert.equal(adminSchedule.body.data.schedule.isEnabled, false);

    const exportDto = await getCenterDailyReportDto({ department: 'rd_center', reportDate: '2026-06-18' });
    const download = await generateCenterDailyReportWorkbook({
      ...exportDto,
      generatedBy: rdManager
    });
    assert.match(download.fileName, /^部门工作日报-研发中心20260618\.xlsx$/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(download.filePath);
    const worksheet = workbook.getWorksheet('项目管理工作日报汇总');
    assert.equal(worksheet.getCell('A2').value, '部门：研发中心');
    assert.equal(worksheet.getCell('F2').value, '报告时间：2026.06.18');
    assert.equal(worksheet.getCell('C18').value, '中心日报完成项');

    await saveCenterDailySchedule({
      department: 'rd_center',
      isEnabled: true,
      generateTime: '18:00',
      updatedByUserId: rdManager.id
    });
    const savedSchedule = await getCenterDailySchedule({ department: 'rd_center' });
    assert.equal(savedSchedule.generateTime, '18:00');

    // The automatic scheduler reuses the same aggregation and export code as manual export.
    const schedulerResults = await runDueCenterDailyReportExports(new Date('2026-06-18T10:00:00.000Z'));
    const rdSchedulerResult = schedulerResults.find((item) => item.department === 'rd_center');
    assert.equal(rdSchedulerResult.acquired, true);
    assert.match(rdSchedulerResult.export.fileName, /^部门工作日报-研发中心20260618\.xlsx$/);
  } finally {
    await server.close();
    await cleanupTestRows();
    await closePool();
  }
});
