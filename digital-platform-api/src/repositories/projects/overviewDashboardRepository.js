import { pool } from '../../db/pool.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { buildStageCompletenessSummary } from '../stageDocuments/shared.js';
import { mapCreator } from '../userRepository.js';
import {
  buildInClause,
  groupRowsBy,
  mapProjectManagerUser,
  PROJECT_OVERVIEW_DASHBOARD_ERROR,
  ProjectOverviewDashboardQueryError
} from './shared.js';
import { buildProjectVisibilityCondition } from './visibility.js';

const PROJECT_OVERVIEW_STATUS_FILTERS = new Set(Object.values(PROJECT_STATUS));

function throwProjectOverviewQueryError(code, message, details) {
  throw new ProjectOverviewDashboardQueryError(code, message, 400, details);
}

function normalizeProjectOverviewStatus(rawStatus) {
  if (rawStatus === undefined || rawStatus === null) {
    return null;
  }

  if (Array.isArray(rawStatus)) {
    throwProjectOverviewQueryError(
      PROJECT_OVERVIEW_DASHBOARD_ERROR.INVALID_PROJECT_STATUS_FILTER,
      'Invalid project status filter',
      ['status']
    );
  }

  const status = String(rawStatus).trim();
  if (!status || !PROJECT_OVERVIEW_STATUS_FILTERS.has(status)) {
    throwProjectOverviewQueryError(
      PROJECT_OVERVIEW_DASHBOARD_ERROR.INVALID_PROJECT_STATUS_FILTER,
      'Invalid project status filter',
      ['status']
    );
  }

  return status;
}

function normalizeProjectOverviewStageOrder(rawStageOrder) {
  if (rawStageOrder === undefined || rawStageOrder === null) {
    return null;
  }

  if (Array.isArray(rawStageOrder)) {
    throwProjectOverviewQueryError(
      PROJECT_OVERVIEW_DASHBOARD_ERROR.INVALID_STAGE_ORDER,
      'Invalid current stage order',
      ['currentStageOrder']
    );
  }

  const text = String(rawStageOrder).trim();
  if (!/^[1-8]$/.test(text)) {
    throwProjectOverviewQueryError(
      PROJECT_OVERVIEW_DASHBOARD_ERROR.INVALID_STAGE_ORDER,
      'Invalid current stage order',
      ['currentStageOrder']
    );
  }

  return Number(text);
}

function normalizeProjectOverviewKeyword(rawKeyword) {
  if (rawKeyword === undefined || rawKeyword === null) {
    return '';
  }

  const value = Array.isArray(rawKeyword) ? rawKeyword[0] : rawKeyword;
  return String(value || '').trim();
}

export function normalizeProjectOverviewDashboardFilters(query = {}) {
  return {
    status: normalizeProjectOverviewStatus(query.status),
    currentStageOrder: normalizeProjectOverviewStageOrder(query.currentStageOrder),
    keyword: normalizeProjectOverviewKeyword(query.keyword)
  };
}

function buildProjectOverviewWhereClause(filters, user) {
  const conditions = [];
  const params = [];
  const visibility = buildProjectVisibilityCondition(user, 'p');

  conditions.push(visibility.sql);
  params.push(...visibility.params);

  if (filters.status) {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }

  if (filters.keyword) {
    const keyword = `%${filters.keyword}%`;
    conditions.push('(p.project_code LIKE ? OR p.project_name LIKE ? OR p.customer_name LIKE ?)');
    params.push(keyword, keyword, keyword);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function mapProjectOverviewDocument(row) {
  return {
    id: row.id,
    documentCode: row.document_code,
    documentName: row.document_name,
    isRequired: Boolean(row.is_required),
    isApplicable: row.is_applicable === undefined ? true : Boolean(row.is_applicable),
    status: row.status
  };
}

function stripCompletenessSummary(summary) {
  return {
    requiredTotal: summary.requiredTotal,
    confirmedRequiredCount: summary.confirmedRequiredCount,
    incompleteRequiredCount: summary.incompleteRequiredCount,
    completionPercent: summary.completionPercent
  };
}

function buildProjectOverviewCard(projectRow, stages, documents) {
  const isCompleted = projectRow.status === PROJECT_STATUS.COMPLETED;
  const currentStages = stages.filter((stage) => Boolean(stage.is_current));
  const base = {
    projectId: projectRow.id,
    projectCode: projectRow.project_code,
    projectName: projectRow.project_name,
    customerName: projectRow.customer_name,
    projectMode: projectRow.project_mode,
    projectManagerUserId: projectRow.project_manager_user_id,
    projectManagerUser: mapProjectManagerUser(projectRow),
    projectManager: projectRow.project_manager_display_name || projectRow.project_manager,
    status: projectRow.status,
    currentStageId: null,
    currentStageName: null,
    currentStageOrder: null,
    currentStageStatus: null,
    currentStageCompletenessSummary: null,
    currentStageIncompleteRequiredDocuments: [],
    currentStageIssue: null,
    createdBy: mapCreator(projectRow),
    plannedStartDate: projectRow.planned_start_date,
    plannedEndDate: projectRow.planned_end_date
  };

  if (isCompleted) {
    return base;
  }

  if (currentStages.length === 0) {
    return {
      ...base,
      currentStageIssue: 'missing_current_stage'
    };
  }

  if (currentStages.length > 1) {
    return {
      ...base,
      currentStageIssue: 'multiple_current_stages'
    };
  }

  const currentStage = currentStages[0];
  const currentStageDocuments = documents
    .filter((document) => document.stage_order === currentStage.stage_order)
    .map(mapProjectOverviewDocument);

  const currentStageBase = {
    ...base,
    currentStageId: currentStage.id,
    currentStageName: currentStage.stage_name,
    currentStageOrder: currentStage.stage_order,
    currentStageStatus: currentStage.stage_status
  };

  if (currentStageDocuments.length === 0) {
    return {
      ...currentStageBase,
      currentStageIssue: 'checklist_not_initialized'
    };
  }

  const summary = buildStageCompletenessSummary(currentStageDocuments);

  return {
    ...currentStageBase,
    currentStageCompletenessSummary: stripCompletenessSummary(summary),
    currentStageIncompleteRequiredDocuments: summary.incompleteRequiredDocuments
  };
}

function matchesCurrentStageOrderFilter(project, currentStageOrder) {
  if (currentStageOrder === null) {
    return true;
  }

  return project.currentStageOrder === currentStageOrder;
}

function buildOverviewSummary(projects, myPendingStageDocumentTasks) {
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status !== PROJECT_STATUS.COMPLETED).length,
    completedProjects: projects.filter((project) => project.status === PROJECT_STATUS.COMPLETED).length,
    riskProjects: projects.filter(
      (project) => project.status === PROJECT_STATUS.RISK || project.status === PROJECT_STATUS.DELAYED
    ).length,
    myPendingStageDocumentTasks
  };
}

async function selectProjectOverviewRows(filters, user) {
  const { whereClause, params } = buildProjectOverviewWhereClause(filters, user);
  const [rows] = await pool.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.project_mode,
      p.project_manager,
      p.project_manager_user_id,
      p.status,
      p.planned_start_date,
      p.planned_end_date,
      p.created_by_user_id,
      u.account AS creator_account,
      u.display_name AS creator_display_name,
      u.department AS creator_department,
      u.organization_role AS creator_organization_role,
      u.role AS creator_role,
      u.is_enabled AS creator_is_enabled,
      u.file_platform_user_id AS creator_file_platform_user_id,
      pm.account AS project_manager_account,
      pm.display_name AS project_manager_display_name,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.role AS project_manager_role,
      pm.is_enabled AS project_manager_is_enabled,
      pm.file_platform_user_id AS project_manager_file_platform_user_id
    FROM projects p
    LEFT JOIN users u
      ON u.id = p.created_by_user_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    ${whereClause}
    ORDER BY p.project_code ASC, p.id ASC`,
    params
  );

  return rows;
}

async function selectProjectOverviewStages(projectIds) {
  if (projectIds.length === 0) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      id,
      project_id,
      stage_order,
      stage_key,
      stage_name,
      stage_status,
      is_current
    FROM project_stages
    WHERE project_id IN (${buildInClause(projectIds)})
    ORDER BY project_id ASC, stage_order ASC, id ASC`,
    projectIds
  );

  return rows;
}

async function selectProjectOverviewDocuments(projectIds) {
  if (projectIds.length === 0) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      id,
      project_id,
      stage_order,
      document_order,
      document_code,
      document_name,
      is_required,
      is_applicable,
      status
    FROM project_stage_documents
    WHERE project_id IN (${buildInClause(projectIds)})
    ORDER BY project_id ASC, stage_order ASC, document_order ASC, id ASC`,
    projectIds
  );

  return rows;
}

async function countMyPendingStageDocumentTasks(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
    FROM project_stage_documents
    WHERE responsible_user_id = ?
      AND is_applicable = 1
      AND status IN (?, ?, ?)`,
    [userId, DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.RETURNED]
  );

  return Number(rows[0].count);
}

export async function getProjectOverviewDashboard(user, filters) {
  const [projectRows, myPendingStageDocumentTasks] = await Promise.all([
    selectProjectOverviewRows(filters, user),
    countMyPendingStageDocumentTasks(user.id)
  ]);
  const projectIds = projectRows.map((project) => project.id);
  const [stageRows, documentRows] = await Promise.all([
    selectProjectOverviewStages(projectIds),
    selectProjectOverviewDocuments(projectIds)
  ]);
  const stagesByProject = groupRowsBy(stageRows, 'project_id');
  const documentsByProject = groupRowsBy(documentRows, 'project_id');
  const projects = projectRows
    .map((projectRow) =>
      buildProjectOverviewCard(
        projectRow,
        stagesByProject.get(projectRow.id) || [],
        documentsByProject.get(projectRow.id) || []
      )
    )
    .filter((project) => matchesCurrentStageOrderFilter(project, filters.currentStageOrder));

  return {
    summary: buildOverviewSummary(projects, myPendingStageDocumentTasks),
    projects
  };
}
