<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="项目工作区"
      :title="detail?.project.projectName || '项目基础状态'"
      :current-user="currentUser"
      subtitle="单项目主操作区：先选阶段，再选蓝色节点，最后处理节点产出、在线表单或评价审批。"
    >
      <template #actions>
        <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目总览</button>
      </template>
    </PageHeader>

    <section v-if="loading" class="state-panel">
      <p>正在加载项目详情...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--error">
      <h3>{{ notFound ? '项目不存在' : '项目详情加载失败' }}</h3>
      <p>{{ errorMessage }}</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目总览</button>
    </section>

    <template v-else-if="detail">
      <ProjectDetailHeader :detail="detail" :current-stage-title="currentStageTitle" />

      <section v-if="isTaskMode" class="state-panel state-panel--inline">
        <p>当前为工作台任务视图，仅展示后端返回的有权项目资料和操作入口。</p>
      </section>

      <ProjectStageTimeline :stages="detail.stages" />

      <section class="panel project-workspace project-workspace--primary">
        <div class="panel-heading">
          <div>
            <span class="section-eyebrow">项目工作区</span>
            <h3>阶段节点与产出工作区</h3>
            <p class="manual-status-note">
              固定层级为阶段说明、蓝色节点、节点产出、在线表单或评价审批动作；点击蓝色节点不会自动打开在线表单。
            </p>
          </div>
        </div>

        <section v-if="workspaceLoading" class="state-panel state-panel--inline">
          <p>正在加载项目工作区...</p>
        </section>
        <section v-else-if="workspaceErrorMessage" class="state-panel state-panel--inline state-panel--error">
          <p>{{ workspaceErrorMessage }}</p>
        </section>
        <div v-else-if="workspace" class="project-workspace__layout">
          <ProjectWorkspaceStageNav
            :stages="workspaceDisplayStages"
            :selected-stage-key="selectedWorkspaceStageKey"
            @select-stage="selectWorkspaceStage"
          />

          <div class="project-workspace__main">
            <ProjectWorkspaceNodeList
              :stage="activeWorkspaceDisplayStage"
              :active-node-key="selectedWorkspaceNodeKey"
              @select-node="selectWorkspaceNode(activeWorkspaceDisplayStage, $event)"
              @open-legacy-checklist="scrollToStageDocumentChecklist"
            />
            <ProjectWorkspaceOutputPanel
              v-if="!isActiveSolutionWorkspaceStage"
              :stage="activeWorkspaceDisplayStage"
              :node="activeWorkspaceNode"
              :active-online-form="activeOnlineForm"
              :active-online-form-document-id="activeOnlineFormDocumentId"
              :online-form-data="onlineFormData"
              :online-form-loading="onlineFormLoading"
              :online-form-saving="onlineFormSaving"
              :online-form-submitting="onlineFormSubmitting"
              :online-form-error-message="onlineFormErrorMessage"
              :online-form-image-state="onlineFormImageState"
              :is-action-pending="isActionPending"
              :get-output-document="getOutputDocument"
              :responsibility-candidates="visibleResponsibilityCandidates"
              :responsibility-candidates-loading="responsibilityCandidatesLoading"
              :responsibility-candidates-error-message="responsibilityCandidatesErrorMessage"
              :responsibility-selections="responsibilitySelections"
              :can-submit-document="canSubmitDocument"
              :can-confirm-return-document="canConfirmReturnDocument"
              :can-manage-responsibility="canManageResponsibility"
              :can-change-applicability="canChangeApplicability"
              :return-reasons="returnReasons"
              :not-applicable-reasons="notApplicableReasons"
              :get-attachment-state="getAttachmentState"
              @open-online-form="openOnlineForm"
              @open-legacy-checklist="scrollToStageDocumentChecklist"
              @save-online-form="saveOnlineForm"
              @submit-online-form="submitOnlineForm"
              @update-online-form-field="updateOnlineFormField"
              @approve-node="approveInitiationNode"
              @return-node="returnInitiationNode"
              @submit-document="submitDocument"
              @confirm-document="confirmDocument"
              @return-document="returnDocument"
              @complete-revision-document="completeRevisionDocument"
              @mark-not-applicable="markNotApplicable"
              @restore-applicable="restoreApplicable"
              @save-responsible-user="saveResponsibleUser"
              @clear-responsible-user="clearResponsibleUser"
              @upload-attachment="uploadAttachment"
              @download-attachment="downloadAttachment"
              @delete-attachment="deleteAttachment"
              @upload-online-form-image="uploadOnlineFormImage"
              @download-online-form-image="downloadOnlineFormImage"
              @delete-online-form-image="deleteOnlineFormImage"
              @download-generated-file="downloadGeneratedFile"
            />
            <ProjectSolutionDesignWorkflowPanel
              v-if="isActiveSolutionWorkspaceStage"
              ref="solutionDesignPanelRef"
              :project-id="projectId"
              :auth-token="authToken"
              :current-user="currentUser"
              :project="detail?.project || null"
              :workflow="solutionDesignWorkflow"
              :uploads="solutionDesignUploads"
              :focus-node-key="focusNodeKey"
              :selected-node-key="selectedWorkspaceNodeKey"
              hide-node-nav
              :loading="solutionDesignWorkflowLoading || solutionDesignUploadsLoading"
              :error-message="solutionDesignWorkflowErrorMessage || solutionDesignUploadsErrorMessage"
              :responsibility-candidates="responsibilityCandidates"
              :responsibility-candidates-loading="responsibilityCandidatesLoading"
              :responsibility-candidates-error-message="responsibilityCandidatesErrorMessage"
              @changed="refreshSolutionDesignState"
            />
          </div>
        </div>
      </section>

      <section
        v-if="actionMessage"
        class="state-panel state-panel--inline state-panel--success"
        role="status"
        aria-live="polite"
      >
        <p>{{ actionMessage }}</p>
      </section>

      <section
        v-if="actionErrorMessage"
        class="state-panel state-panel--inline state-panel--error"
        role="alert"
      >
        <p>{{ actionErrorMessage }}</p>
      </section>

      <ProjectOperationLogPanel
        v-if="canViewProjectAudit"
        :loading="operationLogsLoading"
        :error-message="operationLogsErrorMessage"
        :logs="operationLogs"
      />

      <ProjectStageAdvancePanel
        :current-stage="detail.currentStage"
        :is-project-completed="isProjectCompleted"
        :is-project-ended="isProjectEnded"
        :ended-reason="detail.project.endedReason"
        :current-stage-completeness="currentStageCompleteness"
        :missing-documents="currentStageAdvanceMissingDocuments"
        :can-advance-current-stage="canAdvanceCurrentStage"
        :show-advance-action="canCurrentUserAdvanceProject"
        :pending="stageAdvancePending"
        :message="stageAdvanceMessage"
        :error-message="stageAdvanceErrorMessage"
        @advance="advanceCurrentStage"
      />

      <section
        id="stage-document-checklist"
        class="legacy-compatibility-section"
        :class="{ 'legacy-compatibility-section--expanded': isLegacyChecklistExpanded }"
      >
        <div class="legacy-compatibility-section__summary">
          <div>
            <span class="section-eyebrow">兼容查看</span>
            <h3>兼容资料区</h3>
            <p class="manual-status-note">
              资料主操作已迁移到上方项目工作区产出卡片处理，本区域仅用于兼容查看和历史状态核对。
            </p>
          </div>
          <button
            type="button"
            class="ghost-button legacy-compatibility-section__toggle"
            :aria-expanded="isLegacyChecklistExpanded"
            aria-controls="stage-document-checklist-content"
            @click="isLegacyChecklistExpanded = !isLegacyChecklistExpanded"
          >
            {{ isLegacyChecklistExpanded ? '收起兼容资料区' : '展开兼容资料区' }}
          </button>
        </div>

        <ProjectStageDocumentChecklist
          v-if="isLegacyChecklistExpanded"
          id="stage-document-checklist-content"
          :checklist="checklist"
          :loading="checklistLoading"
          :error-message="checklistErrorMessage"
          :is-checklist-empty="isChecklistEmpty"
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
          :migrated-workspace-document-keys="migratedWorkspaceDocumentKeys"
          @submit-document="submitDocument"
          @confirm-document="confirmDocument"
          @return-document="returnDocument"
          @approve-initiation-review-node="approveInitiationNode"
          @return-initiation-review-node="returnInitiationNode"
          @complete-revision-document="completeRevisionDocument"
          @mark-not-applicable="markNotApplicable"
          @restore-applicable="restoreApplicable"
          @save-responsible-user="saveResponsibleUser"
          @clear-responsible-user="clearResponsibleUser"
          @upload-attachment="uploadAttachment"
          @download-attachment="downloadAttachment"
          @delete-attachment="deleteAttachment"
          @locate-output-card="locateWorkspaceOutputCard"
        />
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import {
  advanceProjectStage,
  approveInitiationReviewNode,
  confirmStageDocument,
  completeStageDocumentRevision,
  deleteStageDocumentAttachment,
  deleteStageDocumentOnlineFormImage,
  downloadStageDocumentAttachment,
  downloadStageDocumentGeneratedFile,
  downloadStageDocumentOnlineFormImage,
  getProjectDetail,
  getProjectOperationLogs,
  getProjectStageDocumentChecklist,
  getProjectWorkspace,
  getSolutionDesignWorkflow,
  getStageDocumentOnlineForm,
  listStageDocumentAttachments,
  listSolutionDesignUploads,
  markStageDocumentNotApplicable,
  markStageDocumentSubmitted,
  restoreStageDocumentApplicable,
  returnInitiationReviewNode,
  returnStageDocument,
  saveStageDocumentOnlineForm,
  submitStageDocumentOnlineForm,
  toReadableApiError,
  updateStageDocumentResponsibleUser,
  uploadStageDocumentAttachment,
  uploadStageDocumentOnlineFormImage
} from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import ProjectDetailHeader from '../components/project-detail/ProjectDetailHeader.vue';
import ProjectOperationLogPanel from '../components/project-detail/ProjectOperationLogPanel.vue';
import ProjectStageAdvancePanel from '../components/project-detail/ProjectStageAdvancePanel.vue';
import ProjectStageDocumentChecklist from '../components/project-detail/ProjectStageDocumentChecklist.vue';
import ProjectStageTimeline from '../components/project-detail/ProjectStageTimeline.vue';
import ProjectSolutionDesignWorkflowPanel from '../components/project-workspace/ProjectSolutionDesignWorkflowPanel.vue';
import ProjectWorkspaceNodeList from '../components/project-workspace/ProjectWorkspaceNodeList.vue';
import ProjectWorkspaceOutputPanel from '../components/project-workspace/ProjectWorkspaceOutputPanel.vue';
import ProjectWorkspaceStageNav from '../components/project-workspace/ProjectWorkspaceStageNav.vue';
import PageHeader from '../components/PageHeader.vue';
import {
  actionKey,
  getCompletionMode,
  getSelectedResponsibleUserId,
  isDocumentRelatedToDepartmentByOwnership,
  isInitiationOnlineFormDocument,
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
  taskMode: {
    type: String,
    default: ''
  },
  focusDocumentId: {
    type: String,
    default: ''
  },
  focusStageId: {
    type: String,
    default: ''
  },
  focusNodeKey: {
    type: String,
    default: ''
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
const workspaceLoading = ref(false);
const workspaceErrorMessage = ref('');
const workspace = ref(null);
const solutionDesignWorkflowLoading = ref(false);
const solutionDesignWorkflowErrorMessage = ref('');
const solutionDesignWorkflow = ref(null);
const solutionDesignUploadsLoading = ref(false);
const solutionDesignUploadsErrorMessage = ref('');
const solutionDesignUploads = ref(null);
const solutionDesignPanelRef = ref(null);
const selectedWorkspaceStageKey = ref('');
const selectedWorkspaceNodeKey = ref('');
const lastAppliedWorkspaceRouteKey = ref('');
const manualWorkspaceSelectionRouteKey = ref('');
const isLegacyChecklistExpanded = ref(false);
const activeOnlineFormDocumentId = ref(null);
const activeOnlineForm = ref(null);
const onlineFormData = reactive({});
const onlineFormLoading = ref(false);
const onlineFormSaving = ref(false);
const onlineFormSubmitting = ref(false);
const onlineFormErrorMessage = ref('');
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

const solutionDesignDedicatedDocumentCodes = new Set([
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
  'C10',
  'C11',
  'C12',
  'C13',
  'C14',
  'C15',
  'C16',
  'C17',
  'C18',
  'C19'
]);
const responsibilitySelections = reactive({});
const attachmentStates = reactive({});
const onlineFormImageState = reactive({
  uploadPendingFieldKey: '',
  downloadPendingId: null,
  deletePendingId: null
});

const MAX_ATTACHMENT_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ONLINE_FORM_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const notFound = computed(() => errorCode.value === 'PROJECT_NOT_FOUND');
const isChecklistEmpty = computed(
  () => checklist.value && checklist.value.stages.every((stage) => stage.documents.length === 0)
);
const isProjectCompleted = computed(() => detail.value?.project.status === 'completed');
const isProjectEnded = computed(() => detail.value?.project.status === 'ended');
const currentDetailStage = computed(() => {
  if (detail.value?.currentStage) {
    return detail.value.currentStage;
  }

  return detail.value?.stages?.find((stage) => stage.isCurrent) || null;
});
const currentStageTitle = computed(() => {
  if (isProjectEnded.value) {
    return '项目已结束';
  }

  if (currentDetailStage.value) {
    return currentDetailStage.value.stageName;
  }

  return isProjectCompleted.value ? '项目已完成' : '-';
});
const isSolutionDesignStage = computed(() => currentDetailStage.value?.stageKey === 'solution');
const currentChecklistStage = computed(() => {
  const currentStage = currentDetailStage.value;
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
const isCurrentUserProjectCreator = computed(() => {
  const creatorUserId = detail.value?.project?.createdByUserId;
  return Boolean(creatorUserId) && String(creatorUserId) === String(props.currentUser?.id);
});
const isCurrentUserGeneralManager = computed(() => currentUserOrganizationRole.value === 'general_manager');
const isCurrentUserCenterManager = computed(() => currentUserOrganizationRole.value === 'center_manager');
const isCurrentUserGeneralManagerAssistant = computed(
  () => currentUserOrganizationRole.value === 'general_manager_assistant'
);
const isCurrentUserSystemAdmin = computed(() => currentUserOrganizationRole.value === 'system_admin');
const currentUserDepartment = computed(() => props.currentUser?.department || '');
const allStageDocuments = computed(() =>
  (checklist.value?.stages || []).flatMap((stage) => stage.documents || [])
);
const activeWorkspaceStage = computed(
  () => (workspace.value?.stages || []).find((stage) => stage.stageKey === selectedWorkspaceStageKey.value) || null
);
const solutionDesignWorkspaceStage = computed(() => {
  const baseStage = (workspace.value?.stages || []).find((stage) => stage.stageKey === 'solution') || null;
  const nodes = [...(solutionDesignWorkflow.value?.nodes || [])]
    .sort((left, right) => Number(left.nodeOrder || 0) - Number(right.nodeOrder || 0))
    .map((node) => ({
      nodeKey: node.nodeKey,
      nodeName: node.nodeName,
      nodeStatus: mapSolutionDesignWorkspaceStatus(node.status),
      nodeOrder: node.nodeOrder,
      outputs: [],
      solutionDesignNode: node
    }));

  if (!baseStage || nodes.length === 0) {
    if (!baseStage) {
      return null;
    }

    return {
      ...baseStage,
      stageKey: 'solution',
      stageName: '方案设计阶段',
      configured: true,
      nodes: [],
      placeholderStatus: 'process_node',
      placeholderText: solutionDesignWorkflowLoading.value
        ? '方案设计阶段内部节点正在加载，请稍候。'
        : '当前项目未返回方案设计阶段内部节点。'
    };
  }

  return {
    ...baseStage,
    stageKey: 'solution',
    stageName: '方案设计阶段',
    configured: true,
    nodes
  };
});
const workspaceDisplayStages = computed(() => {
  const stages = workspace.value?.stages || [];
  if (!isSolutionDesignStage.value || !solutionDesignWorkspaceStage.value) {
    return stages;
  }

  return stages.map((stage) => (stage.stageKey === 'solution' ? solutionDesignWorkspaceStage.value : stage));
});
const activeWorkspaceDisplayStage = computed(() => {
  if (
    isSolutionDesignStage.value &&
    activeWorkspaceStage.value?.stageKey === 'solution' &&
    solutionDesignWorkspaceStage.value
  ) {
    return solutionDesignWorkspaceStage.value;
  }

  return activeWorkspaceStage.value;
});
const isActiveSolutionWorkspaceStage = computed(
  () =>
    isSolutionDesignStage.value &&
    activeWorkspaceDisplayStage.value?.stageKey === 'solution' &&
    Boolean(solutionDesignWorkspaceStage.value)
);
const activeWorkspaceNode = computed(
  () => (activeWorkspaceDisplayStage.value?.nodes || []).find((node) => node.nodeKey === selectedWorkspaceNodeKey.value) || null
);
const migratedWorkspaceDocumentKeys = computed(() => {
  const keys = new Set();
  for (const stage of workspace.value?.stages || []) {
    for (const node of stage.nodes || []) {
      for (const output of node.outputs || []) {
        const document = getOutputDocument(output);
        if (!document || isInitiationOnlineFormDocument(document)) {
          continue;
        }
        if (document.id) {
          keys.add(`id:${document.id}`);
        }
        if (document.documentCode) {
          keys.add(`code:${document.documentCode}`);
        }
      }
    }
  }
  return [...keys];
});
const isProjectRelatedToCurrentCenter = computed(() => {
  if (!isCurrentUserCenterManager.value || !currentUserDepartment.value) {
    return false;
  }

  return allStageDocuments.value.some((document) =>
    isDocumentRelatedToDepartmentByOwnership(document, currentUserDepartment.value)
  );
});
const visibleResponsibilityCandidates = computed(() => {
  if (!isCurrentUserCenterManager.value || isCurrentUserProjectManager.value || isCurrentUserGeneralManager.value) {
    return responsibilityCandidates.value;
  }

  return responsibilityCandidates.value.filter((candidate) => candidate.department === currentUserDepartment.value);
});
const canCurrentUserAdvanceProject = computed(() => {
  if (isProjectEnded.value) {
    return false;
  }

  if (isCurrentUserGeneralManagerAssistant.value || isCurrentUserSystemAdmin.value) {
    return false;
  }

  return isCurrentUserGeneralManager.value || isCurrentUserProjectManager.value || isProjectRelatedToCurrentCenter.value;
});
const canViewProjectAudit = computed(
  () =>
    !isCurrentUserSystemAdmin.value &&
    (
      isCurrentUserGeneralManager.value ||
      isCurrentUserGeneralManagerAssistant.value ||
      isCurrentUserCenterManager.value ||
      isCurrentUserProjectCreator.value ||
      isCurrentUserProjectManager.value
    )
);
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
    !isProjectEnded.value &&
    canCurrentUserAdvanceProject.value &&
    Boolean(currentStageCompleteness.value) &&
    currentStageCompleteness.value.incompleteRequiredCount === 0
);
const isTaskMode = computed(() =>
  Boolean(props.taskMode || props.focusDocumentId || props.focusStageId || props.focusNodeKey)
);

function isActionPending(documentId, action) {
  return pendingAction.value === actionKey(documentId, action);
}

function getOutputDocument(output) {
  return (
    allStageDocuments.value.find((document) => String(document.id) === String(output?.documentId)) ||
    allStageDocuments.value.find((document) => document.documentCode === output?.documentCode) ||
    null
  );
}

function mapSolutionDesignWorkspaceStatus(status) {
  return {
    not_started: 'process_node',
    pending: 'waiting_submission',
    pending_review: 'pending_review',
    pending_general_review: 'pending_review',
    returned: 'returned_for_rework',
    approved: 'completed',
    skipped: 'not_applicable',
    ended: 'completed'
  }[status] || 'process_node';
}

function findSolutionDesignWorkflowNodeKey(nodeKey) {
  const normalized = String(nodeKey || '').trim();
  if (!normalized) {
    return '';
  }

  return (solutionDesignWorkflow.value?.nodes || []).some((node) => node.nodeKey === normalized) ? normalized : '';
}

function selectWorkspaceStage(stage) {
  manualWorkspaceSelectionRouteKey.value = getWorkspaceRouteKey();
  selectedWorkspaceStageKey.value = stage.stageKey;
  selectedWorkspaceNodeKey.value = '';
  clearOnlineFormState();
}

function selectWorkspaceNode(stage, node) {
  if (!stage || !node) {
    return;
  }

  manualWorkspaceSelectionRouteKey.value = getWorkspaceRouteKey();
  selectedWorkspaceStageKey.value = stage.stageKey;
  selectedWorkspaceNodeKey.value = node.nodeKey;
  clearOnlineFormState();
}

function findStageDocumentChecklistCard(target = null) {
  const documentId = target?.legacyChecklistTarget?.documentId ?? target?.documentId ?? null;
  const documentCode = target?.legacyChecklistTarget?.documentCode ?? target?.documentCode ?? target?.legacyDocumentCode ?? null;
  const cards = Array.from(globalThis.document?.querySelectorAll?.('[data-stage-document-id], [data-stage-document-code]') || []);

  return (
    cards.find((card) => documentId && card.dataset.stageDocumentId === String(documentId)) ||
    cards.find((card) => documentCode && card.dataset.stageDocumentCode === String(documentCode)) ||
    null
  );
}

function focusStageDocumentChecklistCard(card) {
  if (!card) {
    return;
  }

  card.classList.add('stage-document-card--focused');
  globalThis.setTimeout?.(() => {
    card.classList.remove('stage-document-card--focused');
  }, 1800);
}

function findWorkspaceOutputCard(target = null) {
  const documentId = target?.id ?? target?.documentId ?? target?.output?.documentId ?? null;
  const documentCode = target?.documentCode ?? target?.output?.documentCode ?? target?.output?.legacyDocumentCode ?? null;
  const cards = Array.from(globalThis.document?.querySelectorAll?.('[data-workspace-output-document-id], [data-workspace-output-document-code]') || []);

  return (
    cards.find((card) => documentId && card.dataset.workspaceOutputDocumentId === String(documentId)) ||
    cards.find((card) => documentCode && card.dataset.workspaceOutputDocumentCode === String(documentCode)) ||
    null
  );
}

function focusWorkspaceOutputCard(card) {
  if (!card) {
    return;
  }

  card.classList.add('project-workspace__output--focused');
  globalThis.setTimeout?.(() => {
    card.classList.remove('project-workspace__output--focused');
  }, 1800);
}

function findWorkspaceTargetByDocument(document) {
  if (!document) {
    return null;
  }

  for (const stage of workspace.value?.stages || []) {
    for (const node of stage.nodes || []) {
      for (const output of node.outputs || []) {
        const boundDocument = getOutputDocument(output);
        if (
          (document.id && String(boundDocument?.id) === String(document.id)) ||
          (document.documentCode && boundDocument?.documentCode === document.documentCode)
        ) {
          return { stage, node, output };
        }
      }
    }
  }

  return null;
}

async function locateWorkspaceOutputCard(document) {
  const target = findWorkspaceTargetByDocument(document);
  if (target) {
    manualWorkspaceSelectionRouteKey.value = getWorkspaceRouteKey();
    selectedWorkspaceStageKey.value = target.stage.stageKey;
    selectedWorkspaceNodeKey.value = target.node.nodeKey;
    clearOnlineFormState();
    await nextTick();
  }

  const card = findWorkspaceOutputCard(target?.output || document);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusWorkspaceOutputCard(card);
    return;
  }

  const workspaceElement = globalThis.document?.querySelector?.('.project-workspace--primary');
  workspaceElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function scrollToStageDocumentChecklist(target = null) {
  if (!isLegacyChecklistExpanded.value) {
    isLegacyChecklistExpanded.value = true;
    await nextTick();
  }

  const documentCard = findStageDocumentChecklistCard(target);
  if (documentCard) {
    documentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusStageDocumentChecklistCard(documentCard);
    return;
  }

  const checklistElement = globalThis.document?.getElementById?.('stage-document-checklist');
  checklistElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectDefaultWorkspaceNode() {
  const initiationStage = (workspace.value?.stages || []).find((stage) => stage.stageKey === 'initiation');
  const firstStage = initiationStage || workspace.value?.stages?.[0] || null;
  selectedWorkspaceStageKey.value = firstStage?.stageKey || '';
  selectedWorkspaceNodeKey.value = '';
}

function findWorkspaceTargetByDocumentId(documentId) {
  if (!documentId) {
    return null;
  }

  const focusNodeKey = String(props.focusNodeKey || '').trim();
  let fallbackTarget = null;

  for (const stage of workspace.value?.stages || []) {
    for (const node of stage.nodes || []) {
      for (const output of node.outputs || []) {
        if (String(output.documentId) !== String(documentId)) {
          continue;
        }

        const target = { stage, node, output };
        if (!fallbackTarget) {
          fallbackTarget = target;
        }

        // nodeKey from workbench initiationReview routes is a 1.2 review node key,
        // not a blue workspace node key. It still resolves to the 1.2 output node.
        if (!focusNodeKey) {
          return target;
        }

        const hasReviewNode = (output.initiationReview?.nodes || []).some(
          (reviewNode) => reviewNode.nodeKey === focusNodeKey
        );
        if (hasReviewNode) {
          return target;
        }
      }
    }
  }

  return fallbackTarget;
}

function findWorkspaceStageByStageId(stageId) {
  if (!stageId) {
    return null;
  }

  return (workspace.value?.stages || []).find((stage) => String(stage.stageId) === String(stageId)) || null;
}

function findWorkspaceStageByDocumentIdFromChecklist(documentId) {
  if (!documentId) {
    return null;
  }

  const document = allStageDocuments.value.find((item) => String(item.id) === String(documentId));
  if (!document) {
    return null;
  }

  const stages = workspace.value?.stages || [];
  return (
    stages.find((stage) => document.stageKey && stage.stageKey === document.stageKey) ||
    stages.find((stage) => document.stageId && String(stage.stageId) === String(document.stageId)) ||
    stages.find((stage) => document.projectStageId && String(stage.stageId) === String(document.projectStageId)) ||
    stages.find((stage) => document.stageOrder && Number(stage.stageOrder) === Number(document.stageOrder)) ||
    null
  );
}

function getWorkspaceRouteKey() {
  return [
    props.projectId || '',
    props.taskMode || '',
    props.focusDocumentId || '',
    props.focusStageId || '',
    props.focusNodeKey || ''
  ].join('|');
}

function hasWorkspaceRouteFocus() {
  return Boolean(props.taskMode || props.focusDocumentId || props.focusStageId || props.focusNodeKey);
}

function markWorkspaceRouteApplied(routeKey) {
  if (routeKey) {
    lastAppliedWorkspaceRouteKey.value = routeKey;
  }
}

function clearWorkspaceOnlineForm(options = {}) {
  if (!options.preserveOnlineFormState) {
    clearOnlineFormState();
  }
}

function selectWorkspaceTargetFromRoute(options = {}) {
  if (!workspace.value) {
    return false;
  }

  const routeKey = getWorkspaceRouteKey();
  if (hasWorkspaceRouteFocus()) {
    if (manualWorkspaceSelectionRouteKey.value === routeKey || lastAppliedWorkspaceRouteKey.value === routeKey) {
      return true;
    }
  }

  const documentTarget = findWorkspaceTargetByDocumentId(props.focusDocumentId);
  if (documentTarget) {
    selectedWorkspaceStageKey.value = documentTarget.stage.stageKey;
    selectedWorkspaceNodeKey.value = documentTarget.node.nodeKey;
    clearWorkspaceOnlineForm(options);
    markWorkspaceRouteApplied(routeKey);
    return true;
  }

  const documentStageTarget = findWorkspaceStageByDocumentIdFromChecklist(props.focusDocumentId);
  if (documentStageTarget) {
    selectedWorkspaceStageKey.value = documentStageTarget.stageKey;
    selectedWorkspaceNodeKey.value = '';
    clearWorkspaceOnlineForm(options);
    markWorkspaceRouteApplied(routeKey);
    return true;
  }

  const stageTarget = findWorkspaceStageByStageId(props.focusStageId);
  if (stageTarget) {
    selectedWorkspaceStageKey.value = stageTarget.stageKey;
    selectedWorkspaceNodeKey.value = '';
    clearWorkspaceOnlineForm(options);
    markWorkspaceRouteApplied(routeKey);
    return true;
  }

  if (props.focusDocumentId) {
    selectDefaultWorkspaceNode();
    clearWorkspaceOnlineForm(options);
    return false;
  }

  if (isSolutionDesignStage.value && String(props.focusNodeKey || '').trim()) {
    const solutionStage = (workspace.value?.stages || []).find((stage) => stage.stageKey === 'solution');
    if (solutionStage) {
      selectedWorkspaceStageKey.value = solutionStage.stageKey;
      selectedWorkspaceNodeKey.value = findSolutionDesignWorkflowNodeKey(props.focusNodeKey);
      clearWorkspaceOnlineForm(options);
      markWorkspaceRouteApplied(routeKey);
      return true;
    }
  }

  selectDefaultWorkspaceNode();
  clearWorkspaceOnlineForm(options);
  markWorkspaceRouteApplied(routeKey);
  return true;
}

function clearOnlineFormState() {
  activeOnlineFormDocumentId.value = null;
  activeOnlineForm.value = null;
  onlineFormErrorMessage.value = '';
  onlineFormImageState.uploadPendingFieldKey = '';
  onlineFormImageState.downloadPendingId = null;
  onlineFormImageState.deletePendingId = null;
  Object.keys(onlineFormData).forEach((key) => {
    delete onlineFormData[key];
  });
}

function syncOnlineFormData(form) {
  Object.keys(onlineFormData).forEach((key) => {
    delete onlineFormData[key];
  });
  const data = form?.formData || {};
  for (const field of form?.schema?.fields || []) {
    onlineFormData[field.key] = data[field.key] ?? '';
  }
}

function updateOnlineFormField({ key, value }) {
  if (!key) {
    return;
  }

  onlineFormData[key] = value;
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

function getDocumentPermissions(document) {
  return document?.permissions || {};
}

function documentPermission(document, key, fallback) {
  const value = getDocumentPermissions(document)[key] ?? document?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function isSolutionDesignDedicatedStageDocument(document) {
  const documentCode = String(document?.documentCode ?? document?.document_code ?? '').trim();
  return isSolutionDesignStage.value && solutionDesignDedicatedDocumentCodes.has(documentCode);
}

function canConfirmReturnDocument(document) {
  if (isSolutionDesignDedicatedStageDocument(document)) {
    return false;
  }

  return !isProjectEnded.value && documentPermission(document, 'canReviewDocument', false);
}

function canManageResponsibility(document) {
  return !isProjectEnded.value && documentPermission(document, 'canManageResponsibility', false);
}

function canSubmitDocument(document) {
  if (isSolutionDesignDedicatedStageDocument(document)) {
    return false;
  }

  return !isProjectEnded.value && documentPermission(document, 'canSubmitDocument', false);
}

function canChangeApplicability(document) {
  return !isProjectEnded.value && documentPermission(document, 'canChangeApplicability', false);
}

function canViewDocumentAttachments(document) {
  return documentPermission(document, 'canViewAttachments', false);
}

function canUploadDocumentAttachment(document) {
  return !isProjectEnded.value && documentPermission(document, 'canUploadAttachment', false);
}

function canDownloadDocumentAttachment(document, attachment) {
  const value = attachment?.permissions?.canDownload ?? attachment?.canDownload;
  return typeof value === 'boolean' ? value : documentPermission(document, 'canDownloadAttachment', false);
}

function canDeleteDocumentAttachment(document, attachment) {
  if (isProjectEnded.value) {
    return false;
  }

  const value = attachment?.permissions?.canDelete ?? attachment?.canDelete;
  return typeof value === 'boolean' ? value : documentPermission(document, 'canDeleteAttachment', false);
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

function clearSolutionDesignState() {
  solutionDesignWorkflowLoading.value = false;
  solutionDesignWorkflowErrorMessage.value = '';
  solutionDesignWorkflow.value = null;
  solutionDesignUploadsLoading.value = false;
  solutionDesignUploadsErrorMessage.value = '';
  solutionDesignUploads.value = null;
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

function restoreWorkspaceSelection(stageKey, nodeKey) {
  const stage =
    stageKey === 'solution'
      ? solutionDesignWorkspaceStage.value || (workspace.value?.stages || []).find((item) => item.stageKey === stageKey)
      : (workspace.value?.stages || []).find((item) => item.stageKey === stageKey);
  if (!stage) {
    return false;
  }

  selectedWorkspaceStageKey.value = stage.stageKey;
  selectedWorkspaceNodeKey.value = (stage.nodes || []).some((node) => node.nodeKey === nodeKey) ? nodeKey : '';
  return true;
}

async function refreshProjectWorkspaceState(options = {}) {
  await Promise.all([
    loadChecklist(options),
    loadWorkspace({ preserveSelection: true, ...options }),
    loadSolutionDesignWorkflow(),
    loadSolutionDesignUploads(),
    loadOperationLogs()
  ]);
}

async function refreshProjectDetailOnly() {
  try {
    detail.value = await getProjectDetail(props.projectId, props.authToken);
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  }
}

async function refreshSolutionDesignState() {
  clearActionState();
  clearStageAdvanceState();
  await refreshProjectDetailOnly();
  await refreshProjectWorkspaceState({ preserveSelection: true });
}

async function focusSolutionDesignPanelFromRoute() {
  if (!isSolutionDesignStage.value || !String(props.focusNodeKey || '').trim()) {
    return;
  }

  await nextTick();
  const panelElement = solutionDesignPanelRef.value?.$el || solutionDesignPanelRef.value;
  panelElement?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function syncSolutionWorkspaceFocusNodeFromRoute() {
  if (!isActiveSolutionWorkspaceStage.value || !String(props.focusNodeKey || '').trim()) {
    return false;
  }

  if (manualWorkspaceSelectionRouteKey.value === getWorkspaceRouteKey()) {
    return false;
  }

  const focusedNodeKey = findSolutionDesignWorkflowNodeKey(props.focusNodeKey);
  if (!focusedNodeKey) {
    return false;
  }

  selectedWorkspaceStageKey.value = 'solution';
  selectedWorkspaceNodeKey.value = focusedNodeKey;
  clearOnlineFormState();
  return true;
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
    await refreshProjectWorkspaceState();
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  } finally {
    pendingAction.value = '';
  }
}

async function submitDocument(document) {
  if (isInitiationOnlineFormDocument(document)) {
    actionErrorMessage.value = '请通过在线表单提交或重提该资料。';
    return;
  }

  if (isSolutionDesignDedicatedStageDocument(document)) {
    actionErrorMessage.value = '请通过方案设计专用节点流程处理该资料。';
    return;
  }

  const completionMode = getCompletionMode(document);
  const requiresReview = completionMode === 'approval_required' || completionMode === 'conditional_approval';
  const isSubmitOnlyMode = completionMode === 'submit_only' || completionMode === 'conditional_submit';
  const isRevisionSubmit = Boolean(document.revisionRequired);
  const successText = isRevisionSubmit
    ? requiresReview
      ? '资料项已返工重提，等待资料审核。'
      : isSubmitOnlyMode
        ? '资料项已提交，请继续完成返工。'
        : '资料项已提交。'
    : requiresReview
      ? '资料项已提交资料审核。'
      : '资料项已提交并按完成规则完成。';
  await runDocumentAction(
    document,
    'submit',
    () => markStageDocumentSubmitted(props.projectId, document.id, props.authToken),
    successText,
    () => {
      delete returnReasons[document.id];
    }
  );
}

async function completeRevisionDocument(document) {
  if (isInitiationOnlineFormDocument(document)) {
    actionErrorMessage.value = '该资料返工必须通过在线表单重提完成。';
    return;
  }

  if (isSolutionDesignDedicatedStageDocument(document)) {
    actionErrorMessage.value = '请通过方案设计专用节点流程完成该资料返工。';
    return;
  }

  await runDocumentAction(
    document,
    'complete-revision',
    () => completeStageDocumentRevision(props.projectId, document.id, props.authToken),
    '资料项返工已完成。'
  );
}

async function confirmDocument(document) {
  if (isSolutionDesignDedicatedStageDocument(document)) {
    actionErrorMessage.value = '请通过方案设计专用节点审批该资料。';
    return;
  }

  await runDocumentAction(
    document,
    'confirm',
    () => confirmStageDocument(props.projectId, document.id, props.authToken),
    '资料项已通过资料审核。'
  );
}

async function returnDocument(payload) {
  clearActionState();
  const document = payload?.document || payload;
  if (isSolutionDesignDedicatedStageDocument(document)) {
    actionErrorMessage.value = '请通过方案设计专用节点退回该资料。';
    return;
  }

  const reason = String(returnReasons[document.id] || '').trim();
  const revisionTargetDocumentIds = Array.isArray(payload?.revisionTargetDocumentIds)
    ? payload.revisionTargetDocumentIds
    : [];
  const designChangeTargetDocumentIds = Array.isArray(payload?.designChangeTargetDocumentIds)
    ? payload.designChangeTargetDocumentIds
    : [];

  if (!reason) {
    actionErrorMessage.value = '请填写资料审核退回原因。';
    return;
  }

  if ((document.reworkClass || document.rework_class) === 'a_class' && revisionTargetDocumentIds.length === 0) {
    actionErrorMessage.value = '请至少选择 1 个需返工资料。';
    return;
  }

  if ((document.reworkClass || document.rework_class) === 'c_class' && designChangeTargetDocumentIds.length === 0) {
    actionErrorMessage.value = '请至少选择 1 个设计变更资料。';
    return;
  }

  await runDocumentAction(
    document,
    'return',
    () =>
      returnStageDocument(props.projectId, document.id, reason, props.authToken, {
        revisionTargetDocumentIds,
        designChangeTargetDocumentIds
      }),
    '资料项已退回资料审核。',
    () => {
      delete returnReasons[document.id];
    }
  );
}

async function approveInitiationNode({ document, node, comment }) {
  const successText =
    node.nodeKey === 'general_review'
      ? '总经理审批已通过。'
      : `${node.nodeName || '评价'}已提交。`;
  await runDocumentAction(
    document,
    `initiation-${node.nodeKey}-approve`,
    () =>
      approveInitiationReviewNode(
        props.projectId,
        document.id,
        node.nodeKey,
        comment || '',
        props.authToken
      ),
    successText
  );
}

async function returnInitiationNode({ document, node, returnReason, returnAction = 'return_to_market_research', endReason = '' }) {
  const isProjectEnd = returnAction === 'project_end';
  const reason = String(returnReason || '').trim();
  const normalizedEndReason = String(endReason || '').trim();
  if (!isProjectEnd && !reason) {
    actionErrorMessage.value = node.nodeKey === 'general_review'
      ? '请填写总经理审批不通过意见。'
      : '请填写评价拒绝原因。';
    return;
  }

  if (isProjectEnd && !normalizedEndReason) {
    actionErrorMessage.value = '请填写项目结束原因。';
    return;
  }

  await runDocumentAction(
    document,
    `initiation-${node.nodeKey}-return`,
    () =>
      returnInitiationReviewNode(
        props.projectId,
        document.id,
        node.nodeKey,
        reason,
        props.authToken,
        {
          returnAction,
          endReason: normalizedEndReason
        }
      ),
    isProjectEnd
      ? '项目已结束，后续立项通知、阶段推进和资料操作已停止。'
      : `${node.nodeName || '审批'}已不通过，流程退回项目市场调研，1.1 项目需求表进入返工，1.2 需要重新填写。`
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

async function loadDocumentAttachments(document) {
  const state = getAttachmentState(document.id);
  state.loading = true;
  state.errorMessage = '';

  try {
    if (!canViewDocumentAttachments(document)) {
      state.attachments = [];
      return;
    }

    state.attachments = await listStageDocumentAttachments(props.projectId, document.id, props.authToken);
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    state.attachments = [];
  } finally {
    state.loading = false;
  }
}

async function loadAttachmentsForChecklist() {
  const documents = (checklist.value?.stages || []).flatMap((stage) => stage.documents || []);
  await Promise.all(documents.map((document) => loadDocumentAttachments(document)));
}

async function uploadAttachment({ document, file }) {
  clearActionState();
  const state = getAttachmentState(document.id);

  if (!canUploadDocumentAttachment(document)) {
    state.errorMessage = '当前账号无权上传该资料项附件。';
    actionErrorMessage.value = state.errorMessage;
    return;
  }

  if (!file || file.size <= 0 || file.size > MAX_ATTACHMENT_FILE_SIZE) {
    state.errorMessage = '附件文件无效，请选择 1 字节到 50MB 以内的文件。';
    return;
  }

  state.uploadPending = true;
  state.errorMessage = '';

  try {
    await uploadStageDocumentAttachment(props.projectId, document.id, file, props.authToken);
    actionMessage.value = '资料附件已上传。';
    await refreshProjectWorkspaceState();
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

  if (!canDownloadDocumentAttachment(document, attachment)) {
    state.errorMessage = '当前账号无权下载该资料项附件。';
    actionErrorMessage.value = state.errorMessage;
    return;
  }

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

async function downloadGeneratedFile(output) {
  clearActionState();
  const document = getOutputDocument(output);
  if (!document?.id) {
    actionErrorMessage.value = '关联资料未初始化，无法下载生成文件。';
    return;
  }

  const generatedFile = output?.generatedFile;
  if (!generatedFile?.downloadable) {
    actionErrorMessage.value = '生成文件尚不可下载。';
    return;
  }

  pendingAction.value = actionKey(document.id, 'download-generated-file');

  try {
    const download = await downloadStageDocumentGeneratedFile(props.projectId, document.id, props.authToken);
    const url = URL.createObjectURL(download.blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = download.fileName || generatedFile.downloadableFileName || generatedFile.fileName || 'generated-file';
    globalThis.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  } finally {
    pendingAction.value = '';
  }
}

async function deleteAttachment({ document, attachment }) {
  clearActionState();
  const state = getAttachmentState(document.id);

  if (!canDeleteDocumentAttachment(document, attachment)) {
    state.errorMessage = '当前账号无权删除该资料项附件。';
    actionErrorMessage.value = state.errorMessage;
    return;
  }

  state.deletePendingId = attachment.id;
  state.errorMessage = '';

  try {
    await deleteStageDocumentAttachment(props.projectId, document.id, attachment.id, props.authToken);
    actionMessage.value = '资料附件已删除。';
    await refreshProjectWorkspaceState();
  } catch (error) {
    state.errorMessage = toReadableApiError(error);
    actionErrorMessage.value = state.errorMessage;
  } finally {
    state.deletePendingId = null;
  }
}

function canUseOnlineFormImageField(field) {
  return Boolean(activeOnlineForm.value?.permissions?.canEdit) && field?.type === 'image';
}

function getOnlineFormImageLimit(field) {
  const maxImages = Number(field?.maxImages);
  return Number.isSafeInteger(maxImages) && maxImages > 0 ? maxImages : 3;
}

function getActiveOnlineFormImages(fieldKey) {
  return (Array.isArray(activeOnlineForm.value?.images) ? activeOnlineForm.value.images : []).filter(
    (image) => image.fieldKey === fieldKey
  );
}

function upsertActiveOnlineFormImage(fieldKey, image) {
  if (!activeOnlineForm.value) {
    return;
  }

  const currentImages = Array.isArray(activeOnlineForm.value.images) ? activeOnlineForm.value.images : [];
  activeOnlineForm.value = {
    ...activeOnlineForm.value,
    images: [
      ...currentImages.filter((item) => String(item.id) !== String(image.id)),
      image
    ].sort((left, right) => {
      if (left.fieldKey !== right.fieldKey) {
        return String(left.fieldKey).localeCompare(String(right.fieldKey));
      }
      return String(left.uploadedAt || '').localeCompare(String(right.uploadedAt || '')) || Number(left.id) - Number(right.id);
    })
  };
}

function removeActiveOnlineFormImage(imageId) {
  if (!activeOnlineForm.value) {
    return;
  }

  const currentImages = Array.isArray(activeOnlineForm.value.images) ? activeOnlineForm.value.images : [];
  activeOnlineForm.value = {
    ...activeOnlineForm.value,
    images: currentImages.filter((item) => String(item.id) !== String(imageId))
  };
}

async function uploadOnlineFormImage({ field, file }) {
  clearActionState();
  onlineFormErrorMessage.value = '';

  if (!activeOnlineForm.value?.stageDocumentId || !canUseOnlineFormImageField(field)) {
    onlineFormErrorMessage.value = '当前账号无权上传该在线表单图片。';
    return;
  }

  const limit = getOnlineFormImageLimit(field);
  if (getActiveOnlineFormImages(field.key).length >= limit) {
    onlineFormErrorMessage.value = `该区域最多上传 ${limit} 张图片。`;
    return;
  }

  if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > MAX_ONLINE_FORM_IMAGE_FILE_SIZE) {
    onlineFormErrorMessage.value = '图片文件无效，请选择 10MB 以内的 png/jpg/jpeg 图片。';
    return;
  }

  onlineFormImageState.uploadPendingFieldKey = field.key;

  try {
    const image = await uploadStageDocumentOnlineFormImage(
      props.projectId,
      activeOnlineForm.value.stageDocumentId,
      field.key,
      file,
      props.authToken
    );
    upsertActiveOnlineFormImage(field.key, image);
    actionMessage.value = '在线表单图片已上传。';
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormImageState.uploadPendingFieldKey = '';
  }
}

async function downloadOnlineFormImage({ image }) {
  clearActionState();
  onlineFormErrorMessage.value = '';

  if (!activeOnlineForm.value?.stageDocumentId || !image?.id) {
    onlineFormErrorMessage.value = '图片尚不可下载。';
    return;
  }

  onlineFormImageState.downloadPendingId = image.id;

  try {
    const download = await downloadStageDocumentOnlineFormImage(
      props.projectId,
      activeOnlineForm.value.stageDocumentId,
      image.id,
      props.authToken
    );
    const url = URL.createObjectURL(download.blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = download.fileName || image.originalFileName || 'online-form-image';
    globalThis.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormImageState.downloadPendingId = null;
  }
}

async function deleteOnlineFormImage({ image }) {
  clearActionState();
  onlineFormErrorMessage.value = '';

  if (!activeOnlineForm.value?.stageDocumentId || !image?.id) {
    onlineFormErrorMessage.value = '图片尚不可删除。';
    return;
  }

  onlineFormImageState.deletePendingId = image.id;

  try {
    await deleteStageDocumentOnlineFormImage(
      props.projectId,
      activeOnlineForm.value.stageDocumentId,
      image.id,
      props.authToken
    );
    removeActiveOnlineFormImage(image.id);
    actionMessage.value = '在线表单图片已删除。';
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormImageState.deletePendingId = null;
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

async function loadChecklist(options = {}) {
  checklistLoading.value = true;
  checklistErrorMessage.value = '';
  checklist.value = null;

  try {
    checklist.value = await getProjectStageDocumentChecklist(props.projectId, props.authToken);
    syncResponsibilitySelectionsFromChecklist();
    await loadAttachmentsForChecklist();
    if (workspace.value && props.focusDocumentId) {
      selectWorkspaceTargetFromRoute(options);
    }
  } catch (error) {
    checklistErrorMessage.value = toReadableApiError(error);
  } finally {
    checklistLoading.value = false;
  }
}

async function loadWorkspace(options = {}) {
  const previousStageKey = selectedWorkspaceStageKey.value;
  const previousNodeKey = selectedWorkspaceNodeKey.value;
  workspaceLoading.value = true;
  workspaceErrorMessage.value = '';
  workspace.value = null;
  clearWorkspaceOnlineForm(options);

  try {
    workspace.value = await getProjectWorkspace(props.projectId, props.authToken);
    if (
      options.preserveSelection &&
      !hasWorkspaceRouteFocus() &&
      restoreWorkspaceSelection(previousStageKey, previousNodeKey)
    ) {
      return;
    }

    selectWorkspaceTargetFromRoute(options);
  } catch (error) {
    workspaceErrorMessage.value = toReadableApiError(error);
  } finally {
    workspaceLoading.value = false;
  }
}

async function openOnlineForm(output) {
  if (!output?.documentId) {
    onlineFormErrorMessage.value = '关联资料未初始化，无法打开在线表单。';
    return;
  }

  onlineFormLoading.value = true;
  onlineFormErrorMessage.value = '';

  try {
    const response = await getStageDocumentOnlineForm(props.projectId, output.documentId, props.authToken);
    activeOnlineFormDocumentId.value = output.documentId;
    activeOnlineForm.value = response.form || response;
    syncOnlineFormData(activeOnlineForm.value);
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormLoading.value = false;
  }
}

async function saveOnlineForm() {
  if (!activeOnlineForm.value) {
    return;
  }

  onlineFormSaving.value = true;
  onlineFormErrorMessage.value = '';

  try {
    const response = await saveStageDocumentOnlineForm(
      props.projectId,
      activeOnlineForm.value.stageDocumentId,
      { ...onlineFormData },
      props.authToken
    );
    activeOnlineForm.value = response.form || response;
    syncOnlineFormData(activeOnlineForm.value);
    actionMessage.value = '在线表单草稿已保存。';
    await refreshProjectWorkspaceState({ preserveOnlineFormState: true });
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormSaving.value = false;
  }
}

async function submitOnlineForm() {
  if (!activeOnlineForm.value) {
    return;
  }

  onlineFormSubmitting.value = true;
  onlineFormErrorMessage.value = '';

  try {
    const response = await submitStageDocumentOnlineForm(
      props.projectId,
      activeOnlineForm.value.stageDocumentId,
      { ...onlineFormData },
      props.authToken
    );
    activeOnlineForm.value = response.form;
    syncOnlineFormData(activeOnlineForm.value);
    actionMessage.value = '在线表单已提交。';
    await refreshProjectWorkspaceState({ preserveOnlineFormState: true });
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
  } finally {
    onlineFormSubmitting.value = false;
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
  if (!canViewProjectAudit.value) {
    operationLogsLoading.value = false;
    operationLogsErrorMessage.value = '';
    operationLogs.value = [];
    return;
  }

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

async function loadSolutionDesignWorkflow() {
  if (!isSolutionDesignStage.value) {
    solutionDesignWorkflowLoading.value = false;
    solutionDesignWorkflowErrorMessage.value = '';
    solutionDesignWorkflow.value = null;
    return;
  }

  solutionDesignWorkflowLoading.value = true;
  solutionDesignWorkflowErrorMessage.value = '';

  try {
    solutionDesignWorkflow.value = await getSolutionDesignWorkflow(props.projectId, props.authToken);
  } catch (error) {
    solutionDesignWorkflowErrorMessage.value = toReadableApiError(error);
    solutionDesignWorkflow.value = null;
  } finally {
    solutionDesignWorkflowLoading.value = false;
  }
}

async function loadSolutionDesignUploads() {
  if (!isSolutionDesignStage.value) {
    solutionDesignUploadsLoading.value = false;
    solutionDesignUploadsErrorMessage.value = '';
    solutionDesignUploads.value = null;
    return;
  }

  solutionDesignUploadsLoading.value = true;
  solutionDesignUploadsErrorMessage.value = '';

  try {
    solutionDesignUploads.value = await listSolutionDesignUploads(props.projectId, props.authToken);
  } catch (error) {
    solutionDesignUploadsErrorMessage.value = toReadableApiError(error);
    solutionDesignUploads.value = null;
  } finally {
    solutionDesignUploadsLoading.value = false;
  }
}

async function loadDetail(options = {}) {
  loading.value = true;
  errorMessage.value = '';
  errorCode.value = '';
  detail.value = null;
  checklist.value = null;
  workspace.value = null;
  clearSolutionDesignState();
  checklistErrorMessage.value = '';
  workspaceErrorMessage.value = '';
  operationLogs.value = [];
  operationLogsErrorMessage.value = '';
  responsibilityCandidates.value = [];
  responsibilityCandidatesErrorMessage.value = '';
  clearAttachmentStates();
  clearActionState();
  lastAppliedWorkspaceRouteKey.value = '';
  manualWorkspaceSelectionRouteKey.value = '';
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
    await Promise.all([
      loadChecklist(),
      loadWorkspace(),
      loadSolutionDesignWorkflow(),
      loadSolutionDesignUploads(),
      loadOperationLogs(),
      loadResponsibilityCandidates()
    ]);
  }
}

onMounted(loadDetail);
watch(() => props.projectId, loadDetail);
watch(
  () => [props.taskMode, props.focusDocumentId, props.focusStageId, props.focusNodeKey],
  () => {
    if (workspace.value) {
      selectWorkspaceTargetFromRoute();
    }
    void focusSolutionDesignPanelFromRoute();
  }
);
watch(
  () => [
    isActiveSolutionWorkspaceStage.value,
    props.focusNodeKey,
    solutionDesignWorkflow.value?.projectId,
    solutionDesignWorkflow.value?.nodes?.length
  ],
  () => {
    syncSolutionWorkspaceFocusNodeFromRoute();
    void focusSolutionDesignPanelFromRoute();
  }
);
</script>
