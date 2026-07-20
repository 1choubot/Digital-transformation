export function normalizeApprovalComment(value) {
  return String(value || '').trim();
}

export function buildApprovalActionState({
  busy = false,
  selectionRequired = false,
  selectionComplete = true,
  comment = '',
  approveCommentRequired = false,
  approveDisabled = false,
  returnDisabled = false,
  endDisabled = false
} = {}) {
  const normalizedComment = normalizeApprovalComment(comment);
  const interactionLocked = busy || (selectionRequired && !selectionComplete);

  return {
    interactionLocked,
    normalizedComment,
    approveDisabled: interactionLocked || approveDisabled || (approveCommentRequired && !normalizedComment),
    returnDisabled: interactionLocked || returnDisabled || !normalizedComment,
    endDisabled: interactionLocked || endDisabled || !normalizedComment
  };
}
