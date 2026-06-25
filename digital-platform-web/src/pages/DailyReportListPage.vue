<template>
  <section class="page-stack daily-report-list-page">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">个人日报</span>
        <h2>我的日报</h2>
        <span class="page-user">{{ currentUser.name }} / {{ currentUser.department }}</span>
      </div>
      <button type="button" class="primary-button" @click="navigate('/daily-report')">填写日报</button>
    </div>

    <section v-if="!canUseDailyReport" class="state-panel state-panel--error">
      <h3>无日报访问权限</h3>
      <p>当前账号不是 employee，不能访问个人日报列表。</p>
    </section>

    <template v-else>
      <section class="panel daily-filter-panel">
        <form class="daily-filters" @submit.prevent="loadReports">
          <label>
            <span>开始日期</span>
            <input v-model="filters.dateFrom" type="date" />
          </label>
          <label>
            <span>结束日期</span>
            <input v-model="filters.dateTo" type="date" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="filters.status">
              <option value="">全部</option>
              <option :value="ReportStatus.DRAFT">草稿</option>
              <option :value="ReportStatus.SUBMITTED">已提交</option>
            </select>
          </label>
          <button type="submit" class="primary-button" :disabled="loading">筛选</button>
        </form>
      </section>

      <section v-if="errorMessage" class="state-panel state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <section class="panel daily-list-panel">
        <div class="panel-toolbar">
          <div>
            <strong>日报记录</strong>
            <span>{{ loading ? '正在加载' : `共 ${reports.length} 条` }}</span>
          </div>
        </div>

        <div v-if="loading" class="state-panel state-panel--inline">
          <p>正在加载日报列表...</p>
        </div>
        <div v-else-if="reports.length === 0" class="state-panel state-panel--inline">
          <p>暂无日报记录。</p>
        </div>
        <div v-else class="daily-report-table">
          <div class="daily-report-table__head">
            <span>日期</span>
            <span>项目</span>
            <span>状态</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>
          <div v-for="report in reports" :key="report.id" class="daily-report-table__row">
            <time>{{ report.reportDate }}</time>
            <div class="daily-report-table__project">
              <strong>{{ report.project?.projectName || '-' }}</strong>
              <span>{{ report.project?.projectCode || '-' }}</span>
            </div>
            <span class="status-badge" :class="statusClass(report.status)">{{ statusLabel(report.status) }}</span>
            <time>{{ formatDateTime(report.updatedAt) }}</time>
            <div class="daily-report-table__actions">
              <button type="button" class="ghost-button" @click="navigate(`/daily-report/${report.id}`)">打开</button>
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
    </template>
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

const canUseDailyReport = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);

// Convert backend timestamps into a compact local display.
function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return String(value).replace('T', ' ').slice(0, 16);
}

// Display the report status using the shared constants.
function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

// Match existing badge color classes for report states.
function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--warn';
}

// Trigger a browser download for the exported Excel blob.
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

// Load only the authenticated employee's daily reports.
async function loadReports() {
  if (!canUseDailyReport.value) {
    return;
  }

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

// Download one report workbook from the official template export endpoint.
async function downloadReportExcel(report) {
  errorMessage.value = '';

  try {
    const download = await exportDailyReport(report.id, props.authToken);
    saveBlob(download, `项目工作日报-${report.reportDate}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

// Delete a draft report and refresh the list after the backend confirms it.
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
