export const NAVIGATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  WAIT_APPROVAL: 'WAIT_APPROVAL',
  RETURNED: 'RETURNED',
  FAILED: 'FAILED'
});

const NAVIGATION_STATUSES = new Set(Object.values(NAVIGATION_STATUS));
const AUTO_SWITCH_TARGET_STATUSES = new Set([
  NAVIGATION_STATUS.COMPLETED,
  NAVIGATION_STATUS.RETURNED
]);
const ACTIVE_NAVIGATION_STATUS_PRIORITY = Object.freeze({
  [NAVIGATION_STATUS.PROCESSING]: 0,
  [NAVIGATION_STATUS.WAIT_APPROVAL]: 1,
  [NAVIGATION_STATUS.RETURNED]: 2
});

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function getNavigationNodeKey(node) {
  return String(node?.nodeCode || node?.nodeKey || '').trim();
}

function getNavigationNodeRoute(node) {
  return String(node?.route || '').trim();
}

function isRoutableNavigationNode(node) {
  return Boolean(getNavigationNodeKey(node) && getNavigationNodeRoute(node));
}

export function shouldAutoSwitchAfterNodeRefresh(previousStatus, refreshedStatus) {
  const previous = normalizeStatus(previousStatus);
  const refreshed = normalizeStatus(refreshedStatus);
  if (!NAVIGATION_STATUSES.has(previous) || !NAVIGATION_STATUSES.has(refreshed) || previous === refreshed) {
    return false;
  }

  return AUTO_SWITCH_TARGET_STATUSES.has(refreshed);
}

/** Selects a routable node using only the backend navigation projection. */
export function findNavigationStageTarget(stage) {
  const nodes = Array.isArray(stage?.children) ? stage.children : [];
  const candidates = nodes
    .map((node, nodeIndex) => ({
      node,
      nodeIndex,
      statusPriority: ACTIVE_NAVIGATION_STATUS_PRIORITY[normalizeStatus(node?.status)]
    }))
    .filter(({ node }) => isRoutableNavigationNode(node));

  const activeCandidates = candidates
    .filter(({ statusPriority }) => Number.isInteger(statusPriority))
    .sort((left, right) => left.statusPriority - right.statusPriority || left.nodeIndex - right.nodeIndex);
  const target = activeCandidates[0]?.node || candidates[0]?.node;
  const stageKey = String(stage?.stageKey || '').trim();
  const nodeKey = getNavigationNodeKey(target);
  const route = getNavigationNodeRoute(target);

  return stageKey && nodeKey && route ? { stageKey, nodeKey, route } : null;
}

/** Resolves a stage hint first, then falls back to the backend current-stage markers. */
export function findProjectNavigationTarget(
  navigation,
  { stageKey = '', stageId = '', stageOrder = '' } = {}
) {
  const stages = Array.isArray(navigation?.children) ? navigation.children : [];
  const normalizedStageKey = String(stageKey || '').trim();
  const normalizedCurrentStageKey = String(navigation?.currentStageKey || '').trim();
  const hasStageId = stageId !== '' && stageId !== null && stageId !== undefined;
  const hasStageOrder = stageOrder !== '' && stageOrder !== null && stageOrder !== undefined;
  const targetStage =
    (normalizedStageKey && stages.find((stage) => String(stage?.stageKey || '') === normalizedStageKey)) ||
    (hasStageId && stages.find((stage) => String(stage?.stageId) === String(stageId))) ||
    (hasStageOrder && stages.find((stage) => Number(stage?.stageOrder) === Number(stageOrder))) ||
    (normalizedCurrentStageKey && stages.find((stage) => String(stage?.stageKey || '') === normalizedCurrentStageKey)) ||
    stages.find((stage) => stage?.isCurrent) ||
    null;

  return findNavigationStageTarget(targetStage);
}

/** Selects an active node across stages for post-refresh automatic handoff. */
export function findBackendActiveNavigationTarget(navigation, { preferCurrentStage = false } = {}) {
  const stages = Array.isArray(navigation?.children) ? navigation.children : [];
  const currentStageKey = String(navigation?.currentStageKey || '');
  const candidates = [];

  stages.forEach((stage, stageIndex) => {
    const stageKey = String(stage?.stageKey || '');
    const nodes = Array.isArray(stage?.children) ? stage.children : [];
    nodes.forEach((node, nodeIndex) => {
      const status = normalizeStatus(node?.status);
      if (!(status in ACTIVE_NAVIGATION_STATUS_PRIORITY) || !stageKey || !isRoutableNavigationNode(node)) return;

      candidates.push({
        stageKey,
        nodeKey: getNavigationNodeKey(node),
        route: getNavigationNodeRoute(node),
        statusPriority: ACTIVE_NAVIGATION_STATUS_PRIORITY[status],
        currentStagePriority: preferCurrentStage && stageKey === currentStageKey ? 0 : 1,
        stageIndex,
        nodeIndex
      });
    });
  });

  candidates.sort((left, right) =>
    left.statusPriority - right.statusPriority ||
    left.currentStagePriority - right.currentStagePriority ||
    left.stageIndex - right.stageIndex ||
    left.nodeIndex - right.nodeIndex
  );

  const target = candidates[0];
  return target ? { stageKey: target.stageKey, nodeKey: target.nodeKey, route: target.route } : null;
}
