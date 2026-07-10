<template>
  <section class="page-stack">
    <PageHeader eyebrow="跨项目入口" title="项目总览" :current-user="currentUser"
      subtitle="齐套率基于资料 completionMode、基础状态和适用性派生完成状态计算。">
      <template #actions>
        <el-button :loading="loading" @click="loadDashboard">重新加载</el-button>
      </template>
    </PageHeader>

    <el-row class="overview-summary-grid" :gutter="12" aria-label="项目总览指标">
      <el-col :xs="24" :sm="12" :md="8" :lg="5">
        <el-card class="overview-metric-card" shadow="never">
          <el-statistic title="项目总数" :value="summary.totalProjects" />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5">
        <el-card class="overview-metric-card" shadow="never">
          <el-statistic title="进行中" :value="summary.activeProjects" />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5">
        <el-card class="overview-metric-card" shadow="never">
          <el-statistic title="已完成" :value="summary.completedProjects" />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5">
        <el-card class="overview-metric-card" shadow="never">
          <el-statistic title="风险/延期" :value="summary.riskProjects" />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="4">
        <el-card class="overview-metric-card overview-metric-card--button" shadow="never" role="button" tabindex="0"
          @click="navigate('/my-stage-document-tasks')" @keydown.enter.prevent="navigate('/my-stage-document-tasks')"
          @keydown.space.prevent="navigate('/my-stage-document-tasks')">
          <el-statistic title="我的待办资料" :value="summary.myPendingStageDocumentTasks" />
        </el-card>
      </el-col>
    </el-row>

    <p class="manual-status-note">
      “我的待办资料”为当前登录用户全局待处理资料数量，不随项目状态、当前阶段或关键字筛选变化。
    </p>

    <el-card class="overview-filter-card" shadow="never">
      <el-form class="overview-filters" label-position="top" @submit.prevent="loadDashboard">
        <el-form-item label="项目状态">
          <el-select v-model="statusFilter" :disabled="loading" @change="loadDashboard">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label"
              :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前阶段">
          <el-select v-model="stageOrderFilter" :disabled="loading" @change="loadDashboard">
            <el-option label="全部阶段" value="" />
            <el-option v-for="option in stageOrderOptions" :key="option.value" :label="option.label"
              :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字" class="overview-filters__keyword">
          <el-input v-model="keywordFilter" clearable placeholder="项目编号、项目名称或客户名称" @keyup.enter="loadDashboard" />
        </el-form-item>
        <el-form-item class="overview-filters__actions">
          <el-button type="primary" :loading="loading" native-type="submit">应用筛选</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="overview-list-panel" shadow="never">
      <template #header>
        <div>
          <strong>项目总览列表</strong>
          <span>共 {{ projects.length }} 个项目，按项目编号和项目 ID 稳定排序。</span>
        </div>
      </template>

      <el-skeleton v-if="loading" :rows="5" animated />

      <el-alert v-else-if="errorMessage" title="项目总览加载失败" :description="errorMessage" type="error" show-icon
        :closable="false">
        <template #default>
          <el-button type="primary" size="small" @click="loadDashboard">重试</el-button>
        </template>
      </el-alert>

      <el-empty v-else-if="projects.length === 0" description="当前筛选条件下没有可展示的项目。" />

      <div v-else class="overview-list">
        <el-card v-for="project in projects" :key="project.projectId" class="overview-project" shadow="never"
          @click="handleProjectCardClick($event, project)">
          <div class="overview-project__main">

            <div class="overview-project__identity">
              <span class="mono">{{ formatProjectCode(project.projectCode) }}</span>
              <strong>{{ project.projectName }}</strong>
            </div>

            <div class="overview-project__dates">
              <span>客户名称</span>
              <strong>{{ project.customerName || '-' }}</strong>
            </div>

            <div class="overview-project__dates">
              <span>商务负责</span>
              <strong>{{ project.businessResponsibleUser?.name || '-' }}</strong>
            </div>

            <div class="overview-project__dates">
              <span>项目经理</span>
              <strong>{{ project.projectManagerUser?.name || '-' }}</strong>
            </div>

            <div class="overview-project__dates">
              <span>技术负责人</span>
              <strong>{{ project.technicalResponsibleUser?.name || '-' }}</strong>
            </div>

            <StatusBadge :status="project.status" />

            <div class="overview-project__stage">
              <span>当前阶段</span>
              <strong>{{ formatCurrentStage(project) }}</strong>
              <small v-if="project.currentStageIssue">{{ formatStageIssue(project.currentStageIssue) }}</small>
              <small v-else-if="project.status === 'ended'">结束原因：{{ project.endedReason || '-' }}</small>
            </div>

            <div class="overview-project__dates">
              <span>立项日期</span>
              <strong>{{ project.initiationDate ? formatDate(project.initiationDate) : '-' }}</strong>
            </div>
          </div>

        </el-card>
      </div>
    </el-card>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getProjectOverviewDashboard } from '../api/projects.js';
import { getProjectNavigation } from '../api/navigation.js';
import { toReadableApiError } from '../api/http.js';
import PageHeader from '../components/PageHeader.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatProjectCode } from '../utils/format.js';

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
const navigatingProjectId = ref(null);
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

  if (project.status === 'ended') {
    return '项目已结束';
  }

  return formatStageIssue(project.currentStageIssue) || '-';
}

function formatStageIssue(issue) {
  return stageIssueText[issue] || '';
}

function findCurrentNavigationStage(project, navigation) {
  const stages = Array.isArray(navigation?.children) ? navigation.children : [];
  return stages.find((stage) => String(stage.stageId) === String(project.currentStageId))
    || stages.find((stage) => Number(stage.stageOrder) === Number(project.currentStageOrder))
    || stages.find((stage) => stage.isCurrent)
    || null;
}

function findActiveNavigationNode(stage) {
  const nodes = Array.isArray(stage?.children) ? stage.children : [];
  const statusPriority = ['RETURNED', 'WAIT_APPROVAL', 'PROCESSING', 'FAILED', 'PENDING', 'COMPLETED'];

  for (const status of statusPriority) {
    const node = nodes.find((item) => item.status === status && (item.route || item.nodeKey || item.nodeCode));
    if (node) {
      return node;
    }
  }

  return null;
}

function buildNodeRoute(projectId, node) {
  if (node?.route) {
    return node.route;
  }

  const nodeKey = node?.nodeKey || node?.nodeCode;
  return nodeKey ? `/projects/${projectId}/node/${encodeURIComponent(nodeKey)}` : '';
}

async function navigateToProject(project) {
  const fallbackRoute = `/projects/${project.projectId}`;
  if (!project.currentStageId || ['completed', 'ended'].includes(project.status)) {
    props.navigate(fallbackRoute);
    return;
  }

  if (String(navigatingProjectId.value) === String(project.projectId)) {
    return;
  }

  navigatingProjectId.value = project.projectId;

  try {
    const navigation = await getProjectNavigation(project.projectId, props.authToken);
    const currentStage = findCurrentNavigationStage(project, navigation);
    const activeNode = findActiveNavigationNode(currentStage);
    props.navigate(buildNodeRoute(project.projectId, activeNode) || fallbackRoute);
  } catch (error) {
    // 导航定位失败不应阻止用户进入项目，退回工作区默认定位逻辑。
    props.navigate(fallbackRoute);
  } finally {
    navigatingProjectId.value = null;
  }
}

function isInteractiveElement(element) {
  return Boolean(
    element?.closest?.(
      'button, a, input, select, textarea, [role="button"], .el-select, .el-input, .el-collapse, .el-collapse-item__header'
    )
  );
}

async function handleProjectCardClick(event, project) {
  if (isInteractiveElement(event.target)) {
    return;
  }

  await navigateToProject(project);
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

<style>
.page-stack {
  max-width: 1500px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
