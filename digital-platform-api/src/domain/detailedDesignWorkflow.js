import {
  BUSINESS_DEPARTMENT,
  canBeResponsibleUser,
  isCenterManagerOf,
  isGeneralManagerUser,
  isSystemAdminUser,
  isValidBusinessDepartment
} from './organization.js';

export const DETAILED_DESIGN_STAGE = {
  STAGE_ORDER: 4,
  STAGE_KEY: 'detailedDesign',
  STAGE_NAME: '详细设计阶段'
};

export const DETAILED_DESIGN_NODE_KEY = {
  PROJECT_KICKOFF_MEETING: 'project_kickoff_meeting',
  DETAILED_DESIGN_PREPARATION: 'detailed_design_preparation',
  DETAILED_DESIGN: 'detailed_design',
  INTERNAL_DESIGN_REVIEW: 'internal_design_review',
  CUSTOMER_DESIGN_REVIEW: 'customer_design_review',
  PRODUCT_PLAN_DRAWING: 'product_plan_drawing',
  PARTS_LIST: 'parts_list',
  DRAWING_REVIEW: 'drawing_review',
  CUSTOMER_DRAWING_COUNTERSIGN: 'customer_drawing_countersign'
};

export const DETAILED_DESIGN_NODE_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  PENDING_REVIEW: 'pending_review',
  WAITING_CHECKER: 'waiting_checker',
  WAITING_RD_APPROVAL: 'waiting_rd_approval',
  RETURNED: 'returned',
  APPROVED: 'approved'
};

export const DETAILED_DESIGN_UPLOAD_SLOT_KEY = {
  PROJECT_KICKOFF_BOOK: 'project_kickoff_book',
  DETAILED_DESIGN_WORK_PLAN: 'detailed_design_work_plan',
  THREE_D_MODEL: 'three_d_model',
  ELECTRICAL_SCHEMATIC: 'electrical_schematic',
  ELECTRICAL_WIRING_DIAGRAM: 'electrical_wiring_diagram',
  ELECTRICAL_LAYOUT_DIAGRAM: 'electrical_layout_diagram',
  AUTOMATION_PROGRAM: 'automation_program',
  SOFTWARE_DEVELOPMENT_SPECIFICATION: 'software_development_specification',
  SOFTWARE_UI_DESIGN_PPT: 'software_ui_design_ppt',
  SOFTWARE_CODE: 'software_code',
  PRODUCT_PLAN_DRAWING: 'product_plan_drawing',
  PARTS_LIST: 'parts_list',
  CUSTOMER_DRAWING_COUNTERSIGN_SCAN: 'customer_drawing_countersign_scan'
};

export const DETAILED_DESIGN_UPLOAD_SLOT_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  SUBMITTED: 'submitted',
  RETURNED: 'returned',
  APPROVED: 'approved'
};

export const DETAILED_DESIGN_MAIN_FILE_UPLOAD_SLOT_KEYS = new Set([
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_SCHEMATIC,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_LAYOUT_DIAGRAM,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.AUTOMATION_PROGRAM,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_DEVELOPMENT_SPECIFICATION,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_UI_DESIGN_PPT,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_CODE
]);

export const DETAILED_DESIGN_REVIEW_TYPE = {
  INTERNAL: 'internal',
  CUSTOMER: 'customer'
};

export const DETAILED_DESIGN_REVIEW_FORM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

export const DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS = {
  NOT_STARTED: 'not_started',
  GENERATING: 'generating',
  GENERATED: 'generated',
  FAILED: 'failed'
};

export const DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  RETURNED: 'returned'
};

export const DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  RETURNED: 'returned'
};

export const DETAILED_DESIGN_ROLE_KEY = {
  PROJECT_MANAGER: 'project_manager',
  BUSINESS_OWNER: 'business_owner',
  TECHNICAL_OWNER: 'technical_owner',
  PROCUREMENT_OWNER: 'procurement_owner',
  FINANCE_ACCOUNTANT: 'finance_accountant',
  DRAWING_REVIEW_OWNER: 'drawing_review_owner',
  PROFESSIONAL_GROUP_MEMBER: 'professional_group_member'
};

export const DETAILED_DESIGN_ROLE_DEFINITIONS = [
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER,
    label: '项目经理',
    columnName: 'project_manager_user_id',
    fallbackProjectField: 'project_manager_user_id',
    source: 'workflow_assignment'
  },
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER,
    label: '商务负责人',
    columnName: 'business_owner_user_id',
    fallbackProjectField: 'business_responsible_user_id',
    source: 'workflow_assignment'
  },
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    label: '技术负责人',
    columnName: 'technical_owner_user_id',
    fallbackProjectField: 'technical_responsible_user_id',
    source: 'workflow_assignment'
  },
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.PROCUREMENT_OWNER,
    label: '采购负责人',
    columnName: 'procurement_owner_user_id',
    fallbackProjectField: null,
    source: 'workflow_assignment'
  },
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT,
    label: '财务会计',
    columnName: 'finance_accountant_user_id',
    fallbackProjectField: null,
    source: 'workflow_assignment'
  },
  {
    roleKey: DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER,
    label: '图纸审查负责人',
    columnName: 'drawing_review_owner_user_id',
    fallbackProjectField: null,
    source: 'workflow_assignment'
  }
];

export const DETAILED_DESIGN_UPLOAD_SLOTS = [
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
    slotName: '项目启动书',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    slotOrder: 1,
    requiredRoleKey: null,
    documentCode: 'C25'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
    slotName: '详细设计工作计划',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    slotOrder: 2,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER,
    documentCode: 'C26'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    slotName: '3D模型（详细设计）',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 3,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C27'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_SCHEMATIC,
    slotName: '电气原理图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 4,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C28'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM,
    slotName: '电气接线图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 5,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C29'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_LAYOUT_DIAGRAM,
    slotName: '电气布置图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 6,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C30'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.AUTOMATION_PROGRAM,
    slotName: '自动化程序',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 7,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C32'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_DEVELOPMENT_SPECIFICATION,
    slotName: '软件开发说明文档',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 8,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C33'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_UI_DESIGN_PPT,
    slotName: '软件 UI 界面设计 PPT',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 9,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C34'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.SOFTWARE_CODE,
    slotName: '软件代码',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    slotOrder: 10,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C35'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    slotName: '产品平面图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    slotOrder: 11,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C38'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    slotName: '产品零部件清单',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    slotOrder: 12,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER,
    documentCode: 'C39'
  },
  {
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
    slotName: '客户会签图纸扫描件',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    slotOrder: 13,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER,
    documentCode: 'C41'
  }
];

export const DETAILED_DESIGN_NODES = [
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    nodeName: '项目启动会',
    nodeOrder: 1,
    documentCode: 'C25',
    requiredRoleKey: null
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    nodeName: '详细设计准备',
    nodeOrder: 2,
    documentCode: 'C26',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    nodeName: '详细设计',
    nodeOrder: 3,
    documentCode: null,
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    nodeName: '内部设计评审',
    nodeOrder: 4,
    documentCode: 'C36',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    nodeName: '客户设计评审',
    nodeOrder: 5,
    documentCode: 'C37',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    nodeName: '绘制产品平面图',
    nodeOrder: 6,
    documentCode: 'C38',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    nodeName: '编写零部件清单',
    nodeOrder: 7,
    documentCode: 'C39',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    nodeName: '内部图纸审查',
    nodeOrder: 8,
    documentCode: 'C40',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    nodeName: '客户图纸会签',
    nodeOrder: 9,
    documentCode: 'C41',
    requiredRoleKey: DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER
  }
];

const DETAILED_DESIGN_REVIEW_FORM_REQUIRED_FIELD_KEYS = Object.freeze([
  'meetingDate',
  'designGoalAchievement',
  'designRiskAssessment',
  'designOptimizationSuggestions',
  'implementationPlanItems',
  'reviewConclusion'
]);

const DETAILED_DESIGN_REVIEW_FORM_TEMPLATE_MAPPINGS = Object.freeze([
  { target: 'A2', value: '项目名称', label: '项目名称标签' },
  { target: 'B2', source: 'project.projectName', label: '项目名称', required: true },
  { target: 'D2', value: '客户名称', label: '客户名称标签' },
  { target: 'E2', source: 'project.customerName', label: '客户名称' },
  { target: 'A3', value: '评审类型', label: '评审类型标签' },
  { target: 'B3', source: 'context.reviewRoundLabel', label: '评审轮次', textFont: '宋体' },
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
  { target: 'A9', value: '设计目标达成', label: '设计目标达成标签' },
  {
    source: 'form.designGoalAchievement',
    label: '设计目标达成',
    required: true,
    repeatRows: { column: 'B', startRow: 9, endRow: 12 },
    textFont: '宋体'
  },
  { target: 'A13', value: '设计风险评估', label: '设计风险评估标签' },
  {
    source: 'form.designRiskAssessment',
    label: '设计风险评估',
    required: true,
    repeatRows: { column: 'B', startRow: 13, endRow: 17 },
    textFont: '宋体'
  },
  { target: 'A18', value: '设计优化建议', label: '设计优化建议标签' },
  {
    source: 'form.designOptimizationSuggestions',
    label: '设计优化建议',
    required: true,
    repeatRows: { column: 'B', startRow: 18, endRow: 29 },
    textFont: '宋体'
  },
  { target: 'A30', value: '设计实施计划', label: '设计实施计划标签' },
  {
    source: 'form.implementationPlanSummary',
    label: '设计实施计划',
    required: true,
    repeatRows: { column: 'B', startRow: 30, endRow: 38 },
    textFont: '宋体'
  },
  { target: 'A39', value: '其他补充内容', label: '其他补充内容标签' },
  { target: 'B39', source: 'form.reviewConclusion', label: '评审结论', required: true },
  { target: 'A42', source: 'context.recorderLabel', label: '记录人', textFont: '宋体' }
]);

export const DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS = [
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    reviewType: DETAILED_DESIGN_REVIEW_TYPE.INTERNAL,
    documentCode: 'C36',
    documentName: '设计评审记录表（内部设计评审）',
    formName: '设计评审记录表（内部设计评审）',
    templateKey: 'detailed_design_review_record_xlsx',
    templateName: '设计评审记录表-模板.xlsx',
    generatedFileNamePrefix: '设计评审记录表-内部设计评审',
    requiredFieldKeys: DETAILED_DESIGN_REVIEW_FORM_REQUIRED_FIELD_KEYS,
    templateMappings: DETAILED_DESIGN_REVIEW_FORM_TEMPLATE_MAPPINGS
  },
  {
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    reviewType: DETAILED_DESIGN_REVIEW_TYPE.CUSTOMER,
    documentCode: 'C37',
    documentName: '设计评审记录表（客户设计评审）',
    formName: '设计评审记录表（客户设计评审）',
    templateKey: 'detailed_design_review_record_xlsx',
    templateName: '设计评审记录表-模板.xlsx',
    generatedFileNamePrefix: '设计评审记录表-客户设计评审',
    requiredFieldKeys: DETAILED_DESIGN_REVIEW_FORM_REQUIRED_FIELD_KEYS,
    templateMappings: DETAILED_DESIGN_REVIEW_FORM_TEMPLATE_MAPPINGS
  }
];

export const DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT = Object.freeze({
  documentCode: 'C40',
  documentName: '图纸审查记录',
  legacyDocumentCode: '4.16',
  nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
  compatibilityType: 'conditional_history'
});

export const DETAILED_DESIGN_DOCUMENT_COMPATIBILITY_MAPPINGS = [
  {
    documentCode: 'C25',
    legacyDocumentCode: '4.1',
    documentName: '项目启动书',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C26',
    legacyDocumentCode: '4.2',
    documentName: '详细设计工作计划',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C27',
    legacyDocumentCode: '4.3',
    documentName: '3D模型（详细设计）',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C28',
    legacyDocumentCode: '4.4',
    documentName: '电气原理图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C29',
    legacyDocumentCode: '4.5',
    documentName: '电气接线图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C30',
    legacyDocumentCode: '4.6',
    documentName: '电气布置图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C31',
    legacyDocumentCode: '4.7',
    documentName: '控制逻辑流程图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'compatibility_only'
  },
  {
    documentCode: 'C32',
    legacyDocumentCode: '4.8',
    documentName: '自动化程序',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C33',
    legacyDocumentCode: '4.9',
    documentName: '软件开发说明文档',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C34',
    legacyDocumentCode: '4.10',
    documentName: '软件 UI 界面设计 PPT',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C35',
    legacyDocumentCode: '4.11',
    documentName: '软件代码',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C36',
    legacyDocumentCode: '4.12',
    documentName: '设计评审记录表（内部设计评审）',
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C37',
    legacyDocumentCode: '4.13',
    documentName: '设计评审记录表（客户设计评审）',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C38',
    legacyDocumentCode: '4.14',
    documentName: '产品平面图',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    compatibilityType: 'workflow_output'
  },
  {
    documentCode: 'C39',
    legacyDocumentCode: '4.15',
    documentName: '产品零部件清单',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    compatibilityType: 'workflow_output'
  },
  DETAILED_DESIGN_DRAWING_REVIEW_RECORD_DOCUMENT,
  {
    documentCode: 'C41',
    legacyDocumentCode: '4.17',
    documentName: '客户会签图纸扫描件',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    compatibilityType: 'workflow_output'
  }
];

export const DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES = new Set(
  DETAILED_DESIGN_DOCUMENT_COMPATIBILITY_MAPPINGS
    .filter((mapping) => mapping.compatibilityType !== 'compatibility_only')
    .map((mapping) => mapping.documentCode)
);

export const DETAILED_DESIGN_COMPATIBILITY_ONLY_DOCUMENT_CODES = new Set(
  DETAILED_DESIGN_DOCUMENT_COMPATIBILITY_MAPPINGS
    .filter((mapping) => mapping.compatibilityType === 'compatibility_only')
    .map((mapping) => mapping.documentCode)
);

export const DETAILED_DESIGN_COMPATIBILITY_DOCUMENT_CODES = new Set(
  DETAILED_DESIGN_DOCUMENT_COMPATIBILITY_MAPPINGS.map((mapping) => mapping.documentCode)
);

export const DETAILED_DESIGN_ERROR = {
  FORBIDDEN: 'DETAILED_DESIGN_FORBIDDEN',
  PROJECT_ENDED: 'DETAILED_DESIGN_PROJECT_ENDED',
  NOT_IN_STAGE: 'DETAILED_DESIGN_NOT_IN_STAGE',
  INVALID_NODE: 'DETAILED_DESIGN_INVALID_NODE',
  NODE_NOT_PROCESSABLE: 'DETAILED_DESIGN_NODE_NOT_PROCESSABLE',
  INVALID_UPLOAD_SLOT: 'DETAILED_DESIGN_INVALID_UPLOAD_SLOT',
  UPLOAD_SLOT_NOT_PROCESSABLE: 'DETAILED_DESIGN_UPLOAD_SLOT_NOT_PROCESSABLE',
  INVALID_UPLOAD_FILE: 'DETAILED_DESIGN_INVALID_UPLOAD_FILE',
  UPLOAD_FILE_NOT_FOUND: 'DETAILED_DESIGN_UPLOAD_FILE_NOT_FOUND',
  INVALID_REVIEW_FORM: 'DETAILED_DESIGN_INVALID_REVIEW_FORM',
  REVIEW_FORM_NOT_FOUND: 'DETAILED_DESIGN_REVIEW_FORM_NOT_FOUND',
  FORM_REQUIRED_FIELDS_MISSING: 'DETAILED_DESIGN_FORM_REQUIRED_FIELDS_MISSING',
  GENERATED_FILE_NOT_FOUND: 'DETAILED_DESIGN_GENERATED_FILE_NOT_FOUND',
  GENERATED_FILE_MISSING: 'DETAILED_DESIGN_GENERATED_FILE_MISSING',
  RETURN_REASON_REQUIRED: 'DETAILED_DESIGN_RETURN_REASON_REQUIRED',
  DRAWING_REVIEW_RECORD_REQUIRED: 'DETAILED_DESIGN_DRAWING_REVIEW_RECORD_REQUIRED',
  DRAWING_REVIEW_RECORD_NOT_FOUND: 'DETAILED_DESIGN_DRAWING_REVIEW_RECORD_NOT_FOUND',
  INVALID_ROLE_USER: 'DETAILED_DESIGN_INVALID_ROLE_USER',
  ROLE_REQUIRED: 'DETAILED_DESIGN_ROLE_REQUIRED'
};

export class DetailedDesignWorkflowError extends Error {
  constructor(code, message, statusCode = 409, details = []) {
    super(message);
    this.name = 'DetailedDesignWorkflowError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function buildInitialDetailedDesignNodes() {
  return DETAILED_DESIGN_NODES.map((node, index) => ({
    ...node,
    status: index === 0 ? DETAILED_DESIGN_NODE_STATUS.PENDING : DETAILED_DESIGN_NODE_STATUS.NOT_STARTED
  }));
}

export function getDetailedDesignNodeDefinition(nodeKey) {
  return DETAILED_DESIGN_NODES.find((node) => node.nodeKey === nodeKey) || null;
}

export function getDetailedDesignUploadSlotDefinition(slotKey) {
  return Object.values(DETAILED_DESIGN_UPLOAD_SLOT_KEY).includes(slotKey)
    ? DETAILED_DESIGN_UPLOAD_SLOTS.find((slot) => slot.slotKey === slotKey) || null
    : null;
}

export function getDetailedDesignReviewFormDefinition(nodeKey) {
  return DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS.find((definition) => definition.nodeKey === nodeKey) || null;
}

export function isDetailedDesignProjectEnded(project) {
  return project?.status === 'ended';
}

export function hasReachedDetailedDesignStage(project) {
  const currentStageOrder = Number(project?.current_stage_order ?? project?.currentStage?.stageOrder ?? 0);
  return Number.isFinite(currentStageOrder) && currentStageOrder >= DETAILED_DESIGN_STAGE.STAGE_ORDER;
}

export function isProjectInDetailedDesignStage(project) {
  return (
    project?.current_stage_key === DETAILED_DESIGN_STAGE.STAGE_KEY ||
    project?.currentStage?.stageKey === DETAILED_DESIGN_STAGE.STAGE_KEY
  );
}

export function isDetailedDesignManufacturingCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.MANUFACTURING_CENTER);
}

export function isDetailedDesignRdCenterManager(user) {
  return isCenterManagerOf(user, BUSINESS_DEPARTMENT.RD_CENTER);
}

export function isDetailedDesignProjectManager(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER].userId) === String(user?.id);
}

export function isDetailedDesignBusinessOwner(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER].userId) === String(user?.id);
}

export function isDetailedDesignTechnicalOwner(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER].userId) === String(user?.id);
}

export function isDetailedDesignProcurementOwner(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.PROCUREMENT_OWNER]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.PROCUREMENT_OWNER].userId) === String(user?.id);
}

export function isDetailedDesignFinanceAccountant(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT].userId) === String(user?.id);
}

export function isDetailedDesignDrawingReviewOwner(roleState, user) {
  return Boolean(roleState?.[DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER]?.userId) &&
    String(roleState[DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER].userId) === String(user?.id);
}

export function canViewDetailedDesignWorkflow(user) {
  return Boolean(user?.id);
}

export function canAssignDetailedDesignRoles(user) {
  return isDetailedDesignRdCenterManager(user);
}

function getDetailedDesignDocumentCode(documentOrCode) {
  if (typeof documentOrCode === 'string') {
    return documentOrCode.trim();
  }

  return String(documentOrCode?.documentCode ?? documentOrCode?.document_code ?? '').trim();
}

export function isDetailedDesignWorkflowDocument(documentOrCode) {
  return DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has(getDetailedDesignDocumentCode(documentOrCode));
}

export function buildDetailedDesignRoleState({ projectRow = null, rolesRow = null, usersById = new Map() } = {}) {
  const projectReferenceUserIds = {
    [DETAILED_DESIGN_ROLE_KEY.PROJECT_MANAGER]: projectRow?.project_manager_user_id ?? null,
    [DETAILED_DESIGN_ROLE_KEY.BUSINESS_OWNER]: projectRow?.business_responsible_user_id ?? null,
    [DETAILED_DESIGN_ROLE_KEY.TECHNICAL_OWNER]: projectRow?.technical_responsible_user_id ?? null,
    [DETAILED_DESIGN_ROLE_KEY.PROCUREMENT_OWNER]: null,
    [DETAILED_DESIGN_ROLE_KEY.FINANCE_ACCOUNTANT]: null,
    [DETAILED_DESIGN_ROLE_KEY.DRAWING_REVIEW_OWNER]: null
  };

  return Object.fromEntries(
    DETAILED_DESIGN_ROLE_DEFINITIONS.map((definition) => {
      const rawUserId = rolesRow?.[definition.columnName] ?? null;
      const userId = rawUserId === null || rawUserId === undefined ? null : Number(rawUserId);
      const rawProjectReferenceUserId = projectReferenceUserIds[definition.roleKey] ?? null;
      const projectReferenceUserId =
        rawProjectReferenceUserId === null || rawProjectReferenceUserId === undefined
          ? null
          : Number(rawProjectReferenceUserId);
      return [
        definition.roleKey,
        {
          roleKey: definition.roleKey,
          label: definition.label,
          userId: Number.isFinite(userId) ? userId : null,
          user: Number.isFinite(userId) ? usersById.get(Number(userId)) || null : null,
          source: definition.source,
          projectReferenceUserId: Number.isFinite(projectReferenceUserId) ? projectReferenceUserId : null,
          projectReferenceUser: Number.isFinite(projectReferenceUserId)
            ? usersById.get(Number(projectReferenceUserId)) || null
            : null,
          projectReferenceField: definition.fallbackProjectField
        }
      ];
    })
  );
}

export function buildDetailedDesignProfessionalGroupMemberState(members = [], usersById = new Map()) {
  return members.map((member) => ({
    projectId: member.project_id,
    userId: Number(member.user_id),
    user: usersById.get(Number(member.user_id)) || null,
    assignedByUserId: member.assigned_by_user_id ?? null,
    assignedAt: member.assigned_at ?? null,
    isActive: Boolean(member.is_active)
  }));
}

export function buildInitialDetailedDesignReviewForms() {
  return DETAILED_DESIGN_REVIEW_FORM_DEFINITIONS.map((definition) => ({
    nodeKey: definition.nodeKey,
    reviewType: definition.reviewType,
    documentCode: definition.documentCode,
    documentName: definition.documentName,
    formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT,
    revision: 1,
    status: 'not_started',
    formData: {},
    generatedFileStatus: DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.NOT_STARTED,
    generatedFile: null,
    reviewStatus: 'pending',
    reviewer: null,
    returnReason: null,
    permissions: {}
  }));
}

export function buildInitialDetailedDesignDrawingReview() {
  return {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    checkerStatus: DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.PENDING,
    rdApprovalStatus: DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING,
    currentRevision: 1,
    productPlanDrawingRevision: 1,
    partsListRevision: 1,
    recordHistory: [],
    downloadableFiles: [],
    blockingReasons: [],
    permissions: {}
  };
}

export { BUSINESS_DEPARTMENT, canBeResponsibleUser, isGeneralManagerUser, isSystemAdminUser, isValidBusinessDepartment };
