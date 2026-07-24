import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  canUseOrdinaryStageDocumentWriteAction,
  formatOperationAction,
  isDetailedDesignWorkflowStageDocument
} from '../src/components/project-detail/stageDocumentViewHelpers.js';
import {
  canRenderDetailedDesignReviewApproveButton,
  canRenderDetailedDesignReviewContent,
  canRenderDetailedDesignReviewReturnButton,
  canRenderDetailedDesignReviewSaveButton,
  canRenderDetailedDesignReviewSubmitButton,
  canRenderDetailedDesignRoleAssignment,
  canRenderDetailedDesignUploadButton,
  canRenderDetailedDesignUploadDownloadButton,
  canRenderDrawingReviewCurrentInputDownload,
  canRenderDrawingReviewPassButton,
  canRenderDrawingReviewRdApproveButton,
  canRenderDrawingReviewRdReturnButton,
  canRenderDrawingReviewRecordDownload,
  canRenderDrawingReviewRecordUpload,
  canRenderDrawingReviewReturnButton,
  detailedDesignWorkflowNodeKeys,
  hasCurrentDrawingReviewRecord,
  hasDetailedDesignReviewApprovalActions,
  hasDrawingReviewCheckerActions,
  hasDrawingReviewRdActions
} from '../src/components/project-workspace/detailed-design/detailedDesignPermissionViewHelpers.js';
import {
  formatDetailedDesignWorkbenchStatus,
  formatWorkbenchTodoType,
  isDetailedDesignWorkbenchTodo
} from '../src/components/project-detail/workbenchTodoViewHelpers.js';

const detailedDesignActionLabels = [
  ['detailed_design.roles_assigned', '详细设计角色分配'],
  ['detailed_design.project_kickoff_book_uploaded', '上传项目启动书'],
  ['detailed_design.work_plan_uploaded', '上传详细设计工作计划'],
  ['detailed_design.file_uploaded', '上传详细设计资料'],
  ['detailed_design.node_submitted', '提交详细设计节点'],
  ['detailed_design.file_upload_exempted', '标记详细设计资料无需上传'],
  ['detailed_design.file_upload_exemption_cancelled', '取消详细设计资料无需上传'],
  ['detailed_design.internal_review_form_saved', '保存内部设计评审表'],
  ['detailed_design.internal_review_form_submitted', '提交内部设计评审表'],
  ['detailed_design.internal_review_form_generated', '生成内部设计评审记录表'],
  ['detailed_design.internal_review_form_generation_failed', '内部设计评审记录表生成失败'],
  ['detailed_design.internal_review_approved', '内部设计评审通过'],
  ['detailed_design.internal_review_returned', '内部设计评审退回'],
  ['detailed_design.customer_review_form_saved', '保存客户设计评审表'],
  ['detailed_design.customer_review_form_submitted', '提交客户设计评审表'],
  ['detailed_design.customer_review_form_generated', '生成客户设计评审记录表'],
  ['detailed_design.customer_review_form_generation_failed', '客户设计评审记录表生成失败'],
  ['detailed_design.customer_review_approved', '客户设计评审通过'],
  ['detailed_design.customer_review_returned', '客户设计评审退回'],
  ['detailed_design.drawing_review_record_uploaded', '上传图纸审查记录'],
  ['detailed_design.drawing_review_passed', '图纸审查通过'],
  ['detailed_design.drawing_review_returned', '图纸审查退回'],
  ['detailed_design.drawing_review_rd_approved', '研发图纸审查审批通过'],
  ['detailed_design.drawing_review_rd_returned', '研发图纸审查审批退回'],
  ['detailed_design.customer_drawing_countersign_uploaded', '上传客户会签图纸扫描件']
];

test('formats all detailed design operation actions', () => {
  for (const [actionType, label] of detailedDesignActionLabels) {
    assert.equal(formatOperationAction(actionType), label);
    assert.notEqual(formatOperationAction(actionType), actionType);
  }
});

test('formats detailed design workbench todo type and status labels', () => {
  const todo = {
    type: 'detailed_design_workflow',
    taskType: 'detailed_design_workflow'
  };

  assert.equal(formatWorkbenchTodoType(todo.type, todo), '详细设计待办');
  assert.equal(formatWorkbenchTodoType(todo.taskType, todo), '详细设计待办');
  assert.equal(formatDetailedDesignWorkbenchStatus('not_started'), '未开始');
  assert.equal(formatDetailedDesignWorkbenchStatus('waiting_rd_approval'), '待研发审批');
  assert.equal(formatDetailedDesignWorkbenchStatus('approved'), '已通过');
  assert.equal(isDetailedDesignWorkbenchTodo(todo), true);
  assert.equal(isDetailedDesignWorkbenchTodo({ type: 'solution_design_workflow' }), false);
});

test('maps all detailed design workflow nodes to dedicated node pages', () => {
  const source = readFileSync(new URL('../src/config/nodePages.js', import.meta.url), 'utf8');

  for (const nodeKey of detailedDesignWorkflowNodeKeys) {
    assert.match(source, new RegExp(`\\b${nodeKey}:\\s*Detailed`));
    assert.doesNotMatch(source, new RegExp(`\\b${nodeKey}:\\s*BlankProjectNodePage`));
  }
});

test('detailed design upload pages expose submit and no-upload controls with compact file rows', () => {
  const uploadPageSource = readFileSync(
    new URL('../src/components/project-workspace/detailed-design/DetailedDesignUploadNodePage.vue', import.meta.url),
    'utf8'
  );
  const uploadSlotsSource = readFileSync(
    new URL('../src/components/project-workspace/detailed-design/DetailedDesignUploadSlots.vue', import.meta.url),
    'utf8'
  );

  assert.match(uploadPageSource, /currentNode\.value\?\.permissions\?\.canViewSubmit/);
  assert.match(uploadPageSource, /currentNode\.value\?\.permissions\?\.submitBlockingReasons/);
  assert.match(uploadPageSource, /:disabled="!canSubmitCurrentNode"/);
  assert.match(uploadPageSource, /提交节点/);
  assert.match(uploadSlotsSource, /无需上传/);
  assert.match(uploadSlotsSource, /取消无需上传/);
  assert.match(uploadSlotsSource, /上传内容/);
  assert.match(uploadSlotsSource, /当前文件/);
  assert.doesNotMatch(uploadSlotsSource, /版本/);
  assert.doesNotMatch(uploadSlotsSource, /上传人/);
  assert.doesNotMatch(uploadSlotsSource, /上传时间/);
});

test('detailed design preparation page exposes submit button from DTO permission', () => {
  const source = readFileSync(
    new URL('../src/pages/project-node/detailed-design/DetailedDesignPreparationPage.vue', import.meta.url),
    'utf8'
  );

  assert.match(source, /currentNode\.value\?\.permissions\?\.canViewSubmit/);
  assert.match(source, /currentNode\.value\?\.permissions\?\.submitBlockingReasons/);
  assert.match(source, /:disabled="!canSubmitCurrentNode"/);
  assert.match(source, /isPending\(`submit:\$\{currentNode\.nodeKey\}`\)/);
  assert.match(source, /submitNode\(currentNode\)/);
  assert.match(source, /提交节点/);
});

test('detailed design review form renders target risk suggestion matrix with implementation plans', () => {
  const source = readFileSync(
    new URL('../src/components/project-workspace/detailed-design/DetailedDesignReviewFormTable.vue', import.meta.url),
    'utf8'
  );

  assert.match(source, /label: '目标'/);
  assert.match(source, /label: '风险'/);
  assert.match(source, /label: '建议'/);
  assert.match(source, /实施计划/);
  assert.match(source, /implementationPlanItems/);
  assert.match(source, /update-plan-item/);
});

test('ordinary document write actions are hidden for detailed design workflow-derived documents', () => {
  const workflowOwnedCodes = [
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
    'C40',
    'C41'
  ];

  for (const documentCode of workflowOwnedCodes) {
    const document = { documentCode, derivedCompletionSource: 'detailed_design_workflow' };
    assert.equal(isDetailedDesignWorkflowStageDocument(document), true);
    assert.equal(canUseOrdinaryStageDocumentWriteAction(document), false);
  }

  const c31 = { documentCode: 'C31', derivedCompletionSource: null };
  assert.equal(isDetailedDesignWorkflowStageDocument(c31), false);
  assert.equal(canUseOrdinaryStageDocumentWriteAction(c31), true);
});

test('detailed design workflow button helpers use DTO permissions only', () => {
  const roleAssignableWorkflow = { permissions: { canAssignRoles: true } };
  const uploadSlot = {
    currentFile: { originalFileName: '项目启动书.docx' },
    permissions: { canUpload: true, canDownload: true }
  };
  const reviewFormDto = {
    permissions: {
      canViewReviewForm: true,
      canEditReviewForm: true,
      canSubmitReviewForm: true
    }
  };
  const reviewNode = {
    permissions: {
      canApprove: true,
      canReturn: true
    }
  };
  const drawingReview = {
    currentRevision: 2,
    permissions: {
      canDownloadCurrentInputs: true,
      canUploadRecord: true,
      canPass: true,
      canReturn: true,
      canApprove: true,
      canReturnByRd: true
    },
    recordHistory: [
      { id: 1, drawingRevision: 2, isCurrent: true, permissions: { canDownload: true } }
    ]
  };

  assert.equal(canRenderDetailedDesignRoleAssignment(roleAssignableWorkflow), true);
  assert.equal(canRenderDetailedDesignRoleAssignment({ permissions: { canAssignRoles: false } }), false);

  assert.equal(canRenderDetailedDesignUploadButton(uploadSlot), true);
  assert.equal(canRenderDetailedDesignUploadButton({ permissions: { canUpload: false } }), false);
  assert.equal(canRenderDetailedDesignUploadDownloadButton(uploadSlot), true);
  assert.equal(canRenderDetailedDesignUploadDownloadButton({ permissions: { canDownload: true } }), false);

  assert.equal(canRenderDetailedDesignReviewContent(reviewFormDto), true);
  assert.equal(canRenderDetailedDesignReviewSaveButton(reviewFormDto), true);
  assert.equal(canRenderDetailedDesignReviewSubmitButton(reviewFormDto), true);
  assert.equal(canRenderDetailedDesignReviewApproveButton(reviewNode), true);
  assert.equal(canRenderDetailedDesignReviewReturnButton(reviewNode), true);
  assert.equal(hasDetailedDesignReviewApprovalActions(reviewNode), true);
  assert.equal(hasDetailedDesignReviewApprovalActions({ permissions: {} }), false);

  assert.equal(canRenderDrawingReviewCurrentInputDownload(drawingReview), true);
  assert.equal(canRenderDrawingReviewRecordUpload(drawingReview), true);
  assert.equal(canRenderDrawingReviewRecordDownload(drawingReview.recordHistory[0]), true);
  assert.equal(canRenderDrawingReviewPassButton(drawingReview), true);
  assert.equal(canRenderDrawingReviewReturnButton(drawingReview), true);
  assert.equal(canRenderDrawingReviewRdApproveButton(drawingReview), true);
  assert.equal(canRenderDrawingReviewRdReturnButton(drawingReview), true);
  assert.equal(hasCurrentDrawingReviewRecord(drawingReview), true);
  assert.equal(hasDrawingReviewCheckerActions(drawingReview), true);
  assert.equal(hasDrawingReviewRdActions(drawingReview), true);
});
