import {
  SOLUTION_DESIGN_ERROR,
  SolutionDesignWorkflowError
} from '../../../domain/solutionDesignWorkflow.js';

const MAX_ANALYSIS_FORM_JSON_LENGTH = 100000;
const MAX_REVIEW_FORM_JSON_LENGTH = 100000;
const REVIEW_FORM_REPEATABLE_FIELD_KEYS = Object.freeze([
  'customerRequirements',
  'projectTargetDescription',
  'technicalRisks',
  'solutionSuggestions'
]);
const REVIEW_IMPLEMENTATION_PLAN_SOURCE_FIELDS = Object.freeze([
  {
    sourceType: 'requirement',
    sourceLabel: '需求',
    fieldKey: 'customerRequirements'
  },
  {
    sourceType: 'target',
    sourceLabel: '目标',
    fieldKey: 'projectTargetDescription'
  },
  {
    sourceType: 'risk',
    sourceLabel: '风险',
    fieldKey: 'technicalRisks'
  },
  {
    sourceType: 'suggestion',
    sourceLabel: '建议',
    fieldKey: 'solutionSuggestions'
  }
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

function normalizeReviewPlanText(value) {
  return String(value ?? '').trim();
}

function normalizeReviewPlanSourceText(value) {
  return String(value ?? '').trim();
}

function getReviewPlanTextKey(sourceType, sourceText) {
  return `${sourceType}:${sourceText}`;
}

function buildPlanItemLookups(items) {
  const bySourceIndex = new Map();
  const bySourceIdentity = new Map();
  const bySourceText = new Map();
  const countBySourceType = new Map();
  if (!Array.isArray(items)) {
    return { bySourceIndex, bySourceIdentity, bySourceText, countBySourceType };
  }

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const sourceType = String(item.sourceType ?? '').trim();
    const sourceIndex = Number(item.sourceIndex ?? 0);
    if (!sourceType || !Number.isSafeInteger(sourceIndex) || sourceIndex < 1) {
      continue;
    }
    const entry = {
      sourceType,
      sourceIndex,
      sourceText: normalizeReviewPlanSourceText(item.sourceText),
      planText: normalizeReviewPlanText(item.planText),
      consumed: false
    };
    countBySourceType.set(sourceType, (countBySourceType.get(sourceType) || 0) + 1);
    bySourceIndex.set(`${sourceType}:${sourceIndex}`, entry);
    bySourceIdentity.set(`${sourceType}:${sourceIndex}:${entry.sourceText}`, entry);
    if (entry.sourceText) {
      const textKey = getReviewPlanTextKey(sourceType, entry.sourceText);
      const entries = bySourceText.get(textKey) || [];
      entries.push(entry);
      bySourceText.set(textKey, entries);
    }
  }
  return { bySourceIndex, bySourceIdentity, bySourceText, countBySourceType };
}

function formatImplementationPlanItem(item) {
  return `${item.sourceLabel}${item.sourceIndex}：${item.planText}`;
}

function consumePlanTextBySourceText(lookups, sourceType, sourceText) {
  const entries = lookups.bySourceText.get(getReviewPlanTextKey(sourceType, sourceText)) || [];
  const entry = entries.find((candidate) => !candidate.consumed);
  if (!entry) {
    return null;
  }
  entry.consumed = true;
  return entry.planText;
}

function consumePlanTextBySourceIndex(lookups, sourceType, sourceIndex) {
  const entry = lookups.bySourceIndex.get(`${sourceType}:${sourceIndex}`);
  if (!entry || entry.consumed) {
    return null;
  }
  entry.consumed = true;
  return entry.planText;
}

function consumePlanTextBySourceIdentity(lookups, sourceType, sourceIndex, sourceText) {
  const entry = lookups.bySourceIdentity.get(`${sourceType}:${sourceIndex}:${sourceText}`);
  if (!entry || entry.consumed) {
    return null;
  }
  entry.consumed = true;
  return entry.planText;
}

export function buildReviewImplementationPlanItems(sourceFormData = {}) {
  const hasStructuredPlanItems = Object.hasOwn(sourceFormData, 'implementationPlanItems');
  const existingPlanItems = buildPlanItemLookups(sourceFormData.implementationPlanItems);
  const legacyPlanTexts = hasStructuredPlanItems
    ? []
    : normalizeRepeatableReviewFormValue(sourceFormData.actionItems);
  let legacyIndex = 0;
  const items = [];
  const currentSourceTextsByType = new Map(
    REVIEW_IMPLEMENTATION_PLAN_SOURCE_FIELDS.map((source) => [
      source.sourceType,
      new Set(normalizeRepeatableReviewFormValue(sourceFormData[source.fieldKey]))
    ])
  );

  for (const source of REVIEW_IMPLEMENTATION_PLAN_SOURCE_FIELDS) {
    const sourceLines = normalizeRepeatableReviewFormValue(sourceFormData[source.fieldKey]);
    const preserveSamePosition = (existingPlanItems.countBySourceType.get(source.sourceType) || 0) === sourceLines.length;
    for (const [index, sourceText] of sourceLines.entries()) {
      const sourceIndex = index + 1;
      const existingKey = `${source.sourceType}:${sourceIndex}`;
      let planText = preserveSamePosition
        ? consumePlanTextBySourceIndex(existingPlanItems, source.sourceType, sourceIndex)
        : consumePlanTextBySourceIdentity(existingPlanItems, source.sourceType, sourceIndex, sourceText);
      if (planText === null) {
        planText = preserveSamePosition
          ? consumePlanTextBySourceIdentity(existingPlanItems, source.sourceType, sourceIndex, sourceText)
          : consumePlanTextBySourceText(existingPlanItems, source.sourceType, sourceText);
      }
      if (planText === null) {
        const existingByIndex = existingPlanItems.bySourceIndex.get(existingKey);
        const oldSourceStillExists = existingByIndex?.sourceText
          ? currentSourceTextsByType.get(source.sourceType)?.has(existingByIndex.sourceText)
          : false;
        planText = existingByIndex && !oldSourceStillExists ? existingByIndex.planText : '';
      }
      if (!hasStructuredPlanItems && !planText && legacyIndex < legacyPlanTexts.length) {
        planText = legacyPlanTexts[legacyIndex];
      }
      legacyIndex += 1;
      items.push({
        sourceType: source.sourceType,
        sourceLabel: source.sourceLabel,
        sourceIndex,
        sourceText,
        planText: normalizeReviewPlanText(planText)
      });
    }
  }

  return items;
}

export function assertReviewImplementationPlanItemsComplete(formData = {}) {
  const missingItems = (formData.implementationPlanItems || [])
    .filter((item) => !normalizeReviewPlanText(item.planText))
    .map((item) => `${item.sourceType}:${item.sourceIndex}`);
  if (missingItems.length > 0) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING,
      'Required solution review implementation plan items are missing',
      400,
      ['implementationPlanItems', ...missingItems]
    );
  }
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
  formData.implementationPlanItems = buildReviewImplementationPlanItems(formData);
  formData.actionItems = formData.implementationPlanItems
    .map((item) => formatImplementationPlanItem(item))
    .filter(Boolean);
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
