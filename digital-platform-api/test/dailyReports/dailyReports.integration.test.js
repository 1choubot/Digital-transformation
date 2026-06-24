import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { closePool, pool } from '../../src/db/pool.js';
import { hashPassword, generateSessionToken } from '../../src/domain/auth.js';
import { ReportStatus, OrganizationRole } from '../../src/domain/reports.js';
import { createSession } from '../../src/repositories/sessionRepository.js';
import {
  deleteDailyReportAttachment,
  listDailyReportAttachments,
  uploadDailyReportAttachment
} from '../../src/repositories/dailyReportRepository.js';

// Use one deterministic prefix so cleanup can target only test-owned records.
const testPrefix = `m2_codex_${Date.now()}`;

// Minimal valid daily report payload used across API assertions.
function buildDailyReportPayload(projectId, overrides = {}) {
  return {
    reportDate: '2026-06-24',
    projectId,
    status: ReportStatus.SUBMITTED,
    items: [
      {
        workContent: 'Complete backend validation',
        completionProgress: '100%',
        completedAt: '17:30',
        responsiblePerson: 'Tester',
        deviationAndCorrectiveAction: ''
      }
    ],
    plans: [
      {
        plannedWorkContent: 'Prepare frontend integration',
        responsiblePerson: 'Tester',
        plannedCompleteAt: '18:00',
        collaboratingCenter: 'rd_center',
        collaborationItem: 'API alignment'
      }
    ],
    ...overrides
  };
}

// Create a user row that can authenticate through the existing session middleware.
async function insertUser({ account, organizationRole }) {
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
    ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, NOW())`,
    [account, account, 'rd_center', organizationRole, organizationRole, hashPassword('Password@123')]
  );

  const token = generateSessionToken();
  await createSession(result.insertId, token);

  return {
    id: result.insertId,
    token
  };
}

// Create a project row with the real schema fields used by daily report search.
async function insertProject({ projectCode, status = 'normal' }) {
  const [result] = await pool.execute(
    `INSERT INTO projects (
      project_code,
      project_name,
      customer_name,
      project_manager,
      project_manager_user_id,
      participating_departments,
      status
    ) VALUES (?, ?, ?, ?, NULL, JSON_ARRAY('rd_center'), ?)`,
    [projectCode, `${projectCode} name`, 'M2 customer', 'M2 manager', status]
  );

  return result.insertId;
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
    await pool.query('DELETE FROM daily_reports WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM auth_sessions WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
  }

  await pool.execute('DELETE FROM projects WHERE project_code LIKE ?', [`${testPrefix}%`]);
}

test('M2 daily report backend flow enforces validation and ownership', async () => {
  await cleanupTestRows();
  const server = await startServer();

  try {
    const employee = await insertUser({ account: `${testPrefix}_employee`, organizationRole: OrganizationRole.EMPLOYEE });
    const otherEmployee = await insertUser({
      account: `${testPrefix}_other`,
      organizationRole: OrganizationRole.EMPLOYEE
    });
    const manager = await insertUser({
      account: `${testPrefix}_manager`,
      organizationRole: OrganizationRole.CENTER_MANAGER
    });
    const projectA = await insertProject({ projectCode: `${testPrefix}_A` });
    const projectB = await insertProject({ projectCode: `${testPrefix}_B` });
    const completedProject = await insertProject({ projectCode: `${testPrefix}_DONE`, status: 'completed' });

    const search = await requestJson(server.baseUrl, `/api/projects/my-active?q=${testPrefix}`, {
      token: employee.token
    });
    assert.equal(search.status, 200);
    assert.equal(search.body.data.projects.some((project) => project.id === projectA), true);
    assert.equal(search.body.data.projects.some((project) => project.id === completedProject), false);

    const forbiddenCreate = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: manager.token,
      body: buildDailyReportPayload(projectA)
    });
    assert.equal(forbiddenCreate.status, 403);

    const missingFields = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: employee.token,
      body: buildDailyReportPayload(projectA, {
        items: [{ workContent: '', completionProgress: '', completedAt: '' }]
      })
    });
    assert.equal(missingFields.status, 400);
    assert.equal(missingFields.body.error.code, 'DAILY_REPORT_REQUIRED_FIELDS');

    const completedProjectCreate = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: employee.token,
      body: buildDailyReportPayload(completedProject)
    });
    assert.equal(completedProjectCreate.status, 409);

    const createdA = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: employee.token,
      body: buildDailyReportPayload(projectA)
    });
    assert.equal(createdA.status, 201);
    const reportA = createdA.body.data.report;

    const duplicate = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: employee.token,
      body: buildDailyReportPayload(projectA)
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'DAILY_REPORT_DUPLICATE');

    const createdB = await requestJson(server.baseUrl, '/api/daily-reports', {
      method: 'POST',
      token: employee.token,
      body: buildDailyReportPayload(projectB)
    });
    assert.equal(createdB.status, 201);

    const forbiddenRead = await requestJson(server.baseUrl, `/api/daily-reports/${reportA.id}`, {
      token: otherEmployee.token
    });
    assert.equal(forbiddenRead.status, 404);

    const exportDto = await requestJson(server.baseUrl, `/api/daily-reports/${reportA.id}/export-data`, {
      token: employee.token
    });
    assert.equal(exportDto.status, 200);
    assert.equal(exportDto.body.data.report.items.length, 1);
    assert.equal(exportDto.body.data.user.id, employee.id);

    const attachment = await uploadDailyReportAttachment({
      reportId: reportA.id,
      userId: employee.id,
      file: {
        originalFileName: 'progress.png',
        mimeType: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        size: 4
      }
    });
    assert.equal(attachment.mimeType, 'image/png');

    const attachments = await listDailyReportAttachments({ reportId: reportA.id, userId: employee.id });
    assert.equal(attachments.length, 1);
    await deleteDailyReportAttachment({ reportId: reportA.id, attachmentId: attachment.id, userId: employee.id });

    await assert.rejects(
      () =>
        uploadDailyReportAttachment({
          reportId: reportA.id,
          userId: employee.id,
          file: {
            originalFileName: 'not-image.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('x'),
            size: 1
          }
        }),
      /Daily report attachments must be images/
    );
  } finally {
    await server.close();
    await cleanupTestRows();
    await closePool();
  }
});
