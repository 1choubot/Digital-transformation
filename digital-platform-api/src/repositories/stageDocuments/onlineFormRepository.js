import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  isCenterManagerOf
} from '../../domain/organization.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REVIEW_NODE_KEY,
  getInitiationReviewNodeDefinition,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  isInitiationOnlineFormDocument
} from '../../domain/initiationReview.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { assertDocumentIsApplicable } from '../../domain/stageDocumentApplicability.js';
import { DOCUMENT_STATUS_ACTION } from '../../domain/stageDocumentStatus.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import { tryAutoAdvanceProjectStage } from '../projects/stageAdvanceRepository.js';
import { assertProjectViewable, DuplicateProjectCodeError } from '../projectRepository.js';
import { canViewStageDocumentItem } from './accessControl.js';
import {
  assertInitiationNoticeSubmitGateReady,
  assertNoOutstandingInitiationRequirementRework,
  buildInitiationReworkNotClearedReason,
  selectInitiationReviewNodesForDocument,
  selectOutstandingInitiationRequirementRework
} from './initiationReviewRepository.js';
import {
  INITIATION_TEMPLATE_TRIGGER_EVENT,
  generateInitiationTemplateFile
} from './generatedFileRepository.js';
import { listStageDocumentOnlineFormImagesForDocument } from './onlineFormImageRepository.js';
import { selectProjectPermissionContext } from './permissionContext.js';
import {
  mapDocument,
  selectProjectStageDocument,
  selectProjectStageDocumentForUpdate
} from './shared.js';
import { updateProjectStageDocumentStatus } from './statusRepository.js';

const FORM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

const INITIATION_COLLABORATION_METADATA_KEY = '_collaboration';
const INITIATION_REQUIREMENT_NOT_SUBMITTED_REASON = '请先提交 1.1 项目需求表';
const INITIATION_COLLABORATION_PART = {
  BUSINESS: 'business',
  TECHNICAL: 'technical'
};
const INITIATION_PROJECT_EXECUTION_MODE = Object.freeze({
  SELF_DEVELOPED: '自研模式',
  SUPPLY_CHAIN: '供应链模式'
});

const NOTICE_TEMPLATE = Object.freeze({
  title: '关于确定项目名称及编号的通知',
  bodyParagraphs: [
    '各部门：',
    '为便于公司项目生产准备、事前申请、费用填报、成本归集、物资采购等工作开展。现将各项目的项目名称、项目编号确定如下：',
    '请各部门严格按照项目名称、项目编号进行生产准备、费用填报、事前申请、成本归集、物资采购等工作。'
  ],
  tableColumns: ['序号', '项目编号', '项目名称', '客户单位', '开展模式', '立项日期'],
  signer: '重庆凯尔夫智能测控技术有限责任公司'
});

const INITIATION_APPROVAL_SCORING_SECTIONS = Object.freeze([
  {
    key: 'businessModule',
    title: '商务模块',
    editablePart: INITIATION_COLLABORATION_PART.BUSINESS,
    items: [
      {
        key: 'customerEnterpriseAttribute',
        itemName: '客户企业属性',
        clauseContent: '客户企业属性',
        evaluationStandard: '0-以上均不是；1-行业龙头企业；2-国企；3-央企；4-军工企业；5-上市公司'
      },
      {
        key: 'projectSource',
        itemName: '项目来源',
        clauseContent: '项目来源',
        evaluationStandard: '0-挂网信息；1-多层分包项目；2-分包项目；3-中间人提供；4-客户主动联系；5-公司人脉'
      },
      {
        key: 'projectPositioning',
        itemName: '项目定位',
        clauseContent: '项目定位',
        evaluationStandard: '0-无明确定位；1-降低成本；2-增加效率；3-辅助设备替换；4-关键设备替换；5-新建必需设备'
      },
      {
        key: 'businessCompetitionCondition',
        itemName: '商务竞争条件',
        clauseContent: '商务竞争条件',
        evaluationStandard: '0-公开招标，低价中标；1-公开招标，综合评分；2-邀请招标，低价中标；3-邀请招标，综合评分；4-多家竞争性谈判；5-独家'
      },
      {
        key: 'projectBudget',
        itemName: '项目预算',
        clauseContent: '项目预算',
        evaluationStandard: '0-无预算；1-预算不足；2-预算刚好，项目地点在外地；3-预算刚好，项目地点在重庆；4-预算充足，项目地点在外地；5-预算充足，项目地点在重庆'
      },
      {
        key: 'paymentCondition',
        itemName: '付款条件',
        clauseContent: '付款条件',
        evaluationStandard: '0-低于模板比例或无预付款；1-预付≥10%，发货付款至全款比例≥50%；2-预付≥20%，发货付款至全款比例≥50%；3-预付≥20%，发货付款至全款比例≥60%；4-预付≥30%，发货付款至全款比例≥70%；5-预付≥30%，发货付款至全款比例≥90%'
      }
    ]
  },
  {
    key: 'technicalModule',
    title: '技术模块',
    editablePart: INITIATION_COLLABORATION_PART.TECHNICAL,
    items: [
      {
        key: 'projectRequirement',
        itemName: '项目需求',
        clauseContent: '项目需求',
        evaluationStandard: '0-无项目需求；1-需求模糊，无数据支撑；2-需求模糊，有数据支撑；3-需求明确，但无数据支撑；4-需求明确，有数据支撑；5-有目标方案文件'
      },
      {
        key: 'specialEnvironment',
        itemName: '特殊环境要求',
        clauseContent: '特殊环境要求（防爆/高温/高湿/高压/高海拔/特殊防腐/低噪音）',
        evaluationStandard: '0-以上要求5点及以上；1-以上要求4点；2-以上要求3点；3-以上要求2点；4-以上要求1点；5-以上要求均无'
      },
      {
        key: 'industryThreshold',
        itemName: '行业门槛',
        clauseContent: '行业门槛',
        evaluationStandard: '0-3体系+基本国标+行业标准+企业标准+特殊标准；1-3体系+基本国标+行业标准+企业标准；2-3体系+基本国标+行业标准；3-3体系+基本国标；4-只要求3体系；5-无行业门槛'
      },
      {
        key: 'technologyMaturity',
        itemName: '技术成熟度',
        clauseContent: '技术成熟度',
        evaluationStandard: '0-无相关技术可查；1-只有技术概念；2-可以看到原型机；3-小范围用户使用；4-已经市场推广；5-本公司工程师工作经历相符'
      },
      {
        key: 'rdMode',
        itemName: '研发模式',
        clauseContent: '研发模式',
        evaluationStandard: '0-市场上无相关供应商；1-市场上只有个别相关产品；2-市场上有少量相关产品；3-市场上有大量相关产品；4-合作供应商有相关产品；5-本公司有相关产品'
      }
    ]
  }
]);

function buildScoringFields(scoringSections) {
  return scoringSections.flatMap((section) =>
    section.items.flatMap((item) => [
      {
        key: `${item.key}Score`,
        label: `${item.itemName}分值`,
        type: 'score',
        required: true,
        min: 0,
        max: 5,
        scoreItemKey: item.key,
        sectionKey: section.key,
        editablePart: section.editablePart
      },
      {
        key: `${item.key}InformationNotes`,
        label: `${item.itemName}信息收集说明`,
        type: 'textarea',
        required: false,
        scoreItemKey: item.key,
        sectionKey: section.key,
        editablePart: section.editablePart
      },
      {
        key: `${item.key}ResponsiblePerson`,
        label: `${item.itemName}责任人`,
        type: 'text',
        required: false,
        scoreItemKey: item.key,
        sectionKey: section.key,
        editablePart: section.editablePart
      }
    ])
  );
}

const INITIATION_FORM_DEFINITIONS = Object.freeze({
  [INITIATION_REWORK_TARGET_DOCUMENT_CODE]: {
    formKey: 'initiation_requirement',
    templateFileName: '项目需求表-模板.xlsx',
    sections: [
      {
        key: 'basicInfo',
        title: '基础信息',
        fields: [
          { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
          { key: 'customerName', label: '客户名称', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
          { key: 'communicationDate', label: '交流时间', type: 'date', required: false },
          { key: 'communicationCount', label: '交流次数', type: 'text', required: false },
          { key: 'communicationLocation', label: '交流地点', type: 'text', required: false },
          { key: 'communicationMethod', label: '交流方式', type: 'text', required: false },
          { key: 'internalParticipants', label: '我方人员', type: 'textarea', required: true },
          { key: 'customerParticipants', label: '甲方人员', type: 'textarea', required: true }
        ]
      },
      {
        key: 'environmentRequirements',
        title: '环境要求',
        fields: [
          { key: 'workingTemperatureMin', label: '工作温度最小值', type: 'text', required: false },
          { key: 'workingTemperatureMax', label: '工作温度最大值', type: 'text', required: false },
          { key: 'storageTemperatureMin', label: '储存温度最小值', type: 'text', required: false },
          { key: 'storageTemperatureMax', label: '储存温度最大值', type: 'text', required: false },
          { key: 'workingHumidityMin', label: '工作湿度最小值', type: 'text', required: false },
          { key: 'workingHumidityMax', label: '工作湿度最大值', type: 'text', required: false },
          { key: 'storageHumidityMin', label: '储存湿度最小值', type: 'text', required: false },
          { key: 'storageHumidityMax', label: '储存湿度最大值', type: 'text', required: false },
          { key: 'noiseLimitValue', label: '噪音上限值', type: 'text', required: false, description: '只填写数值或文本值，模板固定 ≤ 和 dB。' },
          { key: 'ipProtectionLevel', label: 'IP 防护等级', type: 'text', required: false, description: '只填写 IP 后面的等级值。' },
          { key: 'antiCorrosionGrade', label: '防腐等级', type: 'text', required: false },
          { key: 'altitudeLimitValue', label: '海拔高度上限值', type: 'text', required: false, description: '只填写数值或文本值，模板固定 ≤ 和 m。' },
          { key: 'explosionProofRequirement', label: '防爆要求', type: 'textarea', required: false }
        ]
      },
      {
        key: 'siteConditions',
        title: '场地情况',
        fields: [
          {
            key: 'siteConditionDescription',
            label: '可用场地尺寸/场地情况说明',
            type: 'textarea',
            required: false,
            rows: 4,
            description: '可填写说明文字；如有图片可上传最多 3 张 png/jpg/jpeg，生成项目需求表时按上传顺序嵌入该区域。'
          },
          {
            key: 'siteConditionImages',
            label: '可用场地尺寸/场地情况图片',
            type: 'image',
            required: false,
            maxImages: 3,
            accept: ['image/png', 'image/jpeg'],
            description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
          },
          { key: 'powerSupply', label: '电源', type: 'text', required: false },
          { key: 'airSupply', label: '气源', type: 'text', required: false },
          { key: 'hydraulicSource', label: '液压源', type: 'text', required: false },
          { key: 'liftingEquipment', label: '吊装设备', type: 'textarea', required: false, rows: 3 }
        ]
      },
      {
        key: 'workpieceDescription',
        title: '工件描述',
        fields: [
          {
            key: 'workpieceDescription',
            label: '工件描述',
            type: 'textarea',
            required: true,
            rows: 6,
            description: '填写工件外形尺寸、质量、材质、数量、图纸情况；如有图片可上传最多 3 张 png/jpg/jpeg 并按顺序嵌入 Excel。'
          },
          {
            key: 'workpieceImages',
            label: '工件描述图片',
            type: 'image',
            required: false,
            maxImages: 3,
            accept: ['image/png', 'image/jpeg'],
            description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
          }
        ]
      },
      {
        key: 'operationProcess',
        title: '作业工艺',
        fields: [
          {
            key: 'operationProcessDescription',
            label: '作业工艺说明',
            type: 'textarea',
            required: true,
            rows: 8,
            description: '填写做什么、怎么做、工艺文件情况；如有工艺图片可上传最多 3 张 png/jpg/jpeg 并按顺序嵌入 Excel。'
          },
          {
            key: 'operationProcessImages',
            label: '作业工艺图片',
            type: 'image',
            required: false,
            maxImages: 3,
            accept: ['image/png', 'image/jpeg'],
            description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
          }
        ]
      },
      {
        key: 'targets',
        title: '目标',
        fields: [
          {
            key: 'projectTargetDescription',
            label: '目标说明',
            type: 'textarea',
            required: true,
            rows: 5,
            description: '填写自动化环节、节拍、人机交互模式、价格、工期。'
          }
        ]
      }
    ],
    fields: [
      { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
      { key: 'customerName', label: '客户名称', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
      { key: 'communicationDate', label: '交流时间', type: 'date', required: false },
      { key: 'communicationCount', label: '交流次数', type: 'text', required: false },
      { key: 'communicationLocation', label: '交流地点', type: 'text', required: false },
      { key: 'communicationMethod', label: '交流方式', type: 'text', required: false },
      { key: 'internalParticipants', label: '我方人员', type: 'textarea', required: true },
      { key: 'customerParticipants', label: '甲方人员', type: 'textarea', required: true },
      { key: 'workingTemperatureMin', label: '工作温度最小值', type: 'text', required: false },
      { key: 'workingTemperatureMax', label: '工作温度最大值', type: 'text', required: false },
      { key: 'storageTemperatureMin', label: '储存温度最小值', type: 'text', required: false },
      { key: 'storageTemperatureMax', label: '储存温度最大值', type: 'text', required: false },
      { key: 'workingHumidityMin', label: '工作湿度最小值', type: 'text', required: false },
      { key: 'workingHumidityMax', label: '工作湿度最大值', type: 'text', required: false },
      { key: 'storageHumidityMin', label: '储存湿度最小值', type: 'text', required: false },
      { key: 'storageHumidityMax', label: '储存湿度最大值', type: 'text', required: false },
      { key: 'noiseLimitValue', label: '噪音上限值', type: 'text', required: false, description: '只填写数值或文本值，模板固定 ≤ 和 dB。' },
      { key: 'ipProtectionLevel', label: 'IP 防护等级', type: 'text', required: false, description: '只填写 IP 后面的等级值。' },
      { key: 'antiCorrosionGrade', label: '防腐等级', type: 'text', required: false },
      { key: 'altitudeLimitValue', label: '海拔高度上限值', type: 'text', required: false, description: '只填写数值或文本值，模板固定 ≤ 和 m。' },
      { key: 'explosionProofRequirement', label: '防爆要求', type: 'textarea', required: false },
      {
        key: 'siteConditionDescription',
        label: '可用场地尺寸/场地情况说明',
        type: 'textarea',
        required: false,
        rows: 4,
        description: '可填写说明文字；如有图片可上传最多 3 张 png/jpg/jpeg，生成项目需求表时按上传顺序嵌入该区域。'
      },
      {
        key: 'siteConditionImages',
        label: '可用场地尺寸/场地情况图片',
        type: 'image',
        required: false,
        maxImages: 3,
        accept: ['image/png', 'image/jpeg'],
        description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
      },
      { key: 'powerSupply', label: '电源', type: 'text', required: false },
      { key: 'airSupply', label: '气源', type: 'text', required: false },
      { key: 'hydraulicSource', label: '液压源', type: 'text', required: false },
      { key: 'liftingEquipment', label: '吊装设备', type: 'textarea', required: false, rows: 3 },
      {
        key: 'workpieceDescription',
        label: '工件描述',
        type: 'textarea',
        required: true,
        rows: 6,
        description: '填写工件外形尺寸、质量、材质、数量、图纸情况；如有图片可上传最多 3 张 png/jpg/jpeg 并按顺序嵌入 Excel。'
      },
      {
        key: 'workpieceImages',
        label: '工件描述图片',
        type: 'image',
        required: false,
        maxImages: 3,
        accept: ['image/png', 'image/jpeg'],
        description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
      },
      {
        key: 'operationProcessDescription',
        label: '作业工艺说明',
        type: 'textarea',
        required: true,
        rows: 8,
        description: '填写做什么、怎么做、工艺文件情况；如有工艺图片可上传最多 3 张 png/jpg/jpeg 并按顺序嵌入 Excel。'
      },
      {
        key: 'operationProcessImages',
        label: '作业工艺图片',
        type: 'image',
        required: false,
        maxImages: 3,
        accept: ['image/png', 'image/jpeg'],
        description: '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。'
      },
      {
        key: 'projectTargetDescription',
        label: '目标说明',
        type: 'textarea',
        required: true,
        rows: 5,
        description: '填写自动化环节、节拍、人机交互模式、价格、工期。'
      }
    ]
  },
  [INITIATION_REVIEW_DOCUMENT_CODE]: {
    formKey: 'initiation_approval',
    templateFileName: '项目立项审批表-模板.xlsx',
    sections: [
      {
        key: 'approvalBasicInfo',
        title: '',
        editablePart: INITIATION_COLLABORATION_PART.BUSINESS,
        fields: [
          { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
          { key: 'customerName', label: '客户名称', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
          { key: 'customerContactPerson', label: '项目联系人', type: 'text', required: false, readOnly: true, autoFill: 'customerContactPerson' },
          { key: 'customerContact', label: '联系方式', type: 'text', required: false, readOnly: true, autoFill: 'customerContact' },
          { key: 'projectResponsiblePerson', label: '本公司商务负责人', type: 'text', required: false, readOnly: true, autoFill: 'businessResponsibleName' },
          {
            key: 'projectResponsibleContact',
            label: '联系方式',
            type: 'text',
            required: false,
            readOnly: false,
            editablePart: INITIATION_COLLABORATION_PART.BUSINESS
          }
        ]
      }
    ],
    scoringSections: INITIATION_APPROVAL_SCORING_SECTIONS,
    reviewOpinionSource: 'initiationReviewNodes',
    fields: [
      { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
      { key: 'customerName', label: '客户名称', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
      { key: 'customerContactPerson', label: '项目联系人', type: 'text', required: false, readOnly: true, autoFill: 'customerContactPerson' },
      { key: 'customerContact', label: '联系方式', type: 'text', required: false, readOnly: true, autoFill: 'customerContact' },
      { key: 'projectResponsiblePerson', label: '本公司商务负责人', type: 'text', required: false, readOnly: true, autoFill: 'businessResponsibleName' },
      { key: 'projectResponsibleContact', label: '项目负责人联系方式', type: 'text', required: false, editablePart: INITIATION_COLLABORATION_PART.BUSINESS },
      ...buildScoringFields(INITIATION_APPROVAL_SCORING_SECTIONS)
    ]
  },
  [INITIATION_NOTICE_DOCUMENT_CODE]: {
    formKey: 'initiation_notice',
    templateFileName: '项目立项通知-模板.docx',
    noticeTemplate: NOTICE_TEMPLATE,
    sections: [
      {
        key: 'noticeTable',
        title: '通知项目信息',
        fields: [
          { key: 'sequenceNumber', label: '序号', type: 'text', required: false, readOnly: true, defaultValue: '1' },
          { key: 'projectCode', label: '项目编号', type: 'text', required: true, autoFill: 'projectCode' },
          { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
          { key: 'customerUnit', label: '客户单位', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
          { key: 'projectExecutionMode', label: '开展模式', type: 'text', required: false, readOnly: true },
          { key: 'initiationDate', label: '立项日期', type: 'date', required: false, readOnly: true, autoFill: 'currentBusinessDate' }
        ]
      },
      {
        key: 'signature',
        title: '落款',
        fields: [
          { key: 'signerCompany', label: '落款单位', type: 'text', required: false, readOnly: true, defaultValue: NOTICE_TEMPLATE.signer },
          { key: 'noticeDate', label: '日期', type: 'date', required: false, readOnly: true, autoFill: 'currentBusinessDate' }
        ]
      }
    ],
    fields: [
      { key: 'sequenceNumber', label: '序号', type: 'text', required: false, readOnly: true, defaultValue: '1' },
      { key: 'projectCode', label: '项目编号', type: 'text', required: true, autoFill: 'projectCode' },
      { key: 'projectName', label: '项目名称', type: 'text', required: false, readOnly: true, autoFill: 'projectName' },
      { key: 'customerUnit', label: '客户单位', type: 'text', required: false, readOnly: true, autoFill: 'customerName' },
      { key: 'projectExecutionMode', label: '开展模式', type: 'text', required: false, readOnly: true },
      { key: 'initiationDate', label: '立项日期', type: 'date', required: false, readOnly: true, autoFill: 'currentBusinessDate' },
      { key: 'signerCompany', label: '落款单位', type: 'text', required: false, readOnly: true, defaultValue: NOTICE_TEMPLATE.signer },
      { key: 'noticeDate', label: '日期', type: 'date', required: false, readOnly: true, autoFill: 'currentBusinessDate' }
    ]
  }
});

export class StageDocumentFormError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentFormError';
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

function getFormDefinition(documentCode) {
  return INITIATION_FORM_DEFINITIONS[String(documentCode || '').trim()] || null;
}

function getDocumentCode(document) {
  return document?.document_code ?? document?.documentCode ?? null;
}

function getDocumentName(document) {
  return document?.document_name ?? document?.documentName ?? null;
}

function cloneField(field) {
  return { ...field };
}

function cloneSection(section) {
  return {
    ...section,
    fields: (section.fields || []).map((field) => ({
      ...cloneField(field),
      editablePart: field.editablePart ?? section.editablePart
    }))
  };
}

function cloneScoringSection(section) {
  return {
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      informationCollectionNotes: item.informationCollectionNotes ?? ''
    }))
  };
}

function cloneNoticeTemplate(template) {
  if (!template) {
    return null;
  }

  return {
    ...template,
    bodyParagraphs: [...template.bodyParagraphs],
    tableColumns: [...template.tableColumns]
  };
}

function buildFormSchema(document) {
  const definition = getFormDefinition(getDocumentCode(document));
  if (!definition) {
    return null;
  }

  const schema = {
    formKey: definition.formKey,
    documentCode: getDocumentCode(document),
    documentName: getDocumentName(document),
    templateFileName: definition.templateFileName,
    fields: (definition.fields || []).map(cloneField)
  };

  if (definition.sections) {
    schema.sections = definition.sections.map(cloneSection);
  }
  if (definition.scoringSections) {
    schema.scoringSections = definition.scoringSections.map(cloneScoringSection);
  }
  if (definition.reviewOpinionSource) {
    schema.reviewOpinionSource = definition.reviewOpinionSource;
  }
  if (definition.noticeTemplate) {
    schema.noticeTemplate = cloneNoticeTemplate(definition.noticeTemplate);
  }

  return schema;
}

function normalizeFormData(value) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new StageDocumentFormError(
      'INVALID_FORM_DATA',
      'Form data must be an object',
      400,
      ['formData']
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item === null || item === undefined ? '' : String(item)])
  );
}

async function selectOnlineFormProjectContext(connection, projectId, { forUpdate = false } = {}) {
  const [rows] = await connection.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.customer_contact_person,
      p.customer_contact,
      p.business_responsible_user_id,
      p.technical_responsible_user_id,
      business_responsible.display_name AS business_responsible_display_name,
      business_responsible.account AS business_responsible_account,
      technical_responsible.display_name AS technical_responsible_display_name,
      technical_responsible.account AS technical_responsible_account
    FROM projects p
    LEFT JOIN users business_responsible
      ON business_responsible.id = p.business_responsible_user_id
    LEFT JOIN users technical_responsible
      ON technical_responsible.id = p.technical_responsible_user_id
    WHERE p.id = ?
    LIMIT 1
    ${forUpdate ? 'FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
}

function getProjectAutoFillValue(project, autoFillKey) {
  switch (autoFillKey) {
    case 'projectCode':
      return project?.project_code ?? '';
    case 'projectName':
      return project?.project_name ?? '';
    case 'customerName':
      return project?.customer_name ?? '';
    case 'customerContactPerson':
      return project?.customer_contact_person ?? '';
    case 'customerContact':
      return project?.customer_contact ?? '';
    case 'businessResponsibleName':
      return project?.business_responsible_display_name ?? project?.business_responsible_account ?? '';
    case 'technicalResponsibleName':
      return project?.technical_responsible_display_name ?? project?.technical_responsible_account ?? '';
    case 'currentBusinessDate':
      return getShanghaiDateString();
    default:
      return '';
  }
}

// 在线表单日期统一按业务所在的 Asia/Shanghai 时区生成，避免 UTC 跨日偏差。
function getShanghaiDateString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function applySchemaDefaults(schema, formData, project) {
  const mergedFormData = { ...formData };

  for (const field of schema.fields || []) {
    if (field.autoFill) {
      const autoFillValue = getProjectAutoFillValue(project, field.autoFill);
      if (field.readOnly || String(mergedFormData[field.key] ?? '').trim() === '') {
        mergedFormData[field.key] = autoFillValue === null || autoFillValue === undefined ? '' : String(autoFillValue);
      }
    }

    if (field.defaultValue !== undefined && String(mergedFormData[field.key] ?? '').trim() === '') {
      mergedFormData[field.key] = String(field.defaultValue);
    }
  }

  return mergedFormData;
}

function validateRequiredFields(schema, formData, fields = schema.fields) {
  const fieldsToValidate = fields || [];
  const missing = fieldsToValidate
    .filter((field) => field.required)
    .filter((field) => String(formData[field.key] ?? '').trim() === '')
    .map((field) => field.key);

  if (missing.length > 0) {
    throw new StageDocumentFormError(
      'FORM_REQUIRED_FIELDS_MISSING',
      'Required form fields are missing',
      400,
      missing
    );
  }

  const invalidScores = fieldsToValidate
    .filter((field) => field.type === 'score')
    .filter((field) => {
      const rawValue = String(formData[field.key] ?? '').trim();
      if (!rawValue) {
        return false;
      }
      const value = Number(rawValue);
      return !Number.isFinite(value) || value < (field.min ?? 0) || value > (field.max ?? 5);
    })
    .map((field) => field.key);

  if (invalidScores.length > 0) {
    throw new StageDocumentFormError(
      'FORM_SCORE_FIELDS_INVALID',
      'Form score fields must be between 0 and 5',
      400,
      invalidScores
    );
  }

  const invalidSelects = fieldsToValidate
    .filter((field) => field.type === 'select' && Array.isArray(field.options) && field.options.length > 0)
    .filter((field) => {
      const rawValue = String(formData[field.key] ?? '').trim();
      return rawValue && !field.options.includes(rawValue);
    })
    .map((field) => field.key);

  if (invalidSelects.length > 0) {
    throw new StageDocumentFormError(
      'FORM_SELECT_FIELDS_INVALID',
      'Form select fields contain unsupported values',
      400,
      invalidSelects
    );
  }
}

function isInitiationReviewFormDocument(document) {
  return String(getDocumentCode(document)) === INITIATION_REVIEW_DOCUMENT_CODE;
}

function buildDefaultInitiationCollaboration() {
  return {
    businessSubmitted: false,
    businessSubmittedByUserId: null,
    businessSubmittedAt: null,
    technicalSubmitted: false,
    technicalSubmittedByUserId: null,
    technicalSubmittedAt: null
  };
}

function normalizeInitiationCollaboration(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    ...buildDefaultInitiationCollaboration(),
    businessSubmitted: source.businessSubmitted === true,
    businessSubmittedByUserId: source.businessSubmittedByUserId ?? null,
    businessSubmittedAt: source.businessSubmittedAt ?? null,
    technicalSubmitted: source.technicalSubmitted === true,
    technicalSubmittedByUserId: source.technicalSubmittedByUserId ?? null,
    technicalSubmittedAt: source.technicalSubmittedAt ?? null
  };
}

function getInitiationCollaboration(formData) {
  return normalizeInitiationCollaboration(formData?.[INITIATION_COLLABORATION_METADATA_KEY]);
}

function omitInitiationCollaborationMetadata(formData) {
  const { [INITIATION_COLLABORATION_METADATA_KEY]: _collaboration, ...rest } = formData || {};
  return rest;
}

function isInitiationCollaborationComplete(collaboration) {
  return collaboration.businessSubmitted === true && collaboration.technicalSubmitted === true;
}

function markInitiationCollaborationPartSubmitted(collaboration, part, userId) {
  const submittedAt = new Date().toISOString();
  if (part === INITIATION_COLLABORATION_PART.BUSINESS) {
    return {
      ...collaboration,
      businessSubmitted: true,
      businessSubmittedByUserId: userId,
      businessSubmittedAt: submittedAt
    };
  }

  return {
    ...collaboration,
    technicalSubmitted: true,
    technicalSubmittedByUserId: userId,
    technicalSubmittedAt: submittedAt
  };
}

function isInitiationCollaborationPartSubmitted(collaboration, part) {
  if (part === INITIATION_COLLABORATION_PART.BUSINESS) {
    return collaboration.businessSubmitted === true;
  }

  if (part === INITIATION_COLLABORATION_PART.TECHNICAL) {
    return collaboration.technicalSubmitted === true;
  }

  return false;
}

function assertInitiationCollaborationPartNotSubmitted(collaboration, part) {
  if (!isInitiationCollaborationPartSubmitted(collaboration, part)) {
    return;
  }

  throw new StageDocumentFormError(
    'FORM_PART_ALREADY_SUBMITTED',
    'Current initiation approval form part has been submitted and cannot be changed until returned',
    409,
    [part]
  );
}

function getUserInitiationCollaborationPart(user, projectContext) {
  if (
    projectContext?.business_responsible_user_id &&
    String(projectContext.business_responsible_user_id) === String(user?.id)
  ) {
    return INITIATION_COLLABORATION_PART.BUSINESS;
  }

  if (
    projectContext?.technical_responsible_user_id &&
    String(projectContext.technical_responsible_user_id) === String(user?.id)
  ) {
    return INITIATION_COLLABORATION_PART.TECHNICAL;
  }

  return null;
}

function assertUserCanHandleInitiationCollaboration(user, projectContext) {
  const part = getUserInitiationCollaborationPart(user, projectContext);
  if (!part) {
    throw new StageDocumentFormError(
      'FORBIDDEN_OPERATION',
      'Current user cannot edit initiation approval collaboration form',
      403,
      ['businessResponsibleUserId', 'technicalResponsibleUserId']
    );
  }

  return part;
}

function getEditablePartFields(schema, part) {
  return (schema.fields || []).filter((field) => field.editablePart === part);
}

function assertNoDisallowedInitiationFieldChanges({ schema, existingFormData, incomingFormData, incomingOriginal, part }) {
  const disallowedFields = [];
  for (const field of schema.fields || []) {
    if (field.editablePart === part || field.readOnly) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(incomingOriginal, field.key)) {
      continue;
    }

    const existingValue = String(existingFormData[field.key] ?? '');
    const incomingValue = String(incomingFormData[field.key] ?? '');
    if (existingValue !== incomingValue) {
      disallowedFields.push(field.key);
    }
  }

  if (disallowedFields.length > 0) {
    throw new StageDocumentFormError(
      'FORM_FIELDS_NOT_ALLOWED',
      'Current user cannot edit fields outside their initiation approval responsibility',
      403,
      disallowedFields
    );
  }
}

function mergeInitiationCollaborationFormData({ schema, existingFormData, incomingFormData, incomingOriginal, part }) {
  assertNoDisallowedInitiationFieldChanges({
    schema,
    existingFormData,
    incomingFormData,
    incomingOriginal,
    part
  });

  const mergedFormData = { ...existingFormData };
  for (const field of getEditablePartFields(schema, part)) {
    if (field.readOnly) {
      continue;
    }
    mergedFormData[field.key] = incomingFormData[field.key] ?? '';
  }

  return mergedFormData;
}

function normalizeInitiationProjectCode(formData, { required = false } = {}) {
  const projectCode = String(formData.projectCode ?? '').trim();
  if (!projectCode && required) {
    throw new StageDocumentFormError(
      'PROJECT_CODE_REQUIRED',
      'Project code is required before submitting initiation notice form',
      400,
      ['projectCode']
    );
  }

  return projectCode;
}

function buildInitiationProjectCodeLockName(projectCode) {
  return `initiation-project-code:${projectCode}`.slice(0, 64);
}

async function acquireInitiationProjectCodeLock(connection, projectCode) {
  const lockName = buildInitiationProjectCodeLockName(projectCode);
  const [rows] = await connection.execute('SELECT GET_LOCK(?, 10) AS lockAcquired', [lockName]);
  if (Number(rows[0]?.lockAcquired) !== 1) {
    throw new StageDocumentFormError(
      'PROJECT_CODE_LOCK_TIMEOUT',
      'Project code is being submitted by another request',
      409,
      ['projectCode']
    );
  }
  return lockName;
}

async function releaseInitiationProjectCodeLock(connection, lockName) {
  if (!lockName) {
    return;
  }
  try {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
  } catch {
    // The database connection will release the named lock if it is closed.
  }
}

async function assertProjectCodeUniqueForInitiationForm(connection, projectId, projectCode) {
  const [rows] = await connection.execute(
    `SELECT id
    FROM projects
    WHERE project_code = ?
      AND id <> ?
    LIMIT 1
    FOR UPDATE`,
    [projectCode, projectId]
  );

  if (rows.length > 0) {
    throw new DuplicateProjectCodeError(projectCode);
  }
}

async function updateProjectCodeFromInitiationNoticeForm({
  connection,
  projectId,
  projectContext,
  projectCode,
  user,
  document
}) {
  if (!projectCode) {
    return;
  }

  await assertProjectCodeUniqueForInitiationForm(connection, projectId, projectCode);
  if (String(projectContext?.project_code ?? '') === projectCode) {
    return;
  }

  await connection.execute('UPDATE projects SET project_code = ? WHERE id = ?', [projectCode, projectId]);
  await insertOperationLog(connection, {
    projectId,
    actorUserId: user.id,
    actionType: OPERATION_ACTION_TYPE.PROJECT_CODE_UPDATED,
    targetType: OPERATION_TARGET_TYPE.PROJECT,
    targetId: projectId,
    summary: `更新项目编号：${projectCode}`,
    details: {
      fromProjectCode: projectContext?.project_code ?? null,
      toProjectCode: projectCode,
      sourceDocumentId: document.id,
      sourceDocumentCode: document.document_code,
      sourceDocumentName: document.document_name
    }
  });
  projectContext.project_code = projectCode;
}

function isMarketingCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.MARKETING_CENTER);
}

function isResponsibleUser(user, document) {
  const responsibleUserId = document?.responsible_user_id ?? document?.responsibleUserId;
  return Boolean(responsibleUserId) && String(responsibleUserId) === String(user?.id);
}

function getDocumentStatus(document) {
  return document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
}

function isRevisionRequiredForForm(document) {
  const value = document?.revision_required ?? document?.revisionRequired;
  return value === true || value === 1 || value === '1';
}

function isDocumentEditableForOnlineForm(document) {
  if ([DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.RETURNED].includes(getDocumentStatus(document))) {
    return true;
  }

  return isInitiationOnlineFormDocument(document) && isRevisionRequiredForForm(document);
}

function buildDocumentNotEditableBlockingReason(document) {
  return `资料状态为 ${getDocumentStatus(document)}，在线表单不可继续编辑或提交`;
}

function assertDocumentEditableForOnlineForm(document) {
  if (isDocumentEditableForOnlineForm(document)) {
    return;
  }

  throw new StageDocumentFormError(
    'FORM_DOCUMENT_NOT_EDITABLE',
    'Current stage document form cannot be edited from this status',
    409,
    ['documentId', 'status']
  );
}

function assertDocumentApplicableForOnlineForm(document) {
  assertDocumentIsApplicable(document?.is_applicable === undefined ? true : Boolean(document.is_applicable));
}

async function selectInitiationRequirementDocumentForGate(connection, projectId, { forUpdate = false } = {}) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND document_code = ?
    LIMIT 1
    ${forUpdate ? 'FOR UPDATE' : ''}`,
    [projectId, INITIATION_REWORK_TARGET_DOCUMENT_CODE]
  );

  return rows[0] || null;
}

function isInitiationRequirementReadyForApproval(requirementDocument) {
  if (!requirementDocument) {
    return false;
  }

  const applicableValue = requirementDocument.is_applicable ?? requirementDocument.isApplicable;
  const isApplicable = applicableValue === undefined ? true : Boolean(applicableValue);
  const submittedOrComplete = [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(
    getDocumentStatus(requirementDocument)
  );

  return isApplicable && submittedOrComplete && !isRevisionRequiredForForm(requirementDocument);
}

async function buildInitiationRequirementSubmitGate(connection, projectId, { forUpdate = false } = {}) {
  const requirementDocument = await selectInitiationRequirementDocumentForGate(connection, projectId, { forUpdate });
  const ready = isInitiationRequirementReadyForApproval(requirementDocument);
  return {
    ready,
    requirementDocument,
    blockingReasons: ready ? [] : [INITIATION_REQUIREMENT_NOT_SUBMITTED_REASON]
  };
}

async function assertInitiationRequirementSubmittedForApproval(connection, projectId, { forUpdate = false } = {}) {
  const gate = await buildInitiationRequirementSubmitGate(connection, projectId, { forUpdate });
  if (gate.ready) {
    return;
  }

  throw new StageDocumentFormError(
    'INITIATION_REQUIREMENT_NOT_SUBMITTED',
    '1.1 initiation requirement form must be submitted before 1.2 collaboration',
    409,
    ['1.1']
  );
}

function assertProjectNotEndedForOnlineForm(project) {
  if (project?.status === PROJECT_STATUS.ENDED) {
    throw new StageDocumentFormError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and online form cannot be edited',
      409,
      ['projectId']
    );
  }
}

async function assertCanViewFormDocument({ connection, projectId, document, user }) {
  const project = await selectProjectPermissionContext(connection, projectId, user);
  if (!project || !canViewStageDocumentItem(user, { project, document })) {
    throw new StageDocumentFormError(
      'FORBIDDEN_OPERATION',
      'Current user cannot view this stage document form',
      403,
      ['documentId']
    );
  }

  return project;
}

async function buildGateContext(connection, projectId, document, projectContext = null) {
  if (String(getDocumentCode(document)) !== INITIATION_NOTICE_DOCUMENT_CODE) {
    return { ready: true, blockingReasons: [] };
  }

  const blockingReasons = [];
  try {
    await assertInitiationNoticeSubmitGateReady(connection, projectId);
  } catch (error) {
    if (error.code === 'INITIATION_NOTICE_GATE_NOT_READY') {
      blockingReasons.push('1.2 项目立项审批表尚未最终通过');
      blockingReasons.push(...(Array.isArray(error.details) ? error.details : []));
    } else {
      throw error;
    }
  }

  return {
    ready: blockingReasons.length === 0,
    blockingReasons
  };
}

async function assertCanEditForm({ connection, projectId, document, user, projectContext = null }) {
  const schema = buildFormSchema(document);
  if (!schema) {
    throw new StageDocumentFormError(
      'FORM_NOT_SUPPORTED',
      'This stage document does not support online form',
      404,
      ['documentId']
    );
  }

  if (String(getDocumentCode(document)) === INITIATION_NOTICE_DOCUMENT_CODE) {
    if (!isMarketingCenterManager(user)) {
      throw new StageDocumentFormError(
        'FORBIDDEN_OPERATION',
        'Current user cannot edit initiation notice form',
        403,
        ['organizationRole']
      );
    }

    const gate = await buildGateContext(connection, projectId, document, projectContext);
    if (!gate.ready) {
      throw new StageDocumentFormError(
        'INITIATION_NOTICE_GATE_NOT_READY',
        'Initiation notice form is blocked until initiation approval is complete',
        409,
        gate.blockingReasons
      );
    }

    return schema;
  }

  if (String(getDocumentCode(document)) === INITIATION_REVIEW_DOCUMENT_CODE) {
    await assertNoOutstandingInitiationRequirementRework(connection, projectId, document, { forUpdate: true });
    await assertInitiationRequirementSubmittedForApproval(connection, projectId, { forUpdate: true });
    assertUserCanHandleInitiationCollaboration(
      user,
      projectContext || (await selectOnlineFormProjectContext(connection, projectId))
    );
    return schema;
  }

  if (!(document.responsible_user_id ?? document.responsibleUserId)) {
    throw new StageDocumentFormError(
      'FORM_RESPONSIBLE_USER_REQUIRED',
      'Responsible user is required before submitting this form',
      409,
      ['responsibleUserId']
    );
  }

  if (!isResponsibleUser(user, document)) {
    throw new StageDocumentFormError(
      'FORBIDDEN_OPERATION',
      'Current user cannot edit this stage document form',
      403,
      ['responsibleUserId']
    );
  }

  return schema;
}

async function selectFormRow(connection, documentId) {
  const [rows] = await connection.execute(
    `SELECT *
    FROM project_stage_document_forms
    WHERE stage_document_id = ?
    LIMIT 1`,
    [documentId]
  );

  return rows[0] || null;
}

function isAllowedInitiationProjectExecutionMode(value) {
  return Object.values(INITIATION_PROJECT_EXECUTION_MODE).includes(String(value || '').trim());
}

async function selectApprovedInitiationProjectExecutionMode(
  connection,
  projectId,
  { required = false, forUpdate = false } = {}
) {
  const [rows] = await connection.execute(
    `SELECT f.form_data_json
    FROM project_stage_document_forms f
    INNER JOIN project_stage_documents d
      ON d.id = f.stage_document_id
    WHERE d.project_id = ?
      AND d.document_code = ?
      AND d.status = ?
      AND f.status = 'submitted'
    LIMIT 1
    ${forUpdate ? 'FOR UPDATE' : ''}`,
    [projectId, INITIATION_REVIEW_DOCUMENT_CODE, DOCUMENT_STATUS.CONFIRMED]
  );

  const formData = parseJsonValue(rows[0]?.form_data_json, {});
  const projectExecutionMode = String(formData?.projectExecutionMode ?? '').trim();
  if (projectExecutionMode && isAllowedInitiationProjectExecutionMode(projectExecutionMode)) {
    return projectExecutionMode;
  }

  if (required) {
    throw new StageDocumentFormError(
      'INITIATION_PROJECT_EXECUTION_MODE_REQUIRED',
      'Project execution mode is required before submitting initiation notice form',
      409,
      ['projectExecutionMode']
    );
  }

  return '';
}

async function applyInitiationNoticeProjectExecutionModeSnapshot({
  connection,
  projectId,
  document,
  formData,
  required = false,
  forUpdate = false
}) {
  if (String(getDocumentCode(document)) !== INITIATION_NOTICE_DOCUMENT_CODE) {
    return formData;
  }

  const projectExecutionMode = await selectApprovedInitiationProjectExecutionMode(connection, projectId, {
    required,
    forUpdate
  });
  return {
    ...formData,
    projectExecutionMode
  };
}

async function upsertForm({
  connection,
  projectId,
  documentId,
  schema,
  formData,
  status,
  userId
}) {
  await connection.execute(
    `INSERT INTO project_stage_document_forms (
      project_id,
      stage_document_id,
      form_key,
      form_schema_json,
      form_data_json,
      status,
      draft_saved_by_user_id,
      draft_saved_at,
      submitted_by_user_id,
      submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ${status === FORM_STATUS.SUBMITTED ? 'CURRENT_TIMESTAMP' : 'NULL'})
    ON DUPLICATE KEY UPDATE
      form_key = VALUES(form_key),
      form_schema_json = VALUES(form_schema_json),
      form_data_json = VALUES(form_data_json),
      status = VALUES(status),
      draft_saved_by_user_id = VALUES(draft_saved_by_user_id),
      draft_saved_at = CURRENT_TIMESTAMP,
      submitted_by_user_id = VALUES(submitted_by_user_id),
      submitted_at = CASE WHEN VALUES(status) = 'submitted' THEN CURRENT_TIMESTAMP ELSE submitted_at END`,
    [
      projectId,
      documentId,
      schema.formKey,
      JSON.stringify(schema),
      JSON.stringify(formData),
      status,
      userId,
      status === FORM_STATUS.SUBMITTED ? userId : null
    ]
  );
}

function mapReviewOpinionNode(node) {
  const definition = getInitiationReviewNodeDefinition(node.node_key);
  return {
    nodeKey: node.node_key,
    nodeName: definition?.nodeName ?? node.node_key,
    nodeStatus: node.node_status,
    reviewerUserId: node.reviewer_user_id ?? null,
    reviewerName: node.reviewer_display_name ?? node.reviewer_account ?? null,
    reviewedByUserId: node.reviewed_by_user_id ?? null,
    reviewedByName: node.reviewed_by_display_name ?? node.reviewed_by_account ?? null,
    comment: node.comment ?? null,
    returnReason: node.return_reason ?? null,
    reviewedAt: node.reviewed_at ?? null
  };
}

async function buildReviewOpinions({ connection, document, schema }) {
  if (schema.reviewOpinionSource !== 'initiationReviewNodes') {
    return [];
  }

  const nodes = await selectInitiationReviewNodesForDocument(connection, document.id);
  const nodeOrder = [
    INITIATION_REVIEW_NODE_KEY.BUSINESS,
    INITIATION_REVIEW_NODE_KEY.TECHNICAL,
    INITIATION_REVIEW_NODE_KEY.GENERAL
  ];
  const nodeOrderIndex = new Map(nodeOrder.map((nodeKey, index) => [nodeKey, index]));
  return nodes
    .map(mapReviewOpinionNode)
    .sort((left, right) => (nodeOrderIndex.get(left.nodeKey) ?? 99) - (nodeOrderIndex.get(right.nodeKey) ?? 99));
}

function mapForm({
  document,
  schema,
  row,
  permissions,
  projectContext = null,
  blockingReasons = [],
  reviewOpinions = [],
  images = [],
  formDataOverrides = {}
}) {
  const savedFormData = parseJsonValue(row?.form_data_json, {});
  const formData = {
    ...applySchemaDefaults(schema, omitInitiationCollaborationMetadata(savedFormData), projectContext),
    ...formDataOverrides
  };
  const collaboration = isInitiationReviewFormDocument(document)
    ? getInitiationCollaboration(savedFormData)
    : null;

  return {
    id: row?.id ?? null,
    projectId: document.project_id ?? document.projectId,
    stageDocumentId: document.id,
    documentCode: document.document_code ?? document.documentCode,
    documentName: document.document_name ?? document.documentName,
    formKey: schema.formKey,
    schema,
    formData,
    status: row?.status ?? FORM_STATUS.DRAFT,
    draftSavedByUserId: row?.draft_saved_by_user_id ?? null,
    draftSavedAt: row?.draft_saved_at ?? null,
    submittedByUserId: row?.submitted_by_user_id ?? null,
    submittedAt: row?.submitted_at ?? null,
    permissions,
    collaboration,
    blockingReasons,
    reviewOpinions,
    images
  };
}

async function buildFormPermissions({ connection, projectId, document, user }) {
  const schema = buildFormSchema(document);
  if (!schema) {
    return { schema: null, permissions: { canView: false, canEdit: false, canSubmit: false }, blockingReasons: [] };
  }

  if (String(getDocumentCode(document)) === INITIATION_NOTICE_DOCUMENT_CODE) {
    const project = await selectProjectPermissionContext(connection, projectId, user);
    const projectContext = await selectOnlineFormProjectContext(connection, projectId);
    const gate = await buildGateContext(connection, projectId, document, projectContext);
    const isEditable = isDocumentEditableForOnlineForm(document);
    const projectEnded = project?.status === PROJECT_STATUS.ENDED;
    const canHandle = isMarketingCenterManager(user) && gate.ready && isEditable && !projectEnded;
    const blockingReasons = [];
    if (projectEnded) {
      blockingReasons.push('项目已结束，在线表单仅可浏览');
    }
    if (!gate.ready) {
      blockingReasons.push(...gate.blockingReasons);
    }
    if (!isEditable) {
      blockingReasons.push(buildDocumentNotEditableBlockingReason(document));
    }

    return {
      schema,
      permissions: {
        canView: true,
        canEdit: canHandle,
        canSubmit: canHandle
      },
      blockingReasons
    };
  }

  if (String(getDocumentCode(document)) === INITIATION_REVIEW_DOCUMENT_CODE) {
    const project = await selectProjectPermissionContext(connection, projectId, user);
    const projectContext = await selectOnlineFormProjectContext(connection, projectId);
    const editablePart = getUserInitiationCollaborationPart(user, projectContext);
    const isEditable = isDocumentEditableForOnlineForm(document);
    const projectEnded = project?.status === PROJECT_STATUS.ENDED;
    const requirementGate = await buildInitiationRequirementSubmitGate(connection, projectId);
    const reworkBlocker = await selectOutstandingInitiationRequirementRework(connection, projectId, document);
    const formRow = await selectFormRow(connection, document.id);
    const collaboration = getInitiationCollaboration(parseJsonValue(formRow?.form_data_json, {}));
    const currentPartSubmitted = isInitiationCollaborationPartSubmitted(collaboration, editablePart);
    const canHandle =
      Boolean(editablePart) &&
      requirementGate.ready &&
      !currentPartSubmitted &&
      isEditable &&
      !reworkBlocker &&
      !projectEnded;
    const blockingReasons = [];
    if (projectEnded) {
      blockingReasons.push('项目已结束，在线表单仅可浏览');
    }
    if (!editablePart) {
      blockingReasons.push('当前账号不是本项目商务负责人或技术负责人');
    }
    if (!isEditable) {
      blockingReasons.push(buildDocumentNotEditableBlockingReason(document));
    }
    if (!requirementGate.ready) {
      blockingReasons.push(...requirementGate.blockingReasons);
    }
    if (reworkBlocker) {
      blockingReasons.push(buildInitiationReworkNotClearedReason());
    }
    if (currentPartSubmitted) {
      blockingReasons.push('该部分已提交，需退回后重新填写');
    }

    return {
      schema,
      permissions: {
        canView: true,
        canEdit: canHandle,
        canSubmit: canHandle,
        editablePart,
        canEditBusinessPart: canHandle && editablePart === INITIATION_COLLABORATION_PART.BUSINESS,
        canEditTechnicalPart: canHandle && editablePart === INITIATION_COLLABORATION_PART.TECHNICAL,
        canSubmitBusinessPart: canHandle && editablePart === INITIATION_COLLABORATION_PART.BUSINESS,
        canSubmitTechnicalPart: canHandle && editablePart === INITIATION_COLLABORATION_PART.TECHNICAL
      },
      blockingReasons
    };
  }

  const hasResponsible = Boolean(document.responsible_user_id ?? document.responsibleUserId);
  const isEditable = isDocumentEditableForOnlineForm(document);
  const project = await selectProjectPermissionContext(connection, projectId, user);
  const projectEnded = project?.status === PROJECT_STATUS.ENDED;
  const reworkBlocker =
    String(getDocumentCode(document)) === INITIATION_REVIEW_DOCUMENT_CODE
      ? await selectOutstandingInitiationRequirementRework(connection, projectId, document)
      : null;
  const canHandle = hasResponsible && isResponsibleUser(user, document) && isEditable && !reworkBlocker && !projectEnded;
  const blockingReasons = [];
  if (projectEnded) {
    blockingReasons.push('项目已结束，在线表单仅可浏览');
  }
  if (!hasResponsible) {
    blockingReasons.push('尚未分配资料责任人');
  }
  if (!isEditable) {
    blockingReasons.push(buildDocumentNotEditableBlockingReason(document));
  }
  if (reworkBlocker) {
    blockingReasons.push(buildInitiationReworkNotClearedReason());
  }

  return {
    schema,
    permissions: {
      canView: true,
      canEdit: canHandle,
      canSubmit: canHandle
    },
    blockingReasons
  };
}

async function persistInitiationCollaborationForm({
  connection,
  projectId,
  documentId,
  document,
  user,
  schema,
  projectContext,
  normalizedFormData,
  submit = false
}) {
  const editablePart = assertUserCanHandleInitiationCollaboration(user, projectContext);
  const existingRow = await selectFormRow(connection, documentId);
  const existingStoredFormData = parseJsonValue(existingRow?.form_data_json, {});
  const existingCollaboration = getInitiationCollaboration(existingStoredFormData);
  assertInitiationCollaborationPartNotSubmitted(existingCollaboration, editablePart);
  const existingFormData = applySchemaDefaults(
    schema,
    omitInitiationCollaborationMetadata(existingStoredFormData),
    projectContext
  );
  const incomingFormData = applySchemaDefaults(schema, normalizedFormData, projectContext);
  const mergedFormData = mergeInitiationCollaborationFormData({
    schema,
    existingFormData,
    incomingFormData,
    incomingOriginal: normalizedFormData,
    part: editablePart
  });

  let collaboration = existingCollaboration;
  if (submit) {
    validateRequiredFields(schema, mergedFormData, getEditablePartFields(schema, editablePart));
    collaboration = markInitiationCollaborationPartSubmitted(collaboration, editablePart, user.id);
  }

  const status = isInitiationCollaborationComplete(collaboration)
    ? FORM_STATUS.SUBMITTED
    : FORM_STATUS.DRAFT;
  const formDataToStore = applySchemaDefaults(
    schema,
    {
      ...mergedFormData,
      [INITIATION_COLLABORATION_METADATA_KEY]: collaboration
    },
    projectContext
  );

  await upsertForm({
    connection,
    projectId,
    documentId,
    schema,
    formData: formDataToStore,
    status,
    userId: user.id
  });

  return {
    editablePart,
    collaboration,
    status
  };
}

export async function getStageDocumentOnlineForm({ projectId, documentId, user }) {
  await assertProjectViewable(projectId, user);
  const connection = await pool.getConnection();

  try {
    const document = await selectProjectStageDocument(connection, projectId, documentId);
    await assertCanViewFormDocument({ connection, projectId, document, user });
    const { schema, permissions, blockingReasons } = await buildFormPermissions({
      connection,
      projectId,
      document,
      user
    });
    if (!schema) {
      throw new StageDocumentFormError(
        'FORM_NOT_SUPPORTED',
        'This stage document does not support online form',
        404,
        ['documentId']
      );
    }

    const row = await selectFormRow(connection, documentId);
    const projectContext = await selectOnlineFormProjectContext(connection, projectId);
    const formDataOverrides =
      String(getDocumentCode(document)) === INITIATION_NOTICE_DOCUMENT_CODE
        ? {
            projectExecutionMode: await selectApprovedInitiationProjectExecutionMode(connection, projectId)
          }
        : {};
    const reviewOpinions = await buildReviewOpinions({ connection, document, schema });
    const images = await listStageDocumentOnlineFormImagesForDocument({
      executor: connection,
      projectId,
      documentId,
      user,
      project: await selectProjectPermissionContext(connection, projectId, user),
      document
    });
    return mapForm({
      document,
      schema,
      row,
      permissions,
      projectContext,
      blockingReasons,
      reviewOpinions,
      images,
      formDataOverrides
    });
  } finally {
    connection.release();
  }
}

export async function saveStageDocumentOnlineForm({ projectId, documentId, user, formData }) {
  const normalizedFormData = normalizeFormData(formData);
  const connection = await pool.getConnection();
  let schema;
  let document;
  let formRow;
  let formPermissions;
  let projectContext;
  let reviewOpinions;
  let images = [];

  try {
    await connection.beginTransaction();
    document = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await assertCanViewFormDocument({ connection, projectId, document, user });
    assertProjectNotEndedForOnlineForm(project);
    assertDocumentEditableForOnlineForm(document);
    assertDocumentApplicableForOnlineForm(document);
    projectContext = await selectOnlineFormProjectContext(connection, projectId, { forUpdate: true });
    schema = await assertCanEditForm({ connection, projectId, document, user, projectContext });
    const collaborationResult = isInitiationReviewFormDocument(document)
      ? await persistInitiationCollaborationForm({
          connection,
          projectId,
          documentId,
          document,
          user,
          schema,
          projectContext,
          normalizedFormData,
          submit: false
        })
      : null;
    if (!collaborationResult) {
      const formDataWithDefaults = await applyInitiationNoticeProjectExecutionModeSnapshot({
        connection,
        projectId,
        document,
        formData: applySchemaDefaults(schema, normalizedFormData, projectContext),
        forUpdate: true
      });
      await upsertForm({
        connection,
        projectId,
        documentId,
        schema,
        formData: formDataWithDefaults,
        status: FORM_STATUS.DRAFT,
        userId: user.id
      });
    }
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.FORM_UPDATED,
      targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
      targetId: documentId,
      summary: `保存在线表单：${document.document_name}`,
      details: {
        projectId,
        stageDocumentId: documentId,
        documentCode: document.document_code,
        documentName: document.document_name,
        formKey: schema.formKey,
        fromStatus: document.status,
        toStatus: collaborationResult?.status ?? FORM_STATUS.DRAFT,
        collaborationPart: collaborationResult?.editablePart ?? null,
        collaboration: collaborationResult?.collaboration ?? null,
        actorUserId: user.id,
        operatedAt: new Date().toISOString()
      }
    });
    formRow = await selectFormRow(connection, documentId);
    formPermissions = await buildFormPermissions({ connection, projectId, document, user });
    reviewOpinions = await buildReviewOpinions({ connection, document, schema });
    images = await listStageDocumentOnlineFormImagesForDocument({
      executor: connection,
      projectId,
      documentId,
      user,
      project,
      document
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return mapForm({
    document,
    schema,
    row: formRow,
    permissions: formPermissions.permissions,
    projectContext,
    blockingReasons: formPermissions.blockingReasons,
    reviewOpinions,
    images
  });
}

export async function submitStageDocumentOnlineForm({ projectId, documentId, user, formData }) {
  const normalizedFormData = normalizeFormData(formData);
  let schema;
  let document;
  let updatedDocument;
  let updatedFormDocument;
  let formRow;
  let formPermissions;
  let projectContext;
  let reviewOpinions;
  let images = [];
  let projectCodeLockName = null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    document = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await assertCanViewFormDocument({ connection, projectId, document, user });
    assertProjectNotEndedForOnlineForm(project);
    assertDocumentEditableForOnlineForm(document);
    assertDocumentApplicableForOnlineForm(document);
    projectContext = await selectOnlineFormProjectContext(connection, projectId, { forUpdate: true });
    schema = await assertCanEditForm({ connection, projectId, document, user, projectContext });
    const collaborationResult = isInitiationReviewFormDocument(document)
      ? await persistInitiationCollaborationForm({
          connection,
          projectId,
          documentId,
          document,
          user,
          schema,
          projectContext,
          normalizedFormData,
          submit: true
        })
      : null;
    if (!collaborationResult) {
      const formDataWithDefaults = await applyInitiationNoticeProjectExecutionModeSnapshot({
        connection,
        projectId,
        document,
        formData: applySchemaDefaults(schema, normalizedFormData, projectContext),
        required: true,
        forUpdate: true
      });
      const noticeProjectCode =
        String(getDocumentCode(document)) === INITIATION_NOTICE_DOCUMENT_CODE
          ? normalizeInitiationProjectCode(formDataWithDefaults, { required: true })
          : null;
      if (noticeProjectCode) {
        formDataWithDefaults.projectCode = noticeProjectCode;
      }
      validateRequiredFields(schema, formDataWithDefaults);
      if (noticeProjectCode) {
        projectCodeLockName = await acquireInitiationProjectCodeLock(connection, noticeProjectCode);
        await updateProjectCodeFromInitiationNoticeForm({
          connection,
          projectId,
          projectContext,
          projectCode: noticeProjectCode,
          user,
          document
        });
      }
      await upsertForm({
        connection,
        projectId,
        documentId,
        schema,
        formData: formDataWithDefaults,
        status: FORM_STATUS.SUBMITTED,
        userId: user.id
      });
    }
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED,
      targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
      targetId: documentId,
      summary: `提交在线表单：${document.document_name}`,
      details: {
        projectId,
        stageDocumentId: documentId,
        documentCode: document.document_code,
        documentName: document.document_name,
        formKey: schema.formKey,
        fromStatus: document.status,
        toStatus: collaborationResult?.status ?? FORM_STATUS.SUBMITTED,
        collaborationPart: collaborationResult?.editablePart ?? null,
        collaboration: collaborationResult?.collaboration ?? null,
        actorUserId: user.id,
        operatedAt: new Date().toISOString()
      }
    });
    if (!collaborationResult || collaborationResult.status === FORM_STATUS.SUBMITTED) {
      updatedDocument = await updateProjectStageDocumentStatus({
        connection,
        projectId,
        documentId,
        action: DOCUMENT_STATUS_ACTION.SUBMIT,
        user,
        allowOnlineFormDocumentSubmit: true
      });
      updatedFormDocument = await selectProjectStageDocument(connection, projectId, documentId);
    } else {
      updatedDocument = mapDocument(document);
      updatedFormDocument = document;
    }
    formRow = await selectFormRow(connection, documentId);
    formPermissions = await buildFormPermissions({
      connection,
      projectId,
      document: updatedFormDocument,
      user
    });
    reviewOpinions = await buildReviewOpinions({ connection, document: updatedFormDocument, schema });
    images = await listStageDocumentOnlineFormImagesForDocument({
      executor: connection,
      projectId,
      documentId,
      user,
      project,
      document: updatedFormDocument
    });
    if (!collaborationResult || collaborationResult.status === FORM_STATUS.SUBMITTED) {
      await tryAutoAdvanceProjectStage(
        {
          projectId,
          user,
          triggerAction: 'online_form.submitted',
          expectedStageOrder: updatedFormDocument.stage_order,
          triggerMetadata: {
            documentId,
            documentCode: updatedFormDocument.document_code,
            stageOrder: updatedFormDocument.stage_order,
            formKey: schema.formKey,
            actionType: OPERATION_ACTION_TYPE.FORM_SUBMITTED
          }
        },
        connection
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await releaseInitiationProjectCodeLock(connection, projectCodeLockName);
    connection.release();
  }

  const documentCode = String(updatedFormDocument?.document_code ?? updatedFormDocument?.documentCode ?? '');
  if ([INITIATION_REWORK_TARGET_DOCUMENT_CODE, INITIATION_NOTICE_DOCUMENT_CODE].includes(documentCode)) {
    await generateInitiationTemplateFile({
      projectId,
      documentId,
      documentCode,
      triggerEvent: INITIATION_TEMPLATE_TRIGGER_EVENT.ONLINE_FORM_SUBMITTED,
      user
    });
  }

  return {
    form: mapForm({
      document: updatedFormDocument,
      schema,
      row: formRow,
      permissions: formPermissions.permissions,
      projectContext,
      blockingReasons: formPermissions.blockingReasons,
      reviewOpinions,
      images
    }),
    document: updatedDocument
  };
}
