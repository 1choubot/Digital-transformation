<template>
  <section class="page-stack animate-fadeIn">
    <!-- 说明提示 -->
    <p class="manual-status-note">
      提示：这里展示的是分配给您的资料项。资料状态为手工标记状态，不代表文件已上传或在线表单已填写。
    </p>

    <!-- 筛选面板（整合重新加载按钮） -->
    <section class="panel task-filter-panel">
      <div class="task-filters">
        <label class="filter-group">
          <span class="filter-label">状态筛选</span>
          <div class="select-wrapper">
            <select v-model="selectedStatus" :disabled="loading" @change="loadTasks">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </label>

        <label class="filter-group flex-1">
          <span class="filter-label">项目关键字</span>
          <div class="input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model.trim="projectKeyword"
              type="search"
              autocomplete="off"
              placeholder="搜索项目编号或项目名称..."
              @input="handleSearchInput"
            />
          </div>
        </label>

        <div class="filter-actions">
          <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadTasks">
            <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
            </svg>
            <span>{{ loading ? '加载中...' : '重新加载' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 任务列表面板 -->
    <section class="panel task-list-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">任务列表</strong>
          <span class="toolbar-subtitle">共 {{ filteredTasks.length }} 项，已按后端优先级从高到低排序</span>
        </div>
      </div>

      <!-- 数据加载中 -->
      <div v-if="loading" class="state-panel state-panel--inline">
        <div class="loading-wave">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <p>正在努力加载您的专属资料任务，请稍候...</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div class="error-details">
          <h3>资料任务加载失败</h3>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="primary-button inline-btn" @click="loadTasks">重试</button>
      </div>

      <!-- 暂无数据 -->
      <div v-else-if="filteredTasks.length === 0" class="state-panel state-panel--empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h3>暂无匹配的资料任务</h3>
        <p>当前筛选条件下，没有分配给您的适用资料项。</p>
      </div>

      <!-- 任务表格 -->
      <div v-else class="table-container">
        <div class="task-table">
          <div class="task-table__head">
            <span>项目信息</span>
            <span>当前阶段</span>
            <span>资料项名称</span>
            <span>资料类型</span>
            <span>当前状态</span>
            <span>退回原因</span>
            <span>责任更新时间</span>
            <span class="text-right">操作</span>
          </div>

          <div class="task-table__body">
            <article v-for="task in paginatedTasks" :key="task.documentId" class="task-table__row">
              <div class="task-cell task-cell--project">
                <span class="mono-badge">{{ task.projectCode }}</span>
                <strong class="project-name">{{ task.projectName }}</strong>
              </div>
              <div class="task-cell task-cell--stage">
                <span class="stage-text">{{ task.stageName || `第 ${task.stageOrder} 阶段` }}</span>
                <span class="stage-sub">第 {{ task.stageOrder }} 阶段</span>
              </div>
              <div class="task-cell task-cell--document">
                <span class="mono-code">{{ task.documentCode }}</span>
                <strong class="document-name">{{ task.documentName }}</strong>
              </div>
              <div class="task-cell">
                <span :class="['type-badge', task.isRequired ? 'type-badge--required' : 'type-badge--suggest']">
                  {{ formatTaskRequired(task.isRequired) }}
                </span>
              </div>
              <div class="task-cell">
                <StatusBadge :status="task.status" />
              </div>
              <div class="task-cell task-cell--reason">
                <span :class="{ 'reason-text': task.returnReason, 'empty-placeholder': !task.returnReason }">
                  {{ task.returnReason || '-' }}
                </span>
              </div>
              <div class="task-cell">
                <time class="time-text">{{ formatDateTime(task.responsibilityUpdatedAt) }}</time>
              </div>
              <div class="task-cell text-right">
                <button type="button" class="action-button" @click="navigate(`/projects/${task.projectId}`)">
                  <span>查看项目</span>
                  <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- 分页控制面板 -->
    <footer v-if="filteredTasks.length > 0" class="panel pagination-panel">
      <div class="pagination-info">
        <span>当前第</span>
        <span class="page-current-highlight">{{ currentPage }}</span>
        <span>/ {{ totalPages }} 页</span>
        <span class="divider">|</span>
        <span>共筛选出 {{ filteredTasks.length }} 项</span>
        <span v-if="projectKeyword" class="search-indicator">（搜索: {{ projectKeyword }}）</span>
      </div>

      <div class="pagination-controls">
        <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(1)">
          首页
        </button>
        <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
          上一页
        </button>
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
        <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
          下一页
        </button>
        <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(totalPages)">
          尾页
        </button>
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

    <!-- Toast 消息弹出浮层 -->
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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

// 筛选与数据状态
const selectedStatus = ref('pending');
const projectKeyword = ref('');
const loading = ref(false);
const errorMessage = ref('');
const tasks = ref([]);

// 分页状态
const currentPage = ref(1);
const pageSize = ref(5); // 默认每页5项

// Toast 控制
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = false;
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

const statusOptions = [
  { value: 'pending', label: '待办' },
  { value: 'returned', label: '已退回' },
  { value: 'not_submitted', label: '待提交' },
  { value: 'submitted', label: '已提交' },
  { value: 'confirmed', label: '已确认' },
  { value: 'all', label: '全部状态' }
];

// 前端过滤（基于项目关键字）
const filteredTasks = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase();
  if (!keyword) return tasks.value;
  return tasks.value.filter((task) => {
    const haystack = `${task.projectCode || ''} ${task.projectName || ''}`.toLowerCase();
    return haystack.includes(keyword);
  });
});

// 分页计算
const totalPages = computed(() => {
  return Math.ceil(filteredTasks.value.length / pageSize.value) || 1;
});

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredTasks.value.slice(start, end);
});

// 可见页码（最多5个）
const visiblePages = computed(() => {
  const range = [];
  const maxButtons = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages.value, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  return range;
});

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

// 搜索时重置页码
function handleSearchInput() {
  currentPage.value = 1;
}

function formatTaskRequired(value) {
  return value ? '必填' : '建议';
}

async function loadTasks() {
  loading.value = true;
  errorMessage.value = '';

  try {
    tasks.value = await listMyStageDocumentTasks({ status: selectedStatus.value }, props.authToken);
    // 加载完成后重置页码
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

onMounted(loadTasks);
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
  position: relative;
  background: transparent;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* ===== 说明提示 ===== */
.manual-status-note {
  margin: 0 0 0.25rem 0;
  font-size: 0.85rem;
  color: #3e63dd;
  line-height: 1.5;
  background: #ecf5ff;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  border-left: 3px solid #a4b3ff;
}

/* ===== 面板卡片 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
}

/* ===== 筛选面板 ===== */
.task-filter-panel {
  padding: 1.25rem 1.5rem;
}

.task-filters {
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

.flex-1 {
  flex: 1;
  min-width: 280px;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}

.select-wrapper {
  position: relative;
  width: 180px;
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

.select-wrapper select:focus {
  border-color: #3e63dd;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  transition: all 0.2s;
  padding-left: 0.75rem;
  height: 36px;
}

.input-wrapper:focus-within {
  border-color: #3e63dd;
}

.search-icon {
  width: 16px;
  height: 16px;
  stroke: #c0c4cc;
  flex-shrink: 0;
}

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
}

/* ===== 按钮样式 ===== */
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
  transition: all 0.2s ease;
  height: 36px;
}

.ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}

.primary-button:hover:not(:disabled) {
  background: #5275e7;
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  stroke: currentColor;
}

/* ===== 列表面板 ===== */
.task-list-panel {
  display: flex;
  flex-direction: column;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
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

/* ===== 状态面板（加载/错误/空） ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.state-panel--inline {
  padding: 3.5rem 1.5rem;
}

.state-panel h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  margin-bottom: 0.5rem;
}

.state-panel p {
  font-size: 0.9rem;
  color: #909399;
  max-width: 480px;
}

.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1rem;
}

.wave-bar {
  width: 4px;
  height: 20px;
  background: #3e63dd;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #c0c4cc;
  margin-bottom: 1rem;
}

.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  margin: 1.5rem;
  padding: 2.5rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1.25rem;
}

/* ===== 表格 ===== */
.table-container {
  overflow-x: auto;
  width: 100%;
}

.task-table {
  min-width: 1100px;
  width: 100%;
}

.task-table__head {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.2fr 1.5fr 1.5fr 1.2fr;
  padding: 0.7rem 1.5rem;
  background: #f4f6f9;
  border-bottom: 1px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #606266;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.task-table__row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.2fr 1.5fr 1.5fr 1.2fr;
  padding: 1rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s ease;
}

.task-table__row:hover {
  background: #f8fafc;
}

.task-table__row:last-child {
  border-bottom: none;
}

/* ===== 单元格 ===== */
.task-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-cell--project,
.task-cell--document {
  gap: 0.3rem;
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

.project-name,
.document-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #303133;
}

.mono-code {
  font-family: Consolas, monospace;
  font-size: 0.8rem;
  color: #909399;
}

.stage-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #606266;
}

.stage-sub {
  font-size: 0.75rem;
  color: #c0c4cc;
}

.type-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
}

.type-badge--required {
  background-color: #ecf5ff;
  color: #3e63dd;
}

.type-badge--suggest {
  background-color: #f0f9eb;
  color: #67c23a;
}

.reason-text {
  font-size: 0.85rem;
  color: #f56c6c;
  font-weight: 500;
}

.empty-placeholder {
  color: #c0c4cc;
}

.time-text {
  font-size: 0.8rem;
  color: #909399;
  font-weight: 400;
}

.text-right {
  text-align: right;
  justify-content: flex-end;
}

/* ===== 操作按钮 ===== */
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: #3e63dd;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: auto;
}

.action-button:hover {
  background: #ecf5ff;
  color: #5275e7;
}

.arrow-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.action-button:hover .arrow-icon {
  transform: translateX(3px);
}

/* ===== 分页面板（与用户管理风格一致） ===== */
.pagination-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
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

.pagination-info .divider {
  color: #ebeef5;
  margin: 0 0.5rem;
}

.search-indicator {
  font-style: italic;
  color: #3e63dd;
  font-size: 0.8rem;
  margin-left: 0.25rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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

.page-control-btn:hover:not(:disabled) {
  color: #3e63dd;
  border-color: #a4b3ff;
}

.page-control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f4f4f5;
}

.page-numbers-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

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

.page-number-btn:hover {
  color: #3e63dd;
  border-color: #a4b3ff;
}

.page-number-btn--active {
  background: #3e63dd !important;
  color: #ffffff !important;
  border-color: #3e63dd !important;
}

.pagination-sizes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #606266;
}

.select-size {
  width: 100px;
}

.select-size select {
  padding: 0.3rem 1.5rem 0.3rem 0.65rem;
  font-size: 0.8rem;
}

/* ===== Toast 样式 ===== */
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #f56c6c;
}
.toast--error .toast-icon {
  stroke: #f56c6c;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #67c23a;
}
.toast--success .toast-icon {
  stroke: #67c23a;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

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
.toast-close:hover {
  background: #f4f4f5;
}
.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* ===== 动画 ===== */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .task-table__head,
  .task-table__row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 1rem;
  }
  .task-table__head {
    display: none;
  }
  .task-cell {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.6rem;
  }
  .task-cell .text-right {
    justify-content: flex-start;
    margin-left: 0;
  }
  .filter-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }
  .pagination-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  .pagination-sizes {
    justify-content: center;
  }
}
</style>