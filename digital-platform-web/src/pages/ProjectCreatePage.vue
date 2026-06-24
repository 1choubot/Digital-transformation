<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">项目主数据</span>
        <h2>新建项目</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">返回列表</button>
    </div>

    <section v-if="!canCreateProject" class="state-panel state-panel--error">
      <h3>无权创建项目</h3>
      <p>当前账号无权创建项目。项目创建仅开放给总经理和中心负责人。</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目列表</button>
    </section>

    <form v-else class="panel form-grid" @submit.prevent="submitProject">
      <label>
        <span>项目编号</span>
        <input v-model.trim="form.projectCode" type="text" autocomplete="off" />
      </label>
      <label>
        <span>项目名称</span>
        <input v-model.trim="form.projectName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户</span>
        <input v-model.trim="form.customerName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>项目模式</span>
        <select v-model="form.projectMode">
          <option value="self_developed">自研模式</option>
          <option value="outsourced">供应链/外包模式</option>
        </select>
      </label>
      <label>
        <span>项目经理</span>
        <select v-model="form.projectManagerUserId" :disabled="managerCandidatesLoading">
          <option value="">{{ managerCandidatesLoading ? '正在加载候选用户' : '请选择项目经理' }}</option>
          <option v-for="user in managerCandidates" :key="user.id" :value="String(user.id)">
            {{ formatManagerCandidate(user) }}
          </option>
        </select>
      </label>
      <label>
        <span>参与部门</span>
        <div class="department-checkbox-group">
          <label
            v-for="department in departmentOptions"
            :key="department.value"
            class="department-checkbox"
          >
            <input v-model="form.participatingDepartments" type="checkbox" :value="department.value" />
            <span>{{ department.label }}</span>
          </label>
        </div>
      </label>
      <label>
        <span>计划开始时间</span>
        <input v-model="form.plannedStartDate" type="date" />
      </label>
      <label>
        <span>计划完成时间</span>
        <input v-model="form.plannedEndDate" type="date" />
      </label>
      <label class="form-grid__wide">
        <span>备注</span>
        <textarea v-model.trim="form.remark" rows="4"></textarea>
      </label>

      <div v-if="clientError || serverError" class="state-panel state-panel--error form-grid__wide">
        <p>{{ clientError || serverError }}</p>
      </div>

      <div v-if="managerCandidatesError" class="state-panel state-panel--error form-grid__wide">
        <p>{{ managerCandidatesError }}</p>
      </div>

      <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide">
        <p>{{ successMessage }}</p>
      </div>

      <div class="form-actions form-grid__wide">
        <button type="button" class="ghost-button" @click="navigate('/projects')">取消</button>
        <button type="submit" class="primary-button" :disabled="submitting || !canCreateProject">
          {{ submitting ? '正在创建...' : '创建项目' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { createProject, toReadableApiError } from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import {
  formatBusinessUser,
  formatUser
} from '../utils/format.js';

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

const form = reactive({
  projectCode: '',
  projectName: '',
  customerName: '',
  projectMode: 'self_developed',
  projectManagerUserId: '',
  participatingDepartments: [],
  plannedStartDate: '',
  plannedEndDate: '',
  remark: ''
});

const submitting = ref(false);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');
const managerCandidates = ref([]);
const managerCandidatesLoading = ref(false);
const managerCandidatesError = ref('');
const departmentOptions = [
  { value: 'operations_center', label: '运营中心' },
  { value: 'marketing_center', label: '营销中心' },
  { value: 'manufacturing_center', label: '制造中心' },
  { value: 'rd_center', label: '研发中心' }
];
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);

function formatManagerCandidate(user) {
  return [formatBusinessUser(user), user.account ? `账号 ${user.account}` : '']
    .filter(Boolean)
    .join(' / ');
}

function validateForm() {
  const missing = [];
  if (!form.projectCode) missing.push('项目编号');
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.projectManagerUserId) missing.push('项目经理');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
}

async function loadManagerCandidates() {
  if (!canCreateProject.value) {
    managerCandidates.value = [];
    return;
  }

  managerCandidatesLoading.value = true;
  managerCandidatesError.value = '';

  try {
    managerCandidates.value = await listResponsibilityCandidates(props.authToken);
  } catch (error) {
    managerCandidatesError.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', managerCandidatesError.value);
    }
  } finally {
    managerCandidatesLoading.value = false;
  }
}

async function submitProject() {
  serverError.value = '';
  successMessage.value = '';

  if (!canCreateProject.value) {
    serverError.value = '当前账号无权创建项目。';
    return;
  }

  if (!props.authToken) {
    serverError.value = '请先登录后再创建项目。';
    emit('auth-expired', serverError.value);
    return;
  }

  if (!validateForm()) {
    return;
  }

  submitting.value = true;

  try {
    const created = await createProject({
      ...form,
      participatingDepartments: [...form.participatingDepartments]
    }, props.authToken);
    successMessage.value = '项目创建成功。';
    props.navigate(`/projects/${created.project.id}`);
  } catch (error) {
    serverError.value =
      error.code === 'FORBIDDEN_OPERATION' ? '当前账号无权创建项目。' : toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', serverError.value);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadManagerCandidates);
</script>
