function isSameUserId(left, right) {
  return Boolean(left) && Boolean(right) && String(left) === String(right);
}

export function isInitiationApprovalFormFiller(form) {
  return ['business', 'technical'].includes(form?.permissions?.editablePart);
}

export function isInitiationReviewNodeReviewer(reviewNode, currentUser) {
  return reviewNode?.canAct === true
    || isSameUserId(reviewNode?.reviewerUserId, currentUser?.id)
    || isSameUserId(reviewNode?.reviewedByUserId, currentUser?.id);
}
