import {
  PROJECT_APPROVAL_ACTION,
  PROJECT_APPROVAL_ERROR,
  PROJECT_APPROVAL_STATUS,
  assertApprovalReturnComment,
  canUserApproveAsCenterManager,
  canUserApproveAsGeneralManager,
  canUserHandleStageApproval,
  canUserSubmitStageApproval,
  getStageApprovalRule,
  isValidCloseoutApprovalCenter
} from '../../domain/projectApproval.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { pool } from '../../db/pool.js';
import { buildStageCompletenessSummary, mapGateDocument } from '../stageDocuments/shared.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import { canViewCompleteProjectAudit } from '../stageDocuments/accessControl.js';
import { canViewProject } from './visibility.js';
import {
  ProjectApprovalError,
  ProjectAuthorizationError,
  ProjectNotFoundError,
  ProjectStageNotFoundError,
  mapStage
} from './shared.js';

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

function mapApprovalHistory(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id,
    approvalNode: row.approval_node,
    actionType: row.action_type,
    actorUserId: row.actor_user_id,
    actorApprovalRole: row.actor_approval_role,
    actorUser: {
      id: row.actor_user_id,
      account: row.actor_account,
      name: row.actor_display_name,
      department: row.actor_department,
      organizationRole: row.actor_organization_role,
      role: row.actor_role,
      isEnabled: row.actor_is_enabled === null ? null : Boolean(row.actor_is_enabled),
      filePlatformUserId: row.actor_file_platform_user_id
    },
    comment: row.comment,
    fromApprovalStatus: row.from_approval_status,
    toApprovalStatus: row.to_approval_status,
    createdAt: row.created_at
  };
}

async function selectProjectForApproval(connection, projectId, lock = false) {
  const [rows] = await connection.execute(
    `SELECT
      p.*,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.is_enabled AS project_manager_is_enabled
    FROM projects p
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    WHERE p.id = ?
    LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

async function selectStageForApproval(connection, projectId, stageId, lock = false) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stages
    WHERE project_id = ?
      AND id = ?
    LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [projectId, stageId]
  );

  if (rows.length === 0) {
    throw new ProjectStageNotFoundError(projectId, stageId);
  }

  return rows[0];
}

async function buildStageGateSummaryForUpdate(connection, projectId, stageOrder) {
  const [rows] = await connection.execute(
    `SELECT id, document_code, document_name, is_required, status, is_applicable
    FROM project_stage_documents
    WHERE project_id = ?
      AND stage_order = ?
    ORDER BY document_order ASC
    FOR UPDATE`,
    [projectId, stageOrder]
  );

  if (rows.length === 0) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE,
      'Current stage document checklist is not initialized',
      409,
      {
        completenessSummary: {
          requiredTotal: 0,
          confirmedRequiredCount: 0,
          incompleteRequiredCount: 0,
          completionPercent: 0,
          incompleteRequiredDocuments: []
        },
        incompleteRequiredDocuments: []
      }
    );
  }

  return buildStageCompletenessSummary(rows.map(mapGateDocument));
}

function assertStageDocumentsComplete(gateSummary) {
  if (gateSummary.requiredTotal === 0) {
    return;
  }

  if (gateSummary.incompleteRequiredCount > 0) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE,
      'Current stage has incomplete applicable required documents',
      409,
      {
        completenessSummary: gateSummary,
        incompleteRequiredDocuments: gateSummary.incompleteRequiredDocuments
      }
    );
  }
}

function assertCanSubmitOrResubmit({ user, project, stage, rule, expectedStatuses }) {
  if (project.status === PROJECT_STATUS.ENDED) {
    throw new ProjectApprovalError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and stage approval cannot be submitted',
      409,
      ['projectId']
    );
  }

  if (!canUserSubmitStageApproval(user, project)) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_FORBIDDEN,
      'Current user cannot submit this stage approval',
      403,
      ['projectManagerUserId']
    );
  }

  if (!stage.is_current) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_NOT_SUBMITTABLE,
      'Only current stage approval can be submitted',
      409,
      ['stageId']
    );
  }

  if (!isValidCloseoutApprovalCenter(rule)) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_NOT_SUBMITTABLE,
      'Closeout stage approval requires project manager business department',
      409,
      ['projectManagerUserId']
    );
  }

  if (!expectedStatuses.includes(stage.approval_status)) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_NOT_SUBMITTABLE,
      'Stage approval is not submittable',
      409,
      ['approvalStatus']
    );
  }
}

function assertPendingApprovalStatus(stage) {
  if (
    stage.approval_status !== PROJECT_APPROVAL_STATUS.PENDING_CENTER_MANAGER &&
    stage.approval_status !== PROJECT_APPROVAL_STATUS.PENDING_GENERAL_MANAGER
  ) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_NOT_PENDING,
      'Stage approval is not pending',
      409,
      ['approvalStatus']
    );
  }
}

function buildApprovalActionContext({ action, user, project, stage, rule, returnComment }) {
  if (project.status === PROJECT_STATUS.ENDED) {
    throw new ProjectApprovalError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and stage approval cannot be handled',
      409,
      ['projectId']
    );
  }

  if (!canUserHandleStageApproval(user)) {
    throw new ProjectApprovalError(
      PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_FORBIDDEN,
      'Current user cannot handle stage approval',
      403,
      ['organizationRole']
    );
  }

  assertPendingApprovalStatus(stage);

  if (stage.approval_status === PROJECT_APPROVAL_STATUS.PENDING_CENTER_MANAGER) {
    if (action === 'approve') {
      if (!canUserApproveAsCenterManager(user, rule)) {
        throw new ProjectApprovalError(
          PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_FORBIDDEN,
          'Current user cannot approve this center manager approval node',
          403,
          ['organizationRole']
        );
      }

      return {
        actionType: PROJECT_APPROVAL_ACTION.CENTER_MANAGER_APPROVE,
        operationActionType: OPERATION_ACTION_TYPE.APPROVAL_CENTER_APPROVED,
        approvalRole: 'center_manager',
        approvalNode: rule.centerApprovalNode,
        nextStatus: rule.requiresGeneralManagerApproval
          ? PROJECT_APPROVAL_STATUS.PENDING_GENERAL_MANAGER
          : PROJECT_APPROVAL_STATUS.APPROVED,
        comment: null,
        summary: `中心负责人关口审批通过：${stage.stage_name}`
      };
    }

    if (action === 'return') {
      if (!canUserApproveAsCenterManager(user, rule)) {
        throw new ProjectApprovalError(
          PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_FORBIDDEN,
          'Current user cannot return this center manager approval node',
          403,
          ['organizationRole']
        );
      }

      return {
        actionType: PROJECT_APPROVAL_ACTION.CENTER_MANAGER_RETURN,
        operationActionType: OPERATION_ACTION_TYPE.APPROVAL_CENTER_RETURNED,
        approvalRole: 'center_manager',
        approvalNode: rule.centerApprovalNode,
        nextStatus: PROJECT_APPROVAL_STATUS.RETURNED_BY_CENTER_MANAGER,
        comment: returnComment,
        summary: `中心负责人关口审批退回：${stage.stage_name}`
      };
    }
  }

  if (stage.approval_status === PROJECT_APPROVAL_STATUS.PENDING_GENERAL_MANAGER) {
    if (!rule.requiresGeneralManagerApproval || !canUserApproveAsGeneralManager(user, rule)) {
      throw new ProjectApprovalError(
        PROJECT_APPROVAL_ERROR.PROJECT_APPROVAL_FORBIDDEN,
        'Current user cannot handle this general manager approval node',
        403,
        ['organizationRole']
      );
    }

    if (action === 'approve') {
      return {
        actionType: PROJECT_APPROVAL_ACTION.GENERAL_MANAGER_APPROVE,
        operationActionType: OPERATION_ACTION_TYPE.APPROVAL_GENERAL_APPROVED,
        approvalRole: 'general_manager',
        approvalNode: rule.generalApprovalNode,
        nextStatus: PROJECT_APPROVAL_STATUS.APPROVED,
        comment: null,
        summary: `总经理关口审批通过：${stage.stage_name}`
      };
    }

    if (action === 'return') {
      return {
        actionType: PROJECT_APPROVAL_ACTION.GENERAL_MANAGER_RETURN,
        operationActionType: OPERATION_ACTION_TYPE.APPROVAL_GENERAL_RETURNED,
        approvalRole: 'general_manager',
        approvalNode: rule.generalApprovalNode,
        nextStatus: PROJECT_APPROVAL_STATUS.RETURNED_BY_GENERAL_MANAGER,
        comment: returnComment,
        summary: `总经理关口审批退回：${stage.stage_name}`
      };
    }
  }

  throw new ProjectApprovalError(
    PROJECT_APPROVAL_ERROR.INVALID_APPROVAL_ACTION,
    'Invalid approval action',
    400,
    ['action']
  );
}

async function updateStageApprovalStatus(connection, stageId, nextStatus) {
  await connection.execute(
    `UPDATE project_stages
    SET approval_status = ?
    WHERE id = ?`,
    [nextStatus, stageId]
  );
}

async function insertApprovalHistory(connection, payload) {
  const [result] = await connection.execute(
    `INSERT INTO project_stage_approval_history (
      project_id,
      stage_id,
      approval_node,
      action_type,
      actor_user_id,
      actor_approval_role,
      comment,
      from_approval_status,
      to_approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.projectId,
      payload.stageId,
      payload.approvalNode,
      payload.actionType,
      payload.actorUserId,
      payload.actorApprovalRole,
      payload.comment,
      payload.fromApprovalStatus,
      payload.toApprovalStatus
    ]
  );

  return result.insertId;
}

async function recordApprovalOperationLog(connection, payload) {
  await insertOperationLog(connection, {
    projectId: payload.projectId,
    actorUserId: payload.actorUserId,
    actionType: payload.operationActionType,
    targetType: OPERATION_TARGET_TYPE.APPROVAL,
    targetId: payload.approvalId,
    summary: payload.summary,
    details: {
      approvalId: payload.approvalId,
      stageId: payload.stageId,
      approvalNode: payload.approvalNode,
      approvalRole: payload.actorApprovalRole,
      fromApprovalStatus: payload.fromApprovalStatus,
      toApprovalStatus: payload.toApprovalStatus,
      comment: payload.comment,
      returnReason: payload.returnReason,
      completenessSummary: payload.completenessSummary
    }
  });
}

async function loadApprovalTarget(connection, { projectId, stageId, lock }) {
  const project = await selectProjectForApproval(connection, projectId, lock);
  const stage = await selectStageForApproval(connection, projectId, stageId, lock);
  const projectManagerUser = mapProjectManagerUser(project);
  const rule = getStageApprovalRule(stage, projectManagerUser);

  return {
    project,
    stage,
    projectManagerUser,
    rule
  };
}

export async function submitStageApproval({ projectId, stageId, user }) {
  return submitOrResubmitStageApproval({
    projectId,
    stageId,
    user,
    expectedStatuses: [PROJECT_APPROVAL_STATUS.NOT_SUBMITTED],
    actionType: PROJECT_APPROVAL_ACTION.SUBMIT,
    operationActionType: OPERATION_ACTION_TYPE.APPROVAL_SUBMITTED,
    summaryPrefix: '提交阶段关口审批'
  });
}

export async function resubmitStageApproval({ projectId, stageId, user }) {
  return submitOrResubmitStageApproval({
    projectId,
    stageId,
    user,
    expectedStatuses: [
      PROJECT_APPROVAL_STATUS.RETURNED_BY_CENTER_MANAGER,
      PROJECT_APPROVAL_STATUS.RETURNED_BY_GENERAL_MANAGER
    ],
    actionType: PROJECT_APPROVAL_ACTION.RESUBMIT,
    operationActionType: OPERATION_ACTION_TYPE.APPROVAL_RESUBMITTED,
    summaryPrefix: '重新提交阶段关口审批'
  });
}

async function submitOrResubmitStageApproval({
  projectId,
  stageId,
  user,
  expectedStatuses,
  actionType,
  operationActionType,
  summaryPrefix
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const { project, stage, rule } = await loadApprovalTarget(connection, { projectId, stageId, lock: true });
    assertCanSubmitOrResubmit({ user, project, stage, rule, expectedStatuses });
    const gateSummary = await buildStageGateSummaryForUpdate(connection, projectId, stage.stage_order);
    assertStageDocumentsComplete(gateSummary);

    const nextStatus = PROJECT_APPROVAL_STATUS.PENDING_CENTER_MANAGER;
    await updateStageApprovalStatus(connection, stageId, nextStatus);
    const approvalId = await insertApprovalHistory(connection, {
      projectId,
      stageId,
      approvalNode: rule.centerApprovalNode,
      actionType,
      actorUserId: user.id,
      actorApprovalRole: 'project_manager',
      comment: null,
      fromApprovalStatus: stage.approval_status,
      toApprovalStatus: nextStatus
    });
    await recordApprovalOperationLog(connection, {
      projectId,
      stageId,
      approvalId,
      approvalNode: rule.centerApprovalNode,
      actorUserId: user.id,
      actorApprovalRole: 'project_manager',
      operationActionType,
      summary: `${summaryPrefix}：${stage.stage_name}`,
      fromApprovalStatus: stage.approval_status,
      toApprovalStatus: nextStatus,
      completenessSummary: gateSummary
    });
    await connection.commit();

    return {
      stage: mapStage({
        ...stage,
        approval_status: nextStatus
      }),
      approval: {
        id: approvalId,
        approvalNode: rule.centerApprovalNode,
        actionType,
        fromApprovalStatus: stage.approval_status,
        toApprovalStatus: nextStatus
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function approveStageApproval({ projectId, stageId, user }) {
  return approveOrReturnStageApproval({ projectId, stageId, user, action: 'approve' });
}

export async function returnStageApproval({ projectId, stageId, user, comment }) {
  const returnComment = assertApprovalReturnComment(comment, ProjectApprovalError);
  return approveOrReturnStageApproval({ projectId, stageId, user, action: 'return', returnComment });
}

async function approveOrReturnStageApproval({ projectId, stageId, user, action, returnComment = null }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const { project, stage, rule } = await loadApprovalTarget(connection, { projectId, stageId, lock: true });
    const actionContext = buildApprovalActionContext({ action, user, project, stage, rule, returnComment });

    if (action === 'approve') {
      const gateSummary = await buildStageGateSummaryForUpdate(connection, projectId, stage.stage_order);
      assertStageDocumentsComplete(gateSummary);
      actionContext.completenessSummary = gateSummary;
    }

    await updateStageApprovalStatus(connection, stageId, actionContext.nextStatus);
    const approvalId = await insertApprovalHistory(connection, {
      projectId,
      stageId,
      approvalNode: actionContext.approvalNode,
      actionType: actionContext.actionType,
      actorUserId: user.id,
      actorApprovalRole: actionContext.approvalRole,
      comment: actionContext.comment,
      fromApprovalStatus: stage.approval_status,
      toApprovalStatus: actionContext.nextStatus
    });
    await recordApprovalOperationLog(connection, {
      projectId,
      stageId,
      approvalId,
      approvalNode: actionContext.approvalNode,
      actorUserId: user.id,
      actorApprovalRole: actionContext.approvalRole,
      operationActionType: actionContext.operationActionType,
      summary: actionContext.summary,
      fromApprovalStatus: stage.approval_status,
      toApprovalStatus: actionContext.nextStatus,
      comment: actionContext.comment,
      returnReason: actionContext.comment,
      completenessSummary: actionContext.completenessSummary || null
    });
    await connection.commit();

    return {
      stage: mapStage({
        ...stage,
        approval_status: actionContext.nextStatus
      }),
      approval: {
        id: approvalId,
        approvalNode: actionContext.approvalNode,
        actionType: actionContext.actionType,
        fromApprovalStatus: stage.approval_status,
        toApprovalStatus: actionContext.nextStatus
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listStageApprovalHistory({ projectId, stageId, user }) {
  const connection = await pool.getConnection();

  try {
    const project = await selectProjectForApproval(connection, projectId, false);
    await selectStageForApproval(connection, projectId, stageId, false);

    if (
      !(await canViewProject(connection, user, project.id)) ||
      !canViewCompleteProjectAudit(user, project)
    ) {
      throw new ProjectAuthorizationError(
        'FORBIDDEN_OPERATION',
        'Current user cannot view this stage approval history',
        ['projectId']
      );
    }

    const [rows] = await connection.execute(
      `SELECT
        h.*,
        u.account AS actor_account,
        u.display_name AS actor_display_name,
        u.department AS actor_department,
        u.organization_role AS actor_organization_role,
        u.role AS actor_role,
        u.is_enabled AS actor_is_enabled,
        u.file_platform_user_id AS actor_file_platform_user_id
      FROM project_stage_approval_history h
      LEFT JOIN users u
        ON u.id = h.actor_user_id
      WHERE h.project_id = ?
        AND h.stage_id = ?
      ORDER BY h.created_at ASC, h.id ASC`,
      [projectId, stageId]
    );

    return rows.map(mapApprovalHistory);
  } finally {
    connection.release();
  }
}
