import { getProjectWorkspace } from '../repositories/projects/workspaceRepository.js';
import { getEffectiveProjectMode } from '../domain/projectProcessTemplates.js';
import {
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_STAGE
} from '../domain/solutionDesignWorkflow.js';
import {
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_NODES,
  CONTRACT_SIGNING_STAGE
} from '../domain/contractSigningWorkflow.js';

export const NAVIGATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  WAIT_APPROVAL: 'WAIT_APPROVAL',
  RETURNED: 'RETURNED',
  FAILED: 'FAILED'
});

function normalizeNodeStatus(
  status,
  { isCurrentStage = false, isCompletedStage = false, isFirstWaitingSubmission = false } = {}
) {
  if (['completed', 'not_applicable'].includes(status)) {
    return NAVIGATION_STATUS.COMPLETED;
  }

  if ([
    SOLUTION_DESIGN_NODE_STATUS.APPROVED,
    SOLUTION_DESIGN_NODE_STATUS.SKIPPED,
    SOLUTION_DESIGN_NODE_STATUS.ENDED,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  ].includes(status)) {
    return NAVIGATION_STATUS.COMPLETED;
  }

  if ([
    'pending_review',
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW,
    CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW,
    CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER
  ].includes(status)) {
    return NAVIGATION_STATUS.WAIT_APPROVAL;
  }

  if ([
    'returned_for_rework',
    'blocked_by_rework',
    SOLUTION_DESIGN_NODE_STATUS.RETURNED,
    CONTRACT_SIGNING_NODE_STATUS.RETURNED
  ].includes(status)) {
    return NAVIGATION_STATUS.RETURNED;
  }

  if (['failed'].includes(status)) {
    return NAVIGATION_STATUS.FAILED;
  }

  if ([
    'in_progress',
    SOLUTION_DESIGN_NODE_STATUS.PENDING,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  ].includes(status)) {
    return NAVIGATION_STATUS.PROCESSING;
  }

  if ([SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED, CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED].includes(status)) {
    return isCompletedStage ? NAVIGATION_STATUS.COMPLETED : NAVIGATION_STATUS.PENDING;
  }

  if (['process_node'].includes(status)) {
    if (isCompletedStage) {
      return NAVIGATION_STATUS.COMPLETED;
    }

    return isCurrentStage ? NAVIGATION_STATUS.PROCESSING : NAVIGATION_STATUS.PENDING;
  }

  if (status === 'waiting_submission') {
    return isCurrentStage && isFirstWaitingSubmission
      ? NAVIGATION_STATUS.PROCESSING
      : NAVIGATION_STATUS.PENDING;
  }

  return NAVIGATION_STATUS.PENDING;
}

function deriveStageStatus(stage, children) {
  if (stage.stageStatus === 'completed') {
    return NAVIGATION_STATUS.COMPLETED;
  }

  if (children.length === 0) {
    return stage.isCurrent ? NAVIGATION_STATUS.PROCESSING : NAVIGATION_STATUS.PENDING;
  }

  const childStatuses = children.map((child) => child.status);
  if (childStatuses.some((status) => status === NAVIGATION_STATUS.FAILED)) {
    return NAVIGATION_STATUS.FAILED;
  }

  if (childStatuses.some((status) => status === NAVIGATION_STATUS.RETURNED)) {
    return NAVIGATION_STATUS.RETURNED;
  }

  if (childStatuses.some((status) => status === NAVIGATION_STATUS.WAIT_APPROVAL)) {
    return NAVIGATION_STATUS.WAIT_APPROVAL;
  }

  if (stage.isCurrent) {
    return NAVIGATION_STATUS.PROCESSING;
  }

  if (childStatuses.every((status) => status === NAVIGATION_STATUS.COMPLETED)) {
    return NAVIGATION_STATUS.COMPLETED;
  }

  if (childStatuses.some((status) => status === NAVIGATION_STATUS.PROCESSING)) {
    return NAVIGATION_STATUS.PROCESSING;
  }

  return NAVIGATION_STATUS.PENDING;
}

function calculateProgress(stages) {
  const nodes = stages.flatMap((stage) => stage.children || []);
  if (nodes.length === 0) {
    const completedStages = stages.filter((stage) => stage.status === NAVIGATION_STATUS.COMPLETED).length;
    return stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;
  }

  const completedNodes = nodes.filter((node) => node.status === NAVIGATION_STATUS.COMPLETED).length;
  return Math.round((completedNodes / nodes.length) * 100);
}

function normalizeProjectStatus(status) {
  if (status === 'completed' || status === 'ended') {
    return NAVIGATION_STATUS.COMPLETED;
  }

  if (status === 'paused' || status === 'delayed' || status === 'risk' || status === 'normal') {
    return NAVIGATION_STATUS.PROCESSING;
  }

  return NAVIGATION_STATUS.PENDING;
}

function buildNode(projectId, stage, node, { isFirstWaitingSubmission = false } = {}) {
  const status = normalizeNodeStatus(node.nodeStatus, {
    isCurrentStage: stage.isCurrent,
    isCompletedStage: stage.stageStatus === 'completed',
    isFirstWaitingSubmission
  });

  return {
    name: node.nodeName,
    nodeCode: node.nodeKey,
    nodeKey: node.nodeKey,
    status,
    route: `/projects/${projectId}/node/${node.nodeKey}`,
    outputCount: Array.isArray(node.outputs) ? node.outputs.length : 0,
    actionHints: node.actionHints || [],
    blockingReasons: node.blockingReasons || [],
    notes: node.notes || ''
  };
}

function normalizeSolutionDesignStageNodes(nodes = []) {
  const nodeByKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  return SOLUTION_DESIGN_NODES.map((definition) => {
    const node = nodeByKey.get(definition.nodeKey) || {};
    return {
      ...node,
      nodeKey: definition.nodeKey,
      nodeName: definition.nodeName,
      nodeStatus: node.nodeStatus || SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      nodeOrder: definition.nodeOrder,
      outputs: Array.isArray(node.outputs) ? node.outputs : [],
      actionHints: node.actionHints || [],
      blockingReasons: node.blockingReasons || [],
      notes: node.notes || ''
    };
  });
}

function normalizeContractSigningStageNodes(nodes = []) {
  const nodeByKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  return CONTRACT_SIGNING_NODES.map((definition) => {
    const node = nodeByKey.get(definition.nodeKey) || {};
    return {
      ...node,
      nodeKey: definition.nodeKey,
      nodeName: definition.nodeName,
      nodeStatus: node.nodeStatus || CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
      nodeOrder: definition.nodeOrder,
      outputs: Array.isArray(node.outputs) ? node.outputs : [],
      actionHints: node.actionHints || [],
      blockingReasons: node.blockingReasons || [],
      notes: node.notes || ''
    };
  });
}

function buildStage(projectId, stage) {
  const stageNodes = stage.stageKey === SOLUTION_DESIGN_STAGE.STAGE_KEY
    ? normalizeSolutionDesignStageNodes(stage.nodes || [])
    : stage.stageKey === CONTRACT_SIGNING_STAGE.STAGE_KEY
      ? normalizeContractSigningStageNodes(stage.nodes || [])
    : stage.nodes || [];
  const firstWaitingSubmissionIndex = stageNodes.findIndex((node) => node.nodeStatus === 'waiting_submission');
  const children = stageNodes.map((node, index) =>
    buildNode(projectId, stage, node, {
      isFirstWaitingSubmission: index === firstWaitingSubmissionIndex
    })
  );
  return {
    stageId: stage.stageId,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    name: `${String(stage.stageOrder).padStart(2, '0')}-${stage.stageName}`,
    stageName: stage.stageName,
    status: deriveStageStatus(stage, children),
    isCurrent: Boolean(stage.isCurrent),
    configured: stage.configured !== false,
    legacyChecklistAvailable: Boolean(stage.legacyChecklistAvailable),
    children
  };
}

export function buildProjectNavigationFromWorkspace(projectId, workspace) {
  const projectMode = getEffectiveProjectMode(workspace.project?.projectMode);
  const children = (workspace.stages || []).map((stage) => buildStage(projectId, stage));

  return {
    projectId: String(projectId),
    projectMode,
    projectName: workspace.project?.projectName || '',
    projectCode: workspace.project?.projectCode || null,
    projectStatus: normalizeProjectStatus(workspace.project?.status),
    currentStageKey: workspace.currentStage?.stageKey || null,
    progress: calculateProgress(children),
    children
  };
}

export async function getProjectNavigation(projectId, user) {
  const workspace = await getProjectWorkspace(projectId, user);
  return buildProjectNavigationFromWorkspace(projectId, workspace);
}
