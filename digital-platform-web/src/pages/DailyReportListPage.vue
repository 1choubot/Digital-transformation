<template>
  <section class="page-stack daily-report-list-page animate-fadeIn">
    <!-- 无权限警告 -->
    <el-alert v-if="!canUseDailyReport" title="无日报访问权限" description="当前账号不是员工（employee），不能访问个人日报列表。" type="error" show-icon :closable="false" />

    <template v-else>
      <!-- 筛选面板（新布局） -->
      <section class="panel daily-filter-panel">
        <el-form class="daily-filters" @submit.prevent="loadReports">
          <span class="filter-text">查询从</span>
          <div class="filter-group filter-group--inline">
            <el-date-picker v-model="filters.dateFrom" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
          </div>

          <span class="filter-text">到</span>
          <div class="filter-group filter-group--inline">
            <el-date-picker v-model="filters.dateTo" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
          </div>

          <span class="filter-text">状态</span>
          <div class="filter-group filter-group--inline">
            <el-select v-model="filters.status" placeholder="全部状态">
              <el-option label="全部" value="" />
              <el-option label="草稿" :value="ReportStatus.DRAFT" />
              <el-option label="已提交" :value="ReportStatus.SUBMITTED" />
            </el-select>
          </div>

          <span class="filter-text">的日报</span>

          <div class="filter-actions">
            <el-button type="primary" native-type="submit" :loading="loading">应用筛选</el-button>
          </div>
        </el-form>
      </section>

      <!-- 错误提示 -->
      <el-alert v-if="errorMessage" title="日报列表加载失败" :description="errorMessage" type="error" show-icon :closable="false">
        <template #default><el-button type="primary" size="small" @click="loadReports">重新尝试</el-button></template>
      </el-alert>

      <!-- 日报列表面板 -->
      <section class="panel daily-list-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">日报记录</strong>
            <span class="toolbar-subtitle">共 {{ reports.length }} 条</span>
          </div>
          <div class="toolbar-actions">
            <el-button :loading="loading" @click="loadReports">重新加载</el-button>
          </div>
        </div>

        <!-- 加载中 -->
        <el-skeleton v-if="loading" :rows="5" animated />

        <!-- 空状态 -->
        <el-empty v-else-if="reports.length === 0" description="暂无日报记录。" />

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
                  <el-tag :type="report.status === ReportStatus.SUBMITTED ? 'success' : 'info'">{{ statusLabel(report.status) }}</el-tag>
                </div>

                <!-- 更新时间 -->
                <div class="daily-table__cell">
                  <time class="update-time">{{ formatDateTime(report.updatedAt) }}</time>
                </div>

                <!-- 操作按钮组 -->
                <div class="daily-table__cell daily-table__actions">
                  <el-button link type="primary" @click="navigate(`/daily-report/${report.id}`)">打开</el-button>
                  <el-button link type="primary" @click="downloadReportExcel(report)">导出</el-button>
                  <el-button
                    v-if="report.status === ReportStatus.DRAFT"
                    link
                    type="danger"
                    @click="removeDraft(report)"
                  >
                    删除草稿
                  </el-button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </template>

  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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

const canUseDailyReport = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
}

function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
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
    await ElMessageBox.confirm('删除后无法恢复，确认删除该日报草稿吗？', '删除日报草稿', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteDailyReport(report.id, props.authToken);
    await loadReports();
    ElMessage.success('日报草稿已删除');
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
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
  max-width: 1500px;
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

/* ===== 面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

/* ===== 筛选面板（新布局） ===== */
.daily-filter-panel {
  padding: 0.75rem 1.5rem;
}
.daily-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}
.filter-text {
  font-size: 0.9rem;
  color: #303133;
  white-space: nowrap;
}
.filter-group--inline {
  display: inline-flex;
  align-items: center;
}
.filter-group--inline .el-date-editor {
  width: 140px;
}
.filter-group--inline .el-select {
  width: 110px;
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.25rem;
}
.apply-btn {
  min-width: 90px;
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
/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .daily-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .filter-text {
    display: none; /* 移动端隐藏文字，直接用标签占位 */
  }
  .filter-group--inline {
    width: 100%;
  }
  .filter-group--inline .el-date-editor,
  .filter-group--inline .el-select {
    width: 100%;
    box-sizing: border-box;
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
