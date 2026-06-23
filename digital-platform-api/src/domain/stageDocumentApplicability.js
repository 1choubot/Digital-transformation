export const DOCUMENT_APPLICABILITY_ACTION = {
  MARK_NOT_APPLICABLE: 'mark_not_applicable',
  RESTORE_APPLICABLE: 'restore_applicable'
};

const NOT_APPLICABLE_REASON_MAX_LENGTH = 1000;

export class StageDocumentApplicabilityError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentApplicabilityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function normalizeNotApplicableReason(value) {
  const reason = value === undefined || value === null ? '' : String(value).trim();

  if (!reason) {
    throw new StageDocumentApplicabilityError(
      'NOT_APPLICABLE_REASON_REQUIRED',
      'Not applicable reason is required',
      400,
      ['notApplicableReason']
    );
  }

  if (reason.length > NOT_APPLICABLE_REASON_MAX_LENGTH) {
    throw new StageDocumentApplicabilityError(
      'NOT_APPLICABLE_REASON_TOO_LONG',
      'Not applicable reason is too long',
      400,
      ['notApplicableReason']
    );
  }

  return reason;
}

export function assertDocumentIsApplicable(isApplicable) {
  if (!isApplicable) {
    throw new StageDocumentApplicabilityError(
      'STAGE_DOCUMENT_NOT_APPLICABLE',
      'Stage document is not applicable',
      409,
      ['isApplicable']
    );
  }
}

export function buildDocumentApplicabilityTransition({ action, isApplicable, notApplicableReason }) {
  if (action === DOCUMENT_APPLICABILITY_ACTION.MARK_NOT_APPLICABLE) {
    if (!isApplicable) {
      throw new StageDocumentApplicabilityError(
        'INVALID_DOCUMENT_APPLICABILITY_TRANSITION',
        'Cannot mark a non-applicable document as not applicable again',
        409,
        ['isApplicable']
      );
    }

    return {
      nextIsApplicable: false,
      notApplicableReason: normalizeNotApplicableReason(notApplicableReason)
    };
  }

  if (action === DOCUMENT_APPLICABILITY_ACTION.RESTORE_APPLICABLE) {
    if (isApplicable) {
      throw new StageDocumentApplicabilityError(
        'INVALID_DOCUMENT_APPLICABILITY_TRANSITION',
        'Cannot restore an applicable document',
        409,
        ['isApplicable']
      );
    }

    return {
      nextIsApplicable: true,
      notApplicableReason: null
    };
  }

  throw new StageDocumentApplicabilityError(
    'UNKNOWN_DOCUMENT_APPLICABILITY_ACTION',
    `Unknown document applicability action: ${action}`,
    400,
    ['action']
  );
}
