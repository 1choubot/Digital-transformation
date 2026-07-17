<template>
  <section class="page-stack">
    <el-alert v-if="!canAccessUserManagement" title="无权限访问" description="用户管理仅平台管理员可进入。该入口只保护用户管理本身，不代表项目、资料或文件权限。" type="error" show-icon :closable="false" />

    <template v-else>
      <section class="panel">
        <div class="panel-toolbar">
          <div>
            <strong>用户列表</strong>
            <span>展示数字化平台用户，不读取或同步文件管理平台用户。</span>
          </div>
          <el-button :loading="loading" @click="loadUsers">重新加载</el-button>
        </div>

        <el-skeleton v-if="loading" :rows="5" animated />

        <el-alert v-else-if="errorMessage" title="用户列表加载失败" :description="errorMessage" type="error" show-icon :closable="false">
          <template #default><el-button type="primary" size="small" @click="loadUsers">重试</el-button></template>
        </el-alert>

        <el-empty v-else-if="users.length === 0" description="请先新增数字化平台用户。" />

        <div v-else class="user-table">
          <div class="user-table__head">
            <span>账号</span>
            <span>姓名</span>
            <span>组织角色</span>
            <span>部门</span>
            <span>岗位/职务</span>
            <span>状态</span>
            <span>平台管理员</span>
            <span>文件平台用户ID</span>
            <span>操作</span>
          </div>

          <article v-for="user in users" :key="user.id" class="user-table__row">
            <span class="mono">{{ user.account }}</span>
            <strong>{{ user.name }}</strong>
            <span>{{ formatOrganizationRole(user.organizationRole) }}</span>
            <span>{{ formatBusinessDepartment(user.department) }}</span>
            <span>{{ user.role }}</span>
            <el-tag :type="user.isEnabled ? 'success' : 'info'">{{ user.isEnabled ? '启用' : '禁用' }}</el-tag>
            <el-tag :type="user.isPlatformAdmin ? 'primary' : 'info'">{{ user.isPlatformAdmin ? '是' : '否' }}</el-tag>
            <span class="mono">{{ user.filePlatformUserId || '-' }}</span>
            <div class="user-row-actions">
              <el-button link type="primary" @click="startEdit(user)">编辑</el-button>
              <el-button
                link
                :type="user.isEnabled ? 'danger' : 'success'"
                :loading="isActionPending(user.id, user.isEnabled ? 'disable' : 'enable')"
                :disabled="isActionPending(user.id, user.isEnabled ? 'disable' : 'enable')"
                @click="toggleEnabled(user)"
              >
                {{ user.isEnabled ? '禁用' : '启用' }}
              </el-button>
              <div class="user-password-reset">
                <el-input
                  v-model="resetPasswords[user.id]"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  placeholder="新密码"
                  :disabled="isActionPending(user.id, 'reset-password')"
                />
                <el-button
                  :loading="isActionPending(user.id, 'reset-password')"
                  @click="resetPassword(user)"
                >
                  重置密码
                </el-button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <el-form class="panel form-grid" :model="form" @submit.prevent="saveUser">
        <div class="form-grid__wide user-form-heading">
          <div>
            <span class="section-eyebrow">{{ editingUser ? '编辑用户' : '新增用户' }}</span>
            <h3>{{ editingUser ? editingUser.account : '新增数字化平台用户' }}</h3>
          </div>
          <el-button v-if="editingUser" @click="resetForm">取消编辑</el-button>
        </div>

        <label>
          <span>账号</span>
          <el-input v-model.trim="form.account" autocomplete="off" :disabled="Boolean(editingUser)" />
        </label>
        <label>
          <span>姓名</span>
          <el-input v-model.trim="form.displayName" autocomplete="off" />
        </label>
        <label>
          <span>组织角色</span>
          <el-select v-model="form.organizationRole" placeholder="请选择组织角色" @change="handleOrganizationRoleChange">
            <el-option v-for="option in organizationRoleOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </label>
        <label>
          <span>部门</span>
          <el-select
            v-model="form.department"
            :disabled="isGlobalOrganizationRole(form.organizationRole)"
            :placeholder="isGlobalOrganizationRole(form.organizationRole) ? '全局角色无部门' : '请选择部门'"
          >
            <el-option v-for="option in departmentOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </label>
        <label>
          <span>岗位/职务</span>
          <el-input v-model.trim="form.role" autocomplete="off" />
        </label>
        <label v-if="!editingUser">
          <span>初始密码</span>
          <el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
        </label>
        <label>
          <span>文件平台用户ID</span>
          <el-input v-model.trim="form.filePlatformUserId" autocomplete="off" />
        </label>
        <el-checkbox v-model="form.isEnabled">启用用户</el-checkbox>
        <el-checkbox v-model="form.isPlatformAdmin" :disabled="form.organizationRole !== 'system_admin'">平台管理员</el-checkbox>

        <div class="form-actions form-grid__wide">
          <el-button @click="resetForm">清空</el-button>
          <el-button type="primary" native-type="submit" :loading="saving">{{ editingUser ? '保存修改' : '新增用户' }}</el-button>
        </div>
      </el-form>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createUser,
  disableUser,
  enableUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '../api/users.js';
import { toReadableApiError } from '../api/http.js';
import {
  formatBusinessDepartment,
  formatOrganizationRole
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

const users = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const editingUser = ref(null);
const pendingAction = ref('');
const resetPasswords = reactive({});
const canAccessUserManagement = computed(
  () => props.currentUser.isPlatformAdmin && props.currentUser.organizationRole === 'system_admin'
);

const organizationRoleOptions = [
  { value: 'general_manager', label: '总经理' },
  { value: 'system_admin', label: '系统管理员' },
  { value: 'general_manager_assistant', label: '总经理助理' },
  { value: 'center_manager', label: '中心负责人' },
  { value: 'employee', label: '员工' }
];

const departmentOptions = [
  { value: 'operations_center', label: '运营中心' },
  { value: 'marketing_center', label: '营销中心' },
  { value: 'manufacturing_center', label: '制造中心' },
  { value: 'rd_center', label: '研发中心' }
];

const globalOrganizationRoles = new Set([
  'general_manager',
  'system_admin',
  'general_manager_assistant'
]);
const departmentOrganizationRoles = new Set(['center_manager', 'employee']);

const form = reactive({
  account: '',
  displayName: '',
  department: '',
  organizationRole: '',
  role: '',
  password: '',
  isEnabled: true,
  isPlatformAdmin: false,
  filePlatformUserId: ''
});

function isGlobalOrganizationRole(value) {
  return globalOrganizationRoles.has(value);
}

function isDepartmentOrganizationRole(value) {
  return departmentOrganizationRoles.has(value);
}

function handleOrganizationRoleChange() {
  if (isGlobalOrganizationRole(form.organizationRole)) {
    form.department = '';
  }

  if (form.organizationRole === 'system_admin') {
    form.isPlatformAdmin = true;
    return;
  }

  form.isPlatformAdmin = false;
}

function buildPendingKey(userId, action) {
  return `${userId}:${action}`;
}

function isActionPending(userId, action) {
  return pendingAction.value === buildPendingKey(userId, action);
}

function handleRequestError(error) {
  const message = toReadableApiError(error);
  if (error.code === 'UNAUTHENTICATED') {
    emit('auth-expired', message);
  } else {
    ElMessage.error(message);
  }
}

async function loadUsers() {
  if (!canAccessUserManagement.value) {
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

function resetForm() {
  editingUser.value = null;
  form.account = '';
  form.displayName = '';
  form.department = '';
  form.organizationRole = '';
  form.role = '';
  form.password = '';
  form.isEnabled = true;
  form.isPlatformAdmin = false;
  form.filePlatformUserId = '';
}

function startEdit(user) {
  editingUser.value = user;
  form.account = user.account;
  form.displayName = user.name;
  form.department = user.department || '';
  form.organizationRole = user.organizationRole || '';
  form.role = user.role;
  form.password = '';
  form.isEnabled = Boolean(user.isEnabled);
  form.isPlatformAdmin = Boolean(user.isPlatformAdmin);
  form.filePlatformUserId = user.filePlatformUserId || '';
}

function validateForm() {
  const missing = [];
  if (!editingUser.value && !form.account) missing.push('账号');
  if (!form.displayName) missing.push('姓名');
  if (!form.organizationRole) missing.push('组织角色');
  if (isDepartmentOrganizationRole(form.organizationRole) && !form.department) missing.push('部门');
  if (!form.role) missing.push('岗位/职务');
  if (!editingUser.value && !form.password) missing.push('初始密码');

  if (missing.length > 0) {
    ElMessage.error(`请补充：${missing.join('、')}`);
    return false;
  }

  if (isGlobalOrganizationRole(form.organizationRole) && form.department) {
    ElMessage.error('总经理、系统管理员、总经理助理不隶属于四个业务部门。');
    return false;
  }

  if (form.organizationRole === 'system_admin' && !form.isPlatformAdmin) {
    ElMessage.error('系统管理员必须同时具备平台管理员权限。');
    return false;
  }

  return true;
}

function buildBasePayload() {
  return {
    displayName: form.displayName,
    department: isGlobalOrganizationRole(form.organizationRole) ? null : form.department,
    organizationRole: form.organizationRole,
    role: form.role,
    isEnabled: form.isEnabled,
    isPlatformAdmin: form.isPlatformAdmin,
    filePlatformUserId: form.filePlatformUserId || null
  };
}

async function saveUser() {

  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, buildBasePayload(), props.authToken);
      ElMessage.success('用户基础信息已保存。');
    } else {
      await createUser(
        {
          account: form.account,
          password: form.password,
          ...buildBasePayload()
        },
        props.authToken
      );
      resetForm();
      ElMessage.success('用户已新增。');
    }

    await loadUsers();
  } catch (error) {
    handleRequestError(error);
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(user) {
  const action = user.isEnabled ? 'disable' : 'enable';

  try {
    if (user.isEnabled) {
      await ElMessageBox.confirm(`确认禁用用户 ${user.account} 吗？`, '禁用用户', {
        type: 'warning',
        confirmButtonText: '禁用',
        cancelButtonText: '取消'
      });
    }
    pendingAction.value = buildPendingKey(user.id, action);
    if (user.isEnabled) {
      await disableUser(user.id, props.authToken);
      ElMessage.success('用户已禁用。');
    } else {
      await enableUser(user.id, props.authToken);
      ElMessage.success('用户已启用。');
    }

    await loadUsers();
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
    handleRequestError(error);
  } finally {
    pendingAction.value = '';
  }
}

async function resetPassword(user) {
  const password = String(resetPasswords[user.id] || '');

  if (!password) {
    ElMessage.error('请填写新密码。');
    return;
  }

  pendingAction.value = buildPendingKey(user.id, 'reset-password');

  try {
    await ElMessageBox.confirm(`确认重置用户 ${user.account} 的密码吗？`, '重置密码', {
      type: 'warning',
      confirmButtonText: '重置',
      cancelButtonText: '取消'
    });
    await resetUserPassword(user.id, password, props.authToken);
    resetPasswords[user.id] = '';
    ElMessage.success(`已重置 ${user.account} 的密码。`);
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
    handleRequestError(error);
  } finally {
    pendingAction.value = '';
  }
}

onMounted(loadUsers);
</script>
