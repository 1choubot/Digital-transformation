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
        <div class="table-container report-table-scroll">
          <el-table :data="report.summaries" :row-key="row => row.id || row.sortOrder" class="report-data-table report-data-table--review-summaries">
            <el-table-column label="项目" min-width="220"><template #default="{ row: summary }">
              <div class="summary-project-cell">
                <div class="source-chip-row source-chip-row--readonly">
                  <span class="source-chip" :class="sourceChipClass(summary)">
                    {{ sourceTypeLabel(summary) }}
                  </span>
                </div>
                <strong>{{ summaryProjectLabel(summary) }}</strong>
              </div>
            </template></el-table-column>
            <el-table-column prop="workTarget" label="工作目标" min-width="180" />
            <el-table-column prop="plannedDate" label="计划日期" min-width="130" />
            <el-table-column label="完成状态" min-width="130"><template #default="{ row: summary }">
              <span class="completion-status" :class="completionStatusClass(summary.completionStatus)">
                {{ completionStatusLabel(summary.completionStatus) }}
              </span>
            </template></el-table-column>
            <el-table-column prop="completionDescription" label="完成说明" min-width="200" />
            <el-table-column label="完成日期" min-width="130"><template #default="{ row }">{{ row.completedDate || '-' }}</template></el-table-column>
          </el-table>
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
        <div class="table-container report-table-scroll">
          <el-table :data="report.plans" :row-key="row => row.id || row.sortOrder" class="report-data-table report-data-table--review-plans">
            <el-table-column label="工作任务" min-width="260"><template #default="{ row }"><strong>{{ row.workTask }}</strong></template></el-table-column>
            <el-table-column prop="workTarget" label="工作目标" min-width="240" />
            <el-table-column prop="plannedDate" label="计划日期" min-width="160" />
            <el-table-column label="责任人" min-width="180"><template #default="{ row }">{{ row.responsiblePerson || '-' }}</template></el-table-column>
          </el-table>
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

        <div v-else class="table-container report-table-scroll">
          <el-table :data="comparisonRows" :row-key="comparisonRowKey" class="report-data-table report-data-table--comparison">
            <el-table-column label="日期" min-width="120"><template #default="{ row }">{{ row.date || '-' }}</template></el-table-column>
            <el-table-column label="星期" min-width="90"><template #default="{ row }">{{ row.weekday || '-' }}</template></el-table-column>
            <el-table-column label="周报任务" min-width="180"><template #default="{ row }">{{ row.weeklyTask || '-' }}</template></el-table-column>
            <el-table-column label="周报总结" min-width="200"><template #default="{ row }">{{ row.weeklySummaryText || '-' }}</template></el-table-column>
            <el-table-column label="日报项目" min-width="180"><template #default="{ row }">{{ row.dailyProjectLabel || row.dailyProjectName || '-' }}</template></el-table-column>
            <el-table-column label="日报实际工作" min-width="220"><template #default="{ row }">{{ row.dailyWorkContent || '-' }}</template></el-table-column>
            <el-table-column label="进度" min-width="100"><template #default="{ row }">{{ row.dailyCompletionProgress || '-' }}</template></el-table-column>
            <el-table-column label="日报日期" min-width="120"><template #default="{ row }">{{ row.dailyCompletedAt || '-' }}</template></el-table-column>
            <el-table-column label="周报完成" min-width="120"><template #default="{ row }">{{ row.weeklyCompletedDate || '-' }}</template></el-table-column>
            <el-table-column label="匹配" min-width="100" fixed="right"><template #default="{ row }">
              <span class="match-status" :class="matchStatusClass(row.matchStatus)">
                {{ matchStatusLabel(row.matchStatus) }}
              </span>
            </template></el-table-column>
          </el-table>
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
      <section class="panel weekly-approval-panel approval-review-card">
        <div class="panel-toolbar approval-review-card__heading">
          <div class="toolbar-info">
            <strong class="toolbar-title">审批</strong>
            <el-tag :type="canReviewApproval ? 'warning' : 'info'">
              {{ canReviewApproval ? '待审批' : '只读' }}
            </el-tag>
          </div>
        </div>
        <div v-if="canReviewApproval" class="panel-body approval-review-card__body">
          <div class="approval-review-card__decision">
            <div class="approval-review-card__field-label">
              <strong>审批决定</strong><span>*</span>
            </div>
            <el-radio-group v-model="approvalDecision" class="approval-review-card__options"
              :disabled="savingApproval">
              <el-radio class="approval-review-card__option approval-review-card__option--approve"
                value="approve" border>通过审批</el-radio>
              <el-radio class="approval-review-card__option approval-review-card__option--return"
                value="return" border>打回修改</el-radio>
            </el-radio-group>
          </div>

          <div v-if="approvalDecision" class="weekly-final-review-form approval-review-card__form">
            <p v-if="approvalDecision === 'return'" class="approval-review-card__notice">
              打回后提交人需要修改周报并重新提交审批。
            </p>
            <div class="form-field form-field--full">
              <span class="field-label approval-review-card__field-label">
                {{ approvalDecision === 'return' ? '打回原因' : '审批意见' }}
                <span v-if="approvalDecision === 'return'">*</span>
                <small v-else>选填</small>
              </span>
              <el-input
                v-model="approvalForm.comment"
                type="textarea"
                :rows="3"
                :disabled="savingApproval"
                :placeholder="approvalDecision === 'return' ? '请明确填写打回原因和修改要求' : '可填写审批意见或后续工作要求'"
              />
            </div>
            <div class="form-actions approval-review-card__footer">
              <el-button
                :type="approvalDecision === 'return' ? 'warning' : 'primary'"
                :plain="approvalDecision === 'return'"
                :loading="savingApproval"
                :disabled="savingApproval || (approvalDecision === 'return' && !approvalForm.comment.trim())"
                @click="submitApproval(approvalDecision)"
              >
                {{ approvalDecision === 'return' ? '确认打回修改' : '确认通过审批' }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="panel-body approval-review-card__body">
          <el-alert
            title="当前审批已锁定或当前账号无审批权限，仅可查看。"
            type="info"
            show-icon
            :closable="false"
          />
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

        </div>
      </section>
    </template>
    <el-empty v-else description="周报不存在或暂无可查看内容" />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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
const finalReviewForm = reactive({
  finalScore: null,
  finalGrade: '',
  finalComment: ''
});
const approvalForm = reactive({
  comment: ''
});
const approvalDecision = ref('');

watch(approvalDecision, (nextDecision, previousDecision) => {
  if (previousDecision && nextDecision !== previousDecision) approvalForm.comment = '';
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
  approvalDecision.value = '';
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
    ElMessage.success('评分已保存。');
  } catch (error) {
    ElMessage.error(toReadableApiError(error));
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
    approvalDecision.value = '';
    ElMessage.success(action === 'approve' ? '审批已通过。' : '周报已打回。');
  } catch (error) {
    ElMessage.error(toReadableApiError(error));
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
