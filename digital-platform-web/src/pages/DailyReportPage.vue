<template>
  <section class="page-stack daily-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <el-alert v-if="!canUseDailyReport" title="无日报填写权限" description="当前账号不是员工（employee），不能创建或编辑个人日报。" type="error" show-icon :closable="false" />

    <!-- 主表单面板 -->
    <section v-else class="panel daily-form-panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <strong class="toolbar-title">日报信息</strong>
          <span v-if="isBackfill" class="status-badge status-badge--draft">补填</span>
          <span v-else class="toolbar-subtitle">默认填写业务当天</span>
        </div>
        <div class="toolbar-actions">
          <el-button
            v-if="savedReport"
            :loading="exporting"
            @click="downloadReportExcel"
          >
            导出 Excel
          </el-button>
          <el-button
            v-if="savedReport"
            @click="props.navigate('/daily-reports')"
          >
            返回列表
          </el-button>
        </div>
      </div>

      <el-form class="daily-form" :model="form" @submit.prevent="saveDraft">
        <!-- 筛选栏 -->
        <div class="daily-filters">
          <div class="filter-group">
            <span class="filter-label">报告日期</span>
            <div class="input-wrapper">
              <el-date-picker v-model="form.reportDate" type="date" value-format="YYYY-MM-DD" placeholder="选择报告日期" />
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
                <el-input
                  ref="projectInput"
                  v-model="projectKeyword"
                  clearable
                  placeholder="搜索并选择项目"
                  @input="onInputSearch"
                  @clear="clearProjectSelection"
                  @focus="openDropdown"
                />
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
            <el-button @click="addItem">新增行</el-button>
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
                <el-select
                  v-model="item.sourceType"
                  :class="{ invalid: itemErrors[item.localId]?.sourceType }"
                  placeholder="请选择来源"
                  @change="onItemSourceTypeChange(item)"
                >
                  <el-option label="周计划" value="weekly_plan" />
                  <el-option label="新增" value="ad_hoc" />
                </el-select>
                <!-- 关联周计划 -->
                <el-select
                  v-model="item.sourcePlanTaskKey"
                  :disabled="item.sourceType !== 'weekly_plan'"
                  :class="{ invalid: itemErrors[item.localId]?.sourcePlanTaskKey }"
                  placeholder="请选择计划"
                  @change="applySelectedPlanToItem(item)"
                >
                  <el-option v-for="plan in planSuggestion.items" :key="plan.taskKey" :label="`${plan.plannedDate}｜${plan.workTarget}`" :value="plan.taskKey" />
                </el-select>
                <!-- 工作内容 -->
                <el-input
                  v-model="item.workContent"
                  type="textarea"
                  :class="{ invalid: itemErrors[item.localId]?.workContent }"
                />
                <!-- 执行状态 -->
                <el-select
                  v-model="item.executionStatus"
                  :class="{ invalid: itemErrors[item.localId]?.executionStatus }"
                  placeholder="请选择状态"
                  @change="onExecutionStatusChange(item)"
                >
                  <el-option label="已完成" value="completed" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="未完成" value="not_completed" />
                </el-select>
                <!-- 完成进度 -->
                <el-input
                  v-model="item.completionProgress"
                  placeholder="如 100%"
                  :class="{ invalid: itemErrors[item.localId]?.completionProgress }"
                />
                <!-- 完成时间 -->
                <el-time-picker
                  v-model="item.completedAt"
                  value-format="HH:mm"
                  format="HH:mm"
                  placeholder="完成时间"
                  :class="{ invalid: itemErrors[item.localId]?.completedAt }"
                />
                <!-- 负责人 -->
                <el-input v-model="item.responsiblePerson" />
                <!-- 偏差与纠偏 -->
                <el-input v-model="item.deviationAndCorrectiveAction" type="textarea" />
                <!-- 操作 -->
                <el-button link type="danger" :disabled="form.items.length === 1" @click="removeItem(index)">删除</el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- 进展照片 -->
        <section class="daily-section daily-attachments" @paste="handlePaste">
          <div class="daily-section__heading">
            <h3>进展照片</h3>
            <el-upload :show-file-list="false" accept="image/*" :disabled="uploading || saving" :http-request="uploadAttachment">
              <el-button :loading="uploading" :disabled="saving">上传照片</el-button>
            </el-upload>
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
                  <el-button link type="primary" @click="downloadAttachment(attachment)">下载</el-button>
                  <el-button link type="danger" @click="removeAttachment(attachment)">删除</el-button>
                </div>
              </li>
            </ul>
            <p v-else class="inline-muted">暂无照片。</p>
          </div>
          <p v-else class="inline-muted inline-hint">💡 选择项目后可直接上传照片，系统将自动保存草稿。</p>
        </section>

        <!-- 明日工作计划 -->
        <section class="daily-section">
          <div class="daily-section__heading">
            <h3>明日工作计划</h3>
            <el-button @click="addPlan">新增行</el-button>
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
                <el-input v-model="plan.plannedWorkContent" type="textarea" />
                <el-input v-model="plan.responsiblePerson" />
                <el-time-picker v-model="plan.plannedCompleteAt" value-format="HH:mm" format="HH:mm" placeholder="完成时间" />
                <el-input v-model="plan.collaboratingCenter" />
                <el-input v-model="plan.collaborationItem" type="textarea" />
                <el-button link type="danger" :disabled="form.plans.length === 1" @click="removePlan(index)">删除</el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- 消息提示 -->
        <el-alert v-if="message" :description="message" type="success" show-icon :closable="false" />
        <el-alert v-if="errorMessage" :description="errorMessage" type="error" show-icon :closable="false" />

        <!-- 底部操作按钮 -->
        <div class="form-actions">
          <el-button :loading="saving" @click="saveDraft">{{ isSavedSubmitted ? '保存修改' : '暂存草稿' }}</el-button>
          <el-button v-if="!isSavedSubmitted" type="primary" :loading="saving" @click="submitReport">正式提交</el-button>
        </div>
      </el-form>
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
const isSavedSubmitted = computed(() => savedReport.value?.status === ReportStatus.SUBMITTED);

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
  if (item.sourceType !== 'weekly_plan') {
    item.sourcePlanTaskKey = '';
  }
}

function applySelectedPlanToItem(item) {
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
  try {
    window.history.replaceState(null, '', '/daily-report');
  } catch (e) {}
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
  searchProjects(true);
}

function selectProject(project) {
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
  clearAllPlanTaskKeysForScopeChange();
  projectKeyword.value = '';
  form.projectId = '';
  showDropdown.value = false;
  searchProjects(true).then(() => {
    projectInput.value?.focus();
  });
}

function openDropdown() {
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
  form.items.push(createEmptyItem());
}
function removeItem(index) {
  if (form.items.length > 1) form.items.splice(index, 1);
}
function addPlan() {
  form.plans.push(createEmptyPlan());
}
function removePlan(index) {
  if (form.plans.length > 1) form.plans.splice(index, 1);
}

// 保存报告（草稿或提交）
async function saveReport(status) {
  saving.value = true;
  message.value = '';
  errorMessage.value = '';
  itemErrors.value = {};

  try {
    const wasSubmitted = isSavedSubmitted.value;
    if (status === ReportStatus.SUBMITTED && !prepareSubmittedItems()) {
      saving.value = false;
      return;
    }
    const payload = buildPayload(status);
    const result = savedReport.value
      ? await updateDailyReport(savedReport.value.id, payload, props.authToken)
      : await createDailyReport(payload, props.authToken);
    
    if (status === ReportStatus.SUBMITTED && !wasSubmitted) {
      resetForm();
      message.value = '日报已正式提交，表单已清空，可继续填写新的日报。';
    } else {
      hydrateForm(result.report);
      message.value = wasSubmitted ? '日报修改已保存。' : '草稿已保存。';
    }

    if (!props.reportId && result.report?.id && status === ReportStatus.DRAFT) {
      try {
        const newUrl = `/daily-report/${result.report.id}`;
        window.history.replaceState(null, '', newUrl);
      } catch (e) {}
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

// el-upload 只负责选择文件，实际上传继续复用现有鉴权 API。
async function uploadAttachment({ file }) {
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

// 删除附件
async function removeAttachment(attachment) {
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

// 导出 Excel
async function downloadReportExcel() {
  if (!savedReport.value) return;
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
