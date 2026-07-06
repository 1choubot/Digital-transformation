<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="项目主数据"
      title="新建项目"
      :current-user="currentUser"
      subtitle="新建项目完成后进入项目工作区，后续阶段、资料和节点产出在工作区处理。"
    >
      <template #actions>
        <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目总览</button>
      </template>
    </PageHeader>

    <section v-if="!canCreateProject" class="state-panel state-panel--error">
      <h3>无权创建项目</h3>
      <p>当前账号无权创建项目。项目创建仅开放给总经理和中心负责人。</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目总览</button>
    </section>

    <form v-else class="panel form-grid" @submit.prevent="submitProject">
      <label>
        <span>项目名称</span>
        <input v-model.trim="form.projectName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户</span>
        <input v-model.trim="form.customerName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户联系人</span>
        <input v-model.trim="form.customerContactPerson" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户联系方式</span>
        <input v-model.trim="form.customerContact" type="text" autocomplete="off" />
      </label>
      <label>
        <span>商务负责人</span>
        <select v-model="form.businessResponsibleUserId" :disabled="responsibilityCandidatesLoading">
          <option value="">请选择营销中心人员</option>
          <option v-for="user in businessResponsibleCandidates" :key="user.id" :value="String(user.id)">
            {{ formatCandidate(user) }}
          </option>
        </select>
      </label>
      <label>
        <span>技术负责人</span>
        <select v-model="form.technicalResponsibleUserId" :disabled="responsibilityCandidatesLoading">
          <option value="">请选择研发中心人员</option>
          <option v-for="user in technicalResponsibleCandidates" :key="user.id" :value="String(user.id)">
            {{ formatCandidate(user) }}
          </option>
        </select>
      </label>

      <div v-if="responsibilityCandidatesErrorMessage" class="state-panel state-panel--error form-grid__wide">
        <p>{{ responsibilityCandidatesErrorMessage }}</p>
      </div>

      <div v-if="clientError || serverError" class="state-panel state-panel--error form-grid__wide">
        <p>{{ clientError || serverError }}</p>
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
import PageHeader from '../components/PageHeader.vue';
import { formatBusinessDepartment } from '../utils/format.js';

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
  projectName: '',
  customerName: '',
  customerContactPerson: '',
  customerContact: '',
  businessResponsibleUserId: '',
  technicalResponsibleUserId: ''
});

const submitting = ref(false);
const responsibilityCandidatesLoading = ref(false);
const responsibilityCandidatesErrorMessage = ref('');
const responsibilityCandidates = ref([]);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);
const enabledCandidates = computed(() =>
  responsibilityCandidates.value.filter((candidate) => candidate.isEnabled !== false)
);
const businessResponsibleCandidates = computed(() =>
  enabledCandidates.value.filter((candidate) => candidate.department === 'marketing_center')
);
const technicalResponsibleCandidates = computed(() =>
  enabledCandidates.value.filter((candidate) => candidate.department === 'rd_center')
);

function validateForm() {
  const missing = [];
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.customerContactPerson) missing.push('客户联系人');
  if (!form.customerContact) missing.push('客户联系方式');
  if (!form.businessResponsibleUserId) missing.push('商务负责人');
  if (!form.technicalResponsibleUserId) missing.push('技术负责人');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
}

function formatCandidate(user) {
  const department = user.department ? formatBusinessDepartment(user.department) : '';
  const name = user.name || user.account || `用户 ${user.id}`;
  return department ? `${name} / ${department}` : name;
}

async function loadResponsibilityCandidates() {
  if (!props.authToken || !canCreateProject.value) {
    return;
  }

  responsibilityCandidatesLoading.value = true;
  responsibilityCandidatesErrorMessage.value = '';

  try {
    responsibilityCandidates.value = await listResponsibilityCandidates(props.authToken);
  } catch (error) {
    responsibilityCandidatesErrorMessage.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', responsibilityCandidatesErrorMessage.value);
    }
  } finally {
    responsibilityCandidatesLoading.value = false;
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
    const created = await createProject(
      {
        ...form,
        businessResponsibleUserId: Number(form.businessResponsibleUserId),
        technicalResponsibleUserId: Number(form.technicalResponsibleUserId)
      },
      props.authToken
    );
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

onMounted(loadResponsibilityCandidates);
</script>
