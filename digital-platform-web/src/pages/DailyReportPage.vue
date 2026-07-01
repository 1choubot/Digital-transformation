<template>
  <section class="page-stack daily-report-page">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">个人日报</span>
        <h2>{{ reportId ? '编辑日报' : '填写日报' }}</h2>
        <span class="page-user">{{ currentUser.name }} / {{ currentUser.department }}</span>
      </div>
      <div class="daily-page-actions">
        <button type="button" class="ghost-button" @click="navigate('/daily-reports')">日报列表</button>
        <button type="button" class="ghost-button" @click="navigate('/projects')">项目总览</button>
      </div>
    </div>

    <section v-if="!canUseDailyReport" class="state-panel state-panel--error">
      <h3>无日报填写权限</h3>
      <p>当前账号不是 employee，不能创建或编辑个人日报。</p>
    </section>

    <section v-else class="panel daily-form-panel">
      <div class="panel-toolbar">
        <div>
          <strong>日报信息</strong>
          <span v-if="isBackfill" class="status-badge status-badge--warn">补填</span>
          <span v-else>默认填写业务当天</span>
        </div>
        <div class="daily-page-actions">
          <button
            v-if="savedReport"
            type="button"
            class="ghost-button"
            :disabled="exporting"
            @click="downloadReportExcel"
          >
            {{ exporting ? '正在导出' : '导出 Excel' }}
          </button>
        </div>
      </div>

      <form class="daily-form" @submit.prevent="saveDraft">
        <div class="daily-form-grid">
          <label>
            <span>报告日期</span>
            <input v-model="form.reportDate" type="date" required />
          </label>

          <label class="daily-project-search">
            <span>项目搜索</span>
            <input
              v-model="projectKeyword"
              type="search"
              placeholder="输入项目编号或名称"
              @input="searchProjects"
            />
          </label>
        </div>

        <div class="daily-project-options">
          <button
            v-for="project in projectOptions"
            :key="project.id"
            type="button"
            class="ghost-button"
            :class="{ active: form.projectId === project.id }"
            @click="selectProject(project)"
          >
            {{ project.projectCode }} / {{ project.projectName }}
          </button>
          <span v-if="projectSearchMessage">{{ projectSearchMessage }}</span>
        </div>

        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>今日完成情况</h3>
            <button type="button" class="ghost-button" @click="addItem">新增行</button>
          </div>

          <div class="daily-edit-table daily-edit-table--items">
            <div class="daily-edit-table__head">
              <span>工作内容</span>
              <span>完成进度</span>
              <span>完成时间</span>
              <span>负责人</span>
              <span>偏差与纠偏</span>
              <span>操作</span>
            </div>
            <div v-for="(item, index) in form.items" :key="item.localId" class="daily-edit-table__row">
              <textarea v-model="item.workContent" :class="{ invalid: itemErrors[item.localId]?.workContent }" required />
              <input
                v-model="item.completionProgress"
                :class="{ invalid: itemErrors[item.localId]?.completionProgress }"
                required
                placeholder="如 100% / 已完成"
              />
              <input
                v-model="item.completedAt"
                :class="{ invalid: itemErrors[item.localId]?.completedAt }"
                type="time"
                required
              />
              <input v-model="item.responsiblePerson" />
              <textarea v-model="item.deviationAndCorrectiveAction" />
              <button type="button" class="ghost-button" :disabled="form.items.length === 1" @click="removeItem(index)">
                删除
              </button>
            </div>
          </div>
        </section>

        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>明日工作计划</h3>
            <button type="button" class="ghost-button" @click="addPlan">新增行</button>
          </div>

          <div class="daily-edit-table daily-edit-table--plans">
            <div class="daily-edit-table__head">
              <span>计划内容</span>
              <span>负责人</span>
              <span>完成时间</span>
              <span>协同中心</span>
              <span>协同事项</span>
              <span>操作</span>
            </div>
            <div v-for="(plan, index) in form.plans" :key="plan.localId" class="daily-edit-table__row">
              <textarea v-model="plan.plannedWorkContent" />
              <input v-model="plan.responsiblePerson" />
              <input v-model="plan.plannedCompleteAt" type="time" />
              <input v-model="plan.collaboratingCenter" />
              <textarea v-model="plan.collaborationItem" />
              <button type="button" class="ghost-button" :disabled="form.plans.length === 1" @click="removePlan(index)">
                删除
              </button>
            </div>
          </div>
        </section>

        <section v-if="savedReport" class="daily-section daily-attachments">
          <div class="daily-section__heading">
            <h3>进展照片</h3>
            <label class="ghost-button daily-upload-button">
              上传照片
              <input type="file" accept="image/*" :disabled="uploading" @change="uploadAttachment" />
            </label>
          </div>
          <ul v-if="savedReport.attachments?.length" class="daily-attachment-list">
            <li v-for="attachment in savedReport.attachments" :key="attachment.id">
              <span>{{ attachment.originalFileName }}</span>
              <div>
                <button type="button" class="ghost-button" @click="downloadAttachment(attachment)">下载</button>
                <button type="button" class="ghost-button" @click="removeAttachment(attachment)">删除</button>
              </div>
            </li>
          </ul>
          <p v-else class="inline-muted">暂无照片。</p>
        </section>

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
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  createDailyReport,
  deleteDailyReportAttachment,
  downloadDailyReportAttachment,
  exportDailyReport,
  getDailyReport,
  searchDailyReportProjects,
  toReadableApiError,
  updateDailyReport,
  uploadDailyReportAttachment
} from '../api/dailyReports.js';

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

// Format the browser-local business date without converting through UTC.
function getLocalIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const today = getLocalIsoDate();
const projectKeyword = ref('');
const projectOptions = ref([]);
const projectSearchMessage = ref('');
const savedReport = ref(null);
const saving = ref(false);
const uploading = ref(false);
const exporting = ref(false);
const message = ref('');
const errorMessage = ref('');
const itemErrors = ref({});
const currentUserDisplayName = computed(
  () => props.currentUser.displayName || props.currentUser.name || props.currentUser.account || ''
);

const form = reactive({
  reportDate: today,
  projectId: '',
  items: [createEmptyItem()],
  plans: [createEmptyPlan()]
});

const canUseDailyReport = computed(() => props.currentUser.organizationRole === OrganizationRole.EMPLOYEE);
const isBackfill = computed(() => form.reportDate && form.reportDate !== today);

// Treat a completed-work row as empty when all submit-required business fields are blank.
function isBlankCompletedItem(item) {
  return !String(item?.workContent || '').trim() &&
    !String(item?.completionProgress || '').trim() &&
    !String(item?.completedAt || '').trim();
}

// Validate submitted rows locally so users see the exact highlighted fields before the API call.
function prepareSubmittedItems() {
  const nonBlankItems = form.items.filter((item) => !isBlankCompletedItem(item));
  const errors = {};

  if (nonBlankItems.length === 0) {
    const firstItem = form.items[0] || createEmptyItem();
    if (form.items.length === 0) {
      form.items = [firstItem];
    }
    errors[firstItem.localId] = {
      workContent: true,
      completionProgress: true,
      completedAt: true
    };
  }

  for (const item of nonBlankItems) {
    const rowErrors = {
      workContent: !String(item.workContent || '').trim(),
      completionProgress: !String(item.completionProgress || '').trim(),
      completedAt: !String(item.completedAt || '').trim()
    };
    if (rowErrors.workContent || rowErrors.completionProgress || rowErrors.completedAt) {
      errors[item.localId] = rowErrors;
    }
  }

  itemErrors.value = errors;
  if (Object.keys(errors).length > 0) {
    errorMessage.value = '请补全高亮的今日完成情况：工作内容、完成进度、完成时间。';
    return false;
  }

  form.items = nonBlankItems;
  return true;
}

// Build a local id so Vue can track unsaved dynamic rows.
function buildLocalId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Create one blank completed-work row.
function createEmptyItem() {
  return {
    localId: buildLocalId(),
    workContent: '',
    completionProgress: '',
    completedAt: '',
    responsiblePerson: currentUserDisplayName.value,
    deviationAndCorrectiveAction: ''
  };
}

// Create one blank next-day plan row.
function createEmptyPlan() {
  return {
    localId: buildLocalId(),
    plannedWorkContent: '',
    responsiblePerson: currentUserDisplayName.value,
    plannedCompleteAt: '',
    collaboratingCenter: '',
    collaborationItem: ''
  };
}

// Trigger a browser download for blob responses.
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

// Normalize current form state into the backend contract.
function buildPayload(status) {
  return {
    reportDate: form.reportDate,
    projectId: Number(form.projectId),
    status,
    items: form.items.map((item) => ({
      workContent: item.workContent,
      completionProgress: item.completionProgress,
      completedAt: item.completedAt,
      responsiblePerson: item.responsiblePerson,
      deviationAndCorrectiveAction: item.deviationAndCorrectiveAction
    })),
    plans: form.plans.map((plan) => ({
      plannedWorkContent: plan.plannedWorkContent,
      responsiblePerson: plan.responsiblePerson,
      plannedCompleteAt: plan.plannedCompleteAt,
      collaboratingCenter: plan.collaboratingCenter,
      collaborationItem: plan.collaborationItem
    }))
  };
}

// Copy a loaded report into the editable form.
function hydrateForm(report) {
  savedReport.value = report;
  itemErrors.value = {};
  form.reportDate = report.reportDate;
  form.projectId = report.projectId;
  projectKeyword.value = report.project ? `${report.project.projectCode} / ${report.project.projectName}` : '';
  projectOptions.value = report.project ? [report.project] : [];
  form.items = report.items.length
    ? report.items.map((item) => ({
        ...item,
        localId: buildLocalId(),
        // Old or imported rows may have an empty responsible person; keep new edits user-attributed.
        responsiblePerson: item.responsiblePerson || currentUserDisplayName.value
      }))
    : [createEmptyItem()];
  form.plans = report.plans.length
    ? report.plans.map((plan) => ({
        ...plan,
        localId: buildLocalId(),
        // Old or imported rows may have an empty responsible person; keep new edits user-attributed.
        responsiblePerson: plan.responsiblePerson || currentUserDisplayName.value
      }))
    : [createEmptyPlan()];
}

// Load an existing report when the route includes an id.
async function loadReport() {
  if (!props.reportId || !canUseDailyReport.value) {
    return;
  }

  errorMessage.value = '';

  try {
    const result = await getDailyReport(props.reportId, props.authToken);
    hydrateForm(result.report);
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  }
}

// Search projects as the user types, using the M2 real-schema endpoint.
async function searchProjects() {
  projectSearchMessage.value = '';

  try {
    const result = await searchDailyReportProjects(projectKeyword.value, props.authToken);
    projectOptions.value = result.projects || [];
    projectSearchMessage.value = projectOptions.value.length ? '' : '未找到可填报项目';
  } catch (error) {
    projectSearchMessage.value = toReadableApiError(error);
  }
}

// Select one active project from search results.
function selectProject(project) {
  form.projectId = project.id;
  projectKeyword.value = `${project.projectCode} / ${project.projectName}`;
  projectOptions.value = [project];
}

// Append one completed-work row.
function addItem() {
  form.items.push(createEmptyItem());
}

// Remove one completed-work row while preserving the minimum row.
function removeItem(index) {
  if (form.items.length > 1) {
    form.items.splice(index, 1);
  }
}

// Append one next-day plan row.
function addPlan() {
  form.plans.push(createEmptyPlan());
}

// Remove one next-day plan row while preserving the minimum row.
function removePlan(index) {
  if (form.plans.length > 1) {
    form.plans.splice(index, 1);
  }
}

// Save the report and keep the user on the editable page.
async function saveReport(status) {
  saving.value = true;
  message.value = '';
  errorMessage.value = '';
  itemErrors.value = {};

  try {
    if (status === ReportStatus.SUBMITTED && !prepareSubmittedItems()) {
      return;
    }

    const payload = buildPayload(status);
    const result = savedReport.value
      ? await updateDailyReport(savedReport.value.id, payload, props.authToken)
      : await createDailyReport(payload, props.authToken);
    hydrateForm(result.report);
    message.value = status === ReportStatus.SUBMITTED ? '日报已正式提交。' : '草稿已保存。';
    if (!props.reportId) {
      props.navigate(`/daily-report/${result.report.id}`);
    }
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

// Persist the current report as a draft.
async function saveDraft() {
  await saveReport(ReportStatus.DRAFT);
}

// Persist and mark the current report as submitted.
async function submitReport() {
  await saveReport(ReportStatus.SUBMITTED);
}

// Upload one image attachment after a report exists.
async function uploadAttachment(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !savedReport.value) {
    return;
  }

  uploading.value = true;
  errorMessage.value = '';

  try {
    await uploadDailyReportAttachment(savedReport.value.id, file, props.authToken);
    const result = await getDailyReport(savedReport.value.id, props.authToken);
    hydrateForm(result.report);
    message.value = '照片已上传。';
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    uploading.value = false;
  }
}

// Download an uploaded image attachment.
async function downloadAttachment(attachment) {
  if (!savedReport.value) {
    return;
  }

  try {
    const download = await downloadDailyReportAttachment(savedReport.value.id, attachment.id, props.authToken);
    saveBlob(download, attachment.originalFileName || 'attachment');
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

// Delete an uploaded image attachment and refresh report details.
async function removeAttachment(attachment) {
  if (!savedReport.value) {
    return;
  }

  try {
    await deleteDailyReportAttachment(savedReport.value.id, attachment.id, props.authToken);
    const result = await getDailyReport(savedReport.value.id, props.authToken);
    hydrateForm(result.report);
    message.value = '照片已删除。';
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

// Download the Excel workbook generated from the official template.
async function downloadReportExcel() {
  if (!savedReport.value) {
    return;
  }

  exporting.value = true;
  errorMessage.value = '';

  try {
    const download = await exportDailyReport(savedReport.value.id, props.authToken);
    saveBlob(download, `项目工作日报-${form.reportDate}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  await searchProjects();
  await loadReport();
});

watch(() => props.reportId, loadReport);
</script>
