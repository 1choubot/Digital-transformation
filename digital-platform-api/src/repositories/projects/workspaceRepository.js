import { INITIATION_NOTICE_DOCUMENT_CODE, INITIATION_REVIEW_DOCUMENT_CODE, INITIATION_REWORK_TARGET_DOCUMENT_CODE } from '../../domain/initiationReview.js';
import { getProjectStageDocumentChecklist } from '../stageDocuments/checklistRepository.js';
import { getProjectDetail } from './coreRepository.js';

const INITIATION_STAGE_KEY = 'initiation';

const INITIATION_NODE_CONFIG = Object.freeze([
  {
    nodeKey: 'project_input',
    nodeName: '项目输入',
    outputDocumentCodes: []
  },
  {
    nodeKey: 'market_research',
    nodeName: '项目市场调研',
    outputDocumentCodes: [INITIATION_REWORK_TARGET_DOCUMENT_CODE],
    formKey: 'initiation_requirement'
  },
  {
    nodeKey: 'initiation_approval',
    nodeName: '项目立项审批',
    outputDocumentCodes: [INITIATION_REVIEW_DOCUMENT_CODE],
    formKey: 'initiation_approval'
  },
  {
    nodeKey: 'initiation_notice',
    nodeName: '项目立项通知',
    outputDocumentCodes: [INITIATION_NOTICE_DOCUMENT_CODE],
    formKey: 'initiation_notice'
  }
]);

function getDocumentByCode(documents, documentCode) {
  return documents.find((document) => document.documentCode === documentCode) || null;
}

function buildDocumentActionHints(document) {
  const permissions = document?.permissions || {};
  return [
    permissions.canManageResponsibility || document?.canManageResponsibility ? 'assign_responsible_user' : null,
    permissions.canSubmitDocument || document?.canSubmitDocument ? 'edit_or_submit_form' : null,
    document?.initiationReview?.nodes?.some((node) => node.canAct) ? 'handle_initiation_review' : null
  ].filter(Boolean);
}

function buildDocumentBlockingReasons(document) {
  if (!document) {
    return ['关联产出未初始化'];
  }

  const reasons = [];
  if (document.revisionRequired) {
    reasons.push(`${document.documentCode} ${document.documentName}需要返工`);
  }
  if (Array.isArray(document.initiationReview?.blockingReasons)) {
    reasons.push(...document.initiationReview.blockingReasons);
  }
  if (!document.responsibleUserId && ['1.1', '1.2'].includes(document.documentCode)) {
    reasons.push('尚未分配资料责任人');
  }
  return [...new Set(reasons)];
}

function deriveOutputStatus(document) {
  if (!document) {
    return 'not_configured';
  }

  if (document.revisionRequired || document.initiationReview?.blockedByRework) {
    return 'blocked_by_rework';
  }

  if (document.isComplete) {
    return 'completed';
  }

  if (document.completionStatus === 'pending_review') {
    return 'pending_review';
  }

  if (document.status === 'returned') {
    return 'returned_for_rework';
  }

  return 'waiting_submission';
}

function deriveNodeStatus(outputs) {
  if (outputs.length === 0) {
    return 'completed';
  }

  if (outputs.some((output) => output.status === 'blocked_by_rework')) {
    return 'blocked_by_rework';
  }

  if (outputs.every((output) => output.status === 'completed')) {
    return 'completed';
  }

  if (outputs.some((output) => output.status === 'pending_review')) {
    return 'in_progress';
  }

  if (outputs.some((output) => output.status === 'returned_for_rework')) {
    return 'returned_for_rework';
  }

  return 'waiting_submission';
}

function mapOutput(document, formKey) {
  return {
    documentId: document?.id ?? null,
    documentCode: document?.documentCode ?? null,
    documentName: document?.documentName ?? null,
    status: deriveOutputStatus(document),
    baseStatus: document?.status ?? null,
    completionStatus: document?.completionStatus ?? null,
    isComplete: document?.isComplete === true,
    responsibleUserId: document?.responsibleUserId ?? null,
    responsibleUser: document?.responsibleUser ?? null,
    formKey,
    formAvailable: Boolean(formKey && document),
    permissions: document?.permissions ?? {},
    initiationReview: document?.initiationReview ?? null,
    blockingReasons: buildDocumentBlockingReasons(document),
    actionHints: buildDocumentActionHints(document)
  };
}

function buildInitiationNode(config, documentsByCode, project) {
  if (config.nodeKey === 'project_input') {
    return {
      nodeKey: config.nodeKey,
      nodeName: config.nodeName,
      nodeStatus: 'completed',
      outputs: [],
      projectInput: {
        projectName: project.projectName,
        customerName: project.customerName,
        customerContact: project.customerContact,
        projectCode: project.projectCode,
        projectManagerUser: project.projectManagerUser,
        projectMode: project.projectMode
      },
      blockingReasons: [],
      actionHints: []
    };
  }

  const outputs = config.outputDocumentCodes.map((documentCode) =>
    mapOutput(documentsByCode.get(documentCode) || null, config.formKey)
  );
  return {
    nodeKey: config.nodeKey,
    nodeName: config.nodeName,
    nodeStatus: deriveNodeStatus(outputs),
    outputs,
    blockingReasons: [...new Set(outputs.flatMap((output) => output.blockingReasons))],
    actionHints: [...new Set(outputs.flatMap((output) => output.actionHints))]
  };
}

function buildLegacyStage(stage, documents) {
  return {
    stageId: stage.id,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    stageStatus: stage.stageStatus,
    isCurrent: stage.isCurrent,
    configured: false,
    placeholderStatus: 'legacy_checklist_available',
    placeholderText: '本阶段节点映射后续配置，当前保留旧资料清单入口。',
    legacyChecklistAvailable: documents.length > 0,
    nodes: []
  };
}

export async function getProjectWorkspace(projectId, user) {
  const [detail, checklist] = await Promise.all([
    getProjectDetail(projectId, user),
    getProjectStageDocumentChecklist(projectId, user)
  ]);

  const documentsByStageKey = new Map(
    (checklist.stages || []).map((stage) => [stage.stageKey, stage.documents || []])
  );

  const stages = (detail.stages || []).map((stage) => {
    const documents = documentsByStageKey.get(stage.stageKey) || [];
    if (stage.stageKey !== INITIATION_STAGE_KEY) {
      return buildLegacyStage(stage, documents);
    }

    const documentsByCode = new Map(documents.map((document) => [document.documentCode, document]));
    return {
      stageId: stage.id,
      stageOrder: stage.stageOrder,
      stageKey: stage.stageKey,
      stageName: stage.stageName,
      stageStatus: stage.stageStatus,
      isCurrent: stage.isCurrent,
      configured: true,
      placeholderStatus: null,
      legacyChecklistAvailable: true,
      nodes: INITIATION_NODE_CONFIG.map((config) => buildInitiationNode(config, documentsByCode, detail.project))
    };
  });

  return {
    project: detail.project,
    currentStage: detail.currentStage,
    stages,
    scope: {
      globalSkeleton: true,
      completeStageKey: INITIATION_STAGE_KEY,
      otherStages: 'placeholder_or_legacy_checklist'
    }
  };
}
