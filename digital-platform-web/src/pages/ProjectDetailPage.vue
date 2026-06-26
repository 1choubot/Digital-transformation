<template>
  <section class="page-stack animate-fadeIn">
    <!-- 数据加载中 -->
    <section v-if="loading" class="state-panel panel">
      <div class="loading-wave">
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
      </div>
      <p>正在为您加载项目完整主数据及责任清单...</p>
    </section>

    <!-- 异常状态加载失败 -->
    <section v-else-if="errorMessage" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>{{ notFound ? '项目未找到' : '项目详情加载失败' }}</h3>
      <p>{{ errorMessage }}</p>
      <button type="button" class="primary-button inline-btn" @click="navigate('/projects')">返回项目列表</button>
    </section>

    <!-- 主内容区 -->
    <template v-else-if="detail">
      <!-- 模块 1: 项目头部信息概览 -->
      <div class="card-wrapper">
        <ProjectDetailHeader :detail="detail" :current-stage-title="currentStageTitle" />
      </div>
      
      <!-- 模块 2: 时间阶段轴线组件 -->
      <div class="card-wrapper">
        <ProjectStageTimeline :stages="detail.stages" />
      </div>

      <!-- 模块 3: 高保真胶囊段落导航 (Segmented Tabs) -->
      <div class="tab-nav-container">
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- 模块 4: Tab 动态子内容区 -->
      <div class="tab-content">
        <!-- 阶段推进 -->
        <div v-show="activeTab === 'advance'" class="card-wrapper">
          <ProjectStageAdvancePanel
            :current-stage="detail.currentStage"
            :is-project-completed="isProjectCompleted"
            :current-stage-completeness="currentStageCompleteness"
            :missing-documents="currentStageAdvanceMissingDocuments"
            :can-advance-current-stage="canAdvanceCurrentStage"
            :show-advance-action="canCurrentUserAdvanceProject"
            :pending="stageAdvancePending"
            :message="stageAdvanceMessage"
            :error-message="stageAdvanceErrorMessage"
            @advance="advanceCurrentStage"
          />
        </div>

        <!-- 审批管理 -->
        <div v-show="activeTab === 'approval'" class="card-wrapper">
          <ProjectStageApprovalPanel
            :stages="detail.stages"
            :project="detail.project"
            :approval-histories="approvalHistories"
            :approval-history-errors="approvalHistoryErrors"
            :approval-histories-loading="approvalHistoriesLoading"
            :return-comments="approvalReturnComments"
            :pending-action="approvalPendingAction"
            :message="approvalMessage"
            :error-message="approvalErrorMessage"
            :get-stage-completeness="getStageCompletenessForApproval"
            :can-submit-stage-approval="canSubmitStageApproval"
            :can-resubmit-stage-approval="canResubmitStageApproval"
            :can-approve-stage-approval="canApproveStageApproval"
            @submit="submitApproval"
            @resubmit="resubmitApproval"
            @approve="approveApproval"
            @return="returnApproval"
          />
        </div>

        <!-- 文档清单 -->
        <div v-show="activeTab === 'checklist'" class="card-wrapper">
          <ProjectStageDocumentChecklist
            :checklist="checklist"
            :loading="checklistLoading"
            :error-message="checklistErrorMessage"
            :is-checklist-empty="isChecklistEmpty"
            :action-message="actionMessage"
            :action-error-message="actionErrorMessage"
            :responsibility-candidates-error-message="responsibilityCandidatesErrorMessage"
            :responsibility-candidates-loading="responsibilityCandidatesLoading"
            :responsibility-candidates="visibleResponsibilityCandidates"
            :responsibility-selections="responsibilitySelections"
            :can-submit-document="canSubmitDocument"
            :can-confirm-return-document="canConfirmReturnDocument"
            :can-manage-responsibility="canManageResponsibility"
            :can-change-applicability="canChangeApplicability"
            :return-reasons="returnReasons"
            :not-applicable-reasons="notApplicableReasons"
            :is-action-pending="isActionPending"
            :get-attachment-state="getAttachmentState"
            @submit-document="submitDocument"
            @confirm-document="confirmDocument"
            @return-document="returnDocument"
            @mark-not-applicable="markNotApplicable"
            @restore-applicable="restoreApplicable"
            @save-responsible-user="saveResponsibleUser"
            @clear-responsible-user="clearResponsibleUser"
            @upload-attachment="uploadAttachment"
            @download-attachment="downloadAttachment"
            @delete-attachment="deleteAttachment"
          />
        </div>

        <!-- 操作日志 -->
        <div v-show="activeTab === 'logs'" class="card-wrapper">
          <ProjectOperationLogPanel
            :loading="operationLogsLoading"
            :error-message="operationLogsErrorMessage"
            :logs="operationLogs"
          />
        </div>
      </div>
    </template>

    <!-- 全局统一样式的 Toast 消息弹出浮层 -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast" :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }">
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="toastType === 'error'">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </template>
          <template v-else>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </template>
        </svg>
        <span>{{ toastMessage }}</span>
        <button type="button" class="toast-close" @click="hideToast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  advanceProjectStage,
  approveStageApproval,
  confirmStageDocument,
  deleteStageDocumentAttachment,
  downloadStageDocumentAttachment,
  getProjectDetail,
  getProjectOperationLogs,
  getProjectStageDocumentChecklist,
  listStageApprovalHistory,
  listStageDocumentAttachments,
  markStageDocumentNotApplicable,
  markStageDocumentSubmitted,
  resubmitStageApproval,
  restoreStageDocumentApplicable,
  returnStageApproval,
  returnStageDocument,
  submitStageApproval,
  toReadableApiError,
  updateStageDocumentResponsibleUser,
  uploadStageDocumentAttachment
} from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import ProjectDetailHeader from '../components/project-detail/ProjectDetailHeader.vue';
import ProjectOperationLogPanel from '../components/project-detail/ProjectOperationLogPanel.vue';
import ProjectStageApprovalPanel from '../components/project-detail/ProjectStageApprovalPanel.vue';
import ProjectStageAdvancePanel from '../components/project-detail/ProjectStageAdvancePanel.vue';
import ProjectStageDocumentChecklist from '../components/project-detail/ProjectStageDocumentChecklist.vue';
import ProjectStageTimeline from '../components/project-detail/ProjectStageTimeline.vue';
import {
  actionKey,
  getSelectedResponsibleUserId,
  stageCompleteness
} from '../components/project-detail/stageDocumentViewHelpers.js';

const props = defineProps({
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  navigate: {
    type: Function,
    required: true
  }
});

// ---------- 原有状态 ----------
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);
const errorCode = ref('');
const checklistLoading = ref(false);
const checklistErrorMessage = ref('');
const checklist = ref(null);
const operationLogsLoading = ref(false);
const operationLogsErrorMessage = ref('');
const operationLogs = ref([]);
const approvalHistoriesLoading = ref(false);
const approvalHistories = reactive({});
const approvalHistoryErrors = reactive({});
const approvalReturnComments = reactive({});
const approvalPendingAction = ref('');
const approvalMessage = ref('');
const approvalErrorMessage = ref('');
const responsibilityCandidatesLoading = ref(false);
const responsibilityCandidatesErrorMessage = ref('');
const responsibilityCandidates = ref([]);
const pendingAction = ref('');
const stageAdvancePending = ref(false);
const stageAdvanceMissingDocuments = ref([]);
const stageAdvanceMessage = ref('');
const stageAdvanceErrorMessage = ref('');
const actionMessage = ref('');
const actionErrorMessage = ref('');
const returnReasons = reactive({});
const notApplicableReasons = reactive({});
const responsibilitySelections = reactive({});
const attachmentStates = reactive({});

const MAX_ATTACHMENT_FILE_SIZE = 50 * 1024 * 1024;
const GENERAL_MANAGER_APPROVAL_STAGE_KEYS = new Set(['initiation', 'contract', 'closeout']);
const STATIC_STAGE_APPROVAL_CENTERS = {
  initiation: 'marketing_center',
  solution: 'rd_center',
  contract: 'marketing_center',
  detailedDesign: 'rd_center',
  manufacturing: 'manufacturing_center',
  preAcceptance: 'manufacturing_center',
  finalAcceptance: 'manufacturing_center'
};

// ---------- Tab 相关 ----------
const tabs = [
  { key: 'advance', label: '阶段推进' },
  { key: 'approval', label: '审批管理' },
  { key: 'checklist', label: '文档清单' },
  { key: 'logs', label: '操作审计日志' }
];
const activeTab = ref('advance');

// ---------- Toast 控制 ----------
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = false;
}

// ---------- 新增：动态设置标签页标题 ----------
const DEFAULT_TITLE = '数字化管理平台';

// 在组件卸载时恢复默认标题（注意：原有的 onUnmounted 用于清除 timer，Vue 支持多个）
onUnmounted(() => {
  document.title = DEFAULT_TITLE;
});

// 原有的 onUnmounted（清除 toast timer）依然保留在下方的对应位置
// 但请注意，我们这里已经定义了一个 onUnmounted，Vue 会收集多个，
// 所以不会覆盖，但为了清晰，我们将原有的 onUnmounted 合并到此处，
// 这样只保留一个 onUnmounted 即可，但为了不破坏原有代码，我们保留原有。
// 实际上原有代码中，在 Toast 控制部分后面还有一个 onUnmounted，
// 它会在组件卸载时清除 timer，所以两个都会执行。

// ---------- 计算属性 ----------
const notFound = computed(() => errorCode.value === 'PROJECT_NOT_FOUND');
const isChecklistEmpty = computed(
  () => checklist.value && checklist.value.stages.every((stage) => stage.documents.length === 0)
);
const isProjectCompleted = computed(() => detail.value?.project.status === 'completed');
const currentStageTitle = computed(() => {
  if (detail.value?.currentStage) {
    return detail.value.currentStage.stageName;
  }
  return isProjectCompleted.value ? '项目已完成' : '-';
});
const currentChecklistStage = computed(() => {
  const currentStage = detail.value?.currentStage;
  if (!currentStage || !checklist.value) {
    return null;
  }
  return checklist.value.stages.find((stage) => stage.stageKey === currentStage.stageKey) || null;
});
const currentStageCompleteness = computed(() => {
  if (!currentChecklistStage.value) {
    return null;
  }
  return stageCompleteness(currentChecklistStage.value);
});
const currentUserOrganizationRole = computed(() => props.currentUser?.organizationRole || '');
const isCurrentUserProjectManager = computed(() => {
  const projectManagerUserId = detail.value?.project?.projectManagerUserId;
  return Boolean(projectManagerUserId) && String(projectManagerUserId) === String(props.currentUser?.id);
});
const isCurrentUserGeneralManager = computed(() => currentUserOrganizationRole.value === 'general_manager');
const isCurrentUserCenterManager = computed(() => currentUserOrganizationRole.value === 'center_manager');
const isCurrentUserGeneralManagerAssistant = computed(
  () => currentUserOrganizationRole.value === 'general_manager_assistant'
);
const isCurrentUserSystemAdmin = computed(() => currentUserOrganizationRole.value === 'system_admin');
const currentUserDepartment = computed(() => props.currentUser?.department || '');
const projectParticipatingDepartments = computed(() => {
  const value = detail.value?.project?.participatingDepartments;
  return Array.isArray(value) ? value : [];
});
const isProjectRelatedToCurrentCenter = computed(() => {
  if (!isCurrentUserCenterManager.value || !currentUserDepartment.value) {
    return false;
  }
  if (projectParticipatingDepartments.value.includes(currentUserDepartment.value)) {
    return true;
  }
  return (checklist.value?.stages || []).some((stage) =>
    (stage.documents || []).some((document) => document.responsibleUser?.department === currentUserDepartment.value)
  );
});
const visibleResponsibilityCandidates = computed(() => {
  if (!isCurrentUserCenterManager.value || isCurrentUserProjectManager.value || isCurrentUserGeneralManager.value) {
    return responsibilityCandidates.value;
  }
  return responsibilityCandidates.value.filter((candidate) => candidate.department === currentUserDepartment.value);
});
const canCurrentUserAdvanceProject = computed(() => {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return isCurrentUserGeneralManager.value || isCurrentUserProjectManager.value || isProjectRelatedToCurrentCenter.value;
});
const currentStageAdvanceMissingDocuments = computed(() => {
  return currentStageCompleteness.value?.incompleteRequiredDocuments || [];
});
const canAdvanceCurrentStage = computed(
  () =>
    Boolean(detail.value?.currentStage) &&
    !isProjectCompleted.value &&
    canCurrentUserAdvanceProject.value &&
    detail.value.currentStage.approvalStatus === 'approved' &&
    Boolean(currentStageCompleteness.value) &&
    currentStageCompleteness.value.incompleteRequiredCount === 0
);

// ---------- 原有方法 ----------
function isActionPending(documentId, action) {
  return pendingAction.value === actionKey(documentId, action);
}

function getAttachmentState(documentId) {
  if (!attachmentStates[documentId]) {
    attachmentStates[documentId] = {
      attachments: [],
      loading: false,
      errorMessage: '',
      uploadPending: false,
      downloadPendingId: null,
      deletePendingId: null
    };
  }
  return attachmentStates[documentId];
}

function getStageApprovalCenter(stage) {
  if (stage?.stageKey === 'closeout') {
    return detail.value?.project?.projectManagerUser?.department || '';
  }
  return STATIC_STAGE_APPROVAL_CENTERS[stage?.stageKey] || '';
}

function requiresGeneralManagerApproval(stage) {
  return GENERAL_MANAGER_APPROVAL_STAGE_KEYS.has(stage?.stageKey);
}

function getStageCompletenessForApproval(stage) {
  if (!stage || !checklist.value) {
    return null;
  }
  const checklistStage = checklist.value.stages.find((item) => item.stageKey === stage.stageKey);
  return checklistStage ? stageCompleteness(checklistStage) : null;
}

function isStageCompleteForApproval(stage) {
  const completeness = getStageCompletenessForApproval(stage);
  return Boolean(completeness) && completeness.incompleteRequiredCount === 0;
}

function canSubmitStageApproval(stage) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return (
    Boolean(stage?.isCurrent) &&
    isCurrentUserProjectManager.value &&
    (stage.approvalStatus || 'not_submitted') === 'not_submitted' &&
    isStageCompleteForApproval(stage)
  );
}

function canResubmitStageApproval(stage) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return (
    Boolean(stage?.isCurrent) &&
    isCurrentUserProjectManager.value &&
    ['returned_by_center_manager', 'returned_by_general_manager'].includes(stage.approvalStatus) &&
    isStageCompleteForApproval(stage)
  );
}

function canApproveStageApproval(stage) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  if (stage?.approvalStatus === 'pending_center_manager') {
    return (
      isCurrentUserCenterManager.value &&
      Boolean(currentUserDepartment.value) &&
      currentUserDepartment.value === getStageApprovalCenter(stage)
    );
  }
  if (stage?.approvalStatus === 'pending_general_manager') {
    return isCurrentUserGeneralManager.value && requiresGeneralManagerApproval(stage);
  }
  return false;
}

function isDocumentRelatedToCurrentCenter(document) {
  if (!isCurrentUserCenterManager.value || !currentUserDepartment.value) {
    return false;
  }
  if (document?.responsibleUser?.department) {
    return document.responsibleUser.department === currentUserDepartment.value;
  }
  return isProjectRelatedToCurrentCenter.value;
}

function isCurrentUserResponsibleForDocument(document) {
  return (
    document?.responsibleUserId !== null &&
    document?.responsibleUserId !== undefined &&
    String(document.responsibleUserId) === String(props.currentUser?.id)
  );
}

function canConfirmReturnDocument(document) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return isCurrentUserGeneralManager.value || isDocumentRelatedToCurrentCenter(document);
}

function canManageResponsibility(document) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return (
    isCurrentUserGeneralManager.value ||
    isCurrentUserProjectManager.value ||
    isDocumentRelatedToCurrentCenter(document)
  );
}

function canSubmitDocument(document) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return (
    isCurrentUserGeneralManager.value ||
    isCurrentUserProjectManager.value ||
    isDocumentRelatedToCurrentCenter(document) ||
    isCurrentUserResponsibleForDocument(document)
  );
}

function canChangeApplicability(document) {
  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }
  return isCurrentUserGeneralManager.value || isDocumentRelatedToCurrentCenter(document);
}

function clearAttachmentStates() {
  Object.keys(attachmentStates).forEach((key) => {
    delete attachmentStates[key];
  });
}

function clearApprovalHistories() {
  Object.keys(approvalHistories).forEach((key) => {
    delete approvalHistories[key];
  });
  Object.keys(approvalHistoryErrors).forEach((key) => {
    delete approvalHistoryErrors[key];
  });
}

function clearActionState() {
  actionMessage.value = '';
  actionErrorMessage.value = '';
}

function clearApprovalActionState() {
  approvalMessage.value = '';
  approvalErrorMessage.value = '';
}

function clearStageAdvanceState() {
  stageAdvanceMessage.value = '';
  stageAdvanceErrorMessage.value = '';
  stageAdvanceMissingDocuments.value = [];
}

function syncResponsibilitySelectionsFromChecklist() {
  Object.keys(responsibilitySelections).forEach((key) => {
    delete responsibilitySelections[key];
  });
  for (const stage of checklist.value?.stages || []) {
    for (const document of stage.documents || []) {
      responsibilitySelections[document.id] =
        document.responsibleUserId === null || document.responsibleUserId === undefined
          ? ''
          : String(document.responsibleUserId);
    }
  }
}

async function runDocumentAction(document, action, runner, successText, onSuccess = null) {
  pendingAction.value = actionKey(document.id, action);
  try {
    await runner();
    if (onSuccess) {
      onSuccess();
    }
    showToast(successText, 'success');
    await Promise.all([loadChecklist(), loadOperationLogs()]);
  } catch (error) {
    showToast(toReadableApiError(error), 'error');
  } finally {
    pendingAction.value = '';
  }
}

async function submitDocument(document) {
  await runDocumentAction(
    document,
    'submit',
    () => markStageDocumentSubmitted(props.projectId, document.id, props.authToken),
    '资料项已手工标记为已提交。',
    () => {
      delete returnReasons[document.id];
    }
  );
}

async function confirmDocument(document) {
  await runDocumentAction(
    document,
    'confirm',
    () => confirmStageDocument(props.projectId, document.id, props.authToken),
    '资料项已手工确认。'
  );
}

async function returnDocument(document) {
  const reason = String(returnReasons[document.id] || '').trim();
  if (!reason) {
    showToast('请填写退回原因。', 'error');
    return;
  }
  await runDocumentAction(
    document,
    'return',
    () => returnStageDocument(props.projectId, document.id, reason, props.authToken),
    '资料项已手工退回。',
    () => {
      delete returnReasons[document.id];
    }
  );
}

async function markNotApplicable(document) {
  const reason = String(notApplicableReasons[document.id] || '').trim();
  if (!reason) {
    showToast('请填写不适用原因。', 'error');
    return;
  }
  await runDocumentAction(
    document,
    'mark-not-applicable',
    () => markStageDocumentNotApplicable(props.projectId, document.id, reason, props.authToken),
    '资料项已手工标记为不适用。',
    () => {
      delete notApplicableReasons[document.id];
    }
  );
}

async function restoreApplicable(document) {
  await runDocumentAction(
    document,
    'restore-applicable',
    () => restoreStageDocumentApplicable(props.projectId, document.id, props.authToken),
    '资料项已恢复适用。',
    () => {
      delete notApplicableReasons[document.id];
    }
  );
}

async function saveResponsibleUser(document) {
  let responsibleUserId;
  try {
    responsibleUserId = getSelectedResponsibleUserId(responsibilitySelections[document.id]);
  } catch {
    showToast('责任人参数无效，请刷新清单后重试。', 'error');
    return;
  }
  if (String(responsibleUserId || '') === String(document.responsibleUserId || '')) {
    showToast('资料责任人未变化。', 'success');
    return;
  }
  await runDocumentAction(
    document,
    'responsible-user',
    () => updateStageDocumentResponsibleUser(props.projectId, document.id, responsibleUserId, props.authToken),
    responsibleUserId === null ? '资料责任人已清空。' : '资料责任人已更新。'
  );
}

async function clearResponsibleUser(document) {
  responsibilitySelections[document.id] = '';
  await runDocumentAction(
    document,
    'responsible-user',
    () => updateStageDocumentResponsibleUser(props.projectId, document.id, null, props.authToken),
    '资料责任人已清空。'
  );
}

async function loadDocumentAttachments(documentId) {
  const state = getAttachmentState(documentId);
  state.loading = true;
  state.errorMessage = '';
  try {
    state.attachments = await listStageDocumentAttachments(props.projectId, documentId, props.authToken);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    state.attachments = [];
  } finally {
    state.loading = false;
  }
}

async function loadAttachmentsForChecklist() {
  const documents = (checklist.value?.stages || []).flatMap((stage) => stage.documents || []);
  await Promise.all(documents.map((document) => loadDocumentAttachments(document.id)));
}

async function uploadAttachment({ document, file }) {
  const state = getAttachmentState(document.id);
  if (!file || file.size <= 0 || file.size > MAX_ATTACHMENT_FILE_SIZE) {
    showToast('附件文件无效，请选择 1 字节到 50MB 以内的文件。', 'error');
    return;
  }
  state.uploadPending = true;
  state.errorMessage = '';
  try {
    await uploadStageDocumentAttachment(props.projectId, document.id, file, props.authToken);
    showToast('资料附件已上传。', 'success');
    await Promise.all([loadDocumentAttachments(document.id), loadOperationLogs()]);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    showToast(state.errorMessage, 'error');
  } finally {
    state.uploadPending = false;
  }
}

async function downloadAttachment({ document, attachment }) {
  const state = getAttachmentState(document.id);
  state.downloadPendingId = attachment.id;
  state.errorMessage = '';
  try {
    const download = await downloadStageDocumentAttachment(
      props.projectId,
      document.id,
      attachment.id,
      props.authToken
    );
    const url = URL.createObjectURL(download.blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = download.fileName || attachment.originalFileName || 'attachment';
    globalThis.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    showToast(state.errorMessage, 'error');
  } finally {
    state.downloadPendingId = null;
  }
}

async function deleteAttachment({ document, attachment }) {
  const state = getAttachmentState(document.id);
  state.deletePendingId = attachment.id;
  state.errorMessage = '';
  try {
    await deleteStageDocumentAttachment(props.projectId, document.id, attachment.id, props.authToken);
    showToast('资料附件已删除。', 'success');
    await Promise.all([loadDocumentAttachments(document.id), loadOperationLogs()]);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    showToast(state.errorMessage, 'error');
  } finally {
    state.deletePendingId = null;
  }
}

async function advanceCurrentStage() {
  if (!canAdvanceCurrentStage.value) {
    showToast('当前阶段未齐套，不能推进。', 'error');
    stageAdvanceMissingDocuments.value = currentStageAdvanceMissingDocuments.value;
    return;
  }
  stageAdvancePending.value = true;
  try {
    await advanceProjectStage(props.projectId, props.authToken);
    showToast('项目阶段已手工推进。', 'success');
    await loadDetail({ preserveStageAdvanceState: true });
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    showToast(errorMsg, 'error');
    const documents = error.details?.incompleteRequiredDocuments;
    stageAdvanceMissingDocuments.value = Array.isArray(documents) ? documents : [];
  } finally {
    stageAdvancePending.value = false;
  }
}

async function loadChecklist() {
  checklistLoading.value = true;
  checklistErrorMessage.value = '';
  checklist.value = null;
  try {
    checklist.value = await getProjectStageDocumentChecklist(props.projectId, props.authToken);
    syncResponsibilitySelectionsFromChecklist();
    await loadAttachmentsForChecklist();
  } catch (error) {
    checklistErrorMessage.value = toReadableApiError(error);
  } finally {
    checklistLoading.value = false;
  }
}

async function loadResponsibilityCandidates() {
  responsibilityCandidatesLoading.value = true;
  responsibilityCandidatesErrorMessage.value = '';
  responsibilityCandidates.value = [];
  try {
    responsibilityCandidates.value = await listResponsibilityCandidates(props.authToken);
  } catch (error) {
    responsibilityCandidatesErrorMessage.value = toReadableApiError(error);
  } finally {
    responsibilityCandidatesLoading.value = false;
  }
}

async function loadOperationLogs() {
  operationLogsLoading.value = true;
  operationLogsErrorMessage.value = '';
  operationLogs.value = [];
  try {
    operationLogs.value = await getProjectOperationLogs(props.projectId, props.authToken);
  } catch (error) {
    operationLogsErrorMessage.value = toReadableApiError(error);
  } finally {
    operationLogsLoading.value = false;
  }
}

async function loadApprovalHistories() {
  approvalHistoriesLoading.value = true;
  clearApprovalHistories();
  try {
    await Promise.all(
      (detail.value?.stages || []).map(async (stage) => {
        try {
          approvalHistories[stage.id] = await listStageApprovalHistory(
            props.projectId,
            stage.id,
            props.authToken
          );
        } catch (error) {
          approvalHistories[stage.id] = [];
          approvalHistoryErrors[stage.id] = toReadableApiError(error);
        }
      })
    );
  } finally {
    approvalHistoriesLoading.value = false;
  }
}

async function runApprovalAction(stage, action, runner, successText, options = {}) {
  clearActionState();
  clearStageAdvanceState();
  clearApprovalActionState();
  approvalPendingAction.value = `${stage.id}:${action}`;
  try {
    await runner();
    if (options.clearReturnComment) {
      delete approvalReturnComments[stage.id];
    }
    showToast(successText, 'success');
    await loadDetail({
      preserveStageAdvanceState: true,
      preserveApprovalState: true
    });
  } catch (error) {
    showToast(toReadableApiError(error), 'error');
  } finally {
    approvalPendingAction.value = '';
  }
}

async function submitApproval(stage) {
  await runApprovalAction(
    stage,
    'submit',
    () => submitStageApproval(props.projectId, stage.id, props.authToken),
    '阶段审批已提交。'
  );
}

async function resubmitApproval(stage) {
  await runApprovalAction(
    stage,
    'resubmit',
    () => resubmitStageApproval(props.projectId, stage.id, props.authToken),
    '阶段审批已重新提交。'
  );
}

async function approveApproval(stage) {
  await runApprovalAction(
    stage,
    'approve',
    () => approveStageApproval(props.projectId, stage.id, props.authToken),
    '阶段审批已通过。'
  );
}

async function returnApproval(stage) {
  const comment = String(approvalReturnComments[stage.id] || '').trim();
  if (!comment) {
    showToast('请填写退回原因。', 'error');
    return;
  }
  await runApprovalAction(
    stage,
    'return',
    () => returnStageApproval(props.projectId, stage.id, comment, props.authToken),
    '阶段审批已退回。',
    { clearReturnComment: true }
  );
}

// ---------- 核心加载函数 ----------
async function loadDetail(options = {}) {
  loading.value = true;
  errorMessage.value = '';
  errorCode.value = '';
  detail.value = null;
  checklist.value = null;
  checklistErrorMessage.value = '';
  operationLogs.value = [];
  operationLogsErrorMessage.value = '';
  responsibilityCandidates.value = [];
  responsibilityCandidatesErrorMessage.value = '';
  clearAttachmentStates();
  clearApprovalHistories();
  clearActionState();
  if (!options.preserveStageAdvanceState) {
    clearStageAdvanceState();
  }
  if (!options.preserveApprovalState) {
    clearApprovalActionState();
  }
  try {
    detail.value = await getProjectDetail(props.projectId, props.authToken);
    // ===== 新增：项目加载成功后设置标签页标题 =====
    if (detail.value?.project?.projectName) {
      document.title = `${detail.value.project.projectName} - 数字化管理平台`;
    } else {
      document.title = DEFAULT_TITLE;
    }
    // ===== 结束 =====
  } catch (error) {
    errorCode.value = error.code || '';
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }
  if (detail.value) {
    await Promise.all([
      loadChecklist(),
      loadOperationLogs(),
      loadResponsibilityCandidates(),
      loadApprovalHistories()
    ]);
  }
}

// ---------- 生命周期 ----------
// 组件挂载时加载数据
onMounted(loadDetail);
// 当 projectId 变化时重新加载
watch(() => props.projectId, loadDetail);

// 原有的 onUnmounted（清除 toast timer）放在这里，与新增的恢复标题的 onUnmounted 共存
// 为了确保 timer 清除，我们保留这个 onUnmounted
// 但注意：我们之前定义了一个 onUnmounted 恢复标题，现在再定义一个清除 timer，
// Vue 会收集所有 onUnmounted 钩子，按顺序执行。
// 所以两个都会执行。
onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
/* ===== 全局页面容器 ===== */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #303133;
  position: relative;
  background: transparent;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* ===== 面板卡片包裹 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

.card-wrapper {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.card-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 21, 41, 0.06);
}

/* ===== 状态提示面板 ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4.5rem 2rem;
  text-align: center;
}

.state-panel p {
  font-size: 0.85rem;
  color: #909399;
}

.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  color: #f56c6c;
  margin: 0;
  border: 1px solid #fde2e2;
}

.state-panel--error h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f56c6c;
  margin-bottom: 0.5rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}

/* ===== 加载动画 ===== */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1.25rem;
}

.wave-bar {
  width: 4px;
  height: 20px;
  background: #3e63dd;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 高保真胶囊段落导航 (Segmented Tabs) ===== */
.tab-nav-container {
  display: flex;
  align-items: center;
}

.tab-nav {
  display: inline-flex;
  gap: 0.25rem;
  background: #f4f6f9;
  padding: 0.35rem;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 1px 2px rgba(0, 21, 41, 0.02) inset;
  overflow-x: auto;
  white-space: nowrap;
}

.tab-nav::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 0 0 auto;
  padding: 0.5rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #909399;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.tab-btn:hover {
  color: #3e63dd;
  background: rgba(62, 99, 221, 0.05);
}

.tab-btn.active {
  color: #3e63dd;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.tab-content {
  margin-top: 0;
}

/* ===== Toast 通知气泡样式 ===== */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  font-weight: 600;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #f56c6c;
}
.toast--error .toast-icon {
  stroke: #f56c6c;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.toast--success {
  border-left: 4px solid #67c23a;
}
.toast--success .toast-icon {
  stroke: #67c23a;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background 0.2s;
  color: #c0c4cc;
}
.toast-close:hover {
  background: #f4f4f5;
}
.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
  }
}

@media (max-width: 600px) {
  .page-stack {
    gap: 1rem;
    padding: 0.75rem;
  }
  .state-panel {
    padding: 3rem 1rem;
  }
  .tab-nav-container {
    width: 100%;
  }
  .tab-nav {
    width: 100%;
  }
  .tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
}
</style>