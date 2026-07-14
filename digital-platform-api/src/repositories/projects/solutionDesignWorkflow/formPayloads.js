import {
  SOLUTION_DESIGN_ERROR,
  SolutionDesignWorkflowError
} from '../../../domain/solutionDesignWorkflow.js';

const MAX_ANALYSIS_FORM_JSON_LENGTH = 100000;
const MAX_REVIEW_FORM_JSON_LENGTH = 100000;
const REVIEW_FORM_REPEATABLE_FIELD_KEYS = Object.freeze([
  'projectTargetDescription',
  'technicalRisks',
  'solutionSuggestions',
  'actionItems'
]);

const ANALYSIS_FORM_TEXT_FIELD_KEYS = Object.freeze([
  'workingTemperatureMin',
  'workingTemperatureMax',
  'storageTemperatureMin',
  'storageTemperatureMax',
  'workingHumidityMin',
  'workingHumidityMax',
  'storageHumidityMin',
  'storageHumidityMax',
  'noiseLimitValue',
  'ipProtectionLevel',
  'antiCorrosionGrade',
  'altitudeLimitValue',
  'explosionProofRequirement',
  'siteConditionDescription',
  'powerSupply',
  'airSupply',
  'hydraulicSource',
  'liftingEquipment',
  'workpieceDescription',
  'operationProcessDescription',
  'projectTargetDescription'
]);

function isFormValueEmpty(value) {
  if (Array.isArray(value)) {
    return value.every((item) => isFormValueEmpty(item));
  }
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (typeof value === 'number') {
    return Number.isNaN(value);
  }
  return false;
}

// 提交校验必须在数据库事务和文件生成前执行，草稿保存不调用此函数。
export function assertRequiredSolutionFormFields(formData, requiredFieldKeys = []) {
  const missingFieldKeys = requiredFieldKeys.filter((fieldKey) => isFormValueEmpty(formData?.[fieldKey]));
  if (missingFieldKeys.length > 0) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING,
      'Required solution design form fields are missing',
      400,
      missingFieldKeys
    );
  }
}

export function normalizeAnalysisFormPayload(payload = {}) {
  const sourceFormData = Object.hasOwn(payload, 'formData') ? payload.formData : payload;
  if (
    sourceFormData === null ||
    Array.isArray(sourceFormData) ||
    typeof sourceFormData !== 'object'
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ANALYSIS_FORM,
      'Solution analysis form data must be an object',
      400,
      ['formData']
    );
  }

  const formData = {};
  for (const fieldKey of ANALYSIS_FORM_TEXT_FIELD_KEYS) {
    if (Object.hasOwn(sourceFormData, fieldKey)) {
      formData[fieldKey] = String(sourceFormData[fieldKey] ?? '').trim();
    }
  }

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > MAX_ANALYSIS_FORM_JSON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ANALYSIS_FORM,
      'Solution analysis form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
  };
}

export function normalizeRepeatableReviewFormValue(value) {
  if (value === null || value === undefined) {
    return [];
  }

  const rawValues = Array.isArray(value)
    ? value
    : String(value).split(/\r?\n/);

  return rawValues
    .map((item) => {
      if (item === null || item === undefined) {
        return '';
      }
      if (typeof item === 'object') {
        return JSON.stringify(item);
      }
      return String(item);
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeReviewFormPayload(payload = {}) {
  const sourceFormData = Object.hasOwn(payload, 'formData') ? payload.formData : payload;
  if (
    sourceFormData === null ||
    Array.isArray(sourceFormData) ||
    typeof sourceFormData !== 'object'
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Solution review form data must be an object',
      400,
      ['formData']
    );
  }

  const formData = { ...sourceFormData };
  for (const fieldKey of REVIEW_FORM_REPEATABLE_FIELD_KEYS) {
    formData[fieldKey] = normalizeRepeatableReviewFormValue(formData[fieldKey]);
  }
  if (Object.hasOwn(formData, 'recorder')) {
    formData.recorder = String(formData.recorder ?? '').trim();
  }

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > MAX_REVIEW_FORM_JSON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_REVIEW_FORM,
      'Solution review form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
  };
}
