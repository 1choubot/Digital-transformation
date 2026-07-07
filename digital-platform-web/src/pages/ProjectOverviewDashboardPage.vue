<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="跨项目入口"
      title="项目总览"
      :current-user="currentUser"
      subtitle="齐套率基于资料 completionMode、基础状态和适用性派生完成状态计算。"
    >
      <template #actions>
        <button
          v-if="canCreateProject"
          type="button"
          class="primary-button"
          @click="navigate('/projects/new')"
        >
          新建项目
        </button>
        <button type="button" class="ghost-button" :disabled="loading" @click="loadDashboard">
          {{ loading ? '加载中...' : '重新加载' }}
        </button>
      </template>
    </PageHeader>

    <section class="overview-summary-grid" aria-label="项目总览指标">
      <div class="overview-metric">
        <span>项目总数</span>
        <strong>{{ summary.totalProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span>进行中</span>
        <strong>{{ summary.activeProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span>已完成</span>
        <strong>{{ summary.completedProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span>风险/延期</span>
        <strong>{{ summary.riskProjects }}</strong>
      </div>
      <button type="button" class="overview-metric overview-metric--button" @click="navigate('/my-workbench')">
        <span>我的待办资料</span>
        <strong>{{ summary.myPendingStageDocumentTasks }}</strong>
      </button>
    </section>

    <p class="manual-status-note">
      “我的待办资料”为当前登录用户全局待处理资料数量，不随项目状态、当前阶段或关键字筛选变化。
    </p>

    <section class="panel overview-filter-panel">
      <form class="overview-filters" @submit.prevent="loadDashboard">
        <label>
          <span>项目状态</span>
          <select v-model="statusFilter" :disabled="loading" @change="loadDashboard">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>当前阶段</span>
          <select v-model="stageOrderFilter" :disabled="loading" @change="loadDashboard">
            <option value="">全部阶段</option>
            <option v-for="option in stageOrderOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>关键字</span>
          <input
            v-model="keywordFilter"
            type="search"
            autocomplete="off"
            placeholder="项目编号、项目名称或客户名称"
          />
        </label>
        <button type="submit" class="primary-button" :disabled="loading">应用筛选</button>
      </form>
    </section>

    <section class="panel overview-list-panel">
      <div class="panel-toolbar">
        <div>
          <strong>项目总览列表</strong>
          <span>共 {{ projects.length }} 个项目，按项目编号和项目 ID 稳定排序。</span>
        </div>
      </div>

      <div class="stat-card stat-card--emerald">
        <div class="stat-info">
          <span class="stat-label">进行中</span>
          <strong class="stat-value">{{ summary.activeProjects }}</strong>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <div class="stat-card stat-card--indigo">
        <div class="stat-info">
          <span class="stat-label">已完成</span>
          <strong class="stat-value">{{ summary.completedProjects }}</strong>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      </div>

      <div class="stat-card stat-card--amber">
        <div class="stat-info">
          <span class="stat-label">风险 / 延期</span>
          <strong class="stat-value">{{ summary.riskProjects }}</strong>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 7v6" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      </div>

      <!-- “我的待办资料”特殊卡片 — 保持可点击，风格与用户管理待办卡片一致 -->
      <button type="button" class="stat-card stat-card--todo" @click="navigate('/my-stage-document-tasks')">
        <div class="stat-info">
          <span class="stat-label">我的待办资料</span>
          <strong class="stat-value">{{ summary.myPendingStageDocumentTasks }}</strong>
          <span class="todo-hint">立即处理 →</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
            <path d="M16 18h.01" />
          </svg>
        </div>
      </button>
    </section>

    <!-- 齐套率说明提示（原位于标题行内） -->
    <p class="manual-status-note">
      提示：齐套率基于当前手工状态和人工适用性判断，不代表物理文件已全部完成上传或在线表单已真实填写完毕。
    </p>

    <!-- 过滤器面板（整合重新加载按钮） -->
    <section class="panel overview-filter-panel">
      <form class="overview-filters" @submit.prevent="loadDashboard">
        <label class="filter-group">
          <span class="filter-label">项目状态</span>
          <div class="select-wrapper">
            <select v-model="statusFilter" :disabled="loading" @change="loadDashboard">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </label>

        <label class="filter-group">
          <span class="filter-label">当前阶段</span>
          <div class="select-wrapper">
            <select v-model="stageOrderFilter" :disabled="loading" @change="loadDashboard">
              <option value="">全部阶段</option>
              <option v-for="option in stageOrderOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </label>

        <label class="filter-group flex-1">
          <span class="filter-label">关键字</span>
          <div class="input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="keywordFilter"
              type="search"
              autocomplete="off"
              placeholder="项目编号、项目名称或客户名称"
            />
          </div>
        </label>

        <div class="filter-actions">
          <button type="submit" class="primary-button apply-btn" :disabled="loading">
            <span>应用筛选</span>
          </button>
          <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadDashboard">
            <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
            </svg>
            <span>{{ loading ? '加载中...' : '重新加载' }}</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 看板下侧卡片树列表组件 -->
    <section class="panel overview-list-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">项目总览列表</strong>
          <span class="toolbar-subtitle">共 {{ projects.length }} 个项目，按项目编号稳定排序</span>
        </div>
      </div>

      <!-- 数据加载中 -->
      <div v-if="loading" class="state-panel state-panel--inline">
        <div class="loading-wave">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <p>正在为您汇总全项目齐套看板，请稍候...</p>
      </div>

      <!-- 异常处理 -->
      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div class="error-details">
          <h3>项目总览加载失败</h3>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="primary-button inline-btn" @click="loadDashboard">重新尝试</button>
      </div>

      <!-- 空白状态 -->
      <div v-else-if="projects.length === 0" class="state-panel state-panel--empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-1.125 1.125-1.125V11.25a9 9 0 00-9-9z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>暂无匹配项目</h3>
        <p>当前筛选条件和搜索词下没有对应的匹配项目，请重新输入或清空重置。</p>
      </div>

      <!-- 高保真卡片列表 -->
      <div v-else class="overview-list">
        <article
          v-for="project in projects"
          :key="project.projectId"
          class="overview-project"
          @click="handleProjectCardClick($event, project)"
        >
          <div class="overview-project__main">
            <div class="overview-project__identity">
              <span class="mono">{{ formatProjectCode(project.projectCode) }}</span>
              <strong>{{ project.projectName }}</strong>
              <small>
                {{ project.customerName }} / {{ project.customerContactPerson || '-' }} / {{ formatProjectMode(project.projectMode) }} /
                {{ formatUser(project.projectManagerUser) }}
              </small>
            </div>

            <div class="cell-status">
              <StatusBadge :status="project.status" />
            </div>

            <div class="overview-project__stage">
              <span>当前阶段</span>
              <strong>{{ formatCurrentStage(project) }}</strong>
              <small v-if="project.currentStageIssue">{{ formatStageIssue(project.currentStageIssue) }}</small>
              <small v-else-if="project.status === 'ended'">结束原因：{{ project.endedReason || '-' }}</small>
            </div>

            <!-- 齐套率仪表盘 -->
            <div class="overview-project__completion">
              <span class="column-lbl">当前阶段齐套率</span>
              <div class="rate-bar-container">
                <strong class="rate-number">{{ formatCompletionPercent(project.currentStageCompletenessSummary) }}</strong>
                <div v-if="project.currentStageCompletenessSummary" class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: `${project.currentStageCompletenessSummary.completionPercent}%` }"></div>
                </div>
              </div>
              <small class="rate-summary-lbl">{{ formatCompletionSummary(project.currentStageCompletenessSummary) }}</small>
            </div>

            <div class="overview-project__dates">
              <span class="column-lbl">计划周期</span>
              <strong class="date-text">{{ formatDate(project.plannedStartDate) }} 至 {{ formatDate(project.plannedEndDate) }}</strong>
              <small class="creator-lbl">创建人: {{ formatUser(project.createdBy) }}</small>
            </div>
            <button type="button" class="ghost-button" @click.stop="navigateToProject(project)">
              进入工作区
            </button>
          </div>

          <!-- 子表：未完成适用必填资料清单 (折叠区域) -->
          <div class="overview-project__documents">
            <div class="docs-summary-header">
              <div class="docs-count-pill" :class="{ 'docs-count-pill--alert': project.currentStageIncompleteRequiredDocuments.length > 0 }">
                <span>未完成适用必填资料</span>
                <strong>{{ project.currentStageIncompleteRequiredDocuments.length }}</strong>
              </div>
            </div>

            <details v-if="project.currentStageIncompleteRequiredDocuments.length > 0" class="docs-details">
              <summary class="docs-toggle-btn">
                <span>展开未齐套文件清单</span>
                <span class="toggle-icon"></span>
              </summary>
              <ul class="incomplete-docs-list">
                <li v-for="document in project.currentStageIncompleteRequiredDocuments" :key="document.id" class="doc-list-item">
                  <span class="doc-code">{{ document.documentCode }}</span>
                  <strong class="doc-name">{{ document.documentName }}</strong>
                  <StatusBadge :status="document.status" />
                </li>
              </ul>
            </details>

            <p v-else-if="project.currentStageCompletenessSummary" class="checklist-finished-placeholder">
              <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>当前阶段已全部齐套（无未完成适用必填资料）。</span>
            </p>

            <p v-else class="checklist-empty-placeholder">
              {{ formatStageIssue(project.currentStageIssue) || '暂无齐套及清单摘要数据。' }}
            </p>
          </div>

        </article>
      </div>
    </section>

    <!-- Toast 消息弹出浮层 -->
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getProjectOverviewDashboard } from '../api/projects.js';
import { toReadableApiError } from '../api/http.js';
import PageHeader from '../components/PageHeader.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatProjectMode, formatUser } from '../utils/format.js';

const props = defineProps({
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  navigate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

const emptySummary = {
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  riskProjects: 0,
  myPendingStageDocumentTasks: 0
};

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'risk', label: '风险' },
  { value: 'paused', label: '暂停' },
  { value: 'delayed', label: '延期' },
  { value: 'completed', label: '完成' },
  { value: 'ended', label: '已结束' }
];

const stageOrderOptions = Array.from({ length: 8 }, (_, index) => ({
  value: String(index + 1),
  label: `第 ${index + 1} 阶段`
}));

const stageIssueText = {
  missing_current_stage: '当前阶段缺失',
  multiple_current_stages: '存在多个当前阶段',
  checklist_not_initialized: '当前阶段资料清单未初始化'
};

const statusFilter = ref('');
const stageOrderFilter = ref('');
const keywordFilter = ref('');
const loading = ref(false);
const errorMessage = ref('');
const dashboard = ref({
  summary: { ...emptySummary },
  projects: []
});

// Toast 控制状态
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

const summary = computed(() => dashboard.value.summary || emptySummary);
const projects = computed(() => dashboard.value.projects || []);
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);

function formatCurrentStage(project) {
  if (project.currentStageName) {
    return project.currentStageOrder
      ? `第 ${project.currentStageOrder} 阶段：${project.currentStageName}`
      : project.currentStageName;
  }

  if (project.status === 'completed') {
    return '项目已完成';
  }

  if (project.status === 'ended') {
    return '项目已结束';
  }

  return formatStageIssue(project.currentStageIssue) || '-';
}

function formatStageIssue(issue) {
  return stageIssueText[issue] || '';
}

function formatCompletionPercent(summaryValue) {
  if (!summaryValue) {
    return '-';
  }
  return `${summaryValue.completionPercent}%`;
}

function formatCompletionSummary(summaryValue) {
  if (!summaryValue) {
    return '暂无齐套摘要';
  }
  return `适用必填 ${summaryValue.requiredTotal} 项，已确认 ${summaryValue.confirmedRequiredCount} 项，未完成 ${summaryValue.incompleteRequiredCount} 项`;
}

function navigateToProject(project) {
  props.navigate(`/projects/${project.projectId}`);
}

function isInteractiveElement(element) {
  return Boolean(element?.closest?.('button, a, input, select, textarea, summary, details'));
}

function handleProjectCardClick(event, project) {
  if (isInteractiveElement(event.target)) {
    return;
  }

  navigateToProject(project);
}

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = '';

  try {
    dashboard.value = await getProjectOverviewDashboard(
      {
        status: statusFilter.value,
        currentStageOrder: stageOrderFilter.value,
        keyword: keywordFilter.value
      },
      props.authToken
    );
  } catch (error) {
    const message = toReadableApiError(error);
    errorMessage.value = message;
    showToast(message, 'error');

    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', message);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
/* 全局页面容器 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333;
  position: relative;
  background: transparent;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* ===== 统计卡片 — 与用户管理页面完全一致的风格 ===== */
.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  transition: all 0.3s ease;
  cursor: default;
  text-align: left;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 21, 41, 0.08);
}

.stat-card--todo {
  cursor: pointer;
  background: linear-gradient(135deg, #ffffff 0%, #fdf6ec 100%);
  border: 1px solid #faecd8;
  border-left: 4px solid #e6a23c;
}

.stat-card--todo:hover {
  border-color: #f3d19e;
  border-left-color: #e6a23c;
  box-shadow: 0 6px 16px rgba(230, 162, 60, 0.12);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #8c939d;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-card--todo .stat-value {
  color: #e6a23c;
}

.todo-hint {
  font-size: 0.75rem;
  font-weight: 500;
  color: #e6a23c;
  margin-top: 0.1rem;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
  color: #ffffff;
}

.stat-card--blue .stat-icon-wrapper {
  background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%);
}
.stat-card--emerald .stat-icon-wrapper {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.stat-card--indigo .stat-icon-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.stat-card--amber .stat-icon-wrapper {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}
.stat-card--todo .stat-icon-wrapper {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

/* ===== 齐套率说明提示 ===== */
.manual-status-note {
  margin: 0.25rem 0 0.25rem 0;
  font-size: 0.85rem;
  color: #3e63dd;
  line-height: 1.5;
  background: #ecf5ff;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  border-left: 3px solid #a4b3ff;
}

/* ===== 过滤栏 ===== */
.overview-filter-panel {
  padding: 1.25rem 1.5rem;
}

.overview-filters {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
  min-width: 280px;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}

.select-wrapper {
  position: relative;
  width: 160px;
}

.select-wrapper select {
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #dcdfe6;
  background-color: #ffffff;
  border-radius: 4px;
  color: #303133;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
  height: 36px;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #c0c4cc;
  pointer-events: none;
}

.select-wrapper select:focus {
  border-color: #3e63dd;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  transition: all 0.2s;
  padding-left: 0.75rem;
  height: 36px;
}

.input-wrapper:focus-within {
  border-color: #3e63dd;
}

.search-icon {
  width: 16px;
  height: 16px;
  stroke: #c0c4cc;
  flex-shrink: 0;
}

.input-wrapper input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.primary-button {
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}

.primary-button:hover:not(:disabled) {
  background: #5275e7;
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
}

.ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 主面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}

.toolbar-subtitle {
  display: block;
  font-size: 0.8rem;
  color: #909399;
  margin-top: 0.2rem;
}

/* ===== 数据页状态 ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.state-panel--inline {
  padding: 3.5rem 1.5rem;
}

.state-panel p {
  font-size: 0.9rem;
  color: #909399;
}

.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1rem;
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

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  stroke: currentColor;
}

.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #c0c4cc;
  margin-bottom: 1rem;
}

.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  margin: 1.5rem;
  padding: 2.5rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1.25rem;
}

/* ===== 项目卡片列表 ===== */
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.overview-project {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  transition: all 0.2s ease;
  overflow: hidden;
}

.overview-project:hover {
  border-color: #c6e2ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.overview-project__main {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1.8fr 2fr 1.8fr 1fr;
  padding: 1.25rem;
  align-items: center;
  gap: 1.25rem;
  border-bottom: 1px solid #ebeef5;
}

.overview-project__identity {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mono-badge {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
}

.project-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
}

.project-meta-desc {
  font-size: 0.8rem;
  color: #909399;
  font-weight: 400;
}

.divider {
  color: #c0c4cc;
  margin: 0 0.2rem;
}

.column-lbl {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #909399;
  margin-bottom: 0.2rem;
}

.stage-name-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}

.stage-warning-badge {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.rate-number {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
}

.rate-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #ebeef5;
  border-radius: 9999px;
  overflow: hidden;
  max-width: 120px;
}

.progress-bar-fill {
  height: 100%;
  background: #3e63dd;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.rate-summary-lbl {
  display: block;
  font-size: 0.75rem;
  color: #909399;
  margin-top: 0.2rem;
}

.date-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}

.creator-lbl {
  display: block;
  font-size: 0.75rem;
  color: #909399;
}

.action-button-main {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f4f6f9;
  border: none;
  color: #606266;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  transition: all 0.2s;
  width: fit-content;
  margin-left: auto;
}

.action-button-main:hover {
  background: #3e63dd;
  color: #ffffff;
}

.chevron-icon {
  width: 14px;
  height: 14px;
}

/* ===== 未完成清单区域 ===== */
.overview-project__documents {
  padding: 1rem 1.25rem;
  background-color: #fafafa;
}

.docs-summary-header {
  margin-bottom: 0.5rem;
}

.docs-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f4f4f5;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #909399;
  font-weight: 500;
  border: 1px solid #e9e9eb;
}

.docs-count-pill--alert {
  background: #fef0f0;
  color: #f56c6c;
  border-color: #fde2e2;
}

.docs-count-pill--alert strong {
  background: #f56c6c;
  color: #ffffff;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.docs-details {
  border-top: 1px dashed #ebeef5;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
}

.docs-toggle-btn {
  font-size: 0.8rem;
  font-weight: 500;
  color: #3e63dd;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: fit-content;
}

.docs-toggle-btn::-webkit-details-marker {
  display: none;
}

.docs-toggle-btn:hover {
  color: #5275e7;
}

.incomplete-docs-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem 1.5rem;
}

.doc-list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.doc-code {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  color: #909399;
  background-color: #f4f4f5;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.doc-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checklist-finished-placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #67c23a;
  font-weight: 500;
  margin: 0;
}

.check-icon {
  width: 16px;
  height: 16px;
  stroke: #67c23a;
}

.checklist-empty-placeholder {
  font-size: 0.85rem;
  color: #909399;
  margin: 0;
}

/* ===== Toast 样式 ===== */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}

.toast--error { border-left: 4px solid #f56c6c; }
.toast--error .toast-icon { stroke: #f56c6c; flex-shrink: 0; width: 20px; height: 20px; }

.toast--success { border-left: 4px solid #67c23a; }
.toast--success .toast-icon { stroke: #67c23a; flex-shrink: 0; width: 20px; height: 20px; }

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
.toast-close:hover { background: #f4f4f5; }
.toast-close svg { width: 14px; height: 14px; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 响应式调整 ===== */
@media (max-width: 1200px) {
  .dashboard-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .dashboard-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-project__main {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .action-button-main {
    margin-left: 0;
  }
  .incomplete-docs-list {
    grid-template-columns: 1fr;
  }
  .filter-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .dashboard-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>