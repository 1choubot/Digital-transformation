const RD_CENTER = 'rd_center';
const MARKETING_CENTER = 'marketing_center';
const CENTER_MANAGER = 'center_manager';
const GENERAL_MANAGER = 'general_manager';

function isSameUserId(left, right) {
  return Boolean(left) && Boolean(right) && String(left) === String(right);
}

const REWORK_NODE_STATUSES = new Set([
  'returned',
  'returned_for_rework',
  'blocked_by_rework',
  'returned_blocked_by_rework',
  'invalidated'
]);

const HIDDEN_NODE_STATUSES = new Set([
  'submitted',
  'pending',
  'pending_review',
  'pending_general_review',
  'approved',
  'completed',
  'ended',
  'skipped'
]);

// Online forms disappear after submission and only return when the workflow
// explicitly reopens the node for rework. Editing remains permission-driven.
export function isOnlineFormContentVisible({ nodeStatus = '', formStatus = '' } = {}) {
  if (REWORK_NODE_STATUSES.has(nodeStatus)) return true;
  if (formStatus === 'submitted') return false;
  return !HIDDEN_NODE_STATUSES.has(nodeStatus);
}

export function isStageDocumentFormFiller(output, currentUser) {
  return isSameUserId(output?.responsibleUserId, currentUser?.id);
}

export function isInitiationApprovalFormFiller(form) {
  return ['business', 'technical'].includes(form?.permissions?.editablePart);
}

export function isInitiationNoticeFormFiller(currentUser) {
  return currentUser?.organizationRole === CENTER_MANAGER
    && currentUser?.department === MARKETING_CENTER;
}

export function isInitiationReviewNodeReviewer(reviewNode, currentUser) {
  return reviewNode?.canAct === true
    || isSameUserId(reviewNode?.reviewerUserId, currentUser?.id)
    || isSameUserId(reviewNode?.reviewedByUserId, currentUser?.id);
}

export function isSolutionDesignFormFiller(workflow, roleKey, currentUser) {
  return isSameUserId(workflow?.roles?.[roleKey]?.userId, currentUser?.id);
}

export function isSolutionDesignFormReviewer(nodeKey, currentUser) {
  if (['solution_analysis', 'internal_solution_review', 'customer_solution_review'].includes(nodeKey)) {
    return currentUser?.organizationRole === CENTER_MANAGER && currentUser?.department === RD_CENTER;
  }

  if (nodeKey === 'quotation_or_tender') {
    return currentUser?.organizationRole === GENERAL_MANAGER;
  }

  return false;
}
