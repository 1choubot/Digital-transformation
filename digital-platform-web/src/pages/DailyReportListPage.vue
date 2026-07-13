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
