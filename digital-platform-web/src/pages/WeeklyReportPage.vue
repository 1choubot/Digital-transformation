<template>
  <section class="page-stack weekly-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <el-alert v-if="!canUseWeeklyReport" title="无周报填写权限" description="当前账号不能创建或编辑个人周报。" type="error" show-icon :closable="false" />

    <template v-else>
      <!-- 标准填写（直接显示，无Tab切换） -->
      <section class="panel weekly-form-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">周报周期</strong>
            <span class="toolbar-subtitle">{{ form.weekStart }} 至 {{ form.weekEnd }}</span>
          </div>
          <el-tag v-if="savedReport" :type="approvalStatusType(savedReport.approvalStatus)">{{ approvalStatusLabel(savedReport.approvalStatus) }}</el-tag>
        </div>

        <el-form class="weekly-form" :model="form" @submit.prevent="saveDraft">
          <el-alert v-if="savedReport?.approvalStatus === WeeklyApprovalStatus.RETURNED" :description="`已打回：${savedReport.approvalComment || '中心负责人未填写具体原因。'}`" type="error" show-icon :closable="false" />

          <el-alert v-if="savedReport?.approvalStatus === WeeklyApprovalStatus.APPROVED" description="审批已通过，周报内容已锁定。" type="success" show-icon :closable="false" />

          <el-alert v-if="savedReport?.approvalStatus === WeeklyApprovalStatus.PENDING" description="周报审批中，暂不可修改。" type="warning" show-icon :closable="false" />

          <!-- 日期选择 -->
          <div class="weekly-date-grid">
            <div class="filter-group">
              <span class="filter-label">开始日期</span>
              <div class="input-wrapper" :class="{ 'input-wrapper--error': fieldErrors.weekStart }">
                <el-date-picker
                  v-model="form.weekStart"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="开始日期"
                  :class="{ invalid: fieldErrors.weekStart }"
                />
              </div>
              <small v-if="fieldErrors.weekStart" class="field-error">{{ fieldErrors.weekStart }}</small>
            </div>
            <div class="filter-group">
              <span class="filter-label">结束日期</span>
              <div class="input-wrapper" :class="{ 'input-wrapper--error': fieldErrors.weekEnd }">
                <el-date-picker
                  v-model="form.weekEnd"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="结束日期"
                  :class="{ invalid: fieldErrors.weekEnd }"
                />
              </div>
              <small v-if="fieldErrors.weekEnd" class="field-error">{{ fieldErrors.weekEnd }}</small>
            </div>
          </div>

          <!-- 本周工作总结 -->
          <section class="weekly-section">
            <div class="weekly-section__heading">
              <h3>本周工作总结</h3>
              <div class="section-actions">
                <el-button :disabled="saving || !canEditReport" @click="refreshPrefillSuggestion">刷新日报数据</el-button>
                <el-button :loading="aiComposing" :disabled="saving || !prefillState.basisHash || !canEditReport" @click="composePrefillWithAi">AI 整理草稿</el-button>
                <el-button :disabled="!canEditReport" @click="addSummary">新增行</el-button>
              </div>
            </div>
            <div v-if="prefillState.message" class="weekly-prefill-banner">
              {{ prefillState.message }}
            </div>
            <div class="table-container report-table-scroll">
              <el-table :data="form.summaries" row-key="localId" class="report-data-table report-data-table--weekly-summaries">
                <el-table-column label="项目名称" min-width="220"><template #default="{ row: summary, $index: index }">
                  <!-- 任务信息（含来源标签 + 项目选择） -->
                  <div class="form-field task-field">
                    <div class="source-chip-row">
                      <span class="source-chip" :class="sourceChipClass(summary)">
                        {{ sourceTypeLabel(summary) }}
                      </span>
                      <span v-if="summary.missingDailyEvidence" class="source-chip source-chip--warning">
                        未填日报
                      </span>
                    </div>
                    <el-select
                      v-model="summary.projectId"
                      :class="{ invalid: fieldErrors[`summaries.${index}.workTask`] }"
                      placeholder="请选择项目"
                      @focus="refreshProjectOptionsForPicker"
                      @change="onProjectTaskSelect(summary)"
                    >
                      <el-option v-for="project in projectOptions" :key="project.id" :label="projectOptionLabel(project)" :value="project.id" />
                    </el-select>
                    <small v-if="fieldErrors[`summaries.${index}.workTask`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.workTask`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="工作内容" min-width="200"><template #default="{ row: summary, $index: index }">
                  <div class="form-field">
                    <el-input
                      v-model="summary.workTarget"
                      type="textarea"
                      :class="{ invalid: fieldErrors[`summaries.${index}.workTarget`] }"
                      placeholder="描述工作目标"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.workTarget`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.workTarget`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="计划日期" min-width="150"><template #default="{ row: summary, $index: index }">
                  <div class="form-field">
                    <el-date-picker
                      v-model="summary.plannedDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="计划日期"
                      :class="{ invalid: fieldErrors[`summaries.${index}.plannedDate`] }"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.plannedDate`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.plannedDate`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="完成状态" min-width="150"><template #default="{ row: summary, $index: index }">
                  <div class="form-field">
                    <el-select
                      v-model="summary.completionStatus"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completionStatus`] }"
                    >
                      <el-option label="已完成" value="completed" />
                      <el-option label="进行中" value="in_progress" />
                      <el-option label="未完成" value="not_completed" />
                    </el-select>
                    <small v-if="fieldErrors[`summaries.${index}.completionStatus`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completionStatus`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="完成说明" min-width="200"><template #default="{ row: summary, $index: index }">
                  <div class="form-field">
                    <el-input
                      v-model="summary.completionDescription"
                      type="textarea"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completionDescription`] }"
                      placeholder="完成情况说明"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.completionDescription`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completionDescription`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="完成日期" min-width="160"><template #default="{ row: summary, $index: index }">
                  <div class="form-field">
                    <el-date-picker
                      v-model="summary.completedDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="完成日期"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completedDate`] }"
                      :disabled="summary.completionStatus !== 'completed'"
                    />
                    <small v-if="summary.completionStatus !== 'completed'" class="field-hint">
                      无需填写
                    </small>
                    <small v-if="fieldErrors[`summaries.${index}.completedDate`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completedDate`] }}
                    </small>
                  </div>
                </template></el-table-column>

                <el-table-column label="操作" width="110" fixed="right" align="center"><template #default="{ row: summary, $index: index }">
                  <div class="row-actions">
                    <el-button
                      link
                      type="danger"
                      :disabled="form.summaries.length === 1 || !canEditReport"
                      @click="removeSummary(index)"
                    >
                      删除
                    </el-button>
                    <el-button
                      v-if="summary.missingDailyEvidence"
                      link
                      type="primary"
                      @click="openDailyBackfill(summary)"
                    >
                      补日报
                    </el-button>
                  </div>
                </template></el-table-column>
              </el-table>
            </div>
          </section>

          <!-- 下周工作计划 -->
          <section class="weekly-section">
            <div class="weekly-section__heading">
              <h3>下周工作计划</h3>
              <el-button :disabled="!canEditReport" @click="addPlan">新增行</el-button>
            </div>
            <div class="table-container report-table-scroll">
              <el-table :data="form.plans" row-key="localId" class="report-data-table report-data-table--weekly-plans">
                <el-table-column label="项目名称" min-width="230"><template #default="{ row: plan, $index: index }">
                  <div class="form-field">
                    <el-select
                      v-model="plan.projectId"
                      :class="{ invalid: fieldErrors[`plans.${index}.workTask`] }"
                      placeholder="请选择项目"
                      @focus="refreshProjectOptionsForPicker"
                      @change="onProjectTaskSelect(plan)"
                    >
                      <el-option v-for="project in projectOptions" :key="project.id" :label="projectOptionLabel(project)" :value="project.id" />
                    </el-select>
                    <small v-if="fieldErrors[`plans.${index}.workTask`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.workTask`] }}
                    </small>
                  </div>
                </template></el-table-column>
                <el-table-column label="工作目标" min-width="230"><template #default="{ row: plan, $index: index }">
                  <div class="form-field">
                    <el-input
                      v-model="plan.workTarget"
                      type="textarea"
                      :class="{ invalid: fieldErrors[`plans.${index}.workTarget`] }"
                      placeholder="描述工作目标"
                    />
                    <small v-if="fieldErrors[`plans.${index}.workTarget`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.workTarget`] }}
                    </small>
                  </div>
                </template></el-table-column>
                <el-table-column label="计划日期" min-width="170"><template #default="{ row: plan, $index: index }">
                  <div class="form-field">
                    <el-date-picker
                      v-model="plan.plannedDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="计划日期"
                      :class="{ invalid: fieldErrors[`plans.${index}.plannedDate`] }"
                    />
                    <small v-if="fieldErrors[`plans.${index}.plannedDate`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.plannedDate`] }}
                    </small>
                  </div>
                </template></el-table-column>
                <el-table-column label="责任人" min-width="180"><template #default="{ row: plan }">
                  <div class="form-field">
                    <el-input
                      v-model="plan.responsiblePerson"
                      placeholder="责任人"
                    />
                  </div>
                </template></el-table-column>
                <el-table-column label="操作" width="90" fixed="right" align="center"><template #default="{ $index: index }">
                  <el-button
                    link
                    type="danger"
                    :disabled="form.plans.length === 1 || !canEditReport"
                    @click="removePlan(index)"
                  >
                    删除
                  </el-button>
                </template></el-table-column>
              </el-table>
            </div>
          </section>

          <!-- 底部操作按钮 -->
          <div class="form-actions">
            <el-button :loading="saving" :disabled="!canEditReport" @click="saveDraft">暂存草稿</el-button>
            <el-button type="primary" :loading="saving" :disabled="!canEditReport" @click="submitReport">正式提交</el-button>
          </div>
        </el-form>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { OrganizationRole, ReportStatus, WeeklyApprovalStatus } from '../constants/reports.js';
import {
  createWeeklyReport,
  composeWeeklyReportPrefillWithAi,
  exportWeeklyReport,
  getWeeklyReport,
  getWeeklyReportPrefillSuggestion,
  listWeeklyReports,
  toReadableApiError,
  updateWeeklyReport
} from '../api/weeklyReports.js';
import { searchMyActiveProjects } from '../api/projects.js';
import { formatLocalIsoDate, getPreviousWeekPeriod } from '../utils/weekPeriod.js';

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
    default: ''
  },
  navigate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

const activeTab = ref('form');
const savedReport = ref(null);
const saving = ref(false);
const exporting = ref(false);
const aiComposing = ref(false);
const message = ref('');
const errorMessage = ref('');
watch(message, (value) => { if (value) ElMessage.success(value); });
watch(errorMessage, (value) => { if (value) ElMessage.error(value); });
const fieldErrors = reactive({});
const projectOptions = ref([]);
const prefillState = reactive({
  basisHash: '',
  message: ''
});
const prefillDirty = ref(false);
const applyingGeneratedSummaries = ref(false);
let projectSearchTimer = null;

const form = reactive({
  weekStart: '',
  weekEnd: '',
  status: ReportStatus.DRAFT,
  summaries: [],
  plans: []
});

// Weekly report creation is allowed for employees and center managers.
const canUseWeeklyReport = computed(() =>
  [OrganizationRole.EMPLOYEE, OrganizationRole.CENTER_MANAGER].includes(props.currentUser.organizationRole)
);
// Editing is locked once a submitted report is pending review or approved.
const canEditReport = computed(() => {
  if (!savedReport.value) {
    return true;
  }
  return [
    WeeklyApprovalStatus.NOT_SUBMITTED,
    WeeklyApprovalStatus.RETURNED
  ].includes(savedReport.value.approvalStatus || WeeklyApprovalStatus.NOT_SUBMITTED);
});
const currentUserDisplayName = computed(
  () => props.currentUser.displayName || props.currentUser.name || props.currentUser.account || ''
);

function shiftWeekPeriod(weekStart, offsetWeeks) {
  const start = new Date(`${weekStart}T00:00:00`);
  start.setDate(start.getDate() + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    weekStart: formatLocalIsoDate(start),
    weekEnd: formatLocalIsoDate(end)
  };
}

// Add a local id so rows remain stable while users edit fields.
function withLocalId(row = {}) {
  return {
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...row
  };
}

// Create one blank summary row using the current week start as a helpful default.
function blankSummary() {
  return withLocalId({
    projectId: null,
    sourceType: 'legacy_unknown',
    sourcePlanTaskKey: null,
    missingDailyEvidence: false,
    dailyEvidence: [],
    dailyFillContext: null,
    generation: 'manual',
    workTask: '',
    workTarget: '',
    plannedDate: form.weekStart,
    completionStatus: 'completed',
    completionDescription: '',
    completedDate: form.weekEnd
  });
}

// Create one blank next-week plan row.
function blankPlan() {
  return withLocalId({
    taskKey: null,
    projectId: null,
    workTask: '',
    workTarget: '',
    plannedDate: form.weekEnd,
    responsiblePerson: currentUserDisplayName.value
  });
}

function projectOptionLabel(project) {
  return [project.projectCode, project.projectName].filter(Boolean).join(' / ');
}

function ensureProjectOptionFromRow(row) {
  if (!row?.projectId || projectOptions.value.some((project) => String(project.id) === String(row.projectId))) {
    return;
  }

  projectOptions.value = [
    ...projectOptions.value,
    {
      id: row.projectId,
      projectCode: row.workTask,
      projectName: ''
    }
  ];
}

function onProjectTaskSelect(row) {
  const selectedProjectId = String(row.projectId || '');
  const matched = projectOptions.value.find((project) => String(project.id) === selectedProjectId);
  row.projectId = matched ? matched.id : null;
  row.workTask = matched ? projectOptionLabel(matched) : '';
}

// Reload the full project candidate list whenever a task input is opened for selection.
function refreshProjectOptionsForPicker() {
  if (projectSearchTimer) {
    clearTimeout(projectSearchTimer);
    projectSearchTimer = null;
  }
  void loadProjectOptions('');
}

async function loadProjectOptions(keyword = '') {
  if (!canUseWeeklyReport.value) {
    return;
  }

  try {
    const result = await searchMyActiveProjects({ keyword, limit: 50 }, props.authToken);
    projectOptions.value = result.projects || [];
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  }
}

// Reset the form around the default previous week.
function initializeEmptyForm() {
  const period = getPreviousWeekPeriod();
  form.weekStart = period.weekStart;
  form.weekEnd = period.weekEnd;
  form.status = ReportStatus.DRAFT;
  form.summaries = [blankSummary()];
  form.plans = [blankPlan()];
}

// Apply backend-generated rule/AI suggestions without writing them to the database.
async function applyPrefillSuggestion(suggestion, { force = false } = {}) {
  if (!suggestion?.shouldPrefill) {
    prefillState.basisHash = '';
    prefillState.message = suggestion?.reason === 'weekly_report_exists' ? '已存在周报，未自动生成草稿。' : '';
    return;
  }

  if (prefillDirty.value && !force) {
    try {
      await ElMessageBox.confirm('当前周报已有手工修改，刷新会替换自动生成的总结内容，是否继续？', '覆盖手工修改', {
        type: 'warning',
        confirmButtonText: '继续刷新',
        cancelButtonText: '取消'
      });
    } catch (error) {
      return;
    }
  }

  const generatedRows = (suggestion.summaries || []).map((item) =>
    withLocalId({
      projectId: item.projectId || null,
      sourceType: item.sourceType || 'legacy_unknown',
      sourcePlanTaskKey: item.sourcePlanTaskKey || null,
      missingDailyEvidence: Boolean(item.missingDailyEvidence),
      dailyEvidence: item.dailyEvidence || [],
      dailyFillContext: item.dailyFillContext || null,
      generation: item.generation || 'rule',
      workTask: item.workTask || '',
      workTarget: item.workTarget || '',
      plannedDate: item.plannedDate || form.weekStart,
      completionStatus: item.completionStatus || 'not_completed',
      completionDescription: item.completionDescription || '',
      completedDate: item.completedDate || null
    })
  );

  applyingGeneratedSummaries.value = true;
  form.summaries = generatedRows.length ? generatedRows : [blankSummary()];
  form.summaries.forEach(ensureProjectOptionFromRow);
  prefillState.basisHash = suggestion.basisHash || '';
  prefillState.message = `已根据上周计划和本周已提交日报生成 ${generatedRows.length} 条草稿，其中 ${suggestion.meta?.missingDailyEvidenceCount || 0} 条缺少日报证据。`;
  prefillDirty.value = false;
  applyingGeneratedSummaries.value = false;
}

// Copy a backend report into the editable form state.
function applyReport(report) {
  savedReport.value = report;
  form.weekStart = report.weekStart;
  form.weekEnd = report.weekEnd;
  form.status = report.status;
  form.summaries = (report.summaries?.length ? report.summaries : [{}]).map((item) =>
    withLocalId({
      projectId: item.projectId || null,
      sourceType: item.sourceType || 'legacy_unknown',
      sourcePlanTaskKey: item.sourcePlanTaskKey || null,
      missingDailyEvidence: false,
      dailyEvidence: [],
      dailyFillContext: null,
      generation: 'manual',
      workTask: item.workTask || '',
      workTarget: item.workTarget || '',
      plannedDate: item.plannedDate || report.weekStart,
      completionStatus: item.completionStatus || 'completed',
      completionDescription: item.completionDescription || '',
      completedDate: item.completedDate || null
    })
  );
  form.plans = (report.plans?.length ? report.plans : [{}]).map((item) =>
    withLocalId({
      projectId: item.projectId || null,
      taskKey: item.taskKey || null,
      workTask: item.workTask || '',
      workTarget: item.workTarget || '',
      plannedDate: item.plannedDate || report.weekEnd,
      responsiblePerson: item.responsiblePerson || currentUserDisplayName.value
    })
  );
  [...form.summaries, ...form.plans].forEach(ensureProjectOptionFromRow);
  prefillDirty.value = false;
  prefillState.basisHash = '';
  prefillState.message = '';
}

// Clear stale validation errors between attempts.
function clearFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => {
    delete fieldErrors[key];
  });
}

// Validate every row-level required field so the UI can highlight exact cells.
function validateSubmitFields() {
  clearFieldErrors();

  if (!form.weekStart) fieldErrors.weekStart = '请选择开始日期';
  if (!form.weekEnd) fieldErrors.weekEnd = '请选择结束日期';
  form.summaries.forEach((item, index) => {
    if (!item.workTask.trim()) fieldErrors[`summaries.${index}.workTask`] = '必填';
    if (!item.workTarget.trim()) fieldErrors[`summaries.${index}.workTarget`] = '必填';
    if (!item.plannedDate) fieldErrors[`summaries.${index}.plannedDate`] = '必填';
    if (!item.completionStatus) fieldErrors[`summaries.${index}.completionStatus`] = '必填';
    if (!item.completionDescription.trim()) fieldErrors[`summaries.${index}.completionDescription`] = '必填';
    if (item.completionStatus === 'completed' && !item.completedDate) {
      fieldErrors[`summaries.${index}.completedDate`] = '必填';
    }
  });
  form.plans.forEach((item, index) => {
    if (!item.workTask.trim()) fieldErrors[`plans.${index}.workTask`] = '必填';
    if (!item.workTarget.trim()) fieldErrors[`plans.${index}.workTarget`] = '必填';
    if (!item.plannedDate) fieldErrors[`plans.${index}.plannedDate`] = '必填';
  });

  return Object.keys(fieldErrors).length === 0;
}

// Build the backend payload from editable rows.
function buildPayload(status) {
  return {
    weekStart: form.weekStart,
    weekEnd: form.weekEnd,
    status,
    summaries: form.summaries.map((item) => ({
      projectId: item.projectId || null,
      sourceType: item.sourceType || 'legacy_unknown',
      sourcePlanTaskKey: item.sourcePlanTaskKey || null,
      workTask: item.workTask,
      workTarget: item.workTarget,
      plannedDate: item.plannedDate,
      completionStatus: item.completionStatus,
      completionDescription: item.completionDescription,
      completedDate: item.completionStatus === 'completed' ? item.completedDate : null
    })),
    plans: form.plans.map((item) => ({
      taskKey: item.taskKey || null,
      projectId: item.projectId || null,
      workTask: item.workTask,
      workTarget: item.workTarget,
      plannedDate: item.plannedDate,
      responsiblePerson: item.responsiblePerson
    }))
  };
}

function sourceTypeLabel(summary) {
  if (summary.sourceType === 'weekly_plan') return '周计划';
  if (summary.sourceType === 'ad_hoc') return '新增';
  return '历史待确认';
}

function sourceChipClass(summary) {
  if (summary.sourceType === 'weekly_plan') return 'source-chip--plan';
  if (summary.sourceType === 'ad_hoc') return 'source-chip--adhoc';
  return 'source-chip--legacy';
}

async function refreshPrefillSuggestion({ force = false } = {}) {
  let shouldForcePrefill = force;
  if (savedReport.value && !force) {
    try {
      await ElMessageBox.confirm('当前周报已保存，刷新只会更新页面草稿预览，保存前请确认是否覆盖现有内容。是否继续？', '刷新周报草稿', {
        type: 'warning',
        confirmButtonText: '继续刷新',
        cancelButtonText: '取消'
      });
    } catch (error) {
      return;
    }
    // User-confirmed refreshes should ask the backend to ignore the existing weekly report guard.
    shouldForcePrefill = true;
  }

  try {
    const result = await getWeeklyReportPrefillSuggestion(
      { weekStart: form.weekStart, force: shouldForcePrefill },
      props.authToken
    );
    await applyPrefillSuggestion(result.suggestion, { force: shouldForcePrefill });
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  }
}

async function composePrefillWithAi() {
  aiComposing.value = true;
  errorMessage.value = '';

  try {
    const result = await composeWeeklyReportPrefillWithAi(
      { weekStart: form.weekStart, basisHash: prefillState.basisHash },
      props.authToken
    );
    await applyPrefillSuggestion(result.suggestion, { force: true });
    prefillState.message = result.suggestion?.ai?.message || prefillState.message;
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    if (error.status === 409 || error.code === 'WEEKLY_PREFILL_BASIS_CHANGED') {
      errorMessage.value = '日报或计划数据已变化，请先刷新规则草稿。';
      return;
    }
    errorMessage.value = toReadableApiError(error);
  } finally {
    aiComposing.value = false;
  }
}

function openDailyBackfill(summary) {
  const context = summary.dailyFillContext || {};
  const query = new URLSearchParams();
  if (context.reportDate) query.set('date', context.reportDate);
  if (context.projectId) query.set('projectId', context.projectId);
  if (context.sourcePlanTaskKey) query.set('taskKey', context.sourcePlanTaskKey);
  props.navigate(`/daily-report${query.toString() ? `?${query.toString()}` : ''}`);
}

function addSummary() {
  form.summaries.push(blankSummary());
}

function removeSummary(index) {
  if (form.summaries.length > 1) {
    form.summaries.splice(index, 1);
  }
}

function addPlan() {
  form.plans.push(blankPlan());
}

function removePlan(index) {
  if (form.plans.length > 1) {
    form.plans.splice(index, 1);
  }
}

// Display report statuses using the shared report constants.
function statusLabel(status) {
  return status === ReportStatus.SUBMITTED ? '已提交' : '草稿';
}

function statusClass(status) {
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--draft';
}

// Approval labels are shown to employees instead of the raw draft/submitted state.
function approvalStatusLabel(status) {
  const labels = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: '未提交',
    [WeeklyApprovalStatus.PENDING]: '审批中',
    [WeeklyApprovalStatus.APPROVED]: '审批通过',
    [WeeklyApprovalStatus.RETURNED]: '已打回'
  };
  return labels[status] || labels[WeeklyApprovalStatus.NOT_SUBMITTED];
}

// Approval classes keep the existing compact badge shape with clearer colors.
function approvalStatusType(status) {
  return {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'info',
    [WeeklyApprovalStatus.PENDING]: 'warning',
    [WeeklyApprovalStatus.APPROVED]: 'success',
    [WeeklyApprovalStatus.RETURNED]: 'danger'
  }[status] || 'info';
}

// Trigger browser download for generated Excel files.
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

// Persist either a draft or submitted weekly report.
async function saveReport(status) {
  if (!canEditReport.value) {
    errorMessage.value = '当前周报审批状态不允许修改。';
    return;
  }

  if (status === ReportStatus.SUBMITTED && !validateSubmitFields()) {
    errorMessage.value = '请补齐标红字段后再提交。';
    return;
  }

  saving.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const payload = buildPayload(status);
    const result = savedReport.value
      ? await updateWeeklyReport(savedReport.value.id, payload, props.authToken)
      : await createWeeklyReport(payload, props.authToken);
    applyReport(result.report);
    clearFieldErrors();
    message.value = status === ReportStatus.SUBMITTED ? '周报已提交，评分缓存已按需刷新。' : '周报草稿已保存。';
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  } finally {
    saving.value = false;
  }
}

function saveDraft() {
  return saveReport(ReportStatus.DRAFT);
}

function submitReport() {
  return saveReport(ReportStatus.SUBMITTED);
}

// Load a route-specific report or the default previous-week record.
async function loadInitialReport() {
  if (!canUseWeeklyReport.value) {
    return;
  }

  initializeEmptyForm();
  errorMessage.value = '';

  try {
    if (props.reportId) {
      const result = await getWeeklyReport(props.reportId, props.authToken);
      applyReport(result.report);
      return;
    }

    const reports = await listWeeklyReports({ weekStart: form.weekStart }, props.authToken);
    if (reports.reports?.[0]?.id) {
      const detail = await getWeeklyReport(reports.reports[0].id, props.authToken);
      applyReport(detail.report);
      return;
    }

    await refreshPrefillSuggestion({ force: true });
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  }
}

onMounted(() => {
  void loadProjectOptions();
  void loadInitialReport();
});

watch(
  () => form.summaries,
  () => {
    if (!applyingGeneratedSummaries.value) {
      prefillDirty.value = true;
    }
  },
  { deep: true }
);
</script>
