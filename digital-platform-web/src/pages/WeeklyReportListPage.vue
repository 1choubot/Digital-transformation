<template>
  <section class="page-stack weekly-report-list-page animate-fadeIn">
    <!-- ============================================= -->
    <!-- 单双休设置（对所有人可见）                    -->
    <!-- ============================================= -->

    <!-- 管理员可编辑 -->
    <section v-if="canManageRestMode" class="panel rest-mode-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">单双休设置</strong>
          <span class="toolbar-subtitle">设置一次后自动交替推算，无需每周重复设置</span>
        </div>
      </div>
      <div class="panel-body">
        <div class="rest-mode-body">
          <div class="rest-mode-info">
            <span class="rest-mode-label">当前周（{{ restModeWeekLabel }}）</span>
            <strong :class="resolvedRestMode === WeeklyRestMode.SINGLE_REST ? 'rest-mode--single' : 'rest-mode--double'">
              {{ resolvedRestMode === WeeklyRestMode.SINGLE_REST ? '单休（6天）' : '双休（5天）' }}
            </strong>
            <span v-if="restModeAnchor" class="rest-mode-anchor-note">
              锚点周：{{ restModeAnchor.weekStart }}（{{ restModeAnchor.restMode === WeeklyRestMode.SINGLE_REST ? '单休' : '双休' }}）
            </span>
            <span v-else class="rest-mode-anchor-note">默认双休（无锚点设置）</span>
          </div>
          <div class="rest-mode-actions">
            <div class="filter-group">
              <span class="filter-label">设为本周锚点</span>
              <div class="input-wrapper">
                <select v-model="selectedAnchorMode" :disabled="savingRestMode">
                  <option :value="WeeklyRestMode.SINGLE_REST">本周单休</option>
                  <option :value="WeeklyRestMode.DOUBLE_REST">本周双休</option>
                </select>
              </div>
            </div>
            <button type="button" class="primary-button" :disabled="savingRestMode" @click="handleSetRestMode">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {{ savingRestMode ? '正在保存...' : '设置锚点' }}
            </button>
          </div>
        </div>
        <section v-if="restModeError" class="state-panel state-panel--error state-panel--compact">
          <p>{{ restModeError }}</p>
        </section>
      </div>
    </section>

    <!-- 只读展示（所有用户只要数据存在即显示） -->
    <section v-else-if="resolvedRestMode" class="panel rest-mode-panel rest-mode-panel--readonly">
      <div class="panel-body">
        <div class="rest-mode-body rest-mode-body--readonly">
          <span class="rest-mode-label">本周（{{ restModeWeekLabel }}）：</span>
          <strong :class="resolvedRestMode === WeeklyRestMode.SINGLE_REST ? 'rest-mode--single' : 'rest-mode--double'">
            {{ resolvedRestMode === WeeklyRestMode.SINGLE_REST ? '单休（6天）' : '双休（5天）' }}
          </strong>
          <span v-if="restModeAnchor" class="rest-mode-anchor-note">
            锚点：{{ restModeAnchor.weekStart }}（{{ restModeAnchor.restMode === WeeklyRestMode.SINGLE_REST ? '单休' : '双休' }}）
          </span>
        </div>
      </div>
    </section>

    <!-- ============================================= -->
    <!-- 权限警告（仅针对个人周报和考评总览）          -->
    <!-- ============================================= -->

    <section v-if="!canUseWeeklyReport && !canReadOverview" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>无周报访问权限</h3>
      <p>当前账号不能访问个人周报或考评总览，但可查看单双休设置。</p>
    </section>

    <!-- ============================================= -->
    <!-- 有权限时显示本人周报和考评总览               -->
    <!-- ============================================= -->

    <template v-else>
      <!-- 本人周报列表 -->
      <section v-if="canUseWeeklyReport" class="panel weekly-list-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">本人周报</strong>
            <span class="toolbar-subtitle">{{ loading ? '正在加载' : `共 ${reports.length} 条` }}</span>
          </div>
          <button type="button" class="ghost-button" :disabled="loading" @click="loadReports">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
            </svg>
            刷新
          </button>
        </div>

        <section v-if="errorMessage" class="state-panel state-panel--error panel state-panel--compact">
          <p>{{ errorMessage }}</p>
        </section>

        <div v-if="loading" class="state-panel panel">
          <div class="loading-spinner"></div>
          <p>正在加载周报列表...</p>
        </div>

        <div v-else-if="reports.length === 0" class="state-panel panel state-panel--empty">
          <p>暂无周报记录。</p>
        </div>

        <div v-else class="table-container">
          <div class="weekly-report-table" :class="{ 'weekly-report-table--employee': isEmployeeUser }">
            <div class="weekly-report-table__head">
              <span>周期</span>
              <span>状态</span>
              <span v-if="!isEmployeeUser">最终评分</span>
              <span v-if="!isEmployeeUser">参考评分</span>
              <span>更新时间</span>
              <span class="text-right">操作</span>
            </div>
            <div v-for="report in reports" :key="report.id" class="weekly-report-table__row">
              <div>
                <strong>{{ report.weekStart }} 至 {{ report.weekEnd }}</strong>
              </div>
              <span class="status-badge" :class="statusClass(report.status)">{{ statusLabel(report.status) }}</span>
              <span v-if="!isEmployeeUser">{{ finalScoreText(report) }}</span>
              <span v-if="!isEmployeeUser">{{ sourceLabel(report.aiEvaluationSource) }}</span>
              <time>{{ formatDateTime(report.updatedAt) }}</time>
              <div class="weekly-report-table__actions">
                <button type="button" class="row-btn action-btn" @click="navigate(`/weekly-report/${report.id}`)">详情</button>
                <button type="button" class="row-btn action-btn" @click="downloadReportExcel(report)">导出</button>
                <button
                  v-if="report.status === ReportStatus.DRAFT"
                  type="button"
                  class="row-btn action-btn action-btn--danger"
                  @click="removeDraft(report)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 考评总览 -->
      <section v-if="canReadOverview" class="panel weekly-overview-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">考评总览</strong>
            <span class="toolbar-subtitle">{{ overviewLoading ? '正在加载' : `共 ${overviewRows.length} 条` }}</span>
          </div>
          <form class="weekly-overview-filters" @submit.prevent="loadOverview">
            <div class="filter-group">
              <span class="filter-label">周开始</span>
              <div class="input-wrapper">
                <input v-model="overviewFilters.weekStart" type="date" />
              </div>
            </div>
            <div v-if="canReadAllCenters" class="filter-group">
              <span class="filter-label">中心</span>
              <div class="input-wrapper">
                <select v-model="overviewFilters.department">
                  <option value="">全部中心</option>
                  <option value="operations_center">运营中心</option>
                  <option value="marketing_center">营销中心</option>
                  <option value="manufacturing_center">制造中心</option>
                  <option value="rd_center">研发中心</option>
                </select>
              </div>
            </div>
            <button type="submit" class="primary-button" :disabled="overviewLoading">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              查询
            </button>
          </form>
        </div>

        <section v-if="overviewError" class="state-panel state-panel--error panel state-panel--compact">
          <p>{{ overviewError }}</p>
        </section>

        <div v-if="overviewLoading" class="state-panel panel">
          <div class="loading-spinner"></div>
          <p>正在加载考评总览...</p>
        </div>

        <div v-else-if="overviewRows.length === 0" class="state-panel panel state-panel--empty">
          <p>暂无考评记录。</p>
        </div>

        <div v-else class="table-container">
          <div class="weekly-overview-table">
            <div class="weekly-overview-table__head">
              <span>员工</span>
              <span>中心</span>
              <span>状态</span>
              <span>最终评分</span>
              <span>参考评分</span>
              <span>评分人</span>
              <span class="text-right">操作</span>
            </div>
            <div v-for="row in overviewRows" :key="row.reportId" class="weekly-overview-table__row">
              <strong>{{ row.userName }}</strong>
              <span>{{ formatBusinessDepartment(row.department) }}</span>
              <span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
              <span>{{ overviewFinalScoreText(row) }}</span>
              <span>{{ overviewReferenceScoreText(row) }}</span>
              <span>{{ row.finalReviewedByName || '-' }}</span>
              <button type="button" class="row-btn action-btn" @click="navigate(`/weekly-report-review/${row.reportId}`)">
                详情
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus, WeeklyRestMode } from '../constants/reports.js';
import {
  deleteWeeklyReport,
  exportWeeklyReport,
  getWeeklyRestMode,
  listWeeklyComparisonOverview,
  listWeeklyReports,
  setWeeklyRestMode,
  toReadableApiError
} from '../api/weeklyReports.js';
import { formatBusinessDepartment } from '../utils/format.js';

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
const overviewLoading = ref(false);
const savingRestMode = ref(false);
const reports = ref([]);
const overviewRows = ref([]);
const errorMessage = ref('');
const overviewError = ref('');
const restModeError = ref('');
const overviewFilters = reactive({
  weekStart: previousWeekStart(),
  department: ''
});
const resolvedRestMode = ref('');
const restModeWeekStart = ref('');
const restModeAnchor = ref(null);
const selectedAnchorMode = ref(WeeklyRestMode.DOUBLE_REST);

// Weekly report personal pages are writable by employees and center managers.
const canUseWeeklyReport = computed(() =>
  [OrganizationRole.EMPLOYEE, OrganizationRole.CENTER_MANAGER].includes(props.currentUser.organizationRole)
);
const isEmployeeUser = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);
const canReadOverview = computed(() =>
  [
    OrganizationRole.CENTER_MANAGER,
    OrganizationRole.GENERAL_MANAGER,
    OrganizationRole.GENERAL_MANAGER_ASSISTANT
  ].includes(props.currentUser.organizationRole)
);
const canReadAllCenters = computed(() =>
  [
    OrganizationRole.GENERAL_MANAGER,
    OrganizationRole.GENERAL_MANAGER_ASSISTANT
  ].includes(props.currentUser.organizationRole)
);
const canManageRestMode = computed(() =>
  props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER ||
  (props.currentUser.organizationRole === OrganizationRole.SYSTEM_ADMIN && props.currentUser.isPlatformAdmin)
);

const restModeWeekLabel = computed(() => {
  if (!restModeWeekStart.value) return '';
  return `${restModeWeekStart.value} 起`;
});

// Return previous natural week Monday for default overview filtering.
function previousWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);
  currentMonday.setDate(currentMonday.getDate() - 7);
  const year = currentMonday.getFullYear();
  const month = String(currentMonday.getMonth() + 1).padStart(2, '0');
  const date = String(currentMonday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// Current week Monday for rest-mode display.
function currentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// Convert backend timestamps into compact local display text.
function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return String(value).replace('T', ' ').slice(0, 16);
}

// Display report status labels consistently with the daily report UI.
function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--draft';
}

// Convert score source codes into explicit labels, including fallback.
function sourceLabel(source) {
  if (source === 'ai') return 'AI';
  if (source === 'fallback_rule') return '规则降级';
  return '未评估';
}

// Render score and grade from cached list payloads.
function finalScoreText(report) {
  if (report.finalScore === null || report.finalScore === undefined) {
    return '待最终评分';
  }
  return `${report.finalScore}${report.finalGrade ? ` / ${report.finalGrade}` : ''}`;
}

function overviewFinalScoreText(row) {
  if (row.finalScore === null || row.finalScore === undefined) {
    return '待最终评分';
  }
  return `${row.finalScore}${row.finalGrade ? ` / ${row.finalGrade}` : ''}`;
}

function overviewReferenceScoreText(row) {
  if (row.totalScore === null || row.totalScore === undefined) {
    return sourceLabel(row.evaluationSource);
  }
  return `${row.totalScore}${row.grade ? ` / ${row.grade}` : ''}`;
}

// Trigger a browser download for one weekly workbook.
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

// ── Rest-mode anchor management ──

async function loadRestMode() {
  try {
    const result = await getWeeklyRestMode(currentWeekStart(), props.authToken);
    resolvedRestMode.value = result.resolvedRestMode;
    restModeWeekStart.value = result.weekStart;
    restModeAnchor.value = result.anchor || null;
    selectedAnchorMode.value = result.resolvedRestMode || WeeklyRestMode.DOUBLE_REST;
  } catch (error) {
    if (error?.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    restModeError.value = toReadableApiError(error);
  }
}

async function handleSetRestMode() {
  savingRestMode.value = true;
  restModeError.value = '';
  try {
    const result = await setWeeklyRestMode({
      weekStart: currentWeekStart(),
      restMode: selectedAnchorMode.value
    }, props.authToken);
    restModeAnchor.value = result.anchor;
    resolvedRestMode.value = result.resolvedRestMode;
  } catch (error) {
    if (error?.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    restModeError.value = toReadableApiError(error);
  } finally {
    savingRestMode.value = false;
  }
}

// ── Report list management ──

async function loadReports() {
  if (!canUseWeeklyReport.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await listWeeklyReports({}, props.authToken);
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

async function loadOverview() {
  if (!canReadOverview.value) {
    return;
  }

  overviewLoading.value = true;
  overviewError.value = '';

  try {
    const filters = {
      weekStart: overviewFilters.weekStart,
      department: canReadAllCenters.value ? overviewFilters.department : props.currentUser.department
    };
    const result = await listWeeklyComparisonOverview(filters, props.authToken);
    overviewRows.value = result.reports || [];
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    overviewError.value = toReadableApiError(error);
  } finally {
    overviewLoading.value = false;
  }
}

async function removeDraft(report) {
  errorMessage.value = '';

  try {
    await deleteWeeklyReport(report.id, props.authToken);
    await loadReports();
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

async function downloadReportExcel(report) {
  errorMessage.value = '';

  try {
    const download = await exportWeeklyReport(report.id, props.authToken);
    saveBlob(download, `周绩效考核表-${report.weekEnd}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

onMounted(() => {
  loadReports();
  loadOverview();
  loadRestMode();
});
</script>

<style scoped>
/* ===== 全局页面容器 ===== */
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

/* ===== 面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
}
.panel-body {
  padding: 1.5rem;
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
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}
.toolbar-subtitle {
  font-size: 0.8rem;
  color: #909399;
}

/* ===== 按钮基础 ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.ghost-button.active {
  border-color: #3e63dd;
  background: #ecf5ff;
  color: #3e63dd;
}

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
  flex-shrink: 0;
}

/* ===== 状态面板 ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  text-align: center;
  border-radius: 8px;
}
.state-panel--compact {
  padding: 0.75rem 1.5rem;
  margin: 0;
}
.state-panel--error {
  background: #fef0f0;
  color: #f56c6c;
}
.state-panel--error h3 {
  margin: 0.5rem 0;
  font-weight: 600;
}
.state-panel--empty {
  color: #909399;
}
.state-panel p {
  font-size: 0.9rem;
  margin: 0;
}
.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}

/* ===== 加载动画 ===== */
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #ebeef5;
  border-top-color: #3e63dd;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 表单控件 ===== */
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
.input-wrapper input,
.input-wrapper select {
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
  height: 48px;
  box-sizing: border-box;
  font-family: inherit;
}
.input-wrapper input[type="date"] {
  cursor: pointer;
}
.input-wrapper input::placeholder {
  color: #c0c4cc;
}
.input-wrapper select {
  appearance: auto;
  cursor: pointer;
}
.input-wrapper select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 状态标签 ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.status-badge--draft {
  background: #fdf6ec;
  color: #e6a23c;
  border-color: #faecd8;
}
.status-badge--done {
  background: #f0f9eb;
  color: #67c23a;
  border-color: #e1f3d8;
}

/* ===== 单双休设置面板 ===== */
.rest-mode-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.rest-mode-body--readonly {
  justify-content: flex-start;
}
.rest-mode-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.rest-mode-label {
  font-size: 0.85rem;
  color: #606266;
}
.rest-mode-anchor-note {
  font-size: 0.8rem;
  color: #909399;
}
.rest-mode--single {
  color: #e6a23c;
}
.rest-mode--double {
  color: #67c23a;
}
.rest-mode-actions {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.rest-mode-actions .filter-group {
  min-width: 140px;
}
.rest-mode-actions .primary-button {
  height: 48px;
}

/* ===== 表格容器 ===== */
.table-container {
  overflow-x: auto;
  width: 100%;
  padding: 0 0 0.5rem 0;
}

/* ===== 周报列表表格 ===== */
.weekly-report-table {
  min-width: 700px;
  width: 100%;
}
.weekly-report-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  gap: 0.75rem;
  grid-template-columns: 1.8fr 0.7fr 0.9fr 0.9fr 1.2fr 0.8fr;
}
.weekly-report-table--employee .weekly-report-table__head {
  grid-template-columns: 1.8fr 0.7fr 1.2fr 0.8fr;
}
.text-right {
  text-align: right;
}

.weekly-report-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
  grid-template-columns: 1.8fr 0.7fr 0.9fr 0.9fr 1.2fr 0.8fr;
}
.weekly-report-table--employee .weekly-report-table__row {
  grid-template-columns: 1.8fr 0.7fr 1.2fr 0.8fr;
}
.weekly-report-table__row:hover {
  background: #fdfdfe;
}
.weekly-report-table__row time {
  font-size: 0.8rem;
  color: #909399;
}
.weekly-report-table__actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.weekly-report-table__actions .row-btn {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
}

/* ===== 考评总览表格 ===== */
.weekly-overview-table {
  min-width: 700px;
  width: 100%;
}
.weekly-overview-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  gap: 0.75rem;
  grid-template-columns: 1fr 1fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr;
}
.weekly-overview-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
  grid-template-columns: 1fr 1fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr;
}
.weekly-overview-table__row:hover {
  background: #fdfdfe;
}
.weekly-overview-table__row .row-btn {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  justify-self: flex-end;
}

/* ===== 行内操作按钮 ===== */
.row-btn {
  padding: 0.2rem 0.6rem;
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
.row-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn:hover:not(:disabled) {
  border-color: #a4b3ff;
  color: #3e63dd;
  background: #f0f3ff;
}
.action-btn--danger:hover:not(:disabled) {
  border-color: #fbc4c4;
  color: #f56c6c;
  background: #fef0f0;
}

/* ===== 考评总览筛选栏 ===== */
.weekly-overview-filters {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.weekly-overview-filters .filter-group {
  min-width: 140px;
}
.weekly-overview-filters .filter-group .input-wrapper input,
.weekly-overview-filters .filter-group .input-wrapper select {
  height: 36px;
}
.weekly-overview-filters .primary-button {
  height: 36px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
  }
  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .rest-mode-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .rest-mode-actions {
    width: 100%;
  }
  .rest-mode-actions .filter-group {
    flex: 1;
    min-width: unset;
  }
  .weekly-overview-filters {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .weekly-overview-filters .filter-group {
    min-width: unset;
  }
  .weekly-report-table__head,
  .weekly-report-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.4rem;
  }
  .weekly-report-table--employee .weekly-report-table__head,
  .weekly-report-table--employee .weekly-report-table__row {
    grid-template-columns: 1fr !important;
  }
  .weekly-report-table__head {
    display: none;
  }
  .weekly-report-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .weekly-report-table__row .weekly-report-table__actions {
    justify-content: flex-start;
  }
  .weekly-overview-table__head,
  .weekly-overview-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.4rem;
  }
  .weekly-overview-table__head {
    display: none;
  }
  .weekly-overview-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .weekly-overview-table__row .row-btn {
    justify-self: flex-start;
  }
}
</style>