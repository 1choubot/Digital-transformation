<template>
  <section class="page-stack animate-fadeIn">
    <!-- STREAMING_CHUNK: 渲染页面顶部台账与新建按钮... -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目台账</span>
        <h2>项目列表</h2>
        <div class="user-meta">
          <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        </div>
      </div>
      <button v-if="canCreateProject" type="button" class="primary-button create-btn" @click="navigate('/projects/new')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建项目</span>
      </button>
    </div>

    <!-- 主展示面板 -->
    <section class="panel">
      <!-- 平台工具条 -->
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <div class="badge-row">
            <span class="toolbar-title">后端数据源</span>
            <span class="api-endpoint-badge">{{ apiBaseUrl }}</span>
          </div>
        </div>
        <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadProjects">
          <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" stroke-top="currentColor" />
          </svg>
          <span>{{ loading ? '同步加载中...' : '重新加载' }}</span>
        </button>
      </div>

      <!-- 数据加载中 -->
      <div v-if="loading" class="state-panel state-panel--inline">
        <div class="loading-wave">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <p>正在拉取全量项目清单，请稍候...</p>
      </div>

      <!-- 异常捕捉 -->
      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div class="error-details">
          <h3>项目列表加载失败</h3>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="primary-button inline-btn" @click="loadProjects">重试加载</button>
      </div>

      <!-- 空白状态 -->
      <div v-else-if="projects.length === 0" class="state-panel state-panel--empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <h3>暂无数字化项目</h3>
        <p>系统目前尚未建立任何项目台账。请先创建一个新项目！</p>
        <button type="button" class="primary-button inline-btn" @click="navigate('/projects/new')">新建项目</button>
      </div>

      <!-- STREAMING_CHUNK: 高保真表格列表展现... -->
      <div v-else class="table-container">
        <div class="project-table">
          <div class="project-table__head">
            <span>项目编号</span>
            <span>项目名称</span>
            <span>客户</span>
            <span>项目模式</span>
            <span>项目经理</span>
            <span>项目状态</span>
            <span>当前阶段</span>
            <span>创建人</span>
            <span>计划周期</span>
            <span class="text-right">操作</span>
          </div>

          <div class="project-table__body">
            <article v-for="project in projects" :key="project.id" class="project-table__row">
              <span class="mono-badge">{{ project.projectCode }}</span>
              <strong class="project-name">{{ project.projectName }}</strong>
              <span class="customer-text">{{ project.customerName }}</span>
              <span>
                <span class="mode-tag">{{ formatProjectMode(project.projectMode) }}</span>
              </span>
              <span class="manager-text">{{ formatUser(project.projectManagerUser) }}</span>
              <div class="cell-status">
                <StatusBadge :status="project.status" />
              </div>
              <span class="stage-text">{{ project.currentStage?.stageName || '-' }}</span>
              <span class="creator-text">{{ formatUser(project.createdBy) }}</span>
              <span class="date-range">
                {{ formatDate(project.plannedStartDate) }} <span class="to-arrow">→</span> {{ formatDate(project.plannedEndDate) }}
              </span>
              <div class="cell-action text-right">
                <button type="button" class="action-button" @click="navigate(`/projects/${project.id}`)">
                  <span>查看详情</span>
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
import { getApiBaseUrlLabel, listProjects, toReadableApiError } from '../api/projects.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatProjectMode, formatUser } from '../utils/format.js';

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

// STREAMING_CHUNK: 同步获取列表，失败时直接 Toast 全局警报...
async function loadProjects() {
  loading.value = true;
  errorMessage.value = '';

  try {
    projects.value = await listProjects(props.authToken);
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    errorMessage.value = errorMsg;
    showToast(errorMsg, 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(loadProjects);
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
  align-items: center;
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
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
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

/* 按钮设计 */
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
  transition: all 0.2s;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  height: 40px;
}

.primary-button:hover {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.15);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 主面板 */
.panel {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.03);
  overflow: hidden;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 1rem;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toolbar-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.api-endpoint-badge {
  font-family: monospace;
  font-size: 0.75rem;
  background: #f1f5f9;
  color: #0f172a;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

/* 状态 */
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
  padding: 2.5rem;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #ef4444;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1.25rem;
}

/* 表格结构设计 */
.table-container {
  overflow-x: auto;
  width: 100%;
}

.project-table {
  min-width: 1200px;
  width: 100%;
  border-collapse: collapse;
}

.project-table__head {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 1.2fr 1.2fr 1.8fr 1fr;
  padding: 0.85rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.project-table__row {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 1.2fr 1.2fr 1.8fr 1fr;
  padding: 1.1rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
  font-size: 0.875rem;
}

.project-table__row:hover {
  background: #f8fafc;
}

.project-table__row:last-child {
  border-bottom: none;
}

/* 单元格细化 */
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

.project-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.customer-text,
.manager-text,
.creator-text,
.stage-text {
  color: #334155;
}

.mode-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
}

.date-range {
  font-size: 0.8rem;
  color: #64748b;
}

.to-arrow {
  color: #cbd5e1;
  font-weight: bold;
}

.text-right {
  text-align: right;
  justify-content: flex-end;
}

/* 操作项跳转按钮 */
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