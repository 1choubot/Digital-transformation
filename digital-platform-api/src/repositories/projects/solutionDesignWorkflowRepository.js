import { pool } from '../../db/pool.js';
import {
  SOLUTION_DESIGN_ANALYSIS_FORM_DOCUMENT_CODES,
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION,
  SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION,
  SOLUTION_DESIGN_QUOTATION_FORM_STATUS,
  SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION,
  SOLUTION_DESIGN_QUOTATION_RESULT,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE,
  SOLUTION_DESIGN_REVIEW_FORM_STATUS,
  SOLUTION_DESIGN_ROLE_DEFINITIONS,
  SOLUTION_DESIGN_ROLE_KEY,
  SOLUTION_DESIGN_STORED_ROLE_DEFINITIONS,
  SOLUTION_DESIGN_STAGE,
  SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY,
  SOLUTION_DESIGN_UPLOAD_SLOT_STATUS,
  SOLUTION_DESIGN_UPLOAD_SLOTS,
  SolutionDesignWorkflowError,
  assertAssignableRoleUser,
  buildInitialSolutionDesignNodes,
  canAssignSolutionDesignRoles,
  getSolutionDesignNodeDefinition,
  getSolutionDesignReviewFormDefinition,
  getSolutionDesignUploadSlotDefinition,
  isProjectInSolutionDesignStage,
  isSolutionDesignGeneralManager,
  isSolutionDesignOutputUploadSlot,
  isSolutionDesignProjectEnded,
  normalizeSolutionDesignRoleAssignmentPayload
} from '../../domain/solutionDesignWorkflow.js';
import {
  SOLUTION_DESIGN_UPLOAD_MAX_FILE_SIZE,
  assertSolutionDesignUploadFileReadable,
  cleanupSolutionDesignUploadFile,
  createSolutionDesignUploadStorageKey,
  writeSolutionDesignUploadFile
} from '../../storage/solutionDesignUploadStorage.js';
import {
  assertStageDocumentGeneratedFileReadable,
  cleanupStageDocumentGeneratedFile,
  createStageDocumentGeneratedFileStorageKey,
  writeStageDocumentGeneratedFile
} from '../../storage/stageDocumentGeneratedFileStorage.js';
import {
  listStageDocumentOnlineFormImagesForDocument,
  readOnlineFormImageForGeneration
} from '../stageDocuments/onlineFormImageRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { canViewProject } from './visibility.js';
import { ProjectAuthorizationError } from './shared.js';
import { tryAutoAdvanceProjectStage } from './stageAdvanceRepository.js';
import { materializeSolutionDesignWorkflow } from './solutionDesignWorkflowMaterialization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import {
  GENERATED_DOCX_MIME_TYPE,
  GENERATED_XLSX_MIME_TYPE,
  SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE,
  generateSolutionDesignFormFile
} from './solutionDesignWorkflow/generatedFiles.js';
import {
  assertReviewImplementationPlanItemsComplete,
  assertRequiredSolutionFormFields,
  normalizeAnalysisFormPayload,
  normalizeReviewFormPayload
} from './solutionDesignWorkflow/formPayloads.js';
import {
  buildQuotationFormDto,
  generateSolutionDesignQuotationFormFile,
  mapQuotationForm,
  normalizeQuotationFormPayload
} from './solutionDesignWorkflow/quotationForms.js';
import {
  buildAnalysisFormDto,
  buildReviewFormDto,
  isGeneratedFormDtoCurrent,
  mapAnalysisForm,
  mapGeneratedFileStatus,
  mapReviewForm
} from './solutionDesignWorkflow/formDtos.js';
import {
  assertQuotationTenderSlotProcessable,
  canActAsReviewerForSolutionDesignNode,
  canDownloadUploadFile,
  canProcessAnalysisForm,
  canProcessQuotationForm,
  canProcessQuotationResult,
  canProcessReviewForm,
  canReviewSolutionDesignNode,
  canSelectQuotationTenderBranch,
  canSubmitNode,
  canSubmitQuotation,
  canSubmitTender,
  buildUploadSlotPermissions,
  canViewFinanceCostUploadFile,
  areSolutionDesignOutputsSatisfied,
  getCostUploadSlotKeyForNode,
  isSolutionDesignOutputSatisfied,
  isAnalysisFormGeneratedForRevision,
  isAnalysisFormSubmittedForRevision,
  isCostUploadSlotCurrent,
  isCostEstimationNode,
  isFinanceCostUploadSlot,
  isNodeProcessableStatus,
  isProductFunctionDiagramCurrent,
  isQuotationBranchCurrent,
  isQuotationFormGeneratedForRevision,
  isQuotationFormSubmittedForRevision,
  isQuotationTenderFlowCurrentForNode,
  isQuotationTenderUploadSlot,
  isReviewFormGeneratedForRevision,
  isReviewFormSubmittedForRevision,
  isTenderBranchCurrent
} from './solutionDesignWorkflow/permissions.js';
import {
  selectCurrentAnalysisForm,
  selectCurrentQuotationForm,
  selectCurrentReviewForm,
  selectCurrentReviewForms,
  selectProjectContext,
  selectProjectStageDocumentByAnyCode,
  selectProjectStageDocumentByCode,
  selectQuotationTenderFlow,
  selectSolutionDesignNodes,
  selectSolutionDesignRoles,
  selectSolutionDesignRolesForUpdate,
  selectSolutionDesignUploadSlots
} from './solutionDesignWorkflow/queries.js';

const DEFAULT_UPLOAD_MIME_TYPE = 'application/octet-stream';
const MAX_UPLOAD_TEXT_FIELD_LENGTH = 255;
const MAX_UPLOAD_EXEMPTION_REASON_LENGTH = 1000;

const defaultSolutionDesignUploadStorage = {
  createStorageKey: createSolutionDesignUploadStorageKey,
  writeFile: writeSolutionDesignUploadFile,
  assertFileReadable: assertSolutionDesignUploadFileReadable,
  cleanupFile: cleanupSolutionDesignUploadFile
};

const defaultSolutionDesignGeneratedFileStorage = {
  createStorageKey: ({ projectId, documentCode, revision, fileType = SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE }) =>
    createStageDocumentGeneratedFileStorageKey({
      projectId,
      documentId: `solution-design-${documentCode}`,
      version: revision,
      fileType
    }),
  writeFile: writeStageDocumentGeneratedFile,
  assertFileReadable: assertStageDocumentGeneratedFileReadable,
  cleanupFile: cleanupStageDocumentGeneratedFile
};

function resolveGeneratedFileStorage(db, storage) {
  return storage || db?.generatedFileStorage || defaultSolutionDesignGeneratedFileStorage;
}

function resolveOnlineFormImageReader(db) {
  if (db?.onlineFormImageStorage?.readFile) {
    return (image) => db.onlineFormImageStorage.readFile(image.storageKey, image);
  }
  return readOnlineFormImageForGeneration;
}

const PROCESSABLE_NODE_STATUSES = new Set([
  SOLUTION_DESIGN_NODE_STATUS.PENDING,
  SOLUTION_DESIGN_NODE_STATUS.RETURNED
]);

export const SOLUTION_DESIGN_WORKBENCH_TODO_TYPE = 'solution_design_workflow';

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

function mapProjectManagerUser(row) {
  if (!row?.project_manager_user_id) {
    return null;
  }

  return {
    id: row.project_manager_user_id,
    account: row.project_manager_account,
    name: row.project_manager_display_name,
    department: row.project_manager_department,
    organizationRole: row.project_manager_organization_role,
    role: row.project_manager_role,
    isEnabled: row.project_manager_is_enabled === null ? null : Boolean(row.project_manager_is_enabled),
    isPlatformAdmin:
      row.project_manager_is_platform_admin === null ? null : Boolean(row.project_manager_is_platform_admin),
    filePlatformUserId: row.project_manager_file_platform_user_id
  };
}

function normalizeComparableId(value) {
  return value === null || value === undefined ? null : Number(value);
}

function isSameId(left, right) {
  const normalizedLeft = normalizeComparableId(left);
  const normalizedRight = normalizeComparableId(right);
  return normalizedLeft === normalizedRight;
}

function sanitizeOriginalFileName(filename) {
  return String(filename || '').replace(/\\/g, '/').split('/').pop().trim();
}

function normalizeUploadMimeType(mimeType) {
  const normalized = String(mimeType || '').trim();
  return normalized || DEFAULT_UPLOAD_MIME_TYPE;
}

function throwInvalidUploadFile() {
  throw new SolutionDesignWorkflowError(
    SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_FILE,
    'Invalid solution design upload file',
    400,
    ['file']
  );
}

function normalizeUploadFile(file) {
  if (!file || file.tooLarge || !Buffer.isBuffer(file.buffer)) {
    throwInvalidUploadFile();
  }

  const size = Number(file.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > SOLUTION_DESIGN_UPLOAD_MAX_FILE_SIZE ||
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

function normalizeReturnReason(payload = {}) {
  const reason = String(payload.returnReason ?? payload.reason ?? '').trim();
  if (!reason) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.RETURN_REASON_REQUIRED,
      'Solution analysis return reason is required',
      400,
      ['returnReason']
    );
  }

  if (reason.length > 1000) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.RETURN_REASON_REQUIRED,
      'Solution analysis return reason is too long',
      400,
      ['returnReason']
    );
  }

  return reason;
}

function normalizeUploadExemptionReason(payload = {}) {
  const reason = String(
    payload.exemptionReason ?? payload.exemption_reason ?? payload.reason ?? payload.remark ?? ''
  ).trim();

  if (reason.length > MAX_UPLOAD_EXEMPTION_REASON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution design upload exemption reason is too long',
      400,
      ['exemptionReason']
    );
  }

  return reason || null;
}

function normalizeQuotationTenderBranchType(payload = {}) {
  const branchType = String(payload.branchType ?? payload.branch_type ?? payload.type ?? '').trim();
  if (
    ![
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER
    ].includes(branchType)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_TENDER_BRANCH,
      'Invalid quotation/tender branch type',
      400,
      ['branchType']
    );
  }

  return branchType;
}

function normalizeQuotationResultPayload(payload = {}) {
  const result = String(payload.result ?? payload.quotationResult ?? payload.quotation_result ?? '').trim();
  if (
    ![
      SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED,
      SOLUTION_DESIGN_QUOTATION_RESULT.REJECTED
    ].includes(result)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_RESULT,
      'Invalid quotation result',
      400,
      ['result']
    );
  }

  if (result === SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED) {
    return {
      result,
      action: null,
      returnReason: null
    };
  }

  const action = String(
    payload.action ?? payload.quotationRejectedAction ?? payload.quotation_rejected_action ?? ''
  ).trim();
  if (
    ![
      SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST,
      SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.END_PROJECT
    ].includes(action)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_RESULT,
      'Invalid quotation rejected action',
      400,
      ['action']
    );
  }

  return {
    result,
    action,
    returnReason: normalizeReturnReason(payload)
  };
}

function shouldPersistInitialNodes(projectRow) {
  return !isSolutionDesignProjectEnded(projectRow) && isProjectInSolutionDesignStage(projectRow);
}

function isSolutionDesignRoleActor({ projectRow, rolesRow, user }) {
  if (!projectRow || !user?.id) {
    return false;
  }

  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  return SOLUTION_DESIGN_ROLE_DEFINITIONS.some((definition) =>
    isSameId(roleState[definition.roleKey]?.userId, user.id)
  );
}

async function assertWorkflowViewable(executor, projectId, user, { projectRow = null, rolesRow = null } = {}) {
  if (
    !(await canViewProject(executor, user, projectId)) &&
    !isSolutionDesignRoleActor({ projectRow, rolesRow, user })
  ) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access this project',
      ['projectId']
    );
  }
}

async function selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_nodes
    WHERE project_id = ?
      AND node_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

async function ensureSolutionDesignWorkflowState(executor, projectRow) {
  let [nodes, uploadSlots] = await Promise.all([
    selectSolutionDesignNodes(executor, projectRow.id),
    selectSolutionDesignUploadSlots(executor, projectRow.id)
  ]);

  const isComplete =
    nodes.length >= SOLUTION_DESIGN_NODES.length &&
    uploadSlots.length >= SOLUTION_DESIGN_UPLOAD_SLOTS.length;

  if (shouldPersistInitialNodes(projectRow) && !isComplete) {
    // The materializer obtains the project lock and rechecks persisted keys after
    // waiting, so concurrent compatibility GETs cannot create partial workflows.
    await materializeSolutionDesignWorkflow(executor, projectRow.id);
    [nodes, uploadSlots] = await Promise.all([
      selectSolutionDesignNodes(executor, projectRow.id),
      selectSolutionDesignUploadSlots(executor, projectRow.id)
    ]);
  }

  return { nodes, uploadSlots };
}

async function ensureSolutionDesignNodes(executor, projectRow) {
  return (await ensureSolutionDesignWorkflowState(executor, projectRow)).nodes;
}

async function ensureSolutionDesignUploadSlots(executor, projectRow) {
  return (await ensureSolutionDesignWorkflowState(executor, projectRow)).uploadSlots;
}

function buildVirtualUploadSlots() {
  return SOLUTION_DESIGN_UPLOAD_SLOTS.map((slot) => ({
    id: null,
    project_id: null,
    node_key: slot.nodeKey,
    slot_key: slot.slotKey,
    slot_name: slot.slotName,
    slot_order: slot.slotOrder,
    is_required: 1,
    revision: 1,
    status: SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.PENDING,
    is_upload_exempted: 0,
    exemption_reason: null,
    exempted_by_user_id: null,
    exempted_at: null,
    exempted_by_account: null,
    exempted_by_display_name: null,
    submitted_by_user_id: null,
    submitted_at: null,
    current_file_id: null
  }));
}

async function selectUploadSlotForUpdate(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_upload_slots
    WHERE project_id = ?
      AND slot_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, slotKey]
  );

  return rows[0] || null;
}

async function selectCurrentUploadFiles(executor, projectId, slotKeys) {
  if (slotKeys.length === 0) {
    return [];
  }

  const placeholders = slotKeys.map(() => '?').join(', ');
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_upload_files
    WHERE project_id = ?
      AND slot_key IN (${placeholders})
      AND is_current = 1`,
    [projectId, ...slotKeys]
  );

  return rows;
}

async function selectCurrentUploadFileForDownload(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      s.node_key AS slot_node_key,
      s.slot_name,
      s.slot_order,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_solution_design_upload_files f
    INNER JOIN project_solution_design_upload_slots s
      ON s.id = f.slot_id
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    WHERE f.project_id = ?
      AND f.slot_key = ?
      AND f.is_current = 1
    LIMIT 1`,
    [projectId, slotKey]
  );

  return rows[0] || null;
}

async function selectUploadFileWithUploader(executor, fileId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_solution_design_upload_files f
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    WHERE f.id = ?
    LIMIT 1`,
    [fileId]
  );

  return rows[0] || null;
}

async function selectMaxAnalysisFormRevision(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(revision), 0) AS max_revision
    FROM project_solution_design_analysis_forms
    WHERE project_id = ?`,
    [projectId]
  );

  return Number(rows[0]?.max_revision ?? 0);
}

async function selectMaxReviewFormRevision(executor, projectId, nodeKey) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(revision), 0) AS max_revision
    FROM project_solution_design_review_forms
    WHERE project_id = ?
      AND node_key = ?`,
    [projectId, nodeKey]
  );

  return Number(rows[0]?.max_revision ?? 0);
}

async function selectMaxQuotationFormRevision(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(revision), 0) AS max_revision
    FROM project_solution_design_quotation_forms
    WHERE project_id = ?`,
    [projectId]
  );

  return Number(rows[0]?.max_revision ?? 0);
}

function buildVirtualNodes() {
  return buildInitialSolutionDesignNodes().map((node) => ({
    id: null,
    project_id: null,
    node_key: node.nodeKey,
    node_name: node.nodeName,
    node_order: node.nodeOrder,
    status: SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    return_reason: null,
    current_revision: 1,
    activated_at: null,
    submitted_at: null,
    approved_at: null,
    returned_at: null,
    created_at: null,
    updated_at: null
  }));
}

async function selectUsersByIds(executor, userIds) {
  const uniqueIds = [...new Set(userIds.filter((id) => id !== null && id !== undefined).map(Number))];
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

function buildRoleState({ projectRow, rolesRow, usersById }) {
  const entries = {};

  for (const definition of SOLUTION_DESIGN_ROLE_DEFINITIONS) {
    if (definition.roleKey === SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER) {
      entries[definition.roleKey] = {
        roleKey: definition.roleKey,
        label: definition.label,
        userId: projectRow.project_manager_user_id ?? null,
        user: mapProjectManagerUser(projectRow),
        source: 'project_manager'
      };
      continue;
    }

    const assignedUserId =
      rolesRow?.[definition.columnName] ?? null;
    const user = usersById.get(Number(assignedUserId)) || null;

    entries[definition.roleKey] = {
      roleKey: definition.roleKey,
      label: definition.label,
      userId: assignedUserId ?? null,
      user,
      source: assignedUserId ? 'solution_design_assignment' : 'unassigned'
    };
  }

  return entries;
}

function collectRoleUserIds(projectRow, rolesRow) {
  return [
    projectRow.project_manager_user_id,
    ...SOLUTION_DESIGN_STORED_ROLE_DEFINITIONS.map((definition) => rolesRow?.[definition.columnName])
  ].filter((id) => id !== null && id !== undefined);
}

function areAllRolesAssigned(roles) {
  return SOLUTION_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(roles[definition.roleKey]?.userId));
}

function assertAllRolesAssigned(roleState) {
  if (!areAllRolesAssigned(roleState)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.ROLE_REQUIRED,
      'Solution design role assignment is incomplete',
      409,
      ['roles']
    );
  }
}

function assertProjectWriteAllowed(projectRow) {
  if (isSolutionDesignProjectEnded(projectRow)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.PROJECT_ENDED,
      'Project has ended and solution design workflow cannot be changed',
      409,
      ['status']
    );
  }

  if (!isProjectInSolutionDesignStage(projectRow)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NOT_IN_STAGE,
      'Solution design workflow can only be changed in solution design stage',
      409,
      ['currentStage']
    );
  }
}

function assertProjectRoleActor(roleState, roleKey, user) {
  const role = roleState[roleKey];
  if (!role?.userId || !isSameId(role.userId, user?.id)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.FORBIDDEN,
      'Current user cannot operate this solution design workflow item',
      403,
      [roleKey]
    );
  }
}

function assertNodeProcessable(nodeRow, nodeKey, action) {
  if (!nodeRow || !PROCESSABLE_NODE_STATUSES.has(nodeRow.status)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      `Solution design node cannot be ${action} in its current status`,
      409,
      {
        nodeKey,
        status: nodeRow?.status ?? null,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }
}

function buildRoleStateWithoutUserDetails(projectRow, rolesRow) {
  return buildRoleState({
    projectRow,
    rolesRow,
    usersById: new Map()
  });
}

function mapCurrentUploadFile(row, { includeFileDetails = true } = {}) {
  if (!row.current_file_id) {
    return null;
  }

  if (!includeFileDetails) {
    return null;
  }

  return {
    id: row.current_file_id,
    revision: row.current_file_revision,
    originalFileName: row.current_file_original_file_name,
    mimeType: row.current_file_mime_type,
    fileSize: Number(row.current_file_size),
    uploadedByUserId: row.current_file_uploaded_by_user_id,
    uploadedAt: row.current_file_uploaded_at,
    uploadedByUser: {
      id: row.current_file_uploaded_by_user_id,
      account: row.current_file_uploaded_by_account,
      name: row.current_file_uploaded_by_display_name
    }
  };
}

function mapUploadedFile(row) {
  return {
    id: row.id,
    slotKey: row.slot_key,
    revision: row.revision,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    isCurrent: Boolean(row.is_current),
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    uploadedByUser: {
      id: row.uploaded_by_user_id,
      account: row.uploaded_by_account,
      name: row.uploaded_by_display_name
    }
  };
}

function buildCurrentFileSlotKeySet(slots = []) {
  const readyStatuses = new Set([
    SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED,
    SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED
  ]);
  return new Set(
    slots
      .filter((slot) => Boolean(slot.current_file_id) && readyStatuses.has(slot.status))
      .map((slot) => slot.slot_key)
  );
}

function isUploadSlotExempted(row) {
  return isSolutionDesignOutputUploadSlot(row?.slot_key) && Boolean(row?.is_upload_exempted);
}

function buildExemptedUploadSlotKeySet(slots = []) {
  return new Set(
    slots
      .filter((slot) => isUploadSlotExempted(slot))
      .map((slot) => slot.slot_key)
  );
}

function buildCurrentUploadSlotRevisionMap(slots = []) {
  return new Map(
    slots
      .filter((slot) => Boolean(slot.current_file_id))
      .map((slot) => [slot.slot_key, Number(slot.current_file_revision ?? slot.revision ?? 0)])
  );
}

function buildReviewFormRowByNodeKey(rows = []) {
  return new Map(rows.map((row) => [row.node_key, row]));
}

function buildNodeStatusByKey(nodes = []) {
  return new Map(nodes.map((node) => [node.node_key, node.status]));
}

function getNodeByKey(nodes = [], nodeKey) {
  return nodes.find((node) => node.node_key === nodeKey) || null;
}

function mapQuotationTenderFlow(row) {
  if (!row) {
    return {
      branchType: null,
      branchStatus: null,
      quotationResult: null,
      quotationRejectedAction: null,
      returnReason: null,
      revision: null,
      selectedByUserId: null,
      selectedAt: null
    };
  }

  return {
    id: row.id,
    projectId: row.project_id,
    branchType: row.branch_type,
    branchStatus: row.branch_status,
    quotationResult: row.quotation_result,
    quotationRejectedAction: row.quotation_rejected_action,
    returnReason: row.return_reason,
    revision: row.revision,
    selectedByUserId: row.selected_by_user_id,
    selectedAt: row.selected_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapUploadSlot(row, { roleState, user, projectEnded, inSolutionStage, nodeRowByKey, quotationTenderFlow }) {
  const definition = getSolutionDesignUploadSlotDefinition(row.slot_key);
  const slot = definition || {
    slotKey: row.slot_key,
    slotName: row.slot_name,
    nodeKey: row.node_key,
    slotOrder: row.slot_order,
    requiredRoleKey: null
  };
  const permissions = buildUploadSlotPermissions({
    slot,
    roleState,
    user,
    projectEnded,
    inSolutionStage,
    nodeRow: nodeRowByKey.get(row.node_key),
    quotationTenderFlow
  });
  const canDownload = Boolean(row.current_file_id) && canDownloadUploadFile({ slot, roleState, user });
  const includeFileDetails = !isFinanceCostUploadSlot(slot.slotKey) || canViewFinanceCostUploadFile({ roleState, user });

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    slotKey: row.slot_key,
    slotName: row.slot_name,
    slotOrder: row.slot_order,
    required: Boolean(row.is_required),
    revision: row.revision,
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    hasCurrentFile: Boolean(row.current_file_id),
    currentFile: mapCurrentUploadFile(row, { includeFileDetails }),
    confidential: isFinanceCostUploadSlot(slot.slotKey),
    currentFileHidden: Boolean(row.current_file_id) && !includeFileDetails,
    exemption: {
      isExempted: isUploadSlotExempted(row),
      reason: isUploadSlotExempted(row) ? row.exemption_reason ?? null : null,
      exemptedByUserId: isUploadSlotExempted(row) ? row.exempted_by_user_id ?? null : null,
      exemptedByUser: isUploadSlotExempted(row)
        ? {
            id: row.exempted_by_user_id ?? null,
            account: row.exempted_by_account ?? null,
            name: row.exempted_by_display_name ?? null
          }
        : null,
      exemptedAt: isUploadSlotExempted(row) ? row.exempted_at ?? null : null
    },
    satisfied: Boolean(row.current_file_id) || isUploadSlotExempted(row),
    permissions: {
      ...permissions,
      canMarkExemption:
        permissions.canMarkExemption === true &&
        !Boolean(row.current_file_id) &&
        !isUploadSlotExempted(row),
      canCancelExemption: permissions.canCancelExemption === true && isUploadSlotExempted(row),
      canDownload
    }
  };
}

function buildUploadsDto({ projectRow, slots, nodes, rolesRow, user, quotationTenderFlow = null }) {
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const materializedSlots = slots.length > 0 ? slots : buildVirtualUploadSlots();
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const nodeRowByKey = new Map(materializedNodes.map((node) => [node.node_key, node]));
  const quotationTenderNode = nodeRowByKey.get(SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const visibleSlots = isQuotationBranchCurrent(quotationTenderFlow, quotationTenderNode)
    ? materializedSlots.filter((slot) => slot.slot_key !== SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE)
    : materializedSlots;

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    stageOrder: SOLUTION_DESIGN_STAGE.STAGE_ORDER,
    slots: visibleSlots.map((slot) =>
      mapUploadSlot(slot, {
        roleState,
        user,
        projectEnded,
        inSolutionStage,
        nodeRowByKey,
        quotationTenderFlow
      })
    ),
    permissions: {
      canViewUploads: true
    },
    isProjectEnded: projectEnded
  };
}

function buildGeneratedFileBlockingReason({ row, label, requiredRevision }) {
  if (!row || Number(row.revision ?? 0) < Number(requiredRevision ?? 1)) {
    return `当前版本${label}模板文件未生成成功`;
  }

  if (row.form_status !== SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED &&
      row.form_status !== SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
      row.form_status !== SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED) {
    return `等待技术负责人提交${label}`;
  }

  if (row.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATING) {
    return `${label}模板文件生成中`;
  }

  if (row.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED) {
    return row.generation_error_message
      ? `${label}模板文件生成失败：${row.generation_error_message}`
      : `${label}模板文件生成失败`;
  }

  if (row.generated_file_status !== SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED || !row.generated_file_storage_key) {
    return `当前版本${label}模板文件未生成成功`;
  }

  return null;
}

function buildNodeBlockingReasons(
  row,
  roleState,
  {
    currentFileSlotKeys = new Set(),
    exemptedSlotKeys = new Set(),
    uploadSlotRevisionByKey = new Map(),
    analysisFormRow = null,
    reviewFormRowsByNodeKey = new Map(),
    quotationTenderFlow = null,
    quotationFormRow = null
  } = {}
) {
  if (row.node_key === SOLUTION_DESIGN_NODE_KEY.PREPARATION && row.status === SOLUTION_DESIGN_NODE_STATUS.PENDING) {
    if (!areAllRolesAssigned(roleState)) {
      return ['等待研发中心负责人分配方案设计项目内角色'];
    }

    return ['等待项目经理提交方案设计工作计划'];
  }

  if (row.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS && isNodeProcessableStatus(row.status)) {
    const reasons = [];
    const generatedFileReason = buildGeneratedFileBlockingReason({
      row: analysisFormRow,
      label: '项目方案分析表',
      requiredRevision: row.current_revision
    });
    if (generatedFileReason) {
      reasons.push(generatedFileReason);
    }
    if (!isProductFunctionDiagramCurrent(currentFileSlotKeys)) {
      reasons.push('等待技术负责人上传当前版本产品功能框图');
    }
    return reasons;
  }

  if (getSolutionDesignReviewFormDefinition(row.node_key) && isNodeProcessableStatus(row.status)) {
    const definition = getSolutionDesignReviewFormDefinition(row.node_key);
    const generatedFileReason = buildGeneratedFileBlockingReason({
      row: reviewFormRowsByNodeKey.get(row.node_key),
      label: definition.formName,
      requiredRevision: row.current_revision
    });
    return generatedFileReason ? [generatedFileReason] : [];
  }

  if (row.node_key === SOLUTION_DESIGN_NODE_KEY.DESIGN && isNodeProcessableStatus(row.status)) {
    return areSolutionDesignOutputsSatisfied(currentFileSlotKeys, exemptedSlotKeys)
      ? []
      : ['等待技术负责人上传或标记无需上传方案设计 8 个产出'];
  }

  if (isCostEstimationNode(row.node_key) && isNodeProcessableStatus(row.status)) {
    return isCostUploadSlotCurrent(currentFileSlotKeys, row.node_key)
      ? []
      : ['等待上传成本估算文件'];
  }

  if (row.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER && isNodeProcessableStatus(row.status)) {
    if (
      isQuotationBranchCurrent(quotationTenderFlow, row) &&
      quotationTenderFlow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED
    ) {
      const generatedFileReason = buildGeneratedFileBlockingReason({
        row: quotationFormRow,
        label: '报价单',
        requiredRevision: row.current_revision
      });
      return generatedFileReason ? [generatedFileReason.replace('技术负责人', '商务负责人')] : [];
    }
  }

  if (row.status === SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED && row.node_order > 1) {
    const previousNode = SOLUTION_DESIGN_NODES[row.node_order - 2];
    return [`等待前置节点完成：${previousNode.nodeName}`];
  }

  if (row.status === SOLUTION_DESIGN_NODE_STATUS.RETURNED && row.return_reason) {
    return [row.return_reason];
  }

  return [];
}

function mapNode(
  row,
  {
    user,
    canAssignRoles,
    roleState,
    projectEnded,
    inSolutionStage,
    currentFileSlotKeys,
    exemptedSlotKeys,
    uploadSlotRevisionByKey,
    analysisFormRow,
    reviewFormRowsByNodeKey,
    quotationTenderFlow,
    quotationFormRow
  }
) {
  const canReview = canReviewSolutionDesignNode({ nodeRow: row, user, roleState, projectEnded, inSolutionStage });
  const canProcessCurrentReviewForm = canProcessReviewForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    reviewNode: row
  });
  const permissions = {
    canAssignRoles:
      row.node_key === SOLUTION_DESIGN_NODE_KEY.PREPARATION &&
      canAssignRoles &&
      !projectEnded,
    canSubmit: canSubmitNode({
      nodeRow: row,
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      currentFileSlotKeys,
      exemptedSlotKeys,
      uploadSlotRevisionByKey,
      analysisFormRow,
      reviewFormRowsByNodeKey,
      quotationTenderFlow,
      quotationFormRow
    }),
    canApprove: canReview,
    canReturn: canReview,
    canEditAnalysisForm: canProcessAnalysisForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      analysisNode: row
    }),
    canSubmitAnalysisForm: canProcessAnalysisForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      analysisNode: row
    }),
    canEditReviewForm: canProcessCurrentReviewForm,
    canSubmitReviewForm: canProcessCurrentReviewForm
  };

  if (row.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    permissions.canSelectBranch = canSelectQuotationTenderBranch({
      projectEnded,
      inSolutionStage,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow
    });
    permissions.canUploadQuotation = buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: row,
      quotationTenderFlow
    }).canUpload;
    permissions.canSubmitQuotation = canSubmitQuotation({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow,
      quotationFormRow
    });
    permissions.canEditQuotationForm = canProcessQuotationForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow
    });
    permissions.canSubmitQuotationForm = canProcessQuotationForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow
    });
    permissions.canDownloadQuotationForm = isQuotationFormGeneratedForRevision(
      quotationFormRow,
      row.current_revision
    );
    const canProcessQuoteResult = canProcessQuotationResult({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow
    });
    permissions.canAcceptQuotation = canProcessQuoteResult;
    permissions.canRejectQuotationToRdCost = canProcessQuoteResult;
    permissions.canRejectQuotationAndEndProject = canProcessQuoteResult;
    permissions.canUploadTenderBusiness = buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: row,
      quotationTenderFlow
    }).canUpload;
    permissions.canUploadTenderTechnical = buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: row,
      quotationTenderFlow
    }).canUpload;
    permissions.canSubmitTender = canSubmitTender({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: row,
      flowRow: quotationTenderFlow,
      uploadSlotRevisionByKey
    });
    permissions.canApproveTender = canReview;
    permissions.canReturnTender = canReview;
    permissions.canAdvanceToContract = row.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED;
  }

  return {
    nodeKey: row.node_key,
    nodeName: row.node_name,
    nodeOrder: row.node_order,
    status: projectEnded && row.status !== SOLUTION_DESIGN_NODE_STATUS.APPROVED ? row.status : row.status,
    returnReason: row.return_reason,
    currentRevision: row.current_revision,
    activatedAt: row.activated_at,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    returnedAt: row.returned_at,
    blockingReasons: buildNodeBlockingReasons(row, roleState, {
      currentFileSlotKeys,
      exemptedSlotKeys,
      uploadSlotRevisionByKey,
      analysisFormRow,
      reviewFormRowsByNodeKey,
      quotationTenderFlow,
      quotationFormRow
    }),
    permissions
  };
}

function buildWorkflowDto({
  projectRow,
  nodes,
  uploadSlots,
  analysisFormRow,
  reviewFormRows,
  quotationTenderFlow,
  quotationFormRow,
  rolesRow,
  usersById,
  user
}) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const roleState = buildRoleState({ projectRow, rolesRow, usersById });
  const canAssignRoles =
    canAssignSolutionDesignRoles(user) &&
    !projectEnded &&
    inSolutionStage;
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const currentFileSlotKeys = buildCurrentFileSlotKeySet(uploadSlots);
  const exemptedSlotKeys = buildExemptedUploadSlotKeySet(uploadSlots);
  const uploadSlotRevisionByKey = buildCurrentUploadSlotRevisionMap(uploadSlots);
  const reviewFormRowsByNodeKey = buildReviewFormRowByNodeKey(reviewFormRows);
  const quotationTenderNode = getNodeByKey(materializedNodes, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const quotationTenderPermissions = {
    canSelectBranch: canSelectQuotationTenderBranch({
      projectEnded,
      inSolutionStage,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canUploadQuotation: buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: quotationTenderNode,
      quotationTenderFlow
    }).canUpload,
    canUploadTenderBusiness: buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: quotationTenderNode,
      quotationTenderFlow
    }).canUpload,
    canUploadTenderTechnical: buildUploadSlotPermissions({
      slot: getSolutionDesignUploadSlotDefinition(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE),
      roleState,
      user,
      projectEnded,
      inSolutionStage,
      nodeRow: quotationTenderNode,
      quotationTenderFlow
    }).canUpload,
    canSubmitQuotation: canSubmitQuotation({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow,
      quotationFormRow
    }),
    canEditQuotationForm: canProcessQuotationForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canSubmitQuotationForm: canProcessQuotationForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canDownloadQuotationForm: isQuotationFormGeneratedForRevision(
      quotationFormRow,
      quotationTenderNode?.current_revision
    ),
    canAcceptQuotation: canProcessQuotationResult({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canRejectQuotationToRdCost: canProcessQuotationResult({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canRejectQuotationAndEndProject: canProcessQuotationResult({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow
    }),
    canSubmitTender: canSubmitTender({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationTenderNode,
      flowRow: quotationTenderFlow,
      uploadSlotRevisionByKey
    }),
    canApproveTender: canReviewSolutionDesignNode({
      nodeRow: quotationTenderNode || {},
      user,
      roleState,
      projectEnded,
      inSolutionStage
    }),
    canReturnTender: canReviewSolutionDesignNode({
      nodeRow: quotationTenderNode || {},
      user,
      roleState,
      projectEnded,
      inSolutionStage
    }),
    canAdvanceToContract: quotationTenderNode?.status === SOLUTION_DESIGN_NODE_STATUS.APPROVED
  };

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    stageOrder: SOLUTION_DESIGN_STAGE.STAGE_ORDER,
    currentStage: {
      stageId: projectRow.current_stage_id,
      stageOrder: projectRow.current_stage_order,
      stageKey: projectRow.current_stage_key,
      stageName: projectRow.current_stage_name,
      stageStatus: projectRow.current_stage_status
    },
    nodes: materializedNodes.map((node) =>
      mapNode(node, {
        user,
        canAssignRoles,
        roleState,
        projectEnded,
        inSolutionStage,
        currentFileSlotKeys,
        exemptedSlotKeys,
        uploadSlotRevisionByKey,
        analysisFormRow,
        reviewFormRowsByNodeKey,
        quotationTenderFlow,
        quotationFormRow
      })
    ),
    analysisForm: mapAnalysisForm(analysisFormRow),
    reviewForms: Object.fromEntries(
      [
        SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
        SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW
      ].map((nodeKey) => [nodeKey, mapReviewForm(reviewFormRowsByNodeKey.get(nodeKey))])
    ),
    quotationTender: {
      ...mapQuotationTenderFlow(quotationTenderFlow),
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      nodeStatus: quotationTenderNode?.status ?? SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      nodeRevision: quotationTenderNode?.current_revision ?? 1,
      quotationForm: mapQuotationForm(quotationFormRow),
      permissions: quotationTenderPermissions
    },
    roles: roleState,
    permissions: {
      canViewWorkflow: true,
      canAssignRoles,
      canAdvanceToContract: quotationTenderPermissions.canAdvanceToContract
    },
    isProjectEnded: projectEnded
  };
}

function buildQuotationFormPermissions({ projectRow, quotationNode, rolesRow, user, quotationTenderFlow, quotationFormRow }) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const canProcessForm = canProcessQuotationForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    nodeRow: quotationNode,
    flowRow: quotationTenderFlow
  });

  return {
    canViewQuotationForm: true,
    canEditQuotationForm: canProcessForm,
    canSubmitQuotationForm: canProcessForm,
    canSubmitQuotation: canSubmitQuotation({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow: quotationNode,
      flowRow: quotationTenderFlow,
      quotationFormRow
    }),
    canDownloadGeneratedFile: isQuotationFormGeneratedForRevision(
      quotationFormRow,
      quotationNode?.current_revision
    )
  };
}

function getWorkflowNodeDto(workflow, nodeKey) {
  return (workflow?.nodes || []).find((node) => node.nodeKey === nodeKey) || null;
}

function isWorkflowRoleAssignmentComplete(workflow) {
  return SOLUTION_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(workflow?.roles?.[definition.roleKey]?.userId));
}

function buildSolutionDesignWorkbenchTargetRoute(projectId, nodeKey) {
  return `/projects/${projectId}?taskMode=solutionDesign&focusNodeKey=${encodeURIComponent(nodeKey)}`;
}

function getSolutionDesignWorkbenchNodeUpdatedAt(node, projectRow) {
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

function buildSolutionDesignWorkbenchTodo({
  projectRow,
  workflow,
  node,
  actionText,
  actionKey,
  blockingReasons = null
}) {
  return {
    type: SOLUTION_DESIGN_WORKBENCH_TODO_TYPE,
    taskType: SOLUTION_DESIGN_WORKBENCH_TODO_TYPE,
    actionKey,
    projectId: workflow.projectId,
    projectCode: projectRow?.project_code ?? workflow.projectCode ?? null,
    projectName: projectRow?.project_name ?? workflow.projectName ?? null,
    stageId: workflow.currentStage?.stageId ?? projectRow?.current_stage_id ?? null,
    stageOrder: SOLUTION_DESIGN_STAGE.STAGE_ORDER,
    stageName: SOLUTION_DESIGN_STAGE.STAGE_NAME,
    documentId: null,
    documentCode: null,
    documentName: null,
    nodeKey: node.nodeKey,
    nodeName: node.nodeName,
    status: node.status,
    revision: node.currentRevision || 1,
    actionText,
    blockingReasons: Array.isArray(blockingReasons) ? blockingReasons : node.blockingReasons || [],
    createdAt: getSolutionDesignWorkbenchNodeUpdatedAt(node, projectRow),
    updatedAt: getSolutionDesignWorkbenchNodeUpdatedAt(node, projectRow),
    targetRoute: buildSolutionDesignWorkbenchTargetRoute(workflow.projectId, node.nodeKey)
  };
}

function getSolutionDesignSlotUploadActionText(slot) {
  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN) {
    return '上传/提交方案设计工作计划';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM) {
    return '上传产品功能框图';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION) {
    return '上传/提交研发中心成本估算表';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION) {
    return '上传/提交制造中心成本估算表';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION) {
    return '上传/提交营销中心成本估算表';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION) {
    return '上传/提交财务成本估算表';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
    return '上传/提交报价单';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE) {
    return '上传投标商务标';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE) {
    return '上传投标技术标';
  }

  return `上传方案设计产出：${slot.slotName}`;
}

function getSolutionDesignNodeSubmitActionText(node) {
  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return '提交方案设计工作计划';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return '提交项目方案分析节点';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return '提交方案设计 8 个产出';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return '提交内部方案评审节点';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW) {
    return '提交客户方案评审节点';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return '提交研发成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return '提交制造成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return '提交营销成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    return '提交财务成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return '提交投标总经理审批';
  }

  return `提交${node.nodeName}`;
}

function getSolutionDesignNodeReviewActionText(node) {
  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return '审批/退回项目方案分析';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return '审批/退回内部方案评审';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW) {
    return '审批/退回客户方案评审';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return '审批/退回研发成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return '审批/退回制造成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return '审批/退回营销成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    return node.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW
      ? '总经理审批/退回财务成本估算'
      : '财务负责人审批/退回财务成本估算';
  }

  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return '审批/退回投标';
  }

  return `审批/退回${node.nodeName}`;
}

function getSolutionDesignReviewFormActionText(node) {
  return node.nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW
    ? '填写/提交 C15 内部方案评审记录表'
    : '填写/提交 C16 客户方案评审记录表';
}

export function buildSolutionDesignWorkbenchTodos({ projectRow = null, workflow, uploads = null }) {
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
    todos.push(buildSolutionDesignWorkbenchTodo({
      projectRow,
      workflow,
      node,
      actionText,
      actionKey,
      blockingReasons
    }));
  };

  const preparationNode = getWorkflowNodeDto(workflow, SOLUTION_DESIGN_NODE_KEY.PREPARATION);
  if (
    preparationNode?.permissions?.canAssignRoles === true &&
    !isWorkflowRoleAssignmentComplete(workflow)
  ) {
    addTodo({
      node: preparationNode,
      actionText: '分配方案设计角色',
      actionKey: 'assign_roles'
    });
  }

  for (const slot of uploads?.slots || []) {
    if (slot?.permissions?.canUpload !== true) {
      continue;
    }

    if (
      isSolutionDesignOutputUploadSlot(slot.slotKey) &&
      (slot.hasCurrentFile === true || slot.exemption?.isExempted === true)
    ) {
      continue;
    }

    const node = getWorkflowNodeDto(workflow, slot.nodeKey);
    addTodo({
      node,
      actionText: getSolutionDesignSlotUploadActionText(slot),
      actionKey: `upload:${slot.slotKey}`
    });
  }

  const analysisNode = getWorkflowNodeDto(workflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  if (
    (analysisNode?.permissions?.canEditAnalysisForm === true ||
      analysisNode?.permissions?.canSubmitAnalysisForm === true) &&
    !isGeneratedFormDtoCurrent(workflow.analysisForm, analysisNode.currentRevision)
  ) {
    addTodo({
      node: analysisNode,
      actionText: '填写/提交项目方案分析表',
      actionKey: 'analysis_form'
    });
  }

  for (const reviewNodeKey of [SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW]) {
    const reviewNode = getWorkflowNodeDto(workflow, reviewNodeKey);
    if (
      (reviewNode?.permissions?.canEditReviewForm === true ||
        reviewNode?.permissions?.canSubmitReviewForm === true) &&
      !isGeneratedFormDtoCurrent(workflow.reviewForms?.[reviewNodeKey], reviewNode.currentRevision)
    ) {
      addTodo({
        node: reviewNode,
        actionText: getSolutionDesignReviewFormActionText(reviewNode),
        actionKey: `review_form:${reviewNodeKey}`
      });
    }
  }

  for (const node of workflow.nodes || []) {
    if (node?.permissions?.canSubmit === true) {
      addTodo({
        node,
        actionText: getSolutionDesignNodeSubmitActionText(node),
        actionKey: 'submit_node'
      });
    }

    if (node?.permissions?.canApprove === true || node?.permissions?.canReturn === true) {
      addTodo({
        node,
        actionText: getSolutionDesignNodeReviewActionText(node),
        actionKey: 'review_node'
      });
    }
  }

  const quotationTenderNode = getWorkflowNodeDto(workflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  const quotationTenderPermissions = workflow.quotationTender?.permissions || {};
  if (quotationTenderPermissions.canSelectBranch === true) {
    addTodo({
      node: quotationTenderNode,
      actionText: '选择报价/投标分支',
      actionKey: 'select_quotation_tender_branch'
    });
  }

  if (
    (quotationTenderPermissions.canEditQuotationForm === true ||
      quotationTenderPermissions.canSubmitQuotationForm === true) &&
    !isGeneratedFormDtoCurrent(workflow.quotationTender?.quotationForm, quotationTenderNode?.currentRevision)
  ) {
    addTodo({
      node: quotationTenderNode,
      actionText: '填写/提交报价单在线表单',
      actionKey: 'quotation_form'
    });
  }

  if (quotationTenderPermissions.canSubmitQuotation === true) {
    addTodo({
      node: quotationTenderNode,
      actionText: '提交报价单',
      actionKey: 'submit_quotation'
    });
  }

  if (
    quotationTenderPermissions.canAcceptQuotation === true ||
    quotationTenderPermissions.canRejectQuotationToRdCost === true ||
    quotationTenderPermissions.canRejectQuotationAndEndProject === true
  ) {
    addTodo({
      node: quotationTenderNode,
      actionText: '记录报价客户接受/不接受结果',
      actionKey: 'process_quotation_result'
    });
  }

  if (quotationTenderPermissions.canSubmitTender === true) {
    addTodo({
      node: quotationTenderNode,
      actionText: '提交投标总经理审批',
      actionKey: 'submit_tender'
    });
  }

  return todos;
}

async function selectSolutionDesignWorkbenchProjectRows(executor) {
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
      s.id AS current_stage_id,
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    INNER JOIN project_stages s
      ON s.project_id = p.id
      AND s.is_current = 1
    WHERE s.stage_key = ?
      AND p.status <> ?
    ORDER BY p.project_code ASC, p.id ASC`,
    [SOLUTION_DESIGN_STAGE.STAGE_KEY, PROJECT_STATUS.ENDED]
  );

  return rows;
}

function isMissingSolutionDesignSchemaError(error) {
  return (
    error?.code === 'ER_NO_SUCH_TABLE' &&
    String(error.sqlMessage || error.message || '').includes('project_solution_design_')
  );
}

export async function selectSolutionDesignWorkbenchTodos(user, db = pool) {
  if (!user?.id) {
    return [];
  }

  try {
    return await withConnection(db, async (connection) => {
      const projectRows = await selectSolutionDesignWorkbenchProjectRows(connection);
      const todos = [];

      for (const projectRow of projectRows) {
        const rolesRow = await selectSolutionDesignRoles(connection, projectRow.id);
        try {
          await assertWorkflowViewable(connection, projectRow.id, user, { projectRow, rolesRow });
        } catch (error) {
          if (error instanceof ProjectAuthorizationError || error?.code === 'FORBIDDEN_OPERATION') {
            continue;
          }
          throw error;
        }

        const nodes = await ensureSolutionDesignNodes(connection, projectRow);
        const uploadSlots = await ensureSolutionDesignUploadSlots(connection, projectRow);
        const analysisFormRow = await selectCurrentAnalysisForm(connection, projectRow.id);
        const reviewFormRows = await selectCurrentReviewForms(connection, projectRow.id);
        const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectRow.id);
        const quotationFormRow = await selectCurrentQuotationForm(connection, projectRow.id);
        const usersById = await selectUsersByIds(connection, collectRoleUserIds(projectRow, rolesRow));
        const workflow = buildWorkflowDto({
          projectRow,
          nodes,
          uploadSlots,
          analysisFormRow,
          reviewFormRows,
          quotationTenderFlow,
          quotationFormRow,
          rolesRow,
          usersById,
          user
        });
        const uploads = buildUploadsDto({
          projectRow,
          slots: uploadSlots,
          nodes,
          rolesRow,
          user,
          quotationTenderFlow
        });

        todos.push(...buildSolutionDesignWorkbenchTodos({ projectRow, workflow, uploads }));
      }

      return todos;
    });
  } catch (error) {
    if (isMissingSolutionDesignSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

async function buildWorkflowDtoForProject(executor, { projectRow, user }) {
  const nodes = await ensureSolutionDesignNodes(executor, projectRow);
  const rolesRow = await selectSolutionDesignRoles(executor, projectRow.id);
  const uploadSlots = await selectSolutionDesignUploadSlots(executor, projectRow.id);
  const analysisFormRow = await selectCurrentAnalysisForm(executor, projectRow.id);
  const reviewFormRows = await selectCurrentReviewForms(executor, projectRow.id);
  const quotationTenderFlow = await selectQuotationTenderFlow(executor, projectRow.id);
  const quotationFormRow = await selectCurrentQuotationForm(executor, projectRow.id);
  const usersById = await selectUsersByIds(executor, collectRoleUserIds(projectRow, rolesRow));
  return buildWorkflowDto({
    projectRow,
    nodes,
    uploadSlots,
    analysisFormRow,
    reviewFormRows,
    quotationTenderFlow,
    quotationFormRow,
    rolesRow,
    usersById,
    user
  });
}

function assertCanAssignRoles(projectRow, user) {
  if (!canAssignSolutionDesignRoles(user)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.FORBIDDEN,
      'Current user cannot assign solution design roles',
      403,
      ['organizationRole', 'department']
    );
  }

  if (isSolutionDesignProjectEnded(projectRow)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.PROJECT_ENDED,
      'Project has ended and solution design roles cannot be assigned',
      409,
      ['status']
    );
  }

  if (!isProjectInSolutionDesignStage(projectRow)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NOT_IN_STAGE,
      'Solution design roles can only be assigned in solution design stage',
      409,
      ['currentStage']
    );
  }
}

function assertCanReviewSolutionDesignNode({ nodeRow, user, roleState, projectEnded, inSolutionStage }) {
  if (
    projectEnded ||
    !inSolutionStage ||
    !canActAsReviewerForSolutionDesignNode({ nodeRow, user, roleState })
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.FORBIDDEN,
      'Current user cannot review solution design workflow node',
      403,
      ['organizationRole', 'department']
    );
  }
}

async function selectAssignableUsers(executor, normalizedPayload) {
  const usersById = await selectUsersByIds(executor, Object.values(normalizedPayload));

  for (const definition of SOLUTION_DESIGN_ROLE_DEFINITIONS) {
    const userId = normalizedPayload[definition.requestField];
    const candidate = usersById.get(Number(userId));

    if (!candidate) {
      throw new SolutionDesignWorkflowError(
        definition.roleKey === SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER
          ? SOLUTION_DESIGN_ERROR.PROJECT_MANAGER_INVALID
          : SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
        `${definition.label} user not found`,
        409,
        [definition.requestField]
      );
    }

    assertAssignableRoleUser(definition, candidate);
  }

  return usersById;
}

async function upsertRoles(executor, { projectId, normalizedPayload, userId, existingRolesRow }) {
  const values = SOLUTION_DESIGN_STORED_ROLE_DEFINITIONS.map(
    (definition) => normalizedPayload[definition.requestField]
  );

  if (existingRolesRow) {
    await executor.execute(
      `UPDATE project_solution_design_roles
      SET technical_owner_user_id = ?,
        business_owner_user_id = ?,
        procurement_owner_user_id = ?,
        finance_accountant_user_id = ?,
        finance_owner_user_id = ?,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?`,
      [...values, userId, projectId]
    );
    return;
  }

  await executor.execute(
    `INSERT INTO project_solution_design_roles (
      project_id,
      technical_owner_user_id,
      business_owner_user_id,
      procurement_owner_user_id,
      finance_accountant_user_id,
      finance_owner_user_id,
      assigned_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [projectId, ...values, userId, userId]
  );
}

async function insertRoleHistory(executor, { projectRow, existingRolesRow, normalizedPayload, changedByUserId }) {
  for (const definition of SOLUTION_DESIGN_ROLE_DEFINITIONS) {
    const fromUserId = definition.roleKey === SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER
      ? projectRow.project_manager_user_id
      : existingRolesRow?.[definition.columnName] ?? null;
    const toUserId = normalizedPayload[definition.requestField];

    if (isSameId(fromUserId, toUserId)) {
      continue;
    }

    await executor.execute(
      `INSERT INTO project_solution_design_role_history (
        project_id,
        role_key,
        from_user_id,
        to_user_id,
        changed_by_user_id
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        projectRow.id,
        definition.roleKey,
        fromUserId ?? null,
        toUserId,
        changedByUserId
      ]
    );
  }
}

async function updateProjectManager(executor, { projectId, projectManagerUserId, usersById }) {
  const projectManager = usersById.get(Number(projectManagerUserId));
  await executor.execute(
    `UPDATE projects
    SET project_manager_user_id = ?,
      project_manager = ?
    WHERE id = ?`,
    [projectManagerUserId, projectManager?.name ?? null, projectId]
  );
}

function buildAssignedRoleDetails(normalizedPayload) {
  return Object.fromEntries(
    SOLUTION_DESIGN_ROLE_DEFINITIONS.map((definition) => [
      definition.roleKey,
      normalizedPayload[definition.requestField]
    ])
  );
}

async function insertRolesAssignedLog(executor, { projectRow, normalizedPayload, actorUserId }) {
  await insertOperationLog(executor, {
    projectId: projectRow.id,
    actorUserId,
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ROLES_ASSIGNED,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectRow.id,
    summary: '分配方案设计阶段项目内角色',
    details: {
      projectId: projectRow.id,
      roles: buildAssignedRoleDetails(normalizedPayload),
      projectManager: {
        fromUserId: projectRow.project_manager_user_id ?? null,
        toUserId: normalizedPayload.projectManagerUserId
      },
      actorUserId,
      operatedAt: new Date().toISOString()
    }
  });
}

function getUploadLogActionType(slot) {
  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_WORK_PLAN_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_PRODUCT_FUNCTION_DIAGRAM_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MANUFACTURING_COST_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_BUSINESS_FILE_UPLOADED;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE) {
    return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_TECHNICAL_FILE_UPLOADED;
  }

  return OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_UPLOADED;
}

function buildUploadLogSummary(slot, fileRow) {
  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN) {
    return `上传方案设计工作计划：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM) {
    return `上传产品功能框图：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION) {
    return `上传研发中心成本估算表：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION) {
    return `上传制造中心成本估算表：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION) {
    return `上传营销中心成本估算表：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION) {
    return '上传运营中心/财务成本估算表';
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
    return `上传报价单：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE) {
    return `上传投标商务标：${fileRow.original_file_name}`;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE) {
    return `上传投标技术标：${fileRow.original_file_name}`;
  }

  return `上传方案设计产出：${slot.slotName} / ${fileRow.original_file_name}`;
}

async function insertUploadLog(executor, { projectId, actorUserId, slot, fileRow }) {
  const confidential = isFinanceCostUploadSlot(slot.slotKey);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: getUploadLogActionType(slot),
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: buildUploadLogSummary(slot, fileRow),
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      fileId: confidential ? null : fileRow.id,
      originalFileName: confidential ? null : fileRow.original_file_name,
      fileSize: confidential ? null : Number(fileRow.file_size),
      confidential,
      revision: fileRow.revision,
      uploadedByUserId: actorUserId
    }
  });
}

async function insertUploadExemptionLog(executor, {
  projectId,
  actorUserId,
  slot,
  reason = null,
  actionType,
  summary,
  fileRow = null
}) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      reason,
      fileId: fileRow?.id ?? null,
      revision: fileRow?.revision ?? null,
      actorUserId
    }
  });
}

async function insertNodeSubmitLog(executor, { projectId, actorUserId, nodeKey }) {
  let actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUTS_SUBMITTED;
  let summary = '提交方案设计 8 个产出';

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_WORK_PLAN_SUBMITTED;
    summary = '提交方案设计工作计划';
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_SUBMITTED;
    summary = '提交项目方案分析节点审批';
  }

  if (getSolutionDesignReviewFormDefinition(nodeKey)) {
    const metadata = getReviewNodeSubmitMetadata(nodeKey);
    actionType = metadata.actionType;
    summary = metadata.summary;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_SUBMITTED;
    summary = '提交研发成本估算节点审批';
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MANUFACTURING_COST_SUBMITTED;
    summary = '提交制造成本估算节点审批';
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_SUBMITTED;
    summary = '提交营销成本估算节点审批';
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_SUBMITTED;
    summary = '提交财务成本估算节点审批';
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    actionType = OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_SUBMITTED;
    summary = '提交投标总经理审批';
  }

  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey,
      submittedByUserId: actorUserId
    }
  });
}

async function insertAnalysisFormLog(executor, { projectId, actorUserId, formRow, actionType, summary }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      formId: formRow.id,
      revision: formRow.revision,
      formStatus: formRow.form_status,
      generatedFileStatus: formRow.generated_file_status,
      actorUserId
    }
  });
}

async function insertAnalysisReviewLog(executor, { projectId, actorUserId, actionType, summary, returnReason = null }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      actorUserId,
      returnReason,
      resubmitScope: returnReason ? ['analysis_form', SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM] : []
    }
  });
}

async function insertAnalysisFormGeneratedFileLog(executor, { projectId, actorUserId, formRow, success }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: success
      ? OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATED
      : OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATION_FAILED,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: success
      ? `项目方案分析表生成文件成功：${formRow.generated_file_name}`
      : '项目方案分析表生成文件失败',
    details: {
      projectId,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      documentCode: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.documentCode,
      formId: formRow.id,
      revision: formRow.revision,
      templateName: formRow.generated_file_template_name ?? SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName,
      fileName: success ? formRow.generated_file_name : null,
      fileSize: success ? Number(formRow.generated_file_size ?? 0) : null,
      failureSummary: success ? null : formRow.generation_error_message,
      actorUserId
    }
  });
}

function getReviewFormLogMetadata(nodeKey, formStatus) {
  const isInternal = nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW;
  const isSubmit = formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED;

  if (isInternal && isSubmit) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SUBMITTED,
      summary: '提交内部方案评审记录表'
    };
  }

  if (isInternal) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SAVED,
      summary: '保存内部方案评审记录表草稿'
    };
  }

  if (isSubmit) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SUBMITTED,
      summary: '提交客户方案评审记录表'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SAVED,
    summary: '保存客户方案评审记录表草稿'
  };
}

function getReviewFormGenerationFailedMetadata(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED,
      summary: '内部方案评审记录表生成文件失败'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATION_FAILED,
    summary: '客户方案评审记录表生成文件失败'
  };
}

function getReviewFormGenerationMetadata(nodeKey, success) {
  if (!success) {
    return getReviewFormGenerationFailedMetadata(nodeKey);
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATED,
      summary: '内部方案评审记录表生成文件成功'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATED,
    summary: '客户方案评审记录表生成文件成功'
  };
}

async function insertReviewFormLog(executor, { projectId, actorUserId, formRow, actionType, summary }) {
  const definition = getSolutionDesignReviewFormDefinition(formRow.node_key);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: formRow.node_key,
      reviewType: formRow.review_type,
      documentCode: definition?.documentCode ?? null,
      formId: formRow.id,
      revision: formRow.revision,
      formStatus: formRow.form_status,
      generatedFileStatus: formRow.generated_file_status,
      actorUserId
    }
  });
}

async function insertReviewFormGeneratedFileLog(executor, { projectId, actorUserId, formRow, success }) {
  const definition = getSolutionDesignReviewFormDefinition(formRow.node_key);
  const metadata = getReviewFormGenerationMetadata(formRow.node_key, success);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: metadata.actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary: success
      ? `${metadata.summary}：${formRow.generated_file_name}`
      : metadata.summary,
    details: {
      projectId,
      nodeKey: formRow.node_key,
      reviewType: formRow.review_type,
      documentCode: definition?.documentCode ?? null,
      formId: formRow.id,
      revision: formRow.revision,
      templateName: formRow.generated_file_template_name ?? definition?.templateName ?? null,
      fileName: success ? formRow.generated_file_name : null,
      fileSize: success ? Number(formRow.generated_file_size ?? 0) : null,
      failureSummary: success ? null : formRow.generation_error_message,
      actorUserId
    }
  });
}

function getReviewNodeSubmitMetadata(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_SUBMITTED,
      summary: '提交内部方案评审节点审批'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_SUBMITTED,
    summary: '提交客户方案评审节点审批'
  };
}

function getReviewApproveMetadata(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_APPROVED,
      summary: '内部方案评审审批通过'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_APPROVED,
    summary: '客户方案评审审批通过'
  };
}

function getReviewReturnMetadata(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_RETURNED,
      summary: '内部方案评审审批退回，返回方案设计节点整体重提'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_RETURNED,
    summary: '客户方案评审审批退回，返回方案设计节点整体重提'
  };
}

async function insertReviewApprovalLog(executor, {
  projectId,
  actorUserId,
  nodeKey,
  actionType,
  summary,
  returnReason = null
}) {
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey,
      reviewType: definition?.reviewType ?? null,
      documentCode: definition?.documentCode ?? null,
      actorUserId,
      returnReason,
      returnToNodeKey: returnReason ? SOLUTION_DESIGN_NODE_KEY.DESIGN : null,
      resubmitScope: returnReason ? SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS : [],
      affectedNodeKeys: returnReason
        ? nodeKey === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW
          ? [SOLUTION_DESIGN_NODE_KEY.DESIGN, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, nodeKey]
          : [SOLUTION_DESIGN_NODE_KEY.DESIGN, nodeKey]
        : [],
      resubmitScopeDescription: returnReason ? '方案设计 8 个产出需整体重新提交' : null
    }
  });
}

function getCostApproveMetadata(nodeKey, nodeStatus) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_APPROVED,
      summary: '研发成本估算审批通过'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MANUFACTURING_COST_APPROVED,
      summary: '制造成本估算审批通过'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_APPROVED,
      summary: '营销成本估算审批通过'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST && nodeStatus === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_FINANCE_APPROVED,
      summary: '财务负责人审批通过财务成本估算'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_GENERAL_APPROVED,
    summary: '总经理审批通过财务成本估算'
  };
}

function getCostReturnMetadata(nodeKey, nodeStatus) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_RETURNED,
      summary: '研发成本估算审批退回'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MANUFACTURING_COST_RETURNED,
      summary: '制造成本估算审批退回'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_RETURNED,
      summary: '营销成本估算审批退回'
    };
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST && nodeStatus === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_FINANCE_RETURNED,
      summary: '财务负责人退回财务成本估算'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_GENERAL_RETURNED,
    summary: '总经理退回财务成本估算，返回研发成本估算重走四段流程'
  };
}

async function insertCostApprovalLog(executor, {
  projectId,
  actorUserId,
  nodeKey,
  actionType,
  summary,
  returnReason = null,
  returnToNodeKey = null,
  resubmitScope = [],
  affectedNodeKeys = []
}) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey,
      actorUserId,
      returnReason,
      returnToNodeKey,
      resubmitScope,
      affectedNodeKeys,
      confidentialFileDetailsFiltered: nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
    }
  });
}

async function insertQuotationTenderLog(executor, {
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
    targetType: OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      actorUserId,
      ...details
    }
  });
}

async function insertReadyForContractLog(executor, { projectId, actorUserId, sourceAction }) {
  await insertQuotationTenderLog(executor, {
    projectId,
    actorUserId,
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT,
    summary: '方案设计报价/投标已通过，允许进入合同签订阶段',
    details: {
      sourceAction,
      canAdvanceToContract: true,
      contractStageBusinessImplemented: false
    }
  });
}

async function deactivateCurrentAnalysisForm(executor, projectId) {
  await executor.execute(
    `UPDATE project_solution_design_analysis_forms
    SET is_current = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND is_current = 1`,
    [projectId]
  );
}

async function insertAnalysisForm(executor, {
  projectId,
  revision,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  const [result] = await executor.execute(
    `INSERT INTO project_solution_design_analysis_forms (
      project_id,
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
      generated_file_template_name,
      generated_at,
      generated_by_user_id,
      generation_error_message,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, 1, ?, ${
      formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'
    }, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?)`,
    [
      projectId,
      revision,
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      actorUserId
    ]
  );

  return selectCurrentAnalysisForm(executor, projectId);
}

async function updateAnalysisForm(executor, {
  formId,
  projectId,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  await executor.execute(
    `UPDATE project_solution_design_analysis_forms
    SET form_status = ?,
      form_data_json = ?,
      submitted_by_user_id = ?,
      submitted_at = ${formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'},
      generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = NULL,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      formId
    ]
  );

  return selectCurrentAnalysisForm(executor, projectId);
}

async function saveAnalysisFormVersion(executor, {
  projectId,
  nodeRevision,
  currentFormRow,
  formStatus,
  formDataJson,
  actorUserId
}) {
  const isSubmit = formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED;
  const generatedFileStatus = isSubmit
    ? SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATING
    : SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED;
  const generatedFileTemplateName = isSubmit ? SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName : null;
  const generatedByUserId = isSubmit ? actorUserId : null;
  const generationErrorMessage = null;
  const canUpdateCurrentDraft =
    currentFormRow?.form_status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT &&
    Number(currentFormRow.revision ?? 0) >= Number(nodeRevision ?? 1);

  if (canUpdateCurrentDraft) {
    return updateAnalysisForm(executor, {
      formId: currentFormRow.id,
      projectId,
      formStatus,
      formDataJson,
      actorUserId,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage
    });
  }

  await deactivateCurrentAnalysisForm(executor, projectId);
  const maxRevision = await selectMaxAnalysisFormRevision(executor, projectId);
  const nextRevision = Math.max(maxRevision + 1, Number(nodeRevision ?? 1));
  return insertAnalysisForm(executor, {
    projectId,
    revision: nextRevision,
    formStatus,
    formDataJson,
    actorUserId,
    generatedFileStatus,
    generatedFileTemplateName,
    generatedByUserId,
    generationErrorMessage
  });
}

async function deactivateCurrentReviewForm(executor, projectId, nodeKey) {
  await executor.execute(
    `UPDATE project_solution_design_review_forms
    SET is_current = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND is_current = 1`,
    [projectId, nodeKey]
  );
}

async function insertReviewForm(executor, {
  projectId,
  nodeKey,
  reviewType,
  revision,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  const [result] = await executor.execute(
    `INSERT INTO project_solution_design_review_forms (
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
      generated_file_template_name,
      generated_at,
      generated_by_user_id,
      generation_error_message,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ${
      formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'
    }, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?)`,
    [
      projectId,
      nodeKey,
      reviewType,
      revision,
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      actorUserId
    ]
  );

  return selectCurrentReviewForm(executor, projectId, nodeKey);
}

async function updateReviewForm(executor, {
  formId,
  projectId,
  nodeKey,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  await executor.execute(
    `UPDATE project_solution_design_review_forms
    SET form_status = ?,
      form_data_json = ?,
      submitted_by_user_id = ?,
      submitted_at = ${formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'},
      generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = NULL,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      formId
    ]
  );

  return selectCurrentReviewForm(executor, projectId, nodeKey);
}

async function saveReviewFormVersion(executor, {
  projectId,
  nodeKey,
  reviewType,
  nodeRevision,
  currentFormRow,
  formStatus,
  formDataJson,
  actorUserId
}) {
  const isSubmit = formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED;
  const generatedFileStatus = isSubmit
    ? SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATING
    : SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED;
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  const generatedFileTemplateName = isSubmit ? definition?.templateName ?? null : null;
  const generatedByUserId = isSubmit ? actorUserId : null;
  const generationErrorMessage = null;
  const canUpdateCurrentDraft =
    currentFormRow?.form_status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.DRAFT &&
    Number(currentFormRow.revision ?? 0) >= Number(nodeRevision ?? 1);

  if (canUpdateCurrentDraft) {
    return updateReviewForm(executor, {
      formId: currentFormRow.id,
      projectId,
      nodeKey,
      formStatus,
      formDataJson,
      actorUserId,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage
    });
  }

  await deactivateCurrentReviewForm(executor, projectId, nodeKey);
  const maxRevision = await selectMaxReviewFormRevision(executor, projectId, nodeKey);
  const nextRevision = Math.max(maxRevision + 1, Number(nodeRevision ?? 1));
  return insertReviewForm(executor, {
    projectId,
    nodeKey,
    reviewType,
    revision: nextRevision,
    formStatus,
    formDataJson,
    actorUserId,
    generatedFileStatus,
    generatedFileTemplateName,
    generatedByUserId,
    generationErrorMessage
  });
}

async function deactivateCurrentQuotationForm(executor, projectId) {
  await executor.execute(
    `UPDATE project_solution_design_quotation_forms
    SET is_current = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND is_current = 1`,
    [projectId]
  );
}

async function insertQuotationForm(executor, {
  projectId,
  revision,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  await executor.execute(
    `INSERT INTO project_solution_design_quotation_forms (
      project_id,
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
      generated_file_template_name,
      generated_at,
      generated_by_user_id,
      generation_error_message,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, 1, ?, ${
      formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'
    }, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?)`,
    [
      projectId,
      revision,
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      actorUserId
    ]
  );

  return selectCurrentQuotationForm(executor, projectId);
}

async function updateQuotationForm(executor, {
  formId,
  projectId,
  formStatus,
  formDataJson,
  actorUserId,
  generatedFileStatus,
  generatedFileTemplateName = null,
  generatedByUserId = null,
  generationErrorMessage = null
}) {
  await executor.execute(
    `UPDATE project_solution_design_quotation_forms
    SET form_status = ?,
      form_data_json = ?,
      submitted_by_user_id = ?,
      submitted_at = ${formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'},
      generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = NULL,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      formStatus,
      formDataJson,
      formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED ? actorUserId : null,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage,
      actorUserId,
      formId
    ]
  );

  return selectCurrentQuotationForm(executor, projectId);
}

async function saveQuotationFormVersion(executor, {
  projectId,
  nodeRevision,
  currentFormRow,
  formStatus,
  formDataJson,
  actorUserId
}) {
  const isSubmit = formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED;
  const generatedFileStatus = isSubmit
    ? SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATING
    : SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED;
  const generatedFileTemplateName = isSubmit ? SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.templateName : null;
  const generatedByUserId = isSubmit ? actorUserId : null;
  const generationErrorMessage = null;
  const canUpdateCurrentDraft =
    currentFormRow?.form_status === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT &&
    Number(currentFormRow.revision ?? 0) >= Number(nodeRevision ?? 1);

  if (canUpdateCurrentDraft) {
    return updateQuotationForm(executor, {
      formId: currentFormRow.id,
      projectId,
      formStatus,
      formDataJson,
      actorUserId,
      generatedFileStatus,
      generatedFileTemplateName,
      generatedByUserId,
      generationErrorMessage
    });
  }

  await deactivateCurrentQuotationForm(executor, projectId);
  const maxRevision = await selectMaxQuotationFormRevision(executor, projectId);
  const nextRevision = Math.max(maxRevision + 1, Number(nodeRevision ?? 1));
  return insertQuotationForm(executor, {
    projectId,
    revision: nextRevision,
    formStatus,
    formDataJson,
    actorUserId,
    generatedFileStatus,
    generatedFileTemplateName,
    generatedByUserId,
    generationErrorMessage
  });
}

async function markAnalysisFormGenerated(executor, {
  formId,
  storageKey,
  fileName,
  mimeType,
  fileSize,
  templateName,
  generatedByUserId
}) {
  await executor.execute(
    `UPDATE project_solution_design_analysis_forms
    SET generated_file_status = ?,
      generated_file_storage_key = ?,
      generated_file_name = ?,
      generated_file_mime_type = ?,
      generated_file_size = ?,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED,
      storageKey,
      fileName,
      mimeType,
      fileSize,
      templateName,
      generatedByUserId,
      generatedByUserId,
      formId
    ]
  );
}

async function markAnalysisFormGenerationFailed(executor, {
  formId,
  templateName,
  generatedByUserId,
  errorMessage
}) {
  await executor.execute(
    `UPDATE project_solution_design_analysis_forms
    SET generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED,
      templateName,
      generatedByUserId,
      String(errorMessage || 'Solution design generated file failed').slice(0, 1000),
      generatedByUserId,
      formId
    ]
  );
}

async function markReviewFormGenerated(executor, {
  formId,
  storageKey,
  fileName,
  mimeType,
  fileSize,
  templateName,
  generatedByUserId
}) {
  await executor.execute(
    `UPDATE project_solution_design_review_forms
    SET generated_file_status = ?,
      generated_file_storage_key = ?,
      generated_file_name = ?,
      generated_file_mime_type = ?,
      generated_file_size = ?,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED,
      storageKey,
      fileName,
      mimeType,
      fileSize,
      templateName,
      generatedByUserId,
      generatedByUserId,
      formId
    ]
  );
}

async function markReviewFormGenerationFailed(executor, {
  formId,
  templateName,
  generatedByUserId,
  errorMessage
}) {
  await executor.execute(
    `UPDATE project_solution_design_review_forms
    SET generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED,
      templateName,
      generatedByUserId,
      String(errorMessage || 'Solution design generated file failed').slice(0, 1000),
      generatedByUserId,
      formId
    ]
  );
}

async function markQuotationFormGenerated(executor, {
  formId,
  storageKey,
  fileName,
  mimeType,
  fileSize,
  templateName,
  generatedByUserId
}) {
  await executor.execute(
    `UPDATE project_solution_design_quotation_forms
    SET generated_file_status = ?,
      generated_file_storage_key = ?,
      generated_file_name = ?,
      generated_file_mime_type = ?,
      generated_file_size = ?,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED,
      storageKey,
      fileName,
      mimeType,
      fileSize,
      templateName,
      generatedByUserId,
      generatedByUserId,
      formId
    ]
  );
}

async function markQuotationFormGenerationFailed(executor, {
  formId,
  templateName,
  generatedByUserId,
  errorMessage
}) {
  await executor.execute(
    `UPDATE project_solution_design_quotation_forms
    SET generated_file_status = ?,
      form_status = ?,
      submitted_by_user_id = NULL,
      submitted_at = NULL,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = CURRENT_TIMESTAMP,
      generated_by_user_id = ?,
      generation_error_message = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED,
      SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT,
      templateName,
      generatedByUserId,
      String(errorMessage || 'Solution design quotation file generation failed').slice(0, 1000),
      generatedByUserId,
      formId
    ]
  );
}

async function generateAndPersistAnalysisFormFile(executor, {
  projectRow,
  formRow,
  actorUserId,
  storage,
  roleState,
  stageDocumentRow,
  readOnlineFormImage
}) {
  const generation = await generateSolutionDesignFormFile({
    executor,
    projectRow,
    definition: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION,
    formRow,
    actorUserId,
    storage,
    roleState,
    stageDocumentRow,
    readOnlineFormImage
  });

  if (generation.success) {
    await markAnalysisFormGenerated(executor, {
      formId: formRow.id,
      storageKey: generation.storageKey,
      fileName: generation.fileName,
      mimeType: generation.mimeType,
      fileSize: generation.fileSize,
      templateName: generation.templateName,
      generatedByUserId: actorUserId
    });
  } else {
    await markAnalysisFormGenerationFailed(executor, {
      formId: formRow.id,
      templateName: generation.templateName,
      generatedByUserId: actorUserId,
      errorMessage: generation.errorMessage
    });
  }

  const refreshed = await selectCurrentAnalysisForm(executor, projectRow.id);
  await insertAnalysisFormGeneratedFileLog(executor, {
    projectId: projectRow.id,
    actorUserId,
    formRow: refreshed,
    success: generation.success
  });
  return refreshed;
}

async function generateAndPersistReviewFormFile(executor, {
  projectRow,
  definition,
  formRow,
  actorUserId,
  storage,
  roleState
}) {
  const generation = await generateSolutionDesignFormFile({
    executor,
    projectRow,
    definition,
    formRow,
    actorUserId,
    storage,
    roleState
  });

  if (generation.success) {
    await markReviewFormGenerated(executor, {
      formId: formRow.id,
      storageKey: generation.storageKey,
      fileName: generation.fileName,
      mimeType: generation.mimeType,
      fileSize: generation.fileSize,
      templateName: generation.templateName,
      generatedByUserId: actorUserId
    });
  } else {
    await markReviewFormGenerationFailed(executor, {
      formId: formRow.id,
      templateName: generation.templateName,
      generatedByUserId: actorUserId,
      errorMessage: generation.errorMessage
    });
  }

  const refreshed = await selectCurrentReviewForm(executor, projectRow.id, definition.nodeKey);
  await insertReviewFormGeneratedFileLog(executor, {
    projectId: projectRow.id,
    actorUserId,
    formRow: refreshed,
    success: generation.success
  });
  return refreshed;
}

async function generateAndPersistQuotationFormFile(executor, {
  projectRow,
  formRow,
  actorUserId,
  storage
}) {
  const generation = await generateSolutionDesignQuotationFormFile({
    projectRow,
    formRow,
    storage
  });

  if (generation.success) {
    await markQuotationFormGenerated(executor, {
      formId: formRow.id,
      storageKey: generation.storageKey,
      fileName: generation.fileName,
      mimeType: generation.mimeType,
      fileSize: generation.fileSize,
      templateName: generation.templateName,
      generatedByUserId: actorUserId
    });
  } else {
    await markQuotationFormGenerationFailed(executor, {
      formId: formRow.id,
      templateName: generation.templateName,
      generatedByUserId: actorUserId,
      errorMessage: generation.errorMessage
    });
  }

  return selectCurrentQuotationForm(executor, projectRow.id);
}

async function replaceCurrentSlotFile(executor, { projectId, slotRow, slot, uploadFile, storageKey, userId }) {
  const currentFiles = await selectCurrentUploadFiles(executor, projectId, [slot.slotKey]);
  const currentRevision = Math.max(
    Number(slotRow.revision ?? 0),
    ...currentFiles.map((file) => Number(file.revision ?? 0))
  );
  const nextRevision = currentFiles.length > 0 ? currentRevision + 1 : 1;

  await executor.execute(
    `UPDATE project_solution_design_upload_files
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, slot.slotKey]
  );

  const [result] = await executor.execute(
    `INSERT INTO project_solution_design_upload_files (
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
    `UPDATE project_solution_design_upload_slots
    SET status = ?,
      revision = ?,
      is_upload_exempted = 0,
      exemption_reason = NULL,
      exempted_by_user_id = NULL,
      exempted_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED, nextRevision, slotRow.id]
  );

  return selectUploadFileWithUploader(executor, result.insertId);
}

async function updateNodeApprovedAndActivateNext(executor, { projectId, nodeKey, nextNodeKey, userId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      nodeKey,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution design node status changed before submit',
      409,
      {
        nodeKey,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }

  if (nextNodeKey) {
    await executor.execute(
      `UPDATE project_solution_design_nodes
      SET status = ?,
        activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND node_key = ?
        AND status IN (?, ?)`,
      [
        SOLUTION_DESIGN_NODE_STATUS.PENDING,
        projectId,
        nextNodeKey,
        SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
        SOLUTION_DESIGN_NODE_STATUS.RETURNED
      ]
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_upload_slots
    SET status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?`,
    [SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED, userId, projectId, nodeKey]
  );
}

async function updateAnalysisNodePendingReview(executor, { projectId, userId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution analysis node status changed before submit',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_upload_slots
    SET status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?`,
    [
      SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED,
      userId,
      projectId,
      SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM
    ]
  );
}

async function updateReviewNodePendingReview(executor, { projectId, nodeKey }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
      projectId,
      nodeKey,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution review node status changed before submit',
      409,
      {
        nodeKey,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }
}

async function updateCostNodePendingReview(executor, { projectId, nodeKey, slotKey, userId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
      projectId,
      nodeKey,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution cost estimation node status changed before submit',
      409,
      {
        nodeKey,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_upload_slots
    SET status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?`,
    [
      SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED,
      userId,
      projectId,
      slotKey
    ]
  );
}

async function approveAnalysisNodeAndActivateDesign(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution analysis node cannot be approved in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW]
      }
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.DESIGN,
      SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );
}

async function approveReviewNodeAndActivateNext(executor, { projectId, nodeKey, nextNodeKey }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      nodeKey,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution review node cannot be approved in its current status',
      409,
      {
        nodeKey,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW]
      }
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      projectId,
      nextNodeKey,
      SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );
}

async function approveFinanceCostByFinanceOwner(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Finance cost estimation node cannot enter general manager review in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW]
      }
    );
  }
}

async function approveFinanceCostByGeneralManager(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Finance cost estimation node cannot be approved by general manager in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW]
      }
    );
  }

  await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );
}

async function upsertQuotationTenderBranchSelection(executor, {
  projectId,
  branchType,
  nodeRevision,
  actorUserId,
  existingFlow
}) {
  if (existingFlow) {
    await executor.execute(
      `UPDATE project_solution_design_quotation_tender_flows
      SET branch_type = ?,
        branch_status = ?,
        selected_by_user_id = ?,
        selected_at = CURRENT_TIMESTAMP,
        quotation_result = NULL,
        quotation_rejected_action = NULL,
        return_reason = NULL,
        revision = ?,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?`,
      [
        branchType,
        SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
        actorUserId,
        nodeRevision,
        actorUserId,
        projectId
      ]
    );
    return;
  }

  await executor.execute(
    `INSERT INTO project_solution_design_quotation_tender_flows (
      project_id,
      branch_type,
      branch_status,
      selected_by_user_id,
      quotation_result,
      quotation_rejected_action,
      return_reason,
      revision,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
    [
      projectId,
      branchType,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      actorUserId,
      nodeRevision,
      actorUserId,
      actorUserId
    ]
  );
}

async function insertQuotationTenderBranchSelectionLog(executor, {
  projectId,
  branchType,
  nodeRevision,
  actorUserId
}) {
  await insertQuotationTenderLog(executor, {
    projectId,
    actorUserId,
    actionType: branchType === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
      ? OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_BRANCH_SELECTED
      : OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_BRANCH_SELECTED,
    summary: branchType === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
      ? '总经理选择报价流程'
      : '总经理选择投标流程',
    details: {
      branchType,
      revision: Number(nodeRevision ?? 1)
    }
  });
}

async function updateQuotationSubmitted(executor, { projectId, actorUserId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      quotation_result = NULL,
      quotation_rejected_action = NULL,
      return_reason = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status IN (?, ?)`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation branch cannot be submitted in its current status',
      409,
      ['quotation']
    );
  }
}

async function markQuotationSlotSubmitted(executor, { projectId, userId }) {
  await executor.execute(
    `UPDATE project_solution_design_upload_slots
    SET status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?`,
    [
      SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED,
      userId,
      projectId,
      SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE
    ]
  );
}

async function approveQuotationTenderNode(executor, { projectId, expectedStatus }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      expectedStatus
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation/tender node cannot be approved in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        allowedStatuses: [expectedStatus]
      }
    );
  }
}

async function acceptQuotation(executor, { projectId, actorUserId }) {
  await approveQuotationTenderNode(executor, {
    projectId,
    expectedStatus: SOLUTION_DESIGN_NODE_STATUS.PENDING
  });

  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      quotation_result = ?,
      quotation_rejected_action = NULL,
      return_reason = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status = ?`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.ACCEPTED,
      SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation branch cannot be accepted in its current status',
      409,
      ['quotation']
    );
  }
}

async function getNextQuotationTenderNodeRevisionAfterReturn(executor, projectId) {
  const nodeRow = await selectSolutionDesignNodeForUpdate(
    executor,
    projectId,
    SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
  );
  const files = await selectCurrentUploadFiles(executor, projectId, [
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
    ...SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS
  ]);
  const maxFileRevision = files.reduce(
    (max, file) => Math.max(max, Number(file.revision ?? 0)),
    0
  );
  const maxQuotationFormRevision = await selectMaxQuotationFormRevision(executor, projectId);
  return Math.max(Number(nodeRow?.current_revision ?? 1), maxFileRevision, maxQuotationFormRevision) + 1;
}

async function returnQuotationTenderNode(executor, { projectId, returnReason, expectedStatus }) {
  const nextRevision = await getNextQuotationTenderNodeRevisionAfterReturn(executor, projectId);
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      nextRevision,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      expectedStatus
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation/tender node cannot be returned in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        allowedStatuses: [expectedStatus]
      }
    );
  }

  return nextRevision;
}

async function rejectQuotationToRdCost(executor, { projectId, returnReason, actorUserId }) {
  await returnQuotationTenderNode(executor, {
    projectId,
    returnReason,
    expectedStatus: SOLUTION_DESIGN_NODE_STATUS.PENDING
  });
  await returnFinanceCostToRdCost(executor, { projectId, returnReason });
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      quotation_result = ?,
      quotation_rejected_action = ?,
      return_reason = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status = ?`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.REJECTED,
      SOLUTION_DESIGN_QUOTATION_RESULT.REJECTED,
      SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST,
      returnReason,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation branch cannot be rejected in its current status',
      409,
      ['quotation']
    );
  }
}

async function rejectQuotationAndEndProject(executor, { projectId, returnReason, actorUserId }) {
  const [nodeUpdateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.ENDED,
      returnReason,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(nodeUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation/tender node cannot end project in its current status',
      409,
      [SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER]
    );
  }

  const [flowUpdateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      quotation_result = ?,
      quotation_rejected_action = ?,
      return_reason = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status = ?`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.ENDED,
      SOLUTION_DESIGN_QUOTATION_RESULT.REJECTED,
      SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.END_PROJECT,
      returnReason,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
    ]
  );

  if (Number(flowUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation branch cannot end project in its current status',
      409,
      ['quotation']
    );
  }

  await executor.execute(
    `UPDATE projects
    SET status = ?
    WHERE id = ?`,
    [PROJECT_STATUS.ENDED, projectId]
  );
}

async function updateQuotationTenderNodePendingReview(executor, { projectId, userId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      submitted_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      SOLUTION_DESIGN_NODE_STATUS.PENDING,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Tender node status changed before submit',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }

  for (const slotKey of SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS) {
    await executor.execute(
      `UPDATE project_solution_design_upload_slots
      SET status = ?,
        submitted_by_user_id = ?,
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND slot_key = ?`,
      [
        SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED,
        userId,
        projectId,
        slotKey
      ]
    );
  }

  const [flowUpdateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status IN (?, ?)`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.PENDING_REVIEW,
      userId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED
    ]
  );

  if (Number(flowUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Tender branch cannot be submitted in its current status',
      409,
      ['tender']
    );
  }
}

async function approveTender(executor, { projectId, actorUserId }) {
  await approveQuotationTenderNode(executor, {
    projectId,
    expectedStatus: SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  });

  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      return_reason = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status = ?`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.APPROVED,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Tender branch cannot be approved in its current status',
      409,
      ['tender']
    );
  }
}

async function returnTender(executor, { projectId, returnReason, actorUserId }) {
  const nextRevision = await returnQuotationTenderNode(executor, {
    projectId,
    returnReason,
    expectedStatus: SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  });

  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_quotation_tender_flows
    SET branch_status = ?,
      return_reason = ?,
      revision = ?,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND branch_type = ?
      AND branch_status = ?`,
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED,
      returnReason,
      nextRevision,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Tender branch cannot be returned in its current status',
      409,
      ['tender']
    );
  }
}

async function returnAnalysisNode(executor, { projectId, returnReason }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = current_revision + 1,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution analysis node cannot be returned in its current status',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW]
      }
    );
  }
}

async function getNextReviewNodeRevisionAfterReturn(executor, projectId, nodeKey) {
  const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
  const maxFormRevision = await selectMaxReviewFormRevision(executor, projectId, nodeKey);
  return Math.max(Number(nodeRow?.current_revision ?? 1), maxFormRevision) + 1;
}

async function getNextDesignNodeRevisionAfterReviewReturn(executor, projectId) {
  const nodeRow = await selectSolutionDesignNodeForUpdate(
    executor,
    projectId,
    SOLUTION_DESIGN_NODE_KEY.DESIGN
  );
  const files = await selectCurrentUploadFiles(executor, projectId, SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS);
  const maxFileRevision = files.reduce(
    (max, file) => Math.max(max, Number(file.revision ?? 0)),
    0
  );
  return Math.max(Number(nodeRow?.current_revision ?? 1), maxFileRevision) + 1;
}

async function getNextCostNodeRevisionAfterReturn(executor, projectId, nodeKey) {
  const slotKey = getCostUploadSlotKeyForNode(nodeKey);
  const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
  const files = slotKey ? await selectCurrentUploadFiles(executor, projectId, [slotKey]) : [];
  const maxFileRevision = files.reduce(
    (max, file) => Math.max(max, Number(file.revision ?? 0)),
    0
  );
  return Math.max(Number(nodeRow?.current_revision ?? 1), maxFileRevision) + 1;
}

async function returnCostNode(executor, { projectId, nodeKey, returnReason, expectedStatus }) {
  const nextRevision = await getNextCostNodeRevisionAfterReturn(executor, projectId, nodeKey);
  const [updateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      nextRevision,
      projectId,
      nodeKey,
      expectedStatus
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution cost estimation node cannot be returned in its current status',
      409,
      {
        nodeKey,
        allowedStatuses: [expectedStatus]
      }
    );
  }
}

async function returnFinanceCostToRdCost(executor, { projectId, returnReason }) {
  const nodeKeys = [
    SOLUTION_DESIGN_NODE_KEY.RD_COST,
    SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
    SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
    SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
  ];

  for (const costNodeKey of nodeKeys) {
    const nextRevision = await getNextCostNodeRevisionAfterReturn(executor, projectId, costNodeKey);
    const [updateResult] = await executor.execute(
      `UPDATE project_solution_design_nodes
      SET status = ?,
        return_reason = ?,
        current_revision = ?,
        returned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND node_key = ?
        AND status IN (?, ?, ?, ?)`,
      [
        SOLUTION_DESIGN_NODE_STATUS.RETURNED,
        returnReason,
        nextRevision,
        projectId,
        costNodeKey,
        SOLUTION_DESIGN_NODE_STATUS.APPROVED,
        SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
        SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW,
        SOLUTION_DESIGN_NODE_STATUS.RETURNED
      ]
    );

    if (Number(updateResult?.affectedRows ?? 0) !== 1) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Solution cost estimation workflow cannot be returned to RD cost estimation',
        409,
        {
          nodeKey: costNodeKey,
          allowedStatuses: [
            SOLUTION_DESIGN_NODE_STATUS.APPROVED,
            SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
            SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW,
            SOLUTION_DESIGN_NODE_STATUS.RETURNED
          ]
        }
      );
    }
  }
}

async function returnReviewNodeToSolutionDesign(executor, { projectId, nodeKey, returnReason }) {
  const nextReviewRevision = await getNextReviewNodeRevisionAfterReturn(executor, projectId, nodeKey);
  const nextDesignRevision = await getNextDesignNodeRevisionAfterReviewReturn(executor, projectId);
  const [reviewUpdateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      SOLUTION_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      nextReviewRevision,
      projectId,
      nodeKey,
      SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    ]
  );

  if (Number(reviewUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution review node cannot be returned in its current status',
      409,
      {
        nodeKey,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW]
      }
    );
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW) {
    const nextInternalReviewRevision = await getNextReviewNodeRevisionAfterReturn(
      executor,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW
    );
    await executor.execute(
      `UPDATE project_solution_design_nodes
      SET status = ?,
        return_reason = ?,
        current_revision = ?,
        returned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND node_key = ?
        AND status = ?`,
      [
        SOLUTION_DESIGN_NODE_STATUS.RETURNED,
        returnReason,
        nextInternalReviewRevision,
        projectId,
        SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
        SOLUTION_DESIGN_NODE_STATUS.APPROVED
      ]
    );
  }

  const [designUpdateResult] = await executor.execute(
    `UPDATE project_solution_design_nodes
    SET status = ?,
      return_reason = ?,
      current_revision = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      SOLUTION_DESIGN_NODE_STATUS.RETURNED,
      returnReason,
      nextDesignRevision,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.DESIGN,
      SOLUTION_DESIGN_NODE_STATUS.APPROVED,
      SOLUTION_DESIGN_NODE_STATUS.RETURNED
    ]
  );

  if (Number(designUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution design node cannot be returned for review resubmission',
      409,
      {
        nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
        allowedStatuses: [SOLUTION_DESIGN_NODE_STATUS.APPROVED, SOLUTION_DESIGN_NODE_STATUS.RETURNED]
      }
    );
  }
}

function getSubmitNodeRoleKey(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (getSolutionDesignReviewFormDefinition(nodeKey)) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.PROCUREMENT_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER;
  }

  return null;
}

function getSubmitNodeNextNodeKey(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return SOLUTION_DESIGN_NODE_KEY.ANALYSIS;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW;
  }

  return null;
}

async function assertSubmitNodeReady(executor, { projectId, nodeKey }) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    const files = await selectCurrentUploadFiles(executor, projectId, [SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN]);
    if (files.length !== 1) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Solution design work plan is required before submitting preparation node',
        409,
        [SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN]
      );
    }
    return;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
    const requiredRevision = Number(nodeRow?.current_revision ?? 1);
    const formRow = await selectCurrentAnalysisForm(executor, projectId);
    const files = await selectCurrentUploadFiles(executor, projectId, [
      SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM
    ]);
    const productFunctionDiagram = files[0] || null;
    const missing = [];

    if (!isAnalysisFormSubmittedForRevision(formRow, requiredRevision)) {
      missing.push('analysis_form');
    } else if (!isAnalysisFormGeneratedForRevision(formRow, requiredRevision)) {
      missing.push('analysis_form_generated_file');
    }

    if (!productFunctionDiagram) {
      missing.push(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM);
    }

    if (missing.length > 0) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current solution analysis form generated file and product function diagram are required before submitting analysis node',
        409,
        missing
      );
    }
    return;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    const slots = await selectSolutionDesignUploadSlots(executor, projectId);
    const currentFileSlotKeys = buildCurrentFileSlotKeySet(slots);
    const exemptedSlotKeys = buildExemptedUploadSlotKeySet(slots);
    const missing = SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.filter(
      (slotKey) => !isSolutionDesignOutputSatisfied(currentFileSlotKeys, exemptedSlotKeys, slotKey)
    );
    if (missing.length > 0) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'All solution design outputs must have a current file or upload exemption before submitting solution design node',
        409,
        missing
      );
    }
    return;
  }

  if (getSolutionDesignReviewFormDefinition(nodeKey)) {
    const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
    const requiredRevision = Number(nodeRow?.current_revision ?? 1);
    const formRow = await selectCurrentReviewForm(executor, projectId, nodeKey);
    if (!isReviewFormSubmittedForRevision(formRow, requiredRevision)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current solution review form is required before submitting review node',
        409,
        ['review_form']
      );
    }
    if (!isReviewFormGeneratedForRevision(formRow, requiredRevision)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current solution review form generated file is required before submitting review node',
        409,
        ['review_form_generated_file']
      );
    }
    return;
  }

  if (isCostEstimationNode(nodeKey)) {
    const slotKey = getCostUploadSlotKeyForNode(nodeKey);
    const files = await selectCurrentUploadFiles(executor, projectId, [slotKey]);
    const currentFile = files[0] || null;

    if (!currentFile) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current cost estimation file is required before submitting cost estimation node',
        409,
        [slotKey]
      );
    }
    return;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
    const requiredRevision = Number(nodeRow?.current_revision ?? 1);
    const flowRow = await selectQuotationTenderFlow(executor, projectId, { forUpdate: true });
    if (!isTenderBranchCurrent(flowRow, nodeRow)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Tender branch must be selected before submitting tender node',
        409,
        ['branchType']
      );
    }

    const files = await selectCurrentUploadFiles(executor, projectId, SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS);
    const uploadedRevisionBySlotKey = new Map(
      files.map((file) => [file.slot_key, Number(file.revision ?? 0)])
    );
    const missing = SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.filter(
      (slotKey) => Number(uploadedRevisionBySlotKey.get(slotKey) ?? 0) < requiredRevision
    );
    if (missing.length > 0) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Tender business and technical files are required before submitting tender node',
        409,
        missing
      );
    }
  }
}

function assertCanDownloadSolutionDesignUploadFile({ slot, roleState, user }) {
  if (!canDownloadUploadFile({ slot, roleState, user })) {
    throw new SolutionDesignWorkflowError(
      isFinanceCostUploadSlot(slot.slotKey)
        ? SOLUTION_DESIGN_ERROR.CONFIDENTIAL_FILE_FORBIDDEN
        : SOLUTION_DESIGN_ERROR.FORBIDDEN,
      'Current user cannot download this solution design upload file',
      403,
      [slot.slotKey]
    );
  }
}

function assertSolutionDesignOutputExemptionSlot(slot) {
  if (!slot || !isSolutionDesignOutputUploadSlot(slot.slotKey)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Only C07-C14 solution design output upload slots can be exempted',
      400,
      ['slotKey']
    );
  }
}

function assertCanManageSolutionDesignOutputExemption({ projectRow, rolesRow, nodeRow, user }) {
  assertProjectWriteAllowed(projectRow);
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  assertAllRolesAssigned(roleState);
  assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER, user);
  assertNodeProcessable(nodeRow, SOLUTION_DESIGN_NODE_KEY.DESIGN, 'processed');
}

async function markUploadSlotExempted(executor, { projectId, slot, reason, actorUserId }) {
  const [result] = await executor.execute(
    `UPDATE project_solution_design_upload_slots
    SET is_upload_exempted = 1,
      exemption_reason = ?,
      exempted_by_user_id = ?,
      exempted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_upload_exempted = 0`,
    [reason, actorUserId, projectId, slot.slotKey]
  );

  if (Number(result?.affectedRows ?? 0) !== 1) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution design output upload exemption cannot be marked in its current state',
      409,
      [slot.slotKey]
    );
  }
}

async function cancelUploadSlotExemption(executor, { projectId, slot }) {
  const [result] = await executor.execute(
    `UPDATE project_solution_design_upload_slots
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
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Solution design output upload exemption cannot be cancelled in its current state',
      409,
      [slot.slotKey]
    );
  }
}

async function withConnection(db, callback) {
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

export async function getSolutionDesignWorkflow({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    return buildWorkflowDtoForProject(connection, { projectRow, user });
  });
}

export async function assignSolutionDesignRoles({ projectId, payload, user }, db = pool) {
  const normalizedPayload = normalizeSolutionDesignRoleAssignmentPayload(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertCanAssignRoles(projectRow, user);

    const usersById = await selectAssignableUsers(connection, normalizedPayload);
    const existingRolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);

    await insertRoleHistory(connection, {
      projectRow,
      existingRolesRow,
      normalizedPayload,
      changedByUserId: user.id
    });
    await upsertRoles(connection, {
      projectId,
      normalizedPayload,
      userId: user.id,
      existingRolesRow
    });
    await updateProjectManager(connection, {
      projectId,
      projectManagerUserId: normalizedPayload.projectManagerUserId,
      usersById
    });
    await ensureSolutionDesignNodes(connection, projectRow);
    await insertRolesAssignedLog(connection, {
      projectRow,
      normalizedPayload,
      actorUserId: user.id
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function selectSolutionDesignQuotationTenderBranch({ projectId, payload, user }, db = pool) {
  const branchType = normalizeQuotationTenderBranchType(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);

    const nodeRow = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    );
    const existingFlow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
    if (isQuotationTenderFlowCurrentForNode(existingFlow, nodeRow)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Quotation/tender branch has already been selected during finance cost approval',
        409,
        {
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          branchType: existingFlow?.branch_type ?? null,
          branchStatus: existingFlow?.branch_status ?? null,
          nodeStatus: nodeRow?.status ?? null
        }
      );
    }
    if (
      !canSelectQuotationTenderBranch({
        projectEnded: isSolutionDesignProjectEnded(projectRow),
        inSolutionStage: isProjectInSolutionDesignStage(projectRow),
        user,
        nodeRow,
        flowRow: existingFlow
      })
    ) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Quotation/tender branch cannot be selected in current status',
        409,
        {
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          branchType: existingFlow?.branch_type ?? null,
          branchStatus: existingFlow?.branch_status ?? null,
          nodeStatus: nodeRow?.status ?? null
        }
      );
    }

    await upsertQuotationTenderBranchSelection(connection, {
      projectId,
      branchType,
      nodeRevision: Number(nodeRow.current_revision ?? 1),
      actorUserId: user.id,
      existingFlow
    });
    await insertQuotationTenderBranchSelectionLog(connection, {
      projectId,
      branchType,
      nodeRevision: nodeRow.current_revision,
      actorUserId: user.id
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function getSolutionDesignQuotationForm({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);
    const quotationNode = getNodeByKey(nodes, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
    const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId);
    const quotationFormRow = await selectCurrentQuotationForm(connection, projectId);

    return buildQuotationFormDto({
      projectRow,
      quotationNode,
      quotationTenderFlow,
      quotationFormRow,
      permissions: buildQuotationFormPermissions({
        projectRow,
        quotationNode,
        rolesRow,
        user,
        quotationTenderFlow,
        quotationFormRow
      }),
      isProjectEnded: isSolutionDesignProjectEnded(projectRow)
    });
  });
}

async function saveOrSubmitSolutionDesignQuotationForm(
  { projectId, payload, user, formStatus },
  db = pool,
  generatedFileStorage = null
) {
  const isSubmit = formStatus === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED;
  const normalized = normalizeQuotationFormPayload(payload, { requireComplete: isSubmit });
  const storage = resolveGeneratedFileStorage(db, generatedFileStorage);

  const outcome = await withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER, user);

    const quotationNode = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    );
    assertNodeProcessable(quotationNode, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER, 'processed');
    const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
    if (!canProcessQuotationForm({
      projectEnded: isSolutionDesignProjectEnded(projectRow),
      inSolutionStage: isProjectInSolutionDesignStage(projectRow),
      roleState,
      user,
      nodeRow: quotationNode,
      flowRow: quotationTenderFlow
    })) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Quotation online form cannot be processed in current branch status',
        409,
        {
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          branchType: quotationTenderFlow?.branch_type ?? null,
          branchStatus: quotationTenderFlow?.branch_status ?? null,
          nodeStatus: quotationNode?.status ?? null
        }
      );
    }

    const currentFormRow = await selectCurrentQuotationForm(connection, projectId, { forUpdate: true });
    let savedFormRow = await saveQuotationFormVersion(connection, {
      projectId,
      nodeRevision: quotationNode.current_revision,
      currentFormRow,
      formStatus,
      formDataJson: normalized.formDataJson,
      actorUserId: user.id
    });
    let generationFailureError = null;

    if (isSubmit) {
      savedFormRow = await generateAndPersistQuotationFormFile(connection, {
        projectRow,
        formRow: savedFormRow,
        actorUserId: user.id,
        storage
      });

      if (isQuotationFormGeneratedForRevision(savedFormRow, quotationNode.current_revision)) {
        await updateQuotationSubmitted(connection, { projectId, actorUserId: user.id });
        await insertQuotationTenderLog(connection, {
          projectId,
          actorUserId: user.id,
          actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_SUBMITTED,
          summary: '商务负责人提交报价单',
          details: {
            branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
            revision: Number(savedFormRow.revision ?? 1),
            formId: savedFormRow.id,
            documentCode: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode,
            generatedFileName: savedFormRow.generated_file_name
          }
        });
      } else {
        const failureMessage = savedFormRow?.generation_error_message ||
          'Solution design quotation file generation failed';
        generationFailureError = new SolutionDesignWorkflowError(
          SOLUTION_DESIGN_ERROR.GENERATED_FILE_GENERATION_FAILED,
          `Solution design quotation file generation failed: ${failureMessage}`,
          500,
          {
            nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
            formId: savedFormRow?.id ?? null,
            generatedFileStatus: savedFormRow?.generated_file_status ?? null
          }
        );
      }
    }

    const refreshedFlow = await selectQuotationTenderFlow(connection, projectId);
    const dto = buildQuotationFormDto({
      projectRow,
      quotationNode,
      quotationTenderFlow: refreshedFlow,
      quotationFormRow: savedFormRow,
      permissions: buildQuotationFormPermissions({
        projectRow,
        quotationNode,
        rolesRow,
        user,
        quotationTenderFlow: refreshedFlow,
        quotationFormRow: savedFormRow
      }),
      isProjectEnded: isSolutionDesignProjectEnded(projectRow)
    });

    return { dto, generationFailureError };
  });

  if (outcome.generationFailureError) {
    throw outcome.generationFailureError;
  }

  return outcome.dto;
}

export async function saveSolutionDesignQuotationForm({ projectId, payload, user }, db = pool) {
  return saveOrSubmitSolutionDesignQuotationForm(
    {
      projectId,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT
    },
    db
  );
}

export async function submitSolutionDesignQuotationForm(
  { projectId, payload, user },
  db = pool,
  generatedFileStorage = null
) {
  return saveOrSubmitSolutionDesignQuotationForm(
    {
      projectId,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED
    },
    db,
    generatedFileStorage
  );
}

export async function submitSolutionDesignQuotation({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER, user);

    const nodeRow = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    );
    assertNodeProcessable(nodeRow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER, 'submitted');
    const flowRow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
    const quotationFormRow = await selectCurrentQuotationForm(connection, projectId, { forUpdate: true });
    if (
      !isQuotationBranchCurrent(flowRow, nodeRow) ||
      ![
        SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
        SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
      ].includes(flowRow.branch_status) ||
      !isQuotationFormGeneratedForRevision(quotationFormRow, nodeRow.current_revision)
    ) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current quotation online form generated file is required before submitting quotation',
        409,
        ['quotation_form_generated_file']
      );
    }

    const shouldLogSubmission =
      flowRow.branch_status !== SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED;
    await updateQuotationSubmitted(connection, { projectId, actorUserId: user.id });
    if (shouldLogSubmission) {
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_SUBMITTED,
        summary: '商务负责人提交报价单',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
          revision: Number(quotationFormRow.revision ?? 1),
          formId: quotationFormRow.id,
          documentCode: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode,
          generatedFileName: quotationFormRow.generated_file_name
        }
      });
    }

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function processSolutionDesignQuotationResult({ projectId, payload, user }, db = pool) {
  const normalized = normalizeQuotationResultPayload(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER, user);

    const nodeRow = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    );
    assertNodeProcessable(nodeRow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER, 'processed');
    const flowRow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
    const quotationFormRow = await selectCurrentQuotationForm(connection, projectId, { forUpdate: true });
    if (!canProcessQuotationResult({
      projectEnded: isSolutionDesignProjectEnded(projectRow),
      inSolutionStage: isProjectInSolutionDesignStage(projectRow),
      roleState,
      user,
      nodeRow,
      flowRow
    })) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Quotation result cannot be processed before quotation is submitted',
        409,
        ['quotation']
      );
    }
    if (!isQuotationFormGeneratedForRevision(quotationFormRow, nodeRow.current_revision)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Current quotation online form generated file is required before processing quotation result',
        409,
        ['quotation_form_generated_file']
      );
    }

    if (normalized.result === SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED) {
      await acceptQuotation(connection, { projectId, actorUserId: user.id });
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED,
        summary: '商务负责人确认报价被客户接受',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
          quotationResult: normalized.result
        }
      });
      await insertReadyForContractLog(connection, {
        projectId,
        actorUserId: user.id,
        sourceAction: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED
      });
      await tryAutoAdvanceProjectStage(
        {
          projectId,
          user,
          triggerAction: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED,
          expectedStageOrder: projectRow.current_stage_order,
          triggerMetadata: {
            nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
            branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
            stageOrder: projectRow.current_stage_order,
            actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED
          }
        },
        connection
      );
    } else if (normalized.action === SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST) {
      await rejectQuotationToRdCost(connection, {
        projectId,
        returnReason: normalized.returnReason,
        actorUserId: user.id
      });
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_RETURN_RD_COST,
        summary: '商务负责人确认报价未被客户接受，退回研发成本估算',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
          quotationResult: normalized.result,
          quotationRejectedAction: normalized.action,
          returnReason: normalized.returnReason,
          returnToNodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
          resubmitScope: SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS,
          affectedNodeKeys: [
            SOLUTION_DESIGN_NODE_KEY.RD_COST,
            SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
            SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
            SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
            SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
          ]
        }
      });
    } else {
      await rejectQuotationAndEndProject(connection, {
        projectId,
        returnReason: normalized.returnReason,
        actorUserId: user.id
      });
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_PROJECT_ENDED,
        summary: '商务负责人确认报价未被客户接受，项目结束',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
          quotationResult: normalized.result,
          quotationRejectedAction: normalized.action,
          returnReason: normalized.returnReason,
          projectStatus: PROJECT_STATUS.ENDED
        }
      });
      await insertOperationLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.PROJECT_ENDED,
        targetType: OPERATION_TARGET_TYPE.PROJECT,
        targetId: projectId,
        summary: '报价未被客户接受，项目结束',
        details: {
          sourceAction: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_PROJECT_ENDED,
          returnReason: normalized.returnReason
        }
      });
    }

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function listSolutionDesignUploads({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const slots = await ensureSolutionDesignUploadSlots(connection, projectRow);
    const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId);

    return buildUploadsDto({
      projectRow,
      slots,
      nodes,
      rolesRow,
      quotationTenderFlow,
      user
    });
  });
}

export async function markSolutionDesignUploadExemption({ projectId, slotKey, payload = {}, user }, db = pool) {
  const slot = getSolutionDesignUploadSlotDefinition(slotKey);
  assertSolutionDesignOutputExemptionSlot(slot);
  const reason = normalizeUploadExemptionReason(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);
    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const designNode = await selectSolutionDesignNodeForUpdate(connection, projectId, SOLUTION_DESIGN_NODE_KEY.DESIGN);
    assertCanManageSolutionDesignOutputExemption({ projectRow, rolesRow, nodeRow: designNode, user });
    const slotRow = await selectUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Solution design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }
    const currentFiles = await selectCurrentUploadFiles(connection, projectId, [slot.slotKey]);
    if (currentFiles.length > 0) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Solution design output already has a current file and cannot be exempted',
        409,
        [slot.slotKey]
      );
    }

    await markUploadSlotExempted(connection, {
      projectId,
      slot,
      reason,
      actorUserId: user.id
    });
    await insertUploadExemptionLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      reason,
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTED,
      summary: `标记无需上传：${slot.slotName}`
    });

    const nodes = await selectSolutionDesignNodes(connection, projectId);
    const slots = await selectSolutionDesignUploadSlots(connection, projectId);
    const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId);
    return buildUploadsDto({
      projectRow,
      slots,
      nodes,
      rolesRow,
      quotationTenderFlow,
      user
    });
  });
}

export async function cancelSolutionDesignUploadExemption({ projectId, slotKey, user }, db = pool) {
  const slot = getSolutionDesignUploadSlotDefinition(slotKey);
  assertSolutionDesignOutputExemptionSlot(slot);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);
    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const designNode = await selectSolutionDesignNodeForUpdate(connection, projectId, SOLUTION_DESIGN_NODE_KEY.DESIGN);
    assertCanManageSolutionDesignOutputExemption({ projectRow, rolesRow, nodeRow: designNode, user });
    const slotRow = await selectUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Solution design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }
    const reason = slotRow.exemption_reason ?? null;
    await cancelUploadSlotExemption(connection, { projectId, slot });
    await insertUploadExemptionLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      reason,
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED,
      summary: `取消无需上传：${slot.slotName}`
    });

    const nodes = await selectSolutionDesignNodes(connection, projectId);
    const slots = await selectSolutionDesignUploadSlots(connection, projectId);
    const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId);
    return buildUploadsDto({
      projectRow,
      slots,
      nodes,
      rolesRow,
      quotationTenderFlow,
      user
    });
  });
}

export async function getSolutionDesignUploadDownload(
  { projectId, slotKey, user },
  db = pool,
  storage = defaultSolutionDesignUploadStorage
) {
  const slot = getSolutionDesignUploadSlotDefinition(slotKey);
  if (!slot) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Invalid solution design upload slot',
      400,
      ['slotKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertCanDownloadSolutionDesignUploadFile({ slot, roleState, user });
    if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
      const nodes = await ensureSolutionDesignNodes(connection, projectRow);
      const quotationNode = getNodeByKey(nodes, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
      const quotationTenderFlow = await selectQuotationTenderFlow(connection, projectId);
      if (isQuotationBranchCurrent(quotationTenderFlow, quotationNode)) {
        throw new SolutionDesignWorkflowError(
          SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
          'Quotation file upload download is disabled after quotation branch selection; download the generated quotation form instead',
          409,
          [slot.slotKey]
        );
      }
    }

    const fileRow = await selectCurrentUploadFileForDownload(connection, projectId, slot.slotKey);
    if (!fileRow) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Solution design upload file not found',
        404,
        [slot.slotKey]
      );
    }

    let filePath;
    try {
      filePath = await storage.assertFileReadable(fileRow.storage_key);
    } catch {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Solution design upload file is missing from local storage',
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

export async function getSolutionDesignAnalysisForm({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const uploadSlots = await ensureSolutionDesignUploadSlots(connection, projectRow);
    const analysisFormRow = await selectCurrentAnalysisForm(connection, projectId);
    const analysisStageDocumentRow = await selectProjectStageDocumentByAnyCode(
      connection,
      projectId,
      SOLUTION_DESIGN_ANALYSIS_FORM_DOCUMENT_CODES
    );
    const analysisImages = analysisStageDocumentRow
      ? await listStageDocumentOnlineFormImagesForDocument({
          executor: connection,
          projectId,
          documentId: analysisStageDocumentRow.id,
          user,
          project: projectRow,
          document: analysisStageDocumentRow
        })
      : [];

    return buildAnalysisFormDto({
      projectRow,
      nodes,
      rolesRow,
      uploadSlots,
      analysisFormRow,
      user,
      analysisStageDocumentRow,
      analysisImages
    });
  });
}

async function saveOrSubmitSolutionDesignAnalysisForm(
  { projectId, payload, user, formStatus },
  db,
  generatedFileStorage = null
) {
  const normalized = normalizeAnalysisFormPayload(payload);
  if (formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED) {
    assertRequiredSolutionFormFields(
      normalized.formData,
      SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.requiredFieldKeys
    );
  }
  const storage = resolveGeneratedFileStorage(db, generatedFileStorage);
  const readOnlineFormImage = resolveOnlineFormImageReader(db);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER, user);

    const analysisNode = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS
    );
    assertNodeProcessable(analysisNode, SOLUTION_DESIGN_NODE_KEY.ANALYSIS, 'processed');

    const currentFormRow = await selectCurrentAnalysisForm(connection, projectId, { forUpdate: true });
    const analysisStageDocumentRow = await selectProjectStageDocumentByAnyCode(
      connection,
      projectId,
      SOLUTION_DESIGN_ANALYSIS_FORM_DOCUMENT_CODES,
      { forUpdate: true }
    );
    let savedFormRow = await saveAnalysisFormVersion(connection, {
      projectId,
      nodeRevision: analysisNode.current_revision,
      currentFormRow,
      formStatus,
      formDataJson: normalized.formDataJson,
      actorUserId: user.id
    });

    let autoSubmit = null;
    if (formStatus === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED) {
      await insertAnalysisFormLog(connection, {
        projectId,
        actorUserId: user.id,
        formRow: savedFormRow,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_SUBMITTED,
        summary: '提交项目方案分析表'
      });
      const templateUsersById = await selectUsersByIds(connection, collectRoleUserIds(projectRow, rolesRow));
      savedFormRow = await generateAndPersistAnalysisFormFile(connection, {
        projectRow,
        formRow: savedFormRow,
        actorUserId: user.id,
        storage,
        roleState: buildRoleState({ projectRow, rolesRow, usersById: templateUsersById }),
        stageDocumentRow: analysisStageDocumentRow,
        readOnlineFormImage
      });
      if (savedFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED) {
        autoSubmit = await attemptGeneratedFormAutoSubmitNode(connection, {
          projectId,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user,
          projectRow,
          rolesRow
        });
      } else {
        autoSubmit = buildAutoSubmitResult({
          attempted: false,
          submitted: false,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          nodeStatus: analysisNode.status,
          message: 'Solution analysis generated file failed; node was not submitted automatically'
        });
      }
    } else {
      await insertAnalysisFormLog(connection, {
        projectId,
        actorUserId: user.id,
        formRow: savedFormRow,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_SAVED,
        summary: '保存项目方案分析表草稿'
      });
    }

    const refreshedNodes = await selectSolutionDesignNodes(connection, projectId);
    const uploadSlots = await selectSolutionDesignUploadSlots(connection, projectId);
    const analysisImages = analysisStageDocumentRow
      ? await listStageDocumentOnlineFormImagesForDocument({
          executor: connection,
          projectId,
          documentId: analysisStageDocumentRow.id,
          user,
          project: projectRow,
          document: analysisStageDocumentRow
        })
      : [];
    return buildAnalysisFormDto({
      projectRow,
      nodes: refreshedNodes.length > 0 ? refreshedNodes : nodes,
      rolesRow,
      uploadSlots,
      analysisFormRow: savedFormRow,
      user,
      analysisStageDocumentRow,
      analysisImages,
      autoSubmit
    });
  });
}

export async function saveSolutionDesignAnalysisForm({ projectId, payload, user }, db = pool) {
  return saveOrSubmitSolutionDesignAnalysisForm(
    {
      projectId,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT
    },
    db
  );
}

export async function submitSolutionDesignAnalysisForm(
  { projectId, payload, user },
  db = pool,
  generatedFileStorage = null
) {
  return saveOrSubmitSolutionDesignAnalysisForm(
    {
      projectId,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED
    },
    db,
    generatedFileStorage
  );
}

export async function getSolutionDesignReviewForm({ projectId, nodeKey, user }, db = pool) {
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  if (!definition) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_NODE,
      'Invalid solution design review node',
      400,
      ['nodeKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const reviewFormRow = await selectCurrentReviewForm(connection, projectId, definition.nodeKey);

    return buildReviewFormDto({
      projectRow,
      nodes,
      rolesRow,
      reviewFormRow,
      nodeKey: definition.nodeKey,
      user
    });
  });
}

function assertGeneratedFormFileReady({ formRow, nodeRow, detailKey, isGeneratedForRevision }) {
  const requiredRevision = Number(nodeRow?.current_revision ?? 1);
  if (
    !isGeneratedForRevision(formRow, requiredRevision)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND,
      'Current solution design generated file is not available',
      404,
      [detailKey]
    );
  }
}

async function buildGeneratedFormDownload({ formRow, storage, detailKey, fallbackMimeType = GENERATED_XLSX_MIME_TYPE }) {
  try {
    const filePath = await storage.assertFileReadable(formRow.generated_file_storage_key);
    return {
      filePath,
      fileName: formRow.generated_file_name,
      mimeType: formRow.generated_file_mime_type || fallbackMimeType,
      fileSize: Number(formRow.generated_file_size || 0)
    };
  } catch {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.GENERATED_FILE_MISSING,
      'Solution design generated file is missing from local storage',
      404,
      [detailKey]
    );
  }
}

export async function getSolutionDesignAnalysisGeneratedFileDownload(
  { projectId, user },
  db = pool,
  storage = null
) {
  const generatedFileStorage = resolveGeneratedFileStorage(db, storage);
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const analysisNode = getNodeByKey(nodes, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
    const formRow = await selectCurrentAnalysisForm(connection, projectId);
    assertGeneratedFormFileReady({
      formRow,
      nodeRow: analysisNode,
      detailKey: 'analysisFormGeneratedFile',
      isGeneratedForRevision: isAnalysisFormGeneratedForRevision
    });
    return buildGeneratedFormDownload({
      formRow,
      storage: generatedFileStorage,
      detailKey: 'analysisFormGeneratedFile'
    });
  });
}

export async function getSolutionDesignReviewGeneratedFileDownload(
  { projectId, nodeKey, user },
  db = pool,
  storage = null
) {
  const generatedFileStorage = resolveGeneratedFileStorage(db, storage);
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  if (!definition) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_NODE,
      'Invalid solution design review node',
      400,
      ['nodeKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const reviewNode = getNodeByKey(nodes, definition.nodeKey);
    const formRow = await selectCurrentReviewForm(connection, projectId, definition.nodeKey);
    assertGeneratedFormFileReady({
      formRow,
      nodeRow: reviewNode,
      detailKey: `${definition.reviewType}ReviewFormGeneratedFile`,
      isGeneratedForRevision: isReviewFormGeneratedForRevision
    });
    return buildGeneratedFormDownload({
      formRow,
      storage: generatedFileStorage,
      detailKey: `${definition.reviewType}ReviewFormGeneratedFile`
    });
  });
}

export async function getSolutionDesignQuotationGeneratedFileDownload(
  { projectId, user },
  db = pool,
  storage = null
) {
  const generatedFileStorage = resolveGeneratedFileStorage(db, storage);
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    const quotationNode = getNodeByKey(nodes, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
    const formRow = await selectCurrentQuotationForm(connection, projectId);
    assertGeneratedFormFileReady({
      formRow,
      nodeRow: quotationNode,
      detailKey: 'quotationFormGeneratedFile',
      isGeneratedForRevision: isQuotationFormGeneratedForRevision
    });
    return buildGeneratedFormDownload({
      formRow,
      storage: generatedFileStorage,
      detailKey: 'quotationFormGeneratedFile',
      fallbackMimeType: GENERATED_DOCX_MIME_TYPE
    });
  });
}

async function saveOrSubmitSolutionDesignReviewForm(
  { projectId, nodeKey, payload, user, formStatus },
  db,
  generatedFileStorage = null
) {
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  if (!definition) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_NODE,
      'Invalid solution design review node',
      400,
      ['nodeKey']
    );
  }
  const normalized = normalizeReviewFormPayload(payload);
  if (formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
    assertRequiredSolutionFormFields(normalized.formData, definition.requiredFieldKeys);
    assertReviewImplementationPlanItemsComplete(normalized.formData);
  }
  const storage = resolveGeneratedFileStorage(db, generatedFileStorage);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    const nodes = await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER, user);

    const reviewNode = await selectSolutionDesignNodeForUpdate(
      connection,
      projectId,
      definition.nodeKey
    );
    assertNodeProcessable(reviewNode, definition.nodeKey, 'processed');

    const currentFormRow = await selectCurrentReviewForm(connection, projectId, definition.nodeKey, {
      forUpdate: true
    });
    let savedFormRow = await saveReviewFormVersion(connection, {
      projectId,
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType,
      nodeRevision: reviewNode.current_revision,
      currentFormRow,
      formStatus,
      formDataJson: normalized.formDataJson,
      actorUserId: user.id
    });

    const metadata = getReviewFormLogMetadata(definition.nodeKey, formStatus);
    await insertReviewFormLog(connection, {
      projectId,
      actorUserId: user.id,
      formRow: savedFormRow,
      actionType: metadata.actionType,
      summary: metadata.summary
    });

    let autoSubmit = null;
    if (formStatus === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
      const templateUsersById = await selectUsersByIds(connection, collectRoleUserIds(projectRow, rolesRow));
      savedFormRow = await generateAndPersistReviewFormFile(connection, {
        projectRow,
        definition,
        formRow: savedFormRow,
        actorUserId: user.id,
        storage,
        roleState: buildRoleState({ projectRow, rolesRow, usersById: templateUsersById })
      });
      if (savedFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED) {
        autoSubmit = await attemptGeneratedFormAutoSubmitNode(connection, {
          projectId,
          nodeKey: definition.nodeKey,
          user,
          projectRow,
          rolesRow
        });
      } else {
        autoSubmit = buildAutoSubmitResult({
          attempted: false,
          submitted: false,
          nodeKey: definition.nodeKey,
          nodeStatus: reviewNode.status,
          message: 'Solution review generated file failed; node was not submitted automatically'
        });
      }
    }

    const refreshedNodes = await selectSolutionDesignNodes(connection, projectId);
    return buildReviewFormDto({
      projectRow,
      nodes: refreshedNodes.length > 0 ? refreshedNodes : nodes,
      rolesRow,
      reviewFormRow: savedFormRow,
      nodeKey: definition.nodeKey,
      user,
      autoSubmit
    });
  });
}

export async function saveSolutionDesignReviewForm({ projectId, nodeKey, payload, user }, db = pool) {
  return saveOrSubmitSolutionDesignReviewForm(
    {
      projectId,
      nodeKey,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_REVIEW_FORM_STATUS.DRAFT
    },
    db
  );
}

export async function submitSolutionDesignReviewForm(
  { projectId, nodeKey, payload, user },
  db = pool,
  generatedFileStorage = null
) {
  return saveOrSubmitSolutionDesignReviewForm(
    {
      projectId,
      nodeKey,
      payload,
      user,
      formStatus: SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED
    },
    db,
    generatedFileStorage
  );
}

export async function uploadSolutionDesignWorkflowFile(
  { projectId, slotKey, file, user },
  db = pool,
  storage = defaultSolutionDesignUploadStorage
) {
  const slot = getSolutionDesignUploadSlotDefinition(slotKey);
  if (!slot) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
      'Invalid solution design upload slot',
      400,
      ['slotKey']
    );
  }

  const uploadFile = normalizeUploadFile(file);
  const storageKey = storage.createStorageKey({ projectId, slotKey: slot.slotKey });
  let fileWritten = false;
  let committed = false;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, slot.requiredRoleKey, user);

    const nodeRow = await selectSolutionDesignNodeForUpdate(connection, projectId, slot.nodeKey);
    assertNodeProcessable(nodeRow, slot.nodeKey, 'processed');
    const quotationTenderFlow = isQuotationTenderUploadSlot(slot.slotKey)
      ? await selectQuotationTenderFlow(connection, projectId, { forUpdate: true })
      : null;
    assertQuotationTenderSlotProcessable({ slot, nodeRow, flowRow: quotationTenderFlow });

    const slotRow = await selectUploadSlotForUpdate(connection, projectId, slot.slotKey);
    if (!slotRow) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT,
        'Solution design upload slot is not initialized',
        409,
        ['slotKey']
      );
    }

    const stored = await storage.writeFile(storageKey, uploadFile.buffer);
    fileWritten = true;
    if (stored.size !== uploadFile.size) {
      throwInvalidUploadFile();
    }

    const fileRow = await replaceCurrentSlotFile(connection, {
      projectId,
      slotRow,
      slot,
      uploadFile,
      storageKey,
      userId: user.id
    });
    await insertUploadLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      fileRow
    });
    if (isUploadSlotExempted(slotRow)) {
      await insertUploadExemptionLog(connection, {
        projectId,
        actorUserId: user.id,
        slot,
        reason: slotRow.exemption_reason ?? null,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED_BY_UPLOAD,
        summary: `重新上传自动取消无需上传：${slot.slotName}`,
        fileRow
      });
    }

    await connection.commit();
    committed = true;

    return {
      slotKey: slot.slotKey,
      nodeKey: slot.nodeKey,
      file: mapUploadedFile(fileRow)
    };
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }

    if (fileWritten) {
      await storage.cleanupFile(storageKey);
    }

    throw error;
  } finally {
    connection.release();
  }
}

function buildAutoSubmitResult({
  attempted = false,
  submitted = false,
  nodeKey,
  nodeStatus = null,
  blockingReasons = [],
  message = ''
}) {
  return {
    attempted,
    submitted,
    nodeKey,
    nodeStatus,
    blockingReasons: Array.isArray(blockingReasons) ? blockingReasons : [],
    message
  };
}

async function submitSolutionDesignWorkflowNodeWithinTransaction(
  executor,
  {
    projectId,
    node,
    requiredRoleKey,
    user,
    projectRow,
    rolesRow
  }
) {
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  assertAllRolesAssigned(roleState);
  assertProjectRoleActor(roleState, requiredRoleKey, user);
  const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, node.nodeKey);
  assertNodeProcessable(nodeRow, node.nodeKey, 'submitted');
  await assertSubmitNodeReady(executor, { projectId, nodeKey: node.nodeKey });
  if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    await updateAnalysisNodePendingReview(executor, {
      projectId,
      userId: user.id
    });
  } else if (getSolutionDesignReviewFormDefinition(node.nodeKey)) {
    await updateReviewNodePendingReview(executor, {
      projectId,
      nodeKey: node.nodeKey
    });
  } else if (isCostEstimationNode(node.nodeKey)) {
    await updateCostNodePendingReview(executor, {
      projectId,
      nodeKey: node.nodeKey,
      slotKey: getCostUploadSlotKeyForNode(node.nodeKey),
      userId: user.id
    });
  } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    const flowRow = await selectQuotationTenderFlow(executor, projectId, { forUpdate: true });
    if (!isTenderBranchCurrent(flowRow, nodeRow)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Tender branch must be selected before submitting quotation/tender node',
        409,
        ['branchType']
      );
    }
    await updateQuotationTenderNodePendingReview(executor, {
      projectId,
      userId: user.id
    });
  } else {
    await updateNodeApprovedAndActivateNext(executor, {
      projectId,
      nodeKey: node.nodeKey,
      nextNodeKey: getSubmitNodeNextNodeKey(node.nodeKey),
      userId: user.id
    });
  }
  await insertNodeSubmitLog(executor, {
    projectId,
    actorUserId: user.id,
    nodeKey: node.nodeKey
  });

  const refreshedNode = await selectSolutionDesignNodeForUpdate(executor, projectId, node.nodeKey);
  return refreshedNode;
}

async function attemptGeneratedFormAutoSubmitNode(executor, {
  projectId,
  nodeKey,
  user,
  projectRow,
  rolesRow
}) {
  const node = getSolutionDesignNodeDefinition(nodeKey);
  if (!node) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_NODE,
      'Invalid solution design node',
      400,
      ['nodeKey']
    );
  }

  const requiredRoleKey = getSubmitNodeRoleKey(node.nodeKey);
  if (!requiredRoleKey) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_SUBMITTABLE,
      'Solution design node is not submittable in this backend slice',
      409,
      ['nodeKey']
    );
  }

  try {
    const refreshedNode = await submitSolutionDesignWorkflowNodeWithinTransaction(executor, {
      projectId,
      node,
      requiredRoleKey,
      user,
      projectRow,
      rolesRow
    });
    return buildAutoSubmitResult({
      attempted: true,
      submitted: true,
      nodeKey: node.nodeKey,
      nodeStatus: refreshedNode?.status ?? null,
      message: 'Solution design node was submitted automatically'
    });
  } catch (error) {
    if (error?.code !== SOLUTION_DESIGN_ERROR.NODE_BLOCKED) {
      throw error;
    }
    const currentNode = await selectSolutionDesignNodeForUpdate(executor, projectId, node.nodeKey);
    return buildAutoSubmitResult({
      attempted: true,
      submitted: false,
      nodeKey: node.nodeKey,
      nodeStatus: currentNode?.status ?? null,
      blockingReasons: Array.isArray(error.details) ? error.details : [],
      message: error.message
    });
  }
}

export async function submitSolutionDesignWorkflowNode({ projectId, nodeKey, user }, db = pool) {
  const node = getSolutionDesignNodeDefinition(nodeKey);
  if (!node) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_NODE,
      'Invalid solution design node',
      400,
      ['nodeKey']
    );
  }

  const requiredRoleKey = getSubmitNodeRoleKey(node.nodeKey);
  if (!requiredRoleKey) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_SUBMITTABLE,
      'Solution design node is not submittable in this backend slice',
      409,
      ['nodeKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);

    const rolesRow = await selectSolutionDesignRolesForUpdate(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });

    await submitSolutionDesignWorkflowNodeWithinTransaction(connection, {
      projectId,
      node,
      requiredRoleKey,
      user,
      projectRow,
      rolesRow
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function approveSolutionDesignWorkflowNode({ projectId, nodeKey, payload = {}, user }, db = pool) {
  const node = getSolutionDesignNodeDefinition(nodeKey);
  if (
    !node ||
    ![
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST,
      SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    ].includes(node.nodeKey)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_SUBMITTABLE,
      'Solution design node approval is not implemented in this backend slice',
      409,
      ['nodeKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    const nodeRow = await selectSolutionDesignNodeForUpdate(connection, projectId, node.nodeKey);
    assertCanReviewSolutionDesignNode({
      nodeRow,
      user,
      roleState,
      projectEnded: isSolutionDesignProjectEnded(projectRow),
      inSolutionStage: isProjectInSolutionDesignStage(projectRow)
    });

    if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
      await approveAnalysisNodeAndActivateDesign(connection, { projectId });
      await insertAnalysisReviewLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_APPROVED,
        summary: '项目方案分析审批通过'
      });
    } else if (getSolutionDesignReviewFormDefinition(node.nodeKey)) {
      const nextNodeKey = node.nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW
        ? SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW
        : SOLUTION_DESIGN_NODE_KEY.RD_COST;
      await approveReviewNodeAndActivateNext(connection, {
        projectId,
        nodeKey: node.nodeKey,
        nextNodeKey
      });
      const metadata = getReviewApproveMetadata(node.nodeKey);
      await insertReviewApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
      await approveReviewNodeAndActivateNext(connection, {
        projectId,
        nodeKey: node.nodeKey,
        nextNodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST
      });
      const metadata = getCostApproveMetadata(node.nodeKey, nodeRow.status);
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
      await approveReviewNodeAndActivateNext(connection, {
        projectId,
        nodeKey: node.nodeKey,
        nextNodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST
      });
      const metadata = getCostApproveMetadata(node.nodeKey, nodeRow.status);
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
      await approveReviewNodeAndActivateNext(connection, {
        projectId,
        nodeKey: node.nodeKey,
        nextNodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
      });
      const metadata = getCostApproveMetadata(node.nodeKey, nodeRow.status);
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
      const metadata = getCostApproveMetadata(node.nodeKey, nodeRow.status);
      if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
        await approveFinanceCostByFinanceOwner(connection, { projectId });
      } else {
        const branchType = normalizeQuotationTenderBranchType(payload);
        await approveFinanceCostByGeneralManager(connection, { projectId });
        const quotationTenderNode = await selectSolutionDesignNodeForUpdate(
          connection,
          projectId,
          SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
        );
        const existingFlow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
        await upsertQuotationTenderBranchSelection(connection, {
          projectId,
          branchType,
          nodeRevision: Number(quotationTenderNode.current_revision ?? 1),
          actorUserId: user.id,
          existingFlow
        });
        await insertQuotationTenderBranchSelectionLog(connection, {
          projectId,
          branchType,
          nodeRevision: quotationTenderNode.current_revision,
          actorUserId: user.id
        });
      }
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
      const flowRow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
      if (!isTenderBranchCurrent(flowRow, nodeRow)) {
        throw new SolutionDesignWorkflowError(
          SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
          'Tender branch must be selected before approving quotation/tender node',
          409,
          ['branchType']
        );
      }
      await approveTender(connection, { projectId, actorUserId: user.id });
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED,
        summary: '总经理投标审批通过',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER
        }
      });
      await insertReadyForContractLog(connection, {
        projectId,
        actorUserId: user.id,
        sourceAction: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED
      });
      await tryAutoAdvanceProjectStage(
        {
          projectId,
          user,
          triggerAction: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED,
          expectedStageOrder: projectRow.current_stage_order,
          triggerMetadata: {
            nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
            branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER,
            stageOrder: projectRow.current_stage_order,
            actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED
          }
        },
        connection
      );
    }

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function returnSolutionDesignWorkflowNode({ projectId, nodeKey, payload, user }, db = pool) {
  const node = getSolutionDesignNodeDefinition(nodeKey);
  if (
    !node ||
    ![
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST,
      SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
    ].includes(node.nodeKey)
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_SUBMITTABLE,
      'Solution design node return is not implemented in this backend slice',
      409,
      ['nodeKey']
    );
  }
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertProjectWriteAllowed(projectRow);
    await ensureSolutionDesignNodes(connection, projectRow);
    await ensureSolutionDesignUploadSlots(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    const nodeRow = await selectSolutionDesignNodeForUpdate(connection, projectId, node.nodeKey);
    assertCanReviewSolutionDesignNode({
      nodeRow,
      user,
      roleState,
      projectEnded: isSolutionDesignProjectEnded(projectRow),
      inSolutionStage: isProjectInSolutionDesignStage(projectRow)
    });

    if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
      await returnAnalysisNode(connection, { projectId, returnReason });
      await insertAnalysisReviewLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_RETURNED,
        summary: '项目方案分析审批退回，需整体重新提交',
        returnReason
      });
    } else if (getSolutionDesignReviewFormDefinition(node.nodeKey)) {
      await returnReviewNodeToSolutionDesign(connection, {
        projectId,
        nodeKey: node.nodeKey,
        returnReason
      });
      const metadata = getReviewReturnMetadata(node.nodeKey);
      await insertReviewApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary,
        returnReason
      });
    } else if (
      node.nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST ||
      node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST ||
      node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST ||
      (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST &&
        nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW)
    ) {
      await returnCostNode(connection, {
        projectId,
        nodeKey: node.nodeKey,
        returnReason,
        expectedStatus: SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
      });
      const metadata = getCostReturnMetadata(node.nodeKey, nodeRow.status);
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary,
        returnReason,
        returnToNodeKey: node.nodeKey,
        resubmitScope: [getCostUploadSlotKeyForNode(node.nodeKey)],
        affectedNodeKeys: [node.nodeKey]
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
      await returnFinanceCostToRdCost(connection, { projectId, returnReason });
      const metadata = getCostReturnMetadata(node.nodeKey, nodeRow.status);
      await insertCostApprovalLog(connection, {
        projectId,
        actorUserId: user.id,
        nodeKey: node.nodeKey,
        actionType: metadata.actionType,
        summary: metadata.summary,
        returnReason,
        returnToNodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
        resubmitScope: SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS,
        affectedNodeKeys: [
          SOLUTION_DESIGN_NODE_KEY.RD_COST,
          SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
          SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
          SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
        ]
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
      const flowRow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
      if (!isTenderBranchCurrent(flowRow, nodeRow)) {
        throw new SolutionDesignWorkflowError(
          SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
          'Tender branch must be selected before returning quotation/tender node',
          409,
          ['branchType']
        );
      }
      await returnTender(connection, { projectId, returnReason, actorUserId: user.id });
      await insertQuotationTenderLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_RETURNED,
        summary: '总经理投标审批退回，返回投标节点重提商务标和技术标',
        details: {
          branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER,
          returnReason,
          returnToNodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          resubmitScope: SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS
        }
      });
    }

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}
