import {
  BUSINESS_DEPARTMENT,
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY,
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_QUOTATION_FORM_STATUS,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE,
  SOLUTION_DESIGN_REVIEW_FORM_STATUS,
  SOLUTION_DESIGN_ROLE_DEFINITIONS,
  SOLUTION_DESIGN_ROLE_KEY,
  SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY,
  SolutionDesignWorkflowError,
  canAssignSolutionDesignRoles,
  getSolutionDesignReviewFormDefinition,
  isSolutionDesignGeneralManager
} from '../../../domain/solutionDesignWorkflow.js';
import { isCenterManagerOf } from '../../../domain/organization.js';

const PROCESSABLE_NODE_STATUSES = new Set([
  SOLUTION_DESIGN_NODE_STATUS.PENDING,
  SOLUTION_DESIGN_NODE_STATUS.RETURNED
]);

function normalizeComparableId(value) {
  return value === null || value === undefined ? null : Number(value);
}

function isSameId(left, right) {
  const normalizedLeft = normalizeComparableId(left);
  const normalizedRight = normalizeComparableId(right);
  return normalizedLeft === normalizedRight;
}

function areAllRolesAssigned(roles) {
  return SOLUTION_DESIGN_ROLE_DEFINITIONS.every((definition) => Boolean(roles[definition.roleKey]?.userId));
}

export function isNodeProcessableStatus(status) {
  return PROCESSABLE_NODE_STATUSES.has(status);
}

function isManufacturingCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.MANUFACTURING_CENTER);
}

function isMarketingCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.MARKETING_CENTER);
}

export function isFinanceCostUploadSlot(slotKey) {
  return slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION;
}

export function isQuotationTenderUploadSlot(slotKey) {
  return [
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE
  ].includes(slotKey);
}

export function isTenderUploadSlot(slotKey) {
  return SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.includes(slotKey);
}

export function isCostEstimationNode(nodeKey) {
  return Object.hasOwn(SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY, nodeKey);
}

export function getCostUploadSlotKeyForNode(nodeKey) {
  return SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY[nodeKey] || null;
}

export function canViewFinanceCostUploadFile({ roleState, user }) {
  return (
    isSolutionDesignGeneralManager(user) ||
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT]?.userId, user?.id) ||
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id)
  );
}

export function canDownloadUploadFile({ slot, roleState, user }) {
  if (!slot) {
    return false;
  }

  if (isFinanceCostUploadSlot(slot.slotKey)) {
    return canViewFinanceCostUploadFile({ roleState, user });
  }

  return true;
}

export function isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) {
  return Boolean(flowRow) && Number(flowRow.revision ?? 0) >= Number(nodeRow?.current_revision ?? 1);
}

export function isQuotationBranchCurrent(flowRow, nodeRow) {
  return (
    isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) &&
    flowRow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
  );
}

export function isTenderBranchCurrent(flowRow, nodeRow) {
  return (
    isQuotationTenderFlowCurrentForNode(flowRow, nodeRow) &&
    flowRow.branch_type === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER
  );
}

export function canSelectQuotationTenderBranch({ projectEnded, inSolutionStage, user, nodeRow, flowRow }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    isSolutionDesignGeneralManager(user) &&
    nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER &&
    nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING &&
    !isQuotationTenderFlowCurrentForNode(flowRow, nodeRow)
  );
}

export function canUploadQuotationTenderSlot({ slot, nodeRow, flowRow }) {
  if (!isQuotationTenderUploadSlot(slot?.slotKey)) {
    return true;
  }

  if (!isNodeProcessableStatus(nodeRow?.status)) {
    return false;
  }

  if (slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE) {
    return false;
  }

  return (
    isTenderBranchCurrent(flowRow, nodeRow) &&
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED
    ].includes(flowRow.branch_status)
  );
}

export function assertQuotationTenderSlotProcessable({ slot, nodeRow, flowRow }) {
  if (!canUploadQuotationTenderSlot({ slot, nodeRow, flowRow })) {
    if (
      slot?.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE &&
      isQuotationBranchCurrent(flowRow, nodeRow)
    ) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
        'Quotation file upload is not accepted after quotation branch selection; submit the quotation online form instead',
        409,
        {
          nodeKey: slot?.nodeKey ?? SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          slotKey: slot?.slotKey ?? null,
          branchType: flowRow?.branch_type ?? null,
          branchStatus: flowRow?.branch_status ?? null,
          branchRevision: flowRow?.revision ?? null,
          nodeRevision: nodeRow?.current_revision ?? null
        }
      );
    }

    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      'Quotation/tender upload slot cannot be processed in its current branch status',
      409,
      {
        nodeKey: slot?.nodeKey ?? SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        slotKey: slot?.slotKey ?? null,
        nodeStatus: nodeRow?.status ?? null,
        branchType: flowRow?.branch_type ?? null,
        branchStatus: flowRow?.branch_status ?? null,
        branchRevision: flowRow?.revision ?? null,
        nodeRevision: nodeRow?.current_revision ?? null
      }
    );
  }
}

export function canProcessQuotationForm({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isQuotationBranchCurrent(flowRow, nodeRow) &&
    flowRow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED
  );
}

export function isQuotationFormSubmittedForRevision(quotationFormRow, requiredRevision) {
  return (
    quotationFormRow?.form_status === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED &&
    Number(quotationFormRow.revision ?? 0) >= Number(requiredRevision ?? 1)
  );
}

export function isQuotationFormGeneratedForRevision(quotationFormRow, requiredRevision) {
  return (
    isQuotationFormSubmittedForRevision(quotationFormRow, requiredRevision) &&
    quotationFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(quotationFormRow.generated_file_storage_key)
  );
}

export function canSubmitQuotation({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow, quotationFormRow }) {
  return (
    canProcessQuotationForm({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow,
      flowRow
    }) &&
    isQuotationFormGeneratedForRevision(quotationFormRow, nodeRow?.current_revision)
  );
}

export function canProcessQuotationResult({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isQuotationBranchCurrent(flowRow, nodeRow) &&
    flowRow.branch_status === SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED
  );
}

export function areTenderFilesUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  const revision = Number(requiredRevision ?? 1);
  return SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.every(
    (slotKey) => Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= revision
  );
}

export function hasCurrentUploadSlotFile(currentFileSlotKeys, slotKey) {
  return Boolean(slotKey) && currentFileSlotKeys instanceof Set && currentFileSlotKeys.has(slotKey);
}

export function hasActiveUploadSlotExemption(exemptedSlotKeys, slotKey) {
  return (
    Boolean(slotKey) &&
    SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.includes(slotKey) &&
    exemptedSlotKeys instanceof Set &&
    exemptedSlotKeys.has(slotKey)
  );
}

export function isSolutionDesignOutputSatisfied(currentFileSlotKeys, exemptedSlotKeys, slotKey) {
  return (
    hasCurrentUploadSlotFile(currentFileSlotKeys, slotKey) ||
    hasActiveUploadSlotExemption(exemptedSlotKeys, slotKey)
  );
}

export function canSubmitTender({ projectEnded, inSolutionStage, roleState, user, nodeRow, flowRow, uploadSlotRevisionByKey }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId, user?.id) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    isTenderBranchCurrent(flowRow, nodeRow) &&
    [
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED,
      SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED
    ].includes(flowRow.branch_status) &&
    areTenderFilesUploadedForRevision(uploadSlotRevisionByKey, nodeRow.current_revision)
  );
}

export function isTechnicalOwner(roleState, user) {
  return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId, user?.id);
}

export function canProcessAnalysisForm({ projectEnded, inSolutionStage, roleState, user, analysisNode }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isTechnicalOwner(roleState, user) &&
    analysisNode?.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS &&
    isNodeProcessableStatus(analysisNode?.status)
  );
}

export function canProcessReviewForm({ projectEnded, inSolutionStage, roleState, user, reviewNode }) {
  return (
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isTechnicalOwner(roleState, user) &&
    Boolean(getSolutionDesignReviewFormDefinition(reviewNode?.node_key)) &&
    isNodeProcessableStatus(reviewNode?.status)
  );
}

export function isAnalysisFormSubmittedForRevision(analysisFormRow, requiredRevision) {
  return (
    analysisFormRow?.form_status === SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED &&
    Number(analysisFormRow.revision ?? 0) >= Number(requiredRevision ?? 1)
  );
}

export function isAnalysisFormGeneratedForRevision(analysisFormRow, requiredRevision) {
  return (
    isAnalysisFormSubmittedForRevision(analysisFormRow, requiredRevision) &&
    analysisFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(analysisFormRow.generated_file_storage_key)
  );
}

export function isReviewFormSubmittedForRevision(reviewFormRow, requiredRevision) {
  return (
    reviewFormRow?.form_status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
    Number(reviewFormRow.revision ?? 0) >= Number(requiredRevision ?? 1)
  );
}

export function isReviewFormGeneratedForRevision(reviewFormRow, requiredRevision) {
  return (
    isReviewFormSubmittedForRevision(reviewFormRow, requiredRevision) &&
    reviewFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(reviewFormRow.generated_file_storage_key)
  );
}

export function isProductFunctionDiagramUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  return (
    Number(uploadSlotRevisionByKey.get(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM) ?? 0) >=
    Number(requiredRevision ?? 1)
  );
}

export function isProductFunctionDiagramCurrent(currentFileSlotKeys) {
  return hasCurrentUploadSlotFile(currentFileSlotKeys, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM);
}

export function areSolutionDesignOutputsUploadedForRevision(uploadSlotRevisionByKey, requiredRevision) {
  const revision = Number(requiredRevision ?? 1);
  return SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.every(
    (slotKey) => Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= revision
  );
}

export function areSolutionDesignOutputsCurrent(currentFileSlotKeys) {
  return SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.every((slotKey) =>
    hasCurrentUploadSlotFile(currentFileSlotKeys, slotKey)
  );
}

export function areSolutionDesignOutputsSatisfied(currentFileSlotKeys, exemptedSlotKeys) {
  return SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.every((slotKey) =>
    isSolutionDesignOutputSatisfied(currentFileSlotKeys, exemptedSlotKeys, slotKey)
  );
}

export function isCostUploadSlotUploadedForRevision(uploadSlotRevisionByKey, nodeKey, requiredRevision) {
  const slotKey = getCostUploadSlotKeyForNode(nodeKey);
  if (!slotKey) {
    return false;
  }

  return Number(uploadSlotRevisionByKey.get(slotKey) ?? 0) >= Number(requiredRevision ?? 1);
}

export function isCostUploadSlotCurrent(currentFileSlotKeys, nodeKey) {
  return hasCurrentUploadSlotFile(currentFileSlotKeys, getCostUploadSlotKeyForNode(nodeKey));
}

function getSubmitNodeRoleKey(nodeKey) {
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (getSolutionDesignReviewFormDefinition(nodeKey)) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.RD_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.PROCUREMENT_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    return SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT;
  }

  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER;
  }

  return null;
}

export function buildUploadSlotPermissions({ slot, roleState, user, projectEnded, inSolutionStage, nodeRow, quotationTenderFlow }) {
  const canWrite =
    !projectEnded &&
    inSolutionStage &&
    areAllRolesAssigned(roleState) &&
    isNodeProcessableStatus(nodeRow?.status) &&
    canUploadQuotationTenderSlot({ slot, nodeRow, flowRow: quotationTenderFlow });
  return {
    canUpload:
      canWrite &&
      Boolean(slot?.requiredRoleKey) &&
      isSameId(roleState[slot.requiredRoleKey]?.userId, user?.id),
    canMarkExemption:
      canWrite &&
      SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.includes(slot?.slotKey) &&
      isTechnicalOwner(roleState, user),
    canCancelExemption:
      canWrite &&
      SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.includes(slot?.slotKey) &&
      isTechnicalOwner(roleState, user)
  };
}

export function canSubmitNode({
  nodeRow,
  roleState,
  user,
  projectEnded,
  inSolutionStage,
  currentFileSlotKeys,
  exemptedSlotKeys = new Set(),
  uploadSlotRevisionByKey,
  analysisFormRow,
  reviewFormRowsByNodeKey = new Map(),
  quotationTenderFlow = null
}) {
  if (
    projectEnded ||
    !inSolutionStage ||
    !areAllRolesAssigned(roleState) ||
    !isNodeProcessableStatus(nodeRow.status)
  ) {
    return false;
  }

  const requiredRoleKey = getSubmitNodeRoleKey(nodeRow.node_key);
  if (!requiredRoleKey || !isSameId(roleState[requiredRoleKey]?.userId, user?.id)) {
    return false;
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.PREPARATION) {
    return currentFileSlotKeys.has(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN);
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS) {
    return (
      isAnalysisFormGeneratedForRevision(analysisFormRow, nodeRow.current_revision) &&
      isProductFunctionDiagramCurrent(currentFileSlotKeys)
    );
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.DESIGN) {
    return areSolutionDesignOutputsSatisfied(currentFileSlotKeys, exemptedSlotKeys);
  }

  if (getSolutionDesignReviewFormDefinition(nodeRow.node_key)) {
    return isReviewFormGeneratedForRevision(
      reviewFormRowsByNodeKey.get(nodeRow.node_key),
      nodeRow.current_revision
    );
  }

  if (isCostEstimationNode(nodeRow.node_key)) {
    return isCostUploadSlotCurrent(currentFileSlotKeys, nodeRow.node_key);
  }

  if (nodeRow.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return canSubmitTender({
      projectEnded,
      inSolutionStage,
      roleState,
      user,
      nodeRow,
      flowRow: quotationTenderFlow,
      uploadSlotRevisionByKey
    });
  }

  return false;
}

export function canReviewSolutionDesignNode({ nodeRow, user, roleState, projectEnded, inSolutionStage }) {
  if (projectEnded || !inSolutionStage) {
    return false;
  }

  if (
    [
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST
    ].includes(nodeRow?.node_key)
  ) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      canAssignSolutionDesignRoles(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      isManufacturingCenterManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      isMarketingCenterManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
      return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id);
    }

    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW &&
      isSolutionDesignGeneralManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return (
      nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW &&
      isSolutionDesignGeneralManager(user)
    );
  }

  return (
    false
  );
}

export function canActAsReviewerForSolutionDesignNode({ nodeRow, user, roleState }) {
  if (
    [
      SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      SOLUTION_DESIGN_NODE_KEY.RD_COST
    ].includes(nodeRow?.node_key)
  ) {
    return canAssignSolutionDesignRoles(user);
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST) {
    return isManufacturingCenterManager(user);
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST) {
    return isMarketingCenterManager(user);
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST) {
    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW) {
      return isSolutionDesignGeneralManager(user);
    }

    if (nodeRow.status === SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW) {
      return isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id);
    }

    return (
      isSameId(roleState[SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER]?.userId, user?.id) ||
      isSolutionDesignGeneralManager(user)
    );
  }

  if (nodeRow?.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER) {
    return isSolutionDesignGeneralManager(user);
  }

  return false;
}
