<template>
  <section class="page-stack weekly-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <section v-if="!canUseWeeklyReport" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>无周报填写权限</h3>
      <p>当前账号不能创建或编辑个人周报。</p>
    </section>

    <template v-else>
      <!-- 标准填写（直接显示，无Tab切换） -->
      <section class="panel weekly-form-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">周报周期</strong>
            <span class="toolbar-subtitle">{{ form.weekStart }} 至 {{ form.weekEnd }}</span>
          </div>
          <span v-if="savedReport" class="status-badge" :class="statusClass(savedReport.status)">
            {{ statusLabel(savedReport.status) }}
          </span>
        </div>

        <form class="weekly-form" @submit.prevent="saveDraft">
          <!-- 日期选择 -->
          <div class="weekly-date-grid">
            <div class="filter-group">
              <span class="filter-label">开始日期</span>
              <div class="input-wrapper" :class="{ 'input-wrapper--error': fieldErrors.weekStart }">
                <input
                  v-model="form.weekStart"
                  type="date"
                  :class="{ invalid: fieldErrors.weekStart }"
                />
              </div>
              <small v-if="fieldErrors.weekStart" class="field-error">{{ fieldErrors.weekStart }}</small>
            </div>
            <div class="filter-group">
              <span class="filter-label">结束日期</span>
              <div class="input-wrapper" :class="{ 'input-wrapper--error': fieldErrors.weekEnd }">
                <input
                  v-model="form.weekEnd"
                  type="date"
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
              <button type="button" class="ghost-button" @click="addSummary">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新增行
              </button>
            </div>
            <div class="table-container">
              <div class="weekly-edit-table weekly-edit-table--summaries">
                <div class="weekly-edit-table__head">
                  <span>工作任务</span>
                  <span>工作目标</span>
                  <span>计划日期</span>
                  <span>完成状态</span>
                  <span>完成说明</span>
                  <span>完成日期</span>
                  <span class="text-right">操作</span>
                </div>
                <div
                  v-for="(summary, index) in form.summaries"
                  :key="summary.localId"
                  class="weekly-edit-table__row"
                >
                  <div class="form-field">
                    <input
                      v-model="summary.workTask"
                      list="weekly-project-options"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`summaries.${index}.workTask`] }"
                      @input="scheduleProjectSearch(summary.workTask)"
                      placeholder="输入任务名称"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.workTask`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.workTask`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <textarea
                      v-model="summary.workTarget"
                      class="form-control form-textarea"
                      :class="{ invalid: fieldErrors[`summaries.${index}.workTarget`] }"
                      placeholder="描述工作目标"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.workTarget`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.workTarget`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <input
                      v-model="summary.plannedDate"
                      type="date"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`summaries.${index}.plannedDate`] }"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.plannedDate`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.plannedDate`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <select
                      v-model="summary.completionStatus"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completionStatus`] }"
                    >
                      <option value="completed">已完成</option>
                      <option value="in_progress">进行中</option>
                      <option value="not_completed">未完成</option>
                      <option value="added">新增</option>
                    </select>
                    <small v-if="fieldErrors[`summaries.${index}.completionStatus`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completionStatus`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <textarea
                      v-model="summary.completionDescription"
                      class="form-control form-textarea"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completionDescription`] }"
                      placeholder="完成情况说明"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.completionDescription`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completionDescription`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <input
                      v-model="summary.completedDate"
                      type="date"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`summaries.${index}.completedDate`] }"
                    />
                    <small v-if="fieldErrors[`summaries.${index}.completedDate`]" class="field-error">
                      {{ fieldErrors[`summaries.${index}.completedDate`] }}
                    </small>
                  </div>
                  <button
                    type="button"
                    class="row-btn action-btn"
                    :disabled="form.summaries.length === 1"
                    @click="removeSummary(index)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 下周工作计划 -->
          <section class="weekly-section">
            <div class="weekly-section__heading">
              <h3>下周工作计划</h3>
              <button type="button" class="ghost-button" @click="addPlan">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新增行
              </button>
            </div>
            <div class="table-container">
              <div class="weekly-edit-table weekly-edit-table--plans">
                <div class="weekly-edit-table__head">
                  <span>工作任务</span>
                  <span>工作目标</span>
                  <span>计划日期</span>
                  <span>责任人</span>
                  <span class="text-right">操作</span>
                </div>
                <div
                  v-for="(plan, index) in form.plans"
                  :key="plan.localId"
                  class="weekly-edit-table__row"
                >
                  <div class="form-field">
                    <input
                      v-model="plan.workTask"
                      list="weekly-project-options"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`plans.${index}.workTask`] }"
                      @input="scheduleProjectSearch(plan.workTask)"
                      placeholder="输入任务名称"
                    />
                    <small v-if="fieldErrors[`plans.${index}.workTask`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.workTask`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <textarea
                      v-model="plan.workTarget"
                      class="form-control form-textarea"
                      :class="{ invalid: fieldErrors[`plans.${index}.workTarget`] }"
                      placeholder="描述工作目标"
                    />
                    <small v-if="fieldErrors[`plans.${index}.workTarget`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.workTarget`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <input
                      v-model="plan.plannedDate"
                      type="date"
                      class="form-control"
                      :class="{ invalid: fieldErrors[`plans.${index}.plannedDate`] }"
                    />
                    <small v-if="fieldErrors[`plans.${index}.plannedDate`]" class="field-error">
                      {{ fieldErrors[`plans.${index}.plannedDate`] }}
                    </small>
                  </div>
                  <div class="form-field">
                    <input
                      v-model="plan.responsiblePerson"
                      class="form-control"
                      placeholder="责任人"
                    />
                  </div>
                  <button
                    type="button"
                    class="row-btn action-btn"
                    :disabled="form.plans.length === 1"
                    @click="removePlan(index)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </section>

          <datalist id="weekly-project-options">
            <option v-for="project in projectOptions" :key="project.id" :value="projectOptionLabel(project)" />
          </datalist>

          <!-- 消息提示 -->
          <section v-if="message" class="state-panel state-panel--success state-panel--compact">
            <p>{{ message }}</p>
          </section>
          <section v-if="errorMessage" class="state-panel state-panel--error state-panel--compact">
            <p>{{ errorMessage }}</p>
          </section>

          <!-- 底部操作按钮 -->
          <div class="form-actions">
            <button type="button" class="ghost-button" :disabled="saving" @click="saveDraft">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              暂存草稿
            </button>
            <button type="button" class="primary-button" :disabled="saving" @click="submitReport">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              正式提交
            </button>
          </div>
        </form>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  createWeeklyReport,
  exportWeeklyReport,
  getWeeklyReport,
  listWeeklyReports,
  toReadableApiError,
  updateWeeklyReport
} from '../api/weeklyReports.js';
import { searchMyActiveProjects } from '../api/projects.js';

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
const message = ref('');
const errorMessage = ref('');
const fieldErrors = reactive({});
const projectOptions = ref([]);
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
const currentUserDisplayName = computed(
  () => props.currentUser.displayName || props.currentUser.name || props.currentUser.account || ''
);

// Format browser-local dates without UTC conversion.
function formatLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Find the previous natural Monday-Sunday week from the user's current business date.
function getPreviousWeekPeriod() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);
  const previousMonday = new Date(currentMonday);
  previousMonday.setDate(currentMonday.getDate() - 7);
  const previousSunday = new Date(previousMonday);
  previousSunday.setDate(previousMonday.getDate() + 6);

  return {
    weekStart: formatLocalIsoDate(previousMonday),
    weekEnd: formatLocalIsoDate(previousSunday)
  };
}

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
    workTask: '',
    workTarget: '',
    plannedDate: form.weekEnd,
    responsiblePerson: currentUserDisplayName.value
  });
}

function projectOptionLabel(project) {
  return [project.projectCode, project.projectName].filter(Boolean).join(' / ');
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

// 输入关键词后延迟刷新候选项目，避免每个按键都请求接口。
function scheduleProjectSearch(keyword) {
  if (projectSearchTimer) {
    clearTimeout(projectSearchTimer);
  }

  projectSearchTimer = setTimeout(() => {
    void loadProjectOptions(keyword);
  }, 250);
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

function prefillSummariesFromPreviousPlans(previousReport) {
  const previousPlans = previousReport?.plans || [];
  if (previousPlans.length === 0) {
    return;
  }

  // 首次填写本周周报时，将上个周报的下周计划带入本周工作总结。
  form.summaries = previousPlans.map((plan) =>
    withLocalId({
      workTask: plan.workTask || '',
      workTarget: plan.workTarget || '',
      plannedDate: plan.plannedDate || form.weekStart,
      completionStatus: 'completed',
      completionDescription: '',
      completedDate: plan.plannedDate || form.weekEnd
    })
  );
}

// Copy a backend report into the editable form state.
function applyReport(report) {
  savedReport.value = report;
  form.weekStart = report.weekStart;
  form.weekEnd = report.weekEnd;
  form.status = report.status;
  form.summaries = (report.summaries?.length ? report.summaries : [{}]).map((item) =>
    withLocalId({
      workTask: item.workTask || '',
      workTarget: item.workTarget || '',
      plannedDate: item.plannedDate || report.weekStart,
      completionStatus: item.completionStatus || 'completed',
      completionDescription: item.completionDescription || '',
      completedDate: item.completedDate || report.weekEnd
    })
  );
  form.plans = (report.plans?.length ? report.plans : [{}]).map((item) =>
    withLocalId({
      workTask: item.workTask || '',
      workTarget: item.workTarget || '',
      plannedDate: item.plannedDate || report.weekEnd,
      responsiblePerson: item.responsiblePerson || currentUserDisplayName.value
    })
  );
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
    if (!item.completedDate) fieldErrors[`summaries.${index}.completedDate`] = '必填';
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
      workTask: item.workTask,
      workTarget: item.workTarget,
      plannedDate: item.plannedDate,
      completionStatus: item.completionStatus,
      completionDescription: item.completionDescription,
      completedDate: item.completedDate
    })),
    plans: form.plans.map((item) => ({
      workTask: item.workTask,
      workTarget: item.workTarget,
      plannedDate: item.plannedDate,
      responsiblePerson: item.responsiblePerson
    }))
  };
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

    const previousPeriod = shiftWeekPeriod(form.weekStart, -1);
    const previousReports = await listWeeklyReports({ weekStart: previousPeriod.weekStart }, props.authToken);
    if (previousReports.reports?.[0]?.id) {
      const previousDetail = await getWeeklyReport(previousReports.reports[0].id, props.authToken);
      prefillSummariesFromPreviousPlans(previousDetail.report);
    }
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
.state-panel--success {
  background: #f0f9eb;
  color: #67c23a;
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

/* ===== 表单 ===== */
.weekly-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 日期选择 */
.weekly-date-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.weekly-date-grid .filter-group {
  min-width: 200px;
  flex: 1;
}

/* 表单字段 */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.filter-label {
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
.input-wrapper--error {
  border-color: #f56c6c;
}
.input-wrapper--error:focus-within {
  border-color: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2);
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
.input-wrapper input[type="date"] {
  cursor: pointer;
}
.input-wrapper input::placeholder {
  color: #c0c4cc;
}
.input-wrapper select {
  appearance: auto;
  cursor: pointer;
}
.input-wrapper select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-error {
  font-size: 0.75rem;
  color: #f56c6c;
  margin-top: 0.25rem;
}

/* ===== 周报区块 ===== */
.weekly-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.weekly-section__heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.weekly-section__heading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}

/* ===== 周报编辑表格 ===== */
.weekly-edit-table {
  min-width: 900px;
  width: 100%;
}
.weekly-edit-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  gap: 0.75rem;
}
.weekly-edit-table--summaries .weekly-edit-table__head {
  grid-template-columns: 1.5fr 1.5fr 0.9fr 1fr 1.5fr 0.9fr 0.7fr;
}
.weekly-edit-table--plans .weekly-edit-table__head {
  grid-template-columns: 1.8fr 1.8fr 0.9fr 1.2fr 0.7fr;
}
.text-right {
  text-align: right;
}

.weekly-edit-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: start;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
}
.weekly-edit-table--summaries .weekly-edit-table__row {
  grid-template-columns: 1.5fr 1.5fr 0.9fr 1fr 1.5fr 0.9fr 0.7fr;
}
.weekly-edit-table--plans .weekly-edit-table__row {
  grid-template-columns: 1.8fr 1.8fr 0.9fr 1.2fr 0.7fr;
}
.weekly-edit-table__row:hover {
  background: #fdfdfe;
}

/* 表单控件（输入框 / 文本域） */
.form-control {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  color: #303133;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  transition: border-color 0.2s ease;
  outline: none;
  font-family: inherit;
  height: 36px;
  box-sizing: border-box;
}
.form-control:focus {
  border-color: #3e63dd;
}
.form-control.invalid {
  border-color: #f56c6c;
  background-color: #fef0f0;
}
.form-control.invalid:focus {
  border-color: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2);
}

.form-textarea {
  height: 36px;
  min-height: 36px;
  resize: vertical;
  overflow-y: auto;
  line-height: 1.4;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.form-field .field-error {
  font-size: 0.7rem;
  color: #f56c6c;
}

.weekly-edit-table__row .row-btn {
  margin-top: 0.15rem;
}

/* 行内操作按钮 */
.row-btn {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266;
  white-space: nowrap;
}
.row-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn:hover:not(:disabled) {
  border-color: #a4b3ff;
  color: #3e63dd;
  background: #f0f3ff;
}
.action-btn--danger:hover:not(:disabled) {
  border-color: #fbc4c4;
  color: #f56c6c;
  background: #fef0f0;
}

/* ===== 底部操作按钮 ===== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #ebeef5;
  flex-wrap: wrap;
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
  .weekly-date-grid {
    flex-direction: column;
  }
  .weekly-date-grid .filter-group {
    min-width: unset;
  }
  .weekly-edit-table__head,
  .weekly-edit-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.5rem;
  }
  .weekly-edit-table__head {
    display: none;
  }
  .weekly-edit-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .weekly-edit-table__row .row-btn {
    align-self: flex-start;
  }
}
</style>