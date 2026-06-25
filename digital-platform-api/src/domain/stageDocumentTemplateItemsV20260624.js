import { BUSINESS_DEPARTMENT } from './organization.js';
import { STANDARD_PROJECT_STAGES } from './stages.js';

const {
  MARKETING_CENTER,
  MANUFACTURING_CENTER,
  OPERATIONS_CENTER,
  RD_CENTER
} = BUSINESS_DEPARTMENT;

const TEMPLATE_VERSION = 'v20260624';
const SUBMIT_MODE = {
  FILE_UPLOAD: 'file_upload',
  MIXED: 'mixed'
};

const stageByOrder = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageOrder, stage]));

function buildTargetFolderPath(stage, documentCode, documentName) {
  const shortStageName = stage.stageName.replace(/阶段$/, '');
  return `${stage.stageOrder}-${shortStageName}/${documentCode} ${documentName}`;
}

function documentItem({
  documentCode,
  documentName,
  isRequired,
  defaultResponsibilityRole,
  confirmRole,
  ownerDepartment,
  reviewDepartment,
  submitMode = SUBMIT_MODE.FILE_UPLOAD,
  applicabilityCondition = '默认适用',
  notes = ''
}) {
  const [stageNumber, documentOrder] = documentCode.split('.').map((part) => Number.parseInt(part, 10));
  const stage = stageByOrder.get(stageNumber);
  if (!stage || !Number.isSafeInteger(documentOrder)) {
    throw new Error(`Invalid v20260624 document code: ${documentCode}`);
  }

  return Object.freeze({
    templateVersion: TEMPLATE_VERSION,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    documentCode,
    documentOrder,
    documentName,
    isRequired,
    defaultResponsibilityRole,
    confirmRole,
    ownerDepartment,
    reviewDepartment,
    submitMode,
    targetFolderPath: buildTargetFolderPath(stage, documentCode, documentName),
    targetFolderId: null,
    applicabilityCondition,
    notes
  });
}

export const STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260624 = Object.freeze([
  documentItem({
    documentCode: '1.1',
    documentName: '项目需求表',
    isRequired: true,
    defaultResponsibilityRole: '研发中心填写，营销组织调研',
    confirmRole: '营销组织调研，研发填写生成',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    notes: 'owner/review 需业务复核。'
  }),
  documentItem({
    documentCode: '1.2',
    documentName: '项目立项审批表',
    isRequired: true,
    defaultResponsibilityRole: '营销人员',
    confirmRole: '商务评价、技术评价、总经理审批',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: null,
    notes: '仅规划审批产出文件，不建模审批流。'
  }),
  documentItem({
    documentCode: '1.3',
    documentName: '项目立项通知',
    isRequired: true,
    defaultResponsibilityRole: '营销总监',
    confirmRole: '营销中心',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER
  }),
  documentItem({
    documentCode: '2.1',
    documentName: '方案设计工作计划',
    isRequired: true,
    defaultResponsibilityRole: '项目经理',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    notes: '从 20260610 立项阶段移动到方案设计阶段。'
  }),
  documentItem({
    documentCode: '2.2',
    documentName: '项目方案分析表',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    notes: '由 20260610 的项目需求分析表调整而来。'
  }),
  documentItem({
    documentCode: '2.3',
    documentName: '产品功能框图',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '2.4',
    documentName: '3D模型',
    isRequired: true,
    defaultResponsibilityRole: '机械/方案设计人员',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '方案阶段 3D 模型。'
  }),
  documentItem({
    documentCode: '2.5',
    documentName: '布局图',
    isRequired: true,
    defaultResponsibilityRole: '机械/方案设计人员',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '2.6',
    documentName: '工艺时序图',
    isRequired: false,
    defaultResponsibilityRole: '技术负责人/工艺负责人',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '客户要求时适用',
    notes: '浅色非必需项，不应默认阻塞齐套。'
  }),
  documentItem({
    documentCode: '2.7',
    documentName: '节拍表',
    isRequired: false,
    defaultResponsibilityRole: '技术负责人/工艺负责人',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '客户要求时适用',
    notes: '浅色非必需项，不应默认阻塞齐套。'
  }),
  documentItem({
    documentCode: '2.8',
    documentName: '演示动画',
    isRequired: false,
    defaultResponsibilityRole: '机械/方案设计人员',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    applicabilityCondition: '客户要求时适用',
    notes: '浅色非必需项，不应默认阻塞齐套。'
  }),
  documentItem({
    documentCode: '2.9',
    documentName: '电气功能框图',
    isRequired: true,
    defaultResponsibilityRole: '电气工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '2.10',
    documentName: '软件功能框图',
    isRequired: true,
    defaultResponsibilityRole: '软件工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '2.11',
    documentName: '项目方案PPT',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null
  }),
  documentItem({
    documentCode: '2.12',
    documentName: '方案评审记录表（内部方案评审）',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理组织并确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    notes: '只规划评审产出文件，不新增评审流程。'
  }),
  documentItem({
    documentCode: '2.13',
    documentName: '方案评审记录表（客户方案评审）',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '营销组织，客户和项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    notes: '客户方案评审命名和 review 口径待审查。'
  }),
  documentItem({
    documentCode: '2.14',
    documentName: '成本估算表',
    isRequired: true,
    defaultResponsibilityRole: '研发、制造、运营协作',
    confirmRole: '研发、制造、运营协作，总经理批准',
    ownerDepartment: RD_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    submitMode: SUBMIT_MODE.MIXED,
    notes: '本规划不建模多中心协同；reviewDepartment 暂按运营中心收口，待业务确认。'
  }),
  documentItem({
    documentCode: '2.15',
    documentName: '报价单',
    isRequired: true,
    defaultResponsibilityRole: '营销人员',
    confirmRole: '总经理批准，客户确认',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: null,
    notes: '新增报价产出；只规划文件，不建模报价审批。'
  }),
  documentItem({
    documentCode: '3.1',
    documentName: '技术协议',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '客户签字盖章，营销组织',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER
  }),
  documentItem({
    documentCode: '3.2',
    documentName: '销售合同',
    isRequired: true,
    defaultResponsibilityRole: '营销人员',
    confirmRole: '客户签字盖章',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: null,
    notes: '只规划合同文件，不建模合同状态流。'
  }),
  documentItem({
    documentCode: '3.3',
    documentName: '合同审核记录表（销售合同）',
    isRequired: true,
    defaultResponsibilityRole: '合同审核人员',
    confirmRole: '总经理或运营审核对象待业务确认',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    notes: '新增销售合同审核产出；不建模合同审批流。'
  }),
  documentItem({
    documentCode: '3.4',
    documentName: '发票（预付款）',
    isRequired: false,
    defaultResponsibilityRole: '财务人员',
    confirmRole: '财务开票，营销协调客户付款',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    applicabilityCondition: '对应付款/发票节点发生时适用，待业务确认',
    notes: '只作为产出文件规划，不建模付款/发票流程。'
  }),
  documentItem({
    documentCode: '4.1',
    documentName: '项目启动书',
    isRequired: true,
    defaultResponsibilityRole: '制造中心',
    confirmRole: '制造中心组织项目启动会',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    notes: 'review 复核后由合同签订阶段移动到详细设计阶段。'
  }),
  documentItem({
    documentCode: '4.2',
    documentName: '详细设计工作计划',
    isRequired: true,
    defaultResponsibilityRole: '项目经理',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    notes: '从 20260610 合同签订阶段移动到详细设计阶段。'
  }),
  documentItem({
    documentCode: '4.3',
    documentName: '3D模型',
    isRequired: true,
    defaultResponsibilityRole: '机械工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '详细设计阶段 3D 模型。'
  }),
  documentItem({
    documentCode: '4.4',
    documentName: '电气原理图',
    isRequired: true,
    defaultResponsibilityRole: '电气工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.5',
    documentName: '电气接线图',
    isRequired: true,
    defaultResponsibilityRole: '电气工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.6',
    documentName: '电气布置图',
    isRequired: true,
    defaultResponsibilityRole: '电气工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.7',
    documentName: '控制逻辑流程图',
    isRequired: true,
    defaultResponsibilityRole: '软件/自动化工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.8',
    documentName: '自动化程序',
    isRequired: true,
    defaultResponsibilityRole: '软件/自动化工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.9',
    documentName: '软件开发说明文档',
    isRequired: true,
    defaultResponsibilityRole: '软件工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.10',
    documentName: 'UI界面设计PPT',
    isRequired: true,
    defaultResponsibilityRole: '软件/UI人员',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.11',
    documentName: '软件代码',
    isRequired: true,
    defaultResponsibilityRole: '软件工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.12',
    documentName: '设计评审记录表（内部设计评审）',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理组织并确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: null,
    notes: '只规划评审产出文件，不新增评审流程。'
  }),
  documentItem({
    documentCode: '4.13',
    documentName: '设计评审记录表（客户设计评审）',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '营销组织，客户和项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    notes: '客户设计评审命名和 review 口径待审查。'
  }),
  documentItem({
    documentCode: '4.14',
    documentName: '产品平面图',
    isRequired: true,
    defaultResponsibilityRole: '机械工程师',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.15',
    documentName: '产品零部件清单',
    isRequired: true,
    defaultResponsibilityRole: '各专业组成员、技术负责人',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER
  }),
  documentItem({
    documentCode: '4.16',
    documentName: '图纸审查记录',
    isRequired: true,
    defaultResponsibilityRole: '图纸审查人员',
    confirmRole: '项目经理组织，研发负责人或图纸审查人员确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '图纸审查不能代替图纸签字流程。'
  }),
  documentItem({
    documentCode: '4.17',
    documentName: '客户会签记录',
    isRequired: true,
    defaultResponsibilityRole: '营销人员/项目经理',
    confirmRole: '客户和项目经理确认',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER
  }),
  documentItem({
    documentCode: '5.1',
    documentName: '采购申请表',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '制造中心接收，采购审批流程另行建模',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    notes: 'review 复核后由详细设计阶段移动到生产制作阶段；只规划采购申请产出，不建模采购审批流。'
  }),
  documentItem({
    documentCode: '5.2',
    documentName: '比价表',
    isRequired: true,
    defaultResponsibilityRole: '采购人员',
    confirmRole: '制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.3',
    documentName: '采购合同',
    isRequired: true,
    defaultResponsibilityRole: '采购人员',
    confirmRole: '供应商签署，合同状态流另行建模',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.4',
    documentName: '采购合同审核记录表',
    isRequired: true,
    defaultResponsibilityRole: '合同审核人员',
    confirmRole: '总经理或运营审核对象待业务确认',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    notes: '新增采购合同审核产出；不建模合同审批流。'
  }),
  documentItem({
    documentCode: '5.5',
    documentName: '作业指导书',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '技术负责人确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '从预验收阶段移动到生产制作阶段。'
  }),
  documentItem({
    documentCode: '5.6',
    documentName: '产品使用说明书',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '从预验收阶段移动到生产制作阶段。'
  }),
  documentItem({
    documentCode: '5.7',
    documentName: '产品维护保养手册',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '从预验收阶段移动到生产制作阶段。'
  }),
  documentItem({
    documentCode: '5.8',
    documentName: '产品培训PPT',
    isRequired: true,
    defaultResponsibilityRole: '技术负责人',
    confirmRole: '项目经理确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    notes: '从预验收阶段移动到生产制作阶段。'
  }),
  documentItem({
    documentCode: '5.9',
    documentName: '检验单',
    isRequired: true,
    defaultResponsibilityRole: '质检人员/制造中心人员',
    confirmRole: '质检人员或制造中心确认，组织口径待业务确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.10',
    documentName: '入库单',
    isRequired: true,
    defaultResponsibilityRole: '库管人员',
    confirmRole: '库管人员编写，制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.11',
    documentName: '领料单',
    isRequired: true,
    defaultResponsibilityRole: '库管人员',
    confirmRole: '库管人员编写，制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.12',
    documentName: '安装调试记录（厂内）',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '5.13',
    documentName: '3D模型（设计变更）',
    isRequired: false,
    defaultResponsibilityRole: '设计变更人员',
    confirmRole: '项目经理确认对象待业务确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '发生设计变更时适用',
    notes: '设计变更产出文件；本规划不建模自动触发流程。'
  }),
  documentItem({
    documentCode: '5.14',
    documentName: '产品平面图（设计变更）',
    isRequired: false,
    defaultResponsibilityRole: '设计变更人员',
    confirmRole: '项目经理确认对象待业务确认',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '发生设计变更时适用',
    notes: '设计变更产出文件；本规划不建模自动触发流程。'
  }),
  documentItem({
    documentCode: '5.15',
    documentName: '零部件清单（设计变更）',
    isRequired: false,
    defaultResponsibilityRole: '设计变更人员',
    confirmRole: '制造中心接收变更资料',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    applicabilityCondition: '发生设计变更时适用',
    notes: '设计变更产出文件；本规划不建模自动触发流程。'
  }),
  documentItem({
    documentCode: '5.16',
    documentName: '技术通知单（设计变更）',
    isRequired: false,
    defaultResponsibilityRole: '设计变更人员',
    confirmRole: '制造中心接收技术通知',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    applicabilityCondition: '发生设计变更时适用',
    notes: '从详细设计普通资料转为生产阶段变更节点产出。'
  }),
  documentItem({
    documentCode: '5.17',
    documentName: '自验收报告',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }),
  documentItem({
    documentCode: '6.1',
    documentName: '预验收单',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '营销组织客户预验收，客户和项目经理确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MARKETING_CENTER
  }),
  documentItem({
    documentCode: '6.2',
    documentName: '发票（发货款）',
    isRequired: false,
    defaultResponsibilityRole: '财务人员',
    confirmRole: '财务开票，营销协调客户付款',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    applicabilityCondition: '对应付款/发票节点发生时适用，待业务确认',
    notes: '只作为产出文件规划，不建模付款/发票流程。'
  }),
  documentItem({
    documentCode: '7.1',
    documentName: '发货单',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '制造中心确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    notes: 'review 复核后归入终验收阶段。'
  }),
  documentItem({
    documentCode: '7.2',
    documentName: '安装调试记录（现场）',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '客户确认对象待业务确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    notes: 'review 复核后归入终验收阶段。'
  }),
  documentItem({
    documentCode: '7.3',
    documentName: '终验收单',
    isRequired: true,
    defaultResponsibilityRole: '制造中心人员',
    confirmRole: '营销组织客户终验收，客户和项目经理确认',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    notes: '图中动作写终验收报告、红色产出为终验收单；命名待审查。'
  }),
  documentItem({
    documentCode: '7.4',
    documentName: '培训记录表',
    isRequired: true,
    defaultResponsibilityRole: '培训主讲人员',
    confirmRole: '客户和项目经理确认',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER
  }),
  documentItem({
    documentCode: '8.1',
    documentName: '发票（尾款）',
    isRequired: false,
    defaultResponsibilityRole: '财务人员',
    confirmRole: '财务开票，营销协调客户付款',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    applicabilityCondition: '对应付款/发票节点发生时适用，待业务确认',
    notes: '只作为产出文件规划，不建模付款/发票流程。'
  }),
  documentItem({
    documentCode: '8.2',
    documentName: '项目结题报告',
    isRequired: true,
    defaultResponsibilityRole: '项目经理',
    confirmRole: '项目经理编写，总经理或相关负责人确认',
    ownerDepartment: null,
    reviewDepartment: null,
    notes: 'ownerDepartment/reviewDepartment 待业务确认。'
  })
]);
