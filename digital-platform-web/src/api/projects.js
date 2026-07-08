import { getApiBaseUrlLabel, request, requestBlob, toReadableApiError } from './http.js';

export { getApiBaseUrlLabel, toReadableApiError };

export async function listProjects(authToken = '') {
  return request('/api/projects', { authToken });
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

export async function approveStageApproval(projectId, stageId, authToken) {
  return request(`/api/projects/${projectId}/stages/${stageId}/approval/approve`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({})
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

export async function approveInitiationReviewNode(projectId, documentId, nodeKey, comment, authToken) {
  return request(`/api/projects/${projectId}/stage-documents/${documentId}/initiation-review/${nodeKey}/approve`, {
    method: 'POST',
    authToken,
    body: JSON.stringify({ comment })
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
