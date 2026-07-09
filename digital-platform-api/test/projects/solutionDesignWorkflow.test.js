import assert from 'node:assert/strict';
import test from 'node:test';
import { DOCUMENT_STATUS_ACTION } from '../../src/domain/stageDocumentStatus.js';
import {
  COMPLETION_MODE,
  DOCUMENT_STATUS
} from '../../src/domain/stageDocumentTemplates.js';
import {
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS,
  SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION,
  SOLUTION_DESIGN_QUOTATION_RESULT,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS,
  SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE,
  SOLUTION_DESIGN_REVIEW_FORM_STATUS,
  SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS,
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  SOLUTION_DESIGN_UPLOAD_SLOT_KEY,
  SOLUTION_DESIGN_UPLOAD_SLOT_STATUS,
  isSolutionDesignGeneralManager,
  isSolutionDesignProjectRoleUser,
  isSolutionDesignDedicatedDocument
} from '../../src/domain/solutionDesignWorkflow.js';
import {
  assignSolutionDesignRoles,
  approveSolutionDesignWorkflowNode,
  buildSolutionDesignWorkbenchTodos,
  getSolutionDesignAnalysisGeneratedFileDownload,
  getSolutionDesignAnalysisForm,
  getSolutionDesignReviewGeneratedFileDownload,
  getSolutionDesignReviewForm,
  getSolutionDesignUploadDownload,
  getSolutionDesignWorkflow,
  listSolutionDesignUploads,
  processSolutionDesignQuotationResult,
  returnSolutionDesignWorkflowNode,
  saveSolutionDesignAnalysisForm,
  saveSolutionDesignReviewForm,
  selectSolutionDesignQuotationTenderBranch,
  submitSolutionDesignAnalysisForm,
  submitSolutionDesignQuotation,
  submitSolutionDesignReviewForm,
  submitSolutionDesignWorkflowNode,
  uploadSolutionDesignWorkflowFile
} from '../../src/repositories/projects/solutionDesignWorkflowRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../../src/repositories/operationLogRepository.js';
import { updateProjectStageDocumentStatus } from '../../src/repositories/stageDocuments/statusRepository.js';
import { readZipEntries } from '../../src/utils/ooxmlZip.js';

function dbUser({
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

function authUser(row, overrides = {}) {
  return {
    id: row.id,
    account: row.account,
    name: row.display_name,
    displayName: row.display_name,
    department: row.department,
    organizationRole: row.organization_role,
    role: row.role,
    isEnabled: Boolean(row.is_enabled),
    isPlatformAdmin: Boolean(row.is_platform_admin),
    ...overrides
  };
}

function baseUsers() {
  return new Map(
    [
      dbUser({
        id: 1,
        account: 'rd_manager',
        displayName: '研发中心负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      dbUser({
        id: 2,
        account: 'manufacturing_manager',
        displayName: '制造中心负责人',
        department: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      dbUser({
        id: 3,
        account: 'gm_assistant',
        displayName: '总经理助理',
        department: null,
        organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT
      }),
      dbUser({
        id: 4,
        account: 'system_admin',
        displayName: '系统管理员',
        department: null,
        organizationRole: ORGANIZATION_ROLE.SYSTEM_ADMIN,
        isPlatformAdmin: 1
      }),
      dbUser({
        id: 10,
        account: 'old_pm',
        displayName: '原项目经理',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 11,
        account: 'new_pm',
        displayName: '新项目经理',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 12,
        account: 'tech_owner',
        displayName: '技术负责人',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 13,
        account: 'business_owner',
        displayName: '商务负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 14,
        account: 'procurement_owner',
        displayName: '采购负责人',
        department: BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 15,
        account: 'finance_accountant',
        displayName: '财务会计',
        department: BUSINESS_DEPARTMENT.OPERATIONS_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 16,
        account: 'finance_owner',
        displayName: '财务负责人',
        department: BUSINESS_DEPARTMENT.OPERATIONS_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
      }),
      dbUser({
        id: 17,
        account: 'disabled_user',
        displayName: '禁用用户',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE,
        isEnabled: 0
      }),
      dbUser({
        id: 18,
        account: 'global_user',
        displayName: '全局角色用户',
        department: null,
        organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER
      }),
      dbUser({
        id: 19,
        account: 'wrong_finance',
        displayName: '非运营财务',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 20,
        account: 'wrong_business',
        displayName: '非营销商务',
        department: BUSINESS_DEPARTMENT.RD_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 21,
        account: 'wrong_technical',
        displayName: '非研发技术',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      }),
      dbUser({
        id: 30,
        account: 'general_manager',
        displayName: '总经理',
        department: null,
        organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER
      }),
      dbUser({
        id: 31,
        account: 'ops_employee',
        displayName: '非授权运营中心人员',
        department: BUSINESS_DEPARTMENT.OPERATIONS_CENTER,
        organizationRole: ORGANIZATION_ROLE.EMPLOYEE
      })
    ].map((row) => [row.id, row])
  );
}

function baseProject(overrides = {}) {
  return {
    id: 100,
    project_code: 'SD-TEST-001',
    project_name: '方案设计流程测试项目',
    customer_name: '测试客户公司',
    status: 'active',
    project_manager: '原项目经理',
    project_manager_user_id: 10,
    current_stage_id: 200,
    current_stage_order: 2,
    current_stage_key: 'solution',
    current_stage_name: '方案设计阶段',
    current_stage_status: 'in_progress',
    ...overrides
  };
}

function rolePayload(overrides = {}) {
  return {
    projectManagerUserId: 11,
    technicalOwnerUserId: 12,
    businessOwnerUserId: 13,
    procurementOwnerUserId: 14,
    financeAccountantUserId: 15,
    financeOwnerUserId: 16,
    ...overrides
  };
}

function seedAssignedRoles(connection, overrides = {}) {
  const payload = rolePayload(overrides);
  const projectManager = connection.users.get(Number(payload.projectManagerUserId));
  connection.project.project_manager_user_id = payload.projectManagerUserId;
  connection.project.project_manager = projectManager.display_name;
  connection.rolesRow = {
    id: 1,
    project_id: connection.project.id,
    technical_owner_user_id: payload.technicalOwnerUserId,
    business_owner_user_id: payload.businessOwnerUserId,
    procurement_owner_user_id: payload.procurementOwnerUserId,
    finance_accountant_user_id: payload.financeAccountantUserId,
    finance_owner_user_id: payload.financeOwnerUserId,
    assigned_by_user_id: 1,
    assigned_at: '2026-07-08 10:00:00',
    updated_by_user_id: 1,
    updated_at: '2026-07-08 10:00:00'
  };
}

function testUploadFile(name = '方案设计文件.docx') {
  const buffer = Buffer.from(`content:${name}`);
  return {
    originalFileName: name,
    mimeType: 'application/octet-stream',
    buffer,
    size: buffer.length,
    tooLarge: false
  };
}

function fakeUploadStorage() {
  const written = [];
  const cleaned = [];

  return {
    written,
    cleaned,
    createStorageKey({ projectId, slotKey }) {
      return `${projectId}/${slotKey}/${written.length + 1}`;
    },
    async writeFile(storageKey, buffer) {
      written.push({ storageKey, size: buffer.length });
      return {
        filePath: storageKey,
        size: buffer.length
      };
    },
    async assertFileReadable(storageKey) {
      return storageKey;
    },
    async cleanupFile(storageKey) {
      cleaned.push(storageKey);
    }
  };
}

function fakeGeneratedFileStorage({ failWrite = false } = {}) {
  const written = [];
  const cleaned = [];
  const files = new Map();

  return {
    written,
    cleaned,
    files,
    createStorageKey({ projectId, documentCode, revision }) {
      return `${projectId}/generated/${documentCode}/v${revision}-${written.length + cleaned.length + 1}.xlsx`;
    },
    async writeFile(storageKey, buffer) {
      if (failWrite) {
        files.set(storageKey, { size: buffer.length, buffer: Buffer.from(buffer) });
        const error = new Error('fake generated file write failed');
        error.code = 'FAKE_GENERATED_FILE_WRITE_FAILED';
        throw error;
      }

      const storedBuffer = Buffer.from(buffer);
      written.push({ storageKey, size: buffer.length, buffer: storedBuffer });
      files.set(storageKey, { size: buffer.length, buffer: storedBuffer });
      return {
        filePath: storageKey,
        size: buffer.length
      };
    },
    async assertFileReadable(storageKey) {
      if (!files.has(storageKey)) {
        throw new Error('Generated file missing');
      }
      return storageKey;
    },
    async cleanupFile(storageKey) {
      cleaned.push(storageKey);
      files.delete(storageKey);
    }
  };
}

function setNodeStatus(connection, nodeKey, status) {
  const node = connection.nodes.find((candidate) => candidate.node_key === nodeKey);
  assert.ok(node, `Expected node ${nodeKey} to exist`);
  node.status = status;
}

function findUploadSlot(uploads, slotKey) {
  const slot = uploads.slots.find((candidate) => candidate.slotKey === slotKey);
  assert.ok(slot, `Expected upload slot ${slotKey}`);
  return slot;
}

function findWorkflowNode(workflow, nodeKey) {
  const node = workflow.nodes.find((candidate) => candidate.nodeKey === nodeKey);
  assert.ok(node, `Expected workflow node ${nodeKey}`);
  return node;
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

function generatedFileBuffer(storage, storageKey) {
  const stored = storage.files.get(storageKey);
  assert.ok(stored, `Expected generated storage key ${storageKey}`);
  assert.ok(Buffer.isBuffer(stored.buffer), `Expected generated buffer for ${storageKey}`);
  return stored.buffer;
}

function assertGeneratedXlsxCellIncludes(storage, storageKey, cellRef, expected) {
  const value = extractXlsxCellText(generatedFileBuffer(storage, storageKey), cellRef);
  assert.match(value, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

function assertGeneratedXlsxCellEquals(storage, storageKey, cellRef, expected) {
  const value = extractXlsxCellText(generatedFileBuffer(storage, storageKey), cellRef);
  assert.equal(value, expected, `Expected generated xlsx ${cellRef}`);
}

function assertGeneratedXlsxCellNotIncludes(storage, storageKey, cellRef, unexpected) {
  const value = extractXlsxCellText(generatedFileBuffer(storage, storageKey), cellRef);
  assert.equal(value.includes(unexpected), false, `${cellRef} should not include ${unexpected}`);
}

function analysisFormPayload(overrides = {}) {
  return {
    formData: {
      customerRequirements: '客户希望建设自动化产线',
      solutionScope: '覆盖上料、装配、检测和数据采集',
      technicalRisks: '节拍和视觉检测稳定性需验证',
      ...overrides
    }
  };
}

function reviewFormPayload(overrides = {}) {
  return {
    formData: {
      meetingDate: '2026-07-08',
      projectTargetDescription: ['项目目标描述默认第一行'],
      technicalRisks: ['项目风险评估默认第一行'],
      solutionSuggestions: ['项目方案建议默认第一行'],
      actionItems: ['按评审意见完善方案'],
      reviewConclusion: '评审通过，进入下一节点',
      ...overrides
    }
  };
}

async function activateAnalysisNode(db, storage = fakeUploadStorage()) {
  const projectManager = authUser(db.connection.users.get(11));

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划.docx'),
      user: projectManager
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
      user: projectManager
    },
    db
  );

  return storage;
}

async function submitAnalysisNodeForReview(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateAnalysisNode(db, storage);
  await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload(),
      user: technicalOwner
    },
    db
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwner
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      user: technicalOwner
    },
    db
  );
}

async function activateSolutionDesignNode(db, storage = fakeUploadStorage()) {
  const rdManager = authUser(db.connection.users.get(1));
  await submitAnalysisNodeForReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      user: rdManager
    },
    db
  );
  return storage;
}

async function submitSolutionDesignOutputs(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateSolutionDesignNode(db, storage);
  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS) {
    await uploadSolutionDesignWorkflowFile(
      {
        projectId: 100,
        slotKey,
        file: testUploadFile(`${slotKey}.dat`),
        user: technicalOwner
      },
      db,
      storage
    );
  }
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );
}

async function submitReviewNodeForReview(db, nodeKey, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  if (nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW) {
    await submitSolutionDesignOutputs(db, storage);
  }

  await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey,
      user: technicalOwner
    },
    db
  );
}

async function activateCustomerReviewNode(db, storage = fakeUploadStorage()) {
  const rdManager = authUser(db.connection.users.get(1));
  await submitReviewNodeForReview(db, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: rdManager
    },
    db
  );
  return storage;
}

async function activateRdCostNode(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));
  await activateCustomerReviewNode(db, storage);
  await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: technicalOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: rdManager
    },
    db
  );
  return storage;
}

async function submitRdCostForReview(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateRdCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      file: testUploadFile('研发中心成本估算表.xlsx'),
      user: technicalOwner
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: technicalOwner
    },
    db
  );
}

async function activateManufacturingCostNode(db, storage = fakeUploadStorage()) {
  const rdManager = authUser(db.connection.users.get(1));
  await submitRdCostForReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: rdManager
    },
    db
  );
  return storage;
}

async function submitManufacturingCostForReview(db, storage = fakeUploadStorage()) {
  const procurementOwner = authUser(db.connection.users.get(14));
  await activateManufacturingCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
      file: testUploadFile('制造中心成本估算表.xlsx'),
      user: procurementOwner
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: procurementOwner
    },
    db
  );
}

async function activateFinanceCostNode(db, storage = fakeUploadStorage()) {
  const manufacturingManager = authUser(db.connection.users.get(2));
  await submitManufacturingCostForReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: manufacturingManager
    },
    db
  );
  return storage;
}

async function submitFinanceCostForFinanceReview(db, storage = fakeUploadStorage()) {
  const financeAccountant = authUser(db.connection.users.get(15));
  await activateFinanceCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
      file: testUploadFile('运营中心财务成本估算表.xlsx'),
      user: financeAccountant
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeAccountant
    },
    db
  );
}

async function submitFinanceCostForGeneralReview(db, storage = fakeUploadStorage()) {
  const financeOwner = authUser(db.connection.users.get(16));
  await submitFinanceCostForFinanceReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeOwner
    },
    db
  );
  return storage;
}

async function activateQuotationOrTenderNode(db, storage = fakeUploadStorage()) {
  const generalManager = authUser(db.connection.users.get(30));
  await submitFinanceCostForGeneralReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: generalManager
    },
    db
  );
  return storage;
}

async function selectQuotationBranch(db) {
  const generalManager = authUser(db.connection.users.get(30));
  return selectSolutionDesignQuotationTenderBranch(
    {
      projectId: 100,
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    db
  );
}

async function selectTenderBranch(db) {
  const generalManager = authUser(db.connection.users.get(30));
  return selectSolutionDesignQuotationTenderBranch(
    {
      projectId: 100,
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER },
      user: generalManager
    },
    db
  );
}

async function submitQuotation(db, storage = fakeUploadStorage()) {
  const businessOwner = authUser(db.connection.users.get(13));
  await activateQuotationOrTenderNode(db, storage);
  await selectQuotationBranch(db);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
      file: testUploadFile('报价单.xlsx'),
      user: businessOwner
    },
    db,
    storage
  );
  return submitSolutionDesignQuotation(
    {
      projectId: 100,
      user: businessOwner
    },
    db
  );
}

async function submitTenderForReview(db, storage = fakeUploadStorage()) {
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateQuotationOrTenderNode(db, storage);
  await selectTenderBranch(db);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
      file: testUploadFile('投标商务标.docx'),
      user: businessOwner
    },
    db,
    storage
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
      file: testUploadFile('投标技术标.docx'),
      user: technicalOwner
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: businessOwner
    },
    db
  );
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function fakeDedicatedStageDocumentStatusConnection({ documentCode = 'C15', status = DOCUMENT_STATUS.SUBMITTED } = {}) {
  const project = {
    id: 100,
    project_manager_user_id: 11,
    business_responsible_user_id: null,
    technical_responsible_user_id: null,
    created_by_user_id: 1,
    participating_departments: JSON.stringify([
      BUSINESS_DEPARTMENT.RD_CENTER,
      BUSINESS_DEPARTMENT.MARKETING_CENTER,
      BUSINESS_DEPARTMENT.MANUFACTURING_CENTER,
      BUSINESS_DEPARTMENT.OPERATIONS_CENTER
    ]),
    status: 'active',
    ended_reason: null,
    ended_by_user_id: null,
    ended_at: null,
    has_department_responsible: 1
  };
  const document = {
    id: 400,
    project_id: 100,
    document_code: documentCode,
    document_name: `${documentCode} 方案设计专用资料`,
    status,
    completion_mode: COMPLETION_MODE.APPROVAL_REQUIRED,
    responsible_user_id: 12,
    owner_department: BUSINESS_DEPARTMENT.RD_CENTER,
    review_department: BUSINESS_DEPARTMENT.RD_CENTER,
    is_applicable: 1,
    revision_required: 0,
    revision_resubmitted_at: null,
    responsible_account: 'tech_owner',
    responsible_display_name: '技术负责人',
    responsible_department: BUSINESS_DEPARTMENT.RD_CENTER,
    responsible_organization_role: ORGANIZATION_ROLE.EMPLOYEE,
    responsible_role: '员工',
    responsible_is_enabled: 1,
    responsible_file_platform_user_id: null
  };

  return {
    operationLogs: [],
    async execute(sql) {
      const text = normalizeSql(sql);

      if (text.includes('FROM project_stage_documents d') && text.includes('FOR UPDATE')) {
        return [[document]];
      }

      if (text.startsWith('SELECT id,') && text.includes('FROM projects')) {
        return [[project]];
      }

      if (text.startsWith('SELECT p.id,') && text.includes('FROM projects p')) {
        return [[project]];
      }

      throw new Error(`Unexpected dedicated status smoke SQL: ${text}`);
    }
  };
}

class SolutionDesignWorkflowFakeConnection {
  constructor({ project = baseProject(), users = baseUsers(), visible = true } = {}) {
    this.project = { ...project };
    this.users = users;
    this.visible = visible;
    this.rolesRow = null;
    this.nodes = [];
    this.uploadSlots = [];
    this.uploadFiles = [];
    this.analysisForms = [];
    this.reviewForms = [];
    this.quotationTenderFlow = null;
    this.roleHistory = [];
    this.operationLogs = [];
    this.nodeInsertCount = 0;
    this.uploadSlotInsertCount = 0;
    this.nextUploadFileId = 1;
    this.nextAnalysisFormId = 1;
    this.nextReviewFormId = 1;
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

  projectManagerRow() {
    return this.users.get(Number(this.project.project_manager_user_id)) || null;
  }

  projectContextRow() {
    const manager = this.projectManagerRow();
    return {
      ...this.project,
      project_manager_account: manager?.account ?? null,
      project_manager_display_name: manager?.display_name ?? null,
      project_manager_department: manager?.department ?? null,
      project_manager_organization_role: manager?.organization_role ?? null,
      project_manager_role: manager?.role ?? null,
      project_manager_is_enabled: manager?.is_enabled ?? null,
      project_manager_is_platform_admin: manager?.is_platform_admin ?? null,
      project_manager_file_platform_user_id: manager?.file_platform_user_id ?? null
    };
  }

  currentUploadFileForSlot(slotKey) {
    return this.uploadFiles.find((file) => file.slot_key === slotKey && file.is_current === 1) || null;
  }

  currentAnalysisForm() {
    return this.analysisForms.find((form) => form.is_current === 1) || null;
  }

  currentReviewForm(nodeKey) {
    return this.reviewForms.find((form) => form.node_key === nodeKey && form.is_current === 1) || null;
  }

  currentReviewForms() {
    return this.reviewForms
      .filter((form) => form.is_current === 1)
      .sort((left, right) => left.node_key.localeCompare(right.node_key));
  }

  analysisFormRowWithUsers(form) {
    if (!form) {
      return null;
    }

    const submitter = form.submitted_by_user_id ? this.users.get(Number(form.submitted_by_user_id)) : null;
    const creator = this.users.get(Number(form.created_by_user_id)) || null;
    const updater = this.users.get(Number(form.updated_by_user_id)) || null;
    return {
      ...form,
      submitted_by_account: submitter?.account ?? null,
      submitted_by_display_name: submitter?.display_name ?? null,
      created_by_account: creator?.account ?? null,
      created_by_display_name: creator?.display_name ?? null,
      updated_by_account: updater?.account ?? null,
      updated_by_display_name: updater?.display_name ?? null
    };
  }

  reviewFormRowWithUsers(form) {
    if (!form) {
      return null;
    }

    const submitter = form.submitted_by_user_id ? this.users.get(Number(form.submitted_by_user_id)) : null;
    const creator = this.users.get(Number(form.created_by_user_id)) || null;
    const updater = this.users.get(Number(form.updated_by_user_id)) || null;
    return {
      ...form,
      submitted_by_account: submitter?.account ?? null,
      submitted_by_display_name: submitter?.display_name ?? null,
      created_by_account: creator?.account ?? null,
      created_by_display_name: creator?.display_name ?? null,
      updated_by_account: updater?.account ?? null,
      updated_by_display_name: updater?.display_name ?? null
    };
  }

  uploadSlotRowsWithCurrentFiles() {
    return [...this.uploadSlots]
      .sort((left, right) => left.slot_order - right.slot_order)
      .map((slot) => {
        const currentFile = this.currentUploadFileForSlot(slot.slot_key);
        const uploader = currentFile ? this.users.get(Number(currentFile.uploaded_by_user_id)) : null;

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
          current_file_uploaded_by_display_name: uploader?.display_name ?? null
        };
      });
  }

  async execute(sql, params = []) {
    const text = normalizeSql(sql);

    if (text.startsWith('SELECT p.id,') && text.includes('LEFT JOIN users pm')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id FROM projects p WHERE p.id = ?')) {
      return [this.visible ? [{ id: params[0] }] : []];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_roles')) {
      return [this.rolesRow ? [{ ...this.rolesRow }] : []];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_quotation_tender_flows')) {
      return [this.quotationTenderFlow ? [{ ...this.quotationTenderFlow }] : []];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_nodes') && text.includes('AND node_key = ?')) {
      const [projectId, nodeKey] = params;
      return [
        this.nodes
          .filter((node) => node.project_id === projectId && node.node_key === nodeKey)
          .map((node) => ({ ...node }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_nodes')) {
      return [[...this.nodes].sort((left, right) => left.node_order - right.node_order)];
    }

    if (text.startsWith('INSERT IGNORE INTO project_solution_design_nodes')) {
      const [projectId, nodeKey, nodeName, nodeOrder, status] = params;
      if (this.nodes.some((node) => node.project_id === projectId && node.node_key === nodeKey)) {
        return [{ affectedRows: 0 }];
      }

      this.nodes.push({
        id: this.nodes.length + 1,
        project_id: projectId,
        node_key: nodeKey,
        node_name: nodeName,
        node_order: nodeOrder,
        status,
        return_reason: null,
        current_revision: 1,
        activated_at: text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:00:00' : null,
        submitted_at: null,
        approved_at: null,
        returned_at: null,
        created_at: '2026-07-08 10:00:00',
        updated_at: '2026-07-08 10:00:00'
      });
      this.nodeInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT s.*, f.id AS current_file_id')) {
      return [this.uploadSlotRowsWithCurrentFiles()];
    }

    if (
      text.startsWith('SELECT f.*, submitter.account AS submitted_by_account') &&
      text.includes('FROM project_solution_design_review_forms')
    ) {
      if (text.includes('AND f.node_key = ?')) {
        const [, nodeKey] = params;
        const currentForm = this.currentReviewForm(nodeKey);
        return [currentForm ? [this.reviewFormRowWithUsers(currentForm)] : []];
      }

      return [this.currentReviewForms().map((form) => this.reviewFormRowWithUsers(form))];
    }

    if (text.startsWith('SELECT f.*, submitter.account AS submitted_by_account')) {
      const currentForm = this.currentAnalysisForm();
      return [currentForm ? [this.analysisFormRowWithUsers(currentForm)] : []];
    }

    if (
      text.startsWith('SELECT COALESCE(MAX(revision), 0) AS max_revision') &&
      text.includes('FROM project_solution_design_review_forms')
    ) {
      const [projectId, nodeKey] = params;
      const maxRevision = this.reviewForms
        .filter((form) => form.project_id === projectId && form.node_key === nodeKey)
        .reduce((max, form) => Math.max(max, Number(form.revision ?? 0)), 0);
      return [[{ max_revision: maxRevision }]];
    }

    if (text.startsWith('SELECT COALESCE(MAX(revision), 0) AS max_revision')) {
      const [projectId] = params;
      const maxRevision = this.analysisForms
        .filter((form) => form.project_id === projectId)
        .reduce((max, form) => Math.max(max, Number(form.revision ?? 0)), 0);
      return [[{ max_revision: maxRevision }]];
    }

    if (text.startsWith('INSERT IGNORE INTO project_solution_design_upload_slots')) {
      const [projectId, nodeKey, slotKey, slotName, slotOrder, status] = params;
      if (this.uploadSlots.some((slot) => slot.project_id === projectId && slot.slot_key === slotKey)) {
        return [{ affectedRows: 0 }];
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
        submitted_by_user_id: null,
        submitted_at: null,
        created_at: '2026-07-08 10:00:00',
        updated_at: '2026-07-08 10:00:00'
      });
      this.uploadSlotInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_upload_slots')) {
      const [projectId, slotKey] = params;
      return [
        this.uploadSlots
          .filter((slot) => slot.project_id === projectId && slot.slot_key === slotKey)
          .map((slot) => ({ ...slot }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_upload_files')) {
      const [projectId, ...slotKeys] = params;
      return [
        this.uploadFiles
          .filter(
            (file) =>
              file.project_id === projectId &&
              slotKeys.includes(file.slot_key) &&
              file.is_current === 1
          )
          .map((file) => ({ ...file }))
      ];
    }

    if (text.startsWith('SELECT f.*, s.node_key AS slot_node_key')) {
      const [projectId, slotKey] = params;
      const file = this.uploadFiles.find(
        (candidate) =>
          candidate.project_id === projectId &&
          candidate.slot_key === slotKey &&
          candidate.is_current === 1
      );
      if (!file) {
        return [[]];
      }

      const slot = this.uploadSlots.find((candidate) => candidate.id === file.slot_id);
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

    if (text.startsWith('UPDATE project_solution_design_upload_files')) {
      const [projectId, slotKey] = params;
      for (const file of this.uploadFiles) {
        if (file.project_id === projectId && file.slot_key === slotKey && file.is_current === 1) {
          file.is_current = 0;
          file.replaced_at = '2026-07-08 10:10:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_upload_files')) {
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
      const file = {
        id: this.nextUploadFileId++,
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
        uploaded_at: '2026-07-08 10:10:00',
        replaced_at: null
      };
      this.uploadFiles.push(file);
      return [{ affectedRows: 1, insertId: file.id }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_upload_slots') &&
      text.includes('submitted_by_user_id')
    ) {
      const [status, submittedByUserId, projectId, nodeOrSlotKey] = params;
      const matchesSlotKey = text.includes('AND slot_key = ?');
      for (const slot of this.uploadSlots) {
        const matchesTarget = matchesSlotKey
          ? slot.slot_key === nodeOrSlotKey
          : slot.node_key === nodeOrSlotKey;
        if (slot.project_id === projectId && matchesTarget) {
          slot.status = status;
          slot.submitted_by_user_id = submittedByUserId;
          slot.submitted_at = '2026-07-08 10:20:00';
          slot.updated_at = '2026-07-08 10:20:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_upload_slots') &&
      text.includes('revision = ?')
    ) {
      const [status, revision, slotId] = params;
      const slot = this.uploadSlots.find((candidate) => candidate.id === slotId);
      if (slot) {
        slot.status = status;
        slot.revision = revision;
        slot.updated_at = '2026-07-08 10:10:00';
      }
      return [{ affectedRows: slot ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_solution_design_upload_slots')) {
      const [status, slotId] = params;
      const slot = this.uploadSlots.find((candidate) => candidate.id === slotId);
      if (slot) {
        slot.status = status;
        slot.updated_at = '2026-07-08 10:10:00';
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT f.*, u.account AS uploaded_by_account')) {
      const [fileId] = params;
      const file = this.uploadFiles.find((candidate) => candidate.id === fileId);
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

    if (text.startsWith('UPDATE project_solution_design_analysis_forms SET is_current = 0')) {
      const [projectId] = params;
      for (const form of this.analysisForms) {
        if (form.project_id === projectId && form.is_current === 1) {
          form.is_current = 0;
          form.updated_at = '2026-07-08 10:30:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_analysis_forms')) {
      const [
        projectId,
        revision,
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateName,
        generatedByUserId,
        generationErrorMessage,
        createdByUserId,
        updatedByUserId
      ] = params;
      const form = {
        id: this.nextAnalysisFormId++,
        project_id: projectId,
        node_key: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
        revision,
        form_status: formStatus,
        form_data_json: formDataJson,
        is_current: 1,
        submitted_by_user_id: submittedByUserId,
        submitted_at: text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:30:00' : null,
        generated_file_status: generatedFileStatus,
        generated_file_storage_key: null,
        generated_file_name: null,
        generated_file_mime_type: null,
        generated_file_size: null,
        generated_file_template_name: generatedFileTemplateName,
        generated_at: null,
        generated_by_user_id: generatedByUserId,
        generation_error_message: generationErrorMessage,
        created_by_user_id: createdByUserId,
        updated_by_user_id: updatedByUserId,
        created_at: '2026-07-08 10:30:00',
        updated_at: '2026-07-08 10:30:00'
      };
      this.analysisForms.push(form);
      return [{ affectedRows: 1, insertId: form.id }];
    }

    if (text.startsWith('UPDATE project_solution_design_analysis_forms SET form_status = ?')) {
      const [
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateName,
        generatedByUserId,
        generationErrorMessage,
        updatedByUserId,
        formId
      ] = params;
      const form = this.analysisForms.find((candidate) => candidate.id === formId);
      if (form) {
        form.form_status = formStatus;
        form.form_data_json = formDataJson;
        form.submitted_by_user_id = submittedByUserId;
        form.submitted_at = text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:30:00' : null;
        form.generated_file_status = generatedFileStatus;
        form.generated_file_storage_key = null;
        form.generated_file_name = null;
        form.generated_file_mime_type = null;
        form.generated_file_size = null;
        form.generated_file_template_name = generatedFileTemplateName;
        form.generated_at = null;
        form.generated_by_user_id = generatedByUserId;
        form.generation_error_message = generationErrorMessage;
        form.updated_by_user_id = updatedByUserId;
        form.updated_at = '2026-07-08 10:30:00';
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_solution_design_analysis_forms SET generated_file_status = ?')) {
      const isGenerated = text.includes('generated_file_storage_key = ?');
      const [
        generatedFileStatus,
        storageKeyOrTemplateName,
        fileNameOrGeneratedByUserId,
        mimeTypeOrErrorMessage,
        fileSizeOrUpdatedByUserId,
        templateNameOrFormId,
        generatedByUserId,
        updatedByUserId,
        formId
      ] = params;
      const resolvedFormId = isGenerated ? formId : templateNameOrFormId;
      const form = this.analysisForms.find((candidate) => candidate.id === resolvedFormId);
      if (form) {
        if (isGenerated) {
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = storageKeyOrTemplateName;
          form.generated_file_name = fileNameOrGeneratedByUserId;
          form.generated_file_mime_type = mimeTypeOrErrorMessage;
          form.generated_file_size = fileSizeOrUpdatedByUserId;
          form.generated_file_template_name = templateNameOrFormId;
          form.generated_at = '2026-07-08 10:31:00';
          form.generated_by_user_id = generatedByUserId;
          form.generation_error_message = null;
          form.updated_by_user_id = updatedByUserId;
        } else {
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = null;
          form.generated_file_name = null;
          form.generated_file_mime_type = null;
          form.generated_file_size = null;
          form.generated_file_template_name = storageKeyOrTemplateName;
          form.generated_at = '2026-07-08 10:31:00';
          form.generated_by_user_id = fileNameOrGeneratedByUserId;
          form.generation_error_message = mimeTypeOrErrorMessage;
          form.updated_by_user_id = fileSizeOrUpdatedByUserId;
        }
        form.updated_at = '2026-07-08 10:31:00';
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_solution_design_review_forms SET is_current = 0')) {
      const [projectId, nodeKey] = params;
      for (const form of this.reviewForms) {
        if (form.project_id === projectId && form.node_key === nodeKey && form.is_current === 1) {
          form.is_current = 0;
          form.updated_at = '2026-07-08 10:35:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_review_forms')) {
      const [
        projectId,
        nodeKey,
        reviewType,
        revision,
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateName,
        generatedByUserId,
        generationErrorMessage,
        createdByUserId,
        updatedByUserId
      ] = params;
      const form = {
        id: this.nextReviewFormId++,
        project_id: projectId,
        node_key: nodeKey,
        review_type: reviewType,
        revision,
        form_status: formStatus,
        form_data_json: formDataJson,
        is_current: 1,
        submitted_by_user_id: submittedByUserId,
        submitted_at: text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:35:00' : null,
        generated_file_status: generatedFileStatus,
        generated_file_storage_key: null,
        generated_file_name: null,
        generated_file_mime_type: null,
        generated_file_size: null,
        generated_file_template_name: generatedFileTemplateName,
        generated_at: null,
        generated_by_user_id: generatedByUserId,
        generation_error_message: generationErrorMessage,
        created_by_user_id: createdByUserId,
        updated_by_user_id: updatedByUserId,
        created_at: '2026-07-08 10:35:00',
        updated_at: '2026-07-08 10:35:00'
      };
      this.reviewForms.push(form);
      return [{ affectedRows: 1, insertId: form.id }];
    }

    if (text.startsWith('UPDATE project_solution_design_review_forms SET form_status = ?')) {
      const [
        formStatus,
        formDataJson,
        submittedByUserId,
        generatedFileStatus,
        generatedFileTemplateName,
        generatedByUserId,
        generationErrorMessage,
        updatedByUserId,
        formId
      ] = params;
      const form = this.reviewForms.find((candidate) => candidate.id === formId);
      if (form) {
        form.form_status = formStatus;
        form.form_data_json = formDataJson;
        form.submitted_by_user_id = submittedByUserId;
        form.submitted_at = text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:35:00' : null;
        form.generated_file_status = generatedFileStatus;
        form.generated_file_storage_key = null;
        form.generated_file_name = null;
        form.generated_file_mime_type = null;
        form.generated_file_size = null;
        form.generated_file_template_name = generatedFileTemplateName;
        form.generated_at = null;
        form.generated_by_user_id = generatedByUserId;
        form.generation_error_message = generationErrorMessage;
        form.updated_by_user_id = updatedByUserId;
        form.updated_at = '2026-07-08 10:35:00';
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_solution_design_review_forms SET generated_file_status = ?')) {
      const isGenerated = text.includes('generated_file_storage_key = ?');
      const [
        generatedFileStatus,
        storageKeyOrTemplateName,
        fileNameOrGeneratedByUserId,
        mimeTypeOrErrorMessage,
        fileSizeOrUpdatedByUserId,
        templateNameOrFormId,
        generatedByUserId,
        updatedByUserId,
        formId
      ] = params;
      const resolvedFormId = isGenerated ? formId : templateNameOrFormId;
      const form = this.reviewForms.find((candidate) => candidate.id === resolvedFormId);
      if (form) {
        if (isGenerated) {
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = storageKeyOrTemplateName;
          form.generated_file_name = fileNameOrGeneratedByUserId;
          form.generated_file_mime_type = mimeTypeOrErrorMessage;
          form.generated_file_size = fileSizeOrUpdatedByUserId;
          form.generated_file_template_name = templateNameOrFormId;
          form.generated_at = '2026-07-08 10:36:00';
          form.generated_by_user_id = generatedByUserId;
          form.generation_error_message = null;
          form.updated_by_user_id = updatedByUserId;
        } else {
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = null;
          form.generated_file_name = null;
          form.generated_file_mime_type = null;
          form.generated_file_size = null;
          form.generated_file_template_name = storageKeyOrTemplateName;
          form.generated_at = '2026-07-08 10:36:00';
          form.generated_by_user_id = fileNameOrGeneratedByUserId;
          form.generation_error_message = mimeTypeOrErrorMessage;
          form.updated_by_user_id = fileSizeOrUpdatedByUserId;
        }
        form.updated_at = '2026-07-08 10:36:00';
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('submitted_at = CURRENT_TIMESTAMP') &&
      text.includes('approved_at = CURRENT_TIMESTAMP')
    ) {
      const [status, projectId, nodeKey] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && [SOLUTION_DESIGN_NODE_STATUS.PENDING, SOLUTION_DESIGN_NODE_STATUS.RETURNED].includes(node.status)) {
        node.status = status;
        node.submitted_at = '2026-07-08 10:20:00';
        node.approved_at = '2026-07-08 10:20:00';
        node.return_reason = null;
        node.updated_at = '2026-07-08 10:20:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('submitted_at = CURRENT_TIMESTAMP')
    ) {
      const [status, projectId, nodeKey] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && [SOLUTION_DESIGN_NODE_STATUS.PENDING, SOLUTION_DESIGN_NODE_STATUS.RETURNED].includes(node.status)) {
        node.status = status;
        node.submitted_at = '2026-07-08 10:20:00';
        node.return_reason = null;
        node.updated_at = '2026-07-08 10:20:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('approved_at = CURRENT_TIMESTAMP')
    ) {
      const [status, projectId, nodeKey] = params;
      const allowedStatuses = params.slice(3);
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && allowedStatuses.includes(node.status)) {
        node.status = status;
        node.approved_at = '2026-07-08 10:25:00';
        node.return_reason = null;
        node.updated_at = '2026-07-08 10:25:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('return_reason = NULL') &&
      !text.includes('submitted_at = CURRENT_TIMESTAMP') &&
      !text.includes('approved_at = CURRENT_TIMESTAMP') &&
      !text.includes('activated_at = COALESCE')
    ) {
      const [status, projectId, nodeKey, expectedStatus] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && node.status === expectedStatus) {
        node.status = status;
        node.return_reason = null;
        node.updated_at = '2026-07-08 10:25:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('returned_at = CURRENT_TIMESTAMP') &&
      !text.includes('current_revision')
    ) {
      const [status, returnReason, projectId, nodeKey] = params;
      const allowedStatuses = params.slice(4);
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && allowedStatuses.includes(node.status)) {
        node.status = status;
        node.return_reason = returnReason;
        node.returned_at = '2026-07-08 10:25:00';
        node.updated_at = '2026-07-08 10:25:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('current_revision = ?')
    ) {
      const [status, returnReason, revision, projectId, nodeKey] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      const allowedStatuses = params.slice(5);
      if (node && allowedStatuses.includes(node.status)) {
        node.status = status;
        node.return_reason = returnReason;
        node.current_revision = revision;
        node.returned_at = '2026-07-08 10:25:00';
        node.updated_at = '2026-07-08 10:25:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('current_revision = current_revision + 1')
    ) {
      const [status, returnReason, projectId, nodeKey] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      const allowedStatuses = params.slice(4);
      if (node && allowedStatuses.includes(node.status)) {
        node.status = status;
        node.return_reason = returnReason;
        node.current_revision = Number(node.current_revision ?? 1) + 1;
        node.returned_at = '2026-07-08 10:25:00';
        node.updated_at = '2026-07-08 10:25:00';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_nodes') &&
      text.includes('activated_at = COALESCE')
    ) {
      const [status, projectId, nodeKey] = params;
      const node = this.nodes.find((candidate) => candidate.project_id === projectId && candidate.node_key === nodeKey);
      if (node && [SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED, SOLUTION_DESIGN_NODE_STATUS.RETURNED].includes(node.status)) {
        node.status = status;
        node.activated_at = node.activated_at || '2026-07-08 10:20:00';
        node.updated_at = '2026-07-08 10:20:00';
      }
      return [{ affectedRows: node ? 1 : 0 }];
    }

    if (text.startsWith('SELECT id, account, display_name') && text.includes('FROM users')) {
      return [params.map((id) => this.users.get(Number(id))).filter(Boolean).map((row) => ({ ...row }))];
    }

    if (text.startsWith('INSERT INTO project_solution_design_roles')) {
      const [
        projectId,
        technicalOwnerUserId,
        businessOwnerUserId,
        procurementOwnerUserId,
        financeAccountantUserId,
        financeOwnerUserId,
        assignedByUserId,
        updatedByUserId
      ] = params;
      this.rolesRow = {
        id: 1,
        project_id: projectId,
        technical_owner_user_id: technicalOwnerUserId,
        business_owner_user_id: businessOwnerUserId,
        procurement_owner_user_id: procurementOwnerUserId,
        finance_accountant_user_id: financeAccountantUserId,
        finance_owner_user_id: financeOwnerUserId,
        assigned_by_user_id: assignedByUserId,
        assigned_at: '2026-07-08 10:00:00',
        updated_by_user_id: updatedByUserId,
        updated_at: '2026-07-08 10:00:00'
      };
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE project_solution_design_roles')) {
      const [
        technicalOwnerUserId,
        businessOwnerUserId,
        procurementOwnerUserId,
        financeAccountantUserId,
        financeOwnerUserId,
        updatedByUserId,
        projectId
      ] = params;
      this.rolesRow = {
        ...(this.rolesRow || { id: 1, assigned_by_user_id: updatedByUserId }),
        project_id: projectId,
        technical_owner_user_id: technicalOwnerUserId,
        business_owner_user_id: businessOwnerUserId,
        procurement_owner_user_id: procurementOwnerUserId,
        finance_accountant_user_id: financeAccountantUserId,
        finance_owner_user_id: financeOwnerUserId,
        updated_by_user_id: updatedByUserId,
        updated_at: '2026-07-08 10:00:00'
      };
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_role_history')) {
      const [projectId, roleKey, fromUserId, toUserId, changedByUserId] = params;
      this.roleHistory.push({
        project_id: projectId,
        role_key: roleKey,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        changed_by_user_id: changedByUserId
      });
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_quotation_tender_flows')) {
      const [
        projectId,
        branchType,
        branchStatus,
        selectedByUserId,
        revision,
        createdByUserId,
        updatedByUserId
      ] = params;
      this.quotationTenderFlow = {
        id: 1,
        project_id: projectId,
        branch_type: branchType,
        branch_status: branchStatus,
        selected_by_user_id: selectedByUserId,
        selected_at: '2026-07-08 10:45:00',
        quotation_result: null,
        quotation_rejected_action: null,
        return_reason: null,
        revision,
        created_by_user_id: createdByUserId,
        updated_by_user_id: updatedByUserId,
        created_at: '2026-07-08 10:45:00',
        updated_at: '2026-07-08 10:45:00'
      };
      return [{ affectedRows: 1, insertId: 1 }];
    }

    if (text.startsWith('UPDATE project_solution_design_quotation_tender_flows')) {
      const flow = this.quotationTenderFlow;
      if (!flow) {
        return [{ affectedRows: 0 }];
      }

      if (text.includes('SET branch_type = ?')) {
        const [branchType, branchStatus, selectedByUserId, revision, updatedByUserId, projectId] = params;
        if (flow.project_id !== projectId) {
          return [{ affectedRows: 0 }];
        }
        Object.assign(flow, {
          branch_type: branchType,
          branch_status: branchStatus,
          selected_by_user_id: selectedByUserId,
          selected_at: '2026-07-08 10:45:00',
          quotation_result: null,
          quotation_rejected_action: null,
          return_reason: null,
          revision,
          updated_by_user_id: updatedByUserId,
          updated_at: '2026-07-08 10:45:00'
        });
        return [{ affectedRows: 1 }];
      }

      if (text.includes('quotation_result = NULL') && text.includes('quotation_rejected_action = NULL')) {
        const [branchStatus, updatedByUserId, projectId, branchType, ...allowedStatuses] = params;
        if (
          flow.project_id !== projectId ||
          flow.branch_type !== branchType ||
          !allowedStatuses.includes(flow.branch_status)
        ) {
          return [{ affectedRows: 0 }];
        }
        flow.branch_status = branchStatus;
        flow.quotation_result = null;
        flow.quotation_rejected_action = null;
        flow.return_reason = null;
        flow.updated_by_user_id = updatedByUserId;
        flow.updated_at = '2026-07-08 10:50:00';
        return [{ affectedRows: 1 }];
      }

      if (text.includes('quotation_result = ?')) {
        if (text.includes('quotation_rejected_action = NULL')) {
          const [branchStatus, quotationResult, updatedByUserId, projectId, branchType, expectedStatus] = params;
          if (
            flow.project_id !== projectId ||
            flow.branch_type !== branchType ||
            flow.branch_status !== expectedStatus
          ) {
            return [{ affectedRows: 0 }];
          }
          flow.branch_status = branchStatus;
          flow.quotation_result = quotationResult;
          flow.quotation_rejected_action = null;
          flow.return_reason = null;
          flow.updated_by_user_id = updatedByUserId;
          flow.updated_at = '2026-07-08 10:50:00';
          return [{ affectedRows: 1 }];
        }

        const [
          branchStatus,
          quotationResult,
          quotationRejectedAction,
          returnReason,
          updatedByUserId,
          projectId,
          branchType,
          expectedStatus
        ] = params;
        if (
          flow.project_id !== projectId ||
          flow.branch_type !== branchType ||
          flow.branch_status !== expectedStatus
        ) {
          return [{ affectedRows: 0 }];
        }
        flow.branch_status = branchStatus;
        flow.quotation_result = quotationResult;
        flow.quotation_rejected_action = quotationRejectedAction;
        flow.return_reason = returnReason;
        flow.updated_by_user_id = updatedByUserId;
        flow.updated_at = '2026-07-08 10:50:00';
        return [{ affectedRows: 1 }];
      }

      if (text.includes('revision = ?')) {
        const [branchStatus, returnReason, revision, updatedByUserId, projectId, branchType, expectedStatus] = params;
        if (
          flow.project_id !== projectId ||
          flow.branch_type !== branchType ||
          flow.branch_status !== expectedStatus
        ) {
          return [{ affectedRows: 0 }];
        }
        flow.branch_status = branchStatus;
        flow.return_reason = returnReason;
        flow.revision = revision;
        flow.updated_by_user_id = updatedByUserId;
        flow.updated_at = '2026-07-08 10:50:00';
        return [{ affectedRows: 1 }];
      }

      if (text.includes('return_reason = NULL')) {
        const [branchStatus, updatedByUserId, projectId, branchType, expectedStatus] = params;
        if (
          flow.project_id !== projectId ||
          flow.branch_type !== branchType ||
          flow.branch_status !== expectedStatus
        ) {
          return [{ affectedRows: 0 }];
        }
        flow.branch_status = branchStatus;
        flow.return_reason = null;
        flow.updated_by_user_id = updatedByUserId;
        flow.updated_at = '2026-07-08 10:50:00';
        return [{ affectedRows: 1 }];
      }

      const [branchStatus, updatedByUserId, projectId, branchType, ...allowedStatuses] = params;
      if (
        flow.project_id !== projectId ||
        flow.branch_type !== branchType ||
        !allowedStatuses.includes(flow.branch_status)
      ) {
        return [{ affectedRows: 0 }];
      }
      flow.branch_status = branchStatus;
      flow.updated_by_user_id = updatedByUserId;
      flow.updated_at = '2026-07-08 10:50:00';
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE projects SET project_manager_user_id = ?')) {
      const [projectManagerUserId, projectManager, projectId] = params;
      assert.equal(projectId, this.project.id);
      this.project.project_manager_user_id = projectManagerUserId;
      this.project.project_manager = projectManager;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('UPDATE projects SET status = ?')) {
      const [status, projectId] = params;
      assert.equal(projectId, this.project.id);
      this.project.status = status;
      return [{ affectedRows: 1 }];
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
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected query: ${text}`);
  }
}

function fakeDb(options = {}) {
  const connection = new SolutionDesignWorkflowFakeConnection(options);
  return {
    connection,
    generatedFileStorage: options.generatedFileStorage || fakeGeneratedFileStorage(),
    async getConnection() {
      return connection;
    }
  };
}

test('visible project users can query workflow and lazy initialization is idempotent', async () => {
  const db = fakeDb();
  const requester = authUser(db.connection.users.get(10));

  const first = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);
  const second = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);

  assert.equal(first.projectId, 100);
  assert.equal(first.permissions.canViewWorkflow, true);
  assert.equal(first.nodes.length, 9);
  assert.deepEqual(
    first.nodes.map((node) => node.nodeKey),
    SOLUTION_DESIGN_NODES.map((node) => node.nodeKey)
  );
  assert.equal(first.nodes[0].status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(first.nodes[1].status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(second.nodes.length, 9);
  assert.equal(db.connection.nodes.length, 9);
  assert.equal(db.connection.nodeInsertCount, 9);
});

test('workflow query rejects users without project visibility', async () => {
  const db = fakeDb({ visible: false });
  const requester = authUser(db.connection.users.get(13));

  await assert.rejects(
    () => getSolutionDesignWorkflow({ projectId: 100, user: requester }, db),
    (error) => error.code === 'FORBIDDEN_OPERATION'
  );
});

test('query uses existing project manager as default when no solution roles are assigned', async () => {
  const db = fakeDb();
  const requester = authUser(db.connection.users.get(10));

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);

  assert.equal(workflow.roles.project_manager.userId, 10);
  assert.equal(workflow.roles.project_manager.user.name, '原项目经理');
  assert.equal(workflow.roles.project_manager.source, 'project_manager');
});

test('RD center manager can assign roles and project manager stays single-sourced from project', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(1));

  const workflow = await assignSolutionDesignRoles(
    { projectId: 100, payload: rolePayload(), user: actor },
    db
  );

  assert.equal(workflow.roles.project_manager.userId, 11);
  assert.equal(workflow.roles.project_manager.user.name, '新项目经理');
  assert.equal(workflow.roles.project_manager.source, 'project_manager');
  assert.equal(db.connection.project.project_manager_user_id, 11);
  assert.equal(db.connection.project.project_manager, '新项目经理');
  assert.equal(Object.hasOwn(db.connection.rolesRow, 'project_manager_user_id'), false);
  assert.equal(db.connection.nodes.length, 9);
  assert.deepEqual(
    workflow.nodes[0].blockingReasons,
    ['等待项目经理提交方案设计工作计划']
  );
});

test('workflow query after solution stage does not lazily insert missing nodes', async () => {
  const db = fakeDb({
    project: baseProject({
      current_stage_order: 3,
      current_stage_key: 'contract',
      current_stage_name: '合同签订阶段'
    })
  });
  const requester = authUser(db.connection.users.get(10));

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);

  assert.equal(workflow.nodes.length, 9);
  assert.equal(workflow.nodes.every((node) => node.status === SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED), true);
  assert.equal(db.connection.nodes.length, 0);
  assert.equal(db.connection.nodeInsertCount, 0);
});

test('role assignment rejects non-RD managers, general manager assistants and system admins', async () => {
  const actorIds = [2, 3, 4];

  for (const actorId of actorIds) {
    const db = fakeDb();
    await assert.rejects(
      () =>
        assignSolutionDesignRoles(
          { projectId: 100, payload: rolePayload(), user: authUser(db.connection.users.get(actorId)) },
          db
        ),
      (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
    );
    assert.equal(db.connection.operationLogs.length, 0);
  }
});

test('role assignment rejects ended projects', async () => {
  const db = fakeDb({ project: baseProject({ status: 'ended' }) });
  const actor = authUser(db.connection.users.get(1));

  await assert.rejects(
    () => assignSolutionDesignRoles({ projectId: 100, payload: rolePayload(), user: actor }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.PROJECT_ENDED
  );
});

test('role assignment is limited to current solution design stage', async () => {
  const db = fakeDb({
    project: baseProject({
      current_stage_order: 1,
      current_stage_key: 'initiation',
      current_stage_name: '立项阶段'
    })
  });
  const actor = authUser(db.connection.users.get(1));

  await assert.rejects(
    () => assignSolutionDesignRoles({ projectId: 100, payload: rolePayload(), user: actor }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
  );
});

test('role assignment validates enabled users and business department users', async () => {
  const cases = [
    {
      name: 'disabled user',
      payload: rolePayload({ technicalOwnerUserId: 17 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    },
    {
      name: 'global role user',
      payload: rolePayload({ procurementOwnerUserId: 18 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    },
    {
      name: 'finance accountant outside operations center',
      payload: rolePayload({ financeAccountantUserId: 19 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    },
    {
      name: 'finance owner outside operations center',
      payload: rolePayload({ financeOwnerUserId: 19 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    },
    {
      name: 'business owner outside marketing center',
      payload: rolePayload({ businessOwnerUserId: 20 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    },
    {
      name: 'technical owner outside RD center',
      payload: rolePayload({ technicalOwnerUserId: 21 }),
      code: SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
    }
  ];

  for (const candidate of cases) {
    const db = fakeDb();
    const actor = authUser(db.connection.users.get(1));

    await assert.rejects(
      () => assignSolutionDesignRoles({ projectId: 100, payload: candidate.payload, user: actor }, db),
      (error) => error.code === candidate.code,
      candidate.name
    );
    assert.equal(db.connection.operationLogs.length, 0);
  }
});

test('procurement owner accepts enabled business department users in the first slice', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(1));

  const workflow = await assignSolutionDesignRoles(
    {
      projectId: 100,
      payload: rolePayload({ procurementOwnerUserId: 13 }),
      user: actor
    },
    db
  );

  assert.equal(workflow.roles.procurement_owner.userId, 13);
});

test('successful role assignment writes role history and operation log with project manager from/to', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(1));

  await assignSolutionDesignRoles({ projectId: 100, payload: rolePayload(), user: actor }, db);

  const projectManagerHistory = db.connection.roleHistory.find(
    (row) => row.role_key === 'project_manager'
  );
  assert.deepEqual(projectManagerHistory, {
    project_id: 100,
    role_key: 'project_manager',
    from_user_id: 10,
    to_user_id: 11,
    changed_by_user_id: 1
  });

  assert.equal(db.connection.operationLogs.length, 1);
  const [log] = db.connection.operationLogs;
  assert.equal(log.action_type, OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ROLES_ASSIGNED);
  assert.equal(log.target_type, OPERATION_TARGET_TYPE.SOLUTION_DESIGN_WORKFLOW);
  const details = JSON.parse(log.details_json);
  assert.deepEqual(details.projectManager, {
    fromUserId: 10,
    toUserId: 11
  });
  assert.equal(details.roles.technical_owner, 12);
});

test('failed role assignment does not write a success operation log', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(1));

  await assert.rejects(
    () =>
      assignSolutionDesignRoles(
        { projectId: 100, payload: rolePayload({ technicalOwnerUserId: 21 }), user: actor },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.INVALID_ROLE_USER
  );

  assert.equal(db.connection.operationLogs.length, 0);
});

test('upload slot DTO permissions follow node status and role assignment', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const projectManager = authUser(db.connection.users.get(11));
  const technicalOwner = authUser(db.connection.users.get(12));

  const managerUploads = await listSolutionDesignUploads({ projectId: 100, user: projectManager }, db);
  assert.equal(
    findUploadSlot(managerUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN).permissions.canUpload,
    true
  );

  const initialTechnicalUploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(initialTechnicalUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM).permissions
      .canUpload,
    false
  );
  assert.equal(
    findUploadSlot(initialTechnicalUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM).permissions
      .canUpload,
    false
  );

  setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.PREPARATION, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  const approvedPreparationUploads = await listSolutionDesignUploads({ projectId: 100, user: projectManager }, db);
  assert.equal(
    findUploadSlot(approvedPreparationUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN).permissions.canUpload,
    false
  );
});

test('project manager can upload and submit solution design work plan', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));

  const uploaded = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划.docx'),
      user: projectManager
    },
    db,
    storage
  );
  const workflowAfterUpload = await getSolutionDesignWorkflow({ projectId: 100, user: projectManager }, db);
  assert.equal(
    findWorkflowNode(workflowAfterUpload, SOLUTION_DESIGN_NODE_KEY.PREPARATION).permissions.canSubmit,
    true
  );

  const workflow = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
      user: projectManager
    },
    db
  );

  assert.equal(uploaded.slotKey, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN);
  assert.equal(storage.written.length, 1);
  assert.equal(
    db.connection.uploadSlots.find((slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN).status,
    SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED
  );
  assert.equal(
    workflow.nodes.find((node) => node.nodeKey === SOLUTION_DESIGN_NODE_KEY.PREPARATION).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.PREPARATION).permissions.canSubmit,
    false
  );
  assert.equal(
    workflow.nodes.find((node) => node.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.deepEqual(
    db.connection.operationLogs.map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_WORK_PLAN_UPLOADED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_WORK_PLAN_SUBMITTED
    ]
  );
});

test('slot replacement increments revision and keeps only the latest file current', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));

  const first = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划-v1.docx'),
      user: projectManager
    },
    db,
    storage
  );
  const second = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划-v2.docx'),
      user: projectManager
    },
    db,
    storage
  );

  assert.equal(first.file.revision, 1);
  assert.equal(second.file.revision, 2);

  const files = db.connection.uploadFiles.filter(
    (file) => file.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN
  );
  assert.deepEqual(
    files.map((file) => ({ revision: file.revision, isCurrent: file.is_current })),
    [
      { revision: 1, isCurrent: 0 },
      { revision: 2, isCurrent: 1 }
    ]
  );
  assert.equal(
    db.connection.uploadSlots.find((slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN).revision,
    2
  );

  const uploads = await listSolutionDesignUploads({ projectId: 100, user: projectManager }, db);
  const workPlanSlot = findUploadSlot(uploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN);
  assert.equal(workPlanSlot.revision, 2);
  assert.equal(workPlanSlot.currentFile.originalFileName, '方案设计工作计划-v2.docx');
});

test('approved preparation node rejects later work plan uploads without writing files or logs', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划.docx'),
      user: projectManager
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
      user: projectManager
    },
    db
  );
  const logCountBeforeRejectedUpload = db.connection.operationLogs.length;
  const fileWriteCountBeforeRejectedUpload = storage.written.length;

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
          file: testUploadFile('新版方案设计工作计划.docx'),
          user: projectManager
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeRejectedUpload);
  assert.equal(storage.written.length, fileWriteCountBeforeRejectedUpload);
});

test('non-project managers cannot upload or submit solution design work plan', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const projectManager = authUser(db.connection.users.get(11));

  const initialUploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(initialUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM).permissions.canUpload,
    false
  );

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
          file: testUploadFile('方案设计工作计划.docx'),
          user: technicalOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, 0);
  assert.equal(storage.written.length, 0);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划.docx'),
      user: projectManager
    },
    db,
    storage
  );
  const logCountBeforeFailedSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode({
        projectId: 100,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
        user: technicalOwner
      }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailedSubmit);
});

test('product function diagram requires active analysis node and can upload after work plan submission', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const projectManager = authUser(db.connection.users.get(11));

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
          file: testUploadFile('产品功能框图.png'),
          user: technicalOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  assert.equal(storage.written.length, 0);
  assert.equal(db.connection.operationLogs.length, 0);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划.docx'),
      user: projectManager
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
      user: projectManager
    },
    db
  );
  const activatedUploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(activatedUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM).permissions.canUpload,
    true
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwner
    },
    db,
    storage
  );
  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);

  assert.equal(
    uploads.slots.find((slot) => slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
      .currentFile.originalFileName,
    '产品功能框图.png'
  );
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_PRODUCT_FUNCTION_DIAGRAM_UPLOADED
  );
});

test('technical owner can save and submit solution analysis form', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, storage);
  const initial = await getSolutionDesignAnalysisForm({ projectId: 100, user: technicalOwner }, db);
  assert.equal(initial.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(initial.permissions.canEditForm, true);
  assert.equal(initial.permissions.canSubmitForm, true);
  assert.equal(initial.permissions.canSubmitNode, false);

  const saved = await saveSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({ solutionScope: '草稿方案范围' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(saved.form.status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(saved.form.revision, 1);
  assert.equal(saved.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);
  assert.equal(saved.form.formData.solutionScope, '草稿方案范围');

  const submitted = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        customerRequirements: '客户需求写入分析表模板',
        solutionScope: '提交版方案范围写入分析表模板',
        technicalRisks: '技术风险写入分析表模板'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED);
  assert.equal(submitted.form.revision, 1);
  assert.equal(submitted.form.submittedByUserId, 12);
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(submitted.form.generatedFile.templateName, '项目方案分析表-模板.xlsx');
  assert.equal(submitted.form.generatedFile.canDownload, true);
  assert.match(submitted.form.generatedFile.fileName, /^C05-项目方案分析表-/);
  assert.ok(submitted.form.generatedFile.fileSize > 0);
  assert.equal(submitted.permissions.canSubmitNode, false);
  assert.equal(db.generatedFileStorage.written.length, 1);
  const analysisGeneratedKey = submitted.form.generatedFile.storageKey ?? db.generatedFileStorage.written[0].storageKey;
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, analysisGeneratedKey, 'A2', '项目编号');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, analysisGeneratedKey, 'C2', '项目名称');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B2', 'SD-TEST-001');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'E2', '方案设计流程测试项目');
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B12',
    '客户需求写入分析表模板'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B17',
    '技术风险写入分析表模板'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B27',
    '提交版方案范围写入分析表模板'
  );

  const download = await getSolutionDesignAnalysisGeneratedFileDownload(
    { projectId: 100, user: technicalOwner },
    db
  );
  assert.equal(download.fileName, submitted.form.generatedFile.fileName);
  assert.equal(download.mimeType, submitted.form.generatedFile.mimeType);
  assert.equal(download.filePath, db.generatedFileStorage.written[0].storageKey);
  db.connection.visible = false;
  const unrelatedUser = authUser(db.connection.users.get(31));
  await assert.rejects(
    () => getSolutionDesignAnalysisGeneratedFileDownload({ projectId: 100, user: unrelatedUser }, db),
    (error) => error.statusCode === 403
  );

  const actionTypes = db.connection.operationLogs.map((log) => log.action_type);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_SAVED), true);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_SUBMITTED), true);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATED), true);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATION_FAILED), false);
});

test('solution analysis generated file failure blocks node submit and cleans partial file', async () => {
  const generatedStorage = fakeGeneratedFileStorage({ failWrite: true });
  const db = fakeDb({ generatedFileStorage: generatedStorage });
  seedAssignedRoles(db.connection);
  const uploadStorage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, uploadStorage);
  const submitted = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({ solutionScope: '触发生成失败' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED);
  assert.match(submitted.form.generatedFile.errorMessage, /FAKE_GENERATED_FILE_WRITE_FAILED/);
  assert.equal(generatedStorage.files.size, 0);
  assert.equal(generatedStorage.cleaned.length, 1);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwner
    },
    db,
    uploadStorage
  );

  const logCountBeforeSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('analysis_form_generated_file')
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeSubmit);

  const actionTypes = db.connection.operationLogs.map((log) => log.action_type);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATED), false);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_FORM_GENERATION_FAILED), true);
});

test('non-technical owners cannot save or submit solution analysis form', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateAnalysisNode(db, storage);
  const logCountBeforeFailures = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      saveSolutionDesignAnalysisForm(
        {
          projectId: 100,
          payload: analysisFormPayload(),
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      submitSolutionDesignAnalysisForm(
        {
          projectId: 100,
          payload: analysisFormPayload(),
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailures);
});

test('solution analysis form writes require an active processable analysis node', async () => {
  const technicalOwnerId = 12;
  const stateCases = [
    {
      name: 'not started',
      status: SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED
    },
    {
      name: 'pending review',
      status: SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
    },
    {
      name: 'approved',
      status: SOLUTION_DESIGN_NODE_STATUS.APPROVED
    }
  ];

  for (const stateCase of stateCases) {
    const db = fakeDb();
    seedAssignedRoles(db.connection);
    const technicalOwner = authUser(db.connection.users.get(technicalOwnerId));
    await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
    setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.ANALYSIS, stateCase.status);

    await assert.rejects(
      () =>
        saveSolutionDesignAnalysisForm(
          {
            projectId: 100,
            payload: analysisFormPayload({ stateCase: stateCase.name }),
            user: technicalOwner
          },
          db
        ),
      (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      stateCase.name
    );
    assert.equal(db.connection.analysisForms.length, 0);
    assert.equal(db.connection.operationLogs.length, 0);
  }
});

test('solution analysis form writes reject ended projects and non-current solution stage projects', async () => {
  const cases = [
    {
      name: 'ended project',
      db: fakeDb({ project: baseProject({ status: 'ended' }) }),
      code: SOLUTION_DESIGN_ERROR.PROJECT_ENDED
    },
    {
      name: 'contract stage project',
      db: fakeDb({
        project: baseProject({
          current_stage_order: 3,
          current_stage_key: 'contract',
          current_stage_name: '合同签订阶段'
        })
      }),
      code: SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
    }
  ];

  for (const candidate of cases) {
    seedAssignedRoles(candidate.db.connection);
    const technicalOwner = authUser(candidate.db.connection.users.get(12));
    await assert.rejects(
      () =>
        saveSolutionDesignAnalysisForm(
          {
            projectId: 100,
            payload: analysisFormPayload({ caseName: candidate.name }),
            user: technicalOwner
          },
          candidate.db
        ),
      (error) => error.code === candidate.code,
      candidate.name
    );
    assert.equal(candidate.db.connection.analysisForms.length, 0);
    assert.equal(candidate.db.connection.operationLogs.length, 0);
  }
});

test('solution analysis node cannot be submitted before both required outputs are complete', async () => {
  const dbMissingDiagram = fakeDb();
  seedAssignedRoles(dbMissingDiagram.connection);
  const storageMissingDiagram = fakeUploadStorage();
  const technicalOwner = authUser(dbMissingDiagram.connection.users.get(12));
  await activateAnalysisNode(dbMissingDiagram, storageMissingDiagram);
  await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload(),
      user: technicalOwner
    },
    dbMissingDiagram
  );
  const logCountBeforeMissingDiagramSubmit = dbMissingDiagram.connection.operationLogs.length;

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user: technicalOwner
        },
        dbMissingDiagram
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
  );
  assert.equal(dbMissingDiagram.connection.operationLogs.length, logCountBeforeMissingDiagramSubmit);

  const dbMissingForm = fakeDb();
  seedAssignedRoles(dbMissingForm.connection);
  const storageMissingForm = fakeUploadStorage();
  const technicalOwnerMissingForm = authUser(dbMissingForm.connection.users.get(12));
  await activateAnalysisNode(dbMissingForm, storageMissingForm);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwnerMissingForm
    },
    dbMissingForm,
    storageMissingForm
  );
  const logCountBeforeMissingFormSubmit = dbMissingForm.connection.operationLogs.length;

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user: technicalOwnerMissingForm
        },
        dbMissingForm
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED && error.details.includes('analysis_form')
  );
  assert.equal(dbMissingForm.connection.operationLogs.length, logCountBeforeMissingFormSubmit);
});

test('technical owner submits complete solution analysis node for RD manager review', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await activateAnalysisNode(db, storage);
  await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload(),
      user: technicalOwner
    },
    db
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).permissions.canSubmit, true);

  const workflow = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).permissions.canSubmit, false);
  assert.equal(
    db.connection.uploadSlots.find((slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
      .status,
    SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.SUBMITTED
  );

  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(uploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM).permissions.canUpload,
    false
  );
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: rdManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).permissions.canApprove, true);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).permissions.canReturn, true);
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_SUBMITTED
  );
});

test('RD manager approves solution analysis node and activates solution design node', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const rdManager = authUser(db.connection.users.get(1));

  await submitAnalysisNodeForReview(db, storage);
  const workflow = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      user: rdManager
    },
    db
  );

  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_APPROVED
  );
});

test('RD manager returns solution analysis node and requires overall resubmission', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await submitAnalysisNodeForReview(db, storage);
  const revisionOneGeneratedKey = db.connection.currentAnalysisForm().generated_file_storage_key;
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      payload: { returnReason: '产品功能边界需重新确认' },
      user: rdManager
    },
    db
  );
  const returnedNode = findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  assert.equal(returnedNode.status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(returnedNode.currentRevision, 2);
  assert.equal(returnedNode.returnReason, '产品功能边界需重新确认');

  const returnedForm = await getSolutionDesignAnalysisForm({ projectId: 100, user: technicalOwner }, db);
  assert.equal(returnedForm.permissions.canEditForm, true);
  assert.equal(returnedForm.permissions.canSubmitForm, true);
  assert.equal(returnedForm.permissions.canSubmitNode, false);
  const returnedUploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(returnedUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM).permissions.canUpload,
    true
  );

  const logCountBeforeOldRevisionSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('analysis_form') &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldRevisionSubmit);

  await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        technicalRisks: '退回后重新评估节拍风险',
        solutionScope: '第二版方案范围'
      }),
      user: technicalOwner
    },
    db
  );
  const revisionTwoGeneratedKey = db.connection.currentAnalysisForm().generated_file_storage_key;
  assert.notEqual(revisionOneGeneratedKey, revisionTwoGeneratedKey);
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    revisionTwoGeneratedKey,
    'B17',
    '退回后重新评估节拍风险'
  );
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    revisionTwoGeneratedKey,
    'B17',
    '节拍和视觉检测稳定性需验证'
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图-v2.png'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyAgain, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).permissions.canSubmit, true);
  const resubmitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(resubmitted, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(db.connection.analysisForms.at(-1).revision, 2);
  assert.equal(
    db.connection.uploadFiles.find(
      (file) => file.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM && file.is_current === 1
    ).revision,
    2
  );

  const returnLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_RETURNED
  );
  assert.ok(returnLog);
  const details = JSON.parse(returnLog.details_json);
  assert.equal(details.returnReason, '产品功能边界需重新确认');
  assert.deepEqual(details.resubmitScope, [
    'analysis_form',
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM
  ]);
});

test('non-RD managers cannot approve or return solution analysis node', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitAnalysisNodeForReview(db, storage);
  const logCountBeforeFailures = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      returnSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
          payload: { returnReason: '无权退回' },
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailures);
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
});

test('non-technical owners cannot upload product function diagram', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.ANALYSIS, SOLUTION_DESIGN_NODE_STATUS.PENDING);

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
          file: testUploadFile('产品功能框图.png'),
          user: businessOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, 0);
  assert.equal(storage.written.length, 0);
});

test('not-started solution design node rejects all design output uploads and submit without logs', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit,
    false
  );

  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(uploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM).permissions.canUpload,
    false
  );

  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS) {
    await assert.rejects(
      () =>
        uploadSolutionDesignWorkflowFile(
          {
            projectId: 100,
            slotKey,
            file: testUploadFile(`${slotKey}.dat`),
            user: technicalOwner
          },
          db,
          storage
        ),
      (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
    );
  }

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode({
        projectId: 100,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
        user: technicalOwner
      }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  assert.equal(storage.written.length, 0);
  assert.equal(db.connection.operationLogs.length, 0);
});

test('technical owner can submit solution design node after all eight outputs are uploaded', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.DESIGN, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  const beforeUploadsWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(beforeUploadsWorkflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit,
    false
  );

  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS) {
    await uploadSolutionDesignWorkflowFile(
      {
        projectId: 100,
        slotKey,
        file: testUploadFile(`${slotKey}.dat`),
        user: technicalOwner
      },
      db,
      storage
    );
  }
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit,
    true
  );

  const workflow = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );

  assert.equal(storage.written.length, 8);
  assert.equal(
    workflow.nodes.find((node) => node.nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit,
    false
  );
  assert.equal(
    workflow.nodes.find((node) => node.nodeKey === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.filter(
      (log) => log.action_type === OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_UPLOADED
    ).length,
    8
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUTS_SUBMITTED
  );
});

test('solution design node cannot be submitted when any of the eight outputs is missing', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.DESIGN, SOLUTION_DESIGN_NODE_STATUS.PENDING);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM,
      file: testUploadFile('工艺时序图.dat'),
      user: technicalOwner
    },
    db,
    storage
  );
  const logCountBeforeFailedSubmit = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode({
        projectId: 100,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
        user: technicalOwner
      }, db),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.CYCLE_TIME_TABLE)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailedSubmit);
});

test('technical owner can save and submit internal review form', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await submitSolutionDesignOutputs(db, storage);
  const initial = await getSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: technicalOwner
    },
    db
  );
  assert.equal(initial.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(initial.reviewType, 'internal');
  assert.equal(initial.documentCode, 'C15');
  assert.equal(initial.templateName, '方案评审记录表-模板.xlsx');
  assert.equal(initial.permissions.canEditReviewForm, true);
  assert.equal(initial.permissions.canSubmitReviewForm, true);
  assert.equal(initial.permissions.canSubmitNode, false);

  const saved = await saveSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '内部草稿' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(saved.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.DRAFT);
  assert.equal(saved.form.revision, 1);
  assert.equal(saved.form.formData.reviewConclusion, '内部草稿');

  const submitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({
        meetingDate: '2026-07-18',
        meetingLocation: '内部评审会议室',
        projectTargetDescription: ['内部目标第一行', '内部目标第二行'],
        technicalRisks: ['内部风险第一行', '内部风险第二行'],
        solutionSuggestions: ['内部方案建议第一行', '内部方案建议第二行'],
        reviewConclusion: '内部评审结论写入模板',
        actionItems: ['内部实施计划第一行', '内部实施计划第二行']
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED);
  assert.equal(submitted.form.revision, 1);
  assert.deepEqual(submitted.form.formData.projectTargetDescription, ['内部目标第一行', '内部目标第二行']);
  assert.deepEqual(submitted.form.formData.actionItems, ['内部实施计划第一行', '内部实施计划第二行']);
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(submitted.form.generatedFile.templateName, '方案评审记录表-模板.xlsx');
  assert.equal(submitted.form.generatedFile.canDownload, true);
  assert.match(submitted.form.generatedFile.fileName, /^C15-方案评审记录表-内部方案评审-/);
  assert.equal(submitted.permissions.canSubmitNode, true);
  const internalReviewGeneratedKey = db.generatedFileStorage.written.at(-1).storageKey;
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A2', '项目名称');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'D2', '客户名称');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A5', '评审地点');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'F5', '评审时间');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A9', '项目需求分析');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A12', '项目目标描述');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A15', '项目风险评估');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A18', '项目方案建议');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A30', '项目实施计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A42', '记录人：');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B2', '方案设计流程测试项目');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'E2', '测试客户公司');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'B3', '内部，第（1）次');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B5', '内部评审会议室');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'G5', '2026-07-18');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B12', '内部目标第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B13', '内部目标第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B15', '内部风险第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B16', '内部风险第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B18', '内部方案建议第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B19', '内部方案建议第二行');
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    internalReviewGeneratedKey,
    'B39',
    '内部评审结论写入模板'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    internalReviewGeneratedKey,
    'B30',
    '内部实施计划第一行'
  );
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B31', '内部实施计划第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B42', '技术负责人');

  const download = await getSolutionDesignReviewGeneratedFileDownload(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: technicalOwner
    },
    db
  );
  assert.equal(download.fileName, submitted.form.generatedFile.fileName);
  assert.equal(download.filePath, db.generatedFileStorage.written.at(-1).storageKey);

  const actionTypes = db.connection.operationLogs.map((log) => log.action_type);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SAVED), true);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_SUBMITTED), true);
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATED),
    true
  );
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED),
    false
  );
});

test('technical owner can save and submit customer review form', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateCustomerReviewNode(db, storage);
  const saved = await saveSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '客户草稿' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(saved.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(saved.reviewType, 'customer');
  assert.equal(saved.documentCode, 'C16');
  assert.equal(saved.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.DRAFT);

  const submitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload({
        meetingDate: '2026-07-19',
        meetingLocation: '客户评审会议室',
        projectTargetDescription: ['客户目标第一行', '客户目标第二行'],
        technicalRisks: ['客户风险第一行'],
        solutionSuggestions: ['客户方案建议第一行', '客户方案建议第二行'],
        reviewConclusion: '客户评审结论写入模板',
        actionItems: ['客户实施计划第一行', '客户实施计划第二行']
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED);
  assert.equal(submitted.form.reviewType, 'customer');
  assert.deepEqual(submitted.form.formData.projectTargetDescription, ['客户目标第一行', '客户目标第二行']);
  assert.deepEqual(submitted.form.formData.actionItems, ['客户实施计划第一行', '客户实施计划第二行']);
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.match(submitted.form.generatedFile.fileName, /^C16-方案评审记录表-客户方案评审-/);
  assert.equal(submitted.permissions.canSubmitNode, true);

  const internalForm = db.connection.reviewForms.find(
    (form) => form.node_key === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW && form.is_current === 1
  );
  const customerForm = db.connection.reviewForms.find(
    (form) => form.node_key === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW && form.is_current === 1
  );
  assert.ok(internalForm);
  assert.ok(customerForm);
  assert.equal(internalForm.review_type, 'internal');
  assert.equal(customerForm.review_type, 'customer');
  assert.notEqual(internalForm.generated_file_storage_key, customerForm.generated_file_storage_key);
  assert.equal(internalForm.generated_file_template_name, '方案评审记录表-模板.xlsx');
  assert.equal(customerForm.generated_file_template_name, '方案评审记录表-模板.xlsx');
  assert.notEqual(internalForm.generated_file_name, customerForm.generated_file_name);
  assert.notDeepEqual(
    generatedFileBuffer(db.generatedFileStorage, internalForm.generated_file_storage_key),
    generatedFileBuffer(db.generatedFileStorage, customerForm.generated_file_storage_key)
  );
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A2', '项目名称');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'D2', '客户名称');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A5', '评审地点');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'F5', '评审时间');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A9', '项目需求分析');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A12', '项目目标描述');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A15', '项目风险评估');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A18', '项目方案建议');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A30', '项目实施计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A42', '记录人：');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B3', '甲方，第（1）次');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B5', '客户评审会议室');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'G5', '2026-07-19');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B12', '客户目标第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B13', '客户目标第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B15', '客户风险第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B18', '客户方案建议第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B19', '客户方案建议第二行');
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    customerForm.generated_file_storage_key,
    'B39',
    '客户评审结论写入模板'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    customerForm.generated_file_storage_key,
    'B30',
    '客户实施计划第一行'
  );
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B31', '客户实施计划第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B42', '技术负责人');
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    internalForm.generated_file_storage_key,
    'B12',
    '客户目标第一行'
  );
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    customerForm.generated_file_storage_key,
    'B12',
    '内部目标第一行'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    internalForm.generated_file_storage_key,
    'B3',
    '内部'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    customerForm.generated_file_storage_key,
    'B3',
    '甲方'
  );

  const download = await getSolutionDesignReviewGeneratedFileDownload(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: technicalOwner
    },
    db
  );
  assert.equal(download.fileName, submitted.form.generatedFile.fileName);

  const actionTypes = db.connection.operationLogs.map((log) => log.action_type);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SAVED), true);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_SUBMITTED), true);
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATED),
    true
  );
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATION_FAILED),
    false
  );
});

test('non-technical owners cannot save or submit review forms', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitSolutionDesignOutputs(db, storage);
  const logCountBeforeFailures = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      saveSolutionDesignReviewForm(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: reviewFormPayload(),
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      submitSolutionDesignReviewForm(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: reviewFormPayload(),
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailures);
});

test('review form writes require active processable review node status', async () => {
  const stateCases = [
    SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  ];

  for (const status of stateCases) {
    const db = fakeDb();
    seedAssignedRoles(db.connection);
    const technicalOwner = authUser(db.connection.users.get(12));
    await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
    setNodeStatus(db.connection, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, status);

    await assert.rejects(
      () =>
        saveSolutionDesignReviewForm(
          {
            projectId: 100,
            nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
            payload: reviewFormPayload({ status }),
            user: technicalOwner
          },
          db
        ),
      (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE,
      status
    );
    assert.equal(db.connection.reviewForms.length, 0);
    assert.equal(db.connection.operationLogs.length, 0);
  }
});

test('review form writes reject ended projects and non-current solution stage projects', async () => {
  const cases = [
    {
      name: 'ended project',
      db: fakeDb({ project: baseProject({ status: 'ended' }) }),
      code: SOLUTION_DESIGN_ERROR.PROJECT_ENDED
    },
    {
      name: 'contract stage project',
      db: fakeDb({
        project: baseProject({
          current_stage_order: 3,
          current_stage_key: 'contract',
          current_stage_name: '合同签订阶段'
        })
      }),
      code: SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
    }
  ];

  for (const candidate of cases) {
    seedAssignedRoles(candidate.db.connection);
    const technicalOwner = authUser(candidate.db.connection.users.get(12));
    await assert.rejects(
      () =>
        saveSolutionDesignReviewForm(
          {
            projectId: 100,
            nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
            payload: reviewFormPayload({ caseName: candidate.name }),
            user: technicalOwner
          },
          candidate.db
        ),
      (error) => error.code === candidate.code,
      candidate.name
    );
    assert.equal(candidate.db.connection.reviewForms.length, 0);
    assert.equal(candidate.db.connection.operationLogs.length, 0);
  }
});

test('review node cannot be submitted before its review form is submitted', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await submitSolutionDesignOutputs(db, storage);
  const logCountBeforeFailedSubmit = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('review_form')
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailedSubmit);
});

test('review form generated file failure blocks review node submission', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const uploadStorage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await submitSolutionDesignOutputs(db, uploadStorage);
  const failingGeneratedStorage = fakeGeneratedFileStorage({ failWrite: true });
  db.generatedFileStorage = failingGeneratedStorage;
  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '生成失败版本' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED);
  assert.equal(failingGeneratedStorage.files.size, 0);
  assert.equal(failingGeneratedStorage.cleaned.length, 1);

  const logCountBeforeFailedSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('review_form_generated_file')
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailedSubmit);

  const actionTypes = db.connection.operationLogs.map((log) => log.action_type);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATED), false);
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED), true);
});

test('internal review node submits for review and RD manager approval activates customer review', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await submitSolutionDesignOutputs(db, storage);
  await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canSubmit, true);

  const submitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(
    findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canEditReviewForm,
    false
  );
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: rdManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canApprove, true);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canReturn, true);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: rdManager
    },
    db
  );
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_APPROVED
  );
});

test('RD manager returns internal review to solution design and old design outputs cannot be resubmitted', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await submitReviewNodeForReview(db, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, storage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: { returnReason: '内部评审要求整体调整方案' },
      user: rdManager
    },
    db
  );
  const designNode = findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.DESIGN);
  const internalNode = findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW);
  assert.equal(designNode.status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(designNode.currentRevision, 2);
  assert.equal(internalNode.status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(internalNode.currentRevision, 2);
  assert.equal(designNode.permissions.canSubmit, false);

  const logCountBeforeOldRevisionSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldRevisionSubmit);

  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS) {
    await uploadSolutionDesignWorkflowFile(
      {
        projectId: 100,
        slotKey,
        file: testUploadFile(`${slotKey}-v2.dat`),
        user: technicalOwner
      },
      db,
      storage
    );
  }
  const readyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyAgain, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit, true);
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );
  const internalReviewReadyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(internalReviewReadyAgain, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canSubmit,
    false
  );
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('review_form')
  );

  const returnLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_RETURNED
  );
  assert.ok(returnLog);
  const details = JSON.parse(returnLog.details_json);
  assert.equal(details.returnReason, '内部评审要求整体调整方案');
  assert.equal(details.returnToNodeKey, SOLUTION_DESIGN_NODE_KEY.DESIGN);
  assert.deepEqual(details.resubmitScope, SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS);
});

test('customer review node submits for review and RD manager approval activates RD cost estimation', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await activateCustomerReviewNode(db, storage);
  await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  const submitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: rdManager
    },
    db
  );
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.RD_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_APPROVED
  );
});

test('customer review return forces design resubmission and prevents bypassing prior review status', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await activateCustomerReviewNode(db, storage);
  await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '客户提出调整意见' }),
      user: technicalOwner
    },
    db
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: technicalOwner
    },
    db
  );

  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: { returnReason: '客户要求重新调整方案' },
      user: rdManager
    },
    db
  );
  assert.equal(
    findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.DESIGN).status,
    SOLUTION_DESIGN_NODE_STATUS.RETURNED
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.DESIGN).currentRevision, 2);
  assert.equal(
    findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.RETURNED
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).currentRevision, 2);
  assert.equal(
    findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.RETURNED
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).currentRevision, 2);

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: technicalOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED && error.details.includes('review_form')
  );
  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
          user: rdManager
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );

  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS) {
    await uploadSolutionDesignWorkflowFile(
      {
        projectId: 100,
        slotKey,
        file: testUploadFile(`${slotKey}-customer-return-v2.dat`),
        user: technicalOwner
      },
      db,
      storage
    );
  }
  const designResubmitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(designResubmitted, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    findWorkflowNode(designResubmitted, SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.RETURNED
  );
  assert.equal(
    findWorkflowNode(designResubmitted, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canSubmit,
    false
  );
});

test('non-RD users cannot approve or return review nodes and return reason is required', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const rdManager = authUser(db.connection.users.get(1));

  await submitReviewNodeForReview(db, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, storage);
  const logCountBeforeFailures = db.connection.operationLogs.length;

  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      returnSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: { returnReason: '无权退回' },
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      returnSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: { returnReason: '' },
          user: rdManager
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.RETURN_REASON_REQUIRED
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailures);
});

test('technical owner can upload, submit and get approval for RD cost estimation', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await activateRdCostNode(db, storage);
  const initialUploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findUploadSlot(initialUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION).permissions.canUpload,
    true
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      file: testUploadFile('研发中心成本估算表.xlsx'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canSubmit, true);

  const submitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: technicalOwner
    },
    db
  );
  assert.equal(findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: rdManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canApprove, true);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canReturn, true);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: rdManager
    },
    db
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.deepEqual(
    db.connection.operationLogs.slice(-3).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_FILE_UPLOADED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_APPROVED
    ]
  );
});

test('RD cost return increments revision and blocks old file resubmission', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await submitRdCostForReview(db, storage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      payload: { returnReason: '研发成本估算需补充工时依据' },
      user: rdManager
    },
    db
  );
  const rdNode = findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST);
  assert.equal(rdNode.status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(rdNode.currentRevision, 2);
  assert.equal(rdNode.permissions.canSubmit, false);

  const logCountBeforeOldSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldSubmit);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      file: testUploadFile('研发中心成本估算表-v2.xlsx'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(readyAgain, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canSubmit, true);
});

test('procurement owner completes manufacturing cost estimation and manufacturing manager can return it', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const procurementOwner = authUser(db.connection.users.get(14));
  const manufacturingManager = authUser(db.connection.users.get(2));

  await activateManufacturingCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
      file: testUploadFile('制造中心成本估算表.xlsx'),
      user: procurementOwner
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: procurementOwner }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).permissions.canSubmit, true);

  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: procurementOwner
    },
    db
  );
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: manufacturingManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).permissions.canApprove, true);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: manufacturingManager
    },
    db
  );
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.PENDING);

  const dbReturned = fakeDb();
  seedAssignedRoles(dbReturned.connection);
  const returnStorage = fakeUploadStorage();
  await submitManufacturingCostForReview(dbReturned, returnStorage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      payload: { returnReason: '制造成本需补充供应商报价' },
      user: manufacturingManager
    },
    dbReturned
  );
  assert.equal(
    findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(
    findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.RETURNED
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).currentRevision, 2);
});

test('finance cost estimation uses finance owner and general manager two-level approval', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const financeAccountant = authUser(db.connection.users.get(15));
  const financeOwner = authUser(db.connection.users.get(16));
  const generalManager = authUser(db.connection.users.get(30));

  await activateFinanceCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
      file: testUploadFile('运营中心财务成本估算表.xlsx'),
      user: financeAccountant
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: financeAccountant }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canSubmit, true);

  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeAccountant
    },
    db
  );
  const financeOwnerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: financeOwner }, db);
  assert.equal(findWorkflowNode(financeOwnerWorkflow, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canApprove, true);
  assert.equal(findWorkflowNode(financeOwnerWorkflow, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canReturn, true);

  const pendingGeneral = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(pendingGeneral, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW
  );
  const generalWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, db);
  assert.equal(findWorkflowNode(generalWorkflow, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canApprove, true);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: generalManager
    },
    db
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_GENERAL_APPROVED
  );
});

test('finance owner return only reopens finance cost estimation', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const financeAccountant = authUser(db.connection.users.get(15));
  const financeOwner = authUser(db.connection.users.get(16));

  await submitFinanceCostForFinanceReview(db, storage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      payload: { returnReason: '财务成本需补充运营费用明细' },
      user: financeOwner
    },
    db
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
          user: financeAccountant
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION)
  );
});

test('general manager return sends cost workflow back to RD and blocks old revisions', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const procurementOwner = authUser(db.connection.users.get(14));
  const rdManager = authUser(db.connection.users.get(1));
  const generalManager = authUser(db.connection.users.get(30));

  await submitFinanceCostForGeneralReview(db, storage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      payload: { returnReason: '总经理要求重新核算成本' },
      user: generalManager
    },
    db
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).currentRevision, 2);

  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION)
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      file: testUploadFile('研发中心成本估算表-v2.xlsx'),
      user: technicalOwner
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: technicalOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: rdManager
    },
    db
  );
  const afterRdApproval = await getSolutionDesignWorkflow({ projectId: 100, user: procurementOwner }, db);
  assert.equal(
    findWorkflowNode(afterRdApproval, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(findWorkflowNode(afterRdApproval, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).permissions.canSubmit, false);
});

test('cost estimation roles are enforced and failed requests do not write success logs', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const manufacturingManager = authUser(db.connection.users.get(2));

  await activateRdCostNode(db, storage);
  const logCountBeforeRejectedUpload = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
          file: testUploadFile('研发中心成本估算表.xlsx'),
          user: businessOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeRejectedUpload);
  assert.equal(storage.written.filter((file) => file.storageKey.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION)).length, 0);

  const reviewDb = fakeDb();
  seedAssignedRoles(reviewDb.connection);
  const reviewStorage = fakeUploadStorage();
  await submitRdCostForReview(reviewDb, reviewStorage);
  const logCountBeforeRejectedApproval = reviewDb.connection.operationLogs.length;
  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
          user: manufacturingManager
        },
        reviewDb
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(reviewDb.connection.operationLogs.length, logCountBeforeRejectedApproval);
  assert.equal(
    findWorkflowNode(
      await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, reviewDb),
      SOLUTION_DESIGN_NODE_KEY.RD_COST
    ).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
});

test('finance cost upload metadata is redacted and download is restricted', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const procurementOwner = authUser(db.connection.users.get(14));
  const financeAccountant = authUser(db.connection.users.get(15));
  const financeOwner = authUser(db.connection.users.get(16));
  const generalManager = authUser(db.connection.users.get(30));
  const unauthorizedUsers = [1, 2, 3, 4, 12, 13, 14, 31].map((id) => authUser(db.connection.users.get(id)));

  await submitFinanceCostForGeneralReview(db, storage);

  for (const unauthorizedUser of unauthorizedUsers) {
    const uploads = await listSolutionDesignUploads({ projectId: 100, user: unauthorizedUser }, db);
    const financeSlot = findUploadSlot(uploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION);
    assert.equal(financeSlot.hasCurrentFile, true, unauthorizedUser.account);
    assert.equal(financeSlot.currentFile, null, unauthorizedUser.account);
    assert.equal(financeSlot.currentFileHidden, true, unauthorizedUser.account);
    assert.equal(financeSlot.permissions.canDownload, false, unauthorizedUser.account);
  }

  for (const authorizedUser of [financeAccountant, financeOwner, generalManager]) {
    const uploads = await listSolutionDesignUploads({ projectId: 100, user: authorizedUser }, db);
    const financeSlot = findUploadSlot(uploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION);
    assert.equal(financeSlot.currentFile.originalFileName, '运营中心财务成本估算表.xlsx');
    assert.equal(financeSlot.currentFileHidden, false);
    assert.equal(financeSlot.permissions.canDownload, true);
  }

  const rdDownload = await getSolutionDesignUploadDownload(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      user: procurementOwner
    },
    db,
    storage
  );
  assert.equal(rdDownload.originalFileName, '研发中心成本估算表.xlsx');

  const manufacturingDownload = await getSolutionDesignUploadDownload(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
      user: financeAccountant
    },
    db,
    storage
  );
  assert.equal(manufacturingDownload.originalFileName, '制造中心成本估算表.xlsx');

  await assert.rejects(
    () =>
      getSolutionDesignUploadDownload(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
          user: technicalOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.CONFIDENTIAL_FILE_FORBIDDEN
  );
  const financeDownload = await getSolutionDesignUploadDownload(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
      user: generalManager
    },
    db,
    storage
  );
  assert.equal(financeDownload.originalFileName, '运营中心财务成本估算表.xlsx');

  const financeUploadLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_FILE_UPLOADED
  );
  assert.ok(financeUploadLog);
  assert.equal(financeUploadLog.summary.includes('运营中心财务成本估算表.xlsx'), false);
  const details = JSON.parse(financeUploadLog.details_json);
  assert.equal(details.originalFileName, null);
  assert.equal(details.fileSize, null);
  assert.equal(details.confidential, true);
});

test('general manager selects quotation or tender branch and duplicate or non-GM selection is rejected', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  const beforeSelection = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, db);
  assert.equal(
    findWorkflowNode(beforeSelection, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canSelectBranch,
    true
  );

  const selected = await selectSolutionDesignQuotationTenderBranch(
    {
      projectId: 100,
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    db
  );
  assert.equal(selected.quotationTender.branchType, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);
  assert.equal(selected.quotationTender.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);
  assert.equal(
    findWorkflowNode(selected, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canSelectBranch,
    false
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_BRANCH_SELECTED
  );

  const logCountBeforeFailures = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      selectSolutionDesignQuotationTenderBranch(
        {
          projectId: 100,
          payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER },
          user: generalManager
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  await assert.rejects(
    () =>
      selectSolutionDesignQuotationTenderBranch(
        {
          projectId: 100,
          payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER },
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeFailures);
});

test('business owner uploads and submits quotation, accepted quotation approves node and opens contract gate', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  await selectQuotationBranch(db);
  const uploadsBeforeFile = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findUploadSlot(uploadsBeforeFile, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE).permissions.canUpload,
    true
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
      file: testUploadFile('报价单.xlsx'),
      user: businessOwner
    },
    db,
    storage
  );
  const readyToSubmit = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(readyToSubmit.quotationTender.permissions.canSubmitQuotation, true);
  assert.equal(readyToSubmit.quotationTender.permissions.canAcceptQuotation, false);

  const submitted = await submitSolutionDesignQuotation({ projectId: 100, user: businessOwner }, db);
  assert.equal(submitted.quotationTender.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED);
  assert.equal(submitted.quotationTender.permissions.canUploadQuotation, false);
  assert.equal(submitted.quotationTender.permissions.canSubmitQuotation, false);
  assert.equal(submitted.quotationTender.permissions.canAcceptQuotation, true);
  assert.equal(
    findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canUploadQuotation,
    false
  );
  const uploadsAfterSubmit = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findUploadSlot(uploadsAfterSubmit, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE).permissions.canUpload,
    false
  );

  const writtenCountBeforeRejectedUpload = storage.written.length;
  const quotationFilesBeforeRejectedUpload = db.connection.uploadFiles.filter(
    (file) => file.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE
  ).length;
  const logCountBeforeRejectedUpload = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
          file: testUploadFile('报价单-提交后替换.xlsx'),
          user: businessOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE
  );
  assert.equal(storage.written.length, writtenCountBeforeRejectedUpload);
  assert.equal(
    db.connection.uploadFiles.filter((file) => file.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE).length,
    quotationFilesBeforeRejectedUpload
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeRejectedUpload);

  const accepted = await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
      user: businessOwner
    },
    db
  );
  assert.equal(
    findWorkflowNode(accepted, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
  assert.equal(accepted.permissions.canAdvanceToContract, true);
  assert.equal(accepted.currentStage.stageKey, 'solution');
  assert.deepEqual(
    db.connection.operationLogs.slice(-3).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT
    ]
  );
});

test('rejected quotation can return to RD cost and old cost revisions cannot bypass the new cycle', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));
  const manufacturingManager = authUser(db.connection.users.get(2));
  const procurementOwner = authUser(db.connection.users.get(14));
  const financeAccountant = authUser(db.connection.users.get(15));
  const financeOwner = authUser(db.connection.users.get(16));
  const generalManager = authUser(db.connection.users.get(30));

  await submitQuotation(db, storage);
  const returned = await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: {
        result: SOLUTION_DESIGN_QUOTATION_RESULT.REJECTED,
        action: SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST,
        returnReason: '客户要求重新核算成本后再报价'
      },
      user: businessOwner
    },
    db
  );

  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(db.connection.quotationTenderFlow.quotation_rejected_action, SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST);

  const logCountBeforeOldSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldSubmit);
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_RETURN_RD_COST
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
      file: testUploadFile('研发中心成本估算表-v2.xlsx'),
      user: technicalOwner
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: technicalOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: rdManager
    },
    db
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
      file: testUploadFile('制造中心成本估算表-v2.xlsx'),
      user: procurementOwner
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: procurementOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
      user: manufacturingManager
    },
    db
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION,
      file: testUploadFile('运营中心财务成本估算表-v2.xlsx'),
      user: financeAccountant
    },
    db,
    storage
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeAccountant
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: generalManager
    },
    db
  );
  await selectQuotationBranch(db);
  const reselectedUploads = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findUploadSlot(reselectedUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE).permissions.canUpload,
    true
  );
  const reuploadedQuotation = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
      file: testUploadFile('报价单-v2.xlsx'),
      user: businessOwner
    },
    db,
    storage
  );
  assert.equal(reuploadedQuotation.file.revision, 2);
});

test('rejected quotation can end project and later solution design writes are blocked', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitQuotation(db, storage);
  const ended = await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: {
        result: SOLUTION_DESIGN_QUOTATION_RESULT.REJECTED,
        action: SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.END_PROJECT,
        returnReason: '客户取消项目'
      },
      user: businessOwner
    },
    db
  );

  assert.equal(ended.isProjectEnded, true);
  assert.equal(db.connection.project.status, 'ended');
  assert.equal(findWorkflowNode(ended, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.ENDED);
  assert.equal(
    db.connection.operationLogs.at(-2).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_PROJECT_ENDED
  );
  assert.equal(db.connection.operationLogs.at(-1).action_type, OPERATION_ACTION_TYPE.PROJECT_ENDED);

  const logCountBeforeRejectedUpload = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
          file: testUploadFile('报价单-v2.xlsx'),
          user: businessOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.PROJECT_ENDED
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeRejectedUpload);
});

test('tender branch requires both business and technical files before submitting for GM approval', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const generalManager = authUser(db.connection.users.get(30));

  await activateQuotationOrTenderNode(db, storage);
  await selectTenderBranch(db);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
      file: testUploadFile('投标商务标.docx'),
      user: businessOwner
    },
    db,
    storage
  );
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          user: businessOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE)
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
      file: testUploadFile('投标技术标.docx'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  const readyTenderNode = findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(readyTenderNode.permissions.canSubmit, true);
  assert.equal(readyTenderNode.permissions.canSubmitTender, true);

  const submitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: businessOwner
    },
    db
  );
  assert.equal(findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canApproveTender, true);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: generalManager
    },
    db
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(approved.permissions.canAdvanceToContract, true);
  assert.deepEqual(
    db.connection.operationLogs.slice(-3).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT
    ]
  );
});

test('solution design end-to-end smoke covers quotation and tender happy paths', async () => {
  const quotationDb = fakeDb();
  const quotationStorage = fakeUploadStorage();
  const rdManager = authUser(quotationDb.connection.users.get(1));
  const businessOwner = authUser(quotationDb.connection.users.get(13));
  const generalManager = authUser(quotationDb.connection.users.get(30));

  const assigned = await assignSolutionDesignRoles(
    {
      projectId: 100,
      payload: rolePayload(),
      user: rdManager
    },
    quotationDb
  );
  assert.equal(assigned.roles.project_manager.userId, 11);

  await activateQuotationOrTenderNode(quotationDb, quotationStorage);
  const readyForBranch = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, quotationDb);

  for (const nodeKey of [
    SOLUTION_DESIGN_NODE_KEY.PREPARATION,
    SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    SOLUTION_DESIGN_NODE_KEY.DESIGN,
    SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
    SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
    SOLUTION_DESIGN_NODE_KEY.RD_COST,
    SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
    SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
  ]) {
    assert.equal(findWorkflowNode(readyForBranch, nodeKey).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  }
  const branchNode = findWorkflowNode(readyForBranch, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(branchNode.status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(branchNode.permissions.canSelectBranch, true);

  const analysisForm = quotationDb.connection.currentAnalysisForm();
  assert.equal(analysisForm.form_status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.SUBMITTED);
  assert.equal(analysisForm.generated_file_status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  const reviewForms = quotationDb.connection.currentReviewForms();
  assert.equal(reviewForms.length, 2);
  assert.equal(
    reviewForms.every(
      (form) =>
        form.form_status === SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED &&
        form.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED
    ),
    true
  );

  for (const slotKey of [
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
    ...SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION
  ]) {
    assert.ok(quotationDb.connection.currentUploadFileForSlot(slotKey), `Expected current file for ${slotKey}`);
  }

  await selectQuotationBranch(quotationDb);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
      file: testUploadFile('报价单-smoke.xlsx'),
      user: businessOwner
    },
    quotationDb,
    quotationStorage
  );
  await submitSolutionDesignQuotation({ projectId: 100, user: businessOwner }, quotationDb);
  const accepted = await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
      user: businessOwner
    },
    quotationDb
  );
  assert.equal(findWorkflowNode(accepted, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(accepted.permissions.canAdvanceToContract, true);
  assert.equal(accepted.currentStage.stageKey, 'solution');
  assert.equal(
    quotationDb.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT
  );

  const tenderDb = fakeDb();
  const tenderStorage = fakeUploadStorage();
  const tenderRdManager = authUser(tenderDb.connection.users.get(1));
  const tenderBusinessOwner = authUser(tenderDb.connection.users.get(13));
  const tenderGeneralManager = authUser(tenderDb.connection.users.get(30));

  await assignSolutionDesignRoles(
    {
      projectId: 100,
      payload: rolePayload(),
      user: tenderRdManager
    },
    tenderDb
  );
  await submitTenderForReview(tenderDb, tenderStorage);
  const tenderApproved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: tenderGeneralManager
    },
    tenderDb
  );

  assert.equal(findWorkflowNode(tenderApproved, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(tenderApproved.quotationTender.branchType, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
  assert.equal(tenderApproved.permissions.canAdvanceToContract, true);
  assert.equal(tenderApproved.currentStage.stageKey, 'solution');
  const tenderUploads = await listSolutionDesignUploads({ projectId: 100, user: tenderBusinessOwner }, tenderDb);
  assert.equal(findUploadSlot(tenderUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE).currentFile.revision, 1);
  assert.equal(findUploadSlot(tenderUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE).currentFile.revision, 1);
  assert.equal(
    tenderDb.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT
  );
});

test('tender return increments revision and old tender files cannot bypass resubmission', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const generalManager = authUser(db.connection.users.get(30));

  await submitTenderForReview(db, storage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      payload: { returnReason: '投标文件需补充技术偏离表' },
      user: generalManager
    },
    db
  );
  const tenderNode = findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(tenderNode.status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(tenderNode.currentRevision, 2);
  assert.equal(tenderNode.permissions.canSubmitTender, false);
  const returnedForBusinessOwner = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  const returnedBusinessTenderNode = findWorkflowNode(returnedForBusinessOwner, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(returnedBusinessTenderNode.permissions.canSubmit, false);
  assert.equal(returnedBusinessTenderNode.permissions.canSubmitTender, false);

  const logCountBeforeOldSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          user: businessOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      SOLUTION_DESIGN_TENDER_UPLOAD_SLOT_KEYS.every((slotKey) => error.details.includes(slotKey))
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldSubmit);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
      file: testUploadFile('投标商务标-v2.docx'),
      user: businessOwner
    },
    db,
    storage
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
      file: testUploadFile('投标技术标-v2.docx'),
      user: technicalOwner
    },
    db,
    storage
  );
  const readyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  const readyAgainTenderNode = findWorkflowNode(readyAgain, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(readyAgainTenderNode.permissions.canSubmit, true);
  assert.equal(readyAgainTenderNode.permissions.canSubmitTender, true);
  assert.equal(db.connection.quotationTenderFlow.branch_status, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.RETURNED);
});

test('quotation and tender role permissions reject wrong actors without success logs', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const generalManager = authUser(db.connection.users.get(30));

  await activateQuotationOrTenderNode(db, storage);
  await selectTenderBranch(db);
  const logCountBeforeWrongUpload = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
          file: testUploadFile('投标商务标.docx'),
          user: technicalOwner
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeWrongUpload);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
      file: testUploadFile('投标商务标.docx'),
      user: businessOwner
    },
    db,
    storage
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
      file: testUploadFile('投标技术标.docx'),
      user: technicalOwner
    },
    db,
    storage
  );
  const logCountBeforeWrongApproval = db.connection.operationLogs.length;
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: businessOwner
    },
    db
  );
  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeWrongApproval + 1);

  const quoteDb = fakeDb();
  seedAssignedRoles(quoteDb.connection);
  const quoteStorage = fakeUploadStorage();
  await submitQuotation(quoteDb, quoteStorage);
  const logCountBeforeWrongResult = quoteDb.connection.operationLogs.length;
  await assert.rejects(
    () =>
      processSolutionDesignQuotationResult(
        {
          projectId: 100,
          payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
          user: generalManager
        },
        quoteDb
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(quoteDb.connection.operationLogs.length, logCountBeforeWrongResult);
});

test('ended and non-current-stage projects reject cost estimation writes', async () => {
  const cases = [
    {
      db: fakeDb({ project: baseProject({ status: 'ended' }) }),
      code: SOLUTION_DESIGN_ERROR.PROJECT_ENDED
    },
    {
      db: fakeDb({
        project: baseProject({
          current_stage_order: 3,
          current_stage_key: 'contract',
          current_stage_name: '合同签订阶段'
        })
      }),
      code: SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
    }
  ];

  for (const candidate of cases) {
    seedAssignedRoles(candidate.db.connection);
    const storage = fakeUploadStorage();
    const technicalOwner = authUser(candidate.db.connection.users.get(12));
    await assert.rejects(
      () =>
        uploadSolutionDesignWorkflowFile(
          {
            projectId: 100,
            slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.RD_COST_ESTIMATION,
            file: testUploadFile('研发中心成本估算表.xlsx'),
            user: technicalOwner
          },
          candidate.db,
          storage
        ),
      (error) => error.code === candidate.code
    );
    assert.equal(candidate.db.connection.operationLogs.length, 0);
    assert.equal(storage.written.length, 0);
  }
});

test('ended projects reject solution design uploads and node submits', async () => {
  const db = fakeDb({ project: baseProject({ status: 'ended' }) });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
          file: testUploadFile('方案设计工作计划.docx'),
          user: projectManager
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.PROJECT_ENDED
  );
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode({
        projectId: 100,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
        user: projectManager
      }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.PROJECT_ENDED
  );
  assert.equal(db.connection.operationLogs.length, 0);
  assert.equal(storage.written.length, 0);
});

test('non-current solution stage projects reject solution design writes', async () => {
  const db = fakeDb({
    project: baseProject({
      current_stage_order: 3,
      current_stage_key: 'contract',
      current_stage_name: '合同签订阶段'
    })
  });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));

  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
          file: testUploadFile('方案设计工作计划.docx'),
          user: projectManager
        },
        db,
        storage
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
  );
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode({
        projectId: 100,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.PREPARATION,
        user: projectManager
      }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NOT_IN_STAGE
  );
  assert.equal(db.connection.operationLogs.length, 0);
  assert.equal(db.connection.uploadSlots.length, 0);
});

test('dedicated document boundary identifies solution design C04-C19 documents', () => {
  assert.equal(isSolutionDesignDedicatedDocument({ documentCode: 'C17' }), true);
  assert.equal(isSolutionDesignDedicatedDocument({ document_code: 'C04' }), true);
  assert.equal(isSolutionDesignDedicatedDocument('C19'), true);
  assert.equal(isSolutionDesignDedicatedDocument({ documentCode: 'D01' }), false);
});

test('dedicated solution design documents reject legacy stage document status actions', async () => {
  const users = baseUsers();
  const technicalOwner = authUser(users.get(12));
  const rdManager = authUser(users.get(1));

  for (const actionCase of [
    {
      action: DOCUMENT_STATUS_ACTION.SUBMIT,
      status: DOCUMENT_STATUS.NOT_SUBMITTED,
      user: technicalOwner
    },
    {
      action: DOCUMENT_STATUS_ACTION.CONFIRM,
      status: DOCUMENT_STATUS.SUBMITTED,
      user: rdManager
    },
    {
      action: DOCUMENT_STATUS_ACTION.RETURN,
      status: DOCUMENT_STATUS.SUBMITTED,
      user: rdManager,
      returnReason: '必须走方案设计专用节点流程'
    }
  ]) {
    const connection = fakeDedicatedStageDocumentStatusConnection({
      documentCode: 'C15',
      status: actionCase.status
    });

    await assert.rejects(
      () =>
        updateProjectStageDocumentStatus({
          connection,
          projectId: 100,
          documentId: 400,
          action: actionCase.action,
          user: actionCase.user,
          returnReason: actionCase.returnReason
        }),
      (error) =>
        error.code === 'SOLUTION_DESIGN_DEDICATED_FLOW_REQUIRED' &&
        error.statusCode === 409 &&
        error.details.documentCode === 'C15'
    );
    assert.equal(connection.operationLogs.length, 0);
  }
});

test('solution design permission helpers identify general manager and project role users', () => {
  const users = baseUsers();
  const generalManager = dbUser({
    id: 30,
    account: 'gm',
    displayName: '总经理',
    department: null,
    organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER
  });

  assert.equal(isSolutionDesignGeneralManager(authUser(generalManager)), true);
  assert.equal(isSolutionDesignGeneralManager(authUser(users.get(1))), false);
  assert.equal(
    isSolutionDesignProjectRoleUser({ userId: 12 }, authUser(users.get(12))),
    true
  );
  assert.equal(
    isSolutionDesignProjectRoleUser({ userId: 12 }, authUser(users.get(13))),
    false
  );
});

test('solution design workbench todos include role assignment target route', async () => {
  const db = fakeDb();
  const rdManager = authUser(db.connection.users.get(1));
  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: rdManager }, db);
  const uploads = await listSolutionDesignUploads({ projectId: 100, user: rdManager }, db);

  const todos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.project,
    workflow,
    uploads
  });

  assert.equal(todos.length, 1);
  assert.equal(todos[0].type, 'solution_design_workflow');
  assert.equal(todos[0].nodeKey, SOLUTION_DESIGN_NODE_KEY.PREPARATION);
  assert.equal(todos[0].actionText, '分配方案设计角色');
  assert.match(todos[0].targetRoute, /taskMode=solutionDesign/);
  assert.match(todos[0].targetRoute, /focusNodeKey=solution_preparation/);
});

test('solution design workbench todos derive technical owner actions and blocking reasons from DTO permissions', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateAnalysisNode(db);

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  const todos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.project,
    workflow,
    uploads
  });

  const actionTexts = todos.map((todo) => todo.actionText);
  assert.ok(actionTexts.includes('填写/提交项目方案分析表'));
  assert.ok(actionTexts.includes('上传产品功能框图'));
  assert.equal(
    todos.every((todo) => todo.type === 'solution_design_workflow' && todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.ANALYSIS),
    true
  );
  assert.ok(todos.every((todo) => todo.targetRoute.includes('focusNodeKey=solution_analysis')));
  assert.ok(
    todos.some((todo) =>
      todo.blockingReasons.some((reason) => reason.includes('项目方案分析表') || reason.includes('产品功能框图'))
    )
  );
});

test('solution design workbench finance approval todo does not expose confidential file metadata', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const generalManager = authUser(db.connection.users.get(30));
  await submitFinanceCostForGeneralReview(db);

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, db);
  const uploads = await listSolutionDesignUploads({ projectId: 100, user: generalManager }, db);
  const todos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.project,
    workflow,
    uploads
  });

  const financeTodo = todos.find((todo) => todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST);
  assert.ok(financeTodo);
  assert.equal(financeTodo.actionText, '总经理审批/退回财务成本估算');
  const serialized = JSON.stringify(financeTodo);
  assert.equal(serialized.includes('运营中心财务成本估算表.xlsx'), false);
  assert.equal(serialized.includes('storageKey'), false);
  assert.equal(serialized.includes('fileSize'), false);
});
