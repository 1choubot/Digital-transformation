import { ProjectAuthorizationError } from './shared.js';
import { canViewProject } from './visibility.js';
import { selectProjectContext } from './solutionDesignWorkflow/queries.js';
import {
  DETAILED_DESIGN_COMPATIBILITY_DOCUMENT_CODES,
  DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS,
  DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS,
  DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT,
  DETAILED_DESIGN_ERROR,
  DETAILED_DESIGN_MAIN_FILE_UPLOAD_SLOT_KEYS,
  DETAILED_DESIGN_NODE_KEY,
  DETAILED_DESIGN_NODE_STATUS,
  DETAILED_DESIGN_NODES,
  DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS,
  DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS,
  DETAILED_DESIGN_REVIEW_FORM_STATUS,
  DETAILED_DESIGN_REVIEW_TYPE,
  DETAILED_DESIGN_ROLE_DEFINITIONS,
  DETAILED_DESIGN_ROLE_KEY,
  DETAILED_DESIGN_STAGE,
  DETAILED_DESIGN_UPLOAD_SLOTS,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY,
  DETAILED_DESIGN_UPLOAD_SLOT_STATUS,
  DetailedDesignWorkflowError,
  buildDetailedDesignRoleState,
  buildDetailedDesignProfessionalGroupMemberState,
  buildInitialDetailedDesignDrawingReview,
  buildInitialDetailedDesignNodes,
  buildInitialDetailedDesignReviewForms,
  canBeResponsibleUser,
  canAssignDetailedDesignRoles,
  canViewDetailedDesignWorkflow,
  getDetailedDesignReviewFormDefinition,
  getDetailedDesignUploadSlotDefinition,
  hasReachedDetailedDesignStage,
  isDetailedDesignBusinessOwner,
  isDetailedDesignDrawingReviewOwner,
  isDetailedDesignFinanceAccountant,
  isDetailedDesignManufacturingCenterManager,
  isDetailedDesignProcurementOwner,
  isDetailedDesignProjectEnded,
  isDetailedDesignProjectManager,
  isDetailedDesignRdCenterManager,
  isDetailedDesignTechnicalOwner,
  isProjectInDetailedDesignStage
} from '../../domain/detailedDesignWorkflow.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { pool } from '../../db/pool.js';
import {
  DETAILED_DESIGN_UPLOAD_MAX_FILE_SIZE,
  assertDetailedDesignUploadFileReadable,
  cleanupDetailedDesignUploadFile,
  createDetailedDesignUploadStorageKey,
  writeDetailedDesignUploadFile
} from '../../storage/detailedDesignUploadStorage.js';
import {
  assertStageDocumentGeneratedFileReadable,
  cleanupStageDocumentGeneratedFile,
  createStageDocumentGeneratedFileStorageKey,
  writeStageDocumentGeneratedFile
} from '../../storage/stageDocumentGeneratedFileStorage.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { materializeDetailedDesignWorkflow } from './detailedDesignWorkflowMaterialization.js';
import {
  GENERATED_XLSX_MIME_TYPE,
  WORKFLOW_FORM_GENERATED_FILE_TYPE,
  generateWorkflowXlsxFormFile
} from './workflowGeneratedFiles.js';
import { tryAutoAdvanceProjectStage } from './stageAdvanceRepository.js';

const DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS = DETAILED_DESIGN_MAIN_FILE_UPLOAD_SLOT_KEYS;

const DETAILED_DESIGN_UPLOAD_ACTIONABLE_NODE_STATUSES = new Set([
  DETAILED_DESIGN_NODE_STATUS.PENDING,
  DETAILED_DESIGN_NODE_STATUS.RETURNED
]);

const DETAILED_DESIGN_REVIEW_FORM_TECHNICAL_ACTIONABLE_NODE_STATUSES = new Set([
  DETAILED_DESIGN_NODE_STATUS.PENDING,
  DETAILED_DESIGN_NODE_STATUS.RETURNED
]);

const DETAILED_DESIGN_REVIEW_FORM_RD_ACTIONABLE_NODE_STATUSES = new Set([
  DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
  DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL
]);

const DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES = new Set([
  DETAILED_DESIGN_NODE_STATUS.PENDING,
  DETAILED_DESIGN_NODE_STATUS.RETURNED
]);

const DETAILED_DESIGN_DRAWING_REVIEW_RD_ACTIONABLE_NODE_STATUSES = new Set([
  DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL
]);

const DETAILED_DESIGN_FIRST_BATCH_UPLOAD_SLOT_KEYS = new Set([
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
  ...DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN
]);

const DETAILED_DESIGN_UPLOAD_SUBMIT_NODE_KEYS = new Set([
  DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
  DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
  DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
  DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
  DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
  DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
]);

const DETAILED_DESIGN_UPLOAD_SUBMIT_NEXT_NODE_KEY = Object.freeze({
  [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
  [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
  [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
  [DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING]: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
  [DETAILED_DESIGN_NODE_KEY.PARTS_LIST]: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
  [DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN]: null
});

const DEFAULT_UPLOAD_MIME_TYPE = 'application/octet-stream';
const MAX_UPLOAD_TEXT_FIELD_LENGTH = 255;
const DETAILED_DESIGN_DRAWING_REVIEW_RECORD_STORAGE_SLOT_KEY = 'drawing_review_record';

export const DETAILED_DESIGN_WORKBENCH_TODO_TYPE = 'detailed_design_workflow';

const DETAILED_DESIGN_NON_ACTION_PERMISSION_KEYS = new Set([
  'canViewSubmit',
  'canPrepareSubmit'
]);

const defaultDetailedDesignUploadStorage = {
  createStorageKey: createDetailedDesignUploadStorageKey,
  writeFile: writeDetailedDesignUploadFile,
  assertFileReadable: assertDetailedDesignUploadFileReadable,
  cleanupFile: cleanupDetailedDesignUploadFile
};

const defaultDetailedDesignGeneratedFileStorage = {
  createStorageKey: ({ projectId, documentCode, revision, fileType = WORKFLOW_FORM_GENERATED_FILE_TYPE }) =>
    createStageDocumentGeneratedFileStorageKey({
      projectId,
      documentId: `detailed-design-${documentCode}`,
      version: revision,
      fileType
    }),
  writeFile: writeStageDocumentGeneratedFile,
  assertFileReadable: assertStageDocumentGeneratedFileReadable,
  cleanupFile: cleanupStageDocumentGeneratedFile
};

function resolveDetailedDesignGeneratedFileStorage(db, storage) {
  return storage || db?.generatedFileStorage || defaultDetailedDesignGeneratedFileStorage;
}

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function mapUser(row) {
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

async function selectUsersByIds(executor, userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(Number))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const [rows] = await executor.execute(
    `SELECT
      id,
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled,
      is_platform_admin,
      file_platform_user_id
    FROM users
    WHERE id IN (${placeholders})`,
    uniqueIds
  );

  return new Map(rows.map((row) => [Number(row.id), mapUser(row)]));
}

function collectDetailedDesignUserIds(projectRow, rolesRow, memberRows) {
  return [
    projectRow?.project_manager_user_id,
    projectRow?.business_responsible_user_id,
    projectRow?.technical_responsible_user_id,
    rolesRow?.project_manager_user_id,
    rolesRow?.business_owner_user_id,
    rolesRow?.technical_owner_user_id,
    rolesRow?.procurement_owner_user_id,
    rolesRow?.finance_accountant_user_id,
    rolesRow?.drawing_review_owner_user_id,
    ...(memberRows || []).map((member) => member.user_id),
    rolesRow?.assigned_by_user_id,
    rolesRow?.updated_by_user_id
  ].filter(Boolean);
}

async function selectDetailedDesignNodes(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_nodes
    WHERE project_id = ?
    ORDER BY node_order ASC`,
    [projectId]
  );

  return rows;
}

async function selectDetailedDesignRoles(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_roles
    WHERE project_id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectDetailedDesignRolesForUpdate(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_roles
    WHERE project_id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectDetailedDesignNodeForUpdate(executor, projectId, nodeKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_nodes
    WHERE project_id = ?
      AND node_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

async function selectDetailedDesignProfessionalGroupMembers(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      m.*,
      u.account AS user_account,
      u.display_name AS user_display_name,
      u.department AS user_department,
      u.organization_role AS user_organization_role,
      u.role AS user_role,
      u.is_enabled AS user_is_enabled,
      u.is_platform_admin AS user_is_platform_admin,
      u.file_platform_user_id AS user_file_platform_user_id,
      assigned_by.account AS assigned_by_account,
      assigned_by.display_name AS assigned_by_display_name
    FROM project_detailed_design_professional_group_members m
    LEFT JOIN users u
      ON u.id = m.user_id
    LEFT JOIN users assigned_by
      ON assigned_by.id = m.assigned_by_user_id
    WHERE m.project_id = ?
    ORDER BY m.id ASC`,
    [projectId]
  );

  return rows;
}

async function selectDetailedDesignUploadSlots(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      s.*,
      f.id AS current_file_id,
      f.revision AS current_file_revision,
      f.original_file_name AS current_file_original_file_name,
      f.mime_type AS current_file_mime_type,
      f.file_size AS current_file_size,
      f.uploaded_by_user_id AS current_file_uploaded_by_user_id,
      f.uploaded_at AS current_file_uploaded_at,
      u.account AS current_file_uploaded_by_account,
      u.display_name AS current_file_uploaded_by_display_name
    FROM project_detailed_design_upload_slots s
    LEFT JOIN project_detailed_design_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    WHERE s.project_id = ?
    ORDER BY s.slot_order ASC`,
    [projectId]
  );

  return rows;
}

async function selectDetailedDesignUploadSlotForUpdate(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_upload_slots
    WHERE project_id = ?
      AND slot_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, slotKey]
  );

  return rows[0] || null;
}

async function selectCurrentDetailedDesignUploadFiles(executor, projectId, slotKeys) {
  if (!Array.isArray(slotKeys) || slotKeys.length === 0) {
    return [];
  }

  const placeholders = slotKeys.map(() => '?').join(', ');
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_upload_files
    WHERE project_id = ?
      AND slot_key IN (${placeholders})
      AND is_current = 1
    ORDER BY slot_key ASC, revision DESC, id DESC`,
    [projectId, ...slotKeys]
  );

  return rows;
}

async function selectCurrentDetailedDesignUploadFileForDownload(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      s.node_key,
      s.slot_name,
      s.slot_order
    FROM project_detailed_design_upload_files f
    INNER JOIN project_detailed_design_upload_slots s
      ON s.id = f.slot_id
    WHERE f.project_id = ?
      AND f.slot_key = ?
      AND f.is_current = 1
    ORDER BY f.revision DESC, f.id DESC
    LIMIT 1`,
    [projectId, slotKey]
  );

  return rows[0] || null;
}

async function selectCurrentDetailedDesignReviewForms(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      reviewer.account AS reviewed_by_account,
      reviewer.display_name AS reviewed_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name,
      generated_by.account AS generated_by_account,
      generated_by.display_name AS generated_by_display_name
    FROM project_detailed_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users reviewer
      ON reviewer.id = f.reviewed_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    LEFT JOIN users generated_by
      ON generated_by.id = f.generated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    ORDER BY f.node_key ASC`,
    [projectId]
  );

  return rows;
}

async function selectCurrentDetailedDesignReviewForm(executor, projectId, nodeKey, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      reviewer.account AS reviewed_by_account,
      reviewer.display_name AS reviewed_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name,
      generated_by.account AS generated_by_account,
      generated_by.display_name AS generated_by_display_name
    FROM project_detailed_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users reviewer
      ON reviewer.id = f.reviewed_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    LEFT JOIN users generated_by
      ON generated_by.id = f.generated_by_user_id
    WHERE f.project_id = ?
      AND f.node_key = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

async function selectMaxDetailedDesignReviewFormRevision(executor, projectId, nodeKey) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(revision), 0) AS max_revision
    FROM project_detailed_design_review_forms
    WHERE project_id = ?
      AND node_key = ?`,
    [projectId, nodeKey]
  );

  return Number(rows[0]?.max_revision || 0);
}

async function selectCurrentDetailedDesignDrawingReviewFlow(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      checker.account AS checker_account,
      checker.display_name AS checker_display_name,
      rd.account AS rd_approver_account,
      rd.display_name AS rd_approver_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_detailed_design_drawing_review_flows f
    LEFT JOIN users checker
      ON checker.id = f.checker_user_id
    LEFT JOIN users rd
      ON rd.id = f.rd_approver_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectCurrentDetailedDesignDrawingReviewRecords(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      r.*,
      uploader.account AS uploaded_by_account,
      uploader.display_name AS uploaded_by_display_name
    FROM project_detailed_design_drawing_review_records r
    LEFT JOIN users uploader
      ON uploader.id = r.uploaded_by_user_id
    WHERE r.project_id = ?
    ORDER BY r.drawing_revision ASC, r.revision ASC, r.id ASC`,
    [projectId]
  );

  return rows;
}

async function selectDetailedDesignDrawingReviewRecordById(executor, projectId, recordId) {
  const [rows] = await executor.execute(
    `SELECT
      r.*,
      uploader.account AS uploaded_by_account,
      uploader.display_name AS uploaded_by_display_name
    FROM project_detailed_design_drawing_review_records r
    LEFT JOIN users uploader
      ON uploader.id = r.uploaded_by_user_id
    WHERE r.project_id = ?
      AND r.id = ?
    LIMIT 1`,
    [projectId, recordId]
  );

  return rows[0] || null;
}

async function selectMaxDetailedDesignDrawingReviewRecordRevision(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(revision), 0) AS max_revision
    FROM project_detailed_design_drawing_review_records
    WHERE project_id = ?`,
    [projectId]
  );

  return Number(rows[0]?.max_revision || 0);
}

async function selectCurrentDetailedDesignDrawingReviewRecordForCycle(executor, projectId, drawingRevision) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_detailed_design_drawing_review_records
    WHERE project_id = ?
      AND drawing_revision = ?
      AND is_current = 1
    ORDER BY revision DESC, id DESC
    LIMIT 1`,
    [projectId, drawingRevision]
  );

  return rows[0] || null;
}

function getDetailedDesignNodeDefinition(nodeKey) {
  return DETAILED_DESIGN_NODES.find((node) => node.nodeKey === nodeKey) || null;
}

function isDetailedDesignNodeStatusActionable(nodeStatus, allowedStatuses) {
  return allowedStatuses.has(nodeStatus);
}

function buildVirtualDetailedDesignNodes(projectRow) {
  const initialNodes = hasReachedDetailedDesignStage(projectRow)
    ? buildInitialDetailedDesignNodes()
    : DETAILED_DESIGN_NODES.map((node) => ({
        ...node,
        status: DETAILED_DESIGN_NODE_STATUS.NOT_STARTED
      }));

  return initialNodes.map((node) => ({
    id: null,
    project_id: projectRow?.id ?? null,
    node_key: node.nodeKey,
    node_name: node.nodeName,
    node_order: node.nodeOrder,
    status: node.status,
    return_reason: null,
    current_revision: 1,
    activated_at: node.status === DETAILED_DESIGN_NODE_STATUS.PENDING ? null : null,
    submitted_at: null,
    approved_at: null,
    returned_at: null
  }));
}

function buildVirtualDetailedDesignUploadSlots(projectRow) {
  return DETAILED_DESIGN_UPLOAD_SLOTS.map((slot) => ({
    id: null,
    project_id: projectRow?.id ?? null,
    node_key: slot.nodeKey,
    slot_key: slot.slotKey,
    slot_name: slot.slotName,
    slot_order: slot.slotOrder,
    is_required: 1,
    revision: 1,
    status: DETAILED_DESIGN_UPLOAD_SLOT_STATUS.PENDING,
    is_upload_exempted: 0,
    exemption_reason: null,
    exempted_by_user_id: null,
    exempted_at: null,
    return_reason: null,
    submitted_by_user_id: null,
    submitted_at: null,
    approved_by_user_id: null,
    approved_at: null,
    returned_by_user_id: null,
    returned_at: null,
    current_file_id: null,
    current_file_revision: null,
    current_file_original_file_name: null,
    current_file_mime_type: null,
    current_file_size: null,
    current_file_uploaded_by_user_id: null,
    current_file_uploaded_at: null,
    current_file_uploaded_by_account: null,
    current_file_uploaded_by_display_name: null
  }));
}

function buildVirtualDetailedDesignReviewForms() {
  return buildInitialDetailedDesignReviewForms().map((form) => ({
    node_key: form.nodeKey,
    review_type: form.reviewType,
    document_code: form.documentCode,
    document_name: form.documentName,
    revision: form.revision,
    form_status: form.formStatus,
    form_data_json: JSON.stringify(form.formData),
    is_current: 1,
    submitted_by_user_id: null,
    submitted_at: null,
    generated_file_status: form.generatedFileStatus,
    generated_file_storage_key: null,
    generated_file_name: null,
    generated_file_mime_type: null,
    generated_file_size: null,
    generated_file_template_key: null,
    generated_file_template_version: null,
    generated_file_template_hash: null,
    generated_at: null,
    generated_by_user_id: null,
    generation_error_message: null,
    review_status: 'pending',
    reviewed_by_user_id: null,
    reviewed_at: null,
    return_reason: null,
    created_by_user_id: null,
    updated_by_user_id: null,
    submitted_by_account: null,
    submitted_by_display_name: null,
    reviewed_by_account: null,
    reviewed_by_display_name: null,
    created_by_account: null,
    created_by_display_name: null,
    updated_by_account: null,
    updated_by_display_name: null,
    generated_by_account: null,
    generated_by_display_name: null
  }));
}

function buildVirtualDetailedDesignDrawingReview(projectRow) {
  const drawingReview = buildInitialDetailedDesignDrawingReview();
  return {
    id: null,
    project_id: projectRow?.id ?? null,
    current_revision: drawingReview.currentRevision,
    product_plan_drawing_revision: drawingReview.productPlanDrawingRevision,
    parts_list_revision: drawingReview.partsListRevision,
    checker_status: drawingReview.checkerStatus,
    rd_approval_status: drawingReview.rdApprovalStatus,
    checker_user_id: null,
    checker_at: null,
    checker_comment: null,
    rd_approver_user_id: null,
    rd_approved_at: null,
    rd_comment: null,
    return_reason: null,
    created_by_user_id: null,
    updated_by_user_id: null,
    checker_account: null,
    checker_display_name: null,
    rd_approver_account: null,
    rd_approver_display_name: null,
    created_by_account: null,
    created_by_display_name: null,
    updated_by_account: null,
    updated_by_display_name: null
  };
}

function mapDetailedDesignUploadFile(row) {
  if (!row?.current_file_id) {
    return null;
  }

  return {
    id: row.current_file_id,
    revision: Number(row.current_file_revision || 1),
    originalFileName: row.current_file_original_file_name,
    mimeType: row.current_file_mime_type,
    fileSize: Number(row.current_file_size || 0),
    uploadedByUserId: row.current_file_uploaded_by_user_id,
    uploadedBy: row.current_file_uploaded_by_user_id
      ? {
          id: row.current_file_uploaded_by_user_id,
          account: row.current_file_uploaded_by_account ?? null,
          name: row.current_file_uploaded_by_display_name ?? null
        }
      : null,
    uploadedAt: row.current_file_uploaded_at ?? null,
    downloadEndpoint: `/api/projects/${row.project_id}/detailed-design-workflow/uploads/${row.slot_key}/download`
  };
}

function mapDetailedDesignNode(row, context) {
  const definition = getDetailedDesignNodeDefinition(row.node_key);
  const permissions = buildDetailedDesignNodePermissions({
    nodeRow: row,
    definition,
    ...context
  });

  return {
    nodeKey: row.node_key,
    nodeName: row.node_name,
    nodeOrder: row.node_order,
    documentCode: definition?.documentCode ?? null,
    status: row.status,
    returnReason: row.return_reason,
    currentRevision: Number(row.current_revision || 1),
    activatedAt: row.activated_at ?? null,
    submittedAt: row.submitted_at ?? null,
    approvedAt: row.approved_at ?? null,
    returnedAt: row.returned_at ?? null,
    blockingReasons: buildDetailedDesignNodeBlockingReasons({
      nodeRow: row,
      definition,
      ...context
    }),
    permissions,
    nextActions: Object.entries(permissions)
      .filter(([key, allowed]) => allowed === true && !DETAILED_DESIGN_NON_ACTION_PERMISSION_KEYS.has(key))
      .map(([key]) => key)
  };
}

function buildDetailedDesignUploadSlotPermissions({
  slotRow,
  slotDefinition,
  nodeStatus,
  drawingReviewNodeStatus,
  projectEnded,
  isDetailedDesignStageWritable,
  isDetailedDesignStageVisible,
  roleState,
  user
}) {
  const canWrite = isDetailedDesignStageWritable && isDetailedDesignNodeStatusActionable(
    nodeStatus,
    DETAILED_DESIGN_UPLOAD_ACTIONABLE_NODE_STATUSES
  );
  const hasCurrentFile = Boolean(slotRow.current_file_id);
  const canManageMainFileNoUpload =
    canWrite &&
    DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS.has(slotDefinition.slotKey) &&
    isDetailedDesignTechnicalOwner(roleState, user);

  if (slotDefinition.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK) {
    return {
      canUpload: canWrite && isDetailedDesignManufacturingCenterManager(user),
      canMarkNoUpload: false,
      canCancelNoUpload: false,
      canDownload: hasCurrentFile && isDetailedDesignStageVisible && (
        isDetailedDesignManufacturingCenterManager(user) ||
        isDetailedDesignRdCenterManager(user)
      )
    };
  }

  if (slotDefinition.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN) {
    return {
      canUpload: canWrite && isDetailedDesignProjectManager(roleState, user),
      canMarkNoUpload: false,
      canCancelNoUpload: false,
      canDownload: hasCurrentFile && isDetailedDesignStageVisible && (
        isDetailedDesignProjectManager(roleState, user) ||
        isDetailedDesignRdCenterManager(user)
      )
    };
  }

  if (
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_SCHEMATIC,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_LAYOUT_DIAGRAM,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.AUTOMATION_PROGRAM,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_DEVELOPMENT_SPECIFICATION,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_UI_DESIGN_PPT,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_CODE,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ].includes(slotDefinition.slotKey)
  ) {
    const canTechnicalOwnerDownload =
      hasCurrentFile &&
      isDetailedDesignStageWritable &&
      isDetailedDesignTechnicalOwner(roleState, user);
    const canDrawingReviewOwnerDownload =
      hasCurrentFile &&
      isDetailedDesignStageWritable &&
      isDetailedDesignDrawingReviewOwner(roleState, user) &&
      isDetailedDesignNodeStatusActionable(
        drawingReviewNodeStatus,
        DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES
      );
    const canRdDownload =
      hasCurrentFile &&
      isDetailedDesignStageWritable &&
      isDetailedDesignRdCenterManager(user) &&
      drawingReviewNodeStatus === DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL;

    return {
      canUpload: canWrite && isDetailedDesignTechnicalOwner(roleState, user),
      canMarkNoUpload: canManageMainFileNoUpload && !hasCurrentFile && !slotRow.is_upload_exempted,
      canCancelNoUpload: canManageMainFileNoUpload && Boolean(slotRow.is_upload_exempted),
      canDownload: canTechnicalOwnerDownload || canDrawingReviewOwnerDownload || canRdDownload
    };
  }

  if (slotDefinition.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN) {
    return {
      canUpload: canWrite && isDetailedDesignBusinessOwner(roleState, user),
      canMarkNoUpload: false,
      canCancelNoUpload: false,
      canDownload: hasCurrentFile && isDetailedDesignStageVisible && (
        isDetailedDesignBusinessOwner(roleState, user) ||
        isDetailedDesignRdCenterManager(user)
      )
    };
  }

  return {
    canMarkNoUpload: false,
    canCancelNoUpload: false,
    canUpload: false,
    canDownload: hasCurrentFile && isDetailedDesignStageVisible && isDetailedDesignRdCenterManager(user)
  };
}

function buildDetailedDesignReviewFormPermissions({
  reviewFormRow,
  nodeStatus,
  nodeRevision,
  roleState,
  user,
  projectEnded,
  isDetailedDesignStageWritable,
  isDetailedDesignStageVisible
}) {
  const technicalEditable = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_REVIEW_FORM_TECHNICAL_ACTIONABLE_NODE_STATUSES);
  const rdActionable = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_REVIEW_FORM_RD_ACTIONABLE_NODE_STATUSES);
  const currentReviewFormRow = isDetailedDesignReviewFormCurrentForRevision(reviewFormRow, nodeRevision)
    ? reviewFormRow
    : null;
  const isReviewReturned = currentReviewFormRow?.review_status === 'returned';
  const isFormEditable = !currentReviewFormRow ||
    currentReviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT ||
    isReviewReturned ||
    currentReviewFormRow.generated_file_status === DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.FAILED;
  const isFormWaitingReview =
    currentReviewFormRow?.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
    currentReviewFormRow?.review_status === 'pending';
  const canEdit = technicalEditable && isFormEditable && isDetailedDesignTechnicalOwner(roleState, user);
  const canReview = rdActionable && isFormWaitingReview && isDetailedDesignRdCenterManager(user);
  const hasGeneratedFile =
    currentReviewFormRow?.generated_file_status === DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED;

  return {
    canViewReviewForm: true,
    canEdit,
    canEditReviewForm: canEdit,
    canSubmit: canEdit,
    canSubmitReviewForm: canEdit,
    canApprove: canReview,
    canReturn: canReview,
    canDownloadGeneratedFile:
      hasGeneratedFile &&
      isDetailedDesignStageVisible &&
      (isDetailedDesignTechnicalOwner(roleState, user) || isDetailedDesignRdCenterManager(user))
  };
}

function hasDetailedDesignCurrentFileForRevision(uploadSlotsByKey, slotKey, revision) {
  const slotRow = uploadSlotsByKey.get(slotKey) || null;
  return Boolean(slotRow?.current_file_id) &&
    Number(slotRow.current_file_revision ?? 0) >= Number(revision ?? 1);
}

function hasDetailedDesignCurrentFile(uploadSlotsByKey, slotKey) {
  const slotRow = uploadSlotsByKey.get(slotKey) || null;
  return Boolean(slotRow?.current_file_id);
}

function hasDetailedDesignNoUploadForRevision(uploadSlotsByKey, slotKey, revision) {
  const slotRow = uploadSlotsByKey.get(slotKey) || null;
  return DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS.has(slotKey) &&
    Boolean(slotRow?.is_upload_exempted) &&
    Number(slotRow.revision ?? 0) >= Number(revision ?? 1);
}

function isDetailedDesignMainFileSlotSatisfied(uploadSlotsByKey, slotKey, revision) {
  return hasDetailedDesignCurrentFileForRevision(uploadSlotsByKey, slotKey, revision) ||
    hasDetailedDesignNoUploadForRevision(uploadSlotsByKey, slotKey, revision);
}

function areDetailedDesignMainFileSlotsSatisfied(uploadSlotsByKey, revision) {
  return [...DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS].every((slotKey) =>
    isDetailedDesignMainFileSlotSatisfied(uploadSlotsByKey, slotKey, revision)
  );
}

function getDetailedDesignSubmitNodeDefinitionOrThrow(nodeKey) {
  const node = getDetailedDesignNodeDefinition(nodeKey);
  if (!node || !DETAILED_DESIGN_UPLOAD_SUBMIT_NODE_KEYS.has(node.nodeKey)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_NODE,
      'Detailed design workflow node is not submittable',
      400,
      ['nodeKey']
    );
  }

  return node;
}

function canSubmitDetailedDesignUploadNode({ nodeKey, roleState, user }) {
  if (nodeKey === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING) {
    return isDetailedDesignManufacturingCenterManager(user);
  }
  if (nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION) {
    return isDetailedDesignProjectManager(roleState, user);
  }
  if (
    nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN ||
    nodeKey === DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING ||
    nodeKey === DETAILED_DESIGN_NODE_KEY.PARTS_LIST
  ) {
    return isDetailedDesignTechnicalOwner(roleState, user);
  }
  if (nodeKey === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN) {
    return isDetailedDesignBusinessOwner(roleState, user);
  }
  return false;
}

function withDetailedDesignSubmitViewPermissions(permissions, {
  nodeRow,
  definition,
  nodeActionable,
  roleState,
  user,
  projectEnded,
  isDetailedDesignStageVisible,
  uploadSlotsByKey,
  reviewFormsByNodeKey,
  drawingReview
}) {
  const canViewSubmit = nodeActionable &&
    canSubmitDetailedDesignUploadNode({ nodeKey: nodeRow.node_key, roleState, user });
  const submitBlockingReasons = canViewSubmit && permissions.canSubmit !== true
    ? buildDetailedDesignNodeBlockingReasons({
        nodeRow,
        definition,
        roleState,
        projectEnded,
        isDetailedDesignStageVisible,
        uploadSlotsByKey,
        reviewFormsByNodeKey,
        drawingReview
      })
    : [];

  return {
    ...permissions,
    canViewSubmit,
    canPrepareSubmit: canViewSubmit,
    submitBlockingReasons
  };
}

function buildDetailedDesignDrawingReviewPermissions({
  drawingReviewRow,
  nodeStatus,
  roleState,
  user,
  projectEnded,
  isDetailedDesignStageWritable,
  isDetailedDesignStageVisible
}) {
  const canCheckerAct = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES) &&
    isDetailedDesignDrawingReviewOwner(roleState, user);
  const canRdAct = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_DRAWING_REVIEW_RD_ACTIONABLE_NODE_STATUSES) &&
    isDetailedDesignRdCenterManager(user);
  const hasHistory = Array.isArray(drawingReviewRow?.recordHistory) && drawingReviewRow.recordHistory.length > 0;
  const canReadCurrentDrawingReview = isDetailedDesignStageWritable && (
    (isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES) &&
      isDetailedDesignDrawingReviewOwner(roleState, user)) ||
    (nodeStatus === DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL && isDetailedDesignRdCenterManager(user))
  );
  const canDownloadHistory = hasHistory && isDetailedDesignStageWritable && (
    isDetailedDesignDrawingReviewOwner(roleState, user) || isDetailedDesignRdCenterManager(user)
  );

  return {
    canDownloadCurrentInputs:
      canReadCurrentDrawingReview,
    canUploadRecord: canCheckerAct,
    canPass: canCheckerAct,
    canReturn: canCheckerAct,
    canApprove: canRdAct,
    canReturnByRd: canRdAct,
    canDownloadRecordHistory: canDownloadHistory
  };
}

function buildDetailedDesignNodePermissions({
  nodeRow,
  definition,
  roleState,
  user,
  projectEnded,
  isDetailedDesignStageWritable,
  isDetailedDesignStageVisible,
  uploadSlotsByKey,
  reviewFormsByNodeKey,
  drawingReview
}) {
  const nodeStatus = nodeRow.status;
  const nodeActionable = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(nodeStatus, DETAILED_DESIGN_UPLOAD_ACTIONABLE_NODE_STATUSES);

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING) {
    const revision = Number(nodeRow.current_revision || 1);
    return withDetailedDesignSubmitViewPermissions({
      canUploadProjectKickoffBook: nodeActionable && isDetailedDesignManufacturingCenterManager(user),
      canSubmit: nodeActionable &&
        isDetailedDesignManufacturingCenterManager(user) &&
        hasDetailedDesignCurrentFileForRevision(
          uploadSlotsByKey,
          DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
          revision
        )
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION) {
    const revision = Number(nodeRow.current_revision || 1);
    return withDetailedDesignSubmitViewPermissions({
      canAssignRoles: nodeActionable && isDetailedDesignRdCenterManager(user),
      canUploadWorkPlan: nodeActionable && isDetailedDesignProjectManager(roleState, user),
      canSubmit: nodeActionable &&
        isDetailedDesignProjectManager(roleState, user) &&
        areDetailedDesignRolesAssignedFromState(roleState) &&
        hasDetailedDesignCurrentFileForRevision(
          uploadSlotsByKey,
          DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
          revision
        )
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN) {
    const revision = Number(nodeRow.current_revision || 1);
    return withDetailedDesignSubmitViewPermissions({
      canUploadDetailedDesignFiles: nodeActionable && isDetailedDesignTechnicalOwner(roleState, user),
      canSubmit: nodeActionable &&
        isDetailedDesignTechnicalOwner(roleState, user) &&
        areDetailedDesignMainFileSlotsSatisfied(uploadSlotsByKey, revision)
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  if (
    nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW ||
    nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW
  ) {
    const reviewFormRow = reviewFormsByNodeKey.get(nodeRow.node_key) || null;
    return buildDetailedDesignReviewFormPermissions({
      reviewFormRow,
      nodeStatus,
      nodeRevision: nodeRow.current_revision,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageWritable,
      isDetailedDesignStageVisible
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING) {
    return withDetailedDesignSubmitViewPermissions({
      canUploadProductPlanDrawing: nodeActionable && isDetailedDesignTechnicalOwner(roleState, user),
      canSubmit: nodeActionable &&
        isDetailedDesignTechnicalOwner(roleState, user) &&
        hasDetailedDesignCurrentFile(uploadSlotsByKey, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING)
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PARTS_LIST) {
    return withDetailedDesignSubmitViewPermissions({
      canUploadPartsList: nodeActionable && isDetailedDesignTechnicalOwner(roleState, user),
      canSubmit: nodeActionable &&
        isDetailedDesignTechnicalOwner(roleState, user) &&
        hasDetailedDesignCurrentFile(uploadSlotsByKey, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) &&
        hasDetailedDesignCurrentFile(uploadSlotsByKey, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST)
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW) {
    return buildDetailedDesignDrawingReviewPermissions({
      drawingReviewRow: drawingReview,
      nodeStatus,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageWritable,
      isDetailedDesignStageVisible
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN) {
    return withDetailedDesignSubmitViewPermissions({
      canUploadCustomerDrawingCountersign: nodeActionable && isDetailedDesignBusinessOwner(roleState, user),
      canSubmit: nodeActionable &&
        isDetailedDesignBusinessOwner(roleState, user) &&
        hasDetailedDesignCurrentFile(uploadSlotsByKey, DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN)
    }, {
      nodeRow,
      definition,
      nodeActionable,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageVisible,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    });
  }

  return {
    canViewNode: true
  };
}

function getDetailedDesignWorkflowNodeDto(workflow, nodeKey) {
  return (workflow?.nodes || []).find((node) => node.nodeKey === nodeKey) || null;
}

function buildDetailedDesignWorkbenchTargetRoute(projectId, nodeKey) {
  return `/projects/${projectId}?taskMode=detailedDesign&focusNodeKey=${encodeURIComponent(nodeKey)}`;
}

function getDetailedDesignWorkbenchNodeUpdatedAt(node, projectRow) {
  return (
    node?.returnedAt ||
    node?.submittedAt ||
    node?.approvedAt ||
    node?.activatedAt ||
    projectRow?.project_updated_at ||
    projectRow?.updated_at ||
    null
  );
}

function buildDetailedDesignWorkbenchTodo({
  projectRow,
  workflow,
  node,
  actionText,
  actionKey,
  blockingReasons = null
}) {
  return {
    type: DETAILED_DESIGN_WORKBENCH_TODO_TYPE,
    taskType: DETAILED_DESIGN_WORKBENCH_TODO_TYPE,
    actionKey,
    projectId: workflow.projectId,
    projectCode: projectRow?.project_code ?? workflow.projectCode ?? null,
    projectName: projectRow?.project_name ?? workflow.projectName ?? null,
    stageId: workflow.currentStage?.stageId ?? projectRow?.current_stage_id ?? null,
    stageOrder: DETAILED_DESIGN_STAGE.STAGE_ORDER,
    stageName: DETAILED_DESIGN_STAGE.STAGE_NAME,
    documentId: null,
    documentCode: null,
    documentName: null,
    nodeKey: node.nodeKey,
    nodeName: node.nodeName,
    status: node.status,
    revision: node.currentRevision || 1,
    actionText,
    blockingReasons: Array.isArray(blockingReasons) ? blockingReasons : node.blockingReasons || [],
    createdAt: getDetailedDesignWorkbenchNodeUpdatedAt(node, projectRow),
    updatedAt: getDetailedDesignWorkbenchNodeUpdatedAt(node, projectRow),
    targetRoute: buildDetailedDesignWorkbenchTargetRoute(workflow.projectId, node.nodeKey)
  };
}

function getDetailedDesignWorkbenchReviewFormActionText(node) {
  return node.nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW
    ? '填写/提交内部设计评审表'
    : '填写/提交客户设计评审表';
}

function getDetailedDesignWorkbenchReviewActionText(node) {
  return node.nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW
    ? '审批/退回内部设计评审'
    : '审批/退回客户设计评审';
}

function getDetailedDesignWorkbenchDrawingReviewActionText(node) {
  if (node?.permissions?.canUploadRecord === true) {
    return '上传图纸审查记录并处理图纸审查';
  }

  return '审批/退回图纸审查';
}

export function buildDetailedDesignWorkbenchTodos({ projectRow = null, workflow }) {
  if (!workflow?.projectId || workflow.isProjectEnded) {
    return [];
  }

  const todos = [];
  const seen = new Set();
  const addTodo = ({ node, actionText, actionKey, blockingReasons = null }) => {
    if (!node?.nodeKey || !actionText) {
      return;
    }

    const key = `${node.nodeKey}:${actionKey || actionText}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    todos.push(buildDetailedDesignWorkbenchTodo({
      projectRow,
      workflow,
      node,
      actionText,
      actionKey,
      blockingReasons
    }));
  };

  const kickoffNode = getDetailedDesignWorkflowNodeDto(workflow, DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING);
  if (kickoffNode?.permissions?.canSubmit === true) {
    addTodo({
      node: kickoffNode,
      actionText: '提交项目启动会',
      actionKey: 'submit_project_kickoff_meeting'
    });
  } else if (kickoffNode?.permissions?.canUploadProjectKickoffBook === true) {
    addTodo({
      node: kickoffNode,
      actionText: '上传项目启动书',
      actionKey: 'upload_project_kickoff_book'
    });
  }

  const preparationNode = getDetailedDesignWorkflowNodeDto(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION);
  if (preparationNode?.permissions?.canAssignRoles === true) {
    addTodo({
      node: preparationNode,
      actionText: '分配详细设计角色',
      actionKey: 'assign_roles'
    });
  }
  if (preparationNode?.permissions?.canSubmit === true) {
    addTodo({
      node: preparationNode,
      actionText: '提交详细设计准备',
      actionKey: 'submit_detailed_design_preparation'
    });
  } else if (preparationNode?.permissions?.canUploadWorkPlan === true) {
    addTodo({
      node: preparationNode,
      actionText: '上传详细设计工作计划',
      actionKey: 'upload_work_plan'
    });
  }

  const detailedDesignNode = getDetailedDesignWorkflowNodeDto(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN);
  if (detailedDesignNode?.permissions?.canSubmit === true) {
    addTodo({
      node: detailedDesignNode,
      actionText: '提交详细设计',
      actionKey: 'submit_detailed_design'
    });
  } else if (detailedDesignNode?.permissions?.canUploadDetailedDesignFiles === true) {
    addTodo({
      node: detailedDesignNode,
      actionText: '上传 8 个详细设计文件',
      actionKey: 'upload_detailed_design_files'
    });
  }

  for (const reviewNodeKey of [
    DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW
  ]) {
    const reviewNode = getDetailedDesignWorkflowNodeDto(workflow, reviewNodeKey);
    if (reviewNode?.permissions?.canEditReviewForm === true || reviewNode?.permissions?.canSubmitReviewForm === true) {
      addTodo({
        node: reviewNode,
        actionText: getDetailedDesignWorkbenchReviewFormActionText(reviewNode),
        actionKey: `review_form:${reviewNodeKey}`
      });
    }

    if (reviewNode?.permissions?.canApprove === true || reviewNode?.permissions?.canReturn === true) {
      addTodo({
        node: reviewNode,
        actionText: getDetailedDesignWorkbenchReviewActionText(reviewNode),
        actionKey: `review_node:${reviewNodeKey}`
      });
    }
  }

  const productPlanDrawingNode = getDetailedDesignWorkflowNodeDto(
    workflow,
    DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING
  );
  if (productPlanDrawingNode?.permissions?.canUploadProductPlanDrawing === true) {
    if (productPlanDrawingNode?.permissions?.canSubmit === true) {
      addTodo({
        node: productPlanDrawingNode,
        actionText: '提交产品平面图',
        actionKey: 'submit_product_plan_drawing'
      });
    } else {
      addTodo({
        node: productPlanDrawingNode,
        actionText: '上传产品平面图',
        actionKey: 'upload_product_plan_drawing'
      });
    }
  }

  const partsListNode = getDetailedDesignWorkflowNodeDto(workflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST);
  if (partsListNode?.permissions?.canUploadPartsList === true) {
    if (partsListNode?.permissions?.canSubmit === true) {
      addTodo({
        node: partsListNode,
        actionText: '提交零部件清单',
        actionKey: 'submit_parts_list'
      });
    } else {
      addTodo({
        node: partsListNode,
        actionText: '上传零部件清单',
        actionKey: 'upload_parts_list'
      });
    }
  }

  const drawingReviewNode = getDetailedDesignWorkflowNodeDto(workflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW);
  if (
    drawingReviewNode?.permissions?.canUploadRecord === true ||
    drawingReviewNode?.permissions?.canPass === true ||
    drawingReviewNode?.permissions?.canReturn === true
  ) {
    addTodo({
      node: drawingReviewNode,
      actionText: getDetailedDesignWorkbenchDrawingReviewActionText(drawingReviewNode),
      actionKey: 'drawing_review_checker'
    });
  }
  if (drawingReviewNode?.permissions?.canApprove === true || drawingReviewNode?.permissions?.canReturnByRd === true) {
    addTodo({
      node: drawingReviewNode,
      actionText: '审批/退回图纸审查',
      actionKey: 'drawing_review_rd'
    });
  }

  const countersignNode = getDetailedDesignWorkflowNodeDto(
    workflow,
    DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
  );
  if (countersignNode?.permissions?.canSubmit === true) {
    addTodo({
      node: countersignNode,
      actionText: '提交客户图纸会签',
      actionKey: 'submit_customer_drawing_countersign'
    });
  } else if (countersignNode?.permissions?.canUploadCustomerDrawingCountersign === true) {
    addTodo({
      node: countersignNode,
      actionText: '上传客户会签图纸扫描件',
      actionKey: 'upload_customer_drawing_countersign'
    });
  }

  return todos;
}

function buildDetailedDesignNodeBlockingReasons({
  nodeRow,
  definition,
  roleState,
  projectEnded,
  isDetailedDesignStageVisible,
  uploadSlotsByKey,
  reviewFormsByNodeKey,
  drawingReview
}) {
  if (projectEnded) {
    return ['项目已结束，详细设计 workflow 只读'];
  }

  if (!isDetailedDesignStageVisible) {
    return ['等待项目进入详细设计阶段'];
  }

  if (nodeRow.status === DETAILED_DESIGN_NODE_STATUS.NOT_STARTED) {
    return ['等待前置节点完成'];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING) {
    const slot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK) || null;
    return slot?.current_file_id
      ? []
      : ['等待制造中心负责人上传项目启动书'];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION) {
    const workPlanSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN) || null;
    if (!areDetailedDesignRolesAssignedFromState(roleState)) {
      return ['等待研发中心负责人完成详细设计角色分配'];
    }
    if (!workPlanSlot?.current_file_id) {
      return ['等待项目经理上传详细设计阶段工作计划'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN) {
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) {
      return ['等待研发中心负责人分配技术负责人'];
    }
    const requiredSlots = DETAILED_DESIGN_UPLOAD_SLOTS.filter((slot) =>
      DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS.has(slot.slotKey)
    );
    const requiredRevision = Number(nodeRow.current_revision || 1);
    return requiredSlots.flatMap((slot) => {
      const slotRow = uploadSlotsByKey.get(slot.slotKey) || null;
      if (hasDetailedDesignNoUploadForRevision(uploadSlotsByKey, slot.slotKey, requiredRevision)) {
        return [];
      }
      if (!slotRow?.current_file_id) {
        return [`等待技术负责人上传${slot.slotName}或标记无需上传`];
      }
      if (Number(slotRow.current_file_revision ?? 0) < requiredRevision) {
        return [`等待技术负责人重新上传当前版本${slot.slotName}或标记无需上传`];
      }
      return [];
    });
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW) {
    const reviewFormRowCandidate = reviewFormsByNodeKey.get(nodeRow.node_key) || null;
    const reviewFormRow = isDetailedDesignReviewFormCurrentForRevision(
      reviewFormRowCandidate,
      nodeRow.current_revision
    )
      ? reviewFormRowCandidate
      : null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) {
      return ['等待研发中心负责人分配技术负责人'];
    }
    if (!reviewFormRow || reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT) {
      return ['等待技术负责人提交内部设计评审表'];
    }
    if (reviewFormRow.review_status === 'returned') {
      return ['内部设计评审已退回，等待技术负责人重新提交'];
    }
    if (
      reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
      reviewFormRow.review_status === 'pending'
    ) {
      return ['等待研发中心负责人审批内部设计评审表'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW) {
    const reviewFormRowCandidate = reviewFormsByNodeKey.get(nodeRow.node_key) || null;
    const reviewFormRow = isDetailedDesignReviewFormCurrentForRevision(
      reviewFormRowCandidate,
      nodeRow.current_revision
    )
      ? reviewFormRowCandidate
      : null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) {
      return ['等待研发中心负责人分配技术负责人'];
    }
    if (!reviewFormRow || reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT) {
      return ['等待技术负责人提交客户设计评审表'];
    }
    if (reviewFormRow.review_status === 'returned') {
      return ['客户设计评审已退回，等待技术负责人重新提交'];
    }
    if (
      reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
      reviewFormRow.review_status === 'pending'
    ) {
      return ['等待研发中心负责人审批客户设计评审表'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING) {
    const slot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) || null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) {
      return ['等待研发中心负责人分配技术负责人'];
    }
    if (!slot?.current_file_id) {
      return ['等待技术负责人上传产品平面图'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.PARTS_LIST) {
    const productPlanSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) || null;
    const slot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST) || null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) {
      return ['等待研发中心负责人分配技术负责人'];
    }
    if (!productPlanSlot?.current_file_id) {
      return ['等待技术负责人上传产品平面图'];
    }
    if (!slot?.current_file_id) {
      return ['等待技术负责人上传零部件清单'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW) {
    const productPlan = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) || null;
    const partsList = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST) || null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER]?.userId) {
      return ['等待研发中心负责人分配图纸审查负责人'];
    }
    if (!productPlan?.current_file_id || !partsList?.current_file_id) {
      return ['等待技术负责人完成产品平面图和零部件清单'];
    }
    if (drawingReview?.checker_status === DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.RETURNED) {
      return ['图纸审查已退回，等待技术负责人重新提交产品平面图/零部件清单'];
    }
    if (drawingReview?.checker_status === DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.PENDING) {
      return ['等待图纸审查负责人审查'];
    }
    if (drawingReview?.checker_status === DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED &&
      drawingReview?.rd_approval_status === DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING) {
      return ['等待研发中心负责人审批图纸审查'];
    }
    return [];
  }

  if (nodeRow.node_key === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN) {
    const slot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN) || null;
    if (!roleState?.[DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId) {
      return ['等待研发中心负责人分配商务负责人'];
    }
    return slot?.current_file_id ? [] : ['等待商务负责人上传客户会签图纸扫描件'];
  }

  return [];
}

function normalizeDetailedDesignReviewFormDataForDto(rawFormData) {
  if (!rawFormData || typeof rawFormData !== 'object' || Array.isArray(rawFormData)) {
    return {};
  }

  const formData = {
    ...rawFormData
  };
  for (const key of DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS) {
    formData[key] = normalizeReviewRepeatable(formData[key]);
  }
  if (!formData.implementationPlanItems || typeof formData.implementationPlanItems !== 'object') {
    formData.implementationPlanItems = normalizeDetailedDesignImplementationPlanItems(rawFormData, formData);
  }
  formData.implementationPlanSummary = Array.isArray(formData.implementationPlanSummary)
    ? formData.implementationPlanSummary
    : buildDetailedDesignImplementationPlanSummary(formData);
  return formData;
}

function buildDetailedDesignReviewForm(row, permissions, definition, nodeRevision = 1) {
  const currentNodeRevision = Number(nodeRevision || 1);
  if (!row) {
    return {
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType,
      documentCode: definition.documentCode,
      documentName: definition.documentName,
      formName: definition.formName ?? definition.documentName,
      templateName: definition.templateName,
      revision: currentNodeRevision,
      sourceRevision: null,
      isCurrentRevision: true,
      status: 'not_started',
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT,
      formData: {},
      generatedFileStatus: DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED,
      generatedFile: {
        status: DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED,
        fileName: null,
        mimeType: null,
        fileSize: null,
        templateKey: definition.templateKey,
        templateName: definition.templateName,
        templateVersion: null,
        templateHash: null,
        generatedByUserId: null,
        generatedAt: null,
        errorMessage: null,
        canDownload: false
      },
      reviewStatus: 'pending',
      reviewer: null,
      returnReason: null,
      permissions
    };
  }

  const rowRevision = Number(row.revision || 1);
  const isCurrentRevision = rowRevision === currentNodeRevision;
  if (!isCurrentRevision) {
    return {
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType,
      documentCode: definition.documentCode,
      documentName: definition.documentName,
      formName: definition.formName ?? definition.documentName,
      templateName: definition.templateName,
      revision: currentNodeRevision,
      sourceRevision: rowRevision,
      isCurrentRevision: false,
      status: 'not_started',
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT,
      formData: normalizeDetailedDesignReviewFormDataForDto(parseStoredJson(row.form_data_json, {})),
      generatedFileStatus: DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED,
      generatedFile: {
        status: DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED,
        fileName: null,
        mimeType: null,
        fileSize: null,
        templateKey: definition.templateKey,
        templateName: definition.templateName,
        templateVersion: null,
        templateHash: null,
        generatedByUserId: null,
        generatedAt: null,
        errorMessage: null,
        canDownload: false
      },
      reviewStatus: 'pending',
      reviewer: null,
      returnReason: null,
      permissions
    };
  }

  const generatedFile = {
    status: row.generated_file_status,
    storageKey: row.generated_file_storage_key,
    fileName: row.generated_file_name,
    mimeType: row.generated_file_mime_type,
    fileSize: row.generated_file_size === null || row.generated_file_size === undefined
      ? null
      : Number(row.generated_file_size || 0),
    templateKey: row.generated_file_template_key ?? definition.templateKey,
    templateName: definition.templateName,
    templateVersion: row.generated_file_template_version,
    templateHash: row.generated_file_template_hash,
    generatedAt: row.generated_at ?? null,
    generatedByUserId: row.generated_by_user_id ?? null,
    errorMessage: row.generation_error_message ?? null,
    canDownload: permissions?.canDownloadGeneratedFile === true
  };

  return {
    nodeKey: definition.nodeKey,
    reviewType: definition.reviewType,
    documentCode: definition.documentCode,
    documentName: definition.documentName,
    formName: definition.formName ?? definition.documentName,
    templateName: definition.templateName,
    revision: rowRevision,
    sourceRevision: rowRevision,
    isCurrentRevision: true,
    status: row.review_status === 'returned'
      ? 'returned'
      : row.review_status === 'approved'
        ? 'approved'
        : row.form_status,
    formStatus: row.form_status,
    formData: normalizeDetailedDesignReviewFormDataForDto(parseStoredJson(row.form_data_json, {})),
    generatedFileStatus: row.generated_file_status,
    generatedFile,
    reviewStatus: row.review_status,
    reviewer: row.reviewed_by_user_id
      ? {
          id: row.reviewed_by_user_id,
          account: row.reviewed_by_account ?? null,
          name: row.reviewed_by_display_name ?? null
        }
      : null,
    returnReason: row.return_reason ?? null,
    permissions
  };
}

function buildDetailedDesignReviewFormDto({
  projectRow,
  nodes,
  rolesRow,
  professionalGroupMembers = [],
  reviewFormRow,
  nodeKey,
  user,
  autoSubmit = null
}) {
  const definition = getDetailedDesignReviewFormDefinition(nodeKey);
  const nodeRows = nodes.length > 0 ? nodes : buildVirtualDetailedDesignNodes(projectRow);
  const nodeRow = buildDetailedDesignWorkflowNodeMap(nodeRows).get(nodeKey) || null;
  const usersById = new Map();
  const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });
  const projectEnded = isDetailedDesignProjectEnded(projectRow);
  const isDetailedDesignStageWritable = !projectEnded && isProjectInDetailedDesignStage(projectRow);
  const permissions = buildDetailedDesignReviewFormPermissions({
    reviewFormRow,
    nodeStatus: nodeRow?.status,
    nodeRevision: nodeRow?.current_revision ?? 1,
    roleState,
    user,
    projectEnded,
    isDetailedDesignStageWritable,
    isDetailedDesignStageVisible: hasReachedDetailedDesignStage(projectRow)
  });

  return {
    projectId: projectRow.id,
    stageKey: DETAILED_DESIGN_STAGE.STAGE_KEY,
    nodeKey,
    nodeStatus: nodeRow?.status ?? DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
    nodeRevision: Number(nodeRow?.current_revision || 1),
    reviewType: definition.reviewType,
    form: buildDetailedDesignReviewForm(reviewFormRow, permissions, definition, nodeRow?.current_revision ?? 1),
    permissions,
    autoSubmit
  };
}

function buildDetailedDesignDrawingReviewHistory(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    revision: Number(row.revision || 1),
    drawingRevision: Number(row.drawing_revision || 1),
    currentDesignRevision: Number(row.current_design_revision || 1),
    originalFileName: row.original_file_name,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    isCurrent: Boolean(row.is_current),
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedBy: row.uploaded_by_user_id
      ? {
          id: row.uploaded_by_user_id,
          account: row.uploaded_by_account ?? null,
          name: row.uploaded_by_display_name ?? null
        }
      : null,
    uploadedAt: row.uploaded_at ?? null,
    returnReason: row.return_reason ?? null
  }));
}

function buildDetailedDesignDrawingReview(row, recordHistory, permissions) {
  if (!row) {
    const virtual = buildInitialDetailedDesignDrawingReview();
    return {
      ...virtual,
      recordHistory,
      downloadableFiles: [],
      permissions
    };
  }

  return {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    checkerStatus: row.checker_status,
    rdApprovalStatus: row.rd_approval_status,
    currentRevision: Number(row.current_revision || 1),
    productPlanDrawingRevision: Number(row.product_plan_drawing_revision || 1),
    partsListRevision: Number(row.parts_list_revision || 1),
    checker: row.checker_user_id
      ? {
          id: row.checker_user_id,
          account: row.checker_account ?? null,
          name: row.checker_display_name ?? null
        }
      : null,
    rdApprover: row.rd_approver_user_id
      ? {
          id: row.rd_approver_user_id,
          account: row.rd_approver_account ?? null,
          name: row.rd_approver_display_name ?? null
        }
      : null,
    recordHistory,
    downloadableFiles: [],
    blockingReasons: [],
    permissions
  };
}

function buildDetailedDesignWorkflowPermissions({
  projectRow,
  roleState,
  user,
  professionalGroupMembers,
  projectEnded,
  isDetailedDesignStageWritable,
  nodeStatusByKey
}) {
  const canAssignRolesNodeActionable = isDetailedDesignStageWritable &&
    isDetailedDesignNodeStatusActionable(
      nodeStatusByKey.get(DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION),
      DETAILED_DESIGN_UPLOAD_ACTIONABLE_NODE_STATUSES
    );

  return {
    canViewWorkflow: canViewDetailedDesignWorkflow(user),
    isProjectEnded: projectEnded,
    isManufacturingCenterManager: isDetailedDesignManufacturingCenterManager(user),
    isRdCenterManager: isDetailedDesignRdCenterManager(user),
    isProjectManager: isDetailedDesignProjectManager(roleState, user),
    isBusinessOwner: isDetailedDesignBusinessOwner(roleState, user),
    isTechnicalOwner: isDetailedDesignTechnicalOwner(roleState, user),
    isProcurementOwner: isDetailedDesignProcurementOwner(roleState, user),
    isFinanceAccountant: isDetailedDesignFinanceAccountant(roleState, user),
    isDrawingReviewOwner: isDetailedDesignDrawingReviewOwner(roleState, user),
    professionalGroupMemberCount: professionalGroupMembers.length,
    canAssignRoles: canAssignRolesNodeActionable && canAssignDetailedDesignRoles(user)
  };
}

function buildDetailedDesignWorkflowNodeMap(nodes) {
  return new Map(nodes.map((node) => [node.node_key, node]));
}

function buildDetailedDesignUploadSlotMap(uploadSlots) {
  return new Map(uploadSlots.map((slot) => [slot.slot_key, slot]));
}

function buildDetailedDesignReviewFormMap(reviewForms) {
  return new Map(reviewForms.map((form) => [form.node_key, form]));
}

function throwDetailedDesignForbidden(message, details = ['user']) {
  throw new DetailedDesignWorkflowError(
    DETAILED_DESIGN_ERROR.FORBIDDEN,
    message,
    403,
    details
  );
}

function throwInvalidUploadFile() {
  throw new DetailedDesignWorkflowError(
    DETAILED_DESIGN_ERROR.INVALID_UPLOAD_FILE,
    'Invalid detailed design upload file',
    400,
    ['file']
  );
}

function normalizePositiveUserId(value, fieldName) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.ROLE_REQUIRED,
      `${fieldName} is required`,
      400,
      [fieldName]
    );
  }

  if (!/^[1-9]\d*$/.test(text)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_ROLE_USER,
      `${fieldName} is invalid`,
      400,
      [fieldName]
    );
  }

  const userId = Number(text);
  if (!Number.isSafeInteger(userId)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_ROLE_USER,
      `${fieldName} is invalid`,
      400,
      [fieldName]
    );
  }

  return userId;
}

function normalizeOptionalUserIdList(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_ROLE_USER,
      `${fieldName} must be an array`,
      400,
      [fieldName]
    );
  }

  const ids = [];
  const seen = new Set();
  for (const item of value) {
    const rawUserId = typeof item === 'object' && item !== null ? item.userId ?? item.user_id ?? item.id : item;
    const userId = normalizePositiveUserId(rawUserId, fieldName);
    if (!seen.has(userId)) {
      seen.add(userId);
      ids.push(userId);
    }
  }

  return ids;
}

function getDetailedDesignRoleRequestField(definition) {
  return `${definition.roleKey}UserId`.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalizeDetailedDesignRoleAssignmentPayload(payload = {}) {
  const normalized = Object.fromEntries(
    DETAILED_DESIGN_ROLE_DEFINITIONS.map((definition) => {
      const fieldName = getDetailedDesignRoleRequestField(definition);
      return [fieldName, normalizePositiveUserId(payload[fieldName], fieldName)];
    })
  );

  normalized.professionalGroupMemberUserIds = normalizeOptionalUserIdList(
    payload.professionalGroupMemberUserIds ?? payload.professionalGroupMembers,
    'professionalGroupMemberUserIds'
  );

  return normalized;
}

function sanitizeOriginalFileName(filename) {
  return String(filename || '').replace(/\\/g, '/').split('/').pop().trim();
}

function normalizeUploadMimeType(mimeType) {
  const normalized = String(mimeType || '').trim();
  return normalized || DEFAULT_UPLOAD_MIME_TYPE;
}

function normalizeUploadFile(file) {
  if (!file || file.tooLarge || !Buffer.isBuffer(file.buffer)) {
    throwInvalidUploadFile();
  }

  const size = Number(file.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > DETAILED_DESIGN_UPLOAD_MAX_FILE_SIZE ||
    file.buffer.length !== size
  ) {
    throwInvalidUploadFile();
  }

  const originalFileName = sanitizeOriginalFileName(file.originalFileName);
  const mimeType = normalizeUploadMimeType(file.mimeType);
  if (
    !originalFileName ||
    originalFileName.length > MAX_UPLOAD_TEXT_FIELD_LENGTH ||
    mimeType.length > MAX_UPLOAD_TEXT_FIELD_LENGTH
  ) {
    throwInvalidUploadFile();
  }

  return {
    ...file,
    originalFileName,
    mimeType,
    size
  };
}

function parseStoredJson(value, fallback = {}) {
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

function normalizeReviewText(value) {
  return String(value ?? '').trim();
}

function normalizeReviewRepeatable(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeReviewText(item)).filter(Boolean);
  }

  const normalized = normalizeReviewText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const DETAILED_DESIGN_REVIEW_REPEATABLE_FIELD_KEYS = new Set([
  'designGoalAchievement',
  'designRiskAssessment',
  'designOptimizationSuggestions'
]);

const DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS = Object.freeze([
  'designGoalAchievement',
  'designRiskAssessment',
  'designOptimizationSuggestions'
]);

const DETAILED_DESIGN_REVIEW_MATRIX_LABELS = Object.freeze({
  designGoalAchievement: '目标',
  designRiskAssessment: '风险',
  designOptimizationSuggestions: '建议'
});

const DETAILED_DESIGN_REVIEW_TEXT_FIELD_KEYS = new Set([
  'meetingDate',
  'meetingLocation',
  'presenter',
  'internalParticipants',
  'customerParticipants',
  'reviewConclusion',
  'recorder'
]);

function normalizeDetailedDesignImplementationPlanItems(rawFormData, formData) {
  const rawItems = rawFormData?.implementationPlanItems;
  const normalized = {};

  for (const key of DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS) {
    const sourceRows = formData[key] || [];
    const rawPlans = Array.isArray(rawItems?.[key])
      ? rawItems[key]
      : [];
    normalized[key] = sourceRows.map((_, index) => normalizeReviewText(rawPlans[index]));
  }

  const hasMatrixPlans = Object.values(normalized).some((items) => items.some(Boolean));
  if (!hasMatrixPlans) {
    const legacyPlans = normalizeReviewRepeatable(rawFormData?.designImplementationPlan);
    let offset = 0;
    for (const key of DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS) {
      normalized[key] = (formData[key] || []).map(() => normalizeReviewText(legacyPlans[offset++]));
    }
  }

  return normalized;
}

function buildDetailedDesignImplementationPlanSummary(formData) {
  const rows = [];
  for (const key of DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS) {
    const label = DETAILED_DESIGN_REVIEW_MATRIX_LABELS[key] || key;
    const contentRows = formData[key] || [];
    const planRows = formData.implementationPlanItems?.[key] || [];
    contentRows.forEach((content, index) => {
      const contentText = normalizeReviewText(content);
      const planText = normalizeDetailedDesignImplementationPlanSummaryText(planRows[index]);
      if (!contentText && !planText) {
        return;
      }
      rows.push(`${label}${index + 1}：${planText}`);
    });
  }
  return rows;
}

function normalizeDetailedDesignImplementationPlanSummaryText(value) {
  const text = normalizeReviewText(value);
  const legacyMatch = text.match(/(?:^|\n)实施计划[:：]\s*([\s\S]*)$/);
  return legacyMatch ? normalizeReviewText(legacyMatch[1]) : text;
}

function normalizeDetailedDesignReviewFormPayload(payload = {}) {
  const rawFormData = payload?.formData ?? payload;
  if (!rawFormData || typeof rawFormData !== 'object' || Array.isArray(rawFormData)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Detailed design review form data must be an object',
      400,
      ['formData']
    );
  }

  const formData = {};
  for (const key of DETAILED_DESIGN_REVIEW_TEXT_FIELD_KEYS) {
    formData[key] = normalizeReviewText(rawFormData[key]);
  }
  for (const key of DETAILED_DESIGN_REVIEW_REPEATABLE_FIELD_KEYS) {
    formData[key] = normalizeReviewRepeatable(rawFormData[key]);
  }
  formData.implementationPlanItems = normalizeDetailedDesignImplementationPlanItems(rawFormData, formData);
  formData.implementationPlanSummary = buildDetailedDesignImplementationPlanSummary(formData);
  formData.designImplementationPlan = formData.implementationPlanSummary;

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > 100000) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Detailed design review form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
  };
}

function hasReviewFormFieldValue(formData, fieldKey) {
  if (fieldKey === 'implementationPlanItems') {
    return DETAILED_DESIGN_REVIEW_MATRIX_FIELD_KEYS.every((key) =>
      (formData?.[key] || []).every((item, index) =>
        !normalizeReviewText(item) ||
        Boolean(normalizeReviewText(formData?.implementationPlanItems?.[key]?.[index]))
      )
    );
  }

  const value = formData?.[fieldKey];
  if (Array.isArray(value)) {
    return value.some((item) => normalizeReviewText(item));
  }
  return Boolean(normalizeReviewText(value));
}

function assertRequiredDetailedDesignReviewFormFields(formData, requiredFieldKeys = []) {
  const missing = requiredFieldKeys.filter((fieldKey) => !hasReviewFormFieldValue(formData, fieldKey));
  if (missing.length > 0) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING,
      'Detailed design review form required fields are missing',
      400,
      missing
    );
  }
}

function normalizeReviewComment(payload = {}) {
  return normalizeReviewText(payload?.comment ?? payload?.approvalComment ?? '');
}

function normalizeReturnReason(payload = {}) {
  const returnReason = normalizeReviewText(payload?.returnReason ?? payload?.comment ?? '');
  if (!returnReason) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.RETURN_REASON_REQUIRED,
      'Detailed design return reason is required',
      400,
      ['returnReason']
    );
  }
  return returnReason.slice(0, 1000);
}

async function selectAssignableDetailedDesignUsers(executor, normalizedPayload) {
  const roleUserIds = DETAILED_DESIGN_ROLE_DEFINITIONS.map((definition) =>
    normalizedPayload[getDetailedDesignRoleRequestField(definition)]
  );
  const fieldByUserId = new Map();
  for (const definition of DETAILED_DESIGN_ROLE_DEFINITIONS) {
    fieldByUserId.set(
      normalizedPayload[getDetailedDesignRoleRequestField(definition)],
      getDetailedDesignRoleRequestField(definition)
    );
  }
  for (const userId of normalizedPayload.professionalGroupMemberUserIds) {
    if (!fieldByUserId.has(userId)) {
      fieldByUserId.set(userId, 'professionalGroupMemberUserIds');
    }
  }

  const usersById = await selectUsersByIds(executor, [
    ...roleUserIds,
    ...normalizedPayload.professionalGroupMemberUserIds
  ]);
  for (const [userId, fieldName] of fieldByUserId.entries()) {
    const assignedUser = usersById.get(Number(userId));
    if (!assignedUser) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.INVALID_ROLE_USER,
        `${fieldName} user does not exist`,
        400,
        [fieldName]
      );
    }
    if (!canBeResponsibleUser(assignedUser)) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.INVALID_ROLE_USER,
        `${fieldName} user is not an enabled business department user`,
        409,
        [fieldName]
      );
    }
  }

  return usersById;
}

function buildAssignedRoleDetails(normalizedPayload) {
  const roles = Object.fromEntries(
    DETAILED_DESIGN_ROLE_DEFINITIONS.map((definition) => [
      definition.roleKey,
      normalizedPayload[getDetailedDesignRoleRequestField(definition)]
    ])
  );

  return {
    roles,
    professionalGroupMemberUserIds: normalizedPayload.professionalGroupMemberUserIds
  };
}

async function upsertDetailedDesignRoles(executor, { projectId, normalizedPayload, userId }) {
  await executor.execute(
    `INSERT INTO project_detailed_design_roles (
      project_id,
      project_manager_user_id,
      business_owner_user_id,
      technical_owner_user_id,
      procurement_owner_user_id,
      finance_accountant_user_id,
      drawing_review_owner_user_id,
      assigned_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      project_manager_user_id = VALUES(project_manager_user_id),
      business_owner_user_id = VALUES(business_owner_user_id),
      technical_owner_user_id = VALUES(technical_owner_user_id),
      procurement_owner_user_id = VALUES(procurement_owner_user_id),
      finance_accountant_user_id = VALUES(finance_accountant_user_id),
      drawing_review_owner_user_id = VALUES(drawing_review_owner_user_id),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = CURRENT_TIMESTAMP`,
    [
      projectId,
      normalizedPayload.projectManagerUserId,
      normalizedPayload.businessOwnerUserId,
      normalizedPayload.technicalOwnerUserId,
      normalizedPayload.procurementOwnerUserId,
      normalizedPayload.financeAccountantUserId,
      normalizedPayload.drawingReviewOwnerUserId,
      userId,
      userId
    ]
  );
}

async function replaceProfessionalGroupMembers(executor, { projectId, memberUserIds, userId }) {
  await executor.execute(
    `UPDATE project_detailed_design_professional_group_members
    SET is_active = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?`,
    [projectId]
  );

  for (const memberUserId of memberUserIds) {
    await executor.execute(
      `INSERT INTO project_detailed_design_professional_group_members (
        project_id,
        user_id,
        assigned_by_user_id,
        is_active
      ) VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        is_active = 1,
        assigned_by_user_id = VALUES(assigned_by_user_id),
        assigned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
      [projectId, memberUserId, userId]
    );
  }
}

function areDetailedDesignRolesAssigned(rolesRow) {
  return DETAILED_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(rolesRow?.[definition.columnName]));
}

function areDetailedDesignRolesAssignedFromState(roleState) {
  return DETAILED_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(roleState?.[definition.roleKey]?.userId));
}

async function insertDetailedDesignRolesAssignedLog(executor, { projectId, normalizedPayload, actorUserId }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_ROLES_ASSIGNED,
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: '分配详细设计阶段项目内角色',
    details: {
      projectId,
      ...buildAssignedRoleDetails(normalizedPayload),
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

function getDetailedDesignUploadLogActionType(slot) {
  if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK) {
    return OPERATION_ACTION_TYPE.DETAILED_DESIGN_PROJECT_KICKOFF_BOOK_UPLOADED;
  }
  if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN) {
    return OPERATION_ACTION_TYPE.DETAILED_DESIGN_WORK_PLAN_UPLOADED;
  }
  if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN) {
    return OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_DRAWING_COUNTERSIGN_UPLOADED;
  }
  return OPERATION_ACTION_TYPE.DETAILED_DESIGN_FILE_UPLOADED;
}

function getDetailedDesignUploadLogSummary(slot, fileRow) {
  if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN) {
    return '上传客户会签图纸扫描件';
  }
  return `上传详细设计资料：${slot.slotName} / ${fileRow.original_file_name}`;
}

async function insertDetailedDesignUploadLog(executor, { projectId, actorUserId, slot, fileRow }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: getDetailedDesignUploadLogActionType(slot),
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: getDetailedDesignUploadLogSummary(slot, fileRow),
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      documentCode: slot.documentCode ?? null,
      fileId: fileRow.id,
      originalFileName: fileRow.original_file_name,
      fileSize: Number(fileRow.file_size),
      revision: Number(fileRow.revision),
      uploadedByUserId: actorUserId
    }
  });
}

async function insertDetailedDesignNodeSubmitLog(executor, {
  projectId,
  actorUserId,
  nodeKey,
  revision,
  nextNodeKey = null
}) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_NODE_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: `提交详细设计节点：${getDetailedDesignNodeDefinition(nodeKey)?.nodeName || nodeKey}`,
    details: {
      projectId,
      nodeKey,
      revision: Number(revision || 1),
      nextNodeKey,
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

async function insertDetailedDesignUploadExemptionLog(executor, {
  projectId,
  actorUserId,
  slot,
  revision,
  actionType,
  summary
}) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      documentCode: slot.documentCode ?? null,
      revision: Number(revision || 1),
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

function getDetailedDesignReviewFormLogMetadata(nodeKey, formStatus) {
  const isInternal = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW;
  const reviewType = isInternal ? DETAILED_DESIGN_REVIEW_TYPE.INTERNAL : DETAILED_DESIGN_REVIEW_TYPE.CUSTOMER;
  const reviewLabel = isInternal ? '内部设计评审' : '客户设计评审';

  if (formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
    return {
      reviewType,
      actionType: isInternal
        ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_FORM_SUBMITTED
        : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_FORM_SUBMITTED,
      summary: `提交${reviewLabel}表单`
    };
  }

  return {
    reviewType,
    actionType: isInternal
      ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_FORM_SAVED
      : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_FORM_SAVED,
    summary: `保存${reviewLabel}草稿`
  };
}

function getDetailedDesignReviewFormGenerationLogMetadata(nodeKey, success) {
  const isInternal = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW;
  return {
    reviewType: isInternal ? DETAILED_DESIGN_REVIEW_TYPE.INTERNAL : DETAILED_DESIGN_REVIEW_TYPE.CUSTOMER,
    actionType: success
      ? isInternal
        ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_FORM_GENERATED
        : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_FORM_GENERATED
      : isInternal
        ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED
        : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_FORM_GENERATION_FAILED,
    summary: success
      ? `生成${isInternal ? '内部' : '客户'}设计评审文件`
      : `生成${isInternal ? '内部' : '客户'}设计评审文件失败`
  };
}

function getDetailedDesignReviewApprovalLogMetadata(nodeKey, approved) {
  const isInternal = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW;
  return {
    reviewType: isInternal ? DETAILED_DESIGN_REVIEW_TYPE.INTERNAL : DETAILED_DESIGN_REVIEW_TYPE.CUSTOMER,
    actionType: approved
      ? isInternal
        ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_APPROVED
        : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_APPROVED
      : isInternal
        ? OPERATION_ACTION_TYPE.DETAILED_DESIGN_INTERNAL_REVIEW_RETURNED
        : OPERATION_ACTION_TYPE.DETAILED_DESIGN_CUSTOMER_REVIEW_RETURNED,
    summary: approved
      ? `${isInternal ? '内部' : '客户'}设计评审通过`
      : `${isInternal ? '内部' : '客户'}设计评审退回`
  };
}

async function insertDetailedDesignReviewFormLog(executor, {
  projectId,
  actorUserId,
  formRow,
  actionType,
  summary,
  details = {}
}) {
  const definition = getDetailedDesignReviewFormDefinition(formRow.node_key);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: formRow.node_key,
      reviewType: definition?.reviewType ?? null,
      documentCode: definition?.documentCode ?? null,
      formId: formRow.id ?? null,
      revision: Number(formRow.revision || 1),
      ...details,
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

async function deactivateCurrentDetailedDesignReviewForm(executor, projectId, nodeKey) {
  await executor.execute(
    `UPDATE project_detailed_design_review_forms
    SET is_current = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND is_current = 1`,
    [projectId, nodeKey]
  );
}

async function insertDetailedDesignReviewForm(executor, {
  projectId,
  nodeKey,
  reviewType,
  revision,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateKey = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  const [result] = await executor.execute(
    `INSERT INTO project_detailed_design_review_forms (
      project_id,
      node_key,
      review_type,
      revision,
      form_status,
      form_data_json,
      is_current,
      submitted_by_user_id,
      submitted_at,
      generated_file_status,
      generated_file_storage_key,
      generated_file_name,
      generated_file_mime_type,
      generated_file_size,
      generated_file_template_key,
      generated_file_template_version,
      generated_file_template_hash,
      generated_at,
      generated_by_user_id,
      generation_error_message,
      review_status,
      reviewed_by_user_id,
      reviewed_at,
      return_reason,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ${formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'}, ?, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL, ?, ?, 'pending', NULL, NULL, NULL, ?, ?)`,
    [
      projectId,
      nodeKey,
      reviewType,
      revision,
      formStatus,
      formDataJson,
      formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateKey,
      generatedFileTemplateKey ? 'v1' : null,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      actorUserId
    ]
  );

  return selectCurrentDetailedDesignReviewForm(executor, projectId, nodeKey);
}

async function updateDetailedDesignReviewForm(executor, {
  formId,
  projectId,
  nodeKey,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateKey = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  await executor.execute(
    `UPDATE project_detailed_design_review_forms
    SET form_status = ?,
      form_data_json = ?,
      submitted_by_user_id = ?,
      submitted_at = ${formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'},
      generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_key = ?,
      generated_file_template_version = ?,
      generated_file_template_hash = NULL,
      generated_at = NULL,
      generated_by_user_id = ?,
      generation_error_message = ?,
      review_status = 'pending',
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      return_reason = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      formStatus,
      formDataJson,
      formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateKey,
      generatedFileTemplateKey ? 'v1' : null,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      formId
    ]
  );

  return selectCurrentDetailedDesignReviewForm(executor, projectId, nodeKey);
}

async function saveDetailedDesignReviewFormVersion(executor, {
  projectId,
  nodeKey,
  reviewType,
  nodeRevision,
  currentFormRow,
  formStatus,
  formDataJson,
  actorUserId
}) {
  const isSubmit = formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED;
  const generatedFileStatus = isSubmit
    ? DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATING
    : DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED;
  const definition = getDetailedDesignReviewFormDefinition(nodeKey);
  const generatedFileTemplateKey = isSubmit ? definition?.templateKey ?? null : null;
  const generatedByUserId = isSubmit ? actorUserId : null;
  const generationErrorMessage = null;
  const canUpdateCurrentForm =
    currentFormRow &&
    Number(currentFormRow.revision ?? 0) === Number(nodeRevision ?? 1) &&
    (
      currentFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT ||
      currentFormRow.generated_file_status === DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.FAILED ||
      currentFormRow.review_status === 'returned'
    );

  if (canUpdateCurrentForm) {
    return updateDetailedDesignReviewForm(executor, {
      formId: currentFormRow.id,
      projectId,
      nodeKey,
      formStatus,
      formDataJson,
      actorUserId,
      generatedFileStatus,
      generatedFileTemplateKey,
      generatedByUserId,
      generationErrorMessage
    });
  }

  await deactivateCurrentDetailedDesignReviewForm(executor, projectId, nodeKey);
  const maxRevision = await selectMaxDetailedDesignReviewFormRevision(executor, projectId, nodeKey);
  const nextRevision = Math.max(maxRevision + 1, Number(nodeRevision ?? 1));
  return insertDetailedDesignReviewForm(executor, {
    projectId,
    nodeKey,
    reviewType,
    revision: nextRevision,
    formStatus,
    formDataJson,
    actorUserId,
    generatedFileStatus,
    generatedFileTemplateKey,
    generatedByUserId,
    generationErrorMessage
  });
}

async function markDetailedDesignReviewFormGenerated(executor, {
  formId,
  storageKey,
  fileName,
  mimeType,
  fileSize,
  templateKey,
  generatedByUserId
}) {
  await executor.execute(
    `UPDATE project_detailed_design_review_forms
    SET generated_file_status = ?,
      generated_file_storage_key = ?,
      generated_file_name = ?,
      generated_file_mime_type = ?,
      generated_file_size = ?,
      generated_file_template_key = ?,
      generated_file_template_version = ?,
      generated_file_template_hash = NULL,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED,
      storageKey,
      fileName,
      mimeType,
      fileSize,
      templateKey,
      'v1',
      generatedByUserId,
      generatedByUserId,
      formId
    ]
  );
}

async function markDetailedDesignReviewFormGenerationFailed(executor, {
  formId,
  templateKey,
  generatedByUserId,
  errorMessage
}) {
  await executor.execute(
    `UPDATE project_detailed_design_review_forms
    SET generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_key = ?,
      generated_file_template_version = ?,
      generated_file_template_hash = NULL,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.FAILED,
      templateKey,
      'v1',
      generatedByUserId,
      String(errorMessage || 'Detailed design generated file failed').slice(0, 1000),
      generatedByUserId,
      formId
    ]
  );
}

function getDetailedDesignReviewGeneratedFileDownloadErrorDetails(nodeKey) {
  return [nodeKey];
}

function isDetailedDesignReviewFormGeneratedForRevision(reviewFormRow, requiredRevision) {
  return Boolean(reviewFormRow) &&
    Number(reviewFormRow.revision ?? 0) === Number(requiredRevision ?? 1) &&
    reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
    reviewFormRow.generated_file_status === DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(reviewFormRow.generated_file_storage_key);
}

function isDetailedDesignReviewFormSubmittedForRevision(reviewFormRow, requiredRevision) {
  return Boolean(reviewFormRow) &&
    Number(reviewFormRow.revision ?? 0) === Number(requiredRevision ?? 1) &&
    reviewFormRow.form_status === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED;
}

function isDetailedDesignReviewFormCurrentForRevision(reviewFormRow, requiredRevision) {
  return Boolean(reviewFormRow) &&
    Number(reviewFormRow.revision ?? 0) === Number(requiredRevision ?? 1);
}

async function generateAndPersistDetailedDesignReviewFormFile(executor, {
  projectRow,
  definition,
  formRow,
  actorUserId,
  storage,
  roleState
}) {
  const generation = await generateWorkflowXlsxFormFile({
    executor,
    projectRow,
    definition,
    formRow,
    actorUserId,
    storage,
    roleState
  });

  if (generation.success) {
    await markDetailedDesignReviewFormGenerated(executor, {
      formId: formRow.id,
      storageKey: generation.storageKey,
      fileName: generation.fileName,
      mimeType: generation.mimeType || GENERATED_XLSX_MIME_TYPE,
      fileSize: generation.fileSize,
      templateKey: definition.templateKey,
      generatedByUserId: actorUserId
    });
  } else {
    await markDetailedDesignReviewFormGenerationFailed(executor, {
      formId: formRow.id,
      templateKey: definition.templateKey,
      generatedByUserId: actorUserId,
      errorMessage: generation.errorMessage
    });
  }

  const refreshed = await selectCurrentDetailedDesignReviewForm(executor, projectRow.id, definition.nodeKey);
  await insertDetailedDesignReviewFormLog(executor, {
    projectId: projectRow.id,
    actorUserId,
    formRow: refreshed,
    actionType: getDetailedDesignReviewFormGenerationLogMetadata(definition.nodeKey, generation.success).actionType,
    summary: getDetailedDesignReviewFormGenerationLogMetadata(definition.nodeKey, generation.success).summary,
    details: generation.success
      ? {
          generatedFileTemplateKey: definition.templateKey,
          generatedFileName: generation.fileName,
          generatedFileStorageKey: generation.storageKey
        }
      : {
          generatedFileTemplateKey: definition.templateKey,
          generationErrorMessage: generation.errorMessage
        }
  });

  return refreshed;
}

async function buildDetailedDesignReviewFormDownload({ formRow, storage, detailKey }) {
  try {
    const filePath = await storage.assertFileReadable(formRow.generated_file_storage_key);
    return {
      filePath,
      fileName: formRow.generated_file_name,
      mimeType: formRow.generated_file_mime_type || GENERATED_XLSX_MIME_TYPE,
      fileSize: Number(formRow.generated_file_size || 0)
    };
  } catch {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.GENERATED_FILE_MISSING,
      'Detailed design generated file is missing from local storage',
      404,
      [detailKey]
    );
  }
}

function assertDetailedDesignGeneratedFormFileReady({ formRow, nodeRow, detailKey }) {
  if (!isDetailedDesignReviewFormGeneratedForRevision(formRow, nodeRow?.current_revision ?? 1)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND,
      'Current detailed design generated file is not available',
      404,
      [detailKey]
    );
  }
}

async function submitDetailedDesignReviewNodeForApproval(executor, { projectId, nodeKey, revision }) {
  const [result] = await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND current_revision = ?
      AND status IN (?, ?)`,
    [
      DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
      projectId,
      nodeKey,
      revision,
      DETAILED_DESIGN_NODE_STATUS.PENDING,
      DETAILED_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(result?.affectedRows ?? 0) !== 1) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Detailed design review node cannot enter review in current status',
      409,
      {
        nodeKey,
        revision,
        allowedStatuses: [
          DETAILED_DESIGN_NODE_STATUS.PENDING,
          DETAILED_DESIGN_NODE_STATUS.RETURNED
        ]
      }
    );
  }
}

async function markDetailedDesignReviewFormReviewed(executor, {
  formId,
  approved,
  actorUserId,
  comment = '',
  returnReason = ''
}) {
  await executor.execute(
    `UPDATE project_detailed_design_review_forms
    SET review_status = ?,
      reviewed_by_user_id = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      return_reason = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      approved ? 'approved' : 'returned',
      actorUserId,
      approved ? null : returnReason,
      actorUserId,
      formId
    ]
  );
}

async function approveDetailedDesignReviewNodeAndActivateNext(executor, { projectId, nodeKey, nextNodeKey }) {
  const [result] = await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = NULL,
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      DETAILED_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      nodeKey,
      DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
      DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL
    ]
  );

  if (Number(result?.affectedRows ?? 0) !== 1) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Detailed design review node cannot be approved in current status',
      409,
      {
        nodeKey,
        allowedStatuses: [
          DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
          DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL
        ]
      }
    );
  }

  await activateDetailedDesignNode(executor, { projectId, nodeKey: nextNodeKey });
}

async function resetDetailedDesignNodeForRework(executor, { projectId, nodeKey, status, revision, returnReason = null }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      activated_at = CASE WHEN ? = ? THEN COALESCE(activated_at, CURRENT_TIMESTAMP) ELSE NULL END,
      submitted_at = NULL,
      approved_at = NULL,
      returned_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [
      status,
      returnReason,
      revision,
      status,
      DETAILED_DESIGN_NODE_STATUS.RETURNED,
      status,
      DETAILED_DESIGN_NODE_STATUS.RETURNED,
      projectId,
      nodeKey
    ]
  );
}

async function returnDesignReviewToDetailedDesign(executor, {
  projectId,
  nodeKey,
  returnReason,
  actorUserId
}) {
  const detailedDesignNode = await selectDetailedDesignNodeForUpdate(
    executor,
    projectId,
    DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN
  );
  const nextRevision = Number(detailedDesignNode?.current_revision ?? 1) + 1;
  const affectedNodeKeys = [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN];

  await resetDetailedDesignNodeForRework(executor, {
    projectId,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    status: DETAILED_DESIGN_NODE_STATUS.RETURNED,
    revision: nextRevision,
    returnReason
  });

  const downstreamNodeKeys = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW
    ? [
        DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
        DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
        DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
        DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
        DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
        DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
      ]
    : [
        DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
        DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
        DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
        DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
        DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
        DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
      ];

  for (const downstreamNodeKey of downstreamNodeKeys) {
    affectedNodeKeys.push(downstreamNodeKey);
    await resetDetailedDesignNodeForRework(executor, {
      projectId,
      nodeKey: downstreamNodeKey,
      status: DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
      revision: nextRevision
    });
  }

  return {
    returnToNodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    affectedNodeKeys: [...new Set(affectedNodeKeys)],
    resubmitScope: 'detailed_design_files',
    nextRevision,
    actorUserId
  };
}

function mapUploadedFile(fileRow) {
  return {
    id: fileRow.id,
    revision: Number(fileRow.revision || 1),
    originalFileName: fileRow.original_file_name,
    mimeType: fileRow.mime_type || DEFAULT_UPLOAD_MIME_TYPE,
    fileSize: Number(fileRow.file_size || 0),
    uploadedByUserId: fileRow.uploaded_by_user_id,
    uploadedAt: fileRow.uploaded_at ?? null
  };
}

async function replaceCurrentDetailedDesignSlotFile(executor, { projectId, slotRow, slot, uploadFile, storageKey, userId }) {
  const currentFiles = await selectCurrentDetailedDesignUploadFiles(executor, projectId, [slot.slotKey]);
  const currentRevision = Math.max(
    Number(slotRow.revision ?? 0),
    ...currentFiles.map((file) => Number(file.revision ?? 0))
  );
  const nextRevision = currentFiles.length > 0 ? currentRevision + 1 : 1;

  await executor.execute(
    `UPDATE project_detailed_design_upload_files
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, slot.slotKey]
  );

  const [result] = await executor.execute(
    `INSERT INTO project_detailed_design_upload_files (
      project_id,
      slot_id,
      slot_key,
      revision,
      original_file_name,
      storage_key,
      mime_type,
      file_size,
      is_current,
      uploaded_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      projectId,
      slotRow.id,
      slot.slotKey,
      nextRevision,
      uploadFile.originalFileName,
      storageKey,
      uploadFile.mimeType,
      uploadFile.size,
      userId
    ]
  );

  await executor.execute(
    `UPDATE project_detailed_design_upload_slots
    SET status = ?,
      revision = ?,
      is_upload_exempted = 0,
      exemption_reason = NULL,
      exempted_by_user_id = NULL,
      exempted_at = NULL,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [DETAILED_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED, nextRevision, slotRow.id]
  );

  return {
    id: result.insertId,
    project_id: projectId,
    slot_id: slotRow.id,
    slot_key: slot.slotKey,
    revision: nextRevision,
    original_file_name: uploadFile.originalFileName,
    storage_key: storageKey,
    mime_type: uploadFile.mimeType,
    file_size: uploadFile.size,
    is_current: 1,
    uploaded_by_user_id: userId,
    uploaded_at: null
  };
}

function assertDetailedDesignNoUploadSlot(slot) {
  if (!slot || !DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS.has(slot.slotKey)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Only detailed design main file slots can be marked no-upload',
      400,
      ['slotKey']
    );
  }
}

async function markDetailedDesignUploadSlotExempted(executor, {
  projectId,
  slot,
  revision,
  actorUserId
}) {
  const [result] = await executor.execute(
    `UPDATE project_detailed_design_upload_slots
    SET is_upload_exempted = 1,
      exemption_reason = NULL,
      exempted_by_user_id = ?,
      exempted_at = CURRENT_TIMESTAMP,
      revision = GREATEST(revision, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_upload_exempted = 0`,
    [actorUserId, Number(revision || 1), projectId, slot.slotKey]
  );

  if (Number(result?.affectedRows ?? 0) !== 1) {
    throwDetailedDesignNodeBlocked(
      'Detailed design upload no-upload mark cannot be changed in current state',
      [slot.slotKey]
    );
  }
}

async function cancelDetailedDesignUploadSlotExemption(executor, { projectId, slot }) {
  const [result] = await executor.execute(
    `UPDATE project_detailed_design_upload_slots
    SET is_upload_exempted = 0,
      exemption_reason = NULL,
      exempted_by_user_id = NULL,
      exempted_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_upload_exempted = 1`,
    [projectId, slot.slotKey]
  );

  if (Number(result?.affectedRows ?? 0) !== 1) {
    throwDetailedDesignNodeBlocked(
      'Detailed design upload no-upload mark cannot be cancelled in current state',
      [slot.slotKey]
    );
  }
}

async function approveDetailedDesignNode(executor, { projectId, nodeKey }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = NULL,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [DETAILED_DESIGN_NODE_STATUS.APPROVED, projectId, nodeKey]
  );
}

async function activateDetailedDesignNode(executor, { projectId, nodeKey }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = NULL,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      DETAILED_DESIGN_NODE_STATUS.PENDING,
      projectId,
      nodeKey,
      DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
      DETAILED_DESIGN_NODE_STATUS.RETURNED
    ]
  );
}

async function completeNodeAndActivateNext(executor, { projectId, nodeKey, nextNodeKey }) {
  await approveDetailedDesignNode(executor, { projectId, nodeKey });
  if (nextNodeKey) {
    await activateDetailedDesignNode(executor, { projectId, nodeKey: nextNodeKey });
  }
}

function throwDetailedDesignNodeBlocked(message, details = []) {
  throw new DetailedDesignWorkflowError(
    DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
    message,
    409,
    details
  );
}

function assertDetailedDesignCurrentFileForSubmit(uploadSlotsByKey, slotKey, revision, detail = slotKey) {
  if (!hasDetailedDesignCurrentFileForRevision(uploadSlotsByKey, slotKey, revision)) {
    throwDetailedDesignNodeBlocked(
      'Detailed design workflow node cannot be submitted before required current files are ready',
      [detail]
    );
  }
}

function assertDetailedDesignAnyCurrentFileForSubmit(uploadSlotsByKey, slotKey, detail = slotKey) {
  if (!hasDetailedDesignCurrentFile(uploadSlotsByKey, slotKey)) {
    throwDetailedDesignNodeBlocked(
      'Detailed design workflow node cannot be submitted before required current files are ready',
      [detail]
    );
  }
}

function assertDetailedDesignMainFilesForSubmit(uploadSlotsByKey, revision) {
  const missing = [...DETAILED_DESIGN_MAIN_FILE_SLOT_KEYS].filter((slotKey) =>
    !isDetailedDesignMainFileSlotSatisfied(uploadSlotsByKey, slotKey, revision)
  );
  if (missing.length > 0) {
    throwDetailedDesignNodeBlocked(
      'Detailed design workflow node cannot be submitted before all required design files are uploaded or marked no-upload',
      missing
    );
  }
}

async function initializeDetailedDesignDrawingReviewFlowForSubmit(
  executor,
  { projectId, currentRevision, productPlanSlot, partsListSlot, actorUserId }
) {
  await updateDetailedDesignDrawingReviewFlow(executor, {
    projectId,
    currentRevision,
    productPlanDrawingRevision: Number(productPlanSlot.current_file_revision || currentRevision),
    partsListRevision: Number(partsListSlot.current_file_revision || currentRevision),
    checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.PENDING,
    rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING,
    actorUserId
  });
}

async function assertDetailedDesignUploadNodeSubmitReady(executor, {
  projectId,
  nodeRow,
  rolesRow
}) {
  const nodeKey = nodeRow.node_key;
  const revision = Number(nodeRow.current_revision || 1);
  const slots = await selectDetailedDesignUploadSlots(executor, projectId);
  const uploadSlotsByKey = buildDetailedDesignUploadSlotMap(slots);

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING) {
    assertDetailedDesignCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
      revision
    );
    return { revision, uploadSlotsByKey };
  }

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION) {
    if (!areDetailedDesignRolesAssigned(rolesRow)) {
      throwDetailedDesignNodeBlocked(
        'Detailed design roles must be fully assigned before submitting preparation node',
        ['roles']
      );
    }
    assertDetailedDesignCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
      revision
    );
    return { revision, uploadSlotsByKey };
  }

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN) {
    assertDetailedDesignMainFilesForSubmit(uploadSlotsByKey, revision);
    return { revision, uploadSlotsByKey };
  }

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING) {
    assertDetailedDesignAnyCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING
    );
    return { revision, uploadSlotsByKey };
  }

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.PARTS_LIST) {
    const productPlanSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) || null;
    const partsListSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST) || null;
    assertDetailedDesignAnyCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING
    );
    assertDetailedDesignAnyCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    );
    return { revision, uploadSlotsByKey, productPlanSlot, partsListSlot };
  }

  if (nodeKey === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN) {
    assertDetailedDesignAnyCurrentFileForSubmit(
      uploadSlotsByKey,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN
    );
    return { revision, uploadSlotsByKey };
  }

  throwDetailedDesignNodeBlocked(
    'Detailed design workflow node is not submittable',
    [nodeKey]
  );
  return { revision, uploadSlotsByKey };
}

async function updateDetailedDesignDrawingReviewFlow(executor, {
  projectId,
  currentRevision,
  productPlanDrawingRevision,
  partsListRevision,
  checkerStatus,
  rdApprovalStatus,
  checkerUserId = null,
  checkerAt = null,
  checkerComment = null,
  rdApproverUserId = null,
  rdApprovedAt = null,
  rdComment = null,
  returnReason = null,
  actorUserId = null
}) {
  await executor.execute(
    `INSERT INTO project_detailed_design_drawing_review_flows (
      project_id,
      current_revision,
      product_plan_drawing_revision,
      parts_list_revision,
      checker_status,
      rd_approval_status,
      checker_user_id,
      checker_at,
      checker_comment,
      rd_approver_user_id,
      rd_approved_at,
      rd_comment,
      return_reason,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      current_revision = VALUES(current_revision),
      product_plan_drawing_revision = VALUES(product_plan_drawing_revision),
      parts_list_revision = VALUES(parts_list_revision),
      checker_status = VALUES(checker_status),
      rd_approval_status = VALUES(rd_approval_status),
      checker_user_id = VALUES(checker_user_id),
      checker_at = VALUES(checker_at),
      checker_comment = VALUES(checker_comment),
      rd_approver_user_id = VALUES(rd_approver_user_id),
      rd_approved_at = VALUES(rd_approved_at),
      rd_comment = VALUES(rd_comment),
      return_reason = VALUES(return_reason),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = CURRENT_TIMESTAMP`,
    [
      projectId,
      currentRevision,
      productPlanDrawingRevision,
      partsListRevision,
      checkerStatus,
      rdApprovalStatus,
      checkerUserId,
      checkerAt,
      checkerComment,
      rdApproverUserId,
      rdApprovedAt,
      rdComment,
      returnReason,
      actorUserId,
      actorUserId
    ]
  );
}

async function markDetailedDesignDrawingReviewRecordHistorical(executor, { projectId, drawingRevision }) {
  await executor.execute(
    `UPDATE project_detailed_design_drawing_review_records
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND drawing_revision = ?
      AND is_current = 1`,
    [projectId, drawingRevision]
  );
}

async function setDetailedDesignDrawingReviewNodeWaitingForRdApproval(executor, { projectId, revision }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = NULL,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      approved_at = NULL,
      returned_at = NULL,
      current_revision = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [
      DETAILED_DESIGN_NODE_STATUS.WAITING_RD_APPROVAL,
      revision,
      projectId,
      DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW
    ]
  );
}

async function setDetailedDesignDrawingReviewNodeReturned(executor, { projectId, revision, returnReason }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      submitted_at = NULL,
      approved_at = NULL,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [
      DETAILED_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      revision,
      projectId,
      DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW
    ]
  );
}

async function setDetailedDesignDrawingReviewNodeApproved(executor, { projectId }) {
  await executor.execute(
    `UPDATE project_detailed_design_nodes
    SET status = ?,
      return_reason = NULL,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      approved_at = CURRENT_TIMESTAMP,
      returned_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [DETAILED_DESIGN_NODE_STATUS.APPROVED, projectId, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW]
  );
}

async function setDetailedDesignDrawingReviewRecordReturnReason(executor, { projectId, recordId, returnReason }) {
  await executor.execute(
    `UPDATE project_detailed_design_drawing_review_records
    SET return_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND id = ?`,
    [returnReason, projectId, recordId]
  );
}

async function insertDetailedDesignDrawingReviewRecord(executor, {
  projectId,
  nodeRow,
  recordFile,
  storageKey,
  userId,
  returnReason = null
}) {
  const nextRevision = (await selectMaxDetailedDesignDrawingReviewRecordRevision(executor, projectId)) + 1;
  await markDetailedDesignDrawingReviewRecordHistorical(executor, {
    projectId,
    drawingRevision: Number(nodeRow.current_revision || 1)
  });
  const [result] = await executor.execute(
    `INSERT INTO project_detailed_design_drawing_review_records (
      project_id,
      node_key,
      revision,
      drawing_revision,
      original_file_name,
      storage_key,
      mime_type,
      file_size,
      current_design_revision,
      return_reason,
      is_current,
      uploaded_by_user_id
    ) VALUES (?, 'drawing_review', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      projectId,
      nextRevision,
      Number(nodeRow.current_revision || 1),
      recordFile.originalFileName,
      storageKey,
      recordFile.mimeType,
      recordFile.size,
      Number(nodeRow.current_revision || 1),
      returnReason,
      userId
    ]
  );

  return {
    id: result.insertId,
    project_id: projectId,
    node_key: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    revision: nextRevision,
    drawing_revision: Number(nodeRow.current_revision || 1),
    original_file_name: recordFile.originalFileName,
    storage_key: storageKey,
    mime_type: recordFile.mimeType,
    file_size: recordFile.size,
    current_design_revision: Number(nodeRow.current_revision || 1),
    return_reason: returnReason,
    is_current: 1,
    uploaded_by_user_id: userId,
    uploaded_at: null,
    replaced_at: null
  };
}

async function assertDetailedDesignWriteGuard(
  executor,
  {
    projectId,
    user,
    nodeKey,
    allowedNodeStatuses = DETAILED_DESIGN_UPLOAD_ACTIONABLE_NODE_STATUSES,
    roleCheck,
    actionName = 'detailed design workflow action'
  }
) {
  const projectRow = await selectProjectContext(executor, projectId, { forUpdate: true });
  await assertWorkflowViewable(executor, projectId, user);

  if (isDetailedDesignProjectEnded(projectRow)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.PROJECT_ENDED,
      'Project has ended and detailed design workflow is read-only',
      409,
      ['projectId']
    );
  }

  if (!isProjectInDetailedDesignStage(projectRow)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NOT_IN_STAGE,
      'Project is not in detailed design stage',
      409,
      ['currentStage']
    );
  }

  const { nodes, uploadSlots } = await ensureDetailedDesignWorkflowState(executor, projectRow);
  if (nodes.length < DETAILED_DESIGN_NODES.length || uploadSlots.length < DETAILED_DESIGN_UPLOAD_SLOTS.length) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Detailed design workflow is not initialized',
      409,
      ['workflow']
    );
  }

  const nodeRow = await selectDetailedDesignNodeForUpdate(executor, projectId, nodeKey);
  if (!nodeRow) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_NODE,
      'Detailed design workflow node is not initialized',
      409,
      ['nodeKey']
    );
  }

  if (!isDetailedDesignNodeStatusActionable(nodeRow.status, allowedNodeStatuses)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      `${actionName} cannot be processed in current node status`,
      409,
      {
        nodeKey,
        nodeStatus: nodeRow.status
      }
    );
  }

  const rolesRow = await selectDetailedDesignRolesForUpdate(executor, projectId);
  const professionalGroupMemberRows = await selectDetailedDesignProfessionalGroupMembers(executor, projectId);
  const usersById = await selectUsersByIds(
    executor,
    collectDetailedDesignUserIds(projectRow, rolesRow, professionalGroupMemberRows)
  );
  const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });

  if (roleCheck && !roleCheck({ projectRow, nodeRow, rolesRow, roleState, user })) {
    throwDetailedDesignForbidden(`Current user cannot perform ${actionName}`, ['user']);
  }

  return {
    projectRow,
    nodeRow,
    rolesRow,
    roleState
  };
}

async function ensureDetailedDesignWorkflowState(executor, projectRow) {
  let [nodes, uploadSlots] = await Promise.all([
    selectDetailedDesignNodes(executor, projectRow.id),
    selectDetailedDesignUploadSlots(executor, projectRow.id)
  ]);

  const shouldMaterialize =
    !isDetailedDesignProjectEnded(projectRow) &&
    hasReachedDetailedDesignStage(projectRow) &&
    (nodes.length < DETAILED_DESIGN_NODES.length || uploadSlots.length < DETAILED_DESIGN_UPLOAD_SLOTS.length);

  if (shouldMaterialize) {
    await materializeDetailedDesignWorkflow(executor, projectRow.id);
    [nodes, uploadSlots] = await Promise.all([
      selectDetailedDesignNodes(executor, projectRow.id),
      selectDetailedDesignUploadSlots(executor, projectRow.id)
    ]);
  }

  return { nodes, uploadSlots };
}

function buildWorkflowDto({
  projectRow,
  nodes,
  rolesRow,
  professionalGroupMembers,
  uploadSlots,
  reviewForms,
  drawingReviewFlow,
  drawingReviewRecords,
  usersById,
  user
}) {
  const projectEnded = isDetailedDesignProjectEnded(projectRow);
  const isDetailedDesignStageVisible = hasReachedDetailedDesignStage(projectRow);
  const isDetailedDesignStageWritable = !projectEnded && isProjectInDetailedDesignStage(projectRow);
  const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });
  const professionalGroupMemberState = buildDetailedDesignProfessionalGroupMemberState(
    professionalGroupMembers,
    usersById
  );
  const nodeRows = nodes.length > 0 ? nodes : buildVirtualDetailedDesignNodes(projectRow);
  const uploadSlotRows = uploadSlots.length > 0 ? uploadSlots : buildVirtualDetailedDesignUploadSlots(projectRow);
  const reviewFormRows = reviewForms.length > 0 ? reviewForms : buildVirtualDetailedDesignReviewForms();
  const drawingReviewRow = drawingReviewFlow || buildVirtualDetailedDesignDrawingReview(projectRow);
  const nodeStatusByKey = new Map(nodeRows.map((nodeRow) => [nodeRow.node_key, nodeRow.status]));

  const workflowPermissions = buildDetailedDesignWorkflowPermissions({
    projectRow,
    roleState,
    user,
    professionalGroupMembers: professionalGroupMemberState,
    projectEnded,
    isDetailedDesignStageWritable,
    nodeStatusByKey
  });
  const uploadSlotsByKey = buildDetailedDesignUploadSlotMap(uploadSlotRows);
  const reviewFormsByNodeKey = buildDetailedDesignReviewFormMap(reviewFormRows);
  const drawingReviewHistory = buildDetailedDesignDrawingReviewHistory(drawingReviewRecords);
  const drawingReviewPermissions = buildDetailedDesignDrawingReviewPermissions({
    drawingReviewRow: drawingReviewRow,
    nodeStatus: nodeStatusByKey.get(DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW),
    roleState,
    user,
    projectEnded,
    isDetailedDesignStageWritable,
    isDetailedDesignStageVisible
  });
  const drawingReview = buildDetailedDesignDrawingReview(
    drawingReviewFlow,
    drawingReviewHistory,
    drawingReviewPermissions
  );
  const detailedDesignNodes = nodeRows.map((nodeRow) =>
    mapDetailedDesignNode(nodeRow, {
      projectEnded,
      isDetailedDesignStageWritable,
      isDetailedDesignStageVisible,
      roleState,
      user,
      uploadSlotsByKey,
      reviewFormsByNodeKey,
      drawingReview
    })
  );
  const detailedDesignUploadSlots = uploadSlotRows.map((slotRow) => {
    const slotDefinition = DETAILED_DESIGN_UPLOAD_SLOTS.find((slot) => slot.slotKey === slotRow.slot_key) || {
      slotKey: slotRow.slot_key,
      slotName: slotRow.slot_name,
      nodeKey: slotRow.node_key,
      slotOrder: slotRow.slot_order
    };
    const permissions = buildDetailedDesignUploadSlotPermissions({
      slotRow,
      slotDefinition,
      nodeStatus: nodeStatusByKey.get(slotDefinition.nodeKey),
      drawingReviewNodeStatus: nodeStatusByKey.get(DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW),
      projectEnded,
      isDetailedDesignStageWritable,
      isDetailedDesignStageVisible,
      roleState,
      user
    });

    return {
      id: slotRow.id,
      projectId: slotRow.project_id,
      nodeKey: slotRow.node_key,
      slotKey: slotRow.slot_key,
      slotName: slotRow.slot_name,
      slotOrder: slotRow.slot_order,
      required: Boolean(slotRow.is_required),
      revision: Number(slotRow.revision || 1),
      status: slotRow.status,
      isUploadExempted: Boolean(slotRow.is_upload_exempted),
      exemptionReason: slotRow.exemption_reason ?? null,
      exemptedByUserId: slotRow.exempted_by_user_id ?? null,
      exemptedAt: slotRow.exempted_at ?? null,
      returnReason: slotRow.return_reason ?? null,
      submittedByUserId: slotRow.submitted_by_user_id ?? null,
      submittedAt: slotRow.submitted_at ?? null,
      approvedByUserId: slotRow.approved_by_user_id ?? null,
      approvedAt: slotRow.approved_at ?? null,
      returnedByUserId: slotRow.returned_by_user_id ?? null,
      returnedAt: slotRow.returned_at ?? null,
      currentFile: mapDetailedDesignUploadFile(slotRow),
      historyAvailable: Number(slotRow.revision || 1) > 1 || Boolean(slotRow.current_file_id),
      permissions
    };
  });

  const detailedDesignReviewForms = DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS.map((definition) => {
    const reviewFormRow = reviewFormsByNodeKey.get(definition.nodeKey) || null;
    const permissions = buildDetailedDesignReviewFormPermissions({
      reviewFormRow,
      nodeStatus: nodeStatusByKey.get(definition.nodeKey),
      nodeRevision: nodeRows.find((nodeRow) => nodeRow.node_key === definition.nodeKey)?.current_revision ?? 1,
      roleState,
      user,
      projectEnded,
      isDetailedDesignStageWritable,
      isDetailedDesignStageVisible
    });
    const nodeRevision = nodeRows.find((nodeRow) => nodeRow.node_key === definition.nodeKey)?.current_revision ?? 1;
    return buildDetailedDesignReviewForm(reviewFormRow, permissions, definition, nodeRevision);
  });

  drawingReview.downloadableFiles = [
    uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING)?.current_file_id
      ? {
          slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
          slotName: '产品平面图',
          currentFile: mapDetailedDesignUploadFile(
            uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING)
          )
        }
      : null,
    uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST)?.current_file_id
      ? {
          slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
          slotName: '产品零部件清单',
          currentFile: mapDetailedDesignUploadFile(
            uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST)
          )
        }
      : null,
  ].filter(Boolean);
  drawingReview.recordHistory = drawingReviewHistory.map((record) => ({
    ...record,
    permissions: {
      canDownload:
        isDetailedDesignStageWritable &&
        (isDetailedDesignDrawingReviewOwner(roleState, user) || isDetailedDesignRdCenterManager(user))
    },
    downloadEndpoint: `/api/projects/${projectRow.id}/detailed-design-workflow/nodes/${DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW}/drawing-review-records/${record.id}/download`
  }));
  drawingReview.permissions = drawingReviewPermissions;
  drawingReview.blockingReasons = [];

  return {
    projectId: projectRow.id,
    stageKey: DETAILED_DESIGN_STAGE.STAGE_KEY,
    stageOrder: DETAILED_DESIGN_STAGE.STAGE_ORDER,
    currentStage: {
      stageId: projectRow.current_stage_id,
      stageOrder: projectRow.current_stage_order,
      stageKey: projectRow.current_stage_key,
      stageName: projectRow.current_stage_name,
      stageStatus: projectRow.current_stage_status
    },
    nodes: detailedDesignNodes,
    roles: roleState,
    professionalGroupMembers: professionalGroupMemberState,
    uploadSlots: detailedDesignUploadSlots,
    reviewForms: detailedDesignReviewForms,
    drawingReview,
    permissions: workflowPermissions,
    isProjectEnded: projectEnded
  };
}

async function buildWorkflowDtoForProject(executor, { projectRow, user }) {
  const [nodesState, rolesRow, professionalGroupMemberRows, reviewForms, drawingReviewFlow, drawingReviewRecords] =
    await Promise.all([
      ensureDetailedDesignWorkflowState(executor, projectRow),
      selectDetailedDesignRoles(executor, projectRow.id),
      selectDetailedDesignProfessionalGroupMembers(executor, projectRow.id),
      selectCurrentDetailedDesignReviewForms(executor, projectRow.id),
      selectCurrentDetailedDesignDrawingReviewFlow(executor, projectRow.id),
      selectCurrentDetailedDesignDrawingReviewRecords(executor, projectRow.id)
    ]);

  const [nodes, uploadSlots] = [nodesState.nodes, nodesState.uploadSlots];
  const usersById = await selectUsersByIds(
    executor,
    collectDetailedDesignUserIds(projectRow, rolesRow, professionalGroupMemberRows)
  );

  return buildWorkflowDto({
    projectRow,
    nodes,
    rolesRow,
    professionalGroupMembers: professionalGroupMemberRows,
    uploadSlots,
    reviewForms,
    drawingReviewFlow,
    drawingReviewRecords,
    usersById,
    user
  });
}

async function selectDetailedDesignWorkbenchProjectRows(executor) {
  const [rows] = await executor.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.status,
      p.updated_at AS project_updated_at,
      p.project_manager,
      p.project_manager_user_id,
      pm.account AS project_manager_account,
      pm.display_name AS project_manager_display_name,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.role AS project_manager_role,
      pm.is_enabled AS project_manager_is_enabled,
      pm.is_platform_admin AS project_manager_is_platform_admin,
      pm.file_platform_user_id AS project_manager_file_platform_user_id,
      p.business_responsible_user_id,
      br.account AS business_responsible_account,
      br.display_name AS business_responsible_display_name,
      br.department AS business_responsible_department,
      br.organization_role AS business_responsible_organization_role,
      br.role AS business_responsible_role,
      br.is_enabled AS business_responsible_is_enabled,
      br.is_platform_admin AS business_responsible_is_platform_admin,
      br.file_platform_user_id AS business_responsible_file_platform_user_id,
      p.technical_responsible_user_id,
      tr.account AS technical_responsible_account,
      tr.display_name AS technical_responsible_display_name,
      tr.department AS technical_responsible_department,
      tr.organization_role AS technical_responsible_organization_role,
      tr.role AS technical_responsible_role,
      tr.is_enabled AS technical_responsible_is_enabled,
      tr.is_platform_admin AS technical_responsible_is_platform_admin,
      tr.file_platform_user_id AS technical_responsible_file_platform_user_id,
      s.id AS current_stage_id,
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    LEFT JOIN users br
      ON br.id = p.business_responsible_user_id
    LEFT JOIN users tr
      ON tr.id = p.technical_responsible_user_id
    INNER JOIN project_stages s
      ON s.project_id = p.id
      AND s.is_current = 1
    WHERE s.stage_key = ?
      AND p.status <> ?
    ORDER BY p.project_code ASC, p.id ASC`,
    [DETAILED_DESIGN_STAGE.STAGE_KEY, PROJECT_STATUS.ENDED]
  );

  return rows;
}

function isMissingDetailedDesignSchemaError(error) {
  return (
    error?.code === 'ER_NO_SUCH_TABLE' &&
    String(error.sqlMessage || error.message || '').includes('project_detailed_design_')
  );
}

export async function selectDetailedDesignWorkbenchTodos(user, db = pool) {
  if (!user?.id) {
    return [];
  }

  try {
    return await withConnection(db, async (connection) => {
      const projectRows = await selectDetailedDesignWorkbenchProjectRows(connection);
      const todos = [];

      for (const projectRow of projectRows) {
        try {
          await assertWorkflowViewable(connection, projectRow.id, user);
        } catch (error) {
          if (error instanceof ProjectAuthorizationError || error?.code === 'FORBIDDEN_OPERATION') {
            continue;
          }
          throw error;
        }

        const workflow = await buildWorkflowDtoForProject(connection, { projectRow, user });
        todos.push(...buildDetailedDesignWorkbenchTodos({ projectRow, workflow }));
      }

      return todos;
    });
  } catch (error) {
    if (isMissingDetailedDesignSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

async function withConnection(db, callback) {
  if (typeof db?.getConnection !== 'function') {
    return callback(db);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assertWorkflowViewable(executor, projectId, user) {
  if (!(await canViewProject(executor, user, projectId))) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access this project',
      ['projectId']
    );
  }
}

export async function getDetailedDesignWorkflow({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user);
    return buildWorkflowDtoForProject(connection, { projectRow, user });
  });
}

function getDetailedDesignReviewFormDefinitionOrThrow(nodeKey) {
  const definition = getDetailedDesignReviewFormDefinition(nodeKey);
  if (!definition) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Invalid detailed design review form node',
      400,
      ['nodeKey']
    );
  }
  return definition;
}

export async function getDetailedDesignReviewForm({ projectId, nodeKey, user }, db = pool) {
  const definition = getDetailedDesignReviewFormDefinitionOrThrow(nodeKey);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user);
    const { nodes } = await ensureDetailedDesignWorkflowState(connection, projectRow);
    const rolesRow = await selectDetailedDesignRoles(connection, projectId);
    const professionalGroupMembers = await selectDetailedDesignProfessionalGroupMembers(connection, projectId);
    const reviewFormRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey);

    return buildDetailedDesignReviewFormDto({
      projectRow,
      nodes,
      rolesRow,
      professionalGroupMembers,
      reviewFormRow,
      nodeKey: definition.nodeKey,
      user
    });
  });
}

async function saveOrSubmitDetailedDesignReviewForm(
  { projectId, nodeKey, payload, user, formStatus },
  db,
  generatedFileStorage = null
) {
  const definition = getDetailedDesignReviewFormDefinitionOrThrow(nodeKey);
  const normalized = normalizeDetailedDesignReviewFormPayload(payload);
  if (formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
    assertRequiredDetailedDesignReviewFormFields(normalized.formData, definition.requiredFieldKeys);
  }
  const storage = resolveDetailedDesignGeneratedFileStorage(db, generatedFileStorage);

  return withConnection(db, async (connection) => {
    const {
      projectRow,
      nodeRow,
      rolesRow,
      roleState
    } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: definition.nodeKey,
      allowedNodeStatuses: DETAILED_DESIGN_REVIEW_FORM_TECHNICAL_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ roleState: state, user: actor }) => isDetailedDesignTechnicalOwner(state, actor),
      actionName: `${definition.documentName} form`
    });

    const currentFormRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey, {
      forUpdate: true
    });
    let savedFormRow = await saveDetailedDesignReviewFormVersion(connection, {
      projectId,
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType,
      nodeRevision: nodeRow.current_revision,
      currentFormRow,
      formStatus,
      formDataJson: normalized.formDataJson,
      actorUserId: user.id
    });

    const metadata = getDetailedDesignReviewFormLogMetadata(definition.nodeKey, formStatus);
    await insertDetailedDesignReviewFormLog(connection, {
      projectId,
      actorUserId: user.id,
      formRow: savedFormRow,
      actionType: metadata.actionType,
      summary: metadata.summary
    });

    let autoSubmit = null;
    if (formStatus === DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
      savedFormRow = await generateAndPersistDetailedDesignReviewFormFile(connection, {
        projectRow,
        definition,
        formRow: savedFormRow,
        actorUserId: user.id,
        storage,
        roleState
      });

      if (savedFormRow.generated_file_status === DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED) {
        await submitDetailedDesignReviewNodeForApproval(connection, {
          projectId,
          nodeKey: definition.nodeKey,
          revision: Number(savedFormRow.revision || 1)
        });
        autoSubmit = {
          attempted: true,
          submitted: true,
          nodeKey: definition.nodeKey,
          nodeStatus: DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
          message: 'Detailed design review form generated and node entered review'
        };
      } else {
        autoSubmit = {
          attempted: false,
          submitted: false,
          nodeKey: definition.nodeKey,
          nodeStatus: nodeRow.status,
          message: 'Detailed design review generated file failed; node was not submitted automatically'
        };
      }
    }

    const refreshedNodes = await selectDetailedDesignNodes(connection, projectId);
    const professionalGroupMembers = await selectDetailedDesignProfessionalGroupMembers(connection, projectId);
    return buildDetailedDesignReviewFormDto({
      projectRow,
      nodes: refreshedNodes,
      rolesRow,
      professionalGroupMembers,
      reviewFormRow: savedFormRow,
      nodeKey: definition.nodeKey,
      user,
      autoSubmit
    });
  });
}

export async function saveDetailedDesignReviewForm({ projectId, nodeKey, payload, user }, db = pool) {
  return saveOrSubmitDetailedDesignReviewForm(
    {
      projectId,
      nodeKey,
      payload,
      user,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT
    },
    db
  );
}

export async function submitDetailedDesignReviewForm(
  { projectId, nodeKey, payload, user },
  db = pool,
  generatedFileStorage = null
) {
  return saveOrSubmitDetailedDesignReviewForm(
    {
      projectId,
      nodeKey,
      payload,
      user,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED
    },
    db,
    generatedFileStorage
  );
}

export async function getDetailedDesignReviewGeneratedFileDownload(
  { projectId, nodeKey, user },
  db = pool,
  generatedFileStorage = null
) {
  const definition = getDetailedDesignReviewFormDefinitionOrThrow(nodeKey);
  const storage = resolveDetailedDesignGeneratedFileStorage(db, generatedFileStorage);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user);
    const { nodes } = await ensureDetailedDesignWorkflowState(connection, projectRow);
    const rolesRow = await selectDetailedDesignRoles(connection, projectId);
    const professionalGroupMembers = await selectDetailedDesignProfessionalGroupMembers(connection, projectId);
    const usersById = await selectUsersByIds(
      connection,
      collectDetailedDesignUserIds(projectRow, rolesRow, professionalGroupMembers)
    );
    const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });
    const nodeRow = buildDetailedDesignWorkflowNodeMap(nodes).get(definition.nodeKey) || null;
    const formRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey);
    const permissions = buildDetailedDesignReviewFormPermissions({
      reviewFormRow: formRow,
      nodeStatus: nodeRow?.status,
      nodeRevision: nodeRow?.current_revision ?? 1,
      roleState,
      user,
      projectEnded: isDetailedDesignProjectEnded(projectRow),
      isDetailedDesignStageWritable: !isDetailedDesignProjectEnded(projectRow) && isProjectInDetailedDesignStage(projectRow),
      isDetailedDesignStageVisible: hasReachedDetailedDesignStage(projectRow)
    });

    if (!permissions.canDownloadGeneratedFile) {
      throwDetailedDesignForbidden('Current user cannot download this detailed design generated file', ['nodeKey']);
    }

    assertDetailedDesignGeneratedFormFileReady({
      formRow,
      nodeRow,
      detailKey: getDetailedDesignReviewGeneratedFileDownloadErrorDetails(definition.nodeKey)
    });
    return buildDetailedDesignReviewFormDownload({
      formRow,
      storage,
      detailKey: getDetailedDesignReviewGeneratedFileDownloadErrorDetails(definition.nodeKey)
    });
  });
}

export async function assignDetailedDesignRoles({ projectId, payload, user }, db = pool) {
  const normalizedPayload = normalizeDetailedDesignRoleAssignmentPayload(payload);

  return withConnection(db, async (connection) => {
    await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
      roleCheck: ({ user: actor }) => canAssignDetailedDesignRoles(actor),
      actionName: 'detailed design role assignment'
    });

    await selectAssignableDetailedDesignUsers(connection, normalizedPayload);
    await upsertDetailedDesignRoles(connection, {
      projectId,
      normalizedPayload,
      userId: user.id
    });
    await replaceProfessionalGroupMembers(connection, {
      projectId,
      memberUserIds: normalizedPayload.professionalGroupMemberUserIds,
      userId: user.id
    });
    await insertDetailedDesignRolesAssignedLog(connection, {
      projectId,
      normalizedPayload,
      actorUserId: user.id
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function getDetailedDesignUploadDownload(
  { projectId, slotKey, user },
  db = pool,
  storage = defaultDetailedDesignUploadStorage
) {
  const slot = getDetailedDesignUploadSlotDefinition(slotKey);
  if (!slot) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Invalid detailed design upload slot',
      400,
      ['slotKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user);
    const { nodes, uploadSlots } = await ensureDetailedDesignWorkflowState(connection, projectRow);
    const rolesRow = await selectDetailedDesignRoles(connection, projectId);
    const professionalGroupMemberRows = await selectDetailedDesignProfessionalGroupMembers(connection, projectId);
    const usersById = await selectUsersByIds(
      connection,
      collectDetailedDesignUserIds(projectRow, rolesRow, professionalGroupMemberRows)
    );
    const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });
    const slotRowsByKey = buildDetailedDesignUploadSlotMap(uploadSlots);
    const slotRow = slotRowsByKey.get(slot.slotKey);
    const nodeRowsByKey = buildDetailedDesignWorkflowNodeMap(nodes);
    const permissions = buildDetailedDesignUploadSlotPermissions({
      slotRow: slotRow || {},
      slotDefinition: slot,
      nodeStatus: nodeRowsByKey.get(slot.nodeKey)?.status,
      drawingReviewNodeStatus: nodeRowsByKey.get(DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW)?.status,
      projectEnded: isDetailedDesignProjectEnded(projectRow),
      isDetailedDesignStageWritable: !isDetailedDesignProjectEnded(projectRow) && isProjectInDetailedDesignStage(projectRow),
      isDetailedDesignStageVisible: hasReachedDetailedDesignStage(projectRow),
      roleState,
      user
    });

    if (!permissions.canDownload) {
      throwDetailedDesignForbidden('Current user cannot download this detailed design workflow file', ['slotKey']);
    }

    const fileRow = await selectCurrentDetailedDesignUploadFileForDownload(connection, projectId, slot.slotKey);
    if (!fileRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Detailed design upload file not found',
        404,
        [slot.slotKey]
      );
    }

    let filePath;
    try {
      filePath = await storage.assertFileReadable(fileRow.storage_key);
    } catch {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Detailed design upload file is missing from local storage',
        404,
        [slot.slotKey]
      );
    }

    return {
      filePath,
      originalFileName: fileRow.original_file_name,
      mimeType: fileRow.mime_type || DEFAULT_UPLOAD_MIME_TYPE,
      fileSize: Number(fileRow.file_size),
      slotKey: slot.slotKey,
      nodeKey: slot.nodeKey,
      revision: Number(fileRow.revision ?? 1)
    };
  });
}

function assertDrawingReviewInputsReady({ nodeRow, uploadSlotsByKey }) {
  const requiredRevision = Number(nodeRow?.current_revision ?? 1);
  const productPlanSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING) || null;
  const partsListSlot = uploadSlotsByKey.get(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST) || null;
  const missing = [];

  if (!productPlanSlot?.current_file_id) {
    missing.push(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING);
  }
  if (!partsListSlot?.current_file_id) {
    missing.push(DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST);
  }

  if (missing.length > 0) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Current product plan drawing and parts list are required before drawing review',
      409,
      missing
    );
  }

  return {
    requiredRevision,
    productPlanRevision: Number(productPlanSlot.current_file_revision || 1),
    partsListRevision: Number(partsListSlot.current_file_revision || 1)
  };
}

async function loadDrawingReviewInputsForUpdate(executor, projectId, nodeRow) {
  const slots = await selectDetailedDesignUploadSlots(executor, projectId);
  return assertDrawingReviewInputsReady({
    nodeRow,
    uploadSlotsByKey: buildDetailedDesignUploadSlotMap(slots)
  });
}

async function resetDrawingReviewToProductPlanDrawing(executor, {
  projectId,
  nodeRow,
  returnReason,
  actorUserId,
  checkerStatus,
  rdApprovalStatus
}) {
  const nextRevision = Number(nodeRow?.current_revision ?? 1) + 1;
  const affectedNodeKeys = [
    DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
  ];

  await resetDetailedDesignNodeForRework(executor, {
    projectId,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    status: DETAILED_DESIGN_NODE_STATUS.RETURNED,
    revision: nextRevision,
    returnReason
  });
  await resetDetailedDesignNodeForRework(executor, {
    projectId,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    status: DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
    revision: nextRevision
  });
  await resetDetailedDesignNodeForRework(executor, {
    projectId,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    status: DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
    revision: nextRevision
  });
  await resetDetailedDesignNodeForRework(executor, {
    projectId,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    status: DETAILED_DESIGN_NODE_STATUS.NOT_STARTED,
    revision: nextRevision
  });

  await executor.execute(
    `UPDATE project_detailed_design_upload_slots
    SET status = ?,
      return_reason = ?,
      returned_by_user_id = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key IN (?, ?)`,
    [
      DETAILED_DESIGN_UPLOAD_SLOT_STATUS.RETURNED,
      returnReason,
      actorUserId,
      projectId,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );

  await updateDetailedDesignDrawingReviewFlow(executor, {
    projectId,
    currentRevision: nextRevision,
    productPlanDrawingRevision: nextRevision,
    partsListRevision: nextRevision,
    checkerStatus,
    rdApprovalStatus,
    returnReason,
    actorUserId
  });

  return {
    returnToNodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    affectedNodeKeys,
    resubmitScope: 'drawing_inputs',
    nextRevision
  };
}

async function insertDetailedDesignDrawingReviewLog(executor, {
  projectId,
  actorUserId,
  actionType,
  summary,
  details = {}
}) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.DETAILED_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      ...details,
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

export async function uploadDetailedDesignDrawingReviewRecord(
  { projectId, file, user },
  db = pool,
  storage = defaultDetailedDesignUploadStorage
) {
  const uploadFile = normalizeUploadFile(file);
  const storageKey = storage.createStorageKey({
    projectId,
    slotKey: DETAILED_DESIGN_DRAWING_REVIEW_RECORD_STORAGE_SLOT_KEY
  });
  let fileWritten = false;
  let committed = false;

  const connection = typeof db?.getConnection === 'function' ? await db.getConnection() : db;
  const ownsConnection = typeof db?.getConnection === 'function';
  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

    const { nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      allowedNodeStatuses: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ roleState, user: actor }) => isDetailedDesignDrawingReviewOwner(roleState, actor),
      actionName: 'drawing review record upload'
    });
    const drawingInputRevisions = await loadDrawingReviewInputsForUpdate(connection, projectId, nodeRow);

    const stored = await storage.writeFile(storageKey, uploadFile.buffer);
    fileWritten = true;
    if (stored.size !== uploadFile.size) {
      throwInvalidUploadFile();
    }

    const recordRow = await insertDetailedDesignDrawingReviewRecord(connection, {
      projectId,
      nodeRow,
      recordFile: uploadFile,
      storageKey,
      userId: user.id
    });
    await insertDetailedDesignDrawingReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_DRAWING_REVIEW_RECORD_UPLOADED,
      summary: '上传图纸审查记录',
      details: {
        documentCode: DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT.documentCode,
        documentName: DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT.documentName,
        recordId: recordRow.id,
        revision: recordRow.revision,
        drawingRevision: recordRow.drawing_revision,
        productPlanDrawingRevision: drawingInputRevisions.productPlanRevision,
        partsListRevision: drawingInputRevisions.partsListRevision,
        fileName: recordRow.original_file_name,
        fileSize: recordRow.file_size
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    const workflow = await buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });

    if (ownsConnection) {
      await connection.commit();
    }
    committed = true;

    return workflow;
  } catch (error) {
    if (!committed && ownsConnection) {
      await connection.rollback();
    }
    if (fileWritten) {
      await storage.cleanupFile(storageKey);
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

export async function getDetailedDesignDrawingReviewRecordDownload(
  { projectId, recordId, user },
  db = pool,
  storage = defaultDetailedDesignUploadStorage
) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user);
    const { nodes } = await ensureDetailedDesignWorkflowState(connection, projectRow);
    const recordRow = await selectDetailedDesignDrawingReviewRecordById(connection, projectId, recordId);
    if (!recordRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.DRAWING_REVIEW_RECORD_NOT_FOUND,
        'Detailed design drawing review record not found',
        404,
        ['recordId']
      );
    }

    const rolesRow = await selectDetailedDesignRoles(connection, projectId);
    const professionalGroupMemberRows = await selectDetailedDesignProfessionalGroupMembers(connection, projectId);
    const usersById = await selectUsersByIds(
      connection,
      collectDetailedDesignUserIds(projectRow, rolesRow, professionalGroupMemberRows)
    );
    const roleState = buildDetailedDesignRoleState({ projectRow, rolesRow, usersById });
    const nodeRowsByKey = buildDetailedDesignWorkflowNodeMap(nodes);
    const permissions = buildDetailedDesignDrawingReviewPermissions({
      drawingReviewRow: { recordHistory: [recordRow] },
      nodeStatus: nodeRowsByKey.get(DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW)?.status,
      roleState,
      user,
      projectEnded: isDetailedDesignProjectEnded(projectRow),
      isDetailedDesignStageWritable: !isDetailedDesignProjectEnded(projectRow) && isProjectInDetailedDesignStage(projectRow),
      isDetailedDesignStageVisible: hasReachedDetailedDesignStage(projectRow)
    });
    if (!permissions.canDownloadRecordHistory) {
      throwDetailedDesignForbidden('Current user cannot download this detailed design drawing review record', ['recordId']);
    }

    let filePath;
    try {
      filePath = await storage.assertFileReadable(recordRow.storage_key);
    } catch {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.DRAWING_REVIEW_RECORD_NOT_FOUND,
        'Detailed design drawing review record file is missing from local storage',
        404,
        ['recordId']
      );
    }

    return {
      filePath,
      originalFileName: recordRow.original_file_name,
      mimeType: recordRow.mime_type || DEFAULT_UPLOAD_MIME_TYPE,
      fileSize: Number(recordRow.file_size),
      recordId: recordRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      revision: Number(recordRow.revision || 1)
    };
  });
}

export async function passDetailedDesignDrawingReview({ projectId, payload = {}, user }, db = pool) {
  const comment = normalizeReviewComment(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      allowedNodeStatuses: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ roleState, user: actor }) => isDetailedDesignDrawingReviewOwner(roleState, actor),
      actionName: 'drawing review pass'
    });
    const drawingInputRevisions = await loadDrawingReviewInputsForUpdate(connection, projectId, nodeRow);
    await updateDetailedDesignDrawingReviewFlow(connection, {
      projectId,
      currentRevision: drawingInputRevisions.requiredRevision,
      productPlanDrawingRevision: drawingInputRevisions.productPlanRevision,
      partsListRevision: drawingInputRevisions.partsListRevision,
      checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED,
      rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING,
      checkerUserId: user.id,
      checkerAt: new Date(),
      checkerComment: comment,
      actorUserId: user.id
    });
    await setDetailedDesignDrawingReviewNodeWaitingForRdApproval(connection, {
      projectId,
      revision: drawingInputRevisions.requiredRevision
    });
    await insertDetailedDesignDrawingReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_DRAWING_REVIEW_PASSED,
      summary: '图纸审查无问题通过',
      details: {
        checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED,
        rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING,
        comment,
        ...drawingInputRevisions
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function returnDetailedDesignDrawingReview({ projectId, payload = {}, user }, db = pool) {
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      allowedNodeStatuses: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ roleState, user: actor }) => isDetailedDesignDrawingReviewOwner(roleState, actor),
      actionName: 'drawing review return'
    });
    const drawingInputRevisions = await loadDrawingReviewInputsForUpdate(connection, projectId, nodeRow);
    const recordRow = await selectCurrentDetailedDesignDrawingReviewRecordForCycle(
      connection,
      projectId,
      drawingInputRevisions.requiredRevision
    );
    if (!recordRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.DRAWING_REVIEW_RECORD_REQUIRED,
        'Drawing review record must be uploaded before return',
        409,
        [DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT.documentCode]
      );
    }

    await setDetailedDesignDrawingReviewRecordReturnReason(connection, {
      projectId,
      recordId: recordRow.id,
      returnReason
    });
    const rework = await resetDrawingReviewToProductPlanDrawing(connection, {
      projectId,
      nodeRow,
      returnReason,
      actorUserId: user.id,
      checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.RETURNED,
      rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING
    });
    await insertDetailedDesignDrawingReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_DRAWING_REVIEW_RETURNED,
      summary: '图纸审查退回产品平面图',
      details: {
        returnReason,
        recordId: recordRow.id,
        checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.RETURNED,
        ...drawingInputRevisions,
        ...rework
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function approveDetailedDesignDrawingReview({ projectId, payload = {}, user }, db = pool) {
  const comment = normalizeReviewComment(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      allowedNodeStatuses: DETAILED_DESIGN_DRAWING_REVIEW_RD_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ user: actor }) => isDetailedDesignRdCenterManager(actor),
      actionName: 'drawing review RD approval'
    });
    const drawingInputRevisions = await loadDrawingReviewInputsForUpdate(connection, projectId, nodeRow);
    await updateDetailedDesignDrawingReviewFlow(connection, {
      projectId,
      currentRevision: drawingInputRevisions.requiredRevision,
      productPlanDrawingRevision: drawingInputRevisions.productPlanRevision,
      partsListRevision: drawingInputRevisions.partsListRevision,
      checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED,
      rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.APPROVED,
      rdApproverUserId: user.id,
      rdApprovedAt: new Date(),
      rdComment: comment,
      actorUserId: user.id
    });
    await completeNodeAndActivateNext(connection, {
      projectId,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      nextNodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN
    });
    await insertDetailedDesignDrawingReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVED,
      summary: '研发中心负责人图纸审查审批通过',
      details: {
        approvalResult: 'approved',
        approvalComment: comment,
        rdApproverUserId: user.id,
        ...drawingInputRevisions
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function returnDetailedDesignDrawingReviewApproval({ projectId, payload = {}, user }, db = pool) {
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      allowedNodeStatuses: DETAILED_DESIGN_DRAWING_REVIEW_RD_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ user: actor }) => isDetailedDesignRdCenterManager(actor),
      actionName: 'drawing review RD return'
    });
    const drawingInputRevisions = await loadDrawingReviewInputsForUpdate(connection, projectId, nodeRow);
    const rework = await resetDrawingReviewToProductPlanDrawing(connection, {
      projectId,
      nodeRow,
      returnReason,
      actorUserId: user.id,
      checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED,
      rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.RETURNED
    });
    await insertDetailedDesignDrawingReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_DRAWING_REVIEW_RD_RETURNED,
      summary: '研发中心负责人图纸审查审批退回',
      details: {
        approvalResult: 'returned',
        returnReason,
        rdApproverUserId: user.id,
        ...drawingInputRevisions,
        ...rework
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function uploadDetailedDesignWorkflowFile(
  { projectId, slotKey, file, user },
  db = pool,
  storage = defaultDetailedDesignUploadStorage
) {
  const slot = getDetailedDesignUploadSlotDefinition(slotKey);
  if (!slot) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Invalid detailed design upload slot',
      400,
      ['slotKey']
    );
  }

  if (!DETAILED_DESIGN_FIRST_BATCH_UPLOAD_SLOT_KEYS.has(slot.slotKey)) {
    throw new DetailedDesignWorkflowError(
      DETAILED_DESIGN_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'This detailed design upload slot is not implemented in the current batch',
      409,
      [slot.slotKey]
    );
  }

  const uploadFile = normalizeUploadFile(file);
  const storageKey = storage.createStorageKey({ projectId, slotKey: slot.slotKey });
  let fileWritten = false;
  let committed = false;

  const connection = typeof db?.getConnection === 'function' ? await db.getConnection() : db;
  const ownsConnection = typeof db?.getConnection === 'function';
  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

    await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: slot.nodeKey,
      roleCheck: ({ roleState, user: actor }) => {
        if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK) {
          return isDetailedDesignManufacturingCenterManager(actor);
        }
        if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN) {
          return isDetailedDesignProjectManager(roleState, actor);
        }
        if (slot.slotKey === DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN) {
          return isDetailedDesignBusinessOwner(roleState, actor);
        }
        return isDetailedDesignTechnicalOwner(roleState, actor);
      },
      actionName: `${slot.slotName} upload`
    });

    const slotRow = await selectDetailedDesignUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Detailed design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }

    const stored = await storage.writeFile(storageKey, uploadFile.buffer);
    fileWritten = true;
    if (stored.size !== uploadFile.size) {
      throwInvalidUploadFile();
    }

    const fileRow = await replaceCurrentDetailedDesignSlotFile(connection, {
      projectId,
      slotRow,
      slot,
      uploadFile,
      storageKey,
      userId: user.id
    });
    await insertDetailedDesignUploadLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      fileRow
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    const workflow = await buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });

    if (ownsConnection) {
      await connection.commit();
    }
    committed = true;

    return workflow;
  } catch (error) {
    if (!committed && ownsConnection) {
      await connection.rollback();
    }

    if (fileWritten) {
      await storage.cleanupFile(storageKey);
    }

    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

export async function markDetailedDesignUploadNoUpload({ projectId, slotKey, user }, db = pool) {
  const slot = getDetailedDesignUploadSlotDefinition(slotKey);
  assertDetailedDesignNoUploadSlot(slot);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
      roleCheck: ({ roleState, user: actor }) => isDetailedDesignTechnicalOwner(roleState, actor),
      actionName: 'detailed design no-upload mark'
    });

    const slotRow = await selectDetailedDesignUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Detailed design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }

    const currentFiles = await selectCurrentDetailedDesignUploadFiles(connection, projectId, [slot.slotKey]);
    if (currentFiles.length > 0) {
      throwDetailedDesignNodeBlocked(
        'Detailed design file already has a current file and cannot be marked no-upload',
        [slot.slotKey]
      );
    }

    const revision = Number(nodeRow.current_revision || 1);
    await markDetailedDesignUploadSlotExempted(connection, {
      projectId,
      slot,
      revision,
      actorUserId: user.id
    });
    await insertDetailedDesignUploadExemptionLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      revision,
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_FILE_UPLOAD_EXEMPTED,
      summary: `标记详细设计资料无需上传：${slot.slotName}`
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function cancelDetailedDesignUploadNoUpload({ projectId, slotKey, user }, db = pool) {
  const slot = getDetailedDesignUploadSlotDefinition(slotKey);
  assertDetailedDesignNoUploadSlot(slot);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
      roleCheck: ({ roleState, user: actor }) => isDetailedDesignTechnicalOwner(roleState, actor),
      actionName: 'detailed design no-upload cancellation'
    });

    const slotRow = await selectDetailedDesignUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new DetailedDesignWorkflowError(
        DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Detailed design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }

    await cancelDetailedDesignUploadSlotExemption(connection, { projectId, slot });
    await insertDetailedDesignUploadExemptionLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      revision: Number(nodeRow.current_revision || 1),
      actionType: OPERATION_ACTION_TYPE.DETAILED_DESIGN_FILE_UPLOAD_EXEMPTION_CANCELLED,
      summary: `取消详细设计资料无需上传：${slot.slotName}`
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function submitDetailedDesignWorkflowNode({ projectId, nodeKey, user }, db = pool) {
  const node = getDetailedDesignSubmitNodeDefinitionOrThrow(nodeKey);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow, rolesRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: node.nodeKey,
      roleCheck: ({ roleState, user: actor }) =>
        canSubmitDetailedDesignUploadNode({ nodeKey: node.nodeKey, roleState, user: actor }),
      actionName: `${node.nodeName} submit`
    });

    const readiness = await assertDetailedDesignUploadNodeSubmitReady(connection, {
      projectId,
      nodeRow,
      rolesRow
    });
    const nextNodeKey = DETAILED_DESIGN_UPLOAD_SUBMIT_NEXT_NODE_KEY[node.nodeKey] ?? null;

    if (node.nodeKey === DETAILED_DESIGN_NODE_KEY.PARTS_LIST) {
      await initializeDetailedDesignDrawingReviewFlowForSubmit(connection, {
        projectId,
        currentRevision: readiness.revision,
        productPlanSlot: readiness.productPlanSlot,
        partsListSlot: readiness.partsListSlot,
        actorUserId: user.id
      });
    }

    await completeNodeAndActivateNext(connection, {
      projectId,
      nodeKey: node.nodeKey,
      nextNodeKey
    });
    await insertDetailedDesignNodeSubmitLog(connection, {
      projectId,
      actorUserId: user.id,
      nodeKey: node.nodeKey,
      revision: readiness.revision,
      nextNodeKey
    });

    if (node.nodeKey === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN) {
      await tryAutoAdvanceProjectStage({
        projectId,
        user,
        triggerAction: OPERATION_ACTION_TYPE.DETAILED_DESIGN_NODE_SUBMITTED,
        triggerMetadata: {
          nodeKey: node.nodeKey,
          revision: readiness.revision,
          submittedByUserId: user.id
        }
      }, connection);
    }

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function approveDetailedDesignWorkflowNode({ projectId, nodeKey, payload = {}, user }, db = pool) {
  const definition = getDetailedDesignReviewFormDefinitionOrThrow(nodeKey);
  const approvalComment = normalizeReviewComment(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: definition.nodeKey,
      allowedNodeStatuses: DETAILED_DESIGN_REVIEW_FORM_RD_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ user: actor }) => isDetailedDesignRdCenterManager(actor),
      actionName: `${definition.documentName} approval`
    });
    const formRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey, {
      forUpdate: true
    });
    assertDetailedDesignGeneratedFormFileReady({
      formRow,
      nodeRow,
      detailKey: getDetailedDesignReviewGeneratedFileDownloadErrorDetails(definition.nodeKey)
    });

    await markDetailedDesignReviewFormReviewed(connection, {
      formId: formRow.id,
      approved: true,
      actorUserId: user.id,
      comment: approvalComment
    });
    await approveDetailedDesignReviewNodeAndActivateNext(connection, {
      projectId,
      nodeKey: definition.nodeKey,
      nextNodeKey: definition.nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW
        ? DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW
        : DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING
    });

    const refreshedFormRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey);
    const metadata = getDetailedDesignReviewApprovalLogMetadata(definition.nodeKey, true);
    await insertDetailedDesignReviewFormLog(connection, {
      projectId,
      actorUserId: user.id,
      formRow: refreshedFormRow || formRow,
      actionType: metadata.actionType,
      summary: metadata.summary,
      details: {
        approvalResult: 'approved',
        approvalComment,
        reviewerUserId: user.id
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export async function returnDetailedDesignWorkflowNode({ projectId, nodeKey, payload = {}, user }, db = pool) {
  const definition = getDetailedDesignReviewFormDefinitionOrThrow(nodeKey);
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const { projectRow, nodeRow } = await assertDetailedDesignWriteGuard(connection, {
      projectId,
      user,
      nodeKey: definition.nodeKey,
      allowedNodeStatuses: DETAILED_DESIGN_REVIEW_FORM_RD_ACTIONABLE_NODE_STATUSES,
      roleCheck: ({ user: actor }) => isDetailedDesignRdCenterManager(actor),
      actionName: `${definition.documentName} return`
    });
    const formRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey, {
      forUpdate: true
    });
    assertDetailedDesignGeneratedFormFileReady({
      formRow,
      nodeRow,
      detailKey: getDetailedDesignReviewGeneratedFileDownloadErrorDetails(definition.nodeKey)
    });

    await markDetailedDesignReviewFormReviewed(connection, {
      formId: formRow.id,
      approved: false,
      actorUserId: user.id,
      returnReason
    });
    const rework = await returnDesignReviewToDetailedDesign(connection, {
      projectId,
      nodeKey: definition.nodeKey,
      returnReason,
      actorUserId: user.id
    });

    const refreshedFormRow = await selectCurrentDetailedDesignReviewForm(connection, projectId, definition.nodeKey);
    const metadata = getDetailedDesignReviewApprovalLogMetadata(definition.nodeKey, false);
    await insertDetailedDesignReviewFormLog(connection, {
      projectId,
      actorUserId: user.id,
      formRow: refreshedFormRow || formRow,
      actionType: metadata.actionType,
      summary: metadata.summary,
      details: {
        approvalResult: 'returned',
        returnReason,
        reviewerUserId: user.id,
        returnToNodeKey: rework.returnToNodeKey,
        affectedNodeKeys: rework.affectedNodeKeys,
        resubmitScope: rework.resubmitScope,
        nextRevision: rework.nextRevision
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow || projectRow, user });
  });
}

export {
  DETAILED_DESIGN_COMPATIBILITY_DOCUMENT_CODES,
  DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS,
  DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS,
  DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT,
  DETAILED_DESIGN_ERROR,
  DETAILED_DESIGN_NODE_KEY,
  DETAILED_DESIGN_NODE_STATUS,
  DETAILED_DESIGN_NODES,
  DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS,
  DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS,
  DETAILED_DESIGN_REVIEW_FORM_STATUS,
  DETAILED_DESIGN_REVIEW_TYPE,
  DETAILED_DESIGN_ROLE_DEFINITIONS,
  DETAILED_DESIGN_ROLE_KEY,
  DETAILED_DESIGN_STAGE,
  DETAILED_DESIGN_UPLOAD_SLOTS,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY,
  DETAILED_DESIGN_UPLOAD_SLOT_STATUS,
  DETAILED_DESIGN_MAIN_FILE_UPLOAD_SLOT_KEYS,
  DetailedDesignWorkflowError
};
