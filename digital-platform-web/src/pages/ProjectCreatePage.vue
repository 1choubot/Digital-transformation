<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">项目主数据</span>
        <h2>新建项目</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目总览</button>
    </div>

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
        <span>客户联系方式</span>
        <input v-model.trim="form.customerContact" type="text" autocomplete="off" />
      </label>

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
import { computed, reactive, ref } from 'vue';
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
  projectName: '',
  customerName: '',
  customerContact: ''
});

const submitting = ref(false);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);

function validateForm() {
  const missing = [];
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.customerContact) missing.push('客户联系方式');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
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
    const created = await createProject({ ...form }, props.authToken);
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
</script>
