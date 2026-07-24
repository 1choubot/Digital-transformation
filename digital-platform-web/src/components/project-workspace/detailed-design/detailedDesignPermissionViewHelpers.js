export const detailedDesignWorkflowNodeKeys = Object.freeze([
  'project_kickoff_meeting',
  'detailed_design_preparation',
  'detailed_design',
  'internal_design_review',
  'customer_design_review',
  'product_plan_drawing',
  'parts_list',
  'drawing_review',
  'customer_drawing_countersign'
]);

export function canRenderDetailedDesignRoleAssignment(workflow) {
  return workflow?.permissions?.canAssignRoles === true;
}

export function canRenderDetailedDesignUploadButton(slot) {
  return slot?.permissions?.canUpload === true;
}

export function canRenderDetailedDesignUploadDownloadButton(slot) {
  return Boolean(slot?.currentFile) && slot?.permissions?.canDownload === true;
}

export function canRenderDetailedDesignReviewContent(reviewFormDto) {
  return reviewFormDto?.permissions?.canViewReviewForm === true;
}

export function canRenderDetailedDesignReviewSaveButton(reviewFormDto) {
  return reviewFormDto?.permissions?.canEditReviewForm === true;
}

export function canRenderDetailedDesignReviewSubmitButton(reviewFormDto) {
  return reviewFormDto?.permissions?.canSubmitReviewForm === true;
}

export function canRenderDetailedDesignReviewApproveButton(node) {
  return node?.permissions?.canApprove === true;
}

export function canRenderDetailedDesignReviewReturnButton(node) {
  return node?.permissions?.canReturn === true;
}

export function hasDetailedDesignReviewApprovalActions(node) {
  return canRenderDetailedDesignReviewApproveButton(node) || canRenderDetailedDesignReviewReturnButton(node);
}

export function hasCurrentDrawingReviewRecord(drawingReview, node) {
  const currentRevision = Number(drawingReview?.currentRevision || node?.currentRevision || 1);
  return (drawingReview?.recordHistory || []).some((record) =>
    record?.isCurrent === true &&
    Number(record.drawingRevision || 0) === currentRevision
  );
}

export function canRenderDrawingReviewCurrentInputDownload(drawingReview) {
  return drawingReview?.permissions?.canDownloadCurrentInputs === true;
}

export function canRenderDrawingReviewRecordUpload(drawingReview) {
  return drawingReview?.permissions?.canUploadRecord === true;
}

export function canRenderDrawingReviewRecordDownload(record) {
  return record?.permissions?.canDownload === true;
}

export function canRenderDrawingReviewPassButton(drawingReview) {
  return drawingReview?.permissions?.canPass === true;
}

export function canRenderDrawingReviewReturnButton(drawingReview) {
  return drawingReview?.permissions?.canReturn === true;
}

export function canRenderDrawingReviewRdApproveButton(drawingReview) {
  return drawingReview?.permissions?.canApprove === true;
}

export function canRenderDrawingReviewRdReturnButton(drawingReview) {
  return drawingReview?.permissions?.canReturnByRd === true;
}

export function hasDrawingReviewCheckerActions(drawingReview) {
  return canRenderDrawingReviewPassButton(drawingReview) ||
    canRenderDrawingReviewReturnButton(drawingReview) ||
    canRenderDrawingReviewRecordUpload(drawingReview);
}

export function hasDrawingReviewRdActions(drawingReview) {
  return canRenderDrawingReviewRdApproveButton(drawingReview) ||
    canRenderDrawingReviewRdReturnButton(drawingReview);
}
