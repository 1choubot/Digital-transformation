<template>
  <section class="page-stack animate-fadeIn">
    <!-- STREAMING_CHUNK: 渲染页面顶部项目名称状态行... -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目详情</span>
        <h2>{{ detail?.project.projectName || '项目基础状态' }}</h2>
        <div class="user-meta">
          <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        </div>
      </div>
      <button type="button" class="ghost-button back-btn" @click="navigate('/projects')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>返回项目台账</span>
      </button>
    </div>

    <!-- 加载中 -->
    <section v-if="loading" class="state-panel panel">
      <div class="loading-wave">
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
      </div>
      <p>正在为您加载项目完整主数据及责任清单...</p>
    </section>

    <!-- 异常状态处理 -->
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

    <!-- 主展示区 -->
    <template v-else-if="detail">
      <!-- 原型头部基础数据组件 -->
      <div class="card-wrapper">
        <ProjectDetailHeader :detail="detail" :current-stage-title="currentStageTitle" />
      </div>

      <!-- 时间阶段轴线组件 -->
      <div class="card-wrapper">
        <ProjectStageTimeline :stages="detail.stages" />
      </div>

      <!-- STREAMING_CHUNK: 渲染阶段推进操作面板，隐藏内置信息提示，通过 Toast 显示... -->
      <div class="card-wrapper">
        <ProjectStageAdvancePanel
          :current-stage="detail.currentStage"
          :is-project-completed="isProjectCompleted"
          :current-stage-completeness="currentStageCompleteness"
          :missing-documents="currentStageAdvanceMissingDocuments"
          :can-advance-current-stage="canAdvanceCurrentStage"
          :show-advance-action="canCurrentUserAdvanceProject"
          :pending="stageAdvancePending"
          :message="''"
          :error-message="''"
          @advance="advanceCurrentStage"
        />
      </div>

      <!-- STREAMING_CHUNK: 责任资料清单，同样将 actionMessage 参数剥离由 Toast 接管... -->
      <div class="card-wrapper">
        <ProjectStageDocumentChecklist
          :checklist="checklist"
          :loading="checklistLoading"
          :error-message="checklistErrorMessage"
          :is-checklist-empty="isChecklistEmpty"
          :action-message="''"
          :action-error-message="''"
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

      <!-- 操作审计日志记录面板 -->
      <div class="card-wrapper">
        <ProjectOperationLogPanel
          :loading="operationLogsLoading"
          :error-message="operationLogsErrorMessage"
          :logs="operationLogs"
        />
      </div>
    </template>

    <!-- STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层... -->
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
  confirmStageDocument,
  deleteStageDocumentAttachment,
  downloadStageDocumentAttachment,
  getProjectDetail,
  getProjectOperationLogs,
  getProjectStageDocumentChecklist,
  listStageDocumentAttachments,
  markStageDocumentNotApplicable,
  markStageDocumentSubmitted,
  restoreStageDocumentApplicable,
  returnStageDocument,
  toReadableApiError,
  updateStageDocumentResponsibleUser,
  uploadStageDocumentAttachment
} from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import ProjectDetailHeader from '../components/project-detail/ProjectDetailHeader.vue';
import ProjectOperationLogPanel from '../components/project-detail/ProjectOperationLogPanel.vue';
import ProjectStageAdvancePanel from '../components/project-detail/ProjectStageAdvancePanel.vue';
import ProjectStageDocumentChecklist from '../components/project-detail/ProjectStageDocumentChecklist.vue';
import ProjectStageTimeline from '../components/project-detail/ProjectStageTimeline.vue';
import {
  actionKey,
  getSelectedResponsibleUserId,
  stageCompleteness
} from '../components/project-detail/stageDocumentViewHelpers.js';
import { formatUser } from '../utils/format.js';

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
const responsibilityCandidatesLoading = ref(false);
const responsibilityCandidatesErrorMessage = ref('');
const responsibilityCandidates = ref([]);
const pendingAction = ref('');
const stageAdvancePending = ref(false);
const stageAdvanceMissingDocuments = ref([]);
const returnReasons = reactive({});
const notApplicableReasons = reactive({});
const responsibilitySelections = reactive({});
const attachmentStates = reactive({});

const MAX_ATTACHMENT_FILE_SIZE = 50 * 1024 * 1024;

// STREAMING_CHUNK: 统一定义 Toast 控制状态...
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

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

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
    Boolean(currentStageCompleteness.value) &&
    currentStageCompleteness.value.incompleteRequiredCount === 0
);

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

// STREAMING_CHUNK: 改造资料清单操作后的静态提示为全局 Toast 通知...
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

// STREAMING_CHUNK: 改造上传与删除附件后的静态反馈为 Toast 弹窗通知...
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

// STREAMING_CHUNK: 改造手工阶段推进反馈为 Toast 弹窗通知...
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

  try {
    detail.value = await getProjectDetail(props.projectId, props.authToken);
  } catch (error) {
    errorCode.value = error.code || '';
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }

  if (detail.value) {
    await Promise.all([loadChecklist(), loadOperationLogs(), loadResponsibilityCandidates()]);
  }
}

onMounted(loadDetail);
watch(() => props.projectId, loadDetail);
</script>

<style scoped>
/* 全局页面容器 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
  position: relative;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* 顶部标题行 */
.page-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-bottom: 0.5rem;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: #e2e8f0;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
}

.page-title-row h2 {
  font-size: 2.125rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  margin: 0;
  line-height: 1.2;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  color: #475569;
}

.meta-icon {
  width: 16px;
  height: 16px;
  stroke: #64748b;
}

.page-user {
  font-size: 0.875rem;
  font-weight: 500;
}

/* 按钮及交互 */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.ghost-button:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 状态展示 */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  text-align: center;
}

.state-panel p {
  font-size: 0.95rem;
  color: #64748b;
}

.state-panel--error {
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  color: #b91c1c;
}

.error-icon {
  width: 40px;
  height: 40px;
  stroke: #ef4444;
  margin-bottom: 1rem;
}

.state-panel--error h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 0.5rem;
}

.primary-button {
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.primary-button:hover {
  background: #1e293b;
}

.inline-btn {
  margin-top: 1.25rem;
}

/* 子模块卡片包装器 */
.card-wrapper {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.02);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-wrapper:hover {
  box-shadow: 0 12px 30px rgba(0, 20, 40, 0.05);
}

/* STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层 CSS... */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 9999;
  border: 1px solid #f1f5f9;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  stroke: #dc2626;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #22c55e;
}

.toast--success .toast-icon {
  stroke: #16a34a;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
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
  color: #94a3b8;
}

.toast-close:hover {
  background: #f1f5f9;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

/* 等待动画 */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1.25rem;
}

.wave-bar {
  width: 4px;
  height: 24px;
  background: #0f172a;
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
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .page-stack {
    padding: 1rem;
    gap: 1.25rem;
  }
}
</style>