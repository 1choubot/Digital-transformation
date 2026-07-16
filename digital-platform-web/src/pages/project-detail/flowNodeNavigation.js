const AUTO_SWITCH_COMPLETED_STATUSES = new Set([
  'completed',
  'not_applicable',
  'approved',
  'skipped',
  'ended'
]);

const AUTO_SWITCH_RETURNED_STATUSES = new Set([
  'returned',
  'returned_for_rework',
  'blocked_by_rework',
  'returned_blocked_by_rework'
]);

const ACTIVE_NAVIGATION_STATUS_PRIORITY = Object.freeze({
  RETURNED: 0,
  PROCESSING: 1,
  WAIT_APPROVAL: 2
});

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

/**
 * Only a backend-confirmed transition into a completed or returned state may
 * move the workspace. Repeated refreshes of an already terminal node are
 * intentionally ignored so saves/uploads cannot cause another navigation.
 */
export function shouldAutoSwitchAfterNodeRefresh(previousStatus, refreshedStatus) {
  const previous = normalizeStatus(previousStatus);
  const refreshed = normalizeStatus(refreshedStatus);
  if (!previous || !refreshed || previous === refreshed) {
    return false;
  }

  return AUTO_SWITCH_COMPLETED_STATUSES.has(refreshed) || AUTO_SWITCH_RETURNED_STATUSES.has(refreshed);
}

/**
 * Selects an active node from the backend navigation projection. The backend
 * owns stage/node order and reachability; the frontend only applies the
 * returned status priority. When the project advances a stage, active nodes in
 * the new current stage win within the same status priority.
 */
export function findBackendActiveNavigationTarget(navigation, { preferCurrentStage = false } = {}) {
  const stages = Array.isArray(navigation?.children) ? navigation.children : [];
  const currentStageKey = String(navigation?.currentStageKey || '');
  const candidates = [];

  stages.forEach((stage, stageIndex) => {
    const stageKey = String(stage?.stageKey || '');
    const nodes = Array.isArray(stage?.children) ? stage.children : [];
    nodes.forEach((node, nodeIndex) => {
      const status = String(node?.status || '').toUpperCase();
      if (!(status in ACTIVE_NAVIGATION_STATUS_PRIORITY)) {
        return;
      }

      const nodeKey = String(node?.nodeCode || node?.nodeKey || '').trim();
      if (!stageKey || !nodeKey) {
        return;
      }

      candidates.push({
        stageKey,
        nodeKey,
        status,
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
  return target ? { stageKey: target.stageKey, nodeKey: target.nodeKey } : null;
}

