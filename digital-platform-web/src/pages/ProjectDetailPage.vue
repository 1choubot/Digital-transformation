<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">项目详情</span>
        <h2>{{ detail?.project.projectName || '项目基础状态' }}</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">返回列表</button>
    </div>

    <section v-if="loading" class="state-panel">
      <p>正在加载项目详情...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--error">
      <h3>{{ notFound ? '项目不存在' : '项目详情加载失败' }}</h3>
      <p>{{ errorMessage }}</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目列表</button>
    </section>

    <template v-else-if="detail">
      <ProjectDetailHeader :detail="detail" :current-stage-title="currentStageTitle" />

      <ProjectStageTimeline :stages="detail.stages" />

      <ProjectOperationLogPanel
        :loading="operationLogsLoading"
        :error-message="operationLogsErrorMessage"
        :logs="operationLogs"
      />

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
  if (stageAdvanceErrorMessage.value && stageAdvanceMissingDocuments.value.length > 0) {
    return stageAdvanceMissingDocuments.value;
  }

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
