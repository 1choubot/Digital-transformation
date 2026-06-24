<template>
  <section class="page-stack animate-fadeIn">
    <!-- 无权限警告 -->
    <section v-if="!canAccessUserManagement" class="state-panel state-panel--error panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
      </svg>
      <h3>无权限访问此页面</h3>
      <p>用户管理控制台仅具备平台管理员权限的用户方可进入。本机制保护管理入口本身，不代表底层文档权限。</p>
    </section>

    <template v-else>
      <!-- 指标看板 -->
      <section v-if="users.length > 0" class="dashboard-stats-grid">
        <div class="stat-card stat-card--blue">
          <div class="stat-info">
            <span class="stat-label">注册用户总数</span>
            <strong class="stat-value">{{ totalCount }} <small>人</small></strong>
          </div>
          <div class="stat-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          </div>
        </div>

        <div class="stat-card stat-card--emerald">
          <div class="stat-info">
            <span class="stat-label">正常启用状态</span>
            <strong class="stat-value">{{ enabledCount }} <small>人</small></strong>
          </div>
          <div class="stat-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            </svg>
          </div>
        </div>

        <div class="stat-card stat-card--indigo">
          <div class="stat-info">
            <span class="stat-label">管理员</span>
            <strong class="stat-value">{{ adminCount }} <small>人</small></strong>
          </div>
          <div class="stat-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <div class="stat-card stat-card--amber">
          <div class="stat-info">
            <span class="stat-label">禁用冻结账号</span>
            <strong class="stat-value">{{ disabledCount }} <small>人</small></strong>
          </div>
          <div class="stat-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
        </div>
      </section>

      <!-- 用户列表卡片主体 -->
      <section class="panel list-panel">
        <div class="panel-toolbar">
          <div class="toolbar-info">
            <strong class="toolbar-title">数字化平台注册人员台账</strong>
            <span class="toolbar-subtitle">本系统仅展示并维护平台注册人员，不读取或同步文件管理存储系统的外部目录。</span>
          </div>
          <div class="toolbar-actions">
            <!-- 查找用户搜索框 -->
            <div class="search-input-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索姓名或账号..."
                class="search-input"
                @input="handleSearchInput"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-clear-btn"
                @click="clearSearch"
                aria-label="清除搜索"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadUsers">
              <svg v-if="loading" class="spinner btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" stroke-top="currentColor" />
              </svg>
              <span>{{ loading ? '同步中...' : '重新加载' }}</span>
            </button>

            <button type="button" class="ghost-button back-to-list-btn" @click="navigate('/projects')">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>返回项目列表</span>
            </button>

            <button type="button" class="primary-button create-user-btn" @click="openCreateModal">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>录入平台新成员</span>
            </button>
          </div>
        </div>

        <!-- 数据加载中 -->
        <div v-if="loading" class="state-panel state-panel--inline">
          <div class="loading-wave">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
          <p>正在同步最新的平台用户列表...</p>
        </div>

        <!-- 数据加载失败 -->
        <div v-else-if="errorMessage" class="state-panel state-panel--error">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
          </svg>
          <h3>用户列表加载失败</h3>
          <p>{{ errorMessage }}</p>
          <button type="button" class="primary-button inline-btn" @click="loadUsers">重试加载</button>
        </div>

        <!-- 无注册用户状态 -->
        <div v-else-if="users.length === 0" class="state-panel state-panel--empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <h3>暂无注册用户</h3>
          <p>系统目前未分配任何数字化平台用户，请在上方新增用户。</p>
        </div>

        <!-- 搜索无结果 -->
        <div v-else-if="searchQuery && filteredUsers.length === 0" class="state-panel state-panel--empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3>未找到匹配用户</h3>
          <p>没有姓名或账号包含“{{ searchQuery }}”的用户，请尝试其他关键词。</p>
        </div>

        <!-- 极致优化的 5列 强合并流式行表格（绝不换行，绝不横向溢出） -->
        <div v-else class="table-container">
          <div class="user-table">
            <div class="user-table__head">
              <span>账户信息</span>
              <span>组织与部门</span>
              <span>岗位职务</span>
              <span>系统权限</span>
              <span class="text-right">管理操作</span>
            </div>

            <div class="user-table__body">
              <article v-for="user in paginatedUsers" :key="user.id" class="user-table__row">
                
                <!-- 列 1: 账号与身份集合 -->
                <div class="card-column min-w-0 gap-0.5">
                  <div class="flex items-center gap-2">
                    <strong class="text-[13px] font-bold text-slate-900 truncate" :title="user.name">{{ user.name }}</strong>
                    <span class="mono-badge">{{ user.account }}</span>
                  </div>
                  <span class="mono-code">平台ID: {{ user.filePlatformUserId || '未绑定' }}</span>
                </div>
                
                <!-- 列 2: 组织与部门集合 -->
                <div class="card-column min-w-0">
                  <span class="role-tag">{{ formatOrganizationRole(user.organizationRole) }}</span>
                  <span class="text-xs text-slate-500 font-medium truncate mt-0.5" :title="formatBusinessDepartment(user.department)">
                    {{ formatBusinessDepartment(user.department) || '全局系统级' }}
                  </span>
                </div>
                
                <!-- 列 3: 岗位职务（强制不换行截断，并预留充足宽度） -->
                <div class="card-column min-w-0">
                  <span class="text-[13px] text-slate-800 font-semibold truncate" :title="user.role">
                    {{ user.role || '-' }}
                  </span>
                </div>
                
                <!-- 列 4: 权限状态集合 -->
                <div class="card-column min-w-0 gap-1 items-start">
                  <span :class="['status-indicator', user.isEnabled ? 'status-indicator--active' : 'status-indicator--disabled']">
                    {{ user.isEnabled ? '正常启用' : '禁用冻结' }}
                  </span>
                  <span v-if="user.isPlatformAdmin" class="admin-badge admin-badge--yes">管理员</span>
                </div>
                
                <!-- 列 5: 交互动作组（强制一行） -->
                <div class="user-row-actions whitespace-nowrap">
                  <button type="button" class="row-btn edit-btn" @click="startEdit(user)">编辑</button>
                  <button
                    type="button"
                    :class="['row-btn toggle-btn', user.isEnabled ? 'toggle-btn--disable' : 'toggle-btn--enable']"
                    :disabled="isActionPending(user.id, user.isEnabled ? 'disable' : 'enable')"
                    @click="toggleEnabled(user)"
                  >
                    {{ user.isEnabled ? '禁用' : '启用' }}
                  </button>
                  
                  <!-- 重置密码组 -->
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
                      class="reset-btn"
                      :disabled="isActionPending(user.id, 'reset-password')"
                      @click="resetPassword(user)"
                    >
                      重置
                    </button>
                  </div>
                </div>

              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- 自适应分页控制面板 -->
      <footer v-if="filteredUsers.length > 0" class="panel pagination-panel">
        <div class="pagination-info">
          <span>当前第</span>
          <span class="page-current-highlight">{{ currentPage }}</span>
          <span>/ {{ totalPages }} 页</span>
          <span class="divider">|</span>
          <span>共筛选出 {{ filteredUsers.length }} 人</span>
          <span v-if="searchQuery" class="search-indicator">（搜索: {{ searchQuery }}）</span>
        </div>

        <div class="pagination-controls">
          <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(1)">
            首页
          </button>
          <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
            上一页
          </button>
          <div class="page-numbers-group">
            <button
              v-for="page in visiblePages"
              :key="page"
              type="button"
              :class="['page-number-btn', { 'page-number-btn--active': page === currentPage }]"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
          </div>
          <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
            下一页
          </button>
          <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(totalPages)">
            尾页
          </button>
        </div>

        <div class="pagination-sizes">
          <span>每页显示</span>
          <div class="select-wrapper select-size">
            <select v-model="pageSize" @change="currentPage = 1">
              <option :value="5">5 人/页</option>
              <option :value="8">8 人/页</option>
              <option :value="12">12 人/页</option>
              <option :value="20">20 人/页</option>
            </select>
          </div>
        </div>
      </footer>

      <!-- 磨砂滑入式配置弹窗（Modal Drawer） -->
      <div v-if="isModalOpen" class="modal-backdrop-overlay animate-fadeIn" @click.self="closeModal">
        <form class="panel form-grid modal-container animate-slideIn" @submit.prevent="saveUser">
          <div class="form-grid__wide user-form-heading">
            <div class="heading-left">
              <span class="section-eyebrow">{{ editingUser ? '账号配置' : '组织录入' }}</span>
              <h3 class="form-title-text">{{ editingUser ? `编辑用户账户: ${editingUser.account}` : '新增数字化平台用户' }}</h3>
            </div>
            <button type="button" class="close-modal-x-btn" @click="closeModal" aria-label="关闭弹窗">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- 账号 (新建时可用) -->
          <div class="form-group">
            <span class="label-text">账号 <span class="required-star">*</span></span>
            <div class="input-wrapper" :class="{ 'input-wrapper--disabled': Boolean(editingUser) }">
              <input v-model.trim="form.account" type="text" autocomplete="off" :disabled="Boolean(editingUser)" placeholder="输入登录账号" />
            </div>
          </div>

          <!-- 姓名 -->
          <div class="form-group">
            <span class="label-text">姓名 <span class="required-star">*</span></span>
            <div class="input-wrapper">
              <input v-model.trim="form.displayName" type="text" autocomplete="off" placeholder="输入真实姓名" />
            </div>
          </div>

          <!-- 组织角色 -->
          <div class="form-group">
            <span class="label-text">组织角色 <span class="required-star">*</span></span>
            <div class="select-wrapper">
              <select v-model="form.organizationRole" @change="handleOrganizationRoleChange">
                <option value="">请选择组织角色</option>
                <option v-for="option in organizationRoleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 部门 -->
          <div class="form-group">
            <span class="label-text">部门 <span class="required-star" v-if="isDepartmentOrganizationRole(form.organizationRole)">*</span></span>
            <div class="select-wrapper" :class="{ 'select-wrapper--disabled': isGlobalOrganizationRole(form.organizationRole) }">
              <select
                v-model="form.department"
                :disabled="isGlobalOrganizationRole(form.organizationRole)"
              >
                <option value="">{{ isGlobalOrganizationRole(form.organizationRole) ? '系统级角色' : '请选择部门' }}</option>
                <option v-for="option in departmentOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 岗位职务 -->
          <div class="form-group">
            <span class="label-text">岗位 / 职务 <span class="required-star">*</span></span>
            <div class="input-wrapper">
              <input v-model.trim="form.role" type="text" autocomplete="off" placeholder="输入职务, 例如: 高级研发工程师" />
            </div>
          </div>

          <!-- 初始密码 (仅新建时展现) -->
          <div v-if="!editingUser" class="form-group">
            <span class="label-text">初始密码 <span class="required-star">*</span></span>
            <div class="input-wrapper">
              <input v-model="form.password" type="password" autocomplete="new-password" placeholder="输入密码" />
            </div>
          </div>

          <!-- 文件平台用户ID -->
          <div class="form-group">
            <span class="label-text">文件平台用户ID</span>
            <div class="input-wrapper">
              <input v-model.trim="form.filePlatformUserId" type="text" autocomplete="off" placeholder="可选: 关联文件系统ID" />
            </div>
          </div>

          <!-- 选择状态及管理员开关组 -->
          <div class="checkbox-controls-row form-grid__wide">
            <label class="user-checkbox-card">
              <input v-model="form.isEnabled" type="checkbox" />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label-text">启用该用户 (允许登录)</span>
            </label>
            <label class="user-checkbox-card" :class="{ 'user-checkbox-card--disabled': form.organizationRole !== 'system_admin' }">
              <input
                v-model="form.isPlatformAdmin"
                type="checkbox"
                :disabled="form.organizationRole !== 'system_admin'"
              />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label-text">设为平台管理员</span>
            </label>
          </div>

          <!-- 保存提示信息区块 -->
          <div v-if="clientError || operationError" class="state-panel state-panel--error form-grid__wide animate-slideIn">
            <p>{{ clientError || operationError }}</p>
          </div>
          <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide animate-slideIn">
            <p>{{ successMessage }}</p>
          </div>

          <!-- 操作区 -->
          <div class="form-actions form-grid__wide">
            <button type="button" class="ghost-button" @click="closeModal">取消</button>
            <button type="submit" class="primary-button submit-btn" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? '正在保存...' : editingUser ? '保存修改' : '确认新增用户' }}</span>
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- 统一 Toast 弹窗 -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast" :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }">
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="toastType === 'error'">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </template>
          <template v-else>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </template>
        </svg>
        <span>{{ toastMessage }}</span>
        <button type="button" class="toast-close" @click="hideToast">
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
import { computed, onMounted, reactive, ref, watch, onUnmounted } from 'vue';
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
  formatOrganizationRole,
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

// 查找用户相关
const searchQuery = ref('');

// 高保真滑入式配置弹窗可见性变量
const isModalOpen = ref(false);

// 本地分页控制
const currentPage = ref(1);
const pageSize = ref(8); // 默认每页展现 8 个用户账号

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

// 基于搜索过滤后的用户列表
const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(user =>
    user.name.toLowerCase().includes(q) ||
    user.account.toLowerCase().includes(q)
  );
});

// Vue 响应式自计算属性，保持原有指标的实时同步（基于全部用户）
const totalCount = computed(() => users.value.length);
const enabledCount = computed(() => users.value.filter(u => u.isEnabled).length);
const adminCount = computed(() => users.value.filter(u => u.isPlatformAdmin).length);
const disabledCount = computed(() => users.value.filter(u => !u.isEnabled).length);

// 分页切片计算（基于过滤后的用户）
const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / pageSize.value) || 1;
});

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredUsers.value.slice(start, end);
});

// 搜索时重置到第一页
function handleSearchInput() {
  currentPage.value = 1;
}

function clearSearch() {
  searchQuery.value = '';
  currentPage.value = 1;
}

// 计算展现页码
const visiblePages = computed(() => {
  const range = [];
  const maxButtons = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages.value, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  return range;
});

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

// Toast 管理
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

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

watch(errorMessage, (newVal) => {
  if (newVal) showToast(newVal, 'error');
});
watch(operationError, (newVal) => {
  if (newVal) showToast(newVal, 'error');
});
watch(clientError, (newVal) => {
  if (newVal) showToast(newVal, 'error');
});
watch(successMessage, (newVal) => {
  if (newVal) {
    showToast(newVal, 'success');
    setTimeout(() => {
      closeModal();
    }, 1200);
  }
});

// 模态弹窗控制函数
function openCreateModal() {
  resetForm();
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  resetForm();
}

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
  if (!canAccessUserManagement.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    users.value = await listUsers(props.authToken);
    // 重新加载后重置搜索及分页
    searchQuery.value = '';
    currentPage.value = 1;
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
  form.organizationRole = '';
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
  form.department = user.department || '';
  form.organizationRole = user.organizationRole || '';
  form.role = user.role;
  form.password = '';
  form.isEnabled = Boolean(user.isEnabled);
  form.isPlatformAdmin = Boolean(user.isPlatformAdmin);
  form.filePlatformUserId = user.filePlatformUserId || '';
  clearMessages();
  
  isModalOpen.value = true;
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
    clientError.value = `请补充必填字段：${missing.join('、')}`;
    return false;
  }

  if (isGlobalOrganizationRole(form.organizationRole) && form.department) {
    clientError.value = '总经理、系统管理员、总经理助理不隶属于四个业务部门。';
    return false;
  }

  if (form.organizationRole === 'system_admin' && !form.isPlatformAdmin) {
    clientError.value = '系统管理员必须同时具备平台管理员权限。';
    return false;
  }

  clientError.value = '';
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

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
/* 全局页面布局 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem 0;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* 优化后：高度极致压缩、完美的单排行自适应统计面板 */
.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.stat-value small {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}

.stat-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper svg {
  width: 16px;
  height: 16px;
}

.stat-card--blue { border-left: 4px solid #3b82f6; }
.stat-card--blue .stat-icon-wrapper { background: #eff6ff; color: #3b82f6; }

.stat-card--emerald { border-left: 4px solid #10b981; }
.stat-card--emerald .stat-icon-wrapper { background: #ecfdf5; color: #10b981; }

.stat-card--indigo { border-left: 4px solid #6366f1; }
.stat-card--indigo .stat-icon-wrapper { background: #eef2ff; color: #6366f1; }

.stat-card--amber { border-left: 4px solid #f59e0b; }
.stat-card--amber .stat-icon-wrapper { background: #fffbeb; color: #f59e0b; }

/* 按钮基础风格 */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  height: 38px;
  white-space: nowrap;
}

.ghost-button:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  height: 40px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.15);
  transform: translateY(-1px);
}

.primary-button:disabled {
  opacity: 0.6;
  background: #475569;
  cursor: not-allowed;
  box-shadow: none;
}

/* 独立滑入提示区 */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4.5rem 2rem;
  text-align: center;
}

.state-panel p {
  font-size: 0.9rem;
  color: #64748b;
}

.state-panel--inline {
  padding: 3.5rem 1.5rem;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  color: #b91c1c;
}

.state-panel--success {
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 12px;
  color: #15803d;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #ef4444;
  margin-bottom: 0.75rem;
}

.inline-btn {
  margin-top: 1rem;
}

/* 极简等待动画 */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1.25rem;
}

.wave-bar {
  width: 4px;
  height: 24px;
  background: #0f172a;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }

.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #94a3b8;
  margin-bottom: 1rem;
}

/* 基础面板容器 */
.panel {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 20, 40, 0.02);
}

.list-panel {
  overflow: hidden;
}

/* 工具栏重新设计：按钮与搜索整合 */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 1rem;
}

.toolbar-info {
  display: flex;
  flex-direction: column;
  max-width: 50%;
}

.toolbar-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-subtitle {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-left: auto; /* 推至右侧 */
}

/* 搜索框样式 */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 2.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;
}

.search-clear-btn svg {
  width: 14px;
  height: 14px;
}

.search-clear-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}

/* 核心优化：9 列高对齐度完美黄金比例流式栅格。解决全部换行错乱！ */
.table-container {
  overflow-x: auto;
  width: 100%;
}

.user-table {
  /* 调整限制，使其能够在单屏完整适配 */
  min-width: 900px;
  width: 100%;
  border-collapse: collapse;
}

.user-table__head {
  display: grid;
  /* 严格使用 minmax(0, Xfr) 防止撑爆 Grid，给予操作区充裕空间 */
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 2.2fr);
  padding: 0.85rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  gap: 1rem;
}

.user-table__body {
  display: flex;
  flex-direction: column;
}

.user-table__row {
  display: grid;
  /* 保持与头部完美对齐一致的严格 5 列栅格比例 */
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 2.2fr);
  padding: 0.75rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
  font-size: 13px; /* 紧凑美观的13号字 */
  gap: 1rem;
}

.user-table__row:hover {
  background: #f8fafc;
}

.user-table__row:last-child {
  border-bottom: none;
}

/* 单元格信息集合（去除9列散装结构，改为5列复合展示） */
.card-column {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.identity-name-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mono-badge {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.725rem;
  font-weight: 700;
  color: #1e293b;
  background: #f1f5f9;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  width: fit-content;
}

.admin-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.admin-badge--yes {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.user-display-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 极小化平台ID */
.mono-code {
  font-family: monospace;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
  border: 1px solid #e2e8f0;
}

.department-text {
  color: #475569;
  font-size: 12px;
}

/* 岗位职务强制不换行截断 */
.title-text {
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  width: fit-content;
}

.status-indicator--active {
  background: #f0fdf4;
  color: #16a34a;
}

.status-indicator--disabled {
  background: #fef2f2;
  color: #dc2626;
}

/* 交互动作组 - 保持在一排！ */
.user-row-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: flex-end;
  white-space: nowrap;
}

.row-btn {
  padding: 0.35rem 0.65rem;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  white-space: nowrap;
}

.edit-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}

.toggle-btn--disable {
  border-color: #fca5a5;
  color: #ef4444;
  background: #fef2f2;
}

.toggle-btn--disable:hover {
  background: #fecaca;
  color: #b91c1c;
}

.toggle-btn--enable {
  border-color: #bbf7d0;
  color: #16a34a;
  background: #f0fdf4;
}

.toggle-btn--enable:hover {
  background: #86efac;
  color: #15803d;
}

/* 密码重置组 */
.user-password-reset {
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 6px;
  overflow: hidden;
  height: 28px;
}

.user-password-reset:focus-within {
  border-color: #2563eb;
  background: #ffffff;
}

.user-password-reset input {
  border: none;
  background: transparent;
  width: 70px;
  padding: 0 0.4rem;
  font-size: 11px;
  color: #0f172a;
  outline: none;
}

.reset-btn {
  border: none;
  background: #475569;
  color: #ffffff;
  height: 100%;
  padding: 0 0.5rem;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.reset-btn:hover:not(:disabled) {
  background: #0f172a;
}

/* 高保真分页控制面板 */
.pagination-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #475569;
  flex-wrap: wrap;
}

.page-current-highlight {
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.pagination-info .divider {
  color: #cbd5e1;
  margin: 0 0.25rem;
}

.search-indicator {
  font-style: italic;
  color: #2563eb;
  font-size: 0.8rem;
  margin-left: 0.25rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-control-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-control-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.page-control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-numbers-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-number-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.page-number-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.page-number-btn--active {
  background: #0f172a !important;
  color: #ffffff !important;
}

.pagination-sizes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475569;
}

.select-size {
  width: 100px;
}

.select-size select {
  padding: 0.4rem 1.5rem 0.4rem 0.65rem;
  font-size: 0.8rem;
}

/* 高保真滑入式弹窗（Modal Drawer） */
.modal-backdrop-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-container {
  width: 100%;
  max-width: 760px; /* 放宽表单弹窗上限宽度，防止局促 */
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
}

.user-form-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

.form-title-text {
  font-size: 1.15rem;
  font-weight: 700;
}

.close-modal-x-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-modal-x-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.close-modal-x-btn svg {
  width: 20px;
  height: 20px;
}

/* 核心优化：高保真表单网格，使用 minmax(0, 1fr) 防爆宽保护 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem 1.75rem;
  padding: 2.25rem;
}

.form-grid__wide {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap; /* 表单标题不换行保护 */
}

.required-star {
  color: #ef4444;
}

/* 包装层与光晕 */
.input-wrapper,
.select-wrapper {
  position: relative;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  transition: all 0.2s ease;
  overflow: hidden;
}

.input-wrapper:focus-within,
.select-wrapper:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.input-wrapper--disabled,
.select-wrapper--disabled {
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
  cursor: not-allowed;
}

.input-wrapper--disabled input {
  color: #64748b;
  cursor: not-allowed;
}

.input-wrapper input,
.select-wrapper select {
  width: 100%;
  min-width: 0;
  padding: 0.7rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #0f172a;
  outline: none;
}

.select-wrapper select {
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #64748b;
  pointer-events: none;
}

/* 部门与管理员复选卡片 */
.checkbox-controls-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.user-checkbox-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.1rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  flex: 1;
  min-width: 240px;
}

.user-checkbox-card input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkbox-indicator {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  transition: all 0.15s;
  flex-shrink: 0;
}

.user-checkbox-card:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}

/* 复选选中状态 */
.user-checkbox-card input:checked ~ .checkbox-indicator {
  border-color: #2563eb;
  background: #2563eb;
}

.user-checkbox-card input:checked ~ .checkbox-indicator::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #334155;
  transition: color 0.15s;
  white-space: nowrap; /* 强制防换行 */
}

.user-checkbox-card input:checked ~ .checkbox-label-text {
  color: #1e40af;
  font-weight: 600;
}

.user-checkbox-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #e2e8f0 !important;
}

.user-checkbox-card--disabled:hover {
  border-color: #cbd5e1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
}

/* 全局 Toast 提示 */
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
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 10000;
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

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .dashboard-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .user-table__head {
    display: none;
  }
  .user-table__row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1.1rem;
  }
  .user-row-actions {
    width: 100%;
    justify-content: space-between;
  }
  .form-grid {
    grid-template-columns: 1fr;
    padding: 1.5rem;
  }
  .form-grid__wide {
    grid-column: span 1;
  }
  .search-input-wrapper {
    width: 100%;
  }
  .panel-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-info {
    max-width: 100%;
  }
  .toolbar-actions {
    margin-left: 0;
    justify-content: space-between;
  }
}
</style>