import assert from 'node:assert/strict';
import test from 'node:test';
import { DOCUMENT_STATUS_ACTION } from '../../src/domain/stageDocumentStatus.js';
import {
  COMPLETION_MODE,
  DOCUMENT_STATUS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT
} from '../../src/domain/stageDocumentTemplates.js';
import {
  SOLUTION_DESIGN_ANALYSIS_FORM_STATUS,
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_UPLOAD_SLOTS,
  SOLUTION_DESIGN_QUOTATION_FORM_STATUS,
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
  getSolutionDesignQuotationForm,
  getSolutionDesignQuotationGeneratedFileDownload,
  getSolutionDesignReviewGeneratedFileDownload,
  getSolutionDesignReviewForm,
  getSolutionDesignUploadDownload,
  getSolutionDesignWorkflow,
  listSolutionDesignUploads,
  markSolutionDesignUploadExemption,
  processSolutionDesignQuotationResult,
  returnSolutionDesignWorkflowNode,
  saveSolutionDesignAnalysisForm,
  saveSolutionDesignQuotationForm,
  saveSolutionDesignReviewForm,
  selectSolutionDesignQuotationTenderBranch,
  submitSolutionDesignAnalysisForm,
  submitSolutionDesignQuotation,
  submitSolutionDesignQuotationForm,
  submitSolutionDesignReviewForm,
  submitSolutionDesignWorkflowNode,
  cancelSolutionDesignUploadExemption,
  uploadSolutionDesignWorkflowFile
} from '../../src/repositories/projects/solutionDesignWorkflowRepository.js';
import {
  advanceProjectStage,
  tryAutoAdvanceProjectStage
} from '../../src/repositories/projects/stageAdvanceRepository.js';
import { getProjectOverviewDashboard } from '../../src/repositories/projects/overviewDashboardRepository.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../../src/repositories/operationLogRepository.js';
import { updateProjectStageDocumentStatus } from '../../src/repositories/stageDocuments/statusRepository.js';
import {
  deleteStageDocumentOnlineFormImage,
  uploadStageDocumentOnlineFormImage
} from '../../src/repositories/stageDocuments/onlineFormImageRepository.js';
import {
  attachSolutionDesignDerivedCompletionToStageDocumentRows,
  COMPLETION_STATUS,
  mapDocument
} from '../../src/repositories/stageDocuments/shared.js';
import {
  buildProjectNavigationFromWorkspace,
  NAVIGATION_STATUS
} from '../../src/services/navigationService.js';
import { pool } from '../../src/db/pool.js';
import { INITIATION_REWORK_TARGET_DOCUMENT_CODE } from '../../src/domain/initiationReview.js';
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

test('solution form submissions reject missing required fields before database writes', async () => {
  let connectionRequests = 0;
  const db = {
    async getConnection() {
      connectionRequests += 1;
      throw new Error('database connection must not be requested for invalid form data');
    }
  };
  const user = { id: 1 };

  await assert.rejects(
    submitSolutionDesignAnalysisForm(
      { projectId: 1, payload: { formData: {} }, user },
      db
    ),
    (error) => {
      assert.equal(error.code, SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING);
      assert.deepEqual(error.details, [
        'workpieceDescription',
        'operationProcessDescription',
        'projectTargetDescription'
      ]);
      return true;
    }
  );

  await assert.rejects(
    submitSolutionDesignReviewForm(
      {
        projectId: 1,
        nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
        payload: { formData: { meetingDate: ' ', implementationPlanItems: [], reviewConclusion: '' } },
        user
      },
      db
    ),
    (error) => {
      assert.equal(error.code, SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING);
      assert.deepEqual(error.details, ['meetingDate', 'reviewConclusion']);
      return true;
    }
  );

  assert.equal(connectionRequests, 0);
});

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
        id: 5,
        account: 'marketing_manager',
        displayName: '营销中心负责人',
        department: BUSINESS_DEPARTMENT.MARKETING_CENTER,
        organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER
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
    createStorageKey({ projectId, documentCode, revision, fileType = 'xlsx' }) {
      return `${projectId}/generated/${documentCode}/v${revision}-${written.length + cleaned.length + 1}.${fileType}`;
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

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64'
  );
}

function fakeOnlineFormImageStorage(files = {}) {
  const buffers = new Map(Object.entries(files).map(([key, value]) => [key, Buffer.from(value)]));
  return {
    files: buffers,
    async readFile(storageKey) {
      const buffer = buffers.get(storageKey);
      assert.ok(buffer, `Expected online form image ${storageKey}`);
      return Buffer.from(buffer);
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

function extractXlsxCellXml(buffer, cellRef) {
  const entries = readZipEntries(buffer);
  const sheetXml = entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml')?.data.toString('utf8') || '';
  const cellMatch = sheetXml.match(new RegExp(`<c\\b(?=[^>]*\\br="${cellRef}")[^>]*?(?:/>|>[\\s\\S]*?</c>)`));
  assert.ok(cellMatch, `Expected generated xlsx cell ${cellRef}`);
  return cellMatch[0];
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

function assertGeneratedXlsxCellUsesTextFont(storage, storageKey, cellRef, fontName) {
  const cellXml = extractXlsxCellXml(generatedFileBuffer(storage, storageKey), cellRef);
  assert.match(cellXml, new RegExp(`<rFont\\s+val="${fontName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.equal(cellXml.includes('Wingdings 2'), false, `${cellRef} should not use Wingdings 2 rich text`);
}

function assertGeneratedXlsxContainsImages(storage, storageKey) {
  const entries = readZipEntries(generatedFileBuffer(storage, storageKey));
  assert.ok(entries.some((entry) => entry.name.startsWith('xl/media/')), 'Expected generated xlsx media files');
  const drawingEntries = entries.filter((entry) => entry.name.startsWith('xl/drawings/') && entry.name.endsWith('.xml'));
  assert.ok(drawingEntries.length > 0, 'Expected generated xlsx drawing XML');
  assert.ok(
    drawingEntries.some((entry) => entry.data.toString('utf8').includes('<xdr:twoCellAnchor')),
    'Expected generated xlsx image anchor'
  );
}

function generatedXlsxSheetXml(storage, storageKey) {
  const entries = readZipEntries(generatedFileBuffer(storage, storageKey));
  return entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml')?.data.toString('utf8') || '';
}

function generatedXlsxDrawingXml(storage, storageKey) {
  const entries = readZipEntries(generatedFileBuffer(storage, storageKey));
  return entries
    .filter((entry) => entry.name.startsWith('xl/drawings/') && entry.name.endsWith('.xml'))
    .map((entry) => entry.data.toString('utf8'))
    .join('\n');
}

function assertGeneratedXlsxMergeCell(storage, storageKey, mergeRef, expected = true) {
  const sheetXml = generatedXlsxSheetXml(storage, storageKey);
  const present = new RegExp(`<mergeCell\\b[^>]*\\bref="${mergeRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(sheetXml);
  assert.equal(present, expected, `Expected mergeCell ${mergeRef} present=${expected}`);
}

function assertGeneratedXlsxHasImageAnchorFrom(storage, storageKey, { column = null, minColumn = null, row }) {
  const drawingXml = generatedXlsxDrawingXml(storage, storageKey).replace(/\s+/g, '');
  const columnPattern = column === null || column === undefined
    ? minColumn === null || minColumn === undefined
      ? '\\d+'
      : `(?:${Array.from({ length: 20 }, (_, index) => index + minColumn).join('|')})`
    : String(column);
  assert.match(
    drawingXml,
    new RegExp(`<xdr:from><xdr:col>${columnPattern}</xdr:col><xdr:colOff>\\d+</xdr:colOff><xdr:row>${row}</xdr:row>`),
    `Expected image anchor from column ${column ?? `>=${minColumn ?? 0}`}, row ${row}`
  );
}

function generatedDocxDocumentXml(storage, storageKey) {
  const entries = readZipEntries(generatedFileBuffer(storage, storageKey));
  return entries.find((entry) => entry.name === 'word/document.xml')?.data.toString('utf8') || '';
}

function extractDocxText(xml) {
  return decodeXmlText(
    [...String(xml || '').matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => match[1])
      .join('')
  );
}

function extractDocxTableRows(storage, storageKey) {
  const documentXml = generatedDocxDocumentXml(storage, storageKey);
  const tableMatch = documentXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  assert.ok(tableMatch, 'Expected generated docx table');
  return [...tableMatch[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((rowMatch) =>
    [...rowMatch[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((cellMatch) => extractDocxText(cellMatch[0]))
  );
}

function extractDocxParagraphXmls(xml) {
  return [...String(xml || '').matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => match[0]);
}

function extractDocxRunTexts(xml) {
  return [...String(xml || '').matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((match) => extractDocxText(match[0]));
}

function extractDocxTableCellXmls(storage, storageKey, rowIndex) {
  const documentXml = generatedDocxDocumentXml(storage, storageKey);
  const tableMatch = documentXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  assert.ok(tableMatch, 'Expected generated docx table');
  const rowXml = [...tableMatch[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)][rowIndex]?.[0];
  assert.ok(rowXml, `Expected generated docx table row ${rowIndex}`);
  return [...rowXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((match) => match[0]);
}

function assertGeneratedDocxCellSingleParagraph(cellXml, expectedText) {
  const paragraphs = extractDocxParagraphXmls(cellXml);
  assert.equal(paragraphs.length, 1, `Expected one Word paragraph in cell containing ${expectedText}`);
  assert.equal(extractDocxText(paragraphs[0]), expectedText);
}

function assertQuotationContactLineUsesPhoneUnderlineRun(storage, storageKey) {
  const documentXml = generatedDocxDocumentXml(storage, storageKey);
  const contactParagraph = extractDocxParagraphXmls(documentXml)
    .find((paragraphXml) => extractDocxText(paragraphXml).includes('联系人：'));
  assert.ok(contactParagraph, 'Expected quotation contact paragraph');
  const runTexts = extractDocxRunTexts(contactParagraph);
  const contactLabelIndex = runTexts.findIndex((text) => text === '联系人：');
  const phoneLabelIndex = runTexts.findIndex((text) => text === '电话');
  assert.ok(contactLabelIndex >= 0, 'Expected contact label run');
  assert.ok(phoneLabelIndex > contactLabelIndex, 'Expected phone label run after contact label');
  assert.match(runTexts[contactLabelIndex + 1] || '', /商务负责人/);
  assert.equal(runTexts[phoneLabelIndex], '电话');
  assert.doesNotMatch(runTexts[phoneLabelIndex], /023-12345678/);
  assert.match(runTexts[phoneLabelIndex + 1] || '', /023-12345678/);
}

function assertGeneratedDocxTextIncludes(storage, storageKey, expected) {
  const text = extractDocxText(generatedDocxDocumentXml(storage, storageKey));
  assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

function analysisFormPayload(overrides = {}) {
  return {
    formData: {
      workpieceDescription: '默认工件描述',
      operationProcessDescription: '默认作业工艺',
      projectTargetDescription: '默认目标说明',
      ...overrides
    }
  };
}

const reviewPlanSources = Object.freeze([
  { sourceType: 'requirement', sourceLabel: '需求', fieldKey: 'customerRequirements' },
  { sourceType: 'target', sourceLabel: '目标', fieldKey: 'projectTargetDescription' },
  { sourceType: 'risk', sourceLabel: '风险', fieldKey: 'technicalRisks' },
  { sourceType: 'suggestion', sourceLabel: '建议', fieldKey: 'solutionSuggestions' }
]);

function normalizeTestReviewLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTestReviewImplementationPlanItems(formData) {
  const legacyPlanTexts = normalizeTestReviewLines(formData.actionItems);
  let legacyIndex = 0;
  const items = [];
  for (const source of reviewPlanSources) {
    const sourceLines = normalizeTestReviewLines(formData[source.fieldKey]);
    for (const [index, sourceText] of sourceLines.entries()) {
      const sourceIndex = index + 1;
      const legacyPlanText = legacyPlanTexts[legacyIndex] || '';
      legacyIndex += 1;
      items.push({
        sourceType: source.sourceType,
        sourceLabel: source.sourceLabel,
        sourceIndex,
        sourceText,
        planText: legacyPlanText || `${source.sourceLabel}${sourceIndex}实施计划`
      });
    }
  }
  return items;
}

function reviewFormPayload(overrides = {}) {
  const formData = {
    meetingDate: '2026-07-08',
    projectTargetDescription: ['项目目标描述默认第一行'],
    technicalRisks: ['项目风险评估默认第一行'],
    solutionSuggestions: ['项目方案建议默认第一行'],
    actionItems: ['按评审意见完善方案'],
    reviewConclusion: '评审通过，进入下一节点',
    ...overrides
  };
  if (!Object.hasOwn(formData, 'implementationPlanItems')) {
    formData.implementationPlanItems = buildTestReviewImplementationPlanItems(formData);
  }
  return {
    formData
  };
}

function quotationFormPayload(overrides = {}) {
  const defaultItems = [
    {
      name: '机器人工作站',
      unit: '套',
      quantity: '2.125',
      unitPrice: '1000.12',
      amount: '999999.99',
      remark: '含安装调试'
    },
    {
      name: '视觉检测系统',
      unit: '套',
      quantity: '1',
      unitPrice: '3456.78',
      totalAmount: '1.00',
      totalAmountUppercase: '前端篡改大写金额',
      remark: ''
    }
  ];

  return {
    formData: {
      recipientName: '王客户',
      recipientTitle: '先生',
      contactName: '商务负责人',
      contactPhone: '023-12345678',
      quotationDate: '2026-07-13',
      items: defaultItems,
      ...overrides
    }
  };
}

function quotationFormPayloadWithItemCount(count) {
  return quotationFormPayload({
    items: Array.from({ length: count }, (_unused, index) => ({
      name: `动态明细${index + 1}`,
      unit: '项',
      quantity: index === 9 ? '1.2345' : '1',
      unitPrice: index === 9 ? '10.01' : `${100 + index}.00`,
      amount: '0.01',
      remark: `备注${index + 1}`
    }))
  });
}

const SOLUTION_DESIGN_STAGE_DOCUMENTS = Object.freeze([
  ['C04', '方案设计工作计划'],
  ['C05', '项目方案分析表'],
  ['C06', '产品功能框图'],
  ['C07', '3D模型'],
  ['C08', '布局图'],
  ['C09', '工艺时序图'],
  ['C10', '节拍表'],
  ['C11', '演示动画'],
  ['C12', '电气功能框图'],
  ['C13', '软件功能框图'],
  ['C14', '项目方案PPT'],
  ['C15', '内部方案评审记录表'],
  ['C16', '客户方案评审记录表'],
  ['C17', '成本估算表'],
  ['C18', '报价单'],
  ['C19', '投标书']
]);
const SOLUTION_DESIGN_LEGACY_STAGE_DOCUMENT_CODE_BY_TARGET_CODE = Object.freeze({
  C04: '2.1',
  C05: '2.2',
  C06: '2.3',
  C07: '2.4',
  C08: '2.5',
  C09: '2.6',
  C10: '2.7',
  C11: '2.8',
  C12: '2.9',
  C13: '2.10',
  C14: '2.11',
  C15: '2.12',
  C16: '2.13',
  C17: '2.14',
  C18: '2.15'
});

function buildProjectStages(projectId = 100, currentStageOrder = 2) {
  return [
    ['initiation', '立项阶段', 'completed', 0],
    ['solution', '方案设计阶段', 'current', 1],
    ['contract', '合同签订阶段', 'not_started', 0],
    ['detailedDesign', '详细设计阶段', 'not_started', 0],
    ['manufacturing', '生产制作阶段', 'not_started', 0],
    ['preAcceptance', '预验收阶段', 'not_started', 0],
    ['finalAcceptance', '终验收阶段', 'not_started', 0],
    ['closeout', '结题阶段', 'not_started', 0]
  ].map(([stageKey, stageName], index) => {
    const stageOrder = index + 1;
    const isCurrent = stageOrder === currentStageOrder ? 1 : 0;
    const stageStatus = stageOrder < currentStageOrder
      ? 'completed'
      : stageOrder === currentStageOrder
        ? 'current'
        : 'not_started';
    return {
    id: 200 + index + 1,
    project_id: projectId,
    stage_order: stageOrder,
    stage_key: stageKey,
    stage_name: stageName,
    stage_status: stageStatus,
    is_current: isCurrent,
    started_at: isCurrent ? '2026-07-08 09:00:00' : null,
    completed_at: stageOrder < currentStageOrder ? '2026-07-08 08:00:00' : null,
    created_at: '2026-07-08 08:00:00',
    updated_at: '2026-07-08 08:00:00'
  };
  });
}

function buildSolutionDesignStageDocuments(projectId = 100) {
  return SOLUTION_DESIGN_STAGE_DOCUMENTS.map(([documentCode, documentName], index) => ({
    id: 400 + index + 1,
    project_id: projectId,
    template_id: 1000 + index,
    template_version: 'v20260629',
    stage_order: 2,
    stage_key: 'solution',
    stage_name: '方案设计阶段',
    document_code: documentCode,
    document_order: index + 1,
    document_name: documentName,
    is_required: 1,
    default_responsibility_role: null,
    confirm_role: null,
    owner_department: BUSINESS_DEPARTMENT.RD_CENTER,
    review_department: BUSINESS_DEPARTMENT.RD_CENTER,
    completion_mode: COMPLETION_MODE.APPROVAL_REQUIRED,
    submit_mode: 'upload',
    target_folder_path: null,
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

function seedOnlineFormImage(connection, {
  documentCode = 'C05',
  fieldKey,
  storageKey,
  originalFileName = `${fieldKey}.png`,
  uploadedByUserId = 12
}) {
  const document = connection.stageDocuments.find((candidate) => candidate.document_code === documentCode);
  assert.ok(document, `Expected stage document ${documentCode}`);
  const image = {
    id: connection.nextFormImageId++,
    project_id: document.project_id,
    stage_document_id: document.id,
    field_key: fieldKey,
    original_file_name: originalFileName,
    storage_key: storageKey,
    mime_type: 'image/png',
    file_size: tinyPngBuffer().length,
    content_sha256: `hash-${fieldKey}`,
    uploaded_by_user_id: uploadedByUserId,
    uploaded_at: '2026-07-08 10:25:00',
    deleted_at: null,
    deleted_by_user_id: null
  };
  connection.formImages.push(image);
  return image;
}

function useLegacySolutionDesignStageDocumentCodes(connection) {
  for (const document of connection.stageDocuments) {
    document.document_code =
      SOLUTION_DESIGN_LEGACY_STAGE_DOCUMENT_CODE_BY_TARGET_CODE[document.document_code] || document.document_code;
  }
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

async function uploadProductFunctionDiagram(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  return uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
      file: testUploadFile('产品功能框图.png'),
      user: technicalOwner
    },
    db,
    storage
  );
}

async function submitAnalysisNodeForReview(db, storage = fakeUploadStorage()) {
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateAnalysisNode(db, storage);
  await uploadProductFunctionDiagram(db, storage);
  return submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload(),
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

  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.submitted, true);
  return getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
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
  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.submitted, true);
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

async function activateMarketingCostNode(db, storage = fakeUploadStorage()) {
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

async function submitMarketingCostForReview(db, storage = fakeUploadStorage()) {
  const businessOwner = authUser(db.connection.users.get(13));
  await activateMarketingCostNode(db, storage);
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION,
      file: testUploadFile('营销中心成本估算表.xlsx'),
      user: businessOwner
    },
    db,
    storage
  );
  return submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: businessOwner
    },
    db
  );
}

async function activateFinanceCostNode(db, storage = fakeUploadStorage()) {
  const marketingManager = authUser(db.connection.users.get(5));
  await submitMarketingCostForReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: marketingManager
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

async function activateQuotationOrTenderNode(
  db,
  storage = fakeUploadStorage(),
  branchType = SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
) {
  const generalManager = authUser(db.connection.users.get(30));
  await submitFinanceCostForGeneralReview(db, storage);
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      payload: { branchType },
      user: generalManager
    },
    db
  );
  return storage;
}

async function activateLegacyUnselectedQuotationOrTenderNode(db, storage = fakeUploadStorage()) {
  await submitFinanceCostForGeneralReview(db, storage);
  const financeNode = db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST);
  const quotationTenderNode = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
  );
  financeNode.status = SOLUTION_DESIGN_NODE_STATUS.APPROVED;
  financeNode.approved_at = '2026-07-08 10:25:00';
  quotationTenderNode.status = SOLUTION_DESIGN_NODE_STATUS.PENDING;
  quotationTenderNode.activated_at = quotationTenderNode.activated_at || '2026-07-08 10:25:00';
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
  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);
  return submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload(),
      user: businessOwner
    },
    db
  );
}

async function submitTenderForReview(db, storage = fakeUploadStorage()) {
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
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

async function assertStageAdvanceBlocked(db, user, expectedDocumentCodes) {
  await assert.rejects(
    () => advanceProjectStage(100, user, db),
    (error) => {
      assert.equal(error.code, 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE');
      const documents = error.details?.incompleteRequiredDocuments || [];
      const codes = documents.map((document) => document.documentCode);
      for (const expectedCode of expectedDocumentCodes) {
        assert.ok(codes.includes(expectedCode), `Expected ${expectedCode} to block stage advance`);
      }
      return true;
    }
  );
}

function closeoutStageDocument(projectId = 100) {
  return {
    id: 9001,
    project_id: projectId,
    template_id: 9001,
    template_version: 'v20260629',
    stage_order: 8,
    stage_key: 'closeout',
    stage_name: '结题阶段',
    document_code: '8.1',
    document_order: 1,
    document_name: '结题报告',
    is_required: 1,
    default_responsibility_role: null,
    confirm_role: null,
    owner_department: BUSINESS_DEPARTMENT.RD_CENTER,
    review_department: BUSINESS_DEPARTMENT.RD_CENTER,
    completion_mode: COMPLETION_MODE.APPROVAL_REQUIRED,
    submit_mode: 'upload',
    target_folder_path: null,
    target_folder_id: null,
    status: DOCUMENT_STATUS.CONFIRMED,
    is_applicable: 1,
    revision_required: 0,
    revision_reason: null,
    revision_source_document_id: null,
    revision_requested_at: null,
    revision_resubmitted_by_user_id: null,
    revision_resubmitted_at: null
  };
}

function buildNavigationWorkspaceFromConnection(connection) {
  const currentStage = connection.stages.find((stage) => Boolean(stage.is_current));
  return {
    project: {
      projectName: connection.project.project_name,
      projectCode: connection.project.project_code,
      projectMode: connection.project.project_mode || null,
      status: connection.project.status
    },
    currentStage: currentStage
      ? {
          stageKey: currentStage.stage_key,
          stageOrder: currentStage.stage_order,
          stageName: currentStage.stage_name
        }
      : null,
    stages: connection.stages.map((stage) => ({
      stageId: stage.id,
      stageOrder: stage.stage_order,
      stageKey: stage.stage_key,
      stageName: stage.stage_name,
      stageStatus: stage.stage_status,
      isCurrent: Boolean(stage.is_current),
      configured: true,
      nodes: stage.stage_key === 'contract'
        ? [
            {
              nodeKey: 'contract_preparation',
              nodeName: '准备协议和合同',
              nodeStatus: 'pending',
              outputs: []
            },
            {
              nodeKey: 'project_kickoff_notice',
              nodeName: '项目启动通知',
              nodeStatus: 'process_node',
              outputs: []
            }
          ]
        : []
    }))
  };
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
  constructor(options = {}) {
    const {
      project = baseProject(),
      users = baseUsers(),
      visible = true,
      quotationSubmittedAt = '2026-07-08 10:40:00'
    } = options;
    this.project = { ...project };
    this.users = users;
    this.visible = visible;
    this.quotationSubmittedAt = quotationSubmittedAt;
    this.rolesRow = null;
    this.nodes = [];
    this.uploadSlots = [];
    this.uploadFiles = [];
    this.contractNodes = [];
    this.contractUploadSlots = [];
    this.contractPaymentFlows = [];
    this.analysisForms = [];
    this.reviewForms = [];
    this.quotationForms = [];
    this.formImages = [];
    this.quotationTenderFlow = null;
    this.stages = buildProjectStages(this.project.id, Number(this.project.current_stage_order ?? 2));
    this.stageDocuments = buildSolutionDesignStageDocuments(this.project.id);
    this.roleHistory = [];
    this.operationLogs = [];
    this.nodeInsertCount = 0;
    this.uploadSlotInsertCount = 0;
    this.contractNodeInsertCount = 0;
    this.contractUploadSlotInsertCount = 0;
    this.contractPaymentFlowInsertCount = 0;
    this.projectMaterializationLockCount = 0;
    this.nextUploadFileId = 1;
    this.nextAnalysisFormId = 1;
    this.nextReviewFormId = 1;
    this.nextQuotationFormId = 1;
    this.nextFormImageId = 1;
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
    const currentStage = this.stages.find((stage) => stage.is_current === 1);
    return {
      ...this.project,
      current_stage_id: currentStage?.id ?? this.project.current_stage_id,
      current_stage_order: currentStage?.stage_order ?? this.project.current_stage_order,
      current_stage_key: currentStage?.stage_key ?? this.project.current_stage_key,
      current_stage_name: currentStage?.stage_name ?? this.project.current_stage_name,
      current_stage_status: currentStage?.stage_status ?? this.project.current_stage_status,
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

  currentQuotationForm() {
    return this.quotationForms.find((form) => form.is_current === 1) || null;
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

  quotationFormRowWithUsers(form) {
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
        const exemptedBy = slot.exempted_by_user_id ? this.users.get(Number(slot.exempted_by_user_id)) : null;

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
          exempted_by_account: exemptedBy?.account ?? null,
          exempted_by_display_name: exemptedBy?.display_name ?? null
        };
      });
  }

  async execute(sql, params = []) {
    const text = normalizeSql(sql);

    if (text.startsWith('SELECT id FROM projects WHERE id = ?')) {
      this.projectMaterializationLockCount += 1;
      return Number(params[0]) === Number(this.project.id) ? [[{ id: this.project.id }]] : [[]];
    }

    if (text.startsWith('SELECT *, 0 AS has_department_responsible FROM projects')) {
      return [[{ ...this.project, has_department_responsible: 0 }]];
    }

    if (text.startsWith('SELECT p.*, u.id AS created_by_user_id')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id,') && text.includes('LEFT JOIN users pm')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id, s.stage_key AS current_stage_key')) {
      return [[this.projectContextRow()]];
    }

    if (text.startsWith('SELECT p.id FROM projects p WHERE p.id = ?')) {
      return [this.visible ? [{ id: params[0] }] : []];
    }

    if (
      text.startsWith('SELECT p.project_manager_user_id') &&
      text.includes('FROM projects p') &&
      text.includes('LEFT JOIN project_solution_design_roles r')
    ) {
      return [[{
        project_manager_user_id: this.project.project_manager_user_id,
        technical_owner_user_id: this.rolesRow?.technical_owner_user_id ?? null,
        business_owner_user_id: this.rolesRow?.business_owner_user_id ?? null,
        procurement_owner_user_id: this.rolesRow?.procurement_owner_user_id ?? null,
        finance_accountant_user_id: this.rolesRow?.finance_accountant_user_id ?? null,
        finance_owner_user_id: this.rolesRow?.finance_owner_user_id ?? null
      }]];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_roles')) {
      return [this.rolesRow ? [{ ...this.rolesRow }] : []];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_quotation_tender_flows')) {
      return [this.quotationTenderFlow ? [{ ...this.quotationTenderFlow }] : []];
    }

    if (text.startsWith('SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC')) {
      const [projectId] = params;
      return [
        this.stages
          .filter((stage) => stage.project_id === projectId)
          .sort((left, right) => left.stage_order - right.stage_order)
          .map((stage) => ({ ...stage }))
      ];
    }

    if (text.startsWith('SELECT id, project_id') && text.includes('FROM project_stages')) {
      const projectIds = new Set(params.map(Number));
      return [
        this.stages
          .filter((stage) => projectIds.has(Number(stage.project_id)))
          .sort((left, right) => left.project_id - right.project_id || left.stage_order - right.stage_order)
          .map((stage) => ({ ...stage }))
      ];
    }

    if (text.startsWith('SELECT node_key, status FROM project_solution_design_nodes')) {
      const [projectId, nodeKey] = params;
      return [
        this.nodes
          .filter((node) => node.project_id === projectId && node.node_key === nodeKey)
          .map((node) => ({ node_key: node.node_key, status: node.status }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_nodes') && text.includes('AND node_key = ?')) {
      const [projectId, nodeKey] = params;
      return [
        this.nodes
          .filter((node) => node.project_id === projectId && node.node_key === nodeKey)
          .map((node) => ({ ...node }))
      ];
    }

    if (text.startsWith('SELECT node_key FROM project_solution_design_nodes')) {
      const [projectId] = params;
      return [
        this.nodes
          .filter((node) => Number(node.project_id) === Number(projectId))
          .map((node) => ({ node_key: node.node_key }))
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

    if (text.startsWith('SELECT node_key FROM project_contract_signing_nodes')) {
      const [projectId] = params;
      return [
        this.contractNodes
          .filter((node) => Number(node.project_id) === Number(projectId))
          .map((node) => ({ node_key: node.node_key }))
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
        activated_at: text.includes('CURRENT_TIMESTAMP') ? '2026-07-08 10:00:00' : null,
        submitted_at: null,
        approved_at: null,
        returned_at: null,
        created_at: '2026-07-08 10:00:00',
        updated_at: '2026-07-08 10:00:00'
      });
      this.contractNodeInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT slot_key FROM project_contract_signing_upload_slots')) {
      const [projectId] = params;
      return [
        this.contractUploadSlots
          .filter((slot) => Number(slot.project_id) === Number(projectId))
          .map((slot) => ({ slot_key: slot.slot_key }))
      ];
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
        confirmed_at: null,
        created_at: '2026-07-08 10:00:00',
        updated_at: '2026-07-08 10:00:00'
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
        approved_at: null,
        created_at: '2026-07-08 10:00:00',
        updated_at: '2026-07-08 10:00:00'
      });
      this.contractPaymentFlowInsertCount += 1;
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('SELECT s.*, f.id AS current_file_id')) {
      return [this.uploadSlotRowsWithCurrentFiles()];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_analysis_forms')) {
      return [this.analysisForms.filter((form) => form.is_current === 1).map((form) => ({ ...form }))];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_review_forms')) {
      return [
        this.reviewForms
          .filter((form) => form.is_current === 1)
          .sort((left, right) => left.node_key.localeCompare(right.node_key))
          .map((form) => ({ ...form }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_solution_design_quotation_forms')) {
      if (text.includes('WHERE project_id IN')) {
        const projectIds = new Set(params.map(Number));
        return [
          this.quotationForms
            .filter((form) => projectIds.has(Number(form.project_id)) && form.is_current === 1)
            .map((form) => ({ ...form }))
        ];
      }

      return [
        this.quotationForms
          .filter((form) => form.is_current === 1)
          .map((form) => ({ ...form }))
      ];
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

    if (
      text.startsWith('SELECT f.*, submitter.account AS submitted_by_account') &&
      text.includes('FROM project_solution_design_quotation_forms')
    ) {
      const currentForm = this.currentQuotationForm();
      return [currentForm ? [this.quotationFormRowWithUsers(currentForm)] : []];
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

    if (
      text.startsWith('SELECT COALESCE(MAX(revision), 0) AS max_revision') &&
      text.includes('FROM project_solution_design_quotation_forms')
    ) {
      const [projectId] = params;
      const maxRevision = this.quotationForms
        .filter((form) => form.project_id === projectId)
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

    if (text.startsWith('SELECT slot_key FROM project_solution_design_upload_slots')) {
      const [projectId] = params;
      return [
        this.uploadSlots
          .filter((slot) => Number(slot.project_id) === Number(projectId))
          .map((slot) => ({ slot_key: slot.slot_key }))
      ];
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
        is_upload_exempted: 0,
        exemption_reason: null,
        exempted_by_user_id: null,
        exempted_at: null,
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

    if (
      text.startsWith('SELECT d.*, u.department AS responsible_department') &&
      text.includes('FROM project_stage_documents d')
    ) {
      const [projectId, documentCodeOrId] = params;
      const matchesDocumentId = text.includes('AND d.id = ?');
      return [
        this.stageDocuments
          .filter((document) =>
            document.project_id === projectId &&
            (matchesDocumentId
              ? Number(document.id) === Number(documentCodeOrId)
              : document.document_code === documentCodeOrId)
          )
          .map((document) => ({
            ...document,
            responsible_department: BUSINESS_DEPARTMENT.RD_CENTER,
            responsible_organization_role: ORGANIZATION_ROLE.EMPLOYEE,
            responsible_role: '员工',
            responsible_is_enabled: 1
          }))
      ];
    }

    if (
      text.startsWith('SELECT d.id, d.project_id') &&
      text.includes('FROM project_stage_documents d') &&
      text.includes('INNER JOIN projects p') &&
      text.includes('d.responsible_user_id = ?')
    ) {
      const [userId, excludedProjectStatus, ...excludedDocumentCodes] = params;
      return [
        this.stageDocuments
          .filter(
            (document) =>
              Number(document.responsible_user_id) === Number(userId) &&
              this.project.status !== excludedProjectStatus &&
              !excludedDocumentCodes.includes(document.document_code)
          )
          .sort((left, right) => left.project_id - right.project_id || left.stage_order - right.stage_order || left.document_order - right.document_order)
          .map((document) => ({ ...document }))
      ];
    }

    if (
      text.startsWith('SELECT d.id, d.project_id') &&
      text.includes('FROM project_stage_documents d') &&
      text.includes('WHERE d.project_id IN')
    ) {
      const projectIds = new Set(params.map(Number));
      return [
        this.stageDocuments
          .filter((document) => projectIds.has(Number(document.project_id)))
          .sort((left, right) => left.project_id - right.project_id || left.stage_order - right.stage_order || left.document_order - right.document_order)
          .map((document) => ({ ...document }))
      ];
    }

    if (text.startsWith('SELECT d.id, d.project_id') && text.includes('FROM project_stage_documents d')) {
      const [projectId, stageOrder] = params;
      return [
        this.stageDocuments
          .filter((document) => document.project_id === projectId && document.stage_order === stageOrder)
          .sort((left, right) => left.document_order - right.document_order)
          .map((document) => ({ ...document }))
      ];
    }

    if (text.startsWith('SELECT i.*, u.account AS uploaded_by_account')) {
      if (text.includes('WHERE i.id = ?')) {
        const [imageId] = params;
        const image = this.formImages.find((candidate) => candidate.id === imageId);
        if (!image) {
          return [[]];
        }
        const uploader = this.users.get(Number(image.uploaded_by_user_id));
        return [[{
          ...image,
          uploaded_by_account: uploader?.account ?? null,
          uploaded_by_display_name: uploader?.display_name ?? null
        }]];
      }

      const [projectId, documentId] = params;
      return [
        this.formImages
          .filter((image) => image.project_id === projectId && image.stage_document_id === documentId && !image.deleted_at)
          .sort((left, right) => left.field_key.localeCompare(right.field_key) || String(left.uploaded_at).localeCompare(String(right.uploaded_at)) || left.id - right.id)
          .map((image) => {
            const uploader = this.users.get(Number(image.uploaded_by_user_id));
            return {
              ...image,
              uploaded_by_account: uploader?.account ?? null,
              uploaded_by_display_name: uploader?.display_name ?? null
            };
          })
      ];
    }

    if (text.startsWith('SELECT * FROM project_stage_document_form_images') && text.includes('AND id = ?')) {
      const [projectId, documentId, imageId] = params;
      return [
        this.formImages
          .filter(
            (image) =>
              image.project_id === projectId &&
              image.stage_document_id === documentId &&
              image.id === imageId &&
              !image.deleted_at
          )
          .map((image) => ({ ...image }))
      ];
    }

    if (text.startsWith('SELECT * FROM project_stage_document_form_images')) {
      const [projectId, documentId] = params;
      return [
        this.formImages
          .filter((image) => image.project_id === projectId && image.stage_document_id === documentId && !image.deleted_at)
          .sort((left, right) => left.field_key.localeCompare(right.field_key) || String(left.uploaded_at).localeCompare(String(right.uploaded_at)) || left.id - right.id)
          .map((image) => ({ ...image }))
      ];
    }

    if (text.startsWith('SELECT id FROM project_stage_document_form_images')) {
      const [projectId, documentId, fieldKey] = params;
      return [
        this.formImages
          .filter(
            (image) =>
              image.project_id === projectId &&
              image.stage_document_id === documentId &&
              image.field_key === fieldKey &&
              !image.deleted_at
          )
          .sort((left, right) => String(left.uploaded_at).localeCompare(String(right.uploaded_at)) || left.id - right.id)
          .map((image) => ({ id: image.id }))
      ];
    }

    if (text.startsWith('INSERT INTO project_stage_document_form_images')) {
      const [
        projectId,
        documentId,
        fieldKey,
        originalFileName,
        storageKey,
        mimeType,
        fileSize,
        contentHash,
        uploadedByUserId
      ] = params;
      const image = {
        id: this.nextFormImageId++,
        project_id: projectId,
        stage_document_id: documentId,
        field_key: fieldKey,
        original_file_name: originalFileName,
        storage_key: storageKey,
        mime_type: mimeType,
        file_size: fileSize,
        content_sha256: contentHash,
        uploaded_by_user_id: uploadedByUserId,
        uploaded_at: '2026-07-08 10:45:00',
        deleted_at: null,
        deleted_by_user_id: null
      };
      this.formImages.push(image);
      return [{ affectedRows: 1, insertId: image.id }];
    }

    if (text.startsWith('UPDATE project_stage_document_form_images')) {
      const [deletedByUserId, imageId] = params;
      const image = this.formImages.find((candidate) => candidate.id === imageId && !candidate.deleted_at);
      if (image) {
        image.deleted_by_user_id = deletedByUserId;
        image.deleted_at = '2026-07-08 10:46:00';
      }
      return [{ affectedRows: image ? 1 : 0 }];
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
      text.includes('SET is_upload_exempted = 1')
    ) {
      const [reason, exemptedByUserId, projectId, slotKey] = params;
      const slot = this.uploadSlots.find(
        (candidate) =>
          candidate.project_id === projectId &&
          candidate.slot_key === slotKey &&
          Number(candidate.is_upload_exempted ?? 0) === 0
      );
      if (slot) {
        slot.is_upload_exempted = 1;
        slot.exemption_reason = reason;
        slot.exempted_by_user_id = exemptedByUserId;
        slot.exempted_at = '2026-07-08 10:15:00';
        slot.updated_at = '2026-07-08 10:15:00';
      }
      return [{ affectedRows: slot ? 1 : 0 }];
    }

    if (
      text.startsWith('UPDATE project_solution_design_upload_slots') &&
      text.includes('SET is_upload_exempted = 0') &&
      text.includes('AND is_upload_exempted = 1')
    ) {
      const [projectId, slotKey] = params;
      const slot = this.uploadSlots.find(
        (candidate) =>
          candidate.project_id === projectId &&
          candidate.slot_key === slotKey &&
          Number(candidate.is_upload_exempted ?? 0) === 1
      );
      if (slot) {
        slot.is_upload_exempted = 0;
        slot.exemption_reason = null;
        slot.exempted_by_user_id = null;
        slot.exempted_at = null;
        slot.updated_at = '2026-07-08 10:15:00';
      }
      return [{ affectedRows: slot ? 1 : 0 }];
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
        slot.is_upload_exempted = 0;
        slot.exemption_reason = null;
        slot.exempted_by_user_id = null;
        slot.exempted_at = null;
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

    if (
      text.startsWith('UPDATE project_solution_design_analysis_forms SET generated_file_status = ?') &&
      text.includes('WHERE project_id = ? AND is_current = 1')
    ) {
      const [generatedFileStatus, templateName, updatedByUserId, projectId, excludedStatus] = params;
      let affectedRows = 0;
      for (const form of this.analysisForms) {
        if (
          form.project_id === projectId &&
          form.is_current === 1 &&
          form.generated_file_status !== excludedStatus
        ) {
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = null;
          form.generated_file_name = null;
          form.generated_file_mime_type = null;
          form.generated_file_size = null;
          form.generated_file_template_name = templateName;
          form.generated_at = null;
          form.generated_by_user_id = null;
          form.generation_error_message = null;
          form.updated_by_user_id = updatedByUserId;
          form.updated_at = '2026-07-08 10:47:00';
          affectedRows += 1;
        }
      }
      return [{ affectedRows }];
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

    if (text.startsWith('UPDATE project_solution_design_quotation_forms SET is_current = 0')) {
      const [projectId] = params;
      for (const form of this.quotationForms) {
        if (form.project_id === projectId && form.is_current === 1) {
          form.is_current = 0;
          form.updated_at = '2026-07-08 10:40:00';
        }
      }
      return [{ affectedRows: 1 }];
    }

    if (text.startsWith('INSERT INTO project_solution_design_quotation_forms')) {
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
        id: this.nextQuotationFormId++,
        project_id: projectId,
        node_key: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
        revision,
        form_status: formStatus,
        form_data_json: formDataJson,
        is_current: 1,
        submitted_by_user_id: submittedByUserId,
        submitted_at: text.includes('CURRENT_TIMESTAMP') ? this.quotationSubmittedAt : null,
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
        created_at: '2026-07-08 10:40:00',
        updated_at: '2026-07-08 10:40:00'
      };
      this.quotationForms.push(form);
      return [{ affectedRows: 1, insertId: form.id }];
    }

    if (text.startsWith('UPDATE project_solution_design_quotation_forms SET form_status = ?')) {
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
      const form = this.quotationForms.find((candidate) => candidate.id === formId);
      if (form) {
        form.form_status = formStatus;
        form.form_data_json = formDataJson;
        form.submitted_by_user_id = submittedByUserId;
        form.submitted_at = text.includes('CURRENT_TIMESTAMP') ? this.quotationSubmittedAt : null;
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
        form.updated_at = '2026-07-08 10:40:00';
      }
      return [{ affectedRows: form ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_solution_design_quotation_forms SET generated_file_status = ?')) {
      const isGenerated = text.includes('generated_file_storage_key = ?');
      const hasFailedFormStatus = !isGenerated && text.includes('form_status = ?');
      const resolvedFormId = isGenerated
        ? params[8]
        : hasFailedFormStatus
          ? params[6]
          : params[5];
      const form = this.quotationForms.find((candidate) => candidate.id === resolvedFormId);
      if (form) {
        if (isGenerated) {
          const [
            generatedFileStatus,
            storageKey,
            fileName,
            mimeType,
            fileSize,
            templateName,
            generatedByUserId,
            updatedByUserId
          ] = params;
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = storageKey;
          form.generated_file_name = fileName;
          form.generated_file_mime_type = mimeType;
          form.generated_file_size = fileSize;
          form.generated_file_template_name = templateName;
          form.generated_at = '2026-07-08 10:41:00';
          form.generated_by_user_id = generatedByUserId;
          form.generation_error_message = null;
          form.updated_by_user_id = updatedByUserId;
        } else if (hasFailedFormStatus) {
          const [
            generatedFileStatus,
            formStatus,
            templateName,
            generatedByUserId,
            errorMessage,
            updatedByUserId
          ] = params;
          form.form_status = formStatus;
          form.submitted_by_user_id = null;
          form.submitted_at = null;
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = null;
          form.generated_file_name = null;
          form.generated_file_mime_type = null;
          form.generated_file_size = null;
          form.generated_file_template_name = templateName;
          form.generated_at = '2026-07-08 10:41:00';
          form.generated_by_user_id = generatedByUserId;
          form.generation_error_message = errorMessage;
          form.updated_by_user_id = updatedByUserId;
        } else {
          const [
            generatedFileStatus,
            templateName,
            generatedByUserId,
            errorMessage,
            updatedByUserId
          ] = params;
          form.generated_file_status = generatedFileStatus;
          form.generated_file_storage_key = null;
          form.generated_file_name = null;
          form.generated_file_mime_type = null;
          form.generated_file_size = null;
          form.generated_file_template_name = templateName;
          form.generated_at = '2026-07-08 10:41:00';
          form.generated_by_user_id = generatedByUserId;
          form.generation_error_message = errorMessage;
          form.updated_by_user_id = updatedByUserId;
        }
        form.updated_at = '2026-07-08 10:41:00';
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

    if (text.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 0')) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => candidate.id === stageId);
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 0;
        stage.completed_at = '2026-07-08 11:00:00';
        stage.updated_at = '2026-07-08 11:00:00';
      }
      return [{ affectedRows: stage ? 1 : 0 }];
    }

    if (text.startsWith('UPDATE project_stages SET stage_status = ?, is_current = 1')) {
      const [stageStatus, stageId] = params;
      const stage = this.stages.find((candidate) => candidate.id === stageId);
      if (stage) {
        stage.stage_status = stageStatus;
        stage.is_current = 1;
        stage.started_at = '2026-07-08 11:00:00';
        stage.updated_at = '2026-07-08 11:00:00';
        Object.assign(this.project, {
          current_stage_id: stage.id,
          current_stage_order: stage.stage_order,
          current_stage_key: stage.stage_key,
          current_stage_name: stage.stage_name,
          current_stage_status: stage.stage_status
        });
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
    onlineFormImageStorage: options.onlineFormImageStorage || fakeOnlineFormImageStorage(),
    async getConnection() {
      return connection;
    }
  };
}

async function withFakePoolConnection(connection, callback) {
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async () => connection;
  try {
    return await callback();
  } finally {
    pool.getConnection = originalGetConnection;
  }
}

test('visible project users can query workflow and lazy initialization is idempotent', async () => {
  const db = fakeDb();
  const requester = authUser(db.connection.users.get(10));

  const first = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);
  assert.equal(db.connection.projectMaterializationLockCount, 1);
  const second = await getSolutionDesignWorkflow({ projectId: 100, user: requester }, db);

  assert.equal(first.projectId, 100);
  assert.equal(first.permissions.canViewWorkflow, true);
  assert.equal(first.nodes.length, SOLUTION_DESIGN_NODES.length);
  assert.deepEqual(
    first.nodes.map((node) => node.nodeKey),
    SOLUTION_DESIGN_NODES.map((node) => node.nodeKey)
  );
  assert.equal(first.nodes[0].status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(first.nodes[1].status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);
  assert.equal(second.nodes.length, SOLUTION_DESIGN_NODES.length);
  assert.equal(db.connection.nodes.length, SOLUTION_DESIGN_NODES.length);
  assert.equal(db.connection.uploadSlots.length, SOLUTION_DESIGN_UPLOAD_SLOTS.length);
  assert.equal(db.connection.nodeInsertCount, SOLUTION_DESIGN_NODES.length);
  assert.equal(db.connection.uploadSlotInsertCount, SOLUTION_DESIGN_UPLOAD_SLOTS.length);
  assert.equal(db.connection.projectMaterializationLockCount, 1);
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
  assert.equal(db.connection.nodes.length, SOLUTION_DESIGN_NODES.length);
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

  assert.equal(workflow.nodes.length, SOLUTION_DESIGN_NODES.length);
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
    },
    {
      name: 'procurement owner outside manufacturing center',
      payload: rolePayload({ procurementOwnerUserId: 13 }),
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

test('procurement owner accepts manufacturing center users', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(1));

  const workflow = await assignSolutionDesignRoles(
    {
      projectId: 100,
      payload: rolePayload({ procurementOwnerUserId: 14 }),
      user: actor
    },
    db
  );

  assert.equal(workflow.roles.procurement_owner.userId, 14);
});

test('project manager accepts enabled global users except system administrators', async () => {
  for (const projectManagerUserId of [3, 18, 30]) {
    const db = fakeDb();
    const actor = authUser(db.connection.users.get(1));
    const workflow = await assignSolutionDesignRoles(
      { projectId: 100, payload: rolePayload({ projectManagerUserId }), user: actor },
      db
    );

    assert.equal(workflow.roles.project_manager.userId, projectManagerUserId);
  }

  for (const projectManagerUserId of [4, 17]) {
    const db = fakeDb();
    const actor = authUser(db.connection.users.get(1));

    await assert.rejects(
      () => assignSolutionDesignRoles(
        { projectId: 100, payload: rolePayload({ projectManagerUserId }), user: actor },
        db
      ),
      (error) => error.code === SOLUTION_DESIGN_ERROR.PROJECT_MANAGER_INVALID
    );
  }
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

test('slot upload revision catches up to the current node revision before incrementing replacements', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));
  await getSolutionDesignWorkflow({ projectId: 100, user: projectManager }, db);
  const preparationNode = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.PREPARATION
  );
  preparationNode.current_revision = 4;

  const first = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划-r4.docx'),
      user: projectManager
    },
    db,
    storage
  );
  const second = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN,
      file: testUploadFile('方案设计工作计划-r4-v2.docx'),
      user: projectManager
    },
    db,
    storage
  );

  assert.equal(first.file.revision, 4);
  assert.equal(second.file.revision, 5);
  assert.equal(
    db.connection.uploadSlots.find((slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.WORK_PLAN).revision,
    5
  );
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
  const db = fakeDb({
    onlineFormImageStorage: fakeOnlineFormImageStorage({
      'analysis/site.png': tinyPngBuffer(),
      'analysis/workpiece.png': tinyPngBuffer(),
      'analysis/process.png': tinyPngBuffer(),
      'analysis/target.png': tinyPngBuffer()
    })
  });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, storage);
  seedOnlineFormImage(db.connection, {
    fieldKey: 'siteConditionImages',
    storageKey: 'analysis/site.png',
    originalFileName: 'site.png'
  });
  seedOnlineFormImage(db.connection, {
    fieldKey: 'workpieceImages',
    storageKey: 'analysis/workpiece.png',
    originalFileName: 'workpiece.png'
  });
  seedOnlineFormImage(db.connection, {
    fieldKey: 'operationProcessImages',
    storageKey: 'analysis/process.png',
    originalFileName: 'process.png'
  });
  seedOnlineFormImage(db.connection, {
    fieldKey: 'projectTargetImages',
    storageKey: 'analysis/target.png',
    originalFileName: 'target.png'
  });
  const initial = await getSolutionDesignAnalysisForm({ projectId: 100, user: technicalOwner }, db);
  assert.equal(initial.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(initial.permissions.canEdit, true);
  assert.equal(initial.permissions.canEditForm, true);
  assert.equal(initial.permissions.canSubmitForm, true);
  assert.equal(initial.permissions.canSubmitNode, false);
  assert.ok(initial.stageDocumentId);
  assert.deepEqual(
    initial.images.map((image) => image.fieldKey).sort(),
    ['operationProcessImages', 'projectTargetImages', 'siteConditionImages', 'workpieceImages']
  );

  const saved = await saveSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        customerRequirements: '旧客户需求草稿',
        technicalRisks: '旧技术风险草稿',
        solutionScope: '旧方案范围草稿',
        workpieceDescription: '草稿工件描述'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(saved.form.status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(saved.form.revision, 1);
  assert.equal(saved.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);
  assert.equal(saved.form.formData.workpieceDescription, '草稿工件描述');
  assert.equal(Object.hasOwn(saved.form.formData, 'customerRequirements'), false);
  assert.equal(Object.hasOwn(saved.form.formData, 'technicalRisks'), false);
  assert.equal(Object.hasOwn(saved.form.formData, 'solutionScope'), false);

  await uploadProductFunctionDiagram(db, storage);

  const submitted = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        customerRequirements: '客户需求写入分析表模板',
        solutionScope: '提交版方案范围写入分析表模板',
        technicalRisks: '技术风险写入分析表模板',
        workingTemperatureMin: '-10',
        workingTemperatureMax: '45',
        storageTemperatureMin: '-20',
        storageTemperatureMax: '60',
        workingHumidityMin: '20',
        workingHumidityMax: '80',
        storageHumidityMin: '10',
        storageHumidityMax: '90',
        noiseLimitValue: '75',
        ipProtectionLevel: 'IP54',
        antiCorrosionGrade: 'C3',
        altitudeLimitValue: '1000',
        explosionProofRequirement: '无',
        siteConditionDescription: '现场预留 12m x 8m 区域',
        powerSupply: 'AC380V',
        airSupply: '0.6MPa',
        hydraulicSource: '无',
        liftingEquipment: '3t 行车',
        workpieceDescription: '铝合金壳体，约 2kg',
        operationProcessDescription: '上料后自动定位、装配并检测',
        projectTargetDescription: '节拍 45 秒，良率不低于 99%'
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
  assert.equal(Object.hasOwn(submitted.form.formData, 'customerRequirements'), false);
  assert.equal(Object.hasOwn(submitted.form.formData, 'technicalRisks'), false);
  assert.equal(Object.hasOwn(submitted.form.formData, 'solutionScope'), false);
  assert.equal(submitted.images.length, 4);
  assert.equal(submitted.autoSubmit.attempted, true);
  assert.equal(submitted.autoSubmit.submitted, true);
  assert.equal(submitted.autoSubmit.nodeKey, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  assert.equal(submitted.autoSubmit.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  assert.deepEqual(submitted.autoSubmit.blockingReasons, []);
  assert.equal(submitted.permissions.canSubmitNode, false);
  assert.equal(db.generatedFileStorage.written.length, 1);
  const analysisGeneratedKey = submitted.form.generatedFile.storageKey ?? db.generatedFileStorage.written[0].storageKey;
  assertGeneratedXlsxContainsImages(db.generatedFileStorage, analysisGeneratedKey);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B8:E8', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B9:E9', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B10:E10', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B8:C8');
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B9:C9');
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B10:C10');
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B12:E15', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B12:E13');
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B17:E25', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B17:E21');
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B27:E36', false);
  assertGeneratedXlsxMergeCell(db.generatedFileStorage, analysisGeneratedKey, 'B27:E31');
  assertGeneratedXlsxHasImageAnchorFrom(db.generatedFileStorage, analysisGeneratedKey, { minColumn: 3, row: 7 });
  assertGeneratedXlsxHasImageAnchorFrom(db.generatedFileStorage, analysisGeneratedKey, { minColumn: 1, row: 13 });
  assertGeneratedXlsxHasImageAnchorFrom(db.generatedFileStorage, analysisGeneratedKey, { minColumn: 1, row: 21 });
  assertGeneratedXlsxHasImageAnchorFrom(db.generatedFileStorage, analysisGeneratedKey, { minColumn: 1, row: 31 });
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B2', 'SD-TEST-001');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'E2', '方案设计流程测试项目');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B3', '工作温度：（-10）℃~（45）℃');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'D3', '储存温度：（-20）℃~（60）℃');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B4', '工作湿度：（20）%~（80）%');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'D4', '储存湿度：（10）%~（90）%');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B5', '噪音：≤（75）dB');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'D5', 'IP防护等级：IP（54）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B6', '防腐等级：（C3）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'D6', '海拔高度：≤（1000）m');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B7', '防爆要求：（无）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B8', '现场预留 12m x 8m 区域');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B9', '电源：（AC380V）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B9', '气源：（0.6MPa）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B9', '液压源：（无）');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, analysisGeneratedKey, 'B10', '吊装设备：3t 行车');
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B12',
    '铝合金壳体，约 2kg'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B17',
    '上料后自动定位、装配并检测'
  );
  assertGeneratedXlsxCellIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B27',
    '节拍 45 秒，良率不低于 99%'
  );
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B12',
    '客户需求写入分析表模板'
  );
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    analysisGeneratedKey,
    'B17',
    '技术风险写入分析表模板'
  );
  assertGeneratedXlsxCellNotIncludes(
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
  db.connection.currentAnalysisForm().generated_file_mime_type = null;
  const fallbackMimeDownload = await getSolutionDesignAnalysisGeneratedFileDownload(
    { projectId: 100, user: technicalOwner },
    db
  );
  assert.equal(fallbackMimeDownload.mimeType, submitted.form.generatedFile.mimeType);
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
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_ANALYSIS_SUBMITTED), true);
});

test('solution analysis form submission requires a current product function diagram without side effects', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, storage);
  const saved = await saveSolutionDesignAnalysisForm(
    { projectId: 100, payload: analysisFormPayload(), user: technicalOwner },
    db
  );
  const logCountBeforeSubmit = db.connection.operationLogs.length;

  await assert.rejects(
    () => submitSolutionDesignAnalysisForm(
      { projectId: 100, payload: analysisFormPayload(), user: technicalOwner },
      db
    ),
    (error) => error.statusCode === 409 &&
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
  );

  const currentForm = db.connection.currentAnalysisForm();
  const analysisNode = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS
  );
  assert.equal(saved.form.status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(currentForm.form_status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(currentForm.generated_file_status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);
  assert.equal(analysisNode.status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(db.generatedFileStorage.written.length, 0);
  assert.equal(db.connection.operationLogs.length, logCountBeforeSubmit);
});

test('solution analysis images support legacy C05 anchors and invalidate generated files after changes', async () => {
  const db = fakeDb({
    onlineFormImageStorage: fakeOnlineFormImageStorage({
      'analysis/legacy-site.png': tinyPngBuffer()
    })
  });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, storage);
  await uploadProductFunctionDiagram(db, storage);
  useLegacySolutionDesignStageDocumentCodes(db.connection);
  const legacyDocument = db.connection.stageDocuments.find((document) => document.document_code === '2.2');
  const seededImage = seedOnlineFormImage(db.connection, {
    documentCode: '2.2',
    fieldKey: 'siteConditionImages',
    storageKey: 'analysis/legacy-site.png',
    originalFileName: 'legacy-site.png'
  });

  const initial = await getSolutionDesignAnalysisForm({ projectId: 100, user: technicalOwner }, db);
  assert.equal(initial.stageDocumentId, legacyDocument.id);
  assert.equal(initial.images.length, 1);
  assert.equal(initial.images[0].fieldKey, 'siteConditionImages');

  const submitted = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        siteConditionDescription: 'legacy 现场条件',
        workpieceDescription: 'legacy 工件描述',
        operationProcessDescription: 'legacy 作业工艺',
        projectTargetDescription: 'legacy 目标说明'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.stageDocumentId, legacyDocument.id);
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.ok(db.connection.currentAnalysisForm().generated_file_storage_key);

  await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      payload: { returnReason: '验证旧版 C05 图片重新生成' },
      user: authUser(db.connection.users.get(1))
    },
    db
  );

  await withFakePoolConnection(db.connection, async () => {
    await deleteStageDocumentOnlineFormImage({
      projectId: 100,
      documentId: legacyDocument.id,
      imageId: seededImage.id,
      user: technicalOwner
    });
  });

  let currentForm = db.connection.currentAnalysisForm();
  assert.equal(currentForm.form_status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(currentForm.generated_file_status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);
  assert.equal(currentForm.generated_file_storage_key, null);
  assert.equal(currentForm.generated_file_template_name, null);

  const regenerated = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        workpieceDescription: 'legacy 二次工件描述',
        operationProcessDescription: 'legacy 二次作业工艺',
        projectTargetDescription: 'legacy 二次目标说明'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(regenerated.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  currentForm = db.connection.currentAnalysisForm();
  assert.equal(currentForm.revision, 2);
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS)?.current_revision,
    2
  );
  const regeneratedDownload = await getSolutionDesignAnalysisGeneratedFileDownload(
    { projectId: 100, user: technicalOwner },
    db
  );
  assert.equal(regeneratedDownload.filePath, currentForm.generated_file_storage_key);

  await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
      payload: { returnReason: '继续验证旧版 C05 图片变更' },
      user: authUser(db.connection.users.get(1))
    },
    db
  );

  const uploaded = await withFakePoolConnection(db.connection, async () =>
    uploadStageDocumentOnlineFormImage({
      projectId: 100,
      documentId: legacyDocument.id,
      fieldKey: 'projectTargetImages',
      user: technicalOwner,
      file: {
        originalFileName: 'target.png',
        mimeType: 'image/png',
        size: tinyPngBuffer().length,
        buffer: tinyPngBuffer()
      }
    })
  );
  assert.equal(uploaded.fieldKey, 'projectTargetImages');

  currentForm = db.connection.currentAnalysisForm();
  assert.equal(currentForm.form_status, SOLUTION_DESIGN_ANALYSIS_FORM_STATUS.DRAFT);
  assert.equal(currentForm.generated_file_status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);
  assert.equal(currentForm.generated_file_storage_key, null);

  await withFakePoolConnection(db.connection, async () => {
    await deleteStageDocumentOnlineFormImage({
      projectId: 100,
      documentId: legacyDocument.id,
      imageId: uploaded.id,
      user: technicalOwner
    });
  });
  assert.equal(db.connection.formImages.find((image) => image.id === uploaded.id)?.deleted_by_user_id, 12);
});

test('solution analysis generated file download enforces readiness without strict revision equality', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, storage);
  await uploadProductFunctionDiagram(db, storage);
  await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({ projectTargetDescription: 'v1 下载规则' }),
      user: technicalOwner
    },
    db
  );

  const currentForm = db.connection.currentAnalysisForm();
  const analysisNode = db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  assert.equal(currentForm.revision, 1);
  assert.equal(analysisNode.current_revision, 1);
  const download = await getSolutionDesignAnalysisGeneratedFileDownload(
    { projectId: 100, user: technicalOwner },
    db
  );
  assert.equal(download.filePath, currentForm.generated_file_storage_key);

  analysisNode.current_revision = 2;
  await assert.rejects(
    () => getSolutionDesignAnalysisGeneratedFileDownload({ projectId: 100, user: technicalOwner }, db),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND &&
      error.details.includes('analysisFormGeneratedFile')
  );

  analysisNode.current_revision = 1;
  currentForm.generated_file_status = SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED;
  await assert.rejects(
    () => getSolutionDesignAnalysisGeneratedFileDownload({ projectId: 100, user: technicalOwner }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND
  );

  currentForm.generated_file_status = SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED;
  const generatedStorageKey = currentForm.generated_file_storage_key;
  currentForm.generated_file_storage_key = null;
  await assert.rejects(
    () => getSolutionDesignAnalysisGeneratedFileDownload({ projectId: 100, user: technicalOwner }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND
  );

  currentForm.generated_file_storage_key = generatedStorageKey;
  db.generatedFileStorage.files.delete(generatedStorageKey);
  await assert.rejects(
    () => getSolutionDesignAnalysisGeneratedFileDownload({ projectId: 100, user: technicalOwner }, db),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_MISSING &&
      error.details.includes('analysisFormGeneratedFile')
  );
});

test('solution design role users can view C05 images while only technical owner can mutate them', async () => {
  const db = fakeDb({
    onlineFormImageStorage: fakeOnlineFormImageStorage({
      'analysis/business-view.png': tinyPngBuffer()
    })
  });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateAnalysisNode(db, storage);
  const image = seedOnlineFormImage(db.connection, {
    fieldKey: 'siteConditionImages',
    storageKey: 'analysis/business-view.png',
    originalFileName: 'business-view.png'
  });
  db.connection.visible = false;

  const dto = await getSolutionDesignAnalysisForm({ projectId: 100, user: businessOwner }, db);
  assert.equal(dto.images.length, 1);
  assert.equal(dto.images[0].id, image.id);
  assert.equal(dto.images[0].canDownload, true);
  assert.equal(dto.images[0].canDelete, false);

  await withFakePoolConnection(db.connection, async () => {
    await assert.rejects(
      () =>
        deleteStageDocumentOnlineFormImage({
          projectId: 100,
          documentId: dto.stageDocumentId,
          imageId: image.id,
          user: businessOwner
        }),
      (error) => error.statusCode === 403 && error.details.includes('documentCode')
    );
  });
  assert.equal(db.connection.formImages.find((candidate) => candidate.id === image.id)?.deleted_at, null);
});

test('online form image fields are scoped by document type', async () => {
  const db = fakeDb();
  const technicalOwner = authUser(db.connection.users.get(12));
  const initiationDocument = {
    ...db.connection.stageDocuments[0],
    id: 900,
    stage_order: 1,
    document_order: 2,
    document_code: INITIATION_REWORK_TARGET_DOCUMENT_CODE,
    document_name: '项目需求表',
    status: DOCUMENT_STATUS.NOT_SUBMITTED,
    responsible_user_id: 12,
    is_applicable: 1,
    revision_required: 0
  };
  db.connection.stageDocuments.push(initiationDocument);

  await withFakePoolConnection(db.connection, async () => {
    await assert.rejects(
      () =>
        uploadStageDocumentOnlineFormImage({
          projectId: 100,
          documentId: initiationDocument.id,
          fieldKey: 'projectTargetImages',
          user: technicalOwner,
          file: {
            originalFileName: 'target.png',
            mimeType: 'image/png',
            size: tinyPngBuffer().length,
            buffer: tinyPngBuffer()
          }
        }),
      (error) =>
        error.code === 'INVALID_ONLINE_FORM_IMAGE_FIELD' &&
        error.details.includes('fieldKey') &&
        error.details.includes('documentCode')
    );
  });
});

test('solution analysis generated file failure blocks node submit and cleans partial file', async () => {
  const generatedStorage = fakeGeneratedFileStorage({ failWrite: true });
  const db = fakeDb({ generatedFileStorage: generatedStorage });
  seedAssignedRoles(db.connection);
  const uploadStorage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateAnalysisNode(db, uploadStorage);
  await uploadProductFunctionDiagram(db, uploadStorage);
  const submitted = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({ projectTargetDescription: '触发生成失败' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED);
  assert.equal(submitted.autoSubmit.attempted, false);
  assert.equal(submitted.autoSubmit.submitted, false);
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
  const submittedForm = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload(),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.attempted, true);
  assert.equal(submittedForm.autoSubmit.submitted, true);
  assert.equal(submittedForm.autoSubmit.nodeKey, SOLUTION_DESIGN_NODE_KEY.ANALYSIS);
  assert.equal(submittedForm.autoSubmit.nodeStatus, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  assert.deepEqual(submittedForm.autoSubmit.blockingReasons, []);

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
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

test('RD manager returns solution analysis node and reuses current product diagram after form regeneration', async () => {
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
      !error.details.includes(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeOldRevisionSubmit);

  const resubmittedForm = await submitSolutionDesignAnalysisForm(
    {
      projectId: 100,
      payload: analysisFormPayload({
        customerRequirements: '退回后旧客户需求',
        technicalRisks: '退回后重新评估节拍风险',
        operationProcessDescription: '退回后重新评估作业工艺',
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
    '退回后重新评估作业工艺'
  );
  assertGeneratedXlsxCellNotIncludes(
    db.generatedFileStorage,
    revisionTwoGeneratedKey,
    'B17',
    '退回后重新评估节拍风险'
  );
  assert.equal(Object.hasOwn(JSON.parse(db.connection.currentAnalysisForm().form_data_json), 'technicalRisks'), false);
  const readyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(resubmittedForm.autoSubmit.submitted, true);
  assert.equal(
    findWorkflowNode(readyAgain, SOLUTION_DESIGN_NODE_KEY.ANALYSIS).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(db.connection.analysisForms.at(-1).revision, 2);
  assert.equal(
    db.connection.uploadFiles.find(
      (file) => file.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM && file.is_current === 1
    ).revision,
    1
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
  assert.equal(initial.permissions.canEdit, true);
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
        customerRequirements: [
          '内部需求第一行',
          '内部需求第二行',
          '内部需求第三行',
          '内部需求第四行'
        ],
        projectTargetDescription: ['内部目标第一行', '内部目标第二行'],
        technicalRisks: ['内部风险第一行', '内部风险第二行'],
        solutionSuggestions: ['内部方案建议第一行', '内部方案建议第二行'],
        reviewConclusion: '内部评审结论写入模板',
        actionItems: ['内部实施计划第一行', '内部实施计划第二行'],
        recorder: '内部记录人'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED);
  assert.equal(submitted.form.revision, 1);
  assert.deepEqual(submitted.form.formData.projectTargetDescription, ['内部目标第一行', '内部目标第二行']);
  const internalTargetPlanItem = submitted.form.formData.implementationPlanItems.find(
    (item) => item.sourceType === 'target' && item.sourceIndex === 1
  );
  assert.equal(internalTargetPlanItem.planText, '目标1实施计划');
  assert.equal(submitted.form.formData.actionItems[0], '需求1：内部实施计划第一行');
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(submitted.form.generatedFile.templateName, '方案评审记录表-模板.xlsx');
  assert.equal(submitted.form.generatedFile.canDownload, true);
  assert.match(submitted.form.generatedFile.fileName, /^C15-方案评审记录表-内部方案评审-/);
  assert.equal(submitted.autoSubmit.submitted, true);
  assert.equal(submitted.permissions.canSubmitNode, false);
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
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'A42', '记录人：内部记录人');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B2', '方案设计流程测试项目');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'E2', '测试客户公司');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'B3', '内部，第（1）次');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B3', '宋体');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B5', '内部评审会议室');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'G5', '2026-07-18');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'B9', '内部需求第一行');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'B10', '内部需求第二行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B11', '内部需求第三行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B11', '内部需求第四行');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B9', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B10', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B11', '宋体');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B12', '内部目标第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, internalReviewGeneratedKey, 'B13', '内部目标第二行');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B12', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B13', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, internalReviewGeneratedKey, 'B14', '宋体');
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
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, internalReviewGeneratedKey, 'B42', '');

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
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_SUBMITTED), true);
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_INTERNAL_REVIEW_FORM_GENERATION_FAILED),
    false
  );
});

test('review implementation plan items normalize sources, require plans and render ordered labels', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await submitSolutionDesignOutputs(db, storage);
  const structuredPayload = reviewFormPayload({
    customerRequirements: ['需求第一行', ' ', '需求第二行'],
    projectTargetDescription: ['目标第一行', ' ', '目标第二行'],
    technicalRisks: '风险第一行\n\n风险第二行',
    solutionSuggestions: ['建议第一行', '', '建议第二行'],
    actionItems: [],
    implementationPlanItems: [
      { sourceType: 'requirement', sourceIndex: 1, planText: '需求第一项计划' },
      { sourceType: 'requirement', sourceIndex: 2, planText: '需求第二项计划' },
      { sourceType: 'target', sourceIndex: 1, planText: '目标第一项计划' },
      { sourceType: 'target', sourceIndex: 2, planText: '目标第二项计划' },
      { sourceType: 'risk', sourceIndex: 1, planText: '风险第一项计划' },
      { sourceType: 'risk', sourceIndex: 2, planText: '风险第二项计划' },
      { sourceType: 'suggestion', sourceIndex: 1, planText: '建议第一项计划' },
      { sourceType: 'suggestion', sourceIndex: 2, planText: '建议第二项计划' },
      { sourceType: 'suggestion', sourceIndex: 9, planText: '不存在来源的计划' }
    ],
    reviewConclusion: '结构化实施计划评审通过'
  });
  const draft = await saveSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: structuredPayload,
      user: technicalOwner
    },
    db
  );

  assert.deepEqual(draft.form.formData.customerRequirements, ['需求第一行', '需求第二行']);
  assert.deepEqual(
    draft.form.formData.implementationPlanItems.map((item) => `${item.sourceLabel}${item.sourceIndex}:${item.sourceText}`),
    [
      '需求1:需求第一行',
      '需求2:需求第二行',
      '目标1:目标第一行',
      '目标2:目标第二行',
      '风险1:风险第一行',
      '风险2:风险第二行',
      '建议1:建议第一行',
      '建议2:建议第二行'
    ]
  );
  assert.equal(draft.form.formData.implementationPlanItems[0].planText, '需求第一项计划');
  assert.equal(
    draft.form.formData.implementationPlanItems.some((item) => item.sourceType === 'suggestion' && item.sourceIndex === 9),
    false
  );

  await assert.rejects(
    () =>
      submitSolutionDesignReviewForm(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: reviewFormPayload({
            ...structuredPayload.formData,
            actionItems: [
              '旧需求第一项计划',
              '旧需求第二项计划',
              '旧目标第一项计划',
              '旧目标第二项计划',
              '旧风险第一项计划',
              '旧风险第二项计划',
              '旧建议第一项计划',
              '旧建议第二项计划'
            ],
            implementationPlanItems: structuredPayload.formData.implementationPlanItems.map((item) =>
              item.sourceType === 'requirement' && item.sourceIndex === 1
                ? { ...item, planText: '' }
                : item
            )
          }),
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING &&
      error.details.includes('implementationPlanItems') &&
      error.details.includes('requirement:1')
  );

  const shiftedDraft = await saveSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({
        ...draft.form.formData,
        customerRequirements: '需求第二行',
        implementationPlanItems: draft.form.formData.implementationPlanItems
      }),
      user: technicalOwner
    },
    db
  );
  const shiftedRequirementItem = shiftedDraft.form.formData.implementationPlanItems.find(
    (item) => item.sourceType === 'requirement' && item.sourceIndex === 1
  );
  assert.equal(shiftedRequirementItem.sourceText, '需求第二行');
  assert.equal(shiftedRequirementItem.planText, '需求第二项计划');

  const duplicateTargetDraft = await saveSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({
        ...draft.form.formData,
        projectTargetDescription: ['目标第二行', '目标第二行'],
        implementationPlanItems: draft.form.formData.implementationPlanItems
      }),
      user: technicalOwner
    },
    db
  );
  assert.deepEqual(
    duplicateTargetDraft.form.formData.implementationPlanItems
      .filter((item) => item.sourceType === 'target')
      .map((item) => `${item.sourceText}:${item.planText}`),
    ['目标第二行:目标第一项计划', '目标第二行:目标第二项计划']
  );

  await assert.rejects(
    () =>
      submitSolutionDesignReviewForm(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          payload: reviewFormPayload({
            ...structuredPayload.formData,
            implementationPlanItems: structuredPayload.formData.implementationPlanItems.map((item) =>
              item.sourceType === 'suggestion' && item.sourceIndex === 2
                ? { ...item, planText: ' ' }
                : item
            )
          }),
          user: technicalOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.FORM_REQUIRED_FIELDS_MISSING &&
      error.details.includes('implementationPlanItems') &&
      error.details.includes('suggestion:2')
  );

  const submitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: structuredPayload,
      user: technicalOwner
    },
    db
  );

  assert.equal(submitted.autoSubmit.submitted, true);
  assert.deepEqual(submitted.form.formData.actionItems, [
    '需求1：需求第一项计划',
    '需求2：需求第二项计划',
    '目标1：目标第一项计划',
    '目标2：目标第二项计划',
    '风险1：风险第一项计划',
    '风险2：风险第二项计划',
    '建议1：建议第一项计划',
    '建议2：建议第二项计划'
  ]);
  const generatedKey = submitted.form.generatedFile.storageKey ?? db.generatedFileStorage.written.at(-1).storageKey;
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B30', '需求1：需求第一项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B31', '需求2：需求第二项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B32', '目标1：目标第一项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B33', '目标2：目标第二项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B34', '风险1：风险第一项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B35', '风险2：风险第二项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B36', '建议1：建议第一项计划');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B37', '建议2：建议第二项计划');
});

test('review form generated file recorder falls back to submitter display name', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await submitSolutionDesignOutputs(db, storage);
  const submitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({
        recorder: '',
        reviewConclusion: '记录人为空时回退提交人'
      }),
      user: technicalOwner
    },
    db
  );

  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  const generatedKey = submitted.form.generatedFile.storageKey ?? db.generatedFileStorage.written.at(-1).storageKey;
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B3', '内部，第（1）次');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'A42', '记录人：技术负责人');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, generatedKey, 'B42', '');
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
        customerRequirements: ['客户需求第一行', '客户需求第二行'],
        projectTargetDescription: ['客户目标第一行', '客户目标第二行'],
        technicalRisks: ['客户风险第一行'],
        solutionSuggestions: ['客户方案建议第一行', '客户方案建议第二行'],
        reviewConclusion: '客户评审结论写入模板',
        actionItems: ['客户实施计划第一行', '客户实施计划第二行'],
        recorder: '客户记录人'
      }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submitted.form.status, SOLUTION_DESIGN_REVIEW_FORM_STATUS.SUBMITTED);
  assert.equal(submitted.form.reviewType, 'customer');
  assert.deepEqual(submitted.form.formData.projectTargetDescription, ['客户目标第一行', '客户目标第二行']);
  const customerTargetPlanItem = submitted.form.formData.implementationPlanItems.find(
    (item) => item.sourceType === 'target' && item.sourceIndex === 1
  );
  assert.equal(customerTargetPlanItem.planText, '目标1实施计划');
  assert.equal(submitted.form.formData.actionItems[0], '需求1：客户实施计划第一行');
  assert.equal(submitted.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.match(submitted.form.generatedFile.fileName, /^C16-方案评审记录表-客户方案评审-/);
  assert.equal(submitted.autoSubmit.submitted, true);
  assert.equal(submitted.permissions.canSubmitNode, false);

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
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'A42', '记录人：客户记录人');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B3', '甲方，第（1）次');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B3', '宋体');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B5', '客户评审会议室');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'G5', '2026-07-19');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B9', '客户需求第一行');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B10', '客户需求第二行');
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B11', '');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B9', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B10', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B11', '宋体');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B12', '客户目标第一行');
  assertGeneratedXlsxCellIncludes(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B13', '客户目标第二行');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B12', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B13', '宋体');
  assertGeneratedXlsxCellUsesTextFont(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B14', '宋体');
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
  assertGeneratedXlsxCellEquals(db.generatedFileStorage, customerForm.generated_file_storage_key, 'B42', '');

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
  assert.equal(actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_SUBMITTED), true);
  assert.equal(
    actionTypes.includes(OPERATION_ACTION_TYPE.SOLUTION_DESIGN_CUSTOMER_REVIEW_FORM_GENERATION_FAILED),
    false
  );
});

test('review generated file download accepts generated form revision above node revision', async () => {
  const internalDb = fakeDb();
  seedAssignedRoles(internalDb.connection);
  const internalUploadStorage = fakeUploadStorage();
  const technicalOwner = authUser(internalDb.connection.users.get(12));

  await submitSolutionDesignOutputs(internalDb, internalUploadStorage);
  const internalSubmitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '内部评审下载规则' }),
      user: technicalOwner
    },
    internalDb
  );
  const internalForm = internalDb.connection.currentReviewForm(SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW);
  const internalNode = internalDb.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW
  );
  assert.equal(internalSubmitted.autoSubmit.submitted, true);
  internalForm.revision = 2;
  assert.equal(internalForm.revision, 2);
  assert.equal(internalNode.current_revision, 1);
  const internalDownload = await getSolutionDesignReviewGeneratedFileDownload(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      user: technicalOwner
    },
    internalDb
  );
  assert.equal(internalDownload.filePath, internalForm.generated_file_storage_key);
  internalForm.generated_file_status = SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED;
  await assert.rejects(
    () =>
      getSolutionDesignReviewGeneratedFileDownload(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
          user: technicalOwner
        },
        internalDb
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND &&
      error.details.includes('internalReviewFormGeneratedFile')
  );

  const customerDb = fakeDb();
  seedAssignedRoles(customerDb.connection);
  const customerUploadStorage = fakeUploadStorage();
  await activateCustomerReviewNode(customerDb, customerUploadStorage);
  const customerTechnicalOwner = authUser(customerDb.connection.users.get(12));
  const customerSubmitted = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '客户评审下载规则' }),
      user: customerTechnicalOwner
    },
    customerDb
  );
  const customerForm = customerDb.connection.currentReviewForm(SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW);
  const customerNode = customerDb.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW
  );
  assert.equal(customerSubmitted.autoSubmit.submitted, true);
  customerForm.revision = 2;
  assert.equal(customerForm.revision, 2);
  assert.equal(customerNode.current_revision, 1);
  const customerDownload = await getSolutionDesignReviewGeneratedFileDownload(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      user: customerTechnicalOwner
    },
    customerDb
  );
  assert.equal(customerDownload.filePath, customerForm.generated_file_storage_key);
  customerForm.generated_file_storage_key = null;
  await assert.rejects(
    () =>
      getSolutionDesignReviewGeneratedFileDownload(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
          user: customerTechnicalOwner
        },
        customerDb
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND &&
      error.details.includes('customerReviewFormGeneratedFile')
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
  assert.equal(submittedForm.autoSubmit.attempted, false);
  assert.equal(submittedForm.autoSubmit.submitted, false);
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
  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.submitted, true);
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(
    findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW).permissions.canEditReviewForm,
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

test('RD manager returns internal review to solution design and current design outputs can be resubmitted', async () => {
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
  const returnedForTechnicalOwner = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(returnedForTechnicalOwner, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit,
    true
  );

  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUTS_SUBMITTED
  );
  const internalReviewReadyAgain = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(internalReviewReadyAgain, SOLUTION_DESIGN_NODE_KEY.DESIGN).status,
    SOLUTION_DESIGN_NODE_STATUS.APPROVED
  );
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

test('returned solution design output reupload replaces current file and non-current history cannot satisfy submit gate', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await submitReviewNodeForReview(db, SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW, storage);
  await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
      payload: { returnReason: '内部评审要求整体调整方案' },
      user: rdManager
    },
    db
  );

  const replacedSlotKey = SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PROCESS_TIMING_DIAGRAM;
  const removedCurrentSlotKey = SOLUTION_DESIGN_UPLOAD_SLOT_KEY.CYCLE_TIME_TABLE;
  const originalReplacedFile = db.connection.currentUploadFileForSlot(replacedSlotKey);
  assert.equal(originalReplacedFile.revision, 1);

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: replacedSlotKey,
      file: testUploadFile('工艺时序图-v2.dat'),
      user: technicalOwner
    },
    db,
    storage
  );
  const replacementFiles = db.connection.uploadFiles.filter((file) => file.slot_key === replacedSlotKey);
  assert.deepEqual(
    replacementFiles.map((file) => ({ revision: file.revision, isCurrent: file.is_current })),
    [
      { revision: 1, isCurrent: 0 },
      { revision: 2, isCurrent: 1 }
    ]
  );
  const download = await getSolutionDesignUploadDownload(
    { projectId: 100, slotKey: replacedSlotKey, user: technicalOwner },
    db,
    storage
  );
  assert.equal(download.revision, 2);
  assert.equal(download.originalFileName, '工艺时序图-v2.dat');

  const removedCurrentFile = db.connection.currentUploadFileForSlot(removedCurrentSlotKey);
  removedCurrentFile.is_current = 0;
  const blockedWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(blockedWorkflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit, false);
  const logCountBeforeBlockedSubmit = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      submitSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
          user: technicalOwner
        },
        db,
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes(removedCurrentSlotKey)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeBlockedSubmit);
});

test('technical owner can exempt one C07-C14 output and invalid exemption operations are rejected', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const businessOwner = authUser(db.connection.users.get(13));

  await activateSolutionDesignNode(db, storage);

  const exemptedUploads = await markSolutionDesignUploadExemption(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL,
      payload: { exemptionReason: '客户不需要三维模型' },
      user: technicalOwner
    },
    db
  );
  const exemptedSlot = findUploadSlot(exemptedUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL);
  assert.equal(exemptedSlot.exemption.isExempted, true);
  assert.equal(exemptedSlot.exemption.reason, '客户不需要三维模型');
  assert.equal(exemptedSlot.exemption.exemptedByUserId, 12);
  assert.equal(exemptedSlot.exemption.exemptedByUser.name, '技术负责人');
  assert.equal(exemptedSlot.permissions.canMarkExemption, false);
  assert.equal(exemptedSlot.permissions.canCancelExemption, true);

  const slotRow = db.connection.uploadSlots.find(
    (slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.THREE_D_MODEL
  );
  assert.equal(slotRow.is_upload_exempted, 1);
  assert.equal(slotRow.exemption_reason, '客户不需要三维模型');
  assert.equal(slotRow.exempted_by_user_id, 12);
  assert.equal(slotRow.exempted_at, '2026-07-08 10:15:00');
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTED
  );

  const logCountBeforeRejected = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      markSolutionDesignUploadExemption(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.LAYOUT_DIAGRAM,
          payload: { exemptionReason: '商务不能操作' },
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  await assert.rejects(
    () =>
      markSolutionDesignUploadExemption(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.PRODUCT_FUNCTION_DIAGRAM,
          payload: { exemptionReason: '非 C07-C14' },
          user: technicalOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.INVALID_UPLOAD_SLOT
  );
  const emptyReasonUploads = await markSolutionDesignUploadExemption(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.LAYOUT_DIAGRAM,
      payload: { exemptionReason: '' },
      user: technicalOwner
    },
    db
  );
  assert.equal(findUploadSlot(emptyReasonUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.LAYOUT_DIAGRAM).exemption.reason, null);
  assert.equal(db.connection.operationLogs.length, logCountBeforeRejected + 1);
});

test('uploaded or exempted C07-C14 outputs can submit and derive complete without changing document count', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateSolutionDesignNode(db, storage);
  const uploadedSlotKeys = SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.slice(0, 4);
  const exemptedSlotKeys = SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.slice(4);
  for (const slotKey of uploadedSlotKeys) {
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
  for (const slotKey of exemptedSlotKeys) {
    await markSolutionDesignUploadExemption(
      {
        projectId: 100,
        slotKey,
        payload: { exemptionReason: `${slotKey} 本项目无需上传` },
        user: technicalOwner
      },
      db
    );
  }

  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  for (const slotKey of uploadedSlotKeys) {
    const slot = findUploadSlot(uploads, slotKey);
    assert.equal(slot.hasCurrentFile, true);
    assert.equal(slot.exemption.isExempted, false);
  }
  for (const slotKey of exemptedSlotKeys) {
    const slot = findUploadSlot(uploads, slotKey);
    assert.equal(slot.hasCurrentFile, false);
    assert.equal(slot.exemption.isExempted, true);
    assert.equal(slot.satisfied, true);
  }

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  const designNode = findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN);
  assert.equal(designNode.permissions.canSubmit, true);
  assert.deepEqual(designNode.blockingReasons, []);
  const todos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.projectContextRow(),
    workflow,
    uploads
  });
  const designUploadTodos = todos.filter(
    (todo) =>
      todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.DESIGN &&
      String(todo.actionKey || '').startsWith('upload:')
  );
  assert.deepEqual(designUploadTodos, []);

  const submitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.DESIGN,
      user: technicalOwner
    },
    db
  );
  assert.equal(findWorkflowNode(submitted, SOLUTION_DESIGN_NODE_KEY.DESIGN).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(db.connection.stages.length, 8);
  assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);

  const derivedRows = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    db.connection,
    db.connection.stageDocuments.filter((document) =>
      ['C07', 'C08', 'C09', 'C10', 'C11', 'C12', 'C13', 'C14'].includes(document.document_code)
    )
  );
  assert.equal(derivedRows.length, 8);
  assert.equal(
    derivedRows.every((row) => row.solutionDesignDerivedCompletion?.isComplete === true),
    true
  );
  assert.equal(
    derivedRows.every((row) => row.solutionDesignDerivedCompletion?.derivedCompletionStatus === COMPLETION_STATUS.COMPLETED),
    true
  );
});

test('cancelled C07-C14 exemption blocks submit again when no current file exists', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const exemptedSlotKey = SOLUTION_DESIGN_UPLOAD_SLOT_KEY.SOLUTION_PPT;

  await activateSolutionDesignNode(db, storage);
  for (const slotKey of SOLUTION_DESIGN_OUTPUT_UPLOAD_SLOT_KEYS.filter((slotKey) => slotKey !== exemptedSlotKey)) {
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
  await markSolutionDesignUploadExemption(
    {
      projectId: 100,
      slotKey: exemptedSlotKey,
      payload: { exemptionReason: '不需要项目方案 PPT' },
      user: technicalOwner
    },
    db
  );
  let workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit, true);

  const uploadsAfterCancel = await cancelSolutionDesignUploadExemption(
    {
      projectId: 100,
      slotKey: exemptedSlotKey,
      user: technicalOwner
    },
    db
  );
  const cancelledSlot = findUploadSlot(uploadsAfterCancel, exemptedSlotKey);
  assert.equal(cancelledSlot.exemption.isExempted, false);
  assert.equal(cancelledSlot.permissions.canMarkExemption, true);
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED
  );

  workflow = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.DESIGN).permissions.canSubmit, false);
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
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED && error.details.includes(exemptedSlotKey)
  );
});

test('uploading an exempted C07-C14 output clears exemption and records automatic cancellation log', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const slotKey = SOLUTION_DESIGN_UPLOAD_SLOT_KEY.DEMO_ANIMATION;

  await activateSolutionDesignNode(db, storage);
  await markSolutionDesignUploadExemption(
    {
      projectId: 100,
      slotKey,
      payload: { exemptionReason: '先按无需上传处理' },
      user: technicalOwner
    },
    db
  );
  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey,
      file: testUploadFile('演示动画-v1.mp4'),
      user: technicalOwner
    },
    db,
    storage
  );

  const slotRow = db.connection.uploadSlots.find((slot) => slot.slot_key === slotKey);
  assert.equal(slotRow.is_upload_exempted, 0);
  assert.equal(slotRow.exemption_reason, null);
  assert.equal(slotRow.exempted_by_user_id, null);
  assert.equal(slotRow.exempted_at, null);
  const uploads = await listSolutionDesignUploads({ projectId: 100, user: technicalOwner }, db);
  const slot = findUploadSlot(uploads, slotKey);
  assert.equal(slot.hasCurrentFile, true);
  assert.equal(slot.currentFile.originalFileName, '演示动画-v1.mp4');
  assert.equal(slot.exemption.isExempted, false);
  assert.equal(slot.permissions.canMarkExemption, false);
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_DESIGN_OUTPUT_EXEMPTION_CANCELLED_BY_UPLOAD
  );
});

test('customer review node submits for review and RD manager approval activates RD cost estimation', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));

  await activateCustomerReviewNode(db, storage);
  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload(),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.submitted, true);
  const submitted = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
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
  const submittedForm = await submitSolutionDesignReviewForm(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
      payload: reviewFormPayload({ reviewConclusion: '客户提出调整意见' }),
      user: technicalOwner
    },
    db
  );
  assert.equal(submittedForm.autoSubmit.submitted, true);

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
      payload: { comment: '研发成本评估合理，同意进入制造估算。' },
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
  const approvalLog = db.connection.operationLogs.at(-1);
  assert.equal(
    JSON.parse(approvalLog.details_json).approvalComment,
    '研发成本评估合理，同意进入制造估算。'
  );
});

test('solution design approval comments reject values longer than 1000 characters', async () => {
  await assert.rejects(
    () => approveSolutionDesignWorkflowNode({
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      payload: { comment: 'x'.repeat(1001) },
      user: { id: 1 }
    }),
    (error) => error.code === SOLUTION_DESIGN_ERROR.INVALID_APPROVAL_COMMENT
  );
});

test('RD cost return increments revision and allows current file resubmission', async () => {
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
  const returnedForTechnicalOwner = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(returnedForTechnicalOwner, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canSubmit,
    true
  );

  const resubmitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.RD_COST,
      user: technicalOwner
    },
    db
  );
  assert.equal(findWorkflowNode(resubmitted, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_RD_COST_SUBMITTED
  );
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
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED);

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

test('business owner completes marketing cost estimation and marketing manager can approve or return it', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const marketingManager = authUser(db.connection.users.get(5));
  const financeOwner = authUser(db.connection.users.get(16));

  await activateMarketingCostNode(db, storage);
  const initialUploads = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findUploadSlot(initialUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION).permissions.canUpload,
    true
  );
  const initialWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  const businessTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.projectContextRow(),
    workflow: initialWorkflow,
    uploads: initialUploads
  });
  assert.ok(
    businessTodos.some(
      (todo) =>
        todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST &&
        todo.actionText === '上传/提交营销中心成本估算表'
    )
  );

  await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION,
      file: testUploadFile('营销中心成本估算表.xlsx'),
      user: businessOwner
    },
    db,
    storage
  );
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canSubmit, true);

  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: businessOwner
    },
    db
  );
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: marketingManager }, db);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canApprove, true);
  assert.equal(findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canReturn, true);
  const reviewerUploads = await listSolutionDesignUploads({ projectId: 100, user: marketingManager }, db);
  const reviewerTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: db.connection.projectContextRow(),
    workflow: reviewerWorkflow,
    uploads: reviewerUploads
  });
  assert.ok(
    reviewerTodos.some(
      (todo) =>
        todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST &&
        todo.actionText === '审批/退回营销成本估算'
    )
  );

  const logCountBeforeUnauthorizedReview = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
          user: financeOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeUnauthorizedReview);

  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: marketingManager
    },
    db
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.deepEqual(
    db.connection.operationLogs.slice(-3).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_FILE_UPLOADED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_APPROVED
    ]
  );

  const dbReturned = fakeDb();
  seedAssignedRoles(dbReturned.connection);
  const returnStorage = fakeUploadStorage();
  await submitMarketingCostForReview(dbReturned, returnStorage);
  const returned = await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      payload: { returnReason: '营销成本需补充报价策略' },
      user: marketingManager
    },
    dbReturned
  );
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.RD_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);

  const returnedForBusinessOwner = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, dbReturned);
  assert.equal(
    findWorkflowNode(returnedForBusinessOwner, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canSubmit,
    true
  );
  const resubmitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: businessOwner
    },
    dbReturned
  );
  assert.equal(
    findWorkflowNode(resubmitted, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
  assert.equal(
    dbReturned.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_MARKETING_COST_SUBMITTED
  );
});

test('finance cost estimation uses finance owner and general manager approval with quotation branch selection', async () => {
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
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    db
  );
  assert.equal(findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(approved.quotationTender.branchType, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);
  assert.equal(approved.quotationTender.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);
  assert.equal(
    findWorkflowNode(approved, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canSelectBranch,
    false
  );
  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_FINANCE_COST_GENERAL_APPROVED
  );
  assert.equal(
    db.connection.operationLogs.at(-2).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_BRANCH_SELECTED
  );
});

test('general manager finance approval requires a valid quotation or tender branch without mutating state on failure', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));

  await submitFinanceCostForGeneralReview(db, storage);
  const logCountBeforeMissingBranch = db.connection.operationLogs.length;
  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
          user: generalManager
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_TENDER_BRANCH &&
      error.details.includes('branchType')
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeMissingBranch);
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW
  );
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status,
    SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED
  );
  assert.equal(db.connection.quotationTenderFlow, null);

  await assert.rejects(
    () =>
      approveSolutionDesignWorkflowNode(
        {
          projectId: 100,
          nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
          payload: { branchType: 'invalid' },
          user: generalManager
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_TENDER_BRANCH
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeMissingBranch);
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_GENERAL_REVIEW
  );
  assert.equal(db.connection.quotationTenderFlow, null);
});

test('general manager finance approval can select tender branch and preserves tender upload path', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const generalManager = authUser(db.connection.users.get(30));

  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(workflow.quotationTender.branchType, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
  assert.equal(workflow.quotationTender.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);
  assert.equal(
    findWorkflowNode(workflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canSelectBranch,
    false
  );
  assert.equal(workflow.quotationTender.permissions.canUploadTenderBusiness, true);
  assert.equal(workflow.quotationTender.permissions.canUploadQuotation, false);
  assert.equal(
    db.connection.operationLogs.some(
      (log) => log.action_type === OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_BRANCH_SELECTED
    ),
    true
  );

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
  const readyTenderWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findWorkflowNode(readyTenderWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canSubmit,
    true
  );
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: businessOwner
    },
    db
  );
  const reviewerWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, db);
  assert.equal(
    findWorkflowNode(reviewerWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canApproveTender,
    true
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
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  const returnedForFinanceAccountant = await getSolutionDesignWorkflow({ projectId: 100, user: financeAccountant }, db);
  assert.equal(
    findWorkflowNode(returnedForFinanceAccountant, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canSubmit,
    true
  );

  const resubmitted = await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      user: financeAccountant
    },
    db
  );
  assert.equal(
    findWorkflowNode(resubmitted, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW
  );
});

test('general manager return sends cost workflow back to RD and current cost files can be resubmitted', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const technicalOwner = authUser(db.connection.users.get(12));
  const procurementOwner = authUser(db.connection.users.get(14));
  const businessOwner = authUser(db.connection.users.get(13));
  const financeAccountant = authUser(db.connection.users.get(15));
  const financeOwner = authUser(db.connection.users.get(16));
  const rdManager = authUser(db.connection.users.get(1));
  const manufacturingManager = authUser(db.connection.users.get(2));
  const marketingManager = authUser(db.connection.users.get(5));
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
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).currentRevision, 2);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).currentRevision, 2);
  const returnedForTechnicalOwner = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(returnedForTechnicalOwner, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canSubmit,
    true
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
  assert.equal(findWorkflowNode(afterRdApproval, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).permissions.canSubmit, true);

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
  const afterManufacturingApproval = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    findWorkflowNode(afterManufacturingApproval, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(findWorkflowNode(afterManufacturingApproval, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canSubmit, true);

  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: businessOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: marketingManager
    },
    db
  );
  const afterMarketingApproval = await getSolutionDesignWorkflow({ projectId: 100, user: financeAccountant }, db);
  assert.equal(
    findWorkflowNode(afterMarketingApproval, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status,
    SOLUTION_DESIGN_NODE_STATUS.PENDING
  );
  assert.equal(findWorkflowNode(afterMarketingApproval, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canSubmit, true);

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
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    db
  );

  const rowsWithDerivedCompletion = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    db.connection,
    db.connection.stageDocuments.map((document) => ({ ...document }))
  );
  const costDocument = mapDocument(
    rowsWithDerivedCompletion.find((document) => document.document_code === 'C17')
  );
  assert.equal(costDocument.isComplete, true);
  assert.equal(costDocument.completionStatus, COMPLETION_STATUS.COMPLETED);

  const marketingCurrentFile = db.connection.currentUploadFileForSlot(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION);
  marketingCurrentFile.is_current = 0;
  const rowsWithoutMarketingCurrentFile = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    db.connection,
    db.connection.stageDocuments.map((document) => ({ ...document }))
  );
  const incompleteWithoutMarketingDocument = mapDocument(
    rowsWithoutMarketingCurrentFile.find((document) => document.document_code === 'C17')
  );
  assert.equal(incompleteWithoutMarketingDocument.isComplete, false);
  assert.equal(incompleteWithoutMarketingDocument.completionStatus, COMPLETION_STATUS.INCOMPLETE);
  marketingCurrentFile.is_current = 1;

  db.connection.currentUploadFileForSlot(SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MANUFACTURING_COST_ESTIMATION).is_current = 0;
  const rowsWithoutManufacturingCurrentFile = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    db.connection,
    db.connection.stageDocuments.map((document) => ({ ...document }))
  );
  const incompleteCostDocument = mapDocument(
    rowsWithoutManufacturingCurrentFile.find((document) => document.document_code === 'C17')
  );
  assert.equal(incompleteCostDocument.isComplete, false);
  assert.equal(incompleteCostDocument.completionStatus, COMPLETION_STATUS.INCOMPLETE);
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

test('legacy quotation/tender branch selection still works before finance approval selected a branch', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));
  const businessOwner = authUser(db.connection.users.get(13));

  await activateLegacyUnselectedQuotationOrTenderNode(db, storage);
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

test('legacy branch selection API rejects duplicate selection after finance approval already selected branch', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));

  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);
  const branchNodeBefore = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
  );
  const logCountBeforeDuplicateSelection = db.connection.operationLogs.length;
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
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE &&
      /already been selected/.test(error.message)
  );
  assert.equal(db.connection.operationLogs.length, logCountBeforeDuplicateSelection);
  assert.equal(db.connection.quotationTenderFlow.branch_type, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);
  assert.equal(db.connection.quotationTenderFlow.branch_status, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);
  assert.equal(
    db.connection.nodes.find((node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).status,
    branchNodeBefore.status
  );
});

test('business owner saves and submits quotation form, accepted quotation approves node and auto advances to contract stage', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  const uploadsAfterBranch = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    uploadsAfterBranch.slots.some((slot) => slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE),
    false
  );

  const initialForm = await getSolutionDesignQuotationForm({ projectId: 100, user: businessOwner }, db);
  assert.equal(initialForm.permissions.canEdit, true);
  assert.equal(initialForm.permissions.canEditQuotationForm, true);
  assert.equal(initialForm.permissions.canSubmitQuotationForm, true);
  assert.equal(initialForm.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT);
  assert.equal(initialForm.form.revision, initialForm.nodeRevision);

  const saved = await saveSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload({
        recipientName: '保存草稿客户',
        items: [
          {
            name: '草稿设备',
            unit: '套',
            quantity: '1',
            unitPrice: '100.00',
            remark: ''
          }
        ]
      }),
      user: businessOwner
    },
    db
  );
  assert.equal(saved.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT);
  assert.equal(saved.form.formData.totalAmount, '100.00');
  assert.equal(saved.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED);

  const submittedForm = await submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload(),
      user: businessOwner
    },
    db
  );
  assert.equal(submittedForm.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED);
  assert.equal(submittedForm.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED);
  assert.equal(submittedForm.form.formData.items[0].amount, '2125.26');
  assert.equal(submittedForm.form.formData.totalAmount, '5582.04');
  assert.equal(submittedForm.form.formData.totalAmountUppercase, '伍仟伍佰捌拾贰元零肆分');
  assert.equal(submittedForm.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
  assert.equal(submittedForm.form.generatedFile.mimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const quotationForm = db.connection.currentQuotationForm();
  const quotationGeneratedKey = quotationForm.generated_file_storage_key;
  assert.equal(db.generatedFileStorage.written.at(-1).storageKey, quotationGeneratedKey);
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '王客户');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '先生');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '商务负责人');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '023-12345678');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '重庆凯尔夫智能测控技术有限责任公司');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, quotationGeneratedKey, '2026年7月13日');
  assertQuotationContactLineUsesPhoneUnderlineRun(db.generatedFileStorage, quotationGeneratedKey);
  const quotationRows = extractDocxTableRows(db.generatedFileStorage, quotationGeneratedKey);
  assert.deepEqual(quotationRows[1].slice(0, 7), ['1', '机器人工作站', '套', '2.125', '1000.12', '2125.26', '含安装调试']);
  assert.deepEqual(quotationRows[2].slice(0, 7), ['2', '视觉检测系统', '套', '1', '3456.78', '3456.78', '']);
  const firstItemCells = extractDocxTableCellXmls(db.generatedFileStorage, quotationGeneratedKey, 1);
  ['1', '机器人工作站', '套', '2.125', '1000.12', '2125.26', '含安装调试'].forEach((expectedText, index) => {
    assertGeneratedDocxCellSingleParagraph(firstItemCells[index], expectedText);
  });
  assert.ok(quotationRows.some((row) => row.includes('伍仟伍佰捌拾贰元零肆分') && row.includes('5582.04')));

  const download = await getSolutionDesignQuotationGeneratedFileDownload(
    { projectId: 100, user: businessOwner },
    db
  );
  assert.equal(download.filePath, quotationGeneratedKey);
  assert.equal(download.mimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const submittedWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(submittedWorkflow.quotationTender.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SUBMITTED);
  assert.equal(submittedWorkflow.quotationTender.permissions.canUploadQuotation, false);
  assert.equal(submittedWorkflow.quotationTender.permissions.canSubmitQuotation, false);
  assert.equal(submittedWorkflow.quotationTender.permissions.canAcceptQuotation, true);
  assert.equal(
    findWorkflowNode(submittedWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER).permissions.canUploadQuotation,
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
  assert.equal(accepted.currentStage.stageKey, 'contract');
  assert.deepEqual(
    db.connection.operationLogs.slice(-4).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT,
      OPERATION_ACTION_TYPE.STAGE_ADVANCED
    ]
  );
  const autoAdvanceLog = db.connection.operationLogs.at(-1);
  const details = JSON.parse(autoAdvanceLog.details_json);
  assert.equal(autoAdvanceLog.actor_user_id, businessOwner.id);
  assert.equal(autoAdvanceLog.summary, '系统自动推进阶段：方案设计阶段 -> 合同签订阶段');
  assert.equal(details.advanceMode, 'automatic');
  assert.equal(details.triggerAction, OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED);
  assert.equal(details.fromStageKey, 'solution');
  assert.equal(details.toStageKey, 'contract');
  assert.equal(details.completenessSummary.completionPercent, 100);
});

test('quotation form supports dynamic docx rows and keeps total row, company and date after 10 items', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  const submitted = await submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayloadWithItemCount(10),
      user: businessOwner
    },
    db
  );

  assert.equal(submitted.form.formData.items.length, 10);
  assert.equal(submitted.form.formData.items[9].amount, '12.36');
  assert.equal(submitted.form.formData.totalAmount, '948.36');
  const generatedKey = db.connection.currentQuotationForm().generated_file_storage_key;
  const rows = extractDocxTableRows(db.generatedFileStorage, generatedKey);
  assert.deepEqual(rows[10].slice(0, 7), ['10', '动态明细10', '项', '1.2345', '10.01', '12.36', '备注10']);
  const tenthItemCells = extractDocxTableCellXmls(db.generatedFileStorage, generatedKey, 10);
  ['10', '动态明细10', '项', '1.2345', '10.01', '12.36', '备注10'].forEach((expectedText, index) => {
    assertGeneratedDocxCellSingleParagraph(tenthItemCells[index], expectedText);
  });
  assert.ok(rows[11].includes(submitted.form.formData.totalAmountUppercase));
  assert.ok(rows[11].includes('948.36'));
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, generatedKey, '重庆凯尔夫智能测控技术有限责任公司');
  assertGeneratedDocxTextIncludes(db.generatedFileStorage, generatedKey, '2026年7月13日');
});

test('quotation form defaults blank quotation date from submitted_at Date object in generated docx', async () => {
  const db = fakeDb({ quotationSubmittedAt: new Date(2026, 6, 15, 8, 30, 0) });
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  const submitted = await submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload({ quotationDate: '' }),
      user: businessOwner
    },
    db
  );

  assert.equal(submitted.form.formData.quotationDate, '');
  const generatedKey = db.connection.currentQuotationForm().generated_file_storage_key;
  const generatedText = extractDocxText(generatedDocxDocumentXml(db.generatedFileStorage, generatedKey));
  assert.match(generatedText, /2026年7月15日/);
  assert.doesNotMatch(generatedText, /Mon Jul/);
});

test('quotation form draft allows partial item rows but submit requires complete item data', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const partialPayload = quotationFormPayload({
    items: [
      {
        name: '半填设备',
        unit: '套',
        quantity: '',
        unitPrice: '',
        remark: '待补报价'
      }
    ]
  });

  await activateQuotationOrTenderNode(db, storage);
  const saved = await saveSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: partialPayload,
      user: businessOwner
    },
    db
  );

  assert.equal(saved.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT);
  assert.equal(saved.form.formData.items[0].name, '半填设备');
  assert.equal(saved.form.formData.items[0].quantity, '');
  assert.equal(saved.form.formData.items[0].unitPrice, '');
  assert.equal(saved.form.formData.items[0].amount, '0.00');
  assert.equal(saved.form.formData.totalAmount, '0.00');

  await assert.rejects(
    () =>
      saveSolutionDesignQuotationForm(
        {
          projectId: 100,
          payload: quotationFormPayload({
            items: [
              {
                name: '非法数字草稿',
                unit: '套',
                quantity: '1.23456',
                unitPrice: '',
                remark: ''
              }
            ]
          }),
          user: businessOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM &&
      error.statusCode === 400 &&
      /formData\.items\[0\]\.quantity/.test(error.message)
  );
  await assert.rejects(
    () =>
      submitSolutionDesignQuotationForm(
        {
          projectId: 100,
          payload: partialPayload,
          user: businessOwner
        },
        db
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM &&
      error.statusCode === 400 &&
      /formData\.items\[0\]\.quantity is required/.test(error.message)
  );
});

test('quotation form generation failure blocks branch submission, result processing and C18 completion', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const failingGeneratedStorage = fakeGeneratedFileStorage({ failWrite: true });
  const businessOwner = authUser(db.connection.users.get(13));

  await activateQuotationOrTenderNode(db, storage);
  await assert.rejects(
    () =>
      submitSolutionDesignQuotationForm(
        {
          projectId: 100,
          payload: quotationFormPayload(),
          user: businessOwner
        },
        db,
        failingGeneratedStorage
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_GENERATION_FAILED &&
      error.statusCode === 500 &&
      /Solution design quotation file generation failed/.test(error.message) &&
      /FAKE_GENERATED_FILE_WRITE_FAILED/.test(error.message)
  );

  const current = await getSolutionDesignQuotationForm({ projectId: 100, user: businessOwner }, db);
  assert.equal(current.branchStatus, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);
  assert.equal(current.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT);
  assert.equal(current.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.FAILED);
  assert.match(current.form.generatedFile.errorMessage, /fake generated file write failed/);
  assert.equal(failingGeneratedStorage.cleaned.length, 1);
  assert.equal(db.connection.quotationTenderFlow.branch_status, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.SELECTED);

  await assert.rejects(
    () =>
      processSolutionDesignQuotationResult(
        {
          projectId: 100,
          payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
          user: businessOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED
  );
  await assertStageAdvanceBlocked(db, authUser(db.connection.users.get(30)), ['C18']);
});

test('quotation generated file download rejects missing storage key and missing stored file', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitQuotation(db, storage);
  const quotationForm = db.connection.currentQuotationForm();
  const generatedKey = quotationForm.generated_file_storage_key;
  quotationForm.generated_file_storage_key = null;
  await assert.rejects(
    () => getSolutionDesignQuotationGeneratedFileDownload({ projectId: 100, user: businessOwner }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_NOT_FOUND
  );

  quotationForm.generated_file_storage_key = generatedKey;
  db.generatedFileStorage.files.delete(generatedKey);
  await assert.rejects(
    () => getSolutionDesignQuotationGeneratedFileDownload({ projectId: 100, user: businessOwner }, db),
    (error) => error.code === SOLUTION_DESIGN_ERROR.GENERATED_FILE_MISSING
  );
});

test('quotation branch rejects legacy quotation_file uploads and old upload data cannot satisfy C18 gates', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const generalManager = authUser(db.connection.users.get(30));

  await activateQuotationOrTenderNode(db, storage);
  const writeCountBefore = storage.written.length;
  const uploadFileCountBefore = db.connection.uploadFiles.length;
  await assert.rejects(
    () =>
      uploadSolutionDesignWorkflowFile(
        {
          projectId: 100,
          slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
          file: testUploadFile('旧报价单.xlsx'),
          user: businessOwner
        },
        db,
        storage
      ),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_NOT_PROCESSABLE &&
      error.message.includes('quotation online form')
  );
  assert.equal(storage.written.length, writeCountBefore);
  assert.equal(db.connection.uploadFiles.length, uploadFileCountBefore);

  await assert.rejects(
    () =>
      saveSolutionDesignQuotationForm(
        {
          projectId: 100,
          payload: quotationFormPayload(),
          user: technicalOwner
        },
        db
      ),
    (error) => error.code === SOLUTION_DESIGN_ERROR.FORBIDDEN
  );

  const quotationSlot = db.connection.uploadSlots.find(
    (slot) => slot.slot_key === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE
  );
  assert.ok(quotationSlot);
  quotationSlot.status = SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.UPLOADED;
  quotationSlot.revision = 1;
  db.connection.uploadFiles.push({
    id: db.connection.nextUploadFileId++,
    project_id: 100,
    slot_id: quotationSlot.id,
    slot_key: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE,
    revision: 1,
    original_file_name: '历史报价单.xlsx',
    storage_key: 'legacy/quotation.xlsx',
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 123,
    is_current: 1,
    uploaded_by_user_id: businessOwner.id,
    uploaded_at: '2026-07-08 09:59:00',
    replaced_at: null
  });

  const workflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(workflow.quotationTender.permissions.canSubmitQuotation, false);
  await assert.rejects(
    () => submitSolutionDesignQuotation({ projectId: 100, user: businessOwner }, db),
    (error) =>
      error.code === SOLUTION_DESIGN_ERROR.NODE_BLOCKED &&
      error.details.includes('quotation_form_generated_file')
  );
  await assertStageAdvanceBlocked(db, generalManager, ['C18']);
});

test('rejected quotation can return to RD cost and current cost files can be reused in the new cycle', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));
  const rdManager = authUser(db.connection.users.get(1));
  const manufacturingManager = authUser(db.connection.users.get(2));
  const marketingManager = authUser(db.connection.users.get(5));
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
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(findWorkflowNode(returned, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).status, SOLUTION_DESIGN_NODE_STATUS.RETURNED);
  assert.equal(db.connection.quotationTenderFlow.quotation_rejected_action, SOLUTION_DESIGN_QUOTATION_REJECTED_ACTION.RETURN_TO_RD_COST);
  const returnedForTechnicalOwner = await getSolutionDesignWorkflow({ projectId: 100, user: technicalOwner }, db);
  assert.equal(
    findWorkflowNode(returnedForTechnicalOwner, SOLUTION_DESIGN_NODE_KEY.RD_COST).permissions.canSubmit,
    true
  );

  assert.equal(
    db.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_REJECTED_RETURN_RD_COST
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
  assert.equal(findWorkflowNode(afterRdApproval, SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST).permissions.canSubmit, true);
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
  const afterManufacturingApproval = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  assert.equal(findWorkflowNode(afterManufacturingApproval, SOLUTION_DESIGN_NODE_KEY.MARKETING_COST).permissions.canSubmit, true);
  await submitSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: businessOwner
    },
    db
  );
  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
      user: marketingManager
    },
    db
  );
  const afterMarketingApproval = await getSolutionDesignWorkflow({ projectId: 100, user: financeAccountant }, db);
  assert.equal(findWorkflowNode(afterMarketingApproval, SOLUTION_DESIGN_NODE_KEY.FINANCE_COST).permissions.canSubmit, true);
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
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    db
  );
  const reopenedQuotation = await getSolutionDesignQuotationForm({ projectId: 100, user: businessOwner }, db);
  assert.equal(reopenedQuotation.permissions.canEdit, true);
  assert.equal(reopenedQuotation.form.status, SOLUTION_DESIGN_QUOTATION_FORM_STATUS.DRAFT);
  assert.equal(reopenedQuotation.form.revision, reopenedQuotation.nodeRevision);
  assert.equal(reopenedQuotation.form.formData.recipientName, '王客户');
  const reselectedUploads = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, db);
  assert.equal(
    reselectedUploads.slots.some((slot) => slot.slotKey === SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE),
    false
  );
  const resubmittedQuotation = await submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload({
        recipientName: '第二轮客户',
        items: [
          {
            name: '第二轮报价设备',
            unit: '套',
            quantity: '1',
            unitPrice: '2000.00',
            remark: '第二轮'
          }
        ]
      }),
      user: businessOwner
    },
    db
  );
  assert.equal(resubmittedQuotation.form.revision, 2);
  assert.equal(resubmittedQuotation.permissions.canEdit, false);
  assert.equal(resubmittedQuotation.form.generatedFile.status, SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED);
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

  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
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
  assert.equal(approved.currentStage.stageKey, 'contract');
  assert.deepEqual(
    db.connection.operationLogs.slice(-4).map((log) => log.action_type),
    [
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_SUBMITTED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED,
      OPERATION_ACTION_TYPE.SOLUTION_DESIGN_READY_FOR_CONTRACT,
      OPERATION_ACTION_TYPE.STAGE_ADVANCED
    ]
  );
});

test('tender uploads catch up when the node revision is ahead of slot upload history', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));
  const technicalOwner = authUser(db.connection.users.get(12));

  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
  const tenderNode = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
  );
  tenderNode.current_revision = 4;
  db.connection.quotationTenderFlow.revision = 4;

  const businessFile = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE,
      file: testUploadFile('投标商务标-r4.docx'),
      user: businessOwner
    },
    db,
    storage
  );
  const technicalFile = await uploadSolutionDesignWorkflowFile(
    {
      projectId: 100,
      slotKey: SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE,
      file: testUploadFile('投标技术标-r4.docx'),
      user: technicalOwner
    },
    db,
    storage
  );

  assert.equal(businessFile.file.revision, 4);
  assert.equal(technicalFile.file.revision, 4);
  const readyWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, db);
  const readyTenderNode = findWorkflowNode(readyWorkflow, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(readyTenderNode.permissions.canSubmit, true);
  assert.equal(readyTenderNode.permissions.canSubmitTender, true);
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

  await activateQuotationOrTenderNode(
    quotationDb,
    quotationStorage,
    SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION
  );
  const readyForBranch = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, quotationDb);

  for (const nodeKey of [
    SOLUTION_DESIGN_NODE_KEY.PREPARATION,
    SOLUTION_DESIGN_NODE_KEY.ANALYSIS,
    SOLUTION_DESIGN_NODE_KEY.DESIGN,
    SOLUTION_DESIGN_NODE_KEY.INTERNAL_REVIEW,
    SOLUTION_DESIGN_NODE_KEY.CUSTOMER_REVIEW,
    SOLUTION_DESIGN_NODE_KEY.RD_COST,
    SOLUTION_DESIGN_NODE_KEY.MANUFACTURING_COST,
    SOLUTION_DESIGN_NODE_KEY.MARKETING_COST,
    SOLUTION_DESIGN_NODE_KEY.FINANCE_COST
  ]) {
    assert.equal(findWorkflowNode(readyForBranch, nodeKey).status, SOLUTION_DESIGN_NODE_STATUS.APPROVED);
  }
  const branchNode = findWorkflowNode(readyForBranch, SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER);
  assert.equal(branchNode.status, SOLUTION_DESIGN_NODE_STATUS.PENDING);
  assert.equal(branchNode.permissions.canSelectBranch, false);
  assert.equal(readyForBranch.quotationTender.branchType, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION);

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
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.MARKETING_COST_ESTIMATION,
    SOLUTION_DESIGN_UPLOAD_SLOT_KEY.FINANCE_COST_ESTIMATION
  ]) {
    assert.ok(quotationDb.connection.currentUploadFileForSlot(slotKey), `Expected current file for ${slotKey}`);
  }

  await submitSolutionDesignQuotationForm(
    {
      projectId: 100,
      payload: quotationFormPayload({
        recipientName: 'Smoke 客户',
        items: [
          {
            name: 'Smoke 报价项',
            unit: '套',
            quantity: '1',
            unitPrice: '1234.56',
            remark: ''
          }
        ]
      }),
      user: businessOwner
    },
    quotationDb
  );
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
  assert.equal(accepted.currentStage.stageKey, 'contract');
  assert.equal(
    quotationDb.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.STAGE_ADVANCED
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
  assert.equal(tenderApproved.currentStage.stageKey, 'contract');
  const tenderUploads = await listSolutionDesignUploads({ projectId: 100, user: tenderBusinessOwner }, tenderDb);
  assert.equal(findUploadSlot(tenderUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_BUSINESS_FILE).currentFile.revision, 1);
  assert.equal(findUploadSlot(tenderUploads, SOLUTION_DESIGN_UPLOAD_SLOT_KEY.TENDER_TECHNICAL_FILE).currentFile.revision, 1);
  assert.equal(
    tenderDb.connection.operationLogs.at(-1).action_type,
    OPERATION_ACTION_TYPE.STAGE_ADVANCED
  );
});

test('quotation path derives stage gate complete and auto advances to contract stage', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitQuotation(db, storage);
  const accepted = await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
      user: businessOwner
    },
    db
  );

  assert.equal(accepted.permissions.canAdvanceToContract, true);
  assert.equal(accepted.currentStage.stageKey, 'contract');
  assert.equal(db.connection.stages.length, 8);
  assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
  assert.equal(db.connection.stageDocuments.some((document) => document.stage_order === 3), false);
  assert.equal(
    db.connection.stageDocuments.every((document) => document.status === DOCUMENT_STATUS.NOT_SUBMITTED),
    true
  );

  const stageAdvanceLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED
  );
  assert.ok(stageAdvanceLog);
  const details = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(details.advanceMode, 'automatic');
  assert.equal(details.triggerAction, OPERATION_ACTION_TYPE.SOLUTION_DESIGN_QUOTATION_ACCEPTED);
  assert.equal(details.completenessSummary.completionPercent, 100);
  assert.equal(details.completenessSummary.incompleteRequiredCount, 0);
});

test('legacy v20260629 solution document codes derive stage gate complete and auto advance', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  useLegacySolutionDesignStageDocumentCodes(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));

  await submitTenderForReview(db, storage);
  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: generalManager
    },
    db
  );

  assert.equal(approved.permissions.canAdvanceToContract, true);
  assert.equal(approved.currentStage.stageKey, 'contract');
  assert.equal(
    db.connection.stageDocuments.some((document) => document.document_code === '2.1'),
    true
  );
  const stageAdvanceLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED
  );
  assert.ok(stageAdvanceLog);
  const details = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(details.completenessSummary.completionPercent, 100);
  assert.equal(details.completenessSummary.incompleteRequiredCount, 0);
});

test('manual fallback advances completed solution workflow projects that missed the write trigger', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));

  await submitTenderForReview(db, storage);
  const tenderNode = db.connection.nodes.find(
    (node) => node.node_key === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER
  );
  assert.equal(tenderNode.status, SOLUTION_DESIGN_NODE_STATUS.PENDING_REVIEW);
  Object.assign(tenderNode, {
    status: SOLUTION_DESIGN_NODE_STATUS.APPROVED,
    approved_at: '2026-07-08 11:00:00',
    updated_at: '2026-07-08 11:00:00'
  });
  Object.assign(db.connection.quotationTenderFlow, {
    branch_status: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_STATUS.APPROVED,
    updated_by_user_id: generalManager.id,
    updated_at: '2026-07-08 11:00:00'
  });

  assert.equal(db.connection.project.current_stage_key, 'solution');
  assert.equal(
    db.connection.operationLogs.some((log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED),
    false
  );

  const advanced = await advanceProjectStage(100, generalManager, db);

  assert.equal(advanced.currentStage.stageKey, 'contract');
  assert.equal(advanced.stageAdvance.advanced, true);
  assert.equal(advanced.stageAdvance.advancedStage.stageKey, 'solution');
  assert.equal(advanced.stageAdvance.nextStage.stageKey, 'contract');
  const stageAdvanceLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED
  );
  assert.ok(stageAdvanceLog);
  const details = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(details.advanceMode, 'manual_fallback');
  assert.equal(details.fromStageKey, 'solution');
  assert.equal(details.toStageKey, 'contract');
  assert.equal(details.completenessSummary.completionPercent, 100);
  assert.equal(details.completenessSummary.incompleteRequiredCount, 0);
});

test('overview uses pending project summary without marking completed workflow project', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const projectManager = authUser(db.connection.users.get(11));
  const businessOwner = authUser(db.connection.users.get(13));

  for (const document of db.connection.stageDocuments) {
    document.responsible_user_id = projectManager.id;
  }

  await submitQuotation(db, storage);
  await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
      user: businessOwner
    },
    db
  );

  const overview = await getProjectOverviewDashboard(
    projectManager,
    { status: null, currentStageOrder: null, keyword: '' },
    db.connection,
    async () => ({ total: 0, projectIds: [] })
  );

  assert.equal(overview.summary.myPendingTasks, 0);
  assert.equal(overview.projects[0].currentStageOrder, 3);
  assert.equal(overview.projects[0].currentStageName, '合同签订阶段');
  assert.equal(overview.projects[0].currentStageCompletenessSummary, null);
  assert.equal(overview.projects[0].hasMyPendingTasks, false);
});

test('overview uses pending project summary total and deduplicated project ids', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const technicalOwner = authUser(db.connection.users.get(12));
  const workPlanDocument = db.connection.stageDocuments.find((document) => document.document_code === 'C04');
  workPlanDocument.responsible_user_id = technicalOwner.id;

  const overview = await getProjectOverviewDashboard(
    technicalOwner,
    { status: null, currentStageOrder: null, keyword: '' },
    db.connection,
    async () => ({ total: 2, projectIds: ['100'] })
  );

  assert.equal(overview.summary.myPendingTasks, 2);
  assert.equal(overview.projects[0].hasMyPendingTasks, true);
});

test('non-applicable solution design output stays not_applicable and does not block stage advance', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const businessOwner = authUser(db.connection.users.get(13));

  await submitQuotation(db, storage);
  const cycleTimeDocument = db.connection.stageDocuments.find((document) => document.document_code === 'C10');
  cycleTimeDocument.is_applicable = 0;
  await processSolutionDesignQuotationResult(
    {
      projectId: 100,
      payload: { result: SOLUTION_DESIGN_QUOTATION_RESULT.ACCEPTED },
      user: businessOwner
    },
    db
  );

  const rowsWithDerivedCompletion = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    db.connection,
    db.connection.stageDocuments.map((document) => ({ ...document }))
  );
  const cycleTimeDto = mapDocument(
    rowsWithDerivedCompletion.find((document) => document.document_code === 'C10')
  );

  assert.equal(cycleTimeDto.isApplicable, false);
  assert.equal(cycleTimeDto.isComplete, true);
  assert.equal(cycleTimeDto.completionStatus, COMPLETION_STATUS.NOT_APPLICABLE);
  assert.equal(db.connection.project.current_stage_key, 'contract');
});

test('tender path derives stage gate complete and auto advances to contract stage', async () => {
  const db = fakeDb();
  seedAssignedRoles(db.connection);
  const storage = fakeUploadStorage();
  const generalManager = authUser(db.connection.users.get(30));

  await submitTenderForReview(db, storage);
  const approved = await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      user: generalManager
    },
    db
  );

  assert.equal(approved.permissions.canAdvanceToContract, true);
  assert.equal(approved.currentStage.stageKey, 'contract');
  assert.equal(db.connection.stages.length, 8);
  assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
  assert.equal(db.connection.stageDocuments.some((document) => document.stage_order === 3), false);
  const stageAdvanceLog = db.connection.operationLogs.find(
    (log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED
  );
  const details = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(details.advanceMode, 'automatic');
  assert.equal(details.triggerAction, OPERATION_ACTION_TYPE.SOLUTION_DESIGN_TENDER_APPROVED);
  assert.equal(details.completenessSummary.completionPercent, 100);
  assert.equal(details.completenessSummary.incompleteRequiredCount, 0);

  const navigation = buildProjectNavigationFromWorkspace(
    100,
    buildNavigationWorkspaceFromConnection(db.connection)
  );
  const contractStage = navigation.children.find((stage) => stage.stageKey === 'contract');
  const contractPreparationNode = contractStage.children.find((node) => node.nodeKey === 'contract_preparation');
  const projectKickoffNoticeNode = contractStage.children.find((node) => node.nodeKey === 'project_kickoff_notice');

  assert.equal(navigation.currentStageKey, 'contract');
  assert.equal(contractStage.status, NAVIGATION_STATUS.PROCESSING);
  assert.equal(contractStage.children.length, 3);
  assert.equal(contractPreparationNode.status, NAVIGATION_STATUS.PROCESSING);
  assert.notEqual(contractPreparationNode.status, NAVIGATION_STATUS.PENDING);
  assert.equal(projectKickoffNoticeNode, undefined);
});

test('navigation process nodes respect current, future, and completed stage boundaries', () => {
  const navigation = buildProjectNavigationFromWorkspace(100, {
    project: {
      projectName: '自动推进导航边界项目',
      projectCode: 'NAV-BOUNDARY',
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
        stageId: 201,
        stageOrder: 2,
        stageKey: 'solution',
        stageName: '方案设计阶段',
        stageStatus: 'completed',
        isCurrent: false,
        configured: true,
        nodes: [
          {
            nodeKey: 'solution_archive_notice',
            nodeName: '方案设计归档说明',
            nodeStatus: 'process_node',
            outputs: []
          }
        ]
      },
      {
        stageId: 202,
        stageOrder: 3,
        stageKey: 'contract',
        stageName: '合同签订阶段',
        stageStatus: 'current',
        isCurrent: true,
        configured: true,
        nodes: [
          {
            nodeKey: 'contract_preparation',
            nodeName: '准备协议和合同',
            nodeStatus: 'pending',
            outputs: []
          },
          {
            nodeKey: 'contract_signing',
            nodeName: '签订协议和合同',
            nodeStatus: 'not_started',
            outputs: []
          },
          {
            nodeKey: 'advance_payment',
            nodeName: '项目预付款支付',
            nodeStatus: 'not_started',
            outputs: []
          }
        ]
      },
      {
        stageId: 203,
        stageOrder: 4,
        stageKey: 'detailedDesign',
        stageName: '详细设计阶段',
        stageStatus: 'not_started',
        isCurrent: false,
        configured: true,
        nodes: [
          {
            nodeKey: 'detailed_design_preparation',
            nodeName: '详细设计准备',
            nodeStatus: 'waiting_submission',
            outputs: []
          }
        ]
      }
    ]
  });

  const completedSolutionStage = navigation.children.find((stage) => stage.stageKey === 'solution');
  const contractStage = navigation.children.find((stage) => stage.stageKey === 'contract');
  const futureDetailedDesignStage = navigation.children.find((stage) => stage.stageKey === 'detailedDesign');
  const contractPreparationNode = contractStage.children.find((node) => node.nodeKey === 'contract_preparation');
  const currentAdvancePaymentNode = contractStage.children.find((node) => node.nodeKey === 'advance_payment');
  const projectKickoffNoticeNode = contractStage.children.find((node) => node.nodeKey === 'project_kickoff_notice');
  const futureProcessNode = futureDetailedDesignStage.children.find((node) => node.nodeKey === 'detailed_design_preparation');

  assert.equal(navigation.currentStageKey, 'contract');
  assert.equal(contractStage.status, NAVIGATION_STATUS.PROCESSING);
  assert.equal(contractPreparationNode.status, NAVIGATION_STATUS.PROCESSING);
  assert.notEqual(contractPreparationNode.status, NAVIGATION_STATUS.PENDING);
  assert.equal(currentAdvancePaymentNode.status, NAVIGATION_STATUS.PENDING);
  assert.notEqual(currentAdvancePaymentNode.status, NAVIGATION_STATUS.COMPLETED);
  assert.equal(projectKickoffNoticeNode, undefined);
  assert.equal(completedSolutionStage.children[0].status, NAVIGATION_STATUS.COMPLETED);
  assert.equal(futureProcessNode.status, NAVIGATION_STATUS.PENDING);
});

test('navigation uses solution design workflow nodes before solution stage starts', () => {
  const navigation = buildProjectNavigationFromWorkspace(100, {
    project: {
      projectName: '方案设计导航未开始项目',
      projectCode: 'NAV-BEFORE-SOLUTION',
      projectMode: null,
      status: 'normal'
    },
    currentStage: {
      stageKey: 'initiation',
      stageOrder: 1,
      stageName: '立项阶段'
    },
    stages: [
      {
        stageId: 101,
        stageOrder: 1,
        stageKey: 'initiation',
        stageName: '立项阶段',
        stageStatus: 'current',
        isCurrent: true,
        configured: true,
        nodes: []
      },
      {
        stageId: 102,
        stageOrder: 2,
        stageKey: 'solution',
        stageName: '方案设计阶段',
        stageStatus: 'not_started',
        isCurrent: false,
        configured: true,
        nodes: [
          { nodeKey: 'cost_price_estimation', nodeName: '成本/价格估算', nodeStatus: 'waiting_submission', outputs: [] },
          { nodeKey: 'quotation', nodeName: '报价', nodeStatus: 'waiting_submission', outputs: [] },
          { nodeKey: 'tender', nodeName: '投标', nodeStatus: 'waiting_submission', outputs: [] }
        ]
      }
    ]
  });

  const solutionStage = navigation.children.find((stage) => stage.stageKey === 'solution');
  const nodeKeys = solutionStage.children.map((node) => node.nodeKey);

  assert.deepEqual(nodeKeys, SOLUTION_DESIGN_NODES.map((node) => node.nodeKey));
  assert.equal(nodeKeys.includes('cost_price_estimation'), false);
  assert.equal(nodeKeys.includes('quotation'), false);
  assert.equal(nodeKeys.includes('tender'), false);
  assert.equal(nodeKeys.includes(SOLUTION_DESIGN_NODE_KEY.MARKETING_COST), true);
  assert.equal(solutionStage.children.length, 10);
  assert.equal(solutionStage.children.every((node) => node.status === NAVIGATION_STATUS.PENDING), true);
  assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 71);
});

test('navigation keeps marketing cost estimation selectable after entering solution stage', () => {
  const navigation = buildProjectNavigationFromWorkspace(100, {
    project: {
      projectName: '方案设计导航营销节点项目',
      projectCode: 'NAV-MARKETING-COST',
      projectMode: null,
      status: 'normal'
    },
    currentStage: {
      stageKey: 'solution',
      stageOrder: 2,
      stageName: '方案设计阶段'
    },
    stages: [
      {
        stageId: 202,
        stageOrder: 2,
        stageKey: 'solution',
        stageName: '方案设计阶段',
        stageStatus: 'current',
        isCurrent: true,
        configured: true,
        nodes: [
          ...SOLUTION_DESIGN_NODES.map((node) => ({
            nodeKey: node.nodeKey,
            nodeName: node.nodeName,
            nodeStatus:
              node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST
                ? SOLUTION_DESIGN_NODE_STATUS.PENDING
                : SOLUTION_DESIGN_NODE_STATUS.NOT_STARTED,
            outputs: []
          })),
          { nodeKey: 'cost_price_estimation', nodeName: '成本/价格估算', nodeStatus: 'waiting_submission', outputs: [] }
        ]
      }
    ]
  });

  const solutionStage = navigation.children.find((stage) => stage.stageKey === 'solution');
  const nodeKeys = solutionStage.children.map((node) => node.nodeKey);
  const marketingNode = solutionStage.children.find(
    (node) => node.nodeKey === SOLUTION_DESIGN_NODE_KEY.MARKETING_COST
  );

  assert.deepEqual(nodeKeys, SOLUTION_DESIGN_NODES.map((node) => node.nodeKey));
  assert.equal(solutionStage.children.length, 10);
  assert.equal(nodeKeys.includes('cost_price_estimation'), false);
  assert.equal(marketingNode.name, '营销成本估算');
  assert.equal(marketingNode.status, NAVIGATION_STATUS.PROCESSING);
});

test('auto advance completes project after final stage gate is satisfied', async () => {
  const db = fakeDb({
    project: baseProject({
      current_stage_id: 208,
      current_stage_order: 8,
      current_stage_key: 'closeout',
      current_stage_name: '结题阶段',
      current_stage_status: 'in_progress'
    })
  });
  db.connection.stageDocuments = [closeoutStageDocument()];
  const actor = authUser(db.connection.users.get(30));

  const result = await tryAutoAdvanceProjectStage(
    {
      projectId: 100,
      user: actor,
      triggerAction: 'document.confirmed',
      expectedStageOrder: 8,
      triggerMetadata: {
        stageOrder: 8,
        documentCode: '8.1'
      }
    },
    db
  );

  assert.equal(result.advanced, true);
  assert.equal(result.completedProject, true);
  assert.equal(result.reason, 'project_completed');
  assert.equal(db.connection.project.status, 'completed');
  assert.equal(db.connection.stages.find((stage) => stage.stage_order === 8).is_current, 0);

  const stageAdvanceLog = db.connection.operationLogs.at(-2);
  const projectCompletedLog = db.connection.operationLogs.at(-1);
  assert.equal(stageAdvanceLog.action_type, OPERATION_ACTION_TYPE.STAGE_ADVANCED);
  assert.equal(stageAdvanceLog.actor_user_id, actor.id);
  assert.equal(stageAdvanceLog.summary, '系统自动推进阶段：结题阶段 -> 项目完成');
  assert.equal(projectCompletedLog.action_type, OPERATION_ACTION_TYPE.PROJECT_COMPLETED);
  assert.equal(projectCompletedLog.actor_user_id, actor.id);
  const details = JSON.parse(stageAdvanceLog.details_json);
  assert.equal(details.advanceMode, 'automatic');
  assert.equal(details.triggerAction, 'document.confirmed');
  assert.equal(details.fromStageOrder, 8);
  assert.equal(details.toStageKey, null);
  assert.equal(details.documentCode, '8.1');
});

test('auto advance skips ended or completed projects without logs', async () => {
  for (const status of ['ended', 'completed']) {
    const db = fakeDb({ project: baseProject({ status }) });
    const actor = authUser(db.connection.users.get(30));

    const result = await tryAutoAdvanceProjectStage(
      {
        projectId: 100,
        user: actor,
        triggerAction: 'document.confirmed',
        expectedStageOrder: 2
      },
      db
    );

    assert.equal(result.advanced, false);
    assert.equal(result.reason, status === 'completed' ? 'project_completed' : 'project_ended');
    assert.equal(db.connection.project.current_stage_key, 'solution');
    assert.equal(db.connection.operationLogs.length, 0);
  }
});

test('auto advance is idempotent when trigger stage no longer matches', async () => {
  const db = fakeDb();
  const actor = authUser(db.connection.users.get(30));

  const result = await tryAutoAdvanceProjectStage(
    {
      projectId: 100,
      user: actor,
      triggerAction: 'document.confirmed',
      expectedStageOrder: 1
    },
    db
  );

  assert.equal(result.advanced, false);
  assert.equal(result.reason, 'stage_mismatch');
  assert.equal(result.currentStage.stageKey, 'solution');
  assert.equal(db.connection.project.current_stage_key, 'solution');
  assert.equal(db.connection.operationLogs.length, 0);
});

test('auto advance rolls back and writes no success log when transition update fails', async () => {
  const db = fakeDb({
    project: baseProject({
      current_stage_id: 208,
      current_stage_order: 8,
      current_stage_key: 'closeout',
      current_stage_name: '结题阶段',
      current_stage_status: 'in_progress'
    })
  });
  db.connection.stageDocuments = [closeoutStageDocument()];
  const actor = authUser(db.connection.users.get(30));
  let snapshot = null;
  const originalExecute = db.connection.execute.bind(db.connection);

  db.connection.beginTransaction = async () => {
    snapshot = {
      project: { ...db.connection.project },
      stages: db.connection.stages.map((stage) => ({ ...stage })),
      operationLogs: db.connection.operationLogs.map((log) => ({ ...log }))
    };
  };
  db.connection.rollback = async () => {
    db.connection.rolledBack = true;
    db.connection.project = { ...snapshot.project };
    db.connection.stages = snapshot.stages.map((stage) => ({ ...stage }));
    db.connection.operationLogs = snapshot.operationLogs.map((log) => ({ ...log }));
  };
  db.connection.execute = async (sql, params = []) => {
    const text = normalizeSql(sql);
    if (text.startsWith('UPDATE projects SET status = ?')) {
      throw new Error('fake automatic advance project status failure');
    }
    return originalExecute(sql, params);
  };

  await assert.rejects(
    () =>
      tryAutoAdvanceProjectStage(
        {
          projectId: 100,
          user: actor,
          triggerAction: 'document.confirmed',
          expectedStageOrder: 8
        },
        db
      ),
    /fake automatic advance project status failure/
  );

  assert.equal(db.connection.rolledBack, true);
  assert.equal(db.connection.project.status, 'active');
  assert.equal(db.connection.stages.find((stage) => stage.stage_order === 8).is_current, 1);
  assert.equal(
    db.connection.operationLogs.some((log) => log.action_type === OPERATION_ACTION_TYPE.STAGE_ADVANCED),
    false
  );
});

test('solution design derived gate blocks incomplete workflow, missing branch, unfinished branch, and old tender revision', async () => {
  const generalManager = authUser(baseUsers().get(30));

  const initialDb = fakeDb();
  seedAssignedRoles(initialDb.connection);
  await assertStageAdvanceBlocked(initialDb, generalManager, ['C04', 'C18', 'C19']);

  const missingBranchDb = fakeDb();
  seedAssignedRoles(missingBranchDb.connection);
  await activateLegacyUnselectedQuotationOrTenderNode(missingBranchDb, fakeUploadStorage());
  await assertStageAdvanceBlocked(missingBranchDb, generalManager, ['C18', 'C19']);

  const quotationSubmittedDb = fakeDb();
  seedAssignedRoles(quotationSubmittedDb.connection);
  await submitQuotation(quotationSubmittedDb, fakeUploadStorage());
  await assertStageAdvanceBlocked(quotationSubmittedDb, generalManager, ['C18']);

  const tenderSubmittedDb = fakeDb();
  seedAssignedRoles(tenderSubmittedDb.connection);
  await submitTenderForReview(tenderSubmittedDb, fakeUploadStorage());
  await assertStageAdvanceBlocked(tenderSubmittedDb, generalManager, ['C19']);

  const tenderReturnedDb = fakeDb();
  seedAssignedRoles(tenderReturnedDb.connection);
  await submitTenderForReview(tenderReturnedDb, fakeUploadStorage());
  await returnSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER,
      payload: { returnReason: '投标文件需要重新确认' },
      user: generalManager
    },
    tenderReturnedDb
  );
  await assertStageAdvanceBlocked(tenderReturnedDb, generalManager, ['C19']);
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

  await activateQuotationOrTenderNode(db, storage, SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER);
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

test('solution design workbench todos move from finance approval branch selection to selected branch work', async () => {
  const quotationDb = fakeDb();
  seedAssignedRoles(quotationDb.connection);
  const generalManager = authUser(quotationDb.connection.users.get(30));
  const businessOwner = authUser(quotationDb.connection.users.get(13));
  await submitFinanceCostForGeneralReview(quotationDb);

  const generalWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: generalManager }, quotationDb);
  const generalUploads = await listSolutionDesignUploads({ projectId: 100, user: generalManager }, quotationDb);
  const generalTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: quotationDb.connection.project,
    workflow: generalWorkflow,
    uploads: generalUploads
  });
  assert.ok(
    generalTodos.some(
      (todo) =>
        todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.FINANCE_COST &&
        todo.actionText === '总经理审批/退回财务成本估算'
    )
  );

  await approveSolutionDesignWorkflowNode(
    {
      projectId: 100,
      nodeKey: SOLUTION_DESIGN_NODE_KEY.FINANCE_COST,
      payload: { branchType: SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.QUOTATION },
      user: generalManager
    },
    quotationDb
  );
  const businessWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: businessOwner }, quotationDb);
  const businessUploads = await listSolutionDesignUploads({ projectId: 100, user: businessOwner }, quotationDb);
  const businessTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: quotationDb.connection.project,
    workflow: businessWorkflow,
    uploads: businessUploads
  });
  assert.equal(
    businessTodos.some((todo) => todo.actionKey === 'select_quotation_tender_branch'),
    false
  );
  assert.ok(
    businessTodos.some(
      (todo) =>
        todo.nodeKey === SOLUTION_DESIGN_NODE_KEY.QUOTATION_OR_TENDER &&
        todo.actionText === '填写/提交报价单在线表单'
    )
  );

  const tenderDb = fakeDb();
  seedAssignedRoles(tenderDb.connection);
  const tenderStorage = fakeUploadStorage();
  const tenderBusinessOwner = authUser(tenderDb.connection.users.get(13));
  const tenderTechnicalOwner = authUser(tenderDb.connection.users.get(12));
  await activateQuotationOrTenderNode(
    tenderDb,
    tenderStorage,
    SOLUTION_DESIGN_QUOTATION_TENDER_BRANCH_TYPE.TENDER
  );
  const tenderBusinessWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: tenderBusinessOwner }, tenderDb);
  const tenderBusinessUploads = await listSolutionDesignUploads({ projectId: 100, user: tenderBusinessOwner }, tenderDb);
  const tenderBusinessTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: tenderDb.connection.project,
    workflow: tenderBusinessWorkflow,
    uploads: tenderBusinessUploads
  });
  assert.equal(
    tenderBusinessTodos.some((todo) => todo.actionKey === 'select_quotation_tender_branch'),
    false
  );
  assert.ok(tenderBusinessTodos.some((todo) => todo.actionText === '上传投标商务标'));

  const tenderTechnicalWorkflow = await getSolutionDesignWorkflow({ projectId: 100, user: tenderTechnicalOwner }, tenderDb);
  const tenderTechnicalUploads = await listSolutionDesignUploads({ projectId: 100, user: tenderTechnicalOwner }, tenderDb);
  const tenderTechnicalTodos = buildSolutionDesignWorkbenchTodos({
    projectRow: tenderDb.connection.project,
    workflow: tenderTechnicalWorkflow,
    uploads: tenderTechnicalUploads
  });
  assert.ok(tenderTechnicalTodos.some((todo) => todo.actionText === '上传投标技术标'));
});
