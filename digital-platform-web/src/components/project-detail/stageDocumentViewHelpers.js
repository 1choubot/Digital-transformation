import {
  formatBusinessDepartment,
  formatDateTime,
  formatOrganizationRole,
  formatUser
} from '../../utils/format.js';

export const operationActionText = {
  'project.created': '项目创建',
  'document.submitted': '资料提交',
  'document.confirmed': '资料确认',
  'document.returned': '资料退回',
  'document.marked_not_applicable': '资料标记不适用',
  'document.restored_applicable': '资料恢复适用',
  'document.responsible_changed': '资料责任人变更',
  'document.attachment_uploaded': '资料附件上传',
  'document.attachment_deleted': '资料附件删除',
  'approval.submitted': '提交阶段审批',
  'approval.center_approved': '中心负责人审批通过',
  'approval.center_returned': '中心负责人审批退回',
  'approval.general_approved': '总经理审批通过',
  'approval.general_returned': '总经理审批退回',
  'approval.resubmitted': '重新提交阶段审批',
  'stage.advanced': '阶段推进',
  'project.completed': '项目完成'
};

export function isApplicable(document) {
  return document.isApplicable !== false;
}

export function buildFallbackCompletenessSummary(stage) {
  const requiredDocuments = (stage.documents || []).filter(
    (document) => document.isRequired && isApplicable(document)
  );
  const incompleteRequiredDocuments = requiredDocuments
    .filter((document) => document.status !== 'confirmed')
    .map((document) => ({
      id: document.id,
      documentCode: document.documentCode,
      documentName: document.documentName,
      status: document.status
    }));
  const requiredTotal = requiredDocuments.length;
  const incompleteRequiredCount = incompleteRequiredDocuments.length;
  const confirmedRequiredCount = requiredTotal - incompleteRequiredCount;

  return {
    requiredTotal,
    confirmedRequiredCount,
    incompleteRequiredCount,
    completionPercent:
      requiredTotal > 0 ? Math.round((confirmedRequiredCount / requiredTotal) * 100) : 100,
    incompleteRequiredDocuments
  };
}

export function stageCompleteness(stage) {
  return stage.completenessSummary || buildFallbackCompletenessSummary(stage);
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

export function formatResponsibilityCandidate(user) {
  const parts = [
    user.name,
    formatBusinessDepartment(user.department),
    formatOrganizationRole(user.organizationRole),
    user.role,
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
