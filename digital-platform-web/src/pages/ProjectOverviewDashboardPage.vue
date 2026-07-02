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
                {{ project.customerName }} / {{ formatProjectMode(project.projectMode) }} /
                {{ formatUser(project.projectManagerUser) }}
              </small>
            </div>
            <StatusBadge :status="project.status" />
            <div class="overview-project__stage">
              <span>当前阶段</span>
              <strong>{{ formatCurrentStage(project) }}</strong>
              <small v-if="project.currentStageIssue">{{ formatStageIssue(project.currentStageIssue) }}</small>
            </div>
            <div class="overview-project__completion">
              <span>当前阶段齐套率</span>
              <strong>{{ formatCompletionPercent(project.currentStageCompletenessSummary) }}</strong>
              <small>{{ formatCompletionSummary(project.currentStageCompletenessSummary) }}</small>
            </div>
            <div class="overview-project__dates">
              <span>计划时间</span>
              <strong>{{ formatDate(project.plannedStartDate) }} 至 {{ formatDate(project.plannedEndDate) }}</strong>
              <small>创建人：{{ formatUser(project.createdBy) }}</small>
            </div>
            <button type="button" class="ghost-button" @click.stop="navigateToProject(project)">
              进入工作区
            </button>
          </div>

          <div class="overview-project__documents">
            <div>
              <span>可查看未完成资料</span>
              <strong>{{ project.currentStageIncompleteRequiredDocuments.length }}</strong>
            </div>
            <details v-if="project.currentStageIncompleteRequiredDocuments.length > 0">
              <summary>查看可见资料</summary>
              <ul>
                <li v-for="document in project.currentStageIncompleteRequiredDocuments" :key="document.id">
                  <span class="mono">{{ document.documentCode }}</span>
                  <strong>{{ document.documentName }}</strong>
                  <span>{{ formatCompletionMode(document.completionMode) }}</span>
                  <span>{{ formatCompletionStatus(document.completionStatus) }}</span>
                  <StatusBadge :status="document.status" />
                </li>
              </ul>
            </details>
            <p v-else-if="project.currentStageCompletenessSummary">
              当前阶段适用资料均已按完成规则完成。
            </p>
            <p v-else>
              {{ formatStageIssue(project.currentStageIssue) || '当前账号暂无可查看的齐套明细。' }}
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
import PageHeader from '../components/PageHeader.vue';
import StatusBadge from '../components/StatusBadge.vue';
import {
  formatCompletionMode,
  formatCompletionStatus,
  formatDate,
  formatProjectCode,
  formatProjectMode,
  formatUser
} from '../utils/format.js';

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

  const completed = summaryValue.completedRequiredCount ?? summaryValue.confirmedRequiredCount;
  return `适用资料 ${summaryValue.requiredTotal} 项，已完成 ${completed} 项，未完成 ${summaryValue.incompleteRequiredCount} 项`;
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

    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', message);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>
