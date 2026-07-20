<template>
  <section class="project-workspace__detail project-approval-node-page">
    <NodeOnlineFormEditor
      v-if="activeForm"
      :form="activeForm"
      :node-status="node?.nodeStatus || ''"
      :blocking-reasons="node?.blockingReasons || []"
      :form-data="context.onlineFormData || emptyObject"
      :error-message="context.onlineFormErrorMessage || ''"
      :saving="context.onlineFormSaving === true"
      :submitting="context.onlineFormSubmitting === true"
      :generated-file="generatedFile"
      :download-pending="generatedFileDownloadPending"
      download-button-text="查看项目立项审批表"
      :show-form-content="canViewFormContent || isApprovalViewer"
      :image-state="context.onlineFormImageState || emptyObject"
      :show-review-opinions="!hasActionableEvaluationNode"
      @save="saveOnlineForm"
      @submit="submitOnlineForm"
      @download-form="downloadOnlineFormFile"
      @update-field="invoke('updateOnlineFormField', $event)"
      @upload-image="invoke('uploadOnlineFormImage', $event)"
      @download-image="invoke('downloadOnlineFormImage', $event)"
      @delete-image="invoke('deleteOnlineFormImage', $event)"
    >
      <template #generated-files>
        <GeneratedFormFileCard
          v-if="marketResearchCompleted"
          button-text="查看项目需求表"
          :generated-file="marketResearchGeneratedFile"
          :pending="marketResearchDownloadPending"
          @download="downloadMarketResearchFile"
        />
      </template>
    </NodeOnlineFormEditor>

    <el-alert v-else-if="context.onlineFormErrorMessage" :description="context.onlineFormErrorMessage" type="error" show-icon :closable="false" />

    <el-skeleton v-else-if="output?.formAvailable && context.onlineFormLoading" :rows="4" animated />

    <el-empty v-else :description="unavailableMessage" />

    <section v-if="actionableReviewNodes.length" class="initiation-review-action-panel" aria-label="1.2 项目立项评价与最终审批操作">
      <div class="initiation-review-nodes">
        <ApprovalActionCard
          v-for="reviewNode in actionableReviewNodes"
          :key="reviewNode.nodeKey"
          title="审批处理"
          :description="`${reviewNode.nodeName || formatReviewNodeName(reviewNode.nodeKey)} · ${reviewNodeDescription(reviewNode)}`"
          :status-text="formatReviewNodeStatus(reviewNode.nodeStatus)"
          :status-type="reviewNodeTagType(reviewNode.nodeStatus)"
          :comment="nodeComments[reviewNode.nodeKey] || ''"
          :comment-label="isEvaluationNode(reviewNode) ? '评价/退回原因' : '审批意见/退回原因'"
          :comment-placeholder="isEvaluationNode(reviewNode)
            ? '请填写评价结论；退回时请明确说明需要补充或修正的内容'
            : '可填写审批意见；退回整改或结束项目时请明确填写原因'"
          :approve-comment-required="isEvaluationNode(reviewNode)"
          :selection-required="!isEvaluationNode(reviewNode)"
          :selection-complete="isEvaluationNode(reviewNode) || Boolean(nodeProjectExecutionModes[reviewNode.nodeKey])"
          :can-approve="true"
          :can-return="true"
          :can-end="!isEvaluationNode(reviewNode)"
          :busy="isReviewNodeBusy(reviewNode)"
          :pending-action="pendingReviewAction(reviewNode)"
          approve-text="审批通过"
          @update:comment="nodeComments[reviewNode.nodeKey] = $event"
          @approve="approveReviewNode(reviewNode, $event)"
          @return="returnReviewNode(reviewNode, $event)"
          @end="endReviewNode(reviewNode, $event)"
        >
          <template v-if="!isEvaluationNode(reviewNode)" #selection="{ disabled }">
            <div class="initiation-review-general-mode">
              <label class="initiation-review-field-label">
                <strong>项目开展模式</strong>
                <span class="required-mark">*</span>
                <small>选择后才能处理审批</small>
              </label>
              <el-select
                v-model="nodeProjectExecutionModes[reviewNode.nodeKey]"
                placeholder="请选择项目开展模式"
                :disabled="disabled"
              >
                <el-option v-for="option in projectExecutionModeOptions" :key="option" :label="option" :value="option" />
              </el-select>
            </div>
          </template>
        </ApprovalActionCard>
      </div>
    </section>

    <el-empty v-if="!approvalReview" description="审批记录尚未生成。" />
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { ElMessageBox } from 'element-plus';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import GeneratedFormFileCard from '../../../components/GeneratedFormFileCard.vue';
import NodeOnlineFormEditor from '../../../components/node/NodeOnlineFormEditor.vue';
import {
  normalizeNodeGeneratedFile,
  useNodeOnlineForm
} from '../../../composables/node/useNodeOnlineForm.js';
import {
  isInitiationApprovalFormFiller,
  isInitiationReviewNodeReviewer
} from '../../../utils/onlineFormVisibility.js';
import { runBusinessStateChangeAction } from '../../../utils/projectNavigation.js';

const emit = defineEmits(['business-state-changed']);

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  project: {
    type: Object,
    default: null
  },
  workspace: {
    type: Object,
    default: null
  },
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  nodeCode: {
    type: String,
    default: ''
  },
  nodePageContext: {
    type: Object,
    default: () => ({})
  }
});

const {
  emptyObject,
  context,
  output,
  activeForm,
  generatedFile,
  generatedFileDownloadPending,
  unavailableMessage,
  invoke,
  saveOnlineForm,
  submitOnlineForm,
  downloadOnlineFormFile,
  notifyFormChanged
} = useNodeOnlineForm({
  props,
  emit,
  documentCode: '1.2'
});
const approvalDocument = computed(() =>
  output.value ? context.value.getOutputDocument?.(output.value) || null : null
);
const marketResearchNode = computed(() => {
  const stageNode = (props.stage?.nodes || []).find((item) => item.nodeKey === 'market_research');
  if (stageNode) return stageNode;

  for (const workspaceStage of props.workspace?.stages || []) {
    const node = (workspaceStage.nodes || []).find((item) => item.nodeKey === 'market_research');
    if (node) return node;
  }
  return null;
});
const marketResearchOutput = computed(() =>
  (marketResearchNode.value?.outputs || []).find(
    (item) => String(item.documentCode || item.legacyDocumentCode || '') === '1.1'
  ) || null
);
const marketResearchCompleted = computed(() => marketResearchNode.value?.nodeStatus === 'completed');
const marketResearchGeneratedFile = computed(() => normalizeNodeGeneratedFile(
  marketResearchOutput.value?.generatedFile,
  marketResearchNode.value?.nodeStatus || ''
));
const marketResearchDownloadPending = computed(() => Boolean(
  marketResearchOutput.value?.documentId &&
  context.value.isActionPending?.(marketResearchOutput.value.documentId, 'download-generated-file')
));
const approvalReview = computed(() => approvalDocument.value?.initiationReview || null);
const approvalReviewNodes = computed(() => approvalReview.value?.nodes || []);
const actionableReviewNodes = computed(() => approvalReviewNodes.value.filter((reviewNode) => reviewNode.canAct));
const isApprovalViewer = computed(() => approvalReviewNodes.value.some(
  (reviewNode) => isInitiationReviewNodeReviewer(reviewNode, props.currentUser)
));
const canViewFormContent = computed(() => isInitiationApprovalFormFiller(activeForm.value));
const hasActionableEvaluationNode = computed(() => actionableReviewNodes.value.some(isEvaluationNode));
const nodeComments = reactive({});
const nodeProjectExecutionModes = reactive({});
const pendingReturnKinds = reactive({});
const projectExecutionModeOptions = ['自研模式', '供应链模式'];

function downloadMarketResearchFile() {
  if (!marketResearchCompleted.value || !marketResearchGeneratedFile.value.canDownload) return;
  invoke('downloadGeneratedFile', marketResearchOutput.value);
}

async function approveNode(payload) {
  await runBusinessStateChangeAction(
    () => invoke('approveInitiationNode', payload),
    () => notifyFormChanged(payload?.document?.id ? [payload.document.id] : [])
  );
}

function approveReviewNode(reviewNode, comment) {
  approveNode({
    document: approvalDocument.value,
    node: reviewNode,
    comment,
    projectExecutionMode: isEvaluationNode(reviewNode)
      ? undefined
      : nodeProjectExecutionModes[reviewNode.nodeKey]
  });
}

function returnReviewNode(reviewNode, comment) {
  return returnNode({
    document: approvalDocument.value,
    node: reviewNode,
    returnReason: comment,
    returnAction: 'return_to_market_research'
  }, 'return');
}

function endReviewNode(reviewNode, comment) {
  return returnNode({
    document: approvalDocument.value,
    node: reviewNode,
    returnReason: '',
    returnAction: 'project_end',
    endReason: comment
  }, 'end');
}

async function returnNode(payload, pendingKind = 'return') {
  try {
    await ElMessageBox.confirm(
      payload?.returnAction === 'project_end' ? '结束项目后将阻止后续阶段推进，确认继续吗？' : '确认退回项目市场调研并进入整改吗？',
      payload?.returnAction === 'project_end' ? '结束项目' : '退回整改',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    );
  } catch (error) {
    return;
  }
  pendingReturnKinds[payload.node.nodeKey] = pendingKind;
  try {
    await runBusinessStateChangeAction(
      () => invoke('returnInitiationNode', payload),
      () => emit('business-state-changed', {
        changedDocumentIds: payload?.document?.id ? [payload.document.id] : [],
        affectedNodeCodes: ['market_research', 'initiation_approval'],
        refreshCurrentDetail: true
      })
    );
  } finally {
    delete pendingReturnKinds[payload.node.nodeKey];
  }
}

function formatReviewNodeName(nodeKey) {
  if (nodeKey === 'business_review') {
    return '营销评价';
  }

  if (nodeKey === 'technical_review') {
    return '研发评价';
  }

  if (nodeKey === 'general_review') {
    return '总经理审批';
  }

  return nodeKey || '-';
}

function formatReviewNodeStatus(status) {
  return {
    waiting_document_submission: '等待 1.2 资料提交',
    pending: '待处理',
    approved: '已完成',
    returned_blocked_by_rework: '审批不通过，返工阻塞',
    waiting_prerequisite: '等待评价完成',
    invalidated: '已失效，待前置重跑'
  }[status] || status || '-';
}

function reviewNodeTagType(status) {
  if (status === 'approved') return 'success';
  if (status === 'returned_blocked_by_rework' || status === 'invalidated') return 'danger';
  if (status === 'pending') return 'warning';
  return 'info';
}

function isEvaluationNode(reviewNode) {
  return ['business_review', 'technical_review'].includes(reviewNode?.nodeKey);
}

function reviewNodeDescription(reviewNode) {
  if (reviewNode?.nodeKey === 'business_review') {
    return '从市场价值、客户需求和商业可行性角度给出评价。';
  }
  if (reviewNode?.nodeKey === 'technical_review') {
    return '从技术路线、研发资源和交付风险角度给出评价。';
  }
  return '审核营销与研发评价结论，并作出最终审批决定。';
}

function isReviewNodePending(reviewNode, action) {
  return isActionPending(approvalDocument.value?.id, `initiation-${reviewNode.nodeKey}-${action}`);
}

function isReviewNodeBusy(reviewNode) {
  return isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return');
}

function isActionPending(documentId, action) {
  return context.value.isActionPending?.(documentId, action) || false;
}

function pendingReviewAction(reviewNode) {
  if (isReviewNodePending(reviewNode, 'approve')) return 'approve';
  if (isReviewNodePending(reviewNode, 'return')) return pendingReturnKinds[reviewNode.nodeKey] || 'return';
  return '';
}
</script>
