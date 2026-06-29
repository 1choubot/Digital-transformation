export const REWORK_CLASS = {
  A: 'a_class',
  B: 'b_class',
  C: 'c_class'
};

export const A_CLASS_REWORK_CANDIDATE_CODES = Object.freeze({
  '1.2': ['1.1'],
  '2.12': ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11'],
  '2.13': ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11'],
  '3.3': ['3.2'],
  '4.12': ['4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11'],
  '4.13': ['4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11'],
  '4.16': ['4.14', '4.15'],
  '4.17': ['4.14', '4.15'],
  '5.4': ['5.3']
});

export const DESIGN_CHANGE_SOURCE_DOCUMENT_CODE = '5.12';
export const DESIGN_CHANGE_TARGET_DOCUMENT_CODES = Object.freeze(['5.13', '5.14', '5.15', '5.16']);

export function getReworkClass(documentCode) {
  if (Object.prototype.hasOwnProperty.call(A_CLASS_REWORK_CANDIDATE_CODES, documentCode)) {
    return REWORK_CLASS.A;
  }

  if (documentCode === DESIGN_CHANGE_SOURCE_DOCUMENT_CODE) {
    return REWORK_CLASS.C;
  }

  return REWORK_CLASS.B;
}

export function getAClassReworkCandidateCodes(documentCode) {
  return A_CLASS_REWORK_CANDIDATE_CODES[documentCode] || [];
}

export function getDesignChangeTargetDocumentCodes(documentCode) {
  return documentCode === DESIGN_CHANGE_SOURCE_DOCUMENT_CODE ? DESIGN_CHANGE_TARGET_DOCUMENT_CODES : [];
}

export function isAClassReworkDocument(documentCode) {
  return getReworkClass(documentCode) === REWORK_CLASS.A;
}

export function isCClassDesignChangeDocument(documentCode) {
  return getReworkClass(documentCode) === REWORK_CLASS.C;
}
