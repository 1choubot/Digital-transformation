import {
  V20260629_TARGET_TEMPLATE_VERSION,
  V20260629_TEMPLATE_SWITCH_METADATA,
  V20260629_WORKSPACE_BLUE_MODULES,
  getV20260629TargetOutputByCode
} from '../../domain/stageDocumentTemplateItemsV20260629.js';
import { getProjectStageDocumentChecklist } from '../stageDocuments/checklistRepository.js';
import { getProjectDetail } from './coreRepository.js';

const INITIATION_STAGE_KEY = 'initiation';
const CURRENT_RUNTIME_TEMPLATE_VERSION = 'v20260625';

function buildDocumentActionHints(document, outputConfig) {
  const permissions = document?.permissions || {};
  if (outputConfig?.stageKey === INITIATION_STAGE_KEY) {
    return [
      permissions.canManageResponsibility || document?.canManageResponsibility ? 'assign_responsible_user' : null,
      outputConfig?.formKey && document ? 'edit_or_submit_form' : null,
      document?.initiationReview?.nodes?.some((node) => node.canAct) ? 'handle_initiation_review' : null
    ].filter(Boolean);
  }

  return [document && outputConfig?.legacyDocumentCode ? 'locate_legacy_checklist' : null].filter(Boolean);
}

function buildDocumentBlockingReasons(document, outputConfig) {
  if (!document) {
    if (outputConfig?.legacyDocumentCode) {
      return ['旧资料清单未返回对应资料，可能尚未初始化或当前账号无权查看'];
    }

    return ['目标产出尚未初始化为当前项目资料，第一版仅展示 shell 占位'];
  }

  const reasons = [];
  if (document.isApplicable === false) {
    reasons.push('旧资料清单中该资料当前标记为不适用');
  }
  if (document.revisionRequired) {
    reasons.push(`${document.documentCode} ${document.documentName}需要返工`);
  }
  if (Array.isArray(document.initiationReview?.blockingReasons)) {
    reasons.push(...document.initiationReview.blockingReasons);
  }
  if (!document.responsibleUserId) {
    reasons.push('旧资料清单尚未分配资料责任人');
  }
  return [...new Set(reasons)];
}

function deriveOutputStatus(document, outputConfig) {
  if (!document) {
    return outputConfig?.legacyDocumentCode ? 'legacy_document_unavailable' : 'shell_placeholder';
  }

  if (document.isApplicable === false) {
    return 'not_applicable';
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
    return 'process_node';
  }

  if (outputs.some((output) => output.status === 'blocked_by_rework')) {
    return 'blocked_by_rework';
  }

  if (outputs.every((output) => ['completed', 'not_applicable'].includes(output.status))) {
    return 'completed';
  }

  if (outputs.some((output) => output.status === 'pending_review')) {
    return 'in_progress';
  }

  if (outputs.some((output) => output.status === 'returned_for_rework')) {
    return 'returned_for_rework';
  }

  if (outputs.every((output) => output.status === 'shell_placeholder')) {
    return 'shell_placeholder';
  }

  if (outputs.every((output) => output.status === 'legacy_document_unavailable')) {
    return 'legacy_document_unavailable';
  }

  return 'waiting_submission';
}

function buildLegacyChecklistTarget(document, outputConfig) {
  return {
    available: Boolean(document),
    documentId: document?.id ?? null,
    documentCode: document?.documentCode ?? outputConfig?.legacyDocumentCode ?? null
  };
}

function mapOutput(outputConfig, documentsByCode) {
  const document = outputConfig.legacyDocumentCode
    ? documentsByCode.get(outputConfig.legacyDocumentCode) || null
    : null;

  return {
    outputKey: outputConfig.targetOutputCode,
    templateVersion: outputConfig.templateVersion,
    targetTemplateVersion: outputConfig.templateVersion,
    targetOutputCode: outputConfig.targetOutputCode,
    stageOrder: outputConfig.stageOrder,
    stageKey: outputConfig.stageKey,
    stageName: outputConfig.stageName,
    nodeKey: outputConfig.nodeKey,
    documentId: document?.id ?? null,
    documentCode: document?.documentCode ?? outputConfig.legacyDocumentCode ?? null,
    legacyDocumentCode: outputConfig.legacyDocumentCode,
    documentName: outputConfig.documentName,
    legacyDocumentName: document?.documentName ?? null,
    sourceNode: outputConfig.sourceNode,
    outputKind: outputConfig.outputKind,
    requirementType: outputConfig.requirementType,
    isRequired: outputConfig.isRequired,
    ownerDepartment: outputConfig.ownerDepartment,
    reviewDepartment: outputConfig.reviewDepartment,
    defaultResponsibilityRole: document?.defaultResponsibilityRole ?? outputConfig.responsibleRole,
    targetResponsibleRole: outputConfig.responsibleRole,
    submitMode: document?.submitMode ?? outputConfig.submitMode,
    completionMode: document?.completionMode ?? outputConfig.completionMode,
    completionModeCandidate: outputConfig.completionMode,
    status: deriveOutputStatus(document, outputConfig),
    baseStatus: document?.status ?? null,
    completionStatus: document?.completionStatus ?? null,
    isComplete: document?.isComplete === true,
    responsibleUserId: document?.responsibleUserId ?? null,
    responsibleUser: document?.responsibleUser ?? null,
    formKey: outputConfig.formKey,
    formAvailable: Boolean(outputConfig.formKey && document),
    permissions: document?.permissions ?? {},
    initiationReview: document?.initiationReview ?? null,
    legacyChecklistTarget: buildLegacyChecklistTarget(document, outputConfig),
    blockingReasons: buildDocumentBlockingReasons(document, outputConfig),
    actionHints: buildDocumentActionHints(document, outputConfig),
    shellPlaceholder: !document,
    notes: outputConfig.notes
  };
}

function buildWorkspaceNode(moduleConfig, documentsByCode, project) {
  if (moduleConfig.stageKey === INITIATION_STAGE_KEY && moduleConfig.nodeKey === 'project_input') {
    return {
      templateVersion: moduleConfig.templateVersion,
      nodeKey: moduleConfig.nodeKey,
      nodeName: moduleConfig.nodeName,
      nodeStatus: 'process_node',
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
      actionHints: [],
      notes: moduleConfig.notes || ''
    };
  }

  const outputs = moduleConfig.outputCodes.map((targetOutputCode) =>
    mapOutput(getV20260629TargetOutputByCode(targetOutputCode), documentsByCode)
  );
  return {
    templateVersion: moduleConfig.templateVersion,
    nodeKey: moduleConfig.nodeKey,
    nodeName: moduleConfig.nodeName,
    nodeStatus: deriveNodeStatus(outputs),
    outputs,
    blockingReasons: [...new Set(outputs.flatMap((output) => output.blockingReasons))],
    actionHints: [...new Set(outputs.flatMap((output) => output.actionHints))],
    notes: moduleConfig.notes || ''
  };
}

function buildWorkspaceStage(stage, documents, project) {
  const documentsByCode = new Map(documents.map((document) => [document.documentCode, document]));
  const moduleConfigs = V20260629_WORKSPACE_BLUE_MODULES.filter((module) => module.stageKey === stage.stageKey);
  const nodes = moduleConfigs.map((moduleConfig) =>
    buildWorkspaceNode(moduleConfig, documentsByCode, project)
  );

  return {
    templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
    stageId: stage.id,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    stageStatus: stage.stageStatus,
    isCurrent: stage.isCurrent,
    configured: true,
    placeholderStatus: null,
    placeholderText: '',
    legacyChecklistAvailable: documents.length > 0,
    nodes
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
  const visibleDocuments = (checklist.stages || []).flatMap((stage) => stage.documents || []);
  const runtimeTemplateVersion =
    visibleDocuments.find((document) => document.templateVersion)?.templateVersion ||
    CURRENT_RUNTIME_TEMPLATE_VERSION;

  const stages = (detail.stages || []).map((stage) => {
    const documents = documentsByStageKey.get(stage.stageKey) || [];
    return buildWorkspaceStage(stage, documents, detail.project);
  });

  return {
    project: detail.project,
    currentStage: detail.currentStage,
    templateVersion: runtimeTemplateVersion,
    targetTemplateVersion: V20260629_TARGET_TEMPLATE_VERSION,
    targetTemplate: {
      ...V20260629_TEMPLATE_SWITCH_METADATA
    },
    stages,
    scope: {
      globalSkeleton: true,
      configuredStageCount: stages.length,
      runtimeTemplateVersion,
      targetTemplateVersion: V20260629_TARGET_TEMPLATE_VERSION,
      defaultProjectInitializationEnabled: false,
      legacyProjectMigrationEnabled: false,
      writesProjectStageDocuments: false,
      genericActionsMigratedToOutputCards: false,
      nonInitiationOutputAction: 'locate_legacy_checklist'
    }
  };
}
