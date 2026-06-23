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

    <form class="panel form-grid" @submit.prevent="submitProject">
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
        <span>项目经理</span>
        <input v-model.trim="form.projectManager" type="text" autocomplete="off" />
      </label>
      <label>
        <span>参与部门</span>
        <input v-model.trim="departmentsText" type="text" placeholder="研发中心、制造中心" />
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

      <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide">
        <p>{{ successMessage }}</p>
      </div>

      <div class="form-actions form-grid__wide">
        <button type="button" class="ghost-button" @click="navigate('/projects')">取消</button>
        <button type="submit" class="primary-button" :disabled="submitting">
          {{ submitting ? '正在创建...' : '创建项目' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { createProject, toReadableApiError } from '../api/projects.js';
import { formatUser } from '../utils/format.js';

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
  projectManager: '',
  plannedStartDate: '',
  plannedEndDate: '',
  remark: ''
});

const departmentsText = ref('');
const submitting = ref(false);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');

function validateForm() {
  const missing = [];
  if (!form.projectCode) missing.push('项目编号');
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.projectManager) missing.push('项目经理');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
}

function parseDepartments() {
  return departmentsText.value
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function submitProject() {
  serverError.value = '';
  successMessage.value = '';

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
      participatingDepartments: parseDepartments()
    }, props.authToken);
    successMessage.value = '项目创建成功。';
    props.navigate(`/projects/${created.project.id}`);
  } catch (error) {
    serverError.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', serverError.value);
    }
  } finally {
    submitting.value = false;
  }
}
</script>
