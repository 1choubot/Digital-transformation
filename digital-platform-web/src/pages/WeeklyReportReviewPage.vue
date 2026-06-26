<template>
  <section class="page-stack weekly-review-page animate-fadeIn">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__left">
        <span class="section-eyebrow">周报详情</span>
        <h2 class="page-title">{{ targetTitle }}</h2>
        <span class="page-user">{{ targetUserName }} / {{ targetDepartment }}</span>
      </div>
      <div class="page-header__right">
        <button type="button" class="ghost-button" @click="navigate('/weekly-reports')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回列表
        </button>
        <button
          v-if="canExportOwnReport"
          type="button"
          class="ghost-button"
          :disabled="exporting"
          @click="downloadReportExcel"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ exporting ? '正在导出' : '导出 Excel' }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <section v-if="loading" class="state-panel panel">
      <div class="loading-spinner"></div>
      <p>正在加载周报详情...</p>
    </section>

    <!-- 错误状态 -->
    <section v-else-if="errorMessage" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ errorMessage }}</p>
    </section>

    <template v-else-if="report">
      <!-- 周报摘要信息 -->
      <section class="panel weekly-review-summary">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">{{ report.weekStart }} 至 {{ report.weekEnd }}</strong>
            <span class="status-badge" :class="statusClass(report.status)">
              {{ statusLabel(report.status) }}
            </span>
            <span class="toolbar-subtitle">最终评分：{{ finalScoreText }}</span>
          </div>
        </div>
        <div class="panel-body">
          <div class="weekly-review-meta">
            <div class="meta-item">
              <span class="meta-label">评分人</span>
              <strong class="meta-value">{{ finalReviewerText }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">评分时间</span>
              <strong class="meta-value">{{ formatDateTime(report.finalReviewedAt) }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">最终等级</span>
              <strong class="meta-value">{{ report.finalGrade || '-' }}</strong>
            </div>
          </div>
          <p v-if="report.finalComment" class="final-comment">{{ report.finalComment }}</p>
        </div>
      </section>

      <!-- 本周工作总结（只读） -->
      <section class="panel weekly-readonly-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">本周工作总结</strong>
            <span class="toolbar-subtitle">只读</span>
          </div>
        </div>
        <div class="table-container">
          <div class="weekly-readonly-table weekly-readonly-table--summaries">
            <div class="weekly-readonly-table__head">
              <span>工作任务</span>
              <span>工作目标</span>
              <span>计划日期</span>
              <span>完成状态</span>
              <span>完成说明</span>
              <span>完成日期</span>
            </div>
            <div
              v-for="summary in report.summaries"
              :key="summary.id || summary.sortOrder"
              class="weekly-readonly-table__row"
            >
              <strong>{{ summary.workTask }}</strong>
              <span>{{ summary.workTarget }}</span>
              <span>{{ summary.plannedDate }}</span>
              <span class="completion-status" :class="completionStatusClass(summary.completionStatus)">
                {{ completionStatusLabel(summary.completionStatus) }}
              </span>
              <span>{{ summary.completionDescription }}</span>
              <span>{{ summary.completedDate }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 下周工作计划（只读） -->
      <section class="panel weekly-readonly-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">下周工作计划</strong>
            <span class="toolbar-subtitle">只读</span>
          </div>
        </div>
        <div class="table-container">
          <div class="weekly-readonly-table weekly-readonly-table--plans">
            <div class="weekly-readonly-table__head">
              <span>工作任务</span>
              <span>工作目标</span>
              <span>计划日期</span>
              <span>责任人</span>
            </div>
            <div
              v-for="plan in report.plans"
              :key="plan.id || plan.sortOrder"
              class="weekly-readonly-table__row"
            >
              <strong>{{ plan.workTask }}</strong>
              <span>{{ plan.workTarget }}</span>
              <span>{{ plan.plannedDate }}</span>
              <span>{{ plan.responsiblePerson || '-' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 周vs日对照表（仅中心负责人查看员工周报时显示） -->
      <section v-if="showEmployeeReviewTools" class="panel weekly-comparison-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">周vs日对照表</strong>
            <span class="toolbar-subtitle">{{ comparisonRows.length ? `共 ${comparisonRows.length} 行` : '无对照数据' }}</span>
          </div>
          <button type="button" class="ghost-button" :disabled="comparisonLoading" @click="loadComparisonTable">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
            </svg>
            刷新对照
          </button>
        </div>

        <section v-if="comparisonError" class="state-panel state-panel--error panel state-panel--compact">
          <p>{{ comparisonError }}</p>
        </section>

        <div v-if="comparisonLoading" class="state-panel panel">
          <div class="loading-spinner"></div>
          <p>正在加载对照表...</p>
        </div>

        <div v-else class="table-container">
          <div class="weekly-comparison-table">
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
            <div
              v-for="row in comparisonRows"
              :key="comparisonRowKey(row)"
              class="weekly-comparison-table__row"
            >
              <span>{{ row.date || '-' }}</span>
              <span>{{ row.weekday || '-' }}</span>
              <span>{{ row.weeklyTask || '-' }}</span>
              <span>{{ row.weeklySummaryText || '-' }}</span>
              <span>{{ row.dailyProjectLabel || row.dailyProjectName || '-' }}</span>
              <span>{{ row.dailyWorkContent || '-' }}</span>
              <span>{{ row.dailyCompletionProgress || '-' }}</span>
              <span>{{ row.dailyCompletedAt || '-' }}</span>
              <span>{{ row.weeklyCompletedDate || '-' }}</span>
              <span class="match-status" :class="matchStatusClass(row.matchStatus)">
                {{ matchStatusLabel(row.matchStatus) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- AI/规则参考评分 -->
      <section v-if="showEmployeeReviewTools" class="panel weekly-evaluation-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">AI/规则参考评分</strong>
            <span class="toolbar-subtitle">{{ evaluationStatusText }}</span>
          </div>
          <button
            type="button"
            class="primary-button"
            :disabled="!canEvaluate || evaluating"
            @click="evaluateReport(true)"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
            </svg>
            {{ evaluating ? '评分中...' : score ? '重新评估' : '开始评分' }}
          </button>
        </div>

        <section v-if="evaluationError" class="state-panel state-panel--error panel state-panel--compact">
          <p>{{ evaluationError }}</p>
        </section>

        <div v-if="!score" class="state-panel panel state-panel--empty">
          <p>尚未评估。</p>
        </div>

        <div v-else class="panel-body">
          <div class="weekly-score">
            <div class="weekly-score__summary">
              <div class="score-item">
                <span class="score-label">参考总分</span>
                <strong class="score-value">{{ score.totalScore }}</strong>
              </div>
              <div class="score-item">
                <span class="score-label">参考等级</span>
                <strong class="score-value">{{ score.grade || '-' }}</strong>
              </div>
              <div class="score-item">
                <span class="score-label">来源</span>
                <strong class="score-value">{{ scoreSourceLabel }}</strong>
              </div>
            </div>
            <div class="weekly-score__dimensions">
              <div class="dimension-item">
                <span class="dimension-label">填写率</span>
                <strong class="dimension-value">{{ dimensionValue('fillingRateScore') }}</strong>
              </div>
              <div class="dimension-item">
                <span class="dimension-label">完成进度</span>
                <strong class="dimension-value">{{ dimensionValue('progressScore') }}</strong>
              </div>
              <div class="dimension-item">
                <span class="dimension-label">日报吻合度</span>
                <strong class="dimension-value">{{ dimensionValue('matchScore') }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 最终评分 -->
      <section class="panel weekly-final-review-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">最终评分</strong>
            <span class="toolbar-subtitle">{{ canEditFinalReview ? '可编辑' : '只读' }}</span>
          </div>
          <button
            v-if="canEditFinalReview"
            type="button"
            class="primary-button"
            :disabled="savingFinalReview"
            @click="saveFinalReview"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {{ savingFinalReview ? '正在保存' : '确认评分' }}
          </button>
        </div>
        <div class="panel-body">
          <div class="weekly-final-review-form">
            <div class="form-field">
              <span class="field-label">最终分数</span>
              <div class="input-wrapper">
                <input
                  v-model="finalReviewForm.finalScore"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  :readonly="!canEditFinalReview"
                  placeholder="0-100"
                />
              </div>
            </div>
            <div class="form-field">
              <span class="field-label">最终等级</span>
              <div class="input-wrapper">
                <select v-model="finalReviewForm.finalGrade" :disabled="!canEditFinalReview">
                  <option value="">请选择</option>
                  <option v-for="grade in finalGradeOptions" :key="grade" :value="grade">{{ grade }}</option>
                </select>
              </div>
            </div>
            <div class="form-field form-field--full">
              <span class="field-label">最终评语</span>
              <textarea
                v-model="finalReviewForm.finalComment"
                class="form-control form-textarea"
                :readonly="!canEditFinalReview"
                placeholder="请输入评语..."
              />
            </div>
          </div>

          <section v-if="finalReviewMessage" class="state-panel state-panel--success state-panel--compact">
            <p>{{ finalReviewMessage }}</p>
          </section>
          <section v-if="finalReviewError" class="state-panel state-panel--error state-panel--compact">
            <p>{{ finalReviewError }}</p>
          </section>
        </div>
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
const finalGradeOptions = ['A', 'B', 'C', 'D', 'E'];

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
  if (report.value?.finalReviewedByName) {
    return report.value.finalReviewedByName;
  }
  return report.value?.finalReviewedByUserId ? `用户 ${report.value.finalReviewedByUserId}` : '-';
});

function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--draft';
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

function completionStatusClass(status) {
  const classes = {
    completed: 'status--completed',
    in_progress: 'status--in-progress',
    not_completed: 'status--not-completed',
    added: 'status--added'
  };
  return classes[status] || '';
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

function matchStatusClass(status) {
  const classes = {
    matched: 'match--matched',
    unmatched: 'match--unmatched',
    weekly_only: 'match--weekly-only',
    daily_only: 'match--daily-only'
  };
  return classes[status] || '';
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

function dimensionValue(key) {
  const value = score.value?.components?.[key];
  return value === undefined || value === null ? '-' : value;
}

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

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.page-header__left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.page-header__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.section-eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
  line-height: 1.2;
}
.page-user {
  font-size: 0.85rem;
  color: #909399;
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

/* ===== 周报摘要元信息 ===== */
.weekly-review-meta {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.meta-label {
  font-size: 0.75rem;
  color: #909399;
}
.meta-value {
  font-size: 0.95rem;
  color: #303133;
}
.final-comment {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fafafa;
  border-radius: 4px;
  border-left: 3px solid #3e63dd;
  font-size: 0.9rem;
  color: #606266;
}

/* ===== 只读表格 ===== */
.table-container {
  overflow-x: auto;
  width: 100%;
  padding: 0 0 0.5rem 0;
}

.weekly-readonly-table {
  min-width: 700px;
  width: 100%;
}
.weekly-readonly-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  gap: 0.75rem;
}
.weekly-readonly-table--summaries .weekly-readonly-table__head {
  grid-template-columns: 1.5fr 1.5fr 0.9fr 0.9fr 1.5fr 0.9fr;
}
.weekly-readonly-table--plans .weekly-readonly-table__head {
  grid-template-columns: 1.8fr 1.8fr 0.9fr 1.2fr;
}

.weekly-readonly-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
}
.weekly-readonly-table--summaries .weekly-readonly-table__row {
  grid-template-columns: 1.5fr 1.5fr 0.9fr 0.9fr 1.5fr 0.9fr;
}
.weekly-readonly-table--plans .weekly-readonly-table__row {
  grid-template-columns: 1.8fr 1.8fr 0.9fr 1.2fr;
}
.weekly-readonly-table__row:hover {
  background: #fdfdfe;
}
.weekly-readonly-table__row strong {
  font-weight: 500;
  color: #303133;
}

/* 完成状态标签 */
.completion-status {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
.status--completed {
  background: #f0f9eb;
  color: #67c23a;
}
.status--in-progress {
  background: #ecf5ff;
  color: #3e63dd;
}
.status--not-completed {
  background: #fef0f0;
  color: #f56c6c;
}
.status--added {
  background: #fdf6ec;
  color: #e6a23c;
}

/* ===== 对照表 ===== */
.weekly-comparison-table {
  min-width: 1000px;
  width: 100%;
  font-size: 0.85rem;
}
.weekly-comparison-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.7rem;
  font-weight: 600;
  color: #909399;
  gap: 0.5rem;
  grid-template-columns: 0.7fr 0.6fr 1.2fr 1.2fr 1fr 1.5fr 0.7fr 0.8fr 0.8fr 0.6fr;
}
.weekly-comparison-table__row {
  display: grid;
  padding: 0.5rem 0.75rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.5rem;
  transition: background 0.2s ease;
  grid-template-columns: 0.7fr 0.6fr 1.2fr 1.2fr 1fr 1.5fr 0.7fr 0.8fr 0.8fr 0.6fr;
}
.weekly-comparison-table__row:hover {
  background: #fdfdfe;
}
.weekly-comparison-table__row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-status {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}
.match--matched {
  background: #f0f9eb;
  color: #67c23a;
}
.match--unmatched {
  background: #fef0f0;
  color: #f56c6c;
}
.match--weekly-only {
  background: #fdf6ec;
  color: #e6a23c;
}
.match--daily-only {
  background: #ecf5ff;
  color: #3e63dd;
}

/* ===== 评分展示 ===== */
.weekly-score {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.weekly-score__summary {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.score-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.score-label {
  font-size: 0.8rem;
  color: #909399;
}
.score-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
}

.weekly-score__dimensions {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid #ebeef5;
}
.dimension-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dimension-label {
  font-size: 0.8rem;
  color: #909399;
}
.dimension-value {
  font-size: 1rem;
  font-weight: 600;
  color: #3e63dd;
}

/* ===== 最终评分表单 ===== */
.weekly-final-review-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
}
.form-field--full {
  grid-column: 1 / -1;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field-label {
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
.input-wrapper input[readonly] {
  background: #f5f7fa;
  color: #606266;
  cursor: not-allowed;
}
.input-wrapper select:disabled {
  background: #f5f7fa;
  color: #606266;
  cursor: not-allowed;
}
.input-wrapper input::placeholder {
  color: #c0c4cc;
}
.input-wrapper select {
  appearance: auto;
  cursor: pointer;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: #303133;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  transition: border-color 0.2s ease;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.form-control:focus {
  border-color: #3e63dd;
}
.form-control[readonly] {
  background: #f5f7fa;
  color: #606266;
  cursor: not-allowed;
}

.form-textarea {
  height: 80px;
  resize: vertical;
  line-height: 1.5;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-header__right {
    width: 100%;
    justify-content: flex-start;
  }
  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .weekly-review-meta {
    flex-direction: column;
    gap: 0.75rem;
  }
  .weekly-readonly-table__head,
  .weekly-readonly-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.4rem;
  }
  .weekly-readonly-table__head {
    display: none;
  }
  .weekly-readonly-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .weekly-comparison-table__head,
  .weekly-comparison-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.4rem;
  }
  .weekly-comparison-table__head {
    display: none;
  }
  .weekly-comparison-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .weekly-comparison-table__row span {
    white-space: normal;
  }
  .weekly-final-review-form {
    grid-template-columns: 1fr;
  }
  .weekly-score__summary {
    flex-direction: column;
    gap: 0.5rem;
  }
  .weekly-score__dimensions {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>