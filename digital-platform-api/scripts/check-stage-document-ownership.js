import assert from 'node:assert/strict';
import { closePool, pool } from '../src/db/pool.js';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  canManageStageDocumentApplicability,
  canManageProjectResponsibility,
  isValidBusinessDepartment
} from '../src/domain/organization.js';
import {
  DOCUMENT_STATUS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
  STAGE_DOCUMENT_TEMPLATE_VERSION,
  loadStageDocumentTemplateItems
} from '../src/domain/stageDocumentTemplates.js';
import {
  buildStageDocumentPermissions,
  canViewStageDocumentItem
} from '../src/repositories/stageDocuments/accessControl.js';
import { isDocumentRelatedToDepartmentByOwnership } from '../../digital-platform-web/src/components/project-detail/stageDocumentViewHelpers.js';

const {
  MARKETING_CENTER,
  MANUFACTURING_CENTER,
  OPERATIONS_CENTER,
  RD_CENTER
} = BUSINESS_DEPARTMENT;

function departmentUser(id, organizationRole, department) {
  return {
    id,
    organizationRole,
    department,
    isEnabled: true
  };
}

function globalUser(id, organizationRole) {
  return {
    id,
    organizationRole,
    department: null,
    isEnabled: true
  };
}

function makeDocument(patch = {}) {
  return {
    id: 1,
    projectId: 1,
    templateVersion: STAGE_DOCUMENT_TEMPLATE_VERSION,
    documentCode: '2.4',
    documentName: '3D模型',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    responsibleUserId: null,
    responsibleUser: null,
    status: DOCUMENT_STATUS.NOT_SUBMITTED,
    isApplicable: true,
    ...patch
  };
}

const project = {
  id: 1,
  project_manager_user_id: 99,
  participating_departments: JSON.stringify([]),
  has_department_responsible: 0
};

const rdManager = departmentUser(10, ORGANIZATION_ROLE.CENTER_MANAGER, RD_CENTER);
const manufacturingManager = departmentUser(11, ORGANIZATION_ROLE.CENTER_MANAGER, MANUFACTURING_CENTER);
const marketingManager = departmentUser(12, ORGANIZATION_ROLE.CENTER_MANAGER, MARKETING_CENTER);
const operationsManager = departmentUser(13, ORGANIZATION_ROLE.CENTER_MANAGER, OPERATIONS_CENTER);
const rdEmployee = departmentUser(20, ORGANIZATION_ROLE.EMPLOYEE, RD_CENTER);
const manufacturingEmployee = departmentUser(21, ORGANIZATION_ROLE.EMPLOYEE, MANUFACTURING_CENTER);
const systemAdmin = globalUser(30, ORGANIZATION_ROLE.SYSTEM_ADMIN);
const generalManagerAssistant = globalUser(31, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT);
const generalManager = globalUser(32, ORGANIZATION_ROLE.GENERAL_MANAGER);

const items = await loadStageDocumentTemplateItems();
const markdownItems = await loadStageDocumentTemplateItems(
  '../docs/9.10_v20260624阶段资料模板规划_20260624.md'
);
assert.equal(items.length, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(markdownItems.length, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(STAGE_DOCUMENT_TEMPLATE_VERSION, 'v20260624');
assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 64);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 54);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 66);

for (const item of items) {
  assert.equal(item.templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
  assert.notEqual(item.templateVersion, 'v20260610');
  assert.ok(Object.hasOwn(item, 'ownerDepartment'), `${item.documentCode} missing ownerDepartment`);
  assert.ok(Object.hasOwn(item, 'reviewDepartment'), `${item.documentCode} missing reviewDepartment`);
  assert.ok(
    item.ownerDepartment === null || isValidBusinessDepartment(item.ownerDepartment),
    `${item.documentCode} invalid ownerDepartment`
  );
  assert.ok(
    item.reviewDepartment === null || isValidBusinessDepartment(item.reviewDepartment),
    `${item.documentCode} invalid reviewDepartment`
  );
}

const byCode = new Map(items.map((item) => [item.documentCode, item]));
const markdownByCode = new Map(markdownItems.map((item) => [item.documentCode, item]));
assert.equal(byCode.size, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(markdownByCode.size, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(byCode.has('7.P1'), false);
assert.equal(byCode.has('8.P1'), false);
assert.equal(markdownByCode.has('7.P1'), false);
assert.equal(markdownByCode.has('8.P1'), false);
assert.deepEqual(
  [...items.reduce((counts, item) => counts.set(item.stageOrder, (counts.get(item.stageOrder) || 0) + 1), new Map())]
    .sort(([stageA], [stageB]) => stageA - stageB)
    .map(([stageOrder, count]) => `${stageOrder}:${count}`),
  ['1:3', '2:15', '3:4', '4:17', '5:17', '6:2', '7:4', '8:2']
);
assert.deepEqual(
  [
    ...markdownItems.reduce(
      (counts, item) => counts.set(item.stageOrder, (counts.get(item.stageOrder) || 0) + 1),
      new Map()
    )
  ]
    .sort(([stageA], [stageB]) => stageA - stageB)
    .map(([stageOrder, count]) => `${stageOrder}:${count}`),
  ['1:3', '2:15', '3:4', '4:17', '5:17', '6:2', '7:4', '8:2']
);
assert.deepEqual(
  items.filter((item) => !item.isRequired).map((item) => item.documentCode),
  ['2.6', '2.7', '2.8', '3.4', '5.13', '5.14', '5.15', '5.16', '6.2', '8.1']
);
assert.deepEqual(
  markdownItems.filter((item) => !item.isRequired).map((item) => item.documentCode),
  ['2.6', '2.7', '2.8', '3.4', '5.13', '5.14', '5.15', '5.16', '6.2', '8.1']
);
for (const [documentCode, item] of byCode) {
  const markdownItem = markdownByCode.get(documentCode);
  assert.ok(markdownItem, `Markdown parser missing ${documentCode}`);
  assert.deepEqual(
    {
      stageOrder: markdownItem.stageOrder,
      documentName: markdownItem.documentName,
      isRequired: markdownItem.isRequired,
      ownerDepartment: markdownItem.ownerDepartment,
      reviewDepartment: markdownItem.reviewDepartment,
      submitMode: markdownItem.submitMode
    },
    {
      stageOrder: item.stageOrder,
      documentName: item.documentName,
      isRequired: item.isRequired,
      ownerDepartment: item.ownerDepartment,
      reviewDepartment: item.reviewDepartment,
      submitMode: item.submitMode
    },
    `Markdown parser mismatch for ${documentCode}`
  );
}
assert.deepEqual(
  {
    documentName: byCode.get('2.4').documentName,
    ownerDepartment: byCode.get('2.4').ownerDepartment,
    reviewDepartment: byCode.get('2.4').reviewDepartment
  },
  { documentName: '3D模型', ownerDepartment: RD_CENTER, reviewDepartment: RD_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('4.1').documentName,
    ownerDepartment: byCode.get('4.1').ownerDepartment,
    reviewDepartment: byCode.get('4.1').reviewDepartment
  },
  {
    documentName: '项目启动书',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('4.3').documentName,
    ownerDepartment: byCode.get('4.3').ownerDepartment,
    reviewDepartment: byCode.get('4.3').reviewDepartment
  },
  { documentName: '3D模型', ownerDepartment: RD_CENTER, reviewDepartment: RD_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('5.1').documentName,
    ownerDepartment: byCode.get('5.1').ownerDepartment,
    reviewDepartment: byCode.get('5.1').reviewDepartment
  },
  { documentName: '采购申请表', ownerDepartment: RD_CENTER, reviewDepartment: MANUFACTURING_CENTER }
);
assert.deepEqual(
  {
    isRequired: byCode.get('5.13').isRequired,
    documentName: byCode.get('5.13').documentName,
    ownerDepartment: byCode.get('5.13').ownerDepartment,
    reviewDepartment: byCode.get('5.13').reviewDepartment,
    applicabilityCondition: byCode.get('5.13').applicabilityCondition
  },
  {
    isRequired: false,
    documentName: '3D模型（设计变更）',
    ownerDepartment: RD_CENTER,
    reviewDepartment: RD_CENTER,
    applicabilityCondition: '发生设计变更时适用'
  }
);
assert.deepEqual(
  {
    ownerDepartment: byCode.get('6.1').ownerDepartment,
    reviewDepartment: byCode.get('6.1').reviewDepartment
  },
  { ownerDepartment: MANUFACTURING_CENTER, reviewDepartment: MARKETING_CENTER }
);
assert.deepEqual(
  {
    documentName: byCode.get('7.1').documentName,
    ownerDepartment: byCode.get('7.1').ownerDepartment,
    reviewDepartment: byCode.get('7.1').reviewDepartment
  },
  {
    documentName: '发货单',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('7.2').documentName,
    ownerDepartment: byCode.get('7.2').ownerDepartment,
    reviewDepartment: byCode.get('7.2').reviewDepartment
  },
  {
    documentName: '安装调试记录（现场）',
    ownerDepartment: MANUFACTURING_CENTER,
    reviewDepartment: MANUFACTURING_CENTER
  }
);
assert.deepEqual(
  {
    isRequired: byCode.get('8.1').isRequired,
    documentName: byCode.get('8.1').documentName,
    ownerDepartment: byCode.get('8.1').ownerDepartment,
    reviewDepartment: byCode.get('8.1').reviewDepartment
  },
  {
    isRequired: false,
    documentName: '发票（尾款）',
    ownerDepartment: OPERATIONS_CENTER,
    reviewDepartment: MARKETING_CENTER
  }
);
assert.deepEqual(
  {
    documentName: byCode.get('8.2').documentName,
    ownerDepartment: byCode.get('8.2').ownerDepartment,
    reviewDepartment: byCode.get('8.2').reviewDepartment
  },
  { documentName: '项目结题报告', ownerDepartment: null, reviewDepartment: null }
);

const unassignedRdDocument = makeDocument();
assert.equal(canViewStageDocumentItem(rdManager, { project, document: unassignedRdDocument }), true);
assert.equal(canViewStageDocumentItem(manufacturingManager, { project, document: unassignedRdDocument }), false);
assert.equal(canViewStageDocumentItem(rdEmployee, { project, document: unassignedRdDocument }), false);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: rdEmployee
  }),
  true
);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: unassignedRdDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);

const submittedRdDocument = makeDocument({ status: DOCUMENT_STATUS.SUBMITTED });
assert.equal(
  buildStageDocumentPermissions({ user: rdManager, project, document: submittedRdDocument }).canReviewDocument,
  true
);

const costEstimateDocument = makeDocument({
  documentCode: '2.14',
  documentName: '成本估算表',
  ownerDepartment: RD_CENTER,
  reviewDepartment: OPERATIONS_CENTER
});
assert.equal(canManageStageDocumentApplicability(rdManager, { project, document: costEstimateDocument }), true);
assert.equal(
  canManageStageDocumentApplicability(operationsManager, { project, document: costEstimateDocument }),
  true
);
assert.equal(canManageStageDocumentApplicability(manufacturingManager, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(marketingManager, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(rdEmployee, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(systemAdmin, { project, document: costEstimateDocument }), false);
assert.equal(
  canManageStageDocumentApplicability(generalManagerAssistant, { project, document: costEstimateDocument }),
  false
);
assert.equal(canManageStageDocumentApplicability(generalManager, { project, document: costEstimateDocument }), true);

const submittedMarketingReviewDocument = makeDocument({
  documentCode: '6.1',
  documentName: '预验收单',
  ownerDepartment: MANUFACTURING_CENTER,
  reviewDepartment: MARKETING_CENTER,
  status: DOCUMENT_STATUS.SUBMITTED
});
assert.equal(
  buildStageDocumentPermissions({
    user: marketingManager,
    project,
    document: submittedMarketingReviewDocument
  }).canReviewDocument,
  true
);
assert.equal(
  buildStageDocumentPermissions({
    user: manufacturingManager,
    project,
    document: submittedMarketingReviewDocument
  }).canReviewDocument,
  false
);
assert.equal(
  canManageStageDocumentApplicability(manufacturingManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  true
);
assert.equal(
  canManageStageDocumentApplicability(marketingManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  true
);
assert.equal(
  canManageStageDocumentApplicability(rdManager, {
    project,
    document: submittedMarketingReviewDocument
  }),
  false
);

const reviewOnlyResponsibleDocument = makeDocument({
  ownerDepartment: null,
  reviewDepartment: MANUFACTURING_CENTER,
  responsibleUser: { department: RD_CENTER }
});
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: reviewOnlyResponsibleDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: reviewOnlyResponsibleDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  false
);

const fallbackDocument = makeDocument({
  ownerDepartment: null,
  reviewDepartment: null,
  responsibleUser: { department: MANUFACTURING_CENTER }
});
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: manufacturingEmployee
  }),
  true
);
assert.equal(
  canManageProjectResponsibility(manufacturingManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageProjectResponsibility(rdManager, project, {
    document: fallbackDocument,
    targetResponsibleUser: rdEmployee
  }),
  false
);
assert.equal(
  canManageStageDocumentApplicability(manufacturingManager, { project, document: fallbackDocument }),
  true
);
assert.equal(canManageStageDocumentApplicability(rdManager, { project, document: fallbackDocument }), false);

assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: RD_CENTER,
      reviewDepartment: RD_CENTER,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    RD_CENTER
  ),
  true
);
assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: RD_CENTER,
      reviewDepartment: RD_CENTER,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    MANUFACTURING_CENTER
  ),
  false
);
assert.equal(
  isDocumentRelatedToDepartmentByOwnership(
    {
      ownerDepartment: null,
      reviewDepartment: null,
      responsibleUser: { department: MANUFACTURING_CENTER }
    },
    MANUFACTURING_CENTER
  ),
  true
);

for (const user of [systemAdmin, generalManagerAssistant]) {
  const permissions = buildStageDocumentPermissions({ user, project, document: submittedRdDocument });
  assert.equal(permissions.canViewAttachments, false);
  assert.equal(permissions.canUploadAttachment, false);
  assert.equal(permissions.canDownloadAttachment, false);
  assert.equal(permissions.canDeleteAttachment, false);
  assert.equal(permissions.canReviewDocument, false);
  assert.equal(permissions.canManageResponsibility, false);
}

const [databaseRows] = await pool.query('SELECT DATABASE() AS currentDatabase');
assert.equal(databaseRows[0].currentDatabase, 'digital_platform');

const [activeTemplateRows] = await pool.query(
  `SELECT template_version AS templateVersion, COUNT(*) AS count
   FROM stage_document_templates
   WHERE is_active = 1
   GROUP BY template_version
   ORDER BY template_version`
);
assert.equal(activeTemplateRows.length, 1);
assert.equal(activeTemplateRows[0].templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
assert.equal(Number(activeTemplateRows[0].count), EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);

const [excludedTemplateRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM stage_document_templates
   WHERE document_code IN ('7.P1', '8.P1')`
);
assert.equal(Number(excludedTemplateRows[0].count), 0);

const [invalidDepartmentRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
     AND (
       (owner_department IS NOT NULL AND owner_department NOT IN (?, ?, ?, ?))
       OR (review_department IS NOT NULL AND review_department NOT IN (?, ?, ?, ?))
     )`,
  [
    STAGE_DOCUMENT_TEMPLATE_VERSION,
    OPERATIONS_CENTER,
    MARKETING_CENTER,
    MANUFACTURING_CENTER,
    RD_CENTER,
    OPERATIONS_CENTER,
    MARKETING_CENTER,
    MANUFACTURING_CENTER,
    RD_CENTER
  ]
);
assert.equal(Number(invalidDepartmentRows[0].count), 0);

const [templateDistributionRows] = await pool.query(
  `SELECT stage_order AS stageOrder, COUNT(*) AS count
   FROM stage_document_templates
   WHERE template_version = ?
     AND is_active = 1
   GROUP BY stage_order
   ORDER BY stage_order`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
assert.deepEqual(
  templateDistributionRows.map((row) => `${row.stageOrder}:${Number(row.count)}`),
  ['1:3', '2:15', '3:4', '4:17', '5:17', '6:2', '7:4', '8:2']
);

const [projectDocumentRows] = await pool.query(
  `SELECT p.id AS projectId, COUNT(d.id) AS documentCount
   FROM projects p
   LEFT JOIN project_stage_documents d
     ON d.project_id = p.id
     AND d.template_version = ?
   GROUP BY p.id
   ORDER BY p.id`,
  [STAGE_DOCUMENT_TEMPLATE_VERSION]
);
for (const row of projectDocumentRows) {
  assert.equal(
    Number(row.documentCount),
    EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
    `Project ${row.projectId} should have ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT} stage documents`
  );
}

const [projectRows] = await pool.query('SELECT COUNT(*) AS count FROM projects');
const projectCount = Number(projectRows[0].count);
const [projectStageResetRows] = await pool.query(
  `SELECT
     COUNT(*) AS totalStages,
     SUM(
       stage_order = 1
       AND stage_status = 'current'
       AND is_current = 1
       AND approval_status = 'not_submitted'
       AND started_at IS NULL
       AND completed_at IS NULL
     ) AS resetFirstStages,
     SUM(
       stage_order BETWEEN 2 AND 8
       AND stage_status = 'not_started'
       AND is_current = 0
       AND approval_status = 'not_submitted'
       AND started_at IS NULL
       AND completed_at IS NULL
     ) AS resetLaterStages,
     SUM(stage_status = 'completed') AS completedStages
   FROM project_stages`
);
assert.equal(Number(projectStageResetRows[0].totalStages), projectCount * 8);
assert.equal(Number(projectStageResetRows[0].resetFirstStages), projectCount);
assert.equal(Number(projectStageResetRows[0].resetLaterStages), projectCount * 7);
assert.equal(Number(projectStageResetRows[0].completedStages), 0);

const [approvalHistoryRows] = await pool.query('SELECT COUNT(*) AS count FROM project_stage_approval_history');
assert.equal(Number(approvalHistoryRows[0].count), 0);

const [oldOperationLogRows] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM business_operation_logs
   WHERE action_type LIKE 'document.%'
     OR action_type LIKE 'approval.%'
     OR action_type IN ('stage.advanced', 'project.completed')`
);
assert.equal(Number(oldOperationLogRows[0].count), 0);

await closePool();

console.log('Stage document ownership smoke passed');
