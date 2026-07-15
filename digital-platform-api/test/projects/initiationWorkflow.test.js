import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE
} from '../../src/domain/organization.js';
import { PROJECT_STATUS } from '../../src/domain/projects.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REVIEW_NODE_KEY,
  INITIATION_REVIEW_NODE_STATUS,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE
} from '../../src/domain/initiationReview.js';
import {
  COMPLETION_MODE,
  DOCUMENT_STATUS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT
} from '../../src/domain/stageDocumentTemplates.js';
import { STAGE_STATUS, STANDARD_PROJECT_STAGES } from '../../src/domain/stages.js';
import { DOCUMENT_STATUS_ACTION } from '../../src/domain/stageDocumentStatus.js';
import { pool } from '../../src/db/pool.js';
import {
  submitStageDocumentOnlineForm,
  getStageDocumentOnlineForm
} from '../../src/repositories/stageDocuments/onlineFormRepository.js';
import {
  approveInitiationReviewNode,
  returnInitiationReviewNode
} from '../../src/repositories/stageDocuments/initiationReviewRepository.js';
import { getMyWorkbench } from '../../src/repositories/stageDocuments/workbenchRepository.js';
import { OPERATION_ACTION_TYPE } from '../../src/repositories/operationLogRepository.js';

const PROJECT_ID = 9001;
const DOCUMENT_IDS = Object.freeze({
  REQUIREMENT: 1101,
  REVIEW: 1102,
  NOTICE: 1103
});

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function dbUser({
  id,
  account,
  displayName,
  department,
  organizationRole,
  role = '员工',
  isEnabled = 1
}) {
  return {
    id,
    account,
    display_name: displayName,
    department,
    organization_role: organizationRole,
    role,
    is_enabled: isEnabled,
    is_platform_admin: 0,
    file_platform_user_id: null
  };
}

function authUser(row) {
  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    displayName: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin)
  };
}

function buildUsers() {
  return new Map(
    [
      dbUser({
        id: 1,
        account: 'marketing_manager',
        displayName: '营销中心负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      dbUser({
        id: 2,
        account: 'rd_manager',
        displayName: '研发中心负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      dbUser({
        id: 3,
        account: 'general_manager',
        displayName: '总经理',
        department: null,
        organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER
      }),
      dbUser({
        id: 10,
        account: 'project_manager',
        displayName: '项目经理',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 11,
        account: 'requirement_owner',
        displayName: '需求责任人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 12,
        account: 'business_owner',
        displayName: '商务负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 13,
        account: 'technical_owner',
        displayName: '技术负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      })
    ].map((user) => [user.id, user])
  );
}

function buildProject() {
  return {
    id: PROJECT_ID,
    project_code: null,
    project_name: '立项回归测试项目',
    customer_name: '测试客户',
    customer_contact_person: '客户联系人',
    customer_contact: '13800000000',
    project_manager_user_id: 10,
    business_responsible_user_id: 12,
    technical_responsible_user_id: 13,
    project_mode: null,
    created_by_user_id: 10,
    participating_departments: JSON.stringify([
      BUSINESS_DEPARTMENT.MARKETING_CENTER,
      BUSINESS_DEPARTMENT.RD_CENTER
    ]),
    status: PROJECT_STATUS.NORMAL,
    ended_reason: null,
    ended_by_user_id: null,
    ended_at: null,
    current_stage_order: 1,
    current_stage_key: 'initiation',
    current_stage_name: '立项阶段'
  };
}

function buildProjectStages(projectId = PROJECT_ID) {
  return STANDARD_PROJECT_STAGES.map((stage, index) => ({
    id: 2100 + index + 1,
    project_id: projectId,
    stage_order: stage.stageOrder,
    stage_key: stage.stageKey,
    stage_name: stage.stageName,
    stage_status: stage.stageOrder === 1 ? STAGE_STATUS.CURRENT : STAGE_STATUS.NOT_STARTED,
    is_current: stage.stageOrder === 1 ? 1 : 0,
    started_at: stage.stageOrder === 1 ? '2026-07-11 09:00:00' : null,
    completed_at: null,
    created_at: '2026-07-11 09:00:00',
    updated_at: '2026-07-11 09:00:00'
  }));
}

function buildStageDocument({
  id,
  documentCode,
  documentName,
  documentOrder,
  completionMode,
  responsibleUserId = null,
  ownerDepartment = null,
  reviewDepartment = null
}) {
  return {
    id,
    project_id: PROJECT_ID,
    template_id: 5000 + documentOrder,
    template_version: 'v20260629',
    stage_order: 1,
    stage_key: 'initiation',
    stage_name: '立项阶段',
    document_code: documentCode,
    document_order: documentOrder,
    document_name: documentName,
    is_required: 1,
    default_responsibility_role: null,
    confirm_role: null,
    owner_department: ownerDepartment,
    review_department: reviewDepartment,
    completion_mode: completionMode,
    submit_mode: 'online_form',
    target_folder_path: null,
    target_folder_id: null,
    status: DOCUMENT_STATUS.NOT_SUBMITTED,
    is_applicable: 1,
    revision_required: 0,
    revision_reason: null,
    revision_source_document_id: null,
    revision_requested_by_user_id: null,
    revision_requested_at: null,
    revision_resubmitted_by_user_id: null,
    revision_resubmitted_at: null,
    revision_completed_by_user_id: null,
    revision_completed_at: null,
    responsible_user_id: responsibleUserId,
    responsibility_updated_by_user_id: null,
    responsibility_updated_at: null,
    submitted_by_user_id: null,
    submitted_at: null,
    confirmed_by_user_id: null,
    confirmed_at: null,
    returned_by_user_id: null,
    returned_at: null,
    return_reason: null,
    not_applicable_by_user_id: null,
    not_applicable_at: null,
    not_applicable_reason: null,
    restored_applicable_by_user_id: null,
    restored_applicable_at: null,
    created_at: '2026-07-11 09:00:00',
    updated_at: '2026-07-11 09:00:00'
  };
}

function buildStageDocuments() {
  return [
    buildStageDocument({
      id: DOCUMENT_IDS.REQUIREMENT,
      documentCode: INITIATION_REWORK_TARGET_DOCUMENT_CODE,
      documentName: '项目需求表',
      documentOrder: 1,
      completionMode: COMPLETION_MODE.SUBMIT_ONLY,
      responsibleUserId: 11,
      ownerDepartment: BUSINESS_DEPARTMENT.RD_CENTER
    }),
    buildStageDocument({
      id: DOCUMENT_IDS.REVIEW,
      documentCode: INITIATION_REVIEW_DOCUMENT_CODE,
      documentName: '项目立项审批表',
      documentOrder: 2,
      completionMode: COMPLETION_MODE.APPROVAL_REQUIRED,
      ownerDepartment: BUSINESS_DEPARTMENT.MARKETING_CENTER,
      reviewDepartment: BUSINESS_DEPARTMENT.RD_CENTER
    }),
    buildStageDocument({
      id: DOCUMENT_IDS.NOTICE,
      documentCode: INITIATION_NOTICE_DOCUMENT_CODE,
      documentName: '项目立项通知',
      documentOrder: 3,
      completionMode: COMPLETION_MODE.SUBMIT_ONLY,
      ownerDepartment: BUSINESS_DEPARTMENT.MARKETING_CENTER
    })
  ];
}

function requirementPayload(overrides = {}) {
  return {
    communicationDate: '2026-07-11',
    communicationCount: '1',
    communicationLocation: '客户现场',
    communicationMethod: '现场交流',
    internalParticipants: '需求责任人、技术负责人',
    customerParticipants: '客户联系人',
    workingTemperatureMin: '5',
    workingTemperatureMax: '40',
    workingHumidityMin: '30',
    workingHumidityMax: '80',
    siteConditionDescription: '现场空间满足设备进场。',
    powerSupply: 'AC380V',
    airSupply: '0.6MPa',
    workpieceDescription: '测试工件，铝合金壳体。',
    operationProcessDescription: '上料、定位、检测、下料。',
    projectTargetDescription: '实现节拍 60s，降低人工干预。',
    ...overrides
  };
}

function approvalBusinessPayload(overrides = {}) {
  return {
    projectResponsibleContact: '023-00000000',
    customerEnterpriseAttributeScore: '5',
    customerEnterpriseAttributeInformationNotes: '客户为重点行业客户',
    projectSourceScore: '5',
    projectSourceInformationNotes: '公司人脉引入',
    projectPositioningScore: '4',
    projectPositioningInformationNotes: '关键设备替换',
    businessCompetitionConditionScore: '4',
    businessCompetitionConditionInformationNotes: '竞争条件可控',
    projectBudgetScore: '5',
    projectBudgetInformationNotes: '预算充足',
    paymentConditionScore: '4',
    paymentConditionInformationNotes: '付款比例满足要求',
    ...overrides
  };
}

function approvalTechnicalPayload(overrides = {}) {
  return {
    projectRequirementScore: '5',
    projectRequirementInformationNotes: '需求明确且有数据支撑',
    specialEnvironmentScore: '4',
    specialEnvironmentInformationNotes: '特殊环境较少',
    industryThresholdScore: '4',
    industryThresholdInformationNotes: '行业门槛可满足',
    technologyMaturityScore: '5',
    technologyMaturityInformationNotes: '已有类似经验',
    rdModeScore: '5',
    rdModeInformationNotes: '本公司有相关产品能力',
    ...overrides
  };
}

function noticePayload(projectCode = 'KRF-INIT-001', overrides = {}) {
  return {
    projectCode,
    initiationDate: '2026-07-11',
    noticeDate: '2026-07-11',
    ...overrides
  };
}

function cloneRow(row) {
  return { ...row };
}

class InitiationWorkflowFakeConnection {
  constructor({ duplicateProjectCodes = [], submittedNoticeRows = [] } = {}) {
    this.users = buildUsers();
    this.project = buildProject();
    this.stages = buildProjectStages();
    this.stageDocuments = buildStageDocuments();
    this.forms = [];
    this.reviewNodes = [];
    this.formImages = [];
    this.operationLogs = [];
    this.duplicateProjectCodes = new Set(duplicateProjectCodes);
    this.submittedNoticeRows = submittedNoticeRows;
    this.lastNoticeProjectListQueryRows = [];
    this.lastGeneratedSnapshot = null;
    this.nextFormId = 1;
    this.nextReviewNodeId = 1;
    this.commits = 0;
    this.rollbacks = 0;
  }

  async beginTransaction() {}

  async commit() {
    this.commits += 1;
  }

  async rollback() {
    this.rollbacks += 1;
  }

  release() {}

  user(id) {
    return this.users.get(Number(id)) || null;
  }

  documentByCode(documentCode) {
    return this.stageDocuments.find((document) => document.document_code === documentCode) || null;
  }

  documentById(documentId) {
    return this.stageDocuments.find((document) => Number(document.id) === Number(documentId)) || null;
  }

  formByDocumentId(documentId) {
    return this.forms.find((form) => Number(form.stage_document_id) === Number(documentId)) || null;
  }

  currentStage() {
    return this.stages.find((stage) => Boolean(stage.is_current)) || null;
  }

  stageByOrder(stageOrder) {
    return this.stages.find((stage) => Number(stage.stage_order) === Number(stageOrder)) || null;
  }

  rowWithResponsibleUser(document) {
    const responsible = this.user(document.responsible_user_id);
    return {
      ...document,
      responsible_account: responsible?.account ?? null,
      responsible_display_name: responsible?.display_name ?? null,
      responsible_department: responsible?.department ?? null,
      responsible_organization_role: responsible?.organization_role ?? null,
      responsible_role: responsible?.role ?? null,
      responsible_is_enabled: responsible?.is_enabled ?? null,
      responsible_file_platform_user_id: responsible?.file_platform_user_id ?? null
    };
  }

  projectPermissionRow({ hasDepartmentResponsible = 0 } = {}) {
    return {
      id: this.project.id,
      project_manager_user_id: this.project.project_manager_user_id,
      business_responsible_user_id: this.project.business_responsible_user_id,
      technical_responsible_user_id: this.project.technical_responsible_user_id,
      created_by_user_id: this.project.created_by_user_id,
      participating_departments: this.project.participating_departments,
      status: this.project.status,
      ended_reason: this.project.ended_reason,
      ended_by_user_id: this.project.ended_by_user_id,
      ended_at: this.project.ended_at,
      has_department_responsible: hasDepartmentResponsible
    };
  }

  projectContextRow() {
    const business = this.user(this.project.business_responsible_user_id);
    const technical = this.user(this.project.technical_responsible_user_id);
    return {
      ...this.project,
      business_responsible_display_name: business?.display_name ?? null,
      business_responsible_account: business?.account ?? null,
      technical_responsible_display_name: technical?.display_name ?? null,
      technical_responsible_account: technical?.account ?? null
    };
  }

  workbenchDocumentRow(document, { hasDepartmentResponsible = 0, collaborationPart = null } = {}) {
    const stage = this.stageByOrder(document.stage_order);
    return {
      ...this.rowWithResponsibleUser(document),
      project_id: this.project.id,
      project_code: this.project.project_code,
      project_name: this.project.project_name,
      project_manager_user_id: this.project.project_manager_user_id,
      participating_departments: this.project.participating_departments,
      project_status: this.project.status,
      project_updated_at: '2026-07-11 09:00:00',
      business_responsible_user_id: this.project.business_responsible_user_id,
      technical_responsible_user_id: this.project.technical_responsible_user_id,
      stage_id: stage?.id ?? null,
      has_department_responsible: hasDepartmentResponsible,
      collaboration_part: collaborationPart,
      form_data_json: this.formByDocumentId(document.id)?.form_data_json ?? null
    };
  }

  reviewNodeRow(node) {
    const reviewedBy = this.user(node.reviewed_by_user_id);
    return {
      ...node,
      reviewer_account: null,
      reviewer_display_name: null,
      reviewer_department_value: null,
      reviewer_organization_role: null,
      reviewer_role_value: null,
      reviewer_is_enabled: null,
      reviewed_by_account: reviewedBy?.account ?? null,
      reviewed_by_display_name: reviewedBy?.display_name ?? null,
      reviewed_by_department: reviewedBy?.department ?? null,
      reviewed_by_organization_role: reviewedBy?.organization_role ?? null,
      reviewed_by_role: reviewedBy?.role ?? null,
      reviewed_by_is_enabled: reviewedBy?.is_enabled ?? null
    };
  }

  ensureReviewNodes(document, submittedByUserId = null) {
    if (!document || document.document_code !== INITIATION_REVIEW_DOCUMENT_CODE) {
      return;
    }

    const definitions = [
      {
        nodeKey: INITIATION_REVIEW_NODE_KEY.BUSINESS,
        reviewerRole: ORGANIZATION_ROLE.CENTER_MANAGER,
        reviewerDepartment: BUSINESS_DEPARTMENT.MARKETING_CENTER
      },
      {
        nodeKey: INITIATION_REVIEW_NODE_KEY.TECHNICAL,
        reviewerRole: ORGANIZATION_ROLE.CENTER_MANAGER,
        reviewerDepartment: BUSINESS_DEPARTMENT.RD_CENTER
      },
      {
        nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
        reviewerRole: ORGANIZATION_ROLE.GENERAL_MANAGER,
        reviewerDepartment: null
      }
    ];

    for (const definition of definitions) {
      if (this.reviewNodes.some((node) => node.stage_document_id === document.id && node.node_key === definition.nodeKey)) {
        continue;
      }
      const isSubmitted = [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(document.status);
      const isGeneral = definition.nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL;
      this.reviewNodes.push({
        id: this.nextReviewNodeId++,
        project_id: document.project_id,
        stage_document_id: document.id,
        node_key: definition.nodeKey,
        node_status: isSubmitted
          ? isGeneral
            ? INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE
            : INITIATION_REVIEW_NODE_STATUS.PENDING
          : INITIATION_REVIEW_NODE_STATUS.WAITING_DOCUMENT_SUBMISSION,
        reviewer_role: definition.reviewerRole,
        reviewer_department: definition.reviewerDepartment,
        reviewer_user_id: null,
        comment: null,
        return_reason: null,
        submitted_by_user_id: isSubmitted ? submittedByUserId : null,
        submitted_at: isSubmitted ? '2026-07-11 09:20:00' : null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        invalidated_at: null,
        invalidated_reason: null,
        created_at: '2026-07-11 09:00:00',
        updated_at: '2026-07-11 09:00:00'
      });
    }
  }

  selectReviewNodes(documentIds) {
    const ids = new Set(documentIds.map(Number));
    return this.reviewNodes
      .filter((node) => ids.has(Number(node.stage_document_id)))
      .sort((left, right) => {
        const order = [
          INITIATION_REVIEW_NODE_KEY.BUSINESS,
          INITIATION_REVIEW_NODE_KEY.TECHNICAL,
          INITIATION_REVIEW_NODE_KEY.GENERAL
        ];
        return order.indexOf(left.node_key) - order.indexOf(right.node_key);
      })
      .map((node) => this.reviewNodeRow(node));
  }

  insertOperationLog(params) {
    const [
      projectId,
      actorUserId,
      actionType,
      targetType,
      targetId,
      summary,
      detailsJson
    ] = params;
    this.operationLogs.push({
      id: this.operationLogs.length + 1,
      project_id: projectId,
      actor_user_id: actorUserId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      summary,
      details_json: detailsJson,
      created_at: '2026-07-11 09:30:00'
    });
  }

  upsertForm(params) {
    const [
      projectId,
      documentId,
      formKey,
      schemaJson,
      formDataJson,
      status,
      draftSavedByUserId,
      submittedByUserId
    ] = params;
    let form = this.formByDocumentId(documentId);
    if (!form) {
      form = {
        id: this.nextFormId++,
        project_id: projectId,
        stage_document_id: documentId,
        form_key: formKey,
        form_schema_json: schemaJson,
        form_data_json: formDataJson,
        status,
        draft_saved_by_user_id: draftSavedByUserId,
        draft_saved_at: '2026-07-11 09:15:00',
        submitted_by_user_id: submittedByUserId,
        submitted_at: status === 'submitted' ? '2026-07-11 09:15:00' : null,
        created_at: '2026-07-11 09:15:00',
        updated_at: '2026-07-11 09:15:00'
      };
      this.forms.push(form);
      return;
    }

    Object.assign(form, {
      form_key: formKey,
      form_schema_json: schemaJson,
      form_data_json: formDataJson,
      status,
      draft_saved_by_user_id: draftSavedByUserId,
      draft_saved_at: '2026-07-11 09:16:00',
      submitted_by_user_id: submittedByUserId,
      submitted_at: status === 'submitted' ? '2026-07-11 09:16:00' : form.submitted_at,
      updated_at: '2026-07-11 09:16:00'
    });
  }

  updateDocumentStatus({
    documentId,
    status,
    submittedByUserId = undefined,
    confirmedByUserId = undefined,
    returnedByUserId = undefined,
    returnReason = undefined,
    clearRevision = false,
    revisionCompletedByUserId = undefined
  }) {
    const document = this.documentById(documentId);
    if (!document) {
      return;
    }
    document.status = status;
    document.updated_at = '2026-07-11 09:25:00';
    if (submittedByUserId !== undefined) {
      document.submitted_by_user_id = submittedByUserId;
      document.submitted_at = '2026-07-11 09:25:00';
      document.returned_by_user_id = null;
      document.returned_at = null;
      document.return_reason = null;
    }
    if (confirmedByUserId !== undefined) {
      document.confirmed_by_user_id = confirmedByUserId;
      document.confirmed_at = '2026-07-11 09:25:00';
    }
    if (returnedByUserId !== undefined) {
      document.returned_by_user_id = returnedByUserId;
      document.returned_at = '2026-07-11 09:25:00';
      document.return_reason = returnReason;
      document.confirmed_by_user_id = null;
      document.confirmed_at = null;
    }
    if (clearRevision) {
      document.revision_required = 0;
      document.revision_completed_by_user_id = revisionCompletedByUserId ?? null;
      document.revision_completed_at = '2026-07-11 09:25:00';
      document.revision_resubmitted_by_user_id = null;
      document.revision_resubmitted_at = null;
      document.revision_reason = null;
      document.revision_source_document_id = null;
    }
  }

  pendingWorkbenchReviewNodesFor(nodeKeys) {
    const reviewDocument = this.documentByCode(INITIATION_REVIEW_DOCUMENT_CODE);
    const requirementDocument = this.documentByCode(INITIATION_REWORK_TARGET_DOCUMENT_CODE);
    const blockedByRework =
      requirementDocument?.revision_required === 1 &&
      Number(requirementDocument.revision_source_document_id) === Number(reviewDocument?.id);
    const stage = this.stageByOrder(1);
    return this.reviewNodes
      .filter((node) =>
        node.node_status === INITIATION_REVIEW_NODE_STATUS.PENDING &&
        nodeKeys.includes(node.node_key) &&
        !blockedByRework &&
        [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(reviewDocument.status)
      )
      .map((node) => ({
        ...node,
        document_code: reviewDocument.document_code,
        document_name: reviewDocument.document_name,
        stage_order: reviewDocument.stage_order,
        stage_name: reviewDocument.stage_name,
        project_code: this.project.project_code,
        project_name: this.project.project_name,
        project_status: this.project.status,
        stage_id: stage.id
      }));
  }

  async execute(sql, params = []) {
    const text = normalizeSql(sql);

    if (text.startsWith('INSERT INTO business_operation_logs')) {
      this.insertOperationLog(params);
      return [{ affectedRows: 1 }];
    }

    if (text === 'SELECT id FROM projects WHERE id = ? LIMIT 1') {
      return [[{ id: this.project.id }]];
    }

    if (text.startsWith('SELECT p.id FROM projects p WHERE p.id = ?')) {
      return [[{ id: this.project.id }]];
    }

    if (text.startsWith('SELECT id, status FROM projects WHERE id = ? LIMIT 1 FOR UPDATE')) {
      return [[{ id: this.project.id, status: this.project.status }]];
    }

    if (text.startsWith('SELECT *, 0 AS has_department_responsible FROM projects WHERE id = ?')) {
      return [[{ ...this.project, has_department_responsible: 0 }]];
    }

    if (text.startsWith('SELECT p.*, EXISTS')) {
      return [[{ ...this.project, has_department_responsible: 1 }]];
    }

    if (text.startsWith('SELECT p.*, br.account AS business_responsible_account')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id, p.project_code,') && text.includes('WHERE s.stage_key = ?')) {
      return [[]];
    }

    if (text.startsWith('SELECT p.id, p.project_code,') && !text.includes('FROM project_stage_document_forms f')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id, p.project_manager_user_id')) {
      return [[this.projectPermissionRow({ hasDepartmentResponsible: 1 })]];
    }

    if (text.startsWith('SELECT id, project_manager_user_id')) {
      return [[this.projectPermissionRow()]];
    }

    if (text.startsWith('SELECT GET_LOCK')) {
      return [[{ lockAcquired: 1 }]];
    }

    if (text.startsWith('SELECT RELEASE_LOCK')) {
      return [[{ released: 1 }]];
    }

    if (text.startsWith('SELECT id FROM projects WHERE project_code = ?')) {
      const [projectCode] = params;
      return [this.duplicateProjectCodes.has(projectCode) ? [{ id: PROJECT_ID + 1 }] : []];
    }

    if (text.startsWith('UPDATE projects SET project_code = ? WHERE id = ?')) {
      const [projectCode] = params;
      this.project.project_code = projectCode;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE projects SET status = ? WHERE id = ?')) {
      const [status] = params;
      this.project.status = status;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC')) {
      return [this.stages.map(cloneRow)];
    }

    if (text.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 0')) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => Number(candidate.id) === Number(stageId));
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 0;
        stage.completed_at = '2026-07-11 10:00:00';
      }
      return [{ affectedRows: stage ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 1')) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => Number(candidate.id) === Number(stageId));
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 1;
        stage.started_at = '2026-07-11 10:00:00';
        this.project.current_stage_order = stage.stage_order;
        this.project.current_stage_key = stage.stage_key;
        this.project.current_stage_name = stage.stage_name;
      }
      return [{ affectedRows: stage ? 1 : 0 }];
    }

    if (text.startsWith('SELECT d.*, u.account AS responsible_account') && text.includes('d.id = ?')) {
      const [projectId, documentId] = params;
      const document = this.documentById(documentId);
      return [
        document && Number(document.project_id) === Number(projectId)
          ? [this.rowWithResponsibleUser(document)]
          : []
      ];
    }

    if (text.startsWith('SELECT * FROM project_stage_documents WHERE project_id = ? AND id = ?')) {
      const [projectId, documentId] = params;
      const document = this.documentById(documentId);
      return [document && Number(document.project_id) === Number(projectId) ? [cloneRow(document)] : []];
    }

    if (
      text.startsWith('SELECT * FROM project_stage_documents WHERE project_id = ? AND document_code = ?') &&
      text.includes('revision_required = 1') &&
      text.includes('revision_source_document_id = ?')
    ) {
      const [projectId, documentCode, revisionSourceDocumentId] = params;
      const document = this.documentByCode(documentCode);
      return [
        document &&
        Number(document.project_id) === Number(projectId) &&
        Number(document.revision_required) === 1 &&
        Number(document.revision_source_document_id) === Number(revisionSourceDocumentId)
          ? [cloneRow(document)]
          : []
      ];
    }

    if (
      text.startsWith('SELECT * FROM project_stage_documents WHERE project_id = ? AND document_code = ?')
    ) {
      const [projectId, documentCode] = params;
      const document = this.documentByCode(documentCode);
      return [document && Number(document.project_id) === Number(projectId) ? [cloneRow(document)] : []];
    }

    if (
      text.startsWith('SELECT id, project_id, document_code, document_name') &&
      text.includes('document_code IN')
    ) {
      const [projectId, ...documentCodes] = params;
      return [
        this.stageDocuments
          .filter((document) => Number(document.project_id) === Number(projectId) && documentCodes.includes(document.document_code))
          .map(cloneRow)
      ];
    }

    if (text.startsWith('SELECT d.id, d.project_id') && text.includes('FROM project_stage_documents d') && text.includes('d.stage_order = ?')) {
      const [projectId, stageOrder] = params;
      return [
        this.stageDocuments
          .filter((document) => Number(document.project_id) === Number(projectId) && Number(document.stage_order) === Number(stageOrder))
          .sort((left, right) => left.document_order - right.document_order)
          .map(cloneRow)
      ];
    }

    if (text.startsWith('SELECT d.* FROM project_stage_documents d WHERE d.document_code = ?')) {
      const [documentCode, expectedCount] = params;
      const document = this.documentByCode(documentCode);
      const count = this.reviewNodes.filter((node) => node.stage_document_id === document?.id).length;
      return [document && count < Number(expectedCount) ? [cloneRow(document)] : []];
    }

    if (text.startsWith('SELECT d.*, u.account AS responsible_account') && text.includes("d.document_code IN ('1.1', '1.2', '1.3')")) {
      const projectIds = new Set(params.map(Number));
      return [
        this.stageDocuments
          .filter((document) => projectIds.has(Number(document.project_id)))
          .map((document) => this.rowWithResponsibleUser(document))
      ];
    }

    if (text.startsWith('SELECT * FROM project_stage_document_forms WHERE stage_document_id = ?')) {
      const [documentId] = params;
      const form = this.formByDocumentId(documentId);
      return [form ? [cloneRow(form)] : []];
    }

    if (text.startsWith('SELECT id, form_data_json FROM project_stage_document_forms')) {
      const [documentId] = params;
      const form = this.formByDocumentId(documentId);
      return [form ? [{ id: form.id, form_data_json: form.form_data_json }] : []];
    }

    if (
      text.startsWith('SELECT f.form_data_json FROM project_stage_document_forms f') &&
      text.includes('d.status = ?')
    ) {
      const [projectId, documentCode, status] = params;
      const document = this.documentByCode(documentCode);
      const form = this.formByDocumentId(document?.id);
      return [
        document &&
        Number(document.project_id) === Number(projectId) &&
        document.status === status &&
        form?.status === 'submitted'
          ? [{ form_data_json: form.form_data_json }]
          : []
      ];
    }

    if (text.startsWith('INSERT INTO project_stage_document_forms')) {
      this.upsertForm(params);
      return [{ affectedRows: 1, insertId: this.formByDocumentId(params[1])?.id ?? 0 }];
    }

    if (text.startsWith('UPDATE project_stage_document_forms SET form_data_json = ?')) {
      const [formDataJson, formId] = params;
      const form = this.forms.find((candidate) => Number(candidate.id) === Number(formId));
      if (form) {
        form.form_data_json = formDataJson;
        if (text.includes("status = 'draft'")) {
          form.status = 'draft';
          form.submitted_by_user_id = null;
          form.submitted_at = null;
        }
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (text.startsWith('INSERT INTO project_initiation_review_nodes')) {
      for (let index = 0; index < params.length; index += 8) {
        const [
          projectId,
          stageDocumentId,
          nodeKey,
          nodeStatus,
          reviewerRole,
          reviewerDepartment,
          submittedByUserId,
          submittedAt
        ] = params.slice(index, index + 8);
        if (this.reviewNodes.some((node) => Number(node.stage_document_id) === Number(stageDocumentId) && node.node_key === nodeKey)) {
          continue;
        }
        this.reviewNodes.push({
          id: this.nextReviewNodeId++,
          project_id: projectId,
          stage_document_id: stageDocumentId,
          node_key: nodeKey,
          node_status: nodeStatus,
          reviewer_role: reviewerRole,
          reviewer_department: reviewerDepartment,
          reviewer_user_id: null,
          comment: null,
          return_reason: null,
          submitted_by_user_id: submittedByUserId,
          submitted_at: submittedAt ? '2026-07-11 09:20:00' : null,
          reviewed_by_user_id: null,
          reviewed_at: null,
          invalidated_at: null,
          invalidated_reason: null,
          created_at: '2026-07-11 09:20:00',
          updated_at: '2026-07-11 09:20:00'
        });
      }
      return [{ affectedRows: 1 }];
    }

    if (text.includes('FROM project_initiation_review_nodes n') && text.includes('INNER JOIN project_stage_documents d')) {
      const nodeKeys = params.filter((value) =>
        [
          INITIATION_REVIEW_NODE_KEY.BUSINESS,
          INITIATION_REVIEW_NODE_KEY.TECHNICAL,
          INITIATION_REVIEW_NODE_KEY.GENERAL
        ].includes(value)
      );
      return [this.pendingWorkbenchReviewNodesFor(nodeKeys)];
    }

    if (text.includes('FROM project_initiation_review_nodes n')) {
      const documentIds = text.includes('WHERE n.stage_document_id = ?') ? [params[0]] : params;
      return [this.selectReviewNodes(documentIds)];
    }

    if (text.startsWith('UPDATE project_initiation_review_nodes SET node_status = ?, comment = ?, return_reason = NULL')) {
      const [nodeStatus, comment, reviewedByUserId, nodeId] = params;
      const node = this.reviewNodes.find((candidate) => Number(candidate.id) === Number(nodeId));
      if (node) {
        Object.assign(node, {
          node_status: nodeStatus,
          comment,
          return_reason: null,
          reviewed_by_user_id: reviewedByUserId,
          reviewed_at: '2026-07-11 09:35:00',
          invalidated_at: null,
          invalidated_reason: null
        });
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_initiation_review_nodes SET node_status = ?, comment = NULL, return_reason = ?')) {
      const [nodeStatus, returnReason, reviewedByUserId, nodeId] = params;
      const node = this.reviewNodes.find((candidate) => Number(candidate.id) === Number(nodeId));
      if (node) {
        Object.assign(node, {
          node_status: nodeStatus,
          comment: null,
          return_reason: returnReason,
          reviewed_by_user_id: reviewedByUserId,
          reviewed_at: '2026-07-11 09:36:00'
        });
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_initiation_review_nodes SET node_status = ?, submitted_by_user_id = ?')) {
      const [nodeStatus, submittedByUserId, projectId, documentId, ...rest] = params;
      const nodeKeys = rest.filter((value) =>
        [
          INITIATION_REVIEW_NODE_KEY.BUSINESS,
          INITIATION_REVIEW_NODE_KEY.TECHNICAL,
          INITIATION_REVIEW_NODE_KEY.GENERAL
        ].includes(value)
      );
      let count = 0;
      for (const node of this.reviewNodes) {
        if (
          Number(node.project_id) === Number(projectId) &&
          Number(node.stage_document_id) === Number(documentId) &&
          nodeKeys.includes(node.node_key)
        ) {
          node.node_status = nodeStatus;
          node.submitted_by_user_id = submittedByUserId;
          node.submitted_at = '2026-07-11 09:20:00';
          node.reviewed_by_user_id = null;
          node.reviewed_at = null;
          node.comment = null;
          node.return_reason = null;
          node.invalidated_at = null;
          node.invalidated_reason = null;
          count += 1;
        }
      }
      return [{ affectedRows: count }];
    }

    if (text.startsWith('UPDATE project_initiation_review_nodes SET node_status = ?, return_reason = NULL')) {
      const [nodeStatus, ...rest] = params;
      if (rest.length === 1) {
        const [nodeId] = rest;
        const node = this.reviewNodes.find((candidate) => Number(candidate.id) === Number(nodeId));
        if (node) {
          node.node_status = nodeStatus;
          node.return_reason = null;
          node.invalidated_at = null;
          node.invalidated_reason = null;
        }
        return [{ affectedRows: node ? 1 : 0 }];
      }
      const [projectId, documentId, nodeKey] = rest;
      const node = this.reviewNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          Number(candidate.stage_document_id) === Number(documentId) &&
          candidate.node_key === nodeKey
      );
      if (node) {
        node.node_status = nodeStatus;
        node.return_reason = null;
        node.invalidated_at = null;
        node.invalidated_reason = null;
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_initiation_review_nodes SET node_status = ?, comment = NULL, return_reason = NULL')) {
      const [nodeStatus, projectId, documentId, ...nodeKeys] = params;
      let count = 0;
      for (const node of this.reviewNodes) {
        if (
          Number(node.project_id) === Number(projectId) &&
          Number(node.stage_document_id) === Number(documentId) &&
          nodeKeys.includes(node.node_key)
        ) {
          node.node_status = nodeStatus;
          node.comment = null;
          node.return_reason = null;
          node.submitted_by_user_id = null;
          node.submitted_at = null;
          node.reviewed_by_user_id = null;
          node.reviewed_at = null;
          node.invalidated_at = null;
          node.invalidated_reason = null;
          count += 1;
        }
      }
      return [{ affectedRows: count }];
    }

    if (text.startsWith('UPDATE project_stage_documents SET status = ?, submitted_by_user_id = ?') && text.includes('revision_required = 0')) {
      const [status, submittedByUserId, revisionCompletedByUserId, projectId, documentId] = params;
      if (Number(projectId) === PROJECT_ID) {
        this.updateDocumentStatus({
          documentId,
          status,
          submittedByUserId,
          clearRevision: true,
          revisionCompletedByUserId
        });
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_stage_documents SET status = ?, submitted_by_user_id = ?')) {
      const [status, submittedByUserId, projectId, documentId] = params;
      if (Number(projectId) === PROJECT_ID) {
        this.updateDocumentStatus({ documentId, status, submittedByUserId });
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_stage_documents SET status = ?, confirmed_by_user_id = ?')) {
      const [status, confirmedByUserId, projectId, documentId] = params;
      if (Number(projectId) === PROJECT_ID) {
        this.updateDocumentStatus({ documentId, status, confirmedByUserId });
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_stage_documents SET status = ?, returned_by_user_id = ?')) {
      const [status, returnedByUserId, returnReason, projectId, documentId] = params;
      if (Number(projectId) === PROJECT_ID) {
        this.updateDocumentStatus({ documentId, status, returnedByUserId, returnReason });
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_stage_documents SET revision_required = 1')) {
      const [revisionReason, sourceDocumentId, requestedByUserId, projectId, targetDocumentId] = params;
      const document = this.documentById(targetDocumentId);
      if (document && Number(projectId) === PROJECT_ID) {
        Object.assign(document, {
          revision_required: 1,
          revision_reason: revisionReason,
          revision_source_document_id: sourceDocumentId,
          revision_requested_by_user_id: requestedByUserId,
          revision_requested_at: '2026-07-11 09:40:00',
          revision_resubmitted_by_user_id: null,
          revision_resubmitted_at: null,
          revision_completed_by_user_id: null,
          revision_completed_at: null
        });
      }
      return [{ affectedRows: document ? 1 : 0 }];
    }

    if (text.startsWith('SELECT i.*, u.account AS uploaded_by_account')) {
      return [[]];
    }

    if (text.startsWith('SELECT * FROM project_stage_document_form_images')) {
      return [[]];
    }

    if (text.startsWith('SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion')) {
      return [[{ nextVersion: 1 }]];
    }

    if (text.startsWith('INSERT INTO project_stage_document_generated_files')) {
      this.lastGeneratedSnapshot = JSON.parse(params[13] || '{}');
      throw new Error('Template generation is disabled in initiation workflow repository tests');
    }

    if (text.includes('FROM project_stage_document_forms f') && text.includes("d.document_code = ?")) {
      const [reviewDocumentCode, , documentCode] = params.length === 4 ? params : [null, null, params[0]];
      if (documentCode !== INITIATION_NOTICE_DOCUMENT_CODE) {
        return [[]];
      }
      const noticeDocument = this.documentByCode(INITIATION_NOTICE_DOCUMENT_CODE);
      const form = this.formByDocumentId(noticeDocument?.id);
      const reviewDocument = this.documentByCode(reviewDocumentCode || INITIATION_REVIEW_DOCUMENT_CODE);
      const reviewForm = this.formByDocumentId(reviewDocument?.id);
      const currentRows = form?.status === 'submitted'
        ? [{
            id: this.project.id,
            project_code: this.project.project_code,
            project_name: this.project.project_name,
            customer_name: this.project.customer_name,
            form_data_json: form.form_data_json,
            review_form_data_json: reviewForm?.form_data_json ?? null,
            submitted_at: form.submitted_at
          }]
        : [];
      const rows = [
        ...this.submittedNoticeRows.map((row) => ({
          id: row.id,
          project_code: row.projectCode,
          project_name: row.projectName,
          customer_name: row.customerName,
          form_data_json: JSON.stringify(row.noticeFormData || {}),
          review_form_data_json: JSON.stringify(row.reviewFormData || {}),
          submitted_at: row.submittedAt || '2026-07-11 09:00:00'
        })),
        ...currentRows
      ].sort((left, right) => {
        const submittedCompare = String(left.submitted_at || '').localeCompare(String(right.submitted_at || ''));
        return submittedCompare || Number(left.id) - Number(right.id);
      });
      this.lastNoticeProjectListQueryRows = rows;
      return [rows];
    }

    if (text.startsWith('SELECT d.*, p.id AS project_id') && text.includes('d.responsible_user_id = ?')) {
      const [userId, endedStatus, excludedReviewCode, excludedNoticeCode] = params;
      return [
        this.stageDocuments
          .filter((document) =>
            Number(document.responsible_user_id) === Number(userId) &&
            this.project.status !== endedStatus &&
            ![excludedReviewCode, excludedNoticeCode].includes(document.document_code) &&
            document.is_applicable === 1 &&
            (
              [DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.RETURNED].includes(document.status) ||
              Number(document.revision_required) === 1
            )
          )
          .map((document) => this.workbenchDocumentRow(document))
      ];
    }

    if (text.startsWith('SELECT d.*, f.form_data_json')) {
      const [documentCode, endedStatus, submittedStatus, confirmedStatus, businessUserId, technicalUserId] = params;
      const document = this.documentByCode(documentCode);
      if (
        !document ||
        this.project.status === endedStatus ||
        [submittedStatus, confirmedStatus].includes(document.status) ||
        ![this.project.business_responsible_user_id, this.project.technical_responsible_user_id].some(
          (userId) => Number(userId) === Number(businessUserId) || Number(userId) === Number(technicalUserId)
        )
      ) {
        return [[]];
      }
      return [[this.workbenchDocumentRow(document)]];
    }

    if (text.startsWith('SELECT d.*, p.id AS project_id') && text.includes("WHERE d.document_code = '1.3'")) {
      const document = this.documentByCode(INITIATION_NOTICE_DOCUMENT_CODE);
      return [
        document && ![DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.CONFIRMED].includes(document.status)
          ? [this.workbenchDocumentRow(document, { hasDepartmentResponsible: 1 })]
          : []
      ];
    }

    if (text.startsWith('SELECT d.*, p.id AS project_id') && text.includes("d.document_code <> '1.2'")) {
      return [[]];
    }

    if (text.startsWith('SELECT p.id AS project_id') && text.includes('WHERE s.stage_key = ?')) {
      return [[]];
    }

    if (text.includes('FROM project_solution_design_')) {
      return [[]];
    }

    throw new Error(`Unexpected initiation workflow SQL: ${text}`);
  }
}

function fakeDb(options = {}) {
  return {
    connection: new InitiationWorkflowFakeConnection(options)
  };
}

async function withFakePool(db, callback) {
  const originalGetConnection = pool.getConnection;
  const originalExecute = pool.execute;
  pool.getConnection = async () => db.connection;
  pool.execute = async (sql, params) => db.connection.execute(sql, params);
  try {
    return await callback();
  } finally {
    pool.getConnection = originalGetConnection;
    pool.execute = originalExecute;
  }
}

function user(db, id) {
  return authUser(db.connection.user(id));
}

function documentByCode(db, documentCode) {
  return db.connection.documentByCode(documentCode);
}

function reviewNode(db, nodeKey) {
  return db.connection.reviewNodes.find((node) => node.node_key === nodeKey);
}

function logActions(db) {
  return db.connection.operationLogs.map((log) => log.action_type);
}

function formDataByCode(db, documentCode) {
  const document = documentByCode(db, documentCode);
  const form = db.connection.formByDocumentId(document?.id);
  return form ? JSON.parse(form.form_data_json) : {};
}

async function submitRequirement(db, overrides = {}) {
  return submitStageDocumentOnlineForm({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REQUIREMENT,
    user: user(db, 11),
    formData: requirementPayload(overrides)
  });
}

async function submitApprovalBusinessPart(db, overrides = {}) {
  return submitStageDocumentOnlineForm({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REVIEW,
    user: user(db, 12),
    formData: approvalBusinessPayload(overrides)
  });
}

async function submitApprovalTechnicalPart(db, overrides = {}) {
  return submitStageDocumentOnlineForm({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REVIEW,
    user: user(db, 13),
    formData: approvalTechnicalPayload(overrides)
  });
}

async function submitApprovalForm(db) {
  await submitApprovalBusinessPart(db);
  return submitApprovalTechnicalPart(db);
}

async function approveBusinessReview(db, comment = '营销评价通过') {
  return approveInitiationReviewNode({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REVIEW,
    nodeKey: INITIATION_REVIEW_NODE_KEY.BUSINESS,
    user: user(db, 1),
    comment
  });
}

async function approveTechnicalReview(db, comment = '研发评价通过') {
  return approveInitiationReviewNode({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REVIEW,
    nodeKey: INITIATION_REVIEW_NODE_KEY.TECHNICAL,
    user: user(db, 2),
    comment
  });
}

async function approveGeneralReview(db, comment = '同意立项', projectExecutionMode = '自研模式') {
  return approveInitiationReviewNode({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.REVIEW,
    nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
    user: user(db, 3),
    comment,
    projectExecutionMode
  });
}

async function completeInitiationReview(db) {
  await submitRequirement(db);
  await submitApprovalForm(db);
  await approveBusinessReview(db);
  await approveTechnicalReview(db);
  return approveGeneralReview(db);
}

async function submitNotice(db, projectCode = 'KRF-INIT-001', overrides = {}) {
  return submitStageDocumentOnlineForm({
    projectId: PROJECT_ID,
    documentId: DOCUMENT_IDS.NOTICE,
    user: user(db, 1),
    formData: noticePayload(projectCode, overrides)
  });
}

function assertNoStageAdvanceTodos(workbench) {
  assert.equal(workbench.items.some((item) => item.type === 'stage_advance'), false);
}

function assertWorkbenchHas(workbench, predicate, message) {
  assert.ok(workbench.items.some(predicate), message);
  assertNoStageAdvanceTodos(workbench);
}

test('1.1 requirement online form submits, completes the document and unlocks 1.2 collaboration', async () => {
  const db = fakeDb();

  await withFakePool(db, async () => {
    const initialForm = await getStageDocumentOnlineForm({
      projectId: PROJECT_ID,
      documentId: DOCUMENT_IDS.REQUIREMENT,
      user: user(db, 11)
    });
    assert.equal(initialForm.permissions.canSubmit, true);

    const submitted = await submitRequirement(db);

    assert.equal(submitted.form.status, 'submitted');
    assert.equal(submitted.document.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submitted.document.isComplete, true);
    assert.equal(documentByCode(db, INITIATION_REWORK_TARGET_DOCUMENT_CODE).status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submitted.form.permissions.canSubmit, false);
    assert.deepEqual(submitted.form.images, []);
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.FORM_SUBMITTED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.DOCUMENT_SUBMITTED));

    const approvalForm = await getStageDocumentOnlineForm({
      projectId: PROJECT_ID,
      documentId: DOCUMENT_IDS.REVIEW,
      user: user(db, 12)
    });
    assert.equal(approvalForm.permissions.editablePart, 'business');
    assert.equal(approvalForm.permissions.canSubmitBusinessPart, true);
    assert.equal(approvalForm.blockingReasons.length, 0);
  });
});

test('1.2 collaboration and three review nodes derive initiation approval completion', async () => {
  const db = fakeDb();

  await withFakePool(db, async () => {
    await submitRequirement(db);

    const businessDraft = await submitApprovalBusinessPart(db);
    assert.equal(businessDraft.form.status, 'draft');
    assert.equal(documentByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).status, DOCUMENT_STATUS.NOT_SUBMITTED);
    assert.equal(businessDraft.form.collaboration.businessSubmitted, true);
    assert.equal(businessDraft.form.collaboration.technicalSubmitted, false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(formDataByCode(db, INITIATION_REVIEW_DOCUMENT_CODE), 'projectExecutionMode'),
      false
    );

    const submitted = await submitApprovalTechnicalPart(db);
    assert.equal(submitted.form.status, 'submitted');
    assert.equal(submitted.document.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(submitted.document.initiationReview.isComplete, false);
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.BUSINESS).node_status, INITIATION_REVIEW_NODE_STATUS.PENDING);
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.TECHNICAL).node_status, INITIATION_REVIEW_NODE_STATUS.PENDING);
    assert.equal(
      reviewNode(db, INITIATION_REVIEW_NODE_KEY.GENERAL).node_status,
      INITIATION_REVIEW_NODE_STATUS.WAITING_PREREQUISITE
    );

    await approveBusinessReview(db);
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.BUSINESS).node_status, INITIATION_REVIEW_NODE_STATUS.APPROVED);
    assert.equal(documentByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).status, DOCUMENT_STATUS.SUBMITTED);

    await approveTechnicalReview(db);
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.TECHNICAL).node_status, INITIATION_REVIEW_NODE_STATUS.APPROVED);
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.GENERAL).node_status, INITIATION_REVIEW_NODE_STATUS.PENDING);

    await assert.rejects(
      () => approveGeneralReview(db, '缺少模式', ''),
      (error) => error?.code === 'INITIATION_PROJECT_EXECUTION_MODE_REQUIRED'
    );
    await assert.rejects(
      () => approveGeneralReview(db, '非法模式', '外包模式'),
      (error) => error?.code === 'INVALID_INITIATION_PROJECT_EXECUTION_MODE'
    );
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.GENERAL).node_status, INITIATION_REVIEW_NODE_STATUS.PENDING);

    const approved = await approveGeneralReview(db, '同意立项', '供应链模式');
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.GENERAL).node_status, INITIATION_REVIEW_NODE_STATUS.APPROVED);
    assert.equal(documentByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).status, DOCUMENT_STATUS.CONFIRMED);
    assert.equal(approved.initiationReview.isComplete, true);
    assert.equal(approved.isComplete, true);
    assert.equal(formDataByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).projectExecutionMode, '供应链模式');
    assert.equal(db.connection.lastGeneratedSnapshot.formData.projectExecutionMode, '供应链模式');
    assert.equal(db.connection.project.project_mode, null);
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.INITIATION_REVIEW_BUSINESS_APPROVED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.INITIATION_REVIEW_TECHNICAL_APPROVED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.INITIATION_REVIEW_GENERAL_APPROVED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.INITIATION_PROJECT_EXECUTION_MODE_SELECTED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.INITIATION_REVIEW_COMPLETED));
    const modeLog = db.connection.operationLogs.find(
      (log) => log.action_type === OPERATION_ACTION_TYPE.INITIATION_PROJECT_EXECUTION_MODE_SELECTED
    );
    const modeDetails = JSON.parse(modeLog.details_json);
    assert.equal(modeDetails.stageDocumentId, DOCUMENT_IDS.REVIEW);
    assert.equal(modeDetails.nodeKey, INITIATION_REVIEW_NODE_KEY.GENERAL);
    assert.equal(modeDetails.selectedProjectExecutionMode, '供应链模式');
    assert.equal(modeDetails.writesProjectsProjectMode, false);
  });
});

test('general manager return triggers precise 1.1 rework and rework resubmission allows 1.2 review again', async () => {
  const db = fakeDb();

  await withFakePool(db, async () => {
    await submitRequirement(db);
    await submitApprovalForm(db);
    await approveBusinessReview(db);
    await approveTechnicalReview(db);
    const staleReviewForm = db.connection.formByDocumentId(DOCUMENT_IDS.REVIEW);
    staleReviewForm.form_data_json = JSON.stringify({
      ...JSON.parse(staleReviewForm.form_data_json),
      projectExecutionMode: '自研模式'
    });

    const returned = await returnInitiationReviewNode({
      projectId: PROJECT_ID,
      documentId: DOCUMENT_IDS.REVIEW,
      nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
      user: user(db, 3),
      returnReason: '需求需补充节拍边界'
    });

    assert.equal(returned.status, DOCUMENT_STATUS.RETURNED);
    assert.equal(documentByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).status, DOCUMENT_STATUS.RETURNED);
    assert.equal(documentByCode(db, INITIATION_REWORK_TARGET_DOCUMENT_CODE).revision_required, 1);
    assert.equal(
      documentByCode(db, INITIATION_REWORK_TARGET_DOCUMENT_CODE).revision_source_document_id,
      DOCUMENT_IDS.REVIEW
    );
    assert.equal(reviewNode(db, INITIATION_REVIEW_NODE_KEY.GENERAL).node_status, INITIATION_REVIEW_NODE_STATUS.RETURNED_BLOCKED_BY_REWORK);
    assert.equal(
      Object.prototype.hasOwnProperty.call(formDataByCode(db, INITIATION_REVIEW_DOCUMENT_CODE), 'projectExecutionMode'),
      false
    );

    await assert.rejects(
      () => submitNotice(db, 'KRF-BLOCKED-001'),
      (error) => error?.code === 'INITIATION_NOTICE_GATE_NOT_READY'
    );
    assert.equal(db.connection.currentStage().stage_key, 'initiation');
    assert.equal(logActions(db).includes(OPERATION_ACTION_TYPE.STAGE_ADVANCED), false);

    const reworkResubmitted = await submitRequirement(db, {
      projectTargetDescription: '返工后补充节拍与成本边界。'
    });
    assert.equal(reworkResubmitted.document.status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(documentByCode(db, INITIATION_REWORK_TARGET_DOCUMENT_CODE).revision_required, 0);
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.DOCUMENT_REVISION_COMPLETED));

    await submitApprovalForm(db);
    await approveBusinessReview(db, '返工后营销评价通过');
    await approveTechnicalReview(db, '返工后研发评价通过');
    await assert.rejects(
      () => approveGeneralReview(db, '返工后缺少模式', ''),
      (error) => error?.code === 'INITIATION_PROJECT_EXECUTION_MODE_REQUIRED'
    );
    const approvedAgain = await approveGeneralReview(db, '返工后同意立项', '供应链模式');
    assert.equal(approvedAgain.initiationReview.isComplete, true);
    assert.equal(documentByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).status, DOCUMENT_STATUS.CONFIRMED);
    assert.equal(formDataByCode(db, INITIATION_REVIEW_DOCUMENT_CODE).projectExecutionMode, '供应链模式');
  });
});

test('1.3 notice gate writes unique project code and initiation completeness auto advances to solution', async () => {
  const blockedDb = fakeDb();
  await withFakePool(blockedDb, async () => {
    await submitRequirement(blockedDb);
    await assert.rejects(
      () => submitNotice(blockedDb, 'KRF-NOT-READY'),
      (error) => error?.code === 'INITIATION_NOTICE_GATE_NOT_READY'
    );
    assert.equal(blockedDb.connection.currentStage().stage_key, 'initiation');
  });

  const duplicateDb = fakeDb({ duplicateProjectCodes: ['KRF-DUP-001'] });
  await withFakePool(duplicateDb, async () => {
    await completeInitiationReview(duplicateDb);
    await assert.rejects(
      () => submitNotice(duplicateDb, 'KRF-DUP-001'),
      (error) => error?.name === 'DuplicateProjectCodeError'
    );
    assert.equal(duplicateDb.connection.project.project_code, null);
    assert.equal(duplicateDb.connection.currentStage().stage_key, 'initiation');
    assert.equal(logActions(duplicateDb).includes(OPERATION_ACTION_TYPE.STAGE_ADVANCED), false);
  });

  const db = fakeDb({
    submittedNoticeRows: [
      {
        id: PROJECT_ID - 1,
        projectCode: 'KRF-OLD-001',
        projectName: '历史供应链项目',
        customerName: '历史客户',
        noticeFormData: {
          projectCode: 'KRF-OLD-001',
          projectName: '历史供应链项目',
          customerUnit: '历史客户',
          initiationDate: '2026-07-01'
        },
        reviewFormData: {
          projectExecutionMode: '供应链模式'
        },
        submittedAt: '2026-07-01 09:00:00'
      }
    ]
  });
  await withFakePool(db, async () => {
    await completeInitiationReview(db);
    const noticeForm = await getStageDocumentOnlineForm({
      projectId: PROJECT_ID,
      documentId: DOCUMENT_IDS.NOTICE,
      user: user(db, 1)
    });
    assert.equal(noticeForm.formData.projectExecutionMode, '自研模式');
    assert.ok(noticeForm.schema.noticeTemplate.tableColumns.includes('开展模式'));

    const noticeSubmitted = await submitNotice(db, 'KRF-INIT-001', {
      projectExecutionMode: '供应链模式'
    });

    assert.equal(noticeSubmitted.form.status, 'submitted');
    assert.equal(documentByCode(db, INITIATION_NOTICE_DOCUMENT_CODE).status, DOCUMENT_STATUS.SUBMITTED);
    assert.equal(db.connection.project.project_code, 'KRF-INIT-001');
    assert.equal(noticeSubmitted.form.formData.projectExecutionMode, '自研模式');
    assert.equal(formDataByCode(db, INITIATION_NOTICE_DOCUMENT_CODE).projectExecutionMode, '自研模式');
    assert.equal(db.connection.project.project_mode, null);
    assert.equal(db.connection.currentStage().stage_key, 'solution');
    assert.equal(db.connection.stageByOrder(1).stage_status, STAGE_STATUS.COMPLETED);
    assert.equal(db.connection.stageByOrder(2).stage_status, STAGE_STATUS.CURRENT);
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.PROJECT_CODE_UPDATED));
    assert.ok(logActions(db).includes(OPERATION_ACTION_TYPE.STAGE_ADVANCED));

    const stageAdvanceLog = db.connection.operationLogs.find(
      (log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED
    );
    const details = JSON.parse(stageAdvanceLog.details_json);
    assert.equal(details.advanceMode, 'automatic');
    assert.equal(details.fromStageKey, 'initiation');
    assert.equal(details.toStageKey, 'solution');
    assert.equal(details.completenessSummary.completionPercent, 100);
    assert.equal(details.completenessSummary.incompleteRequiredCount, 0);
    const noticeRows = db.connection.lastGeneratedSnapshot.noticeProjectList.rows;
    assert.equal(noticeRows.length, 2);
    assert.deepEqual(
      noticeRows.map((row) => ({
        projectCode: row.projectCode,
        projectExecutionMode: row.projectExecutionMode
      })),
      [
        { projectCode: 'KRF-OLD-001', projectExecutionMode: '供应链模式' },
        { projectCode: 'KRF-INIT-001', projectExecutionMode: '自研模式' }
      ]
    );
    assert.equal(db.connection.stages.length, 8);
    assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
  });
});

test('workbench initiation todos cover key handlers without ordinary stage advance todos', async () => {
  const db = fakeDb();

  await withFakePool(db, async () => {
    const requirementOwnerWorkbench = await getMyWorkbench(user(db, 11));
    assertWorkbenchHas(
      requirementOwnerWorkbench,
      (item) => item.type === 'document_responsibility' && item.documentCode === '1.1',
      '1.1 responsible user should receive requirement todo'
    );

    await submitRequirement(db);

    const businessWorkbench = await getMyWorkbench(user(db, 12));
    assertWorkbenchHas(
      businessWorkbench,
      (item) =>
        item.type === 'document_responsibility' &&
        item.documentCode === '1.2' &&
        item.collaborationPart === 'business',
      'business owner should receive 1.2 collaboration todo'
    );

    const technicalWorkbench = await getMyWorkbench(user(db, 13));
    assertWorkbenchHas(
      technicalWorkbench,
      (item) =>
        item.type === 'document_responsibility' &&
        item.documentCode === '1.2' &&
        item.collaborationPart === 'technical',
      'technical owner should receive 1.2 collaboration todo'
    );

    await submitApprovalForm(db);

    const marketingReviewWorkbench = await getMyWorkbench(user(db, 1));
    assertWorkbenchHas(
      marketingReviewWorkbench,
      (item) => item.type === 'initiation_review' && item.nodeKey === INITIATION_REVIEW_NODE_KEY.BUSINESS,
      'marketing center manager should receive business review todo'
    );

    const rdReviewWorkbench = await getMyWorkbench(user(db, 2));
    assertWorkbenchHas(
      rdReviewWorkbench,
      (item) => item.type === 'initiation_review' && item.nodeKey === INITIATION_REVIEW_NODE_KEY.TECHNICAL,
      'RD center manager should receive technical review todo'
    );

    await approveBusinessReview(db);
    await approveTechnicalReview(db);

    const generalWorkbench = await getMyWorkbench(user(db, 3));
    assertWorkbenchHas(
      generalWorkbench,
      (item) => item.type === 'initiation_review' && item.nodeKey === INITIATION_REVIEW_NODE_KEY.GENERAL,
      'general manager should receive final approval todo'
    );

    await returnInitiationReviewNode({
      projectId: PROJECT_ID,
      documentId: DOCUMENT_IDS.REVIEW,
      nodeKey: INITIATION_REVIEW_NODE_KEY.GENERAL,
      user: user(db, 3),
      returnReason: '补充需求'
    });

    const reworkWorkbench = await getMyWorkbench(user(db, 11));
    assertWorkbenchHas(
      reworkWorkbench,
      (item) =>
        item.type === 'document_responsibility' &&
        item.documentCode === '1.1' &&
        item.revisionRequired === true,
      '1.1 responsible user should receive precise rework todo'
    );

    await submitRequirement(db, { projectTargetDescription: '返工补充目标说明。' });
    await submitApprovalForm(db);
    await approveBusinessReview(db, '返工后营销通过');
    await approveTechnicalReview(db, '返工后研发通过');
    await approveGeneralReview(db, '返工后总经理通过');

    const noticeWorkbench = await getMyWorkbench(user(db, 1));
    assertWorkbenchHas(
      noticeWorkbench,
      (item) => item.type === 'document_responsibility' && item.documentCode === '1.3',
      'marketing center manager should receive 1.3 notice todo'
    );
  });
});
