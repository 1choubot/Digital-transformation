<template>
  <!-- 恢复登录态的整屏加载框 -->
  <section v-if="authLoading" class="app-loading-screen">
    <div class="loading-container">
      <div class="loading-wave">
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
      </div>
      <p>正在恢复登录状态，请稍候...</p>
    </div>
  </section>

  <!-- 登录页面组件 -->
  <LoginPage
    v-else-if="!currentUser"
    :initial-message="authMessage"
    @logged-in="handleLoggedIn"
  />

  <!-- 登录后的高保真主控制台外壳 -->
  <div v-else class="app-shell">
    
    <!-- 1. 左侧高级深色侧边栏导航 -->
    <aside class="app-sidebar" :class="{ 'app-sidebar--open': isSidebarOpen }">
      <!-- 平台通用高保真 Brand Logo -->
      <div class="brand-logo-area">
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
          <span class="brand-subtitle">DIGITAL MANAGEMENT PLATFORM</span>
        </div>
      </div>

      <!-- 核心功能导航组 -->
      <nav class="sidebar-nav">
        <p class="nav-section-title">项目主数据</p>
        <button 
          type="button" 
          :class="{ active: route.name === 'projects' }" 
          @click="handleNavigate('/projects')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          <span>项目列表</span>
        </button>
        <p class="nav-section-title">日报周报</p>
        <button
          v-if="isDailyReportUser"
          type="button"
          :class="{ active: route.name === 'daily-report' }"
          @click="handleNavigate('/daily-report')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>我的日报</span>
        </button>
        <button
          v-if="isDailyReportUser"
          type="button"
          :class="{ active: route.name === 'daily-reports' }"
          @click="handleNavigate('/daily-reports')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
          </svg>
          <span>日报列表</span>
        </button>

        <button 
          type="button" 
          :class="{ active: route.name === 'project-create' }" 
          @click="handleNavigate('/projects/new')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>新建项目</span>
        </button>

        <p class="nav-section-title">过程追踪看板</p>
        <button 
          type="button" 
          :class="{ active: route.name === 'project-overview-dashboard' }" 
          @click="handleNavigate('/projects/overview-dashboard')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke-linecap="round"/>
            <path d="M22 12A10 10 0 0 0 12 2v10z" stroke-linecap="round"/>
          </svg>
          <span>项目总览</span>
        </button>

        <button 
          type="button" 
          :class="{ active: route.name === 'my-stage-document-tasks' }" 
          @click="handleNavigate('/my-stage-document-tasks')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>我的资料任务</span>
        </button>

        <p v-if="canAccessUserManagement" class="nav-section-title">系统管理员特权</p>
        <button 
          v-if="canAccessUserManagement"
          type="button" 
          :class="{ active: route.name === 'users' }" 
          @click="handleNavigate('/users')"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>用户管理</span>
        </button>
      </nav>

      <!-- 侧边栏底部版权 -->
      <footer class="sidebar-footer">
        <span>© 2026 数字化管理平台</span>
      </footer>
    </aside>

    <!-- 移动端侧边栏半透明遮罩背景 -->
    <div 
      v-if="isSidebarOpen" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>

    <!-- 右侧核心工作区容器 -->
    <div class="main-container">
      
      <!-- 2. 顶部分层控制台顶栏 -->
      <header class="app-header">
        <div class="app-header__left">
          <!-- 移动端汉堡菜单触发按钮 -->
          <button type="button" class="mobile-menu-toggle" @click="toggleSidebar" aria-label="切换侧边栏">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          
          <!-- 面包屑/板块当前定位指示 -->
          <div class="header-breadcrumbs">
            <span class="breadcrumb-item">数字化管理平台</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item breadcrumb-item--active">{{ currentRouteLabel }}</span>
          </div>
        </div>

        <!-- 个人账户操作区 -->
        <div class="current-user">
          <div class="user-avatar">
            {{ String(currentUser.name || 'U').charAt(0) }}
          </div>
          <div class="user-info">
            <strong class="user-name">{{ currentUser.name }}</strong>
            <span class="user-role-desc">
              {{ formatOrganizationRole(currentUser.organizationRole) }} <span class="divider">/</span>
              {{ currentUser.department ? formatBusinessDepartment(currentUser.department) : '全局级' }}
            </span>
          </div>
          <button type="button" class="logout-button" :disabled="loggingOut" @click="handleLogout" title="退出系统">
            <span v-if="loggingOut" class="spinner"></span>
            <svg v-else class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- 3. 子页面渲染主视口 (独立温和滚动，并带有渐入位移过渡) -->
      <main class="app-main animate-content" ref="appMainRef">
        <ProjectListPage
          v-if="route.name === 'projects'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
        />
        <ProjectCreatePage
          v-else-if="route.name === 'project-create'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <ProjectOverviewDashboardPage
          v-else-if="route.name === 'project-overview-dashboard'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <ProjectDetailPage
          v-else-if="route.name === 'project-detail'"
          :auth-token="authToken"
          :current-user="currentUser"
          :project-id="route.params.projectId"
          :navigate="navigate"
        />
        <MyStageDocumentTasksPage
          v-else-if="route.name === 'my-stage-document-tasks'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <DailyReportPage
          v-else-if="route.name === 'daily-report'"
          :auth-token="authToken"
          :current-user="currentUser"
          :report-id="route.params?.reportId || ''"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <DailyReportListPage
          v-else-if="route.name === 'daily-reports'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <UserManagementPage
          v-else-if="route.name === 'users'"
          :auth-token="authToken"
          :current-user="currentUser"
          :navigate="navigate"
          @auth-expired="handleAuthExpired"
        />
        <section v-else class="state-panel">
          <h2>页面不存在</h2>
          <p>当前页面无法在数字化平台路由映射表中寻得，可能已被删除或搬迁。</p>
          <button type="button" class="primary-button" @click="navigate('/projects')">返回主控制台</button>
        </section>
      </main>
    </div>

    <!-- 全局统一样式的 Toast 消息弹出层 -->
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick, onUnmounted } from 'vue';
import { getCurrentUser, logout as logoutRequest } from './api/auth.js';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  updateStoredUser
} from './auth/session.js';
import DailyReportListPage from './pages/DailyReportListPage.vue';
import DailyReportPage from './pages/DailyReportPage.vue';
import LoginPage from './pages/LoginPage.vue';
import MyStageDocumentTasksPage from './pages/MyStageDocumentTasksPage.vue';
import ProjectCreatePage from './pages/ProjectCreatePage.vue';
import ProjectDetailPage from './pages/ProjectDetailPage.vue';
import ProjectListPage from './pages/ProjectListPage.vue';
import ProjectOverviewDashboardPage from './pages/ProjectOverviewDashboardPage.vue';
import UserManagementPage from './pages/UserManagementPage.vue';
import { useHashRouter } from './router.js';
import {
  formatBusinessDepartment,
  formatOrganizationRole
} from './utils/format.js';

const { route, navigate } = useHashRouter();
const authLoading = ref(true);
const loggingOut = ref(false);
const authToken = ref('');
const currentUser = ref(null);
const authMessage = ref('');
const appMainRef = ref(null);

const isSidebarOpen = ref(false);

const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function toggleSidebar() { isSidebarOpen.value = !isSidebarOpen.value; }
function closeSidebar() { isSidebarOpen.value = false; }
function handleNavigate(path) { navigate(path); closeSidebar(); }

const currentRouteLabel = computed(() => {
  switch (route.value.name) {
    case 'projects': return '项目台账列表';
    case 'project-create': return '新建项目主数据';
    case 'project-overview-dashboard': return '跨项目齐套总览';
    case 'project-detail': return '项目详情控制台';
    case 'my-stage-document-tasks': return '我的待办责任资料';
    case 'users': return '基础用户权限管理';
    default: return '管理驾驶舱';
  }
});

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => { toastVisible.value = false; toastTimer = null; }, 3000);
}
function hideToast() {
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  toastVisible.value = false;
}

const canAccessUserManagement = computed(
  () => currentUser.value?.isPlatformAdmin && currentUser.value?.organizationRole === 'system_admin'
);
// Daily report navigation is shown only for employee accounts.
const isDailyReportUser = computed(() => currentUser.value?.organizationRole === 'employee');

function setAuth(token, user) {
  authToken.value = token;
  currentUser.value = user;
  storeAuthSession({ token, user });
}
function clearAuth(message = '') {
  authToken.value = '';
  currentUser.value = null;
  authMessage.value = message;
  clearAuthSession();
}
async function restoreAuth() {
  const token = getStoredToken();
  const storedUser = getStoredUser();
  if (!token) { authLoading.value = false; return; }
  authToken.value = token;
  currentUser.value = storedUser;
  try {
    const result = await getCurrentUser(token);
    currentUser.value = result.user;
    updateStoredUser(result.user);
  } catch {
    clearAuth('登录状态已失效，请重新登录。');
    showToast('您的登录状态已过期，请重新登录。', 'error');
  } finally { authLoading.value = false; }
}
function handleLoggedIn(result) {
  setAuth(result.token, result.user);
  authMessage.value = '';
  showToast(`${result.user.name}，欢迎回来！`, 'success');
  navigate('/projects');
}
async function handleLogout() {
  loggingOut.value = true;
  try { await logoutRequest(authToken.value); } catch {}
  finally {
    loggingOut.value = false;
    clearAuth('已退出登录。');
    showToast('您已成功安全退出登录。', 'success');
    navigate('/projects');
  }
}
function handleAuthExpired(message) {
  const expiredMsg = message || '请先登录后再继续操作。';
  clearAuth(expiredMsg);
  showToast(expiredMsg, 'error');
}
onUnmounted(() => { if (toastTimer) clearTimeout(toastTimer); });
watch(() => route.value, () => { nextTick(() => { if (appMainRef.value) appMainRef.value.scrollTop = 0; }); });
onMounted(restoreAuth);
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.app-shell {
  display: flex; height: 100vh; width: 100vw;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #0f172a; background: #f8fafc; overflow: hidden; position: relative;
}

/* 加载画面 */
.app-loading-screen {
  display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc;
}
.loading-container { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.loading-wave { display: flex; gap: 6px; }
.wave-bar {
  width: 4px; height: 24px; background: #0f172a; border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}
.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }
@keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
.app-loading-screen p { font-size: 0.9rem; color: #64748b; font-weight: 500; }

/* ===== 1. 高级深色侧边栏 ===== */
.app-sidebar {
  width: 260px; height: 100vh; background-color: #0f172a; /* 深色背景，与登录按钮同色系 */
  display: flex; flex-direction: column; flex-shrink: 0; z-index: 110;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.brand-logo-area {
  padding: 1.5rem 1.75rem; display: flex; align-items: center; gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.logo-svg { width: 28px; height: 28px; color: #3b82f6; }
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-title { font-size: 1.15rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.01em; }
.brand-subtitle { font-size: 0.65rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.08em; }

.sidebar-nav {
  flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.35rem; overflow-y: auto;
}
.nav-section-title {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #64748b;
  letter-spacing: 0.08em; margin: 1rem 0.75rem 0.35rem;
}
.sidebar-nav button {
  width: 100%; padding: 0.65rem 0.85rem; background: transparent; border: none; border-radius: 8px;
  display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit; color: #cbd5e1; text-align: left;
}
.sidebar-nav button:hover { background-color: rgba(255, 255, 255, 0.05); color: #ffffff; }
.nav-icon { width: 18px; height: 18px; stroke: currentColor; flex-shrink: 0; }

.sidebar-nav button.active {
  background-color: #2563eb; color: #ffffff; /* 点击字体白色，蓝色背景 */
}
.sidebar-nav button.active .nav-icon { stroke: #ffffff; }
.sidebar-nav button span { font-size: 0.9rem; font-weight: 600; }

.sidebar-footer {
  padding: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;
}
.sidebar-footer span { font-size: 0.725rem; color: #64748b; font-weight: 500; }

/* 遮罩 */
.sidebar-overlay {
  position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px); z-index: 105; animation: fadeInOverlay 0.25s ease-out;
}
@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }

/* ===== 2. 右侧主容器 ===== */
.main-container { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

.app-header {
  height: 70px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: space-between; padding: 0 2.5rem;
  flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 20, 40, 0.015); z-index: 100;
}
.app-header__left { display: flex; align-items: center; gap: 1rem; }
.mobile-menu-toggle {
  display: none; background: none; border: none; color: #334155; cursor: pointer;
  padding: 0.35rem; border-radius: 6px; transition: background-color 0.2s;
}
.mobile-menu-toggle:hover { background-color: #f1f5f9; }
.mobile-menu-toggle svg { width: 22px; height: 22px; }

.header-breadcrumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; color: #64748b; }
.breadcrumb-separator { color: #cbd5e1; }
.breadcrumb-item--active { color: #0f172a; font-weight: 700; }

.current-user { display: flex; align-items: center; gap: 0.85rem; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff; font-weight: 700; font-size: 0.95rem;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
}
.user-info { display: flex; flex-direction: column; line-height: 1.3; }
.user-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
.user-role-desc { font-size: 0.725rem; color: #94a3b8; font-weight: 500; }
.divider { color: #cbd5e1; margin: 0 0.1rem; }

.logout-button {
  background: transparent; border: 1px solid #e2e8f0; padding: 0.45rem;
  border-radius: 8px; color: #64748b; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.logout-button:hover:not(:disabled) { border-color: #fca5a5; color: #ef4444; background-color: #fef2f2; }
.logout-button:disabled { opacity: 0.6; cursor: not-allowed; }
.logout-icon { width: 18px; height: 18px; }
.spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(239, 68, 68, 0.2); border-top: 2px solid #ef4444;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 3. 主视口 ===== */
.app-main {
  flex: 1; overflow-y: auto; overflow-x: hidden; max-width: 1600px; width: 100%;
  margin: 0 auto; padding: 1.75rem 2.5rem;
}
.app-main::-webkit-scrollbar { width: 6px; }
.app-main::-webkit-scrollbar-track { background: transparent; }
.app-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.app-main::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.animate-content { animation: contentFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes contentFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.state-panel {
  text-align: center; padding: 5rem 2rem; background: #ffffff; border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.02); border: 1px solid #e2e8f0;
}
.state-panel h2 { font-size: 1.35rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
.state-panel p { font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem; }
.primary-button {
  background: #0f172a; border: none; padding: 0.65rem 1.5rem; border-radius: 8px;
  font-weight: 600; font-size: 0.875rem; color: #ffffff; cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}
.primary-button:hover { background: #1e293b; }

/* ===== Toast ===== */
.toast {
  position: fixed; top: 2rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px; background: #ffffff; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem; font-weight: 500; color: #0f172a; z-index: 10000;
  border: 1px solid #f1f5f9; max-width: 90%;
}
.toast--error { border-left: 4px solid #ef4444; }
.toast--error .toast-icon { stroke: #dc2626; flex-shrink: 0; width: 20px; height: 20px; }
.toast--success { border-left: 4px solid #22c55e; }
.toast--success .toast-icon { stroke: #16a34a; flex-shrink: 0; width: 20px; height: 20px; }
.toast-close {
  display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border: none; background: transparent; cursor: pointer; padding: 0; margin-left: 0.5rem;
  flex-shrink: 0; border-radius: 50%; transition: background 0.2s; color: #94a3b8;
}
.toast-close:hover { background: #f1f5f9; }
.toast-close svg { width: 14px; height: 14px; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }

/* 响应式 */
@media (max-width: 1024px) {
  .app-header { padding: 0 1.5rem; }
  .app-main { padding: 1.5rem; }
}
@media (max-width: 768px) {
  .app-sidebar { position: fixed; top: 0; bottom: 0; left: 0; transform: translateX(-100%); }
  .app-sidebar--open { transform: translateX(0); }
  .mobile-menu-toggle { display: flex; }
  .app-header { padding: 0 1rem; height: 60px; }
  .header-breadcrumbs { display: none; }
  .user-info { display: none; }
  .app-main { padding: 1rem; }
}
</style>