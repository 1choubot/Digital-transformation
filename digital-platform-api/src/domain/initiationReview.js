import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  isCenterManagerUser,
  isGeneralManagerUser
} from './organization.js';
import { DOCUMENT_STATUS } from './stageDocumentTemplates.js';

export const INITIATION_REVIEW_DOCUMENT_CODE = '1.2';
export const INITIATION_REWORK_TARGET_DOCUMENT_CODE = '1.1';
export const INITIATION_NOTICE_DOCUMENT_CODE = '1.3';
export const INITIATION_ONLINE_FORM_DOCUMENT_CODES = Object.freeze([
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_NOTICE_DOCUMENT_CODE
]);

export const INITIATION_REVIEW_NODE_KEY = {
  BUSINESS: 'business_review',
  TECHNICAL: 'technical_review',
  GENERAL: 'general_review'
};

export const INITIATION_REVIEW_NODE_STATUS = {
  WAITING_DOCUMENT_SUBMISSION: 'waiting_document_submission',
  PENDING: 'pending',
  APPROVED: 'approved',
  RETURNED_BLOCKED_BY_REWORK: 'returned_blocked_by_rework',
  WAITING_PREREQUISITE: 'waiting_prerequisite',
  INVALIDATED: 'invalidated'
};

export const INITIATION_REVIEW_NODE_DEFINITIONS = Object.freeze([
  {
    nodeKey: INITIATION_REVIEW_NODE_KEY.BUSINESS,
    nodeName: '营销评价',
    reviewerRole: ORGANIZATION_ROLE.CENTER_MANAGER,
    reviewerDepartment: BUSINESS_DEPARTMENT.MARKETING_CENTER
  },
  {
    nodeKey: INITIATION_REVIEW_NODE_KEY.TECHNICAL,
    nodeName: '研发评价',
    reviewerRole: ORGANIZATION_ROLE.CENTER_MANAGER,
    reviewerDepartment: BUSINESS_DEPARTMENT.RD_CENTER
  },
  {
    nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
    nodeName: '总经理审批',
    reviewerRole: ORGANIZATION_ROLE.GENERAL_MANAGER,
    reviewerDepartment: null
  }
]);

const INITIATION_REVIEW_NODE_DEFINITION_BY_KEY = new Map(
  INITIATION_REVIEW_NODE_DEFINITIONS.map((definition) => [definition.nodeKey, definition])
);

export function isInitiationReviewDocumentCode(documentCode) {
  return String(documentCode || '').trim() === INITIATION_REVIEW_DOCUMENT_CODE;
}

export function isInitiationOnlineFormDocumentCode(documentCode) {
  return INITIATION_ONLINE_FORM_DOCUMENT_CODES.includes(String(documentCode || '').trim());
}

export function getInitiationReviewDocumentCode(document) {
  return document?.documentCode ?? document?.document_code ?? null;
}

export function isInitiationReviewDocument(document) {
  return isInitiationReviewDocumentCode(getInitiationReviewDocumentCode(document));
}

export function isInitiationOnlineFormDocument(document) {
  return isInitiationOnlineFormDocumentCode(getInitiationReviewDocumentCode(document));
}

export function getInitiationReviewNodeDefinition(nodeKey) {
  return INITIATION_REVIEW_NODE_DEFINITION_BY_KEY.get(nodeKey) || null;
}

export function assertInitiationReviewNodeKey(nodeKey) {
  if (!INITIATION_REVIEW_NODE_DEFINITION_BY_KEY.has(nodeKey)) {
    const error = new Error('Invalid initiation review node key');
    error.name = 'InitiationReviewError';
    error.code = 'INVALID_INITIATION_REVIEW_NODE_KEY';
    error.statusCode = 400;
    error.details = ['nodeKey'];
    throw error;
  }
}

export function canUserReviewInitiationNode(user, nodeKey) {
  const definition = getInitiationReviewNodeDefinition(nodeKey);
  if (!definition || !user) {
    return false;
  }

  if (nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL) {
    return isGeneralManagerUser(user);
  }

  return (
    isCenterManagerUser(user) &&
    user.department === definition.reviewerDepartment
  );
}

export function isInitiationReviewBaseSubmitted(status) {
  return status === DOCUMENT_STATUS.SUBMITTED || status === DOCUMENT_STATUS.CONFIRMED;
}

export function getInitialInitiationReviewNodeStatus(nodeKey, documentStatus) {
  if (nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL) {
    return INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE;
  }

  if (isInitiationReviewBaseSubmitted(documentStatus)) {
    return INITIATION_REVIEW_NODE_STATUS.PENDING;
  }

  return INITIATION_REVIEW_NODE_STATUS.WAITING_DOCUMENT_SUBMISSION;
}

export function getInitiationReviewNodeActionType(nodeKey, action) {
  if ([INITIATION_REVIEW_NODE_KEY.BUSINESS, INITIATION_REVIEW_NODE_KEY.TECHNICAL].includes(nodeKey)) {
    return 'initiation.evaluation.submitted';
  }

  return action === 'approve' ? 'initiation.approval.approved' : 'initiation.approval.returned';
}
