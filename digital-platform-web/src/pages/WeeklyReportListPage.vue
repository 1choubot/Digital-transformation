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
                <el-select v-model="selectedAnchorMode" :disabled="savingRestMode">
                  <el-option label="本周单休" :value="WeeklyRestMode.SINGLE_REST" />
                  <el-option label="本周双休" :value="WeeklyRestMode.DOUBLE_REST" />
                </el-select>
              </div>
            </div>
            <el-button type="primary" :loading="savingRestMode" @click="handleSetRestMode">设置锚点</el-button>
          </div>
        </div>
        <el-alert v-if="restModeError" :description="restModeError" type="error" show-icon :closable="false" />
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
    <!-- 权限警告（仅针对个人周报）                   -->
    <!-- ============================================= -->

    <el-alert v-if="!canUseWeeklyReport" title="无周报访问权限" description="当前账号不能访问个人周报，但可查看单双休设置。" type="error" show-icon :closable="false" />

    <!-- ============================================= -->
    <!-- 本人周报列表                                  -->
    <!-- ============================================= -->

    <section v-else class="panel weekly-list-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">本人周报</strong>
          <span class="toolbar-subtitle">{{ loading ? '正在加载' : `共 ${reports.length} 条` }}</span>
        </div>
        <el-button :loading="loading" @click="loadReports">刷新</el-button>
      </div>

      <el-alert v-if="errorMessage" title="周报列表加载失败" :description="errorMessage" type="error" show-icon :closable="false" />

      <el-skeleton v-if="loading" :rows="5" animated />

      <el-empty v-else-if="reports.length === 0" description="暂无周报记录。" />

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
            <el-tag :type="approvalStatusType(report.approvalStatus)">{{ approvalStatusLabel(report.approvalStatus) }}</el-tag>
            <span v-if="!isEmployeeUser">{{ finalScoreText(report) }}</span>
            <span v-if="!isEmployeeUser">{{ sourceLabel(report.aiEvaluationSource) }}</span>
            <time>{{ formatDateTime(report.updatedAt) }}</time>
            <div class="weekly-report-table__actions">
              <el-button link type="primary" @click="navigate(`/weekly-report/${report.id}`)">详情</el-button>
              <el-button link type="primary" @click="downloadReportExcel(report)">导出</el-button>
              <el-button
                v-if="report.status === ReportStatus.DRAFT"
                link
                type="danger"
                @click="removeDraft(report)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { OrganizationRole, ReportStatus, WeeklyApprovalStatus, WeeklyRestMode } from '../constants/reports.js';
import {
  deleteWeeklyReport,
  exportWeeklyReport,
  getWeeklyRestMode,
  listWeeklyReports,
  setWeeklyRestMode,
  toReadableApiError
} from '../api/weeklyReports.js';

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
const savingRestMode = ref(false);
const reports = ref([]);
const errorMessage = ref('');
const restModeError = ref('');
const resolvedRestMode = ref('');
const restModeWeekStart = ref('');
const restModeAnchor = ref(null);
const selectedAnchorMode = ref(WeeklyRestMode.DOUBLE_REST);

// 本人周报权限
const canUseWeeklyReport = computed(() =>
  [OrganizationRole.EMPLOYEE, OrganizationRole.CENTER_MANAGER].includes(props.currentUser.organizationRole)
);
const isEmployeeUser = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);

// 单双休设置权限
const canManageRestMode = computed(() =>
  props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER ||
  (props.currentUser.organizationRole === OrganizationRole.SYSTEM_ADMIN && props.currentUser.isPlatformAdmin)
);

const restModeWeekLabel = computed(() => {
  if (!restModeWeekStart.value) return '';
  return `${restModeWeekStart.value} 起`;
});

// 工具函数
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

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return String(value).replace('T', ' ').slice(0, 16);
}

// Employees track review progress through the independent approval status.
function approvalStatusLabel(status) {
  const labels = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: '未提交',
    [WeeklyApprovalStatus.PENDING]: '审批中',
    [WeeklyApprovalStatus.APPROVED]: '审批通过',
    [WeeklyApprovalStatus.RETURNED]: '已打回'
  };
  return labels[status] || labels[WeeklyApprovalStatus.NOT_SUBMITTED];
}

// Badge colors distinguish pending, approved, and returned reports at a glance.
function approvalStatusType(status) {
  return {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'info',
    [WeeklyApprovalStatus.PENDING]: 'warning',
    [WeeklyApprovalStatus.APPROVED]: 'success',
    [WeeklyApprovalStatus.RETURNED]: 'danger'
  }[status] || 'info';
}

function sourceLabel(source) {
  if (source === 'ai') return 'AI';
  if (source === 'fallback_rule') return '规则降级';
  return '未评估';
}

function finalScoreText(report) {
  if (report.finalScore === null || report.finalScore === undefined) {
    return '待最终评分';
  }
  return String(report.finalScore);
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

// ── Rest-mode ──

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

// ── Report list ──

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

async function removeDraft(report) {
  errorMessage.value = '';

  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除该周报草稿吗？', '删除周报草稿', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteWeeklyReport(report.id, props.authToken);
    await loadReports();
    ElMessage.success('周报草稿已删除');
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
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
  loadRestMode();
});
</script>
