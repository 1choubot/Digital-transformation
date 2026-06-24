<template>
  <section class="page-stack">
    <!-- 精简标题行 -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目详情</span>
        <h2>{{ detail?.project.projectName || '项目基础状态' }}</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        返回列表
      </button>
    </div>

    <section v-if="loading" class="state-panel state-panel--inline">
      <p>正在加载项目详情...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--error">
      <h3>{{ notFound ? '项目不存在' : '项目详情加载失败' }}</h3>
      <p>{{ errorMessage }}</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目列表</button>
    </section>

    <template v-else-if="detail">
      <!-- 标签页导航 -->
      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <use :href="`#icon-${tab.key}`" />
          </svg>
          {{ tab.label }}
          <span v-if="tab.badge !== undefined" class="tab-badge" :class="tab.badgeClass">
            {{ tab.badge }}
          </span>
        </button>
      </div>

      <!-- SVG 图标定义 -->
      <svg style="display: none;">
        <symbol id="icon-overview" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </symbol>
        <symbol id="icon-checklist" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v2H9V5z" />
          <path d="M9 12l1.5 1.5L15 10" />
          <path d="M9 16l1.5 1.5L15 14" />
        </symbol>
        <symbol id="icon-advance" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
          <path d="M12 22V7" />
        </symbol>
        <symbol id="icon-logs" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </symbol>
      </svg>

      <!-- 概览标签页 -->
      <div v-show="activeTab === 'overview'" class="tab-content">
        <ProjectDetailHeader :detail="detail" :current-stage-title="currentStageTitle" />
        <ProjectStageTimeline :stages="detail.stages" />
      </div>

      <!-- 资料清单标签页 -->
      <div v-show="activeTab === 'checklist'" class="tab-content">
        <ProjectStageDocumentChecklist
          :checklist="checklist"
          :loading="checklistLoading"
          :error-message="checklistErrorMessage"
          :is-checklist-empty="isChecklistEmpty"
          :action-message="actionMessage"
          :action-error-message="actionErrorMessage"
          :responsibility-candidates-error-message="responsibilityCandidatesErrorMessage"
          :responsibility-candidates-loading="responsibilityCandidatesLoading"
          :responsibility-candidates="responsibilityCandidates"
          :responsibility-selections="responsibilitySelections"
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

      <!-- 阶段推进标签页 -->
      <div v-show="activeTab === 'advance'" class="tab-content">
        <ProjectStageAdvancePanel
          :current-stage="detail.currentStage"
          :is-project-completed="isProjectCompleted"
          :current-stage-completeness="currentStageCompleteness"
          :missing-documents="currentStageAdvanceMissingDocuments"
          :can-advance-current-stage="canAdvanceCurrentStage"
          :pending="stageAdvancePending"
          :message="stageAdvanceMessage"
          :error-message="stageAdvanceErrorMessage"
          @advance="advanceCurrentStage"
        />
      </div>

      <!-- 操作日志标签页 -->
      <div v-show="activeTab === 'logs'" class="tab-content">
        <ProjectOperationLogPanel
          :loading="operationLogsLoading"
          :error-message="operationLogsErrorMessage"
          :logs="operationLogs"
        />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
const actionMessage = ref('');
const actionErrorMessage = ref('');
const pendingAction = ref('');
const stageAdvancePending = ref(false);
const stageAdvanceMessage = ref('');
const stageAdvanceErrorMessage = ref('');
const stageAdvanceMissingDocuments = ref([]);
const returnReasons = reactive({});
const notApplicableReasons = reactive({});
const responsibilitySelections = reactive({});
const attachmentStates = reactive({});

const MAX_ATTACHMENT_FILE_SIZE = 50 * 1024 * 1024;

const activeTab = ref('overview');
const tabs = computed(() => [
  {
    key: 'overview',
    label: '概览',
    badge: undefined
  },
  {
    key: 'checklist',
    label: '资料清单',
    badge: checklist.value ? checklist.value.stages.reduce((acc, stage) => acc + stage.documents.length, 0) : 0,
    badgeClass: 'tab-badge--primary'
  },
  {
    key: 'advance',
    label: '阶段推进',
    badge: canAdvanceCurrentStage.value ? '可推进' : '待齐套',
    badgeClass: canAdvanceCurrentStage.value ? 'tab-badge--success' : 'tab-badge--warning'
  },
  {
    key: 'logs',
    label: '操作日志',
    badge: operationLogs.value.length || 0,
    badgeClass: 'tab-badge--secondary'
  }
]);

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
const currentStageAdvanceMissingDocuments = computed(() => {
  if (stageAdvanceErrorMessage.value && stageAdvanceMissingDocuments.value.length > 0) {
    return stageAdvanceMissingDocuments.value;
  }
  return currentStageCompleteness.value?.incompleteRequiredDocuments || [];
});
const canAdvanceCurrentStage = computed(
  () =>
    Boolean(detail.value?.currentStage) &&
    !isProjectCompleted.value &&
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

function clearAttachmentStates() {
  Object.keys(attachmentStates).forEach((key) => {
    delete attachmentStates[key];
  });
}

function clearActionState() {
  actionMessage.value = '';
  actionErrorMessage.value = '';
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
  clearActionState();
  pendingAction.value = actionKey(document.id, action);
  try {
    await runner();
    if (onSuccess) {
      onSuccess();
    }
    clearStageAdvanceState();
    actionMessage.value = successText;
    await Promise.all([loadChecklist(), loadOperationLogs()]);
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
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
  clearActionState();
  const reason = String(returnReasons[document.id] || '').trim();
  if (!reason) {
    actionErrorMessage.value = '请填写退回原因。';
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
  clearActionState();
  const reason = String(notApplicableReasons[document.id] || '').trim();
  if (!reason) {
    actionErrorMessage.value = '请填写不适用原因。';
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
  clearActionState();
  let responsibleUserId;
  try {
    responsibleUserId = getSelectedResponsibleUserId(responsibilitySelections[document.id]);
  } catch {
    actionErrorMessage.value = '责任人参数无效，请刷新清单后重试。';
    return;
  }
  if (String(responsibleUserId || '') === String(document.responsibleUserId || '')) {
    actionMessage.value = '资料责任人未变化。';
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
  clearActionState();
  const state = getAttachmentState(document.id);
  if (!file || file.size <= 0 || file.size > MAX_ATTACHMENT_FILE_SIZE) {
    state.errorMessage = '附件文件无效，请选择 1 字节到 50MB 以内的文件。';
    return;
  }
  state.uploadPending = true;
  state.errorMessage = '';
  try {
    await uploadStageDocumentAttachment(props.projectId, document.id, file, props.authToken);
    actionMessage.value = '资料附件已上传。';
    await Promise.all([loadDocumentAttachments(document.id), loadOperationLogs()]);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    actionErrorMessage.value = state.errorMessage;
  } finally {
    state.uploadPending = false;
  }
}

async function downloadAttachment({ document, attachment }) {
  clearActionState();
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
    actionErrorMessage.value = state.errorMessage;
  } finally {
    state.downloadPendingId = null;
  }
}

async function deleteAttachment({ document, attachment }) {
  clearActionState();
  const state = getAttachmentState(document.id);
  state.deletePendingId = attachment.id;
  state.errorMessage = '';
  try {
    await deleteStageDocumentAttachment(props.projectId, document.id, attachment.id, props.authToken);
    actionMessage.value = '资料附件已删除。';
    await Promise.all([loadDocumentAttachments(document.id), loadOperationLogs()]);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    actionErrorMessage.value = state.errorMessage;
  } finally {
    state.deletePendingId = null;
  }
}

async function advanceCurrentStage() {
  clearActionState();
  clearStageAdvanceState();
  if (!canAdvanceCurrentStage.value) {
    stageAdvanceErrorMessage.value = '当前阶段未齐套，不能推进。';
    stageAdvanceMissingDocuments.value = currentStageAdvanceMissingDocuments.value;
    return;
  }
  stageAdvancePending.value = true;
  try {
    await advanceProjectStage(props.projectId, props.authToken);
    stageAdvanceMessage.value = '项目阶段已手工推进。';
    await loadDetail({ preserveStageAdvanceState: true });
  } catch (error) {
    stageAdvanceErrorMessage.value = toReadableApiError(error);
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
  clearActionState();
  if (!options.preserveStageAdvanceState) {
    clearStageAdvanceState();
  }
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
/* ===== 全局重置 & 基础 ===== */
.page-stack {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== 标题行 ===== */
.page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.section-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.page-title-row h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.3;
}

.page-user {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 400;
}

/* ===== 按钮 ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.4rem 1rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.ghost-button:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.primary-button {
  background: #0f172a;
  border: none;
  padding: 0.6rem 1.6rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.primary-button:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

/* ===== 标签页导航 ===== */
.tab-navigation {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  background: #ffffff;
  padding: 0.4rem;
  border-radius: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
  position: relative;
}

.tab-button:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.tab-button--active {
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.15);
}

.tab-button--active:hover {
  background: #1e293b;
  color: #ffffff;
}

.tab-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  transition: stroke 0.2s;
}

.tab-button--active .tab-icon {
  stroke: #ffffff;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 0.65rem;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
}

.tab-badge--primary {
  background: #eef2ff;
  color: #4338ca;
}

.tab-badge--success {
  background: #dcfce7;
  color: #166534;
}

.tab-badge--warning {
  background: #fef3c7;
  color: #92400e;
}

.tab-badge--secondary {
  background: #f1f5f9;
  color: #475569;
}

.tab-button--active .tab-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tab-button--active .tab-badge--primary {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tab-button--active .tab-badge--success {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tab-button--active .tab-badge--warning {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tab-button--active .tab-badge--secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* ===== 标签页内容 ===== */
.tab-content {
  animation: fadeIn 0.25s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 350px;
}

.tab-content > * {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 子组件容器 ===== */
.tab-content :deep(.panel) {
  background: #ffffff;
  border-radius: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 1.5rem 2rem;
  margin-bottom: 0;
  transition: box-shadow 0.2s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tab-content :deep(.panel:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* ===== 阶段推进面板 - 关键修改 ===== */
.tab-content :deep(.stage-advance-panel) {
  flex: 0 1 auto; /* 不拉伸，根据内容自适应 */
  justify-content: flex-start; /* 内容从顶部开始 */
  padding-top: 0.5rem; /* 减少顶部内边距 */
  padding-bottom: 0.5rem; /* 减少底部内边距 */
}

/* 当阶段推进面板内容为空或已完成时，减少内边距 */
.tab-content :deep(.stage-advance-panel--completed) {
  padding: 1rem 0;
}

/* ===== 状态面板 ===== */
.state-panel {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 1.25rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.state-panel--inline {
  padding: 2.5rem 1.5rem;
  min-height: 200px;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.state-panel h3 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #1e293b;
}

.state-panel p {
  color: #64748b;
  margin: 0 0 1.25rem 0;
}

.state-panel--error p {
  color: #b91c1c;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .page-stack {
    padding: 1.5rem 1rem;
  }

  .page-title-row h2 {
    font-size: 1.3rem;
  }

  .tab-navigation {
    gap: 0.2rem;
    padding: 0.3rem;
  }

  .tab-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
  }

  .tab-icon {
    width: 14px;
    height: 14px;
  }

  .tab-content {
    min-height: 300px;
  }

  .tab-content :deep(.panel) {
    padding: 1.25rem 1.25rem;
  }
}

@media (max-width: 768px) {
  .page-title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0;
  }

  .title-left {
    gap: 0.1rem;
  }

  .page-title-row .ghost-button {
    align-self: flex-start;
  }

  .tab-navigation {
    gap: 0.15rem;
    padding: 0.25rem;
    border-radius: 1rem;
  }

  .tab-button {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
    gap: 0.3rem;
  }

  .tab-icon {
    width: 12px;
    height: 12px;
  }

  .tab-badge {
    min-width: 14px;
    height: 14px;
    font-size: 0.55rem;
    padding: 0 3px;
  }

  .tab-content {
    min-height: 280px;
  }

  .tab-content :deep(.panel) {
    padding: 1rem 1rem;
  }

  .state-panel {
    padding: 2rem 1rem;
    min-height: 160px;
  }
}

@media (max-width: 480px) {
  .page-stack {
    padding: 0.75rem 0.75rem;
  }

  .page-title-row h2 {
    font-size: 1.1rem;
  }

  .section-eyebrow {
    font-size: 0.55rem;
  }

  .page-user {
    font-size: 0.7rem;
  }

  .ghost-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }

  .tab-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
    gap: 0.2rem;
  }

  .tab-icon {
    width: 11px;
    height: 11px;
  }

  .tab-badge {
    min-width: 12px;
    height: 12px;
    font-size: 0.5rem;
    padding: 0 2px;
  }

  .tab-content {
    min-height: 250px;
  }

  .tab-content :deep(.panel) {
    padding: 0.75rem 0.75rem;
    border-radius: 1rem;
  }

  .state-panel {
    padding: 1.5rem 0.75rem;
    min-height: 120px;
  }

  .state-panel h3 {
    font-size: 1.1rem;
  }
}
</style>