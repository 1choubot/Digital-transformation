import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  SOLUTION_DESIGN_ANALYSIS_FORM_DOCUMENT_CODES,
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION,
  SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY,
  SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS,
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
import { renderXlsxTemplate } from '../../utils/ooxmlRenderer.js';
import {
  listStageDocumentOnlineFormImagesForDocument,
  listStageDocumentOnlineFormImagesForGeneration,
  readOnlineFormImageForGeneration
} from '../stageDocuments/onlineFormImageRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { canViewProject } from './visibility.js';
import {
  ProjectAuthorizationError,
  ProjectNotFoundError
} from './shared.js';
import { tryAutoAdvanceProjectStage } from './stageAdvanceRepository.js';
import { PROJECT_STATUS } from '../../domain/projects.js';

const DEFAULT_UPLOAD_MIME_TYPE = 'application/octet-stream';
const GENERATED_XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_UPLOAD_TEXT_FIELD_LENGTH = 255;
const MAX_ANALYSIS_FORM_JSON_LENGTH = 100000;
const MAX_REVIEW_FORM_JSON_LENGTH = 100000;
const SOLUTION_DESIGN_TEMPLATE_DIRECTORY_NAME = '智能制造项目管理文件模板v1';
const SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE = 'xlsx';
const REVIEW_FORM_REPEATABLE_FIELD_KEYS = Object.freeze([
  'projectTargetDescription',
  'technicalRisks',
  'solutionSuggestions',
  'actionItems'
]);

const ANALYSIS_FORM_TEXT_FIELD_KEYS = Object.freeze([
  'workingTemperatureMin',
  'workingTemperatureMax',
  'storageTemperatureMin',
  'storageTemperatureMax',
  'workingHumidityMin',
  'workingHumidityMax',
  'storageHumidityMin',
  'storageHumidityMax',
  'noiseLimitValue',
  'ipProtectionLevel',
  'antiCorrosionGrade',
  'altitudeLimitValue',
  'explosionProofRequirement',
  'siteConditionDescription',
  'powerSupply',
  'airSupply',
  'hydraulicSource',
  'liftingEquipment',
  'workpieceDescription',
  'operationProcessDescription',
  'projectTargetDescription'
]);

const defaultSolutionDesignUploadStorage = {
  createStorageKey: createSolutionDesignUploadStorageKey,
  writeFile: writeSolutionDesignUploadFile,
  assertFileReadable: assertSolutionDesignUploadFileReadable,
  cleanupFile: cleanupSolutionDesignUploadFile
};

const defaultSolutionDesignGeneratedFileStorage = {
  createStorageKey: ({ projectId, documentCode, revision }) =>
    createStageDocumentGeneratedFileStorageKey({
      projectId,
      documentId: `solution-design-${documentCode}`,
      version: revision,
      fileType: SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE
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

function normalizeAnalysisFormPayload(payload = {}) {
  const sourceFormData = Object.hasOwn(payload, 'formData') ? payload.formData : payload;
  if (
    sourceFormData === null ||
    Array.isArray(sourceFormData) ||
    typeof sourceFormData !== 'object'
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ANALYSIS_FORM,
      'Solution analysis form data must be an object',
      400,
      ['formData']
    );
  }

  const formData = {};
  for (const fieldKey of ANALYSIS_FORM_TEXT_FIELD_KEYS) {
    if (Object.hasOwn(sourceFormData, fieldKey)) {
      formData[fieldKey] = String(sourceFormData[fieldKey] ?? '').trim();
    }
  }

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > MAX_ANALYSIS_FORM_JSON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ANALYSIS_FORM,
      'Solution analysis form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
  };
}

function normalizeRepeatableReviewFormValue(value) {
  if (value === null || value === undefined) {
    return [];
  }

  const rawValues = Array.isArray(value)
    ? value
    : String(value).split(/\r?\n/);

  return rawValues
    .map((item) => {
      if (item === null || item === undefined) {
        return '';
      }
      if (typeof item === 'object') {
        return JSON.stringify(item);
      }
      return String(item);
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeReviewFormPayload(payload = {}) {
  const sourceFormData = Object.hasOwn(payload, 'formData') ? payload.formData : payload;
  if (
    sourceFormData === null ||
    Array.isArray(sourceFormData) ||
    typeof sourceFormData !== 'object'
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Solution review form data must be an object',
      400,
      ['formData']
    );
  }

  const formData = { ...sourceFormData };
  for (const fieldKey of REVIEW_FORM_REPEATABLE_FIELD_KEYS) {
    formData[fieldKey] = normalizeRepeatableReviewFormValue(formData[fieldKey]);
  }
  if (Object.hasOwn(formData, 'recorder')) {
    formData.recorder = String(formData.recorder ?? '').trim();
  }

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > MAX_REVIEW_FORM_JSON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Solution review form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
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

async function selectProjectContext(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.status,
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
    LEFT JOIN project_stages s
      ON s.project_id = p.id AND s.is_current = 1
    WHERE p.id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  const row = rows[0];
  if (!row) {
    throw new ProjectNotFoundError(projectId);
  }

  return row;
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

async function selectSolutionDesignRoles(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_roles
    WHERE project_id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectSolutionDesignRolesForUpdate(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_roles
    WHERE project_id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectSolutionDesignNodes(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_nodes
    WHERE project_id = ?
    ORDER BY node_order ASC`,
    [projectId]
  );

  return rows;
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

async function insertMissingInitialNodes(executor, projectId, existingRows = []) {
  const existingKeys = new Set(existingRows.map((row) => row.node_key));
  const initialNodes = buildInitialSolutionDesignNodes().filter((node) => !existingKeys.has(node.nodeKey));

  for (const node of initialNodes) {
    await executor.execute(
      `INSERT IGNORE INTO project_solution_design_nodes (
        project_id,
        node_key,
        node_name,
        node_order,
        status,
        activated_at
      ) VALUES (?, ?, ?, ?, ?, ${node.status === SOLUTION_DESIGN_NODE_STATUS.PENDING ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [projectId, node.nodeKey, node.nodeName, node.nodeOrder, node.status]
    );
  }
}

async function ensureSolutionDesignNodes(executor, projectRow) {
  const rows = await selectSolutionDesignNodes(executor, projectRow.id);

  if (shouldPersistInitialNodes(projectRow) && rows.length < SOLUTION_DESIGN_NODES.length) {
    await insertMissingInitialNodes(executor, projectRow.id, rows);
    return selectSolutionDesignNodes(executor, projectRow.id);
  }

  return rows;
}

async function selectSolutionDesignUploadSlots(executor, projectId) {
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
    FROM project_solution_design_upload_slots s
    LEFT JOIN project_solution_design_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    WHERE s.project_id = ?
    ORDER BY s.slot_order ASC`,
    [projectId]
  );

  return rows;
}

async function insertMissingUploadSlots(executor, projectId, existingRows = []) {
  const existingKeys = new Set(existingRows.map((row) => row.slot_key));
  const missingSlots = SOLUTION_DESIGN_UPLOAD_SLOTS.filter((slot) => !existingKeys.has(slot.slotKey));

  for (const slot of missingSlots) {
    await executor.execute(
      `INSERT IGNORE INTO project_solution_design_upload_slots (
        project_id,
        node_key,
        slot_key,
        slot_name,
        slot_order,
        is_required,
        revision,
        status
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        projectId,
        slot.nodeKey,
        slot.slotKey,
        slot.slotName,
        slot.slotOrder,
        SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.PENDING
      ]
    );
  }
}

async function ensureSolutionDesignUploadSlots(executor, projectRow) {
  const rows = await selectSolutionDesignUploadSlots(executor, projectRow.id);

  if (shouldPersistInitialNodes(projectRow) && rows.length < SOLUTION_DESIGN_UPLOAD_SLOTS.length) {
    await insertMissingUploadSlots(executor, projectRow.id, rows);
    return selectSolutionDesignUploadSlots(executor, projectRow.id);
  }

  return rows;
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

async function selectCurrentAnalysisForm(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_analysis_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectProjectStageDocumentByCode(executor, projectId, documentCode, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      d.*,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
      AND d.document_code = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentCode]
  );

  return rows[0] || null;
}

async function selectProjectStageDocumentByAnyCode(executor, projectId, documentCodes, { forUpdate = false } = {}) {
  for (const documentCode of documentCodes) {
    const row = await selectProjectStageDocumentByCode(executor, projectId, documentCode, { forUpdate });
    if (row) {
      return row;
    }
  }

  return null;
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

async function selectCurrentReviewForm(executor, projectId, nodeKey, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.node_key = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

async function selectCurrentReviewForms(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    ORDER BY f.node_key ASC`,
    [projectId]
  );

  return rows;
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

async function selectQuotationTenderFlow(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_quotation_tender_flows
    WHERE project_id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
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

function isNodeProcessableStatus(status) {
  return PROCESSABLE_NODE_STATUSES.has(status);
}

function isCenterManagerOf(user, department) {
  return (
    user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER &&
    user?.department === department
  );
}

function isManufacturingCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.MANUFACTURING_CENTER);
}

function isFinanceCostUploadSlot(slotKey) {
  return slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION;
}

function isQuotationTenderUploadSlot(slotKey) {
  return [
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE
  ].includes(slotKey);
}

function isTenderUploadSlot(slotKey) {
  return SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.includes(slotKey);
}

function isCostEstimationNode(nodeKey) {
  return Object.hasOwn(SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY, nodeKey);
}

function getCostUploadSlotKeyForNode(nodeKey) {
  return SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY[nodeKey] || null;
}

function canViewFinanceCostUploadFile({ roleState, user }) {
  return (
    isSolutionDesignGeneralManager(user) ||
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT]?.userId, user?.id) ||
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id)
  );
}

function canDownloadUploadFile({ slot, roleState, user }) {
  if (!slot) {
    return false;
  }

  if (isFinanceCostUploadSlot(slot.slotKey)) {
    return canViewFinanceCostUploadFile({ roleState, user });
  }

  return true;
}

function isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) {
  return Boolean(flowRow) && Number(flowRow.revision ?? 0) >= Number(nodeRow?.current_revision ?? 1);
}

function isQuotationBranchCurrent(flowRow, nodeRow) {
  return (
    isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) &&
    flowRow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
  );
}

function isTenderBranchCurrent(flowRow, nodeRow) {
  return (
    isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) &&
    flowRow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER
  );
}

function canSelectQuotationTenderBranch({ projectEnded, inSolutionStage, user, nodeRow, flowRow }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    isSolutionDesignGeneralManager(user) &&
    nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER &&
    nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING &&
    !isQuotationTenderFlowCurrentForNode(flowRow, nodeRow)
  );
}

function canUploadQuotationTenderSlot({ slot, nodeRow, flowRow }) {
  if (!isQuotationTenderUploadSlot(slot?.slotKey)) {
    return true;
  }

  if (!isNodeProcessableStatus(nodeRow?.status)) {
    return false;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
    return (
      isQuotationBranchCurrent(flowRow, nodeRow) &&
      flowRow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED
    );
  }

  return (
    isTenderBranchCurrent(flowRow, nodeRow) &&
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED
    ].includes(flowRow.branch_status)
  );
}

function assertQuotationTenderSlotProcessable({ slot, nodeRow, flowRow }) {
  if (!canUploadQuotationTenderSlot({ slot, nodeRow, flowRow })) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation/tender upload slot cannot be processed in its current branch status',
      409,
      {
        nodeKey: slot?.nodeKey ?? SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        slotKey: slot?.slotKey ?? null,
        nodeStatus: nodeRow?.status ?? null,
        branchType: flowRow?.branch_type ?? null,
        branchStatus: flowRow?.branch_status ?? null,
        branchRevision: flowRow?.revision ?? null,
        nodeRevision: nodeRow?.current_revision ?? null
      }
    );
  }
}

function canSubmitQuotation({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow, uploadSlotRevisionByKey }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isQuotationBranchCurrent(flowRow, nodeRow) &&
    flowRow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED &&
    Number(uploadSlotRevisionByKey.get(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) ?? 0) >=
      Number(nodeRow.current_revision ?? 1)
  );
}

function canProcessQuotationResult({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isQuotationBranchCurrent(flowRow, nodeRow) &&
    flowRow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
  );
}

function areTenderFilesUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  const revision = Number(requiredRevision ?? 1);
  return SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.every(
    (slotKey) => Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= revision
  );
}

function canSubmitTender({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow, uploadSlotRevisionByKey }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isTenderBranchCurrent(flowRow, nodeRow) &&
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED
    ].includes(flowRow.branch_status) &&
    areTenderFilesUploadedForRevision(uploadSlotRevisionByKey, nodeRow.current_revision)
  );
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

function sanitizeGeneratedFileNamePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function buildGeneratedFormFileName({ projectRow, definition, revision }) {
  const projectName = sanitizeGeneratedFileNamePart(projectRow.project_name || `项目${projectRow.id}`);
  const documentCode = sanitizeGeneratedFileNamePart(definition.documentCode);
  const formName = sanitizeGeneratedFileNamePart(definition.generatedFileNamePrefix || definition.formName);
  return `${documentCode}-${formName}-${projectName}-v${revision}.${SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE}`;
}

function truncateGeneratedCellValue(value, maxLength = 30000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeTemplateDisplayValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTemplateDisplayValue(item)).filter(Boolean).join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function cleanTemplateValue(value) {
  return normalizeTemplateDisplayValue(value).trim();
}

const SOLUTION_DESIGN_TEMPLATE_VALUE_BUILDERS = Object.freeze({
  temperatureRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `工作温度：（${cleanTemplateValue(min)}）℃~（${cleanTemplateValue(max)}）℃`;
  },
  storageTemperatureRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `储存温度：（${cleanTemplateValue(min)}）℃~（${cleanTemplateValue(max)}）℃`;
  },
  humidityRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `工作湿度：（${cleanTemplateValue(min)}）%~（${cleanTemplateValue(max)}）%`;
  },
  storageHumidityRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `储存湿度：（${cleanTemplateValue(min)}）%~（${cleanTemplateValue(max)}）%`;
  },
  noiseLimit: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `噪音：≤（${cleanTemplateValue(value)}）dB`;
  },
  ipProtection: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    const level = cleanTemplateValue(value).replace(/^IP/i, '');
    return `IP防护等级：IP（${level}）`;
  },
  antiCorrosion: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `防腐等级：（${cleanTemplateValue(value)}）`;
  },
  altitudeLimit: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `海拔高度：≤（${cleanTemplateValue(value)}）m`;
  },
  explosionProof: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `防爆要求：（${cleanTemplateValue(value)}）`;
  },
  siteCondition: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `可用场地尺寸（如有图纸请提供）：\n${normalizeTemplateDisplayValue(value)}`;
  },
  siteUtilities: ([powerSupply, airSupply, hydraulicSource]) => {
    if (![powerSupply, airSupply, hydraulicSource].some((value) => cleanTemplateValue(value))) {
      return '';
    }
    return `电源：（${cleanTemplateValue(powerSupply)}）  气源：（${cleanTemplateValue(airSupply)}）  液压源：（${cleanTemplateValue(hydraulicSource)}）`;
  },
  liftingEquipment: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `吊装设备：${normalizeTemplateDisplayValue(value)}`;
  }
});

function getTemplateSourceValue(source, pathExpression) {
  if (!pathExpression) {
    return null;
  }

  return String(pathExpression)
    .split('.')
    .reduce((value, key) => (value === null || value === undefined ? null : value[key]), source);
}

function getTemplateSourceValues(source, mapping) {
  if (Array.isArray(mapping.sourcePaths)) {
    return mapping.sourcePaths.map((pathExpression) => getTemplateSourceValue(source, pathExpression));
  }

  return [getTemplateSourceValue(source, mapping.source)];
}

function buildTemplateMappingValue(mapping, source) {
  if (Object.hasOwn(mapping, 'value')) {
    return mapping.value;
  }

  const values = getTemplateSourceValues(source, mapping);
  if (!mapping.valueBuilder) {
    return values[0];
  }

  const builder = SOLUTION_DESIGN_TEMPLATE_VALUE_BUILDERS[mapping.valueBuilder];
  if (!builder) {
    throw new Error(`Solution design template value builder is not registered: ${mapping.valueBuilder}`);
  }

  return builder(values);
}

function buildGeneratedFormSource({ projectRow, definition, formRow, roleState }) {
  const formData = parseStoredJson(formRow.form_data_json, {});
  const revision = Number(formRow.revision ?? 1);
  const submittedAt = formRow.submitted_at || '';
  const submittedByName = formRow.submitted_by_display_name || '';
  const submittedByAccount = formRow.submitted_by_account || '';
  const recorderName = normalizeTemplateDisplayValue(formData.recorder || submittedByName || submittedByAccount || '');
  const reviewRoundLabel = definition.reviewType === 'customer'
    ? `甲方，第（${revision}）次`
    : definition.reviewType === 'internal'
      ? `内部，第（${revision}）次`
      : `第（${revision}）版`;
  const generatedContext = [
    `${definition.documentCode} ${definition.formName}`,
    `节点：${definition.nodeKey}`,
    definition.reviewType ? `评审类型：${definition.reviewType}` : null,
    `版本：${revision}`,
    submittedAt ? `提交时间：${submittedAt}` : null,
    submittedByName ? `提交人：${submittedByName}` : null
  ].filter(Boolean).join('\n');

  return {
    project: {
      projectCode: projectRow.project_code,
      projectName: projectRow.project_name,
      customerName: projectRow.customer_name
    },
    definition: {
      documentCode: definition.documentCode,
      formName: definition.formName,
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType || null,
      templateName: definition.templateName
    },
    form: formData,
    roles: {
      projectManagerName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER]?.user?.name
        || projectRow.project_manager
        || '',
      technicalOwnerName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.user?.name || '',
      businessOwnerName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.user?.name || '',
      procurementOwnerName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.PROCUREMENT_OWNER]?.user?.name || '',
      financeAccountantName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT]?.user?.name || '',
      financeOwnerName: roleState?.[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.user?.name || ''
    },
    context: {
      revision,
      submittedAt,
      submittedByName,
      submittedByAccount,
      reviewRoundLabel,
      generatedContext,
      recorderName,
      recorderLabel: recorderName ? `记录人：${recorderName}` : '记录人：'
    }
  };
}

function buildGeneratedFormCellValues({ projectRow, definition, formRow, roleState }) {
  const source = buildGeneratedFormSource({ projectRow, definition, formRow, roleState });
  const cellValues = {};
  for (const mapping of definition.templateMappings || []) {
    const rawValue = buildTemplateMappingValue(mapping, source);
    if (mapping.repeatRows) {
      const { column, startRow, endRow } = mapping.repeatRows;
      const start = Number(startRow);
      const end = Number(endRow);
      if (!column || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) {
        continue;
      }

      const rows = normalizeRepeatableReviewFormValue(rawValue);
      const rowCount = end - start + 1;
      for (let offset = 0; offset < rowCount; offset += 1) {
        const isLastRow = offset === rowCount - 1;
        const rowValue = isLastRow
          ? rows.slice(offset).join('\n')
          : rows[offset] || '';
        cellValues[`${column}${start + offset}`] = {
          value: truncateGeneratedCellValue(normalizeTemplateDisplayValue(rowValue)),
          preserveTemplateWhenEmpty: mapping.preserveTemplateWhenEmpty === true,
          preserveStyle: mapping.preserveStyle !== false,
          textFont: mapping.textFont || '',
          fontSize: mapping.fontSize || null
        };
      }
      continue;
    }

    if (!mapping.target) {
      continue;
    }

    cellValues[mapping.target] = {
      value: truncateGeneratedCellValue(normalizeTemplateDisplayValue(rawValue)),
      preserveTemplateWhenEmpty: mapping.preserveTemplateWhenEmpty === true,
      preserveStyle: mapping.preserveStyle !== false,
      textFont: mapping.textFont || '',
      fontSize: mapping.fontSize || null
    };
  }
  return cellValues;
}

function groupOnlineFormImagesByFieldKey(images = []) {
  const grouped = {};
  for (const image of images) {
    if (!grouped[image.fieldKey]) {
      grouped[image.fieldKey] = [];
    }
    grouped[image.fieldKey].push(image);
  }
  return grouped;
}

async function buildGeneratedFormImageValues({ executor, projectRow, definition, stageDocumentRow, readOnlineFormImage }) {
  const imageMappings = definition.imageMappings || [];
  if (imageMappings.length === 0 || !stageDocumentRow?.id) {
    return [];
  }

  const formImages = groupOnlineFormImagesByFieldKey(
    await listStageDocumentOnlineFormImagesForGeneration(executor, projectRow.id, stageDocumentRow.id)
  );
  const imageValues = [];
  for (const mapping of imageMappings) {
    const images = getTemplateSourceValue({ formImages }, mapping.source);
    const activeImages = Array.isArray(images) ? images : [];
    if (activeImages.length === 0) {
      continue;
    }

    const maxImages = Number.isSafeInteger(Number(mapping.maxImages)) ? Number(mapping.maxImages) : 3;
    for (const [index, image] of activeImages.slice(0, maxImages).entries()) {
      const buffer = await readOnlineFormImage(image);
      imageValues.push({
        target: mapping.target,
        layoutIndex: index,
        layoutCount: Math.min(activeImages.length, maxImages),
        originalFileName: image.originalFileName,
        mimeType: image.mimeType,
        buffer,
        preserveAspectRatio: mapping.preserveAspectRatio !== false,
        mergeAdjustment: mapping.mergeAdjustment || null
      });
    }
  }

  return imageValues;
}

async function readSolutionDesignTemplate(templateName) {
  const candidatePaths = [
    path.resolve(process.cwd(), '..', SOLUTION_DESIGN_TEMPLATE_DIRECTORY_NAME, templateName),
    path.resolve(process.cwd(), SOLUTION_DESIGN_TEMPLATE_DIRECTORY_NAME, templateName)
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await fs.readFile(candidatePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const error = new Error(`Solution design template file not found: ${templateName}`);
  error.code = 'SOLUTION_DESIGN_TEMPLATE_NOT_FOUND';
  throw error;
}

function buildGenerationErrorMessage(error) {
  const message = error?.message || 'Solution design generated file failed';
  return error?.code ? `${error.code}: ${message}` : message;
}

function mapGeneratedFileStatus(row, { templateName = null } = {}) {
  const status = row.generated_file_status;
  const canDownload = status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED && Boolean(row.generated_file_storage_key);
  return {
    status,
    fileName: row.generated_file_name,
    mimeType: row.generated_file_mime_type,
    fileSize: row.generated_file_size === null || row.generated_file_size === undefined
      ? null
      : Number(row.generated_file_size),
    templateName: row.generated_file_template_name ?? templateName,
    generatedByUserId: row.generated_by_user_id ?? null,
    generatedAt: row.generated_at,
    errorMessage: row.generation_error_message,
    canDownload
  };
}

function mapAnalysisForm(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    revision: row.revision,
    status: row.form_status,
    formData: parseStoredJson(row.form_data_json),
    isCurrent: Boolean(row.is_current),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUser: row.submitted_by_user_id
      ? {
          id: row.submitted_by_user_id,
          account: row.submitted_by_account,
          name: row.submitted_by_display_name
        }
      : null,
    documentCode: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.documentCode,
    formName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.formName,
    templateName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName,
    generatedFile: mapGeneratedFileStatus(row, {
      templateName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName
    }),
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReviewForm(row) {
  if (!row) {
    return null;
  }

  const definition = getSolutionDesignReviewFormDefinition(row.node_key);

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    reviewType: row.review_type,
    documentCode: definition?.documentCode ?? null,
    formName: definition?.formName ?? null,
    templateName: definition?.templateName ?? null,
    revision: row.revision,
    status: row.form_status,
    formData: parseStoredJson(row.form_data_json),
    isCurrent: Boolean(row.is_current),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUser: row.submitted_by_user_id
      ? {
          id: row.submitted_by_user_id,
          account: row.submitted_by_account,
          name: row.submitted_by_display_name
        }
      : null,
    generatedFile: mapGeneratedFileStatus(row, {
      templateName: definition?.templateName ?? null
    }),
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildCurrentFileSlotKeySet(slots = []) {
  return new Set(slots.filter((slot) => Boolean(slot.current_file_id)).map((slot) => slot.slot_key));
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

function isTechnicalOwner(roleState, user) {
  return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId, user?.id);
}

function canProcessAnalysisForm({ projectEnded, inSolutionStage, roleState, user, analysisNode }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isTechnicalOwner(roleState, user) &&
    analysisNode?.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS &&
    isNodeProcessableStatus(analysisNode?.status)
  );
}

function canProcessReviewForm({ projectEnded, inSolutionStage, roleState, user, reviewNode }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isTechnicalOwner(roleState, user) &&
    Boolean(getSolutionDesignReviewFormDefinition(reviewNode?.node_key)) &&
    isNodeProcessableStatus(reviewNode?.status)
  );
}

function isAnalysisFormSubmittedForRevision(analysisFormRow, requiredRevision) {
  return (
    analysisFormRow?.form_status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED &&
    Number(analysisFormRow.revision ?? 0) >= Number(requiredRevision ?? 1)
  );
}

function isAnalysisFormGeneratedForRevision(analysisFormRow, requiredRevision) {
  return (
    isAnalysisFormSubmittedForRevision(analysisFormRow, requiredRevision) &&
    analysisFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(analysisFormRow.generated_file_storage_key)
  );
}

function isReviewFormSubmittedForRevision(reviewFormRow, requiredRevision) {
  return (
    reviewFormRow?.form_status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
    Number(reviewFormRow.revision ?? 0) >= Number(requiredRevision ?? 1)
  );
}

function isReviewFormGeneratedForRevision(reviewFormRow, requiredRevision) {
  return (
    isReviewFormSubmittedForRevision(reviewFormRow, requiredRevision) &&
    reviewFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(reviewFormRow.generated_file_storage_key)
  );
}

function isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  return (
    Number(uploadSlotRevisionByKey.get(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM) ?? 0) >=
    Number(requiredRevision ?? 1)
  );
}

function areSolutionDesignOutputsUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  const revision = Number(requiredRevision ?? 1);
  return SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.every(
    (slotKey) => Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= revision
  );
}

function isCostUploadSlotUploadedForRevision(uploadSlotRevisionByKey, nodeKey, requiredRevision) {
  const slotKey = getCostUploadSlotKeyForNode(nodeKey);
  if (!slotKey) {
    return false;
  }

  return Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= Number(requiredRevision ?? 1);
}

function buildUploadSlotPermissions({ slot, roleState, user, projectEnded, inSolutionStage, nodeRow, quotationTenderFlow }) {
  const canWrite =
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    canUploadQuotationTenderSlot({ slot, nodeRow, flowRow: quotationTenderFlow });
  return {
    canUpload:
      canWrite &&
      Boolean(slot?.requiredRoleKey) &&
      isSameId(roleState[slot.requiredRoleKey]?.userId, user?.id)
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
    permissions: {
      ...permissions,
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

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    stageOrder: SOLUTION_DESIGN_STAGE.STAGE_ORDER,
    slots: materializedSlots.map((slot) =>
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

function buildAnalysisFormPermissions({ projectRow, analysisNode, roleState, user, analysisFormRow, uploadSlots }) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const uploadSlotRevisionByKey = buildCurrentUploadSlotRevisionMap(uploadSlots);
  const canEditForm = canProcessAnalysisForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    analysisNode
  });
  const canSubmitNode =
    canEditForm &&
    isAnalysisFormGeneratedForRevision(analysisFormRow, analysisNode?.current_revision) &&
    isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, analysisNode?.current_revision);
  const canReview = canReviewSolutionDesignNode({
    nodeRow: analysisNode || {},
    user,
    roleState,
    projectEnded,
    inSolutionStage
  });

  return {
    canViewForm: true,
    canEditForm,
    canSubmitForm: canEditForm,
    canSubmitNode,
    canApprove: canReview,
    canReturn: canReview
  };
}

function buildAnalysisFormDto({
  projectRow,
  nodes,
  rolesRow,
  uploadSlots,
  analysisFormRow,
  user,
  analysisStageDocumentRow = null,
  analysisImages = []
}) {
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const analysisNode = getNodeByKey(materializedNodes, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  const form = mapAnalysisForm(analysisFormRow);

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    nodeStatus: analysisNode?.status ?? SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    nodeRevision: analysisNode?.current_revision ?? 1,
    stageDocumentId: analysisStageDocumentRow?.id ?? null,
    images: analysisImages,
    form: form
      ? {
          ...form,
          stageDocumentId: analysisStageDocumentRow?.id ?? null,
          images: analysisImages
        }
      : null,
    permissions: buildAnalysisFormPermissions({
      projectRow,
      analysisNode,
      roleState,
      user,
      analysisFormRow,
      uploadSlots
    }),
    isProjectEnded: isSolutionDesignProjectEnded(projectRow)
  };
}

function buildReviewFormPermissions({ projectRow, reviewNode, roleState, user, reviewFormRow }) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const canEditReviewForm = canProcessReviewForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    reviewNode
  });
  const canReview = canReviewSolutionDesignNode({
    nodeRow: reviewNode || {},
    user,
    roleState,
    projectEnded,
    inSolutionStage
  });

  return {
    canViewReviewForm: true,
    canEditReviewForm,
    canSubmitReviewForm: canEditReviewForm,
    canSubmitNode:
      canEditReviewForm &&
      isReviewFormGeneratedForRevision(reviewFormRow, reviewNode?.current_revision),
    canApprove: canReview,
    canReturn: canReview
  };
}

function buildReviewFormDto({ projectRow, nodes, rolesRow, reviewFormRow, nodeKey, user }) {
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const reviewNode = getNodeByKey(materializedNodes, nodeKey);

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    nodeKey,
    nodeStatus: reviewNode?.status ?? SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    nodeRevision: reviewNode?.current_revision ?? 1,
    reviewType: definition.reviewType,
    documentCode: definition.documentCode,
    formName: definition.formName,
    templateName: definition.templateName,
    form: mapReviewForm(reviewFormRow),
    permissions: buildReviewFormPermissions({
      projectRow,
      reviewNode,
      roleState,
      user,
      reviewFormRow
    }),
    isProjectEnded: isSolutionDesignProjectEnded(projectRow)
  };
}

function buildGeneratedFileBlockingReason({ row, label, requiredRevision }) {
  if (!row || Number(row.revision ?? 0) < Number(requiredRevision ?? 1)) {
    return `当前版本${label}模板文件未生成成功`;
  }

  if (row.form_status !== SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED &&
      row.form_status !== SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED) {
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
    uploadSlotRevisionByKey = new Map(),
    analysisFormRow = null,
    reviewFormRowsByNodeKey = new Map()
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
    if (!isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, row.current_revision)) {
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

  if (row.status === SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED && row.node_order > 1) {
    const previousNode = SOLUTION_DESIGN_NODES[row.node_order - 2];
    return [`等待前置节点完成：${previousNode.nodeName}`];
  }

  if (row.status === SOLUTION_DESIGN_NODE_STATUS.RETURNED && row.return_reason) {
    return [row.return_reason];
  }

  return [];
}

function canSubmitNode({
  nodeRow,
  roleState,
  user,
  projectEnded,
  inSolutionStage,
  currentFileSlotKeys,
  uploadSlotRevisionByKey,
  analysisFormRow,
  reviewFormRowsByNodeKey = new Map(),
  quotationTenderFlow = null
}) {
  if (
    projectEnded ||
    !inSolutionStage ||
    !areAllRolesAssigned(roleState) ||
    !isNodeProcessableStatus(nodeRow.status)
  ) {
    return false;
  }

  const requiredRoleKey = getSubmitNodeRoleKey(nodeRow.node_key);
  if (!requiredRoleKey || !isSameId(roleState[requiredRoleKey]?.userId, user?.id)) {
    return false;
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return currentFileSlotKeys.has(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN);
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return (
      isAnalysisFormGeneratedForRevision(analysisFormRow, nodeRow.current_revision) &&
      isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, nodeRow.current_revision)
    );
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return areSolutionDesignOutputsUploadedForRevision(uploadSlotRevisionByKey, nodeRow.current_revision);
  }

  if (getSolutionDesignReviewFormDefinition(nodeRow.node_key)) {
    return isReviewFormGeneratedForRevision(
      reviewFormRowsByNodeKey.get(nodeRow.node_key),
      nodeRow.current_revision
    );
  }

  if (isCostEstimationNode(nodeRow.node_key)) {
    return isCostUploadSlotUploadedForRevision(
      uploadSlotRevisionByKey,
      nodeRow.node_key,
      nodeRow.current_revision
    );
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return canSubmitTender({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow,
      flowRow: quotationTenderFlow,
      uploadSlotRevisionByKey
    });
  }

  return false;
}

function canReviewSolutionDesignNode({ nodeRow, user, roleState, projectEnded, inSolutionStage }) {
  if (projectEnded || !inSolutionStage) {
    return false;
  }

  if (
    [
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST
    ].includes(nodeRow?.node_key)
  ) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      canAssignSolutionDesignRoles(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      isManufacturingCenterManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
      return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id);
    }

    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW &&
      isSolutionDesignGeneralManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      isSolutionDesignGeneralManager(user)
    );
  }

  return (
    false
  );
}

function canActAsReviewerForSolutionDesignNode({ nodeRow, user, roleState }) {
  if (
    [
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST
    ].includes(nodeRow?.node_key)
  ) {
    return canAssignSolutionDesignRoles(user);
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return isManufacturingCenterManager(user);
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW) {
      return isSolutionDesignGeneralManager(user);
    }

    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
      return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id);
    }

    return (
      isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id) ||
      isSolutionDesignGeneralManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return isSolutionDesignGeneralManager(user);
  }

  return false;
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
    uploadSlotRevisionByKey,
    analysisFormRow,
    reviewFormRowsByNodeKey,
    quotationTenderFlow
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
      uploadSlotRevisionByKey,
      analysisFormRow,
      reviewFormRowsByNodeKey,
      quotationTenderFlow
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
      uploadSlotRevisionByKey
    });
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
      uploadSlotRevisionByKey,
      analysisFormRow,
      reviewFormRowsByNodeKey
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
      uploadSlotRevisionByKey
    }),
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
        uploadSlotRevisionByKey,
        analysisFormRow,
        reviewFormRowsByNodeKey,
        quotationTenderFlow
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

function getWorkflowNodeDto(workflow, nodeKey) {
  return (workflow?.nodes || []).find((node) => node.nodeKey === nodeKey) || null;
}

function isWorkflowRoleAssignmentComplete(workflow) {
  return SOLUTION_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(workflow?.roles?.[definition.roleKey]?.userId));
}

function isGeneratedFormDtoCurrent(formDto, requiredRevision) {
  return (
    formDto?.status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ||
    formDto?.status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED
  ) &&
    Number(formDto?.revision ?? 0) >= Number(requiredRevision ?? 1) &&
    formDto?.generatedFile?.status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    formDto?.generatedFile?.canDownload === true;
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
        const usersById = await selectUsersByIds(connection, collectRoleUserIds(projectRow, rolesRow));
        const workflow = buildWorkflowDto({
          projectRow,
          nodes,
          uploadSlots,
          analysisFormRow,
          reviewFormRows,
          quotationTenderFlow,
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
  const usersById = await selectUsersByIds(executor, collectRoleUserIds(projectRow, rolesRow));
  return buildWorkflowDto({
    projectRow,
    nodes,
    uploadSlots,
    analysisFormRow,
    reviewFormRows,
    quotationTenderFlow,
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

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST && nodeStatus === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
    return {
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_FINANCE_RETURNED,
      summary: '财务负责人退回财务成本估算'
    };
  }

  return {
    actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_GENERAL_RETURNED,
    summary: '总经理退回财务成本估算，返回研发成本估算重走三段流程'
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
  resubmitScope = []
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

async function generateSolutionDesignFormFile({
  executor,
  projectRow,
  definition,
  formRow,
  actorUserId,
  storage,
  roleState,
  stageDocumentRow = null,
  readOnlineFormImage = readOnlineFormImageForGeneration
}) {
  let storageKey = null;
  const templateName = definition.templateName;
  const fileName = buildGeneratedFormFileName({
    projectRow,
    definition,
    revision: formRow.revision
  });

  try {
    const templateBuffer = await readSolutionDesignTemplate(templateName);
    const imageValues = await buildGeneratedFormImageValues({
      executor,
      projectRow,
      definition,
      stageDocumentRow,
      readOnlineFormImage
    });
    const generatedBuffer = renderXlsxTemplate(templateBuffer, {
      cellValues: buildGeneratedFormCellValues({
        projectRow,
        definition,
        formRow,
        roleState
      }),
      imageValues
    });
    storageKey = storage.createStorageKey({
      projectId: projectRow.id,
      documentCode: definition.documentCode,
      revision: formRow.revision
    });
    const stored = await storage.writeFile(storageKey, generatedBuffer);
    return {
      success: true,
      storageKey,
      fileName,
      mimeType: GENERATED_XLSX_MIME_TYPE,
      fileSize: Number(stored.size ?? generatedBuffer.length),
      templateName
    };
  } catch (error) {
    if (storageKey) {
      await storage.cleanupFile(storageKey);
    }
    return {
      success: false,
      templateName,
      errorMessage: buildGenerationErrorMessage(error)
    };
  }
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
  return Math.max(Number(nodeRow?.current_revision ?? 1), maxFileRevision) + 1;
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
    SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
  ];

  for (const costNodeKey of nodeKeys) {
    const returnedStatus = costNodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST
      ? SOLUTION_DESIGN_NODE_STATUS.RETURNED
      : SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED;
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
        returnedStatus,
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

    if (
      !productFunctionDiagram ||
      Number(productFunctionDiagram.revision ?? 0) < requiredRevision
    ) {
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
    const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
    const requiredRevision = Number(nodeRow?.current_revision ?? 1);
    const files = await selectCurrentUploadFiles(executor, projectId, SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS);
    const uploadedRevisionBySlotKey = new Map(
      files.map((file) => [file.slot_key, Number(file.revision ?? 0)])
    );
    const missing = SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.filter(
      (slotKey) => Number(uploadedRevisionBySlotKey.get(slotKey) ?? 0) < requiredRevision
    );
    if (missing.length > 0) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'All solution design outputs are required before submitting solution design node',
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
    const nodeRow = await selectSolutionDesignNodeForUpdate(executor, projectId, nodeKey);
    const requiredRevision = Number(nodeRow?.current_revision ?? 1);
    const files = await selectCurrentUploadFiles(executor, projectId, [slotKey]);
    const currentFile = files[0] || null;

    if (!currentFile || Number(currentFile.revision ?? 0) < requiredRevision) {
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
    await insertQuotationTenderLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: branchType === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
        ? OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_BRANCH_SELECTED
        : OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_BRANCH_SELECTED,
      summary: branchType === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
        ? '总经理选择报价流程'
        : '总经理选择投标流程',
      details: {
        branchType,
        revision: Number(nodeRow.current_revision ?? 1)
      }
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
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
    const files = await selectCurrentUploadFiles(connection, projectId, [SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE]);
    const currentFile = files[0] || null;
    if (
      !isQuotationBranchCurrent(flowRow, nodeRow) ||
      !currentFile ||
      Number(currentFile.revision ?? 0) < Number(nodeRow.current_revision ?? 1)
    ) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
        'Quotation file and quotation branch selection are required before submitting quotation',
        409,
        [SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE]
      );
    }

    await updateQuotationSubmitted(connection, { projectId, actorUserId: user.id });
    await markQuotationSlotSubmitted(connection, { projectId, userId: user.id });
    await insertQuotationTenderLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_SUBMITTED,
      summary: '商务负责人提交报价单',
      details: {
        branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION,
        revision: Number(nodeRow.current_revision ?? 1),
        slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE
      }
    });

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
          resubmitScope: SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS
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
      analysisImages
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

function assertGeneratedFormFileReady({ formRow, nodeRow, detailKey }) {
  if (
    !formRow ||
    Number(formRow.revision ?? 0) !== Number(nodeRow?.current_revision ?? 1) ||
    formRow.generated_file_status !== SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED ||
    !formRow.generated_file_storage_key
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND,
      'Current solution design generated file is not available',
      404,
      [detailKey]
    );
  }
}

async function buildGeneratedFormDownload({ formRow, storage, detailKey }) {
  try {
    const filePath = await storage.assertFileReadable(formRow.generated_file_storage_key);
    return {
      filePath,
      fileName: formRow.generated_file_name,
      mimeType: formRow.generated_file_mime_type || GENERATED_XLSX_MIME_TYPE,
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
      detailKey: 'analysisFormGeneratedFile'
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
      detailKey: `${definition.reviewType}ReviewFormGeneratedFile`
    });
    return buildGeneratedFormDownload({
      formRow,
      storage: generatedFileStorage,
      detailKey: `${definition.reviewType}ReviewFormGeneratedFile`
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
    }

    const refreshedNodes = await selectSolutionDesignNodes(connection, projectId);
    return buildReviewFormDto({
      projectRow,
      nodes: refreshedNodes.length > 0 ? refreshedNodes : nodes,
      rolesRow,
      reviewFormRow: savedFormRow,
      nodeKey: definition.nodeKey,
      user
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
    const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
    assertAllRolesAssigned(roleState);
    assertProjectRoleActor(roleState, requiredRoleKey, user);
    const nodeRow = await selectSolutionDesignNodeForUpdate(connection, projectId, node.nodeKey);
    assertNodeProcessable(nodeRow, node.nodeKey, 'submitted');
    await assertSubmitNodeReady(connection, { projectId, nodeKey: node.nodeKey });
    if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
      await updateAnalysisNodePendingReview(connection, {
        projectId,
        userId: user.id
      });
    } else if (getSolutionDesignReviewFormDefinition(node.nodeKey)) {
      await updateReviewNodePendingReview(connection, {
        projectId,
        nodeKey: node.nodeKey
      });
    } else if (isCostEstimationNode(node.nodeKey)) {
      await updateCostNodePendingReview(connection, {
        projectId,
        nodeKey: node.nodeKey,
        slotKey: getCostUploadSlotKeyForNode(node.nodeKey),
        userId: user.id
      });
    } else if (node.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
      const flowRow = await selectQuotationTenderFlow(connection, projectId, { forUpdate: true });
      if (!isTenderBranchCurrent(flowRow, nodeRow)) {
        throw new SolutionDesignWorkflowError(
          SOLUTION_DESIGN_ERROR.NODE_BLOCKED,
          'Tender branch must be selected before submitting quotation/tender node',
          409,
          ['branchType']
        );
      }
      await updateQuotationTenderNodePendingReview(connection, {
        projectId,
        userId: user.id
      });
    } else {
      await updateNodeApprovedAndActivateNext(connection, {
        projectId,
        nodeKey: node.nodeKey,
        nextNodeKey: getSubmitNodeNextNodeKey(node.nodeKey),
        userId: user.id
      });
    }
    await insertNodeSubmitLog(connection, {
      projectId,
      actorUserId: user.id,
      nodeKey: node.nodeKey
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function approveSolutionDesignWorkflowNode({ projectId, nodeKey, user }, db = pool) {
  const node = getSolutionDesignNodeDefinition(nodeKey);
  if (
    !node ||
    ![
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST,
      SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
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
        await approveFinanceCostByGeneralManager(connection, { projectId });
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
        resubmitScope: [getCostUploadSlotKeyForNode(node.nodeKey)]
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
        resubmitScope: SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS
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
