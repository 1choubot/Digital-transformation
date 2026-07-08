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
            @click="props.navigate('/daily-reports')"
          >
            返回列表
          </button>
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
        </div>
      </div>

      <form class="daily-form" @submit.prevent="saveDraft">
        <!-- 筛选栏 -->
        <div class="daily-filters">
          <div class="filter-group">
            <span class="filter-label">报告日期</span>
            <div class="input-wrapper">
              <input v-model="form.reportDate" type="date" required :disabled="isReportReadOnly" />
            </div>
          </div>

          <div class="filter-group daily-project-select">
            <span class="filter-label">项目名称</span>
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
                  :disabled="isReportReadOnly"
                  @input="onInputSearch"
                  @focus="openDropdown"
                />
                <button
                  v-if="projectKeyword && !isReportReadOnly"
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

              <div v-show="showDropdown && !isReportReadOnly" class="project-dropdown">
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
            <button v-if="!isReportReadOnly" type="button" class="ghost-button" @click="addItem">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增行
            </button>
          </div>

          <div v-if="form.projectId && form.reportDate" class="daily-plan-suggestion">
            <div class="daily-plan-suggestion__content">
              <strong>本周可关联周计划</strong>
              <ul v-if="planSuggestion.items.length">
                <li v-for="item in planSuggestion.items" :key="item.taskKey">
                  {{ item.plannedDate }}｜{{ item.workTarget }}｜{{ executionStatusLabel(item.latestExecutionStatus) }}
                </li>
              </ul>
              <p v-else class="inline-muted">当前项目在本周没有可关联的周计划，请选择新增临时工作。</p>
            </div>
          </div>

          <div class="table-container">
            <div class="daily-edit-table daily-edit-table--items">
              <!-- 调整后的表头顺序 -->
              <div class="daily-edit-table__head">
                <span>任务来源</span>
                <span>关联周计划</span>
                <span>工作内容</span>
                <span>执行状态</span>
                <span>完成进度</span>
                <span>完成时间</span>
                <span>负责人</span>
                <span>偏差与纠偏</span>
                <span class="text-right">操作</span>
              </div>
              <div v-for="(item, index) in form.items" :key="item.localId" class="daily-edit-table__row">
                <!-- 任务来源 -->
                <select
                  v-model="item.sourceType"
                  class="form-control"
                  :disabled="isReportReadOnly"
                  :class="{ invalid: itemErrors[item.localId]?.sourceType }"
                  @change="onItemSourceTypeChange(item)"
                >
                  <option value="">请选择来源</option>
                  <option value="weekly_plan">周计划</option>
                  <option value="ad_hoc">新增</option>
                </select>
                <!-- 关联周计划 -->
                <select
                  v-model="item.sourcePlanTaskKey"
                  class="form-control"
                  :disabled="isReportReadOnly || item.sourceType !== 'weekly_plan'"
                  :class="{ invalid: itemErrors[item.localId]?.sourcePlanTaskKey }"
                  @change="applySelectedPlanToItem(item)"
                >
                  <option value="">请选择计划</option>
                  <option v-for="plan in planSuggestion.items" :key="plan.taskKey" :value="plan.taskKey">
                    {{ plan.plannedDate }}｜{{ plan.workTarget }}
                  </option>
                </select>
                <!-- 工作内容 -->
                <textarea
                  v-model="item.workContent"
                  required
                  class="form-control form-textarea"
                  :disabled="isReportReadOnly"
                  :class="{ invalid: itemErrors[item.localId]?.workContent }"
                />
                <!-- 执行状态 -->
                <select
                  v-model="item.executionStatus"
                  class="form-control"
                  :disabled="isReportReadOnly"
                  :class="{ invalid: itemErrors[item.localId]?.executionStatus }"
                  @change="onExecutionStatusChange(item)"
                >
                  <option value="">请选择状态</option>
                  <option value="completed">已完成</option>
                  <option value="in_progress">进行中</option>
                  <option value="not_completed">未完成</option>
                </select>
                <!-- 完成进度 -->
                <input
                  v-model="item.completionProgress"
                  required
                  placeholder="如 100%"
                  class="form-control"
                  :disabled="isReportReadOnly"
                  :class="{ invalid: itemErrors[item.localId]?.completionProgress }"
                />
                <!-- 完成时间 -->
                <input
                  v-model="item.completedAt"
                  type="time"
                  class="form-control"
                  :disabled="isReportReadOnly"
                  :class="{ invalid: itemErrors[item.localId]?.completedAt }"
                />
                <!-- 负责人 -->
                <input v-model="item.responsiblePerson" class="form-control" :disabled="isReportReadOnly" />
                <!-- 偏差与纠偏 -->
                <textarea
                  v-model="item.deviationAndCorrectiveAction"
                  class="form-control form-textarea"
                  :disabled="isReportReadOnly"
                />
                <!-- 操作 -->
                <button
                  v-if="!isReportReadOnly"
                  type="button"
                  class="row-btn action-btn"
                  :disabled="form.items.length === 1"
                  @click="removeItem(index)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 进展照片 -->
        <section class="daily-section daily-attachments" @paste="handlePaste">
          <div class="daily-section__heading">
            <h3>进展照片</h3>
            <label
              class="ghost-button daily-upload-button"
              :class="{ disabled: uploading || saving || isReportReadOnly }"
              :title="isReportReadOnly ? '已提交日报不能继续上传照片' : ((uploading || saving) ? '上传中，请稍候' : '点击上传照片')"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {{ uploading ? '上传中...' : '上传照片' }}
              <input
                type="file"
                accept="image/*"
                :disabled="uploading || saving || isReportReadOnly"
                @change="uploadAttachment"
              />
            </label>
          </div>

          <div v-if="savedReport">
            <ul v-if="savedReport.attachments?.length" class="daily-attachment-list">
              <li v-for="attachment in savedReport.attachments" :key="attachment.id">
                <div class="attachment-preview">
                  <img
                    v-if="thumbnails[attachment.id]"
                    :src="thumbnails[attachment.id]"
                    alt="缩略图"
                    class="attachment-thumbnail"
                    @error="onThumbnailError(attachment)"
                  />
                  <div v-else class="attachment-thumbnail-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <span class="attachment-name">{{ attachment.originalFileName }}</span>
                </div>
                <div class="attachment-actions">
                  <button type="button" class="row-btn action-btn" @click="downloadAttachment(attachment)">下载</button>
                  <button
                    v-if="!isReportReadOnly"
                    type="button"
                    class="row-btn action-btn action-btn--danger"
                    @click="removeAttachment(attachment)"
                  >
                    删除
                  </button>
                </div>
              </li>
            </ul>
            <p v-else class="inline-muted">暂无照片。</p>
          </div>
          <p v-else-if="!isReportReadOnly" class="inline-muted inline-hint">选择项目后可直接上传照片，系统将自动保存草稿。</p>
        </section>

        <!-- 明日工作计划 -->
        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>明日工作计划</h3>
            <button v-if="!isReportReadOnly" type="button" class="ghost-button" @click="addPlan">
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
                <textarea v-model="plan.plannedWorkContent" class="form-control form-textarea" :disabled="isReportReadOnly" />
                <input v-model="plan.responsiblePerson" class="form-control" :disabled="isReportReadOnly" />
                <input v-model="plan.plannedCompleteAt" type="time" class="form-control" :disabled="isReportReadOnly" />
                <input v-model="plan.collaboratingCenter" class="form-control" :disabled="isReportReadOnly" />
                <textarea v-model="plan.collaborationItem" class="form-control form-textarea" :disabled="isReportReadOnly" />
                <button
                  v-if="!isReportReadOnly"
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

        <!-- 消息提示 -->
        <section v-if="message" class="state-panel state-panel--success state-panel--compact">
          <p>{{ message }}</p>
        </section>
        <section v-if="errorMessage" class="state-panel state-panel--error state-panel--compact">
          <p>{{ errorMessage }}</p>
        </section>
        <section v-if="isReportReadOnly" class="state-panel state-panel--compact">
          <p>已提交日报仅可查看和下载附件，不能再修改、删除或重新保存为草稿。</p>
        </section>

        <!-- 底部操作按钮 -->
        <div v-if="!isReportReadOnly" class="form-actions">
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
import { computed, onMounted, reactive, ref, watch, onBeforeUnmount } from 'vue';
import { OrganizationRole, ReportStatus } from '../constants/reports.js';
import {
  createDailyReport,
  deleteDailyReportAttachment,
  downloadDailyReportAttachment,
  exportDailyReport,
  getAvailableWeeklyPlansForDailyReport,
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
const planSuggestion = reactive({
  items: []
});
let planSuggestionRequestSeq = 0;
let lastProjectIdForPlanScope = '';
let lastWeekStartForPlanScope = '';

// ===== 缩略图缓存 =====
const thumbnails = reactive({});
// 存储需要 revoke 的 object URL
const objectURLs = [];

function revokeObjectURL(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function addObjectURL(url) {
  if (url && url.startsWith('blob:')) {
    objectURLs.push(url);
  }
}

// 清理所有 object URL（组件卸载时调用）
function clearObjectURLs() {
  objectURLs.forEach(revokeObjectURL);
  objectURLs.length = 0;
}

// 用户显示名称
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
const isReportReadOnly = computed(() => savedReport.value?.status === ReportStatus.SUBMITTED);

// 判断今日完成行是否为空
function isBlankCompletedItem(item) {
  return !String(item?.workContent || '').trim() &&
    !String(item?.sourceType || '').trim() &&
    !String(item?.sourcePlanTaskKey || '').trim() &&
    !String(item?.executionStatus || '').trim() &&
    !String(item?.completionProgress || '').trim() &&
    !String(item?.completedAt || '').trim();
}

// 提交前校验
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
      sourceType: true,
      executionStatus: true,
      completionProgress: true,
      completedAt: true
    };
  }

  for (const item of nonBlankItems) {
    const rowErrors = {
      workContent: !String(item.workContent || '').trim(),
      sourceType: !String(item.sourceType || '').trim(),
      sourcePlanTaskKey: item.sourceType === 'weekly_plan' && !String(item.sourcePlanTaskKey || '').trim(),
      executionStatus: !String(item.executionStatus || '').trim(),
      completionProgress: !String(item.completionProgress || '').trim(),
      completedAt: !String(item.completedAt || '').trim()
    };
    if (
      rowErrors.workContent ||
      rowErrors.sourceType ||
      rowErrors.sourcePlanTaskKey ||
      rowErrors.executionStatus ||
      rowErrors.completionProgress ||
      rowErrors.completedAt
    ) {
      errors[item.localId] = rowErrors;
    }
  }

  itemErrors.value = errors;
  if (Object.keys(errors).length > 0) {
    errorMessage.value = '请补全高亮的今日完成情况：来源、计划、状态、工作内容、完成进度、完成时间。';
    return false;
  }

  form.items = nonBlankItems;
  return true;
}

// Build a local id
function buildLocalId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createEmptyItem() {
  return {
    localId: buildLocalId(),
    sourceType: '',
    sourcePlanTaskKey: '',
    executionStatus: '',
    workContent: '',
    completionProgress: '', // 初始为空，由执行状态控制
    completedAt: '17:30',
    responsiblePerson: currentUserDisplayName.value,
    deviationAndCorrectiveAction: '无偏差'
  };
}

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

// Resolve the Monday for the selected report date without UTC drift.
function getWeekStart(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function executionStatusLabel(status) {
  if (status === 'completed') return '已完成';
  if (status === 'in_progress') return '进行中';
  if (status === 'not_completed') return '未完成';
  return '暂无关联日报';
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

function buildPayload(status) {
  return {
    reportDate: form.reportDate,
    projectId: Number(form.projectId),
    status,
    items: form.items.map((item) => ({
      sourceType: item.sourceType || null,
      sourcePlanTaskKey: item.sourceType === 'weekly_plan' ? item.sourcePlanTaskKey || null : null,
      executionStatus: item.executionStatus || null,
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

// 根据报告日期和项目刷新当前项目本周可执行的周报计划。
async function refreshPlanSuggestion() {
  const requestSeq = ++planSuggestionRequestSeq;
  planSuggestion.items = [];

  if (!form.reportDate || !form.projectId || !canUseDailyReport.value) {
    return;
  }

  try {
    const result = await getAvailableWeeklyPlansForDailyReport(
      { reportDate: form.reportDate, projectId: form.projectId },
      props.authToken
    );
    if (requestSeq !== planSuggestionRequestSeq) {
      return;
    }
    planSuggestion.items = result.suggestion?.items || [];
    clearInvalidPlanTaskKeys();
  } catch (error) {
    if (requestSeq !== planSuggestionRequestSeq) {
      return;
    }
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    planSuggestion.items = [];
  }
}

function clearInvalidPlanTaskKeys() {
  const availableTaskKeys = new Set(planSuggestion.items.map((item) => item.taskKey));
  form.items.forEach((item) => {
    if (item.sourceType === 'weekly_plan' && item.sourcePlanTaskKey && !availableTaskKeys.has(item.sourcePlanTaskKey)) {
      item.sourcePlanTaskKey = '';
    }
  });
}

function clearAllPlanTaskKeysForScopeChange() {
  form.items.forEach((item) => {
    if (item.sourceType === 'weekly_plan') {
      item.sourcePlanTaskKey = '';
    }
  });
}

function onItemSourceTypeChange(item) {
  if (isReportReadOnly.value) return;
  if (item.sourceType !== 'weekly_plan') {
    item.sourcePlanTaskKey = '';
  }
}

function applySelectedPlanToItem(item) {
  if (isReportReadOnly.value) return;
  const plan = planSuggestion.items.find((candidate) => candidate.taskKey === item.sourcePlanTaskKey);
  if (!plan) {
    return;
  }
  if (!String(item.workContent || '').trim()) {
    item.workContent = plan.workTarget || plan.workTask || '';
  }
}

// ===== 执行状态变更时自动填充/清空完成进度 =====
function onExecutionStatusChange(item) {
  if (isReportReadOnly.value) return;
  if (item.executionStatus === 'completed') {
    item.completionProgress = '100%';
  } else if (item.executionStatus === 'not_completed') {
    item.completionProgress = '0%';
  } else {
    item.completionProgress = ''; // 进行中或其他状态置空
  }
}

// ===== 缩略图加载函数 =====
async function loadThumbnail(attachment) {
  // 如果已有缩略图或正在加载，跳过
  if (thumbnails[attachment.id] !== undefined) return;
  // 如果 attachment 有 url 字段，直接使用
  if (attachment.url) {
    thumbnails[attachment.id] = attachment.url;
    return;
  }
  // 否则通过下载接口获取 blob
  try {
    const { blob } = await downloadDailyReportAttachment(
      savedReport.value.id,
      attachment.id,
      props.authToken
    );
    const url = URL.createObjectURL(blob);
    thumbnails[attachment.id] = url;
    addObjectURL(url); // 记录以便销毁时释放
  } catch (error) {
    // 加载失败，留空即可
    console.warn('缩略图加载失败', error);
  }
}

// 当缩略图加载出错时（如 url 失效），可尝试重新加载
function onThumbnailError(attachment) {
  thumbnails[attachment.id] = undefined;
}

// ===== 核心上传逻辑（提取出来，供文件和粘贴使用） =====
async function uploadFile(file) {
  // 防重检查
  if (uploading.value || saving.value) return;
  if (isReportReadOnly.value) {
    errorMessage.value = '已提交日报不能继续上传照片。';
    return;
  }

  // 自动保存草稿（如果未保存）
  if (!savedReport.value) {
    if (!form.projectId) {
      errorMessage.value = '请先选择项目，才能上传照片。';
      return;
    }
    uploading.value = true;
    try {
      await saveReport(ReportStatus.DRAFT);
      if (!savedReport.value) {
        uploading.value = false;
        return;
      }
    } catch {
      uploading.value = false;
      return;
    }
  }

  if (!savedReport.value) {
    uploading.value = false;
    errorMessage.value = '日报尚未创建，请稍后重试。';
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
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    errorMessage.value = toReadableApiError(error);
  } finally {
    uploading.value = false;
  }
}

// ===== 粘贴处理 =====
async function handlePaste(event) {
  if (isReportReadOnly.value) return;
  const items = event.clipboardData?.items;
  if (!items) return;

  const files = [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  if (!files.length) return;

  // 逐个上传（此处串行，可改为并行但要注意并发控制）
  for (const file of files) {
    await uploadFile(file);
  }
}

// ===== hydrateForm（加载报告后填充表单） =====
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
        sourceType: item.sourceType === 'legacy_unknown' ? '' : item.sourceType || '',
        sourcePlanTaskKey: item.sourcePlanTaskKey || '',
        executionStatus: item.executionStatus || '',
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

  // ===== 加载缩略图 =====
  // 清空旧缩略图（释放 object URL）
  Object.keys(thumbnails).forEach(key => {
    const url = thumbnails[key];
    if (url && url.startsWith('blob:')) {
      revokeObjectURL(url);
    }
    delete thumbnails[key];
  });
  // 重新加载所有附件的缩略图
  if (report.attachments && report.attachments.length) {
    report.attachments.forEach(attachment => {
      // 异步加载，不阻塞
      loadThumbnail(attachment);
    });
  }
}

// 重置表单
function resetForm() {
  savedReport.value = null;
  itemErrors.value = {};
  form.reportDate = today;
  form.projectId = '';
  projectKeyword.value = '';
  form.items = [createEmptyItem()];
  form.plans = [createEmptyPlan()];
  message.value = '';
  errorMessage.value = '';
  // 清理缩略图
  Object.keys(thumbnails).forEach(key => {
    const url = thumbnails[key];
    if (url && url.startsWith('blob:')) {
      revokeObjectURL(url);
    }
    delete thumbnails[key];
  });
  props.navigate('/daily-report');
}

// 加载已有报告
async function loadReport() {
  if (!props.reportId || !canUseDailyReport.value) return;
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

// 项目搜索等
async function searchProjects(shouldOpen = false) {
  projectSearchMessage.value = '';
  try {
    const result = await searchDailyReportProjects(projectKeyword.value, props.authToken);
    projectOptions.value = result.projects || [];
    projectSearchMessage.value = projectOptions.value.length ? '' : '未找到可填报项目';
    if (shouldOpen) showDropdown.value = true;
  } catch (error) {
    projectSearchMessage.value = toReadableApiError(error);
  }
}

function onInputSearch() {
  if (isReportReadOnly.value) return;
  searchProjects(true);
}

function selectProject(project) {
  if (isReportReadOnly.value) return;
  if (String(form.projectId || '') !== String(project.id || '')) {
    clearAllPlanTaskKeysForScopeChange();
  }
  form.projectId = project.id;
  projectKeyword.value = `${project.projectCode} / ${project.projectName}`;
  projectSearchMessage.value = '';
  showDropdown.value = false;
  projectInput.value?.blur();
}

function clearProjectSelection() {
  if (isReportReadOnly.value) return;
  clearAllPlanTaskKeysForScopeChange();
  projectKeyword.value = '';
  form.projectId = '';
  showDropdown.value = false;
  searchProjects(true).then(() => {
    projectInput.value?.focus();
  });
}

function openDropdown() {
  if (isReportReadOnly.value) return;
  if (projectOptions.value.length || projectSearchMessage.value) {
    showDropdown.value = true;
  } else {
    searchProjects(true);
  }
}

let closeTimer = null;
function closeDropdownDelayed() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    showDropdown.value = false;
  }, 150);
}

function addItem() {
  if (isReportReadOnly.value) return;
  form.items.push(createEmptyItem());
}
function removeItem(index) {
  if (isReportReadOnly.value) return;
  if (form.items.length > 1) form.items.splice(index, 1);
}
function addPlan() {
  if (isReportReadOnly.value) return;
  form.plans.push(createEmptyPlan());
}
function removePlan(index) {
  if (isReportReadOnly.value) return;
  if (form.plans.length > 1) form.plans.splice(index, 1);
}

// 保存报告（草稿或提交）
async function saveReport(status) {
  if (isReportReadOnly.value) {
    errorMessage.value = '已提交日报不能再修改或保存为草稿。';
    return;
  }
  saving.value = true;
  message.value = '';
  errorMessage.value = '';
  itemErrors.value = {};

  try {
    if (status === ReportStatus.SUBMITTED && !prepareSubmittedItems()) {
      saving.value = false;
      return;
    }
    const payload = buildPayload(status);
    const result = savedReport.value
      ? await updateDailyReport(savedReport.value.id, payload, props.authToken)
      : await createDailyReport(payload, props.authToken);
    
    if (status === ReportStatus.SUBMITTED) {
      resetForm();
      message.value = '日报已正式提交，表单已清空，可继续填写新的日报。';
    } else {
      hydrateForm(result.report);
      message.value = '草稿已保存。';
    }

    if (!props.reportId && result.report?.id && status === ReportStatus.DRAFT) {
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

async function saveDraft() {
  await saveReport(ReportStatus.DRAFT);
}
async function submitReport() {
  await saveReport(ReportStatus.SUBMITTED);
}

// 文件上传（来自 input）
async function uploadAttachment(event) {
  if (isReportReadOnly.value) {
    event.target.value = '';
    errorMessage.value = '已提交日报不能继续上传照片。';
    return;
  }
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  await uploadFile(file);
}

// 下载附件
async function downloadAttachment(attachment) {
  if (!savedReport.value) return;
  try {
    const download = await downloadDailyReportAttachment(savedReport.value.id, attachment.id, props.authToken);
    saveBlob(download, attachment.originalFileName || 'attachment');
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

async function downloadReportExcel() {
  if (!savedReport.value) return;
  exporting.value = true;
  errorMessage.value = '';
  try {
    const download = await exportDailyReport(savedReport.value.id, props.authToken);
    saveBlob(download, `项目工作日报-${savedReport.value.reportDate}.xlsx`);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    exporting.value = false;
  }
}

// 删除附件
async function removeAttachment(attachment) {
  if (isReportReadOnly.value) {
    errorMessage.value = '已提交日报不能删除照片。';
    return;
  }
  if (!savedReport.value) return;
  try {
    await deleteDailyReportAttachment(savedReport.value.id, attachment.id, props.authToken);
    const result = await getDailyReport(savedReport.value.id, props.authToken);
    hydrateForm(result.report);
    message.value = '照片已删除。';
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  }
}

// 生命周期
onMounted(async () => {
  await searchProjects(false);
  await loadReport();
});

watch(() => props.reportId, loadReport);
watch(
  () => [form.reportDate, form.projectId],
  () => {
    const currentWeekStart = form.reportDate ? getWeekStart(form.reportDate) : '';
    const projectChanged = String(lastProjectIdForPlanScope || '') !== String(form.projectId || '');
    const weekChanged = String(lastWeekStartForPlanScope || '') !== String(currentWeekStart || '');
    if ((projectChanged || weekChanged) && (lastProjectIdForPlanScope || lastWeekStartForPlanScope)) {
      clearAllPlanTaskKeysForScopeChange();
    }
    lastProjectIdForPlanScope = form.projectId || '';
    lastWeekStartForPlanScope = currentWeekStart;
    void refreshPlanSuggestion();
  },
  { immediate: true }
);

// 组件卸载时清理 object URL
onBeforeUnmount(() => {
  clearObjectURLs();
});
</script>

<style scoped>
/* ===== 全局页面容器 ===== */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1500px;
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
  color: #303133;  /* 与下拉选项文字颜色一致 */
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

.daily-plan-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #f5faff;
}
.daily-plan-suggestion__content {
  min-width: 0;
}
.daily-plan-suggestion__content strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #303133;
  font-size: 0.9rem;
}
.daily-plan-suggestion__content ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #606266;
  font-size: 0.85rem;
  line-height: 1.5;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}
.daily-edit-table {
  min-width: 1320px;
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
/* 调整后的列宽顺序（任务来源、关联周计划、工作内容、执行状态、完成进度、完成时间、负责人、偏差与纠偏、操作） */
.daily-edit-table--items .daily-edit-table__head {
  grid-template-columns: 1.1fr 1.8fr 1.8fr 1.1fr 1fr 0.9fr 1fr 1.4fr 0.7fr;
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
/* 行内列宽与表头一致 */
.daily-edit-table--items .daily-edit-table__row {
  grid-template-columns: 1.1fr 1.8fr 1.8fr 1.1fr 1fr 0.9fr 1fr 1.4fr 0.7fr;
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

/* ===== 附件列表与缩略图 ===== */
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
.attachment-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}
.attachment-thumbnail {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  flex-shrink: 0;
}
.attachment-thumbnail-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  border: 1px dashed #dcdfe6;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.attachment-thumbnail-placeholder svg {
  width: 24px;
  height: 24px;
  stroke: #c0c4cc;
}
.attachment-name {
  font-size: 0.85rem;
  color: #303133;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attachment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
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
  .attachment-preview {
    flex-wrap: wrap;
  }
  .attachment-name {
    white-space: normal;
  }
}
</style>
