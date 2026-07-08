<template>
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

  <LoginPage
    v-else-if="!currentUser"
    :initial-message="authMessage"
    @logged-in="handleLoggedIn"
  />

  <MainLayout
    v-else
    :auth-token="authToken"
    :current-user="currentUser"
    :route="route"
    :logging-out="loggingOut"
    @navigate="navigate"
    @logout="handleLogout"
    @auth-expired="handleAuthExpired"
  >
    <ProjectCreatePage
      v-if="route.name === 'project-create'"
      :auth-token="authToken"
      :current-user="currentUser"
      :navigate="navigate"
      @auth-expired="handleAuthExpired"
    />
    <ProjectOverviewDashboardPage
      v-else-if="['projects', 'project-overview-dashboard'].includes(route.name)"
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
      :task-mode="route.query?.taskMode || ''"
      :focus-document-id="route.query?.documentId || ''"
      :focus-stage-id="route.query?.stageId || ''"
      :focus-node-key="route.params?.nodeCode || route.query?.nodeKey || ''"
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
    <WeeklyReportPage
      v-else-if="route.name === 'weekly-report'"
      :auth-token="authToken"
      :current-user="currentUser"
      :report-id="route.params?.reportId || ''"
      :navigate="navigate"
      @auth-expired="handleAuthExpired"
    />
    <WeeklyReportListPage
      v-else-if="route.name === 'weekly-reports'"
      :auth-token="authToken"
      :current-user="currentUser"
      :navigate="navigate"
      @auth-expired="handleAuthExpired"
    />
    <WeeklyReportReviewPage
      v-else-if="route.name === 'weekly-report-review'"
      :auth-token="authToken"
      :current-user="currentUser"
      :report-id="route.params?.reportId || ''"
      :navigate="navigate"
      :route="route"
      @auth-expired="handleAuthExpired"
    />
    <WeeklyReportReviewListPage
      v-else-if="route.name === 'weekly-report-overview'"
      :auth-token="authToken"
      :current-user="currentUser"
      :navigate="navigate"
      @auth-expired="handleAuthExpired"
    />
    <CenterDailyReportPage
      v-else-if="route.name === 'center-daily-report'"
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
  </MainLayout>

  <Transition name="toast">
    <div
      v-if="toastVisible"
      class="toast"
      :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }"
    >
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
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { getCurrentUser, logout as logoutRequest } from './api/auth.js';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  updateStoredUser
} from './auth/session.js';
import MainLayout from './layouts/MainLayout.vue';
import CenterDailyReportPage from './pages/CenterDailyReportPage.vue';
import DailyReportListPage from './pages/DailyReportListPage.vue';
import DailyReportPage from './pages/DailyReportPage.vue';
import LoginPage from './pages/LoginPage.vue';
import MyStageDocumentTasksPage from './pages/MyStageDocumentTasksPage.vue';
import ProjectCreatePage from './pages/ProjectCreatePage.vue';
import ProjectDetailPage from './pages/ProjectDetailPage.vue';
import ProjectOverviewDashboardPage from './pages/ProjectOverviewDashboardPage.vue';
import UserManagementPage from './pages/UserManagementPage.vue';
import WeeklyReportListPage from './pages/WeeklyReportListPage.vue';
import WeeklyReportPage from './pages/WeeklyReportPage.vue';
import WeeklyReportReviewListPage from './pages/WeeklyReportReviewListPage.vue';
import WeeklyReportReviewPage from './pages/WeeklyReportReviewPage.vue';
import { useHashRouter } from './router.js';

const { route, navigate: baseNavigate } = useHashRouter();

const authLoading = ref(true);
const loggingOut = ref(false);
const authToken = ref('');
const currentUser = ref(null);
const authMessage = ref('');
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function navigate(path) {
  baseNavigate(path);
}

function showToast(message, type = 'error') {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastMessage.value = message;
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
  if (!token) {
    authLoading.value = false;
    return;
  }

  authToken.value = token;
  currentUser.value = storedUser;
  try {
    const result = await getCurrentUser(token);
    currentUser.value = result.user;
    updateStoredUser(result.user);
  } catch {
    clearAuth('登录状态已失效，请重新登录。');
    showToast('您的登录状态已过期，请重新登录。', 'error');
  } finally {
    authLoading.value = false;
  }
}

function handleLoggedIn(result) {
  setAuth(result.token, result.user);
  authMessage.value = '';
  showToast(`${result.user.name}，欢迎回来！`, 'success');
  const isAdmin = result.user.isPlatformAdmin && result.user.organizationRole === 'system_admin';
  navigate(isAdmin ? '/users' : '/projects');
}

async function handleLogout() {
  loggingOut.value = true;
  try {
    await logoutRequest(authToken.value);
  } catch {
    // Local session cleanup still needs to run even if the server logout request fails.
  } finally {
    loggingOut.value = false;
    clearAuth('已退出登录。');
    showToast('您已成功安全退出登录。', 'success');
    navigate('/projects');
  }
}

function handleAuthExpired(message) {
  const expiredMessage = message || '请先登录后再继续操作。';
  clearAuth(expiredMessage);
  showToast(expiredMessage, 'error');
}

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
});

onMounted(restoreAuth);
</script>

<style scoped>
.app-loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f6f9;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-wave {
  display: flex;
  gap: 6px;
}

.wave-bar {
  width: 4px;
  height: 24px;
  border-radius: 4px;
  background: #3e63dd;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.15s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes wave {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}

.app-loading-screen p {
  color: #909399;
  font-size: 0.9rem;
  font-weight: 500;
}

.state-panel {
  margin: 1.5rem;
  border: 0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  padding: 5rem 2rem;
  text-align: center;
}

.state-panel h2 {
  margin-bottom: 0.5rem;
  color: #303133;
  font-size: 1.25rem;
  font-weight: 600;
}

.state-panel p {
  margin-bottom: 1.5rem;
  color: #909399;
  font-size: 0.9rem;
}

.primary-button {
  height: 36px;
  border: 0;
  border-radius: 4px;
  background: #3e63dd;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1.5rem;
  transition: all 0.2s;
}

.primary-button:hover {
  background: #5275e7;
}

.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  z-index: 10000;
  max-width: 90%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transform: translateX(-50%);
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: #303133;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.7rem 1rem;
}

.toast--error {
  border-left: 4px solid #f56c6c;
}

.toast--success {
  border-left: 4px solid #67c23a;
}

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast--error .toast-icon {
  stroke: #f56c6c;
}

.toast--success .toast-icon {
  stroke: #67c23a;
}

.toast-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 0.5rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.toast-close:hover {
  background: #f4f4f5;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
