import assert from 'node:assert/strict';
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
    documentCode: '2.3',
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
const rdEmployee = departmentUser(20, ORGANIZATION_ROLE.EMPLOYEE, RD_CENTER);
const manufacturingEmployee = departmentUser(21, ORGANIZATION_ROLE.EMPLOYEE, MANUFACTURING_CENTER);
const systemAdmin = globalUser(30, ORGANIZATION_ROLE.SYSTEM_ADMIN);
const generalManagerAssistant = globalUser(31, ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT);
const generalManager = globalUser(32, ORGANIZATION_ROLE.GENERAL_MANAGER);

const items = await loadStageDocumentTemplateItems();
assert.equal(items.length, EXPECTED_STAGE_DOCUMENT_ITEM_COUNT);
assert.equal(STAGE_DOCUMENT_TEMPLATE_VERSION, 'v20260610');
assert.equal(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 54);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 64);
assert.notEqual(EXPECTED_STAGE_DOCUMENT_ITEM_COUNT, 66);

for (const item of items) {
  assert.equal(item.templateVersion, STAGE_DOCUMENT_TEMPLATE_VERSION);
  assert.notEqual(item.templateVersion, 'v20260624');
  assert.ok(!JSON.stringify(item).includes('v20260624'));
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
assert.deepEqual(
  {
    ownerDepartment: byCode.get('2.3').ownerDepartment,
    reviewDepartment: byCode.get('2.3').reviewDepartment
  },
  { ownerDepartment: RD_CENTER, reviewDepartment: RD_CENTER }
);
assert.deepEqual(
  {
    ownerDepartment: byCode.get('2.11').ownerDepartment,
    reviewDepartment: byCode.get('2.11').reviewDepartment
  },
  { ownerDepartment: RD_CENTER, reviewDepartment: MANUFACTURING_CENTER }
);
assert.deepEqual(
  {
    ownerDepartment: byCode.get('6.7').ownerDepartment,
    reviewDepartment: byCode.get('6.7').reviewDepartment
  },
  { ownerDepartment: MANUFACTURING_CENTER, reviewDepartment: MARKETING_CENTER }
);
assert.deepEqual(
  {
    ownerDepartment: byCode.get('1.4').ownerDepartment,
    reviewDepartment: byCode.get('1.4').reviewDepartment
  },
  { ownerDepartment: null, reviewDepartment: null }
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
  documentCode: '2.11',
  documentName: '成本估算表',
  ownerDepartment: RD_CENTER,
  reviewDepartment: MANUFACTURING_CENTER
});
assert.equal(canManageStageDocumentApplicability(rdManager, { project, document: costEstimateDocument }), true);
assert.equal(
  canManageStageDocumentApplicability(manufacturingManager, { project, document: costEstimateDocument }),
  true
);
assert.equal(canManageStageDocumentApplicability(marketingManager, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(rdEmployee, { project, document: costEstimateDocument }), false);
assert.equal(canManageStageDocumentApplicability(systemAdmin, { project, document: costEstimateDocument }), false);
assert.equal(
  canManageStageDocumentApplicability(generalManagerAssistant, { project, document: costEstimateDocument }),
  false
);
assert.equal(canManageStageDocumentApplicability(generalManager, { project, document: costEstimateDocument }), true);

const submittedMarketingReviewDocument = makeDocument({
  documentCode: '6.7',
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

console.log('Stage document ownership smoke passed');
