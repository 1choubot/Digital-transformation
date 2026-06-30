<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">我的待办</span>
        <h2>我的工作台</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        <p class="manual-status-note">
          工作台汇总需要当前账号处理的资料责任、资料审核（含 1.2 节点审批）和阶段推进事项。
        </p>
      </div>
      <button type="button" class="ghost-button" :disabled="loading" @click="loadWorkbench">
        {{ loading ? '加载中...' : '重新加载' }}
      </button>
    </div>

    <section class="panel task-filter-panel">
      <div class="stage-advance-summary">
        <div>
          <span>总待办</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div v-for="option in typeOptions" :key="option.value">
          <span>{{ option.label }}</span>
          <strong>{{ summaryCountForType(option.value) }}</strong>
        </div>
      </div>

      <div class="task-filters">
        <label>
          <span>待办类型</span>
          <select v-model="selectedType" :disabled="loading">
            <option value="all">全部待办</option>
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">
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
          <strong>待办列表</strong>
          <span>共 {{ filteredItems.length }} 项，按待办类型和更新时间排序。</span>
        </div>
      </div>

      <div v-if="loading" class="state-panel state-panel--inline">
        <p>正在加载我的工作台...</p>
      </div>

      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>我的工作台加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="loadWorkbench">重试</button>
      </div>

      <div v-else-if="filteredItems.length === 0" class="state-panel state-panel--inline">
        <h3>暂无匹配待办</h3>
        <p>当前筛选下没有需要你处理的事项。</p>
      </div>

      <div v-else class="task-table">
        <div class="task-table__head">
          <span>项目</span>
          <span>阶段</span>
          <span>资料项</span>
          <span>类型</span>
          <span>完成规则</span>
          <span>状态</span>
          <span>动作</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>

        <article v-for="item in filteredItems" :key="itemKey(item)" class="task-table__row">
          <div class="task-cell task-cell--project">
            <span class="mono">{{ formatProjectCode(item.projectCode) }}</span>
            <strong>{{ item.projectName }}</strong>
          </div>
          <div class="task-cell">
            <span>{{ item.stageName || `第 ${item.stageOrder} 阶段` }}</span>
            <small>第 {{ item.stageOrder }} 阶段</small>
          </div>
          <div class="task-cell task-cell--document">
            <span class="mono">{{ item.documentCode || '-' }}</span>
            <strong>{{ item.documentName || '-' }}</strong>
          </div>
          <span>{{ formatTodoType(item.type, item) }}</span>
          <span>{{ item.completionMode ? formatCompletionMode(item.completionMode) : '-' }}</span>
          <span>{{ item.completionStatus ? formatCompletionStatus(item.completionStatus) : formatStatus(item.status) }}</span>
          <span>{{ formatActionText(item) }}</span>
          <time>{{ formatDateTime(item.updatedAt || item.createdAt) }}</time>
          <button type="button" class="ghost-button" @click="openTodo(item)">
            处理
          </button>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getMyWorkbench } from '../api/me.js';
import { toReadableApiError } from '../api/http.js';
import {
  formatCompletionMode,
  formatCompletionStatus,
  formatDateTime,
  formatProjectCode,
  formatStatus,
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

const typeOptions = [
  { value: 'document_responsibility', label: '我负责的资料' },
  { value: 'document_review', label: '待我审核的资料' },
  { value: 'stage_advance', label: '待我推进阶段' }
];

const selectedType = ref('all');
const projectKeyword = ref('');
const loading = ref(false);
const errorMessage = ref('');
const items = ref([]);
const summary = ref({
  total: 0,
  byType: {}
});

const filteredItems = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase();
  return items.value.filter((item) => {
    if (selectedType.value === 'document_review') {
      if (!['document_review', 'initiation_review'].includes(item.type)) {
        return false;
      }
    } else if (selectedType.value !== 'all' && item.type !== selectedType.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = `${item.projectCode || ''} ${item.projectName || ''}`.toLowerCase();
    return haystack.includes(keyword);
  });
});

function summaryCountForType(type) {
  if (type === 'document_review') {
    return (summary.value.byType?.document_review || 0) + (summary.value.byType?.initiation_review || 0);
  }

  return summary.value.byType?.[type] || 0;
}

function itemKey(item) {
  return [item.type, item.projectId, item.stageId || '', item.documentId || '', item.nodeKey || ''].join(':');
}

function formatTodoType(type, item = null) {
  if (type === 'initiation_review') {
    return '待我审核的资料';
  }

  if (item?.revisionRequired && type === 'document_responsibility') {
    return '需返工资料';
  }

  return typeOptions.find((option) => option.value === type)?.label || type || '-';
}

function formatActionText(item) {
  if (item.type === 'initiation_review') {
    return item.nodeName || item.actionText || '-';
  }

  return item.actionText || '-';
}

function openTodo(item) {
  props.navigate(item.targetRoute || `/projects/${item.projectId}`);
}

async function loadWorkbench() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await getMyWorkbench(props.authToken);
    items.value = Array.isArray(result?.items) ? result.items : [];
    summary.value = result?.summary || { total: items.value.length, byType: {} };
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

onMounted(loadWorkbench);
</script>
