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
        <article v-for="reviewNode in actionableReviewNodes" :key="reviewNode.nodeKey" class="initiation-review-node">
          <div class="initiation-review-node__main">
            <div class="initiation-review-node__heading">
              <strong>{{ reviewNode.nodeName || formatReviewNodeName(reviewNode.nodeKey) }}</strong>
              <small>{{ reviewNodeDescription(reviewNode) }}</small>
            </div>
            <el-tag :type="reviewNodeTagType(reviewNode.nodeStatus)">{{ formatReviewNodeStatus(reviewNode.nodeStatus) }}</el-tag>
          </div>

          <div class="initiation-review-decision">
            <div class="initiation-review-field-label">
              <strong>{{ isEvaluationNode(reviewNode) ? '处理决定' : '审批决定' }}</strong>
              <span class="required-mark">*</span>
            </div>
            <el-radio-group
              v-model="nodeDecisions[reviewNode.nodeKey]"
              class="initiation-review-decision__options"
              :class="{ 'initiation-review-decision__options--general': !isEvaluationNode(reviewNode) }"
              :disabled="isReviewNodeBusy(reviewNode)"
            >
              <el-radio class="initiation-review-decision__option--approve" value="approve" border>
                {{ isEvaluationNode(reviewNode) ? '提交评价' : '通过立项' }}
              </el-radio>
              <el-radio class="initiation-review-decision__option--return" value="return" border>
                {{ isEvaluationNode(reviewNode) ? '拒绝并退回' : '退回修改' }}
              </el-radio>
              <el-radio
                v-if="!isEvaluationNode(reviewNode)"
                class="initiation-review-decision__option--end"
                value="end"
                border
              >
                结束项目
              </el-radio>
            </el-radio-group>
          </div>

          <div v-if="nodeDecisions[reviewNode.nodeKey]" class="initiation-review-action-form">
            <template v-if="isEvaluationNode(reviewNode) && nodeDecisions[reviewNode.nodeKey] === 'approve'">
              <label class="initiation-review-field-label">
                <strong>评价内容</strong>
                <span class="required-mark">*</span>
              </label>
              <el-input
                v-model.trim="nodeComments[reviewNode.nodeKey]"
                type="textarea"
                :rows="3"
                placeholder="请填写评价结论、依据及需要关注的风险"
                :disabled="isReviewNodeBusy(reviewNode)"
              />
              <div class="initiation-review-action-form__footer">
                <el-button
                  type="primary"
                  :loading="isReviewNodePending(reviewNode, 'approve')"
                  :disabled="isReviewNodeBusy(reviewNode) || !nodeComments[reviewNode.nodeKey]"
                  @click="approveNode({ document: approvalDocument, node: reviewNode, comment: nodeComments[reviewNode.nodeKey] || '' })"
                >
                  确认提交评价
                </el-button>
              </div>
            </template>

            <template v-else-if="isEvaluationNode(reviewNode) && nodeDecisions[reviewNode.nodeKey] === 'return'">
              <p class="initiation-review-action-form__notice">
                项目将退回市场调研，项目需求表进入返工，立项审批表需要重新填写。
              </p>
              <label class="initiation-review-field-label">
                <strong>拒绝原因</strong>
                <span class="required-mark">*</span>
              </label>
              <el-input
                v-model.trim="nodeReturnReasons[reviewNode.nodeKey]"
                type="textarea"
                :rows="3"
                placeholder="请明确填写拒绝原因和需要补充或修正的内容"
                :disabled="isReviewNodeBusy(reviewNode)"
              />
              <div class="initiation-review-action-form__footer">
                <el-button
                  type="warning"
                  plain
                  :loading="isReviewNodePending(reviewNode, 'return')"
                  :disabled="isReviewNodeBusy(reviewNode) || !nodeReturnReasons[reviewNode.nodeKey]"
                  @click="returnNode({
                    document: approvalDocument,
                    node: reviewNode,
                    returnReason: nodeReturnReasons[reviewNode.nodeKey],
                    returnAction: 'return_to_market_research'
                  })"
                >
                  确认退回修改
                </el-button>
              </div>
            </template>

            <template v-else-if="nodeDecisions[reviewNode.nodeKey] === 'approve'">
              <div class="initiation-review-general-mode">
                <label class="initiation-review-field-label">
                  <strong>项目开展模式</strong>
                  <span class="required-mark">*</span>
                  <small>通过立项前必须选择</small>
                </label>
                <el-select
                  v-model="nodeProjectExecutionModes[reviewNode.nodeKey]"
                  placeholder="请选择项目开展模式"
                  :disabled="isReviewNodeBusy(reviewNode)"
                >
                  <el-option
                    v-for="option in projectExecutionModeOptions"
                    :key="option"
                    :label="option"
                    :value="option"
                  />
                </el-select>
              </div>
              <label class="initiation-review-field-label">
                <strong>审批意见</strong>
                <small>选填</small>
              </label>
              <el-input
                v-model.trim="nodeComments[reviewNode.nodeKey]"
                type="textarea"
                :rows="3"
                placeholder="可填写审批意见或后续工作要求"
                :disabled="isReviewNodeBusy(reviewNode)"
              />
              <div class="initiation-review-action-form__footer">
                <el-button
                  type="primary"
                  :loading="isReviewNodePending(reviewNode, 'approve')"
                  :disabled="isReviewNodeBusy(reviewNode) || !nodeProjectExecutionModes[reviewNode.nodeKey]"
                  @click="approveNode({
                    document: approvalDocument,
                    node: reviewNode,
                    comment: nodeComments[reviewNode.nodeKey] || '',
                    projectExecutionMode: nodeProjectExecutionModes[reviewNode.nodeKey]
                  })"
                >
                  确认通过立项
                </el-button>
              </div>
            </template>

            <template v-else-if="nodeDecisions[reviewNode.nodeKey] === 'return'">
              <p class="initiation-review-action-form__notice">
                项目将退回市场调研，项目需求表进入返工，立项审批表需要重新填写。
              </p>
              <label class="initiation-review-field-label">
                <strong>退回原因</strong>
                <span class="required-mark">*</span>
              </label>
              <el-input
                v-model.trim="nodeReturnReasons[reviewNode.nodeKey]"
                type="textarea"
                :rows="3"
                placeholder="请明确填写退回原因和修改要求"
                :disabled="isReviewNodeBusy(reviewNode)"
              />
              <div class="initiation-review-action-form__footer">
                <el-button
                  type="warning"
                  plain
                  :loading="isReviewNodePending(reviewNode, 'return')"
                  :disabled="isReviewNodeBusy(reviewNode) || !nodeReturnReasons[reviewNode.nodeKey]"
                  @click="returnNode(buildGeneralMarketResearchReturnPayload(reviewNode))"
                >
                  确认退回修改
                </el-button>
              </div>
            </template>

            <template v-else-if="nodeDecisions[reviewNode.nodeKey] === 'end'">
              <p class="initiation-review-action-form__notice initiation-review-action-form__notice--danger">
                项目结束后将阻止立项通知、方案设计和后续资料推进，此操作需要再次确认。
              </p>
              <label class="initiation-review-field-label">
                <strong>项目结束原因</strong>
                <span class="required-mark">*</span>
              </label>
              <el-input
                v-model.trim="nodeEndReasons[reviewNode.nodeKey]"
                type="textarea"
                :rows="3"
                placeholder="请填写结束项目的具体原因"
                :disabled="isReviewNodeBusy(reviewNode)"
              />
              <div class="initiation-review-action-form__footer">
                <el-button
                  type="danger"
                  plain
                  :loading="isReviewNodePending(reviewNode, 'return')"
                  :disabled="isReviewNodeBusy(reviewNode) || !nodeEndReasons[reviewNode.nodeKey]"
                  @click="returnNode(buildGeneralEndPayload(reviewNode))"
                >
                  确认结束项目
                </el-button>
              </div>
            </template>
          </div>
        </article>
      </div>
    </section>

    <section
      v-if="completedReviewNodesForCurrentUser.length"
      class="initiation-review-action-panel"
      aria-label="已完成的项目立项审批结果"
    >
      <div class="initiation-review-nodes">
        <article
          v-for="reviewNode in completedReviewNodesForCurrentUser"
          :key="`completed-${reviewNode.nodeKey}`"
          class="initiation-review-node"
        >
          <div class="initiation-review-node__main">
            <div class="initiation-review-node__heading">
              <strong>{{ reviewNode.nodeName || formatReviewNodeName(reviewNode.nodeKey) }}</strong>
              <small>审批结果（只读）</small>
            </div>
            <el-tag :type="reviewNodeTagType(reviewNode.nodeStatus)">
              {{ formatReviewNodeStatus(reviewNode.nodeStatus) }}
            </el-tag>
          </div>
          <p v-if="reviewNode.comment">审批意见：{{ reviewNode.comment }}</p>
          <p v-if="reviewNode.returnReason">退回原因：{{ reviewNode.returnReason }}</p>
          <small v-if="reviewNode.reviewedAt">处理时间：{{ formatReviewDateTime(reviewNode.reviewedAt) }}</small>
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
  isInitiationApprovalFormFiller,
  isInitiationReviewNodeReviewer
} from '../../../utils/onlineFormVisibility.js';

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
const completedReviewNodesForCurrentUser = computed(() => approvalReviewNodes.value.filter((reviewNode) => {
  return reviewNode.canAct !== true && isInitiationReviewNodeReviewer(reviewNode, props.currentUser);
}));
const isApprovalViewer = computed(() => approvalReviewNodes.value.some(
  (reviewNode) => isInitiationReviewNodeReviewer(reviewNode, props.currentUser)
));
const canViewFormContent = computed(() => isInitiationApprovalFormFiller(activeForm.value));
const hasActionableEvaluationNode = computed(() => actionableReviewNodes.value.some(isEvaluationNode));
const nodeComments = reactive({});
const nodeReturnReasons = reactive({});
const nodeEndReasons = reactive({});
const nodeProjectExecutionModes = reactive({});
const nodeDecisions = reactive({});
const projectExecutionModeOptions = ['自研模式', '供应链模式'];

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

function isEvaluationNode(reviewNode) {
  return ['business_review', 'technical_review'].includes(reviewNode?.nodeKey);
}

function formatReviewDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
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

function buildGeneralEndPayload(reviewNode) {
  return {
    document: approvalDocument.value,
    node: reviewNode,
    returnAction: 'project_end',
    returnReason: '',
    endReason: String(nodeEndReasons[reviewNode.nodeKey] || '').trim()
  };
}

function buildGeneralMarketResearchReturnPayload(reviewNode) {
  return {
    document: approvalDocument.value,
    node: reviewNode,
    returnAction: 'return_to_market_research',
    returnReason: String(nodeReturnReasons[reviewNode.nodeKey] || '').trim(),
    endReason: ''
  };
}

function isActionPending(documentId, action) {
  return context.value.isActionPending?.(documentId, action) || false;
}
</script>
