import { getApiBaseUrlLabel, request, requestBlob, toReadableApiError } from './http.js';

export { getApiBaseUrlLabel, toReadableApiError };

export async function listProjects(authToken = '') {
  return request('/api/projects', { authToken });
}

// Load projects the current user can select when filling daily or weekly reports.
export async function searchMyActiveProjects({ keyword = '', limit = 50 } = {}, authToken = '') {
  const params = new URLSearchParams();

  if (keyword && keyword.trim()) {
    params.set('q', keyword.trim());
  }

  if (limit) {
    params.set('limit', String(limit));
  }

  const queryString = params.toString();
  return request(`/api/projects/my-active${queryString ? `?${queryString}` : ''}`, { authToken });
}

export async function getProjectOverviewDashboard(
  { status = '', currentStageOrder = '', keyword = '' } = {},
  authToken = ''
) {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (currentStageOrder) {
    params.set('currentStageOrder', String(currentStageOrder));
  }

  if (keyword && keyword.trim()) {
    params.set('keyword', keyword.trim());
  }

  const queryString = params.toString();
  return request(`/api/projects/overview-dashboard${queryString ? `?${queryString}` : ''}`, { authToken });
}

export async function createProject(payload, authToken) {
  return request('/api/projects', {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function getProjectDetail(projectId, authToken = '') {
  return request(`/api/projects/${projectId}`, { authToken });
}

export async function getProjectWorkspace(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/workspace`, { authToken });
}

export async function getSolutionDesignWorkflow(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow`, { authToken });
}

export async function assignSolutionDesignRoles(projectId, payload, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/roles`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function listSolutionDesignUploads(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/uploads`, { authToken });
}

export async function uploadSolutionDesignWorkflowFile(projectId, slotKey, file, authToken = '') {
  const formData = new FormData();
  formData.append('file', file);

  return request(`/api/projects/${projectId}/solution-design-workflow/uploads/${slotKey}`, {
    method: 'POST',
    authToken,
    body: formData
  });
}

export async function downloadSolutionDesignWorkflowFile(projectId, slotKey, authToken = '') {
  return requestBlob(`/api/projects/${projectId}/solution-design-workflow/uploads/${slotKey}/download`, {
    authToken
  });
}

export async function markSolutionDesignUploadExemption(projectId, slotKey, exemptionReason, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/uploads/${slotKey}/exemption`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ exemptionReason })
  });
}

export async function cancelSolutionDesignUploadExemption(projectId, slotKey, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/uploads/${slotKey}/exemption`, {
    method: 'DELETE',
    authToken
  });
}

export async function submitSolutionDesignWorkflowNode(projectId, nodeKey, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function approveSolutionDesignWorkflowNode(projectId, nodeKey, commentOrPayload = '', authToken = '') {
  const payload =
    commentOrPayload && typeof commentOrPayload === 'object'
      ? commentOrPayload
      : { comment: commentOrPayload };
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/approve`, {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function returnSolutionDesignWorkflowNode(projectId, nodeKey, returnReason, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/return`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ returnReason })
  });
}

export async function getSolutionDesignAnalysisForm(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/analysis-form`, { authToken });
}

export async function saveSolutionDesignAnalysisForm(projectId, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/analysis-form`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function submitSolutionDesignAnalysisForm(projectId, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/analysis-form/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function downloadSolutionDesignAnalysisGeneratedFile(projectId, authToken = '') {
  return requestBlob(`/api/projects/${projectId}/solution-design-workflow/analysis-form/generated-file/download`, {
    authToken
  });
}

export async function getSolutionDesignReviewForm(projectId, nodeKey, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/review-form`, { authToken });
}

export async function saveSolutionDesignReviewForm(projectId, nodeKey, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/review-form`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function submitSolutionDesignReviewForm(projectId, nodeKey, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/review-form/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function downloadSolutionDesignReviewGeneratedFile(projectId, nodeKey, authToken = '') {
  return requestBlob(
    `/api/projects/${projectId}/solution-design-workflow/nodes/${nodeKey}/review-form/generated-file/download`,
    { authToken }
  );
}

export async function getSolutionDesignQuotationForm(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation-form`, { authToken });
}

export async function saveSolutionDesignQuotationForm(projectId, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation-form`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function submitSolutionDesignQuotationForm(projectId, formData, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation-form/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function downloadSolutionDesignQuotationGeneratedFile(projectId, authToken = '') {
  return requestBlob(
    `/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation-form/generated-file/download`,
    { authToken }
  );
}

export async function selectSolutionDesignQuotationTenderBranch(projectId, branchType, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/select`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ branchType })
  });
}

export async function submitSolutionDesignQuotation(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function processSolutionDesignQuotationResult(projectId, payload, authToken = '') {
  return request(`/api/projects/${projectId}/solution-design-workflow/quotation-tender/quotation/result`, {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload)
  });
}

export async function updateProjectCode(projectId, projectCode, authToken) {
  return request(`/api/projects/${projectId}/project-code`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ projectCode })
  });
}

export async function getProjectStageDocumentChecklist(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/stage-document-checklist`, { authToken });
}

export async function getStageDocumentOnlineForm(projectId, documentId, authToken = '') {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form`, { authToken });
}

export async function saveStageDocumentOnlineForm(projectId, documentId, formData, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function submitStageDocumentOnlineForm(projectId, documentId, formData, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ formData })
  });
}

export async function generateStageDocumentOnlineFormFile(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form/generated-file`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function uploadStageDocumentOnlineFormImage(projectId, documentId, fieldKey, file, authToken) {
  const formData = new FormData();
  formData.append('file', file);

  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form/images/${fieldKey}`, {
    method: 'POST',
    authToken,
    body: formData
  });
}

export async function downloadStageDocumentOnlineFormImage(projectId, documentId, imageId, authToken) {
  return requestBlob(
    `/api/projects/${projectId}/stage-documents/${documentId}/online-form/images/${imageId}/download`,
    {
      authToken
    }
  );
}

export async function deleteStageDocumentOnlineFormImage(projectId, documentId, imageId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/online-form/images/${imageId}`, {
    method: 'DELETE',
    authToken
  });
}

export async function getProjectOperationLogs(projectId, authToken = '') {
  return request(`/api/projects/${projectId}/operation-logs`, { authToken });
}

export async function advanceProjectStage(projectId, authToken) {
  return request(`/api/projects/${projectId}/stages/advance`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function submitStageApproval(projectId, stageId, authToken) {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function approveStageApproval(projectId, stageId, authToken, comment = '') {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/approve`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ comment })
  });
}

export async function returnStageApproval(projectId, stageId, comment, authToken) {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/return`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ comment })
  });
}

export async function resubmitStageApproval(projectId, stageId, authToken) {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/resubmit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function listStageApprovalHistory(projectId, stageId, authToken = '') {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/history`, { authToken });
}

export async function markStageDocumentSubmitted(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/submit`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function confirmStageDocument(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/confirm`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function returnStageDocument(projectId, documentId, returnReason, authToken, options = {}) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/return`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({
      returnReason,
      ...(Array.isArray(options.revisionTargetDocumentIds)
        ? { revisionTargetDocumentIds: options.revisionTargetDocumentIds }
        : {}),
      ...(Array.isArray(options.designChangeTargetDocumentIds)
        ? { designChangeTargetDocumentIds: options.designChangeTargetDocumentIds }
        : {})
    })
  });
}

export async function approveInitiationReviewNode(projectId, documentId, nodeKey, comment, authToken, options = {}) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/initiation-review/${nodeKey}/approve`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({
      comment,
      ...(options.projectExecutionMode ? { projectExecutionMode: options.projectExecutionMode } : {})
    })
  });
}

export async function returnInitiationReviewNode(
  projectId,
  documentId,
  nodeKey,
  returnReason,
  authToken,
  options = {}
) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/initiation-review/${nodeKey}/return`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({
      returnReason,
      ...(options.returnAction ? { returnAction: options.returnAction } : {}),
      ...(options.endReason ? { endReason: options.endReason } : {})
    })
  });
}

export async function completeStageDocumentRevision(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/revision/complete`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function markStageDocumentNotApplicable(projectId, documentId, notApplicableReason, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/mark-not-applicable`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ notApplicableReason })
  });
}

export async function restoreStageDocumentApplicable(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/restore-applicable`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
  });
}

export async function updateStageDocumentResponsibleUser(projectId, documentId, responsibleUserId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/responsible-user`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify({ responsibleUserId })
  });
}

export async function listStageDocumentAttachments(projectId, documentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/attachments`, {
    authToken
  });
}

export async function uploadStageDocumentAttachment(projectId, documentId, file, authToken) {
  const formData = new FormData();
  formData.append('file', file);

  return request(`/api/projects/${projectId}/stage-documents/${documentId}/attachments`, {
    method: 'POST',
    authToken,
    body: formData
  });
}

export async function downloadStageDocumentAttachment(projectId, documentId, attachmentId, authToken) {
  return requestBlob(
    `/api/projects/${projectId}/stage-documents/${documentId}/attachments/${attachmentId}/download`,
    {
      authToken
    }
  );
}

export async function getStageDocumentGeneratedFileStatus(projectId, documentId, authToken = '') {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/generated-file`, {
    authToken
  });
}

export async function downloadStageDocumentGeneratedFile(projectId, documentId, authToken) {
  return requestBlob(
    `/api/projects/${projectId}/stage-documents/${documentId}/generated-file/download`,
    {
      authToken
    }
  );
}

export async function deleteStageDocumentAttachment(projectId, documentId, attachmentId, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    authToken
  });
}
