<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="基础配置"
      title="用户管理"
      :current-user="currentUser"
      subtitle="维护数字化平台账号、组织角色和基础状态；不代表文件平台权限。"
    >
      <template #actions>
        <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目总览</button>
      </template>
    </PageHeader>

    <section v-if="!canAccessUserManagement" class="state-panel state-panel--error">
      <h3>无权限访问</h3>
      <p>用户管理仅平台管理员可进入。该入口只保护用户管理本身，不代表项目、资料或文件权限。</p>
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

            <button type="button" class="primary-button create-user-btn" @click="openCreateModal">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span class="create-user-btn-text">录入平台新成员</span>
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

        <!-- 数据加载失败（页面级错误，保留在页面内） -->
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

        <!-- 极致优化的 5列 强合并流式行表格 -->
        <div v-else class="table-container">
          <div class="user-table">
            <div class="user-table__head">
              <span>账户信息</span>
              <span>组织与部门</span>
              <span>岗位职务</span>
              <span>状态权限</span>
              <span class="text-right">管理操作</span>
            </div>

            <div class="user-table__body">
              <article v-for="user in paginatedUsers" :key="user.id" class="user-table__row">
                
                <!-- 列 1: 账号与身份集合 -->
                <div class="card-column min-w-0 gap-0.5">
                  <div class="flex items-center gap-2">
                    <strong class="text-[14px] font-bold text-slate-800 truncate" :title="user.name">{{ user.name }}</strong>
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
                
                <!-- 列 3: 岗位职务 -->
                <div class="card-column min-w-0">
                  <span class="text-[13px] text-slate-700 font-medium truncate" :title="user.role">
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
                
                <!-- 列 5: 交互动作组 -->
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
                  
                  <!-- 重置密码按钮（弹窗触发） -->
                  <button
                    type="button"
                    class="row-btn reset-pwd-btn"
                    :disabled="isActionPending(user.id, 'reset-password')"
                    @click="openResetPasswordModal(user)"
                  >
                    重置密码
                  </button>
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

      <!-- 磨砂滑入式配置弹窗（Modal Drawer） — 已移除内部提示区块，所有反馈通过 Toast 展示 -->
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

          <!-- 操作区（已移除提示区块，所有反馈通过 Toast 展示） -->
          <div class="form-actions form-grid__wide">
            <button type="button" class="ghost-button" @click="closeModal">取消</button>
            <button type="submit" class="primary-button submit-btn" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? '正在保存...' : editingUser ? '保存修改' : '确认新增用户' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 重置密码弹窗（已移除内部错误提示，所有反馈通过 Toast 展示） -->
      <div v-if="showResetModal" class="modal-backdrop-overlay animate-fadeIn" @click.self="closeResetModal">
        <div class="panel reset-modal-container animate-slideIn">
          <div class="reset-modal-header">
            <h3 class="reset-modal-title">重置密码</h3>
            <button type="button" class="close-modal-x-btn" @click="closeResetModal" aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="reset-modal-body">
            <p class="reset-user-info">正在为 <strong>{{ resetTargetUser?.account }}</strong> 设置新密码</p>
            <div class="form-group">
              <label class="label-text">新密码 <span class="required-star">*</span></label>
              <div class="input-wrapper">
                <input
                  v-model="resetNewPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="请输入新密码"
                  @keyup.enter="confirmResetPassword"
                />
              </div>
            </div>
            <!-- 错误提示已移除，统一使用 Toast -->
          </div>
          <div class="reset-modal-footer">
            <button type="button" class="ghost-button" @click="closeResetModal">取消</button>
            <button
              type="button"
              class="primary-button"
              :disabled="!resetNewPassword || saving"
              @click="confirmResetPassword"
            >
              {{ saving ? '重置中...' : '确认重置' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 统一 Toast 弹窗 — 所有操作反馈统一在此展示 -->
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
import PageHeader from '../components/PageHeader.vue';
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

// 重置密码弹窗状态
const showResetModal = ref(false);
const resetTargetUser = ref(null);
const resetNewPassword = ref('');

// 本地分页控制
const currentPage = ref(1);
const pageSize = ref(5);

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

// 统一监听所有反馈变量，通过 Toast 展示
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

// 重置密码弹窗控制
function openResetPasswordModal(user) {
  resetTargetUser.value = user;
  resetNewPassword.value = '';
  clientError.value = '';
  showResetModal.value = true;
}

function closeResetModal() {
  showResetModal.value = false;
  resetTargetUser.value = null;
  resetNewPassword.value = '';
  clientError.value = '';
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
    closeResetModal(); // 成功后关闭弹窗
  } catch (error) {
    handleRequestError(error);
    // 保留弹窗，显示错误
  } finally {
    pendingAction.value = '';
  }
}

// 弹窗确认重置
function confirmResetPassword() {
  if (!resetNewPassword.value) {
    clientError.value = '请填写新密码。';
    return;
  }
  // 将密码存入 resetPasswords 供 resetPassword 使用
  resetPasswords[resetTargetUser.value.id] = resetNewPassword.value;
  resetPassword(resetTargetUser.value);
}

onMounted(loadUsers);

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
/* 全局页面布局 - 引入类似图片的清爽浅色背景 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background-color: #f4f6f9;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* 扁平化面板基础样式 */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

/* 优化后的指标面板 */
.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 21, 41, 0.08);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #8c939d;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-value small {
  font-size: 0.8rem;
  font-weight: 500;
  color: #8c939d;
  margin-left: 2px;
}

/* 采用渐变色块包围白色图标，模仿图片中的入口图标风格 */
.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
  color: #ffffff;
}

.stat-card--blue .stat-icon-wrapper { background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%); }
.stat-card--emerald .stat-icon-wrapper { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-card--indigo .stat-icon-wrapper { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-card--amber .stat-icon-wrapper { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }


/* 按钮基础风格改造，采用更鲜亮的蓝色系 */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
  white-space: nowrap;
}

.ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
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
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
}

.primary-button:hover:not(:disabled) {
  background: #5275e7;
}

.primary-button:disabled {
  opacity: 0.6;
  background: #a0cfff;
  cursor: not-allowed;
}

/* 确保“录入平台新成员”按钮文字为白色 */
.create-user-btn-text {
  color: #ffffff !important;
}

/* 独立滑入提示区 */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: #ffffff;
}

.state-panel p {
  font-size: 0.9rem;
  color: #909399;
  margin-top: 0.5rem;
}

.state-panel--inline {
  padding: 3rem 1.5rem;
}

.state-panel--error {
  background: #fef0f0;
  border-radius: 8px;
  color: #f56c6c;
}

.state-panel--success {
  background: #f0f9eb;
  border-radius: 8px;
  color: #67c23a;
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke: #f56c6c;
  margin-bottom: 0.75rem;
}


/* 极简等待动画 */
.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 1rem;
}

.wave-bar {
  width: 4px;
  height: 20px;
  background: #3e63dd;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }

.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #c0c4cc;
  margin-bottom: 1rem;
}


/* 工具栏重新设计，增添左侧蓝色强调线 */
.list-panel {
  overflow: hidden;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 1rem;
}

.toolbar-info {
  display: flex;
  flex-direction: column;
  max-width: 50%;
}

.toolbar-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #303133;
  position: relative;
  padding-left: 10px;
}

.toolbar-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 4px;
  background: #3e63dd;
  border-radius: 2px;
}

.toolbar-subtitle {
  display: block;
  font-size: 0.8rem;
  color: #909399;
  margin-top: 0.4rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-left: auto;
}

/* 搜索框样式扁平化 */
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
  color: #c0c4cc;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.45rem 2rem 0.45rem 2.2rem;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  font-size: 0.875rem;
  color: #303133;
  outline: none;
  transition: all 0.2s ease;
  height: 36px;
}

.search-input:focus {
  border-color: #3e63dd;
}

.search-input::placeholder {
  color: #c0c4cc;
}

.search-clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #c0c4cc;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.2s;
}

.search-clear-btn svg {
  width: 14px;
  height: 14px;
}

.search-clear-btn:hover {
  color: #909399;
}


/* 表格区域美化 */
.table-container {
  overflow-x: auto;
  width: 100%;
}

.user-table {
  min-width: 900px;
  width: 100%;
  border-collapse: collapse;
}

.user-table__head {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 2.2fr);
  padding: 1rem 1.5rem;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  font-size: 0.8rem;
  font-weight: 500;
  color: #909399;
  gap: 1rem;
}

/* 右对齐辅助类 */
.text-right {
  text-align: right;
}

.user-table__body {
  display: flex;
  flex-direction: column;
}

.user-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 2.2fr);
  padding: 1rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  transition: background 0.2s ease;
  font-size: 13px;
  gap: 1rem;
}

.user-table__row:hover {
  background: #fdfdfe;
}

.user-table__row:last-child {
  border-bottom: none;
}

.card-column {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.mono-badge {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  width: fit-content;
}

/* 管理员徽章 — 自动匹配文字长度，不横向拉伸 */
.admin-badge {
  display: inline-block;
  width: fit-content;
  white-space: nowrap;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.admin-badge--yes {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}

.mono-code {
  font-family: Consolas, monospace;
  color: #c0c4cc;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  background: #f4f4f5;
  color: #909399;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
  border: 1px solid #e9e9eb;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  width: fit-content;
}

.status-indicator--active {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.status-indicator--disabled {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

/* 交互动作组 */
.user-row-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
  white-space: nowrap;
}

.row-btn {
  padding: 0.35rem 0.65rem;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266;
  white-space: nowrap;
}

.edit-btn:hover {
  border-color: #a4b3ff;
  color: #3e63dd;
  background: #f0f3ff;
}

.toggle-btn--disable:hover {
  border-color: #fbc4c4;
  color: #f56c6c;
  background: #fef0f0;
}

.toggle-btn--enable:hover {
  border-color: #e1f3d8;
  color: #67c23a;
  background: #f0f9eb;
}

.reset-pwd-btn:hover {
  border-color: #ffd6a0;
  color: #e6a23c;
  background: #fdf6ec;
}

.reset-pwd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 重置密码弹窗样式 */
.reset-modal-container {
  width: 100%;
  max-width: 480px;
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.reset-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.reset-modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.reset-modal-body {
  margin-bottom: 1.5rem;
}

.reset-user-info {
  font-size: 0.9rem;
  color: #606266;
  margin-top: 0;
  margin-bottom: 1.25rem;
}

.reset-user-info strong {
  color: #3e63dd;
}

.reset-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #ebeef5;
  padding-top: 1rem;
}

/* 扁平化分页面板 */
.pagination-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #606266;
  flex-wrap: wrap;
}

.page-current-highlight {
  font-weight: 600;
  color: #3e63dd;
  background: #f0f3ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.pagination-info .divider {
  color: #ebeef5;
  margin: 0 0.5rem;
}

.search-indicator {
  font-style: italic;
  color: #3e63dd;
  font-size: 0.8rem;
  margin-left: 0.25rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-control-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-control-btn:hover:not(:disabled) {
  color: #3e63dd;
  border-color: #a4b3ff;
}

.page-control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f4f4f5;
}

.page-numbers-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-number-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.page-number-btn:hover {
  color: #3e63dd;
  border-color: #a4b3ff;
}

.page-number-btn--active {
  background: #3e63dd !important;
  color: #ffffff !important;
  border-color: #3e63dd !important;
}

.pagination-sizes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #606266;
}

.select-size {
  width: 100px;
}

.select-size select {
  padding: 0.3rem 1.5rem 0.3rem 0.65rem;
  font-size: 0.8rem;
}


/* 高保真滑入式弹窗（Modal Drawer） */
.modal-backdrop-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-container {
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  border: none;
}

.user-form-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 1rem;
}

.form-title-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
}

.section-eyebrow {
  font-size: 0.8rem;
  color: #909399;
}

.close-modal-x-btn {
  background: transparent;
  border: none;
  color: #909399;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-modal-x-btn:hover {
  background: #f4f4f5;
  color: #606266;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem 1.75rem;
  padding: 2rem;
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
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.required-star {
  color: #f56c6c;
}

/* 包装层与光晕 */
.input-wrapper,
.select-wrapper {
  position: relative;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  transition: border-color 0.2s ease;
  overflow: hidden;
}

.input-wrapper:focus-within,
.select-wrapper:focus-within {
  border-color: #3e63dd;
}

.input-wrapper--disabled,
.select-wrapper--disabled {
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  cursor: not-allowed;
}

.input-wrapper--disabled input {
  color: #c0c4cc;
  cursor: not-allowed;
}

.input-wrapper input,
.select-wrapper select {
  width: 100%;
  min-width: 0;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
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
  border-top: 5px solid #c0c4cc;
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
  padding: 0.8rem 1rem;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
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
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  background: #ffffff;
  transition: all 0.2s;
  flex-shrink: 0;
}

.user-checkbox-card:hover {
  border-color: #c6e2ff;
}

/* 复选选中状态 */
.user-checkbox-card input:checked ~ .checkbox-indicator {
  border-color: #3e63dd;
  background: #3e63dd;
}

.user-checkbox-card input:checked ~ .checkbox-indicator::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.user-checkbox-card input:checked ~ .checkbox-label-text {
  color: #3e63dd;
}

.user-checkbox-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f5f7fa !important;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #ebeef5;
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
  padding: 0.7rem 1rem;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}

.toast--error { border-left: 4px solid #f56c6c; }
.toast--error .toast-icon { stroke: #f56c6c; flex-shrink: 0; width: 20px; height: 20px; }

.toast--success { border-left: 4px solid #67c23a; }
.toast--success .toast-icon { stroke: #67c23a; flex-shrink: 0; width: 20px; height: 20px; }

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
  color: #c0c4cc;
}
.toast-close:hover { background: #f4f4f5; }
.toast-close svg { width: 14px; height: 14px; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

@keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

/* 响应式调整 */
@media (max-width: 1200px) {
  .dashboard-stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .page-stack { padding: 1rem; }
  .user-table__head { display: none; }
  .user-table__row { grid-template-columns: 1fr; gap: 0.75rem; padding: 1.1rem; }
  .user-row-actions { width: 100%; justify-content: space-between; }
  .form-grid { grid-template-columns: 1fr; padding: 1.5rem; }
  .form-grid__wide { grid-column: span 1; }
  .search-input-wrapper { width: 100%; }
  .panel-toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-info { max-width: 100%; }
  .toolbar-actions { margin-left: 0; justify-content: space-between; }
}
</style>