import { DOCUMENT_STATUS } from './stageDocumentTemplates.js';

export const DOCUMENT_STATUS_ACTION = {
  SUBMIT: 'submit',
  CONFIRM: 'confirm',
  RETURN: 'return'
};

const RETURN_REASON_MAX_LENGTH = 1000;

const ALLOWED_TRANSITIONS = {
  [DOCUMENT_STATUS_ACTION.SUBMIT]: new Set([DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.RETURNED]),
  [DOCUMENT_STATUS_ACTION.CONFIRM]: new Set([DOCUMENT_STATUS.SUBMITTED]),
  [DOCUMENT_STATUS_ACTION.RETURN]: new Set([DOCUMENT_STATUS.SUBMITTED])
};

export class StageDocumentStatusError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentStatusError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function normalizeReturnReason(value) {
  const reason = value === undefined || value === null ? '' : String(value).trim();

  if (!reason) {
    throw new StageDocumentStatusError('RETURN_REASON_REQUIRED', 'Return reason is required', 400, [
      'returnReason'
    ]);
  }

  if (reason.length > RETURN_REASON_MAX_LENGTH) {
    throw new StageDocumentStatusError('RETURN_REASON_TOO_LONG', 'Return reason is too long', 400, [
      'returnReason'
    ]);
  }

  return reason;
}

export function assertDocumentStatusTransition(action, currentStatus) {
  const allowedFrom = ALLOWED_TRANSITIONS[action];

  if (!allowedFrom || !allowedFrom.has(currentStatus)) {
    throw new StageDocumentStatusError(
      'INVALID_DOCUMENT_STATUS_TRANSITION',
      `Cannot ${action} document from status ${currentStatus}`,
      409,
      ['status']
    );
  }
}

export function buildDocumentStatusTransition({ action, currentStatus, returnReason }) {
  assertDocumentStatusTransition(action, currentStatus);

  if (action === DOCUMENT_STATUS_ACTION.SUBMIT) {
    return {
      nextStatus: DOCUMENT_STATUS.SUBMITTED,
      returnReason: null,
      clearReturnTrace: true
    };
  }

  if (action === DOCUMENT_STATUS_ACTION.CONFIRM) {
    return {
      nextStatus: DOCUMENT_STATUS.CONFIRMED
    };
  }

  return {
    nextStatus: DOCUMENT_STATUS.RETURNED,
    returnReason: normalizeReturnReason(returnReason)
  };
}
