<template>
  <section class="page-stack weekly-review-list-page animate-fadeIn">
    <!-- 删除了 page-header 区域 -->

    <!-- 筛选栏 -->
    <section class="panel overview-filter-panel">
      <div class="panel-toolbar">
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
    </section>

    <!-- 错误 / 加载 / 空状态 / 表格 -->
    <section class="panel overview-result-panel">
      <section v-if="overviewError" class="state-panel state-panel--error panel state-panel--compact">
        <p>{{ overviewError }}</p>
      </section>

      <div v-if="overviewLoading" class="state-panel panel">
        <div class="loading-spinner"></div>
        <p>正在加载中心周报...</p>
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
            <span>审批人</span>
            <span class="text-right">操作</span>
          </div>
          <div v-for="row in overviewRows" :key="row.reportId" class="weekly-overview-table__row">
            <strong>{{ row.userName }}</strong>
            <span>{{ formatBusinessDepartment(row.department) }}</span>
            <span class="status-badge" :class="approvalStatusClass(row.approvalStatus)">{{ approvalStatusLabel(row.approvalStatus) }}</span>
            <span>{{ row.approvalReviewedByName || '-' }}</span>
            <button type="button" class="row-btn action-btn" @click="navigate(`/weekly-report-review/${row.reportId}?from=overview`)">
              审核
            </button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, WeeklyApprovalStatus } from '../constants/reports.js';
import {
  listWeeklyComparisonOverview,
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

const overviewLoading = ref(false);
const overviewRows = ref([]);
const overviewError = ref('');
const overviewFilters = reactive({
  weekStart: previousWeekStart(),
  department: ''
});

const canReadAllCenters = computed(() =>
  [
    OrganizationRole.GENERAL_MANAGER,
    OrganizationRole.GENERAL_MANAGER_ASSISTANT
  ].includes(props.currentUser.organizationRole)
);

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

// Weekly overview rows surface approval progress for center-manager review.
function approvalStatusLabel(status) {
  const labels = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: '未提交',
    [WeeklyApprovalStatus.PENDING]: '审批中',
    [WeeklyApprovalStatus.APPROVED]: '审批通过',
    [WeeklyApprovalStatus.RETURNED]: '已打回'
  };
  return labels[status] || labels[WeeklyApprovalStatus.NOT_SUBMITTED];
}

// Approval badge classes mirror the employee-facing weekly list.
function approvalStatusClass(status) {
  const classes = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'status-badge--draft',
    [WeeklyApprovalStatus.PENDING]: 'status-badge--pending',
    [WeeklyApprovalStatus.APPROVED]: 'status-badge--done',
    [WeeklyApprovalStatus.RETURNED]: 'status-badge--returned'
  };
  return classes[status] || classes[WeeklyApprovalStatus.NOT_SUBMITTED];
}

async function loadOverview() {
  if (!props.currentUser) return;

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

onMounted(() => {
  loadOverview();
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
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* ===== 按钮 ===== */
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
.state-panel--empty {
  color: #909399;
}
.state-panel p {
  font-size: 0.9rem;
  margin: 0;
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
.status-badge--pending {
  background: #ecf5ff;
  color: #3e63dd;
  border-color: #d9ecff;
}
.status-badge--returned {
  background: #fef0f0;
  color: #f56c6c;
  border-color: #fde2e2;
}

/* ===== 筛选栏 ===== */
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

/* ===== 中心周报表格 ===== */
.table-container {
  overflow-x: auto;
  width: 100%;
  padding: 0 0 0.5rem 0;
}

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
  grid-template-columns: 1fr 1fr 0.7fr 1fr 0.7fr;
}
.text-right {
  text-align: right;
}

.weekly-overview-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
  grid-template-columns: 1fr 1fr 0.7fr 1fr 0.7fr;
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

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
  }
  .weekly-overview-filters {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .weekly-overview-filters .filter-group {
    min-width: unset;
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
