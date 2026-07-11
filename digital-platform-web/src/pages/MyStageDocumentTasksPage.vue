<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="我的待办"
      title="我的工作台"
      :current-user="currentUser"
      subtitle="工作台汇总待我填写资料、待我评价/审批和方案设计事项，进入项目工作区后只定位目标，不自动打开在线表单。"
    >
      <template #actions>
        <el-button :loading="loading" @click="loadWorkbench">重新加载</el-button>
      </template>
    </PageHeader>

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
          <el-select v-model="selectedType" :disabled="loading">
            <el-option label="全部待办" value="all" />
            <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </label>
        <label>
          <span>项目关键字</span>
          <el-input
            v-model.trim="projectKeyword"
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

      <el-skeleton v-if="loading" :rows="5" animated />

      <el-alert v-else-if="errorMessage" title="我的工作台加载失败" :description="errorMessage" type="error" show-icon :closable="false">
        <template #default><el-button type="primary" size="small" @click="loadWorkbench">重试</el-button></template>
      </el-alert>

      <el-empty v-else-if="filteredItems.length === 0" description="当前筛选下没有需要你处理的事项。" />

      <div v-else class="task-list">
        <article
          v-for="item in filteredItems"
          :key="itemKey(item)"
          class="task-card"
          :class="`task-card--${taskTone(item)}`"
        >
          <div class="task-card__header">
            <div class="task-cell task-cell--project">
              <span class="mono">{{ formatProjectCode(item.projectCode) }}</span>
              <strong>{{ item.projectName }}</strong>
            </div>
            <span class="stage-document-pill">{{ formatTodoType(item.type, item) }}</span>
          </div>

          <div class="task-card__meta">
            <div>
              <span>阶段</span>
              <strong>{{ item.stageName || `第 ${item.stageOrder} 阶段` }}</strong>
              <small>第 {{ item.stageOrder }} 阶段</small>
            </div>
            <div>
              <span>{{ isSolutionDesignTodo(item) ? '节点' : '资料项' }}</span>
              <strong>{{ formatTodoSubject(item) }}</strong>
              <small class="mono">{{ formatTodoSubjectCode(item) }}</small>
            </div>
            <div>
              <span>{{ isSolutionDesignTodo(item) ? '版本' : '完成规则' }}</span>
              <strong>{{ formatTodoRule(item) }}</strong>
            </div>
            <div>
              <span>状态</span>
              <strong>{{ formatTodoStatus(item) }}</strong>
            </div>
            <div>
              <span>更新时间</span>
              <time>{{ formatDateTime(item.updatedAt || item.createdAt) }}</time>
            </div>
          </div>

          <div v-if="item.blockingReasons?.length" class="task-card__blocking">
            <span>阻塞原因</span>
            <ul>
              <li v-for="reason in item.blockingReasons" :key="reason">{{ reason }}</li>
            </ul>
          </div>

          <div class="task-card__footer">
            <div>
              <span>入口动作</span>
              <strong>{{ formatActionText(item) }}</strong>
            </div>
            <el-button type="primary" @click="openTodo(item)">进入项目工作区</el-button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getMyWorkbench } from '../api/me.js';
import { toReadableApiError } from '../api/http.js';
import PageHeader from '../components/PageHeader.vue';
import {
  formatCompletionMode,
  formatCompletionStatus,
  formatDateTime,
  formatProjectCode,
  formatStatus
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
  { value: 'document_responsibility', label: '待我填写资料' },
  { value: 'document_review', label: '待我评价/审批' },
  { value: 'solution_design_workflow', label: '方案设计待办' }
];

const solutionDesignStatusText = {
  not_started: '未开始',
  pending: '待提交',
  pending_review: '待审批',
  pending_general_review: '待总经理审批',
  returned: '已退回',
  approved: '已通过',
  skipped: '已跳过',
  ended: '已结束'
};

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
  return [
    item.type,
    item.projectId,
    item.stageId || '',
    item.documentId || '',
    item.nodeKey || '',
    item.actionKey || item.actionText || ''
  ].join(':');
}

function formatTodoType(type, item = null) {
  if (type === 'initiation_review') {
    return '待我评价/审批';
  }

  if (item?.revisionRequired && type === 'document_responsibility') {
    return '待我填写资料';
  }

  return typeOptions.find((option) => option.value === type)?.label || type || '-';
}

function isSolutionDesignTodo(item) {
  return item?.type === 'solution_design_workflow' || item?.taskType === 'solution_design_workflow';
}

function formatTodoSubject(item) {
  return isSolutionDesignTodo(item) ? item.nodeName || item.nodeKey || '-' : item.documentName || '-';
}

function formatTodoSubjectCode(item) {
  return isSolutionDesignTodo(item) ? item.nodeKey || '-' : item.documentCode || '-';
}

function formatTodoRule(item) {
  return isSolutionDesignTodo(item)
    ? `v${item.revision || 1}`
    : item.completionMode
      ? formatCompletionMode(item.completionMode)
      : '-';
}

function formatTodoStatus(item) {
  if (item.completionStatus) {
    return formatCompletionStatus(item.completionStatus);
  }

  if (isSolutionDesignTodo(item)) {
    return solutionDesignStatusText[item.status] || formatStatus(item.status);
  }

  return formatStatus(item.status);
}

function taskTone(item) {
  if (item.type === 'stage_advance') {
    return 'stage';
  }

  if (isSolutionDesignTodo(item)) {
    return 'solution';
  }

  if (item.type === 'document_review' || item.type === 'initiation_review') {
    return 'review';
  }

  return 'document';
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

<style>
.page-stack {
  max-width: 1500px;
  /* 最大宽度限制 */
  margin: 0 auto;
  /* 水平居中 */
  padding: 1.5rem;
  /* 内边距 */
}
</style>
