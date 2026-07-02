<template>
  <section class="page-stack weekly-review-page animate-fadeIn">
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
      <!-- 周报摘要信息（包含被考评人 + 操作按钮） -->
      <section class="panel weekly-review-summary">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <span class="evaluatee-name">被考评人：{{ targetUserName }}</span>
            <span class="divider">|</span>
            <strong class="toolbar-title">{{ report.weekStart }} 至 {{ report.weekEnd }}</strong>
            <span class="status-badge" :class="statusClass(report.status)">
              {{ statusLabel(report.status) }}
            </span>
            <span class="toolbar-subtitle">评分：{{ finalScoreText }}</span>
          </div>
          <div class="toolbar-actions">
            <button type="button" class="ghost-button" @click="navigate(returnPath)">
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
              <span class="meta-label">等级</span>
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
              <span>项目</span>
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
              <div class="summary-project-cell">
                <div class="source-chip-row source-chip-row--readonly">
                  <span class="source-chip" :class="sourceChipClass(summary)">
                    {{ sourceTypeLabel(summary) }}
                  </span>
                </div>
                <strong>{{ summaryProjectLabel(summary) }}</strong>
              </div>
              <span>{{ summary.workTarget }}</span>
              <span>{{ summary.plannedDate }}</span>
              <span class="completion-status" :class="completionStatusClass(summary.completionStatus)">
                {{ completionStatusLabel(summary.completionStatus) }}
              </span>
              <span>{{ summary.completionDescription }}</span>
              <span>{{ summary.completedDate || '-' }}</span>
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

      <!-- 周日报对比暂时注释隐藏，保留代码便于后续恢复。 -->
      <section v-if="showWeeklyComparisonPanel" class="panel weekly-comparison-panel">
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

      <!-- AI评分暂时注释隐藏，保留代码便于后续恢复。 -->
      <section v-if="showWeeklyEvaluationPanel" class="panel weekly-evaluation-panel">
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
          <div v-if="score.summary || score.suggestions?.length" class="weekly-score__body">
            <h3>AI评语</h3>
            <p v-if="score.summary">{{ score.summary }}</p>
            <ul v-if="score.suggestions?.length">
              <li v-for="(suggestion, index) in score.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 评分 -->
      <section class="panel weekly-final-review-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">评分</strong>
            <span class="toolbar-subtitle">{{ canEditFinalReview ? '可编辑' : '只读' }}</span>
          </div>
          <!-- 按钮已移除，移至下方 -->
        </div>
        <div class="panel-body">
          <div class="weekly-final-review-form">
            <div class="form-field">
              <span class="field-label">分数</span>
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
              <span class="field-label">等级</span>
              <div class="input-wrapper">
                <select v-model="finalReviewForm.finalGrade" :disabled="!canEditFinalReview">
                  <option value="">请选择</option>
                  <option v-for="grade in finalGradeOptions" :key="grade" :value="grade">{{ grade }}</option>
                </select>
              </div>
            </div>
            <div class="form-field form-field--full">
              <span class="field-label">评语</span>
              <textarea
                v-model="finalReviewForm.finalComment"
                class="form-control form-textarea"
                :readonly="!canEditFinalReview"
                placeholder="请输入评语..."
              />
            </div>
          </div>

          <!-- 按钮放在表单底部 -->
          <div v-if="canEditFinalReview" class="form-actions">
            <button
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
  exportWeeklyReport,
  getWeeklyReport,
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
  },
  route: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

// 计算返回路径
const returnPath = computed(() => {
  const from = props.route.query?.from;
  return from === 'overview' ? '/weekly-overview' : '/weekly-reports';
});

const loading = ref(false);
const exporting = ref(false);
const savingFinalReview = ref(false);
const report = ref(null);
const targetUser = ref(null);
const errorMessage = ref('');
const finalReviewMessage = ref('');
const finalReviewError = ref('');
const finalReviewForm = reactive({
  finalScore: '',
  finalGrade: '',
  finalComment: ''
});
const finalGradeOptions = ['A', 'B', 'C', 'D', 'E'];

const targetUserName = computed(() => targetUser.value?.displayName || targetUser.value?.account || '-');
const targetDepartment = computed(() => formatBusinessDepartment(targetUser.value?.department));
const isEmployeeTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.EMPLOYEE);
const isCenterManagerTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.CENTER_MANAGER);

// 页面标题显示“被考评人：xxx”（已移至摘要面板，此处保留以备他用）
const pageTitleDisplay = computed(() => {
  const name = targetUserName.value || '用户';
  return `被考评人：${name}`;
});

const showEmployeeReviewTools = computed(
  () => props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER && isEmployeeTarget.value
);
// These panels are intentionally disabled for the weekly attendance review page.
const showWeeklyComparisonPanel = computed(() => false && showEmployeeReviewTools.value);
const showWeeklyEvaluationPanel = computed(() => false && showEmployeeReviewTools.value);
const canEditFinalReview = computed(() => {
  if (props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER) {
    return isEmployeeTarget.value;
  }
  return props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER && isCenterManagerTarget.value;
});
const canExportOwnReport = computed(() => String(report.value?.userId) === String(props.currentUser.id));
const finalScoreText = computed(() => {
  if (report.value?.finalScore === null || report.value?.finalScore === undefined) {
    return '待评分';
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

// Mirror the weekly edit page source labels in the read-only review table.
function sourceTypeLabel(summary) {
  if (summary?.sourceType === 'weekly_plan') return '执行周计划';
  if (summary?.sourceType === 'ad_hoc') return '新增临时工作';
  return '历史待确认';
}

// Keep source chips visually aligned with the weekly edit table.
function sourceChipClass(summary) {
  if (summary?.sourceType === 'weekly_plan') return 'source-chip--plan';
  if (summary?.sourceType === 'ad_hoc') return 'source-chip--adhoc';
  return 'source-chip--legacy';
}

// Ad hoc summaries may have old saved workTask text, so prefer the joined project label.
function summaryProjectLabel(summary) {
  if (summary?.sourceType === 'ad_hoc' && summary?.projectLabel) {
    return summary.projectLabel;
  }
  return summary?.workTask || '-';
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
    // Skip weekly-vs-daily loading while the comparison panel is hidden.
    if (showWeeklyComparisonPanel.value) {
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
    finalReviewMessage.value = '评分已保存。';
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
.evaluatee-name {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}
.divider {
  color: #dcdfe6;
  font-weight: 300;
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
.state-panel--success {
  background: #f0f9eb;
  color: #67c23a;
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

/* Read-only summary rows reuse the weekly edit page project/source layout. */
.summary-project-cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.summary-project-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-chip-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.source-chip-row--readonly {
  margin-bottom: 0;
}
.source-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.4rem;
  padding: 0 0.45rem;
  border-radius: 4px;
  font-size: 0.75rem;
  line-height: 1.4;
  background: #eef2ff;
  color: #334155;
}
.source-chip--plan {
  background: #ecfdf3;
  color: #166534;
}
.source-chip--adhoc {
  background: #fff7ed;
  color: #9a3412;
}
.source-chip--legacy {
  background: #f1f5f9;
  color: #475569;
}

/* ===== 完成状态标签（核心修改） ===== */
.completion-status {
  display: inline-block;            /* 保持内联块 */
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;              /* 强制单行，不换行 */
  width: fit-content;              /* 宽度完全由内容决定 */
  max-width: 100%;                 /* 防止溢出父容器（但实际不会） */
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

/* ===== 评分表单 ===== */
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

/* 表单操作按钮容器 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #ebeef5;
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
  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
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
  .weekly-final-review-form {
    grid-template-columns: 1fr;
  }
  .form-actions {
    justify-content: center;
  }
}
</style>
