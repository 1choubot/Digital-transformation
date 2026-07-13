<template>
  <section class="page-stack center-daily-report-page animate-fadeIn">
    <!-- 无权限警告 -->
    <el-alert v-if="!canUseCenterDailyReport" title="无权访问中心日报" description="当前账号不能查看中心日报。" type="error" show-icon :closable="false" />

    <template v-else>
      <!-- 筛选面板（含导出按钮） -->
      <section class="panel filter-panel">
        <div class="panel-body">
          <div class="filter-grid">
            <!-- 报告日期 -->
            <div class="filter-group">
              <span class="filter-label">报告日期</span>
              <div class="input-wrapper">
                <el-date-picker v-model="filters.date" type="date" value-format="YYYY-MM-DD" placeholder="选择报告日期" />
              </div>
            </div>
            <!-- 中心 -->
            <div class="filter-group">
              <span class="filter-label">中心</span>
              <div class="input-wrapper">
                <el-select v-model="filters.department" :disabled="isCenterManager">
                  <el-option v-for="department in departments" :key="department" :label="formatBusinessDepartment(department)" :value="department" />
                </el-select>
              </div>
            </div>
            <!-- 查询按钮（紧挨着中心） -->
            <div class="filter-query">
              <el-button type="primary" :loading="loading" @click="loadReport">查询</el-button>
            </div>
            <!-- 导出按钮（靠右） -->
            <div class="filter-export">
              <el-button
                type="primary"
                :loading="exporting"
                :disabled="loading"
                @click="handleExport"
              >
                导出中心日报
              </el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- 错误信息 -->
      <el-alert v-if="errorMessage" title="中心日报加载失败" :description="errorMessage" type="error" show-icon :closable="false" />

      <!-- 加载状态 -->
      <el-skeleton v-if="loading" :rows="8" animated />

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
const exporting = ref(false);
const savingSchedule = ref(false);
const errorMessage = ref('');
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

function saveBlobDownload({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `center-daily-report-${filters.date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  if (!filters.department) return;
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
  savingSchedule.value = true;
  errorMessage.value = '';
  try {
    const result = await saveCenterDailyReportSchedule(
      { department: filters.department, isEnabled: schedule.isEnabled, generateTime: schedule.generateTime },
      props.authToken
    );
    schedule.isEnabled = result.schedule.isEnabled;
    schedule.generateTime = result.schedule.generateTime || '18:00';
  } catch (error) {
    handleApiError(error);
  } finally {
    savingSchedule.value = false;
  }
}

async function handleExport() {
  exporting.value = true;
  errorMessage.value = '';
  try {
    const download = await exportCenterDailyReport(
      { date: filters.date, department: filters.department },
      props.authToken
    );
    saveBlobDownload(download);
  } catch (error) {
    handleApiError(error);
  } finally {
    exporting.value = false;
  }
}

watch(
  () => filters.department,
  () => {
    if (canUseCenterDailyReport.value) void loadReport();
  }
);

onMounted(async () => {
  if (!canUseCenterDailyReport.value) return;
  try {
    await loadDepartments();
    await loadReport();
  } catch (error) {
    handleApiError(error);
  }
});
</script>
