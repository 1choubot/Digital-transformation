<template>
  <section class="page-stack animate-fadeIn">
    <!-- 统计卡片 -->
    <section class="dashboard-stats-grid">
      <div class="stat-card stat-card--blue">
        <div class="stat-info">
          <span class="stat-label">项目总数</span>
          <strong class="stat-value">{{ summary.totalProjects }}</strong>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <polyline points="9 14 12 11 15 14" />
          </svg>
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

    <!-- 项目列表顶栏（含新建按钮） -->
    <header class="list-header-card">
      <div class="toolbar-info">
        <strong class="toolbar-title">项目列表</strong>
        <span class="toolbar-subtitle">共 {{ filteredProjects.length }} 个项目</span>
      </div>
      <!-- 修改：新建项目按钮从下方移至此处 -->
      <button v-if="canCreateProject" type="button" class="primary-button create-btn" @click="navigate('/projects/new')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建项目</span>
      </button>
    </header>

    <!-- 过滤面板（仅保留应用筛选和清除筛选） -->
    <section class="panel overview-filter-panel">
      <form class="overview-filters" @submit.prevent="applyFilters">
        <label class="filter-group">
          <span class="filter-label">项目状态</span>
          <div class="select-wrapper">
            <select v-model="statusFilter" :disabled="loading">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </label>

        <label class="filter-group">
          <span class="filter-label">当前阶段</span>
          <div class="select-wrapper">
            <select v-model="stageOrderFilter" :disabled="loading">
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
              placeholder="项目编号、名称或客户名称"
              @keydown.enter.prevent="applyFilters"
            />
          </div>
        </label>

        <div class="filter-actions">
          <button type="submit" class="primary-button apply-btn" :disabled="loading">
            <span>应用筛选</span>
          </button>
          <!-- 删除：重新加载按钮已移除 -->
          <button type="button" class="ghost-button clear-btn" :disabled="loading" @click="clearFilters">
            <span>清除筛选</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 项目列表容器（未改动） -->
    <section class="overview-list-container">
      <!-- 加载中 -->
      <div v-if="loading" class="state-card state-card--inline">
        <div class="loading-wave">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <p>正在为您汇总全项目齐套看板，请稍候...</p>
      </div>

      <!-- 异常 -->
      <div v-else-if="errorMessage" class="state-card state-card--error">
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

      <!-- 空状态 -->
      <div v-else-if="filteredProjects.length === 0" class="state-card state-card--empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-1.125 1.125-1.125V11.25a9 9 0 00-9-9z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h3>暂无匹配项目</h3>
        <p>当前筛选条件下没有对应的项目，请调整筛选条件。</p>
      </div>

      <!-- 独立的卡片列表流 -->
      <div v-else class="overview-list">
        <article
          v-for="project in paginatedProjects"
          :key="project.projectId"
          class="overview-project"
          @click="navigate(`/projects/${project.projectId}`)"
        >
          <div class="overview-project__main">
            <!-- 身份区 -->
            <div class="overview-project__identity">
              <span class="mono-badge">{{ project.projectCode || '暂无项目编号' }}</span>
              <strong class="project-name">{{ project.projectName }}</strong>
              <small class="project-meta-desc">
                {{ project.customerName || '未知客户' }}
              </small>
            </div>

            <!-- 模式列 -->
            <div class="overview-project__mode">
              <span class="column-lbl">模式</span>
              <span class="mode-value">{{ formatProjectMode(project.projectMode) }}</span>
            </div>

            <!-- 经理列 -->
            <div class="overview-project__manager">
              <span class="column-lbl">经理</span>
              <span class="manager-value">{{ formatUser(project.projectManagerUser) }}</span>
            </div>

            <!-- 状态 -->
            <div class="cell-status" @click.stop>
              <StatusBadge :status="project.status" />
            </div>

            <!-- 当前阶段 -->
            <div class="overview-project__stage">
              <span class="column-lbl">当前阶段</span>
              <strong class="stage-name-text">{{ formatCurrentStage(project) }}</strong>
              <span v-if="project.currentStageIssue" class="stage-warning-badge">{{ formatStageIssue(project.currentStageIssue) }}</span>
            </div>

            <!-- 齐套率 -->
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
          </div>

          <!-- 未完成资料清单 -->
          <div class="overview-project__documents" @click.stop>
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

      <!-- 底部分页卡片 -->
      <footer v-if="filteredProjects.length > 0" class="pagination-card">
        <div class="pagination-info">
          <span>当前第</span>
          <span class="page-current-highlight">{{ currentPage }}</span>
          <span>/ {{ totalPages }} 页</span>
          <span class="divider">|</span>
          <span>共 {{ filteredProjects.length }} 个项目</span>
        </div>

        <div class="pagination-controls">
          <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(1)">首页</button>
          <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
          <div class="page-numbers-group">
            <button
              v-for="page in visiblePages"
              :key="page"
              type="button"
              :class="['page-number-btn', { 'page-number-btn--active': page === currentPage }]"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
          </div>
          <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">下一页</button>
          <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(totalPages)">尾页</button>
        </div>

        <div class="pagination-sizes">
          <span>每页显示</span>
          <div class="select-wrapper select-size">
            <select v-model="pageSize" @change="currentPage = 1">
              <option :value="5">5 项/页</option>
              <option :value="8">8 项/页</option>
              <option :value="12">12 项/页</option>
              <option :value="20">20 项/页</option>
            </select>
          </div>
        </div>
      </footer>
    </section>

    <!-- Toast -->
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
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  navigate: { type: Function, required: true }
});

const emit = defineEmits(['auth-expired']);

// Only business leaders can create projects from the overview list.
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);

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

const currentPage = ref(1);
const pageSize = ref(5);

const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => { toastVisible.value = false; }, 3000);
}

function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = false;
}

onUnmounted(() => { if (toastTimer) clearTimeout(toastTimer); });

const summary = computed(() => dashboard.value.summary || emptySummary);
const projects = computed(() => dashboard.value.projects || []);
const filteredProjects = computed(() => projects.value);

const totalPages = computed(() => Math.ceil(filteredProjects.value.length / pageSize.value) || 1);
const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredProjects.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const range = [];
  const maxButtons = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages.value, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
  for (let i = start; i <= end; i++) range.push(i);
  return range;
});

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
}

function applyFilters() {
  currentPage.value = 1;
  loadDashboard();
}

// 清除筛选：重置三个筛选字段并重新加载
function clearFilters() {
  statusFilter.value = '';
  stageOrderFilter.value = '';
  keywordFilter.value = '';
  applyFilters();
}

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
  if (!summaryValue) return '-';
  return `${summaryValue.completionPercent}%`;
}

function formatCompletionSummary(summaryValue) {
  if (!summaryValue) return '暂无齐套摘要';
  return `适用必填 ${summaryValue.requiredTotal} 项，已确认 ${summaryValue.confirmedRequiredCount} 项，未完成 ${summaryValue.incompleteRequiredCount} 项`;
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
    currentPage.value = 1;
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
/* ===== 全局容器 ===== */
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
  background: transparent;
}
.animate-fadeIn { animation: fadeIn 0.4s ease-out; }

/* ===== 统计卡片 ===== */
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
.stat-card--blue .stat-icon-wrapper { background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%); }
.stat-card--emerald .stat-icon-wrapper { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-card--indigo .stat-icon-wrapper { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-card--amber .stat-icon-wrapper { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
.stat-card--todo .stat-icon-wrapper { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }

/* ===== 过滤面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}
.overview-filter-panel { padding: 1.25rem 1.5rem; }
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
.flex-1 { flex: 1; min-width: 200px; }
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
.select-wrapper select:focus { border-color: #3e63dd; }
.input-wrapper {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  padding-left: 0.75rem;
  height: 36px;
  transition: border-color 0.2s;
}
.input-wrapper:focus-within { border-color: #3e63dd; }
.search-icon { width: 16px; height: 16px; stroke: #c0c4cc; flex-shrink: 0; }
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
  flex-shrink: 0;
}

/* ===== 按钮 ===== */
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}
.primary-button:hover:not(:disabled) { background: #5275e7; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }
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
  transition: all 0.2s;
  height: 36px;
}
.ghost-button:hover:not(:disabled) { border-color: #c6e2ff; background: #ecf5ff; color: #3e63dd; }
.ghost-button:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-icon { width: 16px; height: 16px; }
/* 注：spinner 样式虽已移除按钮，但保留以免影响其他可能使用的地方 */
.spinner { width: 16px; height: 16px; animation: spin 0.8s linear infinite; stroke: currentColor; }

/* ===== 列表容器 ===== */
.overview-list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ===== 独立顶栏卡片（含新建按钮） ===== */
.list-header-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
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
/* 移除了 .manual-status-note 样式（不再使用） */

/* ===== 状态占位卡片 ===== */
.state-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}
.state-card--inline { padding: 3.5rem 1.5rem; }
.state-card h3 { font-size: 1.1rem; font-weight: 600; color: #303133; margin-bottom: 0.5rem; }
.state-card p { font-size: 0.9rem; color: #909399; }
.loading-wave { display: flex; gap: 6px; margin-bottom: 1rem; }
.wave-bar {
  width: 4px;
  height: 20px;
  background: #3e63dd;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}
.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }
@keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
.empty-icon { width: 48px; height: 48px; stroke: #c0c4cc; margin-bottom: 1rem; }
.state-card--error { background: #fef0f0; border-color: #fde2e2; }
.error-icon { width: 32px; height: 32px; stroke: #f56c6c; margin-bottom: 0.75rem; }
.inline-btn { margin-top: 1.25rem; }

/* ===== 卡片列表区 ===== */
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ===== 单个项目卡片 ===== */
.overview-project {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  transition: all 0.25s ease;
  overflow: hidden;
  cursor: pointer;
}
.overview-project:hover {
  border-color: #ebeef5; 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* --- 主网格：6列均匀分布 --- */
.overview-project__main {
  display: grid;
  grid-template-columns: 2fr 0.8fr 0.8fr 0.8fr 1.5fr 2fr;
  padding: 1.25rem;
  align-items: center;
  gap: 1.25rem;
  border-bottom: 1px solid #f0f2f5;
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

.overview-project__mode,
.overview-project__manager {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.mode-value,
.manager-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
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

/* ===== 未完成资料区域 ===== */
.overview-project__documents {
  padding: 1rem 1.25rem;
  background-color: #fafbfc;
}
.docs-summary-header { margin-bottom: 0.5rem; }
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
.docs-toggle-btn::-webkit-details-marker { display: none; }
.docs-toggle-btn:hover { color: #5275e7; }
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
.check-icon { width: 16px; height: 16px; stroke: #67c23a; }
.checklist-empty-placeholder {
  font-size: 0.85rem;
  color: #909399;
  margin: 0;
}

/* ===== 底部分页卡片 ===== */
.pagination-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.pagination-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #606266;
  flex-wrap: wrap;
}
.page-current-highlight {
  font-weight: 600;
  color: #3e63dd;
  background: #f0f3ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.pagination-info .divider { color: #ebeef5; margin: 0 0.5rem; }
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.page-control-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-control-btn:hover:not(:disabled) { color: #3e63dd; border-color: #a4b3ff; }
.page-control-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #f4f4f5; }
.page-numbers-group { display: flex; align-items: center; gap: 0.25rem; }
.page-number-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.page-number-btn:hover { color: #3e63dd; border-color: #a4b3ff; }
.page-number-btn--active { background: #3e63dd !important; color: #ffffff !important; border-color: #3e63dd !important; }
.pagination-sizes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #606266;
}
.select-size { width: 100px; }
.select-size select { padding: 0.3rem 1.5rem 0.3rem 0.65rem; font-size: 0.8rem; }

/* ===== Toast ===== */
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .dashboard-stats-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .dashboard-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-project__main {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .incomplete-docs-list { grid-template-columns: 1fr; }
  .filter-actions { margin-left: 0; width: 100%; justify-content: flex-start; }
}
@media (max-width: 480px) {
  .dashboard-stats-grid { grid-template-columns: 1fr; }
  .page-stack { padding: 1rem; }
  .overview-project__main { padding: 0.75rem; }
  .list-header-card { flex-direction: column; align-items: stretch; }
  .list-header-card .primary-button { align-self: flex-start; }
}
</style>
