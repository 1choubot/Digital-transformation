<template>
  <section class="page-stack center-daily-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <section v-if="!canUseCenterDailyReport" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>无权访问中心日报</h3>
      <p>当前账号不能查看中心日报。</p>
    </section>

    <template v-else>
      <!-- 筛选面板 -->
      <section class="panel filter-panel">
        <div class="panel-body">
          <div class="filter-grid">
            <!-- 报告日期 -->
            <div class="filter-group">
              <span class="filter-label">报告日期</span>
              <div class="input-wrapper">
                <input v-model="filters.date" type="date" />
              </div>
            </div>
            <!-- 中心 -->
            <div class="filter-group">
              <span class="filter-label">中心</span>
              <div class="input-wrapper">
                <select v-model="filters.department" :disabled="isCenterManager">
                  <option v-for="department in departments" :key="department" :value="department">
                    {{ formatBusinessDepartment(department) }}
                  </option>
                </select>
              </div>
            </div>
            <!-- 查询按钮（紧挨着中心） -->
            <div class="filter-query">
              <button type="button" class="primary-button" :disabled="loading" @click="loadReport">
                查询
              </button>
            </div>
            <div class="filter-export">
              <button
                type="button"
                class="ghost-button"
                :disabled="loading || exporting"
                @click="handleExport"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {{ exporting ? '导出中...' : '导出中心日报' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="canManageSchedule" class="panel schedule-panel">
        <div class="panel-body schedule-panel__body">
          <div class="schedule-summary">
            <span class="filter-label">中心日报计划</span>
            <p>用于启用或关闭当前中心的后端受控计划检查。</p>
          </div>
          <label class="schedule-toggle">
            <input v-model="schedule.isEnabled" type="checkbox" />
            <span>启用计划检查</span>
          </label>
          <div class="filter-group schedule-time">
            <span class="filter-label">检查时间</span>
            <div class="input-wrapper">
              <input v-model="schedule.generateTime" type="time" />
            </div>
          </div>
          <button type="button" class="primary-button" :disabled="savingSchedule" @click="handleSaveSchedule">
            {{ savingSchedule ? '保存中...' : '保存计划' }}
          </button>
        </div>
        <p v-if="scheduleMessage" class="schedule-message">{{ scheduleMessage }}</p>
      </section>

      <!-- 错误信息 -->
      <section v-if="errorMessage" class="state-panel state-panel--error panel state-panel--compact">
        <p>{{ errorMessage }}</p>
      </section>

      <!-- 加载状态 -->
      <section v-if="loading" class="state-panel panel">
        <div class="loading-spinner"></div>
        <p>正在加载中心日报...</p>
      </section>

      <!-- 日报内容 -->
      <section v-else-if="report" class="panel report-content-panel">
        <!-- 报告头部信息 -->
        <div class="report-header-info">
          <span class="report-meta">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            部门：{{ formatBusinessDepartment(report.department) }}
          </span>
          <span class="report-meta">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            报告时间：{{ dottedDate(report.reportDate) }}
          </span>
        </div>

        <!-- 一、昨日工作计划 -->
        <div class="section-block section-yesterday">
          <div class="section-banner section-banner--yellow">
            <span class="banner-number">一</span>
            昨日工作计划
          </div>
          <div class="table-wrapper">
            <table class="center-report-table" v-if="yesterdayGroups.length">
              <thead>
                <tr>
                  <th class="col-seq">序号</th>
                  <th class="col-project">项目</th>
                  <th class="col-content">工作内容</th>
                  <th class="col-person">责任人</th>
                  <th class="col-collab-dept">协同部门</th>
                  <th class="col-collab-item">协同事项</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(project, pIdx) in yesterdayGroups" :key="`y-p-${project.projectId}-${pIdx}`">
                  <template v-for="(item, iIdx) in project.items" :key="`y-${pIdx}-${iIdx}`">
                    <tr>
                      <td v-if="iIdx === 0" class="col-seq" :rowspan="project.items.length">{{ pIdx + 1 }}</td>
                      <td v-if="iIdx === 0" class="col-project" :rowspan="project.items.length">{{ project.projectLabel }}</td>
                      <td class="col-content">{{ item.workContent || '' }}</td>
                      <td class="col-person">{{ item.responsiblePerson || item.personName || '' }}</td>
                      <td class="col-collab-dept">{{ item.collaboratingCenter || '' }}</td>
                      <td class="col-collab-item">{{ item.collaborationItem || '' }}</td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
            <p v-else class="empty-section-note">暂无昨日工作计划数据</p>
          </div>
        </div>

        <!-- 二、今日工作完成情况 -->
        <div class="section-block section-today">
          <div class="section-banner section-banner--green">
            <span class="banner-number">二</span>
            今日工作完成情况
          </div>
          <div class="table-wrapper">
            <table class="center-report-table" v-if="todayGroups.length">
              <thead>
                <tr>
                  <th class="col-seq">序号</th>
                  <th class="col-project">项目</th>
                  <th class="col-content">工作内容</th>
                  <th class="col-progress">完成进度</th>
                  <th class="col-person">责任人</th>
                  <th class="col-deviation">偏差分析及纠偏措施</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(project, pIdx) in todayGroups" :key="`t-p-${project.projectId}-${pIdx}`">
                  <template v-for="(item, iIdx) in project.items" :key="`t-${pIdx}-${iIdx}`">
                    <tr>
                      <td v-if="iIdx === 0" class="col-seq" :rowspan="project.items.length">{{ pIdx + 1 }}</td>
                      <td v-if="iIdx === 0" class="col-project" :rowspan="project.items.length">{{ project.projectLabel }}</td>
                      <td class="col-content">{{ item.workContent || '' }}</td>
                      <td class="col-progress">{{ formatProgress(item.completionProgress) }}</td>
                      <td class="col-person">{{ item.responsiblePerson || item.personName || '' }}</td>
                      <td class="col-deviation">{{ item.deviationAndCorrectiveAction || '' }}</td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
            <p v-else class="empty-section-note">暂无今日工作完成数据</p>
          </div>
        </div>

        <!-- 三、明日工作计划 -->
        <div class="section-block section-tomorrow">
          <div class="section-banner section-banner--red">
            <span class="banner-number">三</span>
            明日工作计划
          </div>
          <div class="table-wrapper">
            <table class="center-report-table" v-if="tomorrowGroups.length">
              <thead>
                <tr>
                  <th class="col-seq">序号</th>
                  <th class="col-project">项目</th>
                  <th class="col-content">工作内容</th>
                  <th class="col-person">责任人</th>
                  <th class="col-collab-dept">协同部门</th>
                  <th class="col-collab-item">协同事项</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(project, pIdx) in tomorrowGroups" :key="`m-p-${project.projectId}-${pIdx}`">
                  <template v-for="(item, iIdx) in project.items" :key="`m-${pIdx}-${iIdx}`">
                    <tr>
                      <td v-if="iIdx === 0" class="col-seq" :rowspan="project.items.length">{{ pIdx + 1 }}</td>
                      <td v-if="iIdx === 0" class="col-project" :rowspan="project.items.length">{{ project.projectLabel }}</td>
                      <td class="col-content">{{ item.workContent || '' }}</td>
                      <td class="col-person">{{ item.responsiblePerson || item.personName || '' }}</td>
                      <td class="col-collab-dept">{{ item.collaboratingCenter || '' }}</td>
                      <td class="col-collab-item">{{ item.collaborationItem || '' }}</td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
            <p v-else class="empty-section-note">暂无明日工作计划数据</p>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  exportCenterDailyReport,
  getCenterDailyReport,
  getCenterDailyReportSchedule,
  listCenterDailyReportDepartments,
  saveCenterDailyReportSchedule,
  toReadableApiError
} from '../api/centerDailyReports.js';
import { OrganizationRole } from '../constants/reports.js';
import {
  formatBusinessDepartment,
  formatOrganizationRole
} from '../utils/format.js';

const props = defineProps({
  authToken: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

const departments = ref([]);
const report = ref(null);
const loading = ref(false);
const savingSchedule = ref(false);
const exporting = ref(false);
const errorMessage = ref('');
const scheduleMessage = ref('');
const filters = reactive({
  date: todayIsoDate(),
  department: props.currentUser.department || ''
});
const schedule = reactive({
  isEnabled: true,
  generateTime: '18:00'
});

const canUseCenterDailyReport = computed(() =>
  [
    OrganizationRole.CENTER_MANAGER,
    OrganizationRole.GENERAL_MANAGER,
    OrganizationRole.GENERAL_MANAGER_ASSISTANT,
    OrganizationRole.SYSTEM_ADMIN
  ].includes(props.currentUser.organizationRole)
);
const isCenterManager = computed(() => props.currentUser.organizationRole === OrganizationRole.CENTER_MANAGER);
const canManageSchedule = computed(
  () =>
    (isCenterManager.value && filters.department === props.currentUser.department) ||
    (props.currentUser.organizationRole === OrganizationRole.SYSTEM_ADMIN && props.currentUser.isPlatformAdmin)
);

// ── Data transformation: person-first → project-first grouping ──

function flattenWithPerson(employees, sectionKey) {
  return employees.flatMap(emp =>
    emp[sectionKey].map(item => ({ ...item, personName: emp.name }))
  );
}

function groupByProject(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.projectId ?? `unknown-${item.projectLabel}`;
    if (!map.has(key)) {
      map.set(key, { projectId: item.projectId, projectLabel: item.projectLabel, items: [] });
    }
    map.get(key).items.push(item);
  }
  return [...map.values()];
}

const yesterdayGroups = computed(() =>
  report.value ? groupByProject(flattenWithPerson(report.value.employees, 'previousPlans')) : []
);
const todayGroups = computed(() =>
  report.value ? groupByProject(flattenWithPerson(report.value.employees, 'completedItems')) : []
);
const tomorrowGroups = computed(() =>
  report.value ? groupByProject(flattenWithPerson(report.value.employees, 'tomorrowPlans')) : []
);

// ── Helpers ──

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dottedDate(iso) {
  return String(iso || '').replaceAll('-', '.') || '';
}

function formatProgress(value) {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num >= 1 ? '100%' : `${Math.round(num * 100)}%`;
}

function handleApiError(error) {
  if (error?.code === 'UNAUTHENTICATED') {
    emit('auth-expired');
    return;
  }
  errorMessage.value = toReadableApiError(error);
}

async function loadDepartments() {
  const result = await listCenterDailyReportDepartments(props.authToken);
  departments.value = result.departments || [];
  if (!filters.department && departments.value.length > 0) {
    filters.department = departments.value[0];
  }
}

async function loadSchedule() {
  if (!canManageSchedule.value || !filters.department) return;
  const result = await getCenterDailyReportSchedule(filters.department, props.authToken);
  schedule.isEnabled = result.schedule.isEnabled;
  schedule.generateTime = result.schedule.generateTime || '18:00';
}

async function loadReport() {
  if (!canUseCenterDailyReport.value || !filters.department) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getCenterDailyReport({ date: filters.date, department: filters.department }, props.authToken);
    report.value = result.report;
  } catch (error) {
    handleApiError(error);
  } finally {
    loading.value = false;
  }
}

async function handleSaveSchedule() {
  if (!canManageSchedule.value) return;
  savingSchedule.value = true;
  errorMessage.value = '';
  scheduleMessage.value = '';
  try {
    const result = await saveCenterDailyReportSchedule(
      { department: filters.department, isEnabled: schedule.isEnabled, generateTime: schedule.generateTime },
      props.authToken
    );
    schedule.isEnabled = result.schedule.isEnabled;
    schedule.generateTime = result.schedule.generateTime || '18:00';
    scheduleMessage.value = '计划已保存。';
  } catch (error) {
    handleApiError(error);
  } finally {
    savingSchedule.value = false;
  }
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

async function handleExport() {
  if (!canUseCenterDailyReport.value || !filters.department) return;
  exporting.value = true;
  errorMessage.value = '';

  try {
    const download = await exportCenterDailyReport(
      { date: filters.date, department: filters.department },
      props.authToken
    );
    saveBlob(download, `中心日报-${filters.department}-${filters.date}.xlsx`);
  } catch (error) {
    handleApiError(error);
  } finally {
    exporting.value = false;
  }
}

watch(
  () => filters.department,
  () => {
    if (!canUseCenterDailyReport.value) return;
    void (async () => {
      await loadReport();
      try {
        await loadSchedule();
      } catch (error) {
        handleApiError(error);
      }
    })();
  }
);

onMounted(async () => {
  if (!canUseCenterDailyReport.value) return;
  try {
    await loadDepartments();
    await loadReport();
    await loadSchedule();
  } catch (error) {
    handleApiError(error);
  }
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

/* ===== 按钮基础 ===== */
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
  height: 48px;          /* 与输入框等高 */
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
.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  height: 48px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #606266;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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
.btn-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  flex-shrink: 0;
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

/* ===== 筛选面板 ===== */
.filter-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.5rem;
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

/* 查询按钮（紧挨中心） */
.filter-query {
  display: flex;
  align-items: flex-end;
  padding-bottom: 0;   /* 与输入框底部对齐 */
}

.filter-export {
  display: flex;
  align-items: flex-end;
}

.schedule-panel__body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}

.schedule-summary {
  flex: 1 1 260px;
  min-width: 220px;
}

.schedule-summary p,
.schedule-message {
  margin: 0.35rem 0 0;
  color: #606266;
  font-size: 0.85rem;
  line-height: 1.5;
}

.schedule-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  color: #303133;
  font-size: 0.9rem;
  white-space: nowrap;
}

.schedule-toggle input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.schedule-time {
  min-width: 160px;
}

.schedule-message {
  padding: 0 1.5rem 1rem;
  color: #2f7d32;
}

/* ===== 报告内容面板 ===== */
.report-content-panel {
  padding: 1.5rem;
}

.report-header-info {
  display: flex;
  gap: 2rem;
  padding: 0.75rem 1rem;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  border: 1px solid #ebeef5;
}
.report-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #606266;
}
.meta-icon {
  width: 16px;
  height: 16px;
  stroke: #909399;
}

/* ===== 区块（昨日 / 今日 / 明日） ===== */
.section-block {
  margin-bottom: 2rem;
}
.section-block:last-child {
  margin-bottom: 0;
}

.section-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
.banner-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  font-weight: 700;
}
.section-banner--yellow {
  background: #fdf6ec;
  color: #b88230;
  border: 1px solid #faecd8;
}
.section-banner--green {
  background: #f0f9eb;
  color: #529b2e;
  border: 1px solid #e1f3d8;
}
.section-banner--red {
  background: #fef0f0;
  color: #c45656;
  border: 1px solid #fde2e2;
}

.table-wrapper {
  overflow-x: auto;
  width: 100%;
}

/* ===== 中心日报表格 ===== */
.center-report-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.center-report-table td,
.center-report-table th {
  word-break: break-word;
  overflow-wrap: break-word;
}
.center-report-table thead th {
  padding: 0.6rem 0.75rem;
  background: #fafafa;
  border-bottom: 2px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  text-align: left;
  white-space: nowrap;
}
.center-report-table tbody td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f0f0f2;
  vertical-align: middle;
  line-height: 1.5;
}
.center-report-table tbody tr:hover {
  background: #fdfdfe;
}

/* 列宽定义 */
.col-seq {
  width: 50px;
  text-align: center;
}
.col-project {
  width: 140px;
  font-weight: 500;
  color: #303133;
}
.col-content {
  width: 200px;
}
.col-person {
  width: 80px;
}
.col-progress {
  width: 70px;
  text-align: center;
}
.col-deviation {
  width: 130px;
}
.col-collab-dept {
  width: 80px;
}
.col-collab-item {
  width: 120px;
}

.empty-section-note {
  padding: 1.5rem;
  text-align: center;
  color: #909399;
  font-size: 0.85rem;
  background: #fafafa;
  border-radius: 4px;
  border: 1px dashed #dcdfe6;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
  }
  .filter-grid {
    flex-direction: column;
    align-items: stretch;
  }
  .schedule-panel__body {
    align-items: stretch;
  }
  .schedule-toggle {
    white-space: normal;
  }
  .report-header-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  .center-report-table {
    font-size: 0.8rem;
  }
}
</style>
