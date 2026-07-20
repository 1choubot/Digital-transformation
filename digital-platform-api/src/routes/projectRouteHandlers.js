import { normalizeCreateProjectInput, ValidationError } from '../domain/projects.js';
import { canCreateProject } from '../domain/organization.js';
import { DOCUMENT_APPLICABILITY_ACTION } from '../domain/stageDocumentApplicability.js';
import { DOCUMENT_STATUS_ACTION } from '../domain/stageDocumentStatus.js';
import {
  assertProjectAuditViewable,
  assertProjectViewable,
  advanceProjectStage,
  assignSolutionDesignRoles,
  approveContractSigningPreparationFile,
  approveContractSigningPaymentRelease,
  confirmContractSigningScanFile,
  getContractSigningWorkflow,
  approveSolutionDesignWorkflowNode,
  approveStageApproval,
  canViewFinanceCostApprovalComment,
  createProject,
  completeContractSigningAdvancePayment,
  getProjectDetail,
  getProjectOverviewDashboard,
  getProjectWorkspace,
  getContractSigningUploadDownload,
  getSolutionDesignAnalysisGeneratedFileDownload,
  getSolutionDesignAnalysisForm,
  getSolutionDesignQuotationForm,
  getSolutionDesignQuotationGeneratedFileDownload,
  getSolutionDesignReviewGeneratedFileDownload,
  getSolutionDesignReviewForm,
  getSolutionDesignUploadDownload,
  getSolutionDesignWorkflow,
  listSolutionDesignUploads,
  markSolutionDesignUploadExemption,
  listStageApprovalHistory,
  listProjects,
  normalizeProjectOverviewDashboardFilters,
  processSolutionDesignQuotationResult,
  ProjectAuthorizationError,
  ProjectNotFoundError,
  projectExists,
  resubmitStageApproval,
  returnContractSigningPreparationFile,
  requestContractSigningPaymentRelease,
  returnSolutionDesignWorkflowNode,
  returnStageApproval,
  saveSolutionDesignAnalysisForm,
  saveSolutionDesignQuotationForm,
  saveSolutionDesignReviewForm,
  selectSolutionDesignQuotationTenderBranch,
  submitSolutionDesignAnalysisForm,
  submitSolutionDesignQuotation,
  submitSolutionDesignQuotationForm,
  submitSolutionDesignReviewForm,
  submitSolutionDesignWorkflowNode,
  submitStageApproval,
  cancelSolutionDesignUploadExemption,
  updateProjectCode,
  uploadContractSigningWorkflowFile,
  uploadSolutionDesignWorkflowFile
} from '../repositories/projectRepository.js';
import {
  listProjectOperationLogs,
  normalizeOperationLogLimit
} from '../repositories/operationLogRepository.js';
import {
  approveInitiationReviewNode,
  generateStageDocumentOnlineFormFile,
  getProjectStageDocumentChecklist,
  completeProjectStageDocumentRevision,
  deleteStageDocumentOnlineFormImage,
  getStageDocumentOnlineForm,
  getStageDocumentGeneratedFileDownload,
  getStageDocumentGeneratedFileStatus,
  getStageDocumentOnlineFormImageDownload,
  returnInitiationReviewNode,
  saveStageDocumentOnlineForm,
  STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR,
  submitStageDocumentOnlineForm,
  uploadStageDocumentOnlineFormImage,
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
import { CONTRACT_SIGNING_UPLOAD_MAX_FILE_SIZE } from '../storage/contractSigningUploadStorage.js';
import { SOLUTION_DESIGN_UPLOAD_MAX_FILE_SIZE } from '../storage/solutionDesignUploadStorage.js';
import { STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_FILE_SIZE } from '../storage/stageDocumentOnlineFormImageStorage.js';
import { searchActiveProjectsForDailyReports } from '../repositories/dailyReportRepository.js';
import { getProjectNavigation } from '../services/navigationService.js';

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

function parseOnlineFormImageId(rawValue) {
  return parseAttachmentPositiveId(
    rawValue,
    STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.INVALID_IMAGE_ID,
    'imageId'
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
  const includeFinanceApprovalComments = await canViewFinanceCostApprovalComment({
    projectId,
    user: req.auth.user
  });
  const logs = await listProjectOperationLogs(projectId, limit, { includeFinanceApprovalComments });

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

export async function getProjectWorkspaceHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workspace = await getProjectWorkspace(projectId, req.auth.user);

  res.json({
    data: workspace
  });
}

export async function getProjectNavigationHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const navigation = await getProjectNavigation(projectId, req.auth.user);

  res.json({
    data: navigation
  });
}

export async function getSolutionDesignWorkflowHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await getSolutionDesignWorkflow({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function getContractSigningWorkflowHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await getContractSigningWorkflow({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function uploadContractSigningWorkflowFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const file = await readMultipartFile(req, {
    maxFileSize: CONTRACT_SIGNING_UPLOAD_MAX_FILE_SIZE
  });
  const result = await uploadContractSigningWorkflowFile({
    projectId,
    slotKey: req.params.slotKey,
    file,
    user: req.auth.user
  });

  res.status(201).json({
    data: result
  });
}

export async function downloadContractSigningWorkflowFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const download = await getContractSigningUploadDownload({
    projectId,
    slotKey: req.params.slotKey,
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

export async function approveContractSigningPreparationFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await approveContractSigningPreparationFile({
    projectId,
    slotKey: req.params.slotKey,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function returnContractSigningPreparationFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await returnContractSigningPreparationFile({
    projectId,
    slotKey: req.params.slotKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function confirmContractSigningScanFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await confirmContractSigningScanFile({
    projectId,
    slotKey: req.params.slotKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function completeContractSigningAdvancePaymentHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await completeContractSigningAdvancePayment({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function requestContractSigningPaymentReleaseHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await requestContractSigningPaymentRelease({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function approveContractSigningPaymentReleaseHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await approveContractSigningPaymentRelease({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function assignSolutionDesignRolesHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await assignSolutionDesignRoles({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function selectSolutionDesignQuotationTenderBranchHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await selectSolutionDesignQuotationTenderBranch({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function submitSolutionDesignQuotationHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await submitSolutionDesignQuotation({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function processSolutionDesignQuotationResultHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await processSolutionDesignQuotationResult({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function getSolutionDesignQuotationFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const quotationForm = await getSolutionDesignQuotationForm({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: quotationForm
  });
}

export async function saveSolutionDesignQuotationFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const quotationForm = await saveSolutionDesignQuotationForm({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: quotationForm
  });
}

export async function submitSolutionDesignQuotationFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const quotationForm = await submitSolutionDesignQuotationForm({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: quotationForm
  });
}

export async function downloadSolutionDesignQuotationGeneratedFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const download = await getSolutionDesignQuotationGeneratedFileDownload({
    projectId,
    user: req.auth.user
  });

  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.fileName,
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

export async function getSolutionDesignAnalysisFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const analysisForm = await getSolutionDesignAnalysisForm({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: analysisForm
  });
}

export async function saveSolutionDesignAnalysisFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const analysisForm = await saveSolutionDesignAnalysisForm({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: analysisForm
  });
}

export async function submitSolutionDesignAnalysisFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const analysisForm = await submitSolutionDesignAnalysisForm({
    projectId,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: analysisForm
  });
}

export async function downloadSolutionDesignAnalysisGeneratedFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const download = await getSolutionDesignAnalysisGeneratedFileDownload({
    projectId,
    user: req.auth.user
  });

  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.fileName,
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

export async function getSolutionDesignReviewFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const reviewForm = await getSolutionDesignReviewForm({
    projectId,
    nodeKey: req.params.nodeKey,
    user: req.auth.user
  });

  res.json({
    data: reviewForm
  });
}

export async function downloadSolutionDesignReviewGeneratedFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const download = await getSolutionDesignReviewGeneratedFileDownload({
    projectId,
    nodeKey: req.params.nodeKey,
    user: req.auth.user
  });

  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.fileName,
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

export async function saveSolutionDesignReviewFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const reviewForm = await saveSolutionDesignReviewForm({
    projectId,
    nodeKey: req.params.nodeKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: reviewForm
  });
}

export async function submitSolutionDesignReviewFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const reviewForm = await submitSolutionDesignReviewForm({
    projectId,
    nodeKey: req.params.nodeKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: reviewForm
  });
}

export async function listSolutionDesignUploadsHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const uploads = await listSolutionDesignUploads({
    projectId,
    user: req.auth.user
  });

  res.json({
    data: uploads
  });
}

export async function uploadSolutionDesignWorkflowFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const file = await readMultipartFile(req, {
    maxFileSize: SOLUTION_DESIGN_UPLOAD_MAX_FILE_SIZE
  });
  const result = await uploadSolutionDesignWorkflowFile({
    projectId,
    slotKey: req.params.slotKey,
    file,
    user: req.auth.user
  });

  res.status(201).json({
    data: result
  });
}

export async function markSolutionDesignUploadExemptionHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const uploads = await markSolutionDesignUploadExemption({
    projectId,
    slotKey: req.params.slotKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: uploads
  });
}

export async function cancelSolutionDesignUploadExemptionHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const uploads = await cancelSolutionDesignUploadExemption({
    projectId,
    slotKey: req.params.slotKey,
    user: req.auth.user
  });

  res.json({
    data: uploads
  });
}

export async function downloadSolutionDesignWorkflowFileHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const download = await getSolutionDesignUploadDownload({
    projectId,
    slotKey: req.params.slotKey,
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

export async function submitSolutionDesignWorkflowNodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await submitSolutionDesignWorkflowNode({
    projectId,
    nodeKey: req.params.nodeKey,
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function approveSolutionDesignWorkflowNodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await approveSolutionDesignWorkflowNode({
    projectId,
    nodeKey: req.params.nodeKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
  });
}

export async function returnSolutionDesignWorkflowNodeHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const workflow = await returnSolutionDesignWorkflowNode({
    projectId,
    nodeKey: req.params.nodeKey,
    payload: req.body || {},
    user: req.auth.user
  });

  res.json({
    data: workflow
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
  const result = await approveStageApproval({
    projectId,
    stageId,
    user: req.auth.user,
    comment: req.body?.comment
  });

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

export async function getStageDocumentOnlineFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);
  const form = await getStageDocumentOnlineForm({
    projectId,
    documentId,
    user: req.auth.user
  });

  res.json({
    data: {
      form
    }
  });
}

export async function saveStageDocumentOnlineFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);
  const form = await saveStageDocumentOnlineForm({
    projectId,
    documentId,
    user: req.auth.user,
    formData: req.body?.formData
  });

  res.json({
    data: {
      form
    }
  });
}

export async function submitStageDocumentOnlineFormHandler(req, res) {
  const projectId = parseProjectId(req.params.projectId);
  const documentId = parseDocumentId(req.params.documentId);
  const result = await submitStageDocumentOnlineForm({
    projectId,
    documentId,
    user: req.auth.user,
    formData: req.body?.formData
  });

  res.json({
    data: result
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
    comment: req.body?.comment,
    projectExecutionMode: req.body?.projectExecutionMode
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
    returnReason: req.body?.returnReason ?? req.body?.comment,
    returnAction: req.body?.returnAction ?? req.body?.returnTarget,
    endReason: req.body?.endReason
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

export async function getStageDocumentGeneratedFileStatusHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);

  await assertProjectViewable(projectId, req.auth.user);
  const status = await getStageDocumentGeneratedFileStatus({
    projectId,
    documentId,
    user: req.auth.user
  });

  res.json({
    data: status
  });
}

export async function generateStageDocumentOnlineFormFileHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);

  await assertProjectViewable(projectId, req.auth.user);
  const result = await generateStageDocumentOnlineFormFile({
    projectId,
    documentId,
    user: req.auth.user
  });

  res.status(201).json({
    data: result
  });
}

export async function downloadStageDocumentGeneratedFileHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);

  await assertProjectViewable(projectId, req.auth.user);
  const download = await getStageDocumentGeneratedFileDownload({
    projectId,
    documentId,
    user: req.auth.user
  });

  await new Promise((resolve, reject) => {
    res.download(
      download.filePath,
      download.fileName,
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

export async function uploadStageDocumentOnlineFormImageHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);
  const fieldKey = String(req.params.fieldKey || '').trim();

  await assertProjectViewable(projectId, req.auth.user);
  const file = await readMultipartFile(req, {
    maxFileSize: STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_FILE_SIZE
  });
  const image = await uploadStageDocumentOnlineFormImage({
    projectId,
    documentId,
    fieldKey,
    user: req.auth.user,
    file
  });

  res.status(201).json({
    data: image
  });
}

export async function downloadStageDocumentOnlineFormImageHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);
  const imageId = parseOnlineFormImageId(req.params.imageId);

  await assertProjectViewable(projectId, req.auth.user);
  const download = await getStageDocumentOnlineFormImageDownload({
    projectId,
    documentId,
    imageId,
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

export async function deleteStageDocumentOnlineFormImageHandler(req, res) {
  const projectId = parseAttachmentProjectId(req.params.projectId);
  const documentId = parseAttachmentDocumentId(req.params.documentId);
  const imageId = parseOnlineFormImageId(req.params.imageId);

  await assertProjectViewable(projectId, req.auth.user);
  await deleteStageDocumentOnlineFormImage({
    projectId,
    documentId,
    imageId,
    user: req.auth.user
  });

  res.status(204).send();
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
