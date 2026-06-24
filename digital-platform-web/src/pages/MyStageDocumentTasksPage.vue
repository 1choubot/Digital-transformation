<template>
  <section class="page-stack">
    <!-- 精简标题行 -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">我的责任资料</span>
        <h2>我的资料任务</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        <p class="manual-status-note">
          这里展示的是分配给我的资料项。资料状态为手工标记状态，不代表文件已上传，也不代表在线表单已填写。
        </p>
      </div>
      <button type="button" class="ghost-button" :disabled="loading" @click="loadTasks">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
        {{ loading ? '加载中...' : '重新加载' }}
      </button>
    </div>

    <!-- 筛选面板 -->
    <section class="panel task-filter-panel">
      <div class="task-filters">
        <label class="filter-status">
          <span>状态筛选</span>
          <select v-model="selectedStatus" :disabled="loading" @change="loadTasks">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="filter-keyword">
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

    <!-- 任务列表面板 -->
    <section class="panel">
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
          <span>退回原因</span>
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
          <div class="task-cell">
            <span>{{ formatTaskRequired(task.isRequired) }}</span>
          </div>
          <div class="task-cell">
            <StatusBadge :status="task.status" />
          </div>
          <div class="task-cell">
            <span>{{ task.returnReason || '-' }}</span>
          </div>
          <div class="task-cell">
            <time>{{ formatDateTime(task.responsibilityUpdatedAt) }}</time>
          </div>
          <div class="task-cell task-cell--action">
            <button type="button" class="ghost-button" @click="navigate(`/projects/${task.projectId}`)">
              查看项目
            </button>
          </div>
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
  { value: 'submitted', label: '已提交' },
  { value: 'confirmed', label: '已确认' },
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
  flex: 1;
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
  margin: 0.2rem 0 0 0;
  font-size: 0.8rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border-left: 3px solid #94a3b8;
  line-height: 1.5;
  max-width: 720px;
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
  padding: 0.6rem 1.6rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.primary-button:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

/* ===== 面板 ===== */
.panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 1.25rem 1.5rem;
  margin-bottom: 0;
  transition: box-shadow 0.2s ease;
}

.panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.panel + .panel {
  margin-top: 1rem;
}

/* ===== 筛选栏 ===== */
.task-filter-panel {
  padding: 1rem 1.5rem;
}

.task-filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1rem 2rem;
}

.filter-status,
.filter-keyword {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.filter-status select,
.filter-keyword input {
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.85rem;
  color: #0f172a;
  transition: border 0.2s ease, box-shadow 0.2s ease;
  font-weight: 400;
  min-width: 160px;
}

.filter-status select:focus,
.filter-keyword input:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.filter-status select:disabled,
.filter-keyword input:disabled {
  background: #f1f5f9;
  opacity: 0.7;
}

.filter-keyword input {
  min-width: 220px;
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

/* ===== 表格 ===== */
.task-table {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.task-table__head {
  display: grid;
  grid-template-columns: 1.2fr 0.7fr 1.2fr 0.5fr 0.7fr 0.9fr 0.9fr 0.6fr;
  gap: 0.4rem 0.6rem;
  padding: 0.5rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 8px;
  align-items: center;
}

.task-table__row {
  display: grid;
  grid-template-columns: 1.2fr 0.7fr 1.2fr 0.5fr 0.7fr 0.9fr 0.9fr 0.6fr;
  gap: 0.4rem 0.6rem;
  padding: 0.6rem 0.6rem;
  background: white;
  border-radius: 8px;
  align-items: center;
  transition: background 0.15s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
}

.task-table__row:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* ===== 单元格 ===== */
.task-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.task-cell--project strong,
.task-cell--document strong {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.85rem;
  word-break: break-word;
}

.task-cell small {
  font-size: 0.65rem;
  color: #94a3b8;
}

.task-cell--action {
  align-items: center;
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  color: #475569;
  background: #f1f5f9;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  display: inline-block;
  letter-spacing: 0.02em;
  width: fit-content;
}

.task-table__row > .task-cell > span:not(.mono) {
  font-size: 0.85rem;
  color: #1e293b;
}

.task-table__row time {
  font-size: 0.75rem;
  color: #475569;
}

/* ===== 操作按钮 ===== */
.task-table__row .ghost-button {
  padding: 0.25rem 0.8rem;
  font-size: 0.7rem;
  border-radius: 24px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  box-shadow: none;
  min-width: auto;
}

.task-table__row .ghost-button:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: none;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .task-table__head,
  .task-table__row {
    grid-template-columns: 1.1fr 0.6fr 1.1fr 0.5fr 0.6fr 0.8fr 0.8fr 0.6fr;
    gap: 0.3rem 0.5rem;
  }
}

@media (max-width: 992px) {
  .page-stack {
    padding: 1.25rem 1rem;
  }

  .page-title-row {
    padding: 0;
    margin-bottom: 1rem;
  }

  .panel {
    padding: 1rem 1.25rem;
  }

  .task-table__head,
  .task-table__row {
    grid-template-columns: 1fr 0.6fr 1fr 0.5fr 0.6fr 0.8fr 0.8fr 0.5fr;
    font-size: 0.75rem;
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

  .task-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .filter-status select,
  .filter-keyword input {
    min-width: 100%;
  }

  .task-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .task-table__head,
  .task-table__row {
    min-width: 780px;
    grid-template-columns: 1fr 0.6fr 1fr 0.5fr 0.6fr 0.8fr 0.8fr 0.5fr;
    padding: 0.5rem 0.6rem;
  }

  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .manual-status-note {
    max-width: 100%;
    font-size: 0.75rem;
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

  .ghost-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }

  .panel {
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
  }

  .task-table__head,
  .task-table__row {
    min-width: 680px;
    font-size: 0.7rem;
    gap: 0.25rem 0.35rem;
    padding: 0.4rem 0.4rem;
  }

  .task-cell--project strong,
  .task-cell--document strong {
    font-size: 0.75rem;
  }

  .task-table__row time {
    font-size: 0.65rem;
  }

  .task-table__row .ghost-button {
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

  .manual-status-note {
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
  }
}
</style>