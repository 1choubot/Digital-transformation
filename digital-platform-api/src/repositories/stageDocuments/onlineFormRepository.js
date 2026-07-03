import { pool } from '../../db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  isCenterManagerUser
} from '../../domain/organization.js';
import {
  INITIATION_NOTICE_DOCUMENT_CODE,
  INITIATION_REVIEW_DOCUMENT_CODE,
  INITIATION_REWORK_TARGET_DOCUMENT_CODE,
  isInitiationOnlineFormDocument
} from '../../domain/initiationReview.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS_ACTION } from '../../domain/stageDocumentStatus.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import { assertProjectViewable } from '../projectRepository.js';
import { canViewStageDocumentItem } from './accessControl.js';
import {
  assertInitiationNoticeSubmitGateReady,
  assertNoOutstandingInitiationRequirementRework,
  buildInitiationReworkNotClearedReason,
  selectOutstandingInitiationRequirementRework
} from './initiationReviewRepository.js';
import { selectProjectPermissionContext } from './permissionContext.js';
import {
  selectProjectStageDocument,
  selectProjectStageDocumentForUpdate
} from './shared.js';
import { updateProjectStageDocumentStatus } from './statusRepository.js';

const FORM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted'
};

const INITIATION_FORM_DEFINITIONS = Object.freeze({
  [INITIATION_REWORK_TARGET_DOCUMENT_CODE]: {
    formKey: 'initiation_requirement',
    templateFileName: '项目需求表-模板.xlsx',
    fields: [
      { key: 'projectBackground', label: '项目背景', type: 'textarea', required: true },
      { key: 'customerNeed', label: '客户需求', type: 'textarea', required: true },
      { key: 'scope', label: '需求范围', type: 'textarea', required: false },
      { key: 'expectedValue', label: '预期价值', type: 'textarea', required: false },
      { key: 'remarks', label: '备注', type: 'textarea', required: false }
    ]
  },
  [INITIATION_REVIEW_DOCUMENT_CODE]: {
    formKey: 'initiation_approval',
    templateFileName: '项目立项审批表-模板.xlsx',
    fields: [
      { key: 'projectOverview', label: '项目概况', type: 'textarea', required: true },
      { key: 'marketAssessment', label: '市场分析', type: 'textarea', required: true },
      { key: 'technicalPlan', label: '技术方案', type: 'textarea', required: true },
      { key: 'budgetEstimate', label: '预算估算', type: 'textarea', required: false },
      { key: 'riskAssessment', label: '风险评估', type: 'textarea', required: false }
    ]
  },
  [INITIATION_NOTICE_DOCUMENT_CODE]: {
    formKey: 'initiation_notice',
    templateFileName: '关于确定项目名称及编号的通知-模板.docx',
    fields: [
      { key: 'projectName', label: '项目名称', type: 'text', required: true },
      { key: 'projectCode', label: '项目编号', type: 'text', required: false },
      { key: 'noticeContent', label: '通知内容', type: 'textarea', required: true },
      { key: 'effectiveDate', label: '生效日期', type: 'date', required: false }
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

function buildFormSchema(document) {
  const definition = getFormDefinition(getDocumentCode(document));
  if (!definition) {
    return null;
  }

  return {
    formKey: definition.formKey,
    documentCode: getDocumentCode(document),
    documentName: getDocumentName(document),
    templateFileName: definition.templateFileName,
    fields: definition.fields
  };
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

function validateRequiredFields(schema, formData) {
  const missing = schema.fields
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
}

function isMarketingCenterManager(user) {
  return isCenterManagerUser(user) && user.department === BUSINESS_DEPARTMENT.MARKETING_CENTER;
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

async function buildGateContext(connection, projectId, document) {
  if (String(getDocumentCode(document)) !== INITIATION_NOTICE_DOCUMENT_CODE) {
    return { ready: true, blockingReasons: [] };
  }

  try {
    await assertInitiationNoticeSubmitGateReady(connection, projectId);
    return { ready: true, blockingReasons: [] };
  } catch (error) {
    if (error.code === 'INITIATION_NOTICE_GATE_NOT_READY') {
      return {
        ready: false,
        blockingReasons: ['1.2 项目立项审批表尚未最终通过', ...(Array.isArray(error.details) ? error.details : [])]
      };
    }
    throw error;
  }
}

async function assertCanEditForm({ connection, projectId, document, user }) {
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

    const gate = await buildGateContext(connection, projectId, document);
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

function mapForm({ document, schema, row, permissions, blockingReasons = [] }) {
  return {
    id: row?.id ?? null,
    projectId: document.project_id ?? document.projectId,
    stageDocumentId: document.id,
    documentCode: document.document_code ?? document.documentCode,
    documentName: document.document_name ?? document.documentName,
    formKey: schema.formKey,
    schema,
    formData: parseJsonValue(row?.form_data_json, {}),
    status: row?.status ?? FORM_STATUS.DRAFT,
    draftSavedByUserId: row?.draft_saved_by_user_id ?? null,
    draftSavedAt: row?.draft_saved_at ?? null,
    submittedByUserId: row?.submitted_by_user_id ?? null,
    submittedAt: row?.submitted_at ?? null,
    permissions,
    blockingReasons
  };
}

async function buildFormPermissions({ connection, projectId, document, user }) {
  const schema = buildFormSchema(document);
  if (!schema) {
    return { schema: null, permissions: { canView: false, canEdit: false, canSubmit: false }, blockingReasons: [] };
  }

  if (String(getDocumentCode(document)) === INITIATION_NOTICE_DOCUMENT_CODE) {
    const project = await selectProjectPermissionContext(connection, projectId, user);
    const gate = await buildGateContext(connection, projectId, document);
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
    return mapForm({ document, schema, row, permissions, blockingReasons });
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

  try {
    await connection.beginTransaction();
    document = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await assertCanViewFormDocument({ connection, projectId, document, user });
    assertProjectNotEndedForOnlineForm(project);
    assertDocumentEditableForOnlineForm(document);
    schema = await assertCanEditForm({ connection, projectId, document, user });
    await upsertForm({
      connection,
      projectId,
      documentId,
      schema,
      formData: normalizedFormData,
      status: FORM_STATUS.DRAFT,
      userId: user.id
    });
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
        toStatus: FORM_STATUS.DRAFT,
        actorUserId: user.id,
        operatedAt: new Date().toISOString()
      }
    });
    formRow = await selectFormRow(connection, documentId);
    formPermissions = await buildFormPermissions({ connection, projectId, document, user });
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
    blockingReasons: formPermissions.blockingReasons
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    document = await selectProjectStageDocumentForUpdate(connection, projectId, documentId);
    const project = await assertCanViewFormDocument({ connection, projectId, document, user });
    assertProjectNotEndedForOnlineForm(project);
    assertDocumentEditableForOnlineForm(document);
    schema = await assertCanEditForm({ connection, projectId, document, user });
    validateRequiredFields(schema, normalizedFormData);
    await upsertForm({
      connection,
      projectId,
      documentId,
      schema,
      formData: normalizedFormData,
      status: FORM_STATUS.SUBMITTED,
      userId: user.id
    });
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
        toStatus: FORM_STATUS.SUBMITTED,
        actorUserId: user.id,
        operatedAt: new Date().toISOString()
      }
    });
    updatedDocument = await updateProjectStageDocumentStatus({
      connection,
      projectId,
      documentId,
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      user,
      allowOnlineFormDocumentSubmit: true
    });
    updatedFormDocument = await selectProjectStageDocument(connection, projectId, documentId);
    formRow = await selectFormRow(connection, documentId);
    formPermissions = await buildFormPermissions({
      connection,
      projectId,
      document: updatedFormDocument,
      user
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    form: mapForm({
      document: updatedFormDocument,
      schema,
      row: formRow,
      permissions: formPermissions.permissions,
      blockingReasons: formPermissions.blockingReasons
    }),
    document: updatedDocument
  };
}
