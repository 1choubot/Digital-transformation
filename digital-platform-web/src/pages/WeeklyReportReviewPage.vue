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
            <span class="status-badge" :class="approvalStatusClass(report.approvalStatus)">
              {{ approvalStatusLabel(report.approvalStatus) }}
            </span>
          </div>
          <div class="toolbar-actions">
            <button
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
              {{ exporting ? '导出中...' : '导出周报' }}
            </button>
            <button type="button" class="ghost-button" @click="navigate(returnPath)">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              返回列表
            </button>
          </div>
        </div>
        <div class="panel-body">
          <div class="weekly-review-meta">
            <div class="meta-item">
              <span class="meta-label">审批状态</span>
              <strong class="meta-value">{{ approvalStatusLabel(report.approvalStatus) }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">审批人</span>
              <strong class="meta-value">{{ approvalReviewerText }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">审批时间</span>
              <strong class="meta-value">{{ formatDateTime(report.approvalReviewedAt) }}</strong>
            </div>
          </div>
          <p v-if="report.approvalComment" class="final-comment final-comment--approval">
            打回原因：{{ report.approvalComment }}
          </p>
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

      <!-- AI/规则评分 -->
      <section class="panel weekly-score-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">AI/规则参考评分</strong>
            <span class="toolbar-subtitle">{{ scoringSubtitle }}</span>
          </div>
          <button
            v-if="canEvaluateScore"
            type="button"
            class="primary-button"
            :disabled="evaluating"
            @click="evaluateScore"
          >
            {{ evaluating ? '评分中...' : score ? '重新评估' : '开始评分' }}
          </button>
        </div>
        <div class="panel-body">
          <div class="score-grid">
            <div class="score-card">
              <span class="score-label">总分</span>
              <strong class="score-value">{{ scoreTotalText }}</strong>
            </div>
            <div class="score-card">
              <span class="score-label">等级</span>
              <strong class="score-value">{{ scoreGradeText }}</strong>
            </div>
            <div class="score-card">
              <span class="score-label">来源</span>
              <strong class="score-value">{{ scoreSourceText }}</strong>
            </div>
            <div class="score-card">
              <span class="score-label">评分时间</span>
              <strong class="score-value">{{ formatDateTime(report.aiEvaluatedAt) }}</strong>
            </div>
          </div>
          <div v-if="score?.components" class="dimension-grid">
            <div class="dimension-item">
              <span>日报填报</span>
              <strong>{{ dimensionValue('fillingRateScore') }}</strong>
            </div>
            <div class="dimension-item">
              <span>进度完成</span>
              <strong>{{ dimensionValue('progressScore') }}</strong>
            </div>
            <div class="dimension-item">
              <span>周日报匹配</span>
              <strong>{{ dimensionValue('matchScore') }}</strong>
            </div>
          </div>
          <p v-if="report.aiEvaluationError" class="score-note">
            AI 不可用，已使用规则评分：{{ report.aiEvaluationError }}
          </p>
          <p v-else-if="aiCapability.message && !aiCapability.evaluationAiAvailable" class="score-note">
            {{ aiCapability.message }}
          </p>
          <section v-if="scoreMessage" class="state-panel state-panel--success state-panel--compact">
            <p>{{ scoreMessage }}</p>
          </section>
          <section v-if="scoreError" class="state-panel state-panel--error state-panel--compact">
            <p>{{ scoreError }}</p>
          </section>
        </div>
      </section>

      <!-- 最终评审 -->
      <section class="panel weekly-final-review-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">最终评分/评审</strong>
            <span class="toolbar-subtitle">{{ canEditFinalReview ? '可保存' : '只读' }}</span>
          </div>
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
                  step="0.1"
                  :readonly="!canEditFinalReview"
                  placeholder="0-100"
                />
              </div>
            </div>
            <div class="form-field">
              <span class="field-label">最终等级</span>
              <div class="input-wrapper">
                <select v-model="finalReviewForm.finalGrade" :disabled="!canEditFinalReview">
                  <option value="">自动/不填写</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>
            </div>
            <div class="form-field form-field--full">
              <span class="field-label">最终评语</span>
              <textarea
                v-model="finalReviewForm.finalComment"
                class="form-control form-textarea"
                :readonly="!canEditFinalReview"
                placeholder="填写最终评语"
              />
            </div>
          </div>
          <div class="weekly-review-meta weekly-review-meta--final">
            <div class="meta-item">
              <span class="meta-label">最终评审人</span>
              <strong class="meta-value">{{ finalReviewerText }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">最终评审时间</span>
              <strong class="meta-value">{{ formatDateTime(report.finalReviewedAt) }}</strong>
            </div>
          </div>
          <div v-if="canEditFinalReview" class="form-actions">
            <button
              type="button"
              class="primary-button"
              :disabled="savingFinalReview"
              @click="submitFinalReview"
            >
              {{ savingFinalReview ? '保存中...' : '保存最终评审' }}
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

      <!-- 审批 -->
      <section class="panel weekly-approval-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">审批</strong>
            <span class="toolbar-subtitle">{{ canReviewApproval ? '待审批' : '只读' }}</span>
          </div>
        </div>
        <div class="panel-body">
          <div class="weekly-final-review-form">
            <div class="form-field form-field--full">
              <span class="field-label">打回原因</span>
              <textarea
                v-model="approvalForm.comment"
                class="form-control form-textarea"
                :readonly="!canReviewApproval"
                placeholder="打回时必须填写原因"
              />
            </div>
          </div>
          <div v-if="canReviewApproval" class="form-actions">
            <button
              type="button"
              class="primary-button"
              :disabled="savingApproval"
              @click="submitApproval('approve')"
            >
              通过审批
            </button>
            <button
              type="button"
              class="ghost-button ghost-button--danger"
              :disabled="savingApproval"
              @click="submitApproval('return')"
            >
              打回
            </button>
          </div>
          <section v-if="approvalMessage" class="state-panel state-panel--success state-panel--compact">
            <p>{{ approvalMessage }}</p>
          </section>
          <section v-if="approvalError" class="state-panel state-panel--error state-panel--compact">
            <p>{{ approvalError }}</p>
          </section>
        </div>
      </section>

    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus, WeeklyApprovalStatus } from '../constants/reports.js';
import {
  evaluateWeeklyReport,
  exportWeeklyReport,
  getWeeklyReport,
  getWeeklyReportAiCapability,
  reviewWeeklyReportApproval,
  saveWeeklyReportFinalReview,
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
const savingApproval = ref(false);
const exporting = ref(false);
const evaluating = ref(false);
const savingFinalReview = ref(false);
const report = ref(null);
const targetUser = ref(null);
const errorMessage = ref('');
const approvalMessage = ref('');
const approvalError = ref('');
const scoreMessage = ref('');
const scoreError = ref('');
const finalReviewMessage = ref('');
const finalReviewError = ref('');
const approvalForm = reactive({
  comment: ''
});
const finalReviewForm = reactive({
  finalScore: '',
  finalGrade: '',
  finalComment: ''
});
const aiCapability = reactive({
  loaded: false,
  prefillAiAvailable: false,
  evaluationAiAvailable: false,
  message: ''
});

const targetUserName = computed(() => targetUser.value?.displayName || targetUser.value?.account || '-');
const isEmployeeTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.EMPLOYEE);
const isCenterManagerTarget = computed(() => targetUser.value?.organizationRole === OrganizationRole.CENTER_MANAGER);

const showEmployeeReviewTools = computed(
  () => props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER && isEmployeeTarget.value
);
// These panels are intentionally disabled for the weekly attendance review page.
const showWeeklyComparisonPanel = computed(() => false && showEmployeeReviewTools.value);
// Center managers approve employee reports; general managers approve center-manager reports.
const canReviewApproval = computed(
  () =>
    report.value?.approvalStatus === WeeklyApprovalStatus.PENDING &&
    ((props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER && isEmployeeTarget.value) ||
      (props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER && isCenterManagerTarget.value))
);
const isApprovedSubmitted = computed(
  () => report.value?.status === ReportStatus.SUBMITTED && report.value?.approvalStatus === WeeklyApprovalStatus.APPROVED
);
const canEvaluateScore = computed(
  () =>
    isApprovedSubmitted.value &&
    props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER &&
    isEmployeeTarget.value
);
const canEditFinalReview = computed(
  () =>
    isApprovedSubmitted.value &&
    ((props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER && isEmployeeTarget.value) ||
      (props.currentUser.organizationRole === OrganizationRole.GENERAL_MANAGER && isCenterManagerTarget.value))
);
const score = computed(() => report.value?.aiScore || null);
const scoreTotalText = computed(() =>
  score.value?.totalScore === null || score.value?.totalScore === undefined ? '-' : String(score.value.totalScore)
);
const scoreGradeText = computed(() => score.value?.grade || '-');
const scoreSourceText = computed(() => scoreSourceLabel(report.value?.aiEvaluationSource || score.value?.source));
const scoringSubtitle = computed(() => {
  if (!isApprovedSubmitted.value) return '审批通过后可评分';
  if (canEvaluateScore.value) {
    if (!aiCapability.evaluationAiAvailable) return score.value ? '已有规则评分' : 'AI 未配置，使用规则评分';
    return score.value ? '已有评分' : '可评分';
  }
  return '无评分权限';
});
const approvalReviewerText = computed(() => {
  if (report.value?.approvalReviewedByName) {
    return report.value.approvalReviewedByName;
  }
  return report.value?.approvalReviewedByUserId ? `用户 ${report.value.approvalReviewedByUserId}` : '-';
});
const finalReviewerText = computed(() => {
  if (report.value?.finalReviewedByName) {
    return report.value.finalReviewedByName;
  }
  return report.value?.finalReviewedByUserId ? `用户 ${report.value.finalReviewedByUserId}` : '-';
});

// Approval state is the business status shown on review pages.
function approvalStatusLabel(status) {
  const labels = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: '未提交',
    [WeeklyApprovalStatus.PENDING]: '审批中',
    [WeeklyApprovalStatus.APPROVED]: '审批通过',
    [WeeklyApprovalStatus.RETURNED]: '已打回'
  };
  return labels[status] || labels[WeeklyApprovalStatus.NOT_SUBMITTED];
}

// Approval status classes share the existing compact badge component.
function approvalStatusClass(status) {
  const classes = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'status-badge--draft',
    [WeeklyApprovalStatus.PENDING]: 'status-badge--pending',
    [WeeklyApprovalStatus.APPROVED]: 'status-badge--done',
    [WeeklyApprovalStatus.RETURNED]: 'status-badge--returned'
  };
  return classes[status] || classes[WeeklyApprovalStatus.NOT_SUBMITTED];
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

function scoreSourceLabel(source) {
  const labels = {
    ai: 'AI',
    fallback_rule: '规则'
  };
  return labels[source] || '-';
}

function dimensionValue(key) {
  const value = score.value?.components?.[key];
  return value === null || value === undefined ? '-' : String(value);
}

function saveBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applyReport(result) {
  report.value = result.report;
  targetUser.value = result.targetUser;
  approvalForm.comment = result.report.approvalComment || '';
  finalReviewForm.finalScore = result.report.finalScore ?? result.report.aiScore?.totalScore ?? '';
  finalReviewForm.finalGrade = result.report.finalGrade || result.report.aiScore?.grade || '';
  finalReviewForm.finalComment = result.report.finalComment || '';
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

// Submit the center manager's approval decision and refresh the displayed report state.
async function submitApproval(action) {
  savingApproval.value = true;
  approvalMessage.value = '';
  approvalError.value = '';

  try {
    const result = await reviewWeeklyReportApproval(
      props.reportId,
      {
        action,
        comment: approvalForm.comment
      },
      props.authToken
    );
    applyReport({ report: result.report, targetUser: targetUser.value });
    approvalMessage.value = action === 'approve' ? '审批已通过。' : '周报已打回。';
  } catch (error) {
    approvalError.value = toReadableApiError(error);
  } finally {
    savingApproval.value = false;
  }
}

async function loadAiCapability() {
  try {
    const result = await getWeeklyReportAiCapability(props.authToken);
    const capability = result.capability || {};
    aiCapability.loaded = true;
    aiCapability.prefillAiAvailable = Boolean(capability.prefillAiAvailable);
    aiCapability.evaluationAiAvailable = Boolean(capability.evaluationAiAvailable);
    aiCapability.message = capability.message || '';
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    aiCapability.loaded = true;
    aiCapability.prefillAiAvailable = false;
    aiCapability.evaluationAiAvailable = false;
    aiCapability.message = 'AI 能力状态暂不可用，将使用规则评分。';
  }
}

async function evaluateScore() {
  if (!canEvaluateScore.value) return;
  evaluating.value = true;
  scoreMessage.value = '';
  scoreError.value = '';

  try {
    const result = await evaluateWeeklyReport(props.reportId, { force: Boolean(score.value) }, props.authToken);
    applyReport({ report: result.report, targetUser: targetUser.value });
    scoreMessage.value = result.cached ? '已使用现有评分。' : '评分已更新。';
  } catch (error) {
    scoreError.value = toReadableApiError(error);
  } finally {
    evaluating.value = false;
  }
}

async function submitFinalReview() {
  if (!canEditFinalReview.value) return;
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
    applyReport({ report: result.report, targetUser: targetUser.value });
    finalReviewMessage.value = '最终评审已保存。';
  } catch (error) {
    finalReviewError.value = toReadableApiError(error);
  } finally {
    savingFinalReview.value = false;
  }
}

async function downloadReportExcel() {
  if (!report.value) return;
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

onMounted(() => {
  void loadAiCapability();
  void loadReport();
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
.ghost-button--danger {
  color: #f56c6c;
  border-color: #fde2e2;
}
.ghost-button--danger:hover:not(:disabled) {
  background: #fef0f0;
  border-color: #fbc4c4;
  color: #f56c6c;
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
.final-comment--approval {
  border-left-color: #f56c6c;
  background: #fef0f0;
  color: #9f3a38;
}

/* ===== 评分面板 ===== */
.score-grid,
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}
.dimension-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 1rem;
}
.score-card,
.dimension-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.8rem 1rem;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.score-label,
.dimension-item span {
  font-size: 0.75rem;
  color: #909399;
}
.score-value,
.dimension-item strong {
  font-size: 1rem;
  color: #303133;
}
.score-note {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: #fdf6ec;
  color: #b88230;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.weekly-review-meta--final {
  margin-top: 1rem;
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
  .score-grid,
  .dimension-grid {
    grid-template-columns: 1fr;
  }
  .form-actions {
    justify-content: center;
  }
}
</style>
