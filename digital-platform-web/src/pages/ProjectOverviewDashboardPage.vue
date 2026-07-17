<template>
  <section class="page-stack project-overview-dashboard-page">
    <PageHeader title="项目总览">
      <template #actions>
        <!-- <el-button :loading="loading" @click="loadDashboard">重新加载</el-button> -->
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
          <el-statistic title="我的待办" :value="summary.myPendingTasks" />
        </el-card>
      </el-col>
    </el-row>


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
          <strong>项目总览列表  </strong>
          <span>共 {{ projects.length }} 个项目</span>
        </div>
      </template>

      <el-alert v-if="errorMessage" title="项目总览加载失败" :description="errorMessage" type="error" show-icon
        :closable="false">
        <template #default>
          <el-button type="primary" size="small" @click="loadDashboard">重试</el-button>
        </template>
      </el-alert>

      <el-table
        v-else
        v-loading="loading"
        class="overview-project-table"
        :data="sortedProjects"
        :row-key="projectRowKey"
        border
        stripe
        empty-text="当前筛选条件下没有可展示的项目。"
        @row-click="handleProjectRowClick"
      >
        <el-table-column label="项目编号" width="136" fixed="left" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="overview-project-table__code mono">{{ formatProjectCode(row.projectCode) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="项目名称" width="210" fixed="left">
          <template #default="{ row }">
            <el-tooltip :content="row.projectName || '-'" placement="top" :show-after="300">
              <el-button
                class="overview-project-table__project-link"
                link
                type="primary"
                :loading="String(navigatingProjectId) === String(row.projectId)"
                @click="navigateToProject(row)"
              >{{ row.projectName || '-' }}</el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户名称" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerName || '-' }}</template>
        </el-table-column>
        <el-table-column label="商务负责" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.businessResponsibleUser?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="项目经理" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.projectManagerUser?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="技术负责人" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.technicalResponsibleUser?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="项目状态" width="100" align="center">
          <template #default="{ row }"><StatusBadge :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="当前阶段" min-width="230">
          <template #default="{ row }">
            <el-tooltip :content="formatCurrentStage(row)" placement="top" :show-after="300">
              <strong class="overview-project-table__stage-name">{{ formatCurrentStage(row) }}</strong>
            </el-tooltip>
            <small v-if="row.currentStageIssue" class="overview-project-table__stage-note">
              {{ formatStageIssue(row.currentStageIssue) }}
            </small>
            <small v-else-if="row.status === 'ended'" class="overview-project-table__stage-note">
              结束原因：{{ row.endedReason || '-' }}
            </small>
          </template>
        </el-table-column>
        <el-table-column label="立项日期" width="120" align="center">
          <template #default="{ row }">{{ row.initiationDate ? formatDate(row.initiationDate) : '-' }}</template>
        </el-table-column>
        <el-table-column label="待办提醒" width="112" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.hasMyPendingTasks"
              content="当前项目存在待填写资料或待处理事项"
              placement="left"
            >
              <span
                class="overview-project-table__pending-badge"
                role="img"
                aria-label="当前项目存在待填写资料或待处理事项"
              ><span aria-hidden="true">★</span> 待办</span>
            </el-tooltip>
            <span v-else class="overview-project-table__no-pending" aria-label="无待办事项">-</span>
          </template>
        </el-table-column>
      </el-table>
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
import { findProjectNavigationTarget } from '../utils/projectNavigation.js';

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
  myPendingTasks: 0
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
// Only promote pending projects; Array#sort is stable, so each group keeps the backend order.
const sortedProjects = computed(() => [...projects.value].sort(
  (left, right) => Number(Boolean(right.hasMyPendingTasks)) - Number(Boolean(left.hasMyPendingTasks))
));

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
    const target = findProjectNavigationTarget(navigation, {
      stageId: project.currentStageId,
      stageOrder: project.currentStageOrder
    });
    props.navigate(target?.route || fallbackRoute);
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

function projectRowKey(project) {
  return project.projectId;
}

async function handleProjectRowClick(project, _column, event) {
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
