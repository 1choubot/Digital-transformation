import { pool } from '../../db/pool.js';
import {
  canAdvanceProjectStage,
  isCenterManagerUser,
  isGeneralManagerAssistantUser,
  isSystemAdminUser
} from '../../domain/organization.js';
import {
  PROJECT_APPROVAL_STATUS,
  canUserApproveAsCenterManager,
  canUserApproveAsGeneralManager,
  getStageApprovalRule
} from '../../domain/projectApproval.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { attachStageDocumentPermissions } from './accessControl.js';
import { mapDocument } from './shared.js';

const WORKBENCH_TODO_TYPES = [
  'document_responsibility',
  'document_review',
  'stage_gate_approval',
  'stage_advance'
];

function mapWorkbenchProject(row) {
  return {
    id: row.project_id,
    project_manager_user_id: row.project_manager_user_id,
    participating_departments: row.participating_departments,
    status: row.project_status,
    has_department_responsible: row.has_department_responsible ?? 0
  };
}

function mapProjectManagerUser(row) {
  if (!row.project_manager_user_id) {
    return null;
  }

  return {
    id: row.project_manager_user_id,
    department: row.project_manager_department,
    organizationRole: row.project_manager_organization_role,
    isEnabled: row.project_manager_is_enabled === null ? null : Boolean(row.project_manager_is_enabled)
  };
}

function buildDocumentTargetRoute(item, user) {
  if (user.organizationRole === 'employee') {
    return `/projects/${item.projectId}?taskMode=document&documentId=${item.documentId}`;
  }

  return `/projects/${item.projectId}?taskMode=document&documentId=${item.documentId}`;
}

function buildStageTargetRoute(item, taskMode) {
  return `/projects/${item.projectId}?taskMode=${taskMode}&stageId=${item.stageId}`;
}

function buildDocumentTodo({ row, user, type, actionText }) {
  const project = mapWorkbenchProject(row);
  const document = attachStageDocumentPermissions({
    user,
    project,
    document: mapDocument(row)
  });
  const item = {
    type,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageOrder: row.stage_order,
    stageName: row.stage_name,
    documentId: row.id,
    documentCode: row.document_code,
    documentName: row.document_name,
    status: row.status,
    actionText,
    createdAt: row.responsibility_updated_at || row.submitted_at || row.updated_at,
    updatedAt: row.responsibility_updated_at || row.submitted_at || row.updated_at,
    targetRoute: '',
    permissions: document.permissions
  };

  item.targetRoute = buildDocumentTargetRoute(item, user);
  return item;
}

function buildStageTodo({ row, type, actionText, taskMode }) {
  const item = {
    type,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageOrder: row.stage_order,
    stageName: row.stage_name,
    documentId: null,
    documentCode: null,
    documentName: null,
    status: row.approval_status,
    actionText,
    createdAt: row.stage_updated_at || row.project_updated_at,
    updatedAt: row.stage_updated_at || row.project_updated_at,
    targetRoute: ''
  };

  item.targetRoute = buildStageTargetRoute(item, taskMode);
  return item;
}

async function selectDocumentResponsibilityTodos(user) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      d.*,
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.project_manager_user_id,
      p.participating_departments,
      p.status AS project_status,
      p.updated_at AS project_updated_at,
      s.id AS stage_id,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id,
      0 AS has_department_responsible
    FROM project_stage_documents d
    INNER JOIN projects p
      ON p.id = d.project_id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.responsible_user_id = ?
      AND d.is_applicable = 1
      AND d.status IN (?, ?)
    ORDER BY
      CASE d.status WHEN 'returned' THEN 1 ELSE 2 END ASC,
      COALESCE(d.returned_at, d.responsibility_updated_at, d.updated_at) DESC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [user.id, DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.RETURNED]
  );

  return rows.map((row) =>
    buildDocumentTodo({
      row,
      user,
      type: 'document_responsibility',
      actionText: row.status === DOCUMENT_STATUS.RETURNED ? '修改后重新提交资料审核' : '提交资料审核'
    })
  );
}

async function selectDocumentReviewTodos(user) {
  if (!isCenterManagerUser(user) || !user.department) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      d.*,
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.project_manager_user_id,
      p.participating_departments,
      p.status AS project_status,
      p.updated_at AS project_updated_at,
      s.id AS stage_id,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id,
      1 AS has_department_responsible
    FROM project_stage_documents d
    INNER JOIN users u
      ON u.id = d.responsible_user_id
    INNER JOIN projects p
      ON p.id = d.project_id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    WHERE d.is_applicable = 1
      AND d.status = ?
      AND u.department = ?
    ORDER BY
      COALESCE(d.submitted_at, d.updated_at) ASC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [DOCUMENT_STATUS.SUBMITTED, user.department]
  );

  return rows.map((row) =>
    buildDocumentTodo({
      row,
      user,
      type: 'document_review',
      actionText: '处理资料级审核'
    })
  );
}

async function selectStageGateApprovalTodos(user) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.project_manager_user_id,
      p.participating_departments,
      p.status AS project_status,
      p.updated_at AS project_updated_at,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.is_enabled AS project_manager_is_enabled,
      s.id AS stage_id,
      s.stage_order,
      s.stage_key,
      s.stage_name,
      s.approval_status,
      s.updated_at AS stage_updated_at
    FROM project_stages s
    INNER JOIN projects p
      ON p.id = s.project_id
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    WHERE s.is_current = 1
      AND s.approval_status IN (?, ?)
      AND p.status <> ?
    ORDER BY
      p.project_code ASC,
      s.stage_order ASC,
      s.id ASC`,
    [
      PROJECT_APPROVAL_STATUS.PENDING_CENTER_MANAGER,
      PROJECT_APPROVAL_STATUS.PENDING_GENERAL_MANAGER,
      PROJECT_STATUS.COMPLETED
    ]
  );

  return rows
    .filter((row) => {
      const rule = getStageApprovalRule(row, mapProjectManagerUser(row));
      if (row.approval_status === PROJECT_APPROVAL_STATUS.PENDING_CENTER_MANAGER) {
        return canUserApproveAsCenterManager(user, rule);
      }

      return canUserApproveAsGeneralManager(user, rule);
    })
    .map((row) =>
      buildStageTodo({
        row,
        type: 'stage_gate_approval',
        actionText:
          row.approval_status === PROJECT_APPROVAL_STATUS.PENDING_GENERAL_MANAGER
            ? '处理总经理阶段关口审批'
            : '处理中心负责人阶段关口审批',
        taskMode: 'stageApproval'
      })
    );
}

async function selectStageAdvanceTodos(user) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return [];
  }

  const centerResponsibleSelect =
    isCenterManagerUser(user) && user.department
      ? `EXISTS (
          SELECT 1
          FROM project_stage_documents related_documents
          INNER JOIN users related_users
            ON related_users.id = related_documents.responsible_user_id
          WHERE related_documents.project_id = p.id
            AND related_users.department = ?
        )`
      : '0';
  const params = [];
  if (isCenterManagerUser(user) && user.department) {
    params.push(user.department);
  }

  const [rows] = await pool.execute(
    `SELECT
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.project_manager_user_id,
      p.participating_departments,
      p.status AS project_status,
      p.updated_at AS project_updated_at,
      ${centerResponsibleSelect} AS has_department_responsible,
      s.id AS stage_id,
      s.stage_order,
      s.stage_key,
      s.stage_name,
      s.approval_status,
      s.updated_at AS stage_updated_at
    FROM project_stages s
    INNER JOIN projects p
      ON p.id = s.project_id
    WHERE s.is_current = 1
      AND s.approval_status = ?
      AND s.stage_order < 8
      AND p.status <> ?
      AND EXISTS (
        SELECT 1
        FROM project_stage_documents stage_documents
        WHERE stage_documents.project_id = p.id
          AND stage_documents.stage_order = s.stage_order
      )
      AND NOT EXISTS (
        SELECT 1
        FROM project_stage_documents incomplete_documents
        WHERE incomplete_documents.project_id = p.id
          AND incomplete_documents.stage_order = s.stage_order
          AND incomplete_documents.is_required = 1
          AND incomplete_documents.is_applicable = 1
          AND incomplete_documents.status <> ?
      )
    ORDER BY
      p.project_code ASC,
      s.stage_order ASC,
      s.id ASC`,
    [...params, PROJECT_APPROVAL_STATUS.APPROVED, PROJECT_STATUS.COMPLETED, DOCUMENT_STATUS.CONFIRMED]
  );

  return rows
    .filter((row) => canAdvanceProjectStage(user, mapWorkbenchProject(row)))
    .map((row) =>
      buildStageTodo({
        row,
        type: 'stage_advance',
        actionText: '推进当前阶段',
        taskMode: 'stageAdvance'
      })
    );
}

function buildSummary(items) {
  const byType = Object.fromEntries(WORKBENCH_TODO_TYPES.map((type) => [type, 0]));
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
  }

  return {
    total: items.length,
    byType
  };
}

function sortWorkbenchItems(items) {
  const typeOrder = new Map(WORKBENCH_TODO_TYPES.map((type, index) => [type, index]));
  return [...items].sort((left, right) => {
    const typeDelta = typeOrder.get(left.type) - typeOrder.get(right.type);
    if (typeDelta !== 0) {
      return typeDelta;
    }

    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return (
      String(left.projectCode || '').localeCompare(String(right.projectCode || '')) ||
      Number(left.stageOrder || 0) - Number(right.stageOrder || 0) ||
      Number(left.documentId || 0) - Number(right.documentId || 0) ||
      Number(left.stageId || 0) - Number(right.stageId || 0)
    );
  });
}

export async function getMyWorkbench(user) {
  const groups = await Promise.all([
    selectDocumentResponsibilityTodos(user),
    selectDocumentReviewTodos(user),
    selectStageGateApprovalTodos(user),
    selectStageAdvanceTodos(user)
  ]);
  const items = sortWorkbenchItems(groups.flat());

  return {
    summary: buildSummary(items),
    items
  };
}
