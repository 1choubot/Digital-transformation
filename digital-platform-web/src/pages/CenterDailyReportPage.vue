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

      <section v-if="errorMessage" class="state-panel state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <section v-if="loading" class="state-panel">
        <p>正在加载中心日报...</p>
      </section>

      <section v-else-if="report" class="report-preview">
        <div class="summary-grid">
          <div>
            <span>中心</span>
            <strong>{{ formatBusinessDepartment(report.department) }}</strong>
          </div>
          <div>
            <span>日期</span>
            <strong>{{ report.reportDate }}</strong>
          </div>
          <div>
            <span>员工数</span>
            <strong>{{ report.totals.employeeCount }}</strong>
          </div>
          <div>
            <span>今日完成</span>
            <strong>{{ report.totals.completedItemCount }}</strong>
          </div>
        </div>

        <section v-if="report.employees.length === 0" class="state-panel">
          <p>暂无已提交日报</p>
        </section>

        <article v-for="employee in report.employees" v-else :key="employee.userId" class="employee-report-card">
          <header>
            <h3>{{ employee.name }}</h3>
            <span>{{ employee.account }}</span>
          </header>

          <div class="three-column-report">
            <section>
              <h4>昨日工作计划</h4>
              <ul v-if="employee.previousPlans.length">
                <li v-for="(item, index) in employee.previousPlans" :key="`previous-${index}`">
                  <strong>{{ item.projectLabel }}</strong>
                  <span>{{ item.workContent }}</span>
                </li>
              </ul>
              <p v-else>暂无昨日工作计划</p>
            </section>
            <section>
              <h4>今日工作完成情况</h4>
              <ul v-if="employee.completedItems.length">
                <li v-for="(item, index) in employee.completedItems" :key="`completed-${index}`">
                  <strong>{{ item.projectLabel }}</strong>
                  <span>{{ item.workContent }}</span>
                  <em>{{ item.completionProgress }}</em>
                </li>
              </ul>
              <p v-else>暂无已提交日报</p>
            </section>
            <section>
              <h4>明日工作计划</h4>
              <ul v-if="employee.tomorrowPlans.length">
                <li v-for="(item, index) in employee.tomorrowPlans" :key="`tomorrow-${index}`">
                  <strong>{{ item.projectLabel }}</strong>
                  <span>{{ item.workContent }}</span>
                </li>
              </ul>
              <p v-else>暂无明日工作计划</p>
            </section>
          </div>
        </article>
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

// Keep date inputs deterministic for the browser's local date picker.
function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Trigger a browser download for the exported Excel blob.
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

// API errors are mapped into a compact page-level message.
function handleApiError(error) {
  if (error?.code === 'UNAUTHENTICATED') {
    emit('auth-expired');
    return;
  }

  errorMessage.value = toReadableApiError(error);
}

// Load available centers, then initialize the selected center for scoped users.
async function loadDepartments() {
  const result = await listCenterDailyReportDepartments(props.authToken);
  departments.value = result.departments || [];
  if (!filters.department && departments.value.length > 0) {
    filters.department = departments.value[0];
  }
}

// Load one center's current automatic export schedule.
async function loadSchedule() {
  if (!filters.department) {
    return;
  }

  const result = await getCenterDailyReportSchedule(filters.department, props.authToken);
  schedule.isEnabled = result.schedule.isEnabled;
  schedule.generateTime = result.schedule.generateTime || '18:00';
}

// Load the center daily report preview for the selected date and department.
async function loadReport() {
  if (!canUseCenterDailyReport.value || !filters.department) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getCenterDailyReport({ date: filters.date, department: filters.department }, props.authToken);
    report.value = result.report;
    await loadSchedule();
  } catch (error) {
    handleApiError(error);
  } finally {
    loading.value = false;
  }
}

// Save the schedule only when the current role is permitted by the backend matrix.
async function handleSaveSchedule() {
  savingSchedule.value = true;
  errorMessage.value = '';
  try {
    const result = await saveCenterDailyReportSchedule(
      {
        department: filters.department,
        isEnabled: schedule.isEnabled,
        generateTime: schedule.generateTime
      },
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

// Export uses the same selected center/date as the preview.
async function handleExport() {
  exporting.value = true;
  errorMessage.value = '';
  try {
    const download = await exportCenterDailyReport(
      {
        date: filters.date,
        department: filters.department
      },
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
    if (canUseCenterDailyReport.value) {
      void loadReport();
    }
  }
);

onMounted(async () => {
  if (!canUseCenterDailyReport.value) {
    return;
  }

  try {
    await loadDepartments();
    await loadReport();
  } catch (error) {
    handleApiError(error);
  }
});
</script>
