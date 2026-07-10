<template>
  <section class="panel solution-design-workflow" aria-label="方案设计阶段内部流程">
    <div class="panel-heading solution-design-workflow__heading">
      <div>
        <span class="section-eyebrow">8 大阶段 · 方案设计</span>
        <h3>方案设计阶段内部节点</h3>
      </div>
      <span v-if="workflow" class="stage-document-pill">
        {{ workflow.isProjectEnded ? '项目已结束' : formatStage(workflow.currentStage) }}
      </span>
    </div>

    <section v-if="loading" class="state-panel state-panel--inline">
      <p>正在加载方案设计流程...</p>
    </section>
    <section v-else-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ errorMessage }}</p>
    </section>
    <section v-else-if="!workflow" class="state-panel state-panel--inline">
      <p>当前项目未返回方案设计阶段内部流程。</p>
    </section>

    <template v-else>
      <section v-if="localMessage" class="state-panel state-panel--inline state-panel--success" role="status">
        <p>{{ localMessage }}</p>
      </section>
      <section v-if="localError" class="state-panel state-panel--inline state-panel--error" role="alert">
        <p>{{ localError }}</p>
      </section>

      <div v-if="workflow.permissions?.canAdvanceToContract" class="solution-design-workflow__contract-gate">
        <strong>{{ solutionCompletionTitle }}</strong>
        <span>{{ solutionCompletionDescription }}</span>
      </div>

      <div
        class="solution-design-workflow__layout"
        :class="{ 'solution-design-workflow__layout--embedded': hideNodeNav }"
      >
        <aside v-if="!hideNodeNav" class="solution-design-workflow__sidebar">
          <nav class="solution-design-workflow__node-nav" aria-label="方案设计内部节点">
            <button
              v-for="node in sortedNodes"
              :key="node.nodeKey"
              type="button"
              :class="{ 'solution-design-workflow__node-button--active': selectedNodeKey === node.nodeKey }"
              class="solution-design-workflow__node-button"
              @click="selectedNodeKey = node.nodeKey"
            >
              <span>{{ node.nodeOrder }}. {{ node.nodeName }}</span>
              <small>{{ formatNodeStatus(node.status) }} · v{{ node.currentRevision || 1 }}</small>
            </button>
          </nav>
        </aside>

        <section class="solution-design-workflow__detail">
          <template v-if="selectedNode">
            <div class="solution-design-workflow__detail-heading">
              <div>
                <span class="section-eyebrow">当前子节点</span>
                <h3>{{ selectedNode.nodeName }}</h3>
              </div>
              <span class="stage-document-pill">{{ formatNodeStatus(selectedNode.status) }}</span>
            </div>

            <dl class="stage-document-meta solution-design-workflow__node-meta">
              <div>
                <dt>当前版本</dt>
                <dd>v{{ selectedNode.currentRevision || 1 }}</dd>
              </div>
              <div>
                <dt>激活时间</dt>
                <dd>{{ formatDateTime(selectedNode.activatedAt) }}</dd>
              </div>
              <div>
                <dt>提交时间</dt>
                <dd>{{ formatDateTime(selectedNode.submittedAt) }}</dd>
              </div>
              <div>
                <dt>通过时间</dt>
                <dd>{{ formatDateTime(selectedNode.approvedAt) }}</dd>
              </div>
            </dl>

            <div v-if="selectedNode.returnReason" class="stage-document-missing">
              <strong>退回原因</strong>
              <p>{{ selectedNode.returnReason }}</p>
            </div>
            <div v-if="selectedNode.blockingReasons?.length" class="stage-document-missing">
              <strong>阻塞原因</strong>
              <ul>
                <li v-for="reason in selectedNode.blockingReasons" :key="reason">{{ reason }}</li>
              </ul>
            </div>

            <section v-if="selectedNode.nodeKey === 'solution_preparation'" class="solution-design-workflow__section">
              <div class="solution-design-workflow__subheading">
                <span class="section-eyebrow">项目内角色</span>
                <strong>单一项目经理来源</strong>
              </div>
              <dl class="solution-design-workflow__role-list">
                <div v-for="role in roleDefinitions" :key="role.roleKey">
                  <dt>{{ role.label }}</dt>
                  <dd>{{ formatRoleUser(workflow.roles?.[role.roleKey]) }}</dd>
                </div>
              </dl>

              <form
                v-if="workflow.permissions?.canAssignRoles"
                class="solution-design-workflow__role-form"
                @submit.prevent="assignRoles"
              >
                <label v-for="role in roleDefinitions" :key="role.payloadKey">
                  <span>{{ role.label }}</span>
                  <select v-model="roleSelections[role.payloadKey]" :disabled="isPending('roles')">
                    <option value="">请选择</option>
                    <option
                      v-for="candidate in responsibilityCandidates"
                      :key="candidate.id"
                      :value="String(candidate.id)"
                    >
                      {{ formatCandidate(candidate) }}
                    </option>
                  </select>
                </label>
                <p v-if="responsibilityCandidatesErrorMessage" class="inline-muted">
                  {{ responsibilityCandidatesErrorMessage }}
                </p>
                <button
                  type="submit"
                  class="primary-button"
                  :disabled="isPending('roles') || responsibilityCandidatesLoading"
                >
                  {{ isPending('roles') ? '保存中...' : '保存角色分配' }}
                </button>
              </form>
            </section>

            <section v-if="selectedNodeSlots.length" class="solution-design-workflow__section">
              <div class="solution-design-workflow__subheading">
                <span class="section-eyebrow">上传槽</span>
                <strong>当前文件和权限</strong>
              </div>
              <div class="solution-design-workflow__slot-list">
                <article v-for="slot in selectedNodeSlots" :key="slot.slotKey" class="solution-design-workflow__slot">
                  <div class="solution-design-workflow__slot-main">
                    <div>
                      <strong>{{ slot.slotName }}</strong>
                      <span>{{ formatSlotStatus(slot.status) }} · v{{ slot.revision || 1 }}</span>
                    </div>
                    <span v-if="slot.confidential" class="stage-document-pill stage-document-pill--warning">保密</span>
                  </div>

                  <div v-if="slot.currentFile" class="solution-design-workflow__file-line">
                    <span>{{ slot.currentFile.originalFileName }}</span>
                    <small>
                      v{{ slot.currentFile.revision }} · {{ formatFileSize(slot.currentFile.fileSize) }} ·
                      {{ formatUser(slot.currentFile.uploadedByUser) }} · {{ formatDateTime(slot.currentFile.uploadedAt) }}
                    </small>
                  </div>
                  <div v-else-if="slot.currentFileHidden" class="solution-design-workflow__file-line">
                    <span>文件细节已按后端保密规则脱敏</span>
                    <small>仅显示节点状态和审批结果。</small>
                  </div>
                  <div v-else class="solution-design-workflow__file-line">
                    <span>暂无当前有效文件</span>
                    <small>{{ slot.required ? '必填上传槽' : '非必填上传槽' }}</small>
                  </div>

                  <div class="solution-design-workflow__slot-actions">
                    <label
                      v-if="slot.permissions?.canUpload"
                      class="ghost-button solution-design-workflow__file-button"
                      :class="{ 'solution-design-workflow__file-button--disabled': isPending(`upload:${slot.slotKey}`) }"
                    >
                      <input
                        type="file"
                        :disabled="isPending(`upload:${slot.slotKey}`)"
                        @change="handleUpload(slot, $event)"
                      />
                      <span>{{ isPending(`upload:${slot.slotKey}`) ? '上传中...' : '上传/替换' }}</span>
                    </label>
                    <button
                      v-if="slot.currentFile && slot.permissions?.canDownload"
                      type="button"
                      class="ghost-button"
                      :disabled="isPending(`download:${slot.slotKey}`)"
                      @click="downloadUpload(slot)"
                    >
                      {{ isPending(`download:${slot.slotKey}`) ? '下载中...' : '下载' }}
                    </button>
                    <span v-if="!slot.permissions?.canUpload && !slot.permissions?.canDownload" class="inline-muted">
                      当前无文件操作权限
                    </span>
                  </div>
                </article>
              </div>
            </section>

            <AnalysisFormSection
              v-if="selectedNode.nodeKey === 'solution_analysis'"
              :dto="analysisFormDto"
              :form-data="analysisFormData"
              :auto-form-data="analysisAutoFormData"
              :loading="analysisFormLoading"
              :pending-action="pendingAction"
              @load="loadAnalysisForm"
              @update="updateAnalysisFormField"
              @save="saveAnalysisForm"
              @submit="submitAnalysisForm"
              @download="downloadAnalysisGeneratedFile"
            />

            <ReviewFormSection
              v-if="isReviewNode(selectedNode.nodeKey)"
              :node-key="selectedNode.nodeKey"
              :dto="activeReviewFormDto"
              :form-data="reviewFormData"
              :loading="reviewFormLoading"
              :pending-action="pendingAction"
              @load="loadReviewForm(selectedNode.nodeKey)"
              @update="updateReviewFormField"
              @save="saveReviewForm(selectedNode.nodeKey)"
              @submit="submitReviewForm(selectedNode.nodeKey)"
              @download="downloadReviewGeneratedFile(selectedNode.nodeKey)"
            />

            <QuotationTenderSection
              v-if="selectedNode.nodeKey === 'quotation_or_tender'"
              :workflow="workflow"
              :pending-action="pendingAction"
              :return-reason="quotationReturnReason"
              :reject-action="quotationRejectAction"
              @select-branch="selectBranch"
              @submit-quotation="submitQuotation"
              @submit-tender="submitNode('quotation_or_tender')"
              @accept-quotation="acceptQuotation"
              @update:return-reason="quotationReturnReason = $event"
              @update:reject-action="quotationRejectAction = $event"
              @reject-quotation="rejectQuotation"
            />

            <section class="solution-design-workflow__section solution-design-workflow__node-actions">
              <div class="solution-design-workflow__subheading">
                <span class="section-eyebrow">节点动作</span>
                <strong>提交、审批和退回</strong>
              </div>
              <div class="solution-design-workflow__action-row">
                <button
                  v-if="isGenericSubmitNode(selectedNode)"
                  type="button"
                  class="primary-button"
                  :disabled="!canExecuteGenericSubmit(selectedNode)"
                  @click="submitGenericNode(selectedNode)"
                >
                  {{ isPending(`submit:${selectedNode.nodeKey}`) ? '提交中...' : formatSubmitNodeLabel(selectedNode) }}
                </button>
                <button
                  v-if="selectedNode.permissions?.canApprove"
                  type="button"
                  class="primary-button"
                  :disabled="isPending(`approve:${selectedNode.nodeKey}`)"
                  @click="approveNode(selectedNode.nodeKey)"
                >
                  {{ isPending(`approve:${selectedNode.nodeKey}`) ? '审批中...' : formatApproveNodeLabel(selectedNode) }}
                </button>
              </div>

              <div v-if="selectedNode.permissions?.canReturn" class="solution-design-workflow__return-box">
                <label>
                  <span>退回原因 *</span>
                  <textarea v-model="returnReasons[selectedNode.nodeKey]" rows="3"></textarea>
                </label>
                <button
                  type="button"
                  class="ghost-button"
                  :disabled="isPending(`return:${selectedNode.nodeKey}`)"
                  @click="returnNode(selectedNode.nodeKey)"
                >
                  {{ isPending(`return:${selectedNode.nodeKey}`) ? '退回中...' : formatReturnNodeLabel(selectedNode) }}
                </button>
              </div>

              <p v-if="!hasVisibleNodeAction(selectedNode)" class="inline-muted">
                当前账号在该节点没有可执行动作。
              </p>
            </section>
          </template>

          <section v-else class="project-workspace__placeholder">
            <strong>等待选择方案设计子节点</strong>
            <p>
              {{
                hideNodeNav
                  ? '请选择上方蓝色节点查看方案设计内容。'
                  : '请选择左侧子节点查看状态、上传槽、表单和审批入口。'
              }}
            </p>
          </section>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue';
import {
  approveSolutionDesignWorkflowNode,
  assignSolutionDesignRoles,
  downloadSolutionDesignAnalysisGeneratedFile,
  downloadSolutionDesignReviewGeneratedFile,
  downloadSolutionDesignWorkflowFile,
  getSolutionDesignAnalysisForm,
  getSolutionDesignReviewForm,
  processSolutionDesignQuotationResult,
  saveSolutionDesignAnalysisForm,
  saveSolutionDesignReviewForm,
  selectSolutionDesignQuotationTenderBranch,
  returnSolutionDesignWorkflowNode,
  submitSolutionDesignAnalysisForm,
  submitSolutionDesignQuotation,
  submitSolutionDesignReviewForm,
  submitSolutionDesignWorkflowNode,
  toReadableApiError,
  uploadSolutionDesignWorkflowFile
} from '../../api/projects.js';

const emit = defineEmits(['changed']);

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  },
  authToken: {
    type: String,
    default: ''
  },
  workflow: {
    type: Object,
    default: null
  },
  uploads: {
    type: Object,
    default: null
  },
  project: {
    type: Object,
    default: null
  },
  currentUser: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  responsibilityCandidates: {
    type: Array,
    default: () => []
  },
  responsibilityCandidatesLoading: {
    type: Boolean,
    default: false
  },
  responsibilityCandidatesErrorMessage: {
    type: String,
    default: ''
  },
  focusNodeKey: {
    type: String,
    default: ''
  },
  selectedNodeKey: {
    type: String,
    default: ''
  },
  hideNodeNav: {
    type: Boolean,
    default: false
  }
});

const reviewRepeatableFieldKeys = Object.freeze([
  'projectTargetDescription',
  'technicalRisks',
  'solutionSuggestions',
  'actionItems'
]);

const roleDefinitions = [
  { roleKey: 'project_manager', label: '项目经理', payloadKey: 'projectManagerUserId' },
  { roleKey: 'technical_owner', label: '技术负责人', payloadKey: 'technicalOwnerUserId' },
  { roleKey: 'business_owner', label: '商务负责人', payloadKey: 'businessOwnerUserId' },
  { roleKey: 'procurement_owner', label: '采购负责人', payloadKey: 'procurementOwnerUserId' },
  { roleKey: 'finance_accountant', label: '财务会计', payloadKey: 'financeAccountantUserId' },
  { roleKey: 'finance_owner', label: '财务负责人', payloadKey: 'financeOwnerUserId' }
];

const analysisAutoFields = [
  { key: 'projectCode', label: '项目编号', type: 'readonly' },
  { key: 'projectName', label: '项目名称', type: 'readonly' },
  { key: 'customerName', label: '客户名称', type: 'readonly' }
];

const analysisFields = [
  { key: 'customerRequirements', label: '客户需求', type: 'textarea', required: true },
  { key: 'technicalRisks', label: '技术风险', type: 'textarea', required: true },
  { key: 'solutionScope', label: '方案范围', type: 'textarea', required: true }
];

const reviewFields = [
  { key: 'meetingDate', label: '评审时间', type: 'date', required: true },
  { key: 'meetingLocation', label: '评审地点', type: 'text' },
  { key: 'presenter', label: '主讲人', type: 'text' },
  { key: 'internalParticipants', label: '我方参与人员', type: 'textarea' },
  { key: 'customerParticipants', label: '甲方参与人员', type: 'textarea' },
  { key: 'customerRequirements', label: '项目需求分析', type: 'textarea' },
  { key: 'projectTargetDescription', label: '项目目标描述', type: 'repeatable' },
  { key: 'technicalRisks', label: '项目风险评估', type: 'repeatable' },
  { key: 'solutionSuggestions', label: '项目方案建议', type: 'repeatable' },
  { key: 'actionItems', label: '项目实施计划', type: 'repeatable', required: true },
  { key: 'reviewConclusion', label: '其他补充内容/评审结论', type: 'textarea', required: true },
  { key: 'recorder', label: '记录人', type: 'readonly' }
];

const nodeStatusText = {
  not_started: '未开始',
  pending: '待提交',
  pending_review: '待审批',
  pending_general_review: '待总经理审批',
  returned: '已退回',
  approved: '已通过',
  skipped: '已跳过',
  ended: '已结束'
};

const slotStatusText = {
  pending: '待上传',
  uploaded: '已上传',
  submitted: '已提交'
};

const branchTypeText = {
  quotation: '报价流程',
  tender: '投标流程'
};

const branchStatusText = {
  selected: '已选择',
  submitted: '已提交',
  pending_review: '待审批',
  approved: '已通过',
  returned: '已退回',
  accepted: '客户接受',
  rejected: '客户未接受',
  ended: '项目结束'
};

const stageOrderByKey = Object.freeze({
  initiation: 1,
  solution: 2,
  contract: 3,
  detailedDesign: 4,
  manufacturing: 5,
  preAcceptance: 6,
  finalAcceptance: 7,
  closeout: 8
});

const selectedNodeKey = ref('');
const roleSelections = reactive({});
const pendingAction = ref('');
const localMessage = ref('');
const localError = ref('');
const returnReasons = reactive({});
const quotationReturnReason = ref('');
const quotationRejectAction = ref('return_to_rd_cost');
const analysisFormDto = ref(null);
const analysisFormData = reactive({});
const analysisFormLoading = ref(false);
const reviewFormDtos = reactive({});
const reviewFormData = reactive({});
const reviewFormLoading = ref(false);
let formReloadSequence = 0;

const sortedNodes = computed(() =>
  [...(props.workflow?.nodes || [])].sort((left, right) => Number(left.nodeOrder || 0) - Number(right.nodeOrder || 0))
);

const selectedNode = computed(() => {
  const selected = sortedNodes.value.find((node) => node.nodeKey === selectedNodeKey.value);
  if (selected || props.hideNodeNav) {
    return selected || null;
  }

  return sortedNodes.value[0] || null;
});

const selectedNodeSlots = computed(() =>
  [...(props.uploads?.slots || [])]
    .filter((slot) => slot.nodeKey === selectedNode.value?.nodeKey)
    .sort((left, right) => Number(left.slotOrder || 0) - Number(right.slotOrder || 0))
);

const analysisAutoFormData = computed(() => ({
  projectCode: firstNonEmptyValue(props.workflow?.projectCode, props.project?.projectCode, props.project?.project_code),
  projectName: firstNonEmptyValue(props.workflow?.projectName, props.project?.projectName, props.project?.project_name),
  customerName: firstNonEmptyValue(props.workflow?.customerName, props.project?.customerName, props.project?.customer_name)
}));

const defaultRecorderName = computed(() => {
  const formatted = formatUser(props.currentUser);
  return formatted === '-' ? '' : formatted;
});

const activeReviewFormDto = computed(() => {
  const nodeKey = selectedNode.value?.nodeKey;
  if (!nodeKey) {
    return null;
  }

  return reviewFormDtos[nodeKey] || {
    projectId: props.workflow?.projectId,
    nodeKey,
    form: props.workflow?.reviewForms?.[nodeKey] || null,
    permissions: buildReviewPermissionsFromNode(selectedNode.value)
  };
});

function getWorkflowStageOrder(stage) {
  const value = Number(stage?.stageOrder ?? stage?.stage_order ?? stage?.order);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return stageOrderByKey[stage?.stageKey] || 0;
}

const hasAdvancedPastSolutionStage = computed(() => {
  const currentStage = props.workflow?.currentStage || null;
  const currentStageKey = String(currentStage?.stageKey || '').trim();
  if (currentStageKey && currentStageKey !== 'solution') {
    return getWorkflowStageOrder(currentStage) > stageOrderByKey.solution;
  }

  return props.workflow?.isProjectCompleted === true;
});

const solutionCompletionTitle = computed(() =>
  hasAdvancedPastSolutionStage.value ? '方案设计已完成' : '阶段齐套已满足'
);

const solutionCompletionDescription = computed(() =>
  hasAdvancedPastSolutionStage.value
    ? '方案设计已完成，项目已进入后续阶段。'
    : '报价/投标节点已通过，阶段齐套满足，系统将在配置的触发点完成后自动推进。'
);

watch(
  () => props.workflow,
  (workflow) => {
    syncRoleSelections(workflow);
    const controlledNodeKey = findSelectableNodeKey(props.selectedNodeKey, workflow?.nodes || []);
    const focusedNodeKey = findSelectableNodeKey(props.focusNodeKey, workflow?.nodes || []);
    if (controlledNodeKey) {
      selectedNodeKey.value = controlledNodeKey;
    } else if (props.hideNodeNav) {
      selectedNodeKey.value = '';
    } else if (focusedNodeKey) {
      selectedNodeKey.value = focusedNodeKey;
    } else if (!selectedNodeKey.value || !sortedNodes.value.some((node) => node.nodeKey === selectedNodeKey.value)) {
      selectedNodeKey.value = selectDefaultNodeKey(workflow?.nodes || []);
    }
    syncFormsFromWorkflow(workflow);
    void reloadSelectedFormFromServer();
  },
  { immediate: true }
);

watch(
  () => props.focusNodeKey,
  (focusNodeKey) => {
    if (props.hideNodeNav) {
      return;
    }

    const focusedNodeKey = findSelectableNodeKey(focusNodeKey, sortedNodes.value);
    if (focusedNodeKey) {
      selectedNodeKey.value = focusedNodeKey;
    }
  },
  { immediate: true }
);

watch(
  () => props.selectedNodeKey,
  (nodeKey) => {
    const controlledNodeKey = findSelectableNodeKey(nodeKey, sortedNodes.value);
    if (controlledNodeKey) {
      selectedNodeKey.value = controlledNodeKey;
    } else if (props.hideNodeNav) {
      selectedNodeKey.value = '';
    }
  },
  { immediate: true }
);

watch(
  () => selectedNode.value?.nodeKey,
  (nodeKey) => {
    localError.value = '';
    if (nodeKey === 'solution_analysis') {
      void loadAnalysisForm();
    } else if (isReviewNode(nodeKey)) {
      void loadReviewForm(nodeKey);
    }
  },
  { immediate: true }
);

function selectDefaultNodeKey(nodes) {
  const preferred =
    (nodes || []).find((node) => ['pending', 'returned', 'pending_review', 'pending_general_review'].includes(node.status)) ||
    (nodes || [])[0];
  return preferred?.nodeKey || '';
}

function findSelectableNodeKey(nodeKey, nodes) {
  const normalized = String(nodeKey || '').trim();
  if (!normalized) {
    return '';
  }

  return (nodes || []).some((node) => node.nodeKey === normalized) ? normalized : '';
}

function syncRoleSelections(workflow) {
  for (const role of roleDefinitions) {
    roleSelections[role.payloadKey] = workflow?.roles?.[role.roleKey]?.userId
      ? String(workflow.roles[role.roleKey].userId)
      : '';
  }
}

function syncObject(target, source = {}) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = Array.isArray(value) ? [...value] : value ?? '';
  }
}

function normalizeRepeatableFormValue(value, { keepEmptyRow = true } = {}) {
  const rawValues = Array.isArray(value)
    ? value
    : value === null || value === undefined || value === ''
      ? []
      : String(value).split(/\r?\n/);
  const values = rawValues.map((item) => String(item ?? '')).filter((item) => item.trim() || keepEmptyRow);
  return values.length ? values : keepEmptyRow ? [''] : [];
}

function normalizeReviewFormForUi(source = {}) {
  const next = { ...(source || {}) };
  for (const key of reviewRepeatableFieldKeys) {
    next[key] = normalizeRepeatableFormValue(next[key]);
  }
  if (!String(next.recorder || '').trim()) {
    next.recorder = defaultRecorderName.value;
  }
  return next;
}

function buildReviewFormPayload() {
  const payload = { ...reviewFormData };
  for (const key of reviewRepeatableFieldKeys) {
    payload[key] = normalizeRepeatableFormValue(payload[key], { keepEmptyRow: false });
  }
  if (!String(payload.recorder || '').trim()) {
    payload.recorder = defaultRecorderName.value;
  }
  return payload;
}

function buildAnalysisFormDtoFromWorkflow(workflow) {
  if (!workflow) {
    return null;
  }

  const analysisNode = (workflow.nodes || []).find((node) => node.nodeKey === 'solution_analysis');
  return {
    projectId: workflow.projectId,
    stageKey: workflow.currentStage?.stageKey,
    nodeKey: 'solution_analysis',
    nodeStatus: analysisNode?.status,
    nodeRevision: analysisNode?.currentRevision || 1,
    form: workflow.analysisForm || null,
    permissions: buildAnalysisPermissionsFromNode(analysisNode),
    isProjectEnded: workflow.isProjectEnded === true
  };
}

function buildReviewFormDtoFromWorkflow(workflow, nodeKey) {
  if (!workflow || !isReviewNode(nodeKey)) {
    return null;
  }

  const reviewNode = (workflow.nodes || []).find((node) => node.nodeKey === nodeKey);
  const form = workflow.reviewForms?.[nodeKey] || null;
  return {
    projectId: workflow.projectId,
    stageKey: workflow.currentStage?.stageKey,
    nodeKey,
    nodeStatus: reviewNode?.status,
    nodeRevision: reviewNode?.currentRevision || 1,
    reviewType: nodeKey === 'internal_solution_review' ? 'internal' : 'customer',
    form,
    permissions: buildReviewPermissionsFromNode(reviewNode)
  };
}

function syncFormsFromWorkflow(workflow) {
  analysisFormDto.value = buildAnalysisFormDtoFromWorkflow(workflow);
  if (selectedNode.value?.nodeKey === 'solution_analysis') {
    syncObject(analysisFormData, analysisFormDto.value?.form?.formData);
  }

  for (const nodeKey of ['internal_solution_review', 'customer_solution_review']) {
    const dto = buildReviewFormDtoFromWorkflow(workflow, nodeKey);
    if (dto) {
      reviewFormDtos[nodeKey] = dto;
    } else {
      delete reviewFormDtos[nodeKey];
    }
  }

  if (isReviewNode(selectedNode.value?.nodeKey)) {
    syncObject(reviewFormData, normalizeReviewFormForUi(reviewFormDtos[selectedNode.value.nodeKey]?.form?.formData));
  }
}

async function reloadSelectedFormFromServer() {
  const nodeKey = selectedNode.value?.nodeKey;
  if (!props.projectId) {
    return;
  }

  const sequence = ++formReloadSequence;
  if (nodeKey === 'solution_analysis') {
    await loadAnalysisForm({ sequence });
  } else if (isReviewNode(nodeKey)) {
    await loadReviewForm(nodeKey, { sequence });
  }
}

function buildAnalysisPermissionsFromNode(node) {
  return {
    canViewForm: true,
    canEditForm: node?.permissions?.canEditAnalysisForm === true,
    canSubmitForm: node?.permissions?.canSubmitAnalysisForm === true,
    canSubmitNode: node?.permissions?.canSubmit === true,
    canApprove: node?.permissions?.canApprove === true,
    canReturn: node?.permissions?.canReturn === true
  };
}

function buildReviewPermissionsFromNode(node) {
  return {
    canViewReviewForm: true,
    canEditReviewForm: node?.permissions?.canEditReviewForm === true,
    canSubmitReviewForm: node?.permissions?.canSubmitReviewForm === true,
    canSubmitNode: node?.permissions?.canSubmit === true,
    canApprove: node?.permissions?.canApprove === true,
    canReturn: node?.permissions?.canReturn === true
  };
}

function isPending(key) {
  return pendingAction.value === key;
}

function clearLocalState() {
  localMessage.value = '';
  localError.value = '';
}

async function runAction(key, runner, successText, { notifyChanged = true } = {}) {
  clearLocalState();
  pendingAction.value = key;
  try {
    const result = await runner();
    localMessage.value = successText;
    if (notifyChanged) {
      emit('changed');
    }
    return result;
  } catch (error) {
    localError.value = toReadableApiError(error);
    return null;
  } finally {
    pendingAction.value = '';
  }
}

function normalizeRequiredUserId(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

async function assignRoles() {
  const payload = {};
  for (const role of roleDefinitions) {
    const userId = normalizeRequiredUserId(roleSelections[role.payloadKey]);
    if (!userId) {
      localError.value = `请选择${role.label}。`;
      return;
    }
    payload[role.payloadKey] = userId;
  }

  await runAction(
    'roles',
    () => assignSolutionDesignRoles(props.projectId, payload, props.authToken),
    '方案设计项目内角色已保存。'
  );
}

async function handleUpload(slot, event) {
  const file = event.target.files?.[0] || null;
  event.target.value = '';
  if (!file) {
    return;
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    localError.value = '文件无效，请选择 1 字节到 50MB 以内的文件。';
    return;
  }
  await runAction(
    `upload:${slot.slotKey}`,
    () => uploadSolutionDesignWorkflowFile(props.projectId, slot.slotKey, file, props.authToken),
    `${slot.slotName}已上传。`
  );
}

async function downloadUpload(slot) {
  await runAction(
    `download:${slot.slotKey}`,
    async () => {
      const download = await downloadSolutionDesignWorkflowFile(props.projectId, slot.slotKey, props.authToken);
      saveBlob(download, slot.currentFile?.originalFileName || `${slot.slotName}`);
    },
    `${slot.slotName}已开始下载。`,
    { notifyChanged: false }
  );
}

async function loadAnalysisForm({ sequence = ++formReloadSequence } = {}) {
  if (!props.projectId || isPending('analysis:load')) {
    return;
  }
  analysisFormLoading.value = true;
  localError.value = '';
  try {
    const dto = await getSolutionDesignAnalysisForm(props.projectId, props.authToken);
    if (sequence !== formReloadSequence) {
      return;
    }
    analysisFormDto.value = dto;
    syncObject(analysisFormData, dto.form?.formData);
  } catch (error) {
    if (sequence === formReloadSequence) {
      localError.value = toReadableApiError(error);
    }
  } finally {
    if (sequence === formReloadSequence) {
      analysisFormLoading.value = false;
    }
  }
}

function updateAnalysisFormField({ key, value }) {
  analysisFormData[key] = value;
}

async function saveAnalysisForm() {
  const dto = await runAction(
    'analysis:save',
    () => saveSolutionDesignAnalysisForm(props.projectId, { ...analysisFormData }, props.authToken),
    '项目方案分析表草稿已保存。'
  );
  if (dto) {
    analysisFormDto.value = dto;
    syncObject(analysisFormData, dto.form?.formData);
  }
}

async function submitAnalysisForm() {
  const dto = await runAction(
    'analysis:submit',
    () => submitSolutionDesignAnalysisForm(props.projectId, { ...analysisFormData }, props.authToken),
    '项目方案分析表已提交并触发模板生成。'
  );
  if (dto) {
    analysisFormDto.value = dto;
    syncObject(analysisFormData, dto.form?.formData);
  }
}

async function downloadAnalysisGeneratedFile() {
  await runAction(
    'analysis:download',
    async () => {
      const download = await downloadSolutionDesignAnalysisGeneratedFile(props.projectId, props.authToken);
      saveBlob(download, analysisFormDto.value?.form?.generatedFile?.fileName || '项目方案分析表.xlsx');
    },
    '项目方案分析表生成文件已开始下载。',
    { notifyChanged: false }
  );
}

async function loadReviewForm(nodeKey, { sequence = ++formReloadSequence } = {}) {
  if (!nodeKey || !props.projectId) {
    return;
  }
  reviewFormLoading.value = true;
  localError.value = '';
  try {
    const dto = await getSolutionDesignReviewForm(props.projectId, nodeKey, props.authToken);
    if (sequence !== formReloadSequence || selectedNode.value?.nodeKey !== nodeKey) {
      return;
    }
    reviewFormDtos[nodeKey] = dto;
    syncObject(reviewFormData, normalizeReviewFormForUi(dto.form?.formData));
  } catch (error) {
    if (sequence === formReloadSequence && selectedNode.value?.nodeKey === nodeKey) {
      localError.value = toReadableApiError(error);
    }
  } finally {
    if (sequence === formReloadSequence && selectedNode.value?.nodeKey === nodeKey) {
      reviewFormLoading.value = false;
    }
  }
}

function updateReviewFormField({ key, value }) {
  reviewFormData[key] = value;
}

async function saveReviewForm(nodeKey) {
  const dto = await runAction(
    `review:${nodeKey}:save`,
    () => saveSolutionDesignReviewForm(props.projectId, nodeKey, buildReviewFormPayload(), props.authToken),
    '方案评审记录表草稿已保存。'
  );
  if (dto) {
    reviewFormDtos[nodeKey] = dto;
    syncObject(reviewFormData, normalizeReviewFormForUi(dto.form?.formData));
  }
}

async function submitReviewForm(nodeKey) {
  const dto = await runAction(
    `review:${nodeKey}:submit`,
    () => submitSolutionDesignReviewForm(props.projectId, nodeKey, buildReviewFormPayload(), props.authToken),
    '方案评审记录表已提交并触发模板生成。'
  );
  if (dto) {
    reviewFormDtos[nodeKey] = dto;
    syncObject(reviewFormData, normalizeReviewFormForUi(dto.form?.formData));
  }
}

async function downloadReviewGeneratedFile(nodeKey) {
  await runAction(
    `review:${nodeKey}:download`,
    async () => {
      const download = await downloadSolutionDesignReviewGeneratedFile(props.projectId, nodeKey, props.authToken);
      const dto = reviewFormDtos[nodeKey];
      saveBlob(download, dto?.form?.generatedFile?.fileName || '方案评审记录表.xlsx');
    },
    '方案评审记录表生成文件已开始下载。',
    { notifyChanged: false }
  );
}

async function submitNode(nodeKey) {
  await runAction(
    `submit:${nodeKey}`,
    () => submitSolutionDesignWorkflowNode(props.projectId, nodeKey, props.authToken),
    `${getNodeName(nodeKey)}已提交。`
  );
}

async function submitGenericNode(node) {
  if (!canExecuteGenericSubmit(node)) {
    return;
  }

  await submitNode(node.nodeKey);
}

async function approveNode(nodeKey) {
  await runAction(
    `approve:${nodeKey}`,
    () =>
      approveSolutionDesignWorkflowNode(
        props.projectId,
        nodeKey,
        '',
        props.authToken
      ),
    `${getNodeName(nodeKey)}审批已通过。`
  );
}

async function returnNode(nodeKey) {
  const reason = String(returnReasons[nodeKey] || '').trim();
  if (!reason) {
    localError.value = '请填写退回原因。';
    return;
  }
  await runAction(
    `return:${nodeKey}`,
    () => returnSolutionDesignWorkflowNode(props.projectId, nodeKey, reason, props.authToken),
    `${getNodeName(nodeKey)}已退回。`
  );
  delete returnReasons[nodeKey];
}

async function selectBranch(branchType) {
  await runAction(
    `branch:${branchType}`,
    () => selectSolutionDesignQuotationTenderBranch(props.projectId, branchType, props.authToken),
    `已选择${branchTypeText[branchType] || branchType}。`
  );
}

async function submitQuotation() {
  await runAction(
    'quotation:submit',
    () => submitSolutionDesignQuotation(props.projectId, props.authToken),
    '报价单已提交。'
  );
}

async function acceptQuotation() {
  await runAction(
    'quotation:accept',
    () => processSolutionDesignQuotationResult(props.projectId, { result: 'accepted' }, props.authToken),
    '已记录客户接受报价。'
  );
}

async function rejectQuotation() {
  const reason = String(quotationReturnReason.value || '').trim();
  if (!reason) {
    localError.value = '请填写客户不接受报价后的处理原因。';
    return;
  }
  await runAction(
    `quotation:reject:${quotationRejectAction.value}`,
    () =>
      processSolutionDesignQuotationResult(
        props.projectId,
        {
          result: 'rejected',
          action: quotationRejectAction.value,
          returnReason: reason
        },
        props.authToken
      ),
    quotationRejectAction.value === 'end_project'
      ? '已记录客户不接受报价并结束项目。'
      : '已记录客户不接受报价并退回研发成本估算。'
  );
  quotationReturnReason.value = '';
}

function saveBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getNodeName(nodeKey) {
  return sortedNodes.value.find((node) => node.nodeKey === nodeKey)?.nodeName || '节点';
}

function isGenericSubmitNode(node) {
  if (!node?.nodeKey || node.nodeKey === 'quotation_or_tender') {
    return false;
  }

  if (node.permissions?.canSubmit === true) {
    return true;
  }

  if (!['pending', 'returned'].includes(node.status)) {
    return false;
  }

  const permissions = node.permissions || {};
  return (
    permissions.canEditAnalysisForm === true ||
    permissions.canSubmitAnalysisForm === true ||
    permissions.canEditReviewForm === true ||
    permissions.canSubmitReviewForm === true ||
    selectedNodeSlots.value.some((slot) => slot.permissions?.canUpload === true)
  );
}

function canExecuteGenericSubmit(node) {
  return isGenericSubmitNode(node) && node?.permissions?.canSubmit === true && !isPending(`submit:${node.nodeKey}`);
}

function hasVisibleNodeAction(node) {
  return (
    isGenericSubmitNode(node) ||
    node?.nodeKey === 'quotation_or_tender' ||
    node?.permissions?.canApprove === true ||
    node?.permissions?.canReturn === true
  );
}

function isReviewNode(nodeKey) {
  return ['internal_solution_review', 'customer_solution_review'].includes(nodeKey);
}

function formatNodeStatus(status) {
  return nodeStatusText[status] || status || '-';
}

function formatSlotStatus(status) {
  return slotStatusText[status] || status || '-';
}

function formatBranchType(type) {
  return branchTypeText[type] || '未选择';
}

function formatBranchStatus(status) {
  return branchStatusText[status] || '待选择';
}

function formatStage(stage) {
  return stage?.stageName || '方案设计阶段';
}

function formatUser(user) {
  if (!user) {
    return '-';
  }
  return user.name || user.displayName || user.account || `用户 ${user.id}`;
}

function firstNonEmptyValue(...values) {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function formatRoleUser(role) {
  if (!role?.userId) {
    return '未分配';
  }
  return formatUser(role.user) || `用户 ${role.userId}`;
}

function formatCandidate(candidate) {
  return `${candidate.name || candidate.displayName || candidate.account || `用户 ${candidate.id}`} · ${formatDepartment(candidate.department)} · ${formatOrganizationRole(candidate.organizationRole)}`;
}

function formatDepartment(department) {
  return {
    rd_center: '研发中心',
    marketing_center: '营销中心',
    manufacturing_center: '制造中心',
    operations_center: '运营中心'
  }[department] || department || '未设部门';
}

function formatOrganizationRole(role) {
  return {
    general_manager: '总经理',
    general_manager_assistant: '总经理助理',
    center_manager: '中心负责人',
    employee: '员工',
    system_admin: '系统管理员'
  }[role] || role || '-';
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatGeneratedFileStatus(generatedFile) {
  if (!generatedFile) {
    return '未生成';
  }
  return {
    not_started: '未生成',
    generating: '生成中',
    generated: '已生成',
    failed: '生成失败'
  }[generatedFile.status] || generatedFile.status || '未生成';
}

function formatSubmitNodeLabel(node) {
  if (node.nodeKey === 'solution_preparation') {
    return '提交工作计划';
  }
  if (node.nodeKey === 'solution_design') {
    return '提交 8 个方案设计产出';
  }
  if (node.nodeKey === 'solution_analysis') {
    return '提交项目方案分析审批';
  }
  if (isReviewNode(node.nodeKey)) {
    return '提交评审审批';
  }
  if (node.nodeKey === 'finance_cost_estimation') {
    return '提交财务成本估算审批';
  }
  return '提交节点';
}

function formatApproveNodeLabel(node) {
  if (node.nodeKey === 'finance_cost_estimation' && node.status === 'pending_general_review') {
    return '总经理审批通过';
  }
  if (node.nodeKey === 'quotation_or_tender') {
    return '投标审批通过';
  }
  return '审批通过';
}

function formatReturnNodeLabel(node) {
  if (node.nodeKey === 'quotation_or_tender') {
    return '投标审批退回';
  }
  return '审批退回';
}

const GeneratedFilePanel = defineComponent({
  name: 'GeneratedFilePanel',
  props: {
    generatedFile: {
      type: Object,
      default: null
    },
    pending: {
      type: Boolean,
      default: false
    }
  },
  emits: ['download'],
  setup(componentProps, { emit: componentEmit }) {
    return () =>
      h('section', { class: 'solution-design-workflow__generated-file' }, [
        h('div', [
          h('span', { class: 'section-eyebrow' }, '生成文件'),
          h('strong', formatGeneratedFileStatus(componentProps.generatedFile)),
          h('small', componentProps.generatedFile?.fileName || '当前版本生成成功后开放下载。'),
          componentProps.generatedFile?.errorMessage
            ? h('small', componentProps.generatedFile.errorMessage)
            : null
        ]),
        componentProps.generatedFile?.canDownload
          ? h(
              'button',
              {
                type: 'button',
                class: 'ghost-button',
                disabled: componentProps.pending,
                onClick: () => componentEmit('download')
              },
              componentProps.pending ? '下载中...' : '下载生成文件'
            )
          : null
      ]);
  }
});

const FormFieldList = defineComponent({
  name: 'FormFieldList',
  props: {
    fields: {
      type: Array,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update'],
  setup(componentProps, { emit: componentEmit }) {
    function repeatableRows(field) {
      return normalizeRepeatableFormValue(componentProps.formData[field.key]);
    }

    function updateRepeatableRow(field, index, value) {
      const next = repeatableRows(field);
      next[index] = value;
      componentEmit('update', { key: field.key, value: next });
    }

    function addRepeatableRow(field) {
      componentEmit('update', { key: field.key, value: [...repeatableRows(field), ''] });
    }

    function removeRepeatableRow(field, index) {
      const next = repeatableRows(field).filter((_, rowIndex) => rowIndex !== index);
      componentEmit('update', { key: field.key, value: next.length ? next : [''] });
    }

    function renderRepeatableField(field) {
      const rows = repeatableRows(field);
      return h(
        'div',
        {
          key: field.key,
          class: 'form-grid__wide solution-design-workflow__repeatable-field'
        },
        [
          h('div', { class: 'solution-design-workflow__repeatable-heading' }, [
            h('span', `${field.label}${field.required ? ' *' : ''}`),
            h(
              'button',
              {
                type: 'button',
                class: 'ghost-button',
                disabled: componentProps.disabled,
                onClick: () => addRepeatableRow(field)
              },
              '新增一行'
            )
          ]),
          ...rows.map((rowValue, index) =>
            h(
              'div',
              {
                key: `${field.key}:${index}`,
                class: 'solution-design-workflow__repeatable-row'
              },
              [
                h('textarea', {
                  value: rowValue,
                  rows: 2,
                  disabled: componentProps.disabled,
                  onInput: (event) => updateRepeatableRow(field, index, event.target.value)
                }),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'ghost-button',
                    disabled: componentProps.disabled || rows.length <= 1,
                    onClick: () => removeRepeatableRow(field, index)
                  },
                  '删除'
                )
              ]
            )
          )
        ]
      );
    }

    function renderField(field) {
      if (field.type === 'repeatable') {
        return renderRepeatableField(field);
      }

      const isReadonly = field.type === 'readonly';
      return h(
        'label',
        {
          key: field.key,
          class: field.type === 'textarea' ? 'form-grid__wide' : ''
        },
        [
          h('span', `${field.label}${field.required ? ' *' : ''}`),
          field.type === 'textarea'
            ? h('textarea', {
                value: componentProps.formData[field.key] || '',
                rows: 3,
                disabled: componentProps.disabled || isReadonly,
                readonly: isReadonly,
                onInput: (event) => componentEmit('update', { key: field.key, value: event.target.value })
              })
            : h('input', {
                value: componentProps.formData[field.key] || '',
                type: field.type === 'date' ? 'date' : 'text',
                disabled: componentProps.disabled || isReadonly,
                readonly: isReadonly,
                onInput: (event) => {
                  if (!isReadonly) {
                    componentEmit('update', { key: field.key, value: event.target.value });
                  }
                }
              })
        ]
      );
    }

    return () =>
      h(
        'div',
        { class: 'form-grid solution-design-workflow__form-grid' },
        componentProps.fields.map((field) => renderField(field))
      );
  }
});

const AnalysisFormSection = defineComponent({
  name: 'AnalysisFormSection',
  components: { GeneratedFilePanel, FormFieldList },
  props: {
    dto: {
      type: Object,
      default: null
    },
    formData: {
      type: Object,
      required: true
    },
    autoFormData: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    pendingAction: {
      type: String,
      default: ''
    }
  },
  emits: ['load', 'update', 'save', 'submit', 'download'],
  setup(componentProps, { emit: componentEmit }) {
    return () =>
      h('section', { class: 'solution-design-workflow__section' }, [
        h('div', { class: 'solution-design-workflow__subheading' }, [
          h('span', { class: 'section-eyebrow' }, '在线表单'),
          h('strong', '项目方案分析表')
        ]),
        componentProps.loading
          ? h('section', { class: 'state-panel state-panel--inline' }, [h('p', '正在加载项目方案分析表...')])
          : null,
        !componentProps.dto && !componentProps.loading
          ? h(
              'button',
              { type: 'button', class: 'ghost-button', onClick: () => componentEmit('load') },
              '加载项目方案分析表'
            )
          : null,
        componentProps.dto
          ? [
              h(FormFieldList, {
                fields: analysisAutoFields,
                formData: componentProps.autoFormData,
                disabled: true
              }),
              h(
                'p',
                { class: 'inline-muted solution-design-workflow__form-note' },
                '项目编号、项目名称和客户名称由项目基础信息自动带入；客户需求、技术风险和方案范围由技术负责人填写。'
              ),
              h(FormFieldList, {
                fields: analysisFields,
                formData: componentProps.formData,
                disabled: !componentProps.dto.permissions?.canEditForm,
                onUpdate: (payload) => componentEmit('update', payload)
              })
            ]
          : null,
        componentProps.dto?.form?.generatedFile
          ? h(GeneratedFilePanel, {
              generatedFile: componentProps.dto.form.generatedFile,
              pending: componentProps.pendingAction === 'analysis:download',
              onDownload: () => componentEmit('download')
            })
          : null,
        componentProps.dto
          ? h('div', { class: 'form-actions solution-design-workflow__form-actions' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'ghost-button',
                  disabled: !componentProps.dto.permissions?.canEditForm || componentProps.pendingAction === 'analysis:save',
                  onClick: () => componentEmit('save')
                },
                componentProps.pendingAction === 'analysis:save' ? '保存中...' : '保存草稿'
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled: !componentProps.dto.permissions?.canSubmitForm || componentProps.pendingAction === 'analysis:submit',
                  onClick: () => componentEmit('submit')
                },
                componentProps.pendingAction === 'analysis:submit' ? '提交中...' : '提交表单'
              )
            ])
          : null
      ]);
  }
});

const ReviewFormSection = defineComponent({
  name: 'ReviewFormSection',
  components: { GeneratedFilePanel, FormFieldList },
  props: {
    nodeKey: {
      type: String,
      required: true
    },
    dto: {
      type: Object,
      default: null
    },
    formData: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    pendingAction: {
      type: String,
      default: ''
    }
  },
  emits: ['load', 'update', 'save', 'submit', 'download'],
  setup(componentProps, { emit: componentEmit }) {
    const label = computed(() =>
      componentProps.nodeKey === 'internal_solution_review'
        ? 'C15 内部方案评审记录表'
        : 'C16 客户方案评审记录表'
    );
    return () =>
      h('section', { class: 'solution-design-workflow__section' }, [
        h('div', { class: 'solution-design-workflow__subheading' }, [
          h('span', { class: 'section-eyebrow' }, '在线表单'),
          h('strong', label.value)
        ]),
        componentProps.loading
          ? h('section', { class: 'state-panel state-panel--inline' }, [h('p', '正在加载方案评审记录表...')])
          : null,
        !componentProps.dto && !componentProps.loading
          ? h(
              'button',
              { type: 'button', class: 'ghost-button', onClick: () => componentEmit('load') },
              '加载方案评审记录表'
            )
          : null,
        componentProps.dto
          ? h(FormFieldList, {
              fields: reviewFields,
              formData: componentProps.formData,
              disabled: !componentProps.dto.permissions?.canEditReviewForm,
              onUpdate: (payload) => componentEmit('update', payload)
            })
          : null,
        componentProps.dto?.form?.generatedFile
          ? h(GeneratedFilePanel, {
              generatedFile: componentProps.dto.form.generatedFile,
              pending: componentProps.pendingAction === `review:${componentProps.nodeKey}:download`,
              onDownload: () => componentEmit('download')
            })
          : null,
        componentProps.dto
          ? h('div', { class: 'form-actions solution-design-workflow__form-actions' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'ghost-button',
                  disabled:
                    !componentProps.dto.permissions?.canEditReviewForm ||
                    componentProps.pendingAction === `review:${componentProps.nodeKey}:save`,
                  onClick: () => componentEmit('save')
                },
                componentProps.pendingAction === `review:${componentProps.nodeKey}:save` ? '保存中...' : '保存草稿'
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled:
                    !componentProps.dto.permissions?.canSubmitReviewForm ||
                    componentProps.pendingAction === `review:${componentProps.nodeKey}:submit`,
                  onClick: () => componentEmit('submit')
                },
                componentProps.pendingAction === `review:${componentProps.nodeKey}:submit` ? '提交中...' : '提交表单'
              )
            ])
          : null
      ]);
  }
});

const QuotationTenderSection = defineComponent({
  name: 'QuotationTenderSection',
  props: {
    workflow: {
      type: Object,
      required: true
    },
    pendingAction: {
      type: String,
      default: ''
    },
    returnReason: {
      type: String,
      default: ''
    },
    rejectAction: {
      type: String,
      default: 'return_to_rd_cost'
    }
  },
  emits: [
    'select-branch',
    'submit-quotation',
    'submit-tender',
    'accept-quotation',
    'update:return-reason',
    'update:reject-action',
    'reject-quotation'
  ],
  setup(componentProps, { emit: componentEmit }) {
    return () => {
      const flow = componentProps.workflow.quotationTender || {};
      const permissions = flow.permissions || {};
      return h('section', { class: 'solution-design-workflow__section solution-design-workflow__quotation' }, [
        h('div', { class: 'solution-design-workflow__subheading' }, [
          h('span', { class: 'section-eyebrow' }, '报价/投标'),
          h('strong', `${formatBranchType(flow.branchType)} · ${formatBranchStatus(flow.branchStatus)}`)
        ]),
        permissions.canSelectBranch
          ? h('div', { class: 'solution-design-workflow__action-row' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled: componentProps.pendingAction === 'branch:quotation',
                  onClick: () => componentEmit('select-branch', 'quotation')
                },
                componentProps.pendingAction === 'branch:quotation' ? '选择中...' : '选择报价流程'
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'ghost-button',
                  disabled: componentProps.pendingAction === 'branch:tender',
                  onClick: () => componentEmit('select-branch', 'tender')
                },
                componentProps.pendingAction === 'branch:tender' ? '选择中...' : '选择投标流程'
              )
            ])
          : null,
        flow.branchType === 'quotation'
          ? h('div', { class: 'solution-design-workflow__quotation-actions' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled: !permissions.canSubmitQuotation || componentProps.pendingAction === 'quotation:submit',
                  onClick: () => componentEmit('submit-quotation')
                },
                componentProps.pendingAction === 'quotation:submit' ? '提交中...' : '提交报价单'
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled: !permissions.canAcceptQuotation || componentProps.pendingAction === 'quotation:accept',
                  onClick: () => componentEmit('accept-quotation')
                },
                componentProps.pendingAction === 'quotation:accept' ? '处理中...' : '客户接受报价'
              ),
              h('div', { class: 'solution-design-workflow__return-box' }, [
                h('label', [
                  h('span', '客户不接受后的处理原因 *'),
                  h('textarea', {
                    rows: 3,
                    value: componentProps.returnReason,
                    onInput: (event) => componentEmit('update:return-reason', event.target.value)
                  })
                ]),
                h('label', [
                  h('span', '处理方式'),
                  h(
                    'select',
                    {
                      value: componentProps.rejectAction,
                      onChange: (event) => componentEmit('update:reject-action', event.target.value)
                    },
                    [
                      h('option', { value: 'return_to_rd_cost' }, '退回研发成本估算'),
                      h('option', { value: 'end_project' }, '项目结束')
                    ]
                  )
                ]),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'ghost-button',
                    disabled:
                      (!permissions.canRejectQuotationToRdCost && !permissions.canRejectQuotationAndEndProject) ||
                      componentProps.pendingAction.startsWith('quotation:reject'),
                    onClick: () => componentEmit('reject-quotation')
                  },
                  componentProps.pendingAction.startsWith('quotation:reject') ? '处理中...' : '客户不接受并处理'
                )
              ])
            ])
          : null,
        flow.branchType === 'tender'
          ? h('div', { class: 'solution-design-workflow__action-row' }, [
              h(
                'button',
                {
                  type: 'button',
                  class: 'primary-button',
                  disabled: !permissions.canSubmitTender || componentProps.pendingAction === 'submit:quotation_or_tender',
                  onClick: () => componentEmit('submit-tender')
                },
                componentProps.pendingAction === 'submit:quotation_or_tender' ? '提交中...' : '提交投标审批'
              )
            ])
          : null
      ]);
    };
  }
});
</script>

<style scoped>
.solution-design-workflow__heading {
  align-items: flex-start;
}

.solution-design-workflow__layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
}

.solution-design-workflow__layout--embedded {
  grid-template-columns: 1fr;
}

.solution-design-workflow__sidebar,
.solution-design-workflow__detail,
.solution-design-workflow__section,
.solution-design-workflow__slot {
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #fff;
}

.solution-design-workflow__sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.solution-design-workflow__layout--embedded .solution-design-workflow__sidebar {
  padding: 0;
  border: 0;
  background: transparent;
}

.solution-design-workflow__detail,
.solution-design-workflow__section,
.solution-design-workflow__slot {
  padding: 12px;
}

.solution-design-workflow__role-list,
.solution-design-workflow__node-meta {
  margin: 0;
}

.solution-design-workflow__subheading,
.solution-design-workflow__detail-heading,
.solution-design-workflow__slot-main,
.solution-design-workflow__contract-gate {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.solution-design-workflow__subheading {
  margin-bottom: 10px;
}

.solution-design-workflow__subheading strong,
.solution-design-workflow__detail-heading h3 {
  margin: 0;
}

.solution-design-workflow__role-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.solution-design-workflow__role-form label,
.solution-design-workflow__approval-comment label,
.solution-design-workflow__return-box label {
  display: grid;
  gap: 6px;
}

.solution-design-workflow__node-nav {
  display: grid;
  gap: 8px;
}

.solution-design-workflow__node-button {
  display: grid;
  gap: 4px;
  width: 100%;
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.solution-design-workflow__node-button--active {
  border-color: #226d68;
  background: #f0faf8;
}

.solution-design-workflow__node-button span,
.solution-design-workflow__file-line span {
  overflow-wrap: anywhere;
}

.solution-design-workflow__node-button small,
.solution-design-workflow__file-line small {
  color: #667789;
}

.solution-design-workflow__detail {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.solution-design-workflow__slot-list {
  display: grid;
  gap: 10px;
}

.solution-design-workflow__slot {
  display: grid;
  gap: 10px;
}

.solution-design-workflow__file-line,
.solution-design-workflow__slot-actions,
.solution-design-workflow__action-row,
.solution-design-workflow__form-actions,
.solution-design-workflow__quotation-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.solution-design-workflow__file-line {
  flex-direction: column;
  align-items: flex-start;
}

.solution-design-workflow__file-button {
  position: relative;
  overflow: hidden;
}

.solution-design-workflow__file-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.solution-design-workflow__file-button--disabled {
  opacity: 0.65;
  pointer-events: none;
}

.solution-design-workflow__form-grid {
  margin-top: 8px;
}

.solution-design-workflow__form-note {
  margin: 8px 0 0;
}

.solution-design-workflow__repeatable-field {
  display: grid;
  gap: 8px;
}

.solution-design-workflow__repeatable-heading,
.solution-design-workflow__repeatable-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.solution-design-workflow__repeatable-heading {
  justify-content: space-between;
}

.solution-design-workflow__repeatable-heading span {
  font-weight: 600;
}

.solution-design-workflow__repeatable-row textarea {
  flex: 1 1 240px;
  min-width: 0;
}

.solution-design-workflow__generated-file,
.solution-design-workflow__contract-gate {
  padding: 10px 12px;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #f8fafc;
}

.solution-design-workflow__generated-file {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.solution-design-workflow__generated-file div,
.solution-design-workflow__contract-gate {
  display: grid;
  gap: 4px;
}

.solution-design-workflow__return-box,
.solution-design-workflow__approval-comment {
  display: grid;
  gap: 10px;
}

.solution-design-workflow__quotation-actions {
  align-items: stretch;
}

@media (max-width: 960px) {
  .solution-design-workflow__layout {
    grid-template-columns: 1fr;
  }

  .solution-design-workflow__node-nav {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 640px) {
  .solution-design-workflow__subheading,
  .solution-design-workflow__detail-heading,
  .solution-design-workflow__slot-main,
  .solution-design-workflow__generated-file,
  .solution-design-workflow__contract-gate,
  .solution-design-workflow__repeatable-heading,
  .solution-design-workflow__repeatable-row {
    display: grid;
  }

  .solution-design-workflow__action-row > *,
  .solution-design-workflow__slot-actions > *,
  .solution-design-workflow__form-actions > *,
  .solution-design-workflow__quotation-actions > *,
  .solution-design-workflow__repeatable-row > * {
    width: 100%;
  }
}
</style>
