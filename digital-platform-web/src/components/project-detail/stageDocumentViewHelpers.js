import {
  formatDateTime,
  formatBusinessDepartment,
  formatBusinessUser,
  formatCompletionMode,
  formatCompletionStatus,
  formatUser
} from '../../utils/format.js';

export const operationActionText = {
  'project.created': '项目创建',
  'project.code_updated': '项目编号更新',
  'document.submitted': '提交资料',
  'document.confirmed': '资料审核通过',
  'document.returned': '退回资料审核',
  'document.marked_not_applicable': '资料标记不适用',
  'document.restored_applicable': '资料恢复适用',
  'document.responsible_changed': '资料责任人变更',
  'document.attachment_uploaded': '资料附件上传',
  'document.attachment_deleted': '资料附件删除',
  'approval.submitted': '提交阶段关口审批',
  'approval.center_approved': '中心负责人关口审批通过',
  'approval.center_returned': '中心负责人关口审批退回',
  'approval.general_approved': '总经理关口审批通过',
  'approval.general_returned': '总经理关口审批退回',
  'approval.resubmitted': '重新提交阶段关口审批',
  'stage.advanced': '阶段推进',
  'project.completed': '项目完成'
};

export function isApplicable(document) {
  return document.isApplicable !== false;
}

export function getCompletionMode(document) {
  return document?.completionMode || document?.completion_mode || 'approval_required';
}

export function getCompletionStatus(document) {
  if (document?.completionStatus) {
    return document.completionStatus;
  }

  if (!isApplicable(document)) {
    return 'not_applicable';
  }

  if (document?.status === 'returned') {
    return 'incomplete';
  }

  const completionMode = getCompletionMode(document);
  if (completionMode === 'submit_only' || completionMode === 'conditional_submit') {
    return ['submitted', 'confirmed'].includes(document?.status) ? 'completed' : 'incomplete';
  }

  if (document?.status === 'confirmed') {
    return 'completed';
  }

  return document?.status === 'submitted' ? 'pending_review' : 'incomplete';
}

export function isDocumentComplete(document) {
  if (typeof document?.isComplete === 'boolean') {
    return document.isComplete;
  }

  return getCompletionStatus(document) === 'completed' || getCompletionStatus(document) === 'not_applicable';
}

export function formatDocumentCompletionMode(document) {
  return formatCompletionMode(getCompletionMode(document));
}

export function formatDocumentCompletionStatus(document) {
  return formatCompletionStatus(getCompletionStatus(document));
}

export function buildFallbackCompletenessSummary(stage) {
  const applicableDocuments = (stage.documents || []).filter(isApplicable);
  const incompleteRequiredDocuments = applicableDocuments
    .filter((document) => !isDocumentComplete(document))
    .map((document) => ({
      id: document.id,
      documentCode: document.documentCode,
      documentName: document.documentName,
      status: document.status,
      completionMode: getCompletionMode(document),
      isComplete: false,
      completionStatus: getCompletionStatus(document)
    }));
  const requiredTotal = applicableDocuments.length;
  const incompleteRequiredCount = incompleteRequiredDocuments.length;
  const completedRequiredCount = requiredTotal - incompleteRequiredCount;

  return {
    requiredTotal,
    completedRequiredCount,
    confirmedRequiredCount: completedRequiredCount,
    incompleteRequiredCount,
    completionPercent:
      requiredTotal > 0 ? Math.round((completedRequiredCount / requiredTotal) * 100) : 100,
    incompleteRequiredDocuments
  };
}

export function stageCompleteness(stage) {
  return stage.completenessSummary || buildFallbackCompletenessSummary(stage);
}

export function buildStageDocumentSummary(stage) {
  const documents = stage.documents || [];
  const applicableDocuments = documents.filter(isApplicable);
  const optionalConditionalDocuments = documents
    .filter((document) => !document.isRequired)
    .map((document) => ({
      id: document.id,
      documentCode: document.documentCode,
      documentName: document.documentName,
      status: document.status,
      completionMode: getCompletionMode(document),
      isComplete: isDocumentComplete(document),
      completionStatus: getCompletionStatus(document),
      isApplicable: isApplicable(document)
    }));

  return {
    documentTotal: documents.length,
    applicableTotal: applicableDocuments.length,
    optionalConditionalTotal: optionalConditionalDocuments.length,
    applicableOptionalConditionalTotal: optionalConditionalDocuments.filter((document) => document.isApplicable).length,
    optionalConditionalDocuments
  };
}

export function stageDocumentSummary(stage) {
  return stage.documentSummary || buildStageDocumentSummary(stage);
}

export function formatApplicability(document) {
  return isApplicable(document) ? '适用' : '不适用';
}

export function isResponsibleUserDisabled(document) {
  return Boolean(document.responsibleUser) && document.responsibleUser.isEnabled === false;
}

export function formatResponsibleUser(document) {
  if (!document.responsibleUser) {
    return '未分配';
  }

  return formatUser(document.responsibleUser);
}

export function formatDepartment(value) {
  return value ? formatBusinessDepartment(value) : '-';
}

export function isDocumentRelatedToDepartmentByOwnership(document, department) {
  if (!document || !department) {
    return false;
  }

  const ownerDepartment = document.ownerDepartment ?? document.owner_department ?? null;
  const reviewDepartment = document.reviewDepartment ?? document.review_department ?? null;
  if (ownerDepartment || reviewDepartment) {
    return ownerDepartment === department || reviewDepartment === department;
  }

  const responsibleDepartment =
    document.responsibleUser?.department ?? document.responsible_department ?? null;
  return responsibleDepartment === department;
}

export function formatResponsibilityCandidate(user) {
  const parts = [
    formatBusinessUser(user),
    user.account ? `账号 ${user.account}` : ''
  ].filter(Boolean);
  return parts.join(' / ') || `用户ID ${user.id}`;
}

export function showDisabledResponsibleOption(document, responsibilityCandidates) {
  if (!isResponsibleUserDisabled(document) || !document.responsibleUserId) {
    return false;
  }

  return !responsibilityCandidates.some((user) => String(user.id) === String(document.responsibleUserId));
}

export function canSubmit(document) {
  return isApplicable(document) && (document.status === 'not_submitted' || document.status === 'returned');
}

export function canReview(document) {
  return (
    isApplicable(document) &&
    getCompletionMode(document) === 'approval_required' &&
    document.status === 'submitted'
  );
}

export function actionKey(documentId, action) {
  return `${documentId}:${action}`;
}

export function formatTrace(userId, at) {
  if (!userId && !at) {
    return '-';
  }

  return [`用户ID ${userId || '-'}`, formatDateTime(at)].filter(Boolean).join(' / ');
}

export function formatOperationActor(log) {
  if (log.actorUser) {
    return formatUser(log.actorUser);
  }

  return log.actorUserId ? `用户ID ${log.actorUserId}` : '-';
}

export function formatOperationAction(actionType) {
  return operationActionText[actionType] || actionType || '-';
}

export function formatAttachmentUploader(attachment) {
  if (!attachment?.uploadedByUser) {
    return attachment?.uploadedByUserId ? `用户ID ${attachment.uploadedByUserId}` : '-';
  }

  return formatUser(attachment.uploadedByUser);
}

export function getSelectedResponsibleUserId(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const id = Number.parseInt(String(value), 10);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== String(value)) {
    throw new Error('INVALID_RESPONSIBILITY_SELECTION');
  }

  return id;
}
