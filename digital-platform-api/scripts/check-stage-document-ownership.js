import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { closePool, pool } from '../src/db/pool.js';
import {
  ensureProjectWorkspaceSchema,
  inspectProjectWorkspaceSchema
} from '../src/db/projectWorkspaceSchema.js';
import { ensureSolutionDesignWorkflowSchema } from '../src/db/solutionDesignWorkflowSchema.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';
import {
  SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES,
  SOLUTION_DESIGN_NODES
} from '../src/domain/solutionDesignWorkflow.js';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  canAdvanceProjectStage,
  canManageStageDocumentApplicability,
  canManageProjectResponsibility,
  isValidBusinessDepartment
} from '../src/domain/organization.js';
import {
  COMPLETION_MODE,
  DOCUMENT_STATUS,
  EXPECTED_COMPLETION_MODE_COUNTS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
  LEGACY_STAGE_DOCUMENT_ITEM_COUNT,
  LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION,
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629,
  STAGE_DOCUMENT_TEMPLATE_VERSION,
  V20260629_TARGET_TEMPLATE_OUTPUT_COUNT,
  loadStageDocumentTemplateItems
} from '../src/domain/stageDocumentTemplates.js';
import { normalizeCreateProjectInput } from '../src/domain/projects.js';
import {
  buildStageDocumentPermissions,
  canViewCompleteProjectAudit,
  canViewProjectOperationLogs,
  canViewStageDocumentItem
} from '../src/repositories/stageDocuments/accessControl.js';
import {
  DuplicateProjectCodeError,
  ProjectCodeUpdateError,
  ProjectResponsibleUserError,
  ProjectStageAdvanceError,
  advanceProjectStage,
  assertProjectAuditViewable,
  assertProjectViewable,
  createProject,
  getProjectDetail,
  getProjectWorkspace,
  getProjectOverviewDashboard,
  listStageApprovalHistory,
  listProjects,
  updateProjectCode
} from '../src/repositories/projectRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  listProjectOperationLogs
} from '../src/repositories/operationLogRepository.js';
import {
  approveInitiationReviewNode,
  completeProjectStageDocumentRevision,
  getStageDocumentGeneratedFileDownload,
  getStageDocumentGeneratedFileStatus,
  getStageDocumentOnlineFormImageDownload,
  getProjectStageDocumentChecklist,
  getStageDocumentOnlineForm,
  getMyWorkbench,
  initializeInitiationReviewNodesForExistingProjects,
  listMyStageDocumentTasks,
  normalizeStageDocumentTaskFilters,
  returnInitiationReviewNode,
  saveStageDocumentOnlineForm,
  STAGE_DOCUMENT_GENERATED_FILE_ERROR,
  submitStageDocumentOnlineForm,
  upsertStageDocumentTemplates,
  uploadStageDocumentOnlineFormImage,
  updateProjectStageDocumentApplicability,
  updateProjectStageDocumentResponsibleUser,
  updateProjectStageDocumentStatus
} from '../src/repositories/stageDocumentRepository.js';
import {
  deleteStageDocumentAttachment,
  getStageDocumentAttachmentDownload,
  listStageDocumentAttachments,
  uploadStageDocumentAttachment
} from '../src/repositories/stageDocumentAttachmentRepository.js';
import {
  buildStageCompletenessSummary,
  deriveStageDocumentCompletion
} from '../src/repositories/stageDocuments/shared.js';
import { DOCUMENT_STATUS_ACTION } from '../src/domain/stageDocumentStatus.js';
import { DOCUMENT_APPLICABILITY_ACTION } from '../src/domain/stageDocumentApplicability.js';
import {
  GENERATED_FILE_STATUS,
  INITIATION_TEMPLATE_TRIGGER_EVENT
} from '../src/domain/initiationTemplateFileManifest.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { cleanupStageDocumentAttachmentFile } from '../src/storage/stageDocumentAttachmentStorage.js';
import { cleanupStageDocumentGeneratedFile } from '../src/storage/stageDocumentGeneratedFileStorage.js';
import { cleanupStageDocumentOnlineFormImageFile } from '../src/storage/stageDocumentOnlineFormImageStorage.js';
import { generateInitiationTemplateFile } from '../src/repositories/stageDocuments/generatedFileRepository.js';
import { readZipEntries } from '../src/utils/ooxmlZip.js';
import { isDocumentRelatedToDepartmentByOwnership } from '../../digital-platform-web/src/components/project-detail/stageDocumentViewHelpers.js';

const {
  MARKETING_CENTER,
  MANUFACTURING_CENTER,
  OPERATIONS_CENTER,
  RD_CENTER
} = BUSINESS_DEPARTMENT;

const LEGACY_CONTRACT_REVIEW_COMPATIBILITY_OUTPUT_CODES = new Set(['LC33', 'LC54']);
const EXCLUDED_V20260629_PROJECT_DOCUMENT_CODES = new Set(['3.3', '5.4', 'LC33', 'LC54']);
const V20260629_TARGET_ONLY_DOCUMENT_CODES = STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629
  .filter((item) => item.documentCode === item.targetOutputCode)
  .map((item) => item.documentCode);
const INITIATION_APPROVAL_SCORE_ITEM_KEYS = [
  'customerEnterpriseAttribute',
  'projectSource',
  'projectPositioning',
  'businessCompetitionCondition',
  'projectBudget',
  'paymentCondition',
  'projectRequirement',
  'specialEnvironment',
  'industryThreshold',
  'technologyMaturity',
  'rdMode'
];
let smokeInitiationProjectCodeCounter = 0;

function buildSmokeRequirementFormData(patch = {}) {
  return {
    communicationDate: '2026-07-01',
    communicationCount: '3',
    communicationLocation: 'smoke meeting room',
    communicationMethod: '现场交流',
    internalParticipants: 'smoke internal participants',
    customerParticipants: 'smoke customer participants',
    workingTemperatureMin: '-10',
    workingTemperatureMax: '45',
    storageTemperatureMin: '-20',
    storageTemperatureMax: '60',
    workingHumidityMin: '20',
    workingHumidityMax: '80',
    storageHumidityMin: '10',
    storageHumidityMax: '90',
    noiseLimitValue: '75',
    ipProtectionLevel: '54',
    antiCorrosionGrade: 'C3',
    altitudeLimitValue: '1000',
    explosionProofRequirement: '无防爆要求',
    siteConditionDescription: 'smoke site condition with drawing described in text',
    powerSupply: 'AC380V',
    airSupply: '0.6MPa',
    hydraulicSource: '无',
    liftingEquipment: 'smoke lifting equipment description',
    workpieceDescription: 'smoke workpiece description: 1000mm x 800mm x 600mm, 120kg, steel, quantity 12, drawing pending',
    operationProcessDescription: 'smoke operation process description: load, position, assemble, inspect; process file pending',
    projectTargetDescription: 'smoke target description: automation scope, 60s takt, operator load and unload, price 100000, delivery 60 days',
    ...patch
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function buildSmokePngBuffer({ width, height, rgba = [40, 120, 220, 255] }) {
  const normalizedWidth = Math.max(1, Number(width) || 1);
  const normalizedHeight = Math.max(1, Number(height) || 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(normalizedWidth, 0);
  ihdr.writeUInt32BE(normalizedHeight, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLength = 1 + normalizedWidth * 4;
  const raw = Buffer.alloc(rowLength * normalizedHeight);
  for (let row = 0; row < normalizedHeight; row += 1) {
    const rowOffset = row * rowLength;
    raw[rowOffset] = 0;
    for (let column = 0; column < normalizedWidth; column += 1) {
      const pixelOffset = rowOffset + 1 + column * 4;
      raw[pixelOffset] = rgba[0];
      raw[pixelOffset + 1] = rgba[1];
      raw[pixelOffset + 2] = rgba[2];
      raw[pixelOffset + 3] = rgba[3];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND')
  ]);
}

function buildSmokePngFile(originalFileName, { width = 1, height = 1, rgba } = {}) {
  const buffer = buildSmokePngBuffer({ width, height, rgba });
  return {
    originalFileName,
    mimeType: 'image/png',
    buffer,
    size: buffer.length,
    contentHash: createHash('sha256').update(buffer).digest('hex'),
    width,
    height
  };
}

const INITIATION_APPROVAL_BUSINESS_SCORE_ITEM_KEYS = [
  'customerEnterpriseAttribute',
  'projectSource',
  'projectPositioning',
  'businessCompetitionCondition',
  'projectBudget',
  'paymentCondition'
];

const INITIATION_APPROVAL_TECHNICAL_SCORE_ITEM_KEYS = [
  'projectRequirement',
  'specialEnvironment',
  'industryThreshold',
  'technologyMaturity',
  'rdMode'
];

function buildSmokeScoreData(itemKeys, responsiblePerson, score = '3', notesSuffix = 'information notes') {
  return Object.fromEntries(
    itemKeys.flatMap((itemKey) => [
      [`${itemKey}Score`, score],
      [`${itemKey}InformationNotes`, `smoke ${itemKey} ${notesSuffix}`],
      [`${itemKey}ResponsiblePerson`, responsiblePerson]
    ])
  );
}

function buildSmokeInitiationBusinessFormData(patch = {}) {
  return {
    projectResponsibleContact: '13800000000',
    ...buildSmokeScoreData(INITIATION_APPROVAL_BUSINESS_SCORE_ITEM_KEYS, 'smoke business responsible', '3'),
    ...patch
  };
}

function buildSmokeInitiationTechnicalFormData(patch = {}) {
  return {
    ...buildSmokeScoreData(
      INITIATION_APPROVAL_TECHNICAL_SCORE_ITEM_KEYS,
      'smoke technical responsible',
      '4',
      'technical notes'
    ),
    ...patch
  };
}

function buildSmokeInitiationFormData(patch = {}) {
  return {
    ...buildSmokeInitiationBusinessFormData(),
    ...buildSmokeInitiationTechnicalFormData(),
    ...patch
  };
}

function buildSmokeNoticeFormData(patch = {}) {
  smokeInitiationProjectCodeCounter += 1;
  return {
    projectCode: `SMOKE-INIT-${smokeInitiationProjectCodeCounter}`,
    initiationDate: '2026-07-01',
    noticeDate: '2026-07-08',
    ...patch
  };
}

function departmentUser(id, organizationRole, department) {
  return {
    id,
    organizationRole,
    department,
    isEnabled: true
  };
}

function globalUser(id, organizationRole) {
  return {
    id,
    organizationRole,
    department: null,
    isEnabled: true
  };
}

function makeDocument(patch = {}) {
  return {
    id: 1,
    projectId: 1,
    templateVersion: STAGE_DOCUMENT_TEMPLATE_VERSION,
    documentCode: '2.4',
    documentName: '3D模型',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    responsibleUserId: null,
    responsibleUser: null,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    status: DOCUMENT_STATUS.NOT_SUBMITTED,
    isApplicable: true,
    ...patch
  };
}

function mapCompletionModeCountRows(rows) {
  const counts = Object.fromEntries(Object.values(COMPLETION_MODE).map((completionMode) => [completionMode, 0]));
  for (const row of rows) {
    counts[row.completionMode] = Number(row.count);
  }
  return counts;
}

function findChecklistDocument(checklist, documentCode) {
  const document = checklist.stages
    .flatMap((stage) => stage.documents)
    .find((candidate) => candidate.documentCode === documentCode);
  assert.ok(document, `Checklist document not found: ${documentCode}`);
  return document;
}

function findWorkspaceOutput(workspace, documentCode) {
  const output = workspace.stages
    .flatMap((stage) => stage.nodes || [])
    .flatMap((node) => node.outputs || [])
    .find(
      (candidate) =>
        candidate.documentCode === documentCode ||
        candidate.legacyDocumentCode === documentCode ||
        candidate.targetOutputCode === documentCode
    );
  assert.ok(output, `Workspace output not found: ${documentCode}`);
  return output;
}

async function assertStageDocumentSubmitForbidden({ projectId, documentId, user }) {
  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId,
        action: DOCUMENT_STATUS_ACTION.SUBMIT,
        user
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
}

function captureErrorHandlerResponse(error) {
  const response = {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let forwardedError = null;

  errorHandler(error, {}, response, (nextError) => {
    forwardedError = nextError;
  });

  assert.equal(forwardedError, null);
  return response;
}

async function selectSmokeUser(account) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled
     FROM users
     WHERE account = ?
     LIMIT 1`,
    [account]
  );
  const row = rows[0];
  assert.ok(row, `Smoke user not found: ${account}`);
  assert.equal(Boolean(row.is_enabled), true, `Smoke user must be enabled: ${account}`);

  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled)
  };
}

async function insertSmokeUser({ account, name, department, organizationRole, role, isPlatformAdmin = false }) {
  const [result] = await pool.execute(
    `INSERT INTO users (
      account,
      display_name,
      department,
      organization_role,
      role,
      is_enabled,
      is_platform_admin,
      password_hash
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      account,
      name,
      department,
      organizationRole,
      role,
      isPlatformAdmin ? 1 : 0,
      'smoke-password-hash'
    ]
  );

  return {
    id: result.insertId,
    account,
    name,
    department,
    organizationRole,
    role,
    isEnabled: true,
    isPlatformAdmin
  };
}

async function selectSmokeDocument(projectId, documentCode) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM project_stage_documents
     WHERE project_id = ?
       AND document_code = ?
     LIMIT 1`,
    [projectId, documentCode]
  );
  const row = rows[0];
  assert.ok(row, `Smoke document not found: ${projectId}/${documentCode}`);
  return row;
}

async function selectInitiationReviewNodes(projectId) {
  const [rows] = await pool.execute(
    `SELECT n.*
     FROM project_initiation_review_nodes n
     INNER JOIN project_stage_documents d
       ON d.id = n.stage_document_id
     WHERE n.project_id = ?
       AND d.document_code = '1.2'
     ORDER BY FIELD(n.node_key, 'business_review', 'technical_review', 'general_review')`,
    [projectId]
  );

  return rows;
}

async function selectInitiationReviewNode(projectId, nodeKey) {
  const node = (await selectInitiationReviewNodes(projectId)).find((candidate) => candidate.node_key === nodeKey);
  assert.ok(node, `Initiation review node not found: ${projectId}/${nodeKey}`);
  return node;
}

function assertInitiationNodeStatus(nodes, nodeKey, expectedStatus) {
  const node = nodes.find((candidate) => candidate.node_key === nodeKey);
  assert.ok(node, `Initiation review node missing: ${nodeKey}`);
  assert.equal(node.node_status, expectedStatus, `Unexpected ${nodeKey} status`);
}

async function countSmokeProjectObjects(projectId) {
  const [stageRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM project_stages WHERE project_id = ?',
    [projectId]
  );
  const [documentRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM project_stage_documents WHERE project_id = ?',
    [projectId]
  );
  const [attachmentRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM project_stage_document_attachments WHERE project_id = ?',
    [projectId]
  );

  return {
    stages: Number(stageRows[0].count),
    documents: Number(documentRows[0].count),
    attachments: Number(attachmentRows[0].count)
  };
}

async function assertProjectUsesV20260629Template(projectId) {
  const [summaryRows] = await pool.execute(
    `SELECT template_version AS templateVersion, COUNT(*) AS count
     FROM project_stage_documents
     WHERE project_id = ?
     GROUP BY template_version`,
    [projectId]
  );
  assert.equal(summaryRows.length, 1, `Project ${projectId} should use one template version`);
  assert.equal(summaryRows[0].templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
  assert.equal(Number(summaryRows[0].count), EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);

  const [excludedRows] = await pool.execute(
    `SELECT document_code AS documentCode
     FROM project_stage_documents
     WHERE project_id = ?
       AND document_code IN (${[...EXCLUDED_V20260629_PROJECT_DOCUMENT_CODES].map(() => '?').join(', ')})
     ORDER BY document_code`,
    [projectId, ...EXCLUDED_V20260629_PROJECT_DOCUMENT_CODES]
  );
  assert.deepEqual(excludedRows.map((row) => row.documentCode), []);

  const [targetOnlyRows] = await pool.execute(
    `SELECT document_code AS documentCode
     FROM project_stage_documents
     WHERE project_id = ?
       AND document_code IN (${V20260629_TARGET_ONLY_DOCUMENT_CODES.map(() => '?').join(', ')})
     ORDER BY document_code`,
    [projectId, ...V20260629_TARGET_ONLY_DOCUMENT_CODES]
  );
  assert.deepEqual(
    targetOnlyRows.map((row) => row.documentCode),
    [...V20260629_TARGET_ONLY_DOCUMENT_CODES].sort()
  );
}

async function completeInitiationGate(projectId, { submitterUser, marketingManagerUser, rdManagerUser, generalManagerUser }) {
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = CASE document_code
        WHEN '1.1' THEN ?
        WHEN '1.3' THEN ?
        ELSE status
       END
      WHERE project_id = ?
        AND document_code IN ('1.1', '1.2', '1.3')`,
    [
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.SUBMITTED,
      projectId
    ]
  );
  const initiationDocument = await selectSmokeDocument(projectId, '1.2');
  if (initiationDocument.status !== DOCUMENT_STATUS.SUBMITTED) {
    await submitStageDocumentOnlineForm({
      projectId,
      documentId: initiationDocument.id,
      user: marketingManagerUser,
      formData: buildSmokeInitiationBusinessFormData()
    });
    await submitStageDocumentOnlineForm({
      projectId,
      documentId: initiationDocument.id,
      user: rdManagerUser,
      formData: buildSmokeInitiationTechnicalFormData()
    });
  }
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'smoke business approval'
  });
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'technical_review',
    user: rdManagerUser,
    comment: 'smoke technical approval'
  });
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    comment: 'smoke general approval',
    projectExecutionMode: '自研模式'
  });
}

async function completeStageExcept(projectId, stageOrder, blockedDocumentCode) {
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = CASE
       WHEN document_code = ? THEN ?
       WHEN completion_mode IN (?, ?) THEN ?
       ELSE ?
     END,
       is_applicable = 1
     WHERE project_id = ?
       AND stage_order = ?`,
    [
      blockedDocumentCode,
      DOCUMENT_STATUS.NOT_SUBMITTED,
      COMPLETION_MODE.SUBMIT_ONLY,
      COMPLETION_MODE.CONDITIONAL_SUBMIT,
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.CONFIRMED,
      projectId,
      stageOrder
    ]
  );
}

async function resetSmokeDocumentsForReview(projectId, documentCodes, user) {
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = ?,
       review_department = ?,
       is_applicable = 1,
       revision_required = 0,
       revision_reason = NULL,
       revision_source_document_id = NULL,
       revision_requested_by_user_id = NULL,
       revision_requested_at = NULL,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL,
       revision_completed_by_user_id = NULL,
       revision_completed_at = NULL
     WHERE project_id = ?
       AND document_code IN (${documentCodes.map(() => '?').join(', ')})`,
    [user.id, user.department, projectId, ...documentCodes]
  );
}

async function assertApprovalRevisionResubmitCycle({ projectId, sourceCode, targetCode, user }) {
  await resetSmokeDocumentsForReview(projectId, [sourceCode, targetCode], user);
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = CASE
       WHEN document_code = ? THEN ?
       WHEN document_code = ? THEN ?
       ELSE status
     END,
       submitted_at = CASE WHEN document_code = ? THEN CURRENT_TIMESTAMP ELSE submitted_at END,
       confirmed_at = CASE WHEN document_code = ? THEN CURRENT_TIMESTAMP ELSE confirmed_at END
     WHERE project_id = ?
       AND document_code IN (?, ?)`,
    [
      sourceCode,
      DOCUMENT_STATUS.SUBMITTED,
      targetCode,
      DOCUMENT_STATUS.CONFIRMED,
      sourceCode,
      targetCode,
      projectId,
      sourceCode,
      targetCode
    ]
  );

  const sourceDocument = await selectSmokeDocument(projectId, sourceCode);
  const targetDocument = await selectSmokeDocument(projectId, targetCode);
  const returnedSource = await updateProjectStageDocumentStatus({
    projectId,
    documentId: sourceDocument.id,
    action: DOCUMENT_STATUS_ACTION.RETURN,
    user,
    returnReason: `${sourceCode} smoke revision`,
    revisionTargetDocumentIds: [targetDocument.id]
  });
  assert.equal(returnedSource.status, DOCUMENT_STATUS.RETURNED);

  const revisionTarget = await selectSmokeDocument(projectId, targetCode);
  assert.equal(Boolean(revisionTarget.revision_required), true);
  assert.equal(revisionTarget.status, DOCUMENT_STATUS.CONFIRMED);
  assert.equal(revisionTarget.revision_resubmitted_by_user_id, null);
  assert.equal(revisionTarget.revision_resubmitted_at, null);
  assert.equal(deriveStageDocumentCompletion(revisionTarget).isComplete, false);
  assert.equal(deriveStageDocumentCompletion(revisionTarget).completionStatus, 'revision_required');

  if (revisionTarget.completion_mode !== COMPLETION_MODE.APPROVAL_REQUIRED) {
    const completedRevisionTarget = await completeProjectStageDocumentRevision({
      projectId,
      documentId: revisionTarget.id,
      user
    });
    assert.equal(completedRevisionTarget.revisionRequired, false);
    assert.equal(completedRevisionTarget.isComplete, true);
    assert.equal(buildStageCompletenessSummary([completedRevisionTarget]).incompleteRequiredCount, 0);
    return;
  }

  await pool.execute(
    `UPDATE project_stage_documents
     SET status = ?,
       submitted_at = revision_requested_at,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL
     WHERE id = ?`,
    [DOCUMENT_STATUS.SUBMITTED, revisionTarget.id]
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId: revisionTarget.id,
        action: DOCUMENT_STATUS_ACTION.CONFIRM,
        user
      }),
    (error) => error.code === 'REVISION_RESUBMIT_REQUIRED'
  );

  const workbenchBeforeResubmit = await getMyWorkbench(user);
  assert.equal(
    workbenchBeforeResubmit.items.some(
      (item) =>
        item.type === 'document_review' &&
        item.projectId === projectId &&
        item.documentCode === targetCode
    ),
    false
  );
  assert.ok(
    workbenchBeforeResubmit.items.some(
      (item) =>
        item.type === 'document_responsibility' &&
        item.projectId === projectId &&
        item.documentCode === targetCode &&
        item.revisionRequired === true
    )
  );
  const pendingDocumentTasksBeforeResubmit = await listMyStageDocumentTasks(
    user.id,
    normalizeStageDocumentTaskFilters({ status: 'pending' })
  );
  assert.ok(
    pendingDocumentTasksBeforeResubmit.some(
      (task) =>
        task.projectId === projectId &&
        task.documentCode === targetCode &&
        task.revisionRequired === true
    )
  );
  const overviewBeforeResubmit = await getProjectOverviewDashboard(user, {});
  const pendingCountBeforeResubmit = overviewBeforeResubmit.summary.myPendingStageDocumentTasks;

  const resubmittedTarget = await updateProjectStageDocumentStatus({
    projectId,
    documentId: revisionTarget.id,
    action: DOCUMENT_STATUS_ACTION.SUBMIT,
    user
  });
  assert.equal(resubmittedTarget.status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal(resubmittedTarget.revisionRequired, true);
  assert.equal(resubmittedTarget.revisionResubmitted, true);
  assert.equal(resubmittedTarget.revisionResubmittedByUserId, user.id);
  assert.ok(resubmittedTarget.revisionResubmittedAt);
  assert.equal(resubmittedTarget.completionStatus, 'pending_review');

  const workbenchAfterResubmit = await getMyWorkbench(user);
  assert.ok(
    workbenchAfterResubmit.items.some(
      (item) =>
        item.type === 'document_review' &&
        item.projectId === projectId &&
        item.documentCode === targetCode &&
        item.revisionRequired === true
    )
  );
  const pendingDocumentTasksAfterResubmit = await listMyStageDocumentTasks(
    user.id,
    normalizeStageDocumentTaskFilters({ status: 'pending' })
  );
  assert.equal(
    pendingDocumentTasksAfterResubmit.some(
      (task) =>
        task.projectId === projectId &&
        task.documentCode === targetCode
    ),
    false
  );
  const overviewAfterResubmit = await getProjectOverviewDashboard(user, {});
  assert.equal(
    overviewAfterResubmit.summary.myPendingStageDocumentTasks,
    pendingCountBeforeResubmit - 1
  );

  const returnedResubmittedTarget = await updateProjectStageDocumentStatus({
    projectId,
    documentId: revisionTarget.id,
    action: DOCUMENT_STATUS_ACTION.RETURN,
    user,
    returnReason: `${targetCode} smoke revision loop`
  });
  assert.equal(returnedResubmittedTarget.status, DOCUMENT_STATUS.RETURNED);
  assert.equal(returnedResubmittedTarget.revisionRequired, true);
  assert.equal(returnedResubmittedTarget.revisionResubmitted, false);
  assert.equal(returnedResubmittedTarget.revisionResubmittedAt, null);

  const workbenchAfterRevisionReturn = await getMyWorkbench(user);
  assert.equal(
    workbenchAfterRevisionReturn.items.some(
      (item) =>
        item.type === 'document_review' &&
        item.projectId === projectId &&
        item.documentCode === targetCode
    ),
    false
  );
  assert.ok(
    workbenchAfterRevisionReturn.items.some(
      (item) =>
        item.type === 'document_responsibility' &&
        item.projectId === projectId &&
        item.documentCode === targetCode &&
        item.revisionRequired === true
    )
  );

  const secondResubmittedTarget = await updateProjectStageDocumentStatus({
    projectId,
    documentId: revisionTarget.id,
    action: DOCUMENT_STATUS_ACTION.SUBMIT,
    user
  });
  assert.equal(secondResubmittedTarget.status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal(secondResubmittedTarget.revisionRequired, true);
  assert.equal(secondResubmittedTarget.revisionResubmitted, true);
  assert.ok(secondResubmittedTarget.revisionResubmittedAt);

  const confirmedTarget = await updateProjectStageDocumentStatus({
    projectId,
    documentId: revisionTarget.id,
    action: DOCUMENT_STATUS_ACTION.CONFIRM,
    user
  });
  assert.equal(confirmedTarget.status, DOCUMENT_STATUS.CONFIRMED);
  assert.equal(confirmedTarget.revisionRequired, false);
  assert.equal(confirmedTarget.isComplete, true);
  assert.equal(buildStageCompletenessSummary([confirmedTarget]).incompleteRequiredCount, 0);
}

async function cleanupSmokeProjects(projectIds, storageKeys, userIds = []) {
  for (const storageKey of storageKeys) {
    await cleanupStageDocumentAttachmentFile(storageKey);
  }

  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => '?').join(', ');
    const [generatedFileRows] = await pool.execute(
      `SELECT storage_key AS storageKey
       FROM project_stage_document_generated_files
       WHERE project_id IN (${placeholders})
         AND storage_key IS NOT NULL`,
      projectIds
    );
    for (const row of generatedFileRows) {
      await cleanupStageDocumentGeneratedFile(row.storageKey);
    }
    const [onlineFormImageRows] = await pool.execute(
      `SELECT storage_key AS storageKey
       FROM project_stage_document_form_images
       WHERE project_id IN (${placeholders})
         AND storage_key IS NOT NULL`,
      projectIds
    );
    for (const row of onlineFormImageRows) {
      await cleanupStageDocumentOnlineFormImageFile(row.storageKey);
    }
  }

  for (const projectId of projectIds) {
    await pool.execute('DELETE FROM projects WHERE id = ?', [projectId]);
  }

  for (const userId of userIds) {
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }
}

async function createInitiationSmokeProject({
  uniqueSuffix,
  projectManagerUser,
  businessResponsibleUser,
  technicalResponsibleUser,
  createdByUserId,
  label,
  smokeProjectIds
}) {
  const created = await createProject(
    {
      projectCode: null,
      projectName: `1.2 多节点 smoke ${label} ${uniqueSuffix}`,
      customerName: 'Smoke 客户',
      customerContactPerson: 'Smoke 联系人',
      customerContact: '13800000000',
      projectMode: 'self_developed',
      projectManagerUserId: projectManagerUser.id,
      businessResponsibleUserId: businessResponsibleUser.id,
      technicalResponsibleUserId: technicalResponsibleUser.id,
      participatingDepartments: [RD_CENTER, MARKETING_CENTER],
      status: 'normal',
      plannedStartDate: null,
      plannedEndDate: null,
      remark: 'add-initiation-multi-review-flow smoke'
    },
    createdByUserId
  );
  smokeProjectIds.push(created.project.id);
  return created.project.id;
}

async function prepareInitiationSmokeBase(projectId, businessUser, technicalUser, options = {}) {
  const normalizedOptions = options && typeof options === 'object' ? options : {};
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = CASE document_code
       WHEN '1.1' THEN ?
       WHEN '1.2' THEN ?
       WHEN '1.3' THEN ?
       ELSE status
      END,
         revision_required = 0,
        revision_source_document_id = NULL,
        revision_resubmitted_by_user_id = NULL,
        revision_resubmitted_at = NULL,
        is_applicable = 1
      WHERE project_id = ?
        AND document_code IN ('1.1', '1.2', '1.3')`,
    [
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.NOT_SUBMITTED,
      DOCUMENT_STATUS.NOT_SUBMITTED,
      projectId
    ]
  );
  const initiationDocument = await selectSmokeDocument(projectId, '1.2');
  await submitStageDocumentOnlineForm({
    projectId,
    documentId: initiationDocument.id,
    user: businessUser,
    formData: buildSmokeInitiationBusinessFormData(normalizedOptions.businessPatch)
  });
  await submitStageDocumentOnlineForm({
    projectId,
    documentId: initiationDocument.id,
    user: technicalUser,
    formData: buildSmokeInitiationTechnicalFormData(normalizedOptions.technicalPatch)
  });

  return selectSmokeDocument(projectId, '1.2');
}

async function prepareInitiationNoticeReadyProject(projectId, { businessUser, technicalUser, generalManagerUser }) {
  const initiationDocument = await prepareInitiationSmokeBase(projectId, businessUser, technicalUser);
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'business_review',
    user: businessUser,
    comment: 'smoke business approval'
  });
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'technical_review',
    user: technicalUser,
    comment: 'smoke technical approval'
  });
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    comment: 'smoke general approval',
    projectExecutionMode: '自研模式'
  });
  return resetInitiationNoticeForSubmit(projectId, businessUser);
}

async function assertNoInitiationWorkbenchTask(user, projectId, nodeKey = null) {
  const workbench = await getMyWorkbench(user);
  assert.equal(
    workbench.items.some(
      (item) =>
        item.type === 'initiation_review' &&
        item.projectId === projectId &&
        (nodeKey === null || item.nodeKey === nodeKey)
    ),
    false
  );
}

async function assertHasInitiationWorkbenchTask(user, projectId, nodeKey) {
  const workbench = await getMyWorkbench(user);
  assert.ok(
    workbench.items.some(
      (item) => item.type === 'initiation_review' && item.projectId === projectId && item.nodeKey === nodeKey
    ),
    `Expected initiation review workbench task ${projectId}/${nodeKey}`
  );
}

async function assertNoWorkbenchItemForProject(user, projectId) {
  const workbench = await getMyWorkbench(user);
  assert.equal(workbench.items.some((item) => item.projectId === projectId), false);
}

function findInitiationNoticeWorkbenchTodo(workbench, projectId) {
  return workbench.items.find(
    (item) => item.projectId === projectId && item.type === 'document_responsibility' && item.documentCode === '1.3'
  );
}

function findInitiationCollaborationWorkbenchTodo(workbench, projectId, collaborationPart) {
  return workbench.items.find(
    (item) =>
      item.projectId === projectId &&
      item.type === 'document_responsibility' &&
      item.documentCode === '1.2' &&
      item.collaborationPart === collaborationPart
  );
}

async function runEvaluationReturnToMarketResearchSmoke({
  uniqueSuffix,
  smokeProjectIds,
  managerUser,
  marketingManagerUser,
  generalManagerUser,
  nodeKey,
  reviewerUser,
  expectedActionType,
  label
}) {
  const projectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label,
    smokeProjectIds
  });
  const initiationDocument = await prepareInitiationSmokeBase(projectId, marketingManagerUser, managerUser);
  const returnReason = `${label} return to market research`;
  const retainedNodeKey = nodeKey === 'business_review' ? 'technical_review' : 'business_review';

  await assert.rejects(
    () =>
      returnInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey,
        user: reviewerUser,
        returnReason: ''
      }),
    (error) => error.code === 'RETURN_REASON_REQUIRED'
  );

  await returnInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey,
    user: reviewerUser,
    returnReason
  });

  const requirement = await selectSmokeDocument(projectId, '1.1');
  const initiation = await selectSmokeDocument(projectId, '1.2');
  const nodes = await selectInitiationReviewNodes(projectId);
  assert.equal(Boolean(requirement.revision_required), true);
  assert.equal(String(requirement.revision_source_document_id), String(initiationDocument.id));
  assert.equal(initiation.status, DOCUMENT_STATUS.RETURNED);
  assert.equal(initiation.return_reason, returnReason);
  assertInitiationNodeStatus(nodes, nodeKey, 'returned_blocked_by_rework');
  assertInitiationNodeStatus(nodes, retainedNodeKey, 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'general_review', 'waiting_prerequisite');
  assert.equal(
    await countOperationLogs({
      projectId,
      actionType: expectedActionType,
      targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW
    }),
    1
  );
  await assertNoInitiationWorkbenchTask(marketingManagerUser, projectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, projectId, 'technical_review');
  await assertNoInitiationWorkbenchTask(generalManagerUser, projectId, 'general_review');
}

async function runProjectEndSmoke({
  uniqueSuffix,
  smokeProjectIds,
  managerUser,
  marketingManagerUser,
  generalManagerUser
}) {
  const projectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'project-end',
    smokeProjectIds
  });
  const initiationDocument = await prepareInitiationSmokeBase(projectId, marketingManagerUser, managerUser);
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'marketing evaluation before project end'
  });
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'technical_review',
    user: managerUser,
    comment: 'rd evaluation before project end'
  });
  await assertHasInitiationWorkbenchTask(generalManagerUser, projectId, 'general_review');

  await assert.rejects(
    () =>
      returnInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'general_review',
        user: generalManagerUser,
        returnAction: 'project_end',
        endReason: ''
      }),
    (error) => error.code === 'PROJECT_END_REASON_REQUIRED'
  );

  const endReason = 'general manager ended project in smoke';
  await returnInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    returnAction: 'project_end',
    endReason
  });

  const endedDetail = await getProjectDetail(projectId, managerUser);
  assert.equal(endedDetail.project.status, 'ended');
  assert.equal(endedDetail.project.endedReason, endReason);
  assert.equal(String(endedDetail.project.endedByUserId), String(generalManagerUser.id));
  assert.ok(endedDetail.project.endedAt);
  const endedProjectListItem = (await listProjects(managerUser)).find((project) => project.id === projectId);
  assert.ok(endedProjectListItem);
  assert.equal(endedProjectListItem.status, 'ended');
  assert.equal(endedProjectListItem.endedReason, endReason);
  const endedOverview = await getProjectOverviewDashboard(managerUser, {
    status: null,
    currentStageOrder: null,
    keyword: ''
  });
  const endedOverviewCard = endedOverview.projects.find((project) => project.projectId === projectId);
  assert.ok(endedOverviewCard);
  assert.equal(endedOverviewCard.status, 'ended');
  assert.equal(endedOverviewCard.endedReason, endReason);
  assert.equal(endedOverviewCard.currentStageCompletenessSummary, null);
  assert.ok(endedOverview.summary.endedProjects >= 1);
  assert.equal(
    await countOperationLogs({
      projectId,
      actionType: OPERATION_ACTION_TYPE.PROJECT_ENDED,
      targetType: OPERATION_TARGET_TYPE.PROJECT,
      targetId: projectId
    }),
    1
  );
  assert.equal(
    await countOperationLogs({
      projectId,
      actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_GENERAL_RETURNED,
      targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW
    }),
    1
  );
  await assertNoWorkbenchItemForProject(generalManagerUser, projectId);
  await assertNoWorkbenchItemForProject(marketingManagerUser, projectId);
  await assertNoWorkbenchItemForProject(managerUser, projectId);
  assert.deepEqual(
    await listMyStageDocumentTasks(managerUser.id, normalizeStageDocumentTaskFilters({ projectId })),
    []
  );

  const endedRequirement = await selectSmokeDocument(projectId, '1.1');
  const endedFollowUpDocument = await selectSmokeDocument(projectId, '2.1');
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: endedRequirement.id,
        user: marketingManagerUser,
        formData: buildSmokeRequirementFormData({ operationProcessDescription: 'ended' })
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  const endedRequirementForm = await getStageDocumentOnlineForm({
    projectId,
    documentId: endedRequirement.id,
    user: marketingManagerUser
  });
  assert.equal(endedRequirementForm.permissions.canView, true);
  assert.equal(endedRequirementForm.permissions.canEdit, false);
  assert.equal(endedRequirementForm.permissions.canSubmit, false);
  assert.ok(endedRequirementForm.blockingReasons.some((reason) => String(reason).includes('项目已结束')));
  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId: endedFollowUpDocument.id,
        action: DOCUMENT_STATUS_ACTION.SUBMIT,
        user: managerUser
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: endedFollowUpDocument.id,
        responsibleUserId: managerUser.id,
        user: marketingManagerUser
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentApplicability({
        projectId,
        documentId: endedFollowUpDocument.id,
        action: DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE,
        user: managerUser,
        notApplicableReason: 'ended project should block applicability'
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  await assert.rejects(
    () => advanceProjectStage(projectId, managerUser),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-END-${uniqueSuffix}`,
        user: managerUser
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'general_review',
        user: generalManagerUser,
        comment: 'ended project cannot approve'
      }),
    (error) => error.code === 'PROJECT_ALREADY_ENDED'
  );
}

async function resetInitiationNoticeForSubmit(projectId, user) {
  const notice = await selectSmokeDocument(projectId, '1.3');
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = ?,
       status = ?,
       submitted_by_user_id = NULL,
       submitted_at = NULL,
       confirmed_by_user_id = NULL,
       confirmed_at = NULL,
       returned_by_user_id = NULL,
       returned_at = NULL,
       return_reason = NULL,
       revision_required = 0,
       revision_reason = NULL,
       revision_source_document_id = NULL,
       revision_requested_by_user_id = NULL,
       revision_requested_at = NULL,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL,
       revision_completed_by_user_id = NULL,
       revision_completed_at = NULL,
       is_applicable = 1
     WHERE id = ?`,
    [null, DOCUMENT_STATUS.NOT_SUBMITTED, notice.id]
  );

  return selectSmokeDocument(projectId, '1.3');
}

async function countDocumentSubmittedLogs(projectId, documentId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM business_operation_logs
     WHERE project_id = ?
       AND action_type = ?
       AND target_type = ?
       AND target_id = ?`,
    [
      projectId,
      OPERATION_ACTION_TYPE.DOCUMENT_SUBMITTED,
      OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      documentId
    ]
  );

  return Number(rows[0].count);
}

async function countOperationLogs({ projectId, actionType, targetType = null, targetId = null }) {
  const conditions = ['project_id = ?', 'action_type = ?'];
  const params = [projectId, actionType];
  if (targetType !== null) {
    conditions.push('target_type = ?');
    params.push(targetType);
  }
  if (targetId !== null) {
    conditions.push('target_id = ?');
    params.push(targetId);
  }

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM business_operation_logs
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  return Number(rows[0].count);
}

async function assertOrdinaryOnlineFormDocumentSubmitRejected({ projectId, documentCode, user }) {
  const document = await selectSmokeDocument(projectId, documentCode);
  const statusBefore = document.status;
  const documentSubmittedLogCount = await countDocumentSubmittedLogs(projectId, document.id);
  const initiationSubmittedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: document.id
  });
  const nodesBefore =
    documentCode === '1.2'
      ? (await selectInitiationReviewNodes(projectId)).map((node) => ({
          nodeKey: node.node_key,
          nodeStatus: node.node_status
        }))
      : [];

  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId: document.id,
        action: DOCUMENT_STATUS_ACTION.SUBMIT,
        user
    }),
    (error) =>
      error.code === 'ONLINE_FORM_SUBMISSION_REQUIRED' &&
      error.statusCode === 409 &&
      error.details?.documentId === document.id &&
      error.details?.documentCode === documentCode
  );

  const documentAfterReject = await selectSmokeDocument(projectId, documentCode);
  assert.equal(documentAfterReject.status, statusBefore);
  assert.equal(await countDocumentSubmittedLogs(projectId, document.id), documentSubmittedLogCount);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: document.id
  }), initiationSubmittedLogCount);

  if (documentCode === '1.2') {
    const nodesAfter = (await selectInitiationReviewNodes(projectId)).map((node) => ({
      nodeKey: node.node_key,
      nodeStatus: node.node_status
    }));
    assert.deepEqual(nodesAfter, nodesBefore);
  }
}

async function selectOnlineFormRow(documentId) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM project_stage_document_forms
     WHERE stage_document_id = ?
     LIMIT 1`,
    [documentId]
  );

  return rows[0] || null;
}

function parseFormDataJson(row) {
  const value = row?.form_data_json ?? null;
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

function parseSmokeJson(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return JSON.parse(value);
}

async function selectGeneratedFileRows(projectId, documentId) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM project_stage_document_generated_files
     WHERE project_id = ?
       AND stage_document_id = ?
     ORDER BY version ASC, id ASC`,
    [projectId, documentId]
  );

  return rows;
}

function assertNoPrivateGeneratedFilePath(payload) {
  const serialized = JSON.stringify(payload);
  assert.equal(Object.hasOwn(payload.generatedFile || {}, 'storageKey'), false);
  assert.equal(Object.hasOwn(payload.generatedFile || {}, 'storagePath'), false);
  assert.equal(Object.hasOwn(payload.generatedFile || {}, 'templatePath'), false);
  assert.equal(serialized.includes('D:\\'), false);
  assert.equal(serialized.includes('stage-document-generated-files'), false);
  assert.equal(serialized.includes('智能制造项目管理文件模板'), false);
}

function assertGeneratedFileErrorHandled(error, expectedStatusCode, expectedCode) {
  const response = captureErrorHandlerResponse(error);
  assert.equal(response.statusCode, expectedStatusCode);
  assert.equal(response.body?.error?.code, expectedCode);
  assert.notEqual(response.body?.error?.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(JSON.stringify(response.body).includes('D:\\'), false);
  assert.equal(JSON.stringify(response.body).includes('stage-document-generated-files'), false);
  assert.equal(JSON.stringify(response.body).includes('智能制造项目管理文件模板'), false);
}

async function readGeneratedFileXml(filePath, entryName) {
  const buffer = await fs.readFile(filePath);
  const entry = readZipEntries(buffer).find((candidate) => candidate.name === entryName);
  assert.ok(entry, `Generated file OOXML entry missing: ${entryName}`);
  return entry.data.toString('utf8');
}

function assertGeneratedFileXmlContent(xml, expectedValues) {
  assert.equal(xml.includes('系统生成内容快照'), false);
  for (const value of expectedValues.filter(Boolean)) {
    assert.ok(xml.includes(String(value)), `Generated file XML missing expected value: ${value}`);
  }
}

function decodeSmokeXmlText(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function smokeColumnZeroIndex(columnLetters) {
  return String(columnLetters || '')
    .split('')
    .reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function smokeCellAnchor(cellRef) {
  const match = String(cellRef || '').match(/^([A-Z]+)(\d+)$/);
  assert.ok(match, `Invalid smoke cell reference: ${cellRef}`);
  return {
    column: smokeColumnZeroIndex(match[1]),
    row: Number(match[2]) - 1
  };
}

function collectTextMatches(xml, pattern) {
  return [...xml.matchAll(pattern)].map((match) => match[1] || '').join('');
}

async function readGeneratedXlsxCells(filePath) {
  const entries = readZipEntries(await fs.readFile(filePath));
  const sharedStringsEntry = entries.find((candidate) => candidate.name === 'xl/sharedStrings.xml');
  const sharedStringXmls = sharedStringsEntry
    ? [...sharedStringsEntry.data.toString('utf8').matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => match[0])
    : [];
  const sharedStrings = sharedStringXmls.map((xml) =>
    decodeSmokeXmlText(collectTextMatches(xml, /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
  );
  const sheetEntry = entries.find((candidate) => candidate.name === 'xl/worksheets/sheet1.xml');
  assert.ok(sheetEntry, 'Generated xlsx sheet1.xml missing');
  const sheetXml = sheetEntry.data.toString('utf8');
  const stylesXml = entries.find((candidate) => candidate.name === 'xl/styles.xml')?.data.toString('utf8') || '';
  const cells = new Map();
  const cellXmls = new Map();
  const cellSharedStringIndexes = new Map();

  for (const match of sheetXml.matchAll(/<c\b(?=[^>]*\br="([A-Z]+\d+)")[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)) {
    const cellXml = match[0];
    const cellRef = match[1];
    cellXmls.set(cellRef, cellXml);
    let value = '';
    if (/\bt="s"/.test(cellXml)) {
      const index = Number(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1]);
      cellSharedStringIndexes.set(cellRef, index);
      value = sharedStrings[index] || '';
    } else if (/\bt="inlineStr"/.test(cellXml)) {
      value = decodeSmokeXmlText(collectTextMatches(cellXml, /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g));
    } else {
      value = decodeSmokeXmlText(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '');
    }
    cells.set(cellRef, value);
  }

  return { cells, sheetXml, entries, sharedStringXmls, cellXmls, cellSharedStringIndexes, stylesXml };
}

function parseXlsxDrawingMarker(anchorXml, markerName) {
  const markerXml = anchorXml.match(new RegExp(`<xdr:${markerName}>[\\s\\S]*?<\\/xdr:${markerName}>`))?.[0] || '';
  return {
    column: Number(markerXml.match(/<xdr:col>(\d+)<\/xdr:col>/)?.[1]),
    columnOffset: Number(markerXml.match(/<xdr:colOff>(\d+)<\/xdr:colOff>/)?.[1] || 0),
    row: Number(markerXml.match(/<xdr:row>(\d+)<\/xdr:row>/)?.[1]),
    rowOffset: Number(markerXml.match(/<xdr:rowOff>(\d+)<\/xdr:rowOff>/)?.[1] || 0)
  };
}

function collectGeneratedXlsxImageAnchors(entries) {
  return entries
    .filter((entry) => /^xl\/drawings\/drawing\d+\.xml$/i.test(entry.name))
    .flatMap((entry) =>
      [...entry.data.toString('utf8').matchAll(/<xdr:twoCellAnchor\b[\s\S]*?<\/xdr:twoCellAnchor>/g)].map((match) => ({
        name: decodeSmokeXmlText(match[0].match(/<xdr:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1] || ''),
        from: parseXlsxDrawingMarker(match[0], 'from'),
        to: parseXlsxDrawingMarker(match[0], 'to'),
        xml: match[0]
      }))
    );
}

function markerX(marker) {
  return marker.column * 1_000_000_000 + marker.columnOffset;
}

function markerY(marker) {
  return marker.row * 1_000_000_000 + marker.rowOffset;
}

function assertAnchorHorizontalInset(anchor) {
  assert.ok(
    anchor.from.columnOffset > 0 || anchor.to.columnOffset > 0,
    `Expected ${anchor.name} to have horizontal inset from aspect-fit scaling`
  );
}

function assertAnchorVerticalInset(anchor) {
  assert.ok(
    anchor.from.rowOffset > 0 || anchor.to.rowOffset > 0,
    `Expected ${anchor.name} to have vertical inset from aspect-fit scaling`
  );
}

function assertAnchorsOrderedLeftToRight(anchors, fileNames) {
  const selected = fileNames.map((fileName) => {
    const anchor = anchors.find((candidate) => candidate.name === fileName);
    assert.ok(anchor, `Expected image anchor for ${fileName}`);
    return anchor;
  });

  for (let index = 1; index < selected.length; index += 1) {
    assert.ok(
      markerX(selected[index - 1].from) < markerX(selected[index].from),
      `Expected ${selected[index - 1].name} to be left of ${selected[index].name}`
    );
    assert.ok(
      markerX(selected[index - 1].to) <= markerX(selected[index].from),
      `Expected ${selected[index - 1].name} not to overlap ${selected[index].name}`
    );
  }
}

function getMergeRefs(sheetXml) {
  return new Set([...String(sheetXml || '').matchAll(/<mergeCell\b[^>]*\bref="([^"]+)"[^>]*\/>/g)].map((match) => match[1]));
}

function assertMergeAdjustedForImages(sheetXml) {
  const mergeRefs = getMergeRefs(sheetXml);
  for (const removed of ['B12:E12', 'B16:E19', 'B21:E29']) {
    assert.equal(mergeRefs.has(removed), false, `Expected merged range ${removed} to be split for image layout`);
  }
  for (const added of ['B12:C12', 'B16:E17', 'B21:E24']) {
    assert.equal(mergeRefs.has(added), true, `Expected merged text range ${added}`);
  }
}

function assertAnchorWithinRange(anchor, range) {
  const [fromCell, toCell] = String(range || '').split(':');
  const from = smokeCellAnchor(fromCell);
  const to = smokeCellAnchor(toCell || fromCell);
  const startColumn = Math.min(from.column, to.column);
  const endColumnExclusive = Math.max(from.column, to.column) + 1;
  const startRow = Math.min(from.row, to.row);
  const endRowExclusive = Math.max(from.row, to.row) + 1;
  const startX = startColumn * 1_000_000_000;
  const endX = endColumnExclusive * 1_000_000_000;
  const startY = startRow * 1_000_000_000;
  const endY = endRowExclusive * 1_000_000_000;

  assert.ok(markerX(anchor.from) >= startX, `Anchor ${anchor.name} starts before ${range}`);
  assert.ok(markerX(anchor.from) < endX, `Anchor ${anchor.name} starts after ${range}`);
  assert.ok(markerX(anchor.to) > startX, `Anchor ${anchor.name} ends before ${range}`);
  assert.ok(markerX(anchor.to) <= endX, `Anchor ${anchor.name} ends after ${range}`);
  assert.ok(markerY(anchor.from) >= startY, `Anchor ${anchor.name} starts above ${range}`);
  assert.ok(markerY(anchor.from) < endY, `Anchor ${anchor.name} starts below ${range}`);
  assert.ok(markerY(anchor.to) > startY, `Anchor ${anchor.name} ends above ${range}`);
  assert.ok(markerY(anchor.to) <= endY, `Anchor ${anchor.name} ends below ${range}`);
  assert.ok(
    anchor.from.column !== anchor.to.column ||
      anchor.from.columnOffset !== anchor.to.columnOffset ||
      anchor.from.row !== anchor.to.row ||
      anchor.from.rowOffset !== anchor.to.rowOffset,
    `Anchor ${anchor.name} should have non-zero size`
  );
}

function assertGeneratedXlsxHasEmbeddedImages(entries, expectedCount, expectedAnchors = []) {
  const mediaEntries = entries.filter((entry) => /^xl\/media\/image\d+\.(png|jpg|jpeg)$/i.test(entry.name));
  assert.equal(mediaEntries.length, expectedCount, `Expected ${expectedCount} embedded images`);
  assert.ok(
    entries.some((entry) => /^xl\/drawings\/drawing\d+\.xml$/i.test(entry.name)),
    'Expected generated xlsx drawing XML entry'
  );
  assert.ok(
    entries.some((entry) => /^xl\/drawings\/_rels\/drawing\d+\.xml\.rels$/i.test(entry.name)),
    'Expected generated xlsx drawing relationship entry'
  );
  assert.ok(
    entries.some((entry) => entry.name === 'xl/worksheets/_rels/sheet1.xml.rels'),
    'Expected generated xlsx sheet relationship entry'
  );
  const sheetXml = entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml')?.data.toString('utf8') || '';
  assert.ok(sheetXml.includes('<drawing '), 'Expected sheet1.xml drawing reference');
  const anchors = collectGeneratedXlsxImageAnchors(entries);
  assert.ok(anchors.length >= expectedCount, `Expected at least ${expectedCount} image anchors`);
  for (const expected of expectedAnchors) {
    const anchor = anchors.find((candidate) => candidate.name === expected.fileName);
    assert.ok(anchor, `Expected image anchor for ${expected.fileName}`);
    assertAnchorWithinRange(anchor, expected.range);
    if (expected.inset === 'horizontal') {
      assertAnchorHorizontalInset(anchor);
    } else if (expected.inset === 'vertical') {
      assertAnchorVerticalInset(anchor);
    }
  }
  return anchors;
}

function assertSourceSnapshotImageHashes(snapshot, expectedByFieldKey) {
  for (const [fieldKey, expectedFiles] of Object.entries(expectedByFieldKey)) {
    const actualImages = snapshot.formImages?.[fieldKey] || [];
    assert.deepEqual(
      actualImages.map((image) => image.contentHash),
      expectedFiles.map((file) => file.contentHash),
      `Expected source snapshot image content hashes for ${fieldKey}`
    );
    assert.deepEqual(
      actualImages.map((image) => image.originalFileName),
      expectedFiles.map((file) => file.originalFileName),
      `Expected source snapshot image order for ${fieldKey}`
    );
  }
}

function assertCellContains(cells, cellRef, expectedParts) {
  const value = cells.get(cellRef) || '';
  for (const expectedPart of expectedParts) {
    assert.ok(value.includes(expectedPart), `Expected ${cellRef} to include ${expectedPart}, got ${value}`);
  }
}

function assertCellNotContains(cells, cellRef, forbiddenParts) {
  const value = cells.get(cellRef) || '';
  for (const forbiddenPart of forbiddenParts.filter(Boolean)) {
    assert.equal(
      value.includes(forbiddenPart),
      false,
      `Expected ${cellRef} to not include ${forbiddenPart}, got ${value}`
    );
  }
}

function assertCellMatches(cells, cellRef, pattern) {
  const value = cells.get(cellRef) || '';
  assert.match(value, pattern, `Expected ${cellRef} to match ${pattern}, got ${value}`);
}

function getIndexedXlsxStyleXmls(stylesXml, sectionName, itemName) {
  const section = String(stylesXml || '').match(new RegExp(`<${sectionName}\\b[^>]*>[\\s\\S]*?<\\/${sectionName}>`))?.[0] || '';
  return [...section.matchAll(new RegExp(`<${itemName}\\b[^>]*?(?:\\/>|>[\\s\\S]*?<\\/${itemName}>)`, 'g'))].map(
    (match) => match[0]
  );
}

function getXlsxRunText(runXml) {
  return decodeSmokeXmlText(collectTextMatches(runXml, /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g));
}

function getXlsxRunFontName(runXml) {
  return String(runXml || '').match(/<rFont\b[^>]*\bval="([^"]+)"/)?.[1] || null;
}

function getXlsxCellStyleFontName(workbook, cellRef) {
  const cellXml = workbook.cellXmls.get(cellRef) || '';
  const styleId = Number(cellXml.match(/\bs="(\d+)"/)?.[1]);
  if (!Number.isSafeInteger(styleId)) {
    return null;
  }
  const cellXfs = getIndexedXlsxStyleXmls(workbook.stylesXml, 'cellXfs', 'xf');
  const fontId = Number(cellXfs[styleId]?.match(/\bfontId="(\d+)"/)?.[1]);
  if (!Number.isSafeInteger(fontId)) {
    return null;
  }
  const fonts = getIndexedXlsxStyleXmls(workbook.stylesXml, 'fonts', 'font');
  return fonts[fontId]?.match(/<name\b[^>]*\bval="([^"]+)"/)?.[1] || null;
}

function getXlsxCellRichTextXml(workbook, cellRef) {
  const sharedStringIndex = workbook.cellSharedStringIndexes.get(cellRef);
  if (Number.isSafeInteger(sharedStringIndex)) {
    return workbook.sharedStringXmls[sharedStringIndex] || '';
  }
  return workbook.cellXmls.get(cellRef) || '';
}

function assertExecutionModeRichCheckboxCell(workbook, cellRef, { label, checked }) {
  assertCellContains(workbook.cells, cellRef, [label]);
  const xml = getXlsxCellRichTextXml(workbook, cellRef);
  const runs = [...xml.matchAll(/<r\b[\s\S]*?<\/r>/g)].map((match) => match[0]);
  assert.ok(runs.length >= 2, `Expected ${cellRef} to keep rich text runs`);
  assert.equal(getXlsxRunText(runs[0]), checked ? 'R' : '£');
  const checkboxFont = getXlsxRunFontName(runs[0]) || getXlsxCellStyleFontName(workbook, cellRef);
  assert.equal(checkboxFont, 'Wingdings 2', `Expected ${cellRef} checkbox run/effective font to be Wingdings 2`);
  const labelRun = runs.find((run) => getXlsxRunText(run).includes(label));
  assert.ok(labelRun, `Expected ${cellRef} to keep label run for ${label}`);
  assert.equal(getXlsxRunFontName(labelRun), '宋体', `Expected ${cellRef} label run to keep 宋体`);
  assert.equal(labelRun.includes('Wingdings 2'), false, `Expected ${cellRef} label run not to use Wingdings 2`);
}

function assertExecutionModeRichCheckboxes(workbook, selectedMode) {
  assertExecutionModeRichCheckboxCell(workbook, 'D20', {
    label: '自研模式',
    checked: selectedMode === '自研模式'
  });
  assertExecutionModeRichCheckboxCell(workbook, 'G20', {
    label: '供应链模式',
    checked: selectedMode === '供应链模式'
  });
  const packageText = workbook.entries.map((entry) => entry.data.toString('utf8')).join('\n');
  for (const forbidden of ['☑ 自研模式', '□ 自研模式', '☑ 供应链模式', '□ 供应链模式']) {
    assert.equal(packageText.includes(forbidden), false, `Generated workbook should not contain whole-cell text ${forbidden}`);
  }
}

async function assertGeneratedFileDownloadable({
  projectId,
  document,
  user,
  expectedDocumentCode,
  expectedFileType,
  expectedStatus = GENERATED_FILE_STATUS.GENERATED,
  expectedReviewSnapshot = false
}) {
  const status = await getStageDocumentGeneratedFileStatus({
    projectId,
    documentId: document.id,
    user
  });
  assertNoPrivateGeneratedFilePath(status);
  assert.ok(status.generatedFile, `Expected generated file status for ${expectedDocumentCode}`);
  assert.equal(status.generatedFile.projectId, projectId);
  assert.equal(status.generatedFile.stageDocumentId, document.id);
  assert.equal(status.generatedFile.documentCode, expectedDocumentCode);
  assert.equal(status.generatedFile.fileType, expectedFileType);
  assert.equal(status.generatedFile.status, expectedStatus);
  assert.ok(status.generatedFile.version >= 1);
  assert.ok(status.generatedFile.sourceFormDataHash);

  const rows = await selectGeneratedFileRows(projectId, document.id);
  const latest = rows.at(-1);
  assert.ok(latest, `Generated file row missing for ${expectedDocumentCode}`);
  assert.equal(latest.document_code, expectedDocumentCode);
  assert.equal(latest.file_type, expectedFileType);
  assert.equal(latest.status, expectedStatus);
  assert.equal(Number(latest.version), Number(status.generatedFile.version));
  assert.ok(latest.source_form_data_hash);
  assert.ok(latest.source_snapshot_json);
  assert.ok(latest.trigger_event);

  let download = null;
  if (expectedStatus === GENERATED_FILE_STATUS.GENERATED) {
    assert.ok(latest.storage_key);
    assert.ok(Number(latest.file_size) > 0);
    assert.ok(latest.template_hash);
    download = await getStageDocumentGeneratedFileDownload({
      projectId,
      documentId: document.id,
      user
    });
    assert.equal(download.fileName, latest.file_name);
    assert.ok(download.filePath);
    assert.equal(download.filePath.includes('智能制造项目管理文件模板'), false);
    const stat = await fs.stat(download.filePath);
    assert.equal(stat.size, Number(latest.file_size));
  }

  const snapshot = parseSmokeJson(latest.source_snapshot_json, {});
  assert.equal(snapshot.project?.id, projectId);
  assert.equal(snapshot.document?.documentCode, expectedDocumentCode);

  if (expectedReviewSnapshot) {
    const reviewSnapshot = parseSmokeJson(latest.review_snapshot_json, []);
    assert.equal(reviewSnapshot.length, 3);
    assert.deepEqual(
      reviewSnapshot.map((node) => node.nodeKey),
      ['business_review', 'technical_review', 'general_review']
    );
    assert.ok(reviewSnapshot.every((node) => node.reviewedAt));
  }

  return { latest, rows, status, download, snapshot };
}

async function assertGeneratedFileUnauthorized({ projectId, documentId, user }) {
  await assert.rejects(
    () =>
      getStageDocumentGeneratedFileStatus({
        projectId,
        documentId,
        user
      }),
    (error) =>
      error.code === 'FORBIDDEN_OPERATION' &&
      error.statusCode === 403 &&
      !String(error.message).includes('D:\\') &&
      !String(error.message).includes('stage-document-generated-files') &&
      (assertGeneratedFileErrorHandled(
        error,
        403,
        STAGE_DOCUMENT_GENERATED_FILE_ERROR.FORBIDDEN_OPERATION
      ) || true)
  );
  await assert.rejects(
    () =>
      getStageDocumentGeneratedFileDownload({
        projectId,
        documentId,
        user
      }),
    (error) =>
      error.code === 'FORBIDDEN_OPERATION' &&
      error.statusCode === 403 &&
      !String(error.message).includes('D:\\') &&
      !String(error.message).includes('stage-document-generated-files') &&
      (assertGeneratedFileErrorHandled(
        error,
        403,
        STAGE_DOCUMENT_GENERATED_FILE_ERROR.FORBIDDEN_OPERATION
      ) || true)
  );
}

async function assertGeneratedFileDownloadErrorHandled({ projectId, documentId, user, expectedCode, expectedStatusCode }) {
  await assert.rejects(
    () =>
      getStageDocumentGeneratedFileDownload({
        projectId,
        documentId,
        user
      }),
    (error) =>
      error.code === expectedCode &&
      error.statusCode === expectedStatusCode &&
      (assertGeneratedFileErrorHandled(error, expectedStatusCode, expectedCode) || true)
  );
}

async function assertInitiationNoticeSubmitGateRejects({ projectId, user, expectedDetails }) {
  const notice = await resetInitiationNoticeForSubmit(projectId, user);
  const submittedLogCountBefore = await countDocumentSubmittedLogs(projectId, notice.id);
  const formSubmittedLogCountBefore = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: notice.id
  });

  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: notice.id,
        user,
        formData: buildSmokeNoticeFormData()
      }),
    (error) =>
      error.code === 'INITIATION_NOTICE_GATE_NOT_READY' &&
      error.statusCode === 409 &&
      Array.isArray(error.details) &&
      expectedDetails.every((detail) => error.details.includes(detail))
  );

  const noticeAfterReject = await selectSmokeDocument(projectId, '1.3');
  assert.equal(noticeAfterReject.status, DOCUMENT_STATUS.NOT_SUBMITTED);
  assert.equal(noticeAfterReject.submitted_by_user_id, null);
  assert.equal(await countDocumentSubmittedLogs(projectId, notice.id), submittedLogCountBefore);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: notice.id
  }), formSubmittedLogCountBefore);
}

async function submitInitiationNoticeAfterGateReady(projectId, user, formData = buildSmokeNoticeFormData()) {
  const notice = await resetInitiationNoticeForSubmit(projectId, user);
  const result = await submitStageDocumentOnlineForm({
    projectId,
    documentId: notice.id,
    user,
    formData
  });
  const submittedNotice = result.document;

  assert.equal(submittedNotice.documentCode, '1.3');
  assert.equal(submittedNotice.status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal(submittedNotice.isComplete, true);
  assert.equal(submittedNotice.completionStatus, 'completed');
  assert.equal(result.form.permissions.canEdit, false);
  assert.equal(result.form.permissions.canSubmit, false);
  assert.ok(result.form.blockingReasons.some((reason) => String(reason).includes('submitted')));

  return submittedNotice;
}

async function runInitiationReviewSmoke({
  uniqueSuffix,
  smokeProjectIds,
  managerUser,
  limitedEmployeeUser,
  marketingManagerUser,
  generalManagerUser,
  systemAdminUser,
  generalManagerAssistantUser
}) {
  const requirementFormData = buildSmokeRequirementFormData();
  const initiationFormData = buildSmokeInitiationFormData();
  const noticeFormData = buildSmokeNoticeFormData();

  const projectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'gate',
    smokeProjectIds
  });
  const workspace = await getProjectWorkspace(projectId, managerUser);
  assert.equal(workspace.scope.globalSkeleton, true);
  assert.equal(workspace.templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
  assert.equal(workspace.targetTemplateVersion, 'v20260629');
  assert.equal(workspace.scope.defaultProjectInitializationEnabled, true);
  assert.equal(workspace.scope.legacyProjectMigrationEnabled, false);
  assert.equal(workspace.scope.writesProjectStageDocuments, true);
  assert.equal(workspace.scope.genericActionsMigratedToOutputCards, true);
  assert.equal(workspace.scope.nonInitiationOutputAction, 'workspace_output_card');
  assert.equal(workspace.stages.length, 8);
  assert.ok(workspace.stages.every((stage) => stage.configured === true && Array.isArray(stage.nodes) && stage.nodes.length > 0));
  const workspaceOutputs = workspace.stages
    .flatMap((stage) => stage.nodes || [])
    .flatMap((node) => node.outputs || []);
  const workspaceOutputCodes = new Set(workspaceOutputs.map((output) => output.targetOutputCode));
  const workspaceManagedOutputCount =
    V20260629_TARGET_TEMPLATE_OUTPUT_COUNT - SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES.length;
  assert.equal(
    workspaceOutputCodes.size,
    workspaceManagedOutputCount
  );
  assert.equal(
    workspaceOutputs.filter((output) => !LEGACY_CONTRACT_REVIEW_COMPATIBILITY_OUTPUT_CODES.has(output.targetOutputCode)).length,
    workspaceManagedOutputCount
  );
  for (const dedicatedDocumentCode of SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES) {
    assert.equal(
      workspaceOutputCodes.has(dedicatedDocumentCode),
      false,
      `Solution design dedicated document must not be exposed as a workspace output: ${dedicatedDocumentCode}`
    );
  }
  for (const compatibilityOutputCode of LEGACY_CONTRACT_REVIEW_COMPATIBILITY_OUTPUT_CODES) {
    assert.equal(
      workspaceOutputCodes.has(compatibilityOutputCode),
      false,
      `Workspace compatibility output must not be shown for v20260629 project: ${compatibilityOutputCode}`
    );
  }
  const nonInitiationOutputs = workspaceOutputs.filter((output) => output.stageKey !== 'initiation');
  assert.ok(nonInitiationOutputs.length > 0);
  assert.ok(
    nonInitiationOutputs
      .filter((output) => output.legacyChecklistTarget.available)
      .every(
        (output) =>
          output.formAvailable === false &&
          output.actionHints.length > 0 &&
          !output.actionHints.includes('locate_legacy_checklist')
      )
  );
  assert.ok(
    nonInitiationOutputs.every(
      (output) =>
        !output.actionHints.includes('edit_or_submit_form') &&
        !output.actionHints.includes('handle_initiation_review')
    )
  );
  const initiationStage = workspace.stages.find((stage) => stage.stageKey === 'initiation');
  assert.ok(initiationStage);
  assert.equal(initiationStage.configured, true);
  assert.deepEqual(
    initiationStage.nodes.map((node) => node.nodeKey),
    ['project_input', 'market_research', 'initiation_approval', 'initiation_notice']
  );
  const solutionStage = workspace.stages.find((stage) => stage.stageKey === 'solution');
  assert.deepEqual(
    solutionStage.nodes.map((node) => node.nodeKey),
    SOLUTION_DESIGN_NODES.map((node) => node.nodeKey)
  );
  assert.equal(solutionStage.nodes.some((node) => node.nodeKey === 'cost_price_estimation'), false);
  assert.equal(solutionStage.nodes.some((node) => node.nodeKey === 'quotation'), false);
  assert.equal(solutionStage.nodes.some((node) => node.nodeKey === 'tender'), false);

  const managerChecklist = await getProjectStageDocumentChecklist(projectId, managerUser);
  const checklistDocuments = managerChecklist.stages.flatMap((stage) => stage.documents || []);
  assert.equal(checklistDocuments.length, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
  const solutionPlanDocument = findChecklistDocument(managerChecklist, '2.1');
  assert.equal(solutionPlanDocument.documentCode, '2.1');
  const tenderDocument = findChecklistDocument(managerChecklist, 'C19');
  assert.equal(tenderDocument.documentCode, 'C19');

  const marketingResponsibilityChecklist = await getProjectStageDocumentChecklist(projectId, marketingManagerUser);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.1').canManageResponsibility, true);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.2').canManageResponsibility, false);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.3').canManageResponsibility, false);
  const marketingResponsibilityWorkspace = await getProjectWorkspace(projectId, marketingManagerUser);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.1').permissions.canManageResponsibility, true);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.2').permissions.canManageResponsibility, false);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.3').permissions.canManageResponsibility, false);
  const rdResponsibilityChecklist = managerChecklist;
  assert.equal(findChecklistDocument(rdResponsibilityChecklist, '1.1').canManageResponsibility, false);
  assert.equal(findChecklistDocument(rdResponsibilityChecklist, '1.2').canManageResponsibility, false);
  const assistantResponsibilityChecklist = await getProjectStageDocumentChecklist(projectId, generalManagerAssistantUser);
  assert.equal(findChecklistDocument(assistantResponsibilityChecklist, '1.1').canManageResponsibility, false);
  assert.equal(findChecklistDocument(assistantResponsibilityChecklist, '1.2').canManageResponsibility, false);

  const visibilityProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'form-visibility',
    smokeProjectIds
  });
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = CASE document_code
       WHEN '1.1' THEN ?
       WHEN '1.2' THEN ?
       ELSE responsible_user_id
     END,
       is_applicable = 1
     WHERE project_id = ?
       AND document_code IN ('1.1', '1.2')`,
    [limitedEmployeeUser.id, managerUser.id, visibilityProjectId]
  );
  const visibilityRequirement = await selectSmokeDocument(visibilityProjectId, '1.1');
  const visibilityInitiation = await selectSmokeDocument(visibilityProjectId, '1.2');
  const visibilityNotice = await selectSmokeDocument(visibilityProjectId, '1.3');
  const visibleForm = await getStageDocumentOnlineForm({
    projectId: visibilityProjectId,
    documentId: visibilityRequirement.id,
    user: limitedEmployeeUser
  });
  assert.equal(visibleForm.documentCode, '1.1');
  assert.equal(visibleForm.permissions.canView, true);
  assert.deepEqual(
    visibleForm.schema.sections.map((section) => section.title),
    ['基础信息', '环境要求', '场地情况', '工件描述', '作业工艺', '目标']
  );
  const requirementFieldKeys = new Set(visibleForm.schema.fields.map((field) => field.key));
  for (const key of [
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
    'altitudeLimitValue',
    'siteConditionDescription',
    'siteConditionImages',
    'workpieceDescription',
    'workpieceImages',
    'operationProcessDescription',
    'operationProcessImages',
    'projectTargetDescription'
  ]) {
    assert.ok(requirementFieldKeys.has(key), `1.1 schema should include ${key}`);
  }

  const initiationTemplateForm = await getStageDocumentOnlineForm({
    projectId: visibilityProjectId,
    documentId: visibilityInitiation.id,
    user: managerUser
  });
  assert.equal(initiationTemplateForm.documentCode, '1.2');
  assert.equal(initiationTemplateForm.schema.reviewOpinionSource, 'initiationReviewNodes');
  assert.deepEqual(
    initiationTemplateForm.schema.sections.map((section) => section.key),
    ['approvalHeader', 'customerBasicInfo', 'projectBasicInfo']
  );
  assert.deepEqual(
    initiationTemplateForm.schema.sections.find((section) => section.key === 'approvalHeader').fields.map((field) => field.key),
    ['projectName']
  );
  assert.deepEqual(
    initiationTemplateForm.schema.sections.find((section) => section.key === 'customerBasicInfo').fields.map((field) => field.key),
    ['customerName', 'customerContactPerson', 'customerContact']
  );
  assert.deepEqual(
    initiationTemplateForm.schema.sections.find((section) => section.key === 'projectBasicInfo').fields.map((field) => field.key),
    ['projectResponsiblePerson', 'projectResponsibleContact']
  );
  assert.equal(
    initiationTemplateForm.schema.fields.some((field) => field.key === 'projectExecutionMode'),
    false
  );
  assert.equal(initiationTemplateForm.schema.scoringSections.length, 2);
  assert.deepEqual(
    initiationTemplateForm.schema.scoringSections.map((section) => section.items.length),
    [6, 5]
  );
  const customerEnterpriseAttributeItem = initiationTemplateForm.schema.scoringSections[0].items.find(
    (item) => item.key === 'customerEnterpriseAttribute'
  );
  assert.ok(customerEnterpriseAttributeItem.clauseContent.includes('客户企业属性'));
  assert.ok(customerEnterpriseAttributeItem.evaluationStandard.includes('上市公司'));
  const specialEnvironmentItem = initiationTemplateForm.schema.scoringSections[1].items.find(
    (item) => item.key === 'specialEnvironment'
  );
  assert.ok(specialEnvironmentItem.clauseContent.includes('防爆'));
  assert.ok(specialEnvironmentItem.evaluationStandard.includes('5-以上要求均无'));
  assert.ok(
    initiationTemplateForm.schema.fields.some((field) => field.key === 'customerEnterpriseAttributeInformationNotes'),
    '1.2 schema should keep information collection notes field'
  );
  assert.deepEqual(
    initiationTemplateForm.reviewOpinions.map((opinion) => opinion.nodeKey),
    ['business_review', 'technical_review', 'general_review']
  );

  const noticeTemplateForm = await getStageDocumentOnlineForm({
    projectId: visibilityProjectId,
    documentId: visibilityNotice.id,
    user: marketingManagerUser
  });
  assert.equal(noticeTemplateForm.documentCode, '1.3');
  assert.equal(noticeTemplateForm.schema.noticeTemplate.title, '关于确定项目名称及编号的通知');
  assert.ok(noticeTemplateForm.schema.noticeTemplate.bodyParagraphs[1].includes('成本归集'));
  assert.equal(
    noticeTemplateForm.schema.fields.find((field) => field.key === 'projectCode')?.readOnly,
    undefined
  );
  assert.equal(noticeTemplateForm.schema.fields.find((field) => field.key === 'projectCode')?.required, true);
  assert.equal(noticeTemplateForm.blockingReasons.some((reason) => String(reason).includes('项目编号')), false);
  await assert.rejects(
    () =>
      getStageDocumentOnlineForm({
        projectId: visibilityProjectId,
        documentId: visibilityInitiation.id,
        user: limitedEmployeeUser
      }),
    (error) =>
      error.code === 'FORBIDDEN_OPERATION' &&
      error.statusCode === 403 &&
      Array.isArray(error.details) &&
      error.details.includes('documentId')
  );
  await assert.rejects(
    () =>
      getStageDocumentOnlineForm({
        projectId: visibilityProjectId,
        documentId: visibilityNotice.id,
        user: limitedEmployeeUser
      }),
    (error) =>
      error.code === 'FORBIDDEN_OPERATION' &&
      error.statusCode === 403 &&
      Array.isArray(error.details) &&
      error.details.includes('documentId')
  );
  await submitStageDocumentOnlineForm({
    projectId: visibilityProjectId,
    documentId: visibilityRequirement.id,
    user: limitedEmployeeUser,
    formData: requirementFormData
  });
  await assertGeneratedFileDownloadable({
    projectId: visibilityProjectId,
    document: await selectSmokeDocument(visibilityProjectId, '1.1'),
    user: limitedEmployeeUser,
    expectedDocumentCode: '1.1',
    expectedFileType: 'xlsx'
  });

  const requirementDocument = await selectSmokeDocument(projectId, '1.1');
  assert.equal(requirementDocument.responsible_user_id, marketingManagerUser.id);
  const initiationDocumentBeforeRequirement = await selectSmokeDocument(projectId, '1.2');
  const businessWorkbenchBeforeRequirement = await getMyWorkbench(marketingManagerUser);
  const technicalWorkbenchBeforeRequirement = await getMyWorkbench(managerUser);
  assert.equal(
    findInitiationCollaborationWorkbenchTodo(businessWorkbenchBeforeRequirement, projectId, 'business'),
    undefined
  );
  assert.equal(
    findInitiationCollaborationWorkbenchTodo(technicalWorkbenchBeforeRequirement, projectId, 'technical'),
    undefined
  );
  assert.ok(
    businessWorkbenchBeforeRequirement.items.some(
      (item) => item.projectId === projectId && item.documentCode === '1.1'
    )
  );
  const blockedInitiationBeforeRequirement = await getStageDocumentOnlineForm({
    projectId,
    documentId: initiationDocumentBeforeRequirement.id,
    user: marketingManagerUser
  });
  assert.equal(blockedInitiationBeforeRequirement.permissions.canEdit, false);
  assert.equal(blockedInitiationBeforeRequirement.permissions.canSubmit, false);
  assert.ok(
    blockedInitiationBeforeRequirement.blockingReasons.some((reason) =>
      String(reason).includes('请先提交 1.1 项目需求表')
    )
  );
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: initiationDocumentBeforeRequirement.id,
        user: marketingManagerUser,
        formData: buildSmokeInitiationBusinessFormData()
      }),
    (error) =>
      error.code === 'INITIATION_REQUIREMENT_NOT_SUBMITTED' &&
      error.statusCode === 409 &&
      Array.isArray(error.details) &&
      error.details.includes('1.1')
  );
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initiationDocumentBeforeRequirement.id,
        user: managerUser,
        formData: buildSmokeInitiationTechnicalFormData()
      }),
    (error) =>
      error.code === 'INITIATION_REQUIREMENT_NOT_SUBMITTED' &&
      error.statusCode === 409 &&
      Array.isArray(error.details) &&
      error.details.includes('1.1')
  );
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: requirementDocument.id,
        user: managerUser,
        formData: requirementFormData
      }),
    (error) =>
      error.code === 'FORBIDDEN_OPERATION' &&
      Array.isArray(error.details) &&
      error.details.includes('responsibleUserId')
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: requirementDocument.id,
        responsibleUserId: managerUser.id,
        user: managerUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: requirementDocument.id,
        responsibleUserId: managerUser.id,
        user: generalManagerAssistantUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: requirementDocument.id,
        responsibleUserId: managerUser.id,
        user: systemAdminUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  await updateProjectStageDocumentResponsibleUser({
    projectId,
    documentId: requirementDocument.id,
    responsibleUserId: managerUser.id,
    user: marketingManagerUser
  });
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: requirementDocument.id,
        user: marketingManagerUser,
        formData: requirementFormData
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await assertOrdinaryOnlineFormDocumentSubmitRejected({
    projectId,
    documentCode: '1.1',
    user: managerUser
  });
  const siteImageFile = buildSmokePngFile('site-condition-1.png', {
    width: 180,
    height: 45,
    rgba: [40, 120, 220, 255]
  });
  const workpieceWideFile = buildSmokePngFile('workpiece-1.png', {
    width: 640,
    height: 20,
    rgba: [200, 80, 60, 255]
  });
  const workpieceTallFile = buildSmokePngFile('workpiece-2.png', {
    width: 40,
    height: 160,
    rgba: [60, 150, 90, 255]
  });
  const operationWideFile = buildSmokePngFile('operation-process-1.png', {
    width: 720,
    height: 20,
    rgba: [100, 80, 200, 255]
  });
  const operationTallFile = buildSmokePngFile('operation-process-2.png', {
    width: 45,
    height: 180,
    rgba: [200, 150, 40, 255]
  });
  const operationSquareFile = buildSmokePngFile('operation-process-3.png', {
    width: 80,
    height: 80,
    rgba: [40, 180, 180, 255]
  });
  const uploadedSiteImages = [];
  uploadedSiteImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'siteConditionImages',
    user: managerUser,
    file: siteImageFile
  }));
  const uploadedWorkpieceImages = [];
  uploadedWorkpieceImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'workpieceImages',
    user: managerUser,
    file: workpieceWideFile
  }));
  uploadedWorkpieceImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'workpieceImages',
    user: managerUser,
    file: workpieceTallFile
  }));
  const uploadedOperationImages = [];
  uploadedOperationImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'operationProcessImages',
    user: managerUser,
    file: operationWideFile
  }));
  uploadedOperationImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'operationProcessImages',
    user: managerUser,
    file: operationTallFile
  }));
  uploadedOperationImages.push(await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId: requirementDocument.id,
    fieldKey: 'operationProcessImages',
    user: managerUser,
    file: operationSquareFile
  }));
  await assert.rejects(
    () =>
      uploadStageDocumentOnlineFormImage({
        projectId,
        documentId: requirementDocument.id,
        fieldKey: 'operationProcessImages',
        user: managerUser,
        file: buildSmokePngFile('operation-process-4.png')
      }),
    (error) =>
      error.code === 'ONLINE_FORM_IMAGE_LIMIT_EXCEEDED' &&
      error.statusCode === 409 &&
      error.details?.fieldKey === 'operationProcessImages' &&
      error.details?.maxImages === 3
  );
  const imageDownload = await getStageDocumentOnlineFormImageDownload({
    projectId,
    documentId: requirementDocument.id,
    imageId: uploadedSiteImages[0].id,
    user: managerUser
  });
  assert.equal(imageDownload.mimeType, 'image/png');
  assert.ok(imageDownload.filePath);
  assert.equal(uploadedSiteImages[0].contentHash, siteImageFile.contentHash);
  assert.equal(uploadedWorkpieceImages[0].contentHash, workpieceWideFile.contentHash);
  assert.equal(uploadedWorkpieceImages[1].contentHash, workpieceTallFile.contentHash);
  assert.equal(uploadedOperationImages[0].contentHash, operationWideFile.contentHash);
  assert.equal(uploadedOperationImages[1].contentHash, operationTallFile.contentHash);
  assert.equal(uploadedOperationImages[2].contentHash, operationSquareFile.contentHash);
  const formWithImages = await getStageDocumentOnlineForm({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser
  });
  assert.equal(formWithImages.images.length, 6);
  assert.deepEqual(
    formWithImages.images.map((image) => image.fieldKey).sort(),
    [
      'operationProcessImages',
      'operationProcessImages',
      'operationProcessImages',
      'siteConditionImages',
      'workpieceImages',
      'workpieceImages'
    ].sort()
  );
  assert.deepEqual(
    formWithImages.images
      .filter((image) => image.fieldKey === 'workpieceImages')
      .map((image) => image.originalFileName),
    ['workpiece-1.png', 'workpiece-2.png']
  );
  assert.deepEqual(
    formWithImages.images
      .filter((image) => image.fieldKey === 'operationProcessImages')
      .map((image) => image.originalFileName),
    ['operation-process-1.png', 'operation-process-2.png', 'operation-process-3.png']
  );
  await saveStageDocumentOnlineForm({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser,
    formData: requirementFormData
  });
  const submittedRequirementResult = await submitStageDocumentOnlineForm({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser,
    formData: requirementFormData
  });
  assert.equal(submittedRequirementResult.form.permissions.canEdit, false);
  assert.equal(submittedRequirementResult.form.permissions.canSubmit, false);
  assert.ok(
    submittedRequirementResult.form.blockingReasons.some((reason) => String(reason).includes('submitted'))
  );
  const submittedRequirementGet = await getStageDocumentOnlineForm({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser
  });
  assert.equal(submittedRequirementGet.permissions.canEdit, false);
  assert.equal(submittedRequirementGet.permissions.canSubmit, false);
  assert.ok(submittedRequirementGet.blockingReasons.some((reason) => String(reason).includes('submitted')));
  const submittedRequirementFormRow = await selectOnlineFormRow(requirementDocument.id);
  const submittedRequirementDocument = await selectSmokeDocument(projectId, '1.1');
  const submittedRequirementFormData = parseFormDataJson(submittedRequirementFormRow);
  const requirementGenerated = await assertGeneratedFileDownloadable({
    projectId,
    document: submittedRequirementDocument,
    user: managerUser,
    expectedDocumentCode: '1.1',
    expectedFileType: 'xlsx'
  });
  const requirementWorkbook = await readGeneratedXlsxCells(requirementGenerated.download.filePath);
  assertGeneratedFileXmlContent(requirementWorkbook.sheetXml, []);
  assertCellContains(requirementWorkbook.cells, 'C2', ['客户名称']);
  assertCellContains(requirementWorkbook.cells, 'C3', ['交流次数']);
  assertCellContains(requirementWorkbook.cells, 'C4', ['交流方式']);
  assertCellContains(requirementWorkbook.cells, 'B7', ['工作温度', '℃~', submittedRequirementFormData.workingTemperatureMin, submittedRequirementFormData.workingTemperatureMax]);
  assertCellContains(requirementWorkbook.cells, 'D7', ['储存温度', '℃~', submittedRequirementFormData.storageTemperatureMin, submittedRequirementFormData.storageTemperatureMax]);
  assertCellContains(requirementWorkbook.cells, 'B8', ['工作湿度', '%~', submittedRequirementFormData.workingHumidityMin, submittedRequirementFormData.workingHumidityMax]);
  assertCellContains(requirementWorkbook.cells, 'D8', ['储存湿度', '%~', submittedRequirementFormData.storageHumidityMin, submittedRequirementFormData.storageHumidityMax]);
  assertCellContains(requirementWorkbook.cells, 'B9', ['噪音：≤（', submittedRequirementFormData.noiseLimitValue, '）dB']);
  assertCellContains(requirementWorkbook.cells, 'D9', ['IP防护等级：IP', submittedRequirementFormData.ipProtectionLevel]);
  assertCellContains(requirementWorkbook.cells, 'D10', ['海拔高度：≤（', submittedRequirementFormData.altitudeLimitValue, '）m']);
  assertCellContains(requirementWorkbook.cells, 'B11', ['防爆要求：（', submittedRequirementFormData.explosionProofRequirement, '）']);
  assertCellContains(requirementWorkbook.cells, 'B15', ['包括工件外形尺寸、质量、材质、数量']);
  assertCellContains(requirementWorkbook.cells, 'B16', [submittedRequirementFormData.workpieceDescription]);
  assertCellContains(requirementWorkbook.cells, 'B20', ['做什么、怎么做']);
  assertCellContains(requirementWorkbook.cells, 'B21', [submittedRequirementFormData.operationProcessDescription]);
  assertCellContains(requirementWorkbook.cells, 'B30', ['自动化环节、节拍、人机交互模式、价格、工期']);
  assertCellContains(requirementWorkbook.cells, 'B31', [submittedRequirementFormData.projectTargetDescription]);
  assertMergeAdjustedForImages(requirementWorkbook.sheetXml);
  assertSourceSnapshotImageHashes(requirementGenerated.snapshot, {
    siteConditionImages: [siteImageFile],
    workpieceImages: [workpieceWideFile, workpieceTallFile],
    operationProcessImages: [operationWideFile, operationTallFile, operationSquareFile]
  });
  const requirementImageAnchors = assertGeneratedXlsxHasEmbeddedImages(requirementWorkbook.entries, 6, [
    { fileName: 'site-condition-1.png', range: 'D12:E12' },
    { fileName: 'workpiece-1.png', range: 'B18:E19', inset: 'vertical' },
    { fileName: 'workpiece-2.png', range: 'B18:E19', inset: 'horizontal' },
    { fileName: 'operation-process-1.png', range: 'B25:E29', inset: 'vertical' },
    { fileName: 'operation-process-2.png', range: 'B25:E29', inset: 'horizontal' },
    { fileName: 'operation-process-3.png', range: 'B25:E29' }
  ]);
  assertAnchorsOrderedLeftToRight(requirementImageAnchors, ['workpiece-1.png', 'workpiece-2.png']);
  assertAnchorsOrderedLeftToRight(requirementImageAnchors, [
    'operation-process-1.png',
    'operation-process-2.png',
    'operation-process-3.png'
  ]);
  await assertGeneratedFileUnauthorized({
    projectId,
    documentId: submittedRequirementDocument.id,
    user: limitedEmployeeUser
  });
  await pool.execute(
    `UPDATE project_stage_document_forms
     SET form_data_json = ?
     WHERE stage_document_id = ?`,
    [
      JSON.stringify({
        ...submittedRequirementFormData,
        workpieceDescription: ''
      }),
      requirementDocument.id
    ]
  );
  const failedRequirementGeneration = await generateInitiationTemplateFile({
    projectId,
    documentId: requirementDocument.id,
    documentCode: '1.1',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
    user: managerUser
  });
  assert.equal(failedRequirementGeneration.status, GENERATED_FILE_STATUS.FAILED);
  assert.equal(failedRequirementGeneration.version, requirementGenerated.latest.version + 1);
  assert.equal((await selectSmokeDocument(projectId, '1.1')).status, DOCUMENT_STATUS.SUBMITTED);
  const failedRequirementStatus = await getStageDocumentGeneratedFileStatus({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser
  });
  assert.equal(failedRequirementStatus.generatedFile.status, GENERATED_FILE_STATUS.FAILED);
  assert.equal(failedRequirementStatus.generatedFile.downloadable, true);
  assert.equal(
    Number(failedRequirementStatus.generatedFile.downloadableVersion),
    Number(requirementGenerated.latest.version)
  );
  const fallbackRequirementDownload = await getStageDocumentGeneratedFileDownload({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser
  });
  assert.equal(fallbackRequirementDownload.fileName, requirementGenerated.latest.file_name);
  assert.equal(fallbackRequirementDownload.filePath, requirementGenerated.download.filePath);
  await cleanupStageDocumentGeneratedFile(requirementGenerated.latest.storage_key);
  await assertGeneratedFileDownloadErrorHandled({
    projectId,
    documentId: requirementDocument.id,
    user: managerUser,
    expectedCode: STAGE_DOCUMENT_GENERATED_FILE_ERROR.FILE_MISSING,
    expectedStatusCode: 404
  });
  await pool.execute(
    `UPDATE project_stage_document_forms
     SET form_data_json = ?
     WHERE stage_document_id = ?`,
    [JSON.stringify(submittedRequirementFormData), requirementDocument.id]
  );
  const regeneratedRequirement = await generateInitiationTemplateFile({
    projectId,
    documentId: requirementDocument.id,
    documentCode: '1.1',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
    user: managerUser
  });
  assert.equal(regeneratedRequirement.status, GENERATED_FILE_STATUS.GENERATED);
  assert.equal(regeneratedRequirement.version, failedRequirementGeneration.version + 1);
  const requirementGeneratedRowsAfterRegenerate = await selectGeneratedFileRows(projectId, requirementDocument.id);
  assert.ok(
    requirementGeneratedRowsAfterRegenerate.some(
      (row) =>
        Number(row.version) === Number(requirementGenerated.latest.version) &&
        row.status === GENERATED_FILE_STATUS.SUPERSEDED
    )
  );
  const requirementFormUpdatedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: requirementDocument.id
  });
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: requirementDocument.id,
        user: managerUser,
        formData: {
          ...requirementFormData,
          operationProcessDescription: 'tampered requirement after submit'
        }
      }),
    (error) =>
      error.code === 'FORM_DOCUMENT_NOT_EDITABLE' &&
      error.statusCode === 409 &&
      Array.isArray(error.details) &&
      error.details.includes('documentId') &&
      error.details.includes('status')
  );
  const requirementFormAfterRejectedSave = await selectOnlineFormRow(requirementDocument.id);
  const requirementDocumentAfterRejectedSave = await selectSmokeDocument(projectId, '1.1');
  assert.equal(requirementFormAfterRejectedSave.status, 'submitted');
  assert.deepEqual(parseFormDataJson(requirementFormAfterRejectedSave), submittedRequirementFormData);
  assert.equal(requirementDocumentAfterRejectedSave.status, submittedRequirementDocument.status);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: requirementDocument.id
  }), requirementFormUpdatedLogCount);

  const initialInitiationDocument = await selectSmokeDocument(projectId, '1.2');
  assert.equal(initialInitiationDocument.responsible_user_id, marketingManagerUser.id);
  const overviewBeforeHistoricalInitiationResponsible = await getProjectOverviewDashboard(managerUser, {});
  const tasksBeforeHistoricalInitiationResponsible = await listMyStageDocumentTasks(
    managerUser.id,
    normalizeStageDocumentTaskFilters({})
  );
  await pool.execute(
    'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
    [managerUser.id, initialInitiationDocument.id]
  );
  const overviewAfterHistoricalInitiationResponsible = await getProjectOverviewDashboard(managerUser, {});
  assert.equal(
    overviewAfterHistoricalInitiationResponsible.summary.myPendingStageDocumentTasks,
    overviewBeforeHistoricalInitiationResponsible.summary.myPendingStageDocumentTasks
  );
  const tasksAfterHistoricalInitiationResponsible = await listMyStageDocumentTasks(
    managerUser.id,
    normalizeStageDocumentTaskFilters({})
  );
  assert.deepEqual(
    tasksAfterHistoricalInitiationResponsible.filter((task) => task.projectId === projectId && task.documentCode === '1.2'),
    []
  );
  assert.deepEqual(
    tasksAfterHistoricalInitiationResponsible.map((task) => task.documentId),
    tasksBeforeHistoricalInitiationResponsible.map((task) => task.documentId)
  );
  await pool.execute(
    'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
    [marketingManagerUser.id, initialInitiationDocument.id]
  );
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: managerUser,
        formData: buildSmokeInitiationTechnicalFormData({
          projectResponsibleContact: 'technical user cannot change business field'
        })
      }),
    (error) =>
      error.code === 'FORM_FIELDS_NOT_ALLOWED' &&
      Array.isArray(error.details) &&
      error.details.includes('projectResponsibleContact')
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: initialInitiationDocument.id,
        responsibleUserId: managerUser.id,
        user: managerUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: initialInitiationDocument.id,
        responsibleUserId: managerUser.id,
        user: generalManagerAssistantUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: initialInitiationDocument.id,
        responsibleUserId: managerUser.id,
        user: systemAdminUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  const technicalResponsibleWorkbenchBeforeReassignment = await getMyWorkbench(managerUser);
  assert.ok(findInitiationCollaborationWorkbenchTodo(technicalResponsibleWorkbenchBeforeReassignment, projectId, 'technical'));
  const businessResponsibleWorkbenchBeforeSubmit = await getMyWorkbench(marketingManagerUser);
  assert.ok(findInitiationCollaborationWorkbenchTodo(businessResponsibleWorkbenchBeforeSubmit, projectId, 'business'));
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: marketingManagerUser,
        formData: buildSmokeInitiationBusinessFormData({
          specialEnvironmentScore: '5'
        })
      }),
    (error) =>
      error.code === 'FORM_FIELDS_NOT_ALLOWED' &&
      Array.isArray(error.details) &&
      error.details.includes('specialEnvironmentScore')
  );
  await assertOrdinaryOnlineFormDocumentSubmitRejected({
    projectId,
    documentCode: '1.2',
    user: managerUser
  });
  const businessInitiationResult = await submitStageDocumentOnlineForm({
    projectId,
    documentId: initialInitiationDocument.id,
    user: marketingManagerUser,
    formData: buildSmokeInitiationBusinessFormData()
  });
  assert.equal(businessInitiationResult.form.status, 'draft');
  assert.equal(businessInitiationResult.form.collaboration.businessSubmitted, true);
  assert.equal(businessInitiationResult.form.collaboration.technicalSubmitted, false);
  assert.equal(Object.hasOwn(businessInitiationResult.form.formData, 'projectExecutionMode'), false);
  assert.equal((await selectSmokeDocument(projectId, '1.2')).status, DOCUMENT_STATUS.NOT_SUBMITTED);
  await assertNoInitiationWorkbenchTask(marketingManagerUser, projectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, projectId, 'technical_review');
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: marketingManagerUser,
        formData: buildSmokeInitiationBusinessFormData({
          projectCode: '',
          projectResponsibleContact: ''
        })
      }),
    (error) => error.code === 'FORM_PART_ALREADY_SUBMITTED' && error.statusCode === 409
  );
  assert.equal((await getProjectDetail(projectId, marketingManagerUser)).project.projectCode, null);
  const businessResponsibleWorkbenchAfterSubmit = await getMyWorkbench(marketingManagerUser);
  assert.equal(findInitiationCollaborationWorkbenchTodo(businessResponsibleWorkbenchAfterSubmit, projectId, 'business'), undefined);
  const technicalResponsibleWorkbenchAfterBusinessSubmit = await getMyWorkbench(managerUser);
  assert.ok(findInitiationCollaborationWorkbenchTodo(technicalResponsibleWorkbenchAfterBusinessSubmit, projectId, 'technical'));
  const submittedInitiationResult = await submitStageDocumentOnlineForm({
    projectId,
    documentId: initialInitiationDocument.id,
    user: managerUser,
    formData: buildSmokeInitiationTechnicalFormData()
  });
  assert.equal(submittedInitiationResult.form.status, 'submitted');
  assert.equal(submittedInitiationResult.form.collaboration.businessSubmitted, true);
  assert.equal(submittedInitiationResult.form.collaboration.technicalSubmitted, true);
  assert.equal(submittedInitiationResult.form.permissions.canEdit, false);
  assert.equal(submittedInitiationResult.form.permissions.canSubmit, false);
  assert.ok(submittedInitiationResult.form.blockingReasons.some((reason) => String(reason).includes('submitted')));
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: managerUser,
        formData: buildSmokeInitiationTechnicalFormData({
          specialEnvironmentScore: '0'
        })
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  const submittedInitiationGet = await getStageDocumentOnlineForm({
    projectId,
    documentId: initialInitiationDocument.id,
    user: managerUser
  });
  assert.equal(submittedInitiationGet.permissions.canEdit, false);
  assert.equal(submittedInitiationGet.permissions.canSubmit, false);
  assert.ok(submittedInitiationGet.blockingReasons.some((reason) => String(reason).includes('submitted')));
  let initiationFormRow = await selectOnlineFormRow(initialInitiationDocument.id);
  assert.equal(initiationFormRow.status, 'submitted');
  const submittedInitiationFormData = parseFormDataJson(initiationFormRow);
  const initiationDocument = await selectSmokeDocument(projectId, '1.2');
  assert.equal(initiationDocument.status, DOCUMENT_STATUS.SUBMITTED);
  const initiationFormUpdatedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: initialInitiationDocument.id
  });
  const duplicateFormSubmittedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: initialInitiationDocument.id
  });
  const duplicateDocumentSubmittedLogCount = await countDocumentSubmittedLogs(projectId, initialInitiationDocument.id);
  const duplicateInitiationSubmittedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: initialInitiationDocument.id
  });
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: managerUser,
        formData: {
          ...initiationFormData,
          customerEnterpriseAttributeInformationNotes: 'tampered initiation after submit'
        }
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  initiationFormRow = await selectOnlineFormRow(initialInitiationDocument.id);
  assert.equal(initiationFormRow.status, 'submitted');
  assert.deepEqual(parseFormDataJson(initiationFormRow), submittedInitiationFormData);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: initialInitiationDocument.id
  }), initiationFormUpdatedLogCount);
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: managerUser,
        formData: {
          ...initiationFormData,
          customerEnterpriseAttributeInformationNotes: 'duplicate submit should fail'
        }
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  initiationFormRow = await selectOnlineFormRow(initialInitiationDocument.id);
  assert.equal(initiationFormRow.status, 'submitted');
  assert.deepEqual(parseFormDataJson(initiationFormRow), submittedInitiationFormData);
  assert.equal((await selectSmokeDocument(projectId, '1.2')).status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal((await getProjectDetail(projectId, marketingManagerUser)).project.projectCode, null);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: initialInitiationDocument.id
  }), duplicateFormSubmittedLogCount);
  assert.equal(await countDocumentSubmittedLogs(projectId, initialInitiationDocument.id), duplicateDocumentSubmittedLogCount);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: initialInitiationDocument.id
  }), duplicateInitiationSubmittedLogCount);
  let nodes = await selectInitiationReviewNodes(projectId);
  assert.equal(nodes.length, 3);
  assertInitiationNodeStatus(nodes, 'business_review', 'pending');
  assertInitiationNodeStatus(nodes, 'technical_review', 'pending');
  assertInitiationNodeStatus(nodes, 'general_review', 'waiting_prerequisite');
  await assertHasInitiationWorkbenchTask(marketingManagerUser, projectId, 'business_review');
  await assertHasInitiationWorkbenchTask(managerUser, projectId, 'technical_review');
  await assertNoInitiationWorkbenchTask(generalManagerUser, projectId, 'general_review');
  await assertNoInitiationWorkbenchTask(
    departmentUser(9101, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER),
    projectId
  );
  const noticeResponsibilityDocument = await selectSmokeDocument(projectId, '1.3');
  const overviewBeforeHistoricalNoticeResponsible = await getProjectOverviewDashboard(marketingManagerUser, {});
  const tasksBeforeHistoricalNoticeResponsible = await listMyStageDocumentTasks(
    marketingManagerUser.id,
    normalizeStageDocumentTaskFilters({})
  );
  await pool.execute(
    'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
    [marketingManagerUser.id, noticeResponsibilityDocument.id]
  );
  const overviewAfterHistoricalNoticeResponsible = await getProjectOverviewDashboard(marketingManagerUser, {});
  assert.equal(
    overviewAfterHistoricalNoticeResponsible.summary.myPendingStageDocumentTasks,
    overviewBeforeHistoricalNoticeResponsible.summary.myPendingStageDocumentTasks
  );
  const tasksAfterHistoricalNoticeResponsible = await listMyStageDocumentTasks(
    marketingManagerUser.id,
    normalizeStageDocumentTaskFilters({})
  );
  assert.deepEqual(
    tasksAfterHistoricalNoticeResponsible.filter((task) => task.projectId === projectId && task.documentCode === '1.3'),
    []
  );
  assert.deepEqual(
    tasksAfterHistoricalNoticeResponsible.map((task) => task.documentId),
    tasksBeforeHistoricalNoticeResponsible.map((task) => task.documentId)
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentResponsibleUser({
        projectId,
        documentId: noticeResponsibilityDocument.id,
        responsibleUserId: marketingManagerUser.id,
        user: marketingManagerUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION' && error.statusCode === 403
  );
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = NULL,
       status = ?
     WHERE project_id = ?
       AND document_code = '1.3'`,
    [DOCUMENT_STATUS.NOT_SUBMITTED, projectId]
  );
  const checklistBeforeInitiationApproval = await getProjectStageDocumentChecklist(projectId, marketingManagerUser);
  const initiationOnlineFormDocumentsBeforeApproval = checklistBeforeInitiationApproval.stages
    .flatMap((stage) => stage.documents)
    .filter((document) => ['1.1', '1.2', '1.3'].includes(document.documentCode));
  assert.equal(initiationOnlineFormDocumentsBeforeApproval.length, 3);
  for (const onlineFormDocument of initiationOnlineFormDocumentsBeforeApproval) {
    assert.equal(onlineFormDocument.permissions.canSubmitDocument, false);
    assert.equal(onlineFormDocument.permissions.canUploadAttachment, false);
  }
  const noticeBeforeInitiationApproval = checklistBeforeInitiationApproval.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.3');
  assert.equal(noticeBeforeInitiationApproval.permissions.canSubmitDocument, false);
  const workbenchBeforeInitiationApproval = await getMyWorkbench(marketingManagerUser);
  assert.equal(findInitiationNoticeWorkbenchTodo(workbenchBeforeInitiationApproval, projectId), undefined);
  await assertInitiationNoticeSubmitGateRejects({
    projectId,
    user: marketingManagerUser,
    expectedDetails: ['1.2']
  });
  const blockedNotice = await resetInitiationNoticeForSubmit(projectId, marketingManagerUser);
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: blockedNotice.id,
        user: marketingManagerUser,
        formData: noticeFormData
      }),
    (error) => error.code === 'INITIATION_NOTICE_GATE_NOT_READY' && error.details.includes('1.2')
  );

  const atomicFailureProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'atomic-form-submit',
    smokeProjectIds
  });
  const atomicFailureDocument = await selectSmokeDocument(atomicFailureProjectId, '1.2');
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = ?,
       is_applicable = 0,
       status = ?
     WHERE id = ?`,
    [managerUser.id, DOCUMENT_STATUS.NOT_SUBMITTED, atomicFailureDocument.id]
  );
  const atomicFormSubmittedLogBefore = await countOperationLogs({
    projectId: atomicFailureProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: atomicFailureDocument.id
  });
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId: atomicFailureProjectId,
        documentId: atomicFailureDocument.id,
        user: managerUser,
        formData: initiationFormData
      }),
    (error) => error.code === 'STAGE_DOCUMENT_NOT_APPLICABLE'
  );
  const atomicFailureFormRow = await selectOnlineFormRow(atomicFailureDocument.id);
  const atomicFailureDocumentAfter = await selectSmokeDocument(atomicFailureProjectId, '1.2');
  const atomicFailureNodes = await selectInitiationReviewNodes(atomicFailureProjectId);
  assert.equal(atomicFailureFormRow, null);
  assert.equal(atomicFailureDocumentAfter.status, DOCUMENT_STATUS.NOT_SUBMITTED);
  assertInitiationNodeStatus(atomicFailureNodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(atomicFailureNodes, 'technical_review', 'waiting_document_submission');
  assert.equal(await countOperationLogs({
    projectId: atomicFailureProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: atomicFailureDocument.id
  }), atomicFormSubmittedLogBefore);

  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId: initiationDocument.id,
        action: DOCUMENT_STATUS_ACTION.CONFIRM,
        user: marketingManagerUser
      }),
    (error) => error.code === 'INITIATION_REVIEW_REQUIRES_DEDICATED_ENDPOINT'
  );
  await assert.rejects(
    () =>
      updateProjectStageDocumentStatus({
        projectId,
        documentId: initiationDocument.id,
        action: DOCUMENT_STATUS_ACTION.RETURN,
        user: marketingManagerUser,
        returnReason: 'ordinary return should fail'
      }),
    (error) => error.code === 'INITIATION_REVIEW_REQUIRES_DEDICATED_ENDPOINT'
  );
  const requirementAfterOrdinaryReturn = await selectSmokeDocument(projectId, '1.1');
  assert.equal(Boolean(requirementAfterOrdinaryReturn.revision_required), false);

  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'business_review',
        user: departmentUser(9102, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );

  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'business_review',
        user: marketingManagerUser,
        comment: ''
      }),
    (error) => error.code === 'INITIATION_EVALUATION_TEXT_REQUIRED'
  );
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'marketing evaluation'
  });
  const checklistAfterBusiness = await getProjectStageDocumentChecklist(projectId, managerUser);
  const initiationAfterBusiness = checklistAfterBusiness.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.2');
  assert.equal(initiationAfterBusiness.isComplete, false);
  await assert.rejects(
    () => advanceProjectStage(projectId, managerUser),
    (error) =>
      error instanceof ProjectStageAdvanceError &&
      error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE' &&
      error.details.incompleteRequiredDocuments.some((document) => document.documentCode === '1.2')
  );
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-SINGLE-${uniqueSuffix}`,
        user: managerUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await assertNoInitiationWorkbenchTask(generalManagerUser, projectId, 'general_review');
  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'general_review',
        user: generalManagerUser,
        comment: 'too early'
      }),
    (error) =>
      error.code === 'INVALID_INITIATION_REVIEW_NODE_STATUS' ||
      error.code === 'INITIATION_REVIEW_PREREQUISITE_NOT_READY'
  );
  await assertInitiationNoticeSubmitGateRejects({
    projectId,
    user: marketingManagerUser,
    expectedDetails: ['1.2']
  });

  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'technical_review',
    user: managerUser,
    comment: 'rd evaluation'
  });
  await assertHasInitiationWorkbenchTask(generalManagerUser, projectId, 'general_review');
  await assertInitiationNoticeSubmitGateRejects({
    projectId,
    user: marketingManagerUser,
    expectedDetails: ['1.2']
  });
  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId,
        documentId: initiationDocument.id,
        nodeKey: 'general_review',
        user: managerUser,
        comment: 'unauthorized general approval'
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await approveInitiationReviewNode({
    projectId,
    documentId: initiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    comment: 'general approval',
    projectExecutionMode: '自研模式'
  });
  const approvedInitiationDocument = await selectSmokeDocument(projectId, '1.2');
  const initiationGenerated = await assertGeneratedFileDownloadable({
    projectId,
    document: approvedInitiationDocument,
    user: managerUser,
    expectedDocumentCode: '1.2',
    expectedFileType: 'xlsx',
    expectedReviewSnapshot: true
  });
  assert.equal(initiationGenerated.latest.trigger_event, INITIATION_TEMPLATE_TRIGGER_EVENT.INITIATION_REVIEW_GENERAL_APPROVED);
  const initiationProjectDetail = await getProjectDetail(projectId, managerUser);
  const initiationWorkbook = await readGeneratedXlsxCells(initiationGenerated.download.filePath);
  assertGeneratedFileXmlContent(initiationWorkbook.sheetXml, []);
  assertCellContains(initiationWorkbook.cells, 'A2', ['项目名称：', initiationProjectDetail.project.projectName]);
  assertCellNotContains(initiationWorkbook.cells, 'I2', ['项目号', '项目编号']);
  assertCellContains(initiationWorkbook.cells, 'A3', ['客户名称：', initiationProjectDetail.project.customerName]);
  assertCellContains(initiationWorkbook.cells, 'A4', ['客户项目联系人：', initiationProjectDetail.project.customerContactPerson]);
  assertCellContains(initiationWorkbook.cells, 'G4', ['联系电话：', initiationProjectDetail.project.customerContact]);
  assertCellContains(initiationWorkbook.cells, 'J4', ['本公司商务负责人：', marketingManagerUser.name]);
  assertCellContains(initiationWorkbook.cells, 'M4', ['联系方式：', submittedInitiationFormData.projectResponsibleContact]);
  assertCellContains(initiationWorkbook.cells, 'C6', ['客户企业属性']);
  assertCellContains(initiationWorkbook.cells, 'H6', ['0-以上均不是']);
  assertCellContains(initiationWorkbook.cells, 'C12', ['项目需求']);
  assertCellContains(initiationWorkbook.cells, 'H12', ['0-无项目需求']);
  assertCellContains(initiationWorkbook.cells, 'A21', ['备注']);
  for (const [itemKey, row] of [
    ['customerEnterpriseAttribute', 6],
    ['projectSource', 7],
    ['projectPositioning', 8],
    ['businessCompetitionCondition', 9],
    ['projectBudget', 10],
    ['paymentCondition', 11],
    ['projectRequirement', 12],
    ['specialEnvironment', 13],
    ['industryThreshold', 14],
    ['technologyMaturity', 15],
    ['rdMode', 16]
  ]) {
    assertCellContains(initiationWorkbook.cells, `K${row}`, [submittedInitiationFormData[`${itemKey}Score`]]);
    assertCellContains(initiationWorkbook.cells, `L${row}`, [submittedInitiationFormData[`${itemKey}InformationNotes`]]);
    assertCellContains(initiationWorkbook.cells, `O${row}`, [submittedInitiationFormData[`${itemKey}ResponsiblePerson`]]);
  }
  assertCellContains(initiationWorkbook.cells, 'A17', ['营销中心意见：', 'marketing evaluation']);
  assertCellContains(initiationWorkbook.cells, 'I17', ['负责人（签字）：']);
  assertCellNotContains(initiationWorkbook.cells, 'I17', [
    marketingManagerUser.name,
    managerUser.name,
    generalManagerUser.name
  ]);
  assertCellMatches(initiationWorkbook.cells, 'M17', /^日期：\d{4}-\d{2}-\d{2}$/);
  assertCellNotContains(initiationWorkbook.cells, 'M17', ['T', 'Z', '+08', '+00']);
  assertCellContains(initiationWorkbook.cells, 'A18', ['研发中心意见：', 'rd evaluation']);
  assertCellContains(initiationWorkbook.cells, 'I18', ['负责人（签字）：']);
  assertCellNotContains(initiationWorkbook.cells, 'I18', [
    marketingManagerUser.name,
    managerUser.name,
    generalManagerUser.name
  ]);
  assertCellMatches(initiationWorkbook.cells, 'M18', /^日期：\d{4}-\d{2}-\d{2}$/);
  assertCellNotContains(initiationWorkbook.cells, 'M18', ['T', 'Z', '+08', '+00']);
  assertCellContains(initiationWorkbook.cells, 'A19', ['总经理意见：', 'general approval']);
  assertCellContains(initiationWorkbook.cells, 'I19', ['负责人（签字）：']);
  assertCellNotContains(initiationWorkbook.cells, 'I19', [
    marketingManagerUser.name,
    managerUser.name,
    generalManagerUser.name
  ]);
  assertCellMatches(initiationWorkbook.cells, 'M19', /^日期：\d{4}-\d{2}-\d{2}$/);
  assertCellNotContains(initiationWorkbook.cells, 'M19', ['T', 'Z', '+08', '+00']);
  assertExecutionModeRichCheckboxes(initiationWorkbook, '自研模式');
  assertCellNotContains(initiationWorkbook.cells, 'B6', [
    submittedInitiationFormData.customerEnterpriseAttributeScore,
    submittedInitiationFormData.customerEnterpriseAttributeInformationNotes,
    submittedInitiationFormData.customerEnterpriseAttributeResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'B7', [
    submittedInitiationFormData.projectSourceInformationNotes,
    submittedInitiationFormData.projectSourceResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'B13', [
    submittedInitiationFormData.specialEnvironmentScore,
    submittedInitiationFormData.specialEnvironmentInformationNotes,
    submittedInitiationFormData.specialEnvironmentResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'C6', [
    submittedInitiationFormData.customerEnterpriseAttributeInformationNotes,
    submittedInitiationFormData.customerEnterpriseAttributeResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'H6', [
    submittedInitiationFormData.customerEnterpriseAttributeInformationNotes,
    submittedInitiationFormData.customerEnterpriseAttributeResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'C13', [
    submittedInitiationFormData.specialEnvironmentInformationNotes,
    submittedInitiationFormData.specialEnvironmentResponsiblePerson
  ]);
  assertCellNotContains(initiationWorkbook.cells, 'H13', [
    submittedInitiationFormData.specialEnvironmentInformationNotes,
    submittedInitiationFormData.specialEnvironmentResponsiblePerson
  ]);
  const initiationSnapshot = parseSmokeJson(initiationGenerated.latest.source_snapshot_json, {});
  assert.equal(Object.hasOwn(initiationSnapshot.formData || {}, 'projectCode'), false);
  assert.equal(initiationSnapshot.formData?.projectExecutionMode, '自研模式');
  assert.equal(initiationProjectDetail.project.projectCode, null);
  assert.equal(initiationProjectDetail.project.projectMode, 'self_developed');
  const supplyChainProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'supply-chain-mode',
    smokeProjectIds
  });
  const supplyChainInitiationDocument = await prepareInitiationSmokeBase(
    supplyChainProjectId,
    marketingManagerUser,
    managerUser
  );
  await approveInitiationReviewNode({
    projectId: supplyChainProjectId,
    documentId: supplyChainInitiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'supply chain business evaluation'
  });
  await approveInitiationReviewNode({
    projectId: supplyChainProjectId,
    documentId: supplyChainInitiationDocument.id,
    nodeKey: 'technical_review',
    user: managerUser,
    comment: 'supply chain rd evaluation'
  });
  await approveInitiationReviewNode({
    projectId: supplyChainProjectId,
    documentId: supplyChainInitiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    comment: 'supply chain general approval',
    projectExecutionMode: '供应链模式'
  });
  const supplyChainApprovedDocument = await selectSmokeDocument(supplyChainProjectId, '1.2');
  const supplyChainGenerated = await assertGeneratedFileDownloadable({
    projectId: supplyChainProjectId,
    document: supplyChainApprovedDocument,
    user: marketingManagerUser,
    expectedDocumentCode: '1.2',
    expectedFileType: 'xlsx',
    expectedReviewSnapshot: true
  });
  const supplyChainWorkbook = await readGeneratedXlsxCells(supplyChainGenerated.download.filePath);
  assertExecutionModeRichCheckboxes(supplyChainWorkbook, '供应链模式');
  await assertGeneratedFileUnauthorized({
    projectId,
    documentId: approvedInitiationDocument.id,
    user: limitedEmployeeUser
  });
  const checklistAfterAll = await getProjectStageDocumentChecklist(projectId, managerUser);
  const initiationAfterAll = checklistAfterAll.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.2');
  assert.equal(initiationAfterAll.isComplete, true);
  const checklistAfterAllForMarketing = await getProjectStageDocumentChecklist(projectId, marketingManagerUser);
  const noticeAfterInitiationApproval = checklistAfterAllForMarketing.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.3');
  assert.equal(noticeAfterInitiationApproval.permissions.canSubmitDocument, false);
  await pool.execute(
    `UPDATE project_stage_documents
     SET responsible_user_id = NULL,
        status = ?
      WHERE project_id = ?
        AND document_code = '1.3'`,
    [DOCUMENT_STATUS.NOT_SUBMITTED, projectId]
  );
  const workbenchAfterInitiationApproval = await getMyWorkbench(marketingManagerUser);
  const noticeTodoAfterInitiationApproval = findInitiationNoticeWorkbenchTodo(workbenchAfterInitiationApproval, projectId);
  assert.ok(noticeTodoAfterInitiationApproval);
  assert.equal(noticeTodoAfterInitiationApproval.permissions.canSubmitDocument, false);
  assert.equal(noticeTodoAfterInitiationApproval.actionText, '填写项目编号并提交 1.3 项目立项通知');
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-BYPASS-${uniqueSuffix}`,
        user: marketingManagerUser
      }),
    (error) =>
      error instanceof ProjectCodeUpdateError &&
      error.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
  );
  assert.equal((await getProjectDetail(projectId, marketingManagerUser)).project.projectCode, null);
  await pool.execute(
    `UPDATE project_stage_documents
     SET revision_required = 1,
       revision_reason = ?,
       revision_source_document_id = ?,
       revision_requested_by_user_id = ?,
       revision_requested_at = CURRENT_TIMESTAMP,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL,
       revision_completed_by_user_id = NULL,
       revision_completed_at = NULL
      WHERE project_id = ?
        AND document_code = '1.1'`,
    ['project-code gate rework smoke', initiationDocument.id, marketingManagerUser.id, projectId]
  );
  const workbenchWithRequirementRework = await getMyWorkbench(marketingManagerUser);
  assert.equal(findInitiationNoticeWorkbenchTodo(workbenchWithRequirementRework, projectId), undefined);
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-REWORK-GATE-${uniqueSuffix}`,
        user: marketingManagerUser
      }),
    (error) =>
      error instanceof ProjectCodeUpdateError &&
      error.code === 'PROJECT_CODE_GATE_NOT_READY' &&
      Array.isArray(error.details) &&
      error.details.includes('1.1')
  );
  await assertInitiationNoticeSubmitGateRejects({
    projectId,
    user: marketingManagerUser,
    expectedDetails: ['1.1']
  });
  await pool.execute(
    `UPDATE project_stage_documents
     SET revision_required = 0,
       revision_reason = NULL,
       revision_source_document_id = NULL,
       revision_requested_by_user_id = NULL,
       revision_requested_at = NULL,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL,
       revision_completed_by_user_id = NULL,
       revision_completed_at = NULL
      WHERE project_id = ?
         AND document_code = '1.1'`,
    [projectId]
  );
  const gateReadyNotice = await resetInitiationNoticeForSubmit(projectId, marketingManagerUser);
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: gateReadyNotice.id,
        user: managerUser,
        formData: noticeFormData
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await assertOrdinaryOnlineFormDocumentSubmitRejected({
    projectId,
    documentCode: '1.3',
    user: marketingManagerUser
  });
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: gateReadyNotice.id,
        user: marketingManagerUser,
        formData: {
          ...noticeFormData,
          projectCode: ''
        }
      }),
    (error) =>
      error.code === 'PROJECT_CODE_REQUIRED' &&
      Array.isArray(error.details) &&
      error.details.includes('projectCode')
  );
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-ADMIN-${uniqueSuffix}`,
        user: systemAdminUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  const workbenchWithoutProjectCode = await getMyWorkbench(marketingManagerUser);
  const noticeTodoWithoutProjectCode = findInitiationNoticeWorkbenchTodo(workbenchWithoutProjectCode, projectId);
  assert.ok(noticeTodoWithoutProjectCode);
  assert.equal(noticeTodoWithoutProjectCode.actionText, '填写项目编号并提交 1.3 项目立项通知');
  const projectCodeDetail = await getProjectDetail(projectId, marketingManagerUser);
  assert.equal(projectCodeDetail.project.projectCode, null);
  const workbenchWithProjectCode = await getMyWorkbench(marketingManagerUser);
  const noticeTodoWithProjectCode = findInitiationNoticeWorkbenchTodo(workbenchWithProjectCode, projectId);
  assert.ok(noticeTodoWithProjectCode);
  assert.equal(noticeTodoWithProjectCode.actionText, '填写项目编号并提交 1.3 项目立项通知');
  const gateReadyNoticeWithProjectCode = await getStageDocumentOnlineForm({
    projectId,
    documentId: gateReadyNotice.id,
    user: marketingManagerUser
  });
  assert.equal(gateReadyNoticeWithProjectCode.permissions.canSubmit, true);
  assert.equal(gateReadyNoticeWithProjectCode.formData.projectCode, '');
  assert.equal(gateReadyNoticeWithProjectCode.formData.projectName, projectCodeDetail.project.projectName);
  assert.equal(gateReadyNoticeWithProjectCode.formData.customerUnit, projectCodeDetail.project.customerName);
  await assertGeneratedFileDownloadErrorHandled({
    projectId,
    documentId: gateReadyNotice.id,
    user: marketingManagerUser,
    expectedCode: STAGE_DOCUMENT_GENERATED_FILE_ERROR.FILE_NOT_FOUND,
    expectedStatusCode: 404
  });
  const submittedNotice = await submitInitiationNoticeAfterGateReady(projectId, marketingManagerUser, noticeFormData);
  const projectDetailAfterNotice = await getProjectDetail(projectId, marketingManagerUser);
  assert.equal(projectDetailAfterNotice.project.projectCode, noticeFormData.projectCode);
  const noticeGenerated = await assertGeneratedFileDownloadable({
    projectId,
    document: submittedNotice,
    user: marketingManagerUser,
    expectedDocumentCode: '1.3',
    expectedFileType: 'docx'
  });
  assert.equal(noticeGenerated.latest.trigger_event, INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED);
  const noticeSnapshot = parseSmokeJson(noticeGenerated.latest.source_snapshot_json, {});
  assert.equal(noticeSnapshot.project?.projectCode, noticeFormData.projectCode);
  assert.ok(noticeSnapshot.noticeProjectList?.cutoff);
  assert.ok(
    (noticeSnapshot.noticeProjectList?.rows || []).some((row) => row.projectId === projectId && row.projectCode === noticeFormData.projectCode)
  );
  const noticeDocumentXml = await readGeneratedFileXml(noticeGenerated.download.filePath, 'word/document.xml');
  assertGeneratedFileXmlContent(noticeDocumentXml, [
    noticeFormData.projectCode,
    projectDetailAfterNotice.project.projectName,
    projectDetailAfterNotice.project.customerName,
    noticeFormData.initiationDate,
    '2026年7月8日'
  ]);
  assert.equal(noticeDocumentXml.includes('2026年2月9日'), false);
  assert.equal(noticeDocumentXml.includes('2026-07-08'), false);
  assert.equal(noticeDocumentXml.includes('KRF26001'), false);
  assert.equal(noticeDocumentXml.includes('KRF26002'), false);
  assert.equal(noticeDocumentXml.includes('KRF26003'), false);

  const futureProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'future-notice',
    smokeProjectIds
  });
  const futureNotice = await prepareInitiationNoticeReadyProject(futureProjectId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  const futureNoticeFormData = buildSmokeNoticeFormData({
    projectCode: `SMOKE-FUTURE-${uniqueSuffix}`,
    initiationDate: '2026-07-09',
    noticeDate: '2026-07-10'
  });
  await submitStageDocumentOnlineForm({
    projectId: futureProjectId,
    documentId: futureNotice.id,
    user: marketingManagerUser,
    formData: futureNoticeFormData
  });
  const submittedNoticeFormRowForCutoff = await selectOnlineFormRow(submittedNotice.id);
  await pool.execute(
    `UPDATE project_stage_document_forms
     SET submitted_at = DATE_ADD(?, INTERVAL 1 DAY)
     WHERE stage_document_id = ?`,
    [submittedNoticeFormRowForCutoff.submitted_at, futureNotice.id]
  );
  await pool.execute(
    `UPDATE project_stage_documents
     SET submitted_at = DATE_ADD(?, INTERVAL 1 DAY)
     WHERE id = ?`,
    [submittedNoticeFormRowForCutoff.submitted_at, futureNotice.id]
  );
  const retriedNoticeGeneration = await generateInitiationTemplateFile({
    projectId,
    documentId: submittedNotice.id,
    documentCode: '1.3',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
    user: marketingManagerUser
  });
  assert.equal(retriedNoticeGeneration.status, GENERATED_FILE_STATUS.GENERATED);
  const retriedNoticeDownload = await getStageDocumentGeneratedFileDownload({
    projectId,
    documentId: submittedNotice.id,
    user: marketingManagerUser
  });
  const retriedNoticeXml = await readGeneratedFileXml(retriedNoticeDownload.filePath, 'word/document.xml');
  assert.ok(retriedNoticeXml.includes(noticeFormData.projectCode));
  assert.equal(retriedNoticeXml.includes(futureNoticeFormData.projectCode), false);
  const retriedNoticeSnapshot = retriedNoticeGeneration.sourceSnapshot || {};
  assert.ok(retriedNoticeSnapshot.noticeProjectList?.cutoff);
  assert.equal(
    (retriedNoticeSnapshot.noticeProjectList?.rows || []).some((row) => row.projectCode === futureNoticeFormData.projectCode),
    false
  );

  const duplicateCode = `SMOKE-DUP-NOTICE-${uniqueSuffix}`;
  const duplicateProjectAId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'duplicate-a',
    smokeProjectIds
  });
  const duplicateProjectBId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'duplicate-b',
    smokeProjectIds
  });
  const duplicateNoticeA = await prepareInitiationNoticeReadyProject(duplicateProjectAId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  const duplicateNoticeB = await prepareInitiationNoticeReadyProject(duplicateProjectBId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  const duplicateResults = await Promise.allSettled([
    submitStageDocumentOnlineForm({
      projectId: duplicateProjectAId,
      documentId: duplicateNoticeA.id,
      user: marketingManagerUser,
      formData: buildSmokeNoticeFormData({ projectCode: duplicateCode })
    }),
    submitStageDocumentOnlineForm({
      projectId: duplicateProjectBId,
      documentId: duplicateNoticeB.id,
      user: marketingManagerUser,
      formData: buildSmokeNoticeFormData({ projectCode: duplicateCode })
    })
  ]);
  assert.equal(duplicateResults.filter((result) => result.status === 'fulfilled').length, 1);
  const duplicateRejected = duplicateResults.find((result) => result.status === 'rejected');
  assert.ok(duplicateRejected?.reason instanceof DuplicateProjectCodeError);
  const [duplicateProjectCodeRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM projects WHERE project_code = ?',
    [duplicateCode]
  );
  assert.equal(Number(duplicateProjectCodeRows[0]?.count || 0), 1);
  const independentMixedCode = `SMOKE-INIT-MIXED-${uniqueSuffix}`;
  const independentMixedProjectAId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'independent-mixed-a',
    smokeProjectIds
  });
  const independentMixedProjectBId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'independent-mixed-b',
    smokeProjectIds
  });
  const independentMixedNoticeA = await prepareInitiationNoticeReadyProject(independentMixedProjectAId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  await prepareInitiationNoticeReadyProject(independentMixedProjectBId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  const independentMixedResults = await Promise.allSettled([
    submitStageDocumentOnlineForm({
      projectId: independentMixedProjectAId,
      documentId: independentMixedNoticeA.id,
      user: marketingManagerUser,
      formData: buildSmokeNoticeFormData({ projectCode: independentMixedCode })
    }),
    updateProjectCode({
      projectId: independentMixedProjectBId,
      projectCode: independentMixedCode,
      user: marketingManagerUser
    })
  ]);
  assert.equal(independentMixedResults.filter((result) => result.status === 'fulfilled').length, 1);
  const independentMixedRejected = independentMixedResults.find((result) => result.status === 'rejected');
  assert.ok(independentMixedRejected?.reason instanceof ProjectCodeUpdateError);
  assert.equal(independentMixedRejected.reason.code, 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM');
  const [independentMixedCodeRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM projects WHERE project_code = ?',
    [independentMixedCode]
  );
  assert.equal(Number(independentMixedCodeRows[0]?.count || 0), 1);
  const independentOnlyCode = `SMOKE-INIT-UPDATE-ONLY-${uniqueSuffix}`;
  const independentOnlyProjectAId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'independent-only-a',
    smokeProjectIds
  });
  const independentOnlyProjectBId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'independent-only-b',
    smokeProjectIds
  });
  await prepareInitiationNoticeReadyProject(independentOnlyProjectAId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  await prepareInitiationNoticeReadyProject(independentOnlyProjectBId, {
    businessUser: marketingManagerUser,
    technicalUser: managerUser,
    generalManagerUser
  });
  const independentOnlyResults = await Promise.allSettled([
    updateProjectCode({
      projectId: independentOnlyProjectAId,
      projectCode: independentOnlyCode,
      user: marketingManagerUser
    }),
    updateProjectCode({
      projectId: independentOnlyProjectBId,
      projectCode: independentOnlyCode,
      user: marketingManagerUser
    })
  ]);
  assert.equal(independentOnlyResults.filter((result) => result.status === 'fulfilled').length, 0);
  assert.ok(
    independentOnlyResults.every(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof ProjectCodeUpdateError &&
        result.reason.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
    )
  );
  const [independentOnlyCodeRows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM projects WHERE project_code = ?',
    [independentOnlyCode]
  );
  assert.equal(Number(independentOnlyCodeRows[0]?.count || 0), 0);
  await assertGeneratedFileUnauthorized({
    projectId,
    documentId: submittedNotice.id,
    user: limitedEmployeeUser
  });
  assert.equal((await countSmokeProjectObjects(projectId)).documents, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
  const workbenchAfterNoticeSubmitted = await getMyWorkbench(marketingManagerUser);
  assert.equal(findInitiationNoticeWorkbenchTodo(workbenchAfterNoticeSubmitted, projectId), undefined);
  const submittedNoticeGet = await getStageDocumentOnlineForm({
    projectId,
    documentId: submittedNotice.id,
    user: marketingManagerUser
  });
  assert.equal(submittedNoticeGet.permissions.canEdit, false);
  assert.equal(submittedNoticeGet.permissions.canSubmit, false);
  assert.ok(submittedNoticeGet.blockingReasons.some((reason) => String(reason).includes('submitted')));
  const submittedNoticeFormRow = await selectOnlineFormRow(submittedNotice.id);
  const submittedNoticeFormData = parseFormDataJson(submittedNoticeFormRow);
  const noticeFormUpdatedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: submittedNotice.id
  });
  const noticeFormSubmittedLogCount = await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: submittedNotice.id
  });
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId,
        documentId: submittedNotice.id,
        user: marketingManagerUser,
        formData: {
          ...noticeFormData,
          noticeDate: '2026-07-02'
        }
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: submittedNotice.id,
        user: marketingManagerUser,
        formData: {
          ...noticeFormData,
          noticeDate: '2026-07-03'
        }
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  const noticeFormAfterRejectedMutation = await selectOnlineFormRow(submittedNotice.id);
  const noticeDocumentAfterRejectedMutation = await selectSmokeDocument(projectId, '1.3');
  assert.equal(noticeFormAfterRejectedMutation.status, 'submitted');
  assert.deepEqual(parseFormDataJson(noticeFormAfterRejectedMutation), submittedNoticeFormData);
  assert.equal(noticeDocumentAfterRejectedMutation.status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: submittedNotice.id
  }), noticeFormUpdatedLogCount);
  assert.equal(await countOperationLogs({
    projectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: submittedNotice.id
  }), noticeFormSubmittedLogCount);
  const detailAfterInitiationAutoAdvance = await getProjectDetail(projectId, managerUser);
  assert.equal(detailAfterInitiationAutoAdvance.currentStage.stageOrder, 2);
  assert.equal(detailAfterInitiationAutoAdvance.currentStage.stageKey, 'solution');

  const returnProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'return',
    smokeProjectIds
  });
  const returnInitiationDocument = await prepareInitiationSmokeBase(returnProjectId, marketingManagerUser, managerUser);
  await approveInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'marketing evaluation before return'
  });
  await approveInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'technical_review',
    user: managerUser,
    comment: 'rd evaluation before return'
  });
  await assertHasInitiationWorkbenchTask(generalManagerUser, returnProjectId, 'general_review');
  await assert.rejects(
    () =>
      returnInitiationReviewNode({
        projectId: returnProjectId,
        documentId: returnInitiationDocument.id,
        nodeKey: 'general_review',
        user: generalManagerUser,
        returnReason: ''
      }),
    (error) => error.code === 'RETURN_REASON_REQUIRED'
  );
  await assert.rejects(
    () =>
      returnInitiationReviewNode({
        projectId: returnProjectId,
        documentId: returnInitiationDocument.id,
        nodeKey: 'general_review',
        user: departmentUser(9103, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER),
        returnReason: 'unauthorized return should fail'
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  const returnedNodeDocument = await returnInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    returnReason: 'general return to 1.1 and 1.2 refill'
  });
  assert.equal(returnedNodeDocument.initiationReview.blockedByRework, true);
  assert.ok(
    returnedNodeDocument.initiationReview.blockingReasons.some((reason) =>
      String(reason).includes('1.1 项目需求表返工未清除')
    )
  );
  const returnedRequirement = await selectSmokeDocument(returnProjectId, '1.1');
  const returnedInitiation = await selectSmokeDocument(returnProjectId, '1.2');
  nodes = await selectInitiationReviewNodes(returnProjectId);
  assert.equal(Boolean(returnedRequirement.revision_required), true);
  assert.equal(String(returnedRequirement.revision_source_document_id), String(returnInitiationDocument.id));
  assert.equal(Boolean(returnedInitiation.revision_required), false);
  assert.equal(returnedInitiation.status, DOCUMENT_STATUS.RETURNED);
  assert.equal(String(returnedInitiation.responsible_user_id), String(marketingManagerUser.id));
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'general_review', 'returned_blocked_by_rework');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, returnProjectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, returnProjectId, 'technical_review');
  await assertNoInitiationWorkbenchTask(generalManagerUser, returnProjectId, 'general_review');
  const blockedInitiationForm = await getStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    user: managerUser
  });
  assert.equal(blockedInitiationForm.permissions.canEdit, false);
  assert.equal(blockedInitiationForm.permissions.canSubmit, false);
  assert.ok(
    blockedInitiationForm.blockingReasons.some((reason) =>
      String(reason).includes('1.1 项目需求表返工')
    )
  );
  const blockedInitiationFormRowBefore = await selectOnlineFormRow(returnInitiationDocument.id);
  const blockedInitiationFormDataBefore = parseFormDataJson(blockedInitiationFormRowBefore);
  const blockedInitiationDocumentBefore = await selectSmokeDocument(returnProjectId, '1.2');
  const blockedInitiationNodesBefore = await selectInitiationReviewNodes(returnProjectId);
  const blockedInitiationFormUpdatedLogsBefore = await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: returnInitiationDocument.id
  });
  const blockedInitiationFormSubmittedLogsBefore = await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: returnInitiationDocument.id
  });
  const blockedInitiationDocumentSubmittedLogsBefore = await countDocumentSubmittedLogs(
    returnProjectId,
    returnInitiationDocument.id
  );
  const blockedInitiationReviewSubmittedLogsBefore = await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: returnInitiationDocument.id
  });
  await assert.rejects(
    () =>
      saveStageDocumentOnlineForm({
        projectId: returnProjectId,
        documentId: returnInitiationDocument.id,
        user: managerUser,
        formData: {
          ...initiationFormData,
          customerEnterpriseAttributeInformationNotes: 'blocked refill before 1.1 rework clear'
        }
      }),
    (error) =>
      error.code === 'INITIATION_REWORK_NOT_CLEARED' &&
      error.statusCode === 409 &&
      error.details?.requirementDocumentCode === '1.1' &&
      error.details?.initiationDocumentCode === '1.2'
  );
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId: returnProjectId,
        documentId: returnInitiationDocument.id,
        user: managerUser,
        formData: {
          ...initiationFormData,
          customerEnterpriseAttributeInformationNotes: 'blocked submit before 1.1 rework clear'
        }
      }),
    (error) =>
      error.code === 'INITIATION_REWORK_NOT_CLEARED' &&
      error.statusCode === 409 &&
      error.details?.requirementDocumentCode === '1.1' &&
      error.details?.initiationDocumentCode === '1.2'
  );
  const blockedInitiationFormRowAfter = await selectOnlineFormRow(returnInitiationDocument.id);
  assert.equal(blockedInitiationFormRowAfter.status, blockedInitiationFormRowBefore.status);
  assert.deepEqual(parseFormDataJson(blockedInitiationFormRowAfter), blockedInitiationFormDataBefore);
  assert.equal((await selectSmokeDocument(returnProjectId, '1.2')).status, blockedInitiationDocumentBefore.status);
  assert.deepEqual(
    (await selectInitiationReviewNodes(returnProjectId)).map((node) => [node.node_key, node.node_status]),
    blockedInitiationNodesBefore.map((node) => [node.node_key, node.node_status])
  );
  assert.equal(await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: returnInitiationDocument.id
  }), blockedInitiationFormUpdatedLogsBefore);
  assert.equal(await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: returnInitiationDocument.id
  }), blockedInitiationFormSubmittedLogsBefore);
  assert.equal(
    await countDocumentSubmittedLogs(returnProjectId, returnInitiationDocument.id),
    blockedInitiationDocumentSubmittedLogsBefore
  );
  assert.equal(await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: returnInitiationDocument.id
  }), blockedInitiationReviewSubmittedLogsBefore);
  await assert.rejects(
    () =>
      approveInitiationReviewNode({
        projectId: returnProjectId,
        documentId: returnInitiationDocument.id,
        nodeKey: 'business_review',
        user: marketingManagerUser
      }),
    (error) =>
      error.code === 'INITIATION_REWORK_NOT_CLEARED' ||
      error.code === 'INVALID_INITIATION_REVIEW_NODE_STATUS' ||
      error.code === 'INITIATION_REVIEW_DOCUMENT_NOT_SUBMITTED'
  );
  await assert.rejects(
    () => advanceProjectStage(returnProjectId, managerUser),
    (error) =>
      error instanceof ProjectStageAdvanceError &&
      error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE' &&
      error.details.incompleteRequiredDocuments.some((document) => document.documentCode === '1.1')
  );
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId: returnProjectId,
        projectCode: `SMOKE-INIT-REWORK-${uniqueSuffix}`,
        user: marketingManagerUser
      }),
    (error) => error instanceof ProjectCodeUpdateError && error.code === 'PROJECT_CODE_GATE_NOT_READY'
  );
  await pool.execute(
    'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
      [managerUser.id, returnedRequirement.id]
  );
  const reworkWorkbench = await getMyWorkbench(managerUser);
  const requirementReworkTodo = reworkWorkbench.items.find(
    (item) =>
      item.type === 'document_responsibility' &&
      item.projectId === returnProjectId &&
      item.documentCode === '1.1'
  );
  assert.ok(requirementReworkTodo);
  assert.equal(requirementReworkTodo.permissions.canSubmitDocument, false);
  assert.match(requirementReworkTodo.actionText, /在线表单/);
  assert.equal(/提交资料|完成返工|返工重提/.test(requirementReworkTodo.actionText), false);
  assert.equal(findInitiationCollaborationWorkbenchTodo(reworkWorkbench, returnProjectId, 'technical'), undefined);
  const businessReworkWorkbench = await getMyWorkbench(marketingManagerUser);
  assert.equal(findInitiationCollaborationWorkbenchTodo(businessReworkWorkbench, returnProjectId, 'business'), undefined);
  const revisionCompletedLogCountBefore = await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_COMPLETED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: returnedRequirement.id
  });
  const nodesBeforeRejectedRevisionComplete = await selectInitiationReviewNodes(returnProjectId);
  await assert.rejects(
    () =>
      completeProjectStageDocumentRevision({
        projectId: returnProjectId,
        documentId: returnedRequirement.id,
        user: managerUser
      }),
    (error) =>
      error.code === 'ONLINE_FORM_REVISION_COMPLETION_REQUIRED' &&
      error.statusCode === 409 &&
      error.details?.documentId === returnedRequirement.id &&
      error.details?.documentCode === '1.1'
  );
  assert.equal((await selectSmokeDocument(returnProjectId, '1.1')).revision_required, 1);
  assert.equal(
    await countOperationLogs({
      projectId: returnProjectId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_COMPLETED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: returnedRequirement.id
    }),
    revisionCompletedLogCountBefore
  );
  assert.deepEqual(
    (await selectInitiationReviewNodes(returnProjectId)).map((node) => [node.node_key, node.node_status]),
    nodesBeforeRejectedRevisionComplete.map((node) => [node.node_key, node.node_status])
  );
  const requirementReworkFormSubmittedLogCountBefore = await countOperationLogs({
    projectId: returnProjectId,
    actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
    targetId: returnedRequirement.id
  });
  await submitStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnedRequirement.id,
    user: managerUser,
    formData: {
      ...requirementFormData,
      operationProcessDescription: 'smoke requirement rework via online form'
    }
  });
  const requirementAfterOnlineRework = await selectSmokeDocument(returnProjectId, '1.1');
  assert.equal(Boolean(requirementAfterOnlineRework.revision_required), false);
  assert.equal(String(requirementAfterOnlineRework.revision_completed_by_user_id), String(managerUser.id));
  assert.ok(requirementAfterOnlineRework.revision_completed_at);
  assert.equal(
    await countOperationLogs({
      projectId: returnProjectId,
      actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
      targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
      targetId: returnedRequirement.id
    }),
    requirementReworkFormSubmittedLogCountBefore + 1
  );
  assert.equal(
    await countOperationLogs({
      projectId: returnProjectId,
      actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_COMPLETED,
      targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
      targetId: returnedRequirement.id
    }),
    revisionCompletedLogCountBefore + 1
  );
  nodes = await selectInitiationReviewNodes(returnProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'general_review', 'returned_blocked_by_rework');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, returnProjectId, 'business_review');
  const businessRefillWorkbench = await getMyWorkbench(marketingManagerUser);
  assert.ok(findInitiationCollaborationWorkbenchTodo(businessRefillWorkbench, returnProjectId, 'business'));
  const technicalRefillWorkbench = await getMyWorkbench(managerUser);
  assert.ok(findInitiationCollaborationWorkbenchTodo(technicalRefillWorkbench, returnProjectId, 'technical'));
  const checklistAfterReworkClear = await getProjectStageDocumentChecklist(returnProjectId, managerUser);
  const initiationAfterReworkClear = checklistAfterReworkClear.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.2');
  assert.equal(initiationAfterReworkClear.isComplete, false);
  assert.equal(initiationAfterReworkClear.status, DOCUMENT_STATUS.RETURNED);
  const refillReadyForm = await getStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    user: managerUser
  });
  assert.equal(refillReadyForm.permissions.canEdit, true);
  assert.equal(refillReadyForm.permissions.canSubmit, true);
  const refillBusinessResult = await submitStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    user: marketingManagerUser,
    formData: buildSmokeInitiationBusinessFormData({
      projectCode: `SMOKE-INIT-REFILL-${returnProjectId}`,
      customerEnterpriseAttributeInformationNotes: 'smoke project overview after general return'
    })
  });
  assert.equal(refillBusinessResult.form.status, 'draft');
  nodes = await selectInitiationReviewNodes(returnProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, returnProjectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, returnProjectId, 'technical_review');
  await submitStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    user: managerUser,
    formData: buildSmokeInitiationTechnicalFormData()
  });
  nodes = await selectInitiationReviewNodes(returnProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'pending');
  assertInitiationNodeStatus(nodes, 'technical_review', 'pending');
  assertInitiationNodeStatus(nodes, 'general_review', 'waiting_prerequisite');
  await assertHasInitiationWorkbenchTask(marketingManagerUser, returnProjectId, 'business_review');
  await assertHasInitiationWorkbenchTask(managerUser, returnProjectId, 'technical_review');
  await approveInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'business_review',
    user: marketingManagerUser,
    comment: 'marketing evaluation rerun'
  });
  await approveInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'technical_review',
    user: managerUser,
    comment: 'rd evaluation rerun'
  });
  await assertHasInitiationWorkbenchTask(generalManagerUser, returnProjectId, 'general_review');
  await approveInitiationReviewNode({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    nodeKey: 'general_review',
    user: generalManagerUser,
    comment: 'general approval after refill',
    projectExecutionMode: '自研模式'
  });
  nodes = await selectInitiationReviewNodes(returnProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'approved');
  assertInitiationNodeStatus(nodes, 'technical_review', 'approved');
  assertInitiationNodeStatus(nodes, 'general_review', 'approved');
  const checklistAfterReturnRerun = await getProjectStageDocumentChecklist(returnProjectId, managerUser);
  const initiationAfterReturnRerun = checklistAfterReturnRerun.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.2');
  assert.equal(initiationAfterReturnRerun.isComplete, true);

  const notSubmittedProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'not-submitted',
    smokeProjectIds
  });
  nodes = await selectInitiationReviewNodes(notSubmittedProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, notSubmittedProjectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, notSubmittedProjectId, 'technical_review');
  await assertInitiationNoticeSubmitGateRejects({
    projectId: notSubmittedProjectId,
    user: marketingManagerUser,
    expectedDetails: ['1.2']
  });

  const legacyProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'legacy-confirmed',
    smokeProjectIds
  });
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = ?
     WHERE project_id = ?
       AND document_code = '1.2'`,
    [DOCUMENT_STATUS.CONFIRMED, legacyProjectId]
  );
  await pool.execute(
    'DELETE FROM project_initiation_review_nodes WHERE project_id = ?',
    [legacyProjectId]
  );
  nodes = await selectInitiationReviewNodes(legacyProjectId);
  assert.equal(nodes.length, 0);
  const legacyMarketingWorkbench = await getMyWorkbench(marketingManagerUser);
  assert.ok(
    legacyMarketingWorkbench.items.some(
      (item) =>
        item.type === 'initiation_review' &&
        item.projectId === legacyProjectId &&
        item.nodeKey === 'business_review'
    )
  );
  assert.equal(
    legacyMarketingWorkbench.items.some((item) => item.type === 'stage_gate_approval'),
    false
  );
  await assertHasInitiationWorkbenchTask(managerUser, legacyProjectId, 'technical_review');
  nodes = await selectInitiationReviewNodes(legacyProjectId);
  assert.equal(nodes.length, 3);
  assertInitiationNodeStatus(nodes, 'business_review', 'pending');
  assertInitiationNodeStatus(nodes, 'technical_review', 'pending');
  await pool.execute(
    `UPDATE project_initiation_review_nodes
     SET node_status = ?,
       comment = NULL,
       reviewed_by_user_id = ?
     WHERE project_id = ?`,
    ['approved', generalManagerUser.id, legacyProjectId]
  );
  const legacyChecklist = await getProjectStageDocumentChecklist(legacyProjectId, managerUser);
  const legacyInitiation = legacyChecklist.stages
    .flatMap((stage) => stage.documents)
    .find((document) => document.documentCode === '1.2');
  assert.equal(legacyInitiation.isComplete, false);
  await assert.rejects(
    () => advanceProjectStage(legacyProjectId, managerUser),
    (error) =>
      error instanceof ProjectStageAdvanceError &&
      error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE' &&
      error.details.incompleteRequiredDocuments.some((document) => document.documentCode === '1.2')
  );
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId: legacyProjectId,
        projectCode: `SMOKE-INIT-LEGACY-${uniqueSuffix}`,
        user: managerUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );

  const returnedBaseProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'returned-base',
    smokeProjectIds
  });
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = ?,
       revision_required = 0,
       revision_source_document_id = NULL,
       revision_resubmitted_by_user_id = NULL,
       revision_resubmitted_at = NULL,
       is_applicable = 1
     WHERE project_id = ?
       AND document_code = '1.1'`,
    [DOCUMENT_STATUS.SUBMITTED, returnedBaseProjectId]
  );
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = ?,
       responsible_user_id = ?
     WHERE project_id = ?
       AND document_code = '1.2'`,
    [DOCUMENT_STATUS.RETURNED, managerUser.id, returnedBaseProjectId]
  );
  await pool.execute(
    'DELETE FROM project_initiation_review_nodes WHERE project_id = ?',
    [returnedBaseProjectId]
  );
  await initializeInitiationReviewNodesForExistingProjects(pool);
  nodes = await selectInitiationReviewNodes(returnedBaseProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, returnedBaseProjectId, 'business_review');
  const returnedBaseInitiation = await selectSmokeDocument(returnedBaseProjectId, '1.2');
  const returnedBaseBusinessResult = await submitStageDocumentOnlineForm({
    projectId: returnedBaseProjectId,
    documentId: returnedBaseInitiation.id,
    user: marketingManagerUser,
    formData: buildSmokeInitiationBusinessFormData({
      projectCode: `SMOKE-INIT-RETURNED-BASE-${returnedBaseProjectId}`
    })
  });
  assert.equal(returnedBaseBusinessResult.form.status, 'draft');
  nodes = await selectInitiationReviewNodes(returnedBaseProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'waiting_document_submission');
  assertInitiationNodeStatus(nodes, 'technical_review', 'waiting_document_submission');
  await assertNoInitiationWorkbenchTask(marketingManagerUser, returnedBaseProjectId, 'business_review');
  await assertNoInitiationWorkbenchTask(managerUser, returnedBaseProjectId, 'technical_review');
  await submitStageDocumentOnlineForm({
    projectId: returnedBaseProjectId,
    documentId: returnedBaseInitiation.id,
    user: managerUser,
    formData: buildSmokeInitiationTechnicalFormData()
  });
  nodes = await selectInitiationReviewNodes(returnedBaseProjectId);
  assertInitiationNodeStatus(nodes, 'business_review', 'pending');
  assertInitiationNodeStatus(nodes, 'technical_review', 'pending');
  await assertHasInitiationWorkbenchTask(marketingManagerUser, returnedBaseProjectId, 'business_review');
  await assertHasInitiationWorkbenchTask(managerUser, returnedBaseProjectId, 'technical_review');
  assert.equal(nodes.some((node) => node.node_status === 'submitted'), false);

  await runEvaluationReturnToMarketResearchSmoke({
    uniqueSuffix,
    smokeProjectIds,
    managerUser,
    marketingManagerUser,
    generalManagerUser,
    nodeKey: 'business_review',
    reviewerUser: marketingManagerUser,
    expectedActionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_BUSINESS_RETURNED,
    label: 'business-return'
  });
  await runEvaluationReturnToMarketResearchSmoke({
    uniqueSuffix,
    smokeProjectIds,
    managerUser,
    marketingManagerUser,
    generalManagerUser,
    nodeKey: 'technical_review',
    reviewerUser: managerUser,
    expectedActionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_TECHNICAL_RETURNED,
    label: 'technical-return'
  });
  await runProjectEndSmoke({
    uniqueSuffix,
    smokeProjectIds,
    managerUser,
    marketingManagerUser,
    generalManagerUser
  });

  const countedActionTypes = [
    'initiation_review.submitted',
    'initiation_review.business_approved',
    'initiation_review.technical_approved',
    'initiation_review.general_approved',
    'initiation_review.general_returned',
    'initiation_review.completed',
    'form.updated',
    'form.submitted',
    'document.revision_requested'
  ];
  const [logRows] = await pool.execute(
    `SELECT action_type AS actionType, COUNT(*) AS count
     FROM business_operation_logs
     WHERE project_id IN (?, ?)
       AND action_type IN (${countedActionTypes.map(() => '?').join(', ')})
     GROUP BY action_type`,
    [projectId, returnProjectId, ...countedActionTypes]
  );
  const logCounts = Object.fromEntries(logRows.map((row) => [row.actionType, Number(row.count)]));
  assert.ok(logCounts['initiation_review.submitted'] >= 2);
  assert.ok(logCounts['initiation_review.business_approved'] >= 2);
  assert.ok(logCounts['initiation_review.technical_approved'] >= 2);
  assert.ok(logCounts['initiation_review.general_approved'] >= 2);
  assert.ok(logCounts['initiation_review.general_returned'] >= 1);
  assert.ok(logCounts['initiation_review.completed'] >= 2);
  assert.ok(logCounts['form.updated'] >= 1);
  assert.ok(logCounts['form.submitted'] >= 4);
  assert.ok(logCounts['document.revision_requested'] >= 1);
}

async function runProjectLifecycleSmoke() {
  const managerUser = await selectSmokeUser('rd_manager');
  const smokeProjectIds = [];
  const smokeStorageKeys = [];
  const smokeUserIds = [];
  const uniqueSuffix = `${Date.now()}-${process.pid}`;
  const duplicateProjectCode = `SMOKE-${uniqueSuffix}`;

  try {
    const creatorUser = await insertSmokeUser({
      account: `smoke_creator_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 创建人',
      department: MARKETING_CENTER,
      organizationRole: ORGANIZATION_ROLE.EMPLOYEE,
      role: 'Smoke 员工'
    });
    smokeUserIds.push(creatorUser.id);
    const limitedEmployeeUser = await insertSmokeUser({
      account: `smoke_limited_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 受限员工',
      department: OPERATIONS_CENTER,
      organizationRole: ORGANIZATION_ROLE.EMPLOYEE,
      role: 'Smoke 员工'
    });
    smokeUserIds.push(limitedEmployeeUser.id);
    const rdEmployeeUser = await insertSmokeUser({
      account: `smoke_rd_employee_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 研发员工',
      department: RD_CENTER,
      organizationRole: ORGANIZATION_ROLE.EMPLOYEE,
      role: 'Smoke 研发员工'
    });
    smokeUserIds.push(rdEmployeeUser.id);
    const marketingManagerUser = await insertSmokeUser({
      account: `smoke_marketing_manager_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 营销中心负责人',
      department: MARKETING_CENTER,
      organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER,
      role: 'Smoke 中心负责人'
    });
    smokeUserIds.push(marketingManagerUser.id);
    const generalManagerUser = await insertSmokeUser({
      account: `smoke_general_manager_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 总经理',
      department: null,
      organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER,
      role: 'Smoke 总经理'
    });
    smokeUserIds.push(generalManagerUser.id);
    const smokeSystemAdminUser = await insertSmokeUser({
      account: `smoke_system_admin_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 系统管理员',
      department: null,
      organizationRole: ORGANIZATION_ROLE.SYSTEM_ADMIN,
      role: 'Smoke 系统管理员',
      isPlatformAdmin: true
    });
    smokeUserIds.push(smokeSystemAdminUser.id);
    const generalManagerAssistantUser = await insertSmokeUser({
      account: `smoke_general_manager_assistant_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: 'Smoke 总经理助理',
      department: null,
      organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT,
      role: 'Smoke 总经理助理'
    });
    smokeUserIds.push(generalManagerAssistantUser.id);

    assert.throws(
      () =>
        normalizeCreateProjectInput({
          projectName: `缺少负责人 smoke ${uniqueSuffix}`,
          customerName: 'Smoke 客户',
          customerContactPerson: 'Smoke 联系人',
          customerContact: '13800000001'
        }),
      (error) =>
        error.code === 'VALIDATION_ERROR' &&
        error.details.includes('businessResponsibleUserId') &&
        error.details.includes('technicalResponsibleUserId')
    );
    assert.throws(
      () =>
        normalizeCreateProjectInput({
          projectName: `禁止直接创建结束项目 smoke ${uniqueSuffix}`,
          customerName: 'Smoke 客户',
          customerContactPerson: 'Smoke 联系人',
          customerContact: '13800000002',
          businessResponsibleUserId: marketingManagerUser.id,
          technicalResponsibleUserId: managerUser.id,
          status: 'ended'
        }),
      (error) => error.code === 'INVALID_PROJECT_STATUS' && error.details.includes('status')
    );
    await assert.rejects(
      () =>
        createProject(
          normalizeCreateProjectInput({
            projectName: `商务负责人部门错误 smoke ${uniqueSuffix}`,
            customerName: 'Smoke 客户',
            customerContactPerson: 'Smoke 联系人',
            customerContact: '13800000002',
            businessResponsibleUserId: managerUser.id,
            technicalResponsibleUserId: managerUser.id
          }),
          marketingManagerUser.id
        ),
      (error) => {
        const response = captureErrorHandlerResponse(error);
        return (
          error instanceof ProjectResponsibleUserError &&
          error.code === 'PROJECT_RESPONSIBLE_USER_DEPARTMENT_NOT_ALLOWED' &&
          error.statusCode === 409 &&
          Array.isArray(error.details) &&
          error.details.includes('businessResponsibleUserId') &&
          response.statusCode === 409 &&
          response.body?.error?.code === 'PROJECT_RESPONSIBLE_USER_DEPARTMENT_NOT_ALLOWED' &&
          response.body?.error?.details?.includes('businessResponsibleUserId')
        );
      }
    );
    await assert.rejects(
      () =>
        createProject(
          normalizeCreateProjectInput({
            projectName: `技术负责人部门错误 smoke ${uniqueSuffix}`,
            customerName: 'Smoke 客户',
            customerContactPerson: 'Smoke 联系人',
            customerContact: '13800000003',
            businessResponsibleUserId: marketingManagerUser.id,
            technicalResponsibleUserId: marketingManagerUser.id
          }),
          marketingManagerUser.id
        ),
      (error) => {
        const response = captureErrorHandlerResponse(error);
        return (
          error instanceof ProjectResponsibleUserError &&
          error.code === 'PROJECT_RESPONSIBLE_USER_DEPARTMENT_NOT_ALLOWED' &&
          error.statusCode === 409 &&
          Array.isArray(error.details) &&
          error.details.includes('technicalResponsibleUserId') &&
          response.statusCode === 409 &&
          response.body?.error?.code === 'PROJECT_RESPONSIBLE_USER_DEPARTMENT_NOT_ALLOWED' &&
          response.body?.error?.details?.includes('technicalResponsibleUserId')
        );
      }
    );
    const directEndedStatusInput = {
      ...normalizeCreateProjectInput({
        projectName: `Repository 防绕过 smoke ${uniqueSuffix}`,
        customerName: 'Smoke 客户',
        customerContactPerson: 'Smoke 联系人',
        customerContact: '13800000004',
        businessResponsibleUserId: marketingManagerUser.id,
        technicalResponsibleUserId: managerUser.id
      }),
      status: 'ended',
      endedReason: 'bypassed project end reason',
      endedByUserId: generalManagerUser.id,
      endedAt: '2026-07-03 10:00:00'
    };
    const directEndedStatusCreated = await createProject(directEndedStatusInput, marketingManagerUser.id);
    smokeProjectIds.push(directEndedStatusCreated.project.id);
    assert.equal(directEndedStatusCreated.project.status, 'normal');
    assert.equal(directEndedStatusCreated.project.endedReason, null);
    assert.equal(directEndedStatusCreated.project.endedByUserId, null);
    assert.equal(directEndedStatusCreated.project.endedAt, null);
    assert.equal(
      await countOperationLogs({
        projectId: directEndedStatusCreated.project.id,
        actionType: OPERATION_ACTION_TYPE.PROJECT_ENDED,
        targetType: OPERATION_TARGET_TYPE.PROJECT,
        targetId: directEndedStatusCreated.project.id
      }),
      0
    );

    const lightweightProjectInput = normalizeCreateProjectInput({
      projectName: `轻量创建 smoke ${uniqueSuffix}`,
      customerName: 'Smoke 轻量客户',
      customerContactPerson: 'Smoke 轻量联系人',
      customerContact: '13800000005',
      businessResponsibleUserId: marketingManagerUser.id,
      technicalResponsibleUserId: managerUser.id
    });
    const lightweightCreated = await createProject(lightweightProjectInput, marketingManagerUser.id);
    const lightweightProjectId = lightweightCreated.project.id;
    smokeProjectIds.push(lightweightProjectId);
    assert.equal(lightweightCreated.project.projectCode, null);
    assert.equal(lightweightCreated.project.customerContact, '13800000005');
    assert.equal(lightweightCreated.project.projectManagerUserId, null);
    assert.equal(lightweightCreated.project.projectMode, null);
    assert.equal(lightweightCreated.stages.length, 8);
    assert.equal((await countSmokeProjectObjects(lightweightProjectId)).documents, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
    await assertProjectUsesV20260629Template(lightweightProjectId);

    const createdA = await createProject(
      {
        projectCode: null,
        projectName: `空编号 smoke A ${uniqueSuffix}`,
        customerName: 'Smoke 客户',
        customerContactPerson: 'Smoke 联系人 A',
        customerContact: '13800000001',
        projectMode: 'self_developed',
        projectManagerUserId: managerUser.id,
        businessResponsibleUserId: marketingManagerUser.id,
        technicalResponsibleUserId: managerUser.id,
        participatingDepartments: [RD_CENTER],
        status: 'normal',
        plannedStartDate: null,
        plannedEndDate: null,
        remark: 'online-platform-internal-document-flow smoke'
      },
      managerUser.id
    );
    const projectAId = createdA.project.id;
    smokeProjectIds.push(projectAId);
    assert.equal(createdA.project.projectCode, null);

    const createdB = await createProject(
      {
        projectCode: null,
        projectName: `空编号 smoke B ${uniqueSuffix}`,
        customerName: 'Smoke 客户',
        customerContactPerson: 'Smoke 联系人 B',
        customerContact: '13800000002',
        projectMode: 'self_developed',
        projectManagerUserId: managerUser.id,
        businessResponsibleUserId: marketingManagerUser.id,
        technicalResponsibleUserId: managerUser.id,
        participatingDepartments: [RD_CENTER],
        status: 'normal',
        plannedStartDate: null,
        plannedEndDate: null,
        remark: 'online-platform-internal-document-flow smoke duplicate'
      },
      managerUser.id
    );
    const projectBId = createdB.project.id;
    smokeProjectIds.push(projectBId);
    assert.equal(createdB.project.projectCode, null);

    const createdByCreator = await createProject(
      {
        projectCode: null,
        projectName: `创建人可见 smoke ${uniqueSuffix}`,
        customerName: 'Smoke 客户',
        customerContactPerson: 'Smoke 联系人',
        customerContact: '13800000003',
        projectMode: 'self_developed',
        projectManagerUserId: managerUser.id,
        businessResponsibleUserId: marketingManagerUser.id,
        technicalResponsibleUserId: managerUser.id,
        participatingDepartments: [RD_CENTER],
        status: 'normal',
        plannedStartDate: null,
        plannedEndDate: null,
        remark: 'align-project-visibility-and-audit-access smoke creator'
      },
      creatorUser.id
    );
    const creatorProjectId = createdByCreator.project.id;
    smokeProjectIds.push(creatorProjectId);

    const createdLimitedOverview = await createProject(
      {
        projectCode: null,
        projectName: `受限总览 smoke ${uniqueSuffix}`,
        customerName: 'Smoke 客户',
        customerContactPerson: 'Smoke 联系人',
        customerContact: '13800000004',
        projectMode: 'self_developed',
        projectManagerUserId: managerUser.id,
        businessResponsibleUserId: marketingManagerUser.id,
        technicalResponsibleUserId: managerUser.id,
        participatingDepartments: [RD_CENTER],
        status: 'normal',
        plannedStartDate: null,
        plannedEndDate: null,
        remark: 'align-project-visibility-and-audit-access smoke limited overview'
      },
      managerUser.id
    );
    const limitedOverviewProjectId = createdLimitedOverview.project.id;
    smokeProjectIds.push(limitedOverviewProjectId);
    await pool.execute(
      `UPDATE project_stage_documents
       SET responsible_user_id = CASE document_code
           WHEN '1.1' THEN ?
           WHEN '1.2' THEN ?
           ELSE responsible_user_id
         END,
         status = ?,
         is_applicable = 1,
         revision_required = 0
       WHERE project_id = ?
         AND document_code IN ('1.1', '1.2')`,
      [limitedEmployeeUser.id, managerUser.id, DOCUMENT_STATUS.NOT_SUBMITTED, limitedOverviewProjectId]
    );

    const [nullProjectCodeRows] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM projects
       WHERE id IN (?, ?)
         AND project_code IS NULL`,
      [projectAId, projectBId]
    );
    assert.equal(Number(nullProjectCodeRows[0].count), 2);

    await runInitiationReviewSmoke({
      uniqueSuffix,
      smokeProjectIds,
      smokeUserIds,
      managerUser,
      limitedEmployeeUser,
      marketingManagerUser,
      generalManagerUser,
      systemAdminUser: smokeSystemAdminUser,
      generalManagerAssistantUser
    });

    const initialCountsA = await countSmokeProjectObjects(projectAId);
    assert.deepEqual(initialCountsA, {
      stages: 8,
      documents: EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
      attachments: 0
    });
    await assertProjectUsesV20260629Template(projectAId);

    const projectAListForCenterManager = await listProjects(departmentUser(9001, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER));
    assert.ok(projectAListForCenterManager.some((projectItem) => projectItem.id === projectAId));
    const projectAListForAssistant = await listProjects(globalUser(9002, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT));
    assert.ok(projectAListForAssistant.some((projectItem) => projectItem.id === projectAId));
    const projectAListForSystemAdmin = await listProjects(globalUser(9003, ORGANIZATION_ROLE.SYSTEM_ADMIN));
    assert.equal(projectAListForSystemAdmin.some((projectItem) => projectItem.id === projectAId), false);
    const creatorProjectList = await listProjects(creatorUser);
    assert.ok(creatorProjectList.some((projectItem) => projectItem.id === creatorProjectId));
    assert.equal(creatorProjectList.some((projectItem) => projectItem.id === projectAId), false);

    await assertProjectViewable(projectAId, departmentUser(9004, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER));
    await assertProjectViewable(projectAId, globalUser(9005, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT));
    await assert.rejects(
      () => assertProjectViewable(projectAId, globalUser(9006, ORGANIZATION_ROLE.SYSTEM_ADMIN)),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    const centerManagerDetail = await getProjectDetail(
      projectAId,
      departmentUser(9007, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
    );
    assert.equal(centerManagerDetail.project.id, projectAId);

    const unassignedSubmitDocument = await selectSmokeDocument(projectAId, '1.1');
    await pool.execute(
      `UPDATE project_stage_documents
       SET responsible_user_id = NULL,
         status = ?,
         submitted_by_user_id = NULL,
         submitted_at = NULL,
         confirmed_by_user_id = NULL,
         confirmed_at = NULL,
         returned_by_user_id = NULL,
         returned_at = NULL,
         return_reason = NULL,
         revision_required = 0,
         revision_source_document_id = NULL,
         revision_requested_by_user_id = NULL,
         revision_requested_at = NULL,
         revision_resubmitted_by_user_id = NULL,
         revision_resubmitted_at = NULL,
         revision_completed_by_user_id = NULL,
         revision_completed_at = NULL,
         is_applicable = 1
       WHERE id = ?`,
      [DOCUMENT_STATUS.NOT_SUBMITTED, unassignedSubmitDocument.id]
    );

    const centerManagerChecklist = await getProjectStageDocumentChecklist(
      projectAId,
      departmentUser(9008, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
    );
    assert.equal(
      centerManagerChecklist.stages.reduce((sum, stage) => sum + stage.documents.length, 0),
      EXPECTED_STAGE_DOCUMENT_ITEM_COUNT
    );
    const assistantChecklist = await getProjectStageDocumentChecklist(
      projectAId,
      globalUser(9009, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT)
    );
    assert.equal(
      assistantChecklist.stages.reduce((sum, stage) => sum + stage.documents.length, 0),
      EXPECTED_STAGE_DOCUMENT_ITEM_COUNT
    );
    const projectManagerChecklist = await getProjectStageDocumentChecklist(projectAId, managerUser);
    const generalManagerChecklist = await getProjectStageDocumentChecklist(projectAId, generalManagerUser);
    const marketingManagerChecklist = await getProjectStageDocumentChecklist(projectAId, marketingManagerUser);
    const unassignedForProjectManager = findChecklistDocument(projectManagerChecklist, '1.1');
    assert.equal(unassignedForProjectManager.canViewAttachments, true);
    assert.equal(unassignedForProjectManager.canUploadAttachment, false);
    assert.equal(unassignedForProjectManager.canDownloadAttachment, true);
    assert.equal(unassignedForProjectManager.canSubmitDocument, false);
    const unassignedForGeneralManager = findChecklistDocument(generalManagerChecklist, '1.1');
    assert.equal(unassignedForGeneralManager.canViewAttachments, true);
    assert.equal(unassignedForGeneralManager.canUploadAttachment, false);
    assert.equal(unassignedForGeneralManager.canDownloadAttachment, true);
    assert.equal(unassignedForGeneralManager.canSubmitDocument, false);
    const unassignedForCenterManager = findChecklistDocument(marketingManagerChecklist, '1.1');
    assert.equal(unassignedForCenterManager.canViewAttachments, true);
    assert.equal(unassignedForCenterManager.canUploadAttachment, false);
    assert.equal(unassignedForCenterManager.canDownloadAttachment, true);
    assert.equal(unassignedForCenterManager.canSubmitDocument, false);
    const unassignedForAssistant = findChecklistDocument(assistantChecklist, '1.1');
    assert.equal(unassignedForAssistant.canViewAttachments, true);
    assert.equal(unassignedForAssistant.canUploadAttachment, false);
    assert.equal(unassignedForAssistant.canDownloadAttachment, true);
    assert.equal(unassignedForAssistant.canSubmitDocument, false);
    await assertOrdinaryOnlineFormDocumentSubmitRejected({
      projectId: projectAId,
      documentCode: '1.1',
      user: managerUser
    });
    await assertOrdinaryOnlineFormDocumentSubmitRejected({
      projectId: projectAId,
      documentCode: '1.1',
      user: generalManagerUser
    });
    await assertOrdinaryOnlineFormDocumentSubmitRejected({
      projectId: projectAId,
      documentCode: '1.1',
      user: marketingManagerUser
    });
    await assertOrdinaryOnlineFormDocumentSubmitRejected({
      projectId: projectAId,
      documentCode: '1.1',
      user: generalManagerAssistantUser
    });
    await assertOrdinaryOnlineFormDocumentSubmitRejected({
      projectId: projectAId,
      documentCode: '1.1',
      user: smokeSystemAdminUser
    });
    const unchangedUnassignedSubmitDocument = await selectSmokeDocument(projectAId, '1.1');
    assert.equal(unchangedUnassignedSubmitDocument.responsible_user_id, null);
    assert.equal(unchangedUnassignedSubmitDocument.status, DOCUMENT_STATUS.NOT_SUBMITTED);

    const reviewerBoundaryDocument = await selectSmokeDocument(projectAId, '2.2');
    await pool.execute(
      `UPDATE project_stage_documents
       SET responsible_user_id = ?,
         review_department = ?,
         status = ?,
         submitted_by_user_id = NULL,
         submitted_at = NULL,
         confirmed_by_user_id = NULL,
         confirmed_at = NULL,
         returned_by_user_id = NULL,
         returned_at = NULL,
         return_reason = NULL,
         revision_required = 0,
         revision_source_document_id = NULL,
         revision_requested_by_user_id = NULL,
         revision_requested_at = NULL,
         revision_resubmitted_by_user_id = NULL,
         revision_resubmitted_at = NULL,
         revision_completed_by_user_id = NULL,
         revision_completed_at = NULL,
         is_applicable = 1
       WHERE id = ?`,
      [rdEmployeeUser.id, RD_CENTER, DOCUMENT_STATUS.NOT_SUBMITTED, reviewerBoundaryDocument.id]
    );
    const responsibleChecklist = await getProjectStageDocumentChecklist(projectAId, rdEmployeeUser);
    assert.equal(findChecklistDocument(responsibleChecklist, '2.2').canSubmitDocument, true);
    const reviewerChecklistBeforeSubmit = await getProjectStageDocumentChecklist(projectAId, managerUser);
    const reviewerDocumentBeforeSubmit = findChecklistDocument(reviewerChecklistBeforeSubmit, '2.2');
    assert.equal(reviewerDocumentBeforeSubmit.canSubmitDocument, false);
    assert.equal(reviewerDocumentBeforeSubmit.canReviewDocument, false);
    await assertStageDocumentSubmitForbidden({
      projectId: projectAId,
      documentId: reviewerBoundaryDocument.id,
      user: managerUser
    });
    await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: reviewerBoundaryDocument.id,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user: rdEmployeeUser
    });
    const reviewerChecklistAfterSubmit = await getProjectStageDocumentChecklist(projectAId, managerUser);
    const reviewerDocumentAfterSubmit = findChecklistDocument(reviewerChecklistAfterSubmit, '2.2');
    assert.equal(reviewerDocumentAfterSubmit.canSubmitDocument, false);
    assert.equal(reviewerDocumentAfterSubmit.canReviewDocument, true);
    const reviewedByNonResponsibleReviewer = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: reviewerBoundaryDocument.id,
      action: DOCUMENT_STATUS_ACTION.CONFIRM,
      user: managerUser
    });
    assert.equal(reviewedByNonResponsibleReviewer.status, DOCUMENT_STATUS.CONFIRMED);
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = ?,
         submitted_by_user_id = NULL,
         submitted_at = NULL,
         confirmed_by_user_id = NULL,
         confirmed_at = NULL
       WHERE id = ?`,
      [DOCUMENT_STATUS.NOT_SUBMITTED, reviewerBoundaryDocument.id]
    );
    const creatorChecklist = await getProjectStageDocumentChecklist(creatorProjectId, creatorUser);
    assert.equal(
      creatorChecklist.stages.reduce((sum, stage) => sum + stage.documents.length, 0),
      EXPECTED_STAGE_DOCUMENT_ITEM_COUNT
    );

    await assertProjectAuditViewable(projectAId, departmentUser(9010, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER));
    await assertProjectAuditViewable(projectAId, globalUser(9011, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT));
    await assertProjectAuditViewable(creatorProjectId, creatorUser);
    await listStageApprovalHistory({
      projectId: projectAId,
      stageId: createdA.stages[0].id,
      user: globalUser(9050, ORGANIZATION_ROLE.GENERAL_MANAGER)
    });
    await listStageApprovalHistory({
      projectId: projectAId,
      stageId: createdA.stages[0].id,
      user: managerUser
    });
    await assert.rejects(
      () =>
        listStageApprovalHistory({
          projectId: projectAId,
          stageId: createdA.stages[0].id,
          user: globalUser(9051, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT)
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        listStageApprovalHistory({
          projectId: projectAId,
          stageId: createdA.stages[0].id,
          user: departmentUser(9052, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        listStageApprovalHistory({
          projectId: creatorProjectId,
          stageId: createdByCreator.stages[0].id,
          user: creatorUser
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        listStageApprovalHistory({
          projectId: projectAId,
          stageId: createdA.stages[0].id,
          user: globalUser(9053, ORGANIZATION_ROLE.SYSTEM_ADMIN)
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    const centerManagerLogs = await listProjectOperationLogs(projectAId);
    assert.ok(centerManagerLogs.length > 0);
    await assert.rejects(
      () => assertProjectAuditViewable(projectAId, departmentUser(9012, ORGANIZATION_ROLE.EMPLOYEE, MANUFACTURING_CENTER)),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () => assertProjectAuditViewable(projectAId, globalUser(9013, ORGANIZATION_ROLE.SYSTEM_ADMIN)),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );

    const attachmentDocument = await selectSmokeDocument(projectAId, '2.1');
    await pool.execute(
      'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
      [managerUser.id, attachmentDocument.id]
    );
    const managerResponsibleChecklist = await getProjectStageDocumentChecklist(projectAId, managerUser);
    const managerResponsibleDocument = findChecklistDocument(managerResponsibleChecklist, '2.1');
    assert.equal(managerResponsibleDocument.canUploadAttachment, true);
    assert.equal(managerResponsibleDocument.canSubmitDocument, true);
    const uploadedAttachment = await uploadStageDocumentAttachment({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      user: managerUser,
      file: {
        originalFileName: 'smoke.txt',
        mimeType: 'text/plain',
        size: 10,
        buffer: Buffer.from('smoke-file')
      }
    });
    assert.equal(uploadedAttachment.originalFileName, 'smoke.txt');
    const [uploadedAttachmentRows] = await pool.execute(
      'SELECT storage_key FROM project_stage_document_attachments WHERE id = ?',
      [uploadedAttachment.id]
    );
    smokeStorageKeys.push(uploadedAttachmentRows[0].storage_key);

    const visibilityAttachmentDocument = await selectSmokeDocument(projectAId, '2.4');
    await pool.execute(
      'UPDATE project_stage_documents SET responsible_user_id = ?, status = ? WHERE id = ?',
      [managerUser.id, DOCUMENT_STATUS.NOT_SUBMITTED, visibilityAttachmentDocument.id]
    );
    const uploadedVisibilityAttachment = await uploadStageDocumentAttachment({
      projectId: projectAId,
      documentId: visibilityAttachmentDocument.id,
      user: managerUser,
      file: {
        originalFileName: 'visibility-smoke.txt',
        mimeType: 'text/plain',
        size: 16,
        buffer: Buffer.from('visibility-smoke')
      }
    });
    const [uploadedVisibilityAttachmentRows] = await pool.execute(
      'SELECT storage_key FROM project_stage_document_attachments WHERE id = ?',
      [uploadedVisibilityAttachment.id]
    );
    smokeStorageKeys.push(uploadedVisibilityAttachmentRows[0].storage_key);

    const listedAttachmentsForCenterManager = await listStageDocumentAttachments({
      projectId: projectAId,
      documentId: visibilityAttachmentDocument.id,
      user: departmentUser(9014, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
    });
    assert.equal(listedAttachmentsForCenterManager.length, 1);
    assert.equal(listedAttachmentsForCenterManager[0].canDownload, true);
    assert.equal(listedAttachmentsForCenterManager[0].canDelete, false);
    const centerDownload = await getStageDocumentAttachmentDownload({
      projectId: projectAId,
      documentId: visibilityAttachmentDocument.id,
      attachmentId: uploadedVisibilityAttachment.id,
      user: departmentUser(9015, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
    });
    assert.equal(centerDownload.fileSize, 16);
    const listedAttachmentsForAssistant = await listStageDocumentAttachments({
      projectId: projectAId,
      documentId: visibilityAttachmentDocument.id,
      user: globalUser(9016, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT)
    });
    assert.equal(listedAttachmentsForAssistant.length, 1);
    assert.equal(listedAttachmentsForAssistant[0].canDownload, true);
    assert.equal(listedAttachmentsForAssistant[0].canDelete, false);
    await getStageDocumentAttachmentDownload({
      projectId: projectAId,
      documentId: visibilityAttachmentDocument.id,
      attachmentId: uploadedVisibilityAttachment.id,
      user: globalUser(9017, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT)
    });
    await assert.rejects(
      () =>
        uploadStageDocumentAttachment({
          projectId: projectAId,
          documentId: visibilityAttachmentDocument.id,
          user: globalUser(9018, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT),
          file: {
            originalFileName: 'forbidden.txt',
            mimeType: 'text/plain',
            size: 9,
            buffer: Buffer.from('forbidden')
          }
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        uploadStageDocumentAttachment({
          projectId: projectAId,
          documentId: visibilityAttachmentDocument.id,
          user: departmentUser(9019, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER),
          file: {
            originalFileName: 'forbidden.txt',
            mimeType: 'text/plain',
            size: 9,
            buffer: Buffer.from('forbidden')
          }
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        deleteStageDocumentAttachment({
          projectId: projectAId,
          documentId: visibilityAttachmentDocument.id,
          attachmentId: uploadedVisibilityAttachment.id,
          user: globalUser(9020, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT)
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );
    await assert.rejects(
      () =>
        deleteStageDocumentAttachment({
          projectId: projectAId,
          documentId: visibilityAttachmentDocument.id,
          attachmentId: uploadedVisibilityAttachment.id,
          user: departmentUser(9021, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER)
        }),
      (error) => error.code === 'FORBIDDEN_OPERATION'
    );

    const listedAttachments = await listStageDocumentAttachments({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      user: managerUser
    });
    assert.equal(listedAttachments.length, 1);
    const download = await getStageDocumentAttachmentDownload({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      attachmentId: uploadedAttachment.id,
      user: managerUser
    });
    assert.equal(download.fileSize, 10);
    await deleteStageDocumentAttachment({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      attachmentId: uploadedAttachment.id,
      user: managerUser
    });
    const attachmentsAfterDelete = await listStageDocumentAttachments({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      user: managerUser
    });
    assert.equal(attachmentsAfterDelete.length, 0);

    const submittedOnlyDocument = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: attachmentDocument.id,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user: managerUser
    });
    assert.equal(submittedOnlyDocument.completionMode, COMPLETION_MODE.SUBMIT_ONLY);
    assert.equal(submittedOnlyDocument.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submittedOnlyDocument.isComplete, true);
    assert.equal(submittedOnlyDocument.completionStatus, 'completed');

    const pendingTasks = await listMyStageDocumentTasks(
      managerUser.id,
      normalizeStageDocumentTaskFilters({})
    );
    assert.equal(
      pendingTasks.some(
        (task) => task.projectId === projectAId && task.documentCode === submittedOnlyDocument.documentCode
      ),
      false
    );

    const submittedTasks = await listMyStageDocumentTasks(
      managerUser.id,
      normalizeStageDocumentTaskFilters({ status: DOCUMENT_STATUS.SUBMITTED })
    );
    const submittedOnlyTask = submittedTasks.find(
      (task) => task.projectId === projectAId && task.documentCode === submittedOnlyDocument.documentCode
    );
    assert.ok(submittedOnlyTask);
    assert.equal(submittedOnlyTask.isComplete, true);
    assert.equal(submittedOnlyTask.completionStatus, 'completed');

    await resetSmokeDocumentsForReview(projectAId, ['2.2'], managerUser);
    const drawingReview = await selectSmokeDocument(projectAId, '2.2');
    const submittedReview = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: drawingReview.id,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user: managerUser
    });
    assert.equal(submittedReview.completionMode, COMPLETION_MODE.APPROVAL_REQUIRED);
    assert.equal(submittedReview.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submittedReview.isComplete, false);
    assert.equal(submittedReview.completionStatus, 'pending_review');

    const returnedReview = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: drawingReview.id,
      action: DOCUMENT_STATUS_ACTION.RETURN,
      user: managerUser,
      returnReason: 'smoke returned'
    });
    assert.equal(returnedReview.status, DOCUMENT_STATUS.RETURNED);
    assert.equal(returnedReview.isComplete, false);
    assert.equal(returnedReview.completionStatus, 'incomplete');

    await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: drawingReview.id,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user: managerUser
    });
    const confirmedReview = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: drawingReview.id,
      action: DOCUMENT_STATUS_ACTION.CONFIRM,
      user: managerUser
    });
    assert.equal(confirmedReview.status, DOCUMENT_STATUS.CONFIRMED);
    assert.equal(confirmedReview.isComplete, true);
    assert.equal(confirmedReview.completionStatus, 'completed');

    await assertApprovalRevisionResubmitCycle({
      projectId: projectAId,
      sourceCode: '2.12',
      targetCode: '2.4',
      user: managerUser
    });
    await assertApprovalRevisionResubmitCycle({
      projectId: projectAId,
      sourceCode: '4.12',
      targetCode: '4.3',
      user: managerUser
    });

    await resetSmokeDocumentsForReview(projectAId, ['4.14', '4.16'], managerUser);
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = CASE
         WHEN document_code = '4.14' THEN ?
         WHEN document_code = '4.16' THEN ?
         ELSE status
       END,
         submitted_at = CURRENT_TIMESTAMP
       WHERE project_id = ?
         AND document_code IN ('4.14', '4.16')`,
      [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.SUBMITTED, projectAId]
    );
    const drawingReviewForSubmitOnlyRevision = await selectSmokeDocument(projectAId, '4.16');
    const drawingModelSubmitOnly = await selectSmokeDocument(projectAId, '4.14');
    await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: drawingReviewForSubmitOnlyRevision.id,
      action: DOCUMENT_STATUS_ACTION.RETURN,
      user: managerUser,
      returnReason: '4.14 smoke revision',
      revisionTargetDocumentIds: [drawingModelSubmitOnly.id]
    });
    const submitOnlyRevisionTarget = await selectSmokeDocument(projectAId, '4.14');
    assert.equal(submitOnlyRevisionTarget.completion_mode, COMPLETION_MODE.SUBMIT_ONLY);
    assert.equal(Boolean(submitOnlyRevisionTarget.revision_required), true);
    assert.equal(deriveStageDocumentCompletion(submitOnlyRevisionTarget).isComplete, false);
    const completedSubmitOnlyRevision = await completeProjectStageDocumentRevision({
      projectId: projectAId,
      documentId: submitOnlyRevisionTarget.id,
      user: managerUser
    });
    assert.equal(completedSubmitOnlyRevision.revisionRequired, false);
    assert.equal(completedSubmitOnlyRevision.isComplete, true);

    await resetSmokeDocumentsForReview(projectAId, ['5.12', '5.13', '5.14', '5.3'], managerUser);
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = CASE WHEN document_code = '5.12' THEN ? ELSE status END,
         submitted_at = CASE WHEN document_code = '5.12' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
         is_applicable = CASE WHEN document_code IN ('5.13', '5.14') THEN 0 ELSE is_applicable END
       WHERE project_id = ?
         AND document_code IN ('5.12', '5.13', '5.14', '5.3')`,
      [DOCUMENT_STATUS.SUBMITTED, projectAId]
    );
    const factoryInstallRecord = await selectSmokeDocument(projectAId, '5.12');
    const designChangeModel = await selectSmokeDocument(projectAId, '5.13');
    const purchaseContract = await selectSmokeDocument(projectAId, '5.3');
    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          projectId: projectAId,
          documentId: factoryInstallRecord.id,
          action: DOCUMENT_STATUS_ACTION.RETURN,
          user: managerUser,
          returnReason: '5.12 smoke no target',
          designChangeTargetDocumentIds: []
        }),
      (error) => error.code === 'DESIGN_CHANGE_TARGETS_REQUIRED'
    );
    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          projectId: projectAId,
          documentId: factoryInstallRecord.id,
          action: DOCUMENT_STATUS_ACTION.RETURN,
          user: managerUser,
          returnReason: '5.12 smoke invalid target',
          designChangeTargetDocumentIds: [purchaseContract.id]
        }),
      (error) => error.code === 'INVALID_DESIGN_CHANGE_TARGETS'
    );
    await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: factoryInstallRecord.id,
      action: DOCUMENT_STATUS_ACTION.RETURN,
      user: managerUser,
      returnReason: '5.13 smoke design change',
      designChangeTargetDocumentIds: [designChangeModel.id]
    });
    const triggeredDesignChangeModel = await selectSmokeDocument(projectAId, '5.13');
    const untouchedDesignChangeDocument = await selectSmokeDocument(projectAId, '5.14');
    assert.equal(Boolean(triggeredDesignChangeModel.is_applicable), true);
    assert.equal(Boolean(triggeredDesignChangeModel.revision_required), true);
    assert.equal(triggeredDesignChangeModel.revision_resubmitted_by_user_id, null);
    assert.equal(triggeredDesignChangeModel.revision_resubmitted_at, null);
    assert.equal(Boolean(untouchedDesignChangeDocument.is_applicable), false);
    assert.equal(Boolean(untouchedDesignChangeDocument.revision_required), false);
    await pool.execute(
      `UPDATE project_stage_documents
       SET responsible_user_id = NULL,
         is_applicable = 1,
         revision_required = 1,
          revision_reason = 'unassigned smoke revision',
          revision_source_document_id = ?,
          revision_requested_by_user_id = ?,
          revision_requested_at = CURRENT_TIMESTAMP,
          revision_resubmitted_by_user_id = NULL,
          revision_resubmitted_at = NULL
        WHERE project_id = ?
         AND document_code = '5.14'`,
      [factoryInstallRecord.id, managerUser.id, projectAId]
    );
    const checklistWithUnassignedRevision = await getProjectStageDocumentChecklist(projectAId, managerUser);
    const unassignedRevisionDocument = checklistWithUnassignedRevision.stages
      .flatMap((stage) => stage.documents)
      .find((document) => document.documentCode === '5.14');
    assert.ok(unassignedRevisionDocument);
    assert.equal(unassignedRevisionDocument.revisionRequired, true);
    assert.equal(unassignedRevisionDocument.responsibleUserId, null);

    await completeInitiationGate(projectAId, {
      submitterUser: managerUser,
      marketingManagerUser,
      rdManagerUser: managerUser,
      generalManagerUser
    });
    await completeInitiationGate(projectBId, {
      submitterUser: managerUser,
      marketingManagerUser,
      rdManagerUser: managerUser,
      generalManagerUser
    });
    await pool.execute(
      `UPDATE project_stage_documents
       SET is_applicable = 0
       WHERE project_id = ?
         AND document_code = '1.3'`,
      [projectBId]
    );

    const beforeProjectCodeCountsA = await countSmokeProjectObjects(projectAId);
    await assert.rejects(
      () =>
        updateProjectCode({
          projectId: projectAId,
          projectCode: duplicateProjectCode,
          user: marketingManagerUser
        }),
      (error) =>
        error instanceof ProjectCodeUpdateError &&
        error.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
    );
    assert.deepEqual(await countSmokeProjectObjects(projectAId), beforeProjectCodeCountsA);

    await assert.rejects(
      () =>
        updateProjectCode({
          projectId: projectBId,
          projectCode: `SMOKE-GATE-${uniqueSuffix}`,
          user: marketingManagerUser
        }),
      (error) =>
        error instanceof ProjectCodeUpdateError &&
        error.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
    );

    await pool.execute(
      `UPDATE project_stage_documents
       SET is_applicable = 1,
         status = ?
       WHERE project_id = ?
         AND document_code = '1.3'`,
      [DOCUMENT_STATUS.SUBMITTED, projectBId]
    );

    await assert.rejects(
      () =>
        updateProjectCode({
          projectId: projectBId,
          projectCode: duplicateProjectCode,
          user: marketingManagerUser
      }),
      (error) =>
        error instanceof ProjectCodeUpdateError &&
        error.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
    );

    const beforeProjectCodeCountsB = await countSmokeProjectObjects(projectBId);
    await assert.rejects(
      () =>
        updateProjectCode({
          projectId: projectBId,
          projectCode: `SMOKE-B-${uniqueSuffix}`,
          user: marketingManagerUser
        }),
      (error) =>
        error instanceof ProjectCodeUpdateError &&
        error.code === 'PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM'
    );
    assert.deepEqual(await countSmokeProjectObjects(projectBId), beforeProjectCodeCountsB);

    const workbenchBeforeAdvance = await getMyWorkbench(managerUser);
    assert.equal(
      workbenchBeforeAdvance.items.some((item) => item.type === 'stage_gate_approval'),
      false
    );
    assert.equal(
      workbenchBeforeAdvance.items.some((item) => /approval/i.test(item.targetRoute)),
      false
    );
    assert.equal(
      workbenchBeforeAdvance.items.some((item) => item.type === 'stage_advance'),
      false
    );

    const detailAfterStageOneAutoAdvance = await getProjectDetail(projectAId, managerUser);
    assert.equal(detailAfterStageOneAutoAdvance.currentStage.stageOrder, 2);
    assert.equal(detailAfterStageOneAutoAdvance.currentStage.stageKey, 'solution');

    await resetSmokeDocumentsForReview(projectAId, ['2.2', '2.3', '2.4', '2.12'], managerUser);
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = CASE
         WHEN document_code = '2.12' THEN ?
         ELSE ?
       END,
         submitted_at = CASE WHEN document_code = '2.12' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
         confirmed_at = CASE WHEN document_code <> '2.12' THEN CURRENT_TIMESTAMP ELSE confirmed_at END
       WHERE project_id = ?
         AND document_code IN ('2.2', '2.3', '2.4', '2.12')`,
      [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED, projectAId]
    );
    const internalReviewDocument = await selectSmokeDocument(projectAId, '2.12');
    const twoTwoDocument = await selectSmokeDocument(projectAId, '2.2');
    const modelDocument = await selectSmokeDocument(projectAId, '2.4');
    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          projectId: projectAId,
          documentId: internalReviewDocument.id,
          action: DOCUMENT_STATUS_ACTION.RETURN,
          user: managerUser,
          returnReason: '2.12 no candidate'
        }),
      (error) => error.code === 'REVISION_TARGETS_REQUIRED'
    );
    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          projectId: projectAId,
          documentId: internalReviewDocument.id,
          action: DOCUMENT_STATUS_ACTION.RETURN,
          user: managerUser,
          returnReason: '2.12 invalid candidate',
          revisionTargetDocumentIds: [twoTwoDocument.id]
        }),
      (error) => error.code === 'INVALID_REVISION_TARGETS'
    );
    await resetSmokeDocumentsForReview(projectAId, ['2.3', '2.13'], managerUser);
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = CASE
         WHEN document_code = '2.13' THEN ?
         ELSE ?
       END,
         submitted_at = CASE WHEN document_code = '2.13' THEN CURRENT_TIMESTAMP ELSE submitted_at END
       WHERE project_id = ?
         AND document_code IN ('2.3', '2.13')`,
      [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED, projectAId]
    );
    const customerReviewDocument = await selectSmokeDocument(projectAId, '2.13');
    const twoThreeDocument = await selectSmokeDocument(projectAId, '2.3');
    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          projectId: projectAId,
          documentId: customerReviewDocument.id,
          action: DOCUMENT_STATUS_ACTION.RETURN,
          user: managerUser,
          returnReason: '2.13 invalid candidate',
          revisionTargetDocumentIds: [twoThreeDocument.id]
        }),
      (error) => error.code === 'INVALID_REVISION_TARGETS'
    );
    await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: internalReviewDocument.id,
      action: DOCUMENT_STATUS_ACTION.RETURN,
      user: managerUser,
      returnReason: '2.4 smoke revision',
      revisionTargetDocumentIds: [modelDocument.id]
    });
    const modelDocumentRevision = await selectSmokeDocument(projectAId, '2.4');
    assert.equal(Boolean(modelDocumentRevision.revision_required), true);
    await assert.rejects(
      () => advanceProjectStage(projectAId, managerUser),
      (error) =>
        error instanceof ProjectStageAdvanceError &&
        error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE' &&
        error.details.incompleteRequiredDocuments.some((document) => document.documentCode === '2.4')
    );
    await completeProjectStageDocumentRevision({
      projectId: projectAId,
      documentId: modelDocumentRevision.id,
      user: managerUser
    });
    await pool.execute(
      `UPDATE project_stage_documents
       SET status = CASE
         WHEN completion_mode IN (?, ?) THEN ?
         ELSE ?
       END,
         revision_required = 0
       WHERE project_id = ?
         AND stage_order = 2`,
      [
        COMPLETION_MODE.SUBMIT_ONLY,
        COMPLETION_MODE.CONDITIONAL_SUBMIT,
        DOCUMENT_STATUS.SUBMITTED,
        DOCUMENT_STATUS.CONFIRMED,
        projectAId
      ]
    );
    const workbenchAfterRevisionCleared = await getMyWorkbench(managerUser);
    assert.equal(
      workbenchAfterRevisionCleared.items.some((item) => item.type === 'stage_advance'),
      false
    );

    await completeStageExcept(projectAId, 2, '2.6');
    const blockedConditionalDocument = await selectSmokeDocument(projectAId, '2.6');
    assert.equal(Boolean(blockedConditionalDocument.is_required), false);
    assert.equal(Boolean(blockedConditionalDocument.is_applicable), true);
    assert.equal(blockedConditionalDocument.completion_mode, COMPLETION_MODE.CONDITIONAL_SUBMIT);
    assert.equal(blockedConditionalDocument.status, DOCUMENT_STATUS.NOT_SUBMITTED);
    await pool.execute(
      'UPDATE project_stage_documents SET responsible_user_id = ? WHERE id = ?',
      [managerUser.id, blockedConditionalDocument.id]
    );

    const workbenchWithBlockedConditional = await getMyWorkbench(managerUser);
    assert.equal(
      workbenchWithBlockedConditional.items.some(
        (item) => item.type === 'stage_advance' && item.projectId === projectAId
      ),
      false
    );
    await assert.rejects(
      () => advanceProjectStage(projectAId, managerUser),
      (error) =>
        error instanceof ProjectStageAdvanceError &&
        error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE' &&
        error.details.incompleteRequiredDocuments.some((document) => document.documentCode === '2.6')
    );

    const submittedConditionalDocument = await updateProjectStageDocumentStatus({
      projectId: projectAId,
      documentId: blockedConditionalDocument.id,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user: managerUser
    });
    assert.equal(submittedConditionalDocument.completionMode, COMPLETION_MODE.CONDITIONAL_SUBMIT);
    assert.equal(submittedConditionalDocument.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submittedConditionalDocument.isComplete, true);

    const workbenchAfterConditionalSubmit = await getMyWorkbench(managerUser);
    assert.equal(
      workbenchAfterConditionalSubmit.items.some((item) => item.type === 'stage_advance'),
      false
    );
    const detailAfterConditionalSubmit = await getProjectDetail(projectAId, managerUser);
    assert.equal(detailAfterConditionalSubmit.currentStage.stageOrder, 3);

    const overview = await getProjectOverviewDashboard(managerUser, {
      status: null,
      currentStageOrder: null,
      keyword: `空编号 smoke`
    });
    for (const overviewProject of overview.projects) {
      if (overviewProject.projectId !== projectAId && overviewProject.projectId !== projectBId) {
        continue;
      }

      assert.ok(overviewProject.currentStageCompletenessSummary);
      assert.ok(
        Object.prototype.hasOwnProperty.call(
          overviewProject.currentStageCompletenessSummary,
          'completedRequiredCount'
        )
      );
      assert.equal(
        overviewProject.currentStageIncompleteRequiredDocuments.every((document) =>
          Object.prototype.hasOwnProperty.call(document, 'completionMode')
        ),
        true
      );
    }

    const managerLimitedOverview = await getProjectOverviewDashboard(managerUser, {
      status: null,
      currentStageOrder: null,
      keyword: `受限总览 smoke ${uniqueSuffix}`
    });
    const managerLimitedOverviewProject = managerLimitedOverview.projects.find(
      (project) => project.projectId === limitedOverviewProjectId
    );
    assert.ok(managerLimitedOverviewProject);
    assert.ok(managerLimitedOverviewProject.currentStageCompletenessSummary);
    assert.ok(managerLimitedOverviewProject.currentStageIncompleteRequiredDocuments.length > 0);

    const limitedOverview = await getProjectOverviewDashboard(limitedEmployeeUser, {
      status: null,
      currentStageOrder: null,
      keyword: `受限总览 smoke ${uniqueSuffix}`
    });
    const limitedProjectOverview = limitedOverview.projects.find(
      (project) => project.projectId === limitedOverviewProjectId
    );
    assert.ok(limitedProjectOverview);
    assert.equal(limitedProjectOverview.currentStageCompletenessSummary, null);
    assert.equal(limitedProjectOverview.currentStageIncompleteRequiredDocuments.length, 0);
    assert.equal(
      limitedProjectOverview.currentStageIncompleteRequiredDocuments.some(
        (document) => document.documentCode === '1.2' || document.documentName === '项目立项审批表'
      ),
      false
    );
    assert.equal(limitedOverview.summary.myPendingStageDocumentTasks, 1);

    const centerOverview = await getProjectOverviewDashboard(
      departmentUser(9054, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER),
      {
        status: null,
        currentStageOrder: null,
        keyword: `受限总览 smoke ${uniqueSuffix}`
      }
    );
    const centerLimitedOverviewProject = centerOverview.projects.find(
      (project) => project.projectId === limitedOverviewProjectId
    );
    assert.ok(centerLimitedOverviewProject);
    assert.ok(centerLimitedOverviewProject.currentStageCompletenessSummary);
    assert.ok(centerLimitedOverviewProject.currentStageIncompleteRequiredDocuments.length > 0);

    const creatorOverview = await getProjectOverviewDashboard(creatorUser, {
      status: null,
      currentStageOrder: null,
      keyword: `创建人可见 smoke ${uniqueSuffix}`
    });
    const creatorProjectOverview = creatorOverview.projects.find((project) => project.projectId === creatorProjectId);
    assert.ok(creatorProjectOverview);
    assert.ok(creatorProjectOverview.currentStageCompletenessSummary);
    assert.ok(creatorProjectOverview.currentStageIncompleteRequiredDocuments.length > 1);

    const [revisionLogRows] = await pool.execute(
      `SELECT action_type AS actionType, COUNT(*) AS count
       FROM business_operation_logs
       WHERE project_id = ?
         AND action_type IN ('document.revision_requested', 'document.revision_completed')
       GROUP BY action_type`,
      [projectAId]
    );
    const revisionLogCounts = Object.fromEntries(
      revisionLogRows.map((row) => [row.actionType, Number(row.count)])
    );
    assert.ok(revisionLogCounts['document.revision_requested'] >= 5);
    assert.ok(revisionLogCounts['document.revision_completed'] >= 3);
  } finally {
    await cleanupSmokeProjects(smokeProjectIds, smokeStorageKeys, smokeUserIds);
  }
}

const project = {
  id: 1,
  project_manager_user_id: 99,
  created_by_user_id: 98,
  participating_departments: JSON.stringify([]),
  has_department_responsible: 0
};

const projectCreator = departmentUser(98, ORGANIZATION_ROLE.EMPLOYEE, MARKETING_CENTER);
const rdManager = departmentUser(10, ORGANIZATION_ROLE.CENTER_MANAGER, RD_CENTER);
const manufacturingManager = departmentUser(11, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER);
const marketingManager = departmentUser(12, ORGANIZATION_ROLE.CENTER_MANAGER, MARKETING_CENTER);
const operationsManager = departmentUser(13, ORGANIZATION_ROLE.CENTER_MANAGER, OPERATIONS_CENTER);
const rdEmployee = departmentUser(20, ORGANIZATION_ROLE.EMPLOYEE, RD_CENTER);
const manufacturingEmployee = departmentUser(21, ORGANIZATION_ROLE.EMPLOYEE, MANUFACTURING_CENTER);
const projectManager = departmentUser(99, ORGANIZATION_ROLE.EMPLOYEE, RD_CENTER);
const systemAdmin = globalUser(30, ORGANIZATION_ROLE.SYSTEM_ADMIN);
const generalManagerAssistant = globalUser(31, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT);
const generalManager = globalUser(32, ORGANIZATION_ROLE.GENERAL_MANAGER);

const items = await loadStageDocumentTemplateItems();
assert.equal(items.length, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(STAGE_DOCUMENT_TEMPLATE_VERSION, 'v20260629');
assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 54);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 66);

for (const item of items) {
  assert.equal(item.templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
  assert.notEqual(item.templateVersion, 'v20260610');
  assert.ok(Object.hasOwn(item, 'ownerDepartment'), `${item.documentCode} missing ownerDepartment`);
  assert.ok(Object.hasOwn(item, 'reviewDepartment'), `${item.documentCode} missing reviewDepartment`);
  assert.ok(Object.hasOwn(item, 'completionMode'), `${item.documentCode} missing completionMode`);
  assert.ok(
    Object.values(COMPLETION_MODE).includes(item.completionMode),
    `${item.documentCode} invalid completionMode`
  );
  assert.ok(
    item.ownerDepartment === null || isValidBusinessDepartment(item.ownerDepartment),
    `${item.documentCode} invalid ownerDepartment`
  );
  assert.ok(
    item.reviewDepartment === null || isValidBusinessDepartment(item.reviewDepartment),
    `${item.documentCode} invalid reviewDepartment`
  );
}

const byCode = new Map(items.map((item) => [item.documentCode, item]));
assert.equal(byCode.size, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(byCode.has('7.P1'), false);
assert.equal(byCode.has('8.P1'), false);
for (const excludedDocumentCode of EXCLUDED_V20260629_PROJECT_DOCUMENT_CODES) {
  assert.equal(byCode.has(excludedDocumentCode), false);
}
for (const targetOnlyDocumentCode of V20260629_TARGET_ONLY_DOCUMENT_CODES) {
  assert.equal(byCode.has(targetOnlyDocumentCode), true);
}
assert.deepEqual(
  [...items.reduce((counts, item) => counts.set(item.stageOrder, (counts.get(item.stageOrder) || 0) + 1), new Map())]
    .sort(([stageA], [stageB]) => stageA - stageB)
    .map(([stageOrder, count]) => `${stageOrder}:${count}`),
  ['1:3', '2:16', '3:5', '4:17', '5:21', '6:2', '7:5', '8:2']
);
assert.deepEqual(
  Object.fromEntries(
    Object.values(COMPLETION_MODE).map((completionMode) => [
      completionMode,
      items.filter((item) => item.completionMode === completionMode).length
    ])
  ),
  EXPECTED_COMPLETION_MODE_COUNTS
);
assert.equal(byCode.get('4.14').completionMode, COMPLETION_MODE.SUBMIT_ONLY);
assert.equal(byCode.get('4.15').completionMode, COMPLETION_MODE.SUBMIT_ONLY);
assert.equal(byCode.get('4.16').completionMode, COMPLETION_MODE.APPROVAL_REQUIRED);
assert.equal(byCode.get('3.4').completionMode, COMPLETION_MODE.SUBMIT_ONLY);
assert.equal(byCode.get('6.2').completionMode, COMPLETION_MODE.SUBMIT_ONLY);
assert.equal(byCode.get('8.1').completionMode, COMPLETION_MODE.SUBMIT_ONLY);
assert.equal(byCode.get('1.1').submitMode, 'online_form');
assert.equal(byCode.get('1.2').submitMode, 'online_form');
assert.equal(byCode.get('1.3').submitMode, 'online_form');
assert.equal(byCode.get('C19').submitMode, 'file_upload');
assert.equal(
  normalizeCreateProjectInput({
    projectName: '空编号项目',
    customerName: '客户',
    customerContactPerson: '联系人',
    customerContact: '13800000000',
    projectManagerUserId: '1',
    businessResponsibleUserId: '2',
    technicalResponsibleUserId: '3'
  }).projectCode,
  null
);
assert.equal(
  normalizeCreateProjectInput({
    projectCode: '',
    projectName: '空编号项目',
    customerName: '客户',
    customerContactPerson: '联系人',
    customerContact: '13800000000',
    projectManagerUserId: '1',
    businessResponsibleUserId: '2',
    technicalResponsibleUserId: '3'
  }).projectCode,
  null
);

assert.deepEqual(
  deriveStageDocumentCompletion({
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    status: DOCUMENT_STATUS.SUBMITTED,
    isApplicable: true
  }),
  {
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    isApplicable: true,
    isComplete: true,
    completionStatus: 'completed'
  }
);
assert.deepEqual(
  deriveStageDocumentCompletion({
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    status: DOCUMENT_STATUS.SUBMITTED,
    isApplicable: true
  }),
  {
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    isApplicable: true,
    isComplete: false,
    completionStatus: 'pending_review'
  }
);
assert.equal(
  deriveStageDocumentCompletion({
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    status: DOCUMENT_STATUS.RETURNED,
    isApplicable: true
  }).isComplete,
  false
);
const conditionalSummary = buildStageCompletenessSummary([
  {
    id: 1,
    documentCode: '2.6',
    documentName: '工艺时序图',
    isRequired: true,
    isApplicable: false,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    status: DOCUMENT_STATUS.NOT_SUBMITTED
  },
  {
    id: 2,
    documentCode: '2.7',
    documentName: '节拍表',
    isRequired: false,
    isApplicable: true,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    status: DOCUMENT_STATUS.NOT_SUBMITTED
  },
  {
    id: 3,
    documentCode: '2.8',
    documentName: '演示动画',
    isRequired: true,
    isApplicable: true,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    status: DOCUMENT_STATUS.SUBMITTED
  }
]);
assert.equal(conditionalSummary.requiredTotal, 2);
assert.equal(conditionalSummary.completedRequiredCount, 1);
assert.equal(conditionalSummary.incompleteRequiredCount, 1);
assert.deepEqual(
  conditionalSummary.incompleteRequiredDocuments.map((document) => document.documentCode),
  ['2.7']
);

const workbenchRepositorySource = await fs.readFile(
  new URL('../src/repositories/stageDocuments/workbenchRepository.js', import.meta.url),
  'utf8'
);
assert.equal(workbenchRepositorySource.includes('stage_gate_approval'), false);
assert.equal(workbenchRepositorySource.includes('PROJECT_APPROVAL_STATUS.APPROVED'), false);
assert.equal(workbenchRepositorySource.includes('approval_status = ?'), false);
assert.equal(workbenchRepositorySource.includes('stageApproval'), false);

const stageAdvanceRepositorySource = await fs.readFile(
  new URL('../src/repositories/projects/stageAdvanceRepository.js', import.meta.url),
  'utf8'
);
assert.equal(stageAdvanceRepositorySource.includes('PROJECT_APPROVAL_NOT_APPROVED'), false);
assert.equal(stageAdvanceRepositorySource.includes('approval_status !=='), false);

const projectDetailSource = await fs.readFile(
  new URL('../../digital-platform-web/src/pages/project-detail/ProjectDetailLayout.vue', import.meta.url),
  'utf8'
);
assert.equal(projectDetailSource.includes('ProjectStageApprovalPanel'), false);
assert.equal(projectDetailSource.includes('submitStageApproval'), false);
assert.equal(projectDetailSource.includes('stageApproval'), false);
assert.equal(projectDetailSource.includes('approvalStatus'), false);

const workbenchPageSource = await fs.readFile(
  new URL('../../digital-platform-web/src/pages/MyStageDocumentTasksPage.vue', import.meta.url),
  'utf8'
);
assert.equal(workbenchPageSource.includes('stage_gate_approval'), false);
assert.equal(workbenchPageSource.includes('待我阶段关口审批'), false);

const httpSource = await fs.readFile(
  new URL('../../digital-platform-web/src/api/http.js', import.meta.url),
  'utf8'
);
assert.equal(/PROJECT_APPROVAL_NOT_APPROVED[\s\S]*阶段关口审批未通过/.test(httpSource), false);
assert.deepEqual(
  {
    documentName: byCode.get('2.4').documentName,
    ownerDepartment: byCode.get('2.4').ownerDepartment,
    reviewDepartment: byCode.get('2.4').reviewDepartment
  },
  { documentName: '3D模型（方案设计）', ownerDepartment: RD_CENTER, reviewDepartment: RD_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('4.1').documentName,
    ownerDepartment: byCode.get('4.1').ownerDepartment,
    reviewDepartment: byCode.get('4.1').reviewDepartment
  },
  {
    documentName: '项目启动书',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('4.3').documentName,
    ownerDepartment: byCode.get('4.3').ownerDepartment,
    reviewDepartment: byCode.get('4.3').reviewDepartment
  },
  { documentName: '3D模型（详细设计）', ownerDepartment: RD_CENTER, reviewDepartment: RD_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('5.1').documentName,
    ownerDepartment: byCode.get('5.1').ownerDepartment,
    reviewDepartment: byCode.get('5.1').reviewDepartment
  },
  { documentName: '采购申请表', ownerDepartment: RD_CENTER, reviewDepartment: MANUFACTURING_CENTER }
);
assert.deepEqual(
  {
    isRequired: byCode.get('5.13').isRequired,
    documentName: byCode.get('5.13').documentName,
    ownerDepartment: byCode.get('5.13').ownerDepartment,
    reviewDepartment: byCode.get('5.13').reviewDepartment,
    applicabilityCondition: byCode.get('5.13').applicabilityCondition
  },
  {
    isRequired: false,
    documentName: '3D模型（设计变更）',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '发生设计变更时适用'
  }
);
assert.deepEqual(
  {
    ownerDepartment: byCode.get('6.1').ownerDepartment,
    reviewDepartment: byCode.get('6.1').reviewDepartment
  },
  { ownerDepartment: MANUFACTURING_CENTER, reviewDepartment: MARKETING_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('7.1').documentName,
    ownerDepartment: byCode.get('7.1').ownerDepartment,
    reviewDepartment: byCode.get('7.1').reviewDepartment
  },
  {
    documentName: '发货单',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('7.2').documentName,
    ownerDepartment: byCode.get('7.2').ownerDepartment,
    reviewDepartment: byCode.get('7.2').reviewDepartment
  },
  {
    documentName: '安装调试记录（现场）',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    isRequired: byCode.get('8.1').isRequired,
    documentName: byCode.get('8.1').documentName,
    ownerDepartment: byCode.get('8.1').ownerDepartment,
    reviewDepartment: byCode.get('8.1').reviewDepartment
  },
  {
    isRequired: false,
    documentName: '发票（尾款）',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('8.2').documentName,
    ownerDepartment: byCode.get('8.2').ownerDepartment,
    reviewDepartment: byCode.get('8.2').reviewDepartment
  },
  { documentName: '项目结题报告', ownerDepartment: null, reviewDepartment: null }
);

const unassignedRdDocument = makeDocument();
assert.equal(canViewStageDocumentItem(rdManager, { project, document: unassignedRdDocument }), true);
assert.equal(canViewStageDocumentItem(manufacturingManager, { project, document: unassignedRdDocument }), true);
assert.equal(canViewStageDocumentItem(generalManagerAssistant, { project, document: unassignedRdDocument }), true);
assert.equal(canViewStageDocumentItem(projectCreator, { project, document: unassignedRdDocument }), true);
assert.equal(canViewStageDocumentItem(rdEmployee, { project, document: unassignedRdDocument }), false);
const unassignedProjectManagerPermissions = buildStageDocumentPermissions({
  user: projectManager,
  project,
  document: unassignedRdDocument
});
assert.equal(unassignedProjectManagerPermissions.canViewAttachments, true);
assert.equal(unassignedProjectManagerPermissions.canDownloadAttachment, true);
assert.equal(unassignedProjectManagerPermissions.canUploadAttachment, false);
assert.equal(unassignedProjectManagerPermissions.canSubmitDocument, false);
const unassignedGeneralManagerPermissions = buildStageDocumentPermissions({
  user: generalManager,
  project,
  document: unassignedRdDocument
});
assert.equal(unassignedGeneralManagerPermissions.canViewAttachments, true);
assert.equal(unassignedGeneralManagerPermissions.canDownloadAttachment, true);
assert.equal(unassignedGeneralManagerPermissions.canUploadAttachment, false);
assert.equal(unassignedGeneralManagerPermissions.canSubmitDocument, false);
const unassignedCenterManagerPermissions = buildStageDocumentPermissions({
  user: rdManager,
  project,
  document: unassignedRdDocument
});
assert.equal(unassignedCenterManagerPermissions.canViewAttachments, true);
assert.equal(unassignedCenterManagerPermissions.canDownloadAttachment, true);
assert.equal(unassignedCenterManagerPermissions.canUploadAttachment, false);
assert.equal(unassignedCenterManagerPermissions.canSubmitDocument, false);
const crossCenterPermissions = buildStageDocumentPermissions({
  user: manufacturingManager,
  project,
  document: unassignedRdDocument
});
assert.equal(crossCenterPermissions.canViewAttachments, true);
assert.equal(crossCenterPermissions.canDownloadAttachment, true);
assert.equal(crossCenterPermissions.canUploadAttachment, false);
assert.equal(crossCenterPermissions.canDeleteAttachment, false);
assert.equal(crossCenterPermissions.canSubmitDocument, false);
assert.equal(crossCenterPermissions.canReviewDocument, false);
assert.equal(crossCenterPermissions.canManageResponsibility, false);
assert.equal(crossCenterPermissions.canChangeApplicability, false);
assert.equal(canAdvanceProjectStage(manufacturingManager, project), false);
const responsibleRdDocument = makeDocument({
  responsibleUserId: rdEmployee.id,
  responsibleUser: { department: RD_CENTER }
});
const rdResponsiblePermissions = buildStageDocumentPermissions({
  user: rdEmployee,
  project,
  document: responsibleRdDocument
});
assert.equal(rdResponsiblePermissions.canUploadAttachment, true);
assert.equal(rdResponsiblePermissions.canSubmitDocument, true);
const projectManagerNonResponsiblePermissions = buildStageDocumentPermissions({
  user: projectManager,
  project,
  document: responsibleRdDocument
});
assert.equal(projectManagerNonResponsiblePermissions.canViewAttachments, true);
assert.equal(projectManagerNonResponsiblePermissions.canDownloadAttachment, true);
assert.equal(projectManagerNonResponsiblePermissions.canUploadAttachment, false);
assert.equal(projectManagerNonResponsiblePermissions.canSubmitDocument, false);
const projectManagerResponsiblePermissions = buildStageDocumentPermissions({
  user: projectManager,
  project,
  document: makeDocument({
    responsibleUserId: projectManager.id,
    responsibleUser: { department: RD_CENTER }
  })
});
assert.equal(projectManagerResponsiblePermissions.canSubmitDocument, true);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: rdEmployee
  }),
  true
);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);

const initiationRequirementDocument = makeDocument({
  documentCode: '1.1',
  documentName: '项目需求表',
  ownerDepartment: RD_CENTER,
  reviewDepartment: MARKETING_CENTER,
  completionMode: COMPLETION_MODE.SUBMIT_ONLY
});
const initiationApprovalDocument = makeDocument({
  documentCode: '1.2',
  documentName: '项目立项审批表',
  ownerDepartment: RD_CENTER,
  reviewDepartment: MARKETING_CENTER,
  completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
});
const initiationNoticeDocument = makeDocument({
  documentCode: '1.3',
  documentName: '项目立项通知',
  ownerDepartment: MARKETING_CENTER,
  reviewDepartment: MARKETING_CENTER,
  completionMode: COMPLETION_MODE.SUBMIT_ONLY
});
assert.equal(
  buildStageDocumentPermissions({
    user: marketingManager,
    project,
    document: initiationRequirementDocument
  }).canManageResponsibility,
  true
);
assert.equal(
  buildStageDocumentPermissions({
    user: marketingManager,
    project,
    document: initiationApprovalDocument
  }).canManageResponsibility,
  false
);
for (const initiationResponsibilityDocument of [initiationRequirementDocument, initiationApprovalDocument]) {
  assert.equal(
    buildStageDocumentPermissions({
      user: rdManager,
      project,
      document: initiationResponsibilityDocument
    }).canManageResponsibility,
    false
  );
  assert.equal(
    buildStageDocumentPermissions({
      user: generalManager,
      project,
      document: initiationResponsibilityDocument
    }).canManageResponsibility,
    false
  );
  assert.equal(
    buildStageDocumentPermissions({
      user: generalManagerAssistant,
      project,
      document: initiationResponsibilityDocument
    }).canManageResponsibility,
    false
  );
  assert.equal(
    buildStageDocumentPermissions({
      user: systemAdmin,
      project,
      document: initiationResponsibilityDocument
    }).canManageResponsibility,
    false
  );
}
assert.equal(
  buildStageDocumentPermissions({
    user: marketingManager,
    project,
    document: initiationNoticeDocument
  }).canManageResponsibility,
  false
);

const submittedRdDocument = makeDocument({ status: DOCUMENT_STATUS.SUBMITTED });
const rdReviewOnlyPermissions = buildStageDocumentPermissions({
  user: rdManager,
  project,
  document: {
    ...submittedRdDocument,
    responsibleUserId: rdEmployee.id,
    responsibleUser: { department: RD_CENTER }
  }
});
assert.equal(rdReviewOnlyPermissions.canReviewDocument, true);
assert.equal(rdReviewOnlyPermissions.canUploadAttachment, false);
assert.equal(rdReviewOnlyPermissions.canSubmitDocument, false);
assert.equal(
  buildStageDocumentPermissions({ user: rdManager, project, document: submittedRdDocument }).canReviewDocument,
  true
);
assert.equal(
  buildStageDocumentPermissions({
    user: rdManager,
    project,
    document: makeDocument({
      completionMode: COMPLETION_MODE.SUBMIT_ONLY,
      status: DOCUMENT_STATUS.SUBMITTED
    })
  }).canReviewDocument,
  false
);

const costEstimateDocument = makeDocument({
  documentCode: '2.14',
  documentName: '成本估算表',
  ownerDepartment: RD_CENTER,
  reviewDepartment: OPERATIONS_CENTER
});
assert.equal(canManageStageDocumentApplicability(rdManager, { project, document: costEstimateDocument }), true);
assert.equal(
  canManageStageDocumentApplicability(operationsManager, { project, document: costEstimateDocument }),
  true
);
assert.equal(canManageStageDocumentApplicability(manufacturingManager, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(marketingManager, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(rdEmployee, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(systemAdmin, { project, document: costEstimateDocument }), false);
assert.equal(
  canManageStageDocumentApplicability(generalManagerAssistant, { project, document: costEstimateDocument }),
  false
);
assert.equal(canManageStageDocumentApplicability(generalManager, { project, document: costEstimateDocument }), true);

const submittedMarketingReviewDocument = makeDocument({
  documentCode: '6.1',
  documentName: '预验收单',
  ownerDepartment: MANUFACTURING_CENTER,
  reviewDepartment: MARKETING_CENTER,
  status: DOCUMENT_STATUS.SUBMITTED
});
assert.equal(
  buildStageDocumentPermissions({
    user: marketingManager,
    project,
    document: submittedMarketingReviewDocument
  }).canReviewDocument,
  true
);
assert.equal(
  buildStageDocumentPermissions({
    user: manufacturingManager,
    project,
    document: submittedMarketingReviewDocument
  }).canReviewDocument,
  false
);
assert.equal(
  canManageStageDocumentApplicability(manufacturingManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  true
);
assert.equal(
  canManageStageDocumentApplicability(marketingManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  true
);
assert.equal(
  canManageStageDocumentApplicability(rdManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  false
);

const reviewOnlyResponsibleDocument = makeDocument({
  ownerDepartment: null,
  reviewDepartment: MANUFACTURING_CENTER,
  responsibleUser: { department: RD_CENTER }
});
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: reviewOnlyResponsibleDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: reviewOnlyResponsibleDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);

const fallbackDocument = makeDocument({
  ownerDepartment: null,
  reviewDepartment: null,
  responsibleUser: { department: MANUFACTURING_CENTER }
});
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  true
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageStageDocumentApplicability(manufacturingManager, { project, document: fallbackDocument }),
  true
);
assert.equal(canManageStageDocumentApplicability(rdManager, { project, document: fallbackDocument }), false);

assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: RD_CENTER,
      reviewDepartment: RD_CENTER,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    RD_CENTER
  ),
  true
);
assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: RD_CENTER,
      reviewDepartment: RD_CENTER,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    MANUFACTURING_CENTER
  ),
  false
);
assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: null,
      reviewDepartment: null,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    MANUFACTURING_CENTER
  ),
  true
);

const systemAdminPermissions = buildStageDocumentPermissions({
  user: systemAdmin,
  project,
  document: submittedRdDocument
});
assert.equal(systemAdminPermissions.canViewAttachments, false);
assert.equal(systemAdminPermissions.canUploadAttachment, false);
assert.equal(systemAdminPermissions.canDownloadAttachment, false);
assert.equal(systemAdminPermissions.canDeleteAttachment, false);
assert.equal(systemAdminPermissions.canSubmitDocument, false);
assert.equal(systemAdminPermissions.canReviewDocument, false);
assert.equal(systemAdminPermissions.canManageResponsibility, false);
assert.equal(systemAdminPermissions.canChangeApplicability, false);

const assistantPermissions = buildStageDocumentPermissions({
  user: generalManagerAssistant,
  project,
  document: submittedRdDocument
});
assert.equal(assistantPermissions.canViewAttachments, true);
assert.equal(assistantPermissions.canUploadAttachment, false);
assert.equal(assistantPermissions.canDownloadAttachment, true);
assert.equal(assistantPermissions.canDeleteAttachment, false);
assert.equal(assistantPermissions.canSubmitDocument, false);
assert.equal(assistantPermissions.canReviewDocument, false);
assert.equal(assistantPermissions.canManageResponsibility, false);
assert.equal(assistantPermissions.canChangeApplicability, false);

const creatorPermissions = buildStageDocumentPermissions({
  user: projectCreator,
  project,
  document: submittedRdDocument
});
assert.equal(creatorPermissions.canViewAttachments, true);
assert.equal(creatorPermissions.canUploadAttachment, false);
assert.equal(creatorPermissions.canDownloadAttachment, true);
assert.equal(creatorPermissions.canDeleteAttachment, false);
assert.equal(creatorPermissions.canSubmitDocument, false);
assert.equal(creatorPermissions.canReviewDocument, false);
assert.equal(creatorPermissions.canManageResponsibility, false);
assert.equal(creatorPermissions.canChangeApplicability, false);

assert.equal(canViewProjectOperationLogs(generalManagerAssistant, project), true);
assert.equal(canViewProjectOperationLogs(manufacturingManager, project), true);
assert.equal(canViewProjectOperationLogs(projectCreator, project), true);
assert.equal(canViewProjectOperationLogs(projectManager, project), true);
assert.equal(canViewProjectOperationLogs(rdEmployee, project), false);
assert.equal(canViewProjectOperationLogs(systemAdmin, project), false);
assert.equal(canViewCompleteProjectAudit(generalManager, project), true);
assert.equal(canViewCompleteProjectAudit(projectManager, project), true);
assert.equal(canViewCompleteProjectAudit(generalManagerAssistant, project), false);
assert.equal(canViewCompleteProjectAudit(manufacturingManager, project), false);
assert.equal(canViewCompleteProjectAudit(projectCreator, project), false);
assert.equal(canViewCompleteProjectAudit(rdEmployee, project), false);
assert.equal(canViewCompleteProjectAudit(systemAdmin, project), false);
assert.equal(canAdvanceProjectStage(projectCreator, project), false);
assert.equal(canAdvanceProjectStage(generalManagerAssistant, project), false);
assert.equal(canAdvanceProjectStage(systemAdmin, project), false);

const [databaseRows] = await pool.query('SELECT DATABASE() AS currentDatabase');
assert.equal(databaseRows[0].currentDatabase, 'digital_platform');
await ensureProjectWorkspaceSchema(pool);
const projectWorkspaceSchemaStatus = await inspectProjectWorkspaceSchema(pool);
assert.deepEqual(projectWorkspaceSchemaStatus, {
  projectsCustomerContact: true,
  projectsCustomerContactPerson: true,
  projectsProjectManagerNullable: true,
  projectsProjectModeNullable: true,
  projectsStatusSupportsEnded: true,
  projectsBusinessResponsibleUserId: true,
  projectsTechnicalResponsibleUserId: true,
  projectsEndedReason: true,
  projectsEndedByUserId: true,
  projectsEndedAt: true,
  projectStageDocumentFormsTable: true
});
await ensureStageDocumentSchema(pool);
await ensureSolutionDesignWorkflowSchema(pool);
await upsertStageDocumentTemplates(pool, items);
await initializeInitiationReviewNodesForExistingProjects(pool);

const [activeTemplateRows] = await pool.query(
  `SELECT template_version AS templateVersion, COUNT(*) AS count
   FROM stage_document_templates
   WHERE is_active = 1
   GROUP BY template_version
   ORDER BY template_version`
);
assert.equal(activeTemplateRows.length, 1);
assert.equal(activeTemplateRows[0].templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
assert.equal(Number(activeTemplateRows[0].count), EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);

const [projectCodeColumnRows] = await pool.query(
  `SELECT IS_NULLABLE AS isNullable
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'projects'
     AND COLUMN_NAME = 'project_code'`
);
assert.equal(projectCodeColumnRows[0]?.isNullable, 'YES');

const [templateCompletionRows] = await pool.query(
  `SELECT completion_mode AS completionMode, COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
   GROUP BY completion_mode
   ORDER BY completion_mode`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
assert.deepEqual(
  mapCompletionModeCountRows(templateCompletionRows),
  EXPECTED_COMPLETION_MODE_COUNTS
);

const [excludedTemplateRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
     AND document_code IN ('7.P1', '8.P1', '3.3', '5.4', 'LC33', 'LC54')`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
assert.equal(Number(excludedTemplateRows[0].count), 0);

const [invalidDepartmentRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
     AND (
       (owner_department IS NOT NULL AND owner_department NOT IN (?, ?, ?, ?))
       OR (review_department IS NOT NULL AND review_department NOT IN (?, ?, ?, ?))
     )`,
  [
    STAGE_DOCUMENT_TEMPLATE_VERSION,
    OPERATIONS_CENTER,
    MARKETING_CENTER,
    MANUFACTURING_CENTER,
    RD_CENTER,
    OPERATIONS_CENTER,
    MARKETING_CENTER,
    MANUFACTURING_CENTER,
    RD_CENTER
  ]
);
assert.equal(Number(invalidDepartmentRows[0].count), 0);

const [templateDistributionRows] = await pool.query(
  `SELECT stage_order AS stageOrder, COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
   GROUP BY stage_order
   ORDER BY stage_order`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
assert.deepEqual(
  templateDistributionRows.map((row) => `${row.stageOrder}:${Number(row.count)}`),
  ['1:3', '2:16', '3:5', '4:17', '5:21', '6:2', '7:5', '8:2']
);

const [projectDocumentRows] = await pool.query(
  `SELECT project_id AS projectId, template_version AS templateVersion, COUNT(*) AS documentCount
   FROM project_stage_documents
   GROUP BY project_id, template_version
   ORDER BY project_id, template_version`
);
const projectTemplateVersions = new Map();
for (const row of projectDocumentRows) {
  if (!projectTemplateVersions.has(row.projectId)) {
    projectTemplateVersions.set(row.projectId, []);
  }
  projectTemplateVersions.get(row.projectId).push(row.templateVersion);

  if (row.templateVersion === STAGE_DOCUMENT_TEMPLATE_VERSION) {
    assert.equal(
      Number(row.documentCount),
      EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
      `Project ${row.projectId} should have ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT} v20260629 stage documents`
    );
    continue;
  }

  if (row.templateVersion === LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION) {
    assert.equal(
      Number(row.documentCount),
      LEGACY_STAGE_DOCUMENT_ITEM_COUNT,
      `Project ${row.projectId} should keep ${LEGACY_STAGE_DOCUMENT_ITEM_COUNT} legacy stage documents`
    );
    continue;
  }

  assert.fail(`Unexpected project stage document template version: ${row.projectId}/${row.templateVersion}`);
}
for (const [projectId, templateVersions] of projectTemplateVersions) {
  assert.equal(templateVersions.length, 1, `Project ${projectId} must not mix template versions`);
}

const [staleProjectDocumentRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM project_stage_documents
   WHERE template_version NOT IN (?, ?)`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION, LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION]
);
assert.equal(Number(staleProjectDocumentRows[0].count), 0);

const [projectDocumentCompletionRows] = await pool.query(
  `SELECT completion_mode AS completionMode, COUNT(*) AS count
   FROM project_stage_documents
   WHERE template_version = ?
   GROUP BY completion_mode
   ORDER BY completion_mode`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
const expectedProjectCompletionCounts = Object.fromEntries(
  Object.entries(EXPECTED_COMPLETION_MODE_COUNTS).map(([completionMode, count]) => [
    completionMode,
    count * projectDocumentRows.filter((row) => row.templateVersion === STAGE_DOCUMENT_TEMPLATE_VERSION).length
  ])
);
assert.deepEqual(
  mapCompletionModeCountRows(projectDocumentCompletionRows),
  expectedProjectCompletionCounts
);

await runProjectLifecycleSmoke();

const [projectRows] = await pool.query('SELECT COUNT(*) AS count FROM projects');
const projectCount = Number(projectRows[0].count);
const [projectStageResetRows] = await pool.query(
  `SELECT
     COUNT(*) AS totalStages,
     SUM(is_current = 1) AS currentStages,
     SUM(is_current = 1 AND stage_status = 'current') AS currentStatusStages
   FROM project_stages`
);
assert.equal(Number(projectStageResetRows[0].totalStages), projectCount * 8);
assert.equal(Number(projectStageResetRows[0].currentStages), projectCount);
assert.equal(Number(projectStageResetRows[0].currentStatusStages), projectCount);

const [approvalHistoryRows] = await pool.query('SELECT COUNT(*) AS count FROM project_stage_approval_history');
assert.equal(Number(approvalHistoryRows[0].count), 0);

const [oldOperationLogRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM business_operation_logs
   WHERE action_type LIKE 'document.%'
     OR action_type LIKE 'approval.%'
     OR action_type IN ('stage.advanced', 'project.completed')`
);
assert.ok(Number(oldOperationLogRows[0].count) >= 0);

await closePool();

console.log('Stage document ownership smoke passed');
