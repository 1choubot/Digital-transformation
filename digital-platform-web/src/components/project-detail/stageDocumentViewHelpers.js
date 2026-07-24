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
  'project.ended': '项目结束',
  'document.submitted': '提交资料',
  'document.confirmed': '资料审核通过',
  'document.returned': '退回资料审核',
  'document.revision_requested': '要求资料返工',
  'document.revision_completed': '完成资料返工',
  'document.marked_not_applicable': '资料标记不适用',
  'document.restored_applicable': '资料恢复适用',
  'document.responsible_changed': '资料责任人变更',
  'document.attachment_uploaded': '资料附件上传',
  'document.attachment_deleted': '资料附件删除',
  'form.image_uploaded': '在线表单图片上传',
  'form.image_deleted': '在线表单图片删除',
  'template_file.generated': '模板文件生成',
  'template_file.failed': '模板文件生成失败',
  'form.updated': '保存在线表单',
  'form.submitted': '提交在线表单',
  'approval.submitted': '提交阶段关口审批',
  'approval.center_approved': '中心负责人关口审批通过',
  'approval.center_returned': '中心负责人关口审批退回',
  'approval.general_approved': '总经理关口审批通过',
  'approval.general_returned': '总经理关口审批退回',
  'approval.resubmitted': '重新提交阶段关口审批',
  'initiation_review.submitted': '启动 1.2 评价/最终审批',
  'initiation_review.business_approved': '营销评价提交',
  'initiation_review.business_returned': '营销评价退回',
  'initiation_review.technical_approved': '研发评价提交',
  'initiation_review.technical_returned': '研发评价退回',
  'initiation_review.general_approved': '总经理审批通过',
  'initiation_review.general_returned': '总经理审批不通过',
  'initiation_review.general_activated': '总经理审批待办生成',
  'initiation_review.restored': '1.2 节点恢复待审',
  'initiation_review.completed': '1.2 评价与最终审批完成',
  'initiation.evaluation.submitted': '1.2 评价提交',
  'initiation.approval.approved': '1.2 总经理审批通过',
  'initiation.approval.returned': '1.2 总经理审批不通过',
  'contract_signing.technical_agreement_uploaded': '技术协议上传',
  'contract_signing.technical_agreement_approved': '技术协议审批通过',
  'contract_signing.technical_agreement_returned': '技术协议审批不通过',
  'contract_signing.sales_contract_uploaded': '销售合同上传',
  'contract_signing.sales_contract_approved': '销售合同审批通过',
  'contract_signing.sales_contract_returned': '销售合同审批不通过',
  'contract_signing.technical_agreement_scan_uploaded': '技术协议扫描件上传',
  'contract_signing.technical_agreement_scan_confirmed': '技术协议扫描件线下签署确认通过',
  'contract_signing.technical_agreement_scan_returned': '技术协议扫描件线下签署确认不通过',
  'contract_signing.technical_agreement_customer_returned': '客户退回技术协议',
  'contract_signing.sales_contract_scan_uploaded': '销售合同扫描件上传',
  'contract_signing.sales_contract_scan_confirmed': '销售合同扫描件线下签署确认通过',
  'contract_signing.sales_contract_scan_returned': '销售合同扫描件线下签署确认不通过',
  'contract_signing.sales_contract_customer_returned': '客户退回销售合同',
  'contract_signing.completed': '签订协议和合同完成',
  'contract_signing.advance_payment_completed': '项目预付款完成',
  'contract_signing.advance_payment_release_requested': '未付款申请总经理放行',
  'contract_signing.advance_payment_release_approved': '总经理预付款放行通过',
  'contract_signing.advance_payment_release_approved_unpaid': '总经理未付款并通过',
  'contract_signing.advance_payment_release_approved_paid': '总经理已付款通过',
  'contract_signing.advance_payment_generated_kickoff_notice': '预付款确认生成项目启动通知',
  'contract_signing.project_kickoff_notice_uploaded': '项目启动通知上传',
  'detailed_design.roles_assigned': '详细设计角色分配',
  'detailed_design.project_kickoff_book_uploaded': '上传项目启动书',
  'detailed_design.work_plan_uploaded': '上传详细设计工作计划',
  'detailed_design.file_uploaded': '上传详细设计资料',
  'detailed_design.node_submitted': '提交详细设计节点',
  'detailed_design.file_upload_exempted': '标记详细设计资料无需上传',
  'detailed_design.file_upload_exemption_cancelled': '取消详细设计资料无需上传',
  'detailed_design.internal_review_form_saved': '保存内部设计评审表',
  'detailed_design.internal_review_form_submitted': '提交内部设计评审表',
  'detailed_design.internal_review_form_generated': '生成内部设计评审记录表',
  'detailed_design.internal_review_form_generation_failed': '内部设计评审记录表生成失败',
  'detailed_design.internal_review_approved': '内部设计评审通过',
  'detailed_design.internal_review_returned': '内部设计评审退回',
  'detailed_design.customer_review_form_saved': '保存客户设计评审表',
  'detailed_design.customer_review_form_submitted': '提交客户设计评审表',
  'detailed_design.customer_review_form_generated': '生成客户设计评审记录表',
  'detailed_design.customer_review_form_generation_failed': '客户设计评审记录表生成失败',
  'detailed_design.customer_review_approved': '客户设计评审通过',
  'detailed_design.customer_review_returned': '客户设计评审退回',
  'detailed_design.drawing_review_record_uploaded': '上传图纸审查记录',
  'detailed_design.drawing_review_passed': '图纸审查通过',
  'detailed_design.drawing_review_returned': '图纸审查退回',
  'detailed_design.drawing_review_rd_approved': '研发图纸审查审批通过',
  'detailed_design.drawing_review_rd_returned': '研发图纸审查审批退回',
  'detailed_design.customer_drawing_countersign_uploaded': '上传客户会签图纸扫描件',
  'stage.advanced': '阶段推进',
  'project.completed': '项目完成'
};

export function isApplicable(document) {
  return document.isApplicable !== false;
}

export function getCompletionMode(document) {
  return document?.completionMode || document?.completion_mode || 'approval_required';
}

export function isRevisionRequired(document) {
  const value = document?.revisionRequired ?? document?.revision_required;
  return value === true || value === 1 || value === '1';
}

export function isRevisionResubmitted(document) {
  if (!isRevisionRequired(document) || document?.status !== 'submitted') {
    return false;
  }

  if (typeof document?.revisionResubmitted === 'boolean') {
    return document.revisionResubmitted;
  }

  return Boolean(document?.revisionResubmittedAt ?? document?.revision_resubmitted_at);
}

export function isReviewCompletionMode(document) {
  const completionMode = getCompletionMode(document);
  return completionMode === 'approval_required' || completionMode === 'conditional_approval';
}

export function isSubmitCompletionMode(document) {
  const completionMode = getCompletionMode(document);
  return completionMode === 'submit_only' || completionMode === 'conditional_submit';
}

export function isInitiationOnlineFormDocument(document) {
  return ['1.1', '1.2', '1.3'].includes(document?.documentCode ?? document?.document_code);
}

export function isDetailedDesignWorkflowStageDocument(document) {
  const source =
    document?.derivedCompletionSource ??
    document?.derived_completion_source ??
    document?.detailedDesignDerivedCompletion?.source ??
    document?.detailed_design_derived_completion?.source ??
    null;
  return source === 'detailed_design_workflow';
}

export function canUseOrdinaryStageDocumentWriteAction(document) {
  return !isDetailedDesignWorkflowStageDocument(document);
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

  if (isRevisionRequired(document)) {
    return isReviewCompletionMode(document) && isRevisionResubmitted(document)
      ? 'pending_review'
      : 'revision_required';
  }

  if (document?.documentCode === '1.2' && document?.initiationReview) {
    if (document.initiationReview.isComplete) {
      return 'completed';
    }

    return document.initiationReview.blockedByRework ? 'revision_required' : 'pending_review';
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
      initiationReview: document.initiationReview ?? null,
      completionMode: getCompletionMode(document),
      isComplete: false,
      completionStatus: getCompletionStatus(document),
      revisionRequired: isRevisionRequired(document),
      revisionReason: document.revisionReason ?? document.revision_reason ?? null,
      revisionSourceDocumentId: document.revisionSourceDocumentId ?? document.revision_source_document_id ?? null,
      revisionSourceDocument: document.revisionSourceDocument ?? null,
      revisionResubmittedByUserId:
        document.revisionResubmittedByUserId ?? document.revision_resubmitted_by_user_id ?? null,
      revisionResubmittedAt: document.revisionResubmittedAt ?? document.revision_resubmitted_at ?? null
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
      isApplicable: isApplicable(document),
      revisionRequired: isRevisionRequired(document),
      revisionReason: document.revisionReason ?? document.revision_reason ?? null,
      revisionSourceDocumentId: document.revisionSourceDocumentId ?? document.revision_source_document_id ?? null,
      revisionSourceDocument: document.revisionSourceDocument ?? null
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

export function formatRevisionSummary(document) {
  const reason = document?.revisionReason || document?.revision_reason || '未填写返工原因';
  const source = document?.revisionSourceDocument || null;
  const sourceText = source?.documentCode
    ? `${source.documentCode} ${source.documentName || ''}`.trim()
    : document?.revisionSourceDocumentId
      ? `来源资料ID ${document.revisionSourceDocumentId}`
      : '来源审批资料未记录';

  return `需返工：${reason}；来源：${sourceText}`;
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
  return (
    isApplicable(document) &&
    (
      document.status === 'not_submitted' ||
      document.status === 'returned' ||
      (isRevisionRequired(document) && isReviewCompletionMode(document) && !isRevisionResubmitted(document))
    )
  );
}

export function canReview(document) {
  return (
    isApplicable(document) &&
    isReviewCompletionMode(document) &&
    document.status === 'submitted' &&
    (!isRevisionRequired(document) || isRevisionResubmitted(document))
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
