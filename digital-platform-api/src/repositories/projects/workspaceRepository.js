import {
  V20260629_TARGET_TEMPLATE_VERSION,
  V20260629_TEMPLATE_SWITCH_METADATA,
  V20260629_WORKSPACE_BLUE_MODULES,
  getV20260629TargetOutputByCode
} from '../../domain/stageDocumentTemplateItemsV20260629.js';
import {
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_STAGE
} from '../../domain/solutionDesignWorkflow.js';
import {
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_NODES,
  CONTRACT_SIGNING_STAGE
} from '../../domain/contractSigningWorkflow.js';
import { getProjectStageDocumentChecklist } from '../stageDocuments/checklistRepository.js';
import { listLatestGeneratedFilesForProject } from '../stageDocuments/generatedFileRepository.js';
import { getProjectDetail } from './coreRepository.js';
import { getSolutionDesignWorkflow } from './solutionDesignWorkflowRepository.js';
import { getContractSigningWorkflow } from './contractSigningWorkflowRepository.js';

const INITIATION_STAGE_KEY = 'initiation';
const CURRENT_RUNTIME_TEMPLATE_VERSION = V20260629_TARGET_TEMPLATE_VERSION;
const CONTRACT_SIGNING_WORKFLOW_DOCUMENT_CODES = new Set(['C20', 'C21', '3.1', 'C22', 'C23', '3.2']);
const CONTRACT_SIGNING_EXCLUDED_SUPPLEMENTAL_DOCUMENT_CODES = new Set(['C25', '4.1']);

function buildDocumentActionHints(document, outputConfig) {
  const permissions = document?.permissions || {};
  if (outputConfig?.stageKey === INITIATION_STAGE_KEY) {
    return [
      permissions.canManageResponsibility || document?.canManageResponsibility ? 'assign_responsible_user' : null,
      outputConfig?.formKey && document ? 'edit_or_submit_form' : null,
      document?.initiationReview?.nodes?.some((node) => node.canAct) ? 'handle_initiation_review' : null
    ].filter(Boolean);
  }

  return [
    permissions.canManageResponsibility || document?.canManageResponsibility ? 'assign_responsible_user' : null,
    permissions.canViewAttachments || document?.canViewAttachments ? 'view_attachments' : null,
    permissions.canUploadAttachment || document?.canUploadAttachment ? 'upload_attachment' : null,
    permissions.canSubmitDocument || document?.canSubmitDocument ? 'submit_document' : null,
    permissions.canReviewDocument || document?.canReviewDocument ? 'review_document' : null,
    permissions.canChangeApplicability || document?.canChangeApplicability ? 'change_applicability' : null
  ].filter(Boolean);
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

function mapOutput(outputConfig, documentsByCode, generatedFilesByDocumentId) {
  const document =
    (outputConfig.legacyDocumentCode ? documentsByCode.get(outputConfig.legacyDocumentCode) : null) ||
    documentsByCode.get(outputConfig.targetOutputCode) ||
    null;
  const generatedFile = document?.id ? generatedFilesByDocumentId.get(Number(document.id)) || null : null;

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
    documentCode: document?.documentCode ?? outputConfig.legacyDocumentCode ?? outputConfig.targetOutputCode ?? null,
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
    generatedFile,
    legacyChecklistTarget: buildLegacyChecklistTarget(document, outputConfig),
    blockingReasons: buildDocumentBlockingReasons(document, outputConfig),
    actionHints: buildDocumentActionHints(document, outputConfig),
    shellPlaceholder: !document,
    notes: outputConfig.notes
  };
}

function buildWorkspaceNode(moduleConfig, documentsByCode, generatedFilesByDocumentId, project) {
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
        customerContactPerson: project.customerContactPerson,
        customerContact: project.customerContact,
        projectCode: project.projectCode,
        projectManagerUser: project.projectManagerUser,
        businessResponsibleUser: project.businessResponsibleUser,
        technicalResponsibleUser: project.technicalResponsibleUser,
        projectMode: project.projectMode
      },
      blockingReasons: [],
      actionHints: [],
      notes: moduleConfig.notes || ''
    };
  }

  const outputs = moduleConfig.outputCodes.map((targetOutputCode) =>
    mapOutput(getV20260629TargetOutputByCode(targetOutputCode), documentsByCode, generatedFilesByDocumentId)
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

function resolveAutomaticProcessNodeStatuses(nodes) {
  return nodes.map((node, index) => {
    if (node.nodeStatus !== 'process_node') {
      return node;
    }

    // 过程节点没有人工提交动作，数据由系统派生。正常情况下视为已完成；
    // 如果流程退回到了它之前的节点，则跟随前置返工状态，等待前置节点重新通过。
    const blockedByPreviousRework = nodes
      .slice(0, index)
      .some((previousNode) => ['returned_for_rework', 'blocked_by_rework'].includes(previousNode.nodeStatus));

    return {
      ...node,
      nodeStatus: blockedByPreviousRework ? 'returned_for_rework' : 'completed',
      blockingReasons: blockedByPreviousRework
        ? [...new Set([...(node.blockingReasons || []), '前置节点被退回，系统生成数据等待重新生成'])]
        : node.blockingReasons
    };
  });
}

function buildSolutionDesignWorkflowWorkspaceNodes(solutionDesignWorkflow) {
  const workflowNodeByKey = new Map(
    (solutionDesignWorkflow?.nodes || []).map((node) => [node.nodeKey, node])
  );

  return SOLUTION_DESIGN_NODES.map((definition) => {
    const workflowNode = workflowNodeByKey.get(definition.nodeKey);
    return {
      templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
      nodeKey: definition.nodeKey,
      nodeName: definition.nodeName,
      nodeStatus: workflowNode?.status || SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
      nodeOrder: definition.nodeOrder,
      outputs: [],
      blockingReasons: workflowNode?.blockingReasons || [],
      actionHints: workflowNode?.actionHints || [],
      notes: workflowNode?.notes || '',
      solutionDesignNode: workflowNode || null
    };
  });
}

function buildContractSigningWorkflowWorkspaceNodes(contractSigningWorkflow) {
  const workflowNodeByKey = new Map(
    (contractSigningWorkflow?.nodes || []).map((node) => [node.nodeKey, node])
  );

  return CONTRACT_SIGNING_NODES.map((definition) => {
    const workflowNode = workflowNodeByKey.get(definition.nodeKey);
    return {
      templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
      nodeKey: definition.nodeKey,
      nodeName: definition.nodeName,
      nodeStatus: workflowNode?.status || CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
      nodeOrder: definition.nodeOrder,
      outputs: [],
      blockingReasons: workflowNode?.blockingReasons || [],
      actionHints: workflowNode?.nextActions || [],
      notes: workflowNode?.notes || '',
      contractSigningNode: workflowNode || null
    };
  });
}

function isCompatibilityOnlyModule(moduleConfig) {
  if (!moduleConfig.outputCodes.length) {
    return false;
  }

  return moduleConfig.outputCodes.every((outputCode) => getV20260629TargetOutputByCode(outputCode)?.workspaceCompatibility);
}

function isContractSigningSupplementalDocument(document) {
  const documentCode = String(document?.documentCode || '').trim();
  return Boolean(documentCode) &&
    !CONTRACT_SIGNING_WORKFLOW_DOCUMENT_CODES.has(documentCode) &&
    !CONTRACT_SIGNING_EXCLUDED_SUPPLEMENTAL_DOCUMENT_CODES.has(documentCode);
}

export function buildContractSigningSupplementalDocuments(documents = []) {
  return documents.filter(isContractSigningSupplementalDocument);
}

function buildWorkspaceStage(
  stage,
  documents,
  generatedFilesByDocumentId,
  project,
  runtimeTemplateVersion,
  solutionDesignWorkflow,
  contractSigningWorkflow
) {
  const documentsByCode = new Map(documents.map((document) => [document.documentCode, document]));
  const isSolutionDesignStage = stage.stageKey === SOLUTION_DESIGN_STAGE.STAGE_KEY;
  const isContractSigningStage = stage.stageKey === CONTRACT_SIGNING_STAGE.STAGE_KEY;
  const nodes = isSolutionDesignStage
    ? buildSolutionDesignWorkflowWorkspaceNodes(solutionDesignWorkflow)
    : isContractSigningStage
      ? buildContractSigningWorkflowWorkspaceNodes(contractSigningWorkflow)
      : V20260629_WORKSPACE_BLUE_MODULES
          .filter((module) => {
            if (module.stageKey !== stage.stageKey) {
              return false;
            }

            return runtimeTemplateVersion === V20260629_TARGET_TEMPLATE_VERSION
              ? !isCompatibilityOnlyModule(module)
              : true;
          })
          .map((moduleConfig) =>
            buildWorkspaceNode(moduleConfig, documentsByCode, generatedFilesByDocumentId, project)
          );
  const resolvedNodes = isSolutionDesignStage || isContractSigningStage
    ? nodes
    : resolveAutomaticProcessNodeStatuses(nodes);
  const supplementalDocuments = isContractSigningStage
    ? buildContractSigningSupplementalDocuments(documents)
    : [];

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
    supplementalDocuments,
    nodes: resolvedNodes
  };
}

export async function getProjectWorkspace(projectId, user) {
  const [detail, checklist, latestGeneratedFiles, solutionDesignWorkflow, contractSigningWorkflow] = await Promise.all([
    getProjectDetail(projectId, user),
    getProjectStageDocumentChecklist(projectId, user),
    listLatestGeneratedFilesForProject(projectId),
    getSolutionDesignWorkflow({ projectId, user }),
    getContractSigningWorkflow({ projectId, user })
  ]);
  const generatedFilesByDocumentId = new Map(
    latestGeneratedFiles.map((file) => [Number(file.stageDocumentId), file])
  );

  const documentsByStageKey = new Map(
    (checklist.stages || []).map((stage) => [stage.stageKey, stage.documents || []])
  );
  const visibleDocuments = (checklist.stages || []).flatMap((stage) => stage.documents || []);
  const runtimeTemplateVersion =
    visibleDocuments.find((document) => document.templateVersion)?.templateVersion ||
    CURRENT_RUNTIME_TEMPLATE_VERSION;

  const stages = (detail.stages || []).map((stage) => {
    const documents = documentsByStageKey.get(stage.stageKey) || [];
    return buildWorkspaceStage(
      stage,
      documents,
      generatedFilesByDocumentId,
      detail.project,
      runtimeTemplateVersion,
      solutionDesignWorkflow,
      contractSigningWorkflow
    );
  });

  return {
    project: detail.project,
    currentStage: detail.currentStage,
    solutionDesignWorkflow,
    contractSigningWorkflow,
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
      defaultProjectInitializationEnabled: V20260629_TEMPLATE_SWITCH_METADATA.defaultProjectInitializationEnabled,
      legacyProjectMigrationEnabled: false,
      writesProjectStageDocuments: V20260629_TEMPLATE_SWITCH_METADATA.writesProjectStageDocuments,
      genericActionsMigratedToOutputCards: true,
      nonInitiationOutputAction: 'workspace_output_card'
    }
  };
}
