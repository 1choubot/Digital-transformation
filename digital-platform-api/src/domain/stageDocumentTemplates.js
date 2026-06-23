import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STANDARD_PROJECT_STAGES } from './stages.js';

export const STAGE_DOCUMENT_TEMPLATE_VERSION = 'v1';
export const EXPECTED_STAGE_DOCUMENT_ITEM_COUNT = 48;

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

const DOCS_9_2_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/9.2_阶段资料清单与责任角色表.md'
);

const stageByOrder = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageOrder, stage]));

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

  if (value === '建议') {
    return false;
  }

  throw new Error(`Unsupported required flag in docs/9.2: ${value}`);
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

  if (value === '暂未确定') {
    return SUBMIT_MODE.TBD;
  }

  throw new Error(`Unsupported submit mode in docs/9.2: ${value}`);
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
    throw new Error(`Unsupported stage order in docs/9.2: ${stageOrder}`);
  }

  if (stage.stageName !== stageName) {
    throw new Error(`Stage name mismatch in docs/9.2: expected ${stage.stageName}, got ${stageName}`);
  }

  return stage;
}

function assertParsedItems(items) {
  if (items.length !== EXPECTED_STAGE_DOCUMENT_ITEM_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT} stage document items from docs/9.2, got ${items.length}`
    );
  }

  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.documentCode)) {
      throw new Error(`Duplicate document code in docs/9.2: ${item.documentCode}`);
    }
    seen.add(item.documentCode);
  }
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

    if (!currentStage) {
      throw new Error('Found document row before stage heading in docs/9.2');
    }

    const cells = splitMarkdownRow(line);
    if (cells.length !== 7) {
      throw new Error(`Unexpected column count in docs/9.2 row: ${line}`);
    }

    const [documentCode, documentName, requiredLabel, submitModeLabel, defaultResponsibilityRole, confirmRole, targetFolderPath] =
      cells;
    const [stageNumber, documentOrder] = documentCode.split('.').map((part) => Number.parseInt(part, 10));

    if (stageNumber !== currentStage.stageOrder || !Number.isSafeInteger(documentOrder)) {
      throw new Error(`Document code does not match current stage in docs/9.2: ${documentCode}`);
    }

    items.push({
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
      submitMode: mapSubmitMode(submitModeLabel),
      targetFolderPath,
      targetFolderId: null
    });
  }

  assertParsedItems(items);
  return items;
}

export async function loadStageDocumentTemplateItems(markdownPath = DOCS_9_2_PATH) {
  const markdown = await readFile(markdownPath, 'utf8');
  return parseStageDocumentTemplateMarkdown(markdown);
}
