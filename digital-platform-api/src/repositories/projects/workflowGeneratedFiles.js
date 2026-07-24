import fs from 'node:fs/promises';
import path from 'node:path';
import { renderXlsxTemplate } from '../../utils/ooxmlRenderer.js';
import {
  listStageDocumentOnlineFormImagesForGeneration,
  readOnlineFormImageForGeneration
} from '../stageDocuments/onlineFormImageRepository.js';

export const GENERATED_XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const GENERATED_DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const WORKFLOW_FORM_GENERATED_FILE_TYPE = 'xlsx';
export const WORKFLOW_DOCX_GENERATED_FILE_TYPE = 'docx';

const TEMPLATE_DIRECTORY_NAME = '智能制造项目管理文件模板';
const DEFAULT_ROLE_KEY_MAP = Object.freeze({
  PROJECT_MANAGER: 'project_manager',
  TECHNICAL_OWNER: 'technical_owner',
  BUSINESS_OWNER: 'business_owner',
  PROCUREMENT_OWNER: 'procurement_owner',
  FINANCE_ACCOUNTANT: 'finance_accountant',
  FINANCE_OWNER: 'finance_owner'
});

function parseStoredJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sanitizeGeneratedFileNamePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function buildGeneratedFormFileName({ projectRow, definition, revision, fileType = WORKFLOW_FORM_GENERATED_FILE_TYPE }) {
  const projectName = sanitizeGeneratedFileNamePart(projectRow.project_name || `项目${projectRow.id}`);
  const documentCode = sanitizeGeneratedFileNamePart(definition.documentCode);
  const formName = sanitizeGeneratedFileNamePart(definition.generatedFileNamePrefix || definition.formName);
  return `${documentCode}-${formName}-${projectName}-v${revision}.${fileType}`;
}

function truncateGeneratedCellValue(value, maxLength = 30000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeTemplateDisplayValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTemplateDisplayValue(item)).filter(Boolean).join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function cleanTemplateValue(value) {
  return normalizeTemplateDisplayValue(value).trim();
}

const DEFAULT_TEMPLATE_VALUE_BUILDERS = Object.freeze({
  temperatureRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `工作温度：（${cleanTemplateValue(min)}）℃~（${cleanTemplateValue(max)}）℃`;
  },
  storageTemperatureRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `储存温度：（${cleanTemplateValue(min)}）℃~（${cleanTemplateValue(max)}）℃`;
  },
  humidityRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `工作湿度：（${cleanTemplateValue(min)}）%~（${cleanTemplateValue(max)}）%`;
  },
  storageHumidityRange: ([min, max]) => {
    if (!cleanTemplateValue(min) && !cleanTemplateValue(max)) {
      return '';
    }
    return `储存湿度：（${cleanTemplateValue(min)}）%~（${cleanTemplateValue(max)}）%`;
  },
  noiseLimit: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `噪音：≤（${cleanTemplateValue(value)}）dB`;
  },
  ipProtection: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    const level = cleanTemplateValue(value).replace(/^IP/i, '');
    return `IP防护等级：IP（${level}）`;
  },
  antiCorrosion: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `防腐等级：（${cleanTemplateValue(value)}）`;
  },
  altitudeLimit: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `海拔高度：≤（${cleanTemplateValue(value)}）m`;
  },
  explosionProof: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `防爆要求：（${cleanTemplateValue(value)}）`;
  },
  siteCondition: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `可用场地尺寸（如有图纸请提供）：\n${normalizeTemplateDisplayValue(value)}`;
  },
  siteUtilities: ([powerSupply, airSupply, hydraulicSource]) => {
    if (![powerSupply, airSupply, hydraulicSource].some((value) => cleanTemplateValue(value))) {
      return '';
    }
    return `电源：（${cleanTemplateValue(powerSupply)}）  气源：（${cleanTemplateValue(airSupply)}）  液压源：（${cleanTemplateValue(hydraulicSource)}）`;
  },
  liftingEquipment: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `吊装设备：${normalizeTemplateDisplayValue(value)}`;
  }
});

export function getTemplateSourceValue(source, pathExpression) {
  if (!pathExpression) {
    return null;
  }

  return String(pathExpression)
    .split('.')
    .reduce((value, key) => (value === null || value === undefined ? null : value[key]), source);
}

export function getTemplateSourceValues(source, mapping) {
  if (Array.isArray(mapping.sourcePaths)) {
    return mapping.sourcePaths.map((pathExpression) => getTemplateSourceValue(source, pathExpression));
  }

  return [getTemplateSourceValue(source, mapping.source)];
}

export function buildTemplateMappingValue(mapping, source, valueBuilders = DEFAULT_TEMPLATE_VALUE_BUILDERS) {
  if (Object.hasOwn(mapping, 'value')) {
    return mapping.value;
  }

  const values = getTemplateSourceValues(source, mapping);
  if (!mapping.valueBuilder) {
    return values[0];
  }

  const builder = valueBuilders[mapping.valueBuilder];
  if (!builder) {
    throw new Error(`Workflow template value builder is not registered: ${mapping.valueBuilder}`);
  }

  return builder(values);
}

function normalizeRepeatableTemplateValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRoleName(roleState, roleKey) {
  return roleState?.[roleKey]?.user?.name || '';
}

export function buildWorkflowGeneratedFormSource({
  projectRow,
  definition,
  formRow,
  roleState,
  roleKeyMap = DEFAULT_ROLE_KEY_MAP
}) {
  const formData = parseStoredJson(formRow.form_data_json, {});
  const revision = Number(formRow.revision ?? 1);
  const submittedAt = formRow.submitted_at || '';
  const submittedByName = formRow.submitted_by_display_name || '';
  const submittedByAccount = formRow.submitted_by_account || '';
  const recorderName = normalizeTemplateDisplayValue(formData.recorder || submittedByName || submittedByAccount || '');
  const reviewRoundLabel = definition.reviewType === 'customer'
    ? `甲方，第（${revision}）次`
    : definition.reviewType === 'internal'
      ? `内部，第（${revision}）次`
      : `第（${revision}）版`;
  const generatedContext = [
    `${definition.documentCode} ${definition.formName}`,
    `节点：${definition.nodeKey}`,
    definition.reviewType ? `评审类型：${definition.reviewType}` : null,
    `版本：${revision}`,
    submittedAt ? `提交时间：${submittedAt}` : null,
    submittedByName ? `提交人：${submittedByName}` : null
  ].filter(Boolean).join('\n');

  return {
    project: {
      projectCode: projectRow.project_code,
      projectName: projectRow.project_name,
      customerName: projectRow.customer_name
    },
    definition: {
      documentCode: definition.documentCode,
      formName: definition.formName,
      nodeKey: definition.nodeKey,
      reviewType: definition.reviewType || null,
      templateName: definition.templateName
    },
    form: formData,
    roles: {
      projectManagerName: getRoleName(roleState, roleKeyMap.PROJECT_MANAGER) || projectRow.project_manager || '',
      technicalOwnerName: getRoleName(roleState, roleKeyMap.TECHNICAL_OWNER),
      businessOwnerName: getRoleName(roleState, roleKeyMap.BUSINESS_OWNER),
      procurementOwnerName: getRoleName(roleState, roleKeyMap.PROCUREMENT_OWNER),
      financeAccountantName: getRoleName(roleState, roleKeyMap.FINANCE_ACCOUNTANT),
      financeOwnerName: getRoleName(roleState, roleKeyMap.FINANCE_OWNER)
    },
    context: {
      revision,
      submittedAt,
      submittedByName,
      submittedByAccount,
      reviewRoundLabel,
      generatedContext,
      recorderName,
      recorderLabel: recorderName ? `记录人：${recorderName}` : '记录人：'
    }
  };
}

export function buildWorkflowGeneratedFormCellValues({
  projectRow,
  definition,
  formRow,
  roleState,
  roleKeyMap = DEFAULT_ROLE_KEY_MAP,
  valueBuilders = DEFAULT_TEMPLATE_VALUE_BUILDERS
}) {
  const source = buildWorkflowGeneratedFormSource({ projectRow, definition, formRow, roleState, roleKeyMap });
  const cellValues = {};
  for (const mapping of definition.templateMappings || []) {
    const rawValue = buildTemplateMappingValue(mapping, source, valueBuilders);
    if (mapping.repeatRows) {
      const { column, startRow, endRow } = mapping.repeatRows;
      const start = Number(startRow);
      const end = Number(endRow);
      if (!column || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) {
        continue;
      }

      const rows = normalizeRepeatableTemplateValue(rawValue);
      const rowCount = end - start + 1;
      for (let offset = 0; offset < rowCount; offset += 1) {
        const isLastRow = offset === rowCount - 1;
        const rowValue = isLastRow
          ? rows.slice(offset).join('\n')
          : rows[offset] || '';
        cellValues[`${column}${start + offset}`] = {
          value: truncateGeneratedCellValue(normalizeTemplateDisplayValue(rowValue)),
          preserveTemplateWhenEmpty: mapping.preserveTemplateWhenEmpty === true,
          preserveStyle: mapping.preserveStyle !== false,
          textFont: mapping.textFont || '',
          fontSize: mapping.fontSize || null
        };
      }
      continue;
    }

    if (!mapping.target) {
      continue;
    }

    cellValues[mapping.target] = {
      value: truncateGeneratedCellValue(normalizeTemplateDisplayValue(rawValue)),
      preserveTemplateWhenEmpty: mapping.preserveTemplateWhenEmpty === true,
      preserveStyle: mapping.preserveStyle !== false,
      textFont: mapping.textFont || '',
      fontSize: mapping.fontSize || null
    };
  }
  return cellValues;
}

export function groupOnlineFormImagesByFieldKey(images = []) {
  const grouped = {};
  for (const image of images) {
    if (!grouped[image.fieldKey]) {
      grouped[image.fieldKey] = [];
    }
    grouped[image.fieldKey].push(image);
  }
  return grouped;
}

export async function buildWorkflowGeneratedFormImageValues({
  executor,
  projectRow,
  definition,
  stageDocumentRow,
  readOnlineFormImage
}) {
  const imageMappings = definition.imageMappings || [];
  if (imageMappings.length === 0 || !stageDocumentRow?.id) {
    return [];
  }

  const formImages = groupOnlineFormImagesByFieldKey(
    await listStageDocumentOnlineFormImagesForGeneration(executor, projectRow.id, stageDocumentRow.id)
  );
  const imageValues = [];
  for (const mapping of imageMappings) {
    const images = getTemplateSourceValue({ formImages }, mapping.source);
    const activeImages = Array.isArray(images) ? images : [];
    if (activeImages.length === 0) {
      continue;
    }

    const maxImages = Number.isSafeInteger(Number(mapping.maxImages)) ? Number(mapping.maxImages) : 3;
    for (const [index, image] of activeImages.slice(0, maxImages).entries()) {
      const buffer = await readOnlineFormImage(image);
      imageValues.push({
        target: mapping.target,
        layoutIndex: index,
        layoutCount: Math.min(activeImages.length, maxImages),
        originalFileName: image.originalFileName,
        mimeType: image.mimeType,
        buffer,
        preserveAspectRatio: mapping.preserveAspectRatio !== false,
        mergeAdjustment: mapping.mergeAdjustment || null
      });
    }
  }

  return imageValues;
}

export async function readWorkflowTemplate(templateName, {
  errorCode = 'WORKFLOW_TEMPLATE_NOT_FOUND',
  messagePrefix = 'Workflow template file not found'
} = {}) {
  const candidatePaths = [
    path.resolve(process.cwd(), '..', TEMPLATE_DIRECTORY_NAME, templateName),
    path.resolve(process.cwd(), TEMPLATE_DIRECTORY_NAME, templateName)
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await fs.readFile(candidatePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const error = new Error(`${messagePrefix}: ${templateName}`);
  error.code = errorCode;
  throw error;
}

export function buildWorkflowGenerationErrorMessage(error, fallbackMessage = 'Workflow generated file failed') {
  const message = error?.message || fallbackMessage;
  return error?.code ? `${error.code}: ${message}` : message;
}

export async function generateWorkflowXlsxFormFile({
  executor,
  projectRow,
  definition,
  formRow,
  storage,
  roleState,
  stageDocumentRow = null,
  readOnlineFormImage = readOnlineFormImageForGeneration,
  readTemplate = readWorkflowTemplate,
  buildErrorMessage = buildWorkflowGenerationErrorMessage,
  roleKeyMap = DEFAULT_ROLE_KEY_MAP,
  valueBuilders = DEFAULT_TEMPLATE_VALUE_BUILDERS
}) {
  let storageKey = null;
  const templateName = definition.templateName;
  const fileName = buildGeneratedFormFileName({
    projectRow,
    definition,
    revision: formRow.revision
  });

  try {
    const templateBuffer = await readTemplate(templateName);
    const imageValues = await buildWorkflowGeneratedFormImageValues({
      executor,
      projectRow,
      definition,
      stageDocumentRow,
      readOnlineFormImage
    });
    const generatedBuffer = renderXlsxTemplate(templateBuffer, {
      cellValues: buildWorkflowGeneratedFormCellValues({
        projectRow,
        definition,
        formRow,
        roleState,
        roleKeyMap,
        valueBuilders
      }),
      imageValues
    });
    storageKey = storage.createStorageKey({
      projectId: projectRow.id,
      documentCode: definition.documentCode,
      revision: formRow.revision
    });
    const stored = await storage.writeFile(storageKey, generatedBuffer);
    return {
      success: true,
      storageKey,
      fileName,
      mimeType: GENERATED_XLSX_MIME_TYPE,
      fileSize: Number(stored.size ?? generatedBuffer.length),
      templateName
    };
  } catch (error) {
    if (storageKey) {
      await storage.cleanupFile(storageKey);
    }
    return {
      success: false,
      templateName,
      errorMessage: buildErrorMessage(error)
    };
  }
}
