<template>
  <section class="page-stack weekly-report-page">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">个人周报</span>
        <h2>{{ savedReport ? '编辑周报' : '填写周报' }}</h2>
        <span class="page-user">{{ currentUser.name }} / {{ currentUser.department || '全局角色' }}</span>
      </div>
      <div class="weekly-page-actions">
        <button type="button" class="ghost-button" @click="navigate('/weekly-reports')">周报列表</button>
        <button type="button" class="ghost-button" @click="navigate('/projects/overview-dashboard')">项目总览</button>
      </div>
    </div>

    <section v-if="!canUseWeeklyReport" class="state-panel state-panel--error">
      <h3>无周报填写权限</h3>
      <p>当前账号不能创建或编辑个人周报。</p>
    </section>

    <template v-else>
      <section class="panel weekly-tabs">
        <button type="button" :class="{ active: activeTab === 'form' }" @click="activeTab = 'form'">标准填写</button>
        <button type="button" :class="{ active: activeTab === 'export' }" @click="activeTab = 'export'">标准表格导出</button>
      </section>

      <section v-if="activeTab === 'form'" class="panel weekly-form-panel">
        <div class="panel-toolbar">
          <div>
            <strong>周报周期</strong>
            <span>{{ form.weekStart }} 至 {{ form.weekEnd }}</span>
          </div>
          <span v-if="savedReport" class="status-badge" :class="statusClass(savedReport.status)">
            {{ statusLabel(savedReport.status) }}
          </span>
        </div>

        <form class="weekly-form" @submit.prevent="saveDraft">
          <div class="daily-form-grid">
            <label>
              <span>开始日期</span>
              <input v-model="form.weekStart" type="date" :class="{ invalid: fieldErrors.weekStart }" />
              <small v-if="fieldErrors.weekStart">{{ fieldErrors.weekStart }}</small>
            </label>
            <label>
              <span>结束日期</span>
              <input v-model="form.weekEnd" type="date" :class="{ invalid: fieldErrors.weekEnd }" />
              <small v-if="fieldErrors.weekEnd">{{ fieldErrors.weekEnd }}</small>
            </label>
          </div>

          <section class="weekly-section">
            <div class="daily-section__heading">
              <h3>本周工作总结</h3>
              <button type="button" class="ghost-button" @click="addSummary">新增行</button>
            </div>
            <div class="weekly-edit-table weekly-edit-table--summaries">
              <div class="weekly-edit-table__head">
                <span>工作任务</span>
                <span>工作目标</span>
                <span>计划日期</span>
                <span>完成状态</span>
                <span>完成说明</span>
                <span>完成日期</span>
                <span>操作</span>
              </div>
              <div v-for="(summary, index) in form.summaries" :key="summary.localId" class="weekly-edit-table__row">
                <label>
                  <input
                    v-model="summary.workTask"
                    list="weekly-project-options"
                    :class="{ invalid: fieldErrors[`summaries.${index}.workTask`] }"
                    @input="scheduleProjectSearch(summary.workTask)"
                  />
                  <small v-if="fieldErrors[`summaries.${index}.workTask`]">
                    {{ fieldErrors[`summaries.${index}.workTask`] }}
                  </small>
                </label>
                <label>
                  <textarea
                    v-model="summary.workTarget"
                    :class="{ invalid: fieldErrors[`summaries.${index}.workTarget`] }"
                  />
                  <small v-if="fieldErrors[`summaries.${index}.workTarget`]">
                    {{ fieldErrors[`summaries.${index}.workTarget`] }}
                  </small>
                </label>
                <label>
                  <input
                    v-model="summary.plannedDate"
                    type="date"
                    :class="{ invalid: fieldErrors[`summaries.${index}.plannedDate`] }"
                  />
                  <small v-if="fieldErrors[`summaries.${index}.plannedDate`]">
                    {{ fieldErrors[`summaries.${index}.plannedDate`] }}
                  </small>
                </label>
                <label>
                  <select
                    v-model="summary.completionStatus"
                    :class="{ invalid: fieldErrors[`summaries.${index}.completionStatus`] }"
                  >
                    <option value="completed">已完成</option>
                    <option value="in_progress">进行中</option>
                    <option value="not_completed">未完成</option>
                    <option value="added">新增</option>
                  </select>
                  <small v-if="fieldErrors[`summaries.${index}.completionStatus`]">
                    {{ fieldErrors[`summaries.${index}.completionStatus`] }}
                  </small>
                </label>
                <label>
                  <textarea
                    v-model="summary.completionDescription"
                    :class="{ invalid: fieldErrors[`summaries.${index}.completionDescription`] }"
                  />
                  <small v-if="fieldErrors[`summaries.${index}.completionDescription`]">
                    {{ fieldErrors[`summaries.${index}.completionDescription`] }}
                  </small>
                </label>
                <label>
                  <input
                    v-model="summary.completedDate"
                    type="date"
                    :class="{ invalid: fieldErrors[`summaries.${index}.completedDate`] }"
                  />
                  <small v-if="fieldErrors[`summaries.${index}.completedDate`]">
                    {{ fieldErrors[`summaries.${index}.completedDate`] }}
                  </small>
                </label>
                <button
                  type="button"
                  class="ghost-button"
                  :disabled="form.summaries.length === 1"
                  @click="removeSummary(index)"
                >
                  删除
                </button>
              </div>
            </div>
          </section>

          <section class="weekly-section">
            <div class="daily-section__heading">
              <h3>下周工作计划</h3>
              <button type="button" class="ghost-button" @click="addPlan">新增行</button>
            </div>
            <div class="weekly-edit-table weekly-edit-table--plans">
              <div class="weekly-edit-table__head">
                <span>工作任务</span>
                <span>工作目标</span>
                <span>计划日期</span>
                <span>责任人</span>
                <span>操作</span>
              </div>
              <div v-for="(plan, index) in form.plans" :key="plan.localId" class="weekly-edit-table__row">
                <label>
                  <input
                    v-model="plan.workTask"
                    list="weekly-project-options"
                    :class="{ invalid: fieldErrors[`plans.${index}.workTask`] }"
                    @input="scheduleProjectSearch(plan.workTask)"
                  />
                  <small v-if="fieldErrors[`plans.${index}.workTask`]">{{ fieldErrors[`plans.${index}.workTask`] }}</small>
                </label>
                <label>
                  <textarea v-model="plan.workTarget" :class="{ invalid: fieldErrors[`plans.${index}.workTarget`] }" />
                  <small v-if="fieldErrors[`plans.${index}.workTarget`]">
                    {{ fieldErrors[`plans.${index}.workTarget`] }}
                  </small>
                </label>
                <label>
                  <input
                    v-model="plan.plannedDate"
                    type="date"
                    :class="{ invalid: fieldErrors[`plans.${index}.plannedDate`] }"
                  />
                  <small v-if="fieldErrors[`plans.${index}.plannedDate`]">
                    {{ fieldErrors[`plans.${index}.plannedDate`] }}
                  </small>
                </label>
                <input v-model="plan.responsiblePerson" />
                <button type="button" class="ghost-button" :disabled="form.plans.length === 1" @click="removePlan(index)">
                  删除
                </button>
              </div>
            </div>
          </section>

          <datalist id="weekly-project-options">
            <option v-for="project in projectOptions" :key="project.id" :value="projectOptionLabel(project)" />
          </datalist>

          <section v-if="message" class="state-panel state-panel--success state-panel--compact">
            <p>{{ message }}</p>
          </section>
          <section v-if="errorMessage" class="state-panel state-panel--error state-panel--compact">
            <p>{{ errorMessage }}</p>
          </section>

          <div class="form-actions">
            <button type="button" class="ghost-button" :disabled="saving" @click="saveDraft">暂存草稿</button>
            <button type="button" class="primary-button" :disabled="saving" @click="submitReport">正式提交</button>
          </div>
        </form>
      </section>

      <section v-else-if="activeTab === 'export'" class="panel weekly-export-panel">
        <div class="panel-toolbar">
          <div>
            <strong>周报 Excel</strong>
            <span>使用正式《周绩效考核表》模板导出</span>
          </div>
          <button type="button" class="primary-button" :disabled="!savedReport || exporting" @click="downloadReportExcel">
            {{ exporting ? '正在导出' : '导出 Excel' }}
          </button>
        </div>
        <p class="inline-muted">保存后即可导出。导出文件名会按中心、姓名和周末日期生成。</p>
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
      // Old or imported rows may have an empty responsible person; default edits to the current display_name.
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
  return status === ReportStatus.SUBMITTED ? 'status-badge--done' : 'status-badge--warn';
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
    activeTab.value = 'form';
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

// Download the weekly report workbook generated from the official template.
async function downloadReportExcel() {
  if (!savedReport.value) {
    return;
  }

  exporting.value = true;
  errorMessage.value = '';

  try {
    const download = await exportWeeklyReport(savedReport.value.id, props.authToken);
    saveBlob(download, `周绩效考核表-${form.weekEnd}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    exporting.value = false;
  }
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
