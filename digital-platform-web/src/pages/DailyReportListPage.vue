<template>
  <section class="page-stack daily-report-list-page animate-fadeIn">
    <!-- 无权限警告 -->
    <section v-if="!canUseDailyReport" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>无日报访问权限</h3>
      <p>当前账号不是员工（employee），不能访问个人日报列表。</p>
    </section>

    <template v-else>
      <!-- 筛选面板 -->
      <section class="panel daily-filter-panel">
        <form class="daily-filters" @submit.prevent="loadReports">
          <div class="filter-group">
            <span class="filter-label">开始日期</span>
            <div class="input-wrapper">
              <input v-model="filters.dateFrom" type="date" />
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">结束日期</span>
            <div class="input-wrapper">
              <input v-model="filters.dateTo" type="date" />
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">状态</span>
            <div class="select-wrapper">
              <select v-model="filters.status">
                <option value="">全部</option>
                <option :value="ReportStatus.DRAFT">草稿</option>
                <option :value="ReportStatus.SUBMITTED">已提交</option>
              </select>
            </div>
          </div>

          <div class="filter-actions">
            <button type="submit" class="primary-button apply-btn" :disabled="loading">
              <span>应用筛选</span>
            </button>
          </div>
        </form>
      </section>

      <!-- 错误提示 -->
      <section v-if="errorMessage" class="state-panel state-panel--error panel">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button inline-btn" @click="loadReports">重新尝试</button>
      </section>

      <!-- 日报列表面板 -->
      <section class="panel daily-list-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">日报记录</strong>
            <span class="toolbar-subtitle">共 {{ reports.length }} 条</span>
          </div>
          <div class="toolbar-actions">
            <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadReports">
              <svg v-if="loading" class="spinner btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
              </svg>
              <span>{{ loading ? '加载中...' : '重新加载' }}</span>
            </button>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="state-panel state-panel--inline">
          <div class="loading-wave">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
          <p>正在加载日报列表，请稍候...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="reports.length === 0" class="state-panel state-panel--empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-1.125 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3>暂无日报记录</h3>
          <p>您还没有填写过日报，点击“填写日报”开始记录每日工作。</p>
        </div>

        <!-- 列表表格 -->
        <div v-else class="table-container">
          <div class="daily-table">
            <div class="daily-table__head">
              <span>日期</span>
              <span>项目</span>
              <span>状态</span>
              <span>更新时间</span>
              <span class="text-right">操作</span>
            </div>

            <div class="daily-table__body">
              <article v-for="report in reports" :key="report.id" class="daily-table__row">
                <!-- 日期 -->
                <div class="daily-table__cell">
                  <time class="date-value">{{ report.reportDate }}</time>
                </div>

                <!-- 项目信息 -->
                <div class="daily-table__cell daily-table__project">
                  <strong class="project-name">{{ report.project?.projectName || '-' }}</strong>
                  <span class="project-code">{{ report.project?.projectCode || '-' }}</span>
                </div>

                <!-- 状态 -->
                <div class="daily-table__cell">
                  <span :class="['status-badge', statusClass(report.status)]">
                    {{ statusLabel(report.status) }}
                  </span>
                </div>

                <!-- 更新时间 -->
                <div class="daily-table__cell">
                  <time class="update-time">{{ formatDateTime(report.updatedAt) }}</time>
                </div>

                <!-- 操作按钮组 -->
                <div class="daily-table__cell daily-table__actions">
                  <button type="button" class="row-btn action-btn" @click="navigate(`/daily-report/${report.id}`)">打开</button>
                  <button type="button" class="row-btn action-btn" @click="downloadReportExcel(report)">导出</button>
                  <button
                    v-if="report.status === ReportStatus.DRAFT"
                    type="button"
                    class="row-btn action-btn action-btn--danger"
                    @click="removeDraft(report)"
                  >
                    删除草稿
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Toast 消息 -->
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
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  deleteDailyReport,
  exportDailyReport,
  listDailyReports,
  toReadableApiError
} from '../api/dailyReports.js';

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

const loading = ref(false);
const reports = ref([]);
const errorMessage = ref('');
const filters = reactive({
  dateFrom: '',
  dateTo: '',
  status: ''
});

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

const canUseDailyReport = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
}

function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--draft';
}

function saveBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadReports() {
  if (!canUseDailyReport.value) return;
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await listDailyReports(filters, props.authToken);
    reports.value = result.reports || [];
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }
}

async function downloadReportExcel(report) {
  errorMessage.value = '';
  try {
    const download = await exportDailyReport(report.id, props.authToken);
    saveBlob(download, `项目工作日报-${report.reportDate}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

async function removeDraft(report) {
  errorMessage.value = '';
  try {
    await deleteDailyReport(report.id, props.authToken);
    await loadReports();
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

onMounted(loadReports);
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
  background: transparent;
}

/* ===== 页面进入动画 ===== */
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 旋转动画 ===== */
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

/* ===== 按钮基础 ===== */
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  white-space: nowrap;
}
.primary-button:hover:not(:disabled) {
  background: #5275e7;
}
.primary-button:disabled {
  opacity: 0.6;
  background: #a0cfff;
  cursor: not-allowed;
}
.btn-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

/* ===== 面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

/* ===== 筛选面板 ===== */
.daily-filter-panel {
  padding: 1.25rem 1.5rem;
}
.daily-filters {
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
.filter-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}
.input-wrapper {
  position: relative;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  transition: border-color 0.2s ease;
  overflow: hidden;
}
.input-wrapper:focus-within {
  border-color: #3e63dd;
}
.input-wrapper input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
  height: 36px;
}
.input-wrapper input[type="date"] {
  cursor: pointer;
}
.select-wrapper {
  position: relative;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  transition: border-color 0.2s ease;
  min-width: 150px;
}
.select-wrapper:focus-within {
  border-color: #3e63dd;
}
.select-wrapper select {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
  appearance: none;
  cursor: pointer;
  height: 36px;
}
.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #c0c4cc;
  pointer-events: none;
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}
.apply-btn {
  min-width: 100px;
}

/* ===== 状态面板 ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}
.state-panel--inline {
  padding: 2rem 1.5rem;
}
.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  color: #f56c6c;
}
.state-panel--error h3 {
  margin: 0.5rem 0;
  font-weight: 600;
}
.state-panel--empty {
  background: #fafafa;
  border-radius: 8px;
}
.state-panel p {
  font-size: 0.9rem;
  color: #909399;
  margin-top: 0.5rem;
}
.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}
.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #c0c4cc;
  margin-bottom: 1rem;
}
.inline-btn {
  margin-top: 1rem;
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

/* ===== 列表面板 ===== */
.daily-list-panel {
  overflow: hidden;
}
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.toolbar-info {
  display: flex;
  flex-direction: column;
}
.toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}
.toolbar-subtitle {
  font-size: 0.8rem;
  color: #909399;
  margin-top: 0.2rem;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
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
  transition: all 0.2s;
  height: 36px;
  white-space: nowrap;
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
.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  stroke: currentColor;
}
.btn-spinner {
  stroke: #3e63dd;
}

/* ===== 表格 ===== */
.table-container {
  overflow-x: auto;
  width: 100%;
}
.daily-table {
  min-width: 700px;
  width: 100%;
}
.daily-table__head {
  display: grid;
  grid-template-columns: 0.8fr 2fr 0.8fr 1.2fr 1.6fr;
  padding: 0.8rem 1.5rem;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  font-size: 0.8rem;
  font-weight: 500;
  color: #909399;
  gap: 1rem;
}
.daily-table__body {
  display: flex;
  flex-direction: column;
}
.daily-table__row {
  display: grid;
  grid-template-columns: 0.8fr 2fr 0.8fr 1.2fr 1.6fr;
  padding: 0.9rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  transition: background 0.2s ease;
  font-size: 0.9rem;
  gap: 1rem;
}
.daily-table__row:hover {
  background: #fdfdfe;
}
.daily-table__row:last-child {
  border-bottom: none;
}
.daily-table__cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.date-value {
  font-weight: 500;
  color: #303133;
}
.daily-table__project {
  gap: 0.2rem;
}
.project-name {
  font-weight: 600;
  color: #303133;
}
.project-code {
  font-size: 0.75rem;
  color: #909399;
  font-family: Consolas, monospace;
}
.update-time {
  color: #606266;
  font-size: 0.85rem;
}
.text-right {
  text-align: right;
  justify-content: flex-end;
}

/* ===== 状态标签 ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  width: fit-content;
  border: 1px solid transparent;
}
.status-badge--done {
  background: #f0f9eb;
  color: #67c23a;
  border-color: #e1f3d8;
}
.status-badge--draft {
  background: #fdf6ec;
  color: #e6a23c;
  border-color: #faecd8;
}

/* ===== 操作按钮 ===== */
.daily-table__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.row-btn {
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266;
  white-space: nowrap;
}
.action-btn:hover {
  border-color: #a4b3ff;
  color: #3e63dd;
  background: #f0f3ff;
}
.action-btn--danger:hover {
  border-color: #fbc4c4;
  color: #f56c6c;
  background: #fef0f0;
}

/* ===== Toast ===== */
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
.toast--error { border-left: 4px solid #f56c6c; }
.toast--error .toast-icon { stroke: #f56c6c; flex-shrink: 0; width: 20px; height: 20px; }
.toast--success { border-left: 4px solid #67c23a; }
.toast--success .toast-icon { stroke: #67c23a; flex-shrink: 0; width: 20px; height: 20px; }
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
.toast-close:hover { background: #f4f4f5; }
.toast-close svg { width: 14px; height: 14px; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .daily-filters {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-actions {
    margin-left: 0;
    justify-content: flex-start;
  }
  .daily-table__head {
    display: none;
  }
  .daily-table__row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
  }
  .daily-table__actions {
    justify-content: flex-start;
  }
}
</style>