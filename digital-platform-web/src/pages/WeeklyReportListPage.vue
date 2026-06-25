<template>
  <section class="page-stack weekly-report-list-page">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">个人周报</span>
        <h2>我的周报</h2>
        <span class="page-user">{{ currentUser.name }} / {{ currentUser.department || '全局角色' }}</span>
      </div>
      <button v-if="canUseWeeklyReport" type="button" class="primary-button" @click="navigate('/weekly-report')">
        填写周报
      </button>
    </div>

    <section v-if="!canUseWeeklyReport && !canReadOverview" class="state-panel state-panel--error">
      <h3>无周报访问权限</h3>
      <p>当前账号不能访问个人周报或考评总览。</p>
    </section>

    <template v-else>
      <section v-if="canUseWeeklyReport" class="panel weekly-list-panel">
        <div class="panel-toolbar">
          <div>
            <strong>本人周报</strong>
            <span>{{ loading ? '正在加载' : `共 ${reports.length} 条` }}</span>
          </div>
          <button type="button" class="ghost-button" :disabled="loading" @click="loadReports">刷新</button>
        </div>

        <section v-if="errorMessage" class="state-panel state-panel--error state-panel--compact">
          <p>{{ errorMessage }}</p>
        </section>

        <div v-if="loading" class="state-panel state-panel--inline">
          <p>正在加载周报列表...</p>
        </div>
        <div v-else-if="reports.length === 0" class="state-panel state-panel--inline">
          <p>暂无周报记录。</p>
        </div>
        <div v-else class="weekly-report-table" :class="{ 'weekly-report-table--employee': isEmployeeUser }">
          <div class="weekly-report-table__head">
            <span>周期</span>
            <span>状态</span>
            <span v-if="!isEmployeeUser">最终评分</span>
            <span v-if="!isEmployeeUser">参考评分</span>
            <span>更新时间</span>
            <span>操作</span>
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
              <button type="button" class="ghost-button" @click="navigate(`/weekly-report/${report.id}`)">详情/编辑</button>
              <button type="button" class="ghost-button" @click="downloadReportExcel(report)">导出</button>
              <button
                v-if="report.status === ReportStatus.DRAFT"
                type="button"
                class="ghost-button"
                @click="removeDraft(report)"
              >
                删除草稿
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="canReadOverview" class="panel weekly-overview-panel">
        <div class="panel-toolbar">
          <div>
            <strong>考评总览</strong>
            <span>{{ overviewLoading ? '正在加载' : `共 ${overviewRows.length} 条` }}</span>
          </div>
          <form class="weekly-overview-filters" @submit.prevent="loadOverview">
            <label>
              <span>周开始</span>
              <input v-model="overviewFilters.weekStart" type="date" />
            </label>
            <label v-if="canReadAllCenters">
              <span>中心</span>
              <select v-model="overviewFilters.department">
                <option value="">全部中心</option>
                <option value="operations_center">运营中心</option>
                <option value="marketing_center">营销中心</option>
                <option value="manufacturing_center">制造中心</option>
                <option value="rd_center">研发中心</option>
              </select>
            </label>
            <button type="submit" class="primary-button" :disabled="overviewLoading">查询</button>
          </form>
        </div>

        <section v-if="overviewError" class="state-panel state-panel--error state-panel--compact">
          <p>{{ overviewError }}</p>
        </section>

        <div v-if="overviewLoading" class="state-panel state-panel--inline">
          <p>正在加载考评总览...</p>
        </div>
        <div v-else-if="overviewRows.length === 0" class="state-panel state-panel--inline">
          <p>暂无考评记录。</p>
        </div>
        <div v-else class="weekly-overview-table">
          <div class="weekly-overview-table__head">
            <span>员工</span>
            <span>中心</span>
            <span>状态</span>
            <span>最终评分</span>
            <span>参考评分</span>
            <span>评分人</span>
            <span>操作</span>
          </div>
          <div v-for="row in overviewRows" :key="row.reportId" class="weekly-overview-table__row">
            <strong>{{ row.userName }}</strong>
            <span>{{ formatBusinessDepartment(row.department) }}</span>
            <span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            <span>{{ overviewFinalScoreText(row) }}</span>
            <span>{{ overviewReferenceScoreText(row) }}</span>
            <span>{{ row.finalReviewedByName || '-' }}</span>
            <button type="button" class="ghost-button" @click="navigate(`/weekly-report-review/${row.reportId}`)">
              详情
            </button>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  deleteWeeklyReport,
  exportWeeklyReport,
  listWeeklyComparisonOverview,
  listWeeklyReports,
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
const reports = ref([]);
const overviewRows = ref([]);
const errorMessage = ref('');
const overviewError = ref('');
const overviewFilters = reactive({
  weekStart: previousWeekStart(),
  department: ''
});

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
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--warn';
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

// Load personal weekly reports for employee and center-manager users.
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

// Load management overview with center scoping enforced by the backend.
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

// Delete a draft weekly report and refresh the current list.
async function removeDraft(report) {
  errorMessage.value = '';

  try {
    await deleteWeeklyReport(report.id, props.authToken);
    await loadReports();
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

// Download a weekly report workbook from the backend export endpoint.
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
});
</script>
