const RD_CENTER = 'rd_center';
const MARKETING_CENTER = 'marketing_center';
const CENTER_MANAGER = 'center_manager';
const GENERAL_MANAGER = 'general_manager';

function isSameUserId(left, right) {
  return Boolean(left) && Boolean(right) && String(left) === String(right);
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
