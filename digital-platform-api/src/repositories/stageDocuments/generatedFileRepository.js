import { createHash } from 'node:crypto';
import {
  GENERATED_FILE_STATUS,
  INITIATION_TEMPLATE_TRIGGER_EVENT,
  calculateTemplateHash,
  getInitiationTemplateManifest,
  getSafeTemplateDescriptor,
  readRegisteredTemplate
} from '../../domain/initiationTemplateFileManifest.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REVIEW_NODE_KEY,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE
} from '../../domain/initiationReview.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import { pool } from '../../db/pool.js';
import { ProjectNotFoundError } from '../projects/shared.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { canViewStageDocumentItem } from './accessControl.js';
import { StageDocumentNotFoundError } from './shared.js';
import {
  listStageDocumentOnlineFormImagesForGeneration,
  readOnlineFormImageForGeneration
} from './onlineFormImageRepository.js';
import {
  assertStageDocumentGeneratedFileReadable,
  cleanupStageDocumentGeneratedFile,
  createStageDocumentGeneratedFileStorageKey,
  writeStageDocumentGeneratedFile
} from '../../storage/stageDocumentGeneratedFileStorage.js';
import { renderDocxTemplate, renderXlsxTemplate } from '../../utils/ooxmlRenderer.js';

const MIME_TYPE_BY_FILE_TYPE = Object.freeze({
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const NOTICE_TEMPLATE = Object.freeze({
  title: '关于确定项目名称及编号的通知',
  bodyParagraphs: [
    '各部门：',
    '为便于公司项目生产准备、事前申请、费用填报、成本归集、物资采购等工作开展。现将各项目的项目名称、项目编号确定如下：',
    '请各部门严格按照项目名称、项目编号进行生产准备、费用填报、事前申请、成本归集、物资采购等工作。'
  ],
  signer: '重庆凯尔夫智能测控技术有限责任公司'
});

export const STAGE_DOCUMENT_GENERATED_FILE_ERROR = Object.freeze({
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_STAGE_DOCUMENT_ID: 'INVALID_STAGE_DOCUMENT_ID',
  FILE_NOT_FOUND: 'GENERATED_FILE_NOT_FOUND',
  FILE_MISSING: 'GENERATED_FILE_MISSING',
  FORBIDDEN_OPERATION: 'FORBIDDEN_OPERATION'
});

export class StageDocumentGeneratedFileError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentGeneratedFileError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function parseJsonValue(value, fallback = null) {
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

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex');
}

function sanitizeFilePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function buildGeneratedFileName({ manifest, project, version }) {
  const projectName = sanitizeFilePart(project.projectName || project.project_name || '未命名项目');
  return `${manifest.generatedFileNamePrefix}-${projectName}-v${version}.${manifest.fileType}`;
}

function getByPath(source, pathExpression) {
  if (!pathExpression) {
    return null;
  }

  return String(pathExpression)
    .split('.')
    .reduce((value, key) => (value === null || value === undefined ? null : value[key]), source);
}

function cleanTemplateValue(value) {
  return normalizeDisplayValue(value).trim();
}

function firstCleanTemplateValue(values) {
  for (const value of values) {
    const cleaned = cleanTemplateValue(value);
    if (cleaned) {
      return cleaned;
    }
  }
  return '';
}

function buildPrefixedTemplateValue(prefix, values) {
  const value = firstCleanTemplateValue(values);
  return value ? `${prefix}${value}` : '';
}

function formatReviewDateValue(value) {
  const cleaned = cleanTemplateValue(value);
  if (!cleaned) {
    return '';
  }

  if (typeof value === 'string') {
    const datePrefix = cleaned.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (datePrefix) {
      return datePrefix;
    }
  }

  const parsed = value instanceof Date ? value : new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return cleaned.slice(0, 10);
}

function formatChineseDateValue(value) {
  const cleaned = cleanTemplateValue(value);
  if (!cleaned) {
    return '';
  }

  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }

  const parsed = value instanceof Date ? value : new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
  }

  return cleaned;
}

const TEMPLATE_VALUE_BUILDERS = Object.freeze({
  projectNameHeader: (values) => buildPrefixedTemplateValue('项目名称：', values),
  customerNameHeader: (values) => buildPrefixedTemplateValue('客户名称：', values),
  customerContactPersonHeader: (values) => buildPrefixedTemplateValue('客户项目联系人：', values),
  customerContactHeader: (values) => buildPrefixedTemplateValue('联系电话：', values),
  projectResponsibleHeader: (values) => buildPrefixedTemplateValue('本公司商务负责人：', values),
  projectResponsibleContactHeader: (values) => buildPrefixedTemplateValue('联系方式：', values),
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
    return `可用场地尺寸（如有图纸请提供）：\n${normalizeDisplayValue(value)}`;
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
    return `吊装设备：${normalizeDisplayValue(value)}`;
  },
  businessReviewOpinion: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `营销中心意见：${normalizeDisplayValue(value)}`;
  },
  technicalReviewOpinion: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `研发中心意见：${normalizeDisplayValue(value)}`;
  },
  generalReviewOpinion: ([value]) => {
    if (!cleanTemplateValue(value)) {
      return '';
    }
    return `总经理意见：${normalizeDisplayValue(value)}`;
  },
  reviewSigner: (values) => buildPrefixedTemplateValue('负责人（签字）：', values),
  reviewDate: (values) => {
    const value = values.find((candidate) => cleanTemplateValue(candidate));
    const formatted = formatReviewDateValue(value);
    return formatted ? `日期：${formatted}` : '';
  },
  noticeInitiationDate: ([initiationDate, noticeDate]) => cleanTemplateValue(initiationDate) || cleanTemplateValue(noticeDate),
  noticeChineseDate: ([noticeDate]) => formatChineseDateValue(noticeDate)
});

function getMappingSourceValues(mapping, source) {
  if (Array.isArray(mapping.source?.paths)) {
    return mapping.source.paths.map((pathExpression) => getByPath(source, pathExpression));
  }

  return [getByPath(source, mapping.source?.path)];
}

function buildMappingValue(mapping, source) {
  const values = getMappingSourceValues(mapping, source);
  if (mapping.valueBuilder) {
    const builder = TEMPLATE_VALUE_BUILDERS[mapping.valueBuilder];
    if (!builder) {
      const error = new Error(`Template value builder is not registered: ${mapping.valueBuilder}`);
      error.code = 'TEMPLATE_VALUE_BUILDER_NOT_REGISTERED';
      throw error;
    }
    return builder(values);
  }

  return normalizeDisplayValue(values[0]);
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildReviewSnapshotByKey(reviewSnapshot) {
  const mapped = {};
  for (const node of reviewSnapshot || []) {
    if (node.nodeKey === INITIATION_REVIEW_NODE_KEY.BUSINESS) {
      mapped.business = node;
    } else if (node.nodeKey === INITIATION_REVIEW_NODE_KEY.TECHNICAL) {
      mapped.technical = node;
    } else if (node.nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL) {
      mapped.general = node;
    }
  }
  return mapped;
}

function buildSourceObject(snapshot, reviewSnapshot) {
  const formImages = Object.fromEntries(
    Object.entries(snapshot.formImages || {}).map(([fieldKey, images]) => [
      fieldKey,
      Array.isArray(images) ? images : []
    ])
  );
  return {
    project: snapshot.project,
    document: snapshot.document,
    form: snapshot.formData,
    formImages,
    noticeProjectList: snapshot.noticeProjectList || { cutoff: null, rows: [] },
    review: buildReviewSnapshotByKey(reviewSnapshot),
    static: {
      noticeTitle: NOTICE_TEMPLATE.title,
      noticeBodyParagraphs: NOTICE_TEMPLATE.bodyParagraphs,
      noticeSigner: NOTICE_TEMPLATE.signer
    }
  };
}

function isMappingValueMissing(mapping, source) {
  if (mapping.targetType === 'excelImage') {
    const images = getByPath(source, mapping.source?.path);
    return !Array.isArray(images) || images.length === 0;
  }

  return !normalizeDisplayValue(buildMappingValue(mapping, source)).trim();
}

function validateRequiredMappings(manifest, source) {
  const missing = manifest.mappings
    .filter((mapping) => mapping.source.required)
    .filter((mapping) => isMappingValueMissing(mapping, source))
    .map((mapping) => mapping.source.label);

  if (missing.length > 0) {
    const error = new Error(`Missing required template mapping values: ${missing.join(', ')}`);
    error.code = 'TEMPLATE_MAPPING_REQUIRED_VALUE_MISSING';
    throw error;
  }
}

async function buildExcelImageValues(manifest, source) {
  const imageValues = [];
  for (const mapping of manifest.mappings.filter((item) => item.targetType === 'excelImage')) {
    const images = getByPath(source, mapping.source?.path);
    const activeImages = Array.isArray(images) ? images : [];
    if (activeImages.length === 0) {
      continue;
    }

    const maxImages = Number.isSafeInteger(Number(mapping.maxImages)) ? Number(mapping.maxImages) : 3;
    for (const [index, image] of activeImages.slice(0, maxImages).entries()) {
      if (!image?.storageKey) {
        continue;
      }
      const buffer = await readOnlineFormImageForGeneration(image);
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

function buildExcelRichCheckboxValues(manifest, source) {
  return manifest.mappings
    .filter((mapping) => mapping.targetType === 'excelRichCheckbox')
    .map((mapping) => {
      const [value] = getMappingSourceValues(mapping, source);
      return {
        target: mapping.target,
        checked: cleanTemplateValue(value) === cleanTemplateValue(mapping.checkedValue),
        checkedSymbol: mapping.checkedSymbol,
        uncheckedSymbol: mapping.uncheckedSymbol,
        fallbackText: mapping.fallbackText,
        checkboxFont: mapping.checkboxFont,
        textFont: mapping.textFont
      };
    });
}

function buildWordTableRowsValues(manifest, source) {
  return manifest.mappings
    .filter((mapping) => mapping.targetType === 'wordTableRows')
    .map((mapping) => {
      const rows = getByPath(source, mapping.source?.path);
      return {
        target: mapping.target,
        rows: (Array.isArray(rows) ? rows : []).map((row) =>
          (mapping.columns || []).map((column) => normalizeDisplayValue(getByPath(row, column.sourcePath)))
        ),
        removeRowsAfterTemplate: mapping.removeRowsAfterTemplate !== false
      };
    });
}

async function renderGeneratedBuffer({ manifest, templateBuffer, snapshot, reviewSnapshot }) {
  const source = buildSourceObject(snapshot, reviewSnapshot);
  validateRequiredMappings(manifest, source);

  if (manifest.fileType === 'xlsx') {
    const cellValues = Object.fromEntries(
      manifest.mappings
        .filter((mapping) => mapping.targetType === 'excelCell')
        .map((mapping) => [
          mapping.target,
          {
            value: buildMappingValue(mapping, source),
            preserveTemplateWhenEmpty: mapping.preserveTemplateWhenEmpty === true
          }
        ])
    );
    const imageValues = await buildExcelImageValues(manifest, source);
    return renderXlsxTemplate(templateBuffer, {
      cellValues,
      imageValues,
      richCheckboxValues: buildExcelRichCheckboxValues(manifest, source)
    });
  }

  if (manifest.fileType === 'docx') {
    const tableCellValues = manifest.mappings
      .filter((mapping) => mapping.targetType === 'wordTableCell')
      .map((mapping) => ({
        target: mapping.target,
        value: buildMappingValue(mapping, source)
      }));
    const textReplacements = manifest.mappings
      .filter((mapping) => mapping.targetType === 'wordTextReplacement')
      .map((mapping) => ({
        target: mapping.target,
        value: buildMappingValue(mapping, source)
      }));
    return renderDocxTemplate(templateBuffer, {
      tableCellValues,
      tableRows: buildWordTableRowsValues(manifest, source),
      textReplacements,
      clearRowsAfterDataRow: !manifest.mappings.some((mapping) => mapping.targetType === 'wordTableRows')
    });
  }

  const error = new Error(`Unsupported generated file type: ${manifest.fileType}`);
  error.code = 'UNSUPPORTED_TEMPLATE_FILE_TYPE';
  throw error;
}

function mapProject(row) {
  return {
    id: row.id,
    projectCode: row.project_code ?? null,
    projectName: row.project_name ?? null,
    customerName: row.customer_name ?? null,
    customerContactPerson: row.customer_contact_person ?? null,
    customerContact: row.customer_contact ?? null,
    projectManagerUserId: row.project_manager_user_id ?? null,
    businessResponsibleUserId: row.business_responsible_user_id ?? null,
    businessResponsibleName: row.business_responsible_display_name ?? row.business_responsible_account ?? null,
    technicalResponsibleUserId: row.technical_responsible_user_id ?? null,
    technicalResponsibleName: row.technical_responsible_display_name ?? row.technical_responsible_account ?? null,
    status: row.status
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    documentCode: row.document_code,
    documentName: row.document_name,
    status: row.status,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at
  };
}

function mapForm(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    formKey: row.form_key,
    status: row.status,
    formData: parseJsonValue(row.form_data_json, {}),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at
  };
}

function mapReviewNode(row) {
  return {
    nodeKey: row.node_key,
    nodeStatus: row.node_status,
    reviewerUserId: row.reviewer_user_id ?? null,
    reviewedByUserId: row.reviewed_by_user_id ?? null,
    reviewedByName: row.reviewed_by_display_name ?? row.reviewed_by_account ?? null,
    comment: row.comment ?? null,
    returnReason: row.return_reason ?? null,
    submittedAt: row.submitted_at ?? null,
    reviewedAt: row.reviewed_at ?? null
  };
}

export function mapGeneratedFile(row, { includePrivate = false, downloadableRow = null } = {}) {
  if (!row) {
    return null;
  }

  const failureReason = row.failure_reason ?? null;
  const effectiveDownloadableRow =
    downloadableRow ||
    (row.status === GENERATED_FILE_STATUS.GENERATED && row.storage_key ? row : null);
  const mapped = {
    id: row.id,
    projectId: row.project_id,
    stageDocumentId: row.stage_document_id,
    onlineFormId: row.online_form_id ?? null,
    documentCode: row.document_code,
    templateKey: row.template_key,
    fileType: row.file_type,
    version: Number(row.version),
    status: row.status,
    fileName: row.file_name,
    mimeType: row.mime_type ?? MIME_TYPE_BY_FILE_TYPE[row.file_type] ?? 'application/octet-stream',
    fileSize: row.file_size === null || row.file_size === undefined ? null : Number(row.file_size),
    generatedByUserId: row.generated_by_user_id ?? null,
    generatedAt: row.generated_at ?? null,
    failureReason,
    failureSummary: failureReason ? failureReason.split(/\r?\n/)[0].slice(0, 180) : null,
    sourceFormSubmittedAt: row.source_form_submitted_at ?? null,
    sourceFormDataHash: row.source_form_data_hash ?? null,
    triggerEvent: row.trigger_event,
    templateVersion: row.template_version ?? null,
    templateHash: row.template_hash ?? null,
    downloadable: Boolean(effectiveDownloadableRow),
    downloadableVersion: effectiveDownloadableRow ? Number(effectiveDownloadableRow.version) : null,
    downloadableFileName: effectiveDownloadableRow?.file_name ?? null,
    downloadableGeneratedAt: effectiveDownloadableRow?.generated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (includePrivate) {
    mapped.storageKey = row.storage_key ?? null;
    mapped.sourceSnapshot = parseJsonValue(row.source_snapshot_json, null);
    mapped.reviewSnapshot = parseJsonValue(row.review_snapshot_json, null);
  }

  return mapped;
}

async function selectProject(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      p.*,
      br.account AS business_responsible_account,
      br.display_name AS business_responsible_display_name,
      tr.account AS technical_responsible_account,
      tr.display_name AS technical_responsible_display_name
    FROM projects p
    LEFT JOIN users br
      ON br.id = p.business_responsible_user_id
    LEFT JOIN users tr
      ON tr.id = p.technical_responsible_user_id
    WHERE p.id = ?
    LIMIT 1`,
    [projectId]
  );

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

async function selectDocument(executor, projectId, documentId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND id = ?
    LIMIT 1`,
    [projectId, documentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentNotFoundError(projectId, documentId);
  }

  return rows[0];
}

async function selectForm(executor, documentId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_forms
    WHERE stage_document_id = ?
    LIMIT 1`,
    [documentId]
  );

  return rows[0] || null;
}

async function selectNoticeProjectList(executor, currentProjectId, currentSubmittedAt) {
  if (!currentSubmittedAt) {
    return { cutoff: null, rows: [] };
  }

  const [rows] = await executor.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      f.form_data_json,
      review_f.form_data_json AS review_form_data_json,
      f.submitted_at
    FROM project_stage_document_forms f
    INNER JOIN project_stage_documents d
      ON d.id = f.stage_document_id
    INNER JOIN projects p
      ON p.id = f.project_id
    LEFT JOIN project_stage_documents review_d
      ON review_d.project_id = p.id
      AND review_d.document_code = ?
      AND review_d.status = ?
    LEFT JOIN project_stage_document_forms review_f
      ON review_f.stage_document_id = review_d.id
      AND review_f.status = 'submitted'
    WHERE d.document_code = ?
      AND f.status = 'submitted'
      AND f.submitted_at <= ?
      AND NULLIF(TRIM(COALESCE(p.project_code, '')), '') IS NOT NULL
    ORDER BY f.submitted_at ASC, p.id ASC`,
    [INITIATION_REVIEW_DOCUMENT_CODE, DOCUMENT_STATUS.CONFIRMED, INITIATION_NOTICE_DOCUMENT_CODE, currentSubmittedAt]
  );

  const mappedRows = rows.map((row, index) => {
    const formData = parseJsonValue(row.form_data_json, {});
    const reviewFormData = parseJsonValue(row.review_form_data_json, {});
    return {
      sequenceNumber: String(index + 1),
      projectId: row.id,
      projectCode: row.project_code ?? '',
      projectName: row.project_name ?? '',
      customerName: row.customer_name ?? '',
      projectExecutionMode: formData?.projectExecutionMode || reviewFormData?.projectExecutionMode || '',
      initiationDate: formData?.initiationDate ?? '',
      submittedAt: row.submitted_at ?? null,
      isCurrentProject: String(row.id) === String(currentProjectId)
    };
  });

  return {
    cutoff: currentSubmittedAt,
    rows: mappedRows
  };
}

async function selectReviewSnapshot(executor, documentId) {
  const [rows] = await executor.execute(
    `SELECT
      n.*,
      reviewed_by.account AS reviewed_by_account,
      reviewed_by.display_name AS reviewed_by_display_name
    FROM project_initiation_review_nodes n
    LEFT JOIN users reviewed_by
      ON reviewed_by.id = n.reviewed_by_user_id
    WHERE n.stage_document_id = ?
    ORDER BY FIELD(n.node_key, 'business_review', 'technical_review', 'general_review')`,
    [documentId]
  );

  return rows.map(mapReviewNode);
}

async function selectNextVersion(executor, projectId, documentId, templateKey) {
  const [rows] = await executor.execute(
    `SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND stage_document_id = ?
      AND template_key = ?`,
    [projectId, documentId, templateKey]
  );

  return Number(rows[0]?.nextVersion || 1);
}

async function insertGeneratingRecord({
  executor,
  projectId,
  documentId,
  form,
  manifest,
  fileName,
  version,
  userId,
  snapshot,
  reviewSnapshot,
  sourceHash,
  templateDescriptor
}) {
  const [result] = await executor.execute(
    `INSERT INTO project_stage_document_generated_files (
      project_id,
      stage_document_id,
      online_form_id,
      document_code,
      template_key,
      file_type,
      version,
      status,
      file_name,
      mime_type,
      generated_by_user_id,
      source_form_submitted_at,
      source_form_data_hash,
      source_snapshot_json,
      trigger_event,
      review_snapshot_json,
      template_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      documentId,
      form?.id ?? null,
      manifest.documentCode,
      manifest.templateKey,
      manifest.fileType,
      version,
      GENERATED_FILE_STATUS.GENERATING,
      fileName,
      MIME_TYPE_BY_FILE_TYPE[manifest.fileType],
      userId ?? null,
      form?.submittedAt ?? null,
      sourceHash,
      JSON.stringify(snapshot),
      manifest.triggerEvent,
      reviewSnapshot ? JSON.stringify(reviewSnapshot) : null,
      templateDescriptor?.templateVersion ?? null
    ]
  );

  return result.insertId;
}

async function markRecordGenerated({ executor, recordId, projectId, documentId, templateKey, storageKey, fileSize, templateHash }) {
  await executor.execute(
    `UPDATE project_stage_document_generated_files
    SET status = ?
    WHERE project_id = ?
      AND stage_document_id = ?
      AND template_key = ?
      AND status = ?
      AND id <> ?`,
    [
      GENERATED_FILE_STATUS.SUPERSEDED,
      projectId,
      documentId,
      templateKey,
      GENERATED_FILE_STATUS.GENERATED,
      recordId
    ]
  );
  await executor.execute(
    `UPDATE project_stage_document_generated_files
    SET status = ?,
      storage_key = ?,
      file_size = ?,
      generated_at = CURRENT_TIMESTAMP,
      failure_reason = NULL,
      template_hash = ?
    WHERE id = ?`,
    [GENERATED_FILE_STATUS.GENERATED, storageKey, fileSize, templateHash, recordId]
  );
}

async function markRecordFailed({ executor, recordId, failureReason, templateHash = null }) {
  await executor.execute(
    `UPDATE project_stage_document_generated_files
    SET status = ?,
      failure_reason = ?,
      generated_at = CURRENT_TIMESTAMP,
      template_hash = COALESCE(?, template_hash)
    WHERE id = ?`,
    [GENERATED_FILE_STATUS.FAILED, failureReason.slice(0, 1000), templateHash, recordId]
  );
}

async function updateFailedRecord(recordId, failureReason, templateHash = null) {
  const connection = await pool.getConnection();
  try {
    await markRecordFailed({ executor: connection, recordId, failureReason, templateHash });
  } finally {
    connection.release();
  }
}

function buildFailureReason(error) {
  if (error?.code) {
    return `${error.code}: ${error.message}`;
  }

  return error?.message || 'Template file generation failed';
}

async function insertGenerationLog(executor, { projectId, userId, document, generatedFile, success }) {
  if (!userId) {
    return;
  }

  await insertOperationLog(executor, {
    projectId,
    actorUserId: userId,
    actionType: success
      ? OPERATION_ACTION_TYPE.TEMPLATE_FILE_GENERATED
      : OPERATION_ACTION_TYPE.TEMPLATE_FILE_FAILED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: document.id,
    summary: success
      ? `生成模板文件：${document.document_name} / ${generatedFile.fileName}`
      : `模板文件生成失败：${document.document_name}`,
    details: {
      projectId,
      stageDocumentId: document.id,
      documentCode: document.document_code,
      documentName: document.document_name,
      generatedFileId: generatedFile.id,
      templateKey: generatedFile.templateKey,
      version: generatedFile.version,
      status: generatedFile.status,
      failureSummary: generatedFile.failureSummary
    }
  });
}

async function selectGeneratedFileById(executor, recordId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE id = ?
    LIMIT 1`,
    [recordId]
  );

  return rows[0] || null;
}

async function buildGenerationContext({ executor, projectId, documentId, manifest }) {
  const [projectRow, documentRow, formRow, reviewSnapshot, formImages] = await Promise.all([
    selectProject(executor, projectId),
    selectDocument(executor, projectId, documentId),
    selectForm(executor, documentId),
    manifest.documentCode === INITIATION_REVIEW_DOCUMENT_CODE
      ? selectReviewSnapshot(executor, documentId)
      : Promise.resolve(null),
    manifest.documentCode === INITIATION_REWORK_TARGET_DOCUMENT_CODE
      ? listStageDocumentOnlineFormImagesForGeneration(executor, projectId, documentId)
      : Promise.resolve([])
  ]);
  const project = mapProject(projectRow);
  const document = mapDocument(documentRow);
  const form = mapForm(formRow);
  const noticeProjectList =
    manifest.documentCode === INITIATION_NOTICE_DOCUMENT_CODE
      ? await selectNoticeProjectList(executor, projectId, form?.submittedAt ?? null)
      : null;
  const formImagesByFieldKey = {};
  for (const image of formImages) {
    if (!formImagesByFieldKey[image.fieldKey]) {
      formImagesByFieldKey[image.fieldKey] = [];
    }
    formImagesByFieldKey[image.fieldKey].push({
      id: image.id,
      fieldKey: image.fieldKey,
      originalFileName: image.originalFileName,
      mimeType: image.mimeType,
      fileSize: image.fileSize,
      contentHash: image.contentHash ?? null,
      uploadedByUserId: image.uploadedByUserId,
      uploadedAt: image.uploadedAt,
      storageKey: image.storageKey
    });
  }
  const formData = {
    ...(form?.formData || {}),
    projectName: form?.formData?.projectName || project.projectName,
    customerName: form?.formData?.customerName || project.customerName,
    customerContactPerson: form?.formData?.customerContactPerson || project.customerContactPerson,
    customerContact: form?.formData?.customerContact || project.customerContact,
    customerUnit: form?.formData?.customerUnit || project.customerName,
    sequenceNumber: form?.formData?.sequenceNumber || '1'
  };
  if (manifest.documentCode === INITIATION_NOTICE_DOCUMENT_CODE) {
    formData.projectCode = form?.formData?.projectCode || project.projectCode;
    formData.projectExecutionMode = form?.formData?.projectExecutionMode || '';
  }

  const snapshot = {
    project,
    document,
    formData,
    form: form
      ? {
          id: form.id,
          formKey: form.formKey,
          status: form.status,
          submittedByUserId: form.submittedByUserId,
          submittedAt: form.submittedAt
        }
      : null,
    formImages: formImagesByFieldKey,
    noticeProjectList,
    capturedAt: new Date().toISOString()
  };
  const hashSourceSnapshot = {
    project,
    document,
    formData: snapshot.formData,
    form: snapshot.form,
    formImages: formImagesByFieldKey,
    noticeProjectList
  };

  return {
    project,
    document,
    form,
    reviewSnapshot,
    snapshot,
    sourceHash: sha256({
      snapshot: hashSourceSnapshot,
      reviewSnapshot,
      manifest: {
        templateKey: manifest.templateKey,
        mappings: manifest.mappings
      }
    })
  };
}

export async function generateInitiationTemplateFile({
  projectId,
  documentId,
  documentCode,
  triggerEvent,
  user
}) {
  const manifest = getInitiationTemplateManifest(documentCode);
  if (!manifest || manifest.triggerEvent !== triggerEvent) {
    return null;
  }

  let recordId = null;
  let storageKey = null;
  let templateHash = null;
  let documentForLog = null;
  let generatedFile = null;
  const connection = await pool.getConnection();

  try {
    const templateDescriptor = getSafeTemplateDescriptor(manifest.templateKey);
    await connection.beginTransaction();
    const context = await buildGenerationContext({ executor: connection, projectId, documentId, manifest });
    documentForLog = {
      id: context.document.id,
      document_code: context.document.documentCode,
      document_name: context.document.documentName
    };
    const version = await selectNextVersion(connection, projectId, documentId, manifest.templateKey);
    const fileName = buildGeneratedFileName({ manifest, project: context.project, version });
    recordId = await insertGeneratingRecord({
      executor: connection,
      projectId,
      documentId,
      form: context.form,
      manifest,
      fileName,
      version,
      userId: user?.id,
      snapshot: context.snapshot,
      reviewSnapshot: context.reviewSnapshot,
      sourceHash: context.sourceHash,
      templateDescriptor
    });
    await connection.commit();

    const { buffer: templateBuffer } = await readRegisteredTemplate(manifest.templateKey);
    templateHash = calculateTemplateHash(templateBuffer);
    const generatedBuffer = await renderGeneratedBuffer({
      manifest,
      templateBuffer,
      snapshot: context.snapshot,
      reviewSnapshot: context.reviewSnapshot
    });
    storageKey = createStageDocumentGeneratedFileStorageKey({
      projectId,
      documentId,
      version,
      fileType: manifest.fileType
    });
    const stored = await writeStageDocumentGeneratedFile(storageKey, generatedBuffer);

    await connection.beginTransaction();
    await markRecordGenerated({
      executor: connection,
      recordId,
      projectId,
      documentId,
      templateKey: manifest.templateKey,
      storageKey,
      fileSize: stored.size,
      templateHash
    });
    const row = await selectGeneratedFileById(connection, recordId);
    generatedFile = mapGeneratedFile(row, { includePrivate: true });
    await insertGenerationLog(connection, {
      projectId,
      userId: user?.id,
      document: documentForLog,
      generatedFile,
      success: true
    });
    await connection.commit();
    return generatedFile;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve generation failure.
      }
    }
    if (storageKey) {
      await cleanupStageDocumentGeneratedFile(storageKey);
    }
    if (recordId) {
      await updateFailedRecord(recordId, buildFailureReason(error), templateHash);
      try {
        const failedRow = await selectGeneratedFileById(pool, recordId);
        generatedFile = mapGeneratedFile(failedRow, { includePrivate: true });
        if (documentForLog) {
          await insertGenerationLog(pool, {
            projectId,
            userId: user?.id,
            document: documentForLog,
            generatedFile,
            success: false
          });
        }
      } catch {
        // Failed generation record already captured; logging is best effort.
      }
      return generatedFile;
    }

    return null;
  } finally {
    connection.release();
  }
}

export function triggerInitiationTemplateFileGenerationAfterCommit(args) {
  setImmediate(() => {
    void generateInitiationTemplateFile(args);
  });
}

export async function listLatestGeneratedFilesForProject(projectId) {
  const [latestRows] = await pool.execute(
    `SELECT f.*
    FROM project_stage_document_generated_files f
    INNER JOIN (
      SELECT stage_document_id, MAX(version) AS latest_version
      FROM project_stage_document_generated_files
      WHERE project_id = ?
      GROUP BY stage_document_id
    ) latest
      ON latest.stage_document_id = f.stage_document_id
      AND latest.latest_version = f.version
    WHERE f.project_id = ?`,
    [projectId, projectId]
  );
  const [downloadableRows] = await pool.execute(
    `SELECT f.*
    FROM project_stage_document_generated_files f
    INNER JOIN (
      SELECT stage_document_id, MAX(version) AS latest_version
      FROM project_stage_document_generated_files
      WHERE project_id = ?
        AND status = ?
        AND storage_key IS NOT NULL
      GROUP BY stage_document_id
    ) latest
      ON latest.stage_document_id = f.stage_document_id
      AND latest.latest_version = f.version
    WHERE f.project_id = ?`,
    [projectId, GENERATED_FILE_STATUS.GENERATED, projectId]
  );
  const downloadableByDocumentId = new Map(
    downloadableRows.map((row) => [Number(row.stage_document_id), row])
  );

  return latestRows.map((row) =>
    mapGeneratedFile(row, {
      downloadableRow: downloadableByDocumentId.get(Number(row.stage_document_id)) || null
    })
  );
}

async function selectLatestGeneratedFile(executor, projectId, documentId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND stage_document_id = ?
    ORDER BY version DESC, id DESC
    LIMIT 1`,
    [projectId, documentId]
  );

  return rows[0] || null;
}

async function selectLatestDownloadableGeneratedFile(executor, projectId, documentId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_generated_files
    WHERE project_id = ?
      AND stage_document_id = ?
      AND status = ?
      AND storage_key IS NOT NULL
    ORDER BY version DESC, id DESC
    LIMIT 1`,
    [projectId, documentId, GENERATED_FILE_STATUS.GENERATED]
  );

  return rows[0] || null;
}

function throwForbiddenGeneratedFileOperation() {
  throw new StageDocumentGeneratedFileError(
    STAGE_DOCUMENT_GENERATED_FILE_ERROR.FORBIDDEN_OPERATION,
    'Current user cannot access this generated file',
    403,
    ['documentId']
  );
}

async function assertCanViewGeneratedFile({ executor, projectId, documentId, user }) {
  const [projectRow, documentRow] = await Promise.all([
    selectProject(executor, projectId),
    selectDocument(executor, projectId, documentId)
  ]);

  if (!canViewStageDocumentItem(user, { project: projectRow, document: documentRow })) {
    throwForbiddenGeneratedFileOperation();
  }

  return { project: projectRow, document: documentRow };
}

export async function getStageDocumentGeneratedFileStatus({ projectId, documentId, user }) {
  const connection = await pool.getConnection();
  try {
    await assertCanViewGeneratedFile({ executor: connection, projectId, documentId, user });
    const row = await selectLatestGeneratedFile(connection, projectId, documentId);
    const downloadableRow = await selectLatestDownloadableGeneratedFile(connection, projectId, documentId);
    return {
      generatedFile: row ? mapGeneratedFile(row, { downloadableRow }) : null
    };
  } finally {
    connection.release();
  }
}

export async function getStageDocumentGeneratedFileDownload({ projectId, documentId, user }) {
  const connection = await pool.getConnection();
  try {
    await assertCanViewGeneratedFile({ executor: connection, projectId, documentId, user });
    const row = await selectLatestDownloadableGeneratedFile(connection, projectId, documentId);
    if (!row) {
      throw new StageDocumentGeneratedFileError(
        STAGE_DOCUMENT_GENERATED_FILE_ERROR.FILE_NOT_FOUND,
        'Generated file not found',
        404,
        ['documentId']
      );
    }

    try {
      const filePath = await assertStageDocumentGeneratedFileReadable(row.storage_key);
      return {
        filePath,
        fileName: row.file_name,
        mimeType: row.mime_type || MIME_TYPE_BY_FILE_TYPE[row.file_type] || 'application/octet-stream',
        fileSize: Number(row.file_size || 0)
      };
    } catch {
      throw new StageDocumentGeneratedFileError(
        STAGE_DOCUMENT_GENERATED_FILE_ERROR.FILE_MISSING,
        'Generated file missing',
        404,
        ['documentId']
      );
    }
  } finally {
    connection.release();
  }
}

export {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  INITIATION_TEMPLATE_TRIGGER_EVENT
};
