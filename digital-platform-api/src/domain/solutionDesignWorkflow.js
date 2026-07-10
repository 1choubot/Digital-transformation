import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  canBeProjectManagerUser,
  canBeResponsibleUser,
  isCenterManagerUser,
  isGeneralManagerUser,
  isValidBusinessDepartment
} from './organization.js';

export const SOLUTION_DESIGN_STAGE = {
  STAGE_ORDER: 2,
  STAGE_KEY: 'solution',
  STAGE_NAME: '方案设计阶段'
};

export const SOLUTION_DESIGN_NODE_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  PENDING_REVIEW: 'pending_review',
  PENDING_GENERAL_REVIEW: 'pending_general_review',
  RETURNED: 'returned',
  APPROVED: 'approved',
  SKIPPED: 'skipped',
  ENDED: 'ended'
};

export const SOLUTION_DESIGN_NODE_KEY = {
  PREPARATION: 'solution_preparation',
  ANALYSIS: 'solution_analysis',
  DESIGN: 'solution_design',
  INTERNAL_REVIEW: 'internal_solution_review',
  CUSTOMER_REVIEW: 'customer_solution_review',
  RD_COST: 'rd_cost_estimation',
  MANUFACTURING_COST: 'manufacturing_cost_estimation',
  FINANCE_COST: 'finance_cost_estimation',
  QUOTATION_OR_TENDER: 'quotation_or_tender'
};

export const SOLUTION_DESIGN_NODES = [
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION, nodeName: '方案设计准备', nodeOrder: 1 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS, nodeName: '项目方案分析', nodeOrder: 2 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN, nodeName: '方案设计', nodeOrder: 3 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, nodeName: '内部方案评审', nodeOrder: 4 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW, nodeName: '客户方案评审', nodeOrder: 5 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST, nodeName: '研发成本估算', nodeOrder: 6 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST, nodeName: '制造成本估算', nodeOrder: 7 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST, nodeName: '财务成本估算', nodeOrder: 8 },
  { nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER, nodeName: '报价/投标', nodeOrder: 9 }
];

export const SOLUTION_DESIGN_ROLE_KEY = {
  PROJECT_MANAGER: 'project_manager',
  TECHNICAL_OWNER: 'technical_owner',
  BUSINESS_OWNER: 'business_owner',
  PROCUREMENT_OWNER: 'procurement_owner',
  FINANCE_ACCOUNTANT: 'finance_accountant',
  FINANCE_OWNER: 'finance_owner'
};

export const SOLUTION_DESIGN_ROLE_DEFINITIONS = [
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER,
    label: '项目经理',
    requestField: 'projectManagerUserId'
  },
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    label: '技术负责人',
    requestField: 'technicalOwnerUserId',
    columnName: 'technical_owner_user_id',
    requiredDepartment: BUSINESS_DEPARTMENT.RD_CENTER
  },
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER,
    label: '商务负责人',
    requestField: 'businessOwnerUserId',
    columnName: 'business_owner_user_id',
    requiredDepartment: BUSINESS_DEPARTMENT.MARKETING_CENTER
  },
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.PROCUREMENT_OWNER,
    label: '采购负责人',
    requestField: 'procurementOwnerUserId',
    columnName: 'procurement_owner_user_id'
  },
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT,
    label: '财务会计',
    requestField: 'financeAccountantUserId',
    columnName: 'finance_accountant_user_id',
    requiredDepartment: BUSINESS_DEPARTMENT.OPERATIONS_CENTER
  },
  {
    roleKey: SOLUTION_DESIGN_ROLE_KEY.FINANCE_OWNER,
    label: '财务负责人',
    requestField: 'financeOwnerUserId',
    columnName: 'finance_owner_user_id',
    requiredDepartment: BUSINESS_DEPARTMENT.OPERATIONS_CENTER
  }
];

export const SOLUTION_DESIGN_STORED_ROLE_DEFINITIONS = SOLUTION_DESIGN_ROLE_DEFINITIONS.filter(
  (definition) => definition.roleKey !== SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER
);

export const SOLUTION_DESIGN_UPLOAD_SLOT_KEY = {
  WORK_PLAN: 'solution_work_plan',
  PRODUCT_FUNCTION_DIAGRAM: 'product_function_diagram',
  PROCESS_TIMING_DIAGRAM: 'process_timing_diagram',
  CYCLE_TIME_TABLE: 'cycle_time_table',
  LAYOUT_DIAGRAM: 'layout_diagram',
  THREE_D_MODEL: 'three_d_model',
  DEMO_ANIMATION: 'demo_animation',
  ELECTRICAL_FUNCTION_DIAGRAM: 'electrical_function_diagram',
  SOFTWARE_FUNCTION_DIAGRAM: 'software_function_diagram',
  SOLUTION_PPT: 'solution_ppt',
  RD_COST_ESTIMATION: 'rd_cost_estimation_file',
  MANUFACTURING_COST_ESTIMATION: 'manufacturing_cost_estimation_file',
  FINANCE_COST_ESTIMATION: 'finance_cost_estimation_file',
  QUOTATION_FILE: 'quotation_file',
  TENDER_BUSINESS_FILE: 'tender_business_file',
  TENDER_TECHNICAL_FILE: 'tender_technical_file'
};

export const SOLUTION_DESIGN_UPLOAD_SLOT_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  SUBMITTED: 'submitted'
};

export const SOLUTION_DESIGN_ANALYSIS_FORM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

export const SOLUTION_DESIGN_REVIEW_FORM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

export const SOLUTION_DESIGN_REVIEW_TYPE = {
  INTERNAL: 'internal',
  CUSTOMER: 'customer'
};

export const SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE = {
  QUOTATION: 'quotation',
  TENDER: 'tender'
};

export const SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS = {
  SELECTED: 'selected',
  SUBMITTED: 'submitted',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  RETURNED: 'returned',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ENDED: 'ended'
};

export const SOLUTION_DESIGN_QUOTATION_RESULT = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

export const SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION = {
  RETURN_TO_RD_COST: 'return_to_rd_cost',
  END_PROJECT: 'end_project'
};

export const SOLUTION_DESIGN_GENERATED_FILE_STATUS = {
  NOT_STARTED: 'not_started',
  GENERATING: 'generating',
  GENERATED: 'generated',
  FAILED: 'failed'
};

export const SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION = {
  nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
  documentCode: 'C05',
  formName: '项目方案分析表',
  templateName: '项目方案分析表-模板.xlsx',
  generatedFileNamePrefix: '项目方案分析表',
  templateMappings: [
    { target: 'A1', source: 'definition.formName', label: '表单名称', required: true },
    { target: 'A2', value: '项目编号', label: '项目编号标签' },
    { target: 'B2', source: 'project.projectCode', label: '项目编号' },
    { target: 'C2', value: '项目名称', label: '项目名称标签' },
    { target: 'E2', source: 'project.projectName', label: '项目名称', required: true },
    { target: 'B12', source: 'form.customerRequirements', label: '客户需求', required: true },
    { target: 'B17', source: 'form.technicalRisks', label: '技术风险', required: true },
    { target: 'B27', source: 'form.solutionScope', label: '方案范围', required: true }
  ],
  unmappedFields: [
    '模板中的环境要求、场地情况、工件描述、作业工艺、目标拆分字段尚未完成逐项字段确认；当前仅映射已确认的 customerRequirements、solutionScope、technicalRisks 及项目/节点上下文。'
  ]
};

export const SOLUTION_DESIGN_UPLOAD_SLOTS = [
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
    slotName: '方案设计工作计划',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
    slotOrder: 1,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
    slotName: '产品功能框图',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    slotOrder: 2,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM,
    slotName: '工艺时序图',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 3,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.CYCLE_TIME_TABLE,
    slotName: '节拍表',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 4,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.LAYOUT_DIAGRAM,
    slotName: '布局图',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 5,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    slotName: '3D模型',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 6,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.DEMO_ANIMATION,
    slotName: '演示动画',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 7,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_FUNCTION_DIAGRAM,
    slotName: '电气功能框图',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 8,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_FUNCTION_DIAGRAM,
    slotName: '软件功能框图',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 9,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.SOLUTION_PPT,
    slotName: '项目方案PPT',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
    slotOrder: 10,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
    slotName: '研发中心成本估算表',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
    slotOrder: 11,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
    slotName: '制造中心成本估算表',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
    slotOrder: 12,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.PROCUREMENT_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
    slotName: '运营中心/财务成本估算表',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
    slotOrder: 13,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
    slotName: '报价单',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
    slotOrder: 14,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
    slotName: '投标商务标',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
    slotOrder: 15,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.BUSINESS_OWNER
  },
  {
    slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
    slotName: '投标技术标',
    nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
    slotOrder: 16,
    requiredRoleKey: SOLUTION_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  }
];

export const SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS = SOLUTION_DESIGN_UPLOAD_SLOTS
  .filter((slot) => slot.nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN)
  .map((slot) => slot.slotKey);

export const SOLUTION_DESIGN_COST_UPLOAD_SLOT_KEYS = [
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION
];

export const SOLUTION_DESIGN_COST_UPLOAD_SLOT_BY_NODE_KEY = {
  [SOLUTION_DESIGN_NODE_KEY.RD_COST]: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
  [SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST]: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
  [SOLUTION_DESIGN_NODE_KEY.FINANCE_COST]: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION
};

export const SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS = [
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE
];

export const SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES = Object.freeze([
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
  'C10',
  'C11',
  'C12',
  'C13',
  'C14',
  'C15',
  'C16',
  'C17',
  'C18',
  'C19'
]);

export const SOLUTION_DESIGN_REVIEW_FORM_DEFINITIONS = [
  {
    nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
    reviewType: SOLUTION_DESIGN_REVIEW_TYPE.INTERNAL,
    documentCode: 'C15',
    formName: '方案评审记录表（内部方案评审）',
    templateName: '方案评审记录表-模板.xlsx',
    generatedFileNamePrefix: '方案评审记录表-内部方案评审',
    templateMappings: [
      { target: 'A2', value: '项目名称', label: '项目名称标签' },
      { target: 'B2', source: 'project.projectName', label: '项目名称', required: true },
      { target: 'D2', value: '客户名称', label: '客户名称标签' },
      { target: 'E2', source: 'project.customerName', label: '客户名称' },
      { target: 'A3', value: '评审类型', label: '评审类型标签' },
      { target: 'B3', source: 'context.reviewRoundLabel', label: '评审轮次' },
      { target: 'A4', value: '项目经理', label: '项目经理标签' },
      { target: 'B4', source: 'roles.projectManagerName', label: '项目经理' },
      { target: 'C4', value: '技术负责人', label: '技术负责人标签' },
      { target: 'D4', source: 'roles.technicalOwnerName', label: '技术负责人' },
      { target: 'F4', value: '主讲人', label: '主讲人标签' },
      { target: 'G4', source: 'form.presenter', label: '主讲人' },
      { target: 'A5', value: '评审地点', label: '评审地点标签' },
      { target: 'B5', source: 'form.meetingLocation', label: '评审地点' },
      { target: 'F5', value: '评审时间', label: '评审时间标签' },
      { target: 'G5', source: 'form.meetingDate', label: '评审时间', required: true },
      { target: 'A6', value: '我方参与人员', label: '我方参与人员标签' },
      { target: 'B6', source: 'form.internalParticipants', label: '我方参与人员' },
      { target: 'A7', value: '甲方参与人员', label: '甲方参与人员标签' },
      { target: 'B7', source: 'form.customerParticipants', label: '甲方参与人员' },
      { target: 'A9', value: '项目需求分析', label: '项目需求分析标签' },
      { target: 'B9', source: 'form.customerRequirements', label: '项目需求分析' },
      { target: 'A12', value: '项目目标描述', label: '项目目标描述标签' },
      {
        source: 'form.projectTargetDescription',
        label: '项目目标描述',
        repeatRows: { column: 'B', startRow: 12, endRow: 14 }
      },
      { target: 'A15', value: '项目风险评估', label: '项目风险评估标签' },
      {
        source: 'form.technicalRisks',
        label: '项目风险评估',
        repeatRows: { column: 'B', startRow: 15, endRow: 17 }
      },
      { target: 'A18', value: '项目方案建议', label: '项目方案建议标签' },
      {
        source: 'form.solutionSuggestions',
        label: '项目方案建议',
        repeatRows: { column: 'B', startRow: 18, endRow: 29 }
      },
      { target: 'A30', value: '项目实施计划', label: '项目实施计划标签' },
      {
        source: 'form.actionItems',
        label: '项目实施计划',
        required: true,
        repeatRows: { column: 'B', startRow: 30, endRow: 38 }
      },
      { target: 'A39', value: '其他补充内容', label: '其他补充内容标签' },
      { target: 'B39', source: 'form.reviewConclusion', label: '评审结论', required: true },
      { target: 'A42', value: '记录人：', label: '记录人标签' },
      { target: 'B42', source: 'context.recorderName', label: '记录人' }
    ],
    unmappedFields: [
      '方案评审记录表已映射项目目标描述、项目风险评估、项目方案建议、项目实施计划、其他补充内容等当前确认字段；后续如模板字段口径继续细化，可在不改变 C15/C16 独立语义的前提下补充扩展。'
    ]
  },
  {
    nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
    reviewType: SOLUTION_DESIGN_REVIEW_TYPE.CUSTOMER,
    documentCode: 'C16',
    formName: '方案评审记录表（客户方案评审）',
    templateName: '方案评审记录表-模板.xlsx',
    generatedFileNamePrefix: '方案评审记录表-客户方案评审',
    templateMappings: [
      { target: 'A2', value: '项目名称', label: '项目名称标签' },
      { target: 'B2', source: 'project.projectName', label: '项目名称', required: true },
      { target: 'D2', value: '客户名称', label: '客户名称标签' },
      { target: 'E2', source: 'project.customerName', label: '客户名称' },
      { target: 'A3', value: '评审类型', label: '评审类型标签' },
      { target: 'B3', source: 'context.reviewRoundLabel', label: '评审轮次' },
      { target: 'A4', value: '项目经理', label: '项目经理标签' },
      { target: 'B4', source: 'roles.projectManagerName', label: '项目经理' },
      { target: 'C4', value: '技术负责人', label: '技术负责人标签' },
      { target: 'D4', source: 'roles.technicalOwnerName', label: '技术负责人' },
      { target: 'F4', value: '主讲人', label: '主讲人标签' },
      { target: 'G4', source: 'form.presenter', label: '主讲人' },
      { target: 'A5', value: '评审地点', label: '评审地点标签' },
      { target: 'B5', source: 'form.meetingLocation', label: '评审地点' },
      { target: 'F5', value: '评审时间', label: '评审时间标签' },
      { target: 'G5', source: 'form.meetingDate', label: '评审时间', required: true },
      { target: 'A6', value: '我方参与人员', label: '我方参与人员标签' },
      { target: 'B6', source: 'form.internalParticipants', label: '我方参与人员' },
      { target: 'A7', value: '甲方参与人员', label: '甲方参与人员标签' },
      { target: 'B7', source: 'form.customerParticipants', label: '甲方参与人员' },
      { target: 'A9', value: '项目需求分析', label: '项目需求分析标签' },
      { target: 'B9', source: 'form.customerRequirements', label: '项目需求分析' },
      { target: 'A12', value: '项目目标描述', label: '项目目标描述标签' },
      {
        source: 'form.projectTargetDescription',
        label: '项目目标描述',
        repeatRows: { column: 'B', startRow: 12, endRow: 14 }
      },
      { target: 'A15', value: '项目风险评估', label: '项目风险评估标签' },
      {
        source: 'form.technicalRisks',
        label: '项目风险评估',
        repeatRows: { column: 'B', startRow: 15, endRow: 17 }
      },
      { target: 'A18', value: '项目方案建议', label: '项目方案建议标签' },
      {
        source: 'form.solutionSuggestions',
        label: '项目方案建议',
        repeatRows: { column: 'B', startRow: 18, endRow: 29 }
      },
      { target: 'A30', value: '项目实施计划', label: '项目实施计划标签' },
      {
        source: 'form.actionItems',
        label: '项目实施计划',
        required: true,
        repeatRows: { column: 'B', startRow: 30, endRow: 38 }
      },
      { target: 'A39', value: '其他补充内容', label: '其他补充内容标签' },
      { target: 'B39', source: 'form.reviewConclusion', label: '评审结论', required: true },
      { target: 'A42', value: '记录人：', label: '记录人标签' },
      { target: 'B42', source: 'context.recorderName', label: '记录人' }
    ],
    unmappedFields: [
      '方案评审记录表已映射项目目标描述、项目风险评估、项目方案建议、项目实施计划、其他补充内容等当前确认字段；后续如模板字段口径继续细化，可在不改变 C15/C16 独立语义的前提下补充扩展。'
    ]
  }
];

export const SOLUTION_DESIGN_ERROR = {
  FORBIDDEN: 'SOLUTION_DESIGN_FORBIDDEN',
  PROJECT_ENDED: 'SOLUTION_DESIGN_PROJECT_ENDED',
  INVALID_ROLE_USER: 'SOLUTION_DESIGN_INVALID_ROLE_USER',
  PROJECT_MANAGER_INVALID: 'SOLUTION_DESIGN_PROJECT_MANAGER_INVALID',
  NOT_IN_STAGE: 'SOLUTION_DESIGN_NOT_IN_STAGE',
  ROLE_REQUIRED: 'SOLUTION_DESIGN_ROLE_REQUIRED',
  INVALID_UPLOAD_SLOT: 'SOLUTION_DESIGN_INVALID_UPLOAD_SLOT',
  INVALID_NODE: 'SOLUTION_DESIGN_INVALID_NODE',
  INVALID_UPLOAD_FILE: 'SOLUTION_DESIGN_INVALID_UPLOAD_FILE',
  UPLOAD_FILE_NOT_FOUND: 'SOLUTION_DESIGN_UPLOAD_FILE_NOT_FOUND',
  CONFIDENTIAL_FILE_FORBIDDEN: 'SOLUTION_DESIGN_CONFIDENTIAL_FILE_FORBIDDEN',
  INVALID_ANALYSIS_FORM: 'SOLUTION_DESIGN_INVALID_ANALYSIS_FORM',
  INVALID_REVIEW_FORM: 'SOLUTION_DESIGN_INVALID_REVIEW_FORM',
  GENERATED_FILE_NOT_FOUND: 'SOLUTION_DESIGN_GENERATED_FILE_NOT_FOUND',
  GENERATED_FILE_MISSING: 'SOLUTION_DESIGN_GENERATED_FILE_MISSING',
  INVALID_QUOTATION_TENDER_BRANCH: 'SOLUTION_DESIGN_INVALID_QUOTATION_TENDER_BRANCH',
  INVALID_QUOTATION_RESULT: 'SOLUTION_DESIGN_INVALID_QUOTATION_RESULT',
  RETURN_REASON_REQUIRED: 'SOLUTION_DESIGN_RETURN_REASON_REQUIRED',
  NODE_NOT_SUBMITTABLE: 'SOLUTION_DESIGN_NODE_NOT_SUBMITTABLE',
  NODE_NOT_PROCESSABLE: 'SOLUTION_DESIGN_NODE_NOT_PROCESSABLE',
  NODE_BLOCKED: 'SOLUTION_DESIGN_NODE_BLOCKED'
};

export class SolutionDesignWorkflowError extends Error {
  constructor(code, message, statusCode = 409, details = []) {
    super(message);
    this.name = 'SolutionDesignWorkflowError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizePositiveUserId(value, fieldName) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.ROLE_REQUIRED,
      `${fieldName} is required`,
      400,
      [fieldName]
    );
  }

  if (!/^[1-9]\d*$/.test(text)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
      `${fieldName} is invalid`,
      400,
      [fieldName]
    );
  }

  const userId = Number(text);
  if (!Number.isSafeInteger(userId)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
      `${fieldName} is invalid`,
      400,
      [fieldName]
    );
  }

  return userId;
}

export function normalizeSolutionDesignRoleAssignmentPayload(payload = {}) {
  return Object.fromEntries(
    SOLUTION_DESIGN_ROLE_DEFINITIONS.map((definition) => [
      definition.requestField,
      normalizePositiveUserId(payload[definition.requestField], definition.requestField)
    ])
  );
}

export function canAssignSolutionDesignRoles(user) {
  return isCenterManagerUser(user) && user?.department === BUSINESS_DEPARTMENT.RD_CENTER;
}

export function canViewSolutionDesignWorkflow(user) {
  return Boolean(user?.id);
}

export function isSolutionDesignGeneralManager(user) {
  return isGeneralManagerUser(user);
}

export function isSolutionDesignProjectRoleUser(roleEntry, user) {
  return Boolean(roleEntry?.userId) && String(roleEntry.userId) === String(user?.id);
}

export function isSolutionDesignProjectEnded(project) {
  return project?.status === 'ended';
}

export function hasReachedSolutionDesignStage(project) {
  const currentStageOrder = Number(project?.current_stage_order ?? project?.currentStage?.stageOrder ?? 0);
  return Number.isFinite(currentStageOrder) && currentStageOrder >= SOLUTION_DESIGN_STAGE.STAGE_ORDER;
}

export function isProjectInSolutionDesignStage(project) {
  return (
    project?.current_stage_key === SOLUTION_DESIGN_STAGE.STAGE_KEY ||
    project?.currentStage?.stageKey === SOLUTION_DESIGN_STAGE.STAGE_KEY
  );
}

export function assertAssignableRoleUser(definition, user) {
  if (!user?.isEnabled || !canBeResponsibleUser(user)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
      `${definition.label} user is not an enabled business department user`,
      409,
      [definition.requestField]
    );
  }

  if (definition.roleKey === SOLUTION_DESIGN_ROLE_KEY.PROJECT_MANAGER) {
    if (!canBeProjectManagerUser(user)) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.PROJECT_MANAGER_INVALID,
        'Project manager user is not allowed',
        409,
        [definition.requestField]
      );
    }
    return;
  }

  if (definition.requiredDepartment && user.department !== definition.requiredDepartment) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
      `${definition.label} user department is not allowed`,
      409,
      [definition.requestField, definition.requiredDepartment]
    );
  }

  if (!definition.requiredDepartment && !isValidBusinessDepartment(user.department)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER,
      `${definition.label} user department is not allowed`,
      409,
      [definition.requestField]
    );
  }
}

export function buildInitialSolutionDesignNodes() {
  return SOLUTION_DESIGN_NODES.map((node, index) => ({
    ...node,
    status: index === 0 ? SOLUTION_DESIGN_NODE_STATUS.PENDING : SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED
  }));
}

export function getSolutionDesignNodeDefinition(nodeKey) {
  return SOLUTION_DESIGN_NODES.find((node) => node.nodeKey === nodeKey) || null;
}

export function getSolutionDesignUploadSlotDefinition(slotKey) {
  return SOLUTION_DESIGN_UPLOAD_SLOTS.find((slot) => slot.slotKey === slotKey) || null;
}

export function getSolutionDesignReviewFormDefinition(nodeKey) {
  return SOLUTION_DESIGN_REVIEW_FORM_DEFINITIONS.find((definition) => definition.nodeKey === nodeKey) || null;
}

export function isSolutionDesignOutputUploadSlot(slotKey) {
  return SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.includes(slotKey);
}

function getSolutionDesignDocumentCode(documentOrCode) {
  if (typeof documentOrCode === 'string') {
    return documentOrCode.trim();
  }

  return String(documentOrCode?.documentCode ?? documentOrCode?.document_code ?? '').trim();
}

export function isSolutionDesignDedicatedDocument(documentOrCode) {
  return SOLUTION_DESIGN_DEDICATED_DOCUMENT_CODES.includes(getSolutionDesignDocumentCode(documentOrCode));
}

export { BUSINESS_DEPARTMENT, ORGANIZATION_ROLE };
