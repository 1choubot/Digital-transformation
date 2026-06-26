import {
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
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
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

  if (isGeneralManagerUser(user) || isGeneralManagerAssistantUser(user)) {
    return true;
  }

  if (isCurrentUserProjectManager(user, project)) {
    return true;
  }

  if (isCurrentUserResponsible(user, document)) {
    return true;
  }

  return isDocumentRelatedToCenterManager(user, document);
}

export function canViewStageDocumentAttachments(user, { project, document }) {
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

export function canViewCompleteProjectAudit(user, project) {
  if (isSystemAdminUser(user) || isGeneralManagerAssistantUser(user)) {
    return false;
  }

  return isGeneralManagerUser(user) || isCurrentUserProjectManager(user, project);
}

export function canDownloadStageDocumentAttachment(user, { project, document }) {
  return canViewStageDocumentAttachments(user, { project, document });
}

export function canUploadStageDocumentAttachment(user, { document }) {
  return isDocumentApplicable(document) && isCurrentUserResponsible(user, document);
}

export function canDeleteStageDocumentAttachment(user, { project = null, document, attachment = null }) {
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
    canViewStageDocumentAttachments(user, { project, document }) &&
    Boolean(attachment.uploaded_by_user_id ?? attachment.uploadedByUserId) &&
    String(attachment.uploaded_by_user_id ?? attachment.uploadedByUserId) === String(user?.id)
  );
}

export function buildStageDocumentPermissions({ user, project, document }) {
  const canViewAttachments = canViewStageDocumentAttachments(user, { project, document });
  const canDownloadAttachment = canDownloadStageDocumentAttachment(user, { project, document });
  const canUploadAttachment = canUploadStageDocumentAttachment(user, { document });
  const canReviewDocument = canReviewStageDocument(user, document);
  const canSubmitDocument =
    !isGeneralManagerAssistantUser(user) &&
    !isSystemAdminUser(user) &&
    canSubmitStageDocument(user, { project, document });
  const canManageResponsibility =
    !isGeneralManagerAssistantUser(user) &&
    !isSystemAdminUser(user) &&
    canManageProjectResponsibility(user, project, { document });
  const canChangeApplicability =
    !isGeneralManagerAssistantUser(user) &&
    !isSystemAdminUser(user) &&
    canManageStageDocumentApplicability(user, { project, document });
  const canDeleteAttachment = canDeleteStageDocumentAttachment(user, { project, document });

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

export function attachStageDocumentPermissions({ user, project, document }) {
  const permissions = buildStageDocumentPermissions({ user, project, document });

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
