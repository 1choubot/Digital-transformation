<template>
  <section class="page-stack weekly-report-page animate-fadeIn">

    <!-- 筛选栏 -->
    <section class="panel overview-filter-panel">
      <div class="panel-toolbar">
        <el-form class="weekly-overview-filters" @submit.prevent="loadOverview">
          <div class="weekly-date-grid">
            <div class="filter-group">
              <span class="filter-label">开始日期</span>
              <div class="input-wrapper">
                <el-date-picker
                  v-model="overviewFilters.weekStart"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="开始日期"
                />
              </div>
            </div>
            <div class="filter-group">
              <span class="filter-label">结束日期</span>
              <div class="input-wrapper">
                <el-date-picker
                  v-model="overviewFilters.weekEnd"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="结束日期"
                />
              </div>
            </div>
          </div>
          <div v-if="canReadAllCenters" class="filter-group">
            <span class="filter-label">中心</span>
            <el-select v-model="overviewFilters.department" placeholder="全部中心">
              <el-option label="全部中心" value="" />
              <el-option label="运营中心" value="operations_center" />
              <el-option label="营销中心" value="marketing_center" />
              <el-option label="制造中心" value="manufacturing_center" />
              <el-option label="研发中心" value="rd_center" />
            </el-select>
          </div>
          <el-button type="primary" native-type="submit" :loading="overviewLoading">查询</el-button>
        </el-form>
      </div>
    </section>

    <!-- 错误 / 加载 / 空状态 / 表格 -->
    <section class="panel overview-result-panel">
      <el-alert v-if="overviewError" title="中心周报加载失败" :description="overviewError" type="error" show-icon :closable="false" />

      <el-skeleton v-if="overviewLoading" :rows="5" animated />

      <el-empty v-else-if="overviewRows.length === 0" description="暂无考评记录。" />

      <div v-else class="table-container">
        <div class="weekly-overview-table">
          <div class="weekly-overview-table__head">
            <span>员工</span>
            <span>中心</span>
            <span>状态</span>
            <span>最终评分</span>
            <span>参考评分</span>
            <span>审批人</span>
            <span>操作</span>
          </div>
          <div v-for="row in overviewRows" :key="row.reportId" class="weekly-overview-table__row">
            <strong>{{ row.userName }}</strong>
            <span>{{ formatBusinessDepartment(row.department) }}</span>
            <el-tag :type="approvalStatusType(row.approvalStatus)">{{ approvalStatusLabel(row.approvalStatus) }}</el-tag>
            <span>{{ overviewFinalScoreText(row) }}</span>
            <span>{{ overviewReferenceScoreText(row) }}</span>
            <span>{{ row.approvalReviewedByName || '-' }}</span>
            <el-button type="primary" @click="navigate(`/weekly-report-review/${row.reportId}?from=overview`)">审核</el-button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { OrganizationRole, WeeklyApprovalStatus } from '../constants/reports.js';
import {
  listWeeklyComparisonOverview,
  toReadableApiError
} from '../api/weeklyReports.js';
import { formatBusinessDepartment } from '../utils/format.js';
import { getPreviousWeekPeriod, isNaturalWeekPeriod } from '../utils/weekPeriod.js';

const props = defineProps({
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  navigate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['auth-expired']);

const overviewLoading = ref(false);
const overviewRows = ref([]);
const overviewError = ref('');
const defaultPeriod = getPreviousWeekPeriod();
const overviewFilters = reactive({
  weekStart: defaultPeriod.weekStart,
  weekEnd: defaultPeriod.weekEnd,
  department: ''
});

const canReadAllCenters = computed(() =>
  [
    OrganizationRole.GENERAL_MANAGER,
    OrganizationRole.GENERAL_MANAGER_ASSISTANT
  ].includes(props.currentUser.organizationRole)
);

// Weekly overview rows surface approval progress for center-manager review.
function approvalStatusLabel(status) {
  const labels = {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: '未提交',
    [WeeklyApprovalStatus.PENDING]: '审批中',
    [WeeklyApprovalStatus.APPROVED]: '审批通过',
    [WeeklyApprovalStatus.RETURNED]: '已打回'
  };
  return labels[status] || labels[WeeklyApprovalStatus.NOT_SUBMITTED];
}

// Approval badge classes mirror the employee-facing weekly list.
function approvalStatusType(status) {
  return {
    [WeeklyApprovalStatus.NOT_SUBMITTED]: 'info',
    [WeeklyApprovalStatus.PENDING]: 'warning',
    [WeeklyApprovalStatus.APPROVED]: 'success',
    [WeeklyApprovalStatus.RETURNED]: 'danger'
  }[status] || 'info';
}

function sourceLabel(source) {
  if (source === 'ai') return 'AI';
  if (source === 'fallback_rule') return '规则降级';
  return '未评估';
}

function overviewFinalScoreText(row) {
  if (row.finalScore === null || row.finalScore === undefined) {
    return '待最终评分';
  }
  return String(row.finalScore);
}

function overviewReferenceScoreText(row) {
  if (row.totalScore === null || row.totalScore === undefined) {
    return sourceLabel(row.evaluationSource);
  }
  return `${row.totalScore}${row.grade ? ` / ${row.grade}` : ''}`;
}

async function loadOverview() {
  if (!props.currentUser) return;
  if (!overviewFilters.weekStart || !overviewFilters.weekEnd) {
    ElMessage.error('请选择开始日期和结束日期。');
    return;
  }
  if (!isNaturalWeekPeriod(overviewFilters.weekStart, overviewFilters.weekEnd)) {
    ElMessage.error('周报周期必须是周一至同周周日。');
    return;
  }

  overviewLoading.value = true;
  overviewError.value = '';

  try {
    const filters = {
      weekStart: overviewFilters.weekStart,
      weekEnd: overviewFilters.weekEnd,
      department: canReadAllCenters.value ? overviewFilters.department : props.currentUser.department
    };
    const result = await listWeeklyComparisonOverview(filters, props.authToken);
    overviewRows.value = result.reports || [];
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired');
      return;
    }
    overviewError.value = toReadableApiError(error);
  } finally {
    overviewLoading.value = false;
  }
}

onMounted(() => {
  loadOverview();
});
</script>
