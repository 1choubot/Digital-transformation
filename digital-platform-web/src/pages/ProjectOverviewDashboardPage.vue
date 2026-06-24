<template>
  <section class="page-stack">
    <!-- 精简标题行 -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">跨项目只读视图</span>
        <h2>项目总览</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        <p class="manual-status-note">
          齐套率基于当前手工状态和人工适用性判断，不代表文件已上传，也不代表在线表单已填写。
        </p>
      </div>
      <button type="button" class="ghost-button" :disabled="loading" @click="loadDashboard">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
        {{ loading ? '加载中...' : '重新加载' }}
      </button>
    </div>

    <!-- 概览指标卡片 -->
    <section class="overview-summary-grid" aria-label="项目总览指标">
      <div class="overview-metric">
        <span class="metric-label">项目总数</span>
        <strong class="metric-value">{{ summary.totalProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span class="metric-label">进行中</span>
        <strong class="metric-value metric-value--active">{{ summary.activeProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span class="metric-label">已完成</span>
        <strong class="metric-value metric-value--completed">{{ summary.completedProjects }}</strong>
      </div>
      <div class="overview-metric">
        <span class="metric-label">风险/延期</span>
        <strong class="metric-value metric-value--risk">{{ summary.riskProjects }}</strong>
      </div>
      <button type="button" class="overview-metric overview-metric--button"
        @click="navigate('/my-stage-document-tasks')">
        <span class="metric-label">我的待办资料</span>
        <strong class="metric-value metric-value--pending">{{ summary.myPendingStageDocumentTasks }}</strong>
      </button>
    </section>

    <p class="manual-status-note manual-status-note--bottom">
      “我的待办资料”为当前登录用户全局待办资料数量，不随项目状态、当前阶段或关键字筛选变化。
    </p>

    <!-- 筛选面板 -->
    <section class="panel overview-filter-panel">
      <form class="overview-filters" @submit.prevent="loadDashboard">
        <div class="filter-group">
          <label>
            <span class="filter-label">项目状态</span>
            <select v-model="statusFilter" :disabled="loading" @change="loadDashboard">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            <span class="filter-label">当前阶段</span>
            <select v-model="stageOrderFilter" :disabled="loading" @change="loadDashboard">
              <option value="">全部阶段</option>
              <option v-for="option in stageOrderOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            <span class="filter-label">关键字</span>
            <input v-model="keywordFilter" type="search" autocomplete="off" placeholder="项目编号、项目名称或客户名称" />
          </label>
        </div>
        <button type="submit" class="primary-button" :disabled="loading">
          应用筛选
        </button>
      </form>
    </section>

    <!-- 列表面板 -->
    <section class="panel overview-list-panel">
      <div class="panel-toolbar">
        <div>
          <strong>项目总览列表</strong>
          <span>共 {{ projects.length }} 个项目，按项目编号和项目 ID 稳定排序。</span>
        </div>
      </div>

      <div v-if="loading" class="state-panel state-panel--inline">
        <p>正在加载项目总览...</p>
      </div>

      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>项目总览加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="loadDashboard">重试</button>
      </div>

      <div v-else-if="projects.length === 0" class="state-panel state-panel--inline">
        <h3>暂无匹配项目</h3>
        <p>当前筛选条件下没有可展示的项目。</p>
      </div>

      <!-- 项目卡片列表 -->
      <div v-else class="overview-list">
        <article v-for="project in projects" :key="project.projectId" class="overview-project">
          <div class="overview-project__main">
            <div class="overview-project__identity">
              <span class="mono">{{ project.projectCode }}</span>
              <strong>{{ project.projectName }}</strong>
              <small>{{ project.customerName }} / {{ project.projectManager }}</small>
            </div>
            <StatusBadge :status="project.status" />
            <div class="overview-project__stage">
              <span class="field-label">当前阶段</span>
              <strong>{{ formatCurrentStage(project) }}</strong>
              <small v-if="project.currentStageIssue" class="field-issue">{{ formatStageIssue(project.currentStageIssue)
                }}</small>
            </div>
            <div class="overview-project__completion">
              <span class="field-label">当前阶段齐套率</span>
              <strong>{{ formatCompletionPercent(project.currentStageCompletenessSummary) }}</strong>
              <small>{{ formatCompletionSummary(project.currentStageCompletenessSummary) }}</small>
            </div>
            <div class="overview-project__dates">
              <span class="field-label">计划时间</span>
              <strong>{{ formatDate(project.plannedStartDate) }} 至 {{ formatDate(project.plannedEndDate) }}</strong>
              <small>创建人：{{ formatUser(project.createdBy) }}</small>
            </div>
            <button type="button" class="ghost-button" @click="navigate(`/projects/${project.projectId}`)">
              查看详情
            </button>
          </div>

          <div class="overview-project__documents">
            <div class="documents-header">
              <span class="field-label">未完成适用必填资料</span>
              <strong class="documents-count">{{ project.currentStageIncompleteRequiredDocuments.length }}</strong>
            </div>
            <details v-if="project.currentStageIncompleteRequiredDocuments.length > 0" class="documents-details">
              <summary>查看资料清单</summary>
              <ul class="documents-list">
                <li v-for="document in project.currentStageIncompleteRequiredDocuments" :key="document.id">
                  <span class="mono">{{ document.documentCode }}</span>
                  <span class="document-name">{{ document.documentName }}</span>
                  <StatusBadge :status="document.status" />
                </li>
              </ul>
            </details>
            <p v-else-if="project.currentStageCompletenessSummary" class="documents-empty">
              当前阶段暂无未完成适用必填资料。
            </p>
            <p v-else class="documents-empty">
              {{ formatStageIssue(project.currentStageIssue) || '当前阶段齐套摘要为空。' }}
            </p>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getProjectOverviewDashboard } from '../api/projects.js';
import { toReadableApiError } from '../api/http.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatUser } from '../utils/format.js';

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
  } catch (error) {
    const message = toReadableApiError(error);
    errorMessage.value = message;

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
/* ===== 全局重置 & 基础 ===== */
.page-stack {
  max-width: 1440px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background: #f8fafc;
  min-height: 100vh;
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

.manual-status-note {
  font-size: 0.7rem;
  color: #94a3b8;
  margin: 0.15rem 0 0 0;
  max-width: 600px;
  line-height: 1.4;
}

.manual-status-note--bottom {
  margin: 0.25rem 0 0.75rem 0;
  max-width: 600px;
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
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #0f172a;
  border: none;
  padding: 0.5rem 1.4rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.8rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  height: 38px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 面板 ===== */
.panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.2s ease;
}

.panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* ===== 概览指标卡片 ===== */
.overview-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.overview-metric {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  border: 1px solid #f1f5f9;
  text-align: left;
}

.overview-metric:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.overview-metric--button {
  background: transparent;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  font: inherit;
  color: inherit;
  align-items: flex-start;
}

.overview-metric--button:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.metric-label {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.metric-value--active {
  color: #2563eb;
}

.metric-value--completed {
  color: #16a34a;
}

.metric-value--risk {
  color: #dc2626;
}

.metric-value--pending {
  color: #d97706;
}

/* ===== 筛选面板 ===== */
.overview-filter-panel {
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
}

.overview-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1.25rem;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1.25rem;
  flex: 1;
}

.overview-filters label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 0 1 auto;
}

.filter-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.overview-filters select,
.overview-filters input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: inherit;
  color: #1e293b;
  background: white;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 38px;
  min-width: 140px;
}

.overview-filters select:focus,
.overview-filters input:focus {
  outline: none;
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
}

.overview-filters select:disabled,
.overview-filters input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.overview-filters input {
  min-width: 200px;
}

/* ===== 工具栏 ===== */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #f1f5f9;
}

.panel-toolbar strong {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-right: 0.6rem;
}

.panel-toolbar span {
  color: #64748b;
  font-size: 0.8rem;
}

/* ===== 状态面板 ===== */
.state-panel {
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.state-panel--inline {
  padding: 2rem 1.5rem;
  min-height: 180px;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.state-panel h3 {
  margin: 0 0 0.35rem 0;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.state-panel p {
  color: #64748b;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.state-panel--error p {
  color: #b91c1c;
}

.state-panel .primary-button {
  margin-top: 0.25rem;
}

/* ===== 项目卡片列表 ===== */
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overview-project {
  background: #fafcff;
  border: 1px solid #f1f5f9;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overview-project:hover {
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.overview-project__main {
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 1.2fr 1fr 1.2fr 0.8fr;
  gap: 0.5rem 0.75rem;
  align-items: center;
}

.overview-project__identity {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.overview-project__identity .mono {
  font-size: 0.65rem;
}

.overview-project__identity strong {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}

.overview-project__identity small {
  font-size: 0.7rem;
  color: #94a3b8;
}

.overview-project__stage,
.overview-project__completion,
.overview-project__dates {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.field-label {
  font-size: 0.6rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.overview-project__stage strong,
.overview-project__completion strong,
.overview-project__dates strong {
  font-size: 0.8rem;
  font-weight: 500;
  color: #1e293b;
  word-break: break-word;
}

.overview-project__stage small,
.overview-project__completion small,
.overview-project__dates small {
  font-size: 0.65rem;
  color: #94a3b8;
}

.field-issue {
  color: #dc2626 !important;
}

.overview-project__main .ghost-button {
  padding: 0.25rem 0.8rem;
  font-size: 0.7rem;
  border-radius: 24px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  box-shadow: none;
  min-width: auto;
  justify-self: flex-end;
  margin-top: 0.1rem;
}

.overview-project__main .ghost-button:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: none;
}

/* ===== 文档区域 ===== */
.overview-project__documents {
  border-top: 1px solid #f1f5f9;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.documents-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.documents-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0 0.6rem;
  border-radius: 12px;
  line-height: 1.6;
}

.documents-details summary {
  font-size: 0.75rem;
  color: #2563eb;
  cursor: pointer;
  padding: 0.15rem 0;
  font-weight: 500;
}

.documents-details summary:hover {
  color: #1d4ed8;
}

.documents-list {
  list-style: none;
  padding: 0.5rem 0 0 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.documents-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.75rem;
}

.documents-list .mono {
  font-size: 0.6rem;
  flex-shrink: 0;
}

.documents-list .document-name {
  flex: 1;
  color: #1e293b;
}

.documents-empty {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

/* ===== 共用工具类 ===== */
.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  color: #475569;
  background: #f1f5f9;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  display: inline-block;
  letter-spacing: 0.02em;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .overview-project__main {
    grid-template-columns: 1.2fr 0.7fr 1.1fr 0.9fr 1.1fr 0.7fr;
    gap: 0.4rem 0.6rem;
  }

  .overview-summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .page-stack {
    padding: 1.25rem 1rem;
  }

  .page-title-row {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }

  .panel {
    padding: 1rem 1.25rem;
  }

  .overview-project__main {
    grid-template-columns: 1fr 0.6fr;
    grid-template-rows: auto auto auto auto;
    gap: 0.4rem 0.75rem;
  }

  .overview-project__identity {
    grid-row: 1 / 2;
    grid-column: 1 / 2;
  }

  .overview-project__main> :nth-child(2) {
    grid-row: 1 / 2;
    grid-column: 2 / 3;
    justify-self: flex-end;
  }

  .overview-project__stage {
    grid-row: 2 / 3;
    grid-column: 1 / 2;
  }

  .overview-project__completion {
    grid-row: 2 / 3;
    grid-column: 2 / 3;
  }

  .overview-project__dates {
    grid-row: 3 / 4;
    grid-column: 1 / 3;
  }

  .overview-project__main .ghost-button {
    grid-row: 4 / 5;
    grid-column: 1 / 3;
    justify-self: flex-start;
  }

  .overview-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .overview-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-filters label {
    min-width: auto;
  }

  .overview-filters select,
  .overview-filters input {
    min-width: auto;
    width: 100%;
  }

  .overview-filters .primary-button {
    align-self: flex-start;
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

  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .overview-summary-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .overview-metric {
    padding: 0.75rem 1rem;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .overview-project {
    padding: 0.75rem 1rem;
  }

  .overview-project__main {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 0.4rem;
  }

  .overview-project__identity {
    grid-row: auto;
    grid-column: auto;
  }

  .overview-project__main> :nth-child(2) {
    grid-row: auto;
    grid-column: auto;
    justify-self: flex-start;
  }

  .overview-project__stage,
  .overview-project__completion,
  .overview-project__dates {
    grid-row: auto;
    grid-column: auto;
  }

  .overview-project__main .ghost-button {
    grid-row: auto;
    grid-column: auto;
    justify-self: flex-start;
  }
}

@media (max-width: 480px) {
  .page-stack {
    padding: 1rem 0.75rem;
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

  .manual-status-note {
    font-size: 0.6rem;
  }

  .ghost-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }

  .panel {
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
  }

  .overview-summary-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .overview-metric {
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-label {
    font-size: 0.6rem;
  }

  .overview-project {
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
  }

  .overview-project__identity strong {
    font-size: 0.8rem;
  }

  .overview-project__stage strong,
  .overview-project__completion strong,
  .overview-project__dates strong {
    font-size: 0.75rem;
  }

  .overview-project__main .ghost-button {
    padding: 0.2rem 0.5rem;
    font-size: 0.6rem;
  }

  .button-icon {
    width: 14px;
    height: 14px;
  }

  .panel-toolbar {
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
  }

  .panel-toolbar strong {
    font-size: 0.85rem;
  }

  .panel-toolbar span {
    font-size: 0.7rem;
  }

  .state-panel {
    padding: 1.5rem 1rem;
    min-height: 150px;
  }

  .state-panel h3 {
    font-size: 0.95rem;
  }

  .state-panel p {
    font-size: 0.8rem;
  }

  .documents-list li {
    flex-wrap: wrap;
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }

  .documents-list .document-name {
    min-width: 60px;
  }

  .overview-filters .primary-button {
    width: 100%;
    justify-content: center;
  }
}
</style>