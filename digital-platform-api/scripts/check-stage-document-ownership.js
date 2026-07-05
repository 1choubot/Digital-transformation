import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { closePool, pool } from '../src/db/pool.js';
import {
  ensureProjectWorkspaceSchema,
  inspectProjectWorkspaceSchema
} from '../src/db/projectWorkspaceSchema.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';
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
  getProjectStageDocumentChecklist,
  getStageDocumentOnlineForm,
  getMyWorkbench,
  initializeInitiationReviewNodesForExistingProjects,
  listMyStageDocumentTasks,
  normalizeStageDocumentTaskFilters,
  returnInitiationReviewNode,
  saveStageDocumentOnlineForm,
  submitStageDocumentOnlineForm,
  upsertStageDocumentTemplates,
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
import { errorHandler } from '../src/middleware/errorHandler.js';
import { cleanupStageDocumentAttachmentFile } from '../src/storage/stageDocumentAttachmentStorage.js';
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
      END,
       responsible_user_id = CASE document_code
        WHEN '1.2' THEN ?
        ELSE responsible_user_id
      END
     WHERE project_id = ?
       AND document_code IN ('1.1', '1.2', '1.3')`,
    [
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.SUBMITTED,
      submitterUser.id,
      projectId
    ]
  );
  const initiationDocument = await selectSmokeDocument(projectId, '1.2');
  if (initiationDocument.status !== DOCUMENT_STATUS.SUBMITTED) {
    await submitStageDocumentOnlineForm({
      projectId,
      documentId: initiationDocument.id,
      user: submitterUser,
      formData: {
        projectOverview: 'smoke project overview',
        marketAssessment: 'smoke market assessment',
        technicalPlan: 'smoke technical plan',
        budgetEstimate: 'smoke budget estimate',
        riskAssessment: 'smoke risk assessment'
      }
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
    comment: 'smoke general approval'
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

async function prepareInitiationSmokeBase(projectId, submitterUser) {
  await pool.execute(
    `UPDATE project_stage_documents
     SET status = CASE document_code
       WHEN '1.1' THEN ?
       WHEN '1.2' THEN ?
       WHEN '1.3' THEN ?
       ELSE status
      END,
       responsible_user_id = CASE document_code
        WHEN '1.2' THEN ?
        ELSE responsible_user_id
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
      submitterUser.id,
      projectId
    ]
  );
  const initiationDocument = await selectSmokeDocument(projectId, '1.2');
  await submitStageDocumentOnlineForm({
    projectId,
    documentId: initiationDocument.id,
    user: submitterUser,
    formData: {
      projectOverview: 'smoke project overview',
      marketAssessment: 'smoke market assessment',
      technicalPlan: 'smoke technical plan',
      budgetEstimate: 'smoke budget estimate',
      riskAssessment: 'smoke risk assessment'
    }
  });

  return selectSmokeDocument(projectId, '1.2');
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
  const initiationDocument = await prepareInitiationSmokeBase(projectId, managerUser);
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
  const initiationDocument = await prepareInitiationSmokeBase(projectId, managerUser);
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
        formData: { projectBackground: 'ended', customerNeed: 'ended', scope: 'ended', expectedValue: 'ended' }
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
        formData: {
          projectName: 'smoke project',
          projectCode: 'SMOKE-PENDING',
          noticeContent: 'smoke initiation notice blocked by gate',
          effectiveDate: '2026-07-01'
        }
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

async function submitInitiationNoticeAfterGateReady(projectId, user) {
  const notice = await resetInitiationNoticeForSubmit(projectId, user);
  const result = await submitStageDocumentOnlineForm({
    projectId,
    documentId: notice.id,
    user,
    formData: {
      projectName: 'smoke project',
      projectCode: 'SMOKE-PENDING',
      noticeContent: 'smoke initiation notice',
      effectiveDate: '2026-07-01'
    }
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
  const requirementFormData = {
    projectBackground: 'smoke requirement background',
    customerNeed: 'smoke customer need',
    scope: 'smoke scope',
    expectedValue: 'smoke expected value'
  };
  const initiationFormData = {
    projectOverview: 'smoke project overview',
    marketAssessment: 'smoke market assessment',
    technicalPlan: 'smoke technical plan',
    budgetEstimate: 'smoke budget estimate',
    riskAssessment: 'smoke risk assessment'
  };
  const noticeFormData = {
    projectName: 'smoke project',
    projectCode: 'SMOKE-PENDING',
    noticeContent: 'smoke initiation notice',
    effectiveDate: '2026-07-01'
  };

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
  assert.equal(
    workspaceOutputCodes.size,
    V20260629_TARGET_TEMPLATE_OUTPUT_COUNT
  );
  assert.equal(
    workspaceOutputs.filter((output) => !LEGACY_CONTRACT_REVIEW_COMPATIBILITY_OUTPUT_CODES.has(output.targetOutputCode)).length,
    V20260629_TARGET_TEMPLATE_OUTPUT_COUNT
  );
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
  assert.ok(solutionStage.nodes.some((node) => node.nodeKey === 'solution_design'));
  const solutionPlanOutput = findWorkspaceOutput(workspace, '2.1');
  assert.equal(solutionPlanOutput.formAvailable, false);
  assert.equal(solutionPlanOutput.legacyChecklistTarget.available, true);
  assert.ok(solutionPlanOutput.actionHints.includes('view_attachments'));
  const tenderOutput = findWorkspaceOutput(workspace, 'C19');
  assert.ok(tenderOutput.documentId);
  assert.equal(tenderOutput.documentCode, 'C19');
  assert.equal(tenderOutput.status, 'waiting_submission');
  assert.equal(tenderOutput.legacyChecklistTarget.available, true);

  const marketingResponsibilityChecklist = await getProjectStageDocumentChecklist(projectId, marketingManagerUser);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.1').canManageResponsibility, true);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.2').canManageResponsibility, true);
  assert.equal(findChecklistDocument(marketingResponsibilityChecklist, '1.3').canManageResponsibility, false);
  const marketingResponsibilityWorkspace = await getProjectWorkspace(projectId, marketingManagerUser);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.1').permissions.canManageResponsibility, true);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.2').permissions.canManageResponsibility, true);
  assert.equal(findWorkspaceOutput(marketingResponsibilityWorkspace, '1.3').permissions.canManageResponsibility, false);
  const rdResponsibilityChecklist = await getProjectStageDocumentChecklist(projectId, managerUser);
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

  const requirementDocument = await selectSmokeDocument(projectId, '1.1');
  assert.equal(requirementDocument.responsible_user_id, marketingManagerUser.id);
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
          customerNeed: 'tampered requirement after submit'
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
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: managerUser,
        formData: initiationFormData
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
  await updateProjectStageDocumentResponsibleUser({
    projectId,
    documentId: initialInitiationDocument.id,
    responsibleUserId: managerUser.id,
    user: marketingManagerUser
  });
  await assert.rejects(
    () =>
      submitStageDocumentOnlineForm({
        projectId,
        documentId: initialInitiationDocument.id,
        user: marketingManagerUser,
        formData: initiationFormData
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await assertOrdinaryOnlineFormDocumentSubmitRejected({
    projectId,
    documentCode: '1.2',
    user: managerUser
  });
  const submittedInitiationResult = await submitStageDocumentOnlineForm({
    projectId,
    documentId: initialInitiationDocument.id,
    user: managerUser,
    formData: initiationFormData
  });
  assert.equal(submittedInitiationResult.form.permissions.canEdit, false);
  assert.equal(submittedInitiationResult.form.permissions.canSubmit, false);
  assert.ok(submittedInitiationResult.form.blockingReasons.some((reason) => String(reason).includes('submitted')));
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
          projectOverview: 'tampered initiation after submit'
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
          projectOverview: 'duplicate submit should fail'
        }
      }),
    (error) => error.code === 'FORM_DOCUMENT_NOT_EDITABLE' && error.statusCode === 409
  );
  initiationFormRow = await selectOnlineFormRow(initialInitiationDocument.id);
  assert.equal(initiationFormRow.status, 'submitted');
  assert.deepEqual(parseFormDataJson(initiationFormRow), submittedInitiationFormData);
  assert.equal((await selectSmokeDocument(projectId, '1.2')).status, DOCUMENT_STATUS.SUBMITTED);
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
     SET responsible_user_id = ?
     WHERE project_id = ?
       AND document_code = '1.3'`,
    [marketingManagerUser.id, projectId]
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
  const noticeTodoBeforeInitiationApproval = workbenchBeforeInitiationApproval.items.find(
    (item) => item.projectId === projectId && item.type === 'document_responsibility' && item.documentCode === '1.3'
  );
  assert.ok(noticeTodoBeforeInitiationApproval);
  assert.equal(noticeTodoBeforeInitiationApproval.permissions.canSubmitDocument, false);
  assert.equal(noticeTodoBeforeInitiationApproval.actionText.includes('提交'), false);
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
    (error) => error instanceof ProjectCodeUpdateError && error.code === 'PROJECT_CODE_GATE_NOT_READY'
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
    comment: 'general approval'
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
     SET responsible_user_id = ?,
       status = ?
     WHERE project_id = ?
       AND document_code = '1.3'`,
    [marketingManagerUser.id, DOCUMENT_STATUS.NOT_SUBMITTED, projectId]
  );
  const workbenchAfterInitiationApproval = await getMyWorkbench(marketingManagerUser);
  const noticeTodoAfterInitiationApproval = workbenchAfterInitiationApproval.items.find(
    (item) => item.projectId === projectId && item.type === 'document_responsibility' && item.documentCode === '1.3'
  );
  assert.ok(noticeTodoAfterInitiationApproval);
  assert.equal(noticeTodoAfterInitiationApproval.permissions.canSubmitDocument, false);
  assert.match(noticeTodoAfterInitiationApproval.actionText, /在线表单/);
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
  const noticeTodoWithRequirementRework = workbenchWithRequirementRework.items.find(
    (item) => item.projectId === projectId && item.type === 'document_responsibility' && item.documentCode === '1.3'
  );
  assert.ok(noticeTodoWithRequirementRework);
  assert.equal(noticeTodoWithRequirementRework.permissions.canSubmitDocument, false);
  assert.equal(noticeTodoWithRequirementRework.actionText.includes('提交'), false);
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-REWORK-GATE-${uniqueSuffix}`,
        user: managerUser
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
  const submittedNotice = await submitInitiationNoticeAfterGateReady(projectId, marketingManagerUser);
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
          noticeContent: 'tampered notice after submit'
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
          noticeContent: 'duplicate notice submit should fail'
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
  await assert.rejects(
    () =>
      updateProjectCode({
        projectId,
        projectCode: `SMOKE-INIT-ADMIN-${uniqueSuffix}`,
        user: systemAdminUser
      }),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
  await updateProjectCode({
    projectId,
    projectCode: `SMOKE-INIT-${uniqueSuffix}`,
    user: managerUser
  });
  await advanceProjectStage(projectId, managerUser);

  const returnProjectId = await createInitiationSmokeProject({
    uniqueSuffix,
    projectManagerUser: managerUser,
    businessResponsibleUser: marketingManagerUser,
    technicalResponsibleUser: managerUser,
    createdByUserId: managerUser.id,
    label: 'return',
    smokeProjectIds
  });
  const returnInitiationDocument = await prepareInitiationSmokeBase(returnProjectId, managerUser);
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
  assert.equal(String(returnedInitiation.responsible_user_id), String(managerUser.id));
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
          projectOverview: 'blocked refill before 1.1 rework clear'
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
          projectOverview: 'blocked submit before 1.1 rework clear'
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
        user: managerUser
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
  const initiationRefillTodo = reworkWorkbench.items.find(
    (item) =>
      item.type === 'document_responsibility' &&
      item.projectId === returnProjectId &&
      item.documentCode === '1.2'
  );
  assert.ok(initiationRefillTodo);
  assert.equal(initiationRefillTodo.permissions.canSubmitDocument, false);
  assert.match(initiationRefillTodo.actionText, /在线表单/);
  assert.match(initiationRefillTodo.actionText, /前置状态/);
  assert.equal(/提交资料|完成返工|返工重提/.test(initiationRefillTodo.actionText), false);
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
      projectBackground: 'smoke requirement rework via online form'
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
  await submitStageDocumentOnlineForm({
    projectId: returnProjectId,
    documentId: returnInitiationDocument.id,
    user: managerUser,
    formData: {
      ...initiationFormData,
      projectOverview: 'smoke project overview after general return'
    }
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
    comment: 'general approval after refill'
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
    (error) => error instanceof ProjectCodeUpdateError && error.code === 'PROJECT_CODE_GATE_NOT_READY'
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
  await submitStageDocumentOnlineForm({
    projectId: returnedBaseProjectId,
    documentId: returnedBaseInitiation.id,
    user: managerUser,
    formData: initiationFormData
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
    const updatedProjectCodeDetail = await updateProjectCode({
      projectId: projectAId,
      projectCode: duplicateProjectCode,
      user: managerUser
    });
    assert.equal(updatedProjectCodeDetail.project.projectCode, duplicateProjectCode);
    assert.deepEqual(await countSmokeProjectObjects(projectAId), beforeProjectCodeCountsA);

    await assert.rejects(
      () =>
        updateProjectCode({
          projectId: projectBId,
          projectCode: `SMOKE-GATE-${uniqueSuffix}`,
          user: managerUser
        }),
      (error) =>
        error instanceof ProjectCodeUpdateError &&
        error.code === 'PROJECT_CODE_GATE_NOT_READY' &&
        error.details.includes('1.3')
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
          user: managerUser
      }),
      DuplicateProjectCodeError
    );

    const beforeProjectCodeCountsB = await countSmokeProjectObjects(projectBId);
    const updatedProjectCodeDetailB = await updateProjectCode({
      projectId: projectBId,
      projectCode: `SMOKE-B-${uniqueSuffix}`,
      user: managerUser
    });
    assert.equal(updatedProjectCodeDetailB.project.projectCode, `SMOKE-B-${uniqueSuffix}`);
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
    assert.ok(
      workbenchBeforeAdvance.items.some(
        (item) => item.type === 'stage_advance' && item.projectId === projectBId
      )
    );

    const advanced = await advanceProjectStage(projectAId, managerUser);
    assert.equal(advanced.nextStage.stageOrder, 2);

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
    assert.ok(
      workbenchAfterRevisionCleared.items.some(
        (item) => item.type === 'stage_advance' && item.projectId === projectAId
      )
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
    assert.ok(
      workbenchAfterConditionalSubmit.items.some(
        (item) => item.type === 'stage_advance' && item.projectId === projectAId
      )
    );
    const advancedAfterConditionalSubmit = await advanceProjectStage(projectAId, managerUser);
    assert.equal(advancedAfterConditionalSubmit.nextStage.stageOrder, 3);

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
  new URL('../../digital-platform-web/src/pages/ProjectDetailPage.vue', import.meta.url),
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
for (const initiationResponsibilityDocument of [initiationRequirementDocument, initiationApprovalDocument]) {
  assert.equal(
    buildStageDocumentPermissions({
      user: marketingManager,
      project,
      document: initiationResponsibilityDocument
    }).canManageResponsibility,
    true
  );
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
