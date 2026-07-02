<template>
  <div class="detail-shell animate-fadeIn">
    <!-- 左侧导航栏（对齐 App.vue 风格） -->
    <aside class="detail-sidebar">
      <div class="detail-sidebar-heading">
        <span class="section-eyebrow">项目工作区</span>
        <h3 class="detail-sidebar-title">{{ projectName }}</h3>
      </div>
      <nav class="detail-sidebar-nav">
        <div
          v-for="stage in workspaceStages"
          :key="stage.stageKey"
          class="detail-nav-group"
          :class="{ 'detail-nav-group--current': stage.isCurrent }"
        >
          <button
            class="detail-nav-header"
            :class="{ 'is-active': expandedStageKey === stage.stageKey }"
            @click="toggleStage(stage.stageKey)"
          >
            <span class="detail-nav-header-left">
              <span class="detail-nav-stage-order">{{ String(stage.stageOrder).padStart(2, '0') }}</span>
              <span class="detail-nav-stage-name">{{ stage.stageName }}</span>
              <span v-if="stage.isCurrent" class="detail-nav-current-tag">当前</span>
            </span>
            <svg
              class="detail-nav-chevron"
              :class="{ 'is-rotated': expandedStageKey === stage.stageKey }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div
            class="detail-nav-children"
            :class="{ 'is-open': expandedStageKey === stage.stageKey }"
          >
            <div class="detail-nav-children-inner">
              <button
                v-for="node in stage.nodes"
                :key="node.nodeKey"
                class="detail-nav-child-item"
                :class="{ active: activeNodeKey === node.nodeKey }"
                @click="navigateToNode(stage, node)"
              >
                <span class="detail-nav-child-label">{{ node.nodeOrder }} {{ node.nodeName }}</span>
                <span
                  v-if="node.status"
                  class="detail-nav-child-badge"
                  :class="`detail-nav-child-badge--${nodeStatusClass(node.status)}`"
                >{{ nodeStatusLabel(node.status) }}</span>
              </button>
              <div v-if="!stage.nodes || stage.nodes.length === 0" class="detail-nav-placeholder">
                <p>暂无节点配置</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <div class="detail-main">
      <section v-if="loading" class="state-panel">
        <p>正在加载项目详情...</p>
      </section>

      <section v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>{{ notFound ? '项目不存在' : '项目详情加载失败' }}</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="navigate('/projects')">返回项目总览</button>
      </section>

      <template v-else-if="detail">
        <!-- 项目信息面板（始终显示） -->
        <section class="panel project-info-panel">
          <div class="panel-heading">
            <div>
              <span class="section-eyebrow">项目信息</span>
              <h3>{{ detail.project.projectName }}</h3>
              <p>项目编号：{{ detail.project.projectCode || '未填写' }} ｜ 当前阶段：{{ currentStageTitle }} ｜ 状态：{{ detail.project.status }}</p>
            </div>
          </div>
        </section>

        <!-- ===== 动态组件：根据 view 自动切换子页面 ===== -->
        <component
          :is="currentPageComponent"
          v-bind="currentPageProps"
          @open-legacy-checklist="scrollToStageDocumentChecklist"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { getProjectDetail, getProjectWorkspace, toReadableApiError } from '../api/projects.js';
import MarketResearch from './project-detail/MarketResearch.vue';
import ProjectInput from './project-detail/ProjectInput.vue';
import NodePlaceholder from './project-detail/NodePlaceholder.vue';
import DefaultPlaceholder from './project-detail/DefaultPlaceholder.vue';

const props = defineProps({
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  projectId: { type: String, required: true },
  view: { type: String, default: '' },
  routeParams: { type: Object, default: () => ({}) },
  taskMode: { type: String, default: '' },
  focusDocumentId: { type: String, default: '' },
  focusStageId: { type: String, default: '' },
  focusNodeKey: { type: String, default: '' },
  navigate: { type: Function, required: true }
});

// ---- 数据状态 ----
const loading = ref(false);
const errorMessage = ref('');
const errorCode = ref('');
const detail = ref(null);
const workspace = ref(null);

// ---- 导航状态 ----
const expandedStageKey = ref(null);
const onlineFormData = reactive({});
const responsibilitySelections = reactive({});

// ---- 计算属性 ----
const notFound = computed(() => errorCode.value === 'PROJECT_NOT_FOUND');
const projectName = computed(() => detail.value?.project?.projectName || '项目详情');
const currentStageTitle = computed(() => {
  if (detail.value?.currentStage) return detail.value.currentStage.stageName;
  return detail.value?.project?.status === 'completed' ? '项目已完成' : '-';
});

const workspaceStages = computed(() => {
  if (!workspace.value?.stages) return [];
  return workspace.value.stages.map(stage => ({
    ...stage,
    isCurrent: detail.value?.currentStage?.stageKey === stage.stageKey
  }));
});

// 当前 URL 中的 view 参数（即 nodeKey）
const currentView = computed(() => props.view || '');

// 高亮节点
const activeNodeKey = computed(() => currentView.value || null);

// 当前 view 对应的 stage + node
const currentViewNode = computed(() => {
  if (!currentView.value || !workspace.value?.stages) return null;
  for (const stage of workspace.value.stages) {
    const node = stage.nodes?.find(n => n.nodeKey === currentView.value);
    if (node) return { stage, node };
  }
  return null;
});

// --- 动态组件映射：根据 view 自动选择子页面组件 ---
const currentPageComponent = computed(() => {
  if (currentView.value === 'market_research' && currentViewNode.value) return MarketResearch;
  if (currentViewNode.value?.node?.projectInput) return ProjectInput;
  if (currentView.value) return NodePlaceholder;
  return DefaultPlaceholder;
});

const currentPageProps = computed(() => {
  if (currentView.value === 'market_research' && currentViewNode.value) {
    return {
      stageNode: currentViewNode.value,
      onlineFormData,
      responsibilitySelections
    };
  }
  if (currentViewNode.value?.node?.projectInput) {
    return {
      projectName: detail.value.project.projectName,
      projectCode: detail.value.project.projectCode || '未填写',
      currentStageTitle: currentStageTitle.value,
      projectStatus: detail.value.project.status
    };
  }
  if (currentView.value) {
    return { nodeName: currentViewNode.value?.node?.nodeName || currentView.value };
  }
  return {};
});

// ---- 方法 ----
function toggleStage(stageKey) {
  expandedStageKey.value = expandedStageKey.value === stageKey ? null : stageKey;
}

// 点击节点 → 跳转 URL
function navigateToNode(stage, node) {
  props.navigate('/projects/' + props.projectId + '/' + node.nodeKey);
}

// URL 变化 → 自动展开对应阶段
function syncExpandedFromView() {
  if (currentViewNode.value) {
    expandedStageKey.value = currentViewNode.value.stage.stageKey;
  }
}

function nodeStatusLabel(status) {
  const map = { done: '已完成', progress: '处理中', pending: '待提交', blocked: '已退回', returned: '已退回', not_started: '未开始' };
  return map[status] || status;
}
function nodeStatusClass(status) {
  const map = { done: 'done', progress: 'progress', pending: 'pending', blocked: 'blocked', returned: 'blocked', not_started: 'muted' };
  return map[status] || 'muted';
}
function scrollToStageDocumentChecklist() {
  const el = globalThis.document?.getElementById?.('stage-document-checklist');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- 加载 ----
async function loadAll() {
  loading.value = true;
  errorMessage.value = '';
  errorCode.value = '';
  detail.value = null;
  workspace.value = null;
  expandedStageKey.value = null;

  try {
    detail.value = await getProjectDetail(props.projectId, props.authToken);
    workspace.value = await getProjectWorkspace(props.projectId, props.authToken);

    // 自动聚焦
    if (props.focusStageId) {
      expandedStageKey.value = props.focusStageId;
    } else if (props.focusNodeKey && workspace.value?.stages) {
      const stage = workspace.value.stages.find(s => s.nodes?.some(n => n.nodeKey === props.focusNodeKey));
      if (stage) expandedStageKey.value = stage.stageKey;
    }

    // 根据 view 自动展开对应阶段
    syncExpandedFromView();
  } catch (error) {
    errorCode.value = error.code || '';
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }
}

// projectId 变化时重新加载
watch(() => props.projectId, loadAll);

// view 变化时只更新展开状态，不重载数据
watch(currentView, () => {
  if (workspace.value) syncExpandedFromView();
});

onMounted(loadAll);
</script>

<style scoped>
/* ===== 原有样式保持不变（此处仅补充动画） ===== */

/* ----- 新增淡入动画（与项目总览一致） ----- */
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
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
</style>