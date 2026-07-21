import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../../db/pool.js';
import {
  CONTRACT_SIGNING_ERROR,
  CONTRACT_SIGNING_NODE_KEY,
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_NODES,
  CONTRACT_SIGNING_PAYMENT_STATUS,
  CONTRACT_SIGNING_ROLE_KEY,
  CONTRACT_SIGNING_STAGE,
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS,
  CONTRACT_SIGNING_UPLOAD_SLOTS,
  ContractSigningWorkflowError,
  buildInitialContractSigningNodes,
  getContractSigningUploadSlotDefinition,
  isContractSigningGeneralManager,
  isContractSigningMarketingCenterManager,
  isContractSigningProjectEnded,
  isContractSigningRdCenterManager,
  isProjectInContractSigningStage
} from '../../domain/contractSigningWorkflow.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import {
  CONTRACT_SIGNING_UPLOAD_MAX_FILE_SIZE,
  assertContractSigningUploadFileReadable,
  cleanupContractSigningUploadFile,
  createContractSigningUploadStorageKey,
  writeContractSigningUploadFile
} from '../../storage/contractSigningUploadStorage.js';
import {
  assertStageDocumentGeneratedFileReadable,
  cleanupStageDocumentGeneratedFile,
  createStageDocumentGeneratedFileStorageKey,
  writeStageDocumentGeneratedFile
} from '../../storage/stageDocumentGeneratedFileStorage.js';
import { GENERATED_FILE_STATUS } from '../../domain/initiationTemplateFileManifest.js';
import { updateZipTextEntry } from '../../utils/ooxmlZip.js';
import { mapGeneratedFile } from '../stageDocuments/generatedFileRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { canViewProject } from './visibility.js';
import { ProjectAuthorizationError } from './shared.js';
import { materializeContractSigningWorkflow } from './contractSigningWorkflowMaterialization.js';
import {
  selectProjectContext,
  selectSolutionDesignRoles
} from './solutionDesignWorkflow/queries.js';
import { tryAutoAdvanceProjectStage } from './stageAdvanceRepository.js';

const PROCESSABLE_NODE_STATUSES = new Set([
  CONTRACT_SIGNING_NODE_STATUS.PENDING,
  CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
  CONTRACT_SIGNING_NODE_STATUS.RETURNED
]);
const REVIEWABLE_UPLOAD_SLOT_STATUSES = new Set([
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
]);
const CONFIRMABLE_UPLOAD_SLOT_STATUSES = new Set([
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
]);
const PREPARATION_UPLOAD_SLOT_KEYS = new Set([
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT
]);
const SIGNING_SCAN_UPLOAD_SLOT_KEYS = new Set([
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN
]);
const SUPPORTED_UPLOAD_SLOT_KEYS = new Set([
  ...PREPARATION_UPLOAD_SLOT_KEYS,
  ...SIGNING_SCAN_UPLOAD_SLOT_KEYS
]);
const CURRENT_CONTRACT_SIGNING_NODE_KEYS = new Set(CONTRACT_SIGNING_NODES.map((node) => node.nodeKey));
const CURRENT_CONTRACT_SIGNING_UPLOAD_SLOT_KEYS = new Set(
  CONTRACT_SIGNING_UPLOAD_SLOTS.map((slot) => slot.slotKey)
);
const PREPARATION_UPLOAD_REPLACEABLE_STATUSES = new Set([
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
]);
const DEFAULT_UPLOAD_MIME_TYPE = 'application/octet-stream';
const CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE = 'contract_kickoff_notice';
const CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME = '项目启动通知';
const CONTRACT_KICKOFF_NOTICE_TEMPLATE = Object.freeze({
  templateKey: 'contract_kickoff_notice_docx',
  fileType: 'docx',
  templateVersion: '20260721-contract-kickoff-notice-v1',
  triggerEvent: 'contract_signing.advance_payment_generated_kickoff_notice',
  generatedFileNamePrefix: '项目启动通知',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  templatePath: fileURLToPath(
    new URL('../../../../智能制造项目管理文件模板/项目启动通知-模板.docx', import.meta.url)
  )
});
const MAX_UPLOAD_TEXT_FIELD_LENGTH = 255;
const MAX_RETURN_REASON_LENGTH = 1000;

export const CONTRACT_SIGNING_WORKBENCH_TODO_TYPE = 'contract_signing_workflow';

const defaultContractSigningUploadStorage = {
  createStorageKey: createContractSigningUploadStorageKey,
  writeFile: writeContractSigningUploadFile,
  assertFileReadable: assertContractSigningUploadFileReadable,
  cleanupFile: cleanupContractSigningUploadFile
};

const defaultContractSigningGeneratedFileStorage = {
  createStorageKey: createStageDocumentGeneratedFileStorageKey,
  writeFile: writeStageDocumentGeneratedFile,
  assertFileReadable: assertStageDocumentGeneratedFileReadable,
  cleanupFile: cleanupStageDocumentGeneratedFile
};

function resolveContractSigningGeneratedFileStorage(db, storage) {
  return storage || db?.generatedFileStorage || defaultContractSigningGeneratedFileStorage;
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

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256')
    .update(Buffer.isBuffer(value) || typeof value === 'string' ? value : canonicalJson(value))
    .digest('hex');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function formatChineseDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function throwInvalidUploadFile() {
  throw new ContractSigningWorkflowError(
    CONTRACT_SIGNING_ERROR.INVALID_UPLOAD_FILE,
    'Invalid contract signing upload file',
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
    size > CONTRACT_SIGNING_UPLOAD_MAX_FILE_SIZE ||
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
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.RETURN_REASON_REQUIRED,
      'Contract signing return reason is required',
      400,
      ['returnReason']
    );
  }

  if (reason.length > MAX_RETURN_REASON_LENGTH) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.RETURN_REASON_REQUIRED,
      'Contract signing return reason is too long',
      400,
      ['returnReason']
    );
  }

  return reason;
}

function normalizeSigningConfirmationPayload(payload = {}) {
  const rawResult = String(
    payload.result ?? payload.confirmationResult ?? payload.status ?? ''
  ).trim();
  const normalizedResult = rawResult.toLowerCase();

  if (
    normalizedResult === 'approved' ||
    normalizedResult === 'passed' ||
    normalizedResult === 'pass' ||
    payload.approved === true
  ) {
    return {
      approved: true,
      returnReason: null
    };
  }

  if (
    normalizedResult === 'returned' ||
    normalizedResult === 'rejected' ||
    normalizedResult === 'failed' ||
    normalizedResult === 'fail' ||
    payload.approved === false
  ) {
    return {
      approved: false,
      returnReason: normalizeReturnReason(payload)
    };
  }

  throw new ContractSigningWorkflowError(
    CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
    'Contract signing scan confirmation result is invalid',
    400,
    ['result']
  );
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

function collectRoleUserIds(rolesRow) {
  return [
    rolesRow?.technical_owner_user_id,
    rolesRow?.business_owner_user_id
  ].filter(Boolean);
}

function buildRoleState({ rolesRow, usersById }) {
  const technicalOwnerUserId = rolesRow?.technical_owner_user_id ?? null;
  const businessOwnerUserId = rolesRow?.business_owner_user_id ?? null;

  return {
    [CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER]: {
      roleKey: CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER,
      label: '技术负责人',
      userId: technicalOwnerUserId,
      user: technicalOwnerUserId ? usersById.get(Number(technicalOwnerUserId)) || null : null,
      source: 'solution_design_role_assignment'
    },
    [CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER]: {
      roleKey: CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER,
      label: '商务负责人',
      userId: businessOwnerUserId,
      user: businessOwnerUserId ? usersById.get(Number(businessOwnerUserId)) || null : null,
      source: 'solution_design_role_assignment'
    }
  };
}

function buildRoleStateWithoutUserDetails(rolesRow) {
  return buildRoleState({ rolesRow, usersById: new Map() });
}

function areRequiredContractRolesAssigned(roleState) {
  return Boolean(
    roleState[CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER]?.userId &&
    roleState[CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER]?.userId
  );
}

function isTechnicalOwner(roleState, user) {
  return isSameId(roleState[CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER]?.userId, user?.id);
}

function isBusinessOwner(roleState, user) {
  return isSameId(roleState[CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id);
}

function isContractSigningRoleActor({ rolesRow, user }) {
  if (!user?.id) {
    return false;
  }

  const roleState = buildRoleStateWithoutUserDetails(rolesRow);
  return (
    isTechnicalOwner(roleState, user) ||
    isBusinessOwner(roleState, user)
  );
}

async function assertWorkflowViewable(executor, projectId, user, { rolesRow = null } = {}) {
  if (
    !(await canViewProject(executor, user, projectId)) &&
    !isContractSigningRoleActor({ rolesRow, user })
  ) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot access this project',
      ['projectId']
    );
  }
}

function shouldPersistInitialWorkflow(projectRow) {
  return !isContractSigningProjectEnded(projectRow) && isProjectInContractSigningStage(projectRow);
}

async function selectContractSigningNodes(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_contract_signing_nodes
    WHERE project_id = ?
    ORDER BY node_order ASC`,
    [projectId]
  );

  return rows.filter((row) => CURRENT_CONTRACT_SIGNING_NODE_KEYS.has(row.node_key));
}

async function selectContractSigningNodeForUpdate(executor, projectId, nodeKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_contract_signing_nodes
    WHERE project_id = ?
      AND node_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

async function selectContractSigningUploadSlots(executor, projectId) {
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
      u.display_name AS current_file_uploaded_by_display_name,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      reviewer.account AS reviewed_by_account,
      reviewer.display_name AS reviewed_by_display_name,
      confirmer.account AS confirmed_by_account,
      confirmer.display_name AS confirmed_by_display_name
    FROM project_contract_signing_upload_slots s
    LEFT JOIN project_contract_signing_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    LEFT JOIN users submitter
      ON submitter.id = s.submitted_by_user_id
    LEFT JOIN users reviewer
      ON reviewer.id = s.reviewed_by_user_id
    LEFT JOIN users confirmer
      ON confirmer.id = s.confirmed_by_user_id
    WHERE s.project_id = ?
    ORDER BY s.slot_order ASC`,
    [projectId]
  );

  return rows.filter((row) => CURRENT_CONTRACT_SIGNING_UPLOAD_SLOT_KEYS.has(row.slot_key));
}

async function selectContractSigningUploadSlotForUpdate(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT
      s.*,
      f.id AS current_file_id
    FROM project_contract_signing_upload_slots s
    LEFT JOIN project_contract_signing_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    WHERE s.project_id = ?
      AND s.slot_key = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, slotKey]
  );

  return rows[0] || null;
}

async function selectCurrentUploadFiles(executor, projectId, slotKey) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_contract_signing_upload_files
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, slotKey]
  );

  return rows;
}

async function selectUploadFileWithUploader(executor, fileId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_contract_signing_upload_files f
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    WHERE f.id = ?
    LIMIT 1`,
    [fileId]
  );

  return rows[0] || null;
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
    FROM project_contract_signing_upload_files f
    INNER JOIN project_contract_signing_upload_slots s
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

async function selectContractSigningPaymentFlow(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      requester.account AS requested_by_account,
      requester.display_name AS requested_by_display_name,
      approver.account AS approved_by_account,
      approver.display_name AS approved_by_display_name
    FROM project_contract_signing_payment_flows f
    LEFT JOIN users requester
      ON requester.id = f.requested_by_user_id
    LEFT JOIN users approver
      ON approver.id = f.approved_by_user_id
    WHERE f.project_id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectContractSigningPaymentFlowForUpdate(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      requester.account AS requested_by_account,
      requester.display_name AS requested_by_display_name,
      approver.account AS approved_by_account,
      approver.display_name AS approved_by_display_name
    FROM project_contract_signing_payment_flows f
    LEFT JOIN users requester
      ON requester.id = f.requested_by_user_id
    LEFT JOIN users approver
      ON approver.id = f.approved_by_user_id
    WHERE f.project_id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId]
  );

  return rows[0] || null;
}

async function selectLatestProjectKickoffNoticeGeneratedFile(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND document_code = ?
      AND template_key = ?
    ORDER BY version DESC, id DESC
    LIMIT 1`,
    [projectId, CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE, CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey]
  );

  return rows[0] || null;
}

async function selectLatestDownloadableProjectKickoffNoticeGeneratedFile(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND document_code = ?
      AND template_key = ?
      AND status = ?
      AND storage_key IS NOT NULL
    ORDER BY version DESC, id DESC
    LIMIT 1`,
    [
      projectId,
      CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey,
      GENERATED_FILE_STATUS.GENERATED
    ]
  );

  return rows[0] || null;
}

async function selectProjectKickoffNoticeGeneratedFileDto(executor, projectId) {
  const [latestRow, downloadableRow] = await Promise.all([
    selectLatestProjectKickoffNoticeGeneratedFile(executor, projectId),
    selectLatestDownloadableProjectKickoffNoticeGeneratedFile(executor, projectId)
  ]);

  return latestRow
    ? {
        ...mapGeneratedFile(latestRow, { downloadableRow }),
        documentCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
        documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
        downloadEndpoint: downloadableRow
          ? `/api/projects/${projectId}/contract-signing-workflow/kickoff-notice/generated-file/download`
          : null
      }
    : {
        id: null,
        projectId,
        stageDocumentId: null,
        documentCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
        documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
        templateKey: CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey,
        fileType: CONTRACT_KICKOFF_NOTICE_TEMPLATE.fileType,
        version: null,
        status: 'not_generated',
        fileName: null,
        mimeType: CONTRACT_KICKOFF_NOTICE_TEMPLATE.mimeType,
        fileSize: null,
        generatedByUserId: null,
        generatedAt: null,
        failureReason: null,
        failureSummary: null,
        sourceFormSubmittedAt: null,
        sourceFormDataHash: null,
        triggerEvent: CONTRACT_KICKOFF_NOTICE_TEMPLATE.triggerEvent,
        templateVersion: CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateVersion,
        templateHash: null,
        downloadable: false,
        downloadableVersion: null,
        downloadableFileName: null,
        downloadableGeneratedAt: null,
        downloadEndpoint: null,
        createdAt: null,
        updatedAt: null
      };
}

async function ensureContractSigningWorkflowState(executor, projectRow) {
  let [nodes, uploadSlots, paymentFlow] = await Promise.all([
    selectContractSigningNodes(executor, projectRow.id),
    selectContractSigningUploadSlots(executor, projectRow.id),
    selectContractSigningPaymentFlow(executor, projectRow.id)
  ]);

  const isComplete =
    nodes.length >= CONTRACT_SIGNING_NODES.length &&
    uploadSlots.length >= CONTRACT_SIGNING_UPLOAD_SLOTS.length &&
    Boolean(paymentFlow);

  if (shouldPersistInitialWorkflow(projectRow) && !isComplete) {
    await materializeContractSigningWorkflow(executor, projectRow.id);
    [nodes, uploadSlots, paymentFlow] = await Promise.all([
      selectContractSigningNodes(executor, projectRow.id),
      selectContractSigningUploadSlots(executor, projectRow.id),
      selectContractSigningPaymentFlow(executor, projectRow.id)
    ]);
  }

  return { nodes, uploadSlots, paymentFlow };
}

function buildVirtualNodes(projectRow) {
  const initialNodes = isProjectInContractSigningStage(projectRow)
    ? buildInitialContractSigningNodes()
    : CONTRACT_SIGNING_NODES.map((node) => ({
        ...node,
        status: CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED
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
    activated_at: node.status === CONTRACT_SIGNING_NODE_STATUS.PENDING ? null : null,
    submitted_at: null,
    approved_at: null,
    returned_at: null
  }));
}

function buildVirtualUploadSlots(projectRow) {
  return CONTRACT_SIGNING_UPLOAD_SLOTS.map((slot) => ({
    id: null,
    project_id: projectRow?.id ?? null,
    node_key: slot.nodeKey,
    slot_key: slot.slotKey,
    slot_name: slot.slotName,
    slot_order: slot.slotOrder,
    is_required: 1,
    revision: 1,
    status: CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING,
    review_status: null,
    confirmation_status: null,
    return_reason: null,
    submitted_by_user_id: null,
    submitted_at: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    confirmed_by_user_id: null,
    confirmed_at: null,
    current_file_id: null
  }));
}

function buildVirtualPaymentFlow(projectRow) {
  return {
    id: null,
    project_id: projectRow?.id ?? null,
    status: CONTRACT_SIGNING_PAYMENT_STATUS.NOT_STARTED,
    requested_by_user_id: null,
    requested_at: null,
    approved_by_user_id: null,
    approved_at: null
  };
}

function mapCurrentUploadFile(row) {
  if (!row.current_file_id) {
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
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    revision: row.revision,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    uploadedByUser: {
      id: row.uploaded_by_user_id,
      account: row.uploaded_by_account ?? null,
      name: row.uploaded_by_display_name ?? null
    }
  };
}

function getNodeByKey(nodes, nodeKey) {
  return nodes.find((node) => node.node_key === nodeKey) || null;
}

function getSlotByKey(slots, slotKey) {
  return slots.find((slot) => slot.slot_key === slotKey) || null;
}

function isNodeProcessable(nodeRow) {
  return PROCESSABLE_NODE_STATUSES.has(nodeRow?.status);
}

function hasCurrentFile(slotRow) {
  return Boolean(slotRow?.current_file_id);
}

function isSlotUploadable(slotRow) {
  return PREPARATION_UPLOAD_REPLACEABLE_STATUSES.has(slotRow?.status);
}

function isPreparationSlot(slot) {
  return Boolean(slot) && PREPARATION_UPLOAD_SLOT_KEYS.has(slot.slotKey);
}

function isSigningScanSlot(slot) {
  return Boolean(slot) && SIGNING_SCAN_UPLOAD_SLOT_KEYS.has(slot.slotKey);
}

function getPreparationSlotKeyForSigningScan(slotKey) {
  if (slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN) {
    return CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT;
  }

  if (slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN) {
    return CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT;
  }

  return null;
}

function getSigningScanSlotKeyForPreparationSlot(slotKey) {
  if (slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT) {
    return CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN;
  }

  if (slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT) {
    return CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN;
  }

  return null;
}

function isSigningScanPreparationLineApproved({ slot, slots }) {
  const preparationSlotKey = getPreparationSlotKeyForSigningScan(slot?.slotKey);
  if (!preparationSlotKey) {
    return false;
  }

  const preparationSlot = getSlotByKey(slots, preparationSlotKey);
  return preparationSlot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED;
}

function areSigningPreparationLinesApproved(slots) {
  return [
    CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT
  ].every((slotKey) => getSlotByKey(slots, slotKey)?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED);
}

function areSigningScansUploaded(slots) {
  return [
    CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN
  ].every((slotKey) => {
    const slot = getSlotByKey(slots, slotKey);
    return hasCurrentFile(slot) && slot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED;
  });
}

function isSigningReadyForCompletion(slots) {
  return areSigningPreparationLinesApproved(slots) && areSigningScansUploaded(slots);
}

function isUploadSlotCurrentlyUploadable({ slot, slotRow, slots = [] }) {
  if (!slotRow || !isSlotUploadable(slotRow)) {
    return false;
  }

  if (isSigningScanSlot(slot)) {
    return isSigningScanPreparationLineApproved({ slot, slots });
  }

  return true;
}

function canDownloadContractSigningUploadFile({ slot, roleState, user }) {
  if (!slot) {
    return false;
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT) {
    return isTechnicalOwner(roleState, user) || isContractSigningRdCenterManager(user);
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT) {
    return isBusinessOwner(roleState, user) || isContractSigningMarketingCenterManager(user);
  }

  return isBusinessOwner(roleState, user);
}

function assertRequiredRolesAssigned(roleState) {
  if (!areRequiredContractRolesAssigned(roleState)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.FORBIDDEN,
      'Contract signing role assignment is incomplete',
      409,
      ['roles']
    );
  }
}

function assertContractRoleActor(roleState, roleKey, user) {
  const role = roleState[roleKey];
  if (!role?.userId || !isSameId(role.userId, user?.id)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.FORBIDDEN,
      'Current user cannot operate this contract signing workflow item',
      403,
      [roleKey]
    );
  }
}

function assertNodeProcessable(nodeRow, nodeKey, action) {
  if (!nodeRow || !PROCESSABLE_NODE_STATUSES.has(nodeRow.status)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      `Contract signing node cannot be ${action} in its current status`,
      409,
      {
        nodeKey,
        allowedStatuses: [...PROCESSABLE_NODE_STATUSES]
      }
    );
  }
}

function assertAdvancePaymentReadyForBusinessAction(nodeRow, paymentFlow) {
  if (!isAdvancePaymentPending(nodeRow, paymentFlow)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment node is not ready for business owner payment action',
      409,
      {
        nodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
        nodeStatus: nodeRow?.status ?? null,
        paymentStatus: paymentFlow?.status ?? null
      }
    );
  }
}

function assertAdvancePaymentReadyForGeneralManagerRelease(nodeRow, paymentFlow) {
  if (!isAdvancePaymentWaitingGeneralManager(nodeRow, paymentFlow)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment node is not waiting for general manager release',
      409,
      {
        nodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
        nodeStatus: nodeRow?.status ?? null,
        paymentStatus: paymentFlow?.status ?? null
      }
    );
  }
}

function assertPreparationLineApprovedForCustomerReturn(slotRow, slot) {
  if (slotRow?.status !== CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing preparation line is not approved for customer return',
      409,
      {
        slotKey: slot.slotKey,
        slotStatus: slotRow?.status ?? null
      }
    );
  }
}

function assertSigningReadyForCompletion({ nodeRow, slots }) {
  assertNodeProcessable(nodeRow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING, 'completed');

  if (!isSigningReadyForCompletion(slots)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Contract signing node is not ready to complete',
      409,
      {
        nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
        missingRequirements: buildSigningCompletionBlockingReasons(slots)
      }
    );
  }
}

function assertGeneralManagerActor(user) {
  if (!isContractSigningGeneralManager(user)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.FORBIDDEN,
      'Current user cannot approve advance payment release',
      403,
      ['generalManager']
    );
  }
}

function assertPreparationSlot(slot) {
  if (!isPreparationSlot(slot)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.INVALID_UPLOAD_SLOT,
      'Contract signing preparation action only supports technical agreement and sales contract',
      400,
      ['slotKey']
    );
  }
}

function assertSupportedUploadSlot(slot) {
  if (!slot || !SUPPORTED_UPLOAD_SLOT_KEYS.has(slot.slotKey)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.INVALID_UPLOAD_SLOT,
      'Contract signing upload action only supports preparation files and signed scan files',
      400,
      ['slotKey']
    );
  }
}

function assertNotDeprecatedProjectKickoffNoticeUpload(slotKey) {
  if (slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.DEPRECATED_ACTION,
      'Project kickoff notice is generated by advance payment final actions and cannot be uploaded manually.',
      410,
      {
        deprecatedSlotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
        replacementActions: [
          '/contract-signing-workflow/payment/complete',
          '/contract-signing-workflow/payment/approve-release-unpaid',
          '/contract-signing-workflow/payment/approve-release-paid'
        ]
      }
    );
  }
}

function assertSigningScanSlot(slot) {
  if (!isSigningScanSlot(slot)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.INVALID_UPLOAD_SLOT,
      'Contract signing confirmation action only supports signed scan files',
      400,
      ['slotKey']
    );
  }
}

function assertUploadSlotReplaceable({ slotRow, slot, slots = [] }) {
  if (!isUploadSlotCurrentlyUploadable({ slot, slotRow, slots })) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing file cannot be uploaded in its current status',
      409,
      {
        slotKey: slot.slotKey,
        allowedStatuses: [...PREPARATION_UPLOAD_REPLACEABLE_STATUSES]
      }
    );
  }
}

function assertCanDownloadContractSigningUploadFile({ slot, roleState, user }) {
  if (!canDownloadContractSigningUploadFile({ slot, roleState, user })) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.FORBIDDEN,
      'Current user cannot download this contract signing upload file',
      403,
      [slot.slotKey]
    );
  }
}

function assertPreparationSlotReadyForReview(slotRow, slot) {
  if (!hasCurrentFile(slotRow) || !REVIEWABLE_UPLOAD_SLOT_STATUSES.has(slotRow?.status)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing preparation file is not ready for review',
      409,
      [slot.slotKey]
    );
  }
}

function assertSigningScanSlotReadyForConfirmation(slotRow, slot) {
  if (!isSlotReadyForSigningConfirmation(slotRow)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing scan file is not ready for offline signing result confirmation',
      409,
      [slot.slotKey]
    );
  }
}

function assertPreparationSlotReviewer({ slot, user }) {
  const allowed =
    slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
      ? isContractSigningRdCenterManager(user)
      : isContractSigningMarketingCenterManager(user);

  if (!allowed) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.FORBIDDEN,
      'Current user cannot review this contract signing workflow item',
      403,
      [slot.slotKey]
    );
  }
}

function isSlotReadyForReview(slotRow) {
  return hasCurrentFile(slotRow) && REVIEWABLE_UPLOAD_SLOT_STATUSES.has(slotRow?.status);
}

function isSlotReadyForSigningConfirmation(slotRow) {
  return hasCurrentFile(slotRow) && CONFIRMABLE_UPLOAD_SLOT_STATUSES.has(slotRow?.status);
}

function isAdvancePaymentPending(nodeRow, paymentFlow) {
  return (
    nodeRow?.status === CONTRACT_SIGNING_NODE_STATUS.PENDING &&
    paymentFlow?.status === CONTRACT_SIGNING_PAYMENT_STATUS.PENDING
  );
}

function isAdvancePaymentWaitingGeneralManager(nodeRow, paymentFlow) {
  return (
    nodeRow?.status === CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER &&
    paymentFlow?.status === CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER
  );
}

function buildUploadSlotPermissions({
  slot,
  slotRow,
  nodeRow,
  roleState,
  user,
  projectEnded,
  inContractStage,
  slots
}) {
  const hasAssignedRoles = areRequiredContractRolesAssigned(roleState);
  const nodeAllowsUpload = isNodeProcessable(nodeRow);
  const canWrite =
    !projectEnded &&
    inContractStage &&
    hasAssignedRoles &&
    nodeAllowsUpload;
  const isRequiredActor =
    slot.requiredRoleKey === CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER
      ? isTechnicalOwner(roleState, user)
      : isBusinessOwner(roleState, user);
  const canUploadSlot =
    canWrite &&
    isRequiredActor &&
    isUploadSlotCurrentlyUploadable({ slot, slotRow, slots });
  const canReview =
    canWrite &&
    isSlotReadyForReview(slotRow) &&
    slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT &&
    isContractSigningRdCenterManager(user);
  const canReviewSales =
    canWrite &&
    isSlotReadyForReview(slotRow) &&
    slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT &&
    isContractSigningMarketingCenterManager(user);
  return {
    canUpload: canUploadSlot,
    canDownload: hasCurrentFile(slotRow) && canDownloadContractSigningUploadFile({ slot, roleState, user }),
    canSubmit: canUploadSlot,
    canApprove: canReview || canReviewSales,
    canReturn: canReview || canReviewSales
  };
}

function buildNodePermissions({
  nodeRow,
  roleState,
  user,
  projectEnded,
  inContractStage,
  slots,
  paymentFlow
}) {
  const hasAssignedRoles = areRequiredContractRolesAssigned(roleState);
  const canWrite =
    !projectEnded &&
    inContractStage &&
    hasAssignedRoles &&
    isNodeProcessable(nodeRow);
  const technicalOwner = isTechnicalOwner(roleState, user);
  const businessOwner = isBusinessOwner(roleState, user);

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION) {
    const technicalAgreementSlot = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
    const salesContractSlot = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT);
    const canReviewTechnicalAgreement =
      canWrite &&
      isSlotReadyForReview(technicalAgreementSlot) &&
      isContractSigningRdCenterManager(user);
    const canReviewSalesContract =
      canWrite &&
      isSlotReadyForReview(salesContractSlot) &&
      isContractSigningMarketingCenterManager(user);
    return {
      canUploadTechnicalAgreement:
        canWrite &&
        technicalOwner &&
        isUploadSlotCurrentlyUploadable({
          slot: getContractSigningUploadSlotDefinition(CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT),
          slotRow: technicalAgreementSlot,
          slots
        }),
      canUploadSalesContract:
        canWrite &&
        businessOwner &&
        isUploadSlotCurrentlyUploadable({
          slot: getContractSigningUploadSlotDefinition(CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT),
          slotRow: salesContractSlot,
          slots
        }),
      canApproveTechnicalAgreement: canReviewTechnicalAgreement,
      canReturnTechnicalAgreement: canReviewTechnicalAgreement,
      canApproveSalesContract: canReviewSalesContract,
      canReturnSalesContract: canReviewSalesContract
    };
  }

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING) {
    const technicalAgreementSlot = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
    const salesContractSlot = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT);
    const technicalAgreementScanSlot = getSlotByKey(
      slots,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN
    );
    const salesContractScanSlot = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN);
    const canCompleteSigning = canWrite && businessOwner && isSigningReadyForCompletion(slots);
    return {
      canUploadTechnicalAgreementScan:
        canWrite &&
        businessOwner &&
        isUploadSlotCurrentlyUploadable({
          slot: getContractSigningUploadSlotDefinition(CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN),
          slotRow: technicalAgreementScanSlot,
          slots
        }),
      canUploadSalesContractScan:
        canWrite &&
        businessOwner &&
        isUploadSlotCurrentlyUploadable({
          slot: getContractSigningUploadSlotDefinition(CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN),
          slotRow: salesContractScanSlot,
          slots
        }),
      canReturnTechnicalAgreementForCustomer:
        canWrite &&
        businessOwner &&
        technicalAgreementSlot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED,
      canReturnSalesContractForCustomer:
        canWrite &&
        businessOwner &&
        salesContractSlot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED,
      canCompleteSigning
    };
  }

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT) {
    const paymentPending = isAdvancePaymentPending(nodeRow, paymentFlow);
    const waitingGeneralManager = isAdvancePaymentWaitingGeneralManager(nodeRow, paymentFlow);
    return {
      canCompletePayment: canWrite && businessOwner && paymentPending,
      canRequestGeneralManagerRelease: canWrite && businessOwner && paymentPending,
      canApprovePaymentReleaseUnpaid:
        !projectEnded &&
        inContractStage &&
        hasAssignedRoles &&
        isContractSigningGeneralManager(user) &&
        waitingGeneralManager,
      canApprovePaymentReleasePaid:
        !projectEnded &&
        inContractStage &&
        hasAssignedRoles &&
        isContractSigningGeneralManager(user) &&
        waitingGeneralManager
    };
  }

  return {};
}

function buildNextActions(permissions = {}) {
  return Object.entries(permissions)
    .filter(([, allowed]) => allowed === true)
    .map(([key]) => key);
}

function buildPreparationSlotBlockingReason({ slotRow, pendingText, submittedText, returnedText }) {
  if (!slotRow || slotRow.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING) {
    return pendingText;
  }

  if (slotRow.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED) {
    return submittedText;
  }

  if (slotRow.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED) {
    return returnedText;
  }

  return null;
}

function buildSigningScanBlockingReason({ slotRow, preparationSlot, pendingText, uploadedText, returnedText }) {
  if (preparationSlot?.status !== CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED) {
    return returnedText;
  }

  if (!slotRow || slotRow.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING) {
    return pendingText;
  }

  if (slotRow.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED) {
    return uploadedText;
  }

  return null;
}

function buildSigningCompletionBlockingReasons(slots) {
  const technicalAgreement = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
  const salesContract = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT);
  const technicalScan = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN);
  const salesScan = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN);
  return [
    technicalAgreement?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
      ? null
      : '等待技术协议准备线整改重提',
    salesContract?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
      ? null
      : '等待销售合同准备线整改重提',
    hasCurrentFile(technicalScan) && technicalScan?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED
      ? null
      : '等待商务负责人上传技术协议扫描件',
    hasCurrentFile(salesScan) && salesScan?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED
      ? null
      : '等待商务负责人上传销售合同扫描件'
  ].filter(Boolean);
}

function buildNodeBlockingReasons({ nodeRow, roleState, slots, paymentFlow }) {
  if (!areRequiredContractRolesAssigned(roleState)) {
    return ['方案设计阶段技术负责人和商务负责人尚未齐套，无法处理合同签订 workflow'];
  }

  if (nodeRow.status === CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED) {
    return ['等待前置合同节点完成'];
  }

  if (nodeRow.status === CONTRACT_SIGNING_NODE_STATUS.APPROVED) {
    return [];
  }

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION) {
    const technicalAgreement = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
    const salesContract = getSlotByKey(slots, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT);
    return [
      buildPreparationSlotBlockingReason({
        slotRow: technicalAgreement,
        pendingText: '等待技术负责人上传技术协议',
        submittedText: '等待研发中心负责人审批技术协议',
        returnedText: '等待技术负责人整改并重新上传技术协议'
      }),
      buildPreparationSlotBlockingReason({
        slotRow: salesContract,
        pendingText: '等待商务负责人上传销售合同',
        submittedText: '等待营销中心负责人审批销售合同',
        returnedText: '等待商务负责人整改并重新上传销售合同'
      })
    ].filter(Boolean);
  }

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING) {
    return buildSigningCompletionBlockingReasons(slots);
  }

  if (nodeRow.node_key === CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT) {
    if (isAdvancePaymentWaitingGeneralManager(nodeRow, paymentFlow)) {
      return ['等待总经理审批预付款放行'];
    }

    return ['等待商务负责人处理项目预付款'];
  }

  return [];
}

function mapNode(row, context) {
  const permissions = buildNodePermissions({
    nodeRow: row,
    ...context
  });

  const mapped = {
    nodeKey: row.node_key,
    nodeName: row.node_name,
    nodeOrder: row.node_order,
    status: row.status,
    returnReason: row.return_reason,
    currentRevision: row.current_revision,
    activatedAt: row.activated_at,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    returnedAt: row.returned_at,
    blockingReasons: buildNodeBlockingReasons({
      nodeRow: row,
      roleState: context.roleState,
      slots: context.slots,
      paymentFlow: context.paymentFlow
    }),
    permissions,
    nextActions: buildNextActions(permissions)
  };

  if (row.node_key === CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT) {
    mapped.kickoffNoticeGeneratedFile = context.kickoffNoticeGeneratedFile || null;
  }

  return mapped;
}

function mapUploadSlot(row, context) {
  const definition = getContractSigningUploadSlotDefinition(row.slot_key);
  const slot = definition || {
    slotKey: row.slot_key,
    slotName: row.slot_name,
    nodeKey: row.node_key,
    slotOrder: row.slot_order,
    requiredRoleKey: null
  };
  const nodeRow = getNodeByKey(context.nodes, row.node_key);
  const permissions = buildUploadSlotPermissions({
    slot,
    slotRow: row,
    nodeRow,
    roleState: context.roleState,
    user: context.user,
    projectEnded: context.projectEnded,
    inContractStage: context.inContractStage,
    slots: context.slots
  });

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
    reviewStatus: row.review_status,
    confirmationStatus: row.confirmation_status,
    returnReason: row.return_reason,
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    confirmedByUserId: row.confirmed_by_user_id,
    confirmedAt: row.confirmed_at,
    hasCurrentFile: Boolean(row.current_file_id),
    currentFile: mapCurrentUploadFile(row),
    permissions
  };
}

function mapPaymentFlow(row, { kickoffNoticeGeneratedFile = null } = {}) {
  const paymentFlow = row || buildVirtualPaymentFlow();

  return {
    id: paymentFlow.id ?? null,
    status: paymentFlow.status ?? CONTRACT_SIGNING_PAYMENT_STATUS.NOT_STARTED,
    requestedBy: paymentFlow.requested_by_user_id
      ? {
          id: paymentFlow.requested_by_user_id,
          account: paymentFlow.requested_by_account ?? null,
          name: paymentFlow.requested_by_display_name ?? null
        }
      : null,
    requestedAt: paymentFlow.requested_at ?? null,
    approvedBy: paymentFlow.approved_by_user_id
      ? {
          id: paymentFlow.approved_by_user_id,
          account: paymentFlow.approved_by_account ?? null,
          name: paymentFlow.approved_by_display_name ?? null
        }
      : null,
    approvedAt: paymentFlow.approved_at ?? null,
    kickoffNoticeGeneratedFile
  };
}

async function replaceCurrentPreparationSlotFile(executor, { projectId, slotRow, slot, uploadFile, storageKey, userId }) {
  const currentFiles = await selectCurrentUploadFiles(executor, projectId, slot.slotKey);
  const currentRevision = Math.max(
    Number(slotRow.revision ?? 0),
    ...currentFiles.map((file) => Number(file.revision ?? 0))
  );
  const nextRevision = currentFiles.length > 0 ? currentRevision + 1 : 1;

  await executor.execute(
    `UPDATE project_contract_signing_upload_files
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, slot.slotKey]
  );

  const [result] = await executor.execute(
    `INSERT INTO project_contract_signing_upload_files (
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
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = ?,
      confirmation_status = NULL,
      return_reason = NULL,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      revision = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED,
      'pending',
      userId,
      nextRevision,
      slotRow.id
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );

  return selectUploadFileWithUploader(executor, result.insertId);
}

async function replaceCurrentSigningScanSlotFile(executor, { projectId, slotRow, slot, uploadFile, storageKey, userId }) {
  const currentFiles = await selectCurrentUploadFiles(executor, projectId, slot.slotKey);
  const currentRevision = Math.max(
    Number(slotRow.revision ?? 0),
    ...currentFiles.map((file) => Number(file.revision ?? 0))
  );
  const nextRevision = currentFiles.length > 0 ? currentRevision + 1 : 1;

  await executor.execute(
    `UPDATE project_contract_signing_upload_files
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, slot.slotKey]
  );

  const [result] = await executor.execute(
    `INSERT INTO project_contract_signing_upload_files (
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
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = NULL,
      confirmation_status = NULL,
      return_reason = NULL,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      confirmed_by_user_id = NULL,
      confirmed_at = NULL,
      revision = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED,
      userId,
      nextRevision,
      slotRow.id
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );

  return selectUploadFileWithUploader(executor, result.insertId);
}

async function markPreparationSlotApproved(executor, { slotRow, slot, actorUserId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = ?,
      return_reason = NULL,
      reviewed_by_user_id = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED,
      'approved',
      actorUserId,
      slotRow.id,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing preparation file status changed before approval',
      409,
      [slot.slotKey]
    );
  }
}

async function markPreparationSlotReturned(executor, { slotRow, slot, actorUserId, returnReason }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = ?,
      return_reason = ?,
      reviewed_by_user_id = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED,
      'returned',
      returnReason,
      actorUserId,
      slotRow.id,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing preparation file status changed before return',
      409,
      [slot.slotKey]
    );
  }

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      return_reason = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.RETURNED,
      returnReason,
      slotRow.project_id,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );
}

async function refreshPreparationNodeAfterApproval(executor, { projectId }) {
  const slots = [
    await selectContractSigningUploadSlotForUpdate(
      executor,
      projectId,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
    ),
    await selectContractSigningUploadSlotForUpdate(
      executor,
      projectId,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT
    )
  ];
  const allApproved = slots.every((slot) => slot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED);

  if (!allApproved) {
    await executor.execute(
      `UPDATE project_contract_signing_nodes
      SET status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND node_key = ?
        AND status IN (?, ?, ?)`,
      [
        CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
        projectId,
        CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
        CONTRACT_SIGNING_NODE_STATUS.PENDING,
        CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
        CONTRACT_SIGNING_NODE_STATUS.RETURNED
      ]
    );
    return false;
  }

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.APPROVED,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );

  return true;
}

async function markSigningScanSlotConfirmed(
  executor,
  { slotRow, slot, actorUserId, approved, returnReason = null }
) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      confirmation_status = ?,
      return_reason = ?,
      confirmed_by_user_id = ?,
      confirmed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status IN (?, ?)`,
    [
      approved
        ? CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
        : CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED,
      approved ? 'approved' : 'returned',
      returnReason,
      actorUserId,
      slotRow.id,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing scan file status changed before confirmation',
      409,
      [slot.slotKey]
    );
  }
}

async function returnPreparationLineFromSigningScan(executor, { projectId, slot, returnReason }) {
  const preparationSlotKey = getPreparationSlotKeyForSigningScan(slot.slotKey);
  await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = ?,
      return_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED,
      'returned',
      returnReason,
      projectId,
      preparationSlotKey,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      return_reason = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.RETURNED,
      returnReason,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_STATUS.APPROVED,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );
}

async function returnPreparationLineForCustomer(executor, { projectId, slot, returnReason }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      review_status = ?,
      return_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED,
      'returned',
      returnReason,
      projectId,
      slot.slotKey,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing preparation line status changed before customer return',
      409,
      [slot.slotKey]
    );
  }

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      return_reason = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.RETURNED,
      returnReason,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_STATUS.APPROVED,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );
}

async function invalidateSigningScanForPreparationLine(executor, { projectId, preparationSlotKey }) {
  const scanSlotKey = getSigningScanSlotKeyForPreparationSlot(preparationSlotKey);
  if (!scanSlotKey) {
    return;
  }

  await executor.execute(
    `UPDATE project_contract_signing_upload_files
    SET is_current = 0,
      replaced_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?
      AND is_current = 1`,
    [projectId, scanSlotKey]
  );

  await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      confirmation_status = NULL,
      return_reason = NULL,
      submitted_by_user_id = NULL,
      submitted_at = NULL,
      confirmed_by_user_id = NULL,
      confirmed_at = NULL,
      revision = revision + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING,
      projectId,
      scanSlotKey
    ]
  );
}

async function markSigningNodeReturned(executor, { projectId, returnReason }) {
  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      return_reason = ?,
      returned_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.RETURNED,
      returnReason,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );
}

async function markSigningScansApprovedForCompletion(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_upload_slots
    SET status = ?,
      confirmation_status = NULL,
      return_reason = NULL,
      confirmed_by_user_id = NULL,
      confirmed_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND slot_key IN (?, ?)
      AND status = ?`,
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED,
      projectId,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
      CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 2) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.UPLOAD_SLOT_NOT_PROCESSABLE,
      'Contract signing scan files changed before completion',
      409,
      [
        CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
        CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN
      ]
    );
  }
}

async function refreshSigningNodeAfterConfirmation(executor, { projectId }) {
  const slots = [
    await selectContractSigningUploadSlotForUpdate(
      executor,
      projectId,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN
    ),
    await selectContractSigningUploadSlotForUpdate(
      executor,
      projectId,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN
    )
  ];
  const allApproved = slots.every((slot) => slot?.status === CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED);

  if (!allApproved) {
    await executor.execute(
      `UPDATE project_contract_signing_nodes
      SET status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
        AND node_key = ?
        AND status IN (?, ?)`,
      [
        CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
        projectId,
        CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
        CONTRACT_SIGNING_NODE_STATUS.PENDING,
        CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW
      ]
    );
    return false;
  }

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.APPROVED,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
      CONTRACT_SIGNING_NODE_STATUS.RETURNED
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED
    ]
  );

  await executor.execute(
    `UPDATE project_contract_signing_payment_flows
    SET status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_PAYMENT_STATUS.PENDING,
      projectId,
      CONTRACT_SIGNING_PAYMENT_STATUS.NOT_STARTED
    ]
  );

  return true;
}

async function markAdvancePaymentNodeApproved(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      approved_at = CURRENT_TIMESTAMP,
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status IN (?, ?)`,
    [
      CONTRACT_SIGNING_NODE_STATUS.APPROVED,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      CONTRACT_SIGNING_NODE_STATUS.PENDING,
      CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment node status changed before payment action',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }
}

async function markAdvancePaymentCompleted(executor, { projectId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_payment_flows
    SET status = ?,
      requested_by_user_id = NULL,
      requested_at = NULL,
      approved_by_user_id = NULL,
      approved_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED,
      projectId,
      CONTRACT_SIGNING_PAYMENT_STATUS.PENDING
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment flow status changed before completion',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }
}

async function markAdvancePaymentWaitingGeneralManager(executor, { projectId, actorUserId }) {
  const [nodeUpdateResult] = await executor.execute(
    `UPDATE project_contract_signing_nodes
    SET status = ?,
      submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
      return_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND node_key = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      CONTRACT_SIGNING_NODE_STATUS.PENDING
    ]
  );

  if (Number(nodeUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment node status changed before release request',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }

  const [paymentUpdateResult] = await executor.execute(
    `UPDATE project_contract_signing_payment_flows
    SET status = ?,
      requested_by_user_id = ?,
      requested_at = CURRENT_TIMESTAMP,
      approved_by_user_id = NULL,
      approved_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER,
      actorUserId,
      projectId,
      CONTRACT_SIGNING_PAYMENT_STATUS.PENDING
    ]
  );

  if (Number(paymentUpdateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment flow status changed before release request',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }
}

async function markAdvancePaymentReleased(executor, { projectId, actorUserId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_payment_flows
    SET status = ?,
      approved_by_user_id = ?,
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_PAYMENT_STATUS.RELEASED,
      actorUserId,
      projectId,
      CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment flow status changed before general manager release',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }
}

async function markAdvancePaymentPaidByGeneralManager(executor, { projectId, actorUserId }) {
  const [updateResult] = await executor.execute(
    `UPDATE project_contract_signing_payment_flows
    SET status = ?,
      approved_by_user_id = ?,
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND status = ?`,
    [
      CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED,
      actorUserId,
      projectId,
      CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER
    ]
  );

  if (Number(updateResult?.affectedRows ?? 0) !== 1) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
      'Advance payment flow status changed before general manager paid approval',
      409,
      [CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT]
    );
  }
}

async function selectNextProjectKickoffNoticeGeneratedVersion(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND document_code = ?
      AND template_key = ?`,
    [projectId, CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE, CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey]
  );

  return Number(rows[0]?.nextVersion || 1);
}

function buildProjectKickoffNoticeGeneratedFileName({ projectRow, version }) {
  const projectName = sanitizeFilePart(projectRow?.project_name || projectRow?.projectName || '未命名项目');
  return `${CONTRACT_KICKOFF_NOTICE_TEMPLATE.generatedFileNamePrefix}-${projectName}-v${version}.docx`;
}

export function buildProjectKickoffNoticeDisplayName(projectRow) {
  const projectCode = String(projectRow?.project_code ?? projectRow?.projectCode ?? '').trim();
  const customerName = String(projectRow?.customer_name ?? projectRow?.customerName ?? '').trim();
  const projectName = String(projectRow?.project_name ?? projectRow?.projectName ?? '').trim();
  const prefix = `${projectCode}${customerName}`;

  if (projectName) {
    return prefix ? `${prefix}-${projectName}` : projectName;
  }

  return prefix || '未命名项目';
}

function buildProjectKickoffNoticeSourceSnapshot({
  projectRow,
  roleState,
  nodes,
  slots,
  paymentFlow,
  paymentAction,
  paymentStatus,
  actorUserId
}) {
  return {
    project: {
      id: projectRow.id,
      projectCode: projectRow.project_code ?? null,
      projectName: projectRow.project_name ?? null,
      customerName: projectRow.customer_name ?? null,
      projectDisplayName: buildProjectKickoffNoticeDisplayName(projectRow),
      currentStageKey: projectRow.current_stage_key ?? null,
      currentStageOrder: projectRow.current_stage_order ?? null
    },
    document: {
      id: null,
      documentCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME
    },
    contractSigningWorkflow: {
      nodes: nodes.map((node) => ({
        nodeKey: node.node_key,
        nodeName: node.node_name,
        status: node.status,
        currentRevision: node.current_revision ?? null
      })),
      uploadSlots: slots.map((slot) => ({
        slotKey: slot.slot_key,
        slotName: slot.slot_name,
        nodeKey: slot.node_key,
        status: slot.status,
        revision: slot.revision,
        hasCurrentFile: Boolean(slot.current_file_id)
      })),
      paymentFlow: {
        status: paymentStatus,
        previousStatus: paymentFlow?.status ?? null,
        requestedByUserId: paymentFlow?.requested_by_user_id ?? null,
        requestedAt: paymentFlow?.requested_at ?? null,
        approvedByUserId: paymentFlow?.approved_by_user_id ?? null,
        approvedAt: paymentFlow?.approved_at ?? null
      },
      roles: {
        technicalOwnerUserId: roleState[CONTRACT_SIGNING_ROLE_KEY.TECHNICAL_OWNER]?.userId ?? null,
        businessOwnerUserId: roleState[CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER]?.userId ?? null
      }
    },
    paymentAction,
    generatedByUserId: actorUserId,
    capturedAt: new Date().toISOString()
  };
}

async function insertProjectKickoffNoticeGeneratingRecord(executor, {
  projectId,
  fileName,
  version,
  userId,
  sourceSnapshot,
  sourceHash
}) {
  const [result] = await executor.execute(
    `INSERT INTO project_stage_document_generated_files (
      project_id,
      stage_document_id,
      online_form_id,
      document_code,
      template_key,
      file_type,
      version,
      status,
      file_name,
      mime_type,
      generated_by_user_id,
      source_form_submitted_at,
      source_form_data_hash,
      source_snapshot_json,
      trigger_event,
      review_snapshot_json,
      template_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      null,
      null,
      CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.fileType,
      version,
      GENERATED_FILE_STATUS.GENERATING,
      fileName,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.mimeType,
      userId ?? null,
      null,
      sourceHash,
      JSON.stringify(sourceSnapshot),
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.triggerEvent,
      null,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateVersion
    ]
  );

  return result.insertId;
}

async function markProjectKickoffNoticeGenerated(executor, {
  recordId,
  projectId,
  storageKey,
  fileSize,
  templateHash
}) {
  await executor.execute(
    `UPDATE project_stage_document_generated_files
    SET status = ?
    WHERE project_id = ?
      AND document_code = ?
      AND template_key = ?
      AND status = ?
      AND id <> ?`,
    [
      GENERATED_FILE_STATUS.SUPERSEDED,
      projectId,
      CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey,
      GENERATED_FILE_STATUS.GENERATED,
      recordId
    ]
  );
  await executor.execute(
    `UPDATE project_stage_document_generated_files
    SET status = ?,
      storage_key = ?,
      file_size = ?,
      generated_at = CURRENT_TIMESTAMP,
      failure_reason = NULL,
      template_hash = ?
    WHERE id = ?`,
    [GENERATED_FILE_STATUS.GENERATED, storageKey, fileSize, templateHash, recordId]
  );
}

async function selectProjectKickoffNoticeGeneratedFileById(executor, recordId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE id = ?
    LIMIT 1`,
    [recordId]
  );

  return rows[0] || null;
}

function renderProjectKickoffNoticeTemplate(templateBuffer, sourceSnapshot, now = new Date()) {
  const projectName = sourceSnapshot.project.projectDisplayName || sourceSnapshot.project.projectName || '未命名项目';
  const chineseDate = formatChineseDate(now);
  return updateZipTextEntry(templateBuffer, 'word/document.xml', (documentXml) => {
    let updatedXml = documentXml.replace(
      /(<w:t\b[^>]*xml:space="preserve"[^>]*>)\s{8,}(<\/w:t>)/,
      `$1${escapeXml(projectName)}$2`
    );
    if (chineseDate) {
      updatedXml = updatedXml.replace(
        /(<w:t\b[^>]*>)2026年7月20日(<\/w:t>)/,
        `$1${escapeXml(chineseDate)}$2`
      );
    }
    return updatedXml;
  });
}

async function generateProjectKickoffNoticeFile(executor, {
  projectRow,
  roleState,
  paymentFlow,
  paymentAction,
  paymentStatus,
  actorUserId,
  generatedFileStorage = defaultContractSigningGeneratedFileStorage
}) {
  const projectId = projectRow.id;
  let storageKey = null;
  try {
    const [nodes, slots] = await Promise.all([
      selectContractSigningNodes(executor, projectId),
      selectContractSigningUploadSlots(executor, projectId)
    ]);
    const version = await selectNextProjectKickoffNoticeGeneratedVersion(executor, projectId);
    const fileName = buildProjectKickoffNoticeGeneratedFileName({ projectRow, version });
    const sourceSnapshot = buildProjectKickoffNoticeSourceSnapshot({
      projectRow,
      roleState,
      nodes,
      slots,
      paymentFlow,
      paymentAction,
      paymentStatus,
      actorUserId
    });
    const sourceHash = sha256({
      sourceSnapshot,
      template: {
        templateKey: CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateKey,
        templateVersion: CONTRACT_KICKOFF_NOTICE_TEMPLATE.templateVersion
      }
    });
    const recordId = await insertProjectKickoffNoticeGeneratingRecord(executor, {
      projectId,
      fileName,
      version,
      userId: actorUserId,
      sourceSnapshot,
      sourceHash
    });
    const templateBuffer = await fs.readFile(CONTRACT_KICKOFF_NOTICE_TEMPLATE.templatePath);
    const templateHash = sha256(templateBuffer);
    const generatedBuffer = renderProjectKickoffNoticeTemplate(templateBuffer, sourceSnapshot);
    storageKey = generatedFileStorage.createStorageKey({
      projectId,
      documentId: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      version,
      fileType: CONTRACT_KICKOFF_NOTICE_TEMPLATE.fileType
    });
    const stored = await generatedFileStorage.writeFile(storageKey, generatedBuffer);
    await markProjectKickoffNoticeGenerated(executor, {
      recordId,
      projectId,
      storageKey,
      fileSize: stored.size,
      templateHash
    });
    const generatedFileRow = await selectProjectKickoffNoticeGeneratedFileById(executor, recordId);
    const generatedFile = {
      ...mapGeneratedFile(generatedFileRow, { includePrivate: true }),
      documentCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
      downloadEndpoint: `/api/projects/${projectId}/contract-signing-workflow/kickoff-notice/generated-file/download`
    };

    return {
      generatedFile,
      storageKey,
      templateHash
    };
  } catch (error) {
    if (storageKey) {
      await generatedFileStorage.cleanupFile(storageKey);
    }
    throw error;
  }
}

function getPreparationUploadActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_UPLOADED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_UPLOADED;
}

function getSigningScanUploadActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_UPLOADED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_UPLOADED;
}

function getContractSigningUploadActionType(slotKey) {
  return isSigningScanSlot({ slotKey })
    ? getSigningScanUploadActionType(slotKey)
    : getPreparationUploadActionType(slotKey);
}

function getPreparationApproveActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_APPROVED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_APPROVED;
}

function getPreparationReturnActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_RETURNED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_RETURNED;
}

function getSigningScanConfirmActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_CONFIRMED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_CONFIRMED;
}

function getSigningScanReturnActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_RETURNED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_RETURNED;
}

function getCustomerReturnActionType(slotKey) {
  return slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
    ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_CUSTOMER_RETURNED
    : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_CUSTOMER_RETURNED;
}

async function insertContractSigningUploadLog(executor, { projectId, actorUserId, slot, fileRow }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: getContractSigningUploadActionType(slot.slotKey),
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary: `上传${slot.slotName}：${fileRow.original_file_name}`,
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      fileId: fileRow.id,
      originalFileName: fileRow.original_file_name,
      fileSize: Number(fileRow.file_size),
      revision: fileRow.revision,
      uploadedByUserId: actorUserId
    }
  });
}

async function insertContractSigningScanConfirmationLog(
  executor,
  { projectId, actorUserId, slot, approved, returnReason = null }
) {
  const actionType = approved
    ? getSigningScanConfirmActionType(slot.slotKey)
    : getSigningScanReturnActionType(slot.slotKey);
  const returnToSlotKey = approved ? null : getPreparationSlotKeyForSigningScan(slot.slotKey);
  const returnToLine =
    returnToSlotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT
      ? '技术协议准备线'
      : '销售合同准备线';

  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary: approved
      ? `${slot.slotName}确认线下签署结果通过`
      : `${slot.slotName}确认线下签署结果不通过，退回${returnToLine}`,
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      confirmationResult: approved ? 'approved' : 'returned',
      returnReason,
      returnToNodeKey: approved ? null : CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      returnToSlotKey,
      actorUserId
    }
  });
}

async function insertContractSigningCustomerReturnLog(executor, { projectId, actorUserId, slot, returnReason }) {
  const scanSlotKey = getSigningScanSlotKeyForPreparationSlot(slot.slotKey);
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: getCustomerReturnActionType(slot.slotKey),
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary: `客户退回${slot.slotName}，返回准备线重提`,
    details: {
      projectId,
      nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      returnToNodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      invalidatedScanSlotKey: scanSlotKey,
      returnReason,
      actorUserId
    }
  });
}

async function insertContractSigningCompleteLog(executor, { projectId, actorUserId }) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: OPERATION_ACTION_TYPE.CONTRACT_SIGNING_COMPLETED,
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary: '签订协议和合同已完成，进入项目预付款支付',
    details: {
      projectId,
      nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      completedSlotKeys: [
        CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
        CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN
      ],
      derivedDocumentCodes: ['C21', 'C23'],
      nextNodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      actorUserId
    }
  });
}

async function insertContractSigningReviewLog(
  executor,
  { projectId, actorUserId, slot, approved, returnReason = null }
) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType: approved ? getPreparationApproveActionType(slot.slotKey) : getPreparationReturnActionType(slot.slotKey),
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary: approved ? `${slot.slotName}审批通过` : `${slot.slotName}审批不通过，退回准备线`,
    details: {
      projectId,
      nodeKey: slot.nodeKey,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      approved,
      returnReason,
      returnToNodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      actorUserId
    }
  });
}

async function insertContractSigningPaymentLog(
  executor,
  { projectId, actorUserId, actionType, summary, paymentStatus, generatedFile = null, paymentAction = null }
) {
  await insertOperationLog(executor, {
    projectId,
    actorUserId,
    actionType,
    targetType: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
    targetId: projectId,
    summary,
    details: {
      projectId,
      nodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      paymentStatus,
      paymentAction,
      generatedKickoffNotice: generatedFile
        ? {
            generatedFileCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
            documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
            generatedFileId: generatedFile.id,
            version: generatedFile.version,
            fileName: generatedFile.fileName,
            templateKey: generatedFile.templateKey,
            templateVersion: generatedFile.templateVersion,
            templateHash: generatedFile.templateHash,
            generatedAt: generatedFile.generatedAt
          }
        : null,
      actorUserId
    }
  });
}

function buildWorkflowDto({
  projectRow,
  nodes,
  uploadSlots,
  paymentFlow,
  kickoffNoticeGeneratedFile,
  rolesRow,
  usersById,
  user
}) {
  const projectEnded = isContractSigningProjectEnded(projectRow);
  const inContractStage = isProjectInContractSigningStage(projectRow);
  const roleState = buildRoleState({ rolesRow, usersById });
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes(projectRow);
  const materializedSlots = uploadSlots.length > 0 ? uploadSlots : buildVirtualUploadSlots(projectRow);
  const materializedPaymentFlow = paymentFlow || buildVirtualPaymentFlow(projectRow);
  const commonContext = {
    roleState,
    user,
    projectEnded,
    inContractStage,
    nodes: materializedNodes,
    slots: materializedSlots,
    paymentFlow: materializedPaymentFlow,
    kickoffNoticeGeneratedFile
  };

  const workflowPermissions = {
    canViewWorkflow: true,
    isTechnicalOwner: isTechnicalOwner(roleState, user),
    isBusinessOwner: isBusinessOwner(roleState, user),
    isRdCenterManager: isContractSigningRdCenterManager(user),
    isMarketingCenterManager: isContractSigningMarketingCenterManager(user),
    isGeneralManager: isContractSigningGeneralManager(user)
  };

  return {
    projectId: projectRow.id,
    stageKey: CONTRACT_SIGNING_STAGE.STAGE_KEY,
    stageOrder: CONTRACT_SIGNING_STAGE.STAGE_ORDER,
    currentStage: {
      stageId: projectRow.current_stage_id,
      stageOrder: projectRow.current_stage_order,
      stageKey: projectRow.current_stage_key,
      stageName: projectRow.current_stage_name,
      stageStatus: projectRow.current_stage_status
    },
    nodes: materializedNodes.map((node) => mapNode(node, commonContext)),
    uploadSlots: materializedSlots.map((slot) => mapUploadSlot(slot, commonContext)),
    paymentFlow: mapPaymentFlow(materializedPaymentFlow, { kickoffNoticeGeneratedFile }),
    kickoffNoticeGeneratedFile,
    roles: roleState,
    permissions: workflowPermissions,
    isProjectEnded: projectEnded
  };
}

async function buildWorkflowDtoForProject(executor, { projectRow, user }) {
  const { nodes, uploadSlots, paymentFlow } = await ensureContractSigningWorkflowState(executor, projectRow);
  const rolesRow = await selectSolutionDesignRoles(executor, projectRow.id);
  const [usersById, kickoffNoticeGeneratedFile] = await Promise.all([
    selectUsersByIds(executor, collectRoleUserIds(rolesRow)),
    selectProjectKickoffNoticeGeneratedFileDto(executor, projectRow.id)
  ]);

  return buildWorkflowDto({
    projectRow,
    nodes,
    uploadSlots,
    paymentFlow,
    kickoffNoticeGeneratedFile,
    rolesRow,
    usersById,
    user
  });
}

function getWorkflowNodeDto(workflow, nodeKey) {
  return (workflow?.nodes || []).find((node) => node.nodeKey === nodeKey) || null;
}

function buildContractSigningWorkbenchTargetRoute(projectId, nodeKey) {
  return `/projects/${projectId}?taskMode=contractSigning&focusNodeKey=${encodeURIComponent(nodeKey)}`;
}

function getContractSigningWorkbenchNodeUpdatedAt(node, projectRow) {
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

export function buildContractSigningWorkbenchTodo({
  projectRow,
  workflow,
  node,
  actionText,
  actionKey,
  blockingReasons = null
}) {
  return {
    type: CONTRACT_SIGNING_WORKBENCH_TODO_TYPE,
    taskType: CONTRACT_SIGNING_WORKBENCH_TODO_TYPE,
    actionKey,
    projectId: workflow.projectId,
    projectCode: projectRow?.project_code ?? workflow.projectCode ?? null,
    projectName: projectRow?.project_name ?? workflow.projectName ?? null,
    stageId: workflow.currentStage?.stageId ?? projectRow?.current_stage_id ?? null,
    stageOrder: CONTRACT_SIGNING_STAGE.STAGE_ORDER,
    stageName: CONTRACT_SIGNING_STAGE.STAGE_NAME,
    documentId: null,
    documentCode: null,
    documentName: null,
    nodeKey: node.nodeKey,
    nodeName: node.nodeName,
    status: node.status,
    revision: node.currentRevision || 1,
    actionText,
    blockingReasons: Array.isArray(blockingReasons) ? blockingReasons : node.blockingReasons || [],
    createdAt: getContractSigningWorkbenchNodeUpdatedAt(node, projectRow),
    updatedAt: getContractSigningWorkbenchNodeUpdatedAt(node, projectRow),
    targetRoute: buildContractSigningWorkbenchTargetRoute(workflow.projectId, node.nodeKey)
  };
}

function getContractSigningSlotUploadActionText(slot) {
  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT) {
    return '上传技术协议';
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT) {
    return '上传销售合同';
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN) {
    return '上传技术协议扫描件';
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN) {
    return '上传销售合同扫描件';
  }

  return `上传合同签订文件：${slot.slotName}`;
}

function getContractSigningSlotReviewActionText(slot) {
  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT) {
    return '审批/退回技术协议';
  }

  if (slot.slotKey === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT) {
    return '审批/退回销售合同';
  }

  return `审批/退回${slot.slotName}`;
}

export function buildContractSigningWorkbenchTodos({ projectRow = null, workflow }) {
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
    todos.push(buildContractSigningWorkbenchTodo({
      projectRow,
      workflow,
      node,
      actionText,
      actionKey,
      blockingReasons
    }));
  };

  for (const slot of workflow.uploadSlots || []) {
    const node = getWorkflowNodeDto(workflow, slot.nodeKey);
    if (slot?.permissions?.canUpload === true) {
      addTodo({
        node,
        actionText: getContractSigningSlotUploadActionText(slot),
        actionKey: `upload:${slot.slotKey}`
      });
    }

    if (slot?.permissions?.canApprove === true || slot?.permissions?.canReturn === true) {
      addTodo({
        node,
        actionText: getContractSigningSlotReviewActionText(slot),
        actionKey: `review:${slot.slotKey}`
      });
    }

  }

  const signingNode = getWorkflowNodeDto(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING);
  if (signingNode?.permissions?.canCompleteSigning === true) {
    addTodo({
      node: signingNode,
      actionText: '完成签订协议和合同',
      actionKey: 'complete_contract_signing'
    });
  }

  const advancePaymentNode = getWorkflowNodeDto(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT);
  if (
    advancePaymentNode?.permissions?.canCompletePayment === true ||
    advancePaymentNode?.permissions?.canRequestGeneralManagerRelease === true
  ) {
    addTodo({
      node: advancePaymentNode,
      actionText: '处理项目预付款',
      actionKey: 'process_advance_payment'
    });
  }

  if (
    advancePaymentNode?.permissions?.canApprovePaymentReleaseUnpaid === true ||
    advancePaymentNode?.permissions?.canApprovePaymentReleasePaid === true
  ) {
    addTodo({
      node: advancePaymentNode,
      actionText: '审批预付款放行',
      actionKey: 'approve_payment_release'
    });
  }

  return todos;
}

async function selectContractSigningWorkbenchProjectRows(executor) {
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
    [CONTRACT_SIGNING_STAGE.STAGE_KEY, PROJECT_STATUS.ENDED]
  );

  return rows;
}

function isMissingContractSigningSchemaError(error) {
  return (
    error?.code === 'ER_NO_SUCH_TABLE' &&
    String(error.sqlMessage || error.message || '').includes('project_contract_signing_')
  );
}

export async function selectContractSigningWorkbenchTodos(user, db = pool) {
  if (!user?.id) {
    return [];
  }

  try {
    return await withConnection(db, async (connection) => {
      const projectRows = await selectContractSigningWorkbenchProjectRows(connection);
      const todos = [];

      for (const projectRow of projectRows) {
        const rolesRow = await selectSolutionDesignRoles(connection, projectRow.id);
        try {
          await assertWorkflowViewable(connection, projectRow.id, user, { rolesRow });
        } catch (error) {
          if (error instanceof ProjectAuthorizationError || error?.code === 'FORBIDDEN_OPERATION') {
            continue;
          }
          throw error;
        }

        const workflow = await buildWorkflowDtoForProject(connection, { projectRow, user });
        todos.push(...buildContractSigningWorkbenchTodos({ projectRow, workflow }));
      }

      return todos;
    });
  } catch (error) {
    if (isMissingContractSigningSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export function assertContractSigningWriteAllowed(projectRow) {
  if (isContractSigningProjectEnded(projectRow)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.PROJECT_ENDED,
      'Project has ended and contract signing workflow is read-only',
      409,
      ['projectId']
    );
  }

  if (!isProjectInContractSigningStage(projectRow)) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.NOT_IN_STAGE,
      'Project is not in contract signing stage',
      409,
      ['currentStage']
    );
  }
}

export async function getContractSigningUploadDownload(
  { projectId, slotKey, user },
  db = pool,
  storage = defaultContractSigningUploadStorage
) {
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  if (!slot) {
    throw new ContractSigningWorkflowError(
      CONTRACT_SIGNING_ERROR.INVALID_UPLOAD_SLOT,
      'Invalid contract signing upload slot',
      400,
      ['slotKey']
    );
  }

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertCanDownloadContractSigningUploadFile({ slot, roleState, user });

    const fileRow = await selectCurrentUploadFileForDownload(connection, projectId, slot.slotKey);
    if (!fileRow) {
      throw new ContractSigningWorkflowError(
        CONTRACT_SIGNING_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Contract signing upload file not found',
        404,
        [slot.slotKey]
      );
    }

    let filePath;
    try {
      filePath = await storage.assertFileReadable(fileRow.storage_key);
    } catch {
      throw new ContractSigningWorkflowError(
        CONTRACT_SIGNING_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Contract signing upload file is missing from local storage',
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

export async function getContractSigningKickoffNoticeGeneratedFileDownload(
  { projectId, user },
  db = pool,
  storage = null
) {
  const generatedFileStorage = resolveContractSigningGeneratedFileStorage(db, storage);
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { projectRow, rolesRow });
    const fileRow = await selectLatestDownloadableProjectKickoffNoticeGeneratedFile(connection, projectId);
    if (!fileRow) {
      throw new ContractSigningWorkflowError(
        CONTRACT_SIGNING_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Project kickoff notice generated file not found',
        404,
        [CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE]
      );
    }

    let filePath;
    try {
      filePath = await generatedFileStorage.assertFileReadable(fileRow.storage_key);
    } catch {
      throw new ContractSigningWorkflowError(
        CONTRACT_SIGNING_ERROR.UPLOAD_FILE_NOT_FOUND,
        'Project kickoff notice generated file is missing from local storage',
        404,
        [CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE]
      );
    }

    return {
      filePath,
      fileName: fileRow.file_name,
      mimeType: fileRow.mime_type || CONTRACT_KICKOFF_NOTICE_TEMPLATE.mimeType,
      fileSize: Number(fileRow.file_size || 0),
      documentCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
      documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
      version: Number(fileRow.version || 1)
    };
  });
}

export async function uploadContractSigningWorkflowFile(
  { projectId, slotKey, file, user },
  db = pool,
  storage = defaultContractSigningUploadStorage
) {
  assertNotDeprecatedProjectKickoffNoticeUpload(slotKey);
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  assertSupportedUploadSlot(slot);
  const uploadFile = normalizeUploadFile(file);
  const storageKey = storage.createStorageKey({ projectId, slotKey: slot.slotKey });
  let fileWritten = false;
  let committed = false;
  let stageAdvance = null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    assertContractRoleActor(roleState, slot.requiredRoleKey, user);
    const nodeRow = await selectContractSigningNodeForUpdate(connection, projectId, slot.nodeKey);
    const slotRow = await selectContractSigningUploadSlotForUpdate(connection, projectId, slot.slotKey);
    const slots = isSigningScanSlot(slot)
      ? await selectContractSigningUploadSlots(connection, projectId)
      : [];
    assertNodeProcessable(nodeRow, slot.nodeKey, 'uploaded');
    assertUploadSlotReplaceable({ slotRow, slot, slots });

    const stored = await storage.writeFile(storageKey, uploadFile.buffer);
    fileWritten = true;
    if (stored.size !== uploadFile.size) {
      throwInvalidUploadFile();
    }

    const fileRow = isSigningScanSlot(slot)
        ? await replaceCurrentSigningScanSlotFile(connection, {
            projectId,
            slotRow,
            slot,
            uploadFile,
            storageKey,
            userId: user.id
          })
        : await replaceCurrentPreparationSlotFile(connection, {
            projectId,
            slotRow,
            slot,
            uploadFile,
            storageKey,
            userId: user.id
          });
    await insertContractSigningUploadLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      fileRow
    });
    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    const workflow = await buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });

    await connection.commit();
    committed = true;

    return {
      slotKey: slot.slotKey,
      nodeKey: slot.nodeKey,
      file: mapUploadedFile(fileRow),
      workflow,
      stageAdvance
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

export async function confirmContractSigningScanFile({ projectId, slotKey, payload = {}, user }, db = pool) {
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  assertSigningScanSlot(slot);
  throw new ContractSigningWorkflowError(
    CONTRACT_SIGNING_ERROR.NODE_NOT_PROCESSABLE,
    'Contract signing scan confirmation has been replaced by customer return and complete signing actions',
    409,
    [slot.slotKey]
  );
}

async function returnContractSigningAgreementForCustomer({ projectId, slotKey, payload = {}, user }, db = pool) {
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  assertPreparationSlot(slot);
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    assertContractRoleActor(roleState, CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER, user);
    const nodeRow = await selectContractSigningNodeForUpdate(
      connection,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING
    );
    assertNodeProcessable(nodeRow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING, 'customer returned');
    const slotRow = await selectContractSigningUploadSlotForUpdate(connection, projectId, slot.slotKey);
    assertPreparationLineApprovedForCustomerReturn(slotRow, slot);

    await returnPreparationLineForCustomer(connection, {
      projectId,
      slot,
      returnReason
    });
    await invalidateSigningScanForPreparationLine(connection, {
      projectId,
      preparationSlotKey: slot.slotKey
    });
    await markSigningNodeReturned(connection, { projectId, returnReason });
    await insertContractSigningCustomerReturnLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      returnReason
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export function returnContractSigningTechnicalAgreementForCustomer({ projectId, payload = {}, user }, db = pool) {
  return returnContractSigningAgreementForCustomer({
    projectId,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    payload,
    user
  }, db);
}

export function returnContractSigningSalesContractForCustomer({ projectId, payload = {}, user }, db = pool) {
  return returnContractSigningAgreementForCustomer({
    projectId,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    payload,
    user
  }, db);
}

export async function completeContractSigningNode({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    assertContractRoleActor(roleState, CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER, user);
    const nodeRow = await selectContractSigningNodeForUpdate(
      connection,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING
    );
    const slots = await selectContractSigningUploadSlots(connection, projectId);
    assertSigningReadyForCompletion({ nodeRow, slots });

    await markSigningScansApprovedForCompletion(connection, { projectId });
    await refreshSigningNodeAfterConfirmation(connection, { projectId });
    await insertContractSigningCompleteLog(connection, {
      projectId,
      actorUserId: user.id
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function approveContractSigningPreparationFile({ projectId, slotKey, user }, db = pool) {
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  assertPreparationSlot(slot);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    const nodeRow = await selectContractSigningNodeForUpdate(connection, projectId, slot.nodeKey);
    assertNodeProcessable(nodeRow, slot.nodeKey, 'approved');
    const slotRow = await selectContractSigningUploadSlotForUpdate(connection, projectId, slot.slotKey);
    assertPreparationSlotReadyForReview(slotRow, slot);
    assertPreparationSlotReviewer({ slot, user });

    await markPreparationSlotApproved(connection, {
      slotRow,
      slot,
      actorUserId: user.id
    });
    await refreshPreparationNodeAfterApproval(connection, { projectId });
    await insertContractSigningReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      approved: true
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

export async function returnContractSigningPreparationFile({ projectId, slotKey, payload = {}, user }, db = pool) {
  const slot = getContractSigningUploadSlotDefinition(slotKey);
  assertPreparationSlot(slot);
  const returnReason = normalizeReturnReason(payload);

  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    const nodeRow = await selectContractSigningNodeForUpdate(connection, projectId, slot.nodeKey);
    assertNodeProcessable(nodeRow, slot.nodeKey, 'returned');
    const slotRow = await selectContractSigningUploadSlotForUpdate(connection, projectId, slot.slotKey);
    assertPreparationSlotReadyForReview(slotRow, slot);
    assertPreparationSlotReviewer({ slot, user });

    await markPreparationSlotReturned(connection, {
      slotRow,
      slot,
      actorUserId: user.id,
      returnReason
    });
    await insertContractSigningReviewLog(connection, {
      projectId,
      actorUserId: user.id,
      slot,
      approved: false,
      returnReason
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

async function completeContractSigningPaymentFinalAction({
  projectId,
  user,
  actorType,
  paid = false,
  actionType,
  paymentAction,
  paymentStatus,
  summary
}, db = pool, generatedFileStorage = null) {
  const resolvedGeneratedFileStorage = resolveContractSigningGeneratedFileStorage(db, generatedFileStorage);
  const connection = await db.getConnection();
  let generatedStorageKey = null;
  let committed = false;
  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    if (actorType === 'business_owner') {
      assertContractRoleActor(roleState, CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER, user);
    } else {
      assertGeneralManagerActor(user);
    }
    const nodeRow = await selectContractSigningNodeForUpdate(
      connection,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT
    );
    const paymentFlow = await selectContractSigningPaymentFlowForUpdate(connection, projectId);
    if (actorType === 'business_owner') {
      assertAdvancePaymentReadyForBusinessAction(nodeRow, paymentFlow);
    } else {
      assertAdvancePaymentReadyForGeneralManagerRelease(nodeRow, paymentFlow);
    }

    await markAdvancePaymentNodeApproved(connection, { projectId });
    if (actorType === 'business_owner' || paid) {
      if (actorType === 'business_owner') {
        await markAdvancePaymentCompleted(connection, { projectId });
      } else {
        await markAdvancePaymentPaidByGeneralManager(connection, {
          projectId,
          actorUserId: user.id
        });
      }
    } else {
      await markAdvancePaymentReleased(connection, {
        projectId,
        actorUserId: user.id
      });
    }

    const generation = await generateProjectKickoffNoticeFile(connection, {
      projectRow,
      roleState,
      paymentFlow,
      paymentAction,
      paymentStatus,
      actorUserId: user.id,
      generatedFileStorage: resolvedGeneratedFileStorage
    });
    generatedStorageKey = generation.storageKey;
    await insertContractSigningPaymentLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType,
      summary,
      paymentStatus,
      paymentAction,
      generatedFile: generation.generatedFile
    });
    const stageAdvance = await tryAutoAdvanceProjectStage({
      projectId,
      user,
      triggerAction: OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_GENERATED_KICKOFF_NOTICE,
      expectedStageOrder: CONTRACT_SIGNING_STAGE.STAGE_ORDER,
      triggerMetadata: {
        source: OPERATION_TARGET_TYPE.CONTRACT_SIGNING_WORKFLOW,
        nodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
        generatedFileCode: CONTRACT_KICKOFF_NOTICE_GENERATED_FILE_CODE,
        documentName: CONTRACT_KICKOFF_NOTICE_DOCUMENT_NAME,
        paymentAction,
        paymentStatus,
        generatedFileId: generation.generatedFile.id,
        generatedFileVersion: generation.generatedFile.version,
        templateKey: generation.generatedFile.templateKey,
        templateVersion: generation.generatedFile.templateVersion,
        templateHash: generation.generatedFile.templateHash
      }
    }, connection);

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    const workflow = await buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });

    await connection.commit();
    committed = true;

    return {
      ...workflow,
      stageAdvance
    };
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }
    if (generatedStorageKey && !committed) {
      await resolvedGeneratedFileStorage.cleanupFile(generatedStorageKey);
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function completeContractSigningAdvancePayment(
  { projectId, user },
  db = pool,
  generatedFileStorage = null
) {
  return completeContractSigningPaymentFinalAction({
    projectId,
    user,
    actorType: 'business_owner',
    paid: true,
    actionType: OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_COMPLETED,
    paymentAction: 'complete_payment',
    paymentStatus: CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED,
    summary: '项目预付款已完成，生成项目启动通知并自动推进详细设计'
  }, db, generatedFileStorage);
}

export async function requestContractSigningPaymentRelease({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId, { forUpdate: true });
    assertContractSigningWriteAllowed(projectRow);
    await ensureContractSigningWorkflowState(connection, projectRow);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    const roleState = buildRoleStateWithoutUserDetails(rolesRow);
    assertRequiredRolesAssigned(roleState);
    assertContractRoleActor(roleState, CONTRACT_SIGNING_ROLE_KEY.BUSINESS_OWNER, user);
    const nodeRow = await selectContractSigningNodeForUpdate(
      connection,
      projectId,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT
    );
    const paymentFlow = await selectContractSigningPaymentFlowForUpdate(connection, projectId);
    assertAdvancePaymentReadyForBusinessAction(nodeRow, paymentFlow);

    await markAdvancePaymentWaitingGeneralManager(connection, {
      projectId,
      actorUserId: user.id
    });
    await insertContractSigningPaymentLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_REQUESTED,
      summary: '预付款未完成，申请总经理放行',
      paymentStatus: CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER
    });

    const refreshedProjectRow = await selectProjectContext(connection, projectId);
    return buildWorkflowDtoForProject(connection, { projectRow: refreshedProjectRow, user });
  });
}

async function approveContractSigningPaymentReleaseWithResult(
  { projectId, user, paid },
  db = pool,
  generatedFileStorage = null
) {
  return completeContractSigningPaymentFinalAction({
    projectId,
    user,
    actorType: 'general_manager',
    paid,
    actionType: paid
      ? OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_APPROVED_PAID
      : OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_APPROVED_UNPAID,
    paymentAction: paid ? 'approve_release_paid' : 'approve_release_unpaid',
    paymentStatus: paid
      ? CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED
      : CONTRACT_SIGNING_PAYMENT_STATUS.RELEASED,
    summary: paid
      ? '总经理确认预付款已付款通过，生成项目启动通知并自动推进详细设计'
      : '总经理确认未付款并通过，生成项目启动通知并自动推进详细设计'
  }, db, generatedFileStorage);
}

export function approveContractSigningPaymentReleaseUnpaid(
  { projectId, user },
  db = pool,
  generatedFileStorage = null
) {
  return approveContractSigningPaymentReleaseWithResult({ projectId, user, paid: false }, db, generatedFileStorage);
}

export function approveContractSigningPaymentReleasePaid(
  { projectId, user },
  db = pool,
  generatedFileStorage = null
) {
  return approveContractSigningPaymentReleaseWithResult({ projectId, user, paid: true }, db, generatedFileStorage);
}

export function approveContractSigningPaymentRelease({ projectId, user }, db = pool) {
  throw new ContractSigningWorkflowError(
    CONTRACT_SIGNING_ERROR.DEPRECATED_ACTION,
    'Deprecated payment release action. Use approve-release-unpaid or approve-release-paid.',
    410,
    {
      deprecatedEndpoint: '/contract-signing-workflow/payment/approve-release',
      replacementEndpoints: [
        '/contract-signing-workflow/payment/approve-release-unpaid',
        '/contract-signing-workflow/payment/approve-release-paid'
      ]
    }
  );
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

export async function getContractSigningWorkflow({ projectId, user }, db = pool) {
  return withConnection(db, async (connection) => {
    const projectRow = await selectProjectContext(connection, projectId);
    const rolesRow = await selectSolutionDesignRoles(connection, projectId);
    await assertWorkflowViewable(connection, projectId, user, { rolesRow });
    return buildWorkflowDtoForProject(connection, { projectRow, user });
  });
}
