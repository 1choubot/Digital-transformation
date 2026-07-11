<template>
  <section class="page-stack weekly-review-page animate-fadeIn">
    <!-- 加载状态 -->
    <section v-if="loading" class="panel panel-body">
      <el-skeleton :rows="8" animated />
    </section>

    <!-- 错误状态 -->
    <el-alert v-else-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <template v-else-if="report">
      <!-- 周报摘要信息（包含被考评人 + 操作按钮） -->
      <section class="panel weekly-review-summary">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <span class="evaluatee-name">被考评人：{{ targetUserName }}</span>
            <span class="divider">|</span>
            <strong class="toolbar-title">{{ report.weekStart }} 至 {{ report.weekEnd }}</strong>
            <el-tag :type="approvalStatusTagType(report.approvalStatus)">
              {{ approvalStatusLabel(report.approvalStatus) }}
            </el-tag>
            <span class="toolbar-subtitle">评分：{{ finalScoreText }}</span>
          </div>
          <div class="toolbar-actions">
            <el-button @click="navigate(returnPath)">返回列表</el-button>
            <el-button
              v-if="canExportOwnReport"
              :loading="exporting"
              @click="downloadReportExcel"
            >
              导出 Excel
            </el-button>
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
          <p v-if="report.approvalComment" class="final-comment final-comment--approval">
            打回原因：{{ report.approvalComment }}
          </p>
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
          <el-button :loading="comparisonLoading" @click="loadComparisonTable">
            刷新对照
          </el-button>
        </div>

        <el-alert v-if="comparisonError" :title="comparisonError" type="error" show-icon :closable="false" />

        <el-skeleton v-if="comparisonLoading" :rows="5" animated />

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
          <el-button
            type="primary"
            :disabled="!canEvaluate"
            :loading="evaluating"
            @click="evaluateReport(true)"
          >
            {{ score ? '重新评估' : '开始评分' }}
          </el-button>
        </div>

        <el-alert v-if="evaluationError" :title="evaluationError" type="error" show-icon :closable="false" />

        <el-empty v-if="!score" description="尚未评估" />

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
              <el-input
                v-model="approvalForm.comment"
                type="textarea"
                :rows="3"
                :disabled="!canReviewApproval"
                placeholder="打回时必须填写原因"
              />
            </div>
          </div>
          <div v-if="canReviewApproval" class="form-actions">
            <el-button
              type="primary"
              :loading="savingApproval"
              @click="submitApproval('approve')"
            >
              通过审批
            </el-button>
            <el-button
              type="danger"
              plain
              :disabled="savingApproval"
              @click="submitApproval('return')"
            >
              打回
            </el-button>
          </div>
          <el-alert
            v-else
            title="当前审批已锁定或当前账号无审批权限，仅可查看。"
            type="info"
            show-icon
            :closable="false"
          />
          <el-alert v-if="approvalMessage" :title="approvalMessage" type="success" show-icon :closable="false" />
          <el-alert v-if="approvalError" :title="approvalError" type="error" show-icon :closable="false" />
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
              <el-input-number
                v-model="finalReviewForm.finalScore"
                :min="0"
                :max="100"
                :step="0.01"
                :precision="2"
                :disabled="!canEditFinalReview"
                controls-position="right"
              />
            </div>
            <div class="form-field">
              <span class="field-label">等级</span>
              <el-select v-model="finalReviewForm.finalGrade" :disabled="!canEditFinalReview" clearable placeholder="请选择">
                <el-option v-for="grade in finalGradeOptions" :key="grade" :label="grade" :value="grade" />
              </el-select>
            </div>
            <div class="form-field form-field--full">
              <span class="field-label">评语</span>
              <el-input
                v-model="finalReviewForm.finalComment"
                type="textarea"
                :rows="3"
                :disabled="!canEditFinalReview"
                placeholder="请输入评语..."
              />
            </div>
          </div>

          <!-- 按钮放在表单底部 -->
          <div v-if="canEditFinalReview" class="form-actions">
            <el-button
              type="primary"
              :loading="savingFinalReview"
              @click="saveFinalReview"
            >
              确认评分
            </el-button>
          </div>

          <el-alert v-if="finalReviewMessage" :title="finalReviewMessage" type="success" show-icon :closable="false" />
          <el-alert v-if="finalReviewError" :title="finalReviewError" type="error" show-icon :closable="false" />
        </div>
      </section>
    </template>
    <el-empty v-else description="周报不存在或暂无可查看内容" />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { OrganizationRole, ReportStatus, WeeklyApprovalStatus } from '../constants/reports.js';
import {
  exportWeeklyReport,
  getWeeklyReport,
  reviewWeeklyReportApproval,
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
const savingApproval = ref(false);
const report = ref(null);
const targetUser = ref(null);
const errorMessage = ref('');
const finalReviewMessage = ref('');
const finalReviewError = ref('');
const approvalMessage = ref('');
const approvalError = ref('');
const finalReviewForm = reactive({
  finalScore: null,
  finalGrade: '',
  finalComment: ''
});
const approvalForm = reactive({
  comment: ''
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
// Center managers approve only pending employee reports from their own center.
const canReviewApproval = computed(
  () =>
    props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER &&
    isEmployeeTarget.value &&
    report.value?.approvalStatus === WeeklyApprovalStatus.PENDING
);
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
const approvalReviewerText = computed(() => {
  if (report.value?.approvalReviewedByName) {
    return report.value.approvalReviewedByName;
  }
  return report.value?.approvalReviewedByUserId ? `用户 ${report.value.approvalReviewedByUserId}` : '-';
});

function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--draft';
}

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

function approvalStatusTagType(status) {
  const types = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'info',
    [WeeklyApprovalStatus.PENDING]: 'warning',
    [WeeklyApprovalStatus.APPROVED]: 'success',
    [WeeklyApprovalStatus.RETURNED]: 'danger'
  };
  return types[status] || 'info';
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
  finalReviewForm.finalScore = result.report.finalScore ?? null;
  finalReviewForm.finalGrade = result.report.finalGrade || '';
  finalReviewForm.finalComment = result.report.finalComment || '';
  approvalForm.comment = result.report.approvalComment || '';
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

// Submit the center manager's approval decision and refresh the displayed report state.
async function submitApproval(action) {
  if (action === 'return') {
    try {
      await ElMessageBox.confirm('确认打回该周报吗？打回后提交人需要重新修改并提交。', '确认打回', {
        type: 'warning',
        confirmButtonText: '确认打回',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }
  }

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
    report.value = result.report;
    approvalMessage.value = action === 'approve' ? '审批已通过。' : '周报已打回。';
  } catch (error) {
    approvalError.value = toReadableApiError(error);
  } finally {
    savingApproval.value = false;
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

.weekly-final-review-form :deep(.el-input-number),
.weekly-final-review-form :deep(.el-select) {
  width: 100%;
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
