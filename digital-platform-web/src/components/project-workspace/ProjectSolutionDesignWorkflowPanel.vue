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
                    <span v-else-if="slot.exemption?.isExempted" class="stage-document-pill stage-document-pill--success">
                      无需上传
                    </span>
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
                  <div v-else-if="slot.exemption?.isExempted" class="solution-design-workflow__file-line">
                    <span>已标记无需上传</span>
                    <small>
                      {{ slot.exemption.reason || '未填写备注' }} ·
                      {{ formatUser(slot.exemption.exemptedByUser) }} ·
                      {{ formatDateTime(slot.exemption.exemptedAt) }}
                    </small>
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
                  <div
                    v-if="slot.permissions?.canMarkExemption || slot.permissions?.canCancelExemption"
                    class="solution-design-workflow__exemption-actions"
                  >
                    <template v-if="slot.permissions?.canMarkExemption">
                      <textarea
                        v-model="uploadExemptionReasons[slot.slotKey]"
                        rows="2"
                        maxlength="1000"
                        placeholder="填写无需上传原因或备注"
                        :disabled="isPending(`exemption:mark:${slot.slotKey}`)"
                      ></textarea>
                      <button
                        type="button"
                        class="ghost-button"
                        :disabled="isPending(`exemption:mark:${slot.slotKey}`)"
                        @click="markUploadExemption(slot)"
                      >
                        {{ isPending(`exemption:mark:${slot.slotKey}`) ? '处理中...' : '无需上传' }}
                      </button>
                    </template>
                    <button
                      v-if="slot.permissions?.canCancelExemption"
                      type="button"
                      class="ghost-button"
                      :disabled="isPending(`exemption:cancel:${slot.slotKey}`)"
                      @click="cancelUploadExemption(slot)"
                    >
                      {{ isPending(`exemption:cancel:${slot.slotKey}`) ? '处理中...' : '取消无需上传' }}
                    </button>
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
              :image-state="analysisImageState"
              @load="loadAnalysisForm"
              @update="updateAnalysisFormField"
              @save="saveAnalysisForm"
              @submit="submitAnalysisForm"
              @download="downloadAnalysisGeneratedFile"
              @upload-image="uploadAnalysisImage"
              @download-image="downloadAnalysisImage"
              @delete-image="deleteAnalysisImage"
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
              :quotation-form-dto="quotationFormDto"
              :quotation-form-data="quotationFormData"
              :quotation-form-loading="quotationFormLoading"
              :pending-action="pendingAction"
              :return-reason="quotationReturnReason"
              :reject-action="quotationRejectAction"
              @select-branch="selectBranch"
              @load-quotation-form="loadQuotationForm"
              @update-quotation-form="updateQuotationFormField"
              @update-quotation-item="updateQuotationItemField"
              @add-quotation-item="addQuotationItem"
              @remove-quotation-item="removeQuotationItem"
              @save-quotation-form="saveQuotationForm"
              @submit-quotation-form="submitQuotationForm"
              @download-quotation-form="downloadQuotationGeneratedFile"
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
              <div
                v-if="requiresFinanceApprovalBranch(selectedNode)"
                class="solution-design-workflow__approval-branch"
              >
                <label>
                  <span>审批通过后流程 *</span>
                  <select
                    v-model="financeApprovalBranchType"
                    :disabled="isPending(`approve:${selectedNode.nodeKey}`)"
                  >
                    <option value="">请选择</option>
                    <option value="quotation">报价流程</option>
                    <option value="tender">投标流程</option>
                  </select>
                </label>
                <p class="inline-muted">财务成本估算通过后将直接进入所选流程。</p>
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
                  :disabled="
                    isPending(`approve:${selectedNode.nodeKey}`) ||
                    (requiresFinanceApprovalBranch(selectedNode) && !financeApprovalBranchType)
                  "
                  @click="approveNode(selectedNode)"
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
  downloadSolutionDesignQuotationGeneratedFile,
  downloadSolutionDesignReviewGeneratedFile,
  downloadSolutionDesignWorkflowFile,
  deleteStageDocumentOnlineFormImage,
  downloadStageDocumentOnlineFormImage,
  getSolutionDesignAnalysisForm,
  getSolutionDesignQuotationForm,
  getSolutionDesignReviewForm,
  markSolutionDesignUploadExemption,
  processSolutionDesignQuotationResult,
  saveSolutionDesignAnalysisForm,
  saveSolutionDesignQuotationForm,
  saveSolutionDesignReviewForm,
  selectSolutionDesignQuotationTenderBranch,
  returnSolutionDesignWorkflowNode,
  submitSolutionDesignAnalysisForm,
  submitSolutionDesignQuotation,
  submitSolutionDesignQuotationForm,
  submitSolutionDesignReviewForm,
  submitSolutionDesignWorkflowNode,
  toReadableApiError,
  uploadStageDocumentOnlineFormImage,
  cancelSolutionDesignUploadExemption,
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

const MAX_ONLINE_FORM_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

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

const analysisEnvironmentFields = [
  { key: 'workingTemperatureMin', label: '工作温度最小值', type: 'text' },
  { key: 'workingTemperatureMax', label: '工作温度最大值', type: 'text' },
  { key: 'storageTemperatureMin', label: '储存温度最小值', type: 'text' },
  { key: 'storageTemperatureMax', label: '储存温度最大值', type: 'text' },
  { key: 'workingHumidityMin', label: '工作湿度最小值', type: 'text' },
  { key: 'workingHumidityMax', label: '工作湿度最大值', type: 'text' },
  { key: 'storageHumidityMin', label: '储存湿度最小值', type: 'text' },
  { key: 'storageHumidityMax', label: '储存湿度最大值', type: 'text' },
  { key: 'noiseLimitValue', label: '噪音上限', type: 'text' },
  { key: 'ipProtectionLevel', label: 'IP 防护等级', type: 'text' },
  { key: 'antiCorrosionGrade', label: '防腐等级', type: 'text' },
  { key: 'altitudeLimitValue', label: '海拔高度上限', type: 'text' },
  { key: 'explosionProofRequirement', label: '防爆要求', type: 'text' }
];

const analysisSiteFields = [
  { key: 'siteConditionDescription', label: '场地说明', type: 'textarea' },
  { key: 'powerSupply', label: '电源', type: 'text' },
  { key: 'airSupply', label: '气源', type: 'text' },
  { key: 'hydraulicSource', label: '液压源', type: 'text' },
  { key: 'liftingEquipment', label: '吊装设备', type: 'text' }
];

const analysisProcessFields = [
  { key: 'workpieceDescription', label: '工件描述', type: 'textarea', required: true },
  { key: 'operationProcessDescription', label: '作业工艺', type: 'textarea', required: true },
  { key: 'projectTargetDescription', label: '项目目标说明', type: 'textarea', required: true }
];

const analysisImageFields = [
  { key: 'siteConditionImages', label: '场地情况图片', maxImages: 3 },
  { key: 'workpieceImages', label: '工件描述图片', maxImages: 3 },
  { key: 'operationProcessImages', label: '作业工艺图片', maxImages: 3 },
  { key: 'projectTargetImages', label: '目标图片', maxImages: 3 }
];

const analysisFieldGroups = [
  { title: '环境要求', fields: analysisEnvironmentFields },
  { title: '场地情况', fields: analysisSiteFields },
  { title: '工件、工艺和目标', fields: analysisProcessFields }
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
const uploadExemptionReasons = reactive({});
const financeApprovalBranchType = ref('');
const quotationReturnReason = ref('');
const quotationRejectAction = ref('return_to_rd_cost');
const quotationFormDto = ref(null);
const quotationFormData = reactive({
  recipientName: '',
  recipientTitle: '',
  contactName: '',
  contactPhone: '',
  quotationDate: '',
  items: []
});
const quotationFormLoading = ref(false);
const analysisFormDto = ref(null);
const analysisFormData = reactive({});
const analysisFormLoading = ref(false);
const analysisImageState = reactive({
  uploadPendingFieldKey: '',
  downloadPendingId: null,
  deletePendingId: null
});
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
    .filter((slot) => {
      if (slot.slotKey !== 'quotation_file') {
        return true;
      }
      return props.workflow?.quotationTender?.branchType !== 'quotation';
    })
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
    if (nodeKey !== 'finance_cost_estimation') {
      financeApprovalBranchType.value = '';
    }
    if (nodeKey === 'solution_analysis') {
      void loadAnalysisForm();
    } else if (isReviewNode(nodeKey)) {
      void loadReviewForm(nodeKey);
    } else if (nodeKey === 'quotation_or_tender') {
      void loadQuotationForm();
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

function normalizeQuotationItemsForUi(items) {
  const rows = Array.isArray(items) ? items : [];
  const normalized = rows.map((item) => ({
    name: String(item?.name ?? ''),
    unit: String(item?.unit ?? ''),
    quantity: String(item?.quantity ?? ''),
    unitPrice: String(item?.unitPrice ?? ''),
    amount: String(item?.amount ?? '0.00'),
    remark: String(item?.remark ?? '')
  }));
  return normalized.length
    ? normalized
    : [
        {
          name: '',
          unit: '',
          quantity: '',
          unitPrice: '',
          amount: '0.00',
          remark: ''
        }
      ];
}

function syncQuotationFormData(source = {}) {
  quotationFormData.recipientName = String(source?.recipientName ?? '');
  quotationFormData.recipientTitle = String(source?.recipientTitle ?? '');
  quotationFormData.contactName = String(source?.contactName ?? '');
  quotationFormData.contactPhone = String(source?.contactPhone ?? '');
  quotationFormData.quotationDate = String(source?.quotationDate ?? '');
  quotationFormData.items = normalizeQuotationItemsForUi(source?.items);
}

function buildQuotationFormPayload() {
  return {
    recipientName: quotationFormData.recipientName,
    recipientTitle: quotationFormData.recipientTitle,
    contactName: quotationFormData.contactName,
    contactPhone: quotationFormData.contactPhone,
    quotationDate: quotationFormData.quotationDate,
    items: normalizeQuotationItemsForUi(quotationFormData.items)
  };
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

function buildQuotationFormDtoFromWorkflow(workflow) {
  if (!workflow) {
    return null;
  }

  const quotationNode = (workflow.nodes || []).find((node) => node.nodeKey === 'quotation_or_tender');
  const flow = workflow.quotationTender || {};
  return {
    projectId: workflow.projectId,
    nodeKey: 'quotation_or_tender',
    nodeStatus: quotationNode?.status,
    nodeRevision: quotationNode?.currentRevision || flow.nodeRevision || 1,
    branchType: flow.branchType,
    branchStatus: flow.branchStatus,
    branchRevision: flow.revision,
    form: flow.quotationForm || null,
    defaultFormData: null,
    permissions: {
      canViewQuotationForm: true,
      canEditQuotationForm: flow.permissions?.canEditQuotationForm === true,
      canSubmitQuotationForm: flow.permissions?.canSubmitQuotationForm === true,
      canDownloadGeneratedFile: flow.permissions?.canDownloadQuotationForm === true
    },
    isProjectEnded: workflow.isProjectEnded === true
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

  quotationFormDto.value = buildQuotationFormDtoFromWorkflow(workflow);
  if (selectedNode.value?.nodeKey === 'quotation_or_tender') {
    syncQuotationFormData(quotationFormDto.value?.form?.formData || quotationFormDto.value?.defaultFormData);
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
  } else if (nodeKey === 'quotation_or_tender') {
    await loadQuotationForm({ sequence });
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

async function markUploadExemption(slot) {
  const reason = String(uploadExemptionReasons[slot.slotKey] || '').trim();
  if (!reason) {
    localError.value = '请填写无需上传原因或备注。';
    return;
  }

  const result = await runAction(
    `exemption:mark:${slot.slotKey}`,
    () => markSolutionDesignUploadExemption(props.projectId, slot.slotKey, reason, props.authToken),
    `${slot.slotName}已标记无需上传。`
  );
  if (result) {
    uploadExemptionReasons[slot.slotKey] = '';
  }
}

async function cancelUploadExemption(slot) {
  await runAction(
    `exemption:cancel:${slot.slotKey}`,
    () => cancelSolutionDesignUploadExemption(props.projectId, slot.slotKey, props.authToken),
    `${slot.slotName}已取消无需上传。`
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

function getAnalysisImages() {
  const dto = analysisFormDto.value || {};
  return Array.isArray(dto.images)
    ? dto.images
    : Array.isArray(dto.form?.images)
      ? dto.form.images
      : [];
}

function setAnalysisImages(images) {
  const sortedImages = [...images].sort((left, right) => {
    if (left.fieldKey !== right.fieldKey) {
      return String(left.fieldKey).localeCompare(String(right.fieldKey));
    }
    return String(left.uploadedAt || '').localeCompare(String(right.uploadedAt || '')) || Number(left.id) - Number(right.id);
  });
  const current = analysisFormDto.value;
  if (!current) {
    return;
  }
  analysisFormDto.value = {
    ...current,
    images: sortedImages,
    form: current.form
      ? {
          ...current.form,
          images: sortedImages
        }
      : current.form
  };
}

function upsertAnalysisImage(fieldKey, image) {
  const currentImages = getAnalysisImages().filter((item) => String(item.id) !== String(image.id));
  setAnalysisImages([...currentImages, { ...image, fieldKey: image.fieldKey || fieldKey }]);
}

function removeAnalysisImage(imageId) {
  setAnalysisImages(getAnalysisImages().filter((item) => String(item.id) !== String(imageId)));
}

function markAnalysisGeneratedFileOutdated() {
  const current = analysisFormDto.value;
  if (!current) {
    return;
  }

  analysisFormDto.value = {
    ...current,
    permissions: {
      ...current.permissions,
      canSubmitNode: false
    },
    form: current.form
      ? {
          ...current.form,
          generatedFile: current.form.generatedFile
            ? {
                ...current.form.generatedFile,
                status: 'not_started',
                fileName: null,
                mimeType: null,
                fileSize: null,
                generatedAt: null,
                generatedByUserId: null,
                errorMessage: null,
                canDownload: false
              }
            : current.form.generatedFile
        }
      : current.form
  };
}

async function uploadAnalysisImage({ field, file }) {
  localError.value = '';
  localMessage.value = '';
  const stageDocumentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
  if (!stageDocumentId || !analysisFormDto.value?.permissions?.canEditForm) {
    localError.value = '当前账号无权上传该在线表单图片。';
    return;
  }
  const limit = Number(field?.maxImages) || 3;
  if (getAnalysisImages().filter((image) => image.fieldKey === field.key).length >= limit) {
    localError.value = `该区域最多上传 ${limit} 张图片。`;
    return;
  }
  if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > MAX_ONLINE_FORM_IMAGE_FILE_SIZE) {
    localError.value = '图片文件无效，请选择 10MB 以内的 png/jpg/jpeg 图片。';
    return;
  }

  analysisImageState.uploadPendingFieldKey = field.key;
  try {
    const image = await uploadStageDocumentOnlineFormImage(
      props.projectId,
      stageDocumentId,
      field.key,
      file,
      props.authToken
    );
    upsertAnalysisImage(field.key, image);
    markAnalysisGeneratedFileOutdated();
    localMessage.value = '项目方案分析表图片已上传，请重新提交表单生成文件。';
  } catch (error) {
    localError.value = toReadableApiError(error);
  } finally {
    analysisImageState.uploadPendingFieldKey = '';
  }
}

async function downloadAnalysisImage({ image }) {
  localError.value = '';
  localMessage.value = '';
  const stageDocumentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
  if (!stageDocumentId || !image?.id) {
    localError.value = '图片尚不可下载。';
    return;
  }

  analysisImageState.downloadPendingId = image.id;
  try {
    const download = await downloadStageDocumentOnlineFormImage(
      props.projectId,
      stageDocumentId,
      image.id,
      props.authToken
    );
    saveBlob(download, image.originalFileName || '项目方案分析表图片');
  } catch (error) {
    localError.value = toReadableApiError(error);
  } finally {
    analysisImageState.downloadPendingId = null;
  }
}

async function deleteAnalysisImage({ image }) {
  localError.value = '';
  localMessage.value = '';
  const stageDocumentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
  if (!stageDocumentId || !image?.id) {
    localError.value = '图片尚不可删除。';
    return;
  }

  analysisImageState.deletePendingId = image.id;
  try {
    await deleteStageDocumentOnlineFormImage(
      props.projectId,
      stageDocumentId,
      image.id,
      props.authToken
    );
    removeAnalysisImage(image.id);
    markAnalysisGeneratedFileOutdated();
    localMessage.value = '项目方案分析表图片已删除，请重新提交表单生成文件。';
  } catch (error) {
    localError.value = toReadableApiError(error);
  } finally {
    analysisImageState.deletePendingId = null;
  }
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

async function loadQuotationForm({ sequence = ++formReloadSequence } = {}) {
  if (!props.projectId || isPending('quotation-form:load')) {
    return;
  }
  quotationFormLoading.value = true;
  localError.value = '';
  try {
    const dto = await getSolutionDesignQuotationForm(props.projectId, props.authToken);
    if (sequence !== formReloadSequence) {
      return;
    }
    quotationFormDto.value = dto;
    syncQuotationFormData(dto.form?.formData || dto.defaultFormData);
  } catch (error) {
    if (sequence === formReloadSequence) {
      localError.value = toReadableApiError(error);
    }
  } finally {
    if (sequence === formReloadSequence) {
      quotationFormLoading.value = false;
    }
  }
}

function updateQuotationFormField({ key, value }) {
  quotationFormData[key] = value;
}

function updateQuotationItemField({ index, key, value }) {
  if (!quotationFormData.items[index]) {
    return;
  }
  quotationFormData.items[index] = {
    ...quotationFormData.items[index],
    [key]: value
  };
}

function addQuotationItem() {
  quotationFormData.items = [
    ...normalizeQuotationItemsForUi(quotationFormData.items),
    {
      name: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      amount: '0.00',
      remark: ''
    }
  ];
}

function removeQuotationItem(index) {
  const rows = normalizeQuotationItemsForUi(quotationFormData.items);
  if (rows.length <= 1) {
    quotationFormData.items = normalizeQuotationItemsForUi([]);
    return;
  }
  quotationFormData.items = rows.filter((_item, itemIndex) => itemIndex !== index);
}

async function saveQuotationForm() {
  const dto = await runAction(
    'quotation-form:save',
    () => saveSolutionDesignQuotationForm(props.projectId, buildQuotationFormPayload(), props.authToken),
    '报价单草稿已保存。'
  );
  if (dto) {
    quotationFormDto.value = dto;
    syncQuotationFormData(dto.form?.formData || dto.defaultFormData);
  }
}

async function submitQuotationForm() {
  const dto = await runAction(
    'quotation-form:submit',
    () => submitSolutionDesignQuotationForm(props.projectId, buildQuotationFormPayload(), props.authToken),
    '报价单已提交并生成 Word 文件。'
  );
  if (dto) {
    quotationFormDto.value = dto;
    syncQuotationFormData(dto.form?.formData || dto.defaultFormData);
  }
}

async function downloadQuotationGeneratedFile() {
  await runAction(
    'quotation-form:download',
    async () => {
      const download = await downloadSolutionDesignQuotationGeneratedFile(props.projectId, props.authToken);
      saveBlob(download, quotationFormDto.value?.form?.generatedFile?.fileName || '报价单.docx');
    },
    '报价单生成文件已开始下载。',
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

function requiresFinanceApprovalBranch(node) {
  return (
    node?.nodeKey === 'finance_cost_estimation' &&
    node?.status === 'pending_general_review' &&
    node?.permissions?.canApprove === true
  );
}

async function approveNode(nodeOrKey) {
  const node =
    nodeOrKey && typeof nodeOrKey === 'object'
      ? nodeOrKey
      : sortedNodes.value.find((candidate) => candidate.nodeKey === nodeOrKey);
  const nodeKey = node?.nodeKey || String(nodeOrKey || '');
  const payload = {};
  if (requiresFinanceApprovalBranch(node)) {
    const branchType = String(financeApprovalBranchType.value || '').trim();
    if (!branchType) {
      localError.value = '请选择报价流程或投标流程。';
      return;
    }
    payload.branchType = branchType;
  }

  await runAction(
    `approve:${nodeKey}`,
    () =>
      approveSolutionDesignWorkflowNode(
        props.projectId,
        nodeKey,
        payload,
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
  if (node?.nodeKey === 'solution_analysis') {
    const generatedFile = analysisFormDto.value?.form?.generatedFile;
    if (generatedFile && (generatedFile.status !== 'generated' || generatedFile.canDownload !== true)) {
      return false;
    }
  }

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
  return user.name || user.displayName || user.display_name || user.account || `用户 ${user.id}`;
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

const AnalysisImageFieldList = defineComponent({
  name: 'AnalysisImageFieldList',
  props: {
    fields: {
      type: Array,
      required: true
    },
    images: {
      type: Array,
      default: () => []
    },
    disabled: {
      type: Boolean,
      default: false
    },
    imageState: {
      type: Object,
      default: () => ({})
    },
    hasStageDocument: {
      type: Boolean,
      default: false
    }
  },
  emits: ['upload', 'download', 'delete'],
  setup(componentProps, { emit: componentEmit }) {
    function fieldImages(field) {
      return componentProps.images.filter((image) => image.fieldKey === field.key);
    }

    function isUploadPending(field) {
      return componentProps.imageState?.uploadPendingFieldKey === field.key;
    }

    function isDownloadPending(image) {
      return Boolean(image?.id) && String(componentProps.imageState?.downloadPendingId ?? '') === String(image.id);
    }

    function isDeletePending(image) {
      return Boolean(image?.id) && String(componentProps.imageState?.deletePendingId ?? '') === String(image.id);
    }

    function handleFileChange(field, event) {
      const file = event.target.files?.[0] || null;
      event.target.value = '';
      if (!file || componentProps.disabled || isUploadPending(field)) {
        return;
      }
      componentEmit('upload', { field, file });
    }

    function renderImageField(field) {
      const images = fieldImages(field);
      const limit = Number(field.maxImages) || 3;
      const uploadDisabled =
        componentProps.disabled ||
        !componentProps.hasStageDocument ||
        isUploadPending(field) ||
        images.length >= limit;
      return h('label', { key: field.key, class: 'form-grid__wide online-form-image-field' }, [
        h('span', field.label),
        images.length
          ? h(
              'div',
              { class: 'online-form-image-field__list' },
              images.map((image, imageIndex) =>
                h('div', { key: image.id, class: 'online-form-image-field__current' }, [
                  h('div', [
                    h('strong', `${imageIndex + 1}. ${image.originalFileName}`),
                    h('small', formatFileSize(image.fileSize))
                  ]),
                  h('div', { class: 'online-form-image-field__actions' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'ghost-button',
                        disabled: isDownloadPending(image),
                        onClick: () => componentEmit('download', { field, image })
                      },
                      isDownloadPending(image) ? '下载中...' : '下载'
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'ghost-button',
                        disabled: componentProps.disabled || isDeletePending(image),
                        onClick: () => componentEmit('delete', { field, image })
                      },
                      isDeletePending(image) ? '删除中...' : '删除'
                    )
                  ])
                ])
              )
            )
          : null,
        h('div', { class: 'online-form-image-field__upload' }, [
          h('input', {
            type: 'file',
            accept: 'image/png,image/jpeg',
            disabled: uploadDisabled,
            onChange: (event) => handleFileChange(field, event)
          }),
          h('span', isUploadPending(field) ? '上传中...' : images.length >= limit ? `已达上限 ${limit} 张` : `选择图片（${images.length}/${limit}）`)
        ])
      ]);
    }

    return () =>
      h(
        'div',
        { class: 'form-grid solution-design-workflow__form-grid' },
        componentProps.fields.map((field) => renderImageField(field))
      );
  }
});

const AnalysisFormSection = defineComponent({
  name: 'AnalysisFormSection',
  components: { AnalysisImageFieldList, GeneratedFilePanel, FormFieldList },
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
    },
    imageState: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['load', 'update', 'save', 'submit', 'download', 'upload-image', 'download-image', 'delete-image'],
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
                '项目编号、项目名称和客户名称由项目基础信息自动带入；生成文件按当前项目方案分析表模板写入已确认单元格。'
              ),
              ...analysisFieldGroups.flatMap((group) => [
                h('div', { class: 'solution-design-workflow__subheading' }, [
                  h('span', { class: 'section-eyebrow' }, group.title)
                ]),
                group.note
                  ? h(
                      'p',
                      { class: 'inline-muted solution-design-workflow__form-note' },
                      group.note
                    )
                  : null,
                h(FormFieldList, {
                  fields: group.fields,
                  formData: componentProps.formData,
                  disabled: !componentProps.dto.permissions?.canEditForm,
                  onUpdate: (payload) => componentEmit('update', payload)
                })
              ]),
              h('div', { class: 'solution-design-workflow__subheading' }, [
                h('span', { class: 'section-eyebrow' }, '图片')
              ]),
              h(AnalysisImageFieldList, {
                fields: analysisImageFields,
                images: componentProps.dto.images || componentProps.dto.form?.images || [],
                disabled: !componentProps.dto.permissions?.canEditForm,
                imageState: componentProps.imageState,
                hasStageDocument: Boolean(componentProps.dto.stageDocumentId || componentProps.dto.form?.stageDocumentId),
                onUpload: (payload) => componentEmit('upload-image', payload),
                onDownload: (payload) => componentEmit('download-image', payload),
                onDelete: (payload) => componentEmit('delete-image', payload)
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
    quotationFormDto: {
      type: Object,
      default: null
    },
    quotationFormData: {
      type: Object,
      required: true
    },
    quotationFormLoading: {
      type: Boolean,
      default: false
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
    'load-quotation-form',
    'update-quotation-form',
    'update-quotation-item',
    'add-quotation-item',
    'remove-quotation-item',
    'save-quotation-form',
    'submit-quotation-form',
    'download-quotation-form',
    'submit-quotation',
    'submit-tender',
    'accept-quotation',
    'update:return-reason',
    'update:reject-action',
    'reject-quotation'
  ],
  setup(componentProps, { emit: componentEmit }) {
    function renderQuotationForm() {
      const dto = componentProps.quotationFormDto;
      const form = dto?.form || {};
      const generatedFile = form.generatedFile || null;
      const canEdit = dto?.permissions?.canEditQuotationForm === true;
      const canSubmit = dto?.permissions?.canSubmitQuotationForm === true;
      const rows = normalizeQuotationItemsForUi(componentProps.quotationFormData.items);

      return h('section', { class: 'solution-design-workflow__quotation-form' }, [
        h('div', { class: 'solution-design-workflow__subheading' }, [
          h('span', { class: 'section-eyebrow' }, '在线表单'),
          h('strong', 'C18 报价单')
        ]),
        componentProps.quotationFormLoading
          ? h('section', { class: 'state-panel state-panel--inline' }, [h('p', '正在加载报价单...')])
          : null,
        !dto && !componentProps.quotationFormLoading
          ? h(
              'button',
              { type: 'button', class: 'ghost-button', onClick: () => componentEmit('load-quotation-form') },
              '加载报价单'
            )
          : null,
        dto
          ? [
              h('div', { class: 'form-grid solution-design-workflow__form-grid' }, [
                h('label', [
                  h('span', 'TO *'),
                  h('input', {
                    value: componentProps.quotationFormData.recipientName,
                    disabled: !canEdit,
                    onInput: (event) =>
                      componentEmit('update-quotation-form', { key: 'recipientName', value: event.target.value })
                  })
                ]),
                h('label', [
                  h('span', '称谓'),
                  h(
                    'select',
                    {
                      value: componentProps.quotationFormData.recipientTitle,
                      disabled: !canEdit,
                      onChange: (event) =>
                        componentEmit('update-quotation-form', { key: 'recipientTitle', value: event.target.value })
                    },
                    [
                      h('option', { value: '' }, '先生/女士'),
                      h('option', { value: '先生' }, '先生'),
                      h('option', { value: '女士' }, '女士')
                    ]
                  )
                ]),
                h('label', [
                  h('span', '联系人 *'),
                  h('input', {
                    value: componentProps.quotationFormData.contactName,
                    disabled: !canEdit,
                    onInput: (event) =>
                      componentEmit('update-quotation-form', { key: 'contactName', value: event.target.value })
                  })
                ]),
                h('label', [
                  h('span', '电话 *'),
                  h('input', {
                    value: componentProps.quotationFormData.contactPhone,
                    disabled: !canEdit,
                    onInput: (event) =>
                      componentEmit('update-quotation-form', { key: 'contactPhone', value: event.target.value })
                  })
                ]),
                h('label', [
                  h('span', '报价日期'),
                  h('input', {
                    type: 'date',
                    value: componentProps.quotationFormData.quotationDate,
                    disabled: !canEdit,
                    onInput: (event) =>
                      componentEmit('update-quotation-form', { key: 'quotationDate', value: event.target.value })
                  })
                ])
              ]),
              h('div', { class: 'solution-design-workflow__quotation-table-wrap' }, [
                h('table', { class: 'solution-design-workflow__quotation-table' }, [
                  h('thead', [
                    h('tr', [
                      h('th', '序号'),
                      h('th', '项目'),
                      h('th', '单位'),
                      h('th', '数量'),
                      h('th', '单价'),
                      h('th', '金额'),
                      h('th', '备注'),
                      h('th', '操作')
                    ])
                  ]),
                  h(
                    'tbody',
                    rows.map((row, index) =>
                      h('tr', { key: `quotation-item-${index}` }, [
                        h('td', { class: 'solution-design-workflow__quotation-sequence' }, String(index + 1)),
                        h('td', [
                          h('input', {
                            value: row.name,
                            disabled: !canEdit,
                            onInput: (event) =>
                              componentEmit('update-quotation-item', { index, key: 'name', value: event.target.value })
                          })
                        ]),
                        h('td', [
                          h('input', {
                            value: row.unit,
                            disabled: !canEdit,
                            onInput: (event) =>
                              componentEmit('update-quotation-item', { index, key: 'unit', value: event.target.value })
                          })
                        ]),
                        h('td', [
                          h('input', {
                            value: row.quantity,
                            inputmode: 'decimal',
                            disabled: !canEdit,
                            onInput: (event) =>
                              componentEmit('update-quotation-item', {
                                index,
                                key: 'quantity',
                                value: event.target.value
                              })
                          })
                        ]),
                        h('td', [
                          h('input', {
                            value: row.unitPrice,
                            inputmode: 'decimal',
                            disabled: !canEdit,
                            onInput: (event) =>
                              componentEmit('update-quotation-item', {
                                index,
                                key: 'unitPrice',
                                value: event.target.value
                              })
                          })
                        ]),
                        h('td', { class: 'solution-design-workflow__quotation-amount' }, row.amount || '后端计算'),
                        h('td', [
                          h('input', {
                            value: row.remark,
                            disabled: !canEdit,
                            onInput: (event) =>
                              componentEmit('update-quotation-item', { index, key: 'remark', value: event.target.value })
                          })
                        ]),
                        h('td', { class: 'solution-design-workflow__quotation-row-action' }, [
                          h(
                            'button',
                            {
                              type: 'button',
                              class: 'ghost-button solution-design-workflow__quotation-delete-button',
                              disabled: !canEdit || rows.length <= 1,
                              onClick: () => componentEmit('remove-quotation-item', index)
                            },
                            '删除'
                          )
                        ])
                      ])
                    )
                  ),
                  h('tfoot', [
                    h('tr', [
                      h('td', { colspan: 5 }, '合计'),
                      h(
                        'td',
                        { class: 'solution-design-workflow__quotation-amount' },
                        form.formData?.totalAmount || '后端计算'
                      ),
                      h('td', { colspan: 2 }, [
                        h(
                          'span',
                          { class: 'solution-design-workflow__quotation-uppercase' },
                          `大写：${form.formData?.totalAmountUppercase || '后端计算'}`
                        )
                      ])
                    ])
                  ])
                ])
              ]),
              canEdit
                ? h(
                    'button',
                    { type: 'button', class: 'ghost-button', onClick: () => componentEmit('add-quotation-item') },
                    '新增明细行'
                  )
                : null,
              generatedFile
                ? h(GeneratedFilePanel, {
                    generatedFile,
                    pending: componentProps.pendingAction === 'quotation-form:download',
                    onDownload: () => componentEmit('download-quotation-form')
                  })
                : null,
              dto.form?.generatedFile?.status === 'failed'
                ? h('p', { class: 'inline-muted' }, dto.form.generatedFile.errorMessage || '报价单生成失败')
                : null,
              h('div', { class: 'form-actions solution-design-workflow__form-actions' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'ghost-button',
                    disabled: !canEdit || componentProps.pendingAction === 'quotation-form:save',
                    onClick: () => componentEmit('save-quotation-form')
                  },
                  componentProps.pendingAction === 'quotation-form:save' ? '保存中...' : '保存草稿'
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'primary-button',
                    disabled: !canSubmit || componentProps.pendingAction === 'quotation-form:submit',
                    onClick: () => componentEmit('submit-quotation-form')
                  },
                  componentProps.pendingAction === 'quotation-form:submit' ? '提交中...' : '提交并生成 Word'
                )
              ])
            ]
          : null
      ]);
    }

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
          ? [
              renderQuotationForm(),
              h('div', { class: 'solution-design-workflow__quotation-actions' }, [
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
            ]
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
.solution-design-workflow__approval-branch label,
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
.solution-design-workflow__exemption-actions,
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

.solution-design-workflow__exemption-actions {
  align-items: flex-start;
}

.solution-design-workflow__exemption-actions textarea {
  min-width: min(360px, 100%);
  flex: 1 1 280px;
  resize: vertical;
}

.solution-design-workflow__form-grid {
  margin-top: 8px;
}

.solution-design-workflow__form-note {
  margin: 8px 0 0;
}

.solution-design-workflow__quotation-table-wrap {
  max-width: 100%;
  margin-top: 12px;
  overflow-x: auto;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #fff;
}

.solution-design-workflow__quotation-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.92rem;
}

.solution-design-workflow__quotation-table th,
.solution-design-workflow__quotation-table td {
  padding: 8px;
  border-bottom: 1px solid #e6ebf2;
  vertical-align: middle;
}

.solution-design-workflow__quotation-table th {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.solution-design-workflow__quotation-table th:nth-child(1),
.solution-design-workflow__quotation-table td:nth-child(1) {
  width: 52px;
}

.solution-design-workflow__quotation-table th:nth-child(2),
.solution-design-workflow__quotation-table td:nth-child(2) {
  width: 210px;
}

.solution-design-workflow__quotation-table th:nth-child(3),
.solution-design-workflow__quotation-table td:nth-child(3) {
  width: 92px;
}

.solution-design-workflow__quotation-table th:nth-child(4),
.solution-design-workflow__quotation-table td:nth-child(4),
.solution-design-workflow__quotation-table th:nth-child(5),
.solution-design-workflow__quotation-table td:nth-child(5),
.solution-design-workflow__quotation-table th:nth-child(6),
.solution-design-workflow__quotation-table td:nth-child(6) {
  width: 118px;
}

.solution-design-workflow__quotation-table th:nth-child(8),
.solution-design-workflow__quotation-table td:nth-child(8) {
  width: 82px;
}

.solution-design-workflow__quotation-table input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.solution-design-workflow__quotation-table tfoot td {
  border-bottom: 0;
  background: #f8fafc;
  font-weight: 600;
}

.solution-design-workflow__quotation-sequence,
.solution-design-workflow__quotation-row-action {
  text-align: center;
}

.solution-design-workflow__quotation-amount {
  color: #334155;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.solution-design-workflow__quotation-uppercase {
  display: block;
  overflow-wrap: anywhere;
}

.solution-design-workflow__quotation-delete-button {
  width: 58px;
  min-width: 58px;
  padding-inline: 0;
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
.solution-design-workflow__approval-branch,
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
  .solution-design-workflow__exemption-actions > *,
  .solution-design-workflow__form-actions > *,
  .solution-design-workflow__quotation-actions > *,
  .solution-design-workflow__repeatable-row > * {
    width: 100%;
  }
}
</style>
