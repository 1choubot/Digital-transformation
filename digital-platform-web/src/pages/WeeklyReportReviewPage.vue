<template>
  <section class="page-stack weekly-review-page">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">周报详情</span>
        <h2>{{ targetTitle }}</h2>
        <span class="page-user">{{ targetUserName }} / {{ targetDepartment }}</span>
      </div>
      <div class="weekly-page-actions">
        <button type="button" class="ghost-button" @click="navigate('/weekly-reports')">返回列表</button>
        <button v-if="canExportOwnReport" type="button" class="ghost-button" :disabled="exporting" @click="downloadReportExcel">
          {{ exporting ? '正在导出' : '导出 Excel' }}
        </button>
      </div>
    </div>

    <section v-if="loading" class="state-panel state-panel--inline">
      <p>正在加载周报详情...</p>
    </section>
    <section v-else-if="errorMessage" class="state-panel state-panel--error">
      <p>{{ errorMessage }}</p>
    </section>

    <template v-else-if="report">
      <section class="panel weekly-review-summary">
        <div class="panel-toolbar">
          <div>
            <strong>{{ report.weekStart }} 至 {{ report.weekEnd }}</strong>
            <span>{{ statusLabel(report.status) }} / 最终评分：{{ finalScoreText }}</span>
          </div>
        </div>
        <div class="weekly-readonly-grid">
          <div>
            <span>评分人</span>
            <strong>{{ finalReviewerText }}</strong>
          </div>
          <div>
            <span>评分时间</span>
            <strong>{{ formatDateTime(report.finalReviewedAt) }}</strong>
          </div>
          <div>
            <span>最终等级</span>
            <strong>{{ report.finalGrade || '-' }}</strong>
          </div>
        </div>
        <p v-if="report.finalComment" class="manual-status-note">{{ report.finalComment }}</p>
      </section>

      <section class="panel weekly-readonly-panel">
        <div class="panel-toolbar">
          <div>
            <strong>本周工作总结</strong>
            <span>只读</span>
          </div>
        </div>
        <div class="weekly-readonly-table weekly-readonly-table--summaries">
          <div class="weekly-readonly-table__head">
            <span>工作任务</span>
            <span>工作目标</span>
            <span>计划日期</span>
            <span>完成状态</span>
            <span>完成说明</span>
            <span>完成日期</span>
          </div>
          <div v-for="summary in report.summaries" :key="summary.id || summary.sortOrder" class="weekly-readonly-table__row">
            <strong>{{ summary.workTask }}</strong>
            <span>{{ summary.workTarget }}</span>
            <span>{{ summary.plannedDate }}</span>
            <span>{{ completionStatusLabel(summary.completionStatus) }}</span>
            <span>{{ summary.completionDescription }}</span>
            <span>{{ summary.completedDate }}</span>
          </div>
        </div>
      </section>

      <section class="panel weekly-readonly-panel">
        <div class="panel-toolbar">
          <div>
            <strong>下周工作计划</strong>
            <span>只读</span>
          </div>
        </div>
        <div class="weekly-readonly-table weekly-readonly-table--plans">
          <div class="weekly-readonly-table__head">
            <span>工作任务</span>
            <span>工作目标</span>
            <span>计划日期</span>
            <span>责任人</span>
          </div>
          <div v-for="plan in report.plans" :key="plan.id || plan.sortOrder" class="weekly-readonly-table__row">
            <strong>{{ plan.workTask }}</strong>
            <span>{{ plan.workTarget }}</span>
            <span>{{ plan.plannedDate }}</span>
            <span>{{ plan.responsiblePerson || '-' }}</span>
          </div>
        </div>
      </section>

      <section v-if="showEmployeeReviewTools" class="panel weekly-comparison-panel">
        <div class="panel-toolbar">
          <div>
            <strong>周vs日对照表</strong>
            <span>{{ comparisonRows.length ? `共 ${comparisonRows.length} 行` : '无对照数据' }}</span>
          </div>
          <button type="button" class="ghost-button" :disabled="comparisonLoading" @click="loadComparisonTable">
            刷新对照
          </button>
        </div>
        <section v-if="comparisonError" class="state-panel state-panel--error state-panel--compact">
          <p>{{ comparisonError }}</p>
        </section>
        <div v-if="comparisonLoading" class="state-panel state-panel--inline">
          <p>正在加载对照表...</p>
        </div>
        <div v-else class="weekly-comparison-table">
          <div class="weekly-comparison-table__head">
            <span>日期</span>
            <span>星期</span>
            <span>周报任务</span>
            <span>周报总结</span>
            <span>日报项目</span>
            <span>日报实际工作</span>
            <span>进度</span>
            <span>日报日期</span>
            <span>周报完成</span>
            <span>匹配</span>
          </div>
          <div v-for="row in comparisonRows" :key="comparisonRowKey(row)" class="weekly-comparison-table__row">
            <span>{{ row.date || '-' }}</span>
            <span>{{ row.weekday || '-' }}</span>
            <span>{{ row.weeklyTask || '-' }}</span>
            <span>{{ row.weeklySummaryText || '-' }}</span>
            <span>{{ row.dailyProjectLabel || row.dailyProjectName || '-' }}</span>
            <span>{{ row.dailyWorkContent || '-' }}</span>
            <span>{{ row.dailyCompletionProgress || '-' }}</span>
            <span>{{ row.dailyCompletedAt || '-' }}</span>
            <span>{{ row.weeklyCompletedDate || '-' }}</span>
            <span>{{ matchStatusLabel(row.matchStatus) }}</span>
          </div>
        </div>
      </section>

      <section v-if="showEmployeeReviewTools" class="panel weekly-evaluation-panel">
        <div class="panel-toolbar">
          <div>
            <strong>AI/规则参考评分</strong>
            <span>{{ evaluationStatusText }}</span>
          </div>
          <button type="button" class="primary-button" :disabled="!canEvaluate || evaluating" @click="evaluateReport(true)">
            {{ evaluating ? '评分中' : score ? '重新评估' : '开始评分' }}
          </button>
        </div>
        <section v-if="evaluationError" class="state-panel state-panel--error state-panel--compact">
          <p>{{ evaluationError }}</p>
        </section>
        <section v-if="!score" class="state-panel state-panel--inline">
          <p>尚未评估。</p>
        </section>
        <section v-else class="weekly-score">
          <div class="weekly-score__summary">
            <div>
              <span>参考总分</span>
              <strong>{{ score.totalScore }}</strong>
            </div>
            <div>
              <span>参考等级</span>
              <strong>{{ score.grade || '-' }}</strong>
            </div>
            <div>
              <span>来源</span>
              <strong>{{ scoreSourceLabel }}</strong>
            </div>
          </div>
          <div class="weekly-score__dimensions">
            <div>
              <span>填写率</span>
              <strong>{{ dimensionValue('fillingRateScore') }}</strong>
            </div>
            <div>
              <span>完成进度</span>
              <strong>{{ dimensionValue('progressScore') }}</strong>
            </div>
            <div>
              <span>日报吻合度</span>
              <strong>{{ dimensionValue('matchScore') }}</strong>
            </div>
          </div>
        </section>
      </section>

      <section class="panel weekly-final-review-panel">
        <div class="panel-toolbar">
          <div>
            <strong>最终评分</strong>
            <span>{{ canEditFinalReview ? '可编辑' : '只读' }}</span>
          </div>
          <button v-if="canEditFinalReview" type="button" class="primary-button" :disabled="savingFinalReview" @click="saveFinalReview">
            {{ savingFinalReview ? '正在保存' : '确认评分' }}
          </button>
        </div>
        <div class="weekly-final-review-form">
          <label>
            <span>最终分数</span>
            <input v-model="finalReviewForm.finalScore" type="number" min="0" max="100" step="0.01" :readonly="!canEditFinalReview" />
          </label>
          <label>
            <span>最终等级</span>
            <input v-model="finalReviewForm.finalGrade" :readonly="!canEditFinalReview" />
          </label>
          <label>
            <span>最终评语</span>
            <textarea v-model="finalReviewForm.finalComment" :readonly="!canEditFinalReview" />
          </label>
        </div>
        <section v-if="finalReviewMessage" class="state-panel state-panel--success state-panel--compact">
          <p>{{ finalReviewMessage }}</p>
        </section>
        <section v-if="finalReviewError" class="state-panel state-panel--error state-panel--compact">
          <p>{{ finalReviewError }}</p>
        </section>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  evaluateWeeklyReport,
  exportWeeklyReport,
  getWeeklyReport,
  getWeeklyReportComparisonTable,
  saveWeeklyReportFinalReview,
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
  reportId: {
    type: String,
    required: true
  },
  navigate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

const loading = ref(false);
const comparisonLoading = ref(false);
const evaluating = ref(false);
const exporting = ref(false);
const savingFinalReview = ref(false);
const report = ref(null);
const targetUser = ref(null);
const comparisonRows = ref([]);
const errorMessage = ref('');
const comparisonError = ref('');
const evaluationError = ref('');
const finalReviewMessage = ref('');
const finalReviewError = ref('');
const finalReviewForm = reactive({
  finalScore: '',
  finalGrade: '',
  finalComment: ''
});

const score = computed(() => report.value?.aiScore || null);
const targetTitle = computed(() => (isCenterManagerTarget.value ? '中心负责人周报' : '员工周报'));
const targetUserName = computed(() => targetUser.value?.displayName || targetUser.value?.account || '-');
const targetDepartment = computed(() => formatBusinessDepartment(targetUser.value?.department));
const isEmployeeTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.EMPLOYEE);
const isCenterManagerTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.CENTER_MANAGER);
const showEmployeeReviewTools = computed(
  () => props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER && isEmployeeTarget.value
);
const canEditFinalReview = computed(() => {
  if (props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER) {
    return isEmployeeTarget.value;
  }

  return props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER && isCenterManagerTarget.value;
});
const canEvaluate = computed(() => showEmployeeReviewTools.value && report.value?.status === ReportStatus.SUBMITTED);
const canExportOwnReport = computed(() => String(report.value?.userId) === String(props.currentUser.id));
const scoreSourceLabel = computed(() => (score.value?.source === 'ai' ? 'AI 评分完成' : '规则评分完成'));
const evaluationStatusText = computed(() => {
  if (evaluating.value) return '评分中';
  if (evaluationError.value) return '请求失败';
  if (!score.value) return '未评估';
  return scoreSourceLabel.value;
});
const finalScoreText = computed(() => {
  if (report.value?.finalScore === null || report.value?.finalScore === undefined) {
    return '待最终评分';
  }

  return `${report.value.finalScore}${report.value.finalGrade ? ` / ${report.value.finalGrade}` : ''}`;
});
const finalReviewerText = computed(() => {
  // Prefer the reviewer's display_name returned by the detail API; keep the id fallback for old responses.
  if (report.value?.finalReviewedByName) {
    return report.value.finalReviewedByName;
  }

  return report.value?.finalReviewedByUserId ? `用户 ${report.value.finalReviewedByUserId}` : '-';
});

// Keep readonly status labels consistent with list pages.
function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function completionStatusLabel(status) {
  const labels = {
    completed: '已完成',
    in_progress: '进行中',
    not_completed: '未完成',
    added: '新增'
  };
  return labels[status] || status || '-';
}

function matchStatusLabel(status) {
  const labels = {
    matched: '匹配',
    unmatched: '未匹配',
    weekly_only: '仅周报',
    daily_only: '仅日报'
  };
  return labels[status] || status || '-';
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return String(value).replace('T', ' ').slice(0, 16);
}

function comparisonRowKey(row) {
  return [row.date, row.weeklyTask, row.dailyProjectLabel || row.dailyProjectName, row.dailyWorkContent].join('|');
}

// Convert missing fallback dimensions to a visible placeholder for AI-only responses.
function dimensionValue(key) {
  const value = score.value?.components?.[key];
  return value === undefined || value === null ? '-' : value;
}

// Sync final-review inputs from the loaded report.
function applyReport(result) {
  report.value = result.report;
  targetUser.value = result.targetUser;
  finalReviewForm.finalScore = result.report.finalScore ?? '';
  finalReviewForm.finalGrade = result.report.finalGrade || '';
  finalReviewForm.finalComment = result.report.finalComment || '';
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

async function loadReport() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await getWeeklyReport(props.reportId, props.authToken);
    applyReport(result);
    if (showEmployeeReviewTools.value) {
      await loadComparisonTable();
    }
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

async function loadComparisonTable() {
  comparisonLoading.value = true;
  comparisonError.value = '';

  try {
    const result = await getWeeklyReportComparisonTable(props.reportId, props.authToken);
    comparisonRows.value = result.rows || [];
  } catch (error) {
    comparisonError.value = toReadableApiError(error);
  } finally {
    comparisonLoading.value = false;
  }
}

async function evaluateReport(force = false) {
  evaluating.value = true;
  evaluationError.value = '';

  try {
    const result = await evaluateWeeklyReport(props.reportId, { force }, props.authToken);
    report.value = result.report;
  } catch (error) {
    evaluationError.value = toReadableApiError(error);
  } finally {
    evaluating.value = false;
  }
}

async function saveFinalReview() {
  savingFinalReview.value = true;
  finalReviewMessage.value = '';
  finalReviewError.value = '';

  try {
    const result = await saveWeeklyReportFinalReview(
      props.reportId,
      {
        finalScore: finalReviewForm.finalScore,
        finalGrade: finalReviewForm.finalGrade,
        finalComment: finalReviewForm.finalComment
      },
      props.authToken
    );
    report.value = result.report;
    finalReviewMessage.value = '最终评分已保存。';
  } catch (error) {
    finalReviewError.value = toReadableApiError(error);
  } finally {
    savingFinalReview.value = false;
  }
}

async function downloadReportExcel() {
  if (!report.value) {
    return;
  }

  exporting.value = true;
  errorMessage.value = '';

  try {
    const download = await exportWeeklyReport(report.value.id, props.authToken);
    saveBlob(download, `周绩效考核表-${report.value.weekEnd}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    exporting.value = false;
  }
}

onMounted(loadReport);
</script>
