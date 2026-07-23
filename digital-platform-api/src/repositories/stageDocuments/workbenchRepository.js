import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  canAdvanceProjectStage,
  isCenterManagerUser,
  isGeneralManagerAssistantUser,
  isSystemAdminUser
} from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  isInitiationOnlineFormDocument
} from '../../domain/initiationReview.js';
import { SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES } from '../../domain/solutionDesignWorkflow.js';
import { COMPLETION_MODE, DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { attachStageDocumentPermissions } from './accessControl.js';
import {
  attachSolutionDesignDerivedCompletionToStageDocumentRows,
  buildStageCompletenessSummary,
  getDocumentCompletionMode,
  isRevisionRequired,
  isRevisionResubmitted,
  isReviewCompletionMode,
  isStageDocumentComplete,
  mapGateDocument,
  mapDocument
} from './shared.js';
import {
  attachInitiationReviewToStageDocumentRows,
  INITIATION_REVIEW_TODO_TYPE,
  selectInitiationReviewWorkbenchTodos
} from './initiationReviewRepository.js';
import {
  SOLUTION_DESIGN_WORKBENCH_TODO_TYPE,
  selectSolutionDesignWorkbenchTodos
} from '../projects/solutionDesignWorkflowRepository.js';
import {
  CONTRACT_SIGNING_WORKBENCH_TODO_TYPE,
  selectContractSigningWorkbenchTodos
} from '../projects/contractSigningWorkflowRepository.js';

const WORKBENCH_TODO_TYPES = [
  'document_responsibility',
  'document_review',
  INITIATION_REVIEW_TODO_TYPE,
  SOLUTION_DESIGN_WORKBENCH_TODO_TYPE,
  CONTRACT_SIGNING_WORKBENCH_TODO_TYPE
];

const SOLUTION_DESIGN_DEDICATED_DOCUMENT_PLACEHOLDERS = SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES
  .map(() => '?')
  .join(', ');

const INITIATION_COLLABORATION_METADATA_KEY = '_collaboration';
const INITIATION_COLLABORATION_PART = {
  BUSINESS: 'business',
  TECHNICAL: 'technical'
};

function mapWorkbenchProject(row) {
  return {
    id: row.project_id,
    project_manager_user_id: row.project_manager_user_id,
    participating_departments: row.participating_departments,
    status: row.project_status,
    has_department_responsible: row.has_department_responsible ?? 0
  };
}

function buildDocumentTargetRoute(item, user) {
  if (user.organizationRole === 'employee') {
    return `/projects/${item.projectId}?taskMode=document&documentId=${item.documentId}`;
  }

  return `/projects/${item.projectId}?taskMode=document&documentId=${item.documentId}`;
}

function parseJsonValue(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getInitiationCollaborationFromRow(row) {
  const formData = parseJsonValue(row.form_data_json, {});
  const source =
    formData?.[INITIATION_COLLABORATION_METADATA_KEY] &&
    typeof formData[INITIATION_COLLABORATION_METADATA_KEY] === 'object'
      ? formData[INITIATION_COLLABORATION_METADATA_KEY]
      : {};
  return {
    businessSubmitted: source.businessSubmitted === true,
    technicalSubmitted: source.technicalSubmitted === true
  };
}

function buildStageTargetRoute(item, taskMode) {
  return `/projects/${item.projectId}?taskMode=${taskMode}&stageId=${item.stageId}`;
}

function isLinkedInitiationRequirementReworkPending(relatedDocumentsByCode) {
  const initiationApproval = relatedDocumentsByCode?.get('1.2');
  const initiationRequirement = relatedDocumentsByCode?.get('1.1');
  if (!initiationApproval || !initiationRequirement || !isRevisionRequired(initiationRequirement)) {
    return false;
  }

  const revisionSourceDocumentId =
    initiationRequirement.revisionSourceDocumentId ?? initiationRequirement.revision_source_document_id ?? null;
  const initiationDocumentId = initiationApproval.id ?? initiationApproval.documentId ?? null;
  return Boolean(revisionSourceDocumentId) && String(revisionSourceDocumentId) === String(initiationDocumentId);
}

function isInitiationNoticeOnlineFormReady(relatedDocumentsByCode) {
  const initiationApproval = relatedDocumentsByCode?.get('1.2');
  return (
    Boolean(initiationApproval) &&
    isStageDocumentComplete(initiationApproval) &&
    !isLinkedInitiationRequirementReworkPending(relatedDocumentsByCode)
  );
}

function isInitiationRequirementReadyForApprovalCollaboration(relatedDocumentsByCode) {
  const initiationRequirement = relatedDocumentsByCode?.get('1.1');
  return (
    Boolean(initiationRequirement) &&
    [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(initiationRequirement.status) &&
    !isRevisionRequired(initiationRequirement) &&
    !isLinkedInitiationRequirementReworkPending(relatedDocumentsByCode)
  );
}

function buildInitiationNoticeActionText(row) {
  return String(row.project_code ?? '').trim()
    ? '确认项目编号并提交 1.3 项目立项通知'
    : '填写项目编号并提交 1.3 项目立项通知';
}

function buildDocumentTodo({ row, user, type, actionText, relatedDocumentsByCode = null }) {
  const project = mapWorkbenchProject(row);
  const document = attachStageDocumentPermissions({
    user,
    project,
    document: mapDocument(row),
    relatedDocumentsByCode
  });
  let displayActionText = actionText;
  if (type === 'document_responsibility' && isInitiationOnlineFormDocument(row) && !row.collaboration_part) {
    if (
      (row.document_code === '1.2' && isLinkedInitiationRequirementReworkPending(relatedDocumentsByCode)) ||
      (row.document_code === '1.3' && !isInitiationNoticeOnlineFormReady(relatedDocumentsByCode))
    ) {
      displayActionText = '查看在线表单前置状态';
    } else if (row.document_code === '1.3') {
      displayActionText = buildInitiationNoticeActionText(row);
    } else if (isRevisionRequired(row) || row.status === DOCUMENT_STATUS.RETURNED) {
      displayActionText = '通过在线表单重提';
    } else {
      displayActionText = '填写/提交在线表单';
    }
  }
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
    ownerDepartment: row.owner_department ?? null,
    reviewDepartment: row.review_department ?? null,
    completionMode: document.completionMode,
    isComplete: document.isComplete,
    completionStatus: document.completionStatus,
    revisionRequired: document.revisionRequired,
    revisionReason: document.revisionReason,
    revisionSourceDocumentId: document.revisionSourceDocumentId,
    revisionSourceDocument: document.revisionSourceDocument,
    revisionRequestedAt: document.revisionRequestedAt,
    revisionResubmittedByUserId: document.revisionResubmittedByUserId,
    revisionResubmittedAt: document.revisionResubmittedAt,
    revisionResubmitted: document.revisionResubmitted,
    isApplicable: document.isApplicable,
    status: row.status,
    collaborationPart: row.collaboration_part ?? null,
    actionText: displayActionText,
    createdAt: row.responsibility_updated_at || row.submitted_at || row.updated_at,
    updatedAt: row.responsibility_updated_at || row.submitted_at || row.updated_at,
    targetRoute: '',
    permissions: document.permissions
  };

  item.targetRoute = buildDocumentTargetRoute(item, user);
  return item;
}

async function selectRelatedInitiationDocumentsByProjectId(projectIds, user) {
  const uniqueProjectIds = [...new Set(projectIds.filter((projectId) => projectId !== null && projectId !== undefined))];
  if (uniqueProjectIds.length === 0) {
    return new Map();
  }

  const [rows] = await pool.execute(
    `SELECT
      d.*,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id IN (${uniqueProjectIds.map(() => '?').join(', ')})
      AND d.document_code IN ('1.1', '1.2', '1.3')`,
    uniqueProjectIds
  );
  const rowsWithInitiationReview = await attachInitiationReviewToStageDocumentRows(pool, rows, user);
  const relatedDocumentsByProjectId = new Map();

  for (const document of rowsWithInitiationReview.map(mapDocument)) {
    if (!relatedDocumentsByProjectId.has(document.projectId)) {
      relatedDocumentsByProjectId.set(document.projectId, new Map());
    }
    relatedDocumentsByProjectId.get(document.projectId).set(document.documentCode, document);
  }

  return relatedDocumentsByProjectId;
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
    status: row.stage_status,
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
      AND p.status <> ?
      AND d.is_applicable = 1
      AND d.document_code <> ?
      AND d.document_code <> ?
      AND d.document_code NOT IN (${SOLUTION_DESIGN_DEDICATED_DOCUMENT_PLACEHOLDERS})
      AND (
        d.status IN (?, ?)
        OR (
          d.revision_required = 1
          AND NOT (
            d.completion_mode IN (?, ?)
            AND d.status = ?
            AND d.revision_resubmitted_at IS NOT NULL
          )
        )
      )
    ORDER BY
      CASE WHEN d.revision_required = 1 THEN 0 ELSE 1 END ASC,
      CASE d.status WHEN 'returned' THEN 1 ELSE 2 END ASC,
      COALESCE(d.returned_at, d.responsibility_updated_at, d.updated_at) DESC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [
      user.id,
      PROJECT_STATUS.ENDED,
      INITIATION_REVIEW_DOCUMENT_CODE,
      INITIATION_NOTICE_DOCUMENT_CODE,
      ...SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES,
      DOCUMENT_STATUS.NOT_SUBMITTED,
      DOCUMENT_STATUS.RETURNED,
      COMPLETION_MODE.APPROVAL_REQUIRED,
      COMPLETION_MODE.CONDITIONAL_APPROVAL,
      DOCUMENT_STATUS.SUBMITTED
    ]
  );

  const relatedDocumentsByProjectId = await selectRelatedInitiationDocumentsByProjectId(
    rows.map((row) => row.project_id),
    user
  );

  return rows.map((row) =>
    buildDocumentTodo({
      row,
      user,
      type: 'document_responsibility',
      relatedDocumentsByCode: relatedDocumentsByProjectId.get(row.project_id) ?? null,
      actionText: isRevisionRequired(row)
        ? isReviewCompletionMode(getDocumentCompletionMode(row))
          ? '返工重提'
          : '完成返工'
        : row.status === DOCUMENT_STATUS.RETURNED
          ? '修改后重新提交资料'
          : '提交资料'
    })
  );
}

async function selectInitiationApprovalCollaborationTodos(user) {
  if (isGeneralManagerAssistantUser(user) || isSystemAdminUser(user)) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
      d.*,
      f.form_data_json,
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.project_manager_user_id,
      p.participating_departments,
      p.status AS project_status,
      p.updated_at AS project_updated_at,
      p.business_responsible_user_id,
      p.technical_responsible_user_id,
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
    LEFT JOIN project_stage_document_forms f
      ON f.stage_document_id = d.id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.document_code = ?
      AND d.is_applicable = 1
      AND p.status <> ?
      AND d.status NOT IN (?, ?)
      AND (
        p.business_responsible_user_id = ?
        OR p.technical_responsible_user_id = ?
      )
    ORDER BY
      COALESCE(d.responsibility_updated_at, d.updated_at) DESC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [
      INITIATION_REVIEW_DOCUMENT_CODE,
      PROJECT_STATUS.ENDED,
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.CONFIRMED,
      user.id,
      user.id
    ]
  );

  const relatedDocumentsByProjectId = await selectRelatedInitiationDocumentsByProjectId(
    rows.map((row) => row.project_id),
    user
  );

  return rows
    .map((row) => {
      const relatedDocumentsByCode = relatedDocumentsByProjectId.get(row.project_id) ?? null;
      if (!isInitiationRequirementReadyForApprovalCollaboration(relatedDocumentsByCode)) {
        return null;
      }

      const part =
        row.business_responsible_user_id && String(row.business_responsible_user_id) === String(user.id)
          ? INITIATION_COLLABORATION_PART.BUSINESS
          : row.technical_responsible_user_id && String(row.technical_responsible_user_id) === String(user.id)
            ? INITIATION_COLLABORATION_PART.TECHNICAL
            : null;
      if (!part) {
        return null;
      }

      const collaboration = getInitiationCollaborationFromRow(row);
      if (
        (part === INITIATION_COLLABORATION_PART.BUSINESS && collaboration.businessSubmitted) ||
        (part === INITIATION_COLLABORATION_PART.TECHNICAL && collaboration.technicalSubmitted)
      ) {
        return null;
      }

      return buildDocumentTodo({
        row: {
          ...row,
          collaboration_part: part
        },
        user,
        type: 'document_responsibility',
        relatedDocumentsByCode,
        actionText:
          part === INITIATION_COLLABORATION_PART.BUSINESS
            ? '填写/提交 1.2 基础模块和商务模块'
            : '填写/提交 1.2 技术模块'
      });
    })
    .filter(Boolean);
}

async function selectInitiationNoticeSyntheticTodos(user) {
  if (!isCenterManagerUser(user) || user.department !== BUSINESS_DEPARTMENT.MARKETING_CENTER) {
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
    INNER JOIN projects p
      ON p.id = d.project_id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.document_code = '1.3'
      AND d.is_applicable = 1
      AND p.status <> ?
      AND d.status NOT IN (?, ?)
      AND (
        d.responsible_user_id IS NULL
        OR d.responsible_user_id <> ?
      )
    ORDER BY
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [PROJECT_STATUS.ENDED, DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED, user.id]
  );

  const relatedDocumentsByProjectId = await selectRelatedInitiationDocumentsByProjectId(
    rows.map((row) => row.project_id),
    user
  );

  return rows
    .filter((row) => isInitiationNoticeOnlineFormReady(relatedDocumentsByProjectId.get(row.project_id) ?? null))
    .map((row) =>
      buildDocumentTodo({
        row,
        user,
        type: 'document_responsibility',
        relatedDocumentsByCode: relatedDocumentsByProjectId.get(row.project_id) ?? null,
        actionText: buildInitiationNoticeActionText(row)
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
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    INNER JOIN projects p
      ON p.id = d.project_id
    LEFT JOIN project_stages s
      ON s.project_id = d.project_id
      AND s.stage_order = d.stage_order
    WHERE d.is_applicable = 1
      AND p.status <> ?
      AND d.document_code <> '1.2'
      AND d.document_code NOT IN (${SOLUTION_DESIGN_DEDICATED_DOCUMENT_PLACEHOLDERS})
      AND d.status = ?
      AND d.completion_mode = ?
      AND (
        d.revision_required = 0
        OR (
          d.revision_required = 1
          AND d.revision_resubmitted_at IS NOT NULL
        )
      )
      AND (
        d.review_department = ?
        OR (
          d.review_department IS NULL
          AND u.department = ?
        )
      )
    ORDER BY
      COALESCE(d.submitted_at, d.updated_at) ASC,
      p.project_code ASC,
      d.stage_order ASC,
      d.document_order ASC,
      d.id ASC`,
    [
      PROJECT_STATUS.ENDED,
      ...SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES,
      DOCUMENT_STATUS.SUBMITTED,
      COMPLETION_MODE.APPROVAL_REQUIRED,
      user.department,
      user.department
    ]
  );

  return rows.map((row) =>
    buildDocumentTodo({
      row,
      user,
      type: 'document_review',
      actionText: isRevisionRequired(row) && isRevisionResubmitted(row) ? '审核返工重提' : '处理资料级审核'
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
          LEFT JOIN users related_users
            ON related_users.id = related_documents.responsible_user_id
          WHERE related_documents.project_id = p.id
            AND (
              related_documents.owner_department = ?
              OR related_documents.review_department = ?
              OR (
                related_documents.owner_department IS NULL
                AND related_documents.review_department IS NULL
                AND related_users.department = ?
              )
            )
        )`
      : '0';
  const params = [];
  if (isCenterManagerUser(user) && user.department) {
    params.push(user.department, user.department, user.department);
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
      s.stage_status,
      s.updated_at AS stage_updated_at
    FROM project_stages s
    INNER JOIN projects p
      ON p.id = s.project_id
    WHERE s.is_current = 1
      AND s.stage_order < 8
      AND p.status <> ?
      AND p.status <> ?
      AND EXISTS (
        SELECT 1
        FROM project_stage_documents stage_documents
        WHERE stage_documents.project_id = p.id
          AND stage_documents.stage_order = s.stage_order
      )
    ORDER BY
      p.project_code ASC,
      s.stage_order ASC,
      s.id ASC`,
    [
      ...params,
      PROJECT_STATUS.COMPLETED,
      PROJECT_STATUS.ENDED
    ]
  );

  const candidateRows = rows.filter((row) => canAdvanceProjectStage(user, mapWorkbenchProject(row)));
  if (candidateRows.length === 0) {
    return [];
  }

  const completenessByStage = await selectStageAdvanceCompletenessByStage(candidateRows, user);
  return candidateRows
    .filter((row) => {
      const key = buildStageAdvanceCompletenessKey(row.project_id, row.stage_order);
      return completenessByStage.get(key)?.incompleteRequiredCount === 0;
    })
    .map((row) =>
      buildStageTodo({
        row,
        type: 'stage_advance',
        actionText: '推进当前阶段',
        taskMode: 'stageAdvance'
      })
    );
}

function buildStageAdvanceCompletenessKey(projectId, stageOrder) {
  return `${projectId}:${stageOrder}`;
}

async function selectStageAdvanceCompletenessByStage(rows, user) {
  const projectIds = [...new Set(rows.map((row) => Number(row.project_id)).filter(Number.isSafeInteger))];
  if (projectIds.length === 0) {
    return new Map();
  }

  const [rawDocumentRows] = await pool.execute(
    `SELECT
      d.id,
      d.project_id,
      d.document_code,
      d.document_name,
      d.stage_order,
      d.is_required,
      d.completion_mode,
      d.status,
      d.is_applicable,
      d.revision_required,
      d.revision_reason,
      d.revision_source_document_id,
      d.revision_requested_at,
      d.revision_resubmitted_by_user_id,
      d.revision_resubmitted_at,
      source.document_code AS revision_source_document_code,
      source.document_name AS revision_source_document_name
    FROM project_stage_documents d
    LEFT JOIN project_stage_documents source
      ON source.id = d.revision_source_document_id
    WHERE d.project_id IN (${projectIds.map(() => '?').join(', ')})
    ORDER BY d.project_id ASC, d.stage_order ASC, d.document_order ASC, d.id ASC`,
    projectIds
  );
  const rowsWithInitiationReview = await attachInitiationReviewToStageDocumentRows(pool, rawDocumentRows, user);
  const rowsWithDerivedCompletion = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    pool,
    rowsWithInitiationReview
  );
  const grouped = new Map();

  for (const row of rowsWithDerivedCompletion) {
    const key = buildStageAdvanceCompletenessKey(row.project_id, row.stage_order);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(mapGateDocument(row));
  }

  return new Map([...grouped.entries()].map(([key, documents]) => [
    key,
    buildStageCompletenessSummary(documents)
  ]));
}

export function buildWorkbenchSummary(items) {
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

async function selectMyWorkbenchTodoGroups(user) {
  return Promise.all([
    selectDocumentResponsibilityTodos(user),
    selectInitiationApprovalCollaborationTodos(user),
    selectInitiationNoticeSyntheticTodos(user),
    selectDocumentReviewTodos(user),
    selectInitiationReviewWorkbenchTodos(pool, user),
    selectSolutionDesignWorkbenchTodos(user),
    selectContractSigningWorkbenchTodos(user)
  ]);
}

export async function getMyPendingProjectSummary(user) {
  const groups = await selectMyWorkbenchTodoGroups(user);
  const items = groups.flat();
  const projectIds = [
    ...new Set(
      items
        .map((item) => item.projectId)
        .filter((projectId) => projectId !== null && projectId !== undefined)
        .map(String)
    )
  ];

  return {
    total: items.length,
    projectIds
  };
}

export async function getMyWorkbench(user) {
  const groups = await selectMyWorkbenchTodoGroups(user);
  const items = sortWorkbenchItems(groups.flat());

  return {
    summary: buildWorkbenchSummary(items),
    items
  };
}
