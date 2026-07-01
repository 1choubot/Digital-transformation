import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { createApp } from '../../src/app.js';
import { closePool, pool } from '../../src/db/pool.js';
import { hashPassword } from '../../src/domain/auth.js';
import { ReportStatus, OrganizationRole } from '../../src/domain/reports.js';
import { generateDailyReportWorkbook } from '../../src/services/dailyReportExportService.js';
import {
  cleanupDailyReportAttachmentFile,
  createDailyReportAttachmentStorageKey,
  writeDailyReportAttachmentFile
} from '../../src/storage/dailyReportAttachmentStorage.js';

const testPrefix = `m3_codex_${Date.now()}`;

// Create one authenticated employee for HTTP export checks.
async function insertEmployee() {
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
    ) VALUES (?, ?, 'rd_center', ?, ?, 1, 0, ?, NOW())`,
    [
      `${testPrefix}_employee`,
      'M3测试员工',
      OrganizationRole.EMPLOYEE,
      OrganizationRole.EMPLOYEE,
      hashPassword('Password@123')
    ]
  );

  return {
    id: result.insertId,
    account: `${testPrefix}_employee`
  };
}

// Create a project row that can be selected by the employee report.
async function insertProject(suffix, projectManagerUserId) {
  const [result] = await pool.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_manager,
      project_manager_user_id,
      participating_departments,
      status
    ) VALUES (?, ?, 'M3 customer', 'M3 manager', ?, JSON_ARRAY('rd_center'), 'normal')`,
    [`${testPrefix}_${suffix}`, `M3模板导出项目${suffix}`, projectManagerUserId]
  );

  return result.insertId;
}

// Build a report payload with enough rows to exercise template expansion.
function buildReportPayload(projectId, status = ReportStatus.DRAFT) {
  return {
    reportDate: '2026-06-24',
    projectId,
    status,
    items: [
      {
        // Export tests use ad hoc completed work so the new source model is explicit.
        sourceType: 'ad_hoc',
        sourcePlanTaskKey: null,
        executionStatus: 'completed',
        workContent: '完成接口联调',
        completionProgress: '100%',
        completedAt: '17:30',
        responsiblePerson: 'M3测试员工',
        deviationAndCorrectiveAction: '无偏差'
      },
      {
        // Each completed-work line needs its own structured source and execution status.
        sourceType: 'ad_hoc',
        sourcePlanTaskKey: null,
        executionStatus: 'completed',
        workContent: '完成页面草稿保存',
        completionProgress: '80%',
        completedAt: '18:10',
        responsiblePerson: 'M3测试员工',
        deviationAndCorrectiveAction: '继续补齐附件'
      },
      {
        // The export layout remains unchanged even though source metadata is stored.
        sourceType: 'ad_hoc',
        sourcePlanTaskKey: null,
        executionStatus: 'completed',
        workContent: '完成导出快照',
        completionProgress: '已完成',
        completedAt: '18:30',
        responsiblePerson: 'M3测试员工',
        deviationAndCorrectiveAction: '无'
      },
      {
        // This final row exercises extra-row rendering with explicit task state.
        sourceType: 'ad_hoc',
        sourcePlanTaskKey: null,
        executionStatus: 'completed',
        workContent: '校验模板扩展行',
        completionProgress: '50%',
        completedAt: '19:00',
        responsiblePerson: 'M3测试员工',
        deviationAndCorrectiveAction: '待复核'
      }
    ],
    plans: [
      {
        plannedWorkContent: '继续完善日报页面',
        responsiblePerson: 'M3测试员工',
        plannedCompleteAt: '18:00',
        collaboratingCenter: 'rd_center',
        collaborationItem: '前后端联调'
      }
    ]
  };
}

// Start the app on an ephemeral port for download assertions.
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
async function requestJson(baseUrl, pathName, { token = '', method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
}

// Remove only rows and files owned by this test prefix.
async function cleanupTestRows() {
  const [userRows] = await pool.execute('SELECT id FROM users WHERE account LIKE ?', [`${testPrefix}%`]);
  const userIds = userRows.map((row) => row.id);
  if (userIds.length > 0) {
    await pool.query('DELETE FROM daily_reports WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM auth_sessions WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
  }

  await pool.execute('DELETE FROM projects WHERE project_code LIKE ?', [`${testPrefix}%`]);

  // Only remove files generated by this test user's deterministic export name.
  const exportDir = path.resolve('..', 'daily_and_weekly_files', 'daily', '2026', '06');
  try {
    const fileNames = await fs.readdir(exportDir);
    await Promise.all(
      fileNames
        .filter((fileName) => fileName.startsWith('项目工作日报-M3测试员工'))
        .map((fileName) => fs.rm(path.join(exportDir, fileName), { force: true }))
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

test('M3 personal daily report Excel export embeds real attachment images', async () => {
  const storageKey = createDailyReportAttachmentStorageKey({ dailyReportId: 999999 });
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAIAAeIhvAAAAAElFTkSuQmCC',
    'base64'
  );
  await writeDailyReportAttachmentFile(storageKey, pngBuffer);

  try {
    const exportDto = {
      report: {
        reportDate: '2026-06-24',
        project: { projectName: '图片测试项目' },
        items: [],
        plans: [],
        attachments: [
          {
            originalFileName: 'sample.png',
            mimeType: 'image/png',
            storageKey
          }
        ]
      },
      user: {
        name: '测试用户',
        account: 'tester'
      }
    };

    const exported = await generateDailyReportWorkbook(exportDto);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(exported.filePath);
    const worksheet = workbook.getWorksheet('项目管理工作日报汇总');

    assert.ok(worksheet.getImages().length >= 1);
  } finally {
    await cleanupDailyReportAttachmentFile(storageKey);
  }
});

test('M3 personal daily report Excel export preserves template and clears sample data', async () => {
  await cleanupTestRows();
  const server = await startServer();

  try {
    const employee = await insertEmployee();
    const projectA = await insertProject('A', employee.id);
    const projectB = await insertProject('B', employee.id);

    const login = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: {
        account: employee.account,
        password: 'Password@123'
      }
    });
    assert.equal(login.status, 200);
    const token = login.body.data.token;

    const draftA = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token,
      body: buildReportPayload(projectA, ReportStatus.DRAFT)
    });
    assert.equal(draftA.status, 201);

    const draftB = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token,
      body: buildReportPayload(projectB, ReportStatus.DRAFT)
    });
    assert.equal(draftB.status, 201);

    const submittedB = await requestJson(server.baseUrl, `/api/daily-reports/${draftB.body.data.report.id}`, {
      method: 'PUT',
      token,
      body: buildReportPayload(projectB, ReportStatus.SUBMITTED)
    });
    assert.equal(submittedB.status, 200);
    assert.equal(submittedB.body.data.report.status, ReportStatus.SUBMITTED);

    const list = await requestJson(server.baseUrl, '/api/daily-reports?dateFrom=2026-06-24&dateTo=2026-06-24', {
      token
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.reports.length, 2);

    const reportId = submittedB.body.data.report.id;

    const dtoResponse = await fetch(`${server.baseUrl}/api/daily-reports/${reportId}/export-data`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    const dtoBody = await dtoResponse.json();
    assert.equal(dtoResponse.status, 200);

    const exported = await generateDailyReportWorkbook(dtoBody.data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(exported.filePath);
    const worksheet = workbook.getWorksheet('项目管理工作日报汇总');

    assert.equal(worksheet.getCell('B2').value, '项目工作日报');
    assert.equal(worksheet.getCell('B4').value, '项目：M3模板导出项目B');
    assert.equal(worksheet.getCell('D4').value, '报告人：M3测试员工');
    assert.equal(worksheet.getCell('G4').value, '报告时间：2026.06.24');
    assert.equal(worksheet.getCell('C10').value, '校验模板扩展行');
    assert.equal(worksheet.getCell('C14').value, '继续完善日报页面');
    assert.equal(worksheet.model.merges.includes('B2:G2'), true);

    const workbookText = JSON.stringify(worksheet.model);
    assert.equal(workbookText.includes('陈芋如'), false);
    assert.equal(workbookText.includes('人事简历筛选'), false);

    const downloadResponse = await fetch(`${server.baseUrl}/api/daily-reports/${reportId}/export`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(
      downloadResponse.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    assert.ok((await downloadResponse.arrayBuffer()).byteLength > 1000);
  } finally {
    await server.close();
    await cleanupTestRows();
    await closePool();
  }
});
