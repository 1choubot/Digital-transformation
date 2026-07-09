<template>
  <section v-if="authLoading" class="state-panel app-loading">
    <p>正在恢复登录状态...</p>
  </section>

  <LoginPage
    v-else-if="!currentUser"
    :initial-message="authMessage"
    @logged-in="handleLoggedIn"
  />

  <div v-else class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <div class="app-header__brand">
          <span class="app-header__eyebrow">数字化管理平台</span>
          <h1>项目核心管理</h1>
        </div>
        <nav class="app-nav" aria-label="主导航">
          <button
            type="button"
            :class="{ active: isProjectOverviewEntryActive }"
            @click="navigate('/projects')"
          >
            项目总览
          </button>
          <button
            v-if="canCurrentUserCreateProject"
            type="button"
            :class="{ active: route.name === 'project-create' }"
            @click="navigate('/projects/new')"
          >
            新建项目
          </button>
          <button
            type="button"
            :class="{ active: route.name === 'my-workbench' }"
            @click="navigate('/my-workbench')"
          >
            我的工作台
          </button>
          <button
            v-if="canUseDailyReport"
            type="button"
            :class="{ active: route.name === 'daily-report' }"
            @click="navigate('/daily-report')"
          >
            填日报
          </button>
          <button
            v-if="canUseDailyReport"
            type="button"
            :class="{ active: route.name === 'daily-reports' }"
            @click="navigate('/daily-reports')"
          >
            我的日报
          </button>
          <button
            v-if="canUseWeeklyReport"
            type="button"
            :class="{ active: route.name === 'weekly-report' }"
            @click="navigate('/weekly-report')"
          >
            填周报
          </button>
          <button
            v-if="canUseWeeklyReport"
            type="button"
            :class="{ active: route.name === 'weekly-reports' }"
            @click="navigate('/weekly-reports')"
          >
            我的周报
          </button>
          <button
            v-if="canReadWeeklyOverview"
            type="button"
            :class="{ active: isWeeklyOverviewEntryActive }"
            @click="navigate('/weekly-overview')"
          >
            周报审批
          </button>
          <button
            v-if="canReadCenterDailyReport"
            type="button"
            :class="{ active: route.name === 'center-daily-report' }"
            @click="navigate('/center-daily-report')"
          >
            中心日报
          </button>
          <button
            v-if="canAccessUserManagement"
            type="button"
            :class="{ active: route.name === 'users' }"
            @click="navigate('/users')"
          >
            用户管理
          </button>
        </nav>
        <div class="current-user">
          <div>
            <strong>{{ formatUserName(currentUser) }}</strong>
            <span>{{ formatUserMeta(currentUser) || '未记录部门岗位' }}</span>
          </div>
          <button type="button" class="ghost-button" :disabled="loggingOut" @click="handleLogout">
            {{ loggingOut ? '正在退出...' : '退出登录' }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <ProjectCreatePage
        v-if="route.name === 'project-create'"
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
        :task-mode="route.query?.taskMode || ''"
        :focus-document-id="route.query?.documentId || ''"
        :focus-stage-id="route.query?.stageId || ''"
        :focus-node-key="route.query?.focusNodeKey || route.query?.nodeKey || ''"
        :navigate="navigate"
      />
      <MyStageDocumentTasksPage
        v-else-if="route.name === 'my-workbench'"
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
      <WeeklyReportReviewListPage
        v-else-if="route.name === 'weekly-overview'"
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
        :route="route"
        :navigate="navigate"
        @auth-expired="handleAuthExpired"
      />
      <CenterDailyReportPage
        v-else-if="route.name === 'center-daily-report'"
        :auth-token="authToken"
        :current-user="currentUser"
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
        <p>当前地址无法匹配到项目核心页面。</p>
        <button type="button" class="primary-button" @click="navigate('/projects')">返回项目总览</button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getCurrentUser, logout as logoutRequest } from './api/auth.js';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  updateStoredUser
} from './auth/session.js';
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
import { formatUserMeta, formatUserName } from './utils/format.js';

const { route, navigate } = useHashRouter();
const authLoading = ref(true);
const loggingOut = ref(false);
const authToken = ref('');
const currentUser = ref(null);
const authMessage = ref('');
const canAccessUserManagement = computed(
  () => currentUser.value?.isPlatformAdmin && currentUser.value?.organizationRole === 'system_admin'
);
const canCurrentUserCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(currentUser.value?.organizationRole)
);
const canUseDailyReport = computed(() => currentUser.value?.organizationRole === 'employee');
const canUseWeeklyReport = computed(() =>
  ['employee', 'center_manager'].includes(currentUser.value?.organizationRole)
);
const canReadWeeklyOverview = computed(() =>
  ['center_manager', 'general_manager', 'general_manager_assistant'].includes(currentUser.value?.organizationRole)
);
const canReadCenterDailyReport = computed(() =>
  ['center_manager', 'general_manager', 'general_manager_assistant', 'system_admin'].includes(
    currentUser.value?.organizationRole
  )
);
const isProjectOverviewEntryActive = computed(() =>
  ['project-overview-dashboard', 'project-detail'].includes(route.value.name)
);
const isWeeklyOverviewEntryActive = computed(() =>
  ['weekly-overview', 'weekly-report-review'].includes(route.value.name)
);

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
  } finally {
    authLoading.value = false;
  }
}

function handleLoggedIn(result) {
  setAuth(result.token, result.user);
  authMessage.value = '';
  navigate('/projects');
}

async function handleLogout() {
  loggingOut.value = true;

  try {
    await logoutRequest(authToken.value);
  } catch {
    // 本地退出优先，后端无效登录态也会在后续请求中被拒绝。
  } finally {
    loggingOut.value = false;
    clearAuth('已退出登录。');
    navigate('/projects');
  }
}

function handleAuthExpired(message) {
  clearAuth(message || '请先登录后再继续操作。');
}

onMounted(restoreAuth);
</script>
