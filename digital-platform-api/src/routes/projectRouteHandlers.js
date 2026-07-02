import { normalizeCreateProjectInput, ValidationError } from '../domain/projects.js';
import { canCreateProject } from '../domain/organization.js';
import { DOCUMENT_APPLICABILITY_ACTION } from '../domain/stageDocumentApplicability.js';
import { DOCUMENT_STATUS_ACTION } from '../domain/stageDocumentStatus.js';
import {
  assertProjectAuditViewable,
  assertProjectViewable,
  advanceProjectStage,
  approveStageApproval,
  createProject,
  getProjectDetail,
  getProjectOverviewDashboard,
  listStageApprovalHistory,
  listProjects,
  normalizeProjectOverviewDashboardFilters,
  ProjectAuthorizationError,
  ProjectNotFoundError,
  projectExists,
  resubmitStageApproval,
  returnStageApproval,
  submitStageApproval,
  updateProjectCode
} from '../repositories/projectRepository.js';
import {
  listProjectOperationLogs,
  normalizeOperationLogLimit
} from '../repositories/operationLogRepository.js';
import {
  approveInitiationReviewNode,
  getProjectStageDocumentChecklist,
  completeProjectStageDocumentRevision,
  returnInitiationReviewNode,
  updateProjectStageDocumentApplicability,
  updateProjectStageDocumentResponsibleUser,
  updateProjectStageDocumentStatus
} from '../repositories/stageDocumentRepository.js';
import {
  assertStageDocumentAttachmentUploadTarget,
  deleteStageDocumentAttachment,
  getStageDocumentAttachmentDownload,
  listStageDocumentAttachments,
  STAGE_DOCUMENT_ATTACHMENT_ERROR,
  StageDocumentAttachmentError,
  uploadStageDocumentAttachment
} from '../repositories/stageDocumentAttachmentRepository.js';
import { readMultipartFile } from '../middleware/multipartFile.js';
import { searchActiveProjectsForDailyReports } from '../repositories/dailyReportRepository.js';

function parsePositiveId(rawValue, fieldName) {
  const id = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== String(rawValue)) {
    throw new ValidationError(`Invalid ${fieldName}`, [fieldName]);
  }

  return id;
}

function parseProjectId(rawValue) {
  return parsePositiveId(rawValue, 'projectId');
}

function parseApprovalProjectId(rawValue) {
  const id = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== String(rawValue)) {
    throw new ValidationError('Invalid projectId', ['projectId'], 'INVALID_PROJECT_ID');
  }

  return id;
}

function parseApprovalStageId(rawValue) {
  const id = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== String(rawValue)) {
    throw new ValidationError('Invalid stageId', ['stageId'], 'INVALID_PROJECT_STAGE_ID');
  }

  return id;
}

function parseDocumentId(rawValue) {
  return parsePositiveId(rawValue, 'documentId');
}

function parseAttachmentPositiveId(rawValue, code, fieldName) {
  const text = String(rawValue ?? '').trim();
  if (!/^[1-9]\d*$/.test(text)) {
    throw new StageDocumentAttachmentError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  const id = Number(text);
  if (!Number.isSafeInteger(id)) {
    throw new StageDocumentAttachmentError(code, `Invalid ${fieldName}`, 400, [fieldName]);
  }

  return id;
}

function parseAttachmentProjectId(rawValue) {
  return parseAttachmentPositiveId(
    rawValue,
    STAGE_DOCUMENT_ATTACHMENT_ERROR.INVALID_PROJECT_ID,
    'projectId'
  );
}

function parseAttachmentDocumentId(rawValue) {
  return parseAttachmentPositiveId(
    rawValue,
    STAGE_DOCUMENT_ATTACHMENT_ERROR.INVALID_STAGE_DOCUMENT_ID,
    'documentId'
  );
}

function parseAttachmentId(rawValue) {
  return parseAttachmentPositiveId(
    rawValue,
    STAGE_DOCUMENT_ATTACHMENT_ERROR.INVALID_ATTACHMENT_ID,
    'attachmentId'
  );
}

async function handleStageDocumentStatusAction(req, res, action) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);

  const document = await updateProjectStageDocumentStatus({
    projectId,
    documentId,
    action,
    user: req.auth.user,
    returnReason: req.body?.returnReason,
    revisionTargetDocumentIds: req.body?.revisionTargetDocumentIds,
    designChangeTargetDocumentIds: req.body?.designChangeTargetDocumentIds
  });

  res.json({
    data: {
      document
    }
  });
}

async function handleStageDocumentApplicabilityAction(req, res, action) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);

  const document = await updateProjectStageDocumentApplicability({
    projectId,
    documentId,
    action,
    user: req.auth.user,
    notApplicableReason: req.body?.notApplicableReason
  });

  res.json({
    data: {
      document
    }
  });
}

export async function listProjectsHandler(req, res) {
  const projects = await listProjects(req.auth.user);

  res.json({
    data: projects
  });
}

export async function listMyActiveProjectsHandler(req, res) {
  const projects = await searchActiveProjectsForDailyReports({
    q: req.query.q,
    limit: req.query.limit,
    user: req.auth.user
  });

  res.json({
    data: {
      projects
    }
  });
}

export async function createProjectHandler(req, res) {
  if (!canCreateProject(req.auth.user)) {
    throw new ProjectAuthorizationError(
      'FORBIDDEN_OPERATION',
      'Current user cannot create project',
      ['organizationRole']
    );
  }

  const project = normalizeCreateProjectInput(req.body || {});
  const created = await createProject(project, req.auth.user.id);

  res.status(201).json({
    data: created
  });
}

export async function getProjectOverviewDashboardHandler(req, res) {
  const filters = normalizeProjectOverviewDashboardFilters(req.query);
  const dashboard = await getProjectOverviewDashboard(req.auth.user, filters);

  res.json({
    data: dashboard
  });
}

export async function updateProjectCodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const detail = await updateProjectCode({
    projectId,
    projectCode: req.body?.projectCode ?? req.body?.project_code,
    user: req.auth.user
  });

  res.json({
    data: detail
  });
}

export async function listProjectOperationLogsHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);

  await assertProjectAuditViewable(projectId, req.auth.user);
  const limit = normalizeOperationLogLimit(req.query.limit);
  const logs = await listProjectOperationLogs(projectId, limit);

  res.json({
    data: logs
  });
}

export async function getStageDocumentChecklistHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);

  await assertProjectViewable(projectId, req.auth.user);
  const checklist = await getProjectStageDocumentChecklist(projectId, req.auth.user);

  res.json({
    data: checklist
  });
}

export async function advanceProjectStageHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const detail = await advanceProjectStage(projectId, req.auth.user);

  res.json({
    data: detail
  });
}

function parseApprovalRouteIds(req) {
  return {
    projectId: parseApprovalProjectId(req.params.projectId),
    stageId: parseApprovalStageId(req.params.stageId)
  };
}

export async function submitStageApprovalHandler(req, res) {
  const { projectId, stageId } = parseApprovalRouteIds(req);
  const result = await submitStageApproval({ projectId, stageId, user: req.auth.user });

  res.json({
    data: result
  });
}

export async function approveStageApprovalHandler(req, res) {
  const { projectId, stageId } = parseApprovalRouteIds(req);
  const result = await approveStageApproval({ projectId, stageId, user: req.auth.user });

  res.json({
    data: result
  });
}

export async function returnStageApprovalHandler(req, res) {
  const { projectId, stageId } = parseApprovalRouteIds(req);
  const result = await returnStageApproval({
    projectId,
    stageId,
    user: req.auth.user,
    comment: req.body?.comment ?? req.body?.returnReason
  });

  res.json({
    data: result
  });
}

export async function resubmitStageApprovalHandler(req, res) {
  const { projectId, stageId } = parseApprovalRouteIds(req);
  const result = await resubmitStageApproval({ projectId, stageId, user: req.auth.user });

  res.json({
    data: result
  });
}

export async function listStageApprovalHistoryHandler(req, res) {
  const { projectId, stageId } = parseApprovalRouteIds(req);
  const history = await listStageApprovalHistory({ projectId, stageId, user: req.auth.user });

  res.json({
    data: history
  });
}

export async function submitStageDocumentHandler(req, res) {
  await handleStageDocumentStatusAction(req, res, DOCUMENT_STATUS_ACTION.SUBMIT);
}

export async function confirmStageDocumentHandler(req, res) {
  await handleStageDocumentStatusAction(req, res, DOCUMENT_STATUS_ACTION.CONFIRM);
}

export async function returnStageDocumentHandler(req, res) {
  await handleStageDocumentStatusAction(req, res, DOCUMENT_STATUS_ACTION.RETURN);
}

export async function completeStageDocumentRevisionHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);

  const document = await completeProjectStageDocumentRevision({
    projectId,
    documentId,
    user: req.auth.user
  });

  res.json({
    data: {
      document
    }
  });
}

export async function approveInitiationReviewNodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);
  const document = await approveInitiationReviewNode({
    projectId,
    documentId,
    nodeKey: req.params.nodeKey,
    user: req.auth.user,
    comment: req.body?.comment
  });

  res.json({
    data: {
      document
    }
  });
}

export async function returnInitiationReviewNodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);
  const document = await returnInitiationReviewNode({
    projectId,
    documentId,
    nodeKey: req.params.nodeKey,
    user: req.auth.user,
    returnReason: req.body?.returnReason ?? req.body?.comment
  });

  res.json({
    data: {
      document
    }
  });
}

export async function markStageDocumentNotApplicableHandler(req, res) {
  await handleStageDocumentApplicabilityAction(req, res, DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE);
}

export async function restoreStageDocumentApplicableHandler(req, res) {
  await handleStageDocumentApplicabilityAction(req, res, DOCUMENT_APPLICABILITY_ACTION.RESTORE_APPLICABLE);
}

export async function updateStageDocumentResponsibleUserHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);

  if (!(await projectExists(projectId))) {
    throw new ProjectNotFoundError(projectId);
  }

  const document = await updateProjectStageDocumentResponsibleUser({
    projectId,
    documentId,
    responsibleUserId: req.body?.responsibleUserId,
    user: req.auth.user
  });

  res.json({
    data: {
      document
    }
  });
}

export async function uploadStageDocumentAttachmentHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);

  await assertProjectViewable(projectId, req.auth.user);
  await assertStageDocumentAttachmentUploadTarget({ projectId, documentId, user: req.auth.user });
  const file = await readMultipartFile(req);
  const attachment = await uploadStageDocumentAttachment({
    projectId,
    documentId,
    user: req.auth.user,
    file
  });

  res.status(201).json({
    data: attachment
  });
}

export async function listStageDocumentAttachmentsHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);

  await assertProjectViewable(projectId, req.auth.user);
  const attachments = await listStageDocumentAttachments({ projectId, documentId, user: req.auth.user });

  res.json({
    data: attachments
  });
}

export async function downloadStageDocumentAttachmentHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);
  const attachmentId = parseAttachmentId(req.params.attachmentId);

  await assertProjectViewable(projectId, req.auth.user);
  const download = await getStageDocumentAttachmentDownload({
    projectId,
    documentId,
    attachmentId,
    user: req.auth.user
  });

  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.originalFileName,
      {
        headers: {
          'Content-Type': download.mimeType,
          'Content-Length': String(download.fileSize)
        }
      },
      (error) => {
        if (error && !res.headersSent) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  });
}

export async function deleteStageDocumentAttachmentHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);
  const attachmentId = parseAttachmentId(req.params.attachmentId);

  await assertProjectViewable(projectId, req.auth.user);
  await deleteStageDocumentAttachment({
    projectId,
    documentId,
    attachmentId,
    user: req.auth.user
  });

  res.status(204).send();
}

export async function getProjectDetailHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const detail = await getProjectDetail(projectId, req.auth.user);

  res.json({
    data: detail
  });
}
