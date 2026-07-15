import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE
} from './initiationReview.js';

export const GENERATED_FILE_STATUS = Object.freeze({
  PENDING: 'pending',
  GENERATING: 'generating',
  GENERATED: 'generated',
  FAILED: 'failed',
  SUPERSEDED: 'superseded'
});

export const INITIATION_TEMPLATE_TRIGGER_EVENT = Object.freeze({
  ONLINE_FORM_SUBMITTED: 'online_form_submitted',
  INITIATION_REVIEW_GENERAL_APPROVED: 'initiation_review_general_approved'
});

export const INITIATION_TEMPLATE_KEY = Object.freeze({
  REQUIREMENT: 'initiation_requirement_xlsx',
  APPROVAL: 'initiation_approval_xlsx',
  NOTICE: 'initiation_notice_docx'
});

const DEFAULT_TEMPLATES_DIR = fileURLToPath(new URL('../../../智能制造项目管理文件模板/', import.meta.url));
const TEMPLATES_DIR = process.env.INITIATION_TEMPLATE_FILES_DIR
  ? path.resolve(process.env.INITIATION_TEMPLATE_FILES_DIR)
  : DEFAULT_TEMPLATES_DIR;

function templatePath(fileName) {
  return path.join(TEMPLATES_DIR, fileName);
}

const TEMPLATE_REGISTRY = Object.freeze({
  [INITIATION_TEMPLATE_KEY.REQUIREMENT]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.REQUIREMENT,
    templatePath: templatePath('项目需求表-模板.xlsx'),
    fileType: 'xlsx',
    templateVersion: '20260706-initiation-requirement'
  }),
  [INITIATION_TEMPLATE_KEY.APPROVAL]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.APPROVAL,
    templatePath: templatePath('项目立项审批表-模板.xlsx'),
    fileType: 'xlsx',
    templateVersion: '20260707-initiation-approval-v1'
  }),
  [INITIATION_TEMPLATE_KEY.NOTICE]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.NOTICE,
    templatePath: templatePath('项目立项通知-模板.docx'),
    fileType: 'docx',
    templateVersion: '20260714-initiation-notice-v2'
  })
});

function source(pathExpression, label, required = false) {
  return { path: pathExpression, label, required };
}

function sourceGroup(pathExpressions, label, required = false) {
  return { paths: pathExpressions, label, required };
}

function cell(cellRef, sourcePath, label, required = false, options = {}) {
  return {
    targetType: 'excelCell',
    target: cellRef,
    source: source(sourcePath, label, required),
    ...options
  };
}

function cellBuilder(cellRef, builder, sourcePaths, label, required = false, options = {}) {
  return {
    targetType: 'excelCell',
    target: cellRef,
    source: sourceGroup(sourcePaths, label, required),
    valueBuilder: builder,
    preserveTemplateWhenEmpty: true,
    ...options
  };
}

function excelImage(range, sourcePath, label, required = false, options = {}) {
  const [fromCell, toCell] = String(range || '').split(':');
  return {
    targetType: 'excelImage',
    target: {
      range,
      fromCell,
      toCell: toCell || fromCell
    },
    source: source(sourcePath, label, required),
    preserveAspectRatio: true,
    ...options
  };
}

function excelRichCheckbox(cellRef, sourcePath, label, checkedValue, required = false, options = {}) {
  return {
    targetType: 'excelRichCheckbox',
    target: cellRef,
    source: source(sourcePath, label, required),
    checkedValue,
    checkedSymbol: 'R',
    uncheckedSymbol: '£',
    fallbackText: ` ${label}`,
    checkboxFont: 'Wingdings 2',
    textFont: '宋体',
    ...options
  };
}

function wordTableCell(tableIndex, rowIndex, cellIndex, sourcePath, label, required = false) {
  return {
    targetType: 'wordTableCell',
    target: {
      tableIndex,
      rowIndex,
      cellIndex
    },
    source: source(sourcePath, label, required)
  };
}

function wordTableCellBuilder(tableIndex, rowIndex, cellIndex, builder, sourcePaths, label, required = false) {
  return {
    targetType: 'wordTableCell',
    target: {
      tableIndex,
      rowIndex,
      cellIndex
    },
    source: sourceGroup(sourcePaths, label, required),
    valueBuilder: builder
  };
}

function wordTextReplacement(matchText, builder, sourcePaths, label, required = false) {
  return {
    targetType: 'wordTextReplacement',
    target: {
      matchText
    },
    source: sourceGroup(sourcePaths, label, required),
    valueBuilder: builder
  };
}

function wordTableRows(tableIndex, templateRowIndex, sourcePath, columns, label, required = false, options = {}) {
  return {
    targetType: 'wordTableRows',
    target: {
      tableIndex,
      templateRowIndex
    },
    source: source(sourcePath, label, required),
    columns,
    removeRowsAfterTemplate: true,
    ...options
  };
}

export const INITIATION_TEMPLATE_MANIFESTS = Object.freeze({
  [INITIATION_REWORK_TARGET_DOCUMENT_CODE]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.REQUIREMENT,
    documentCode: INITIATION_REWORK_TARGET_DOCUMENT_CODE,
    outputDocumentCode: INITIATION_REWORK_TARGET_DOCUMENT_CODE,
    fileType: 'xlsx',
    generatedFileNamePrefix: '项目需求表',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
    requiredSources: ['project.projectName', 'project.customerName', 'form.workpieceDescription', 'form.operationProcessDescription', 'form.projectTargetDescription'],
    formatRetention: ['preserve workbook sheets', 'preserve merged cells where possible', 'preserve borders/fonts/row heights/column widths'],
    mappings: [
      cell('B2', 'project.projectName', '项目名称', true),
      cell('E2', 'project.customerName', '客户名称', true),
      cell('B3', 'form.communicationDate', '交流时间'),
      cell('E3', 'form.communicationCount', '交流次数'),
      cell('B4', 'form.communicationLocation', '交流地点'),
      cell('E4', 'form.communicationMethod', '交流方式'),
      cell('B5', 'form.internalParticipants', '我方人员', true),
      cell('B6', 'form.customerParticipants', '甲方人员', true),
      cellBuilder('B7', 'temperatureRange', ['form.workingTemperatureMin', 'form.workingTemperatureMax'], '工作温度'),
      cellBuilder('D7', 'storageTemperatureRange', ['form.storageTemperatureMin', 'form.storageTemperatureMax'], '储存温度'),
      cellBuilder('B8', 'humidityRange', ['form.workingHumidityMin', 'form.workingHumidityMax'], '工作湿度'),
      cellBuilder('D8', 'storageHumidityRange', ['form.storageHumidityMin', 'form.storageHumidityMax'], '储存湿度'),
      cellBuilder('B9', 'noiseLimit', ['form.noiseLimitValue'], '噪音'),
      cellBuilder('D9', 'ipProtection', ['form.ipProtectionLevel'], 'IP 防护等级'),
      cellBuilder('B10', 'antiCorrosion', ['form.antiCorrosionGrade'], '防腐等级'),
      cellBuilder('D10', 'altitudeLimit', ['form.altitudeLimitValue'], '海拔高度'),
      cellBuilder('B11', 'explosionProof', ['form.explosionProofRequirement'], '防爆要求'),
      cellBuilder('B12', 'siteCondition', ['form.siteConditionDescription'], '可用场地尺寸'),
      cellBuilder('B13', 'siteUtilities', ['form.powerSupply', 'form.airSupply', 'form.hydraulicSource'], '电源/气源/液压源'),
      cellBuilder('B14', 'liftingEquipment', ['form.liftingEquipment'], '吊装设备'),
      cell('B16', 'form.workpieceDescription', '工件描述', true),
      cell('B21', 'form.operationProcessDescription', '作业工艺', true),
      cell('B31', 'form.projectTargetDescription', '目标', true),
      excelImage('D12:E12', 'formImages.siteConditionImages', '可用场地尺寸/场地情况图片', false, {
        maxImages: 3,
        mergeAdjustment: { unmergeRange: 'B12:E12', textMergeRange: 'B12:C12' }
      }),
      excelImage('B18:E19', 'formImages.workpieceImages', '工件描述图片', false, {
        maxImages: 3,
        mergeAdjustment: { unmergeRange: 'B16:E19', textMergeRange: 'B16:E17' }
      }),
      excelImage('B25:E29', 'formImages.operationProcessImages', '作业工艺图片', false, {
        maxImages: 3,
        mergeAdjustment: { unmergeRange: 'B21:E29', textMergeRange: 'B21:E24' }
      })
    ]
  }),
  [INITIATION_REVIEW_DOCUMENT_CODE]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.APPROVAL,
    documentCode: INITIATION_REVIEW_DOCUMENT_CODE,
    outputDocumentCode: INITIATION_REVIEW_DOCUMENT_CODE,
    fileType: 'xlsx',
    generatedFileNamePrefix: '项目立项审批表',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.INITIATION_REVIEW_GENERAL_APPROVED,
    requiredSources: ['project.projectName', 'project.customerName', 'form.projectExecutionMode'],
    formatRetention: ['preserve workbook sheets', 'preserve scoring table layout', 'preserve borders/fonts/row heights/column widths'],
    mappings: [
      cellBuilder('A2', 'projectNameHeader', ['project.projectName', 'form.projectName'], '项目名称', true),
      cellBuilder('A3', 'customerNameHeader', ['project.customerName', 'form.customerName'], '客户名称', true),
      cellBuilder('A4', 'customerContactPersonHeader', ['project.customerContactPerson', 'form.customerContactPerson'], '客户项目联系人'),
      cellBuilder('G4', 'customerContactHeader', ['project.customerContact', 'form.customerContact'], '客户项目联系电话'),
      cellBuilder('J4', 'projectResponsibleHeader', ['project.businessResponsibleName', 'form.projectResponsiblePerson'], '本公司商务负责人'),
      cellBuilder('M4', 'projectResponsibleContactHeader', ['form.projectResponsibleContact'], '本公司商务负责人联系电话'),
      cell('K6', 'form.customerEnterpriseAttributeScore', '客户企业属性分值', true),
      cell('L6', 'form.customerEnterpriseAttributeInformationNotes', '客户企业属性信息收集说明'),
      cell('O6', 'form.customerEnterpriseAttributeResponsiblePerson', '客户企业属性责任人'),
      cell('K7', 'form.projectSourceScore', '项目来源分值', true),
      cell('L7', 'form.projectSourceInformationNotes', '项目来源信息收集说明'),
      cell('O7', 'form.projectSourceResponsiblePerson', '项目来源责任人'),
      cell('K8', 'form.projectPositioningScore', '项目定位分值', true),
      cell('L8', 'form.projectPositioningInformationNotes', '项目定位信息收集说明'),
      cell('O8', 'form.projectPositioningResponsiblePerson', '项目定位责任人'),
      cell('K9', 'form.businessCompetitionConditionScore', '商务竞争条件分值', true),
      cell('L9', 'form.businessCompetitionConditionInformationNotes', '商务竞争条件信息收集说明'),
      cell('O9', 'form.businessCompetitionConditionResponsiblePerson', '商务竞争条件责任人'),
      cell('K10', 'form.projectBudgetScore', '项目预算分值', true),
      cell('L10', 'form.projectBudgetInformationNotes', '项目预算信息收集说明'),
      cell('O10', 'form.projectBudgetResponsiblePerson', '项目预算责任人'),
      cell('K11', 'form.paymentConditionScore', '付款条件分值', true),
      cell('L11', 'form.paymentConditionInformationNotes', '付款条件信息收集说明'),
      cell('O11', 'form.paymentConditionResponsiblePerson', '付款条件责任人'),
      cell('K12', 'form.projectRequirementScore', '项目需求分值', true),
      cell('L12', 'form.projectRequirementInformationNotes', '项目需求信息收集说明'),
      cell('O12', 'form.projectRequirementResponsiblePerson', '项目需求责任人'),
      cell('K13', 'form.specialEnvironmentScore', '特殊环境要求分值', true),
      cell('L13', 'form.specialEnvironmentInformationNotes', '特殊环境要求信息收集说明'),
      cell('O13', 'form.specialEnvironmentResponsiblePerson', '特殊环境要求责任人'),
      cell('K14', 'form.industryThresholdScore', '行业门槛分值', true),
      cell('L14', 'form.industryThresholdInformationNotes', '行业门槛信息收集说明'),
      cell('O14', 'form.industryThresholdResponsiblePerson', '行业门槛责任人'),
      cell('K15', 'form.technologyMaturityScore', '技术成熟度分值', true),
      cell('L15', 'form.technologyMaturityInformationNotes', '技术成熟度信息收集说明'),
      cell('O15', 'form.technologyMaturityResponsiblePerson', '技术成熟度责任人'),
      cell('K16', 'form.rdModeScore', '研发模式分值', true),
      cell('L16', 'form.rdModeInformationNotes', '研发模式信息收集说明'),
      cell('O16', 'form.rdModeResponsiblePerson', '研发模式责任人'),
      cellBuilder('A17', 'businessReviewOpinion', ['review.business.comment'], '营销中心意见', false, { preserveTemplateWhenEmpty: true }),
      cellBuilder('M17', 'reviewDate', ['review.business.reviewedAt', 'review.business.submittedAt'], '营销日期', false, { preserveTemplateWhenEmpty: true }),
      cellBuilder('A18', 'technicalReviewOpinion', ['review.technical.comment'], '研发中心意见', false, { preserveTemplateWhenEmpty: true }),
      cellBuilder('M18', 'reviewDate', ['review.technical.reviewedAt', 'review.technical.submittedAt'], '研发日期', false, { preserveTemplateWhenEmpty: true }),
      cellBuilder('A19', 'generalReviewOpinion', ['review.general.comment'], '总经理意见', false, { preserveTemplateWhenEmpty: true }),
      cellBuilder('M19', 'reviewDate', ['review.general.reviewedAt', 'review.general.submittedAt'], '总经理日期', false, { preserveTemplateWhenEmpty: true }),
      excelRichCheckbox('D20', 'form.projectExecutionMode', '自研模式', '自研模式', true),
      excelRichCheckbox('G20', 'form.projectExecutionMode', '供应链模式', '供应链模式', true)
    ]
  }),
  [INITIATION_NOTICE_DOCUMENT_CODE]: Object.freeze({
    templateKey: INITIATION_TEMPLATE_KEY.NOTICE,
    documentCode: INITIATION_NOTICE_DOCUMENT_CODE,
    outputDocumentCode: INITIATION_NOTICE_DOCUMENT_CODE,
    fileType: 'docx',
    generatedFileNamePrefix: '项目立项通知',
    triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
    requiredSources: ['project.projectCode', 'noticeProjectList.rows'],
    formatRetention: ['preserve document paragraphs', 'preserve table style where possible', 'preserve fonts and paragraph format'],
    mappings: [
      wordTableRows(
        0,
        1,
        'noticeProjectList.rows',
        [
          { sourcePath: 'sequenceNumber', label: '序号' },
          { sourcePath: 'projectCode', label: '项目编号' },
          { sourcePath: 'projectName', label: '项目名称' },
          { sourcePath: 'customerName', label: '客户单位' },
          { sourcePath: 'projectExecutionMode', label: '开展模式' },
          { sourcePath: 'initiationDate', label: '立项日期' }
        ],
        '项目编号累计清单',
        true
      ),
      wordTextReplacement('2026年7月14日', 'noticeChineseDate', ['form.noticeDate'], '通知落款日期')
    ]
  })
});

export function getInitiationTemplateManifest(documentCode) {
  return INITIATION_TEMPLATE_MANIFESTS[String(documentCode || '').trim()] || null;
}

export function getTemplateRegistryEntry(templateKey) {
  return TEMPLATE_REGISTRY[templateKey] || null;
}

export async function readRegisteredTemplate(templateKey) {
  const entry = getTemplateRegistryEntry(templateKey);
  if (!entry) {
    const error = new Error('Template is not registered');
    error.code = 'TEMPLATE_NOT_REGISTERED';
    throw error;
  }

  try {
    const buffer = await fs.readFile(entry.templatePath);
    return { entry, buffer };
  } catch {
    const error = new Error('Template is missing or unreadable');
    error.code = 'TEMPLATE_UNREADABLE';
    throw error;
  }
}

export function calculateTemplateHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function getSafeTemplateDescriptor(templateKey) {
  const entry = getTemplateRegistryEntry(templateKey);
  if (!entry) {
    return null;
  }

  return {
    templateKey: entry.templateKey,
    fileType: entry.fileType,
    templateVersion: entry.templateVersion
  };
}
