import { BUSINESS_DEPARTMENT } from './organization.js';
import { STANDARD_PROJECT_STAGES } from './stages.js';

const {
  MARKETING_CENTER,
  MANUFACTURING_CENTER,
  OPERATIONS_CENTER,
  RD_CENTER
} = BUSINESS_DEPARTMENT;

export const V20260629_TARGET_TEMPLATE_VERSION = 'v20260629';
export const V20260629_TARGET_TEMPLATE_OUTPUT_COUNT = 71;
export const V20260629_WORKSPACE_COMPATIBILITY_OUTPUT_COUNT = 2;

export const V20260629_TEMPLATE_SWITCH_METADATA = Object.freeze({
  templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
  runtimeDefault: false,
  defaultProjectInitializationEnabled: false,
  legacyProjectMigrationEnabled: false,
  writesProjectStageDocuments: false,
  switchRequiresChange: true,
  source: '20260629 PDF drawing outputs + 4 missing draft corrections'
});

const COMPLETION_MODE = {
  SUBMIT_ONLY: 'submit_only',
  APPROVAL_REQUIRED: 'approval_required',
  CONDITIONAL_SUBMIT: 'conditional_submit'
};

const SUBMIT_MODE = {
  ONLINE_FORM: 'online_form',
  FILE_UPLOAD: 'file_upload'
};

const OUTPUT_KIND = {
  DRAFT: 'draft',
  FINAL: 'final',
  MULTI_NODE_FINAL: 'multi_node_final'
};

const REQUIREMENT_TYPE = {
  REQUIRED: 'required',
  CONDITIONAL: 'conditional',
  TO_BE_CONFIRMED: 'to_be_confirmed'
};

const stageByOrder = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageOrder, stage]));

function targetOutput({
  targetOutputCode,
  stageOrder,
  nodeKey,
  documentName,
  legacyDocumentCode = null,
  sourceNode,
  outputKind = OUTPUT_KIND.FINAL,
  responsibleRole,
  ownerDepartment = null,
  reviewDepartment = null,
  completionMode,
  submitMode = SUBMIT_MODE.FILE_UPLOAD,
  requirementType = REQUIREMENT_TYPE.REQUIRED,
  isRequired = requirementType === REQUIREMENT_TYPE.REQUIRED,
  formKey = null,
  workspaceCompatibility = false,
  notes = ''
}) {
  const stage = stageByOrder.get(stageOrder);
  if (!stage) {
    throw new Error(`Invalid v20260629 target output stage: ${stageOrder}`);
  }

  return Object.freeze({
    templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
    targetOutputCode,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    nodeKey,
    documentName,
    legacyDocumentCode,
    sourceNode,
    outputKind,
    responsibleRole,
    ownerDepartment,
    reviewDepartment,
    completionMode,
    submitMode,
    requirementType,
    isRequired,
    formKey,
    workspaceCompatibility,
    notes
  });
}

export const V20260629_TARGET_TEMPLATE_OUTPUTS = Object.freeze([
  targetOutput({
    targetOutputCode: 'C01',
    stageOrder: 1,
    nodeKey: 'market_research',
    documentName: '项目需求表',
    legacyDocumentCode: '1.1',
    sourceNode: '项目市场调研',
    responsibleRole: '营销中心组织，研发中心填写',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    submitMode: SUBMIT_MODE.ONLINE_FORM,
    formKey: 'initiation_requirement',
    notes: '沿用当前 1.1 在线表单、责任人和返工规则。'
  }),
  targetOutput({
    targetOutputCode: 'C02',
    stageOrder: 1,
    nodeKey: 'initiation_approval',
    documentName: '项目立项审批表',
    legacyDocumentCode: '1.2',
    sourceNode: '项目立项审批',
    responsibleRole: '营销中心、研发中心、总经理',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: null,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    submitMode: SUBMIT_MODE.ONLINE_FORM,
    formKey: 'initiation_approval',
    notes: '沿用当前 1.2 专用评价审批。'
  }),
  targetOutput({
    targetOutputCode: 'C03',
    stageOrder: 1,
    nodeKey: 'initiation_notice',
    documentName: '项目立项通知',
    legacyDocumentCode: '1.3',
    sourceNode: '项目立项通知',
    responsibleRole: '营销中心负责人',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    submitMode: SUBMIT_MODE.ONLINE_FORM,
    formKey: 'initiation_notice',
    notes: '沿用当前 1.3 在线表单入口。'
  }),
  targetOutput({
    targetOutputCode: 'C04',
    stageOrder: 2,
    nodeKey: 'solution_preparation',
    documentName: '方案设计工作计划',
    legacyDocumentCode: '2.1',
    sourceNode: '方案设计准备',
    responsibleRole: '项目经理',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C05',
    stageOrder: 2,
    nodeKey: 'solution_analysis',
    documentName: '项目方案分析表',
    legacyDocumentCode: '2.2',
    sourceNode: '项目方案分析',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C06',
    stageOrder: 2,
    nodeKey: 'solution_analysis',
    documentName: '产品功能框图',
    legacyDocumentCode: '2.3',
    sourceNode: '项目方案分析',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C07',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '3D模型（方案设计）',
    legacyDocumentCode: '2.4',
    sourceNode: '方案设计',
    responsibleRole: '机械/方案设计人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C08',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '布局图',
    legacyDocumentCode: '2.5',
    sourceNode: '方案设计',
    responsibleRole: '机械/方案设计人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C09',
    stageOrder: 2,
    nodeKey: 'solution_analysis',
    documentName: '工艺时序图',
    legacyDocumentCode: '2.6',
    sourceNode: '项目方案分析',
    responsibleRole: '技术负责人/工艺负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false,
    notes: '客户要求时适用。'
  }),
  targetOutput({
    targetOutputCode: 'C10',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '节拍表',
    legacyDocumentCode: '2.7',
    sourceNode: '方案设计',
    responsibleRole: '技术负责人/工艺负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false,
    notes: '客户要求时适用。'
  }),
  targetOutput({
    targetOutputCode: 'C11',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '演示动画',
    legacyDocumentCode: '2.8',
    sourceNode: '方案设计',
    responsibleRole: '机械/方案设计人员',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false,
    notes: '客户要求时适用。'
  }),
  targetOutput({
    targetOutputCode: 'C12',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '电气功能框图',
    legacyDocumentCode: '2.9',
    sourceNode: '方案设计',
    responsibleRole: '电气工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C13',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '软件功能框图',
    legacyDocumentCode: '2.10',
    sourceNode: '方案设计',
    responsibleRole: '软件工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C14',
    stageOrder: 2,
    nodeKey: 'solution_design',
    documentName: '项目方案PPT',
    legacyDocumentCode: '2.11',
    sourceNode: '方案设计',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C15',
    stageOrder: 2,
    nodeKey: 'internal_solution_review',
    documentName: '方案评审记录表（内部方案评审）',
    legacyDocumentCode: '2.12',
    sourceNode: '内部方案评审',
    responsibleRole: '项目经理组织，研发中心记录',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C16',
    stageOrder: 2,
    nodeKey: 'customer_solution_review',
    documentName: '方案评审记录表（客户方案评审）',
    legacyDocumentCode: '2.13',
    sourceNode: '客户方案评审',
    responsibleRole: '营销中心组织，研发中心记录',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C17',
    stageOrder: 2,
    nodeKey: 'cost_price_estimation',
    documentName: '成本估算表',
    legacyDocumentCode: '2.14',
    sourceNode: '成本估算、价格估算',
    outputKind: OUTPUT_KIND.MULTI_NODE_FINAL,
    responsibleRole: '研发、制造、运营、总经理',
    ownerDepartment: RD_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    notes: '唯一保留的真实多节点协作同一产出。'
  }),
  targetOutput({
    targetOutputCode: 'C18',
    stageOrder: 2,
    nodeKey: 'quotation',
    documentName: '报价单',
    legacyDocumentCode: '2.15',
    sourceNode: '报价',
    responsibleRole: '营销中心',
    ownerDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C19',
    stageOrder: 2,
    nodeKey: 'tender',
    documentName: '投标书',
    sourceNode: '投标',
    responsibleRole: '营销中心、研发中心、总经理',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false,
    notes: '当前 64 项无对应资料，shell 只显示目标占位。'
  }),
  targetOutput({
    targetOutputCode: 'C20',
    stageOrder: 3,
    nodeKey: 'prepare_technical_agreement',
    documentName: '技术协议草稿（合同签订阶段）',
    sourceNode: '准备技术协议',
    outputKind: OUTPUT_KIND.DRAFT,
    responsibleRole: '研发中心',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    notes: '4 个流程图漏画草稿修正之一，当前不创建资料记录。'
  }),
  targetOutput({
    targetOutputCode: 'C21',
    stageOrder: 3,
    nodeKey: 'sign_technical_agreement',
    documentName: '技术协议（客户侧成品）',
    legacyDocumentCode: '3.1',
    sourceNode: '签订技术协议',
    responsibleRole: '营销中心组织，研发中心配合',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C22',
    stageOrder: 3,
    nodeKey: 'prepare_sales_contract',
    documentName: '销售合同草稿',
    sourceNode: '准备销售合同',
    outputKind: OUTPUT_KIND.DRAFT,
    responsibleRole: '营销、研发、制造、运营/财务/法务、总经理',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    notes: '4 个流程图漏画草稿修正之一，当前不创建资料记录。'
  }),
  targetOutput({
    targetOutputCode: 'C23',
    stageOrder: 3,
    nodeKey: 'sign_sales_contract',
    documentName: '销售合同（客户侧成品）',
    legacyDocumentCode: '3.2',
    sourceNode: '签订销售合同',
    responsibleRole: '营销中心',
    ownerDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C24',
    stageOrder: 3,
    nodeKey: 'advance_payment_invoice',
    documentName: '发票（预付款）',
    legacyDocumentCode: '3.4',
    sourceNode: '项目预付款交付',
    responsibleRole: '运营/财务，营销协调',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C25',
    stageOrder: 4,
    nodeKey: 'project_kickoff_meeting',
    documentName: '项目启动书',
    legacyDocumentCode: '4.1',
    sourceNode: '召开项目启动会',
    responsibleRole: '制造中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C26',
    stageOrder: 4,
    nodeKey: 'detailed_design_preparation',
    documentName: '详细设计工作计划',
    legacyDocumentCode: '4.2',
    sourceNode: '详细设计准备',
    responsibleRole: '项目经理',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C27',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '3D模型（详细设计）',
    legacyDocumentCode: '4.3',
    sourceNode: '详细设计',
    responsibleRole: '机械工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C28',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '电气原理图',
    legacyDocumentCode: '4.4',
    sourceNode: '详细设计',
    responsibleRole: '电气工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C29',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '电气接线图',
    legacyDocumentCode: '4.5',
    sourceNode: '详细设计',
    responsibleRole: '电气工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C30',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '电气布置图',
    legacyDocumentCode: '4.6',
    sourceNode: '详细设计',
    responsibleRole: '电气工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C31',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '控制逻辑流程图',
    legacyDocumentCode: '4.7',
    sourceNode: '详细设计',
    responsibleRole: '软件/自动化工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C32',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '自动化程序',
    legacyDocumentCode: '4.8',
    sourceNode: '详细设计',
    responsibleRole: '软件/自动化工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C33',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '软件开发说明文档',
    legacyDocumentCode: '4.9',
    sourceNode: '详细设计',
    responsibleRole: '软件工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C34',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: 'UI界面设计PPT',
    legacyDocumentCode: '4.10',
    sourceNode: '详细设计',
    responsibleRole: '软件/UI 人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C35',
    stageOrder: 4,
    nodeKey: 'detailed_design',
    documentName: '软件代码',
    legacyDocumentCode: '4.11',
    sourceNode: '详细设计',
    responsibleRole: '软件工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C36',
    stageOrder: 4,
    nodeKey: 'internal_design_review',
    documentName: '设计评审记录表（内部设计评审）',
    legacyDocumentCode: '4.12',
    sourceNode: '内部设计评审',
    responsibleRole: '项目经理组织，研发中心记录',
    ownerDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C37',
    stageOrder: 4,
    nodeKey: 'customer_design_review',
    documentName: '设计评审记录表（客户设计评审）',
    legacyDocumentCode: '4.13',
    sourceNode: '客户设计评审',
    responsibleRole: '营销中心组织，研发中心记录',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C38',
    stageOrder: 4,
    nodeKey: 'product_plan_drawing',
    documentName: '产品平面图',
    legacyDocumentCode: '4.14',
    sourceNode: '绘制产品平面图',
    responsibleRole: '机械工程师',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C39',
    stageOrder: 4,
    nodeKey: 'parts_list',
    documentName: '产品零部件清单',
    legacyDocumentCode: '4.15',
    sourceNode: '编写零部件清单',
    responsibleRole: '各专业组成员、技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C40',
    stageOrder: 4,
    nodeKey: 'drawing_review',
    documentName: '图纸审查记录',
    legacyDocumentCode: '4.16',
    sourceNode: '内部图纸审查',
    responsibleRole: '图纸审查人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C41',
    stageOrder: 4,
    nodeKey: 'customer_drawing_countersign',
    documentName: '客户会签记录',
    legacyDocumentCode: '4.17',
    sourceNode: '客户图纸会签',
    responsibleRole: '营销人员/项目经理',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C42',
    stageOrder: 5,
    nodeKey: 'purchase_request',
    documentName: '采购申请表',
    legacyDocumentCode: '5.1',
    sourceNode: '采购申请',
    responsibleRole: '研发中心发起，制造中心接收',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C43',
    stageOrder: 5,
    nodeKey: 'purchase_preparation',
    documentName: '合格供应商评价表',
    sourceNode: '采购准备',
    responsibleRole: '制造中心/采购人员',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    requirementType: REQUIREMENT_TYPE.TO_BE_CONFIRMED,
    isRequired: false,
    notes: '当前 64 项无对应资料，shell 只显示目标占位。'
  }),
  targetOutput({
    targetOutputCode: 'C44',
    stageOrder: 5,
    nodeKey: 'purchase_preparation',
    documentName: '比价表',
    legacyDocumentCode: '5.2',
    sourceNode: '采购准备',
    responsibleRole: '制造中心/采购人员',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C45',
    stageOrder: 5,
    nodeKey: 'prepare_supplier_technical_agreement',
    documentName: '技术协议草稿（生产制作阶段）',
    sourceNode: '准备技术协议',
    outputKind: OUTPUT_KIND.DRAFT,
    responsibleRole: '研发中心/制造中心',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    requirementType: REQUIREMENT_TYPE.TO_BE_CONFIRMED,
    isRequired: false,
    notes: '4 个流程图漏画草稿修正之一，当前不创建资料记录。'
  }),
  targetOutput({
    targetOutputCode: 'C46',
    stageOrder: 5,
    nodeKey: 'sign_supplier_technical_agreement',
    documentName: '技术协议（生产制作阶段/供应商侧成品）',
    sourceNode: '签订技术协议',
    responsibleRole: '制造中心/供应商',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    requirementType: REQUIREMENT_TYPE.TO_BE_CONFIRMED,
    isRequired: false,
    notes: '当前 64 项无对应资料，shell 只显示目标占位。'
  }),
  targetOutput({
    targetOutputCode: 'C47',
    stageOrder: 5,
    nodeKey: 'prepare_purchase_contract',
    documentName: '采购合同草稿',
    sourceNode: '准备采购合同',
    outputKind: OUTPUT_KIND.DRAFT,
    responsibleRole: '制造、运营/财务/法务、总经理',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    notes: '4 个流程图漏画草稿修正之一，当前不创建资料记录。'
  }),
  targetOutput({
    targetOutputCode: 'C48',
    stageOrder: 5,
    nodeKey: 'sign_purchase_contract',
    documentName: '采购合同',
    legacyDocumentCode: '5.3',
    sourceNode: '签订采购合同',
    responsibleRole: '制造中心/采购人员',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C49',
    stageOrder: 5,
    nodeKey: 'manufacturing_record',
    documentName: '生产记录表',
    sourceNode: '生产制作',
    responsibleRole: '制造中心/供应商',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    requirementType: REQUIREMENT_TYPE.TO_BE_CONFIRMED,
    isRequired: false,
    notes: '当前 64 项无对应资料，shell 只显示目标占位。'
  }),
  targetOutput({
    targetOutputCode: 'C50',
    stageOrder: 5,
    nodeKey: 'random_documents_preparation',
    documentName: '作业指导书',
    legacyDocumentCode: '5.5',
    sourceNode: '准备随机资料',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C51',
    stageOrder: 5,
    nodeKey: 'random_documents_preparation',
    documentName: '产品使用说明书',
    legacyDocumentCode: '5.6',
    sourceNode: '准备随机资料',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C52',
    stageOrder: 5,
    nodeKey: 'random_documents_preparation',
    documentName: '产品维护保养手册',
    legacyDocumentCode: '5.7',
    sourceNode: '准备随机资料',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C53',
    stageOrder: 5,
    nodeKey: 'random_documents_preparation',
    documentName: '产品培训PPT',
    legacyDocumentCode: '5.8',
    sourceNode: '准备随机资料',
    responsibleRole: '技术负责人',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C54',
    stageOrder: 5,
    nodeKey: 'incoming_inspection',
    documentName: '检验单',
    legacyDocumentCode: '5.9',
    sourceNode: '来料检验',
    responsibleRole: '制造/质检中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C55',
    stageOrder: 5,
    nodeKey: 'material_warehousing',
    documentName: '入库单',
    legacyDocumentCode: '5.10',
    sourceNode: '材料入库',
    responsibleRole: '库管人员',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C56',
    stageOrder: 5,
    nodeKey: 'material_picking',
    documentName: '领料单',
    legacyDocumentCode: '5.11',
    sourceNode: '领料',
    responsibleRole: '库管人员',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C57',
    stageOrder: 5,
    nodeKey: 'factory_installation_debugging',
    documentName: '安装调试记录（厂内）',
    legacyDocumentCode: '5.12',
    sourceNode: '厂内安装调试',
    responsibleRole: '制造中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C58',
    stageOrder: 5,
    nodeKey: 'design_change',
    documentName: '3D模型（设计变更）',
    legacyDocumentCode: '5.13',
    sourceNode: '设计变更',
    responsibleRole: '设计变更人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C59',
    stageOrder: 5,
    nodeKey: 'design_change',
    documentName: '产品平面图（设计变更）',
    legacyDocumentCode: '5.14',
    sourceNode: '设计变更',
    responsibleRole: '设计变更人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C60',
    stageOrder: 5,
    nodeKey: 'design_change',
    documentName: '零部件清单（设计变更）',
    legacyDocumentCode: '5.15',
    sourceNode: '设计变更',
    responsibleRole: '设计变更人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C61',
    stageOrder: 5,
    nodeKey: 'design_change',
    documentName: '技术通知单（设计变更）',
    legacyDocumentCode: '5.16',
    sourceNode: '设计变更',
    responsibleRole: '设计变更人员',
    ownerDepartment: RD_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.CONDITIONAL_SUBMIT,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C62',
    stageOrder: 5,
    nodeKey: 'self_acceptance',
    documentName: '自验收报告',
    legacyDocumentCode: '5.17',
    sourceNode: '自验收',
    responsibleRole: '制造中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C63',
    stageOrder: 6,
    nodeKey: 'pre_acceptance',
    documentName: '预验收单',
    legacyDocumentCode: '6.1',
    sourceNode: '预验收',
    responsibleRole: '营销组织，制造中心记录',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C64',
    stageOrder: 6,
    nodeKey: 'shipping_payment_invoice',
    documentName: '发票（发货款）',
    legacyDocumentCode: '6.2',
    sourceNode: '项目发货款交付',
    responsibleRole: '运营/财务，营销协调',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C65',
    stageOrder: 7,
    nodeKey: 'shipping',
    documentName: '发货单',
    legacyDocumentCode: '7.1',
    sourceNode: '发货',
    responsibleRole: '制造中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  }),
  targetOutput({
    targetOutputCode: 'C66',
    stageOrder: 7,
    nodeKey: 'site_installation_debugging',
    documentName: '安装调试记录（现场）',
    legacyDocumentCode: '7.2',
    sourceNode: '现场安装调试',
    responsibleRole: '制造中心',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C67',
    stageOrder: 7,
    nodeKey: 'final_acceptance',
    documentName: '终验收单',
    legacyDocumentCode: '7.3',
    sourceNode: '终验收',
    responsibleRole: '营销组织，制造中心记录',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C68',
    stageOrder: 7,
    nodeKey: 'random_documents_handover',
    documentName: '资料移交清单',
    sourceNode: '移交随机资料',
    responsibleRole: '营销中心/项目相关人员',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    requirementType: REQUIREMENT_TYPE.TO_BE_CONFIRMED,
    isRequired: false,
    notes: '当前 64 项无对应资料，shell 只显示目标占位。'
  }),
  targetOutput({
    targetOutputCode: 'C69',
    stageOrder: 7,
    nodeKey: 'product_training',
    documentName: '培训记录表',
    legacyDocumentCode: '7.4',
    sourceNode: '产品培训',
    responsibleRole: '培训主讲人员',
    ownerDepartment: MARKETING_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED
  }),
  targetOutput({
    targetOutputCode: 'C70',
    stageOrder: 8,
    nodeKey: 'final_payment_invoice',
    documentName: '发票（尾款）',
    legacyDocumentCode: '8.1',
    sourceNode: '项目尾款交付',
    responsibleRole: '运营/财务，营销协调',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY,
    requirementType: REQUIREMENT_TYPE.CONDITIONAL,
    isRequired: false
  }),
  targetOutput({
    targetOutputCode: 'C71',
    stageOrder: 8,
    nodeKey: 'project_closeout',
    documentName: '项目结题报告',
    legacyDocumentCode: '8.2',
    sourceNode: '项目结题',
    responsibleRole: '项目经理',
    ownerDepartment: null,
    reviewDepartment: null,
    completionMode: COMPLETION_MODE.SUBMIT_ONLY
  })
]);

export const V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS = Object.freeze([
  targetOutput({
    targetOutputCode: 'LC33',
    stageOrder: 3,
    nodeKey: 'legacy_sales_contract_review',
    documentName: '合同审核记录表（销售合同）（旧模板兼容项）',
    legacyDocumentCode: '3.3',
    sourceNode: '销售合同审核记录兼容项',
    responsibleRole: '合同审核人员',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    workspaceCompatibility: true,
    notes: '旧模板兼容输出，仅用于覆盖当前运行 64 项资料主入口，不计入 v20260629 71 项目标模板。'
  }),
  targetOutput({
    targetOutputCode: 'LC54',
    stageOrder: 5,
    nodeKey: 'legacy_purchase_contract_review',
    documentName: '采购合同审核记录表（旧模板兼容项）',
    legacyDocumentCode: '5.4',
    sourceNode: '采购合同审核记录兼容项',
    responsibleRole: '合同审核人员',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: OPERATIONS_CENTER,
    completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
    workspaceCompatibility: true,
    notes: '旧模板兼容输出，仅用于覆盖当前运行 64 项资料主入口，不计入 v20260629 71 项目标模板。'
  })
]);

function blueModule({ stageOrder, nodeKey, nodeName, outputCodes = [], notes = '' }) {
  const stage = stageByOrder.get(stageOrder);
  if (!stage) {
    throw new Error(`Invalid v20260629 blue module stage: ${stageOrder}`);
  }

  return Object.freeze({
    templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
    stageOrder: stage.stageOrder,
    stageKey: stage.stageKey,
    stageName: stage.stageName,
    nodeKey,
    nodeName,
    outputCodes: Object.freeze([...outputCodes]),
    notes
  });
}

export const V20260629_WORKSPACE_BLUE_MODULES = Object.freeze([
  blueModule({ stageOrder: 1, nodeKey: 'project_input', nodeName: '项目输入' }),
  blueModule({ stageOrder: 1, nodeKey: 'market_research', nodeName: '项目市场调研', outputCodes: ['C01'] }),
  blueModule({ stageOrder: 1, nodeKey: 'initiation_approval', nodeName: '项目立项审批', outputCodes: ['C02'] }),
  blueModule({ stageOrder: 1, nodeKey: 'initiation_notice', nodeName: '项目立项通知', outputCodes: ['C03'] }),
  blueModule({ stageOrder: 2, nodeKey: 'solution_preparation', nodeName: '方案设计准备', outputCodes: ['C04'] }),
  blueModule({ stageOrder: 2, nodeKey: 'solution_analysis', nodeName: '项目方案分析', outputCodes: ['C05', 'C06', 'C09'] }),
  blueModule({ stageOrder: 2, nodeKey: 'solution_design', nodeName: '方案设计', outputCodes: ['C07', 'C08', 'C10', 'C11', 'C12', 'C13', 'C14'] }),
  blueModule({ stageOrder: 2, nodeKey: 'internal_solution_review', nodeName: '内部方案评审', outputCodes: ['C15'] }),
  blueModule({ stageOrder: 2, nodeKey: 'customer_solution_review', nodeName: '客户方案评审', outputCodes: ['C16'] }),
  blueModule({ stageOrder: 2, nodeKey: 'cost_price_estimation', nodeName: '成本/价格估算', outputCodes: ['C17'] }),
  blueModule({ stageOrder: 2, nodeKey: 'quotation', nodeName: '报价', outputCodes: ['C18'] }),
  blueModule({ stageOrder: 2, nodeKey: 'tender', nodeName: '投标', outputCodes: ['C19'] }),
  blueModule({ stageOrder: 3, nodeKey: 'prepare_technical_agreement', nodeName: '准备技术协议', outputCodes: ['C20'] }),
  blueModule({ stageOrder: 3, nodeKey: 'sign_technical_agreement', nodeName: '签订技术协议', outputCodes: ['C21'] }),
  blueModule({ stageOrder: 3, nodeKey: 'prepare_sales_contract', nodeName: '准备销售合同', outputCodes: ['C22'] }),
  blueModule({ stageOrder: 3, nodeKey: 'sign_sales_contract', nodeName: '签订销售合同', outputCodes: ['C23'] }),
  blueModule({
    stageOrder: 3,
    nodeKey: 'legacy_sales_contract_review',
    nodeName: '销售合同审核记录兼容项',
    outputCodes: ['LC33'],
    notes: '旧模板兼容资料，当前运行 64 项覆盖用，不计入 v20260629 71 项目标模板。'
  }),
  blueModule({ stageOrder: 3, nodeKey: 'advance_payment_invoice', nodeName: '项目预付款交付', outputCodes: ['C24'] }),
  blueModule({ stageOrder: 3, nodeKey: 'project_start_notice', nodeName: '项目启动通知', notes: '过程节点，第一版不形成目标资料。' }),
  blueModule({ stageOrder: 4, nodeKey: 'project_kickoff_meeting', nodeName: '召开项目启动会', outputCodes: ['C25'] }),
  blueModule({ stageOrder: 4, nodeKey: 'detailed_design_preparation', nodeName: '详细设计准备', outputCodes: ['C26'] }),
  blueModule({ stageOrder: 4, nodeKey: 'detailed_design', nodeName: '详细设计', outputCodes: ['C27', 'C28', 'C29', 'C30', 'C31', 'C32', 'C33', 'C34', 'C35'] }),
  blueModule({ stageOrder: 4, nodeKey: 'internal_design_review', nodeName: '内部设计评审', outputCodes: ['C36'] }),
  blueModule({ stageOrder: 4, nodeKey: 'customer_design_review', nodeName: '客户设计评审', outputCodes: ['C37'] }),
  blueModule({ stageOrder: 4, nodeKey: 'product_plan_drawing', nodeName: '绘制产品平面图', outputCodes: ['C38'] }),
  blueModule({ stageOrder: 4, nodeKey: 'parts_list', nodeName: '编写零部件清单', outputCodes: ['C39'] }),
  blueModule({ stageOrder: 4, nodeKey: 'drawing_review', nodeName: '内部图纸审查', outputCodes: ['C40'] }),
  blueModule({ stageOrder: 4, nodeKey: 'customer_drawing_countersign', nodeName: '客户图纸会签', outputCodes: ['C41'] }),
  blueModule({ stageOrder: 5, nodeKey: 'purchase_request', nodeName: '采购申请', outputCodes: ['C42'] }),
  blueModule({ stageOrder: 5, nodeKey: 'purchase_preparation', nodeName: '采购准备', outputCodes: ['C43', 'C44'] }),
  blueModule({ stageOrder: 5, nodeKey: 'prepare_supplier_technical_agreement', nodeName: '准备技术协议', outputCodes: ['C45'] }),
  blueModule({ stageOrder: 5, nodeKey: 'sign_supplier_technical_agreement', nodeName: '签订技术协议', outputCodes: ['C46'] }),
  blueModule({ stageOrder: 5, nodeKey: 'prepare_purchase_contract', nodeName: '准备采购合同', outputCodes: ['C47'] }),
  blueModule({ stageOrder: 5, nodeKey: 'sign_purchase_contract', nodeName: '签订采购合同', outputCodes: ['C48'] }),
  blueModule({
    stageOrder: 5,
    nodeKey: 'legacy_purchase_contract_review',
    nodeName: '采购合同审核记录兼容项',
    outputCodes: ['LC54'],
    notes: '旧模板兼容资料，当前运行 64 项覆盖用，不计入 v20260629 71 项目标模板。'
  }),
  blueModule({ stageOrder: 5, nodeKey: 'manufacturing_record', nodeName: '生产制作', outputCodes: ['C49'] }),
  blueModule({ stageOrder: 5, nodeKey: 'random_documents_preparation', nodeName: '准备随机资料', outputCodes: ['C50', 'C51', 'C52', 'C53'] }),
  blueModule({ stageOrder: 5, nodeKey: 'incoming_inspection', nodeName: '来料检验', outputCodes: ['C54'] }),
  blueModule({ stageOrder: 5, nodeKey: 'material_warehousing', nodeName: '材料入库', outputCodes: ['C55'] }),
  blueModule({ stageOrder: 5, nodeKey: 'material_picking', nodeName: '领料', outputCodes: ['C56'] }),
  blueModule({ stageOrder: 5, nodeKey: 'factory_installation_debugging', nodeName: '厂内安装调试', outputCodes: ['C57'] }),
  blueModule({ stageOrder: 5, nodeKey: 'design_change', nodeName: '设计变更', outputCodes: ['C58', 'C59', 'C60', 'C61'] }),
  blueModule({ stageOrder: 5, nodeKey: 'self_acceptance', nodeName: '自验收', outputCodes: ['C62'] }),
  blueModule({ stageOrder: 6, nodeKey: 'pre_acceptance', nodeName: '预验收', outputCodes: ['C63'] }),
  blueModule({ stageOrder: 6, nodeKey: 'shipping_payment_invoice', nodeName: '项目发货款交付', outputCodes: ['C64'] }),
  blueModule({ stageOrder: 6, nodeKey: 'shipping_notice', nodeName: '发货通知', notes: '过程节点，第一版不形成目标资料。' }),
  blueModule({ stageOrder: 7, nodeKey: 'shipping', nodeName: '发货', outputCodes: ['C65'] }),
  blueModule({ stageOrder: 7, nodeKey: 'site_installation_debugging', nodeName: '现场安装调试', outputCodes: ['C66'] }),
  blueModule({ stageOrder: 7, nodeKey: 'final_acceptance', nodeName: '终验收', outputCodes: ['C67'] }),
  blueModule({ stageOrder: 7, nodeKey: 'random_documents_handover', nodeName: '移交随机资料', outputCodes: ['C68'] }),
  blueModule({ stageOrder: 7, nodeKey: 'product_training', nodeName: '产品培训', outputCodes: ['C69'] }),
  blueModule({ stageOrder: 8, nodeKey: 'final_payment_invoice', nodeName: '项目尾款交付', outputCodes: ['C70'] }),
  blueModule({ stageOrder: 8, nodeKey: 'document_archive_check', nodeName: '资料整理归集', notes: '过程节点，第一版不形成目标资料。' }),
  blueModule({ stageOrder: 8, nodeKey: 'project_closeout', nodeName: '项目结题', outputCodes: ['C71'] })
]);

const outputsByCode = new Map(
  [...V20260629_TARGET_TEMPLATE_OUTPUTS, ...V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS].map((output) => [
    output.targetOutputCode,
    output
  ])
);

function assertV20260629TargetTemplate() {
  if (V20260629_TARGET_TEMPLATE_OUTPUTS.length !== V20260629_TARGET_TEMPLATE_OUTPUT_COUNT) {
    throw new Error(
      `Expected ${V20260629_TARGET_TEMPLATE_OUTPUT_COUNT} v20260629 target outputs, got ${V20260629_TARGET_TEMPLATE_OUTPUTS.length}`
    );
  }
  if (V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS.length !== V20260629_WORKSPACE_COMPATIBILITY_OUTPUT_COUNT) {
    throw new Error(
      `Expected ${V20260629_WORKSPACE_COMPATIBILITY_OUTPUT_COUNT} v20260629 workspace compatibility outputs, got ${V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS.length}`
    );
  }

  for (const stage of STANDARD_PROJECT_STAGES) {
    const hasStageModule = V20260629_WORKSPACE_BLUE_MODULES.some(
      (module) => module.stageKey === stage.stageKey
    );
    if (!hasStageModule) {
      throw new Error(`Missing v20260629 blue module config for stage ${stage.stageKey}`);
    }
  }

  const mappedOutputCodes = new Set();
  for (const module of V20260629_WORKSPACE_BLUE_MODULES) {
    for (const outputCode of module.outputCodes) {
      if (!outputsByCode.has(outputCode)) {
        throw new Error(`Unknown v20260629 module output code: ${outputCode}`);
      }
      mappedOutputCodes.add(outputCode);
    }
  }

  for (const output of V20260629_TARGET_TEMPLATE_OUTPUTS) {
    if (!mappedOutputCodes.has(output.targetOutputCode)) {
      throw new Error(`Unmapped v20260629 target output: ${output.targetOutputCode}`);
    }
  }
  for (const output of V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS) {
    if (!output.workspaceCompatibility || !output.legacyDocumentCode) {
      throw new Error(`Invalid v20260629 workspace compatibility output: ${output.targetOutputCode}`);
    }
    if (!mappedOutputCodes.has(output.targetOutputCode)) {
      throw new Error(`Unmapped v20260629 workspace compatibility output: ${output.targetOutputCode}`);
    }
  }
}

assertV20260629TargetTemplate();

export function getV20260629TargetOutputByCode(targetOutputCode) {
  return outputsByCode.get(targetOutputCode) || null;
}

export function getV20260629WorkspaceShellConfig() {
  return {
    templateVersion: V20260629_TARGET_TEMPLATE_VERSION,
    metadata: V20260629_TEMPLATE_SWITCH_METADATA,
    stages: STANDARD_PROJECT_STAGES.map((stage) => ({
      ...stage,
      modules: V20260629_WORKSPACE_BLUE_MODULES.filter((module) => module.stageKey === stage.stageKey)
    })),
    outputs: V20260629_TARGET_TEMPLATE_OUTPUTS,
    compatibilityOutputs: V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS
  };
}
