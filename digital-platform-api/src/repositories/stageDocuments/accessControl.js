import {
  BUSINESS_DEPARTMENT,
  canManageProjectResponsibility,
  canManageStageDocumentApplicability,
  canSubmitStageDocument,
  getDocumentOwnerDepartment,
  getDocumentReviewDepartment,
  isCenterManagerUser,
  isGeneralManagerAssistantUser,
  isGeneralManagerUser,
  isProjectManagerForProject,
  isSystemAdminUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  isInitiationOnlineFormDocument,
  isInitiationReviewDocument
} from '../../domain/initiationReview.js';
import {
  getDocumentCompletionMode,
  isReviewCompletionMode,
  isRevisionRequired,
  isRevisionResubmitted,
  isStageDocumentComplete
} from './shared.js';

function getProjectManagerUserId(project) {
  return project?.project_manager_user_id ?? project?.projectManagerUserId ?? null;
}

function getProjectCreatorUserId(project) {
  return project?.created_by_user_id ?? project?.createdByUserId ?? null;
}

function getBusinessResponsibleUserId(project) {
  return project?.business_responsible_user_id ?? project?.businessResponsibleUserId ?? null;
}

function getTechnicalResponsibleUserId(project) {
  return project?.technical_responsible_user_id ?? project?.technicalResponsibleUserId ?? null;
}

function getResponsibleUserId(document) {
  return document?.responsible_user_id ?? document?.responsibleUserId ?? null;
}

function getResponsibleDepartment(document) {
  return document?.responsible_department ?? document?.responsibleUser?.department ?? null;
}

function getDocumentStatus(document) {
  return document?.status ?? null;
}

function isDocumentApplicable(document) {
  const value = document?.is_applicable ?? document?.isApplicable;
  return value === undefined ? true : Boolean(value);
}

function isCurrentUserResponsible(user, document) {
  const responsibleUserId = getResponsibleUserId(document);
  return Boolean(responsibleUserId) && String(responsibleUserId) === String(user?.id);
}

function isCurrentUserProjectManager(user, project) {
  return (
    Boolean(getProjectManagerUserId(project)) &&
    isProjectManagerForProject(user, project)
  );
}

function isCurrentUserProjectCreator(user, project) {
  const creatorUserId = getProjectCreatorUserId(project);
  return Boolean(creatorUserId) && String(creatorUserId) === String(user?.id);
}

function isCurrentUserProjectResponsible(user, project) {
  const businessResponsibleUserId = getBusinessResponsibleUserId(project);
  const technicalResponsibleUserId = getTechnicalResponsibleUserId(project);
  return (
    (Boolean(businessResponsibleUserId) && String(businessResponsibleUserId) === String(user?.id)) ||
    (Boolean(technicalResponsibleUserId) && String(technicalResponsibleUserId) === String(user?.id))
  );
}

export function isProjectEnded(project) {
  return (project?.status ?? project?.project_status ?? null) === PROJECT_STATUS.ENDED;
}

function isGlobalBusinessViewer(user) {
  return isGeneralManagerUser(user) || isGeneralManagerAssistantUser(user) || isCenterManagerUser(user);
}

export function canViewCompleteStageDocumentSet(user, project) {
  if (isSystemAdminUser(user)) {
    return false;
  }

  return (
    isGlobalBusinessViewer(user) ||
    isCurrentUserProjectCreator(user, project) ||
    isCurrentUserProjectManager(user, project) ||
    isCurrentUserProjectResponsible(user, project)
  );
}

function isDocumentRelatedToCenterManager(user, document) {
  if (!isCenterManagerUser(user) || !isValidBusinessDepartment(user.department)) {
    return false;
  }

  const ownerDepartment = getDocumentOwnerDepartment(document);
  const reviewDepartment = getDocumentReviewDepartment(document);
  if (ownerDepartment || reviewDepartment) {
    return ownerDepartment === user.department || reviewDepartment === user.department;
  }

  const responsibleDepartment = getResponsibleDepartment(document);
  return Boolean(responsibleDepartment) && responsibleDepartment === user.department;
}

export function isStageDocumentReviewAuthority(user, document) {
  if (!isCenterManagerUser(user) || !isValidBusinessDepartment(user.department)) {
    return false;
  }

  const reviewDepartment = getDocumentReviewDepartment(document);
  if (reviewDepartment) {
    return reviewDepartment === user.department;
  }

  const responsibleDepartment = getResponsibleDepartment(document);
  return Boolean(responsibleDepartment) && responsibleDepartment === user.department;
}

export function canReviewStageDocument(user, document) {
  if (isInitiationReviewDocument(document)) {
    return false;
  }

  return (
    getDocumentStatus(document) === DOCUMENT_STATUS.SUBMITTED &&
    isReviewCompletionMode(getDocumentCompletionMode(document)) &&
    (!isRevisionRequired(document) || isRevisionResubmitted(document)) &&
    isStageDocumentReviewAuthority(user, document)
  );
}

export function canViewStageDocumentItem(user, { project, document }) {
  if (isSystemAdminUser(user)) {
    return false;
  }

  if (canViewCompleteStageDocumentSet(user, project)) {
    return true;
  }

  if (isCurrentUserResponsible(user, document)) {
    return true;
  }

  return isDocumentRelatedToCenterManager(user, document);
}

export function canViewStageDocumentAttachments(user, { project, document }) {
  if (isSystemAdminUser(user)) {
    return false;
  }

  if (canViewCompleteStageDocumentSet(user, project)) {
    return true;
  }

  if (isCurrentUserResponsible(user, document)) {
    return true;
  }

  return isDocumentRelatedToCenterManager(user, document);
}

export function canViewCompleteProjectAudit(user, project) {
  if (isSystemAdminUser(user)) {
    return false;
  }

  return isGeneralManagerUser(user) || isCurrentUserProjectManager(user, project);
}

export function canViewProjectOperationLogs(user, project) {
  return canViewCompleteStageDocumentSet(user, project);
}

export function canDownloadStageDocumentAttachment(user, { project, document }) {
  return canViewStageDocumentAttachments(user, { project, document });
}

export function canUploadStageDocumentAttachment(user, { project = null, document }) {
  if (isProjectEnded(project)) {
    return false;
  }

  if (isInitiationOnlineFormDocument(document)) {
    return false;
  }

  return isDocumentApplicable(document) && isCurrentUserResponsible(user, document);
}

function canAccessStageDocumentAttachmentForDelete(user, { project, document }) {
  if (isProjectEnded(project)) {
    return false;
  }

  if (isSystemAdminUser(user) || isGeneralManagerAssistantUser(user)) {
    return false;
  }

  if (isGeneralManagerUser(user) || isCurrentUserProjectManager(user, project)) {
    return true;
  }

  if (isCurrentUserResponsible(user, document)) {
    return true;
  }

  return isDocumentRelatedToCenterManager(user, document);
}

export function canDeleteStageDocumentAttachment(user, { project = null, document, attachment = null }) {
  if (isProjectEnded(project)) {
    return false;
  }

  if (isSystemAdminUser(user) || isGeneralManagerAssistantUser(user)) {
    return false;
  }

  if (isStageDocumentComplete(document)) {
    return false;
  }

  if (!attachment) {
    return false;
  }

  return (
    canAccessStageDocumentAttachmentForDelete(user, { project, document }) &&
    Boolean(attachment.uploaded_by_user_id ?? attachment.uploadedByUserId) &&
    String(attachment.uploaded_by_user_id ?? attachment.uploadedByUserId) === String(user?.id)
  );
}

export function canManageInitiationOnlineFormResponsibility(user, document) {
  const documentCode = String(document?.document_code ?? document?.documentCode ?? '').trim();
  if (documentCode !== INITIATION_REWORK_TARGET_DOCUMENT_CODE) {
    return false;
  }

  if (isSystemAdminUser(user) || isGeneralManagerAssistantUser(user)) {
    return false;
  }

  return isCenterManagerUser(user) && user.department === BUSINESS_DEPARTMENT.MARKETING_CENTER;
}

export function buildStageDocumentPermissions({ user, project, document, relatedDocumentsByCode = null }) {
  const canViewAttachments = canViewStageDocumentAttachments(user, { project, document });
  const canDownloadAttachment = canDownloadStageDocumentAttachment(user, { project, document });
  const projectEnded = isProjectEnded(project);
  const canUploadAttachment = !projectEnded && canUploadStageDocumentAttachment(user, { project, document });
  const canReviewDocument = !projectEnded && canReviewStageDocument(user, document);
  const isOnlineFormOnlyDocument = isInitiationOnlineFormDocument(document);
  const canSubmitDocument =
    !projectEnded &&
    !isGeneralManagerAssistantUser(user) &&
    !isSystemAdminUser(user) &&
    !isOnlineFormOnlyDocument &&
    canSubmitStageDocument(user, { project, document });
  const canManageResponsibility = isOnlineFormOnlyDocument
    ? !projectEnded && canManageInitiationOnlineFormResponsibility(user, document)
    : !isGeneralManagerAssistantUser(user) &&
      !isSystemAdminUser(user) &&
      !projectEnded &&
      canManageProjectResponsibility(user, project, { document });
  const canChangeApplicability =
    !projectEnded &&
    !isGeneralManagerAssistantUser(user) &&
    !isSystemAdminUser(user) &&
    canManageStageDocumentApplicability(user, { project, document });
  const canDeleteAttachment = !projectEnded && canDeleteStageDocumentAttachment(user, { project, document });

  return {
    canViewAttachments,
    canUploadAttachment,
    canDownloadAttachment,
    canDeleteAttachment,
    canSubmitDocument,
    canReviewDocument,
    canManageResponsibility,
    canChangeApplicability
  };
}

export function attachStageDocumentPermissions({ user, project, document, relatedDocumentsByCode = null }) {
  const permissions = buildStageDocumentPermissions({ user, project, document, relatedDocumentsByCode });

  return {
    ...document,
    permissions,
    ...permissions
  };
}

export function filterStageDocumentsForUser({ user, project, documents }) {
  return documents.filter((document) => canViewStageDocumentItem(user, { project, document }));
}

export function buildAttachmentPermissions({ user, project, document, attachment = null }) {
  return {
    canDownload: canDownloadStageDocumentAttachment(user, { project, document }),
    canDelete: canDeleteStageDocumentAttachment(user, { project, document, attachment })
  };
}
