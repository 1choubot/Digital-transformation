import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE
} from '../../src/domain/organization.js';
import {
  STANDARD_PROJECT_STAGES,
  STAGE_STATUS
} from '../../src/domain/stages.js';
import { pool } from '../../src/db/pool.js';
import { readZipEntries } from '../../src/utils/ooxmlZip.js';
import {
  DETAILED_DESIGN_COMPATIBILITY_ONLY_DOCUMENT_CODES,
  DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS,
  DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS,
  DETAILED_DESIGN_ERROR,
  DETAILED_DESIGN_NODE_KEY,
  DETAILED_DESIGN_NODE_STATUS,
  DETAILED_DESIGN_NODES,
  DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS,
  DETAILED_DESIGN_REVIEW_FORM_STATUS,
  DETAILED_DESIGN_STAGE,
  DETAILED_DESIGN_UPLOAD_SLOT_KEY,
  DETAILED_DESIGN_UPLOAD_SLOT_STATUS,
  DETAILED_DESIGN_UPLOAD_SLOTS,
  DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES
} from '../../src/domain/detailedDesignWorkflow.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { DetailedDesignWorkflowError } from '../../src/repositories/projectRepository.js';
import { DOCUMENT_STATUS_ACTION } from '../../src/domain/stageDocumentStatus.js';
import {
  approveDetailedDesignDrawingReview,
  approveDetailedDesignWorkflowNode,
  assignDetailedDesignRoles,
  DETAILED_DESIGN_WORKBENCH_TODO_TYPE,
  getDetailedDesignDrawingReviewRecordDownload,
  getDetailedDesignReviewGeneratedFileDownload,
  getDetailedDesignReviewForm,
  getDetailedDesignUploadDownload,
  getDetailedDesignWorkflow,
  markDetailedDesignUploadNoUpload,
  passDetailedDesignDrawingReview,
  returnDetailedDesignDrawingReview,
  returnDetailedDesignDrawingReviewApproval,
  returnDetailedDesignWorkflowNode,
  saveDetailedDesignReviewForm,
  cancelDetailedDesignUploadNoUpload,
  submitDetailedDesignWorkflowNode,
  submitDetailedDesignReviewForm,
  selectDetailedDesignWorkbenchTodos,
  uploadDetailedDesignDrawingReviewRecord,
  uploadDetailedDesignWorkflowFile
} from '../../src/repositories/projects/detailedDesignWorkflowRepository.js';
import { getMyWorkbench } from '../../src/repositories/stageDocuments/workbenchRepository.js';
import { getProjectStageDocumentChecklist } from '../../src/repositories/stageDocuments/checklistRepository.js';
import {
  completeProjectStageDocumentRevision,
  updateProjectStageDocumentStatus
} from '../../src/repositories/stageDocuments/statusRepository.js';
import { buildProjectNavigationFromWorkspace } from '../../src/services/navigationService.js';

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function makeDbUser({
  id,
  account,
  displayName,
  department,
  organizationRole,
  role = '员工',
  isEnabled = 1,
  isPlatformAdmin = 0
}) {
  return {
    id,
    account,
    display_name: displayName,
    department,
    organization_role: organizationRole,
    role,
    is_enabled: isEnabled,
    is_platform_admin: isPlatformAdmin,
    file_platform_user_id: null
  };
}

function makeAuthUser(row) {
  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin)
  };
}

class FakeDetailedDesignConnection {
  constructor() {
    this.projectRow = {
      id: 401,
      project_code: 'DD-401',
      project_name: '详细设计骨架测试项目',
      customer_name: '测试客户',
      status: 'normal',
      project_manager_user_id: 11,
      business_responsible_user_id: 12,
      technical_responsible_user_id: 13,
      current_stage_id: 4,
      current_stage_order: 4,
      current_stage_key: DETAILED_DESIGN_STAGE.STAGE_KEY,
      current_stage_name: DETAILED_DESIGN_STAGE.STAGE_NAME,
      current_stage_status: 'current'
    };
    this.usersById = new Map([
      makeDbUser({
        id: 10,
        account: 'rd_manager',
        displayName: '研发中心负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      makeDbUser({
        id: 11,
        account: 'project_manager',
        displayName: '项目经理',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 12,
        account: 'business_owner',
        displayName: '商务负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 13,
        account: 'technical_owner',
        displayName: '技术负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 14,
        account: 'procurement_owner',
        displayName: '采购负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 15,
        account: 'finance_accountant',
        displayName: '财务会计',
        department: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 16,
        account: 'drawing_review_owner',
        displayName: '图纸审查负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      makeDbUser({
        id: 18,
        account: 'manufacturing_manager',
        displayName: '制造中心负责人',
        department: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      makeDbUser({
        id: 17,
        account: 'professional_member',
        displayName: '专业组成员',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      })
    ].map((row) => [row.id, row]));
    this.rolesRow = {
      project_id: this.projectRow.id,
      project_manager_user_id: 11,
      business_owner_user_id: 12,
      technical_owner_user_id: 13,
      procurement_owner_user_id: 14,
      finance_accountant_user_id: 15,
      drawing_review_owner_user_id: 16,
      assigned_by_user_id: 10,
      updated_by_user_id: 10
    };
    this.professionalGroupMembers = [
      {
        id: 1,
        project_id: this.projectRow.id,
        user_id: 17,
        assigned_by_user_id: 10,
        assigned_at: '2026-07-22 10:00:00',
        is_active: 1
      }
    ];
    this.reviewForms = [];
    this.drawingReviewFlow = null;
    this.drawingReviewRecords = [];
    this.stageRows = STANDARD_PROJECT_STAGES.map((stage) => ({
      id: stage.stageOrder,
      project_id: this.projectRow.id,
      stage_order: stage.stageOrder,
      stage_key: stage.stageKey,
      stage_name: stage.stageName,
      stage_status: stage.stageOrder === DETAILED_DESIGN_STAGE.STAGE_ORDER
        ? STAGE_STATUS.CURRENT
        : stage.stageOrder < DETAILED_DESIGN_STAGE.STAGE_ORDER
          ? STAGE_STATUS.COMPLETED
          : STAGE_STATUS.NOT_STARTED,
      is_current: stage.stageOrder === DETAILED_DESIGN_STAGE.STAGE_ORDER ? 1 : 0,
      started_at: stage.stageOrder === DETAILED_DESIGN_STAGE.STAGE_ORDER ? '2026-07-22 10:00:00' : null,
      completed_at: stage.stageOrder < DETAILED_DESIGN_STAGE.STAGE_ORDER ? '2026-07-22 10:00:00' : null
    }));
    this.nodes = [];
    this.uploadSlots = [];
    this.uploadFiles = [];
    this.operationLogs = [];
    this.stageDocumentRow = {
      id: 9001,
      project_id: this.projectRow.id,
      stage_order: DETAILED_DESIGN_STAGE.STAGE_ORDER,
      document_code: 'C25',
      document_name: '项目启动书',
      status: 'pending',
      is_applicable: 1,
      completion_mode: 'submit'
    };
  }

  async beginTransaction() {}
  async commit() {}
  async rollback() {}
  release() {}

  cloneRows(rows) {
    return rows.map((row) => ({ ...row }));
  }

  syncProjectCurrentStageFromStages() {
    const currentStage = this.stageRows.find((stage) => stage.is_current === 1) || null;
    if (!currentStage) {
      return;
    }

    this.projectRow.current_stage_id = currentStage.id;
    this.projectRow.current_stage_order = currentStage.stage_order;
    this.projectRow.current_stage_key = currentStage.stage_key;
    this.projectRow.current_stage_name = currentStage.stage_name;
    this.projectRow.current_stage_status = currentStage.stage_status;
  }

  insertNode(projectId, nodeKey, nodeName, nodeOrder, status) {
    if (this.nodes.some((node) => node.node_key === nodeKey)) {
      return;
    }

    const activatedAt = status === DETAILED_DESIGN_NODE_STATUS.PENDING ? '2026-07-22 10:00:00' : null;
    this.nodes.push({
      id: this.nodes.length + 1,
      project_id: projectId,
      node_key: nodeKey,
      node_name: nodeName,
      node_order: nodeOrder,
      status,
      return_reason: null,
      current_revision: 1,
      activated_at: activatedAt,
      submitted_at: null,
      approved_at: null,
      returned_at: null
    });
    this.nodes.sort((left, right) => left.node_order - right.node_order);
  }

  insertSlot(projectId, nodeKey, slotKey, slotName, slotOrder, status) {
    if (this.uploadSlots.some((slot) => slot.slot_key === slotKey)) {
      return;
    }

    this.uploadSlots.push({
      id: this.uploadSlots.length + 1,
      project_id: projectId,
      node_key: nodeKey,
      slot_key: slotKey,
      slot_name: slotName,
      slot_order: slotOrder,
      is_required: 1,
      revision: 1,
      status,
      return_reason: null,
      submitted_by_user_id: null,
      submitted_at: null,
      approved_by_user_id: null,
      approved_at: null,
      returned_by_user_id: null,
      returned_at: null,
      is_upload_exempted: 0,
      exemption_reason: null,
      exempted_by_user_id: null,
      exempted_at: null,
      current_file_id: null,
      current_file_revision: null,
      current_file_original_file_name: null,
      current_file_mime_type: null,
      current_file_size: null,
      current_file_uploaded_by_user_id: null,
      current_file_uploaded_at: null,
      current_file_uploaded_by_account: null,
      current_file_uploaded_by_display_name: null
    });
    this.uploadSlots.sort((left, right) => left.slot_order - right.slot_order);
  }

  refreshSlotCurrentFile(slotKey) {
    const slot = this.uploadSlots.find((item) => item.slot_key === slotKey);
    if (!slot) {
      return;
    }

    const file = this.uploadFiles
      .filter((item) => item.slot_key === slotKey && item.is_current === 1)
      .sort((left, right) => right.revision - left.revision || right.id - left.id)[0];
    if (!file) {
      slot.current_file_id = null;
      slot.current_file_revision = null;
      slot.current_file_original_file_name = null;
      slot.current_file_mime_type = null;
      slot.current_file_size = null;
      slot.current_file_uploaded_by_user_id = null;
      slot.current_file_uploaded_at = null;
      slot.current_file_uploaded_by_account = null;
      slot.current_file_uploaded_by_display_name = null;
      return;
    }

    const uploader = this.usersById.get(Number(file.uploaded_by_user_id));
    slot.current_file_id = file.id;
    slot.current_file_revision = file.revision;
    slot.current_file_original_file_name = file.original_file_name;
    slot.current_file_mime_type = file.mime_type;
    slot.current_file_size = file.file_size;
    slot.current_file_uploaded_by_user_id = file.uploaded_by_user_id;
    slot.current_file_uploaded_at = file.uploaded_at;
    slot.current_file_uploaded_by_account = uploader?.account ?? null;
    slot.current_file_uploaded_by_display_name = uploader?.display_name ?? null;
  }

  insertUploadFile({
    projectId,
    slotId,
    slotKey,
    revision,
    originalFileName,
    storageKey,
    mimeType,
    fileSize,
    uploadedByUserId
  }) {
    const file = {
      id: this.uploadFiles.length + 1,
      project_id: projectId,
      slot_id: slotId,
      slot_key: slotKey,
      revision,
      original_file_name: originalFileName,
      storage_key: storageKey,
      mime_type: mimeType,
      file_size: fileSize,
      is_current: 1,
      uploaded_by_user_id: uploadedByUserId,
      uploaded_at: '2026-07-22 10:00:00',
      replaced_at: null
    };
    this.uploadFiles.push(file);
    this.refreshSlotCurrentFile(slotKey);
    return file;
  }

  makeReviewFormResultRow(row) {
    if (!row) {
      return null;
    }

    const submitter = this.usersById.get(Number(row.submitted_by_user_id));
    const reviewer = this.usersById.get(Number(row.reviewed_by_user_id));
    const creator = this.usersById.get(Number(row.created_by_user_id));
    const updater = this.usersById.get(Number(row.updated_by_user_id));
    const generatedBy = this.usersById.get(Number(row.generated_by_user_id));
    return {
      ...row,
      submitted_by_account: submitter?.account ?? null,
      submitted_by_display_name: submitter?.display_name ?? null,
      reviewed_by_account: reviewer?.account ?? null,
      reviewed_by_display_name: reviewer?.display_name ?? null,
      created_by_account: creator?.account ?? null,
      created_by_display_name: creator?.display_name ?? null,
      updated_by_account: updater?.account ?? null,
      updated_by_display_name: updater?.display_name ?? null,
      generated_by_account: generatedBy?.account ?? null,
      generated_by_display_name: generatedBy?.display_name ?? null
    };
  }

  findCurrentReviewForm(nodeKey) {
    return this.reviewForms
      .filter((form) => form.node_key === nodeKey && form.is_current === 1)
      .sort((left, right) => right.revision - left.revision || right.id - left.id)[0] || null;
  }

  insertReviewForm({
    projectId,
    nodeKey,
    reviewType,
    revision,
    formStatus,
    formDataJson,
    submittedByUserId,
    generatedFileStatus,
    generatedFileTemplateKey,
    generatedFileTemplateVersion,
    generatedByUserId,
    generationErrorMessage,
    actorUserId
  }) {
    const isInternal = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW;
    const row = {
      id: this.reviewForms.length + 1,
      project_id: projectId,
      node_key: nodeKey,
      review_type: reviewType,
      document_code: isInternal ? 'C36' : 'C37',
      document_name: isInternal ? '设计评审记录表（内部设计评审）' : '设计评审记录表（客户设计评审）',
      revision,
      form_status: formStatus,
      form_data_json: formDataJson,
      is_current: 1,
      submitted_by_user_id: submittedByUserId,
      submitted_at: submittedByUserId ? '2026-07-22 10:00:00' : null,
      generated_file_status: generatedFileStatus,
      generated_file_storage_key: null,
      generated_file_name: null,
      generated_file_mime_type: null,
      generated_file_size: null,
      generated_file_template_key: generatedFileTemplateKey,
      generated_file_template_version: generatedFileTemplateVersion,
      generated_file_template_hash: null,
      generated_at: null,
      generated_by_user_id: generatedByUserId,
      generation_error_message: generationErrorMessage,
      review_status: 'pending',
      reviewed_by_user_id: null,
      reviewed_at: null,
      return_reason: null,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId
    };
    this.reviewForms.push(row);
    return row;
  }

  makeDrawingReviewFlowResultRow(row) {
    if (!row) {
      return null;
    }

    const checker = this.usersById.get(Number(row.checker_user_id));
    const rdApprover = this.usersById.get(Number(row.rd_approver_user_id));
    const creator = this.usersById.get(Number(row.created_by_user_id));
    const updater = this.usersById.get(Number(row.updated_by_user_id));
    return {
      ...row,
      checker_account: checker?.account ?? null,
      checker_display_name: checker?.display_name ?? null,
      rd_approver_account: rdApprover?.account ?? null,
      rd_approver_display_name: rdApprover?.display_name ?? null,
      created_by_account: creator?.account ?? null,
      created_by_display_name: creator?.display_name ?? null,
      updated_by_account: updater?.account ?? null,
      updated_by_display_name: updater?.display_name ?? null
    };
  }

  upsertDrawingReviewFlow({
    projectId,
    currentRevision,
    productPlanDrawingRevision,
    partsListRevision,
    checkerStatus,
    rdApprovalStatus,
    checkerUserId = null,
    checkerAt = null,
    checkerComment = null,
    rdApproverUserId = null,
    rdApprovedAt = null,
    rdComment = null,
    returnReason = null,
    actorUserId = null
  }) {
    this.drawingReviewFlow = {
      id: this.drawingReviewFlow?.id || 1,
      project_id: projectId,
      current_revision: Number(currentRevision || 1),
      product_plan_drawing_revision: Number(productPlanDrawingRevision || 1),
      parts_list_revision: Number(partsListRevision || 1),
      checker_status: checkerStatus,
      rd_approval_status: rdApprovalStatus,
      checker_user_id: checkerUserId,
      checker_at: checkerAt ? '2026-07-22 10:00:00' : null,
      checker_comment: checkerComment,
      rd_approver_user_id: rdApproverUserId,
      rd_approved_at: rdApprovedAt ? '2026-07-22 10:00:00' : null,
      rd_comment: rdComment,
      return_reason: returnReason,
      created_by_user_id: this.drawingReviewFlow?.created_by_user_id ?? actorUserId,
      updated_by_user_id: actorUserId,
      created_at: this.drawingReviewFlow?.created_at || '2026-07-22 10:00:00',
      updated_at: '2026-07-22 10:00:00'
    };
    return this.drawingReviewFlow;
  }

  makeDrawingReviewRecordResultRow(row) {
    if (!row) {
      return null;
    }

    const uploader = this.usersById.get(Number(row.uploaded_by_user_id));
    return {
      ...row,
      uploaded_by_account: uploader?.account ?? null,
      uploaded_by_display_name: uploader?.display_name ?? null
    };
  }

  insertDrawingReviewRecord({
    projectId,
    revision,
    drawingRevision,
    originalFileName,
    storageKey,
    mimeType,
    fileSize,
    currentDesignRevision,
    returnReason,
    uploadedByUserId
  }) {
    const row = {
      id: this.drawingReviewRecords.length + 1,
      project_id: projectId,
      node_key: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
      revision: Number(revision || 1),
      drawing_revision: Number(drawingRevision || 1),
      original_file_name: originalFileName,
      storage_key: storageKey,
      mime_type: mimeType,
      file_size: fileSize,
      current_design_revision: Number(currentDesignRevision || drawingRevision || 1),
      return_reason: returnReason,
      is_current: 1,
      uploaded_by_user_id: uploadedByUserId,
      uploaded_at: '2026-07-22 10:00:00',
      replaced_at: null,
      created_at: '2026-07-22 10:00:00',
      updated_at: '2026-07-22 10:00:00'
    };
    this.drawingReviewRecords.push(row);
    return row;
  }

  async execute(sql, params = []) {
    const normalized = normalizeSql(sql);

    if (normalized.includes('FROM projects p') && normalized.includes('JOIN project_stages s')) {
      if (normalized.includes('WHERE s.stage_key = ?')) {
        const [stageKey, excludedStatus] = params;
        return [
          this.projectRow.current_stage_key === stageKey && this.projectRow.status !== excludedStatus
            ? [{ ...this.projectRow }]
            : [],
          []
        ];
      }
      return [[{ ...this.projectRow }], []];
    }

    if (normalized.startsWith('SELECT p.id FROM projects p WHERE p.id = ? AND')) {
      return [[{ id: this.projectRow.id }], []];
    }

    if (normalized.startsWith('SELECT id, project_manager_user_id, business_responsible_user_id')) {
      return [[{ ...this.projectRow, has_department_responsible: 0 }], []];
    }

    if (normalized.startsWith('SELECT *, 0 AS has_department_responsible FROM projects WHERE id = ? LIMIT 1 FOR UPDATE')) {
      return [[{ ...this.projectRow, has_department_responsible: 0 }], []];
    }

    if (normalized.startsWith('SELECT d.*, u.account AS responsible_account')) {
      return [[{ ...this.stageDocumentRow }], []];
    }

    if (normalized === 'SELECT id FROM projects WHERE id = ? LIMIT 1 FOR UPDATE') {
      return [[{ id: this.projectRow.id }], []];
    }

    if (normalized.startsWith('SELECT node_key FROM project_detailed_design_nodes WHERE project_id = ?')) {
      return [this.nodes.map((node) => ({ node_key: node.node_key })), []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_nodes WHERE project_id IN (')) {
      return [this.cloneRows(this.nodes), []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_nodes WHERE project_id = ? ORDER BY node_order ASC')) {
      return [this.cloneRows(this.nodes), []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_nodes WHERE project_id = ? AND node_key = ?')) {
      const [, nodeKey] = params;
      const node = this.nodes.find((item) => item.node_key === nodeKey);
      return [node ? [{ ...node }] : [], []];
    }

    if (normalized.startsWith('INSERT IGNORE INTO project_detailed_design_nodes')) {
      const [projectId, nodeKey, nodeName, nodeOrder, status] = params;
      this.insertNode(projectId, nodeKey, nodeName, Number(nodeOrder), status);
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_nodes SET status = ?') &&
      normalized.includes('approved_at = CURRENT_TIMESTAMP')) {
      const [status, projectId, nodeKey] = params;
      const node = this.nodes.find((item) => item.project_id === projectId && item.node_key === nodeKey);
      if (node) {
        node.status = status;
        node.return_reason = null;
        node.submitted_at = node.submitted_at || '2026-07-22 10:00:00';
        node.approved_at = '2026-07-22 10:00:00';
      }
      return [{ affectedRows: node ? 1 : 0 }, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_nodes SET status = ?') &&
      normalized.includes('submitted_at = CURRENT_TIMESTAMP')) {
      const [status, projectId, nodeKey, revision, ...allowedStatuses] = params;
      const node = this.nodes.find((item) =>
        item.project_id === projectId &&
        item.node_key === nodeKey &&
        Number(item.current_revision ?? 1) === Number(revision ?? 1) &&
        allowedStatuses.includes(item.status)
      );
      if (node) {
        node.status = status;
        node.return_reason = null;
        node.submitted_at = '2026-07-22 10:00:00';
      }
      return [{ affectedRows: node ? 1 : 0 }, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_nodes SET status = ?, return_reason = ?, current_revision = ?')) {
      const [status, returnReason, revision, activateStatus, returnedStatusForActivation, returnedAtStatus, returnedStatusForReturnedAt, projectId, nodeKey] = params;
      const node = this.nodes.find((item) => item.project_id === projectId && item.node_key === nodeKey);
      if (node) {
        node.status = status;
        node.return_reason = returnReason;
        node.current_revision = Number(revision);
        node.activated_at = activateStatus === returnedStatusForActivation
          ? node.activated_at || '2026-07-22 10:00:00'
          : null;
        node.submitted_at = null;
        node.approved_at = null;
        node.returned_at = returnedAtStatus === returnedStatusForReturnedAt ? '2026-07-22 10:00:00' : null;
      }
      return [[{ affectedRows: node ? 1 : 0 }], []];
    }

    if (
      normalized.startsWith('UPDATE project_detailed_design_nodes SET status = ?, return_reason = NULL, submitted_at = COALESCE') &&
      normalized.includes('current_revision = ?')
    ) {
      const [status, revision, projectId, nodeKey] = params;
      const node = this.nodes.find((item) => item.project_id === projectId && item.node_key === nodeKey);
      if (node) {
        node.status = status;
        node.return_reason = null;
        node.current_revision = Number(revision);
        node.submitted_at = node.submitted_at || '2026-07-22 10:00:00';
        node.approved_at = null;
        node.returned_at = null;
      }
      return [[{ affectedRows: node ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_nodes SET status = ?') &&
      normalized.includes('activated_at = COALESCE')) {
      const [status, projectId, nodeKey, ...allowedStatuses] = params;
      const node = this.nodes.find((item) =>
        item.project_id === projectId &&
        item.node_key === nodeKey &&
        allowedStatuses.includes(item.status)
      );
      if (node) {
        node.status = status;
        node.return_reason = null;
        node.activated_at = node.activated_at || '2026-07-22 10:00:00';
      }
      return [[{ affectedRows: node ? 1 : 0 }], []];
    }

    if (normalized.startsWith('SELECT slot_key FROM project_detailed_design_upload_slots WHERE project_id = ?')) {
      return [this.uploadSlots.map((slot) => ({ slot_key: slot.slot_key })), []];
    }

    if (normalized.startsWith('SELECT s.*, f.id AS current_file_id')) {
      return [this.cloneRows(this.uploadSlots), []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_upload_slots WHERE project_id = ? AND slot_key = ?')) {
      const [, slotKey] = params;
      const slot = this.uploadSlots.find((item) => item.slot_key === slotKey);
      return [slot ? [{ ...slot }] : [], []];
    }

    if (normalized.startsWith('SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC FOR UPDATE')) {
      return [this.cloneRows(this.stageRows), []];
    }

    if (normalized.startsWith('SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC')) {
      return [this.cloneRows(this.stageRows), []];
    }

    if (normalized.startsWith('INSERT IGNORE INTO project_detailed_design_upload_slots')) {
      const [projectId, nodeKey, slotKey, slotName, slotOrder, status] = params;
      this.insertSlot(projectId, nodeKey, slotKey, slotName, Number(slotOrder), status);
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_upload_files WHERE project_id = ?')) {
      const [, ...slotKeys] = params;
      const slotKeySet = new Set(slotKeys);
      return [
        this.cloneRows(this.uploadFiles.filter((file) => slotKeySet.has(file.slot_key) && file.is_current === 1)),
        []
      ];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_upload_files SET is_current = 0')) {
      const [, slotKey] = params;
      for (const file of this.uploadFiles) {
        if (file.slot_key === slotKey && file.is_current === 1) {
          file.is_current = 0;
          file.replaced_at = '2026-07-22 10:00:00';
        }
      }
      this.refreshSlotCurrentFile(slotKey);
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_upload_files')) {
      const [
        projectId,
        slotId,
        slotKey,
        revision,
        originalFileName,
        storageKey,
        mimeType,
        fileSize,
        uploadedByUserId
      ] = params;
      const file = this.insertUploadFile({
        projectId,
        slotId,
        slotKey,
        revision,
        originalFileName,
        storageKey,
        mimeType,
        fileSize,
        uploadedByUserId
      });
      return [{ insertId: file.id, affectedRows: 1 }, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_upload_slots SET status = ?') &&
      normalized.includes('returned_by_user_id = ?') &&
      normalized.includes('slot_key IN (?, ?)')) {
      const [status, returnReason, returnedByUserId, projectId, slotKey1, slotKey2] = params;
      let affectedRows = 0;
      for (const slot of this.uploadSlots) {
        if (slot.project_id === projectId && [slotKey1, slotKey2].includes(slot.slot_key)) {
          slot.status = status;
          slot.return_reason = returnReason;
          slot.returned_by_user_id = returnedByUserId;
          slot.returned_at = '2026-07-22 10:00:00';
          affectedRows += 1;
        }
      }
      return [[{ affectedRows }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_upload_slots SET status = ?') &&
      normalized.includes('is_upload_exempted = 0')) {
      const [status, revision, slotId] = params;
      const slot = this.uploadSlots.find((item) => item.id === slotId);
      if (slot) {
        slot.status = status;
        slot.revision = revision;
        slot.is_upload_exempted = 0;
        slot.exemption_reason = null;
        slot.exempted_by_user_id = null;
        slot.exempted_at = null;
        slot.return_reason = null;
      }
      return [{ affectedRows: slot ? 1 : 0 }, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_upload_slots SET is_upload_exempted = 1')) {
      const [actorUserId, revision, projectId, slotKey] = params;
      const slot = this.uploadSlots.find((item) =>
        item.project_id === projectId &&
        item.slot_key === slotKey &&
        Number(item.is_upload_exempted || 0) === 0
      );
      if (slot) {
        slot.is_upload_exempted = 1;
        slot.exemption_reason = null;
        slot.exempted_by_user_id = actorUserId;
        slot.exempted_at = '2026-07-22 10:00:00';
        slot.revision = Math.max(Number(slot.revision || 0), Number(revision || 1));
      }
      return [{ affectedRows: slot ? 1 : 0 }, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_upload_slots SET is_upload_exempted = 0')) {
      const [projectId, slotKey] = params;
      const slot = this.uploadSlots.find((item) =>
        item.project_id === projectId &&
        item.slot_key === slotKey &&
        Number(item.is_upload_exempted || 0) === 1
      );
      if (slot) {
        slot.is_upload_exempted = 0;
        slot.exemption_reason = null;
        slot.exempted_by_user_id = null;
        slot.exempted_at = null;
      }
      return [{ affectedRows: slot ? 1 : 0 }, []];
    }

    if (normalized.startsWith('SELECT f.*, s.node_key, s.slot_name')) {
      const [, slotKey] = params;
      const file = this.uploadFiles
        .filter((item) => item.slot_key === slotKey && item.is_current === 1)
        .sort((left, right) => right.revision - left.revision || right.id - left.id)[0];
      if (!file) {
        return [[], []];
      }
      const slot = this.uploadSlots.find((item) => item.slot_key === slotKey);
      return [[{ ...file, node_key: slot?.node_key, slot_name: slot?.slot_name, slot_order: slot?.slot_order }], []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_roles WHERE project_id = ? LIMIT 1')) {
      return [this.rolesRow ? [{ ...this.rolesRow }] : [], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_roles')) {
      const [
        projectId,
        projectManagerUserId,
        businessOwnerUserId,
        technicalOwnerUserId,
        procurementOwnerUserId,
        financeAccountantUserId,
        drawingReviewOwnerUserId,
        assignedByUserId,
        updatedByUserId
      ] = params;
      this.rolesRow = {
        project_id: projectId,
        project_manager_user_id: projectManagerUserId,
        business_owner_user_id: businessOwnerUserId,
        technical_owner_user_id: technicalOwnerUserId,
        procurement_owner_user_id: procurementOwnerUserId,
        finance_accountant_user_id: financeAccountantUserId,
        drawing_review_owner_user_id: drawingReviewOwnerUserId,
        assigned_by_user_id: this.rolesRow?.assigned_by_user_id ?? assignedByUserId,
        updated_by_user_id: updatedByUserId
      };
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.includes('FROM project_detailed_design_professional_group_members m')) {
      return [this.cloneRows(this.professionalGroupMembers), []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_professional_group_members SET is_active = 0')) {
      for (const member of this.professionalGroupMembers) {
        member.is_active = 0;
      }
      return [[{ affectedRows: this.professionalGroupMembers.length }], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_professional_group_members')) {
      const [projectId, userId, assignedByUserId] = params;
      const existing = this.professionalGroupMembers.find((member) => Number(member.user_id) === Number(userId));
      if (existing) {
        existing.is_active = 1;
        existing.assigned_by_user_id = assignedByUserId;
        existing.assigned_at = '2026-07-22 10:00:00';
      } else {
        this.professionalGroupMembers.push({
          id: this.professionalGroupMembers.length + 1,
          project_id: projectId,
          user_id: userId,
          assigned_by_user_id: assignedByUserId,
          assigned_at: '2026-07-22 10:00:00',
          is_active: 1
        });
      }
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.startsWith('SELECT COALESCE(MAX(revision), 0) AS max_revision FROM project_detailed_design_review_forms')) {
      const [, nodeKey] = params;
      const maxRevision = this.reviewForms
        .filter((form) => form.node_key === nodeKey)
        .reduce((max, form) => Math.max(max, Number(form.revision || 0)), 0);
      return [[{ max_revision: maxRevision }], []];
    }

    if (normalized.includes('FROM project_detailed_design_review_forms f') &&
      normalized.includes('WHERE f.project_id = ?') &&
      normalized.includes('AND f.node_key = ?')) {
      const [, nodeKey] = params;
      const row = this.findCurrentReviewForm(nodeKey);
      return [row ? [this.makeReviewFormResultRow(row)] : [], []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_review_forms WHERE project_id IN (')) {
      return [
        this.cloneRows(this.reviewForms.filter((form) => form.is_current === 1))
          .sort((left, right) => String(left.node_key).localeCompare(String(right.node_key))),
        []
      ];
    }

    if (normalized.includes('FROM project_detailed_design_review_forms f') && normalized.includes('WHERE f.project_id = ?')) {
      const rows = this.reviewForms
        .filter((form) => form.is_current === 1)
        .sort((left, right) => String(left.node_key).localeCompare(String(right.node_key)))
        .map((row) => this.makeReviewFormResultRow(row));
      return [rows, []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_review_forms SET is_current = 0')) {
      const [, nodeKey] = params;
      for (const form of this.reviewForms) {
        if (form.node_key === nodeKey && form.is_current === 1) {
          form.is_current = 0;
        }
      }
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_review_forms')) {
      const [
        projectId,
        nodeKey,
        reviewType,
        revision,
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateKey,
        generatedFileTemplateVersion,
        generatedByUserId,
        generationErrorMessage,
        actorUserId
      ] = params;
      const row = this.insertReviewForm({
        projectId,
        nodeKey,
        reviewType,
        revision,
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateKey,
        generatedFileTemplateVersion,
        generatedByUserId,
        generationErrorMessage,
        actorUserId
      });
      return [[{ insertId: row.id, affectedRows: 1 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_review_forms SET form_status = ?')) {
      const [
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateKey,
        generatedFileTemplateVersion,
        generatedByUserId,
        generationErrorMessage,
        actorUserId,
        formId
      ] = params;
      const form = this.reviewForms.find((item) => item.id === formId);
      if (form) {
        Object.assign(form, {
          form_status: formStatus,
          form_data_json: formDataJson,
          submitted_by_user_id: submittedByUserId,
          submitted_at: submittedByUserId ? '2026-07-22 10:00:00' : null,
          generated_file_status: generatedFileStatus,
          generated_file_storage_key: null,
          generated_file_name: null,
          generated_file_mime_type: null,
          generated_file_size: null,
          generated_file_template_key: generatedFileTemplateKey,
          generated_file_template_version: generatedFileTemplateVersion,
          generated_file_template_hash: null,
          generated_at: null,
          generated_by_user_id: generatedByUserId,
          generation_error_message: generationErrorMessage,
          review_status: 'pending',
          reviewed_by_user_id: null,
          reviewed_at: null,
          return_reason: null,
          updated_by_user_id: actorUserId
        });
      }
      return [[{ affectedRows: form ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_review_forms SET generated_file_status = ?') &&
      normalized.includes('generated_file_storage_key = ?')) {
      const [
        generatedFileStatus,
        storageKey,
        fileName,
        mimeType,
        fileSize,
        templateKey,
        templateVersion,
        generatedByUserId,
        updatedByUserId,
        formId
      ] = params;
      const form = this.reviewForms.find((item) => item.id === formId);
      if (form) {
        Object.assign(form, {
          generated_file_status: generatedFileStatus,
          generated_file_storage_key: storageKey,
          generated_file_name: fileName,
          generated_file_mime_type: mimeType,
          generated_file_size: fileSize,
          generated_file_template_key: templateKey,
          generated_file_template_version: templateVersion,
          generated_at: '2026-07-22 10:00:00',
          generated_by_user_id: generatedByUserId,
          generation_error_message: null,
          updated_by_user_id: updatedByUserId
        });
      }
      return [[{ affectedRows: form ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_review_forms SET generated_file_status = ?') &&
      normalized.includes('generation_error_message = ?')) {
      const [
        generatedFileStatus,
        templateKey,
        templateVersion,
        generatedByUserId,
        generationErrorMessage,
        updatedByUserId,
        formId
      ] = params;
      const form = this.reviewForms.find((item) => item.id === formId);
      if (form) {
        Object.assign(form, {
          generated_file_status: generatedFileStatus,
          generated_file_storage_key: null,
          generated_file_name: null,
          generated_file_mime_type: null,
          generated_file_size: null,
          generated_file_template_key: templateKey,
          generated_file_template_version: templateVersion,
          generated_at: '2026-07-22 10:00:00',
          generated_by_user_id: generatedByUserId,
          generation_error_message: generationErrorMessage,
          updated_by_user_id: updatedByUserId
        });
      }
      return [[{ affectedRows: form ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_review_forms SET review_status = ?')) {
      const [reviewStatus, reviewedByUserId, returnReason, updatedByUserId, formId] = params;
      const form = this.reviewForms.find((item) => item.id === formId);
      if (form) {
        form.review_status = reviewStatus;
        form.reviewed_by_user_id = reviewedByUserId;
        form.reviewed_at = '2026-07-22 10:00:00';
        form.return_reason = returnReason;
        form.updated_by_user_id = updatedByUserId;
      }
      return [[{ affectedRows: form ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 0, completed_at = CURRENT_TIMESTAMP WHERE id = ?')) {
      const [stageStatus, stageId] = params;
      const stage = this.stageRows.find((item) => Number(item.id) === Number(stageId));
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 0;
        stage.completed_at = '2026-07-22 10:00:00';
      }
      this.syncProjectCurrentStageFromStages();
      return [[{ affectedRows: stage ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 1, started_at = CURRENT_TIMESTAMP WHERE id = ?')) {
      const [stageStatus, stageId] = params;
      const stage = this.stageRows.find((item) => Number(item.id) === Number(stageId));
      if (stage) {
        for (const otherStage of this.stageRows) {
          if (otherStage.id !== stage.id) {
            otherStage.is_current = 0;
          }
        }
        stage.stage_status = stageStatus;
        stage.is_current = 1;
        stage.started_at = '2026-07-22 10:00:00';
      }
      this.syncProjectCurrentStageFromStages();
      return [[{ affectedRows: stage ? 1 : 0 }], []];
    }

    if (normalized.startsWith('UPDATE projects SET status = ? WHERE id = ?')) {
      const [status, projectId] = params;
      if (Number(projectId) === Number(this.projectRow.id)) {
        this.projectRow.status = status;
      }
      return [[{ affectedRows: Number(projectId) === Number(this.projectRow.id) ? 1 : 0 }], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_drawing_review_flows')) {
      if (params.length === 6) {
        const [projectId, currentRevision, productPlanDrawingRevision, partsListRevision, checkerStatus, rdApprovalStatus] = params;
        this.upsertDrawingReviewFlow({
          projectId,
          currentRevision,
          productPlanDrawingRevision,
          partsListRevision,
          checkerStatus,
          rdApprovalStatus
        });
      } else {
        const [
          projectId,
          currentRevision,
          productPlanDrawingRevision,
          partsListRevision,
          checkerStatus,
          rdApprovalStatus,
          checkerUserId,
          checkerAt,
          checkerComment,
          rdApproverUserId,
          rdApprovedAt,
          rdComment,
          returnReason,
          createdByUserId,
          updatedByUserId
        ] = params;
        this.upsertDrawingReviewFlow({
          projectId,
          currentRevision,
          productPlanDrawingRevision,
          partsListRevision,
          checkerStatus,
          rdApprovalStatus,
          checkerUserId,
          checkerAt,
          checkerComment,
          rdApproverUserId,
          rdApprovedAt,
          rdComment,
          returnReason,
          actorUserId: updatedByUserId ?? createdByUserId
        });
      }
      return [[{ affectedRows: 1 }], []];
    }

    if (normalized.includes('FROM project_detailed_design_drawing_review_flows f') && normalized.includes('LIMIT 1')) {
      return [this.drawingReviewFlow ? [this.makeDrawingReviewFlowResultRow(this.drawingReviewFlow)] : [], []];
    }

    if (normalized.startsWith('SELECT COALESCE(MAX(revision), 0) AS max_revision FROM project_detailed_design_drawing_review_records')) {
      const maxRevision = this.drawingReviewRecords.reduce((max, row) => Math.max(max, Number(row.revision || 0)), 0);
      return [[{ max_revision: maxRevision }], []];
    }

    if (normalized.startsWith('SELECT * FROM project_detailed_design_drawing_review_records WHERE project_id = ? AND drawing_revision = ? AND is_current = 1')) {
      const [, drawingRevision] = params;
      const row = this.drawingReviewRecords
        .filter((item) => item.is_current === 1 && Number(item.drawing_revision) === Number(drawingRevision))
        .sort((left, right) => right.revision - left.revision || right.id - left.id)[0] || null;
      return [row ? [this.makeDrawingReviewRecordResultRow(row)] : [], []];
    }

    if (
      normalized.includes('FROM project_detailed_design_drawing_review_records r') &&
      normalized.includes('AND r.id = ?')
    ) {
      const [, recordId] = params;
      const row = this.drawingReviewRecords.find((item) => Number(item.id) === Number(recordId)) || null;
      return [row ? [this.makeDrawingReviewRecordResultRow(row)] : [], []];
    }

    if (normalized.includes('FROM project_detailed_design_drawing_review_records r')) {
      return [
        this.cloneRows(this.drawingReviewRecords)
          .sort((left, right) => left.drawing_revision - right.drawing_revision || left.revision - right.revision || left.id - right.id)
          .map((row) => this.makeDrawingReviewRecordResultRow(row)),
        []
      ];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_drawing_review_records SET is_current = 0')) {
      const [, drawingRevision] = params;
      let affectedRows = 0;
      for (const record of this.drawingReviewRecords) {
        if (record.is_current === 1 && Number(record.drawing_revision) === Number(drawingRevision)) {
          record.is_current = 0;
          record.replaced_at = '2026-07-22 10:00:00';
          affectedRows += 1;
        }
      }
      return [[{ affectedRows }], []];
    }

    if (normalized.startsWith('UPDATE project_detailed_design_drawing_review_records SET return_reason = ?')) {
      const [returnReason, projectId, recordId] = params;
      const record = this.drawingReviewRecords.find((item) => item.project_id === projectId && item.id === recordId);
      if (record) {
        record.return_reason = returnReason;
        record.updated_at = '2026-07-22 10:00:00';
      }
      return [[{ affectedRows: record ? 1 : 0 }], []];
    }

    if (normalized.startsWith('INSERT INTO project_detailed_design_drawing_review_records')) {
      const [
        projectId,
        revision,
        drawingRevision,
        originalFileName,
        storageKey,
        mimeType,
        fileSize,
        currentDesignRevision,
        returnReason,
        uploadedByUserId
      ] = params;
      const record = this.insertDrawingReviewRecord({
        projectId,
        revision,
        drawingRevision,
        originalFileName,
        storageKey,
        mimeType,
        fileSize,
        currentDesignRevision,
        returnReason,
        uploadedByUserId
      });
      return [[{ insertId: record.id, affectedRows: 1 }], []];
    }

    if (normalized.includes('FROM users') && normalized.includes('WHERE id IN')) {
      const rows = params
        .map((id) => this.usersById.get(Number(id)))
        .filter(Boolean)
        .map((row) => ({ ...row }));
      return [rows, []];
    }

    if (normalized.startsWith('INSERT INTO business_operation_logs')) {
      const [projectId, actorUserId, actionType, targetType, targetId, summary, detailsJson] = params;
      this.operationLogs.push({
        projectId,
        actorUserId,
        actionType,
        targetType,
        targetId,
        summary,
        detailsJson: detailsJson ? JSON.parse(detailsJson) : null
      });
      return [[{ insertId: this.operationLogs.length, affectedRows: 1 }], []];
    }

    throw new Error(`Unexpected SQL: ${normalized}`);
  }
}

function createDb(connection) {
  return {
    async getConnection() {
      return connection;
    }
  };
}

function buildWorkbenchStageDocumentRow(connection, {
  id,
  documentCode,
  documentName,
  responsibleUserId,
  status,
  completionMode,
  reviewDepartment = null,
  revisionRequired = 0,
  revisionResubmittedAt = null,
  documentOrder,
  responsibilityUpdatedAt = '2026-07-22 10:00:00',
  submittedAt = null,
  updatedAt = '2026-07-22 10:00:00'
}) {
  const responsibleUser = connection.usersById.get(Number(responsibleUserId));
  return {
    id,
    project_id: connection.projectRow.id,
    project_code: connection.projectRow.project_code,
    project_name: connection.projectRow.project_name,
    project_manager_user_id: connection.projectRow.project_manager_user_id,
    participating_departments: null,
    project_status: connection.projectRow.status,
    project_updated_at: connection.projectRow.updated_at ?? '2026-07-22 10:00:00',
    stage_id: DETAILED_DESIGN_STAGE.STAGE_ORDER,
    stage_order: DETAILED_DESIGN_STAGE.STAGE_ORDER,
    stage_key: DETAILED_DESIGN_STAGE.STAGE_KEY,
    stage_name: DETAILED_DESIGN_STAGE.STAGE_NAME,
    document_order: documentOrder,
    document_code: documentCode,
    document_name: documentName,
    owner_department: null,
    review_department: reviewDepartment,
    status,
    completion_mode: completionMode,
    is_applicable: 1,
    revision_required: revisionRequired,
    revision_resubmitted_at: revisionResubmittedAt,
    responsible_user_id: responsibleUserId,
    responsible_account: responsibleUser?.account ?? null,
    responsible_display_name: responsibleUser?.display_name ?? null,
    responsible_department: responsibleUser?.department ?? null,
    responsible_organization_role: responsibleUser?.organization_role ?? null,
    responsible_role: responsibleUser?.role ?? null,
    responsible_is_enabled: responsibleUser?.is_enabled ?? null,
    responsible_file_platform_user_id: responsibleUser?.file_platform_user_id ?? null,
    responsibility_updated_at: responsibilityUpdatedAt,
    submitted_at: submittedAt,
    updated_at: updatedAt,
    returned_at: null,
    return_reason: null,
    revision_reason: null,
    revision_source_document_id: null,
    revision_requested_at: null,
    revision_resubmitted_by_user_id: null,
    revision_completed_by_user_id: null,
    revision_completed_at: null,
    not_applicable_by_user_id: null,
    not_applicable_at: null,
    not_applicable_reason: null,
    restored_applicable_by_user_id: null,
    restored_applicable_at: null
  };
}

function getDetailedDesignChecklistResponsibleUserId(documentCode) {
  if (documentCode === 'C25') {
    return 18;
  }
  if (documentCode === 'C40') {
    return 16;
  }
  if (documentCode === 'C41') {
    return 12;
  }
  return 13;
}

function buildDetailedDesignChecklistRows(connection) {
  const definitions = [
    ...DETAILED_DESIGN_UPLOAD_SLOTS.map((slot) => ({
      documentCode: slot.documentCode,
      documentName: slot.slotName
    })),
    {
      documentCode: 'C31',
      documentName: '控制逻辑流程图'
    },
    {
      documentCode: 'C36',
      documentName: '设计评审记录表（内部设计评审）'
    },
    {
      documentCode: 'C37',
      documentName: '设计评审记录表（客户设计评审）'
    },
    {
      documentCode: 'C40',
      documentName: '图纸审查记录表'
    }
  ].sort((left, right) => Number(left.documentCode.slice(1)) - Number(right.documentCode.slice(1)));

  return definitions.map((definition) => {
    const documentOrder = Number(definition.documentCode.slice(1));
    return buildWorkbenchStageDocumentRow(connection, {
      id: 9400 + documentOrder,
      documentCode: definition.documentCode,
      documentName: definition.documentName,
      responsibleUserId: getDetailedDesignChecklistResponsibleUserId(definition.documentCode),
      status: 'not_submitted',
      completionMode: 'submit_only',
      documentOrder
    });
  });
}

async function withFakeWorkbenchPool(connection, ordinaryRows, callback) {
  const originalGetConnection = pool.getConnection;
  const originalExecute = pool.execute;
  const wrapper = Object.create(connection);

  wrapper.execute = async (sql, params = []) => {
    const normalized = normalizeSql(sql);
    if (normalized.includes('project_solution_design_') || normalized.includes('project_contract_signing_')) {
      return [[], []];
    }
    return connection.execute(sql, params);
  };

  pool.getConnection = async () => wrapper;
  pool.execute = async (sql, params = []) => {
    const normalized = normalizeSql(sql);
    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes('d.responsible_user_id = ?') &&
      normalized.includes('d.document_code <> ?') &&
      normalized.includes('d.document_code NOT IN (')
    ) {
      const currentUserId = Number(params[0]);
      const excludedCodes = new Set(
        params.filter((value) => typeof value === 'string' && /^C\d+$/.test(value))
      );
      const rows = ordinaryRows.filter(
        (row) =>
          Number(row.responsible_user_id) === currentUserId &&
          row.project_status !== 'ended' &&
          row.is_applicable === 1 &&
          !excludedCodes.has(row.document_code) &&
          (
            row.status === 'not_submitted' ||
            row.status === 'returned' ||
            (row.revision_required === 1 && !(
              ['approval_required', 'conditional_approval'].includes(row.completion_mode) &&
              row.status === 'submitted' &&
              row.revision_resubmitted_at !== null
            ))
          )
      );
      return [rows.map((row) => ({ ...row })), []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes('d.document_code NOT IN (') &&
      normalized.includes('d.status = ?') &&
      normalized.includes('d.completion_mode = ?')
    ) {
      const projectStatus = params[0];
      const excludedCodes = new Set(
        params.filter((value) => typeof value === 'string' && /^C\d+$/.test(value))
      );
      const reviewDepartment = params[params.length - 2];
      const department = params[params.length - 1];
      const rows = ordinaryRows.filter(
        (row) =>
          row.project_status !== projectStatus &&
          row.document_code !== '1.2' &&
          !excludedCodes.has(row.document_code) &&
          row.is_applicable === 1 &&
          row.status === 'submitted' &&
          row.completion_mode === 'approval_required' &&
          (row.review_department === reviewDepartment || (row.review_department === null && row.responsible_department === department))
      );
      return [rows.map((row) => ({ ...row })), []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes("d.document_code IN ('1.1', '1.2', '1.3')")
    ) {
      return [[], []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes("d.document_code = '1.3'")
    ) {
      return [[], []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes('d.document_code = ?') &&
      normalized.includes('project_stage_document_forms')
    ) {
      return [[], []];
    }

    if (normalized.includes('FROM project_initiation_review_nodes')) {
      return [[], []];
    }

    return connection.execute(sql, params);
  };

  try {
    return await callback();
  } finally {
    pool.getConnection = originalGetConnection;
    pool.execute = originalExecute;
  }
}

async function withFakeChecklistPool(connection, ordinaryRows, callback) {
  const originalExecute = pool.execute;

  pool.execute = async (sql, params = []) => {
    const normalized = normalizeSql(sql);
    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes('ORDER BY d.stage_order ASC, d.document_order ASC')
    ) {
      return [ordinaryRows.map((row) => ({ ...row })), []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes("d.document_code IN ('1.1', '1.2', '1.3')")
    ) {
      return [[], []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes("d.document_code = '1.3'")
    ) {
      return [[], []];
    }

    if (
      normalized.includes('FROM project_stage_documents d') &&
      normalized.includes('d.document_code = ?') &&
      normalized.includes('project_stage_document_forms')
    ) {
      return [[], []];
    }

    if (normalized.includes('FROM project_initiation_review_nodes')) {
      return [[], []];
    }

    return connection.execute(sql, params);
  };

  try {
    return await callback();
  } finally {
    pool.execute = originalExecute;
  }
}

function createFakeUploadStorage() {
  const files = new Map();
  return {
    files,
    createStorageKey({ projectId, slotKey }) {
      return `${projectId}/${slotKey}/${files.size + 1}`;
    },
    async writeFile(storageKey, buffer) {
      files.set(storageKey, Buffer.from(buffer));
      return {
        filePath: `memory://${storageKey}`,
        size: buffer.length
      };
    },
    async assertFileReadable(storageKey) {
      if (!files.has(storageKey)) {
        throw new Error('missing file');
      }
      return `memory://${storageKey}`;
    },
    async cleanupFile(storageKey) {
      files.delete(storageKey);
    }
  };
}

function createFakeGeneratedFileStorage({ failWrite = false } = {}) {
  const files = new Map();
  const written = [];
  const cleaned = [];
  return {
    files,
    written,
    cleaned,
    createStorageKey({ projectId, documentCode, revision, fileType = 'xlsx' }) {
      return `${projectId}/generated/${documentCode}/v${revision}-${written.length + cleaned.length + 1}.${fileType}`;
    },
    async writeFile(storageKey, buffer) {
      const storedBuffer = Buffer.from(buffer);
      files.set(storageKey, { size: storedBuffer.length, buffer: storedBuffer });
      if (failWrite) {
        const error = new Error('fake generated file write failed');
        error.code = 'FAKE_GENERATED_FILE_WRITE_FAILED';
        throw error;
      }
      written.push({ storageKey, size: storedBuffer.length, buffer: storedBuffer });
      return {
        filePath: `memory://${storageKey}`,
        size: storedBuffer.length
      };
    },
    async assertFileReadable(storageKey) {
      if (!files.has(storageKey)) {
        throw new Error('generated file missing');
      }
      return `memory://${storageKey}`;
    },
    async cleanupFile(storageKey) {
      cleaned.push(storageKey);
      files.delete(storageKey);
    }
  };
}

function makeUploadFile(originalFileName, content = 'file content', mimeType = 'application/octet-stream') {
  const buffer = Buffer.from(content);
  return {
    originalFileName,
    mimeType,
    size: buffer.length,
    buffer
  };
}

function decodeXmlText(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractXlsxTextFromXml(xml) {
  return decodeXmlText(
    [...String(xml || '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => match[1])
      .join('')
  );
}

function generatedFileBuffer(storage, storageKey) {
  const stored = storage.files.get(storageKey);
  assert.ok(stored, `Expected generated storage key ${storageKey}`);
  assert.ok(Buffer.isBuffer(stored.buffer), `Expected generated buffer for ${storageKey}`);
  return stored.buffer;
}

function extractXlsxCellText(buffer, cellRef) {
  const entries = readZipEntries(buffer);
  const sharedStringsXml = entries.find((entry) => entry.name === 'xl/sharedStrings.xml')?.data.toString('utf8') || '';
  const sharedStrings = [...sharedStringsXml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) =>
    extractXlsxTextFromXml(match[0])
  );
  const sheetXml = entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml')?.data.toString('utf8') || '';
  const cellMatch = sheetXml.match(new RegExp(`<c\\b(?=[^>]*\\br="${cellRef}")[^>]*?(?:/>|>[\\s\\S]*?</c>)`));
  assert.ok(cellMatch, `Expected generated xlsx cell ${cellRef}`);
  const cellXml = cellMatch[0];
  if (/\bt="s"/.test(cellXml)) {
    const sharedIndex = Number(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1]);
    return sharedStrings[sharedIndex] || '';
  }
  const inlineText = extractXlsxTextFromXml(cellXml);
  if (inlineText) {
    return inlineText;
  }
  return decodeXmlText(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '');
}

function assertGeneratedXlsxCellIncludes(storage, storageKey, cellRef, expected) {
  const value = extractXlsxCellText(generatedFileBuffer(storage, storageKey), cellRef);
  assert.match(value, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

function assertGeneratedXlsxCellEquals(storage, storageKey, cellRef, expected) {
  const value = extractXlsxCellText(generatedFileBuffer(storage, storageKey), cellRef);
  assert.equal(value, expected, `Expected generated xlsx ${cellRef}`);
}

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function findSlot(workflow, slotKey) {
  return workflow.uploadSlots.find((slot) => slot.slotKey === slotKey);
}

function makeRoleAssignmentPayload(overrides = {}) {
  return {
    projectManagerUserId: 11,
    businessOwnerUserId: 12,
    technicalOwnerUserId: 13,
    procurementOwnerUserId: 14,
    financeAccountantUserId: 15,
    drawingReviewOwnerUserId: 16,
    professionalGroupMemberUserIds: [17],
    ...overrides
  };
}

const WRITE_PERMISSION_KEYS = new Set([
  'canAssignRoles',
  'canUploadProjectKickoffBook',
  'canUploadWorkPlan',
  'canUploadDetailedDesignFiles',
  'canEdit',
  'canSubmit',
  'canApprove',
  'canReturn',
  'canUploadProductPlanDrawing',
  'canUploadPartsList',
  'canUploadRecord',
  'canPass',
  'canReturnByRd',
  'canUploadCustomerDrawingCountersign',
  'canUpload'
]);

function assertNoWritePermissions(permissionBag, label = 'permissions') {
  for (const [key, value] of Object.entries(permissionBag || {})) {
    if (WRITE_PERMISSION_KEYS.has(key)) {
      assert.equal(value, false, `${label}.${key} should be false`);
    }
  }
}

function assertWorkflowHasNoWritePermissions(workflow) {
  assertNoWritePermissions(workflow.permissions, 'workflow.permissions');
  for (const node of workflow.nodes) {
    assertNoWritePermissions(node.permissions, `node.${node.nodeKey}.permissions`);
  }
  for (const slot of workflow.uploadSlots) {
    assertNoWritePermissions(slot.permissions, `slot.${slot.slotKey}.permissions`);
  }
  for (const form of workflow.reviewForms) {
    assertNoWritePermissions(form.permissions, `reviewForm.${form.nodeKey}.permissions`);
  }
  assertNoWritePermissions(workflow.drawingReview.permissions, 'drawingReview.permissions');
}

function seedDetailedDesignWorkflowRows(connection, { nodeStatuses = {} } = {}) {
  connection.nodes = [];
  connection.uploadSlots = [];

  for (const definition of DETAILED_DESIGN_NODES) {
    connection.insertNode(
      connection.projectRow.id,
      definition.nodeKey,
      definition.nodeName,
      definition.nodeOrder,
      nodeStatuses[definition.nodeKey] || DETAILED_DESIGN_NODE_STATUS.NOT_STARTED
    );
  }

  for (const slot of DETAILED_DESIGN_UPLOAD_SLOTS) {
    connection.insertSlot(
      connection.projectRow.id,
      slot.nodeKey,
      slot.slotKey,
      slot.slotName,
      slot.slotOrder,
      'pending'
    );
  }
}

function makeReviewFormRow({ nodeKey, formStatus, reviewStatus }) {
  const isInternal = nodeKey === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW;
  return {
    id: 1,
    project_id: 401,
    node_key: nodeKey,
    review_type: isInternal ? 'internal' : 'customer',
    document_code: isInternal ? 'C36' : 'C37',
    document_name: isInternal ? '设计评审记录表（内部设计评审）' : '设计评审记录表（客户设计评审）',
    revision: 1,
    form_status: formStatus,
    form_data_json: '{}',
    is_current: 1,
    generated_file_status: 'not_started',
    review_status: reviewStatus,
    return_reason: reviewStatus === 'returned' ? '评审退回原因' : null
  };
}

function findNode(workflow, nodeKey) {
  return workflow.nodes.find((node) => node.nodeKey === nodeKey);
}

function findTodo(todos, nodeKey, actionKey = null) {
  return todos.find((todo) =>
    todo.nodeKey === nodeKey &&
    (actionKey === null || todo.actionKey === actionKey)
  );
}

function assertDetailedDesignTodoShape(todo, { nodeKey, actionText, actionKey }) {
  assert.ok(todo, `Expected detailed design todo ${nodeKey}:${actionKey}`);
  assert.equal(todo.type, DETAILED_DESIGN_WORKBENCH_TODO_TYPE);
  assert.equal(todo.taskType, DETAILED_DESIGN_WORKBENCH_TODO_TYPE);
  assert.equal(todo.projectId, 401);
  assert.equal(todo.projectCode, 'DD-401');
  assert.equal(todo.projectName, '详细设计骨架测试项目');
  assert.equal(todo.stageId, 4);
  assert.equal(todo.stageOrder, DETAILED_DESIGN_STAGE.STAGE_ORDER);
  assert.equal(todo.stageName, DETAILED_DESIGN_STAGE.STAGE_NAME);
  assert.equal(todo.nodeKey, nodeKey);
  assert.equal(todo.actionText, actionText);
  assert.equal(todo.actionKey, actionKey);
  assert.equal(
    todo.targetRoute,
    `/projects/401?taskMode=detailedDesign&focusNodeKey=${nodeKey}`
  );
  assert.ok(Array.isArray(todo.blockingReasons));
}

function findReviewForm(workflow, nodeKey) {
  return workflow.reviewForms.find((form) => form.nodeKey === nodeKey);
}

function findChecklistDocument(checklist, documentCode) {
  return checklist.stages
    .flatMap((stage) => stage.documents || [])
    .find((document) => document.documentCode === documentCode);
}

function assertChecklistDerivedCompletion(document, {
  documentCode,
  source = 'detailed_design_workflow',
  nodeKey = null,
  revision = null,
  completionStatus = null,
  isComplete = null,
  notApplicable = null
}) {
  assert.ok(document, `Expected checklist document ${documentCode}`);
  assert.equal(document.derivedCompletionSource, source);
  if (nodeKey !== null) {
    assert.equal(document.detailedDesignDerivedCompletion.nodeKey, nodeKey);
  }
  if (revision !== null) {
    assert.equal(document.detailedDesignDerivedCompletion.revision, revision);
  }
  if (completionStatus !== null) {
    assert.equal(document.completionStatus, completionStatus);
  }
  if (isComplete !== null) {
    assert.equal(document.isComplete, isComplete);
  }
  if (notApplicable !== null) {
    assert.equal(document.detailedDesignDerivedCompletion.derivedNotApplicable, notApplicable);
  }
}

function makeDetailedDesignReviewPayload(overrides = {}) {
  return {
    meetingDate: '2026-07-22',
    meetingLocation: '详细设计评审会议室',
    presenter: '技术负责人',
    internalParticipants: '研发中心负责人、项目经理、技术负责人',
    customerParticipants: '客户代表',
    designGoalAchievement: ['目标达成第一项', '目标达成第二项'],
    designRiskAssessment: ['风险评估第一项', '风险评估第二项'],
    designOptimizationSuggestions: ['优化建议第一项', '优化建议第二项'],
    implementationPlanItems: {
      designGoalAchievement: ['实施计划第一项', '实施计划第二项'],
      designRiskAssessment: ['风险实施计划第一项', '风险实施计划第二项'],
      designOptimizationSuggestions: ['优化实施计划第一项', '优化实施计划第二项']
    },
    designImplementationPlan: [
      '目标1：目标达成第一项\n实施计划：实施计划第一项',
      '目标2：目标达成第二项\n实施计划：实施计划第二项',
      '风险1：风险评估第一项\n实施计划：风险实施计划第一项',
      '风险2：风险评估第二项\n实施计划：风险实施计划第二项',
      '建议1：优化建议第一项\n实施计划：优化实施计划第一项',
      '建议2：优化建议第二项\n实施计划：优化实施计划第二项'
    ],
    reviewConclusion: '评审通过，进入下一步。',
    recorder: '技术负责人',
    ...overrides
  };
}

function seedWorkflowAtDetailedDesign(connection) {
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
}

function seedWorkflowAtInternalReview(connection) {
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
}

function seedWorkflowAtProductPlanDrawing(connection) {
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
}

function seedWorkflowAtPartsList(connection) {
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.PARTS_LIST]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
}

async function prepareWorkflowAtDrawingReview({ connection, db, storage }) {
  seedWorkflowAtProductPlanDrawing(connection);

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    file: makeUploadFile('产品平面图.dwg', 'plan', 'application/acad'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, storage);
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    file: makeUploadFile('零部件清单.xlsx', 'parts', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, storage);
  return submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
}

async function prepareWorkflowAtCustomerCountersign({ connection, db, uploadStorage }) {
  await prepareWorkflowAtDrawingReview({ connection, db, storage: uploadStorage });
  await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '图纸审查无问题。' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  return approveDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '图纸审查审批通过。' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
}

async function uploadAllDetailedDesignMainFiles({ connection, db, storage }) {
  let workflow = null;
  const detailedDesignSlots = DETAILED_DESIGN_UPLOAD_SLOTS.filter((slot) =>
    slot.nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN
  );
  for (const slot of detailedDesignSlots) {
    workflow = await uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: slot.slotKey,
      file: makeUploadFile(`${slot.slotKey}.zip`, slot.slotKey, 'application/zip'),
      user: makeAuthUser(connection.usersById.get(13))
    }, db, storage);
  }
  return workflow;
}

async function uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage }) {
  await uploadAllDetailedDesignMainFiles({ connection, db, storage });
  return submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
}

function createWorkspaceFromWorkflow(workflow) {
  return {
    project: {
      projectMode: 'standard',
      projectName: '详细设计骨架测试项目',
      projectCode: 'DD-401',
      status: 'normal'
    },
    currentStage: workflow.currentStage,
    stages: [
      {
        stageId: workflow.stageOrder,
        stageOrder: workflow.stageOrder,
        stageKey: workflow.stageKey,
        stageName: '详细设计阶段',
        stageStatus: 'current',
        isCurrent: true,
        configured: true,
        legacyChecklistAvailable: true,
        nodes: workflow.nodes.map((node) => ({
          nodeKey: node.nodeKey,
          nodeName: node.nodeName,
          nodeStatus: node.status,
          nodeOrder: node.nodeOrder,
          outputs: [],
          blockingReasons: node.blockingReasons,
          actionHints: node.nextActions,
          notes: ''
        }))
      }
    ]
  };
}

test('detailed design workflow initializes 9 nodes and the workflow DTO is authoritative', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);

  const manufacturingWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(18))
  }, db);
  const rdWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  const technicalWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(connection.nodes.length, DETAILED_DESIGN_NODES.length);
  assert.deepEqual(
    manufacturingWorkflow.nodes.map((node) => node.nodeKey),
    DETAILED_DESIGN_NODES.map((definition) => definition.nodeKey)
  );
  assert.deepEqual(
    manufacturingWorkflow.nodes.map((node) => node.status),
    [
      DETAILED_DESIGN_NODE_STATUS.PENDING,
      ...Array.from({ length: DETAILED_DESIGN_NODES.length - 1 }, () => DETAILED_DESIGN_NODE_STATUS.NOT_STARTED)
    ]
  );
  assert.deepEqual(
    manufacturingWorkflow.uploadSlots.map((slot) => slot.slotKey),
    DETAILED_DESIGN_UPLOAD_SLOTS.map((slot) => slot.slotKey)
  );
  assert.equal(manufacturingWorkflow.reviewForms.length, 2);
  assert.equal(manufacturingWorkflow.drawingReview.nodeKey, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW);
  assert.deepEqual(manufacturingWorkflow.drawingReview.blockingReasons, []);
  assert.equal(manufacturingWorkflow.permissions.isManufacturingCenterManager, true);
  assert.equal(manufacturingWorkflow.nodes[0].permissions.canUploadProjectKickoffBook, true);
  for (const node of manufacturingWorkflow.nodes.slice(1)) {
    assertNoWritePermissions(node.permissions, `initial.${node.nodeKey}.permissions`);
  }
  assert.equal(manufacturingWorkflow.uploadSlots[0].permissions.canUpload, true);
  for (const slot of manufacturingWorkflow.uploadSlots.slice(1)) {
    assert.equal(slot.permissions.canUpload, false, `initial.${slot.slotKey}.canUpload should be false`);
  }
  assert.equal(
    findNode(manufacturingWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN)
      .permissions.canUploadDetailedDesignFiles,
    false
  );
  assert.equal(rdWorkflow.permissions.canAssignRoles, false);
  assert.equal(
    findNode(rdWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).permissions.canAssignRoles,
    false
  );
  assert.equal(technicalWorkflow.permissions.isTechnicalOwner, true);
  assert.equal(
    findNode(technicalWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN)
      .permissions.canUploadDetailedDesignFiles,
    false
  );
  assert.equal(DETAILED_DESIGN_COMPATIBILITY_ONLY_DOCUMENT_CODES.has('C31'), true);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C31'), false);
});

test('detailed design workbench todos are generated from DTO permissions', async () => {
  const kickoffConnection = new FakeDetailedDesignConnection();
  const kickoffDb = createDb(kickoffConnection);

  const kickoffTodos = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(kickoffConnection.usersById.get(18)),
    kickoffDb
  );
  assert.equal(kickoffTodos.length, 1);
  const kickoffTodo = findTodo(
    kickoffTodos,
    DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    'upload_project_kickoff_book'
  );
  assertDetailedDesignTodoShape(kickoffTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    actionText: '上传项目启动书',
    actionKey: 'upload_project_kickoff_book'
  });
  assert.equal(kickoffTodo.status, DETAILED_DESIGN_NODE_STATUS.PENDING);
  assert.equal(kickoffTodo.revision, 1);
  assert.equal(kickoffTodo.blockingReasons[0], '等待制造中心负责人上传项目启动书');
  assert.equal(kickoffTodos.some((todo) => todo.nodeKey === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING), true);

  const kickoffWrongRoleTodos = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(kickoffConnection.usersById.get(13)),
    kickoffDb
  );
  assert.equal(
    kickoffWrongRoleTodos.some((todo) => todo.nodeKey === DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING),
    false
  );

  const preparationConnection = new FakeDetailedDesignConnection();
  preparationConnection.rolesRow = {
    project_id: preparationConnection.projectRow.id,
    project_manager_user_id: 11,
    business_owner_user_id: 12,
    technical_owner_user_id: 13,
    procurement_owner_user_id: 14,
    finance_accountant_user_id: 15,
    drawing_review_owner_user_id: 16,
    assigned_by_user_id: 10,
    updated_by_user_id: 10
  };
  seedDetailedDesignWorkflowRows(preparationConnection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
  const preparationDb = createDb(preparationConnection);
  const rdTodos = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(preparationConnection.usersById.get(10)),
    preparationDb
  );
  assert.equal(rdTodos.length, 1);
  const rdTodo = findTodo(rdTodos, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION, 'assign_roles');
  assertDetailedDesignTodoShape(rdTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    actionText: '分配详细设计角色',
    actionKey: 'assign_roles'
  });
  assert.equal(rdTodo.blockingReasons[0], '等待项目经理上传详细设计阶段工作计划');

  const projectManagerTodo = findTodo(
    await selectDetailedDesignWorkbenchTodos(makeAuthUser(preparationConnection.usersById.get(11)), preparationDb),
    DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    'upload_work_plan'
  );
  assertDetailedDesignTodoShape(projectManagerTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    actionText: '上传详细设计工作计划',
    actionKey: 'upload_work_plan'
  });

  const technicalNoTodo = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(preparationConnection.usersById.get(13)),
    preparationDb
  );
  assert.equal(
    technicalNoTodo.some((todo) => todo.nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION),
    false
  );

  const detailedDesignConnection = new FakeDetailedDesignConnection();
  seedDetailedDesignWorkflowRows(detailedDesignConnection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
  const detailedDesignTodo = findTodo(
    await selectDetailedDesignWorkbenchTodos(makeAuthUser(detailedDesignConnection.usersById.get(13)), createDb(detailedDesignConnection)),
    DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    'upload_detailed_design_files'
  );
  assertDetailedDesignTodoShape(detailedDesignTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    actionText: '上传 8 个详细设计文件',
    actionKey: 'upload_detailed_design_files'
  });
  assert.equal(detailedDesignTodo.blockingReasons[0], '等待技术负责人上传3D模型（详细设计）或标记无需上传');

  const endedConnection = new FakeDetailedDesignConnection();
  endedConnection.projectRow.status = 'ended';
  const endedTodos = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(endedConnection.usersById.get(18)),
    createDb(endedConnection)
  );
  assert.deepEqual(endedTodos, []);

  const missingSchemaConnection = new FakeDetailedDesignConnection();
  const missingSchemaExecute = missingSchemaConnection.execute.bind(missingSchemaConnection);
  missingSchemaConnection.execute = async (sql, params) => {
    if (String(sql).includes('project_detailed_design_')) {
      const error = new Error('Table project_detailed_design_nodes doesn\'t exist');
      error.code = 'ER_NO_SUCH_TABLE';
      error.sqlMessage = 'Table project_detailed_design_nodes doesn\'t exist';
      throw error;
    }

    return missingSchemaExecute(sql, params);
  };
  const missingSchemaTodos = await selectDetailedDesignWorkbenchTodos(
    makeAuthUser(missingSchemaConnection.usersById.get(18)),
    createDb(missingSchemaConnection)
  );
  assert.deepEqual(missingSchemaTodos, []);
});

test('detailed design workbench todos cover drawing review and customer countersign actions', async () => {
  const checkerConnection = new FakeDetailedDesignConnection();
  const checkerDb = createDb(checkerConnection);
  await prepareWorkflowAtDrawingReview({ connection: checkerConnection, db: checkerDb, storage: createFakeUploadStorage() });

  const checkerTodo = findTodo(
    await selectDetailedDesignWorkbenchTodos(makeAuthUser(checkerConnection.usersById.get(16)), checkerDb),
    DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    'drawing_review_checker'
  );
  assertDetailedDesignTodoShape(checkerTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    actionText: '上传图纸审查记录并处理图纸审查',
    actionKey: 'drawing_review_checker'
  });

  await passDetailedDesignDrawingReview({
    projectId: checkerConnection.projectRow.id,
    payload: { comment: '图纸审查无问题。' },
    user: makeAuthUser(checkerConnection.usersById.get(16))
  }, checkerDb);

  const rdTodo = findTodo(
    await selectDetailedDesignWorkbenchTodos(makeAuthUser(checkerConnection.usersById.get(10)), checkerDb),
    DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    'drawing_review_rd'
  );
  assertDetailedDesignTodoShape(rdTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    actionText: '审批/退回图纸审查',
    actionKey: 'drawing_review_rd'
  });

  const countersignConnection = new FakeDetailedDesignConnection();
  const countersignDb = createDb(countersignConnection);
  await prepareWorkflowAtCustomerCountersign({
    connection: countersignConnection,
    db: countersignDb,
    uploadStorage: createFakeUploadStorage()
  });

  const countersignTodo = findTodo(
    await selectDetailedDesignWorkbenchTodos(makeAuthUser(countersignConnection.usersById.get(12)), countersignDb),
    DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    'upload_customer_drawing_countersign'
  );
  assertDetailedDesignTodoShape(countersignTodo, {
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    actionText: '上传客户会签图纸扫描件',
    actionKey: 'upload_customer_drawing_countersign'
  });
  assert.equal(countersignTodo.blockingReasons[0], '等待商务负责人上传客户会签图纸扫描件');
});

test('detailed design workbench aggregation excludes workflow-owned ordinary document todos', async () => {
  const connection = new FakeDetailedDesignConnection();
  const ordinaryRows = [
    buildWorkbenchStageDocumentRow(connection, {
      id: 9301,
      documentCode: 'C25',
      documentName: '项目启动书',
      responsibleUserId: 18,
      status: 'not_submitted',
      completionMode: 'submit',
      documentOrder: 1
    }),
    buildWorkbenchStageDocumentRow(connection, {
      id: 9302,
      documentCode: 'C31',
      documentName: '控制逻辑流程图',
      responsibleUserId: 18,
      status: 'not_submitted',
      completionMode: 'submit',
      documentOrder: 2
    }),
    buildWorkbenchStageDocumentRow(connection, {
      id: 9303,
      documentCode: 'C38',
      documentName: '产品平面图',
      responsibleUserId: 18,
      status: 'submitted',
      completionMode: 'approval_required',
      reviewDepartment: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
      submittedAt: '2026-07-22 10:00:00',
      documentOrder: 3
    })
  ];

  const workbench = await withFakeWorkbenchPool(connection, ordinaryRows, () =>
    getMyWorkbench(makeAuthUser(connection.usersById.get(18)))
  );

  const ordinaryItems = workbench.items.filter((item) => item.type === 'document_responsibility' || item.type === 'document_review');
  const detailedItems = workbench.items.filter((item) => item.type === DETAILED_DESIGN_WORKBENCH_TODO_TYPE);

  assert.equal(detailedItems.length, 1);
  assert.equal(workbench.summary.byType.detailed_design_workflow, 1);
  assert.equal(ordinaryItems.some((item) => item.documentCode === 'C25'), false);
  assert.equal(ordinaryItems.some((item) => item.documentCode === 'C38'), false);
  assert.equal(ordinaryItems.some((item) => item.documentCode === 'C31'), true);
  assert.equal(ordinaryItems.some((item) => DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has(item.documentCode)), false);
  assert.equal(workbench.summary.byType.document_responsibility, 1);
  assert.equal(workbench.summary.byType.document_review, 0);
});

test('ordinary checklist derives detailed design workflow-owned completion and keeps C31 compatibility-only', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const generatedStorage = createFakeGeneratedFileStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );

  await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(18))
  }, db);

  let checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C25'), {
    documentCode: 'C25',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  const compatibilityOnlyDocument = findChecklistDocument(checklist, 'C31');
  assert.ok(compatibilityOnlyDocument);
  assert.equal(compatibilityOnlyDocument.derivedCompletionSource, null);
  assert.equal(compatibilityOnlyDocument.detailedDesignDerivedCompletion, null);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C31'), false);

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
    file: makeUploadFile('项目启动书.docx', 'kickoff'),
    user: makeAuthUser(connection.usersById.get(18))
  }, db, uploadStorage);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C25'), {
    documentCode: 'C25',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    user: makeAuthUser(connection.usersById.get(18))
  }, db);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C25'), {
    documentCode: 'C25',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
    file: makeUploadFile('详细设计工作计划.xlsx', 'work-plan'),
    user: makeAuthUser(connection.usersById.get(11))
  }, db, uploadStorage);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C26'), {
    documentCode: 'C26',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    user: makeAuthUser(connection.usersById.get(11))
  }, db);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C26'), {
    documentCode: 'C26',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });

  await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });
  checklist = await readChecklist();
  for (const slot of DETAILED_DESIGN_UPLOAD_SLOTS.filter((item) =>
    item.nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN
  )) {
    assertChecklistDerivedCompletion(findChecklistDocument(checklist, slot.documentCode), {
      documentCode: slot.documentCode,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
      revision: 1,
      completionStatus: 'completed',
      isComplete: true
    });
  }

  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload(),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { comment: '内部评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '客户评审通过。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: { comment: '客户评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C36'), {
    documentCode: 'C36',
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C37'), {
    documentCode: 'C37',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    file: makeUploadFile('产品平面图.dwg', 'plan', 'application/acad'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C38'), {
    documentCode: 'C38',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    file: makeUploadFile('零部件清单.xlsx', 'parts', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C39'), {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C38'), {
    documentCode: 'C38',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C39'), {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });

  await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  await approveDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '同意' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  checklist = await readChecklist();
  const c40NoHistory = findChecklistDocument(checklist, 'C40');
  assertChecklistDerivedCompletion(c40NoHistory, {
    documentCode: 'C40',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    revision: 1,
    completionStatus: 'not_applicable',
    isComplete: true,
    notApplicable: true
  });
  assert.deepEqual(c40NoHistory.derivedBlockingReasons, []);

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
    file: makeUploadFile('客户会签图纸扫描件.pdf', 'scan', 'application/pdf'),
    user: makeAuthUser(connection.usersById.get(12))
  }, db, uploadStorage);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C41'), {
    documentCode: 'C41',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    revision: 1,
    completionStatus: 'incomplete',
    isComplete: false
  });
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C41'), {
    documentCode: 'C41',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });
});

test('detailed design workflow DTO can reuse an existing transaction connection', async () => {
  const connection = new FakeDetailedDesignConnection();

  const workflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, connection);

  assert.equal(workflow.nodes.length, DETAILED_DESIGN_NODES.length);
  assert.equal(connection.nodes.length, DETAILED_DESIGN_NODES.length);
});

test('detailed design workflow permissions do not fall back to project-level role ids', async () => {
  const connection = new FakeDetailedDesignConnection();
  connection.rolesRow = null;
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
  const db = createDb(connection);

  const rdWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  const projectManagerWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(11))
  }, db);
  const businessWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);
  const technicalWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(rdWorkflow.permissions.canAssignRoles, true);
  assert.equal(
    findNode(rdWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).permissions.canAssignRoles,
    true
  );
  assert.equal(projectManagerWorkflow.permissions.isProjectManager, false);
  assert.equal(
    findNode(projectManagerWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION)
      .permissions.canUploadWorkPlan,
    false
  );
  assert.equal(businessWorkflow.permissions.isBusinessOwner, false);
  assert.equal(
    findNode(businessWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN)
      .permissions.canUploadCustomerDrawingCountersign,
    false
  );
  assert.equal(technicalWorkflow.permissions.isTechnicalOwner, false);
  assert.equal(
    findNode(technicalWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN)
      .permissions.canUploadDetailedDesignFiles,
    false
  );
});

test('RD center manager assigns detailed design roles and non-RD users are rejected', async () => {
  const deniedConnection = new FakeDetailedDesignConnection();
  deniedConnection.rolesRow = null;
  deniedConnection.professionalGroupMembers = [];
  seedDetailedDesignWorkflowRows(deniedConnection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });

  await assert.rejects(
    assignDetailedDesignRoles({
      projectId: deniedConnection.projectRow.id,
      payload: makeRoleAssignmentPayload(),
      user: makeAuthUser(deniedConnection.usersById.get(11))
    }, createDb(deniedConnection)),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const connection = new FakeDetailedDesignConnection();
  connection.rolesRow = null;
  connection.professionalGroupMembers = [];
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });

  const workflow = await assignDetailedDesignRoles({
    projectId: connection.projectRow.id,
    payload: makeRoleAssignmentPayload(),
    user: makeAuthUser(connection.usersById.get(10))
  }, createDb(connection));

  assert.equal(workflow.roles.project_manager.userId, 11);
  assert.equal(workflow.roles.technical_owner.userId, 13);
  assert.deepEqual(workflow.professionalGroupMembers.map((member) => member.userId), [17]);
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.roles_assigned');

  const projectManagerWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(11))
  }, createDb(connection));
  assert.equal(
    findNode(projectManagerWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION)
      .permissions.canUploadWorkPlan,
    true
  );
});

test('manufacturing center manager uploads kickoff book and submits to preparation', async () => {
  const deniedConnection = new FakeDetailedDesignConnection();
  const deniedStorage = createFakeUploadStorage();

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: deniedConnection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
      file: makeUploadFile('项目启动书.docx'),
      user: makeAuthUser(deniedConnection.usersById.get(10))
    }, createDb(deniedConnection), deniedStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const connection = new FakeDetailedDesignConnection();
  const storage = createFakeUploadStorage();
  const uploadedWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
    file: makeUploadFile('项目启动书.docx', 'kickoff'),
    user: makeAuthUser(connection.usersById.get(18))
  }, createDb(connection), storage);

  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING).status, 'pending');
  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING).permissions.canSubmit, true);
  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'not_started');
  assert.equal(findSlot(uploadedWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK).currentFile.originalFileName, '项目启动书.docx');
  assert.match(
    findSlot(uploadedWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK).currentFile.downloadEndpoint,
    /\/detailed-design-workflow\/uploads\/project_kickoff_book\/download$/
  );

  await assert.rejects(
    submitDetailedDesignWorkflowNode({
      projectId: connection.projectRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
      user: makeAuthUser(connection.usersById.get(10))
    }, createDb(connection)),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const submittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    user: makeAuthUser(connection.usersById.get(18))
  }, createDb(connection));

  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING).status, 'approved');
  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'pending');

  const download = await getDetailedDesignUploadDownload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
    user: makeAuthUser(connection.usersById.get(18))
  }, createDb(connection), storage);
  assert.equal(download.originalFileName, '项目启动书.docx');
  assert.equal(download.revision, 1);
});

test('work plan upload requires assigned project manager and submits to detailed design when roles are ready', async () => {
  const connection = new FakeDetailedDesignConnection();
  connection.rolesRow = null;
  connection.professionalGroupMembers = [];
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
  const db = createDb(connection);
  const storage = createFakeUploadStorage();

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
      file: makeUploadFile('详细设计工作计划.xlsx'),
      user: makeAuthUser(connection.usersById.get(11))
    }, db, storage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  await assignDetailedDesignRoles({
    projectId: connection.projectRow.id,
    payload: makeRoleAssignmentPayload(),
    user: makeAuthUser(connection.usersById.get(10))
  }, db);

  const uploadedWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
    file: makeUploadFile('详细设计工作计划.xlsx'),
    user: makeAuthUser(connection.usersById.get(11))
  }, db, storage);

  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'pending');
  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).permissions.canSubmit, true);
  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'not_started');

  const submittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    user: makeAuthUser(connection.usersById.get(11))
  }, db);

  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'approved');
  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'pending');
});

test('technical owner uploads eight detailed design files, supports replacement revisions, and submits to internal review', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedDetailedDesignWorkflowRows(connection, {
    nodeStatuses: {
      [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.PENDING
    }
  });
  const db = createDb(connection);
  const storage = createFakeUploadStorage();
  const detailedDesignSlots = DETAILED_DESIGN_UPLOAD_SLOTS.filter((slot) =>
    slot.nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN
  );

  await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    file: makeUploadFile('3d-model-v1.7z', 'v1', 'application/x-7z-compressed'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, storage);
  const replacedWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    file: makeUploadFile('3d-model-v2.7z', 'v2', 'application/x-7z-compressed'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, storage);
  assert.equal(findSlot(replacedWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL).revision, 2);
  assert.equal(
    connection.uploadFiles.filter((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL && file.is_current === 1
    ).length,
    1
  );
  assert.equal(
    connection.uploadFiles.some((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL && file.revision === 1 && file.is_current === 0
    ),
    true
  );

  let workflow = replacedWorkflow;
  for (const slot of detailedDesignSlots.filter((slot) => slot.slotKey !== DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL)) {
    workflow = await uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: slot.slotKey,
      file: makeUploadFile(`${slot.slotKey}.zip`, slot.slotKey, 'application/zip'),
      user: makeAuthUser(connection.usersById.get(13))
    }, db, storage);
  }

  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'pending');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).permissions.canSubmit, true);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'not_started');
  assert.equal(detailedDesignSlots.every((slot) => findSlot(workflow, slot.slotKey).currentFile), true);

  const submittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'approved');
  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'pending');
});

test('technical owner can mix uploads and no-upload marks before submitting detailed design', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtDetailedDesign(connection);
  const db = createDb(connection);
  const storage = createFakeUploadStorage();
  const uploadSlots = DETAILED_DESIGN_UPLOAD_SLOTS.filter((slot) =>
    slot.nodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN
  );
  const uploadedSlotKeys = new Set([
    DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_SCHEMATIC
  ]);

  await assert.rejects(
    submitDetailedDesignWorkflowNode({
      projectId: connection.projectRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
      user: makeAuthUser(connection.usersById.get(13))
    }, db),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );

  await assert.rejects(
    markDetailedDesignUploadNoUpload({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
      user: makeAuthUser(connection.usersById.get(13))
    }, db),
    { code: DETAILED_DESIGN_ERROR.INVALID_UPLOAD_SLOT }
  );

  for (const slot of uploadSlots) {
    if (uploadedSlotKeys.has(slot.slotKey)) {
      await uploadDetailedDesignWorkflowFile({
        projectId: connection.projectRow.id,
        slotKey: slot.slotKey,
        file: makeUploadFile(`${slot.slotKey}.zip`, slot.slotKey, 'application/zip'),
        user: makeAuthUser(connection.usersById.get(13))
      }, db, storage);
    } else {
      await markDetailedDesignUploadNoUpload({
        projectId: connection.projectRow.id,
        slotKey: slot.slotKey,
        user: makeAuthUser(connection.usersById.get(13))
      }, db);
    }
  }

  await assert.rejects(
    markDetailedDesignUploadNoUpload({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
      user: makeAuthUser(connection.usersById.get(13))
    }, db),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );

  let workflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'pending');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).permissions.canSubmit, true);
  assert.equal(
    findSlot(workflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM).isUploadExempted,
    true
  );

  workflow = await cancelDetailedDesignUploadNoUpload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).permissions.canSubmit, false);
  assert.match(
    findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).blockingReasons.join('\n'),
    /电气接线图/
  );

  workflow = await markDetailedDesignUploadNoUpload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.ELECTRICAL_WIRING_DIAGRAM,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).permissions.canSubmit, true);

  workflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'approved');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'pending');
  assert.equal(
    connection.operationLogs.some((log) => log.actionType === 'detailed_design.file_upload_exempted'),
    true
  );
  assert.equal(
    connection.operationLogs.some((log) => log.actionType === 'detailed_design.file_upload_exemption_cancelled'),
    true
  );
});

test('technical owner saves and submits internal design review form, generates C36, downloads file, and RD approval advances', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtInternalReview(connection);
  const db = createDb(connection);
  const generatedStorage = createFakeGeneratedFileStorage();
  const payload = makeDetailedDesignReviewPayload();

  const saved = await saveDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(saved.form.formStatus, DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT);
  assert.equal(connection.reviewForms.length, 1);
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.internal_review_form_saved');

  const submitted = await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload,
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  const formRow = connection.findCurrentReviewForm(DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW);

  assert.equal(submitted.nodeStatus, DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW);
  assert.equal(submitted.form.documentCode, 'C36');
  assert.equal(submitted.form.generatedFile.status, DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(formRow.form_status, DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED);
  assert.equal(formRow.generated_file_status, DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(
    connection.nodes.find((node) => node.node_key === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status,
    'pending_review'
  );
  assert.equal(generatedStorage.written.length, 1);
  assert.match(formRow.generated_file_name, /^C36-/);

  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'B2', '详细设计骨架测试项目');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'E2', '测试客户');
  assertGeneratedXlsxCellEquals(generatedStorage, formRow.generated_file_storage_key, 'B3', '内部，第（1）次');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'B4', '项目经理');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'D4', '技术负责人');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'G4', '技术负责人');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'B5', '详细设计评审会议室');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'G5', '2026-07-22');
  assertGeneratedXlsxCellEquals(generatedStorage, formRow.generated_file_storage_key, 'B9', '目标达成第一项');
  assertGeneratedXlsxCellEquals(generatedStorage, formRow.generated_file_storage_key, 'B13', '风险评估第一项');
  assertGeneratedXlsxCellEquals(generatedStorage, formRow.generated_file_storage_key, 'B18', '优化建议第一项');
  assertGeneratedXlsxCellEquals(
    generatedStorage,
    formRow.generated_file_storage_key,
    'B30',
    '目标1：实施计划第一项'
  );
  assert.doesNotMatch(
    extractXlsxCellText(generatedFileBuffer(generatedStorage, formRow.generated_file_storage_key), 'B30'),
    /目标达成第一项/
  );
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'B39', '评审通过');
  assertGeneratedXlsxCellIncludes(generatedStorage, formRow.generated_file_storage_key, 'A42', '记录人：技术负责人');

  const download = await getDetailedDesignReviewGeneratedFileDownload({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  assert.equal(download.fileName, formRow.generated_file_name);
  assert.equal(download.filePath, `memory://${formRow.generated_file_storage_key}`);

  const approvedWorkflow = await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { comment: '内部评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);

  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'approved');
  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status, 'pending');
  assert.equal(connection.findCurrentReviewForm(DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).review_status, 'approved');
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.internal_review_approved');
});

test('internal review return opens a new detailed design revision and old files cannot satisfy rework', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtDetailedDesign(connection);
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const generatedStorage = createFakeGeneratedFileStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );
  await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });
  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload(),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);

  const returnedWorkflow = await returnDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { returnReason: '内部评审发现问题' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  const detailedDesignNode = findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN);
  const internalReviewNode = findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW);
  const returnedInternalForm = findReviewForm(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW);

  assert.equal(detailedDesignNode.status, 'returned');
  assert.equal(detailedDesignNode.currentRevision, 2);
  assert.equal(internalReviewNode.status, 'not_started');
  assert.equal(internalReviewNode.currentRevision, 2);
  assert.equal(internalReviewNode.permissions.canSubmitReviewForm, false);
  assert.equal(returnedInternalForm.isCurrentRevision, false);
  assert.equal(returnedInternalForm.sourceRevision, 1);
  assert.equal(returnedInternalForm.generatedFile.canDownload, false);

  const checklistAfterReturn = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklistAfterReturn, 'C27'), {
    documentCode: 'C27',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklistAfterReturn, 'C36'), {
    documentCode: 'C36',
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });

  await assert.rejects(
    submitDetailedDesignReviewForm({
      projectId: connection.projectRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
      payload: makeDetailedDesignReviewPayload({ reviewConclusion: '不应提前提交。' }),
      user: makeAuthUser(connection.usersById.get(13))
    }, db, generatedStorage),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );

  const oneFileWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
    file: makeUploadFile('3d-model-rework.zip', 'rework', 'application/zip'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  assert.equal(findNode(oneFileWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'returned');
  assert.deepEqual(
    findNode(oneFileWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).blockingReasons.slice(0, 2),
    [
      '等待技术负责人重新上传当前版本电气原理图或标记无需上传',
      '等待技术负责人重新上传当前版本电气接线图或标记无需上传'
    ]
  );

  const completedReworkWorkflow = await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });
  assert.equal(findNode(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'approved');
  assert.equal(findNode(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'pending');
  assert.equal(findNode(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).currentRevision, 2);
  assert.equal(
    findReviewForm(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW)
      .permissions.canSubmitReviewForm,
    true
  );
  assert.equal(
    findReviewForm(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW)
      .formData.reviewConclusion,
    '评审通过，进入下一步。'
  );
  assert.equal(
    findReviewForm(completedReworkWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW)
      .generatedFile.canDownload,
    false
  );

  const resubmitted = await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '返工后再次提交。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  assert.equal(resubmitted.form.revision, 2);
  assert.equal(resubmitted.form.isCurrentRevision, true);
  assert.equal(resubmitted.form.generatedFile.canDownload, true);
  assert.equal(connection.reviewForms.filter((form) =>
    form.node_key === DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW && form.is_current === 1
  ).length, 1);
  assert.equal(connection.operationLogs.at(-1).detailsJson.resubmitScope, undefined);
  assert.equal(
    connection.operationLogs.some((log) =>
      log.actionType === 'detailed_design.internal_review_returned' &&
      log.detailsJson.returnToNodeKey === DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN &&
      log.detailsJson.resubmitScope === 'detailed_design_files'
    ),
    true
  );
});

test('customer design review generates C37, approval activates product plan drawing, and return reruns internal review', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtDetailedDesign(connection);
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const generatedStorage = createFakeGeneratedFileStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );
  await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });

  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '内部通过。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { comment: '内部通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);

  const customerPayload = makeDetailedDesignReviewPayload({
    meetingLocation: '客户评审会议室',
    reviewConclusion: '客户评审通过。',
    recorder: '客户评审记录人'
  });
  const submitted = await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: customerPayload,
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  const customerForm = connection.findCurrentReviewForm(DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW);

  assert.equal(submitted.form.documentCode, 'C37');
  assert.equal(submitted.form.generatedFile.status, DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(customerForm.generated_file_status, DETAILED_DESIGN_REVIEW_FORM_GENERATED_FILE_STATUS.GENERATED);
  assertGeneratedXlsxCellEquals(generatedStorage, customerForm.generated_file_storage_key, 'B3', '甲方，第（1）次');
  assertGeneratedXlsxCellIncludes(generatedStorage, customerForm.generated_file_storage_key, 'B5', '客户评审会议室');
  assertGeneratedXlsxCellIncludes(generatedStorage, customerForm.generated_file_storage_key, 'A42', '记录人：客户评审记录人');

  const approvedWorkflow = await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: { comment: '客户评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status, 'approved');
  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'pending');

  connection.nodes.find((node) => node.node_key === DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status = 'pending_review';
  const returnedWorkflow = await returnDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: { returnReason: '客户评审退回' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);

  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'returned');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'not_started');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status, 'not_started');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'not_started');
  assert.equal(findReviewForm(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).isCurrentRevision, false);
  assert.equal(findReviewForm(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).generatedFile.canDownload, false);
  assert.equal(findReviewForm(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).isCurrentRevision, false);
  assert.equal(findReviewForm(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).generatedFile.canDownload, false);
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.customer_review_returned');

  const checklistAfterReturn = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklistAfterReturn, 'C36'), {
    documentCode: 'C36',
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklistAfterReturn, 'C37'), {
    documentCode: 'C37',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });

  const reworkedWorkflow = await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });
  assert.equal(findNode(reworkedWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'approved');
  assert.equal(findNode(reworkedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'pending');
  assert.equal(
    findReviewForm(reworkedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).permissions.canSubmitReviewForm,
    true
  );
  assert.equal(
    findReviewForm(reworkedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).formData.reviewConclusion,
    '内部通过。'
  );

  const internalResubmitted = await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '客户退回后内部评审重新提交。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  assert.equal(internalResubmitted.form.revision, 2);
  assert.equal(internalResubmitted.form.generatedFile.canDownload, true);

  const internalReapprovedWorkflow = await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { comment: '返工后内部通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(findNode(internalReapprovedWorkflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'approved');
  assert.equal(findNode(internalReapprovedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status, 'pending');
  assert.equal(
    findReviewForm(internalReapprovedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW)
      .generatedFile.canDownload,
    false
  );

  const customerResubmitted = await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '客户退回后重新提交。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  assert.equal(customerResubmitted.form.revision, 2);
  assert.equal(customerResubmitted.form.documentCode, 'C37');
});

test('technical owner uploads product plan drawing and parts list and drawing review DTO exposes current downloads', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtProductPlanDrawing(connection);
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      file: makeUploadFile('产品平面图.dwg'),
      user: makeAuthUser(connection.usersById.get(12))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const productPlanWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    file: makeUploadFile('产品平面图.dwg', 'plan', 'application/acad'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);

  assert.equal(findNode(productPlanWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'pending');
  assert.equal(findNode(productPlanWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).permissions.canSubmit, true);
  assert.equal(findNode(productPlanWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'not_started');
  assert.equal(
    findSlot(productPlanWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING).currentFile.originalFileName,
    '产品平面图.dwg'
  );

  const productPlanSubmittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(findNode(productPlanSubmittedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'approved');
  assert.equal(findNode(productPlanSubmittedWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
      file: makeUploadFile('零部件清单.xlsx'),
      user: makeAuthUser(connection.usersById.get(12))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const partsListWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    file: makeUploadFile('零部件清单.xlsx', 'parts', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);

  assert.equal(findNode(partsListWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');
  assert.equal(findNode(partsListWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).permissions.canSubmit, true);
  assert.equal(findNode(partsListWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'not_started');

  const partsListSubmittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(findNode(partsListSubmittedWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'approved');
  assert.equal(findNode(partsListSubmittedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'pending');
  assert.deepEqual(
    partsListSubmittedWorkflow.drawingReview.downloadableFiles.map((item) => item.slotKey),
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );
  assert.equal(
    partsListSubmittedWorkflow.drawingReview.downloadableFiles[0].currentFile.originalFileName,
    '产品平面图.dwg'
  );
  assert.equal(
    partsListSubmittedWorkflow.drawingReview.downloadableFiles[1].currentFile.originalFileName,
    '零部件清单.xlsx'
  );

  const productPlanDownload = await getDetailedDesignUploadDownload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  assert.equal(productPlanDownload.originalFileName, '产品平面图.dwg');
});

test('product plan drawing and parts list replacements keep only latest current file', async () => {
  const connection = new FakeDetailedDesignConnection();
  seedWorkflowAtProductPlanDrawing(connection);
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();

  const productPlanSlot = connection.uploadSlots.find((slot) =>
    slot.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING
  );
  connection.insertUploadFile({
    projectId: connection.projectRow.id,
    slotId: productPlanSlot.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    revision: 1,
    originalFileName: '产品平面图-v1.dwg',
    storageKey: 'seed/product-plan-v1',
    mimeType: 'application/acad',
    fileSize: 12,
    uploadedByUserId: 13
  });
  productPlanSlot.status = DETAILED_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED;
  productPlanSlot.revision = 1;

  const productPlanWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    file: makeUploadFile('产品平面图-v2.dwg', 'plan-v2', 'application/acad'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);

  assert.equal(findSlot(productPlanWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING).revision, 2);
  assert.equal(
    connection.uploadFiles.filter((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING && file.is_current === 1
    ).length,
    1
  );
  assert.equal(
    connection.uploadFiles.some((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING && file.revision === 1 && file.is_current === 0
    ),
    true
  );

  const partsConnection = new FakeDetailedDesignConnection();
  seedWorkflowAtPartsList(partsConnection);
  const partsDb = createDb(partsConnection);
  const partsSlot = partsConnection.uploadSlots.find((slot) =>
    slot.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
  );
  partsConnection.insertUploadFile({
    projectId: partsConnection.projectRow.id,
    slotId: partsSlot.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    revision: 1,
    originalFileName: '零部件清单-v1.xlsx',
    storageKey: 'seed/parts-v1',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 12,
    uploadedByUserId: 13
  });
  partsSlot.status = DETAILED_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED;
  partsSlot.revision = 1;

  const partsWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: partsConnection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    file: makeUploadFile('零部件清单-v2.xlsx', 'parts-v2', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(partsConnection.usersById.get(13))
  }, partsDb, createFakeUploadStorage());

  assert.equal(findSlot(partsWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST).revision, 2);
  assert.equal(
    partsConnection.uploadFiles.filter((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST && file.is_current === 1
    ).length,
    1
  );
  assert.equal(
    partsConnection.uploadFiles.some((file) =>
      file.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST && file.revision === 1 && file.is_current === 0
    ),
    true
  );
});

test('drawing review owner passes without C40 and RD manager downloads current inputs only in approval state', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  await prepareWorkflowAtDrawingReview({ connection, db, storage: uploadStorage });

  const checkerWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  assert.equal(findNode(checkerWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'pending');
  assert.equal(checkerWorkflow.drawingReview.permissions.canDownloadCurrentInputs, true);
  assert.equal(checkerWorkflow.drawingReview.permissions.canPass, true);
  assert.equal(checkerWorkflow.drawingReview.recordHistory.length, 0);

  const checkerDownload = await getDetailedDesignUploadDownload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(16))
  }, db, uploadStorage);
  assert.equal(checkerDownload.originalFileName, '产品平面图.dwg');

  const rdBeforePass = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(rdBeforePass.drawingReview.permissions.canDownloadCurrentInputs, false);
  await assert.rejects(
    getDetailedDesignUploadDownload({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      user: makeAuthUser(connection.usersById.get(10))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const passedWorkflow = await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  assert.equal(findNode(passedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'waiting_rd_approval');
  assert.equal(passedWorkflow.drawingReview.checkerStatus, DETAILED_DESIGN_DRAWING_REVIEW_CHECKER_STATUS.APPROVED);
  assert.equal(passedWorkflow.drawingReview.rdApprovalStatus, DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.PENDING);
  assert.equal(passedWorkflow.drawingReview.recordHistory.length, 0);
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.drawing_review_passed');

  const rdWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(rdWorkflow.drawingReview.permissions.canDownloadCurrentInputs, true);
  assert.equal(rdWorkflow.drawingReview.permissions.canApprove, true);
  assert.deepEqual(
    rdWorkflow.drawingReview.downloadableFiles.map((item) => item.slotKey),
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );

  const rdDownload = await getDetailedDesignUploadDownload({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(10))
  }, db, uploadStorage);
  assert.equal(rdDownload.originalFileName, '零部件清单.xlsx');

  await assert.rejects(
    getDetailedDesignUploadDownload({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      user: makeAuthUser(connection.usersById.get(12))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  connection.projectRow.current_stage_key = 'manufacturing';
  connection.projectRow.current_stage_order = 5;
  connection.projectRow.current_stage_name = '生产制作阶段';
  await assert.rejects(
    getDetailedDesignUploadDownload({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      user: makeAuthUser(connection.usersById.get(16))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );
});

test('drawing review return requires C40 record and resubmits current C38/C39 files before downstream review', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );
  await prepareWorkflowAtDrawingReview({ connection, db, storage: uploadStorage });

  let checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C38'), {
    documentCode: 'C38',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C39'), {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 1,
    completionStatus: 'completed',
    isComplete: true
  });

  await assert.rejects(
    returnDetailedDesignDrawingReview({
      projectId: connection.projectRow.id,
      payload: { returnReason: '产品平面图尺寸错误' },
      user: makeAuthUser(connection.usersById.get(16))
    }, db),
    { code: DETAILED_DESIGN_ERROR.DRAWING_REVIEW_RECORD_REQUIRED }
  );

  const uploadedRecordWorkflow = await uploadDetailedDesignDrawingReviewRecord({
    projectId: connection.projectRow.id,
    file: makeUploadFile('图纸审查记录.docx', 'record'),
    user: makeAuthUser(connection.usersById.get(16))
  }, db, uploadStorage);
  assert.equal(uploadedRecordWorkflow.drawingReview.recordHistory.length, 1);
  assert.equal(uploadedRecordWorkflow.drawingReview.recordHistory[0].originalFileName, '图纸审查记录.docx');
  assert.equal(uploadedRecordWorkflow.drawingReview.recordHistory[0].drawingRevision, 1);
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.drawing_review_record_uploaded');

  const recordId = uploadedRecordWorkflow.drawingReview.recordHistory[0].id;
  const checkerRecordDownload = await getDetailedDesignDrawingReviewRecordDownload({
    projectId: connection.projectRow.id,
    recordId,
    user: makeAuthUser(connection.usersById.get(16))
  }, db, uploadStorage);
  assert.equal(checkerRecordDownload.originalFileName, '图纸审查记录.docx');

  const rdRecordDownload = await getDetailedDesignDrawingReviewRecordDownload({
    projectId: connection.projectRow.id,
    recordId,
    user: makeAuthUser(connection.usersById.get(10))
  }, db, uploadStorage);
  assert.equal(rdRecordDownload.originalFileName, '图纸审查记录.docx');

  await assert.rejects(
    getDetailedDesignDrawingReviewRecordDownload({
      projectId: connection.projectRow.id,
      recordId,
      user: makeAuthUser(connection.usersById.get(12))
    }, db, uploadStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const returnedWorkflow = await returnDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { returnReason: '产品平面图尺寸错误' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);

  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'returned');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'not_started');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'not_started');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).currentRevision, 2);
  assert.equal(returnedWorkflow.drawingReview.recordHistory.length, 1);
  assert.equal(returnedWorkflow.drawingReview.recordHistory[0].returnReason, '产品平面图尺寸错误');
  assert.deepEqual(
    returnedWorkflow.drawingReview.downloadableFiles.map((item) => item.slotKey),
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );
  assert.equal(connection.operationLogs.at(-1).actionType, 'detailed_design.drawing_review_returned');
  assert.deepEqual(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).blockingReasons, []);
  const technicalReturnedWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(
    findNode(technicalReturnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).permissions.canSubmit,
    true
  );
  checklist = await readChecklist();
  const c38AfterReturn = findChecklistDocument(checklist, 'C38');
  const c39AfterReturn = findChecklistDocument(checklist, 'C39');
  assertChecklistDerivedCompletion(c38AfterReturn, {
    documentCode: 'C38',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });
  assert.match(c38AfterReturn.derivedBlockingReasons[0], /绘制产品平面图未完成/);
  assertChecklistDerivedCompletion(c39AfterReturn, {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });
  assert.match(c39AfterReturn.derivedBlockingReasons[0], /编写零部件清单未完成/);
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C40'), {
    documentCode: 'C40',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    revision: 2,
    completionStatus: 'completed',
    isComplete: true,
    notApplicable: false
  });

  const productPlanResubmitted = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'approved');
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');
  assert.deepEqual(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).blockingReasons, []);
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).permissions.canSubmit, true);
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C38'), {
    documentCode: 'C38',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    revision: 2,
    completionStatus: 'completed',
    isComplete: true
  });
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C39'), {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 2,
    completionStatus: 'incomplete',
    isComplete: false
  });

  const partsListResubmitted = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(partsListResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'approved');
  assert.equal(findNode(partsListResubmitted, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'pending');
  assert.equal(findNode(partsListResubmitted, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).currentRevision, 2);
  assert.equal(connection.drawingReviewFlow.current_revision, 2);
  assert.equal(connection.drawingReviewFlow.product_plan_drawing_revision, 1);
  assert.equal(connection.drawingReviewFlow.parts_list_revision, 1);
  assert.deepEqual(
    partsListResubmitted.drawingReview.downloadableFiles.map((item) => item.slotKey),
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );
  checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C39'), {
    documentCode: 'C39',
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    revision: 2,
    completionStatus: 'completed',
    isComplete: true
  });

  const finalPassWorkflow = await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '返工后无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  assert.equal(findNode(finalPassWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'waiting_rd_approval');
  assert.equal(finalPassWorkflow.drawingReview.recordHistory.length, 1);
});

test('RD drawing review approval activates customer countersign and RD return reworks drawing inputs', async () => {
  const approveConnection = new FakeDetailedDesignConnection();
  const approveDb = createDb(approveConnection);
  const approveStorage = createFakeUploadStorage();
  await prepareWorkflowAtDrawingReview({ connection: approveConnection, db: approveDb, storage: approveStorage });
  await passDetailedDesignDrawingReview({
    projectId: approveConnection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(approveConnection.usersById.get(16))
  }, approveDb);

  const approvedWorkflow = await approveDetailedDesignDrawingReview({
    projectId: approveConnection.projectRow.id,
    payload: { comment: '同意' },
    user: makeAuthUser(approveConnection.usersById.get(10))
  }, approveDb);
  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'approved');
  assert.equal(findNode(approvedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).status, 'pending');
  assert.equal(approvedWorkflow.drawingReview.rdApprovalStatus, DETAILED_DESIGN_DRAWING_REVIEW_RD_APPROVAL_STATUS.APPROVED);
  assert.equal(approveConnection.operationLogs.at(-1).actionType, 'detailed_design.drawing_review_rd_approved');

  const returnConnection = new FakeDetailedDesignConnection();
  const returnDb = createDb(returnConnection);
  const returnStorage = createFakeUploadStorage();
  await prepareWorkflowAtDrawingReview({ connection: returnConnection, db: returnDb, storage: returnStorage });
  await passDetailedDesignDrawingReview({
    projectId: returnConnection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(returnConnection.usersById.get(16))
  }, returnDb);

  const returnedWorkflow = await returnDetailedDesignDrawingReviewApproval({
    projectId: returnConnection.projectRow.id,
    payload: { returnReason: '研发审批发现图纸问题' },
    user: makeAuthUser(returnConnection.usersById.get(10))
  }, returnDb);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'returned');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).currentRevision, 2);
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'not_started');
  assert.equal(findNode(returnedWorkflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'not_started');
  assert.deepEqual(
    returnedWorkflow.drawingReview.downloadableFiles.map((item) => item.slotKey),
    [
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
      DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST
    ]
  );
  assert.equal(returnConnection.operationLogs.at(-1).actionType, 'detailed_design.drawing_review_rd_returned');

  const productPlanResubmitted = await submitDetailedDesignWorkflowNode({
    projectId: returnConnection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(returnConnection.usersById.get(13))
  }, returnDb);
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'approved');
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');
  assert.equal(findNode(productPlanResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).permissions.canSubmit, true);

  const partsListResubmitted = await submitDetailedDesignWorkflowNode({
    projectId: returnConnection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(returnConnection.usersById.get(13))
  }, returnDb);
  assert.equal(findNode(partsListResubmitted, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'approved');
  assert.equal(findNode(partsListResubmitted, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'pending');
  assert.equal(returnConnection.drawingReviewFlow.current_revision, 2);
  assert.equal(returnConnection.drawingReviewFlow.product_plan_drawing_revision, 1);
  assert.equal(returnConnection.drawingReviewFlow.parts_list_revision, 1);
});

test('C38 and C39 submit rejects when current files are missing', async () => {
  const productPlanConnection = new FakeDetailedDesignConnection();
  seedWorkflowAtProductPlanDrawing(productPlanConnection);
  await assert.rejects(
    submitDetailedDesignWorkflowNode({
      projectId: productPlanConnection.projectRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
      user: makeAuthUser(productPlanConnection.usersById.get(13))
    }, createDb(productPlanConnection)),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );

  const partsListConnection = new FakeDetailedDesignConnection();
  seedWorkflowAtPartsList(partsListConnection);
  const productPlanSlot = partsListConnection.uploadSlots.find(
    (slot) => slot.slot_key === DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING
  );
  partsListConnection.insertUploadFile({
    projectId: partsListConnection.projectRow.id,
    slotId: productPlanSlot.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    revision: 1,
    originalFileName: '产品平面图.dwg',
    storageKey: '401/product_plan_drawing/1',
    mimeType: 'application/acad',
    fileSize: 4,
    uploadedByUserId: 13
  });

  await assert.rejects(
    submitDetailedDesignWorkflowNode({
      projectId: partsListConnection.projectRow.id,
      nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
      user: makeAuthUser(partsListConnection.usersById.get(13))
    }, createDb(partsListConnection)),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );
});

test('business owner uploads customer drawing countersign scan and submits to manufacturing', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();

  await prepareWorkflowAtCustomerCountersign({
    connection,
    db,
    uploadStorage
  });
  connection.stageDocumentRow.document_code = 'C31';
  connection.stageDocumentRow.document_name = '控制逻辑流程图';
  connection.stageDocumentRow.status = 'pending';

  const businessWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);
  assert.equal(
    findNode(businessWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN)
      .permissions.canUploadCustomerDrawingCountersign,
    true
  );

  const uploadedWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
    file: makeUploadFile('客户会签图纸扫描件.pdf', 'countersign', 'application/pdf'),
    user: makeAuthUser(connection.usersById.get(12))
  }, db, uploadStorage);

  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).status, 'pending');
  assert.equal(findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).permissions.canSubmit, true);
  assert.equal(uploadedWorkflow.currentStage.stageKey, DETAILED_DESIGN_STAGE.STAGE_KEY);
  assert.equal(connection.projectRow.current_stage_key, DETAILED_DESIGN_STAGE.STAGE_KEY);
  assert.equal(connection.stageDocumentRow.document_code, 'C31');
  assert.equal(connection.stageDocumentRow.status, 'pending');
  const countersignUploadLog = connection.operationLogs.at(-1);
  assert.equal(countersignUploadLog.actionType, 'detailed_design.customer_drawing_countersign_uploaded');
  assert.equal(countersignUploadLog.summary, '上传客户会签图纸扫描件');
  assert.equal(countersignUploadLog.detailsJson.nodeKey, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN);
  assert.equal(
    countersignUploadLog.detailsJson.slotKey,
    DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN
  );
  assert.equal(countersignUploadLog.detailsJson.revision, 1);
  assert.equal(typeof countersignUploadLog.detailsJson.fileId, 'number');
  assert.ok(countersignUploadLog.detailsJson.fileId > 0);
  assert.equal(countersignUploadLog.detailsJson.originalFileName, '客户会签图纸扫描件.pdf');

  const submittedWorkflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);

  assert.equal(findNode(submittedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).status, 'approved');
  assert.equal(submittedWorkflow.currentStage.stageKey, 'manufacturing');
  assert.equal(submittedWorkflow.currentStage.stageOrder, 5);
  assert.equal(connection.projectRow.current_stage_key, 'manufacturing');
  assert.equal(connection.projectRow.current_stage_name, '生产制作阶段');
  assert.equal(connection.projectRow.current_stage_status, 'current');
  assert.equal(connection.operationLogs.at(-1).actionType, 'stage.advanced');
  assert.equal(connection.operationLogs.at(-1).detailsJson.triggerAction, 'detailed_design.node_submitted');
  assert.equal(connection.operationLogs.at(-1).detailsJson.fromStageKey, DETAILED_DESIGN_STAGE.STAGE_KEY);
  assert.equal(connection.operationLogs.at(-1).detailsJson.toStageKey, 'manufacturing');
});

test('customer drawing countersign can be submitted after drawing rework raises node revision', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );

  await prepareWorkflowAtDrawingReview({ connection, db, storage: uploadStorage });
  await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  await returnDetailedDesignDrawingReviewApproval({
    projectId: connection.projectRow.id,
    payload: { returnReason: '研发审批退回图纸' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '返工后无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  await approveDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '同意' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);

  const beforeUploadWorkflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);
  assert.equal(findNode(beforeUploadWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).currentRevision, 2);
  assert.equal(findNode(beforeUploadWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).permissions.canViewSubmit, true);
  assert.equal(findNode(beforeUploadWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).permissions.canSubmit, false);

  const uploadedWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
    file: makeUploadFile('客户会签图纸扫描件.pdf', 'countersign', 'application/pdf'),
    user: makeAuthUser(connection.usersById.get(12))
  }, db, uploadStorage);
  const countersignNode = findNode(uploadedWorkflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN);
  const countersignSlot = findSlot(uploadedWorkflow, DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN);
  assert.equal(countersignNode.currentRevision, 2);
  assert.equal(countersignSlot.currentFile.revision, 1);
  assert.equal(countersignNode.permissions.canViewSubmit, true);
  assert.equal(countersignNode.permissions.canSubmit, true);
  assert.deepEqual(countersignNode.permissions.submitBlockingReasons, []);

  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);

  const checklist = await readChecklist();
  assertChecklistDerivedCompletion(findChecklistDocument(checklist, 'C41'), {
    documentCode: 'C41',
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    revision: 2,
    completionStatus: 'completed',
    isComplete: true
  });
});

test('normal detailed design full flow auto advances to manufacturing and keeps C31 compatibility-only', async () => {
  const connection = new FakeDetailedDesignConnection();
  connection.rolesRow = null;
  connection.professionalGroupMembers = [];
  const db = createDb(connection);
  const uploadStorage = createFakeUploadStorage();
  const generatedStorage = createFakeGeneratedFileStorage();
  const ordinaryRows = buildDetailedDesignChecklistRows(connection);
  const readChecklist = () =>
    withFakeChecklistPool(connection, ordinaryRows, () =>
      getProjectStageDocumentChecklist(connection.projectRow.id)
    );

  const kickoffWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
    file: makeUploadFile('项目启动书.docx', 'kickoff', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    user: makeAuthUser(connection.usersById.get(18))
  }, db, uploadStorage);
  assert.equal(findNode(kickoffWorkflow, DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING).status, 'pending');
  assert.equal(findNode(kickoffWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'not_started');
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING,
    user: makeAuthUser(connection.usersById.get(18))
  }, db);

  const assignedWorkflow = await assignDetailedDesignRoles({
    projectId: connection.projectRow.id,
    payload: makeRoleAssignmentPayload(),
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(assignedWorkflow.roles.project_manager.userId, 11);
  assert.equal(assignedWorkflow.roles.technical_owner.userId, 13);

  const preparationWorkflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.DETAILED_DESIGN_WORK_PLAN,
    file: makeUploadFile('详细设计工作计划.xlsx', 'work-plan', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(connection.usersById.get(11))
  }, db, uploadStorage);
  assert.equal(findNode(preparationWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION).status, 'pending');
  assert.equal(findNode(preparationWorkflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'not_started');
  await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION,
    user: makeAuthUser(connection.usersById.get(11))
  }, db);

  let workflow = await uploadAndSubmitAllDetailedDesignMainFiles({ connection, db, storage: uploadStorage });
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN).status, 'approved');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW).status, 'pending');

  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({ reviewConclusion: '内部评审通过。' }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  workflow = await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
    payload: { comment: '内部评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW).status, 'pending');

  await submitDetailedDesignReviewForm({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: makeDetailedDesignReviewPayload({
      meetingLocation: '客户评审会议室',
      reviewConclusion: '客户评审通过。',
      recorder: '客户评审记录人'
    }),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, generatedStorage);
  workflow = await approveDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DESIGN_REVIEW,
    payload: { comment: '客户评审通过' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'pending');

  workflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_PLAN_DRAWING,
    file: makeUploadFile('产品平面图.dwg', 'plan', 'application/acad'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING).status, 'pending');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'not_started');
  workflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PRODUCT_PLAN_DRAWING,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');

  workflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PARTS_LIST,
    file: makeUploadFile('零部件清单.xlsx', 'parts', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    user: makeAuthUser(connection.usersById.get(13))
  }, db, uploadStorage);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.PARTS_LIST).status, 'pending');
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'not_started');
  workflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.PARTS_LIST,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'pending');

  workflow = await passDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '无问题' },
    user: makeAuthUser(connection.usersById.get(16))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW).status, 'waiting_rd_approval');

  workflow = await approveDetailedDesignDrawingReview({
    projectId: connection.projectRow.id,
    payload: { comment: '同意' },
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  assert.equal(findNode(workflow, DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN).status, 'pending');

  workflow = await uploadDetailedDesignWorkflowFile({
    projectId: connection.projectRow.id,
    slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
    file: makeUploadFile('客户会签图纸扫描件.pdf', 'countersign', 'application/pdf'),
    user: makeAuthUser(connection.usersById.get(12))
  }, db, uploadStorage);
  assert.equal(workflow.currentStage.stageKey, DETAILED_DESIGN_STAGE.STAGE_KEY);
  workflow = await submitDetailedDesignWorkflowNode({
    projectId: connection.projectRow.id,
    nodeKey: DETAILED_DESIGN_NODE_KEY.CUSTOMER_DRAWING_COUNTERSIGN,
    user: makeAuthUser(connection.usersById.get(12))
  }, db);

  assert.equal(workflow.currentStage.stageKey, 'manufacturing');
  assert.equal(workflow.currentStage.stageOrder, 5);
  assert.equal(connection.projectRow.current_stage_key, 'manufacturing');

  const checklist = await readChecklist();
  for (const documentCode of [
    'C25',
    'C26',
    'C27',
    'C28',
    'C29',
    'C30',
    'C32',
    'C33',
    'C34',
    'C35',
    'C36',
    'C37',
    'C38',
    'C39',
    'C41'
  ]) {
    assertChecklistDerivedCompletion(findChecklistDocument(checklist, documentCode), {
      documentCode,
      revision: 1,
      isComplete: true
    });
  }
  const c40 = findChecklistDocument(checklist, 'C40');
  assertChecklistDerivedCompletion(c40, {
    documentCode: 'C40',
    nodeKey: DETAILED_DESIGN_NODE_KEY.DRAWING_REVIEW,
    revision: 1,
    completionStatus: 'not_applicable',
    isComplete: true,
    notApplicable: true
  });
  assert.equal(c40.derivedBlockingReasons.length, 0);
  const c31 = findChecklistDocument(checklist, 'C31');
  assert.equal(c31.derivedCompletionSource, null);
  assert.equal(c31.detailedDesignDerivedCompletion, null);
});

test('customer drawing countersign upload rejects wrong role, inactive node, and ended projects', async () => {
  const wrongRoleConnection = new FakeDetailedDesignConnection();
  const wrongRoleDb = createDb(wrongRoleConnection);
  const wrongRoleStorage = createFakeUploadStorage();
  await prepareWorkflowAtCustomerCountersign({
    connection: wrongRoleConnection,
    db: wrongRoleDb,
    uploadStorage: wrongRoleStorage
  });

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: wrongRoleConnection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
      file: makeUploadFile('客户会签图纸扫描件.pdf'),
      user: makeAuthUser(wrongRoleConnection.usersById.get(13))
    }, wrongRoleDb, wrongRoleStorage),
    { code: DETAILED_DESIGN_ERROR.FORBIDDEN }
  );

  const inactiveConnection = new FakeDetailedDesignConnection();
  const inactiveDb = createDb(inactiveConnection);
  const inactiveStorage = createFakeUploadStorage();

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: inactiveConnection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
      file: makeUploadFile('客户会签图纸扫描件.pdf'),
      user: makeAuthUser(inactiveConnection.usersById.get(12))
    }, inactiveDb, inactiveStorage),
    { code: DETAILED_DESIGN_ERROR.NODE_NOT_PROCESSABLE }
  );

  const endedConnection = new FakeDetailedDesignConnection();
  const endedDb = createDb(endedConnection);
  const endedStorage = createFakeUploadStorage();
  await prepareWorkflowAtCustomerCountersign({
    connection: endedConnection,
    db: endedDb,
    uploadStorage: endedStorage
  });
  endedConnection.projectRow.status = 'ended';

  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: endedConnection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.CUSTOMER_DRAWING_COUNTERSIGN_SCAN,
      file: makeUploadFile('客户会签图纸扫描件.pdf'),
      user: makeAuthUser(endedConnection.usersById.get(12))
    }, endedDb, endedStorage),
    { code: DETAILED_DESIGN_ERROR.PROJECT_ENDED }
  );
});

test('detailed design writes are rejected when viewing after manufacturing stage', async () => {
  const connection = new FakeDetailedDesignConnection();
  connection.projectRow.current_stage_key = 'manufacturing';
  connection.projectRow.current_stage_order = 5;
  connection.projectRow.current_stage_name = '生产制作阶段';
  connection.projectRow.current_stage_status = 'current';

  await assert.rejects(
    assignDetailedDesignRoles({
      projectId: connection.projectRow.id,
      payload: makeRoleAssignmentPayload(),
      user: makeAuthUser(connection.usersById.get(10))
    }, createDb(connection)),
    { code: DETAILED_DESIGN_ERROR.NOT_IN_STAGE }
  );
  await assert.rejects(
    uploadDetailedDesignWorkflowFile({
      projectId: connection.projectRow.id,
      slotKey: DETAILED_DESIGN_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_BOOK,
      file: makeUploadFile('项目启动书.docx'),
      user: makeAuthUser(connection.usersById.get(18))
    }, createDb(connection), createFakeUploadStorage()),
    { code: DETAILED_DESIGN_ERROR.NOT_IN_STAGE }
  );
});

test('ordinary stage document status API cannot complete detailed design workflow-owned documents', async () => {
  const mainProcessCodes = ['C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C32', 'C33', 'C34', 'C35', 'C36', 'C37', 'C38', 'C39', 'C40', 'C41'];

  for (const documentCode of mainProcessCodes) {
    const connection = new FakeDetailedDesignConnection();
    connection.stageDocumentRow.document_code = documentCode;
    connection.stageDocumentRow.document_name = `${documentCode} workflow main document`;

    await assert.rejects(
      updateProjectStageDocumentStatus({
        connection,
        projectId: connection.projectRow.id,
        documentId: connection.stageDocumentRow.id,
        action: DOCUMENT_STATUS_ACTION.SUBMIT,
        user: makeAuthUser(connection.usersById.get(11))
      }),
      { code: 'DETAILED_DESIGN_DEDICATED_FLOW_REQUIRED' },
      `${documentCode} should require detailed design workflow`
    );
  }
});

test('ordinary stage document revision complete cannot bypass detailed design workflow-owned documents', async () => {
  const originalGetConnection = pool.getConnection;
  const cases = [
    { code: 'C25', name: '项目启动书' },
    { code: 'C38', name: '产品平面图' },
    { code: 'C39', name: '产品零部件清单' },
    { code: 'C40', name: '图纸审查记录' },
    { code: 'C41', name: '客户会签图纸扫描件' }
  ];

  try {
    for (const testCase of cases) {
      const connection = new FakeDetailedDesignConnection();
      connection.stageDocumentRow = {
        ...connection.stageDocumentRow,
        document_code: testCase.code,
        document_name: testCase.name,
        status: 'submitted',
        revision_required: 1,
        revision_reason: '返工原因',
        revision_source_document_id: 8801,
        revision_resubmitted_by_user_id: 11,
        revision_resubmitted_at: '2026-07-22 10:00:00',
        revision_completed_by_user_id: null,
        revision_completed_at: null
      };
      const originalState = {
        status: connection.stageDocumentRow.status,
        revisionRequired: connection.stageDocumentRow.revision_required,
        revisionCompletedByUserId: connection.stageDocumentRow.revision_completed_by_user_id,
        revisionCompletedAt: connection.stageDocumentRow.revision_completed_at
      };
      pool.getConnection = async () => connection;

      await assert.rejects(
        completeProjectStageDocumentRevision({
          projectId: connection.projectRow.id,
          documentId: connection.stageDocumentRow.id,
          user: makeAuthUser(connection.usersById.get(11))
        }),
        (error) => {
          assert.equal(error.code, 'DETAILED_DESIGN_DEDICATED_FLOW_REQUIRED');
          assert.equal(error.statusCode, 409);
          return true;
        },
        `${testCase.code} should require detailed design workflow revision path`
      );

      assert.deepEqual(
        {
          status: connection.stageDocumentRow.status,
          revisionRequired: connection.stageDocumentRow.revision_required,
          revisionCompletedByUserId: connection.stageDocumentRow.revision_completed_by_user_id,
          revisionCompletedAt: connection.stageDocumentRow.revision_completed_at
        },
        originalState
      );
      assert.equal(connection.operationLogs.length, 0);
    }
  } finally {
    pool.getConnection = originalGetConnection;
  }

  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C25'), true);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C38'), true);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C39'), true);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C40'), true);
  assert.equal(DETAILED_DESIGN_WORKFLOW_DOCUMENT_CODES.has('C31'), false);
});

test('detailed design workflow errors are handled without falling through to 500', () => {
  const response = createMockResponse();
  let nextCalled = false;
  const error = new DetailedDesignWorkflowError(
    DETAILED_DESIGN_ERROR.FORBIDDEN,
    'Current user cannot assign detailed design roles',
    403,
    { nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION }
  );

  errorHandler(
    error,
    {
      method: 'POST',
      originalUrl: '/api/projects/401/detailed-design-workflow/roles',
      user: { id: 11 }
    },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    error: {
      code: DETAILED_DESIGN_ERROR.FORBIDDEN,
      message: 'Current user cannot assign detailed design roles',
      details: { nodeKey: DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION }
    }
  });
});

test('detailed design workflow is read-only after project advances to manufacturing', async () => {
  const connection = new FakeDetailedDesignConnection();
  connection.projectRow.current_stage_key = 'manufacturing';
  connection.projectRow.current_stage_order = 5;
  connection.projectRow.current_stage_name = '生产制作阶段';
  connection.projectRow.current_stage_status = 'current';
  const db = createDb(connection);

  const workflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(13))
  }, db);

  assert.equal(workflow.stageKey, DETAILED_DESIGN_STAGE.STAGE_KEY);
  assert.equal(workflow.permissions.canAssignRoles, false);
  assertWorkflowHasNoWritePermissions(workflow);
});

test('design review blocking reasons follow form and review status fields', async () => {
  const cases = [
    {
      title: 'draft',
      nodeStatus: DETAILED_DESIGN_NODE_STATUS.PENDING,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.DRAFT,
      reviewStatus: 'pending',
      expected: ['等待技术负责人提交内部设计评审表']
    },
    {
      title: 'submitted',
      nodeStatus: DETAILED_DESIGN_NODE_STATUS.PENDING_REVIEW,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED,
      reviewStatus: 'pending',
      expected: ['等待研发中心负责人审批内部设计评审表']
    },
    {
      title: 'returned',
      nodeStatus: DETAILED_DESIGN_NODE_STATUS.RETURNED,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED,
      reviewStatus: 'returned',
      expected: ['内部设计评审已退回，等待技术负责人重新提交']
    },
    {
      title: 'approved',
      nodeStatus: DETAILED_DESIGN_NODE_STATUS.APPROVED,
      formStatus: DETAILED_DESIGN_REVIEW_FORM_STATUS.SUBMITTED,
      reviewStatus: 'approved',
      expected: []
    }
  ];

  for (const testCase of cases) {
    const connection = new FakeDetailedDesignConnection();
    connection.reviewForms = [
      makeReviewFormRow({
        nodeKey: DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW,
        formStatus: testCase.formStatus,
        reviewStatus: testCase.reviewStatus
      })
    ];
    seedDetailedDesignWorkflowRows(connection, {
      nodeStatuses: {
        [DETAILED_DESIGN_NODE_KEY.PROJECT_KICKOFF_MEETING]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
        [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN_PREPARATION]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
        [DETAILED_DESIGN_NODE_KEY.DETAILED_DESIGN]: DETAILED_DESIGN_NODE_STATUS.APPROVED,
        [DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW]: testCase.nodeStatus
      }
    });
    const db = createDb(connection);
    const workflow = await getDetailedDesignWorkflow({
      projectId: connection.projectRow.id,
      user: makeAuthUser(connection.usersById.get(13))
    }, db);
    const node = findNode(workflow, DETAILED_DESIGN_NODE_KEY.INTERNAL_DESIGN_REVIEW);

    assert.deepEqual(node.blockingReasons, testCase.expected, `${testCase.title} blocking reasons`);
  }
});

test('detailed design navigation only exposes the 9 workflow nodes', async () => {
  const connection = new FakeDetailedDesignConnection();
  const db = createDb(connection);
  const workflow = await getDetailedDesignWorkflow({
    projectId: connection.projectRow.id,
    user: makeAuthUser(connection.usersById.get(10))
  }, db);
  const navigation = buildProjectNavigationFromWorkspace(connection.projectRow.id, createWorkspaceFromWorkflow(workflow));
  const detailedDesignStage = navigation.children.find((stage) => stage.stageKey === DETAILED_DESIGN_STAGE.STAGE_KEY);

  assert.ok(detailedDesignStage);
  assert.equal(detailedDesignStage.children.length, 9);
  assert.deepEqual(
    detailedDesignStage.children.map((node) => node.nodeKey),
    DETAILED_DESIGN_NODES.map((definition) => definition.nodeKey)
  );
  assert.equal(
    detailedDesignStage.children.some((node) => node.nodeKey === 'C31' || node.name.includes('控制逻辑流程图')),
    false
  );
  assert.equal(detailedDesignStage.children[0].status, 'PROCESSING');
});
