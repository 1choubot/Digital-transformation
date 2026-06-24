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
          <div class="toolbar-actions">
            <button type="button" class="primary-button" @click="openCreateModal">新增用户</button>
            <button type="button" class="ghost-button" :disabled="loading" @click="loadUsers">
              <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {{ loading ? '加载中...' : '重新加载' }}
            </button>
          </div>
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

        <template v-else>
          <div class="user-table">
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
              <span class="cell-mono">{{ user.account }}</span>
              <strong class="cell-name">{{ user.name }}</strong>
              <span class="cell-text">{{ user.department }}</span>
              <span class="cell-text">{{ user.role }}</span>
              <span class="badge" :class="user.isEnabled ? 'badge-success' : 'badge-danger'">
                {{ user.isEnabled ? '启用' : '禁用' }}
              </span>
              <span class="badge" :class="user.isPlatformAdmin ? 'badge-primary' : 'badge-neutral'">
                {{ user.isPlatformAdmin ? '是' : '否' }}
              </span>
              <span class="cell-mono">{{ user.filePlatformUserId || '-' }}</span>
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
                <button
                  type="button"
                  class="ghost-button"
                  :disabled="isActionPending(user.id, 'reset-password')"
                  @click="openResetModal(user)"
                >
                  重置密码
                </button>
              </div>
            </article>
          </div>

          <!-- 分页控件 -->
          <div class="pagination-container">
            <div class="pagination-info">
              共 <strong>{{ totalUsers }}</strong> 条记录，
              第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="ghost-button"
                :disabled="currentPage <= 1 || loading"
                @click="changePage(currentPage - 1)"
              >
                上一页
              </button>

              <div class="page-numbers">
                <button
                  v-for="page in visiblePages"
                  :key="page.value"
                  type="button"
                  class="page-number"
                  :class="{
                    'page-number--active': page.type === 'page' && page.value === currentPage,
                    'page-number--ellipsis': page.type === 'ellipsis'
                  }"
                  :disabled="page.type === 'ellipsis' || loading"
                  @click="page.type === 'page' && changePage(page.value)"
                >
                  {{ page.type === 'ellipsis' ? '…' : page.value }}
                </button>
              </div>

              <button
                type="button"
                class="ghost-button"
                :disabled="currentPage >= totalPages || loading"
                @click="changePage(currentPage + 1)"
              >
                下一页
              </button>

              <div class="page-size-selector">
                <label>
                  <span>每页</span>
                  <select v-model.number="pageSize" :disabled="loading" @change="changePageSize">
                    <option v-for="size in [5, 10, 20, 50]" :key="size" :value="size">
                      {{ size }}
                    </option>
                  </select>
                  <span>条</span>
                </label>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- 新增/编辑用户弹窗 -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editingUser ? '编辑用户' : '新增用户' }}</h3>
            <button type="button" class="modal-close" @click="closeModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="saveUser">
            <div class="form-grid">
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

              <div class="form-grid__wide user-checkboxes">
                <label class="user-checkbox">
                  <input v-model="form.isEnabled" type="checkbox" />
                  <span>启用用户</span>
                </label>
                <label class="user-checkbox">
                  <input v-model="form.isPlatformAdmin" type="checkbox" />
                  <span>平台管理员</span>
                </label>
              </div>

              <div class="form-actions form-grid__wide">
                <button type="button" class="ghost-button" @click="resetForm">清空</button>
                <button type="submit" class="primary-button" :disabled="saving">
                  {{ saving ? '保存中...' : editingUser ? '保存修改' : '新增用户' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- 重置密码弹窗 -->
      <div v-if="showResetModal" class="modal-overlay" @click.self="closeResetModal">
        <div class="modal-content modal-content--small">
          <div class="modal-header">
            <h3>重置密码</h3>
            <button type="button" class="modal-close" @click="closeResetModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="confirmResetPassword">
            <div class="form-grid form-grid--single">
              <label>
                <span>新密码</span>
                <input
                  v-model="resetPasswordInput"
                  type="password"
                  autocomplete="new-password"
                  placeholder="请输入新密码"
                  required
                />
              </label>
              <div class="form-actions">
                <button type="button" class="ghost-button" @click="closeResetModal">取消</button>
                <button type="submit" class="primary-button" :disabled="resetSaving">
                  {{ resetSaving ? '重置中...' : '确认重置' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </template>

    <!-- Toast 通知 -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="toast"
        :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }"
      >
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ toastMessage }}</span>
        <button class="toast-close" @click="hideToast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
const editingUser = ref(null);
const pendingAction = ref('');
const showModal = ref(false);

// 分页相关
const currentPage = ref(1);
const pageSize = ref(10);
const totalUsers = ref(0);

// 重置密码相关
const showResetModal = ref(false);
const resetUserId = ref(null);
const resetPasswordInput = ref('');
const resetSaving = ref(false);

// Toast 相关
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

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

// 计算总页数
const totalPages = computed(() => Math.ceil(totalUsers.value / pageSize.value) || 1);

// 计算可见页码（带省略号）
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 2;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const result = [];
  let last = 0;
  for (const page of range) {
    if (page - last > 1) {
      result.push({ type: 'ellipsis', value: 'ellipsis-' + last });
    }
    result.push({ type: 'page', value: page });
    last = page;
  }
  return result;
});

function buildPendingKey(userId, action) {
  return `${userId}:${action}`;
}

function isActionPending(userId, action) {
  return pendingAction.value === buildPendingKey(userId, action);
}

function showToast(msg, type = 'error') {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
    toastTimer = null;
  }, 3000);
}

function hideToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastVisible.value = false;
}

function handleRequestError(error) {
  const message = toReadableApiError(error);
  showToast(message, 'error');
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
    const response = await listUsers(props.authToken, {
      page: currentPage.value,
      size: pageSize.value
    });
    // 兼容后端返回格式：如果是数组，则转换为分页格式
    if (Array.isArray(response)) {
      users.value = response;
      totalUsers.value = response.length;
    } else {
      users.value = response.items || response.data || [];
      totalUsers.value = response.total || users.value.length;
    }
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', errorMessage.value);
    }
  } finally {
    loading.value = false;
  }
}

function changePage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  loadUsers();
}

function changePageSize() {
  currentPage.value = 1;
  loadUsers();
}

function resetForm() {
  editingUser.value = null;
  form.account = '';
  form.displayName = '';
  form.department = '';
  form.role = '';
  form.password = '';
  form.isEnabled = true;
  form.isPlatformAdmin = false;
  form.filePlatformUserId = '';
}

function openCreateModal() {
  resetForm();
  showModal.value = true;
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
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

function validateForm() {
  const missing = [];
  if (!editingUser.value && !form.account) missing.push('账号');
  if (!form.displayName) missing.push('姓名');
  if (!form.department) missing.push('部门');
  if (!form.role) missing.push('角色');
  if (!editingUser.value && !form.password) missing.push('初始密码');

  if (missing.length > 0) {
    showToast(`请补充：${missing.join('、')}`, 'error');
    return false;
  }
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
  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, buildBasePayload(), props.authToken);
      showToast('用户基础信息已保存。', 'success');
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
      showToast('用户已新增。', 'success');
    }

    await loadUsers();
    closeModal();
  } catch (error) {
    handleRequestError(error);
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(user) {
  const action = user.isEnabled ? 'disable' : 'enable';
  pendingAction.value = buildPendingKey(user.id, action);

  try {
    if (user.isEnabled) {
      await disableUser(user.id, props.authToken);
      showToast('用户已禁用。', 'success');
    } else {
      await enableUser(user.id, props.authToken);
      showToast('用户已启用。', 'success');
    }

    await loadUsers();
  } catch (error) {
    handleRequestError(error);
  } finally {
    pendingAction.value = '';
  }
}

function openResetModal(user) {
  resetUserId.value = user.id;
  resetPasswordInput.value = '';
  showResetModal.value = true;
}

function closeResetModal() {
  showResetModal.value = false;
  resetUserId.value = null;
  resetPasswordInput.value = '';
  resetSaving.value = false;
}

async function confirmResetPassword() {
  const password = resetPasswordInput.value.trim();
  if (!password) {
    showToast('请输入新密码。', 'error');
    return;
  }

  const userId = resetUserId.value;
  if (!userId) return;

  resetSaving.value = true;
  const actionKey = buildPendingKey(userId, 'reset-password');
  pendingAction.value = actionKey;

  try {
    await resetUserPassword(userId, password, props.authToken);
    showToast(`密码已重置。`, 'success');
    closeResetModal();
    await loadUsers();
  } catch (error) {
    handleRequestError(error);
  } finally {
    resetSaving.value = false;
    pendingAction.value = '';
  }
}

onMounted(loadUsers);
</script>

<style scoped>
/* ===== 全局基础 ===== */
.page-stack {
  max-width: 1440px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background: #f8fafc;
  min-height: 100vh;
}

/* ===== 标题行 ===== */
.page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.page-title-row > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.section-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.page-title-row h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.3;
}

.page-user {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 400;
}

/* ===== 按钮 ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.4rem 1rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.ghost-button:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #0f172a;
  border: none;
  padding: 0.6rem 1.6rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.primary-button:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ===== 面板 ===== */
.panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
}

.panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* ===== 工具栏 ===== */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #f1f5f9;
}

.panel-toolbar strong {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-right: 0.6rem;
}

.panel-toolbar span {
  color: #64748b;
  font-size: 0.8rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* ===== 状态面板 ===== */
.state-panel {
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.state-panel--inline {
  padding: 2rem 1.5rem;
  min-height: 180px;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.state-panel h3 {
  margin: 0 0 0.35rem 0;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.state-panel--error h3 {
  color: #b91c1c;
}

.state-panel p {
  color: #64748b;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.state-panel--error p {
  color: #b91c1c;
}

.state-panel .primary-button {
  margin-top: 0.25rem;
}

/* ===== 用户表格 ===== */
.user-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-table__head,
.user-table__row {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.9fr 0.9fr 0.5fr 0.7fr 1.1fr 1.2fr;
  gap: 0.4rem 0.6rem;
  align-items: center;
}

.user-table__head {
  padding: 0.6rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 8px;
}

.user-table__row {
  padding: 0.9rem 0.6rem;
  background: white;
  border-radius: 8px;
  border: 1px solid transparent;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease, box-shadow 0.2s ease;
  min-height: 64px;
}

.user-table__row:last-child {
  border-bottom: none;
}

.user-table__row:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.user-table__row > * {
  min-width: 0;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.cell-text {
  font-size: 0.85rem;
  color: #1e293b;
}

.cell-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
}

.cell-mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  color: #475569;
  background: #f1f5f9;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  display: inline-block;
  letter-spacing: 0.02em;
  white-space: normal;
  word-break: break-word;
  max-width: 100%;
}

/* ===== 标签（Badge）样式 ===== */
.badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.3;
  width: fit-content;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
  background: #f1f5f9;
  color: #475569;
}

.badge-success {
  background: #ecfdf5;
  color: #065f46;
}

.badge-danger {
  background: #fef2f2;
  color: #991b1b;
}

.badge-primary {
  background: #eff6ff;
  color: #1e3a8a;
}

.badge-neutral {
  background: #f8fafc;
  color: #64748b;
}

/* ===== 操作区域 ===== */
.user-row-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.user-row-actions > .ghost-button {
  padding: 0.25rem 0.8rem;
  font-size: 0.7rem;
  border-radius: 24px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  box-shadow: none;
  margin: 0;
}

.user-row-actions > .ghost-button:hover:not(:disabled) {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: none;
}

/* ===== 分页控件 ===== */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.pagination-info {
  font-size: 0.85rem;
  color: #64748b;
}

.pagination-info strong {
  color: #0f172a;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number:hover:not(:disabled):not(.page-number--ellipsis) {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.page-number--active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

.page-number--active:hover {
  background: #1e293b;
  border-color: #1e293b;
}

.page-number--ellipsis {
  cursor: default;
  color: #94a3b8;
}

.page-number:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size-selector {
  display: flex;
  align-items: center;
}

.page-size-selector label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #64748b;
}

.page-size-selector select {
  padding: 0.2rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  color: #0f172a;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.page-size-selector select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

/* ===== 弹窗（Modal）通用 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
  animation: modalFadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-width: 720px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 1.75rem;
  animation: modalSlideUp 0.25s ease;
}

.modal-content--small {
  max-width: 480px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  color: #94a3b8;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-close svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* 表单在弹窗内 */
.modal-form {
  width: 100%;
}

.modal-form .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
  align-items: start;
}

.modal-form .form-grid--single {
  grid-template-columns: 1fr;
}

.modal-form .form-grid__wide {
  grid-column: 1 / -1;
}

.modal-form label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.modal-form label > span:first-child {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-form input[type="text"],
.modal-form input[type="password"] {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  background: #ffffff;
  color: #0f172a;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modal-form input[type="text"]:focus,
.modal-form input[type="password"]:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.modal-form input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.user-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  padding-top: 0.5rem;
}

.user-checkbox {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0 !important;
}

.user-checkbox input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #0f172a;
  flex-shrink: 0;
}

.user-checkbox > span {
  font-size: 0.85rem;
  color: #334155;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.form-actions .ghost-button,
.form-actions .primary-button {
  margin-top: 0;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 1100;
  border: 1px solid #f1f5f9;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  stroke: #dc2626;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #22c55e;
}

.toast--success .toast-icon {
  stroke: #16a34a;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background 0.2s;
  color: #94a3b8;
}

.toast-close:hover {
  background: #f1f5f9;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

/* ===== 图标 ===== */
.button-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .user-table__head,
  .user-table__row {
    grid-template-columns: 1.1fr 0.9fr 0.8fr 0.8fr 0.5fr 0.7fr 1fr 1.2fr;
    gap: 0.3rem 0.5rem;
  }
}

@media (max-width: 992px) {
  .page-stack {
    padding: 1.25rem 1rem;
  }

  .page-title-row {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }

  .panel {
    padding: 1rem 1.25rem;
  }

  .user-table__head,
  .user-table__row {
    grid-template-columns: 1fr 0.9fr 0.8fr 0.8fr 0.5fr 0.7fr 1fr 1.2fr;
    font-size: 0.75rem;
  }

  .modal-content {
    padding: 1.25rem 1.5rem;
  }

  .modal-form .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .pagination-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .pagination-info {
    text-align: center;
  }

  .pagination-controls {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .page-title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0;
  }

  .page-title-row .ghost-button {
    align-self: flex-start;
  }

  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .user-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .user-table__head,
  .user-table__row {
    min-width: 780px;
    grid-template-columns: 1fr 0.9fr 0.8fr 0.8fr 0.5fr 0.7fr 1fr 1.2fr;
    padding: 0.5rem 0.6rem;
  }

  .user-row-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .modal-overlay {
    padding: 1rem;
  }

  .modal-content {
    padding: 1.25rem 1.25rem 1.5rem;
    max-height: 95vh;
  }

  .modal-form .form-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .form-actions {
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .form-actions .ghost-button,
  .form-actions .primary-button {
    flex: 1;
    justify-content: center;
    padding: 0.5rem 1rem;
  }

  .pagination-controls {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .page-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .page-size-selector {
    order: 2;
  }

  .toast {
    top: 1rem;
    padding: 0.6rem 0.8rem 0.6rem 1rem;
    font-size: 0.8rem;
    max-width: 92%;
  }

  .toast-close {
    width: 20px;
    height: 20px;
  }

  .toast-close svg {
    width: 12px;
    height: 12px;
  }
}

@media (max-width: 480px) {
  .page-stack {
    padding: 1rem 0.75rem;
  }

  .page-title-row h2 {
    font-size: 1.1rem;
  }

  .section-eyebrow {
    font-size: 0.55rem;
  }

  .page-user {
    font-size: 0.7rem;
  }

  .ghost-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }

  .panel {
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
  }

  .user-table__head,
  .user-table__row {
    min-width: 680px;
    font-size: 0.7rem;
    gap: 0.25rem 0.35rem;
    padding: 0.4rem 0.4rem;
  }

  .cell-name {
    font-size: 0.75rem;
  }

  .state-panel {
    padding: 1.5rem 1rem;
    min-height: 150px;
  }

  .state-panel h3 {
    font-size: 0.95rem;
  }

  .state-panel p {
    font-size: 0.8rem;
  }

  .modal-content {
    padding: 1rem 1rem 1.25rem;
    border-radius: 1rem;
  }

  .modal-header h3 {
    font-size: 1.1rem;
  }

  .modal-content--small {
    max-width: 100%;
    margin: 0 0.5rem;
  }

  .pagination-info {
    font-size: 0.75rem;
  }

  .page-number {
    min-width: 28px;
    height: 28px;
    font-size: 0.7rem;
  }

  .page-size-selector label {
    font-size: 0.7rem;
  }
}
</style>