import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE
} from '../../domain/organization.js';
import { pool } from '../../db/pool.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REVIEW_NODE_DEFINITIONS,
  INITIATION_REVIEW_NODE_KEY,
  INITIATION_REVIEW_NODE_STATUS,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  assertInitiationReviewNodeKey,
  canUserReviewInitiationNode,
  getInitialInitiationReviewNodeStatus,
  getInitiationReviewNodeActionType,
  getInitiationReviewNodeDefinition,
  isInitiationReviewBaseSubmitted,
  isInitiationReviewDocument,
  isInitiationReviewDocumentCode
} from '../../domain/initiationReview.js';
import { normalizeReturnReason } from '../../domain/stageDocumentStatus.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import { mapDocument } from './shared.js';

export const INITIATION_REVIEW_TODO_TYPE = 'initiation_review';

export class InitiationReviewError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'InitiationReviewError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getDocumentId(document) {
  return document?.id ?? document?.documentId ?? document?.document_id ?? null;
}

function getDocumentStatus(document) {
  return document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
}

function getProjectId(document) {
  return document?.projectId ?? document?.project_id ?? null;
}

function getRevisionSourceDocumentId(document) {
  return document?.revisionSourceDocumentId ?? document?.revision_source_document_id ?? null;
}

function isRevisionRequired(document) {
  const value = document?.revisionRequired ?? document?.revision_required;
  return value === true || value === 1 || value === '1';
}

function isDocumentApplicable(document) {
  const value = document?.isApplicable ?? document?.is_applicable;
  return value === undefined ? true : Boolean(value);
}

function getNodeStatus(node) {
  return node?.nodeStatus ?? node?.node_status ?? null;
}

function cloneRowWithInitiationReview(row, initiationReview) {
  return {
    ...row,
    initiationReview
  };
}

function mapReviewerUser(row) {
  if (!row.reviewer_user_id) {
    return null;
  }

  return {
    id: row.reviewer_user_id,
    account: row.reviewer_account,
    name: row.reviewer_display_name,
    department: row.reviewer_department_value,
    organizationRole: row.reviewer_organization_role,
    role: row.reviewer_role_value,
    isEnabled: row.reviewer_is_enabled === null ? null : Boolean(row.reviewer_is_enabled)
  };
}

function mapReviewedByUser(row) {
  if (!row.reviewed_by_user_id) {
    return null;
  }

  return {
    id: row.reviewed_by_user_id,
    account: row.reviewed_by_account,
    name: row.reviewed_by_display_name,
    department: row.reviewed_by_department,
    organizationRole: row.reviewed_by_organization_role,
    role: row.reviewed_by_role,
    isEnabled: row.reviewed_by_is_enabled === null ? null : Boolean(row.reviewed_by_is_enabled)
  };
}

function mapNode(row, user = null, document = null, blockedByRework = false) {
  const definition = getInitiationReviewNodeDefinition(row.node_key);
  const canAct =
    Boolean(user) &&
    getNodeStatus(row) === INITIATION_REVIEW_NODE_STATUS.PENDING &&
    isInitiationReviewBaseSubmitted(getDocumentStatus(document)) &&
    !blockedByRework &&
    canUserReviewInitiationNode(user, row.node_key);

  return {
    id: row.id ?? null,
    nodeKey: row.node_key,
    nodeName: definition?.nodeName ?? row.node_key,
    nodeStatus: row.node_status,
    reviewerRole: row.reviewer_role,
    reviewerDepartment: row.reviewer_department ?? null,
    reviewerUserId: row.reviewer_user_id ?? null,
    reviewerUser: mapReviewerUser(row),
    reviewedByUserId: row.reviewed_by_user_id ?? null,
    reviewedByUser: mapReviewedByUser(row),
    comment: row.comment ?? null,
    returnReason: row.return_reason ?? null,
    submittedByUserId: row.submitted_by_user_id ?? null,
    submittedAt: row.submitted_at ?? null,
    reviewedAt: row.reviewed_at ?? null,
    invalidatedAt: row.invalidated_at ?? null,
    invalidatedReason: row.invalidated_reason ?? null,
    canApprove: canAct,
    canReturn: canAct,
    canAct
  };
}

function buildSyntheticNode(definition, document) {
  return {
    id: null,
    project_id: getProjectId(document),
    stage_document_id: getDocumentId(document),
    node_key: definition.nodeKey,
    node_status: getInitialInitiationReviewNodeStatus(definition.nodeKey, getDocumentStatus(document)),
    reviewer_role: definition.reviewerRole,
    reviewer_department: definition.reviewerDepartment,
    reviewer_user_id: null,
    comment: null,
    return_reason: null,
    submitted_by_user_id: null,
    submitted_at: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    invalidated_at: null,
    invalidated_reason: null
  };
}

function isReworkBlockingInitiationDocument({ initiationDocument, reworkTargetDocument }) {
  if (!reworkTargetDocument || !isRevisionRequired(reworkTargetDocument)) {
    return false;
  }

  const sourceDocumentId = getRevisionSourceDocumentId(reworkTargetDocument);
  return Boolean(sourceDocumentId) && String(sourceDocumentId) === String(getDocumentId(initiationDocument));
}

function buildInitiationReviewPayload({ document, nodes, reworkTargetDocument = null, user = null }) {
  const nodesByKey = new Map(nodes.map((node) => [node.node_key, node]));
  const blockedByRework = isReworkBlockingInitiationDocument({
    initiationDocument: document,
    reworkTargetDocument
  });
  const mappedNodes = INITIATION_REVIEW_NODE_DEFINITIONS.map((definition) =>
    mapNode(nodesByKey.get(definition.nodeKey) || buildSyntheticNode(definition, document), user, document, blockedByRework)
  );
  const nodeStatusByKey = Object.fromEntries(mappedNodes.map((node) => [node.nodeKey, node.nodeStatus]));
  const isBaseSubmitted = isInitiationReviewBaseSubmitted(getDocumentStatus(document));
  const isComplete =
    isDocumentApplicable(document) &&
    isBaseSubmitted &&
    !blockedByRework &&
    mappedNodes.every((node) => node.nodeStatus === INITIATION_REVIEW_NODE_STATUS.APPROVED);
  const blockingReasons = [];

  if (!isBaseSubmitted) {
    blockingReasons.push(
      getDocumentStatus(document) === DOCUMENT_STATUS.RETURNED
        ? '1.2 资料基础状态为 returned，需先通过普通资料入口重新提交'
        : '1.2 资料尚未通过普通资料入口提交'
    );
  }
  for (const node of mappedNodes) {
    if (node.nodeStatus !== INITIATION_REVIEW_NODE_STATUS.APPROVED) {
      blockingReasons.push(`${node.nodeName}未最终通过`);
    }
  }
  if (blockedByRework) {
    blockingReasons.push('1.1 项目需求表返工未清除');
  }

  return {
    documentCode: INITIATION_REVIEW_DOCUMENT_CODE,
    isComplete,
    blockedByRework,
    reworkTargetDocumentCode: INITIATION_REWORK_TARGET_DOCUMENT_CODE,
    reworkTargetDocumentId: reworkTargetDocument ? getDocumentId(reworkTargetDocument) : null,
    nodeStatusByKey,
    blockingReasons,
    nodes: mappedNodes
  };
}

function buildNodeInsertValues(document, submittedByUserId = null) {
  return INITIATION_REVIEW_NODE_DEFINITIONS.map((definition) => [
    getProjectId(document),
    getDocumentId(document),
    definition.nodeKey,
    getInitialInitiationReviewNodeStatus(definition.nodeKey, getDocumentStatus(document)),
    definition.reviewerRole,
    definition.reviewerDepartment,
    isInitiationReviewBaseSubmitted(getDocumentStatus(document)) ? submittedByUserId : null,
    isInitiationReviewBaseSubmitted(getDocumentStatus(document)) ? new Date() : null
  ]);
}

export async function ensureInitiationReviewNodesForDocument(executor, document, submittedByUserId = null) {
  if (!isInitiationReviewDocument(document) || !isDocumentApplicable(document)) {
    return;
  }

  const placeholders = buildNodeInsertValues(document, submittedByUserId)
    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?)')
    .join(', ');
  const values = buildNodeInsertValues(document, submittedByUserId).flat();

  await executor.execute(
    `INSERT INTO project_initiation_review_nodes (
      project_id,
      stage_document_id,
      node_key,
      node_status,
      reviewer_role,
      reviewer_department,
      submitted_by_user_id,
      submitted_at
    ) VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE id = id`,
    values
  );
}

export async function initializeInitiationReviewNodesForProject(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND document_code = ?
    LIMIT 1`,
    [projectId, INITIATION_REVIEW_DOCUMENT_CODE]
  );

  if (rows.length === 0) {
    return { initialized: false, nodeCount: 0 };
  }

  await ensureInitiationReviewNodesForDocument(executor, rows[0]);

  return { initialized: true, nodeCount: INITIATION_REVIEW_NODE_DEFINITIONS.length };
}

export async function initializeInitiationReviewNodesForExistingProjects(executor) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE document_code = ?
      AND is_applicable = 1
    ORDER BY project_id ASC, id ASC`,
    [INITIATION_REVIEW_DOCUMENT_CODE]
  );

  for (const row of rows) {
    await ensureInitiationReviewNodesForDocument(executor, row);
  }

  return {
    documents: rows.length,
    nodes: rows.length * INITIATION_REVIEW_NODE_DEFINITIONS.length
  };
}

export async function ensureMissingInitiationReviewNodesForWorkbench(executor) {
  const [rows] = await executor.execute(
    `SELECT d.*
    FROM project_stage_documents d
    WHERE d.document_code = ?
      AND d.is_applicable = 1
      AND (
        SELECT COUNT(*)
        FROM project_initiation_review_nodes n
        WHERE n.stage_document_id = d.id
      ) < ?`,
    [INITIATION_REVIEW_DOCUMENT_CODE, INITIATION_REVIEW_NODE_DEFINITIONS.length]
  );

  for (const row of rows) {
    await ensureInitiationReviewNodesForDocument(executor, row);
  }

  return {
    documents: rows.length,
    nodes: rows.length * INITIATION_REVIEW_NODE_DEFINITIONS.length
  };
}

async function selectInitiationReviewNodes(executor, documentIds, { forUpdate = false } = {}) {
  if (documentIds.length === 0) {
    return [];
  }

  const [rows] = await executor.execute(
    `SELECT
      n.*,
      reviewer.account AS reviewer_account,
      reviewer.display_name AS reviewer_display_name,
      reviewer.department AS reviewer_department_value,
      reviewer.organization_role AS reviewer_organization_role,
      reviewer.role AS reviewer_role_value,
      reviewer.is_enabled AS reviewer_is_enabled,
      reviewed_by.account AS reviewed_by_account,
      reviewed_by.display_name AS reviewed_by_display_name,
      reviewed_by.department AS reviewed_by_department,
      reviewed_by.organization_role AS reviewed_by_organization_role,
      reviewed_by.role AS reviewed_by_role,
      reviewed_by.is_enabled AS reviewed_by_is_enabled
    FROM project_initiation_review_nodes n
    LEFT JOIN users reviewer
      ON reviewer.id = n.reviewer_user_id
    LEFT JOIN users reviewed_by
      ON reviewed_by.id = n.reviewed_by_user_id
    WHERE n.stage_document_id IN (${documentIds.map(() => '?').join(', ')})
    ORDER BY FIELD(n.node_key, 'business_review', 'technical_review', 'general_review')
    ${forUpdate ? 'FOR UPDATE' : ''}`,
    documentIds
  );

  return rows;
}

function groupNodesByDocumentId(nodes) {
  const grouped = new Map();
  for (const node of nodes) {
    if (!grouped.has(node.stage_document_id)) {
      grouped.set(node.stage_document_id, []);
    }
    grouped.get(node.stage_document_id).push(node);
  }
  return grouped;
}

export async function attachInitiationReviewToStageDocumentRows(executor, rows, user = null) {
  const initiationDocuments = rows.filter((row) => isInitiationReviewDocumentCode(row.document_code ?? row.documentCode));
  if (initiationDocuments.length === 0) {
    return rows;
  }

  const nodes = await selectInitiationReviewNodes(
    executor,
    initiationDocuments.map((document) => getDocumentId(document))
  );
  const nodesByDocumentId = groupNodesByDocumentId(nodes);
  const documentsByProjectAndCode = new Map();
  for (const row of rows) {
    documentsByProjectAndCode.set(`${getProjectId(row)}:${row.document_code ?? row.documentCode}`, row);
  }

  return rows.map((row) => {
    if (!isInitiationReviewDocumentCode(row.document_code ?? row.documentCode)) {
      return row;
    }

    const reworkTargetDocument = documentsByProjectAndCode.get(
      `${getProjectId(row)}:${INITIATION_REWORK_TARGET_DOCUMENT_CODE}`
    );
    return cloneRowWithInitiationReview(
      row,
      buildInitiationReviewPayload({
        document: row,
        nodes: nodesByDocumentId.get(getDocumentId(row)) || [],
        reworkTargetDocument,
        user
      })
    );
  });
}

export async function mapDocumentWithInitiationReview(executor, row, user = null) {
  if (!isInitiationReviewDocumentCode(row.document_code ?? row.documentCode)) {
    return mapDocument(row);
  }

  const contextRows = [row];
  const projectId = getProjectId(row);
  if (projectId) {
    const [reworkTargetRows] = await executor.execute(
      `SELECT *
      FROM project_stage_documents
      WHERE project_id = ?
        AND document_code = ?
      LIMIT 1`,
      [projectId, INITIATION_REWORK_TARGET_DOCUMENT_CODE]
    );
    if (reworkTargetRows.length > 0) {
      contextRows.push(reworkTargetRows[0]);
    }
  }

  const attachedRows = await attachInitiationReviewToStageDocumentRows(executor, contextRows, user);
  const attachedRow =
    attachedRows.find((candidate) => String(getDocumentId(candidate)) === String(getDocumentId(row))) ?? row;
  return mapDocument(attachedRow);
}

async function selectInitiationDocumentForUpdate(connection, projectId, documentId) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, documentId]
  );

  const document = rows[0];
  if (!document || !isInitiationReviewDocument(document)) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_DOCUMENT_NOT_FOUND',
      '1.2 initiation review document not found',
      404,
      ['documentId']
    );
  }

  if (!isDocumentApplicable(document)) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_DOCUMENT_NOT_APPLICABLE',
      '1.2 initiation review document is not applicable',
      409,
      ['documentId']
    );
  }

  return document;
}

async function selectReworkTargetForUpdate(connection, projectId) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND document_code = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, INITIATION_REWORK_TARGET_DOCUMENT_CODE]
  );

  if (rows.length === 0) {
    throw new InitiationReviewError(
      'INITIATION_REWORK_TARGET_NOT_FOUND',
      '1.1 initiation rework target not found',
      409,
      ['documentId']
    );
  }

  return rows[0];
}

async function selectInitiationReviewNodeForUpdate(connection, documentId, nodeKey) {
  const nodes = await selectInitiationReviewNodes(connection, [documentId], { forUpdate: true });
  const node = nodes.find((candidate) => candidate.node_key === nodeKey);

  if (!node) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_NODE_NOT_FOUND',
      'Initiation review node not found',
      404,
      ['nodeKey']
    );
  }

  return {
    node,
    nodes
  };
}

function assertNodeReviewer(user, nodeKey) {
  if (!canUserReviewInitiationNode(user, nodeKey)) {
    throw new InitiationReviewError(
      'FORBIDDEN_OPERATION',
      'Current user cannot operate this initiation review node',
      403,
      ['nodeKey']
    );
  }
}

function assertNodePending(node) {
  if (node.node_status !== INITIATION_REVIEW_NODE_STATUS.PENDING) {
    throw new InitiationReviewError(
      'INVALID_INITIATION_REVIEW_NODE_STATUS',
      'Initiation review node is not pending',
      409,
      ['nodeStatus']
    );
  }
}

function assertBaseDocumentSubmitted(document) {
  if (!isInitiationReviewBaseSubmitted(document.status)) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_DOCUMENT_NOT_SUBMITTED',
      '1.2 document must be submitted before initiation review',
      409,
      ['status']
    );
  }
}

function assertNoOutstandingLinkedRework({ document, reworkTargetDocument }) {
  if (isReworkBlockingInitiationDocument({ initiationDocument: document, reworkTargetDocument })) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_REWORK_BLOCKED',
      '1.1 revision must be cleared before approving returned initiation review node',
      409,
      ['revisionRequired']
    );
  }
}

function findNode(nodes, nodeKey) {
  return nodes.find((node) => node.node_key === nodeKey) || null;
}

function areParallelNodesApproved(nodes) {
  return (
    findNode(nodes, INITIATION_REVIEW_NODE_KEY.BUSINESS)?.node_status === INITIATION_REVIEW_NODE_STATUS.APPROVED &&
    findNode(nodes, INITIATION_REVIEW_NODE_KEY.TECHNICAL)?.node_status === INITIATION_REVIEW_NODE_STATUS.APPROVED
  );
}

function areAllNodesApproved(nodes) {
  return INITIATION_REVIEW_NODE_DEFINITIONS.every(
    (definition) => findNode(nodes, definition.nodeKey)?.node_status === INITIATION_REVIEW_NODE_STATUS.APPROVED
  );
}

async function activateGeneralReviewIfReady(connection, projectId, documentId, nodes) {
  if (!areParallelNodesApproved(nodes)) {
    return null;
  }

  const generalNode = findNode(nodes, INITIATION_REVIEW_NODE_KEY.GENERAL);
  if (!generalNode || generalNode.node_status === INITIATION_REVIEW_NODE_STATUS.APPROVED) {
    return null;
  }

  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      return_reason = NULL,
      invalidated_at = NULL,
      invalidated_reason = NULL
    WHERE project_id = ?
      AND stage_document_id = ?
      AND node_key = ?
      AND node_status IN (?, ?)`,
    [
      INITIATION_REVIEW_NODE_STATUS.PENDING,
      projectId,
      documentId,
      INITIATION_REVIEW_NODE_KEY.GENERAL,
      INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE,
      INITIATION_REVIEW_NODE_STATUS.INVALIDATED
    ]
  );

  return {
    nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
    fromStatus: generalNode.node_status,
    toStatus: INITIATION_REVIEW_NODE_STATUS.PENDING
  };
}

function buildInitiationReviewLogDetails({
  projectId,
  document,
  node,
  fromStatus,
  toStatus,
  actorUserId,
  comment = null,
  returnReason = null,
  extra = {}
}) {
  const definition = getInitiationReviewNodeDefinition(node.node_key);
  return {
    projectId,
    stageDocumentId: document.id,
    documentCode: document.document_code,
    documentName: document.document_name,
    nodeKey: node.node_key,
    nodeName: definition?.nodeName ?? node.node_key,
    fromStatus,
    toStatus,
    actorUserId,
    operatedAt: new Date().toISOString(),
    comment,
    returnReason,
    ...extra
  };
}

async function insertInitiationNodeLog({
  connection,
  projectId,
  document,
  node,
  userId,
  action,
  fromStatus,
  toStatus,
  comment = null,
  returnReason = null,
  extra = {}
}) {
  const definition = getInitiationReviewNodeDefinition(node.node_key);
  await insertOperationLog(connection, {
    projectId,
    actorUserId: userId,
    actionType: getInitiationReviewNodeActionType(node.node_key, action),
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: node.id,
    summary:
      action === 'approve'
        ? `1.2 ${definition?.nodeName ?? node.node_key}通过：${document.document_name}`
        : `1.2 ${definition?.nodeName ?? node.node_key}退回：${document.document_name}`,
    details: buildInitiationReviewLogDetails({
      projectId,
      document,
      node,
      fromStatus,
      toStatus,
      actorUserId: userId,
      comment,
      returnReason,
      extra
    })
  });
}

async function maybeLogInitiationReviewCompleted({ connection, projectId, document, nodes, userId, reworkTargetDocument }) {
  if (!areAllNodesApproved(nodes)) {
    return false;
  }

  if (isReworkBlockingInitiationDocument({ initiationDocument: document, reworkTargetDocument })) {
    return false;
  }

  await connection.execute(
    `UPDATE project_stage_documents
    SET status = ?,
      confirmed_by_user_id = ?,
      confirmed_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND id = ?`,
    [DOCUMENT_STATUS.CONFIRMED, userId, projectId, document.id]
  );
  await insertOperationLog(connection, {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_COMPLETED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: document.id,
    summary: `1.2 多节点审批最终完成：${document.document_name}`,
    details: {
      projectId,
      stageDocumentId: document.id,
      documentCode: document.document_code,
      documentName: document.document_name,
      completedByUserId: userId,
      completedAt: new Date().toISOString(),
      nodeStatusByKey: Object.fromEntries(nodes.map((node) => [node.node_key, node.node_status]))
    }
  });

  return true;
}

export async function activateInitiationReviewNodesForDocument({
  connection,
  projectId,
  document,
  userId
}) {
  if (!isInitiationReviewDocument(document)) {
    return null;
  }

  await ensureInitiationReviewNodesForDocument(connection, document, userId);
  const { nodes } = await selectInitiationReviewNodeForUpdate(
    connection,
    document.id,
    INITIATION_REVIEW_NODE_KEY.BUSINESS
  );
  const fromStatusByKey = Object.fromEntries(nodes.map((node) => [node.node_key, node.node_status]));

  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      comment = NULL,
      return_reason = NULL,
      invalidated_at = NULL,
      invalidated_reason = NULL
    WHERE project_id = ?
      AND stage_document_id = ?
      AND node_key IN (?, ?)
      AND node_status IN (?, ?, ?)`,
    [
      INITIATION_REVIEW_NODE_STATUS.PENDING,
      userId,
      projectId,
      document.id,
      INITIATION_REVIEW_NODE_KEY.BUSINESS,
      INITIATION_REVIEW_NODE_KEY.TECHNICAL,
      INITIATION_REVIEW_NODE_STATUS.WAITING_DOCUMENT_SUBMISSION,
      INITIATION_REVIEW_NODE_STATUS.INVALIDATED,
      INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE
    ]
  );
  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      submitted_by_user_id = ?,
      submitted_at = CURRENT_TIMESTAMP,
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      comment = NULL,
      return_reason = NULL,
      invalidated_at = NULL,
      invalidated_reason = NULL
    WHERE project_id = ?
      AND stage_document_id = ?
      AND node_key = ?
      AND node_status <> ?`,
    [
      INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE,
      userId,
      projectId,
      document.id,
      INITIATION_REVIEW_NODE_KEY.GENERAL,
      INITIATION_REVIEW_NODE_STATUS.APPROVED
    ]
  );
  await insertOperationLog(connection, {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_SUBMITTED,
    targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
    targetId: document.id,
    summary: `提交资料并启动 1.2 多节点审批：${document.document_name}`,
    details: {
      projectId,
      stageDocumentId: document.id,
      documentCode: document.document_code,
      documentName: document.document_name,
      fromStatusByKey,
      toStatusByKey: {
        [INITIATION_REVIEW_NODE_KEY.BUSINESS]: INITIATION_REVIEW_NODE_STATUS.PENDING,
        [INITIATION_REVIEW_NODE_KEY.TECHNICAL]: INITIATION_REVIEW_NODE_STATUS.PENDING,
        [INITIATION_REVIEW_NODE_KEY.GENERAL]: INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE
      },
      actorUserId: userId,
      operatedAt: new Date().toISOString()
    }
  });

  return true;
}

export async function approveInitiationReviewNode({
  connection: providedConnection = null,
  projectId,
  documentId,
  nodeKey,
  user,
  comment = ''
}) {
  const connection = providedConnection || (await pool.getConnection());
  const ownsConnection = !providedConnection;

  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

  assertInitiationReviewNodeKey(nodeKey);
  const document = await selectInitiationDocumentForUpdate(connection, projectId, documentId);
  await ensureInitiationReviewNodesForDocument(connection, document);
  assertNodeReviewer(user, nodeKey);
  assertBaseDocumentSubmitted(document);
  const reworkTargetDocument = await selectReworkTargetForUpdate(connection, projectId);
  assertNoOutstandingLinkedRework({ document, reworkTargetDocument });
  const { node, nodes } = await selectInitiationReviewNodeForUpdate(connection, documentId, nodeKey);
  assertNodePending(node);

  if (nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL && !areParallelNodesApproved(nodes)) {
    throw new InitiationReviewError(
      'INITIATION_REVIEW_PREREQUISITE_NOT_READY',
      'Business and technical review must be approved before general review',
      409,
      ['nodeKey']
    );
  }

  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      comment = ?,
      return_reason = NULL,
      reviewed_by_user_id = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      invalidated_at = NULL,
      invalidated_reason = NULL
    WHERE id = ?`,
    [INITIATION_REVIEW_NODE_STATUS.APPROVED, String(comment ?? '').trim() || null, user.id, node.id]
  );

  await insertInitiationNodeLog({
    connection,
    projectId,
    document,
    node,
    userId: user.id,
    action: 'approve',
    fromStatus: node.node_status,
    toStatus: INITIATION_REVIEW_NODE_STATUS.APPROVED,
    comment: String(comment ?? '').trim() || null
  });

  const refreshedNodes = (await selectInitiationReviewNodes(connection, [documentId], { forUpdate: true })).map(
    (candidate) =>
      candidate.id === node.id
        ? { ...candidate, node_status: INITIATION_REVIEW_NODE_STATUS.APPROVED }
        : candidate
  );
  const generalActivation = await activateGeneralReviewIfReady(connection, projectId, documentId, refreshedNodes);
  const finalNodes = await selectInitiationReviewNodes(connection, [documentId], { forUpdate: true });
  if (generalActivation) {
    const activatedGeneral = findNode(finalNodes, INITIATION_REVIEW_NODE_KEY.GENERAL);
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_GENERAL_ACTIVATED,
      targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
      targetId: activatedGeneral?.id ?? documentId,
      summary: `1.2 总经理审批待办已生成：${document.document_name}`,
      details: {
        projectId,
        stageDocumentId: document.id,
        documentCode: document.document_code,
        documentName: document.document_name,
        activatedNode: generalActivation,
        actorUserId: user.id,
        operatedAt: new Date().toISOString()
      }
    });
  }
  await maybeLogInitiationReviewCompleted({
    connection,
    projectId,
    document,
    nodes: finalNodes,
    userId: user.id,
    reworkTargetDocument
  });

  const updatedDocument = await selectInitiationDocumentForUpdate(connection, projectId, documentId);
    const result = await mapDocumentWithInitiationReview(connection, updatedDocument, user);
    if (ownsConnection) {
      await connection.commit();
    }
    return result;
  } catch (error) {
    if (ownsConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

async function markInitiationReworkTarget({
  connection,
  projectId,
  sourceDocument,
  targetDocument,
  userId,
  returnReason,
  node
}) {
  await connection.execute(
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
      AND id = ?`,
    [returnReason, sourceDocument.id, userId, projectId, targetDocument.id]
  );
  await insertOperationLog(connection, {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_REVISION_REQUESTED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: targetDocument.id,
    summary: `要求资料返工：${sourceDocument.document_name} -> ${targetDocument.document_name}`,
    details: {
      sourceDocumentId: sourceDocument.id,
      sourceDocumentCode: sourceDocument.document_code,
      sourceDocumentName: sourceDocument.document_name,
      targetDocumentId: targetDocument.id,
      targetDocumentCode: targetDocument.document_code,
      targetDocumentName: targetDocument.document_name,
      revisionReason: returnReason,
      requestedByUserId: userId,
      requestedAt: new Date().toISOString(),
      requestField: 'initiationReviewNode',
      nodeKey: node.node_key
    }
  });
}

async function invalidateGeneralReviewAfterParallelReturn({
  connection,
  projectId,
  documentId,
  nodeKey,
  nodes
}) {
  if (![INITIATION_REVIEW_NODE_KEY.BUSINESS, INITIATION_REVIEW_NODE_KEY.TECHNICAL].includes(nodeKey)) {
    return null;
  }

  const generalNode = findNode(nodes, INITIATION_REVIEW_NODE_KEY.GENERAL);
  if (!generalNode || generalNode.node_status === INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE) {
    return null;
  }

  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      comment = NULL,
      return_reason = NULL,
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      invalidated_at = CURRENT_TIMESTAMP,
      invalidated_reason = ?
    WHERE project_id = ?
      AND stage_document_id = ?
      AND node_key = ?`,
    [
      INITIATION_REVIEW_NODE_STATUS.INVALIDATED,
      `${nodeKey} returned`,
      projectId,
      documentId,
      INITIATION_REVIEW_NODE_KEY.GENERAL
    ]
  );

  return {
    nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
    fromStatus: generalNode.node_status,
    toStatus: INITIATION_REVIEW_NODE_STATUS.INVALIDATED,
    reason: `${nodeKey} returned`
  };
}

function buildRetainedParallelNodeContext(nodeKey, nodes) {
  if (nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL) {
    return nodes
      .filter((node) => [INITIATION_REVIEW_NODE_KEY.BUSINESS, INITIATION_REVIEW_NODE_KEY.TECHNICAL].includes(node.node_key))
      .map((node) => ({ nodeKey: node.node_key, nodeStatus: node.node_status }));
  }

  const retainedNodeKey =
    nodeKey === INITIATION_REVIEW_NODE_KEY.BUSINESS
      ? INITIATION_REVIEW_NODE_KEY.TECHNICAL
      : INITIATION_REVIEW_NODE_KEY.BUSINESS;
  const retainedNode = findNode(nodes, retainedNodeKey);
  return retainedNode ? [{ nodeKey: retainedNode.node_key, nodeStatus: retainedNode.node_status }] : [];
}

export async function returnInitiationReviewNode({
  connection: providedConnection = null,
  projectId,
  documentId,
  nodeKey,
  user,
  returnReason
}) {
  const connection = providedConnection || (await pool.getConnection());
  const ownsConnection = !providedConnection;

  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

  assertInitiationReviewNodeKey(nodeKey);
  const normalizedReason = normalizeReturnReason(returnReason);
  const document = await selectInitiationDocumentForUpdate(connection, projectId, documentId);
  await ensureInitiationReviewNodesForDocument(connection, document);
  assertNodeReviewer(user, nodeKey);
  assertBaseDocumentSubmitted(document);
  const { node, nodes } = await selectInitiationReviewNodeForUpdate(connection, documentId, nodeKey);
  assertNodePending(node);
  const reworkTargetDocument = await selectReworkTargetForUpdate(connection, projectId);

  await connection.execute(
    `UPDATE project_initiation_review_nodes
    SET node_status = ?,
      comment = NULL,
      return_reason = ?,
      reviewed_by_user_id = ?,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [INITIATION_REVIEW_NODE_STATUS.RETURNED_BLOCKED_BY_REWORK, normalizedReason, user.id, node.id]
  );
  const invalidatedNode = await invalidateGeneralReviewAfterParallelReturn({
    connection,
    projectId,
    documentId,
    nodeKey,
    nodes
  });
  await markInitiationReworkTarget({
    connection,
    projectId,
    sourceDocument: document,
    targetDocument: reworkTargetDocument,
    userId: user.id,
    returnReason: normalizedReason,
    node
  });
  await insertInitiationNodeLog({
    connection,
    projectId,
    document,
    node,
    userId: user.id,
    action: 'return',
    fromStatus: node.node_status,
    toStatus: INITIATION_REVIEW_NODE_STATUS.RETURNED_BLOCKED_BY_REWORK,
    returnReason: normalizedReason,
    extra: {
      linkedRework: {
        sourceDocumentId: document.id,
        sourceDocumentCode: document.document_code,
        targetDocumentId: reworkTargetDocument.id,
        targetDocumentCode: reworkTargetDocument.document_code
      },
      invalidatedNode,
      retainedParallelNodes: buildRetainedParallelNodeContext(nodeKey, nodes)
    }
  });

  const updatedDocument = await selectInitiationDocumentForUpdate(connection, projectId, documentId);
    const result = await mapDocumentWithInitiationReview(connection, updatedDocument, user);
    if (ownsConnection) {
      await connection.commit();
    }
    return result;
  } catch (error) {
    if (ownsConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

export async function restoreInitiationReviewNodesAfterReworkCleared({
  connection,
  projectId,
  targetDocument,
  userId
}) {
  if (
    String(targetDocument.document_code) !== INITIATION_REWORK_TARGET_DOCUMENT_CODE ||
    !targetDocument.revision_source_document_id
  ) {
    return { restoredCount: 0 };
  }

  const [sourceRows] = await connection.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND id = ?
      AND document_code = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId, targetDocument.revision_source_document_id, INITIATION_REVIEW_DOCUMENT_CODE]
  );
  const sourceDocument = sourceRows[0];
  if (!sourceDocument) {
    return { restoredCount: 0 };
  }

  const nodes = await selectInitiationReviewNodes(connection, [sourceDocument.id], { forUpdate: true });
  const returnedNodes = nodes.filter(
    (node) => node.node_status === INITIATION_REVIEW_NODE_STATUS.RETURNED_BLOCKED_BY_REWORK
  );

  for (const node of returnedNodes) {
    await connection.execute(
      `UPDATE project_initiation_review_nodes
      SET node_status = ?,
        return_reason = NULL,
        invalidated_at = NULL,
        invalidated_reason = NULL
      WHERE id = ?`,
      [INITIATION_REVIEW_NODE_STATUS.PENDING, node.id]
    );
    await insertOperationLog(connection, {
      projectId,
      actorUserId: userId,
      actionType: OPERATION_ACTION_TYPE.INITIATION_REVIEW_RESTORED,
      targetType: OPERATION_TARGET_TYPE.INITIATION_REVIEW,
      targetId: node.id,
      summary: `1.1 返工清除后恢复 1.2 节点待审：${sourceDocument.document_name}`,
      details: buildInitiationReviewLogDetails({
        projectId,
        document: sourceDocument,
        node,
        fromStatus: node.node_status,
        toStatus: INITIATION_REVIEW_NODE_STATUS.PENDING,
        actorUserId: userId,
        extra: {
          reworkTargetDocumentId: targetDocument.id,
          reworkTargetDocumentCode: targetDocument.document_code
        }
      })
    });
  }

  return { restoredCount: returnedNodes.length };
}

function buildInitiationReviewTargetRoute(item) {
  return `/projects/${item.projectId}?taskMode=initiationReview&documentId=${item.documentId}&nodeKey=${item.nodeKey}`;
}

function buildWorkbenchTask(row, user) {
  const definition = getInitiationReviewNodeDefinition(row.node_key);
  const item = {
    type: INITIATION_REVIEW_TODO_TYPE,
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageOrder: row.stage_order,
    stageName: row.stage_name,
    documentId: row.stage_document_id,
    documentCode: row.document_code,
    documentName: row.document_name,
    nodeId: row.id,
    nodeKey: row.node_key,
    nodeName: definition?.nodeName ?? row.node_key,
    nodeStatus: row.node_status,
    reviewerRole: row.reviewer_role,
    reviewerDepartment: row.reviewer_department,
    status: row.node_status,
    actionText: `处理${definition?.nodeName ?? '1.2 节点审批'}`,
    createdAt: row.submitted_at || row.created_at,
    updatedAt: row.updated_at,
    targetRoute: '',
    permissions: {
      canApprove: canUserReviewInitiationNode(user, row.node_key),
      canReturn: canUserReviewInitiationNode(user, row.node_key)
    }
  };

  item.targetRoute = buildInitiationReviewTargetRoute(item);
  return item;
}

function getWorkbenchReviewerNodeKeys(user) {
  const nodeKeys = [];
  if (
    user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER &&
    user.department === BUSINESS_DEPARTMENT.MARKETING_CENTER
  ) {
    nodeKeys.push(INITIATION_REVIEW_NODE_KEY.BUSINESS);
  }
  if (
    user?.organizationRole === ORGANIZATION_ROLE.CENTER_MANAGER &&
    user.department === BUSINESS_DEPARTMENT.RD_CENTER
  ) {
    nodeKeys.push(INITIATION_REVIEW_NODE_KEY.TECHNICAL);
  }
  if (user?.organizationRole === ORGANIZATION_ROLE.GENERAL_MANAGER) {
    nodeKeys.push(INITIATION_REVIEW_NODE_KEY.GENERAL);
  }
  return nodeKeys;
}

export async function selectInitiationReviewWorkbenchTodos(executor, user) {
  const nodeKeys = getWorkbenchReviewerNodeKeys(user);
  if (nodeKeys.length === 0) {
    return [];
  }

  await ensureMissingInitiationReviewNodesForWorkbench(executor);

  const [rows] = await executor.execute(
    `SELECT
      n.*,
      d.document_code,
      d.document_name,
      d.stage_order,
      d.stage_name,
      p.project_code,
      p.project_name,
      s.id AS stage_id
    FROM project_initiation_review_nodes n
    INNER JOIN project_stage_documents d
      ON d.id = n.stage_document_id
    INNER JOIN projects p
      ON p.id = n.project_id
    LEFT JOIN project_stages s
      ON s.project_id = n.project_id
      AND s.stage_order = d.stage_order
    WHERE n.node_status = ?
      AND n.node_key IN (${nodeKeys.map(() => '?').join(', ')})
      AND d.document_code = ?
      AND d.is_applicable = 1
      AND d.status IN (?, ?)
    ORDER BY
      COALESCE(n.submitted_at, n.updated_at) ASC,
      p.project_code ASC,
      n.id ASC`,
    [
      INITIATION_REVIEW_NODE_STATUS.PENDING,
      ...nodeKeys,
      INITIATION_REVIEW_DOCUMENT_CODE,
      DOCUMENT_STATUS.SUBMITTED,
      DOCUMENT_STATUS.CONFIRMED
    ]
  );

  return rows.map((row) => buildWorkbenchTask(row, user));
}

export async function selectInitiationReviewNodesForDocument(executor, documentId) {
  return selectInitiationReviewNodes(executor, [documentId]);
}
