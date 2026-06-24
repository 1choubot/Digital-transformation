<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">我的责任资料</span>
        <h2>我的资料任务</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        <p class="manual-status-note">
          这里展示的是分配给我的资料项。资料状态表示资料级审核进度，不代表文件已上传，也不代表在线表单已填写。
        </p>
      </div>
      <button type="button" class="ghost-button" :disabled="loading" @click="loadTasks">
        {{ loading ? '加载中...' : '重新加载' }}
      </button>
    </div>

    <section class="panel task-filter-panel">
      <div class="task-filters">
        <label>
          <span>状态筛选</span>
          <select v-model="selectedStatus" :disabled="loading" @change="loadTasks">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>项目关键字</span>
          <input
            v-model.trim="projectKeyword"
            type="search"
            autocomplete="off"
            placeholder="项目编号或项目名称"
          />
        </label>
      </div>
    </section>

    <section class="panel task-list-panel">
      <div class="panel-toolbar">
        <div>
          <strong>任务列表</strong>
          <span>共 {{ filteredTasks.length }} 项，按后端任务优先级排序。</span>
        </div>
      </div>

      <div v-if="loading" class="state-panel state-panel--inline">
        <p>正在加载我的资料任务...</p>
      </div>

      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>我的资料任务加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="loadTasks">重试</button>
      </div>

      <div v-else-if="filteredTasks.length === 0" class="state-panel state-panel--inline">
        <h3>暂无匹配资料任务</h3>
        <p>当前筛选下没有分配给我的适用资料项。</p>
      </div>

      <div v-else class="task-table">
        <div class="task-table__head">
          <span>项目</span>
          <span>阶段</span>
          <span>资料项</span>
          <span>类型</span>
          <span>状态</span>
          <span>审核退回原因</span>
          <span>责任更新时间</span>
          <span>操作</span>
        </div>

        <article v-for="task in filteredTasks" :key="task.documentId" class="task-table__row">
          <div class="task-cell task-cell--project">
            <span class="mono">{{ task.projectCode }}</span>
            <strong>{{ task.projectName }}</strong>
          </div>
          <div class="task-cell">
            <span>{{ task.stageName || `第 ${task.stageOrder} 阶段` }}</span>
            <small>第 {{ task.stageOrder }} 阶段</small>
          </div>
          <div class="task-cell task-cell--document">
            <span class="mono">{{ task.documentCode }}</span>
            <strong>{{ task.documentName }}</strong>
          </div>
          <span>{{ formatTaskRequired(task.isRequired) }}</span>
          <StatusBadge :status="task.status" />
          <span>{{ task.returnReason || '-' }}</span>
          <time>{{ formatDateTime(task.responsibilityUpdatedAt) }}</time>
          <button type="button" class="ghost-button" @click="navigate(`/projects/${task.projectId}`)">
            查看项目
          </button>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { listMyStageDocumentTasks } from '../api/me.js';
import { toReadableApiError } from '../api/http.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDateTime, formatUser } from '../utils/format.js';

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

const statusOptions = [
  { value: 'pending', label: '待办' },
  { value: 'returned', label: '已退回' },
  { value: 'not_submitted', label: '待提交' },
  { value: 'submitted', label: '已提交审核' },
  { value: 'confirmed', label: '审核通过' },
  { value: 'all', label: '全部状态' }
];

const selectedStatus = ref('pending');
const projectKeyword = ref('');
const loading = ref(false);
const errorMessage = ref('');
const tasks = ref([]);

const filteredTasks = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return tasks.value;
  }

  return tasks.value.filter((task) => {
    const haystack = `${task.projectCode || ''} ${task.projectName || ''}`.toLowerCase();
    return haystack.includes(keyword);
  });
});

function formatTaskRequired(value) {
  return value ? '必填' : '建议';
}

async function loadTasks() {
  loading.value = true;
  errorMessage.value = '';

  try {
    tasks.value = await listMyStageDocumentTasks({ status: selectedStatus.value }, props.authToken);
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

onMounted(loadTasks);
</script>
