<template>
  <section class="page-stack project-create-page">
    <PageHeader
      title="新建项目">
    </PageHeader>

    <el-alert v-if="!canCreateProject" title="无权创建项目" description="当前账号无权创建项目。项目创建仅开放给总经理和中心负责人。" type="error" show-icon :closable="false">
      <!-- <template #default><el-button type="primary" size="small" @click="navigate('/projects')">返回项目总览</el-button></template> -->
    </el-alert>

    <el-form v-else class="panel form-grid" :model="form" @submit.prevent="submitProject">
      <label>
        <span>项目名称</span>
        <el-input v-model.trim="form.projectName" autocomplete="off" />
      </label>
      <label>
        <span>客户</span>
        <el-input v-model.trim="form.customerName" autocomplete="off" />
      </label>
      <label>
        <span>客户联系人</span>
        <el-input v-model.trim="form.customerContactPerson" autocomplete="off" />
      </label>
      <label>
        <span>客户联系方式</span>
        <el-input v-model.trim="form.customerContact" autocomplete="off" />
      </label>
      <label>
        <span>商务负责人</span>
        <el-select v-model="form.businessResponsibleUserId" :loading="responsibilityCandidatesLoading" placeholder="请选择营销中心人员">
          <el-option v-for="user in businessResponsibleCandidates" :key="user.id" :label="formatCandidate(user)" :value="String(user.id)" />
        </el-select>
      </label>
      <label>
        <span>技术负责人</span>
        <el-select v-model="form.technicalResponsibleUserId" :loading="responsibilityCandidatesLoading" placeholder="请选择研发中心人员">
          <el-option v-for="user in technicalResponsibleCandidates" :key="user.id" :label="formatCandidate(user)" :value="String(user.id)" />
        </el-select>
      </label>

      <el-alert v-if="responsibilityCandidatesErrorMessage" class="form-grid__wide" :description="responsibilityCandidatesErrorMessage" type="error" show-icon :closable="false" />

      <div class="form-actions form-grid__wide project-create-actions">
        <el-button size="large" @click="navigate('/projects')">取消</el-button>
        <el-button type="primary" native-type="submit" size="large" :loading="submitting" :disabled="!canCreateProject">创建项目</el-button>
      </div>
    </el-form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
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
    ElMessage.error(`请补充：${missing.join('、')}`);
    return false;
  }

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
  if (!canCreateProject.value) {
    ElMessage.error('当前账号无权创建项目。');
    return;
  }

  if (!props.authToken) {
    const message = '请先登录后再创建项目。';
    emit('auth-expired', message);
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
    ElMessage.success('项目创建成功。');
    props.navigate(`/projects/${created.project.id}`);
  } catch (error) {
    const message =
      error.code === 'FORBIDDEN_OPERATION' ? '当前账号无权创建项目。' : toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', message);
    } else {
      ElMessage.error(message);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadResponsibilityCandidates);
</script>
