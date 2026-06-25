import { readFile } from 'node:fs/promises';
import { isValidBusinessDepartment } from './organization.js';
import { STANDARD_PROJECT_STAGES } from './stages.js';
import { STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260624 } from './stageDocumentTemplateItemsV20260624.js';

export const STAGE_DOCUMENT_TEMPLATE_VERSION = 'v20260624';
export const EXPECTED_STAGE_DOCUMENT_ITEM_COUNT = 64;

export const SUBMIT_MODE = {
  ONLINE_FORM: 'online_form',
  FILE_UPLOAD: 'file_upload',
  MIXED: 'mixed',
  TBD: 'tbd'
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
  [2, 15],
  [3, 4],
  [4, 17],
  [5, 17],
  [6, 2],
  [7, 4],
  [8, 2]
]);
const templateOwnershipByCode = new Map(
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260624.map((item) => [
    item.documentCode,
    {
      ownerDepartment: item.ownerDepartment,
      reviewDepartment: item.reviewDepartment
    }
  ])
);

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

function assertParsedItems(items) {
  if (items.length !== EXPECTED_STAGE_DOCUMENT_ITEM_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT} stage document items, got ${items.length}`
    );
  }

  const stageCounts = items.reduce(
    (counts, item) => counts.set(item.stageOrder, (counts.get(item.stageOrder) || 0) + 1),
    new Map()
  );
  for (const [stageOrder, expectedCount] of expectedStageDocumentCounts) {
    const actualCount = stageCounts.get(stageOrder) || 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Invalid v20260624 stage document count for stage ${stageOrder}: expected ${expectedCount}, got ${actualCount}`
      );
    }
  }

  const seen = new Set();
  for (const item of items) {
    if (item.templateVersion !== STAGE_DOCUMENT_TEMPLATE_VERSION) {
      throw new Error(
        `Invalid template version in stage document checklist for ${item.documentCode}: ${item.templateVersion}`
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

    const [stageNumber, documentOrder] = item.documentCode.split('.').map((part) => Number.parseInt(part, 10));
    if (stageNumber !== item.stageOrder || documentOrder !== item.documentOrder) {
      throw new Error(`Document code/order mismatch in stage document checklist: ${item.documentCode}`);
    }

    if (!item.targetFolderPath) {
      throw new Error(`Missing target folder path in stage document checklist: ${item.documentCode}`);
    }

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
}

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
    templateVersion: STAGE_DOCUMENT_TEMPLATE_VERSION,
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
    templateVersion: STAGE_DOCUMENT_TEMPLATE_VERSION,
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
    const items = cloneTemplateItems(STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260624);
    assertParsedItems(items);
    return items;
  }

  const markdown = await readFile(markdownPath, 'utf8');
  return parseStageDocumentTemplateMarkdown(markdown);
}
