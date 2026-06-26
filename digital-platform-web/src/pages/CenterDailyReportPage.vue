<template>
  <section class="page-section">
    <div class="page-header">
      <div>
        <p class="page-eyebrow">中心日报</p>
        <h2>部门工作日报汇总</h2>
        <span class="page-user">{{ currentUser.name }} / {{ formatOrganizationRole(currentUser.organizationRole) }}</span>
      </div>
      <button type="button" class="primary-button" :disabled="loading || exporting" @click="handleExport">
        {{ exporting ? '正在导出...' : '导出中心日报' }}
      </button>
    </div>

    <section v-if="!canUseCenterDailyReport" class="state-panel state-panel--error">
      <h3>无权访问中心日报</h3>
      <p>当前账号不能查看中心日报。</p>
    </section>

    <template v-else>
      <section class="filter-panel">
        <label>
          报告日期
          <input v-model="filters.date" type="date" />
        </label>
        <label>
          中心
          <select v-model="filters.department" :disabled="isCenterManager">
            <option v-for="department in departments" :key="department" :value="department">
              {{ formatBusinessDepartment(department) }}
            </option>
          </select>
        </label>
        <button type="button" class="secondary-button" :disabled="loading" @click="loadReport">查询</button>
      </section>

      <!-- 已停用中心日报“每日固定时间自动留档 Excel”，暂不展示自动生成计划配置。
      <section class="form-card">
        <div class="section-title-row">
          <div>
            <h3>自动生成计划</h3>
            <p>生产默认每日 18:00 自动生成；中心负责人只能配置本中心。</p>
          </div>
          <button
            v-if="canManageSchedule"
            type="button"
            class="secondary-button"
            :disabled="savingSchedule"
            @click="handleSaveSchedule"
          >
            {{ savingSchedule ? '正在保存...' : '保存计划' }}
          </button>
        </div>
        <div class="form-grid">
          <label>
            是否启用
            <select v-model="schedule.isEnabled" :disabled="!canManageSchedule">
              <option :value="true">启用</option>
              <option :value="false">停用</option>
            </select>
          </label>
          <label>
            生成时间
            <input v-model="schedule.generateTime" type="time" :disabled="!canManageSchedule" />
          </label>
        </div>
      </section>
      -->

      <section v-if="errorMessage" class="state-panel state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <section v-if="loading" class="state-panel">
        <p>正在加载中心日报...</p>
      </section>

      <section v-else-if="report" class="center-report-layout">
        <!-- Header info row matching template row 2 -->
        <div class="report-header-info">
          <span>部门：{{ formatBusinessDepartment(report.department) }}</span>
          <span>报告时间：{{ dottedDate(report.reportDate) }}</span>
        </div>

        <!-- Section 1: 昨日工作计划 -->
        <div class="section-block section-yesterday">
          <div class="section-banner section-banner--yellow">一、昨日工作计划</div>
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

        <!-- Section 2: 今日工作完成情况 -->
        <div class="section-block section-today">
          <div class="section-banner section-banner--green">二、今日工作完成情况</div>
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

        <!-- Section 3: 明日工作计划 -->
        <div class="section-block section-tomorrow">
          <div class="section-banner section-banner--red">三、明日工作计划</div>
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

// Flatten all items from all employees, attaching personName for fallback display.
function flattenWithPerson(employees, sectionKey) {
  return employees.flatMap(emp =>
    emp[sectionKey].map(item => ({ ...item, personName: emp.name }))
  );
}

// Group flat items by project, preserving order of first appearance.
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
  // 1 = 100%, 0.5 = 50%, etc.
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
    // 已停用固定时间自动留档 Excel，因此查询中心日报时不再加载自动生成计划。
    // await loadSchedule();
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
