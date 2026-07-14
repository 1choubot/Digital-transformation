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
      :image-state="context.onlineFormImageState || emptyObject"
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
          heading="项目需求表"
          :generated-file="marketResearchGeneratedFile"
          :pending="marketResearchDownloadPending"
          @download="downloadMarketResearchFile"
        />
      </template>
    </NodeOnlineFormEditor>

    <el-alert v-else-if="context.onlineFormErrorMessage" :description="context.onlineFormErrorMessage" type="error" show-icon :closable="false" />

    <el-skeleton v-else-if="output?.formAvailable" :rows="4" animated />

    <el-empty v-else :description="unavailableMessage" />

    <section v-if="approvalReview" class="initiation-review-panel" aria-label="1.2 项目立项评价与最终审批记录">
      <div class="initiation-review-panel__heading">
        <div>
          <h4>审批记录展示</h4>
          <p>{{ approvalOverallText }}</p>
        </div>
        <el-tag :type="approvalReview.isComplete ? 'success' : 'warning'">{{ approvalReview.isComplete ? '最终通过' : '未最终通过' }}</el-tag>
      </div>

      <div class="initiation-review-nodes">
        <article v-for="reviewNode in approvalReviewNodes" :key="reviewNode.nodeKey" class="initiation-review-node">
          <div class="initiation-review-node__main">
            <strong>{{ reviewNode.nodeName || formatReviewNodeName(reviewNode.nodeKey) }}</strong>
            <el-tag :type="reviewNodeTagType(reviewNode.nodeStatus)">{{ formatReviewNodeStatus(reviewNode.nodeStatus) }}</el-tag>
          </div>
          <dl class="initiation-review-node__meta">
            <div>
              <dt>{{ isEvaluationNode(reviewNode) ? '评价角色' : '审批角色' }}</dt>
              <dd>{{ formatReviewNodeReviewer(reviewNode) }}</dd>
            </div>
            <div>
              <dt>{{ isEvaluationNode(reviewNode) ? '评价文本' : '审批意见' }}</dt>
              <dd>{{ reviewNode.comment || reviewNode.returnReason || '-' }}</dd>
            </div>
            <div>
              <dt>操作时间</dt>
              <dd>{{ formatDateTime(reviewNode.reviewedAt || reviewNode.submittedAt || reviewNode.invalidatedAt) }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section v-if="actionableReviewNodes.length" class="initiation-review-action-panel" aria-label="1.2 项目立项评价与最终审批操作">
      <div class="initiation-review-nodes">
        <article v-for="reviewNode in actionableReviewNodes" :key="reviewNode.nodeKey" class="initiation-review-node">
          <div class="initiation-review-node__main">
            <strong>{{ reviewNode.nodeName || formatReviewNodeName(reviewNode.nodeKey) }}</strong>
            <el-tag :type="reviewNodeTagType(reviewNode.nodeStatus)">{{ formatReviewNodeStatus(reviewNode.nodeStatus) }}</el-tag>
          </div>

          <div class="initiation-review-actions">
            <template v-if="isEvaluationNode(reviewNode)">
              <el-input
                v-model.trim="nodeComments[reviewNode.nodeKey]"
                placeholder="评价文本"
                :disabled="isReviewNodePending(reviewNode, 'approve')"
              />
              <el-button
                type="primary"
                :loading="isReviewNodePending(reviewNode, 'approve')"
                :disabled="isReviewNodePending(reviewNode, 'approve') || !nodeComments[reviewNode.nodeKey]"
                @click="approveNode({ document: approvalDocument, node: reviewNode, comment: nodeComments[reviewNode.nodeKey] || '' })"
              >
                提交评价
              </el-button>
              <el-input
                v-model.trim="nodeReturnReasons[reviewNode.nodeKey]"
                type="textarea"
                placeholder="拒绝原因，退回项目市场调研"
                :disabled="isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return')"
              />
              <el-button
                type="danger"
                plain
                :loading="isReviewNodePending(reviewNode, 'return')"
                :disabled="isReviewNodePending(reviewNode, 'return') || !nodeReturnReasons[reviewNode.nodeKey]"
                @click="returnNode({
                  document: approvalDocument,
                  node: reviewNode,
                  returnReason: nodeReturnReasons[reviewNode.nodeKey],
                  returnAction: 'return_to_market_research'
                })"
              >
                拒绝并退回市场调研
              </el-button>
            </template>
            <template v-else>
              <el-input
                v-model.trim="nodeComments[reviewNode.nodeKey]"
                type="textarea"
                placeholder="审批意见"
                :disabled="isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return')"
              />
              <el-button
                type="primary"
                :loading="isReviewNodePending(reviewNode, 'approve')"
                :disabled="isReviewNodePending(reviewNode, 'approve')"
                @click="approveNode({ document: approvalDocument, node: reviewNode, comment: nodeComments[reviewNode.nodeKey] || '' })"
              >
                审批通过
              </el-button>
              <el-radio-group
                :model-value="getGeneralReturnAction(reviewNode)"
                :disabled="isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return')"
                @change="setGeneralReturnAction(reviewNode, $event)"
              >
                <el-radio-button value="return_to_market_research">退回项目市场调研</el-radio-button>
                <el-radio-button value="project_end">结束项目</el-radio-button>
              </el-radio-group>
              <el-input
                v-if="isProjectEndReturn(reviewNode)"
                v-model.trim="nodeEndReasons[reviewNode.nodeKey]"
                type="textarea"
                placeholder="项目结束原因（必填）"
                :disabled="isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return')"
              />
              <el-input
                v-else
                v-model.trim="nodeReturnReasons[reviewNode.nodeKey]"
                type="textarea"
                placeholder="审批不通过原因，退回项目市场调研"
                :disabled="isReviewNodePending(reviewNode, 'approve') || isReviewNodePending(reviewNode, 'return')"
              />
              <small v-if="isProjectEndReturn(reviewNode)" class="inline-muted">
                项目结束后将阻止立项通知、方案设计和后续资料推进。
              </small>
              <el-button
                type="danger"
                plain
                :loading="isReviewNodePending(reviewNode, 'return')"
                :disabled="isReviewNodePending(reviewNode, 'return') || !canSubmitGeneralReturn(reviewNode)"
                @click="returnNode(buildGeneralReturnPayload(reviewNode))"
              >
                {{ formatGeneralReturnButton(reviewNode) }}
              </el-button>
            </template>
          </div>
        </article>
      </div>
    </section>

    <el-empty v-else-if="!approvalReview" description="审批记录尚未生成。" />
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { ElMessageBox } from 'element-plus';
import GeneratedFormFileCard from '../../../components/GeneratedFormFileCard.vue';
import NodeOnlineFormEditor from '../../../components/node/NodeOnlineFormEditor.vue';
import {
  normalizeNodeGeneratedFile,
  useNodeOnlineForm
} from '../../../composables/node/useNodeOnlineForm.js';
import {
  formatBusinessDepartment,
  formatDateTime,
  formatOrganizationRole,
  formatUser
} from '../../../utils/format.js';

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
const approvalOverallText = computed(() => {
  if (approvalReview.value?.isComplete) {
    return '营销评价、研发评价均已完成，总经理已审批通过。';
  }

  if (approvalReview.value?.blockedByRework) {
    return '1.1 返工未清除，1.2 暂不能最终完成。';
  }

  return '等待营销评价、研发评价和总经理最终审批完成。';
});

const nodeComments = reactive({});
const nodeReturnReasons = reactive({});
const nodeReturnActions = reactive({});
const nodeEndReasons = reactive({});

function downloadMarketResearchFile() {
  if (!marketResearchCompleted.value || !marketResearchGeneratedFile.value.canDownload) return;
  invoke('downloadGeneratedFile', marketResearchOutput.value);
}

function approveNode(payload) {
  invoke('approveInitiationNode', payload);
  notifyFormChanged(payload?.document?.id ? [payload.document.id] : []);
}

async function returnNode(payload) {
  try {
    await ElMessageBox.confirm(
      payload?.returnAction === 'project_end' ? '结束项目后将阻止后续阶段推进，确认继续吗？' : '确认退回项目市场调研并进入整改吗？',
      payload?.returnAction === 'project_end' ? '结束项目' : '退回整改',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    );
  } catch (error) {
    return;
  }
  invoke('returnInitiationNode', payload);
  emit('business-state-changed', {
    changedDocumentIds: payload?.document?.id ? [payload.document.id] : [],
    affectedNodeCodes: ['market_research', 'initiation_approval'],
    refreshCurrentDetail: true
  });
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

function formatReviewNodeReviewer(reviewNode) {
  if (reviewNode.reviewerUser) {
    return formatUser(reviewNode.reviewerUser);
  }

  const role = formatOrganizationRole(reviewNode.reviewerRole);
  const department = reviewNode.reviewerDepartment ? formatBusinessDepartment(reviewNode.reviewerDepartment) : '';
  return [department, role].filter(Boolean).join(' / ') || '-';
}

function isEvaluationNode(reviewNode) {
  return ['business_review', 'technical_review'].includes(reviewNode?.nodeKey);
}

function isReviewNodePending(reviewNode, action) {
  return isActionPending(approvalDocument.value?.id, `initiation-${reviewNode.nodeKey}-${action}`);
}

function getGeneralReturnAction(reviewNode) {
  return nodeReturnActions[reviewNode.nodeKey] || 'return_to_market_research';
}

function setGeneralReturnAction(reviewNode, action) {
  nodeReturnActions[reviewNode.nodeKey] = action;
}

function isProjectEndReturn(reviewNode) {
  return getGeneralReturnAction(reviewNode) === 'project_end';
}

function getGeneralReturnReason(reviewNode) {
  return isProjectEndReturn(reviewNode) ? nodeEndReasons[reviewNode.nodeKey] : nodeReturnReasons[reviewNode.nodeKey];
}

function canSubmitGeneralReturn(reviewNode) {
  return String(getGeneralReturnReason(reviewNode) || '').trim() !== '';
}

function buildGeneralReturnPayload(reviewNode) {
  const action = getGeneralReturnAction(reviewNode);
  const reason = String(getGeneralReturnReason(reviewNode) || '').trim();
  return {
    document: approvalDocument.value,
    node: reviewNode,
    returnAction: action,
    returnReason: action === 'project_end' ? '' : reason,
    endReason: action === 'project_end' ? reason : ''
  };
}

function formatGeneralReturnButton(reviewNode) {
  return isProjectEndReturn(reviewNode) ? '拒绝并结束项目' : '审批不通过并退回市场调研';
}

function isActionPending(documentId, action) {
  return context.value.isActionPending?.(documentId, action) || false;
}
</script>
