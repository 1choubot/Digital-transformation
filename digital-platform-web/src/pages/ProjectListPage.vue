<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">项目台账</span>
        <h2>项目列表</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button
        v-if="canCreateProject"
        type="button"
        class="primary-button"
        @click="navigate('/projects/new')"
      >
        新建项目
      </button>
    </div>

    <section class="panel">
      <div class="panel-toolbar">
        <div>
          <strong>后端数据源</strong>
          <span>{{ apiBaseUrl }}</span>
        </div>
        <button type="button" class="ghost-button" :disabled="loading" @click="loadProjects">
          重新加载
        </button>
      </div>

      <div v-if="loading" class="state-panel state-panel--inline">
        <p>正在加载项目数据...</p>
      </div>

      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>项目列表加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="loadProjects">重试</button>
      </div>

      <div v-else-if="projects.length === 0" class="state-panel state-panel--inline">
        <h3>暂无项目</h3>
        <p v-if="!canCreateProject">当前账号暂无可见项目。</p>
        <button
          v-else
          type="button"
          class="primary-button"
          @click="navigate('/projects/new')"
        >
          新建项目
        </button>
      </div>

      <div v-else class="project-table">
        <div class="project-table__head">
          <span>项目编号</span>
          <span>项目名称</span>
          <span>客户</span>
          <span>模式</span>
          <span>项目经理</span>
          <span>项目状态</span>
          <span>当前阶段</span>
          <span>创建人</span>
          <span>计划时间</span>
          <span>操作</span>
        </div>

        <article v-for="project in projects" :key="project.id" class="project-table__row">
          <span class="mono">{{ formatProjectCode(project.projectCode) }}</span>
          <strong>{{ project.projectName }}</strong>
          <span>{{ project.customerName }} / {{ project.customerContactPerson || '-' }}</span>
          <span>{{ formatProjectMode(project.projectMode) }}</span>
          <span>{{ formatUser(project.projectManagerUser) }}</span>
          <StatusBadge :status="project.status" />
          <span>{{ project.currentStage?.stageName || '-' }}</span>
          <span>{{ formatUser(project.createdBy) }}</span>
          <span>{{ formatDate(project.plannedStartDate) }} 至 {{ formatDate(project.plannedEndDate) }}</span>
          <button type="button" class="ghost-button" @click="navigate(`/projects/${project.id}`)">查看详情</button>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getApiBaseUrlLabel, listProjects, toReadableApiError } from '../api/projects.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatProjectCode, formatProjectMode, formatUser } from '../utils/format.js';

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

const apiBaseUrl = getApiBaseUrlLabel();
const loading = ref(false);
const errorMessage = ref('');
const projects = ref([]);
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);

async function loadProjects() {
  loading.value = true;
  errorMessage.value = '';

  try {
    projects.value = await listProjects(props.authToken);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadProjects);
</script>
