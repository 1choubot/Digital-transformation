<template>
  <section class="page-stack animate-fadeIn">
    <!-- STREAMING_CHUNK: 页面顶栏状态与说明信息... -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">跨项目只读视图</span>
        <h2>项目总览</h2>
        <div class="user-meta">
          <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        </div>
        <p class="manual-status-note">
          齐套率基于资料级审核通过状态和人工适用性判断，不代表文件已上传，也不代表在线表单已填写。
        </p>
      </div>
      <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadDashboard">
        <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" stroke-top="currentColor" />
        </svg>
        <span>{{ loading ? '加载中...' : '重新加载' }}</span>
      </button>
    </div>

    <!-- STREAMING_CHUNK: 核心统计指标卡片网格渲染... -->
    <section class="overview-summary-grid" aria-label="项目总览指标">
      <div class="overview-metric metric-total">
        <span class="metric-title">项目总数</span>
        <strong class="metric-number">{{ summary.totalProjects }}</strong>
      </div>
      <div class="overview-metric metric-active">
        <span class="metric-title">进行中</span>
        <strong class="metric-number">{{ summary.activeProjects }}</strong>
      </div>
      <div class="overview-metric metric-completed">
        <span class="metric-title">已完成</span>
        <strong class="metric-number">{{ summary.completedProjects }}</strong>
      </div>
      <div class="overview-metric metric-risk">
        <span class="metric-title">风险/延期</span>
        <strong class="metric-number">{{ summary.riskProjects }}</strong>
      </div>
      <button type="button" class="overview-metric overview-metric--button metric-todo" @click="navigate('/my-workbench')">
        <span class="metric-title">我的待办资料</span>
        <strong class="metric-number">{{ summary.myPendingStageDocumentTasks }}</strong>
        <span class="todo-btn-hint">立即处理 →</span>
      </button>
    </section>

    <p class="summary-note">
      "我的待办资料"为当前登录用户全局待处理资料数量，不随项目状态、当前阶段或关键字筛选变化。
    </p>

    <!-- 过滤器面板 -->
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
        
        <button type="submit" class="primary-button apply-btn" :disabled="loading">
          <span>应用筛选</span>
        </button>
      </form>
    </section>

    <!-- STREAMING_CHUNK: 看板下侧卡片树列表组件渲染... -->
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
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>暂无匹配项目</h3>
        <p>当前筛选条件和搜索词下没有对应的匹配项目，请重新输入或清空重置。</p>
      </div>

      <!-- 高保真卡片列表 -->
      <div v-else class="overview-list">
        <article v-for="project in projects" :key="project.projectId" class="overview-project">
          
          <!-- 核心信息行 -->
          <div class="overview-project__main">
            <div class="overview-project__identity">
              <span class="mono-badge">{{ project.projectCode }}</span>
              <strong class="project-name">{{ project.projectName }}</strong>
              <small class="project-meta-desc">
                {{ project.customerName }} <span class="divider">/</span> {{ formatProjectMode(project.projectMode) }} <span class="divider">/</span> 经理: {{ formatUser(project.projectManagerUser) }}
              </small>
            </div>
            
            <div class="cell-status">
              <StatusBadge :status="project.status" />
            </div>

            <div class="overview-project__stage">
              <span class="column-lbl">当前阶段</span>
              <strong class="stage-name-text">{{ formatCurrentStage(project) }}</strong>
              <span v-if="project.currentStageIssue" class="stage-warning-badge">{{ formatStageIssue(project.currentStageIssue) }}</span>
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

            <button type="button" class="action-button-main" @click="navigate(`/projects/${project.projectId}`)">
              <span>进入详情</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <!-- 子表：未完成适用必填资料清单 (折叠区域) -->
          <div class="overview-project__documents">
            <div class="docs-summary-header">
              <div class="docs-count-pill" :class="{ 'docs-count-pill--alert': project.currentStageIncompleteRequiredDocuments.length > 0 }">
                <span>未完成资料级审核的适用必填资料</span>
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
              <span>当前阶段适用必填资料均已通过资料级审核。</span>
            </p>
            
            <p v-else class="checklist-empty-placeholder">
              {{ formatStageIssue(project.currentStageIssue) || '暂无齐套及清单摘要数据。' }}
            </p>
          </div>

        </article>
      </div>
    </section>

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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getProjectOverviewDashboard } from '../api/projects.js';
import { toReadableApiError } from '../api/http.js';
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
  { value: 'completed', label: '完成' }
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

const summary = computed(() => dashboard.value.summary || emptySummary);
const projects = computed(() => dashboard.value.projects || []);

function formatCurrentStage(project) {
  if (project.currentStageName) {
    return project.currentStageOrder
      ? `第 ${project.currentStageOrder} 阶段：${project.currentStageName}`
      : project.currentStageName;
  }

  if (project.status === 'completed') {
    return '项目已完成';
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

  return `适用必填 ${summaryValue.requiredTotal} 项，审核通过 ${summaryValue.confirmedRequiredCount} 项，未完成 ${summaryValue.incompleteRequiredCount} 项`;
}

// STREAMING_CHUNK: 异步同步看板，失败时推送 Toast 异常提示弹窗...
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
  align-items: flex-start;
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
  font-size: 2rem;
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

.manual-status-note {
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  background: #f1f5f9;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border-left: 3px solid #cbd5e1;
}

/* 重新加载按钮 */
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

.ghost-button:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 核心指标仪表盘网格样式 */
.overview-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.overview-metric {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  border-left: 4px solid #cbd5e1;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  transition: all 0.2s ease;
  border-top: 1px solid rgba(0,0,0,0.01);
  border-right: 1px solid rgba(0,0,0,0.01);
  border-bottom: 1px solid rgba(0,0,0,0.01);
}

.overview-metric:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 20, 40, 0.08);
}

.metric-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-number {
  font-size: 1.875rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

/* 带有独特高亮条的指标样式 */
.metric-total { border-left-color: #3b82f6; }
.metric-active { border-left-color: #0284c7; }
.metric-completed { border-left-color: #10b981; }
.metric-risk { border-left-color: #f59e0b; }

/* 待办资料特殊大卡片按钮 */
.metric-todo {
  border-left-color: #ec4899;
  background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
  cursor: pointer;
  text-align: left;
  border: 1px solid #fecdd3;
  border-left-width: 4px;
}

.metric-todo .metric-number {
  color: #be123c;
}

.todo-btn-hint {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e11d48;
}

.summary-note {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: -0.25rem;
}

/* 过滤栏设计 */
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
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

/* 统一输入包装层 */
.select-wrapper {
  position: relative;
  width: 160px;
}

.select-wrapper select {
  width: 100%;
  padding: 0.625rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  border-radius: 8px;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #64748b;
  pointer-events: none;
}

.select-wrapper select:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  transition: all 0.2s;
  padding-left: 0.75rem;
}

.input-wrapper:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.search-icon {
  width: 18px;
  height: 18px;
  stroke: #94a3b8;
  flex-shrink: 0;
}

.input-wrapper input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #0f172a;
  outline: none;
}

.primary-button {
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 600;
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  height: 38px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
}

/* 主面板 */
.panel {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.03);
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.toolbar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-subtitle {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.2rem;
}

/* 数据页状态 */
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
  color: #64748b;
}

/* 加载动画 */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1rem;
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

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  stroke: currentColor;
}

/* 空状态 */
.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #94a3b8;
  margin-bottom: 1rem;
}

/* 错误状态 */
.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  margin: 1.5rem;
  padding: 2.5rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #ef4444;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1.25rem;
}

/* 项目卡片列表 */
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.overview-project {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  overflow: hidden;
}

.overview-project:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* 列表内的主布局，极其精细的响应式弹性网格 */
.overview-project__main {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1.8fr 2fr 1.8fr 1fr;
  padding: 1.25rem;
  align-items: center;
  gap: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.overview-project__identity {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mono-badge {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.725rem;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
}

.project-name {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.project-meta-desc {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 400;
}

.divider {
  color: #cbd5e1;
  margin: 0 0.1rem;
}

.column-lbl {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}

.stage-name-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.stage-warning-badge {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

/* 齐套进度条 */
.rate-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.rate-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  max-width: 120px;
}

.progress-bar-fill {
  height: 100%;
  background: #10b981;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.rate-summary-lbl {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.date-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: #334155;
}

.creator-lbl {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* 操作进入按钮 */
.action-button-main {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f1f5f9;
  border: none;
  color: #334155;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;
  width: fit-content;
  margin-left: auto;
}

.action-button-main:hover {
  background: #0f172a;
  color: #ffffff;
}

.chevron-icon {
  width: 14px;
  height: 14px;
}

/* 未完成清单区域 */
.overview-project__documents {
  padding: 1rem 1.25rem;
  background-color: #fafbfc;
}

.docs-summary-header {
  margin-bottom: 0.5rem;
}

.docs-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #475569;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.docs-count-pill--alert {
  background: #fff5f5;
  color: #c53030;
  border-color: #feb2b2;
}

.docs-count-pill--alert strong {
  background: #e53e3e;
  color: #ffffff;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* 详情拉伸样式 */
.docs-details {
  border-top: 1px dashed #e2e8f0;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
}

.docs-toggle-btn {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
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
  color: #1d4ed8;
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
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}

.doc-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #64748b;
  background-color: #f8fafc;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.doc-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checklist-finished-placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: #15803d;
  font-weight: 500;
  margin: 0;
}

.check-icon {
  width: 16px;
  height: 16px;
  stroke: #16a34a;
}

.checklist-empty-placeholder {
  font-size: 0.825rem;
  color: #94a3b8;
  margin: 0;
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
.metric-todo:hover {
  border-color: #f9a8d4;      /* 比原本 #fecdd3 深一点 */
  border-left-color: #be123c;  /* 比原本 #ec4899 深 */
  /* 如果担心 box-shadow 或 outline 干扰，可同时重置 */
  outline: none;               /* 移除默认轮廓（若有） */
  box-shadow: 0 12px 30px rgba(190, 18, 60, 0.12); /* 可选，阴影微调 */
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .overview-summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .overview-summary-grid {
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
}
</style>