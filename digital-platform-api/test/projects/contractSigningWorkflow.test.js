import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_DEPARTMENT,
  CONTRACT_SIGNING_NODE_KEY,
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_PAYMENT_STATUS,
  CONTRACT_SIGNING_UPLOAD_SLOT_KEY,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS
} from '../../src/domain/contractSigningWorkflow.js';
import { ORGANIZATION_ROLE } from '../../src/domain/organization.js';
import { SELF_DEVELOPED_PROJECT_STAGES } from '../../src/domain/projectProcessTemplates.js';
import {
  DOCUMENT_STATUS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
  STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629,
  V20260629_WORKSPACE_BLUE_MODULES,
  V20260629_TARGET_TEMPLATE_OUTPUTS
} from '../../src/domain/stageDocumentTemplates.js';
import {
  deriveStageDocumentCompletion,
  attachSolutionDesignDerivedCompletionToStageDocumentRows,
  mapGateDocument
} from '../../src/repositories/stageDocuments/shared.js';
import {
  assertContractSigningWriteAllowed,
  approveContractSigningPreparationFile,
  approveContractSigningPaymentRelease,
  completeContractSigningAdvancePayment,
  confirmContractSigningScanFile,
  getContractSigningUploadDownload,
  getContractSigningWorkflow,
  requestContractSigningPaymentRelease,
  returnContractSigningPreparationFile,
  selectContractSigningWorkbenchTodos,
  uploadContractSigningWorkflowFile
} from '../../src/repositories/projects/contractSigningWorkflowRepository.js';
import { advanceProjectStage } from '../../src/repositories/projects/stageAdvanceRepository.js';
import { OPERATION_ACTION_TYPE } from '../../src/repositories/operationLogRepository.js';
import { buildContractSigningSupplementalDocuments } from '../../src/repositories/projects/workspaceRepository.js';
import { pool } from '../../src/db/pool.js';
import {
  buildWorkbenchSummary,
  getMyWorkbench
} from '../../src/repositories/stageDocuments/workbenchRepository.js';
import {
  NAVIGATION_STATUS,
  buildProjectNavigationFromWorkspace
} from '../../src/services/navigationService.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function userRow({
  id,
  account,
  displayName,
  department,
  organizationRole = ORGANIZATION_ROLE.EMPLOYEE,
  isEnabled = 1
}) {
  return {
    id,
    account,
    display_name: displayName,
    department,
    organization_role: organizationRole,
    role: organizationRole,
    is_enabled: isEnabled,
    is_platform_admin: 0,
    file_platform_user_id: null
  };
}

function baseUsers() {
  return new Map(
    [
      userRow({
        id: 11,
        account: 'pm',
        displayName: '项目经理',
        department: BUSINESS_DEPARTMENT.RD_CENTER
      }),
      userRow({
        id: 12,
        account: 'tech_owner',
        displayName: '技术负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER
      }),
      userRow({
        id: 13,
        account: 'business_owner',
        displayName: '商务负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER
      }),
      userRow({
        id: 20,
        account: 'rd_manager',
        displayName: '研发中心负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      userRow({
        id: 21,
        account: 'marketing_manager',
        displayName: '营销中心负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      userRow({
        id: 30,
        account: 'general_manager',
        displayName: '总经理',
        department: null,
        organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER
      })
    ].map((row) => [row.id, row])
  );
}

function authUser(row) {
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

function buildPdfFile(originalFileName = 'contract.pdf') {
  const buffer = Buffer.from('%PDF-1.4 contract signing workflow test');
  return {
    originalFileName,
    mimeType: 'application/pdf',
    buffer,
    size: buffer.length
  };
}

function fakeStorage() {
  return {
    written: [],
    cleaned: [],
    createStorageKey({ projectId, slotKey }) {
      return `contract-signing/${projectId}/${slotKey}/${this.written.length + 1}.pdf`;
    },
    async writeFile(storageKey, buffer) {
      this.written.push({ storageKey, buffer });
      return {
        storageKey,
        size: buffer.length
      };
    },
    async assertFileReadable(storageKey) {
      if (!this.written.some((entry) => entry.storageKey === storageKey)) {
        throw new Error('missing test file');
      }

      return storageKey;
    },
    async cleanupFile(storageKey) {
      this.cleaned.push(storageKey);
    }
  };
}

function buildProjectStages(projectId, currentStageOrder = 3) {
  return SELF_DEVELOPED_PROJECT_STAGES.map((stage) => ({
    id: 2000 + stage.stageOrder,
    project_id: projectId,
    stage_order: stage.stageOrder,
    stage_key: stage.stageKey,
    stage_name: stage.stageName,
    stage_status:
      stage.stageOrder < currentStageOrder
        ? 'completed'
        : stage.stageOrder === currentStageOrder
          ? 'current'
          : 'not_started',
    is_current: stage.stageOrder === currentStageOrder ? 1 : 0
  }));
}

function buildProjectStageDocuments(projectId) {
  return STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629.map((item, index) => ({
    id: 3000 + index + 1,
    project_id: projectId,
    template_id: 1000 + index + 1,
    template_version: item.templateVersion,
    stage_order: item.stageOrder,
    stage_key: item.stageKey,
    stage_name: item.stageName,
    document_order: item.documentOrder,
    document_code: item.documentCode,
    document_name: item.documentName,
    is_required: item.isRequired ? 1 : 0,
    default_responsibility_role: item.defaultResponsibilityRole,
    confirm_role: item.confirmRole,
    owner_department: item.ownerDepartment,
    review_department: item.reviewDepartment,
    completion_mode: item.completionMode,
    submit_mode: item.submitMode,
    target_folder_path: item.targetFolderPath,
    target_folder_id: null,
    status: DOCUMENT_STATUS.NOT_SUBMITTED,
    is_applicable: 1,
    revision_required: 0,
    revision_reason: null,
    revision_source_document_id: null,
    revision_requested_at: null,
    revision_resubmitted_by_user_id: null,
    revision_resubmitted_at: null
  }));
}

class ContractSigningWorkflowFakeConnection {
  constructor({ currentStageOrder = 3, projectStatus = 'normal', visible = true } = {}) {
    this.project = {
      id: 200,
      project_code: 'HT-200',
      project_name: '合同 workflow 项目',
      customer_name: '客户公司',
      status: projectStatus,
      project_manager_user_id: 11,
      created_by_user_id: 1
    };
    this.users = baseUsers();
    this.visible = visible;
    this.rolesRow = {
      id: 1,
      project_id: this.project.id,
      technical_owner_user_id: 12,
      business_owner_user_id: 13,
      procurement_owner_user_id: 14,
      finance_accountant_user_id: 15,
      finance_owner_user_id: 16
    };
    this.stages = buildProjectStages(this.project.id, currentStageOrder);
    this.projectStageDocuments = buildProjectStageDocuments(this.project.id);
    this.contractNodes = [];
    this.contractUploadSlots = [];
    this.contractUploadFiles = [];
    this.contractPaymentFlows = [];
    this.operationLogs = [];
    this.contractNodeInsertCount = 0;
    this.contractUploadSlotInsertCount = 0;
    this.contractPaymentFlowInsertCount = 0;
    this.committed = false;
    this.rolledBack = false;
  }

  async beginTransaction() {}

  async commit() {
    this.committed = true;
  }

  async rollback() {
    this.rolledBack = true;
  }

  release() {}

  projectContextRow() {
    const currentStage = this.stages.find((stage) => Boolean(stage.is_current));
    const projectManager = this.users.get(Number(this.project.project_manager_user_id));

    return {
      ...this.project,
      current_stage_id: currentStage?.id ?? null,
      current_stage_order: currentStage?.stage_order ?? null,
      current_stage_key: currentStage?.stage_key ?? null,
      current_stage_name: currentStage?.stage_name ?? null,
      current_stage_status: currentStage?.stage_status ?? null,
      project_manager_account: projectManager?.account ?? null,
      project_manager_display_name: projectManager?.display_name ?? null,
      project_manager_department: projectManager?.department ?? null,
      project_manager_organization_role: projectManager?.organization_role ?? null,
      project_manager_role: projectManager?.role ?? null,
      project_manager_is_enabled: projectManager?.is_enabled ?? null,
      project_manager_is_platform_admin: projectManager?.is_platform_admin ?? null,
      project_manager_file_platform_user_id: projectManager?.file_platform_user_id ?? null
    };
  }

  contractUploadSlotRowsWithCurrentFiles() {
    return [...this.contractUploadSlots]
      .sort((left, right) => left.slot_order - right.slot_order)
      .map((slot) => {
        const currentFile =
          this.contractUploadFiles.find((file) => file.slot_id === slot.id && file.is_current === 1) || null;
        const uploader = currentFile ? this.users.get(Number(currentFile.uploaded_by_user_id)) : null;
        const submitter = slot.submitted_by_user_id ? this.users.get(Number(slot.submitted_by_user_id)) : null;
        const reviewer = slot.reviewed_by_user_id ? this.users.get(Number(slot.reviewed_by_user_id)) : null;
        const confirmer = slot.confirmed_by_user_id ? this.users.get(Number(slot.confirmed_by_user_id)) : null;

        return {
          ...slot,
          current_file_id: currentFile?.id ?? null,
          current_file_revision: currentFile?.revision ?? null,
          current_file_original_file_name: currentFile?.original_file_name ?? null,
          current_file_mime_type: currentFile?.mime_type ?? null,
          current_file_size: currentFile?.file_size ?? null,
          current_file_uploaded_by_user_id: currentFile?.uploaded_by_user_id ?? null,
          current_file_uploaded_at: currentFile?.uploaded_at ?? null,
          current_file_uploaded_by_account: uploader?.account ?? null,
          current_file_uploaded_by_display_name: uploader?.display_name ?? null,
          submitted_by_account: submitter?.account ?? null,
          submitted_by_display_name: submitter?.display_name ?? null,
          reviewed_by_account: reviewer?.account ?? null,
          reviewed_by_display_name: reviewer?.display_name ?? null,
          confirmed_by_account: confirmer?.account ?? null,
          confirmed_by_display_name: confirmer?.display_name ?? null
        };
      });
  }

  paymentFlowRow() {
    const flow = this.contractPaymentFlows[0];
    if (!flow) {
      return null;
    }

    const requester = flow.requested_by_user_id ? this.users.get(Number(flow.requested_by_user_id)) : null;
    const approver = flow.approved_by_user_id ? this.users.get(Number(flow.approved_by_user_id)) : null;
    return {
      ...flow,
      requested_by_account: requester?.account ?? null,
      requested_by_display_name: requester?.display_name ?? null,
      approved_by_account: approver?.account ?? null,
      approved_by_display_name: approver?.display_name ?? null
    };
  }

  async execute(sql, params = []) {
    const text = normalizeSql(sql);

    if (text.startsWith('SELECT id FROM projects WHERE id = ?')) {
      return Number(params[0]) === Number(this.project.id) ? [[{ id: this.project.id }]] : [[]];
    }

    if (
      text.startsWith('SELECT p.id,') &&
      text.includes('LEFT JOIN users pm') &&
      text.includes('WHERE s.stage_key = ?')
    ) {
      const [stageKey, excludedStatus] = params;
      const currentStage = this.stages.find((stage) => Boolean(stage.is_current));
      return currentStage?.stage_key === stageKey && this.project.status !== excludedStatus
        ? [[this.projectContextRow()]]
        : [[]];
    }

    if (text.startsWith('SELECT status FROM project_contract_signing_nodes')) {
      const [projectId, nodeKey] = params;
      const node =
        this.contractNodes.find(
          (candidate) =>
            Number(candidate.project_id) === Number(projectId) && candidate.node_key === nodeKey
        ) || null;
      return [node ? [{ status: node.status }] : []];
    }

    if (text.startsWith('SELECT p.id,') && text.includes('LEFT JOIN users pm')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT *, 0 AS has_department_responsible FROM projects')) {
      return [[{ ...this.project, has_department_responsible: 0 }]];
    }

    if (text.startsWith('SELECT d.*') && text.includes('FROM project_stage_documents d')) {
      return [[]];
    }

    if (text.startsWith('SELECT d.*,') && text.includes('FROM project_stage_documents d')) {
      return [[]];
    }

    if (text.includes('FROM project_initiation_review_nodes n')) {
      return [[]];
    }

    if (
      text.includes('FROM project_solution_design_') &&
      !text.startsWith('SELECT * FROM project_solution_design_roles') &&
      !text.includes('visible_solution_design_roles')
    ) {
      return [[]];
    }

    if (text.startsWith('SELECT p.id FROM projects p WHERE p.id = ?')) {
      return [this.visible ? [{ id: params[0] }] : []];
    }

    if (text.startsWith('SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC')) {
      const [projectId] = params;
      return [
        this.stages
          .filter((stage) => Number(stage.project_id) === Number(projectId))
          .sort((left, right) => left.stage_order - right.stage_order)
          .map((stage) => ({ ...stage }))
      ];
    }

    if (
      text.startsWith('SELECT d.id, d.project_id') &&
      text.includes('FROM project_stage_documents d') &&
      text.includes('AND d.stage_order = ?')
    ) {
      const [projectId, stageOrder] = params;
      return [
        this.projectStageDocuments
          .filter(
            (document) =>
              Number(document.project_id) === Number(projectId) &&
              Number(document.stage_order) === Number(stageOrder)
          )
          .sort((left, right) => left.document_order - right.document_order)
          .map((document) => ({
            ...document,
            revision_source_document_code: null,
            revision_source_document_name: null
          }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_roles')) {
      return [this.rolesRow ? [{ ...this.rolesRow }] : []];
    }

    if (text.startsWith('SELECT id, account') && text.includes('FROM users')) {
      const ids = new Set(params.map(Number));
      return [[...this.users.values()].filter((user) => ids.has(Number(user.id))).map((user) => ({ ...user }))];
    }

    if (
      text.startsWith('SELECT * FROM project_contract_signing_nodes') &&
      text.includes('AND node_key = ?')
    ) {
      const [projectId, nodeKey] = params;
      const node =
        this.contractNodes.find(
          (candidate) =>
            Number(candidate.project_id) === Number(projectId) && candidate.node_key === nodeKey
        ) || null;
      return [node ? [{ ...node }] : []];
    }

    if (text.startsWith('SELECT * FROM project_contract_signing_nodes')) {
      return [[...this.contractNodes].sort((left, right) => left.node_order - right.node_order)];
    }

    if (
      text.startsWith('SELECT s.*, f.id AS current_file_id') &&
      text.includes('AND s.slot_key = ?')
    ) {
      const [, slotKey] = params;
      const slotRow = this.contractUploadSlotRowsWithCurrentFiles()
        .find((slot) => slot.slot_key === slotKey);
      return [slotRow ? [slotRow] : []];
    }

    if (text.startsWith('SELECT s.*, f.id AS current_file_id')) {
      return [this.contractUploadSlotRowsWithCurrentFiles()];
    }

    if (text.startsWith('SELECT f.*, s.node_key AS slot_node_key')) {
      const [projectId, slotKey] = params;
      const file =
        this.contractUploadFiles.find(
          (candidate) =>
            Number(candidate.project_id) === Number(projectId) &&
            candidate.slot_key === slotKey &&
            candidate.is_current === 1
        ) || null;
      if (!file) {
        return [[]];
      }

      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(file.slot_id));
      const uploader = this.users.get(Number(file.uploaded_by_user_id));
      return [[{
        ...file,
        slot_node_key: slot?.node_key ?? null,
        slot_name: slot?.slot_name ?? null,
        slot_order: slot?.slot_order ?? null,
        uploaded_by_account: uploader?.account ?? null,
        uploaded_by_display_name: uploader?.display_name ?? null
      }]];
    }

    if (text.startsWith('SELECT * FROM project_contract_signing_upload_files')) {
      const [projectId, slotKey] = params;
      return [
        this.contractUploadFiles
          .filter(
            (file) =>
              Number(file.project_id) === Number(projectId) &&
              file.slot_key === slotKey &&
              file.is_current === 1
          )
          .map((file) => ({ ...file }))
      ];
    }

    if (text.startsWith('SELECT f.*, u.account AS uploaded_by_account')) {
      const [fileId] = params;
      const file = this.contractUploadFiles.find((candidate) => Number(candidate.id) === Number(fileId));
      if (!file) {
        return [[]];
      }
      const uploader = this.users.get(Number(file.uploaded_by_user_id));
      return [[{
        ...file,
        uploaded_by_account: uploader?.account ?? null,
        uploaded_by_display_name: uploader?.display_name ?? null
      }]];
    }

    if (text.startsWith('SELECT f.*, requester.account AS requested_by_account')) {
      const paymentFlow = this.paymentFlowRow();
      return [paymentFlow ? [paymentFlow] : []];
    }

    if (text.startsWith('SELECT node_key FROM project_contract_signing_nodes')) {
      const [projectId] = params;
      return [
        this.contractNodes
          .filter((node) => Number(node.project_id) === Number(projectId))
          .map((node) => ({ node_key: node.node_key }))
      ];
    }

    if (text.startsWith('SELECT slot_key FROM project_contract_signing_upload_slots')) {
      const [projectId] = params;
      return [
        this.contractUploadSlots
          .filter((slot) => Number(slot.project_id) === Number(projectId))
          .map((slot) => ({ slot_key: slot.slot_key }))
      ];
    }

    if (text.startsWith('INSERT IGNORE INTO project_contract_signing_nodes')) {
      const [projectId, nodeKey, nodeName, nodeOrder, status] = params;
      if (this.contractNodes.some((node) => node.project_id === projectId && node.node_key === nodeKey)) {
        return [{ affectedRows: 0 }];
      }

      this.contractNodes.push({
        id: this.contractNodes.length + 1,
        project_id: projectId,
        node_key: nodeKey,
        node_name: nodeName,
        node_order: nodeOrder,
        status,
        return_reason: null,
        current_revision: 1,
        activated_at: text.includes('CURRENT_TIMESTAMP') ? '2026-07-16 10:00:00' : null,
        submitted_at: null,
        approved_at: null,
        returned_at: null
      });
      this.contractNodeInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT IGNORE INTO project_contract_signing_upload_slots')) {
      const [projectId, nodeKey, slotKey, slotName, slotOrder, status] = params;
      if (this.contractUploadSlots.some((slot) => slot.project_id === projectId && slot.slot_key === slotKey)) {
        return [{ affectedRows: 0 }];
      }

      this.contractUploadSlots.push({
        id: this.contractUploadSlots.length + 1,
        project_id: projectId,
        node_key: nodeKey,
        slot_key: slotKey,
        slot_name: slotName,
        slot_order: slotOrder,
        is_required: 1,
        revision: 1,
        status,
        review_status: null,
        confirmation_status: null,
        return_reason: null,
        submitted_by_user_id: null,
        submitted_at: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        confirmed_by_user_id: null,
        confirmed_at: null
      });
      this.contractUploadSlotInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT IGNORE INTO project_contract_signing_payment_flows')) {
      const [projectId, status] = params;
      if (this.contractPaymentFlows.some((flow) => flow.project_id === projectId)) {
        return [{ affectedRows: 0 }];
      }

      this.contractPaymentFlows.push({
        id: this.contractPaymentFlows.length + 1,
        project_id: projectId,
        status,
        requested_by_user_id: null,
        requested_at: null,
        approved_by_user_id: null,
        approved_at: null
      });
      this.contractPaymentFlowInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_contract_signing_upload_files SET is_current = 0')) {
      const [projectId, slotKey] = params;
      for (const file of this.contractUploadFiles) {
        if (
          Number(file.project_id) === Number(projectId) &&
          file.slot_key === slotKey &&
          file.is_current === 1
        ) {
          file.is_current = 0;
          file.replaced_at = '2026-07-16 11:00:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_contract_signing_upload_files')) {
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
      const id = this.contractUploadFiles.length + 1;
      this.contractUploadFiles.push({
        id,
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
        uploaded_at: '2026-07-16 11:00:00',
        replaced_at: null
      });
      return [{ insertId: id, affectedRows: 1 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('review_status = NULL') &&
      text.includes('confirmation_status = NULL') &&
      text.includes('submitted_by_user_id = ?') &&
      text.includes('AND status = ?')
    ) {
      const [status, submittedByUserId, revision, slotId, expectedStatus] = params;
      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(slotId));
      if (!slot || slot.status !== expectedStatus) {
        return [{ affectedRows: 0 }];
      }
      slot.status = status;
      slot.review_status = null;
      slot.confirmation_status = null;
      slot.return_reason = null;
      slot.submitted_by_user_id = submittedByUserId;
      slot.submitted_at = '2026-07-16 12:05:00';
      slot.reviewed_by_user_id = null;
      slot.reviewed_at = null;
      slot.confirmed_by_user_id = null;
      slot.confirmed_at = null;
      slot.revision = revision;
      return [{ affectedRows: 1 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('review_status = ?') &&
      text.includes('submitted_by_user_id = ?')
    ) {
      const [status, reviewStatus, submittedByUserId, revision, slotId] = params;
      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(slotId));
      if (slot) {
        slot.status = status;
        slot.review_status = reviewStatus;
        slot.confirmation_status = null;
        slot.return_reason = null;
        slot.submitted_by_user_id = submittedByUserId;
        slot.submitted_at = '2026-07-16 11:00:00';
        slot.reviewed_by_user_id = null;
        slot.reviewed_at = null;
        slot.revision = revision;
      }
      return [{ affectedRows: slot ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('confirmation_status = ?') &&
      text.includes('submitted_by_user_id = ?')
    ) {
      const [status, confirmationStatus, submittedByUserId, revision, slotId] = params;
      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(slotId));
      if (slot) {
        slot.status = status;
        slot.review_status = null;
        slot.confirmation_status = confirmationStatus;
        slot.return_reason = null;
        slot.submitted_by_user_id = submittedByUserId;
        slot.submitted_at = '2026-07-16 11:05:00';
        slot.confirmed_by_user_id = null;
        slot.confirmed_at = null;
        slot.revision = revision;
      }
      return [{ affectedRows: slot ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_nodes SET status = ?') &&
      text.includes('submitted_at = COALESCE')
    ) {
      const [status, projectId, nodeKey, ...expectedStatuses] = params;
      const node = this.contractNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          candidate.node_key === nodeKey &&
          (expectedStatuses.length === 0 || expectedStatuses.includes(candidate.status))
      );
      if (node) {
        node.status = status;
        node.submitted_at = node.submitted_at || '2026-07-16 11:00:00';
        node.return_reason = null;
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('reviewed_by_user_id = ?') &&
      text.includes('AND status = ?')
    ) {
      const [status, reviewStatus, third, fourth, fifth, sixth] = params;
      const isReturn = text.includes('return_reason = ?');
      const slotId = isReturn ? fifth : fourth;
      const expectedStatus = isReturn ? sixth : fifth;
      const actorUserId = isReturn ? fourth : third;
      const returnReason = isReturn ? third : null;
      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(slotId));
      if (!slot || slot.status !== expectedStatus) {
        return [{ affectedRows: 0 }];
      }
      slot.status = status;
      slot.review_status = reviewStatus;
      slot.return_reason = returnReason;
      slot.reviewed_by_user_id = actorUserId;
      slot.reviewed_at = '2026-07-16 11:20:00';
      return [{ affectedRows: 1 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('confirmed_by_user_id = ?') &&
      text.includes('AND status IN (?, ?)')
    ) {
      const [status, confirmationStatus, returnReason, actorUserId, slotId, firstExpected, secondExpected] = params;
      const slot = this.contractUploadSlots.find((candidate) => Number(candidate.id) === Number(slotId));
      if (!slot || ![firstExpected, secondExpected].includes(slot.status)) {
        return [{ affectedRows: 0 }];
      }
      slot.status = status;
      slot.confirmation_status = confirmationStatus;
      slot.return_reason = returnReason;
      slot.confirmed_by_user_id = actorUserId;
      slot.confirmed_at = '2026-07-16 11:40:00';
      return [{ affectedRows: 1 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_upload_slots SET status = ?') &&
      text.includes('review_status = ?') &&
      text.includes('AND slot_key = ?') &&
      text.includes('AND status = ?')
    ) {
      const [status, reviewStatus, returnReason, projectId, slotKey, expectedStatus] = params;
      const slot = this.contractUploadSlots.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          candidate.slot_key === slotKey &&
          candidate.status === expectedStatus
      );
      if (slot) {
        slot.status = status;
        slot.review_status = reviewStatus;
        slot.return_reason = returnReason;
      }
      return [{ affectedRows: slot ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_nodes SET status = ?') &&
      text.includes('return_reason = ?') &&
      text.includes('returned_at = CURRENT_TIMESTAMP')
    ) {
      const [status, returnReason, projectId, nodeKey] = params;
      const node = this.contractNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) && candidate.node_key === nodeKey
      );
      if (node) {
        node.status = status;
        node.return_reason = returnReason;
        node.returned_at = '2026-07-16 11:20:00';
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_nodes SET status = ?') &&
      text.includes('approved_at = CURRENT_TIMESTAMP')
    ) {
      const [status, projectId, nodeKey, ...expectedStatuses] = params;
      const node = this.contractNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          candidate.node_key === nodeKey &&
          (expectedStatuses.length === 0 || expectedStatuses.includes(candidate.status))
      );
      if (node) {
        node.status = status;
        node.approved_at = '2026-07-16 11:30:00';
        node.return_reason = null;
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_nodes SET status = ?') &&
      text.includes('activated_at = COALESCE')
    ) {
      const [status, projectId, nodeKey, ...expectedStatuses] = params;
      const node = this.contractNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          candidate.node_key === nodeKey &&
          expectedStatuses.includes(candidate.status)
      );
      if (node) {
        node.status = status;
        node.activated_at = node.activated_at || '2026-07-16 11:30:00';
        node.return_reason = null;
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_contract_signing_payment_flows SET status = ?')) {
      let status;
      let projectId;
      let expectedStatus;
      let requestedByUserId = null;
      let approvedByUserId = null;

      if (text.includes('requested_by_user_id = ?')) {
        [status, requestedByUserId, projectId, expectedStatus] = params;
      } else if (text.includes('approved_by_user_id = ?')) {
        [status, approvedByUserId, projectId, expectedStatus] = params;
      } else {
        [status, projectId, expectedStatus] = params;
      }

      const flow = this.contractPaymentFlows.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) &&
          candidate.status === expectedStatus
      );
      if (flow) {
        flow.status = status;
        if (text.includes('requested_by_user_id = ?')) {
          flow.requested_by_user_id = requestedByUserId;
          flow.requested_at = '2026-07-16 11:50:00';
          flow.approved_by_user_id = null;
          flow.approved_at = null;
        } else if (text.includes('requested_by_user_id = NULL')) {
          flow.requested_by_user_id = null;
          flow.requested_at = null;
          flow.approved_by_user_id = null;
          flow.approved_at = null;
        }
        if (text.includes('approved_by_user_id = ?')) {
          flow.approved_by_user_id = approvedByUserId;
          flow.approved_at = '2026-07-16 12:00:00';
        } else if (text.includes('approved_by_user_id = NULL')) {
          flow.approved_by_user_id = null;
          flow.approved_at = null;
        }
      }
      return [{ affectedRows: flow ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_contract_signing_nodes SET status = ?') &&
      text.includes('updated_at = CURRENT_TIMESTAMP WHERE project_id = ?') &&
      !text.includes('submitted_at = COALESCE') &&
      !text.includes('approved_at = CURRENT_TIMESTAMP') &&
      !text.includes('return_reason = ?') &&
      !text.includes('activated_at = COALESCE')
    ) {
      const [status, projectId, nodeKey] = params;
      const node = this.contractNodes.find(
        (candidate) =>
          Number(candidate.project_id) === Number(projectId) && candidate.node_key === nodeKey
      );
      if (node) {
        node.status = status;
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_stages SET stage_status = ?') &&
      text.includes('is_current = 0') &&
      text.includes('completed_at = CURRENT_TIMESTAMP')
    ) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => Number(candidate.id) === Number(stageId));
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 0;
        stage.completed_at = '2026-07-16 12:10:00';
      }
      return [{ affectedRows: stage ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_stages SET stage_status = ?') &&
      text.includes('is_current = 1') &&
      text.includes('started_at = CURRENT_TIMESTAMP')
    ) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => Number(candidate.id) === Number(stageId));
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 1;
        stage.started_at = '2026-07-16 12:10:00';
      }
      return [{ affectedRows: stage ? 1 : 0 }];
    }

    if (text.startsWith('INSERT INTO business_operation_logs')) {
      const [projectId, actorUserId, actionType, targetType, targetId, summary, detailsJson] = params;
      this.operationLogs.push({
        project_id: projectId,
        actor_user_id: actorUserId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        summary,
        details_json: detailsJson
      });
      return [{ insertId: this.operationLogs.length, affectedRows: 1 }];
    }

    throw new Error(`Unexpected contract workflow SQL: ${text}`);
  }
}

function fakeDb(options = {}) {
  const connection = new ContractSigningWorkflowFakeConnection(options);
  return {
    connection,
    async getConnection() {
      return connection;
    }
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

function findNode(workflow, nodeKey) {
  return workflow.nodes.find((node) => node.nodeKey === nodeKey) || null;
}

function findSlot(workflow, slotKey) {
  return workflow.uploadSlots.find((slot) => slot.slotKey === slotKey) || null;
}

function latestLog(connection, actionType) {
  return [...connection.operationLogs].reverse().find((log) => log.action_type === actionType) || null;
}

function todoActionTexts(todos) {
  return todos.map((todo) => todo.actionText).sort((left, right) => left.localeCompare(right));
}

function addCurrentContractFile(connection, slotKey, { revision = 1 } = {}) {
  const slot = connection.contractUploadSlots.find((candidate) => candidate.slot_key === slotKey);
  connection.contractUploadFiles.push({
    id: connection.contractUploadFiles.length + 1,
    project_id: connection.project.id,
    slot_id: slot.id,
    slot_key: slot.slot_key,
    revision,
    original_file_name: `${slot.slot_name}.pdf`,
    storage_key: `contract/${connection.project.id}/${slot.slot_key}/${revision}.pdf`,
    mime_type: 'application/pdf',
    file_size: 1024,
    is_current: 1,
    uploaded_by_user_id: 13,
    uploaded_at: '2026-07-16 10:30:00'
  });
  return slot;
}

async function activateContractSigningNode({ db, storage }) {
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(20));
  const marketingManager = authUser(db.connection.users.get(21));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);
  await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db);
  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    file: buildPdfFile('销售合同.pdf'),
    user: businessOwner
  }, db, storage);
  return approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    user: marketingManager
  }, db);
}

async function uploadSigningScans({ db, storage }) {
  const businessOwner = authUser(db.connection.users.get(13));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    file: buildPdfFile('技术协议扫描件.pdf'),
    user: businessOwner
  }, db, storage);
  return uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    file: buildPdfFile('销售合同扫描件.pdf'),
    user: businessOwner
  }, db, storage);
}

async function activateAdvancePaymentNode({ db, storage }) {
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  await uploadSigningScans({ db, storage });
  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);
  return confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);
}

function markContractStageConditionalInvoiceNotApplicable(connection) {
  const invoice = connection.projectStageDocuments.find(
    (document) => document.document_name === '发票（预付款）'
  );
  if (invoice) {
    invoice.is_applicable = 0;
  }
}

async function activateProjectKickoffNoticeNode({ db, storage }) {
  const businessOwner = authUser(db.connection.users.get(13));
  markContractStageConditionalInvoiceNotApplicable(db.connection);
  await activateAdvancePaymentNode({ db, storage });
  return completeContractSigningAdvancePayment({
    projectId: 200,
    user: businessOwner
  }, db);
}

async function assertManualContractAdvanceBlockedByKickoffNotice(db, user) {
  await assert.rejects(
    () => advanceProjectStage(200, user, db),
    (error) => {
      assert.equal(error.code, 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE');
      assert.equal(error.message, '项目启动通知未上传完成');
      const documents = error.details?.incompleteRequiredDocuments || [];
      const kickoffNoticeDocument = documents.find((document) => document.documentCode === 'C25');
      assert.ok(kickoffNoticeDocument);
      assert.equal(kickoffNoticeDocument.documentName, '项目启动通知');
      assert.deepEqual(kickoffNoticeDocument.derivedBlockingReasons, ['项目启动通知未上传完成']);
      return true;
    }
  );

  assert.equal(
    db.connection.stages.find((stage) => stage.stage_key === 'contract').stage_status,
    'current'
  );
  assert.equal(
    db.connection.stages.find((stage) => stage.stage_key === 'detailedDesign').stage_status,
    'not_started'
  );
  assert.equal(db.connection.rolledBack, true);
}

test('contract signing workflow initializes four nodes, five slots, and payment flow in contract stage', async () => {
  const db = fakeDb();
  const businessOwner = authUser(db.connection.users.get(13));

  const workflow = await getContractSigningWorkflow({
    projectId: 200,
    user: businessOwner
  }, db);

  assert.equal(workflow.projectId, 200);
  assert.equal(workflow.stageKey, 'contract');
  assert.equal(workflow.nodes.length, 4);
  assert.deepEqual(
    workflow.nodes.map((node) => node.nodeKey),
    [
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
      CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
      CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
      CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE
    ]
  );
  assert.equal(findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status, CONTRACT_SIGNING_NODE_STATUS.PENDING);
  assert.equal(findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status, CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED);
  assert.equal(workflow.uploadSlots.length, 5);
  assert.deepEqual(
    workflow.uploadSlots.map((slot) => slot.slotKey),
    [
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
      CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE
    ]
  );
  assert.equal(workflow.paymentFlow.status, CONTRACT_SIGNING_PAYMENT_STATUS.NOT_STARTED);
  assert.equal(db.connection.contractNodeInsertCount, 4);
  assert.equal(db.connection.contractUploadSlotInsertCount, 5);
  assert.equal(db.connection.contractPaymentFlowInsertCount, 1);
});

test('contract workflow uses solution design role assignment for technical and business owners', async () => {
  const db = fakeDb();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));

  const technicalWorkflow = await getContractSigningWorkflow({ projectId: 200, user: technicalOwner }, db);
  const businessWorkflow = await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);

  assert.equal(technicalWorkflow.roles.technical_owner.userId, 12);
  assert.equal(technicalWorkflow.roles.technical_owner.source, 'solution_design_role_assignment');
  assert.equal(businessWorkflow.roles.business_owner.userId, 13);
  assert.equal(findSlot(technicalWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).permissions.canUpload, true);
  assert.equal(findSlot(businessWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).permissions.canUpload, true);
});

test('contract workbench todos follow preparation upload and review permissions', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(20));
  const marketingManager = authUser(db.connection.users.get(21));

  const technicalTodosBeforeUpload = await selectContractSigningWorkbenchTodos(technicalOwner, db);
  assert.deepEqual(todoActionTexts(technicalTodosBeforeUpload), ['上传技术协议']);
  assert.equal(technicalTodosBeforeUpload[0].nodeKey, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION);
  assert.equal(
    technicalTodosBeforeUpload[0].targetRoute,
    '/projects/200?taskMode=contractSigning&focusNodeKey=contract_preparation'
  );
  assert.deepEqual(await selectContractSigningWorkbenchTodos(rdManager, db), []);
  assert.deepEqual(await selectContractSigningWorkbenchTodos(marketingManager, db), []);

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);

  assert.deepEqual(await selectContractSigningWorkbenchTodos(technicalOwner, db), []);
  const rdTodos = await selectContractSigningWorkbenchTodos(rdManager, db);
  assert.deepEqual(todoActionTexts(rdTodos), ['审批/退回技术协议']);
  assert.equal(rdTodos[0].status, CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW);

  const businessTodosBeforeSalesUpload = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(todoActionTexts(businessTodosBeforeSalesUpload), ['上传销售合同']);
  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    file: buildPdfFile('销售合同.pdf'),
    user: businessOwner
  }, db, storage);

  assert.deepEqual(await selectContractSigningWorkbenchTodos(businessOwner, db), []);
  const marketingTodos = await selectContractSigningWorkbenchTodos(marketingManager, db);
  assert.deepEqual(todoActionTexts(marketingTodos), ['审批/退回销售合同']);
  assert.equal(marketingTodos[0].nodeKey, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION);

  await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db);
  await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    user: marketingManager
  }, db);
  assert.deepEqual(await selectContractSigningWorkbenchTodos(rdManager, db), []);
  assert.deepEqual(await selectContractSigningWorkbenchTodos(marketingManager, db), []);
});

test('contract workbench todos cover business owner signing, payment, and kickoff actions', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  let businessTodos = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(todoActionTexts(businessTodos), ['上传销售合同']);

  await activateContractSigningNode({ db, storage });
  businessTodos = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(todoActionTexts(businessTodos), ['上传技术协议扫描件', '上传销售合同扫描件']);
  assert.equal(
    businessTodos.every((todo) => todo.nodeKey === CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING),
    true
  );

  await uploadSigningScans({ db, storage });
  businessTodos = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(
    todoActionTexts(businessTodos),
    ['确认技术协议扫描件线下签署结果', '确认销售合同扫描件线下签署结果']
  );

  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);
  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);

  businessTodos = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(todoActionTexts(businessTodos), ['处理项目预付款']);
  assert.equal(businessTodos[0].nodeKey, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT);

  await completeContractSigningAdvancePayment({
    projectId: 200,
    user: businessOwner
  }, db);

  businessTodos = await selectContractSigningWorkbenchTodos(businessOwner, db);
  assert.deepEqual(todoActionTexts(businessTodos), ['上传项目启动通知']);
  assert.equal(businessTodos[0].nodeKey, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE);
});

test('contract workbench todos cover general manager release only while waiting', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const generalManager = authUser(db.connection.users.get(30));

  await activateAdvancePaymentNode({ db, storage });
  assert.deepEqual(await selectContractSigningWorkbenchTodos(generalManager, db), []);

  await requestContractSigningPaymentRelease({
    projectId: 200,
    user: businessOwner
  }, db);

  const managerTodos = await selectContractSigningWorkbenchTodos(generalManager, db);
  assert.deepEqual(todoActionTexts(managerTodos), ['审批预付款放行']);
  assert.equal(managerTodos[0].status, CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER);
  assert.deepEqual(managerTodos[0].blockingReasons, ['等待总经理审批预付款放行']);

  await approveContractSigningPaymentRelease({
    projectId: 200,
    user: generalManager
  }, db);
  assert.deepEqual(await selectContractSigningWorkbenchTodos(generalManager, db), []);
});

test('contract workbench todos skip ended projects and getMyWorkbench summary counts contract type', async () => {
  const endedDb = fakeDb({ projectStatus: 'ended' });
  const technicalOwner = authUser(endedDb.connection.users.get(12));
  assert.deepEqual(await selectContractSigningWorkbenchTodos(technicalOwner, endedDb), []);

  const summary = buildWorkbenchSummary([
    { type: 'document_responsibility' },
    { type: 'contract_signing_workflow' }
  ]);
  assert.equal(summary.byType.contract_signing_workflow, 1);

  const db = fakeDb();
  const poolTechnicalOwner = authUser(db.connection.users.get(12));
  const workbench = await withFakePool(db, () => getMyWorkbench(poolTechnicalOwner));
  assert.equal(workbench.summary.byType.contract_signing_workflow, 1);
  assert.equal(workbench.items[0].type, 'contract_signing_workflow');
});

test('technical owner uploads technical agreement and enables RD manager review', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(20));

  const result = await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);

  assert.equal(result.slotKey, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
  assert.equal(result.file.originalFileName, '技术协议.pdf');
  assert.equal(storage.written.length, 1);
  assert.equal(
    findSlot(result.workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED
  );
  assert.equal(
    findSlot(result.workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).permissions.canUpload,
    false
  );
  assert.equal(
    findNode(result.workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canUploadTechnicalAgreement,
    false
  );
  assert.equal(
    findNode(result.workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW
  );

  const rdWorkflow = await getContractSigningWorkflow({ projectId: 200, user: rdManager }, db);
  assert.equal(
    findNode(rdWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canApproveTechnicalAgreement,
    true
  );
  assert.equal(
    findSlot(rdWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).permissions.canDownload,
    true
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_UPLOADED));
});

test('contract preparation reviewers can download current files but unrelated users cannot', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(20));
  const marketingManager = authUser(db.connection.users.get(21));
  const generalManager = authUser(db.connection.users.get(30));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);
  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    file: buildPdfFile('销售合同.pdf'),
    user: businessOwner
  }, db, storage);

  const technicalDownload = await getContractSigningUploadDownload({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db, storage);

  assert.equal(technicalDownload.filePath, storage.written[0].storageKey);
  assert.equal(technicalDownload.originalFileName, '技术协议.pdf');
  assert.equal(technicalDownload.mimeType, 'application/pdf');
  assert.equal(technicalDownload.revision, 1);

  const businessSalesDownload = await getContractSigningUploadDownload({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    user: businessOwner
  }, db, storage);
  const marketingSalesDownload = await getContractSigningUploadDownload({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    user: marketingManager
  }, db, storage);

  assert.equal(businessSalesDownload.filePath, storage.written[1].storageKey);
  assert.equal(marketingSalesDownload.originalFileName, '销售合同.pdf');

  await assert.rejects(
    () => getContractSigningUploadDownload({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
      user: generalManager
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );
  await assert.rejects(
    () => getContractSigningUploadDownload({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
      user: generalManager
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );
});

test('technical agreement approval alone does not activate contract signing node', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(20));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);
  const workflow = await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db);

  assert.equal(
    findSlot(workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );
  assert.equal(
    findSlot(workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_APPROVED));
});

test('both preparation lines approved completes preparation and activates contract signing', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(20));
  const marketingManager = authUser(db.connection.users.get(21));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);
  await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db);
  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    file: buildPdfFile('销售合同.pdf'),
    user: businessOwner
  }, db, storage);
  const workflow = await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT,
    user: marketingManager
  }, db);

  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_UPLOADED));
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_APPROVED));
});

test('preparation line return stays in preparation and allows reupload with new revision', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(20));

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议-v1.pdf'),
    user: technicalOwner
  }, db, storage);
  const returnedWorkflow = await returnContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    payload: { returnReason: '技术条款需修订' },
    user: rdManager
  }, db);

  assert.equal(
    findSlot(returnedWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.equal(
    findNode(returnedWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status,
    CONTRACT_SIGNING_NODE_STATUS.RETURNED
  );
  const technicalOwnerReturnedWorkflow = await getContractSigningWorkflow({ projectId: 200, user: technicalOwner }, db);
  assert.equal(
    findSlot(technicalOwnerReturnedWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).permissions.canUpload,
    true
  );
  assert.deepEqual(
    findNode(technicalOwnerReturnedWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).blockingReasons,
    ['等待技术负责人整改并重新上传技术协议', '等待商务负责人上传销售合同']
  );

  const reuploaded = await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议-v2.pdf'),
    user: technicalOwner
  }, db, storage);

  const slot = findSlot(reuploaded.workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT);
  assert.equal(slot.status, CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED);
  assert.equal(slot.revision, 2);
  assert.equal(slot.currentFile.originalFileName, '技术协议-v2.pdf');
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_RETURNED));
});

test('unauthorized users cannot upload or approve preparation files', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));

  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
      file: buildPdfFile('技术协议.pdf'),
      user: businessOwner
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议.pdf'),
    user: technicalOwner
  }, db, storage);

  await assert.rejects(
    () => approveContractSigningPreparationFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
      user: businessOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );
});

test('contract workflow resolves center manager and general manager permissions dynamically', async () => {
  const db = fakeDb();
  const rdManager = authUser(db.connection.users.get(20));
  const marketingManager = authUser(db.connection.users.get(21));
  const generalManager = authUser(db.connection.users.get(30));

  const rdWorkflow = await getContractSigningWorkflow({ projectId: 200, user: rdManager }, db);
  const marketingWorkflow = await getContractSigningWorkflow({ projectId: 200, user: marketingManager }, db);

  assert.equal(rdWorkflow.permissions.isRdCenterManager, true);
  assert.equal(
    findNode(rdWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canApproveTechnicalAgreement,
    false
  );
  assert.equal(marketingWorkflow.permissions.isMarketingCenterManager, true);
  assert.equal(
    findNode(marketingWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canApproveSalesContract,
    false
  );

  addCurrentContractFile(db.connection, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status =
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED;
  addCurrentContractFile(db.connection, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).status =
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.SUBMITTED;
  const rdReviewWorkflow = await getContractSigningWorkflow({ projectId: 200, user: rdManager }, db);
  const marketingReviewWorkflow = await getContractSigningWorkflow({ projectId: 200, user: marketingManager }, db);

  assert.equal(
    findNode(rdReviewWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canApproveTechnicalAgreement,
    true
  );
  assert.equal(
    findNode(marketingReviewWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).permissions.canApproveSalesContract,
    true
  );

  db.connection.contractPaymentFlows[0].status = CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER;
  const advancePaymentNode = db.connection.contractNodes.find(
    (node) => node.node_key === CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT
  );
  advancePaymentNode.status = CONTRACT_SIGNING_NODE_STATUS.PENDING;
  const pendingGeneralManagerWorkflow = await getContractSigningWorkflow({ projectId: 200, user: generalManager }, db);

  assert.equal(pendingGeneralManagerWorkflow.permissions.isGeneralManager, true);
  assert.equal(
    findNode(pendingGeneralManagerWorkflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canApprovePaymentRelease,
    false
  );

  advancePaymentNode.status = CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER;
  const waitingGeneralManagerWorkflow = await getContractSigningWorkflow({ projectId: 200, user: generalManager }, db);
  assert.equal(
    findNode(waitingGeneralManagerWorkflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canApprovePaymentRelease,
    true
  );
});

test('contract signing confirmation permissions require uploaded scan files', async () => {
  const db = fakeDb();
  const businessOwner = authUser(db.connection.users.get(13));

  await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);
  const signingNode = db.connection.contractNodes.find(
    (node) => node.node_key === CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING
  );
  signingNode.status = CONTRACT_SIGNING_NODE_STATUS.PENDING;

  const beforeUploadWorkflow = await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);
  assert.equal(
    findNode(beforeUploadWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmTechnicalAgreementSigning,
    false
  );
  assert.equal(
    findNode(beforeUploadWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmSalesContractSigning,
    false
  );

  addCurrentContractFile(db.connection, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).status =
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED;
  addCurrentContractFile(db.connection, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN).status =
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED;
  const afterUploadWorkflow = await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);

  assert.equal(
    findNode(afterUploadWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmTechnicalAgreementSigning,
    true
  );
  assert.equal(
    findNode(afterUploadWorkflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmSalesContractSigning,
    true
  );
});

test('business owner uploads signed scan files and can download them before confirmation', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  const technicalScanUpload = await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    file: buildPdfFile('技术协议扫描件.pdf'),
    user: businessOwner
  }, db, storage);
  const salesScanUpload = await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    file: buildPdfFile('销售合同扫描件.pdf'),
    user: businessOwner
  }, db, storage);

  assert.equal(
    findSlot(technicalScanUpload.workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.UPLOADED
  );
  assert.equal(
    findNode(salesScanUpload.workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmTechnicalAgreementSigning,
    true
  );
  assert.equal(
    findNode(salesScanUpload.workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING)
      .permissions.canConfirmSalesContractSigning,
    true
  );

  const download = await getContractSigningUploadDownload({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    user: businessOwner
  }, db, storage);

  assert.equal(download.originalFileName, '技术协议扫描件.pdf');
  assert.equal(
    findSlot(salesScanUpload.workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN).permissions.canUpload,
    false
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_UPLOADED));
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_UPLOADED));
});

test('technical agreement scan rejection only returns technical preparation line and can resume after reapproval', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(20));

  await activateContractSigningNode({ db, storage });
  await uploadSigningScans({ db, storage });
  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);
  const returned = await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'returned', returnReason: '客户未签署技术协议' },
    user: businessOwner
  }, db);

  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );
  assert.equal(
    findNode(returned, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.RETURNED
  );
  assert.deepEqual(
    findNode(returned, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).blockingReasons,
    ['等待技术协议准备线整改重提']
  );

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    file: buildPdfFile('技术协议-v2.pdf'),
    user: technicalOwner
  }, db, storage);
  const reapproved = await approveContractSigningPreparationFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT,
    user: rdManager
  }, db);

  assert.equal(
    findNode(reapproved, CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(
    findNode(reapproved, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );
  const businessWorkflow = await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);
  assert.equal(
    findSlot(businessWorkflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).permissions.canUpload,
    true
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_RETURNED));
});

test('sales contract scan rejection only returns sales preparation line', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  await uploadSigningScans({ db, storage });
  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);
  const returned = await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'returned', returnReason: '客户未签署销售合同' },
    user: businessOwner
  }, db);

  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.deepEqual(
    findNode(returned, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).blockingReasons,
    ['等待销售合同准备线整改重提']
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_RETURNED));
});

test('both scan rejections return both preparation lines', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  await uploadSigningScans({ db, storage });
  await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'returned', returnReason: '技术协议需重新签署' },
    user: businessOwner
  }, db);
  const returned = await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'returned', returnReason: '销售合同需重新签署' },
    user: businessOwner
  }, db);

  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.equal(
    findSlot(returned, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.RETURNED
  );
  assert.deepEqual(
    findNode(returned, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).blockingReasons,
    ['等待技术协议准备线整改重提', '等待销售合同准备线整改重提']
  );
});

test('both scan confirmations approved complete signing and activate advance payment', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  await uploadSigningScans({ db, storage });
  const firstApproved = await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);

  assert.equal(
    findNode(firstApproved, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(
    findNode(firstApproved, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).status,
    CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED
  );

  const workflow = await confirmContractSigningScanFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN,
    payload: { result: 'approved' },
    user: businessOwner
  }, db);

  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );
  assert.equal(workflow.paymentFlow.status, CONTRACT_SIGNING_PAYMENT_STATUS.PENDING);
  assert.equal(
    findSlot(workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN).permissions.canUpload,
    false
  );
  assert.equal(
    findSlot(workflow, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.SALES_CONTRACT_SCAN).permissions.canConfirmSigningResult,
    false
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_TECHNICAL_AGREEMENT_SCAN_CONFIRMED));
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_SALES_CONTRACT_SCAN_CONFIRMED));
});

test('business owner completes advance payment and activates kickoff notice', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateAdvancePaymentNode({ db, storage });
  const workflow = await completeContractSigningAdvancePayment({
    projectId: 200,
    user: businessOwner
  }, db);

  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );
  assert.equal(workflow.paymentFlow.status, CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED);
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canCompletePayment,
    false
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canRequestGeneralManagerRelease,
    false
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_COMPLETED));
});

test('manual contract advance is blocked after completed payment until kickoff notice is uploaded', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const generalManager = authUser(db.connection.users.get(30));

  markContractStageConditionalInvoiceNotApplicable(db.connection);
  await activateAdvancePaymentNode({ db, storage });
  await completeContractSigningAdvancePayment({
    projectId: 200,
    user: businessOwner
  }, db);

  await assertManualContractAdvanceBlockedByKickoffNotice(db, generalManager);
});

test('business owner can request general manager release and workflow waits for approval', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const generalManager = authUser(db.connection.users.get(30));
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAdvancePaymentNode({ db, storage });
  const workflow = await requestContractSigningPaymentRelease({
    projectId: 200,
    user: businessOwner
  }, db);

  const advancePaymentNode = findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT);
  assert.equal(advancePaymentNode.status, CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER);
  assert.equal(workflow.paymentFlow.status, CONTRACT_SIGNING_PAYMENT_STATUS.WAITING_GENERAL_MANAGER);
  assert.equal(workflow.paymentFlow.requestedBy.id, 13);
  assert.deepEqual(advancePaymentNode.blockingReasons, ['等待总经理审批预付款放行']);
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE).status,
    CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED
  );
  assert.equal(advancePaymentNode.permissions.canCompletePayment, false);
  assert.equal(advancePaymentNode.permissions.canRequestGeneralManagerRelease, false);

  const managerWorkflow = await getContractSigningWorkflow({
    projectId: 200,
    user: generalManager
  }, db);
  assert.equal(
    findNode(managerWorkflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canApprovePaymentRelease,
    true
  );

  await assert.rejects(
    () => approveContractSigningPaymentRelease({
      projectId: 200,
      user: technicalOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );
  assert.equal(
    db.connection.contractNodes.find((node) => node.node_key === CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).status,
    CONTRACT_SIGNING_NODE_STATUS.WAITING_GENERAL_MANAGER
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_REQUESTED));
});

test('general manager approves payment release and activates kickoff notice', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const generalManager = authUser(db.connection.users.get(30));

  await activateAdvancePaymentNode({ db, storage });
  await requestContractSigningPaymentRelease({
    projectId: 200,
    user: businessOwner
  }, db);
  const workflow = await approveContractSigningPaymentRelease({
    projectId: 200,
    user: generalManager
  }, db);

  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(workflow.paymentFlow.status, CONTRACT_SIGNING_PAYMENT_STATUS.RELEASED);
  assert.equal(workflow.paymentFlow.approvedBy.id, 30);
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );
  assert.equal(
    findNode(workflow, CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT).permissions.canApprovePaymentRelease,
    false
  );
  assert.ok(latestLog(db.connection, OPERATION_ACTION_TYPE.CONTRACT_SIGNING_ADVANCE_PAYMENT_RELEASE_APPROVED));
});

test('manual contract advance is blocked after general manager release until kickoff notice is uploaded', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const generalManager = authUser(db.connection.users.get(30));

  markContractStageConditionalInvoiceNotApplicable(db.connection);
  await activateAdvancePaymentNode({ db, storage });
  await requestContractSigningPaymentRelease({
    projectId: 200,
    user: businessOwner
  }, db);
  await approveContractSigningPaymentRelease({
    projectId: 200,
    user: generalManager
  }, db);

  await assertManualContractAdvanceBlockedByKickoffNotice(db, generalManager);
});

test('advance payment actions reject wrong actors, inactive nodes, ended projects, and duplicates', async () => {
  const inactiveDb = fakeDb();
  const businessOwner = authUser(inactiveDb.connection.users.get(13));
  const technicalOwner = authUser(inactiveDb.connection.users.get(12));
  const generalManager = authUser(inactiveDb.connection.users.get(30));

  await assert.rejects(
    () => completeContractSigningAdvancePayment({
      projectId: 200,
      user: businessOwner
    }, inactiveDb),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );
  await assert.rejects(
    () => requestContractSigningPaymentRelease({
      projectId: 200,
      user: businessOwner
    }, inactiveDb),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );
  await assert.rejects(
    () => approveContractSigningPaymentRelease({
      projectId: 200,
      user: generalManager
    }, inactiveDb),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );

  const db = fakeDb();
  const storage = fakeStorage();
  const dbBusinessOwner = authUser(db.connection.users.get(13));

  await activateAdvancePaymentNode({ db, storage });
  await assert.rejects(
    () => completeContractSigningAdvancePayment({
      projectId: 200,
      user: technicalOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );
  await assert.rejects(
    () => requestContractSigningPaymentRelease({
      projectId: 200,
      user: technicalOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );

  await completeContractSigningAdvancePayment({
    projectId: 200,
    user: dbBusinessOwner
  }, db);
  await assert.rejects(
    () => completeContractSigningAdvancePayment({
      projectId: 200,
      user: dbBusinessOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );
  await assert.rejects(
    () => requestContractSigningPaymentRelease({
      projectId: 200,
      user: dbBusinessOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );
  await assert.rejects(
    () => approveContractSigningPaymentRelease({
      projectId: 200,
      user: generalManager
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );
  assert.equal(db.connection.paymentFlowRow().status, CONTRACT_SIGNING_PAYMENT_STATUS.COMPLETED);
  assert.equal(
    db.connection.contractNodes.find((node) => node.node_key === CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE).status,
    CONTRACT_SIGNING_NODE_STATUS.PENDING
  );

  const endedDb = fakeDb({ projectStatus: 'ended' });
  await assert.rejects(
    () => completeContractSigningAdvancePayment({
      projectId: 200,
      user: businessOwner
    }, endedDb),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
  await assert.rejects(
    () => requestContractSigningPaymentRelease({
      projectId: 200,
      user: businessOwner
    }, endedDb),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
  await assert.rejects(
    () => approveContractSigningPaymentRelease({
      projectId: 200,
      user: generalManager
    }, endedDb),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
});

test('business owner uploads kickoff notice, completes contract stage, and auto advances to detailed design', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateProjectKickoffNoticeNode({ db, storage });
  const result = await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
    file: buildPdfFile('项目启动通知.pdf'),
    user: businessOwner
  }, db, storage);

  assert.equal(result.slotKey, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE);
  assert.equal(result.nodeKey, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE);
  assert.equal(result.stageAdvance.advanced, true);
  assert.equal(result.stageAdvance.advancedStage.stageKey, 'contract');
  assert.equal(result.stageAdvance.nextStage.stageKey, 'detailedDesign');
  assert.equal(result.workflow.currentStage.stageKey, 'detailedDesign');
  assert.equal(
    db.connection.stages.find((stage) => stage.stage_key === 'contract').stage_status,
    'completed'
  );
  assert.equal(
    db.connection.stages.find((stage) => stage.stage_key === 'detailedDesign').is_current,
    1
  );
  assert.equal(
    db.connection.contractNodes.find((node) => node.node_key === CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE).status,
    CONTRACT_SIGNING_NODE_STATUS.APPROVED
  );
  assert.equal(
    db.connection.contractUploadSlots.find(
      (slot) => slot.slot_key === CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE
    ).status,
    CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.APPROVED
  );

  const c25 = db.connection.projectStageDocuments.find((document) => document.document_code === '4.1');
  assert.equal(c25.document_name, '项目启动通知');
  const [c25WithDerived] = await attachSolutionDesignDerivedCompletionToStageDocumentRows(db.connection, [c25]);
  const c25Completion = deriveStageDocumentCompletion(c25WithDerived);
  assert.equal(c25Completion.isComplete, true);
  assert.equal(c25Completion.completionStatus, 'completed');
  assert.equal(c25WithDerived.contractSigningDerivedCompletion.source, 'contract_signing_workflow');

  assert.equal(SELF_DEVELOPED_PROJECT_STAGES.length, 8);
  assert.equal(db.connection.projectStageDocuments.length, 71);
  assert.equal(
    db.connection.projectStageDocuments.filter((document) => document.document_name === '项目启动通知').length,
    1
  );
  assert.equal(
    V20260629_WORKSPACE_BLUE_MODULES
      .filter((module) => module.stageOrder === 4)
      .some((module) => module.outputCodes.includes('C25')),
    false
  );

  const uploadLog = latestLog(
    db.connection,
    OPERATION_ACTION_TYPE.CONTRACT_SIGNING_PROJECT_KICKOFF_NOTICE_UPLOADED
  );
  assert.ok(uploadLog);
  assert.equal(JSON.parse(uploadLog.details_json).slotKey, CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE);
  const stageAdvanceLog = latestLog(db.connection, OPERATION_ACTION_TYPE.STAGE_ADVANCED);
  assert.ok(stageAdvanceLog);
  const stageAdvanceDetails = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(
    stageAdvanceDetails.triggerAction,
    OPERATION_ACTION_TYPE.CONTRACT_SIGNING_PROJECT_KICKOFF_NOTICE_UPLOADED
  );
  assert.equal(stageAdvanceDetails.nodeKey, CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE);
  assert.equal(stageAdvanceDetails.toStageKey, 'detailedDesign');
});

test('kickoff notice upload rejects non-business users, inactive nodes, ended projects, and repeats', async () => {
  const inactiveDb = fakeDb();
  const storage = fakeStorage();
  const businessOwner = authUser(inactiveDb.connection.users.get(13));
  const technicalOwner = authUser(inactiveDb.connection.users.get(12));

  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
      file: buildPdfFile('项目启动通知.pdf'),
      user: businessOwner
    }, inactiveDb, storage),
    (error) => error.code === 'CONTRACT_SIGNING_NODE_NOT_PROCESSABLE' && error.statusCode === 409
  );

  const db = fakeDb();
  await activateProjectKickoffNoticeNode({ db, storage });
  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
      file: buildPdfFile('项目启动通知.pdf'),
      user: technicalOwner
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
    file: buildPdfFile('项目启动通知.pdf'),
    user: businessOwner
  }, db, storage);
  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
      file: buildPdfFile('项目启动通知-重复.pdf'),
      user: businessOwner
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_NOT_IN_STAGE' && error.statusCode === 409
  );

  const endedDb = fakeDb({ projectStatus: 'ended' });
  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
      file: buildPdfFile('项目启动通知.pdf'),
      user: businessOwner
    }, endedDb, storage),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
});

test('contract derived completion feeds stage gate for workflow-owned documents', async () => {
  const db = fakeDb();
  const storage = fakeStorage();

  await activateProjectKickoffNoticeNode({ db, storage });
  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.PROJECT_KICKOFF_NOTICE,
    file: buildPdfFile('项目启动通知.pdf'),
    user: authUser(db.connection.users.get(13))
  }, db, storage);

  const workflowDocumentCodes = new Set(['C20', '3.1', 'C22', '3.2', '4.1']);
  const workflowRows = db.connection.projectStageDocuments.filter((document) =>
    workflowDocumentCodes.has(document.document_code)
  );
  const rowsWithDerived = await attachSolutionDesignDerivedCompletionToStageDocumentRows(db.connection, workflowRows);
  const gateDocuments = rowsWithDerived.map(mapGateDocument);

  assert.deepEqual(
    gateDocuments.map((document) => [document.documentCode, document.derivedCompletionSource, document.isComplete]),
    [
      ['C20', 'contract_signing_workflow', true],
      ['3.1', 'contract_signing_workflow', true],
      ['C22', 'contract_signing_workflow', true],
      ['3.2', 'contract_signing_workflow', true],
      ['4.1', 'contract_signing_workflow', true]
    ]
  );
});

test('non-business users and ended projects cannot upload or confirm scan files', async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));

  await activateContractSigningNode({ db, storage });
  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      file: buildPdfFile('技术协议扫描件.pdf'),
      user: technicalOwner
    }, db, storage),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );

  await uploadContractSigningWorkflowFile({
    projectId: 200,
    slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
    file: buildPdfFile('技术协议扫描件.pdf'),
    user: businessOwner
  }, db, storage);
  await assert.rejects(
    () => confirmContractSigningScanFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      payload: { result: 'approved' },
      user: technicalOwner
    }, db),
    (error) => error.code === 'CONTRACT_SIGNING_FORBIDDEN' && error.statusCode === 403
  );

  const endedDb = fakeDb({ projectStatus: 'ended' });
  await assert.rejects(
    () => uploadContractSigningWorkflowFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      file: buildPdfFile('技术协议扫描件.pdf'),
      user: businessOwner
    }, endedDb, storage),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
  await assert.rejects(
    () => confirmContractSigningScanFile({
      projectId: 200,
      slotKey: CONTRACT_SIGNING_UPLOAD_SLOT_KEY.TECHNICAL_AGREEMENT_SCAN,
      payload: { result: 'approved' },
      user: businessOwner
    }, endedDb),
    (error) => error.code === 'CONTRACT_SIGNING_PROJECT_ENDED'
  );
});

test('contract workflow query does not persist workflow before contract stage', async () => {
  const db = fakeDb({ currentStageOrder: 2 });
  const businessOwner = authUser(db.connection.users.get(13));

  const workflow = await getContractSigningWorkflow({ projectId: 200, user: businessOwner }, db);

  assert.equal(workflow.currentStage.stageKey, 'solution');
  assert.equal(workflow.nodes.length, 4);
  assert.equal(workflow.nodes.every((node) => node.status === CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED), true);
  assert.equal(db.connection.contractNodeInsertCount, 0);
  assert.equal(db.connection.contractUploadSlotInsertCount, 0);
  assert.equal(db.connection.contractPaymentFlowInsertCount, 0);
});

test('contract stage navigation uses workflow nodes and hides old blueprint nodes', () => {
  const navigation = buildProjectNavigationFromWorkspace(200, {
    project: {
      projectName: '合同 workflow 项目',
      projectCode: 'HT-200',
      projectMode: null,
      status: 'normal'
    },
    currentStage: {
      stageKey: 'contract',
      stageOrder: 3,
      stageName: '合同签订阶段'
    },
    stages: [
      {
        stageId: 2003,
        stageOrder: 3,
        stageKey: 'contract',
        stageName: '合同签订阶段',
        stageStatus: 'current',
        isCurrent: true,
        configured: true,
        supplementalDocuments: [
          {
            id: 2400,
            documentCode: 'C24',
            documentName: '发票（预付款）',
            isRequired: false
          }
        ],
        nodes: [
          {
            nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
            nodeName: '准备协议和合同',
            nodeStatus: CONTRACT_SIGNING_NODE_STATUS.PENDING,
            outputs: []
          },
          {
            nodeKey: CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
            nodeName: '签订协议和合同',
            nodeStatus: CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
            outputs: []
          },
          {
            nodeKey: CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
            nodeName: '项目预付款支付',
            nodeStatus: CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
            outputs: []
          },
          {
            nodeKey: CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE,
            nodeName: '项目启动通知',
            nodeStatus: CONTRACT_SIGNING_NODE_STATUS.NOT_STARTED,
            outputs: []
          }
        ]
      }
    ]
  });

  const contractStage = navigation.children.find((stage) => stage.stageKey === 'contract');
  const nodeKeys = contractStage.children.map((node) => node.nodeKey);

  assert.deepEqual(nodeKeys, [
    CONTRACT_SIGNING_NODE_KEY.CONTRACT_PREPARATION,
    CONTRACT_SIGNING_NODE_KEY.CONTRACT_SIGNING,
    CONTRACT_SIGNING_NODE_KEY.ADVANCE_PAYMENT,
    CONTRACT_SIGNING_NODE_KEY.PROJECT_KICKOFF_NOTICE
  ]);
  assert.equal(nodeKeys.includes('prepare_technical_agreement'), false);
  assert.equal(nodeKeys.includes('project_start_notice'), false);
  assert.equal(nodeKeys.includes('advance_payment_invoice'), false);
  assert.equal(contractStage.status, NAVIGATION_STATUS.PROCESSING);
});

test('contract stage supplemental documents keep C24 outside workflow node navigation', () => {
  const supplementalDocuments = buildContractSigningSupplementalDocuments([
    { documentCode: 'C20', documentName: '技术协议' },
    { documentCode: 'C21', documentName: '技术协议（客户侧成品）' },
    { documentCode: 'C22', documentName: '销售合同' },
    { documentCode: 'C23', documentName: '销售合同（客户侧成品）' },
    { documentCode: 'C24', documentName: '发票（预付款）' },
    { documentCode: 'C25', documentName: '项目启动通知' }
  ]);

  assert.deepEqual(
    supplementalDocuments.map((document) => document.documentCode),
    ['C24']
  );

  const supplementalDocumentsWithRuntimeCodes = buildContractSigningSupplementalDocuments([
    { documentCode: 'C20', documentName: '技术协议' },
    { documentCode: '3.1', documentName: '技术协议（客户侧成品）' },
    { documentCode: 'C22', documentName: '销售合同' },
    { documentCode: '3.2', documentName: '销售合同（客户侧成品）' },
    { documentCode: '3.4', documentName: '发票（预付款）' },
    { documentCode: '4.1', documentName: '项目启动通知' }
  ]);

  assert.deepEqual(
    supplementalDocumentsWithRuntimeCodes.map((document) => document.documentCode),
    ['3.4']
  );
});

test('contract workflow metadata keeps eight stages and seventy-one target documents', () => {
  const outputByCode = new Map(V20260629_TARGET_TEMPLATE_OUTPUTS.map((output) => [output.targetOutputCode, output]));

  assert.equal(SELF_DEVELOPED_PROJECT_STAGES.length, 8);
  assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
  assert.equal(V20260629_TARGET_TEMPLATE_OUTPUTS.length, 71);
  assert.equal(outputByCode.get('C20').documentName, '技术协议');
  assert.equal(outputByCode.get('C21').documentName, '技术协议（客户侧成品）');
  assert.equal(outputByCode.get('C22').documentName, '销售合同');
  assert.equal(outputByCode.get('C23').documentName, '销售合同（客户侧成品）');
  assert.equal(outputByCode.get('C24').documentName, '发票（预付款）');
  assert.equal(outputByCode.get('C24').stageOrder, 3);
  assert.equal(outputByCode.get('C25').documentName, '项目启动通知');
  assert.equal(
    [outputByCode.get('C20'), outputByCode.get('C22')]
      .some((output) => output.documentName.includes('草稿')),
    false
  );
});

test('contract signing write guard rejects ended projects', () => {
  assert.throws(
    () => assertContractSigningWriteAllowed({
      status: 'ended',
      current_stage_key: 'contract'
    }),
    {
      name: 'ContractSigningWorkflowError',
      code: 'CONTRACT_SIGNING_PROJECT_ENDED'
    }
  );
});
