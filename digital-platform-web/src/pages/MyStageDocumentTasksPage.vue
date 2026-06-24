<template>
  <section class="page-stack animate-fadeIn">
    <!-- STREAMING_CHUNK: 渲染页面顶部标题与快速同步栏... -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">我的责任资料</span>
        <h2>我的资料任务</h2>
        <div class="user-meta">
          <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        </div>
        <p class="manual-status-note">
          提示：这里展示的是分配给您的资料项。资料状态为手工标记状态，不代表文件已上传或在线表单已填写。
        </p>
      </div>
      <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadTasks">
        <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" stroke-top="currentColor" />
        </svg>
        <span>{{ loading ? '加载中...' : '重新加载' }}</span>
      </button>
    </div>

    <!-- STREAMING_CHUNK: 渲染顶部分类筛选工具面板... -->
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
            />
          </div>
        </label>
      </div>
    </section>

    <!-- STREAMING_CHUNK: 渲染任务展示卡片或异常处理块... -->
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

      <!-- 错误提示（保留底层重试机制，同时通过Toast呼出错误） -->
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

      <!-- 核心表格列表 -->
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

          <div class="user-table__body">
            <article v-for="task in filteredTasks" :key="task.documentId" class="task-table__row">
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

    <!-- STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层... -->
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
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

const selectedStatus = ref('pending');
const projectKeyword = ref('');
const loading = ref(false);
const errorMessage = ref('');
const tasks = ref([]);

// STREAMING_CHUNK: 统一定义 Toast 控制状态...
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

// STREAMING_CHUNK: 封装数据拉取并在失败时推送 Toast 异常弹窗...
async function loadTasks() {
  loading.value = true;
  errorMessage.value = '';

  try {
    tasks.value = await listMyStageDocumentTasks({ status: selectedStatus.value }, props.authToken);
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
/* 全局布局 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
  position: relative;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* 顶部标题行 */
.page-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-bottom: 0.5rem;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: #e2e8f0;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
}

.page-title-row h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  color: #475569;
}

.meta-icon {
  width: 16px;
  height: 16px;
  stroke: #64748b;
}

.page-user {
  font-size: 0.875rem;
  font-weight: 500;
}

.manual-status-note {
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  background: #f1f5f9;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border-left: 3px solid #cbd5e1;
}

/* 按钮样式 */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.ghost-button:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.primary-button:hover {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.15);
}

/* 卡片基础设计 */
.panel {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.03);
  overflow: hidden;
}

/* 筛选面板样式 */
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
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

.select-wrapper {
  position: relative;
  width: 180px;
}

.select-wrapper select {
  width: 100%;
  padding: 0.625rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  border-radius: 8px;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #64748b;
  pointer-events: none;
}

.select-wrapper select:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  transition: all 0.2s;
  padding-left: 0.75rem;
}

.input-wrapper:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.search-icon {
  width: 18px;
  height: 18px;
  stroke: #94a3b8;
  flex-shrink: 0;
}

.input-wrapper input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #0f172a;
  outline: none;
}

/* 列表面板 */
.task-list-panel {
  display: flex;
  flex-direction: column;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.toolbar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-subtitle {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.2rem;
}

/* 状态页美化 */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.state-panel--inline {
  padding: 3rem 1.5rem;
}

.state-panel h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.state-panel p {
  font-size: 0.9rem;
  color: #64748b;
  max-width: 480px;
}

/* 加载动画 */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1rem;
}

.wave-bar {
  width: 4px;
  height: 24px;
  background: #0f172a;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  stroke: currentColor;
}

/* 空状态 */
.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #94a3b8;
  margin-bottom: 1rem;
}

/* 错误状态 */
.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  margin: 1.5rem;
  padding: 2rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #ef4444;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1rem;
}

/* 高保真数据表格 */
.table-container {
  overflow-x: auto;
  width: 100%;
}

.task-table {
  min-width: 1100px;
  width: 100%;
  border-collapse: collapse;
}

.task-table__head {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.2fr 1.5fr 1.5fr 1.2fr;
  padding: 0.85rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.task-table__row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.2fr 1.5fr 1.5fr 1.2fr;
  padding: 1.1rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
}

.task-table__row:hover {
  background: #f8fafc;
}

.task-table__row:last-child {
  border-bottom: none;
}

/* 单元格精细样式 */
.task-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mono-badge {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
}

.project-name,
.document-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.mono-code {
  font-family: monospace;
  font-size: 0.8rem;
  color: #64748b;
}

.stage-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
}

.stage-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.type-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  width: fit-content;
}

.type-badge--required {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.type-badge--suggest {
  background-color: #f0fdf4;
  color: #15803d;
}

.reason-text {
  font-size: 0.85rem;
  color: #b91c1c;
  font-weight: 500;
}

.empty-placeholder {
  color: #cbd5e1;
}

.time-text {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 400;
}

.text-right {
  text-align: right;
  justify-content: flex-end;
}

/* 交互动作按钮 */
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: #2563eb;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;
  margin-left: auto;
}

.action-button:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.arrow-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.action-button:hover .arrow-icon {
  transform: translateX(3px);
}

/* STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层 CSS... */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 9999;
  border: 1px solid #f1f5f9;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  stroke: #dc2626;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #22c55e;
}

.toast--success .toast-icon {
  stroke: #16a34a;
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
  color: #94a3b8;
}

.toast-close:hover {
  background: #f1f5f9;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .page-stack {
    padding: 1rem;
  }
}
</style>