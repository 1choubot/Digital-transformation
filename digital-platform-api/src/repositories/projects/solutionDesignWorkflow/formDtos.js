import {
  SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION,
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_REVIEW_FORM_STATUS,
  SOLUTION_DESIGN_ROLE_DEFINITIONS,
  SOLUTION_DESIGN_ROLE_KEY,
  SOLUTION_DESIGN_STAGE,
  buildInitialSolutionDesignNodes,
  getSolutionDesignReviewFormDefinition,
  isProjectInSolutionDesignStage,
  isSolutionDesignProjectEnded
} from '../../../domain/solutionDesignWorkflow.js';
import {
  canProcessAnalysisForm,
  canProcessReviewForm,
  canReviewSolutionDesignNode,
  isAnalysisFormGeneratedForRevision,
  isProductFunctionDiagramUploadedForRevision,
  isReviewFormGeneratedForRevision
} from './permissions.js';

function parseStoredJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildVirtualNodes() {
  return buildInitialSolutionDesignNodes().map((node) => ({
    id: null,
    project_id: null,
    node_key: node.nodeKey,
    node_name: node.nodeName,
    node_order: node.nodeOrder,
    status: SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    return_reason: null,
    current_revision: 1,
    activated_at: null,
    submitted_at: null,
    approved_at: null,
    returned_at: null,
    created_at: null,
    updated_at: null
  }));
}

function buildRoleStateWithoutUserDetails(projectRow, rolesRow) {
  const entries = {};

  for (const definition of SOLUTION_DESIGN_ROLE_DEFINITIONS) {
    if (definition.roleKey === SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER) {
      entries[definition.roleKey] = {
        roleKey: definition.roleKey,
        label: definition.label,
        userId: projectRow.project_manager_user_id ?? null,
        user: null,
        source: 'project_manager'
      };
      continue;
    }

    const assignedUserId = rolesRow?.[definition.columnName] ?? null;
    entries[definition.roleKey] = {
      roleKey: definition.roleKey,
      label: definition.label,
      userId: assignedUserId ?? null,
      user: null,
      source: assignedUserId ? 'solution_design_assignment' : 'unassigned'
    };
  }

  return entries;
}

function buildCurrentUploadSlotRevisionMap(slots = []) {
  return new Map(
    slots
      .filter((slot) => Boolean(slot.current_file_id))
      .map((slot) => [slot.slot_key, Number(slot.current_file_revision ?? slot.revision ?? 0)])
  );
}

function getNodeByKey(nodes = [], nodeKey) {
  return nodes.find((node) => node.node_key === nodeKey) || null;
}

export function mapGeneratedFileStatus(row, { templateName = null } = {}) {
  const status = row.generated_file_status;
  const canDownload = status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED && Boolean(row.generated_file_storage_key);
  return {
    status,
    fileName: row.generated_file_name,
    mimeType: row.generated_file_mime_type,
    fileSize: row.generated_file_size === null || row.generated_file_size === undefined
      ? null
      : Number(row.generated_file_size),
    templateName: row.generated_file_template_name ?? templateName,
    generatedByUserId: row.generated_by_user_id ?? null,
    generatedAt: row.generated_at,
    errorMessage: row.generation_error_message,
    canDownload
  };
}

export function mapAnalysisForm(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    revision: row.revision,
    status: row.form_status,
    formData: parseStoredJson(row.form_data_json),
    isCurrent: Boolean(row.is_current),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUser: row.submitted_by_user_id
      ? {
          id: row.submitted_by_user_id,
          account: row.submitted_by_account,
          name: row.submitted_by_display_name
        }
      : null,
    documentCode: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.documentCode,
    formName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.formName,
    templateName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName,
    generatedFile: mapGeneratedFileStatus(row, {
      templateName: SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName
    }),
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapReviewForm(row) {
  if (!row) {
    return null;
  }

  const definition = getSolutionDesignReviewFormDefinition(row.node_key);

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    reviewType: row.review_type,
    documentCode: definition?.documentCode ?? null,
    formName: definition?.formName ?? null,
    templateName: definition?.templateName ?? null,
    revision: row.revision,
    status: row.form_status,
    formData: parseStoredJson(row.form_data_json),
    isCurrent: Boolean(row.is_current),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUser: row.submitted_by_user_id
      ? {
          id: row.submitted_by_user_id,
          account: row.submitted_by_account,
          name: row.submitted_by_display_name
        }
      : null,
    generatedFile: mapGeneratedFileStatus(row, {
      templateName: definition?.templateName ?? null
    }),
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function buildAnalysisFormPermissions({ projectRow, analysisNode, roleState, user, analysisFormRow, uploadSlots }) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const uploadSlotRevisionByKey = buildCurrentUploadSlotRevisionMap(uploadSlots);
  const canEditForm = canProcessAnalysisForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    analysisNode
  });
  const canSubmitNode =
    canEditForm &&
    isAnalysisFormGeneratedForRevision(analysisFormRow, analysisNode?.current_revision) &&
    isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, analysisNode?.current_revision);
  const canReview = canReviewSolutionDesignNode({
    nodeRow: analysisNode || {},
    user,
    roleState,
    projectEnded,
    inSolutionStage
  });

  return {
    canViewForm: true,
    canEditForm,
    canSubmitForm: canEditForm,
    canSubmitNode,
    canApprove: canReview,
    canReturn: canReview
  };
}

export function buildAnalysisFormDto({
  projectRow,
  nodes,
  rolesRow,
  uploadSlots,
  analysisFormRow,
  user,
  analysisStageDocumentRow = null,
  analysisImages = []
}) {
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const analysisNode = getNodeByKey(materializedNodes, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  const form = mapAnalysisForm(analysisFormRow);

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    nodeStatus: analysisNode?.status ?? SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    nodeRevision: analysisNode?.current_revision ?? 1,
    stageDocumentId: analysisStageDocumentRow?.id ?? null,
    images: analysisImages,
    form: form
      ? {
          ...form,
          stageDocumentId: analysisStageDocumentRow?.id ?? null,
          images: analysisImages
        }
      : null,
    permissions: buildAnalysisFormPermissions({
      projectRow,
      analysisNode,
      roleState,
      user,
      analysisFormRow,
      uploadSlots
    }),
    isProjectEnded: isSolutionDesignProjectEnded(projectRow)
  };
}

export function buildReviewFormPermissions({ projectRow, reviewNode, roleState, user, reviewFormRow }) {
  const projectEnded = isSolutionDesignProjectEnded(projectRow);
  const inSolutionStage = isProjectInSolutionDesignStage(projectRow);
  const canEditReviewForm = canProcessReviewForm({
    projectEnded,
    inSolutionStage,
    roleState,
    user,
    reviewNode
  });
  const canReview = canReviewSolutionDesignNode({
    nodeRow: reviewNode || {},
    user,
    roleState,
    projectEnded,
    inSolutionStage
  });

  return {
    canViewReviewForm: true,
    canEditReviewForm,
    canSubmitReviewForm: canEditReviewForm,
    canSubmitNode:
      canEditReviewForm &&
      isReviewFormGeneratedForRevision(reviewFormRow, reviewNode?.current_revision),
    canApprove: canReview,
    canReturn: canReview
  };
}

export function buildReviewFormDto({ projectRow, nodes, rolesRow, reviewFormRow, nodeKey, user }) {
  const definition = getSolutionDesignReviewFormDefinition(nodeKey);
  const materializedNodes = nodes.length > 0 ? nodes : buildVirtualNodes();
  const roleState = buildRoleStateWithoutUserDetails(projectRow, rolesRow);
  const reviewNode = getNodeByKey(materializedNodes, nodeKey);

  return {
    projectId: projectRow.id,
    stageKey: SOLUTION_DESIGN_STAGE.STAGE_KEY,
    nodeKey,
    nodeStatus: reviewNode?.status ?? SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    nodeRevision: reviewNode?.current_revision ?? 1,
    reviewType: definition.reviewType,
    documentCode: definition.documentCode,
    formName: definition.formName,
    templateName: definition.templateName,
    form: mapReviewForm(reviewFormRow),
    permissions: buildReviewFormPermissions({
      projectRow,
      reviewNode,
      roleState,
      user,
      reviewFormRow
    }),
    isProjectEnded: isSolutionDesignProjectEnded(projectRow)
  };
}

export function isGeneratedFormDtoCurrent(formDto, requiredRevision) {
  return (
    formDto?.status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED ||
    formDto?.status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED
  ) &&
    Number(formDto?.revision ?? 0) >= Number(requiredRevision ?? 1) &&
    formDto?.generatedFile?.status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    formDto?.generatedFile?.canDownload === true;
}
