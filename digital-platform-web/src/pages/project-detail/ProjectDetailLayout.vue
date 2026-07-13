<template>
  <section class="project-workspace-screen">

    <section v-if="loading" class="state-panel">
      <p>正在加载项目详情...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--error">
      <h3>{{ notFound ? '项目不存在' : '项目详情加载失败' }}</h3>
      <p>{{ errorMessage }}</p>
      <el-button type="primary" @click="navigate('/projects')">返回项目总览</el-button>
    </section>

    <el-container v-else-if="detail" class="project-workspace-shell">
      <ProjectProcessTree
        v-if="workspace && projectNavigationDisplay && !workspaceLoading && !projectNavigationLoading"
        :navigation="projectNavigationDisplay"
        :selected-stage-key="selectedWorkspaceStageKey"
        :selected-node-key="selectedWorkspaceNodeKey"
        @select-node="selectWorkspaceNodeFromNavigation"
      />

      <el-main class="project-workspace-main">
        <section v-if="workspaceLoading" class="state-panel state-panel--inline">
          <p>正在加载项目工作区...</p>
        </section>
        <section v-else-if="workspaceErrorMessage" class="state-panel state-panel--inline state-panel--error">
          <p>{{ workspaceErrorMessage }}</p>
        </section>
        <section v-else-if="projectNavigationErrorMessage" class="state-panel state-panel--inline state-panel--error">
          <p>{{ projectNavigationErrorMessage }}</p>
        </section>
        <section v-else-if="projectNavigationLoading" class="state-panel state-panel--inline">
          <p>正在加载项目流程导航...</p>
        </section>
        <template v-else-if="workspace">
          <el-card class="project-node-card" shadow="never">

            <NodePageRouter
              ref="nodePageRouterRef"
              :project-id="projectId"
              :auth-token="authToken"
              :current-user="currentUser"
              :project="detail.project"
              :workspace="workspace"
              :stage="activeWorkspaceStage"
              :node="activeWorkspaceNode"
              :node-code="selectedWorkspaceNodeKey"
              :node-page-context="nodePageContext"
              @business-state-changed="handleBusinessStateChanged"
            />
          </el-card>

        </template>
      </el-main>
    </el-container>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  approveInitiationReviewNode,
  confirmStageDocument,
  completeStageDocumentRevision,
  deleteStageDocumentAttachment,
  deleteStageDocumentOnlineFormImage,
  downloadStageDocumentAttachment,
  downloadStageDocumentGeneratedFile,
  downloadStageDocumentOnlineFormImage,
  generateStageDocumentOnlineFormFile,
  getProjectDetail,
  // getProjectStageDocumentChecklist 保留为工作区文档数据源：
  // 节点专属页面通过 getOutputDocument 查找文档详情
  // （permissions、completionStatus 等），这些数据仅由 checklist API 提供，
  // workspace API 不包含完整文档详情。删除其 UI 渲染，保留数据调用。
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
} from '../../api/projects.js';
import { getProjectNavigation } from '../../api/navigation.js';
import { listResponsibilityCandidates } from '../../api/users.js';
import NodePageRouter from '../project-node/project-approval/NodePageRouter.vue';
import ProjectProcessTree from '../../components/project-workspace/ProjectProcessTree.vue';
import {
  actionKey,
  getCompletionMode,
  getSelectedResponsibleUserId,
  isInitiationOnlineFormDocument
} from '../../components/project-detail/stageDocumentViewHelpers.js';

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

/* ── 页面加载状态 ── */
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);
const errorCode = ref('');

/* ── 文档数据源（原 checklist，现仅供工作区内部查找文档详情） ── */
const checklist = ref(null);

/* ── 工作区状态 ── */
const workspaceLoading = ref(false);
const workspaceErrorMessage = ref('');
const workspace = ref(null);
const projectNavigationLoading = ref(false);
const projectNavigationErrorMessage = ref('');
const projectNavigation = ref(null);
const solutionDesignWorkflowLoading = ref(false);
const solutionDesignWorkflowErrorMessage = ref('');
const solutionDesignWorkflow = ref(null);
const solutionDesignUploadsLoading = ref(false);
const solutionDesignUploadsErrorMessage = ref('');
const solutionDesignUploads = ref(null);
const nodePageRouterRef = ref(null);
const selectedWorkspaceStageKey = ref('');
const selectedWorkspaceNodeKey = ref('');
const lastAppliedWorkspaceRouteKey = ref('');
const manualWorkspaceSelectionRouteKey = ref('');

/* ── 在线表单状态 ── */
const activeOnlineFormDocumentId = ref(null);
const activeOnlineForm = ref(null);
const onlineFormData = reactive({});
const onlineFormLoading = ref(false);
const onlineFormSaving = ref(false);
const onlineFormSubmitting = ref(false);
const onlineFormDownloadPendingDocumentId = ref(null);
const onlineFormErrorMessage = ref('');

/* ── 责任人候选人状态 ── */
const responsibilityCandidatesLoading = ref(false);
const responsibilityCandidatesErrorMessage = ref('');
const responsibilityCandidates = ref([]);

/* ── 工作区操作消息状态 ── */
const actionMessage = ref('');
const actionErrorMessage = ref('');
watch(actionMessage, (value) => { if (value) ElMessage.success(value); });
watch(actionErrorMessage, (value) => { if (value) ElMessage.error(value); });
const pendingAction = ref('');

/* ── 文档操作临时状态 ── */
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
const solutionDesignWorkflowNodeKeys = new Set([
  'solution_preparation',
  'solution_analysis',
  'solution_design',
  'internal_solution_review',
  'customer_solution_review',
  'rd_cost_estimation',
  'manufacturing_cost_estimation',
  'finance_cost_estimation',
  'quotation_or_tender'
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

/* ── 计算属性 ── */
const notFound = computed(() => errorCode.value === 'PROJECT_NOT_FOUND');
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
const standardStageOrderByKey = Object.freeze({
  initiation: 1,
  solution: 2,
  contract: 3,
  detailedDesign: 4,
  manufacturing: 5,
  preAcceptance: 6,
  finalAcceptance: 7,
  closeout: 8
});

function getStageOrderValue(stage) {
  const value = Number(stage?.stageOrder ?? stage?.stage_order ?? stage?.order);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return standardStageOrderByKey[stage?.stageKey] || 0;
}

const solutionDesignDetailStage = computed(
  () => (detail.value?.stages || []).find((stage) => stage.stageKey === 'solution') || null
);
const isCurrentSolutionDesignStage = computed(() => currentDetailStage.value?.stageKey === 'solution');
const hasReachedSolutionDesignStage = computed(() => {
  if (isCurrentSolutionDesignStage.value) {
    return true;
  }

  const solutionStage = solutionDesignDetailStage.value;
  if (!solutionStage) {
    return false;
  }

  if (
    solutionStage.isCurrent ||
    solutionStage.isCompleted ||
    ['completed', 'done'].includes(String(solutionStage.stageStatus || solutionStage.status || '').toLowerCase())
  ) {
    return true;
  }

  const currentStageOrder = getStageOrderValue(currentDetailStage.value);
  const solutionStageOrder = getStageOrderValue(solutionStage) || standardStageOrderByKey.solution;
  if (currentStageOrder && solutionStageOrder) {
    return currentStageOrder >= solutionStageOrder;
  }

  const stages = detail.value?.stages || [];
  const solutionIndex = stages.findIndex((stage) => stage.stageKey === 'solution');
  const currentIndex = stages.findIndex((stage) => stage.stageKey === currentDetailStage.value?.stageKey);
  return solutionIndex >= 0 && currentIndex >= solutionIndex;
});
const isSelectedSolutionDesignWorkspaceStage = computed(() => selectedWorkspaceStageKey.value === 'solution');

const currentUserOrganizationRole = computed(() => props.currentUser?.organizationRole || '');
const isCurrentUserProjectManager = computed(() => {
  const projectManagerUserId = detail.value?.project?.projectManagerUserId;
  return Boolean(projectManagerUserId) && String(projectManagerUserId) === String(props.currentUser?.id);
});
const isCurrentUserGeneralManager = computed(() => currentUserOrganizationRole.value === 'general_manager');
const isCurrentUserCenterManager = computed(() => currentUserOrganizationRole.value === 'center_manager');
const currentUserDepartment = computed(() => props.currentUser?.department || '');

// 保留：工作区产出面板通过 getOutputDocument 查找文档详情
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
  if (!hasReachedSolutionDesignStage.value || !solutionDesignWorkspaceStage.value) {
    return stages;
  }

  return stages.map((stage) => (stage.stageKey === 'solution' ? solutionDesignWorkspaceStage.value : stage));
});
const projectNavigationDisplay = computed(() => {
  const navigation = projectNavigation.value;
  if (!navigation || !hasReachedSolutionDesignStage.value || !solutionDesignWorkspaceStage.value) {
    return navigation;
  }

  const children = (navigation.children || []).map((stage) => {
    if (stage.stageKey !== 'solution') {
      return stage;
    }

    const solutionChildren = (solutionDesignWorkspaceStage.value.nodes || []).map((node) => ({
      name: node.nodeName,
      nodeCode: node.nodeKey,
      nodeKey: node.nodeKey,
      status: mapSolutionDesignNavigationStatus(node.solutionDesignNode?.status),
      route: `/projects/${props.projectId}/node/${node.nodeKey}`,
      outputCount: Array.isArray(node.outputs) ? node.outputs.length : 0,
      actionHints: node.solutionDesignNode?.actionHints || [],
      blockingReasons: node.solutionDesignNode?.blockingReasons || [],
      notes: node.solutionDesignNode?.notes || ''
    }));

    return {
      ...stage,
      stageName: solutionDesignWorkspaceStage.value.stageName || stage.stageName,
      name: stage.name || solutionDesignWorkspaceStage.value.stageName || '方案设计阶段',
      configured: true,
      children: solutionChildren,
      status: deriveNavigationStageStatus(stage, solutionChildren)
    };
  });

  return {
    ...navigation,
    children,
    progress: calculateNavigationProgress(children)
  };
});
const activeWorkspaceDisplayStage = computed(() => {
  if (
    hasReachedSolutionDesignStage.value &&
    isSelectedSolutionDesignWorkspaceStage.value &&
    solutionDesignWorkspaceStage.value
  ) {
    return solutionDesignWorkspaceStage.value;
  }

  return activeWorkspaceStage.value;
});
const isActiveSolutionWorkspaceStage = computed(
  () =>
    hasReachedSolutionDesignStage.value &&
    isSelectedSolutionDesignWorkspaceStage.value &&
    activeWorkspaceDisplayStage.value?.stageKey === 'solution' &&
    Boolean(solutionDesignWorkspaceStage.value)
);
const activeWorkspaceNode = computed(
  () => (activeWorkspaceDisplayStage.value?.nodes || []).find((node) => node.nodeKey === selectedWorkspaceNodeKey.value) || null
);
const activeNavigationStage = computed(
  () =>
    (projectNavigationDisplay.value?.children || []).find((stage) => stage.stageKey === selectedWorkspaceStageKey.value) ||
    null
);
const activeNavigationNode = computed(
  () => (activeNavigationStage.value?.children || []).find((node) => node.nodeCode === selectedWorkspaceNodeKey.value) || null
);
const currentNavigationStatus = computed(
  () => activeNavigationNode.value?.status || activeNavigationStage.value?.status || projectNavigation.value?.projectStatus || ''
);
const currentNavigationStatusLabel = computed(() => formatNavigationStatus(currentNavigationStatus.value));
const currentNavigationStatusTagType = computed(() => navigationStatusTagType(currentNavigationStatus.value));

const visibleResponsibilityCandidates = computed(() => {
  if (!isCurrentUserCenterManager.value || isCurrentUserProjectManager.value || isCurrentUserGeneralManager.value) {
    return responsibilityCandidates.value;
  }

  return responsibilityCandidates.value.filter((candidate) => candidate.department === currentUserDepartment.value);
});

const nodePageContext = computed(() => ({
  activeOnlineForm: activeOnlineForm.value,
  activeOnlineFormDocumentId: activeOnlineFormDocumentId.value,
  onlineFormData,
  onlineFormLoading: onlineFormLoading.value,
  onlineFormSaving: onlineFormSaving.value,
  onlineFormSubmitting: onlineFormSubmitting.value,
  onlineFormDownloadPendingDocumentId: onlineFormDownloadPendingDocumentId.value,
  onlineFormErrorMessage: onlineFormErrorMessage.value,
  onlineFormImageState,
  responsibilityCandidates: visibleResponsibilityCandidates.value,
  responsibilityCandidatesLoading: responsibilityCandidatesLoading.value,
  responsibilityCandidatesErrorMessage: responsibilityCandidatesErrorMessage.value,
  // 方案设计角色分配沿用拆分前的完整候选列表；不能复用其他节点的部门过滤视图。
  solutionDesignResponsibilityCandidates: responsibilityCandidates.value,
  solutionDesignWorkflow: solutionDesignWorkflow.value,
  solutionDesignUploads: solutionDesignUploads.value,
  solutionDesignLoading: solutionDesignWorkflowLoading.value || solutionDesignUploadsLoading.value,
  solutionDesignErrorMessage: solutionDesignWorkflowErrorMessage.value || solutionDesignUploadsErrorMessage.value,
  responsibilitySelections,
  returnReasons,
  notApplicableReasons,
  getOutputDocument,
  getAttachmentState,
  isActionPending,
  canSubmitDocument,
  canConfirmReturnDocument,
  canManageResponsibility,
  canChangeApplicability,
  openOnlineForm,
  saveOnlineForm,
  submitOnlineForm,
  updateOnlineFormField,
  approveInitiationNode,
  returnInitiationNode,
  submitDocument,
  confirmDocument,
  returnDocument,
  completeRevisionDocument,
  markNotApplicable,
  restoreApplicable,
  saveResponsibleUser,
  clearResponsibleUser,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  uploadOnlineFormImage,
  downloadOnlineFormImage,
  deleteOnlineFormImage,
  downloadOnlineFormFile,
  downloadGeneratedFile,
  refreshSolutionDesignState,
  handleBusinessStateChanged
}));
/* ── 导航状态格式化 ── */
function formatNavigationStatus(status) {
  return {
    PENDING: '未开始',
    PROCESSING: '进行中',
    COMPLETED: '已完成',
    WAIT_APPROVAL: '待审核',
    RETURNED: '退回整改',
    FAILED: '异常'
  }[status] || status || '-';
}

function navigationStatusTagType(status) {
  return {
    PROCESSING: 'success',
    COMPLETED: 'success',
    WAIT_APPROVAL: 'warning',
    RETURNED: 'danger',
    FAILED: 'danger',
    PENDING: 'info'
  }[status] || 'info';
}

function mapSolutionDesignWorkspaceStatus(status) {
  return {
    not_started: 'process_node',
    pending: 'in_progress',
    pending_review: 'pending_review',
    pending_general_review: 'pending_review',
    returned: 'returned_for_rework',
    approved: 'completed',
    skipped: 'not_applicable',
    ended: 'completed'
  }[status] || 'process_node';
}

function mapSolutionDesignNavigationStatus(status) {
  return {
    not_started: 'PENDING',
    pending: 'PROCESSING',
    pending_review: 'WAIT_APPROVAL',
    pending_general_review: 'WAIT_APPROVAL',
    returned: 'RETURNED',
    approved: 'COMPLETED',
    skipped: 'COMPLETED',
    ended: 'COMPLETED'
  }[status] || 'PENDING';
}

function deriveNavigationStageStatus(stage, children) {
  const statuses = children.map((child) => child.status);
  if (statuses.length === 0) {
    return stage.status || 'PENDING';
  }

  if (statuses.every((status) => status === 'COMPLETED')) {
    return 'COMPLETED';
  }

  if (statuses.some((status) => status === 'FAILED')) {
    return 'FAILED';
  }

  if (statuses.some((status) => status === 'RETURNED')) {
    return 'RETURNED';
  }

  if (statuses.some((status) => status === 'WAIT_APPROVAL')) {
    return 'WAIT_APPROVAL';
  }

  if (stage.isCurrent || statuses.some((status) => status === 'PROCESSING')) {
    return 'PROCESSING';
  }

  return 'PENDING';
}

function calculateNavigationProgress(stages) {
  const nodes = stages.flatMap((stage) => stage.children || []);
  if (nodes.length === 0) {
    return projectNavigation.value?.progress ?? 0;
  }

  const completedNodes = nodes.filter((node) => node.status === 'COMPLETED').length;
  return Math.round((completedNodes / nodes.length) * 100);
}

/* ── 文档权限判断 ── */
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

function findSolutionDesignWorkflowNodeKey(nodeKey) {
  const normalized = String(nodeKey || '').trim();
  if (!normalized) {
    return '';
  }

  if ((solutionDesignWorkflow.value?.nodes || []).some((node) => node.nodeKey === normalized)) {
    return normalized;
  }

  return hasReachedSolutionDesignStage.value && solutionDesignWorkflowNodeKeys.has(normalized) ? normalized : '';
}

function isSolutionDesignDedicatedStageDocument(document) {
  const documentCode = String(document?.documentCode || document?.code || '').trim();
  return hasReachedSolutionDesignStage.value && solutionDesignDedicatedDocumentCodes.has(documentCode);
}

function getDocumentPermissions(document) {
  return document?.permissions || {};
}

function documentPermission(document, key, fallback) {
  const value = getDocumentPermissions(document)[key] ?? document?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function canConfirmReturnDocument(document) {
  return !isProjectEnded.value && documentPermission(document, 'canReviewDocument', false);
}

function canManageResponsibility(document) {
  return !isProjectEnded.value && documentPermission(document, 'canManageResponsibility', false);
}

function canSubmitDocument(document) {
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

/* ── 在阶段内查找活跃节点（阶段是导航目录，不需要独立页面） ── */
function findActiveNodeInStage(stage) {
  const nodes = stage.nodes || [];
  // 优先处理真实待办状态，过程节点仅作为兜底，避免阶段切换后默认落到说明性节点。
  const priorityStatuses = [
    'returned_for_rework',
    'blocked_by_rework',
    'pending_review',
    'in_progress',
    'waiting_submission'
  ];
  const activeNode = nodes.find((node) => priorityStatuses.includes(node.nodeStatus));
  const incompleteNode = nodes.find(
    (node) => !['completed', 'not_applicable', 'process_node'].includes(node.nodeStatus)
  );
  const processNode = nodes.find((node) => node.nodeStatus === 'process_node');
  return activeNode || incompleteNode || processNode || nodes[nodes.length - 1] || null;
}

/* ── 工作区节点选择（阶段是导航目录，只有节点才驱动内容更新） ── */
function selectWorkspaceNode(stage, node) {
  if (!stage || !node) {
    return;
  }

  manualWorkspaceSelectionRouteKey.value = getWorkspaceRouteKey();
  selectedWorkspaceStageKey.value = stage.stageKey;
  selectedWorkspaceNodeKey.value = node.nodeKey;
  clearOnlineFormState();
  props.navigate(`/projects/${props.projectId}/node/${node.nodeKey}`);
}

function selectWorkspaceNodeFromNavigation({ stage, node }) {
  if (hasReachedSolutionDesignStage.value && stage?.stageKey === 'solution' && solutionDesignWorkspaceStage.value) {
    const solutionNode = (solutionDesignWorkspaceStage.value.nodes || []).find((item) => item.nodeKey === node.nodeCode);
    if (solutionNode) {
      selectWorkspaceNode(solutionDesignWorkspaceStage.value, solutionNode);
    }
    return;
  }

  const workspaceStage = (workspace.value?.stages || []).find((item) => item.stageKey === stage.stageKey);
  const workspaceNode = (workspaceStage?.nodes || []).find((item) => item.nodeKey === node.nodeCode);
  if (!workspaceStage) {
    return;
  }

  if (workspaceNode) {
    selectWorkspaceNode(workspaceStage, workspaceNode);
  } else {
    /* 导航有节点但工作区数据缺失——回退到该阶段第一个活跃节点 */
    const fallbackNode = findActiveNodeInStage(workspaceStage);
    if (fallbackNode) {
      selectWorkspaceNode(workspaceStage, fallbackNode);
    }
  }
}

function selectCurrentWorkspaceNode() {
  /* 打开项目详情时自动跳转到当前阶段和当前节点：
   * 1. 用项目的 currentStage（而非硬编码 initiation）作为默认阶段
   * 2. 在该阶段内找第一个「非完成」节点作为活跃节点（阶段只是目录，不停留）
   * 3. 更新 URL hash 以便刷新后仍定位到同一节点 */
  const currentStageKey = currentDetailStage.value?.stageKey;
  const stages = workspaceDisplayStages.value || [];

  const targetStage = currentStageKey
    ? stages.find((stage) => stage.stageKey === currentStageKey)
    : stages[0] || null;

  if (!targetStage) {
    selectedWorkspaceStageKey.value = '';
    selectedWorkspaceNodeKey.value = '';
    return;
  }

  selectedWorkspaceStageKey.value = targetStage.stageKey;

  const targetNode = findActiveNodeInStage(targetStage);
  if (targetNode) {
    selectedWorkspaceNodeKey.value = targetNode.nodeKey;
    props.navigate(`/projects/${props.projectId}/node/${targetNode.nodeKey}`);
  } else {
    selectedWorkspaceNodeKey.value = '';
  }
}

function restoreWorkspaceSelection(stageKey, nodeKey) {
  const stage = (workspaceDisplayStages.value || []).find((item) => item.stageKey === stageKey);
  if (!stage) {
    return false;
  }

  selectedWorkspaceStageKey.value = stage.stageKey;
  selectedWorkspaceNodeKey.value = (stage.nodes || []).some((node) => node.nodeKey === nodeKey) ? nodeKey : '';
  return true;
}

function restoreWorkspaceSelectionByNodeKey(nodeKey) {
  for (const stage of workspaceDisplayStages.value || []) {
    if ((stage.nodes || []).some((node) => node.nodeKey === nodeKey)) {
      selectedWorkspaceStageKey.value = stage.stageKey;
      selectedWorkspaceNodeKey.value = nodeKey;
      return true;
    }
  }

  return false;
}

/* ── 工作区路由定位 ── */
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

  if (options.forceCurrentStageSelection) {
    selectCurrentWorkspaceNode();
    clearWorkspaceOnlineForm(options);
    return true;
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

  const nodeKey = String(props.focusNodeKey || '').trim();
  const solutionFocusedNodeKey = findSolutionDesignWorkflowNodeKey(nodeKey);
  if (solutionFocusedNodeKey) {
    selectedWorkspaceStageKey.value = 'solution';
    selectedWorkspaceNodeKey.value = solutionFocusedNodeKey;
    clearWorkspaceOnlineForm(options);
    markWorkspaceRouteApplied(routeKey);
    return true;
  }

  if (nodeKey && restoreWorkspaceSelectionByNodeKey(nodeKey)) {
    clearWorkspaceOnlineForm(options);
    markWorkspaceRouteApplied(routeKey);
    return true;
  }

  if (props.focusDocumentId) {
    selectCurrentWorkspaceNode();
    clearWorkspaceOnlineForm(options);
    return false;
  }

  selectCurrentWorkspaceNode();
  clearWorkspaceOnlineForm(options);
  markWorkspaceRouteApplied(routeKey);
  return true;
}

/* ── 在线表单 ── */
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

async function reloadActiveOnlineForm() {
  const documentId = activeOnlineForm.value?.stageDocumentId || activeOnlineFormDocumentId.value;
  if (!documentId) {
    return;
  }

  const response = await getStageDocumentOnlineForm(props.projectId, documentId, props.authToken);
  activeOnlineFormDocumentId.value = documentId;
  activeOnlineForm.value = response.form || response;
  syncOnlineFormData(activeOnlineForm.value);
}

/* ── 附件状态 ── */
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

/* ── 操作消息清理 ── */
function clearActionState() {
  actionMessage.value = '';
  actionErrorMessage.value = '';
}

/* ── 责任人选择同步 ── */
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

/* ── 通用文档操作 ── */
async function refreshProjectWorkspaceState(options = {}) {
  const previousStageKey = currentDetailStage.value?.stageKey || '';
  await refreshProjectDetailOnly();
  const stageChanged = previousStageKey && currentDetailStage.value?.stageKey !== previousStageKey;
  if (stageChanged) {
    manualWorkspaceSelectionRouteKey.value = '';
    lastAppliedWorkspaceRouteKey.value = '';
  }

  const workspaceOptions = {
    ...options,
    forceCurrentStageSelection: stageChanged || options.forceCurrentStageSelection === true,
    preserveSelection: options.preserveSelection !== false && !stageChanged
  };

  await Promise.all([
    loadChecklist(workspaceOptions),
    loadWorkspace(workspaceOptions),
    loadProjectNavigation(),
    loadSolutionDesignWorkflow(),
    loadSolutionDesignUploads()
  ]);

  ensureSolutionDesignWorkspaceSelection(workspaceOptions);

  if (options.preserveOnlineFormState && activeOnlineFormDocumentId.value) {
    await reloadActiveOnlineForm();
  }
}

async function handleBusinessStateChanged(payload = {}) {
  const shouldClearCurrentDetail = payload.clearCurrentDetail === true;
  const shouldRefreshCurrentDetail = payload.refreshCurrentDetail === true && !shouldClearCurrentDetail;

  if (shouldClearCurrentDetail) {
    clearOnlineFormState();
  }

  await refreshProjectWorkspaceState({
    preserveOnlineFormState: shouldRefreshCurrentDetail
  });
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
  await refreshProjectWorkspaceState({ preserveSelection: true });
}

async function focusSolutionDesignPanelFromRoute() {
  if (!isActiveSolutionWorkspaceStage.value || !String(props.focusNodeKey || '').trim()) {
    return;
  }

  await nextTick();
  const nodePageElement = nodePageRouterRef.value?.$el || nodePageRouterRef.value;
  nodePageElement?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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

function ensureSolutionDesignWorkspaceSelection(options = {}) {
  if (!hasReachedSolutionDesignStage.value || !workspace.value || !solutionDesignWorkflow.value) {
    return;
  }

  if (options.forceCurrentStageSelection) {
    selectWorkspaceTargetFromRoute(options);
    return;
  }

  if (
    options.preserveSelection &&
    selectedWorkspaceStageKey.value === 'solution' &&
    findSolutionDesignWorkflowNodeKey(selectedWorkspaceNodeKey.value)
  ) {
    return;
  }

  const focusedNodeKey = findSolutionDesignWorkflowNodeKey(props.focusNodeKey);
  if (focusedNodeKey) {
    selectedWorkspaceStageKey.value = 'solution';
    selectedWorkspaceNodeKey.value = focusedNodeKey;
    clearWorkspaceOnlineForm(options);
    return;
  }

  selectWorkspaceTargetFromRoute(options);
}

async function runDocumentAction(document, action, runner, successText, onSuccess = null) {
  clearActionState();
  pendingAction.value = actionKey(document.id, action);

  try {
    await runner();
    if (onSuccess) {
      onSuccess();
    }
    actionMessage.value = successText;
    await refreshProjectWorkspaceState();
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  } finally {
    pendingAction.value = '';
  }
}

/* ── 文档提交 / 确认 / 退回 / 返工完成 ── */
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

/* ── 立项审批 ── */
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

/* ── 不适用标记 ── */
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

/* ── 责任人 ── */
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

/* ── 附件 ── */
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

async function loadAttachmentsForAllDocuments() {
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

async function downloadOnlineFormFile(output) {
  clearActionState();
  const document = getOutputDocument(output);
  const documentId = document?.id || output?.documentId || activeOnlineForm.value?.stageDocumentId;

  if (!documentId) {
    onlineFormErrorMessage.value = '关联资料尚未初始化，无法下载在线表单。';
    actionErrorMessage.value = onlineFormErrorMessage.value;
    return;
  }

  onlineFormDownloadPendingDocumentId.value = documentId;
  pendingAction.value = actionKey(documentId, 'download-online-form-file');
  onlineFormErrorMessage.value = '';

  try {
    await generateStageDocumentOnlineFormFile(props.projectId, documentId, props.authToken);
    const download = await downloadStageDocumentGeneratedFile(props.projectId, documentId, props.authToken);
    const url = URL.createObjectURL(download.blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download =
      download.fileName ||
      output?.generatedFile?.downloadableFileName ||
      output?.generatedFile?.fileName ||
      `${activeOnlineForm.value?.documentName || document?.documentName || 'online-form'}`;
    globalThis.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    actionMessage.value = '在线表单文件已生成并开始下载。';
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
    actionErrorMessage.value = onlineFormErrorMessage.value;
    onlineFormDownloadPendingDocumentId.value = null;
    pendingAction.value = '';
    return;
  } finally {
    onlineFormDownloadPendingDocumentId.value = null;
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

/* ── 在线表单图片 ── */
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

/* ── 数据加载 ── */
async function loadChecklist(options = {}) {
  checklist.value = null;

  try {
    checklist.value = await getProjectStageDocumentChecklist(props.projectId, props.authToken);
    syncResponsibilitySelectionsFromChecklist();
    await loadAttachmentsForAllDocuments();
    if (workspace.value && props.focusDocumentId) {
      selectWorkspaceTargetFromRoute(options);
    }
  } catch {
    checklist.value = null;
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

async function loadProjectNavigation() {
  projectNavigationLoading.value = true;
  projectNavigationErrorMessage.value = '';
  projectNavigation.value = null;

  try {
    projectNavigation.value = await getProjectNavigation(props.projectId, props.authToken);
  } catch (error) {
    projectNavigationErrorMessage.value = toReadableApiError(error);
  } finally {
    projectNavigationLoading.value = false;
  }
}

async function loadSolutionDesignWorkflow() {
  if (!hasReachedSolutionDesignStage.value) {
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
  if (!hasReachedSolutionDesignStage.value) {
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

async function saveOnlineForm(options = {}) {
  if (!activeOnlineForm.value) {
    return false;
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
    if (options.showMessage !== false) {
      actionMessage.value = '在线表单草稿已保存。';
    }
    if (options.refreshWorkspace !== false) {
      await refreshProjectWorkspaceState({ preserveOnlineFormState: true });
    }
    return true;
  } catch (error) {
    onlineFormErrorMessage.value = toReadableApiError(error);
    return false;
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
    activeOnlineForm.value = response.form || response;
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

/* ── 页面初始化 ── */
async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';
  errorCode.value = '';
  detail.value = null;
  checklist.value = null;
  workspace.value = null;
  projectNavigation.value = null;
  solutionDesignWorkflow.value = null;
  solutionDesignUploads.value = null;
  workspaceErrorMessage.value = '';
  projectNavigationErrorMessage.value = '';
  solutionDesignWorkflowErrorMessage.value = '';
  solutionDesignUploadsErrorMessage.value = '';
  responsibilityCandidates.value = [];
  responsibilityCandidatesErrorMessage.value = '';
  clearAttachmentStates();
  clearActionState();
  lastAppliedWorkspaceRouteKey.value = '';
  manualWorkspaceSelectionRouteKey.value = '';

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
      loadProjectNavigation(),
      loadSolutionDesignWorkflow(),
      loadSolutionDesignUploads(),
      loadResponsibilityCandidates()
    ]);
    ensureSolutionDesignWorkspaceSelection();
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
