import { readFile } from 'node:fs/promises';
import { isValidBusinessDepartment } from './organization.js';
import { STANDARD_PROJECT_STAGES } from './stages.js';
import {
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260625
} from './stageDocumentTemplateItemsV20260624.js';
import {
  V20260629_TARGET_TEMPLATE_VERSION,
  V20260629_TARGET_TEMPLATE_OUTPUT_COUNT,
  V20260629_TEMPLATE_SWITCH_METADATA,
  V20260629_TARGET_TEMPLATE_OUTPUTS,
  V20260629_WORKSPACE_BLUE_MODULES,
  getV20260629TargetOutputByCode,
  getV20260629WorkspaceShellConfig
} from './stageDocumentTemplateItemsV20260629.js';

export {
  V20260629_TARGET_TEMPLATE_VERSION,
  V20260629_TARGET_TEMPLATE_OUTPUT_COUNT,
  V20260629_TEMPLATE_SWITCH_METADATA,
  V20260629_TARGET_TEMPLATE_OUTPUTS,
  V20260629_WORKSPACE_BLUE_MODULES,
  getV20260629TargetOutputByCode,
  getV20260629WorkspaceShellConfig
} from './stageDocumentTemplateItemsV20260629.js';

export const LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION = 'v20260625';
export const LEGACY_STAGE_DOCUMENT_ITEM_COUNT = 64;
export const STAGE_DOCUMENT_TEMPLATE_VERSION = V20260629_TARGET_TEMPLATE_VERSION;
export const EXPECTED_STAGE_DOCUMENT_ITEM_COUNT = V20260629_TARGET_TEMPLATE_OUTPUT_COUNT;
export const EXPECTED_COMPLETION_MODE_COUNTS = Object.freeze({
  submit_only: 35,
  approval_required: 29,
  conditional_submit: 7,
  conditional_approval: 0
});

export const SUBMIT_MODE = {
  ONLINE_FORM: 'online_form',
  FILE_UPLOAD: 'file_upload',
  MIXED: 'mixed',
  TBD: 'tbd'
};

export const COMPLETION_MODE = {
  SUBMIT_ONLY: 'submit_only',
  APPROVAL_REQUIRED: 'approval_required',
  CONDITIONAL_SUBMIT: 'conditional_submit',
  CONDITIONAL_APPROVAL: 'conditional_approval'
};

export const DOCUMENT_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  RETURNED: 'returned'
};

const stageByOrder = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageOrder, stage]));
const stageByName = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageName, stage]));
const expectedStageDocumentCounts = new Map([
  [1, 3],
  [2, 16],
  [3, 5],
  [4, 17],
  [5, 21],
  [6, 2],
  [7, 5],
  [8, 2]
]);
const legacyExpectedStageDocumentCounts = new Map([
  [1, 3],
  [2, 15],
  [3, 4],
  [4, 17],
  [5, 17],
  [6, 2],
  [7, 4],
  [8, 2]
]);
const legacyExpectedCompletionModeCounts = Object.freeze({
  submit_only: 33,
  approval_required: 24,
  conditional_submit: 7,
  conditional_approval: 0
});
const templateOwnershipByCode = new Map(
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260625.map((item) => [
    item.documentCode,
    {
      ownerDepartment: item.ownerDepartment,
      reviewDepartment: item.reviewDepartment,
      completionMode: item.completionMode
    }
  ])
);
const legacyTemplateItemByCode = new Map(
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260625.map((item) => [item.documentCode, item])
);
const validCompletionModes = new Set(Object.values(COMPLETION_MODE));

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/g, '').trim();
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map(normalizeCell);
}

function mapRequiredFlag(value) {
  if (value === '是') {
    return true;
  }

  if (value === '否' || value === '建议') {
    return false;
  }

  throw new Error(`Unsupported required flag in stage document checklist: ${value}`);
}

function mapSubmitMode(value) {
  if (value === '在线表单') {
    return SUBMIT_MODE.ONLINE_FORM;
  }

  if (value === '文件上传') {
    return SUBMIT_MODE.FILE_UPLOAD;
  }

  if (value === '在线表单+文件上传') {
    return SUBMIT_MODE.MIXED;
  }

  if (value === '混合') {
    return SUBMIT_MODE.MIXED;
  }

  if (value === '暂未确定') {
    return SUBMIT_MODE.TBD;
  }

  throw new Error(`Unsupported submit mode in stage document checklist: ${value}`);
}

function parseStageHeading(line) {
  const match = line.match(/^###\s+3\.(\d+)\s+(.+?)\s*$/);
  if (!match) {
    return null;
  }

  const stageOrder = Number.parseInt(match[1], 10);
  const stageName = match[2];
  const stage = stageByOrder.get(stageOrder);

  if (!stage) {
    throw new Error(`Unsupported stage order in stage document checklist: ${stageOrder}`);
  }

  if (stage.stageName !== stageName) {
    throw new Error(
      `Stage name mismatch in stage document checklist: expected ${stage.stageName}, got ${stageName}`
    );
  }

  return stage;
}

function buildExpectedTargetFolderPath(stage, documentCode, documentName) {
  const shortStageName = stage.stageName.replace(/阶段$/, '');
  return `${stage.stageOrder}-${shortStageName}/${documentCode} ${documentName}`;
}

function assertTemplateItems(
  items,
  {
    expectedVersion,
    expectedCount,
    expectedStageCounts,
    expectedCompletionCounts,
    enforceLegacyCodeOrder = false,
    sourceLabel
  }
) {
  if (items.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${sourceLabel} stage document items, got ${items.length}`
    );
  }

  const stageCounts = items.reduce(
    (counts, item) => counts.set(item.stageOrder, (counts.get(item.stageOrder) || 0) + 1),
    new Map()
  );
  for (const [stageOrder, expectedStageCount] of expectedStageCounts) {
    const actualCount = stageCounts.get(stageOrder) || 0;
    if (actualCount !== expectedStageCount) {
      throw new Error(
        `Invalid ${sourceLabel} stage document count for stage ${stageOrder}: expected ${expectedStageCount}, got ${actualCount}`
      );
    }
  }

  const seen = new Set();
  const completionModeCounts = new Map(
    Object.values(COMPLETION_MODE).map((completionMode) => [completionMode, 0])
  );
  for (const item of items) {
    if (item.templateVersion !== expectedVersion) {
      throw new Error(
        `Invalid template version in ${sourceLabel} stage document checklist for ${item.documentCode}: ${item.templateVersion}`
      );
    }

    if (seen.has(item.documentCode)) {
      throw new Error(`Duplicate document code in stage document checklist: ${item.documentCode}`);
    }
    seen.add(item.documentCode);

    const expectedStage = stageByOrder.get(item.stageOrder);
    if (!expectedStage || expectedStage.stageKey !== item.stageKey || expectedStage.stageName !== item.stageName) {
      throw new Error(`Invalid stage fields in stage document checklist: ${item.documentCode}`);
    }

    if (enforceLegacyCodeOrder) {
      const [stageNumber, documentOrder] = item.documentCode.split('.').map((part) => Number.parseInt(part, 10));
      if (stageNumber !== item.stageOrder || documentOrder !== item.documentOrder) {
        throw new Error(`Document code/order mismatch in stage document checklist: ${item.documentCode}`);
      }
    }

    if (!item.targetFolderPath) {
      throw new Error(`Missing target folder path in stage document checklist: ${item.documentCode}`);
    }
    if (!validCompletionModes.has(item.completionMode)) {
      throw new Error(
        `Invalid completionMode in stage document checklist for ${item.documentCode}: ${item.completionMode}`
      );
    }
    completionModeCounts.set(
      item.completionMode,
      (completionModeCounts.get(item.completionMode) || 0) + 1
    );

    const expectedTargetFolderPath = buildExpectedTargetFolderPath(
      {
        stageOrder: item.stageOrder,
        stageName: item.stageName
      },
      item.documentCode,
      item.documentName
    );
    if (item.targetFolderPath !== expectedTargetFolderPath) {
      throw new Error(
        `Invalid target folder path in stage document checklist for ${item.documentCode}: expected ${expectedTargetFolderPath}, got ${item.targetFolderPath}`
      );
    }

    if (item.targetFolderId !== null) {
      throw new Error(`targetFolderId must be null in stage document checklist: ${item.documentCode}`);
    }

    for (const fieldName of ['ownerDepartment', 'reviewDepartment']) {
      if (!Object.prototype.hasOwnProperty.call(item, fieldName)) {
        throw new Error(`Missing ${fieldName} in stage document checklist: ${item.documentCode}`);
      }

      if (item[fieldName] !== null && !isValidBusinessDepartment(item[fieldName])) {
        throw new Error(
          `Invalid ${fieldName} in stage document checklist for ${item.documentCode}: ${item[fieldName]}`
        );
      }
    }
  }

  for (const [completionMode, expectedCompletionCount] of Object.entries(expectedCompletionCounts)) {
    const actualCount = completionModeCounts.get(completionMode) || 0;
    if (actualCount !== expectedCompletionCount) {
      throw new Error(
        `Invalid ${sourceLabel} completionMode count for ${completionMode}: expected ${expectedCompletionCount}, got ${actualCount}`
      );
    }
  }
}

function assertParsedItems(items) {
  assertTemplateItems(items, {
    expectedVersion: LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION,
    expectedCount: LEGACY_STAGE_DOCUMENT_ITEM_COUNT,
    expectedStageCounts: legacyExpectedStageDocumentCounts,
    expectedCompletionCounts: legacyExpectedCompletionModeCounts,
    enforceLegacyCodeOrder: true,
    sourceLabel: LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION
  });

  for (const [documentCode, expectedCompletionMode] of [
    ['4.14', COMPLETION_MODE.SUBMIT_ONLY],
    ['4.15', COMPLETION_MODE.SUBMIT_ONLY],
    ['4.16', COMPLETION_MODE.APPROVAL_REQUIRED],
    ['3.4', COMPLETION_MODE.SUBMIT_ONLY],
    ['6.2', COMPLETION_MODE.SUBMIT_ONLY],
    ['8.1', COMPLETION_MODE.SUBMIT_ONLY]
  ]) {
    const item = items.find((candidate) => candidate.documentCode === documentCode);
    if (!item || item.completionMode !== expectedCompletionMode) {
      throw new Error(
        `Invalid v20260625 completionMode for ${documentCode}: expected ${expectedCompletionMode}, got ${item?.completionMode}`
      );
    }
  }
}

function assertCurrentTemplateItems(items) {
  assertTemplateItems(items, {
    expectedVersion: STAGE_DOCUMENT_TEMPLATE_VERSION,
    expectedCount: EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
    expectedStageCounts: expectedStageDocumentCounts,
    expectedCompletionCounts: EXPECTED_COMPLETION_MODE_COUNTS,
    sourceLabel: STAGE_DOCUMENT_TEMPLATE_VERSION
  });

  const byCode = new Map(items.map((item) => [item.documentCode, item]));
  for (const excludedDocumentCode of ['3.3', '5.4', 'LC33', 'LC54']) {
    if (byCode.has(excludedDocumentCode)) {
      throw new Error(`Excluded compatibility document must not enter v20260629 template: ${excludedDocumentCode}`);
    }
  }

  for (const documentCode of ['1.1', '1.2', '1.3']) {
    const item = byCode.get(documentCode);
    if (!item || item.submitMode !== SUBMIT_MODE.ONLINE_FORM) {
      throw new Error(`Initiation online form document missing from v20260629 template: ${documentCode}`);
    }
  }
}

function buildV20260629ApplicabilityCondition(output, legacyItem) {
  if (output.requirementType === 'conditional') {
    return output.notes || legacyItem?.applicabilityCondition || '条件适用';
  }

  if (output.requirementType === 'to_be_confirmed') {
    return output.notes || legacyItem?.applicabilityCondition || '是否适用待业务确认';
  }

  return legacyItem?.applicabilityCondition || '默认适用';
}

function buildV20260629ConfirmRole(output, legacyItem) {
  if (legacyItem?.confirmRole) {
    return legacyItem.confirmRole;
  }

  if (output.reviewDepartment) {
    return `${output.reviewDepartment}确认`;
  }

  return output.responsibleRole || '';
}

function buildV20260629TemplateItems() {
  const stageOrderCounters = new Map();

  const items = V20260629_TARGET_TEMPLATE_OUTPUTS.map((output) => {
    const stage = stageByOrder.get(output.stageOrder);
    if (!stage) {
      throw new Error(`Invalid v20260629 stage order: ${output.stageOrder}`);
    }

    const documentCode = output.legacyDocumentCode ?? output.targetOutputCode;
    const documentOrder = (stageOrderCounters.get(output.stageOrder) || 0) + 1;
    stageOrderCounters.set(output.stageOrder, documentOrder);
    const legacyItem = output.legacyDocumentCode ? legacyTemplateItemByCode.get(output.legacyDocumentCode) : null;

    return Object.freeze({
      templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
      stageOrder: stage.stageOrder,
      stageKey: stage.stageKey,
      stageName: stage.stageName,
      documentCode,
      targetOutputCode: output.targetOutputCode,
      documentOrder,
      documentName: output.documentName,
      isRequired: output.isRequired,
      defaultResponsibilityRole: output.responsibleRole || legacyItem?.defaultResponsibilityRole || '',
      confirmRole: buildV20260629ConfirmRole(output, legacyItem),
      ownerDepartment: output.ownerDepartment,
      reviewDepartment: output.reviewDepartment,
      completionMode: output.completionMode,
      submitMode: output.submitMode,
      targetFolderPath: buildExpectedTargetFolderPath(stage, documentCode, output.documentName),
      targetFolderId: null,
      applicabilityCondition: buildV20260629ApplicabilityCondition(output, legacyItem),
      notes: output.notes
    });
  });

  assertCurrentTemplateItems(items);
  return Object.freeze(items);
}

export const STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629 = buildV20260629TemplateItems();

function cloneTemplateItems(items) {
  return items.map((item) => ({ ...item }));
}

function parseDocumentCode(documentCode, sourceLabel) {
  const [stageNumber, documentOrder] = documentCode
    .split('.')
    .map((part) => Number.parseInt(part, 10));

  if (!Number.isSafeInteger(stageNumber) || !Number.isSafeInteger(documentOrder)) {
    throw new Error(`Invalid document code in ${sourceLabel}: ${documentCode}`);
  }

  return { stageNumber, documentOrder };
}

function normalizeDepartmentCell(value, fieldName, documentCode) {
  const department = value || null;
  if (department !== null && !isValidBusinessDepartment(department)) {
    throw new Error(`Invalid ${fieldName} in stage document checklist for ${documentCode}: ${department}`);
  }

  return department;
}

function parseLegacyStageChecklistRow(cells, currentStage, line) {
  if (!currentStage) {
    throw new Error('Found document row before stage heading in stage document checklist');
  }

  if (cells.length !== 8) {
    throw new Error(`Unexpected column count in stage document checklist row: ${line}`);
  }

  const [
    documentCode,
    documentName,
    requiredLabel,
    submitModeLabel,
    defaultResponsibilityRole,
    confirmRole,
    targetFolderPath
  ] = cells;
  const { stageNumber, documentOrder } = parseDocumentCode(documentCode, 'stage document checklist');

  if (stageNumber !== currentStage.stageOrder) {
    throw new Error(`Document code does not match current stage in stage document checklist: ${documentCode}`);
  }

  const ownership = templateOwnershipByCode.get(documentCode);
  if (!ownership) {
    throw new Error(`Missing ownership mapping in stage document checklist: ${documentCode}`);
  }

  return {
    templateVersion: LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION,
    stageOrder: currentStage.stageOrder,
    stageKey: currentStage.stageKey,
    stageName: currentStage.stageName,
    documentCode,
    documentOrder,
    documentName,
    isRequired: mapRequiredFlag(requiredLabel),
    defaultResponsibilityRole,
    confirmRole,
    ownerDepartment: ownership.ownerDepartment,
    reviewDepartment: ownership.reviewDepartment,
    completionMode: ownership.completionMode,
    submitMode: mapSubmitMode(submitModeLabel),
    targetFolderPath,
    targetFolderId: null
  };
}

function parseV20260624PlanningRow(cells, line) {
  if (cells.length !== 10) {
    throw new Error(`Unexpected column count in v20260624 planning row: ${line}`);
  }

  const [
    documentCode,
    stageName,
    documentName,
    ownerDepartmentCell,
    reviewDepartmentCell,
    confirmRole,
    requiredLabel,
    applicabilityCondition,
    submitModeLabel,
    notes
  ] = cells;
  const stage = stageByName.get(stageName);
  if (!stage) {
    throw new Error(`Unsupported stage name in v20260624 planning row: ${stageName}`);
  }

  const { stageNumber, documentOrder } = parseDocumentCode(documentCode, 'v20260624 planning table');
  if (stageNumber !== stage.stageOrder) {
    throw new Error(`Document code does not match stage in v20260624 planning table: ${documentCode}`);
  }

  return {
    templateVersion: LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    documentCode,
    documentOrder,
    documentName,
    isRequired: mapRequiredFlag(requiredLabel),
    defaultResponsibilityRole: '',
    confirmRole,
    ownerDepartment: normalizeDepartmentCell(ownerDepartmentCell, 'ownerDepartment', documentCode),
    reviewDepartment: normalizeDepartmentCell(reviewDepartmentCell, 'reviewDepartment', documentCode),
    completionMode: templateOwnershipByCode.get(documentCode)?.completionMode,
    submitMode: mapSubmitMode(submitModeLabel),
    targetFolderPath: buildExpectedTargetFolderPath(stage, documentCode, documentName),
    targetFolderId: null,
    applicabilityCondition,
    notes
  };
}

export function parseStageDocumentTemplateMarkdown(markdown) {
  const items = [];
  let currentStage = null;

  for (const line of markdown.split(/\r?\n/)) {
    const stage = parseStageHeading(line);
    if (stage) {
      currentStage = stage;
      continue;
    }

    if (!/^\|\s*\d+\.\d+\s*\|/.test(line)) {
      continue;
    }

    const cells = splitMarkdownRow(line);
    items.push(
      cells.length === 10
        ? parseV20260624PlanningRow(cells, line)
        : parseLegacyStageChecklistRow(cells, currentStage, line)
    );
  }

  assertParsedItems(items);
  return items;
}

export async function loadStageDocumentTemplateItems(markdownPath) {
  if (!markdownPath) {
    const items = cloneTemplateItems(STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629);
    assertCurrentTemplateItems(items);
    return items;
  }

  const markdown = await readFile(markdownPath, 'utf8');
  return parseStageDocumentTemplateMarkdown(markdown);
}
