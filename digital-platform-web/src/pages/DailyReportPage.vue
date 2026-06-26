<template>
  <section class="page-stack daily-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <section v-if="!canUseDailyReport" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>无日报填写权限</h3>
      <p>当前账号不是员工（employee），不能创建或编辑个人日报。</p>
    </section>

    <!-- 主表单面板 -->
    <section v-else class="panel daily-form-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">日报信息</strong>
          <span v-if="isBackfill" class="status-badge status-badge--draft">补填</span>
          <span v-else class="toolbar-subtitle">默认填写业务当天</span>
        </div>
        <div class="toolbar-actions">
          <button
            v-if="savedReport"
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
          <!-- 返回列表按钮（仅当已保存时显示） -->
          <button
            v-if="savedReport"
            type="button"
            class="ghost-button"
            @click="props.navigate('/daily-report-list')"
          >
            返回列表
          </button>
        </div>
      </div>

      <form class="daily-form" @submit.prevent="saveDraft">
        <!-- 筛选栏：日期 + 项目选择（下拉） -->
        <div class="daily-filters">
          <div class="filter-group">
            <span class="filter-label">报告日期</span>
            <div class="input-wrapper">
              <input v-model="form.reportDate" type="date" required />
            </div>
          </div>

          <div class="filter-group daily-project-select">
            <span class="filter-label">选择项目</span>
            <div
              class="project-select-wrapper"
              @focusin="openDropdown"
              @focusout="closeDropdownDelayed"
            >
              <div class="input-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref="projectInput"
                  v-model="projectKeyword"
                  type="search"
                  placeholder="搜索并选择项目"
                  @input="onInputSearch"
                  @focus="openDropdown"
                />
                <button
                  v-if="projectKeyword"
                  type="button"
                  class="clear-search-btn"
                  @mousedown.prevent="clearProjectSelection"
                  aria-label="清空选择"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div v-show="showDropdown" class="project-dropdown">
                <div
                  v-for="project in projectOptions"
                  :key="project.id"
                  class="project-dropdown-item"
                  :class="{ active: form.projectId === project.id }"
                  @mousedown.prevent="selectProject(project)"
                >
                  {{ project.projectCode }} / {{ project.projectName }}
                </div>
                <div v-if="projectSearchMessage" class="project-dropdown-empty">
                  {{ projectSearchMessage }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 今日完成情况 -->
        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>今日完成情况</h3>
            <button type="button" class="ghost-button" @click="addItem">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增行
            </button>
          </div>

          <div class="table-container">
            <div class="daily-edit-table daily-edit-table--items">
              <div class="daily-edit-table__head">
                <span>工作内容</span>
                <span>完成进度</span>
                <span>完成时间</span>
                <span>负责人</span>
                <span>偏差与纠偏</span>
                <span class="text-right">操作</span>
              </div>
              <div v-for="(item, index) in form.items" :key="item.localId" class="daily-edit-table__row">
                <textarea
                  v-model="item.workContent"
                  required
                  class="form-control form-textarea"
                  :class="{ invalid: itemErrors[item.localId]?.workContent }"
                />
                <input
                  v-model="item.completionProgress"
                  required
                  placeholder="如 100% / 已完成"
                  class="form-control"
                  :class="{ invalid: itemErrors[item.localId]?.completionProgress }"
                />
                <input
                  v-model="item.completedAt"
                  type="time"
                  class="form-control"
                  :class="{ invalid: itemErrors[item.localId]?.completedAt }"
                />
                <input v-model="item.responsiblePerson" class="form-control" />
                <textarea v-model="item.deviationAndCorrectiveAction" class="form-control form-textarea" />
                <button type="button" class="row-btn action-btn" :disabled="form.items.length === 1" @click="removeItem(index)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 进展照片（固定在今日和明日之间） -->
        <section class="daily-section daily-attachments">
          <div class="daily-section__heading">
            <h3>进展照片</h3>
            <label
              class="ghost-button daily-upload-button"
              :class="{ disabled: !savedReport }"
              :title="!savedReport ? '请先保存日报草稿' : '点击上传照片'"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              上传照片
              <input
                type="file"
                accept="image/*"
                :disabled="!savedReport || uploading"
                @change="uploadAttachment"
              />
            </label>
          </div>

          <div v-if="savedReport">
            <ul v-if="savedReport.attachments?.length" class="daily-attachment-list">
              <li v-for="attachment in savedReport.attachments" :key="attachment.id">
                <span class="attachment-name">{{ attachment.originalFileName }}</span>
                <div class="attachment-actions">
                  <button type="button" class="row-btn action-btn" @click="downloadAttachment(attachment)">下载</button>
                  <button type="button" class="row-btn action-btn action-btn--danger" @click="removeAttachment(attachment)">删除</button>
                </div>
              </li>
            </ul>
            <p v-else class="inline-muted">暂无照片。</p>
          </div>
          <p v-else class="inline-muted inline-hint">💡 保存日报草稿后即可上传照片。</p>
        </section>

        <!-- 明日工作计划 -->
        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>明日工作计划</h3>
            <button type="button" class="ghost-button" @click="addPlan">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增行
            </button>
          </div>

          <div class="table-container">
            <div class="daily-edit-table daily-edit-table--plans">
              <div class="daily-edit-table__head">
                <span>计划内容</span>
                <span>负责人</span>
                <span>完成时间</span>
                <span>协同中心</span>
                <span>协同事项</span>
                <span class="text-right">操作</span>
              </div>
              <div v-for="(plan, index) in form.plans" :key="plan.localId" class="daily-edit-table__row">
                <textarea v-model="plan.plannedWorkContent" class="form-control form-textarea" />
                <input v-model="plan.responsiblePerson" class="form-control" />
                <input v-model="plan.plannedCompleteAt" type="time" class="form-control" />
                <input v-model="plan.collaboratingCenter" class="form-control" />
                <textarea v-model="plan.collaborationItem" class="form-control form-textarea" />
                <button type="button" class="row-btn action-btn" :disabled="form.plans.length === 1" @click="removePlan(index)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </section>

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
const showDropdown = ref(false);
const projectInput = ref(null);
const itemErrors = ref({});

// 用户显示名称（兼容多种字段名）
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

// 判断一个今日完成行是否为空（业务字段全空）
function isBlankCompletedItem(item) {
  return !String(item?.workContent || '').trim() &&
    !String(item?.completionProgress || '').trim() &&
    !String(item?.completedAt || '').trim();
}

// 提交前校验：过滤空行，高亮必填字段
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

// Create one blank completed-work row with default values.
function createEmptyItem() {
  return {
    localId: buildLocalId(),
    workContent: '',
    completionProgress: '100%',
    completedAt: '17:30',
    responsiblePerson: currentUserDisplayName.value,
    deviationAndCorrectiveAction: '无偏差'
  };
}

// Create one blank next-day plan row with default plannedCompleteAt.
function createEmptyPlan() {
  return {
    localId: buildLocalId(),
    plannedWorkContent: '',
    responsiblePerson: currentUserDisplayName.value,
    plannedCompleteAt: '17:30',
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
  form.items = report.items.length
    ? report.items.map((item) => ({
        ...item,
        localId: buildLocalId(),
        responsiblePerson: item.responsiblePerson || currentUserDisplayName.value
      }))
    : [createEmptyItem()];
  form.plans = report.plans.length
    ? report.plans.map((plan) => ({
        ...plan,
        localId: buildLocalId(),
        responsiblePerson: plan.responsiblePerson || currentUserDisplayName.value
      }))
    : [createEmptyPlan()];
}

// 重置表单到初始状态（清空所有内容）
function resetForm() {
  savedReport.value = null;
  itemErrors.value = {};
  form.reportDate = today;
  form.projectId = '';
  projectKeyword.value = '';
  form.items = [createEmptyItem()];
  form.plans = [createEmptyPlan()];
  // 清空消息
  message.value = '';
  errorMessage.value = '';
  // 更新地址栏到新建状态（不带ID）
  try {
    window.history.replaceState(null, '', '/daily-report');
  } catch (e) {
    // 忽略
  }
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
async function searchProjects(shouldOpen = false) {
  projectSearchMessage.value = '';

  try {
    const result = await searchDailyReportProjects(projectKeyword.value, props.authToken);
    projectOptions.value = result.projects || [];
    projectSearchMessage.value = projectOptions.value.length ? '' : '未找到可填报项目';
    if (shouldOpen) {
      showDropdown.value = true;
    }
  } catch (error) {
    projectSearchMessage.value = toReadableApiError(error);
  }
}

function onInputSearch() {
  searchProjects(true);
}

// Select one active project from search results.
function selectProject(project) {
  form.projectId = project.id;
  projectKeyword.value = `${project.projectCode} / ${project.projectName}`;
  projectSearchMessage.value = '';
  showDropdown.value = false;
  projectInput.value?.blur();
}

// 清空项目选择和搜索关键词，并重新加载全部项目
function clearProjectSelection() {
  projectKeyword.value = '';
  form.projectId = '';
  showDropdown.value = false;
  searchProjects(true).then(() => {
    projectInput.value?.focus();
  });
}

// 打开下拉
function openDropdown() {
  if (projectOptions.value.length || projectSearchMessage.value) {
    showDropdown.value = true;
  } else {
    searchProjects(true);
  }
}

// 延迟关闭下拉
let closeTimer = null;
function closeDropdownDelayed() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    showDropdown.value = false;
  }, 150);
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
    // 提交时执行校验
    if (status === ReportStatus.SUBMITTED && !prepareSubmittedItems()) {
      saving.value = false;
      return;
    }

    const payload = buildPayload(status);
    const result = savedReport.value
      ? await updateDailyReport(savedReport.value.id, payload, props.authToken)
      : await createDailyReport(payload, props.authToken);
    
    // 如果正式提交，重置表单（清空所有内容）
    if (status === ReportStatus.SUBMITTED) {
      resetForm();
      message.value = '日报已正式提交，表单已清空，可继续填写新的日报。';
    } else {
      // 草稿保存：保留数据并更新
      hydrateForm(result.report);
      message.value = '草稿已保存。';
    }

    // 如果创建时没有 reportId 且是草稿，更新地址栏
    if (!props.reportId && result.report?.id && status === ReportStatus.DRAFT) {
      try {
        const newUrl = `/daily-report/${result.report.id}`;
        window.history.replaceState(null, '', newUrl);
      } catch (e) {
        // 忽略
      }
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
  await searchProjects(false);
  await loadReport();
});

watch(() => props.reportId, loadReport);
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
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

/* ===== 状态面板（错误、空、加载） ===== */
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
  margin: 1rem 0 0;
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
.ghost-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.btn-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  flex-shrink: 0;
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

/* ===== 表单筛选栏 ===== */
.daily-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.daily-filters {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
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

/* 项目选择器（下拉） */
.daily-project-select {
  flex: 1;
  min-width: 280px;
  position: relative;
}
.project-select-wrapper {
  position: relative;
}
.project-select-wrapper .input-wrapper {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  stroke: #c0c4cc;
  pointer-events: none;
}
.project-select-wrapper .input-wrapper input {
  padding-left: 2.2rem;
  padding-right: 2.2rem;
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
.input-wrapper input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
  height: 48px;
  box-sizing: border-box;
}
.input-wrapper input[type="date"] {
  cursor: pointer;
}
.input-wrapper input::placeholder {
  color: #c0c4cc;
}

/* 清空搜索按钮（自定义） */
.clear-search-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
}
.clear-search-btn:hover {
  background: #f0f0f0;
  color: #606266;
}
.clear-search-btn svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

/* 隐藏浏览器默认的搜索清除按钮 */
.daily-project-select .input-wrapper input[type="search"]::-webkit-search-cancel-button,
.daily-project-select .input-wrapper input[type="search"]::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}
.daily-project-select .input-wrapper input[type="search"] {
  -webkit-appearance: none;
  appearance: none;
}

/* 下拉列表 */
.project-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  padding: 4px 0;
}
.project-dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: #303133;
  cursor: pointer;
  transition: background 0.15s ease;
}
.project-dropdown-item:hover {
  background: #f5f7fa;
}
.project-dropdown-item.active {
  background: #ecf5ff;
  color: #3e63dd;
}
.project-dropdown-empty {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: #909399;
  text-align: center;
}

/* ===== 动态区块（今日完成情况 / 明日计划 / 照片） ===== */
.daily-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.daily-section__heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.daily-section__heading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}
.daily-edit-table {
  min-width: 800px;
  width: 100%;
}
.daily-edit-table__head {
  display: grid;
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 500;
  color: #909399;
  gap: 0.75rem;
}
.daily-edit-table--items .daily-edit-table__head {
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1.5fr 0.8fr;
}
.daily-edit-table--plans .daily-edit-table__head {
  grid-template-columns: 2fr 1fr 1fr 1.2fr 1.5fr 0.8fr;
}
.text-right {
  text-align: right;
}

.daily-edit-table__row {
  display: grid;
  padding: 0.6rem 0.75rem;
  align-items: start;
  border-bottom: 1px solid #f0f0f2;
  gap: 0.75rem;
  transition: background 0.2s ease;
}
.daily-edit-table--items .daily-edit-table__row {
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1.5fr 0.8fr;
}
.daily-edit-table--plans .daily-edit-table__row {
  grid-template-columns: 2fr 1fr 1fr 1.2fr 1.5fr 0.8fr;
}
.daily-edit-table__row:hover {
  background: #fdfdfe;
}

/* 表单控件（输入框 / 文本域）—— 高度 48px */
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
  height: 48px;
  box-sizing: border-box;
  line-height: 1.4;
}
.form-control:focus {
  border-color: #3e63dd;
}

/* 文本域特殊处理 */
.form-textarea {
  height: 48px;
  min-height: 48px;
  resize: vertical;
  overflow-y: auto;
  line-height: 1.5;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* 错误高亮 */
.form-control.invalid {
  border-color: #f56c6c;
  background-color: #fef0f0;
}
.form-control.invalid:focus {
  border-color: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2);
}

.daily-edit-table__row .row-btn {
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

/* ===== 附件区域 ===== */
.daily-attachments {
  padding-top: 0.5rem;
}
.daily-upload-button {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.daily-upload-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.daily-upload-button input[type="file"] {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.daily-upload-button.disabled input[type="file"] {
  cursor: not-allowed;
}

.daily-attachment-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.daily-attachment-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.attachment-name {
  font-size: 0.85rem;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}
.attachment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inline-muted {
  font-size: 0.85rem;
  color: #909399;
  margin: 0.5rem 0;
}
.inline-hint {
  color: #909399;
  font-style: italic;
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
  .daily-filters {
    flex-direction: column;
    align-items: stretch;
  }
  .daily-project-select {
    min-width: unset;
  }
  .daily-edit-table__head,
  .daily-edit-table__row {
    grid-template-columns: 1fr !important;
    gap: 0.5rem;
  }
  .daily-edit-table__head {
    display: none;
  }
  .daily-edit-table__row {
    padding: 0.75rem;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .daily-edit-table__row .row-btn {
    align-self: flex-start;
  }
  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>