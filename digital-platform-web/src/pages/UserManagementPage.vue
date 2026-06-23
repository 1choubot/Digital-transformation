<template>
  <section class="page-stack">
    <div class="page-title-row">
      <div>
        <span class="section-eyebrow">基础用户管理</span>
        <h2>用户管理</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目列表</button>
    </div>

    <section v-if="!currentUser.isPlatformAdmin" class="state-panel state-panel--error">
      <h3>无权限访问</h3>
      <p>用户管理仅平台管理员可进入。该入口只保护用户管理本身，不代表项目、资料或文件权限。</p>
    </section>

    <template v-else>
      <section class="panel">
        <div class="panel-toolbar">
          <div>
            <strong>用户列表</strong>
            <span>展示数字化平台用户，不读取或同步文件管理平台用户。</span>
          </div>
          <button type="button" class="ghost-button" :disabled="loading" @click="loadUsers">
            {{ loading ? '加载中...' : '重新加载' }}
          </button>
        </div>

        <div v-if="loading" class="state-panel state-panel--inline">
          <p>正在加载用户列表...</p>
        </div>

        <div v-else-if="errorMessage" class="state-panel state-panel--error">
          <h3>用户列表加载失败</h3>
          <p>{{ errorMessage }}</p>
          <button type="button" class="primary-button" @click="loadUsers">重试</button>
        </div>

        <div v-else-if="users.length === 0" class="state-panel state-panel--inline">
          <h3>暂无用户</h3>
          <p>请先新增数字化平台用户。</p>
        </div>

        <div v-else class="user-table">
          <div class="user-table__head">
            <span>账号</span>
            <span>姓名</span>
            <span>部门</span>
            <span>角色</span>
            <span>状态</span>
            <span>平台管理员</span>
            <span>文件平台用户ID</span>
            <span>操作</span>
          </div>

          <article v-for="user in users" :key="user.id" class="user-table__row">
            <span class="mono">{{ user.account }}</span>
            <strong>{{ user.name }}</strong>
            <span>{{ user.department }}</span>
            <span>{{ user.role }}</span>
            <span>{{ user.isEnabled ? '启用' : '禁用' }}</span>
            <span>{{ user.isPlatformAdmin ? '是' : '否' }}</span>
            <span class="mono">{{ user.filePlatformUserId || '-' }}</span>
            <div class="user-row-actions">
              <button type="button" class="ghost-button" @click="startEdit(user)">编辑</button>
              <button
                type="button"
                class="ghost-button"
                :disabled="isActionPending(user.id, user.isEnabled ? 'disable' : 'enable')"
                @click="toggleEnabled(user)"
              >
                {{ user.isEnabled ? '禁用' : '启用' }}
              </button>
              <div class="user-password-reset">
                <input
                  v-model="resetPasswords[user.id]"
                  type="password"
                  autocomplete="new-password"
                  placeholder="新密码"
                  :disabled="isActionPending(user.id, 'reset-password')"
                />
                <button
                  type="button"
                  class="ghost-button"
                  :disabled="isActionPending(user.id, 'reset-password')"
                  @click="resetPassword(user)"
                >
                  重置密码
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <form class="panel form-grid" @submit.prevent="saveUser">
        <div class="form-grid__wide user-form-heading">
          <div>
            <span class="section-eyebrow">{{ editingUser ? '编辑用户' : '新增用户' }}</span>
            <h3>{{ editingUser ? editingUser.account : '新增数字化平台用户' }}</h3>
          </div>
          <button v-if="editingUser" type="button" class="ghost-button" @click="resetForm">取消编辑</button>
        </div>

        <label>
          <span>账号</span>
          <input v-model.trim="form.account" type="text" autocomplete="off" :disabled="Boolean(editingUser)" />
        </label>
        <label>
          <span>姓名</span>
          <input v-model.trim="form.displayName" type="text" autocomplete="off" />
        </label>
        <label>
          <span>部门</span>
          <input v-model.trim="form.department" type="text" autocomplete="off" />
        </label>
        <label>
          <span>角色</span>
          <input v-model.trim="form.role" type="text" autocomplete="off" />
        </label>
        <label v-if="!editingUser">
          <span>初始密码</span>
          <input v-model="form.password" type="password" autocomplete="new-password" />
        </label>
        <label>
          <span>文件平台用户ID</span>
          <input v-model.trim="form.filePlatformUserId" type="text" autocomplete="off" />
        </label>
        <label class="user-checkbox">
          <input v-model="form.isEnabled" type="checkbox" />
          <span>启用用户</span>
        </label>
        <label class="user-checkbox">
          <input v-model="form.isPlatformAdmin" type="checkbox" />
          <span>平台管理员</span>
        </label>

        <div v-if="clientError || operationError" class="state-panel state-panel--error form-grid__wide">
          <p>{{ clientError || operationError }}</p>
        </div>

        <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide">
          <p>{{ successMessage }}</p>
        </div>

        <div class="form-actions form-grid__wide">
          <button type="button" class="ghost-button" @click="resetForm">清空</button>
          <button type="submit" class="primary-button" :disabled="saving">
            {{ saving ? '保存中...' : editingUser ? '保存修改' : '新增用户' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import {
  createUser,
  disableUser,
  enableUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '../api/users.js';
import { toReadableApiError } from '../api/http.js';
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

const users = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const operationError = ref('');
const clientError = ref('');
const successMessage = ref('');
const editingUser = ref(null);
const pendingAction = ref('');
const resetPasswords = reactive({});

const form = reactive({
  account: '',
  displayName: '',
  department: '',
  role: '',
  password: '',
  isEnabled: true,
  isPlatformAdmin: false,
  filePlatformUserId: ''
});

function buildPendingKey(userId, action) {
  return `${userId}:${action}`;
}

function isActionPending(userId, action) {
  return pendingAction.value === buildPendingKey(userId, action);
}

function clearMessages() {
  clientError.value = '';
  operationError.value = '';
  successMessage.value = '';
}

function handleRequestError(error) {
  const message = toReadableApiError(error);
  operationError.value = message;

  if (error.code === 'UNAUTHENTICATED') {
    emit('auth-expired', message);
  }
}

async function loadUsers() {
  if (!props.currentUser.isPlatformAdmin) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    users.value = await listUsers(props.authToken);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', errorMessage.value);
    }
  } finally {
    loading.value = false;
  }
}

function resetForm({ keepMessage = false } = {}) {
  editingUser.value = null;
  form.account = '';
  form.displayName = '';
  form.department = '';
  form.role = '';
  form.password = '';
  form.isEnabled = true;
  form.isPlatformAdmin = false;
  form.filePlatformUserId = '';
  if (!keepMessage) {
    clearMessages();
  }
}

function startEdit(user) {
  editingUser.value = user;
  form.account = user.account;
  form.displayName = user.name;
  form.department = user.department;
  form.role = user.role;
  form.password = '';
  form.isEnabled = Boolean(user.isEnabled);
  form.isPlatformAdmin = Boolean(user.isPlatformAdmin);
  form.filePlatformUserId = user.filePlatformUserId || '';
  clearMessages();
}

function validateForm() {
  const missing = [];
  if (!editingUser.value && !form.account) missing.push('账号');
  if (!form.displayName) missing.push('姓名');
  if (!form.department) missing.push('部门');
  if (!form.role) missing.push('角色');
  if (!editingUser.value && !form.password) missing.push('初始密码');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
}

function buildBasePayload() {
  return {
    displayName: form.displayName,
    department: form.department,
    role: form.role,
    isEnabled: form.isEnabled,
    isPlatformAdmin: form.isPlatformAdmin,
    filePlatformUserId: form.filePlatformUserId || null
  };
}

async function saveUser() {
  clearMessages();

  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, buildBasePayload(), props.authToken);
      successMessage.value = '用户基础信息已保存。';
    } else {
      await createUser(
        {
          account: form.account,
          password: form.password,
          ...buildBasePayload()
        },
        props.authToken
      );
      resetForm({ keepMessage: true });
      successMessage.value = '用户已新增。';
    }

    await loadUsers();
  } catch (error) {
    handleRequestError(error);
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(user) {
  clearMessages();
  const action = user.isEnabled ? 'disable' : 'enable';
  pendingAction.value = buildPendingKey(user.id, action);

  try {
    if (user.isEnabled) {
      await disableUser(user.id, props.authToken);
      successMessage.value = '用户已禁用。';
    } else {
      await enableUser(user.id, props.authToken);
      successMessage.value = '用户已启用。';
    }

    await loadUsers();
  } catch (error) {
    handleRequestError(error);
  } finally {
    pendingAction.value = '';
  }
}

async function resetPassword(user) {
  clearMessages();
  const password = String(resetPasswords[user.id] || '');

  if (!password) {
    clientError.value = '请填写新密码。';
    return;
  }

  pendingAction.value = buildPendingKey(user.id, 'reset-password');

  try {
    await resetUserPassword(user.id, password, props.authToken);
    resetPasswords[user.id] = '';
    successMessage.value = `已重置 ${user.account} 的密码。`;
  } catch (error) {
    handleRequestError(error);
  } finally {
    pendingAction.value = '';
  }
}

onMounted(loadUsers);
</script>
