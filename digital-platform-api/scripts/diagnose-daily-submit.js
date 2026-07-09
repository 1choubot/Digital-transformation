import { closePool, pool } from '../src/db/pool.js';
import { normalizeDailyReportPayload } from '../src/domain/dailyReports.js';
import { ReportStatus } from '../src/domain/reports.js';
import {
  createDailyReport,
  searchActiveProjectsForDailyReports
} from '../src/repositories/dailyReportRepository.js';

function parseArgs(argv) {
  const options = {
    execute: false
  };

  for (const arg of argv) {
    if (arg === '--execute') {
      options.execute = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) {
      options[match[1]] = match[2];
    }
  }

  return options;
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function printJson(label, value) {
  console.log(`${label}: ${JSON.stringify(value, null, 2)}`);
}

function formatDateOnly(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value || '').slice(0, 10);
}

async function listColumns(tableName) {
  const [rows] = await pool.execute(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
}

async function loadUser(userId) {
  const [rows] = await pool.execute(
    `SELECT id, account, display_name, department, organization_role, role, is_enabled, is_platform_admin, file_platform_user_id
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin),
    filePlatformUserId: row.file_platform_user_id
  };
}

async function inferUserId({ date, projectId }) {
  const params = [];
  const where = [];

  if (date) {
    where.push('report_date = ?');
    params.push(date);
  }

  if (projectId) {
    where.push('project_id = ?');
    params.push(projectId);
  }

  const [rows] = await pool.execute(
    `SELECT user_id
    FROM daily_reports
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY updated_at DESC, id DESC
    LIMIT 1`,
    params
  );

  return rows[0]?.user_id || null;
}

async function inferProjectId({ userId, date }) {
  const params = [];
  const where = [];

  if (userId) {
    where.push('user_id = ?');
    params.push(userId);
  }

  if (date) {
    where.push('report_date = ?');
    params.push(date);
  }

  const [rows] = await pool.execute(
    `SELECT project_id
    FROM daily_reports
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY updated_at DESC, id DESC
    LIMIT 1`,
    params
  );

  return rows[0]?.project_id || null;
}

async function loadProject(projectId) {
  const [rows] = await pool.execute(
    `SELECT id, project_code, project_name, project_manager_user_id, status
    FROM projects
    WHERE id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

async function loadExistingReport({ userId, date, projectId }) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, report_date, project_id, status, created_at, updated_at
    FROM daily_reports
    WHERE user_id = ?
      AND report_date = ?
      AND project_id = ?
    LIMIT 1`,
    [userId, date, projectId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    report_date: date
  };
}

function buildSubmittedPayload({ date, projectId }) {
  return {
    reportDate: date,
    projectId,
    status: ReportStatus.SUBMITTED,
    items: [
      {
        workContent: '诊断脚本提交测试',
        completionProgress: '100%',
        completedAt: '17:30',
        responsiblePerson: '诊断脚本',
        deviationAndCorrectiveAction: '无偏差'
      }
    ],
    plans: [
      {
        plannedWorkContent: '诊断脚本明日计划',
        responsiblePerson: '诊断脚本',
        plannedCompleteAt: '17:30',
        collaboratingCenter: '',
        collaborationItem: ''
      }
    ]
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const date = options.date || new Date().toISOString().slice(0, 10);
  let userId = options['user-id'] ? Number(options['user-id']) : null;
  let projectId = options['project-id'] ? Number(options['project-id']) : null;

  if (!userId) {
    userId = await inferUserId({ date, projectId });
  }

  if (!projectId) {
    projectId = await inferProjectId({ userId, date });
  }

  printSection('诊断参数');
  printJson('输入', {
    date,
    userId,
    projectId,
    execute: options.execute
  });

  printSection('表结构检查');
  const tableColumns = {
    daily_reports: await listColumns('daily_reports'),
    daily_report_items: await listColumns('daily_report_items'),
    daily_report_plans: await listColumns('daily_report_plans'),
    users: await listColumns('users')
  };
  printJson('列', tableColumns);

  if (!userId || !projectId) {
    throw new Error('缺少 userId 或 projectId，请传入 --user-id=用户ID --project-id=项目ID');
  }

  printSection('用户和项目检查');
  const user = await loadUser(userId);
  const project = await loadProject(projectId);
  printJson('用户', user);
  printJson('项目', project);

  if (!user) {
    throw new Error(`用户不存在: ${userId}`);
  }

  if (!project) {
    throw new Error(`项目不存在: ${projectId}`);
  }

  const visibleProjects = await searchActiveProjectsForDailyReports({
    q: project.project_code || '',
    limit: 50,
    user
  });
  const visible = visibleProjects.some((item) => Number(item.id) === Number(projectId));
  printJson('项目可见性', {
    visible,
    matchedProjectIds: visibleProjects.map((item) => item.id)
  });

  const existing = await loadExistingReport({ userId, date, projectId });
  printSection('已有日报检查');
  printJson('同用户同日期同项目日报', existing);

  printSection('payload 校验');
  const payload = buildSubmittedPayload({ date, projectId });
  const normalized = normalizeDailyReportPayload(payload);
  printJson('规范化后的提交 payload', normalized);

  printSection('结论');
  if (!visible) {
    console.log('失败原因：当前用户不可见该项目，后端会返回 DAILY_REPORT_PROJECT_NOT_AVAILABLE。');
  } else if (existing) {
    console.log('后端当前规则：正式提交会覆盖这条已有日报，不应再因为重复记录失败。');
  } else {
    console.log('后端当前规则：没有已有日报，将创建新的正式提交日报。');
  }

  if (!options.execute) {
    console.log('当前为只读诊断，未写入数据库。需要真实执行当前提交逻辑时追加 --execute。');
    return;
  }

  printSection('执行提交');
  const result = await createDailyReport({ user, report: normalized });
  printJson('提交结果', result);
}

main()
  .catch((error) => {
    printSection('诊断失败');
    printJson('错误', {
      name: error.name,
      code: error.code,
      message: error.message,
      sqlMessage: error.sqlMessage,
      details: error.details,
      stack: error.stack
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
