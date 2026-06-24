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
      <div class="app-header__brand">
        <span class="app-header__eyebrow">数字化管理平台</span>
        <h1>项目核心管理</h1>
      </div>
      <nav class="app-nav">
        <button type="button" :class="{ active: route.name === 'projects' }" @click="navigate('/projects')">
          项目列表
        </button>
        <button type="button" :class="{ active: route.name === 'project-create' }" @click="navigate('/projects/new')">
          新建项目
        </button>
        <button
          type="button"
          :class="{ active: route.name === 'project-overview-dashboard' }"
          @click="navigate('/projects/overview-dashboard')"
        >
          项目总览
        </button>
        <button
          type="button"
          :class="{ active: route.name === 'my-stage-document-tasks' }"
          @click="navigate('/my-stage-document-tasks')"
        >
          我的资料任务
        </button>
        <button
          v-if="currentUser.isPlatformAdmin"
          type="button"
          :class="{ active: route.name === 'users' }"
          @click="navigate('/users')"
        >
          用户管理
        </button>
      </nav>
      <div class="current-user">
        <div>
          <strong>{{ currentUser.name }}</strong>
          <span>{{ currentUser.department }} / {{ currentUser.role }}</span>
        </div>
        <button type="button" class="ghost-button" :disabled="loggingOut" @click="handleLogout">
          {{ loggingOut ? '正在退出...' : '退出登录' }}
        </button>
      </div>
    </header>

    <main class="app-main" ref="appMainRef">
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
        <button type="button" class="primary-button" @click="navigate('/projects')">返回项目列表</button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue';
import { getCurrentUser, logout as logoutRequest } from './api/auth.js';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  updateStoredUser
} from './auth/session.js';
import LoginPage from './pages/LoginPage.vue';
import MyStageDocumentTasksPage from './pages/MyStageDocumentTasksPage.vue';
import ProjectCreatePage from './pages/ProjectCreatePage.vue';
import ProjectDetailPage from './pages/ProjectDetailPage.vue';
import ProjectListPage from './pages/ProjectListPage.vue';
import ProjectOverviewDashboardPage from './pages/ProjectOverviewDashboardPage.vue';
import UserManagementPage from './pages/UserManagementPage.vue';
import { useHashRouter } from './router.js';

const { route, navigate } = useHashRouter();
const authLoading = ref(true);
const loggingOut = ref(false);
const authToken = ref('');
const currentUser = ref(null);
const authMessage = ref('');
const appMainRef = ref(null);

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

// 监听路由变化，重置滚动位置到顶部
watch(
  () => route.value,
  () => {
    nextTick(() => {
      if (appMainRef.value) {
        appMainRef.value.scrollTop = 0;
      }
    });
  }
);

onMounted(restoreAuth);
</script>

<style scoped>
/* ===== 全局重置 & 基础 ===== */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background: #f8fafc;
  overflow: hidden;
}

/* ===== 加载状态 ===== */
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #64748b;
  background: #f8fafc;
}

.app-loading p {
  font-size: 1rem;
}

/* ===== 固定顶部导航 ===== */
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.85rem 2rem;
  background: white;
  border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  z-index: 100;
}

.app-header__brand {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex-shrink: 0;
}

.app-header__eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.app-header__brand h1 {
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 0;
}

/* ===== 导航 ===== */
.app-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  flex-wrap: wrap;
}

.app-nav button {
  padding: 0.5rem 1.1rem;
  background: transparent;
  border: none;
  border-radius: 30px;
  font-size: 0.92rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;
}

.app-nav button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.app-nav button.active {
  background: #eef2ff;
  color: #4338ca;
}

/* ===== 用户信息 ===== */
.current-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.current-user > div {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  text-align: right;
}

.current-user strong {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

.current-user span {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* ===== 按钮 ===== */
.ghost-button {
  background: transparent;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1.1rem;
  border-radius: 30px;
  font-weight: 500;
  font-size: 0.88rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  background: white;
  font-family: inherit;
}

.ghost-button:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button {
  background: #2563eb;
  border: none;
  padding: 0.6rem 1.6rem;
  border-radius: 40px;
  font-weight: 500;
  font-size: 0.92rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  font-family: inherit;
}

.primary-button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
}

/* ===== 主内容 - 独立滚动容器 ===== */
.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 1.75rem 2rem;
}

/* 自定义滚动条样式（可选） */
.app-main::-webkit-scrollbar {
  width: 6px;
}

.app-main::-webkit-scrollbar-track {
  background: transparent;
}

.app-main::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.app-main::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===== 状态面板 ===== */
.state-panel {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.state-panel h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.state-panel p {
  font-size: 0.95rem;
  color: #64748b;
  margin-bottom: 1.25rem;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .app-header {
    padding: 0.7rem 1.5rem;
    gap: 0.8rem;
  }

  .app-header__brand h1 {
    font-size: 1.15rem;
  }

  .app-nav button {
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
  }

  .app-main {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
  }

  .app-header__brand h1 {
    font-size: 1.05rem;
  }

  .app-nav {
    gap: 0.15rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.15rem;
    flex-wrap: nowrap;
  }

  .app-nav button {
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
    flex-shrink: 0;
  }

  .current-user {
    justify-content: space-between;
  }

  .current-user > div {
    text-align: left;
  }

  .current-user strong {
    font-size: 0.85rem;
  }

  .current-user span {
    font-size: 0.7rem;
  }

  .ghost-button {
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
  }

  .app-main {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .app-header__eyebrow {
    font-size: 0.6rem;
  }

  .app-header__brand h1 {
    font-size: 0.92rem;
  }

  .app-nav button {
    font-size: 0.72rem;
    padding: 0.25rem 0.6rem;
  }

  .ghost-button {
    font-size: 0.72rem;
    padding: 0.3rem 0.6rem;
  }

  .current-user strong {
    font-size: 0.78rem;
  }

  .current-user span {
    font-size: 0.6rem;
  }

  .app-main {
    padding: 0.75rem;
  }
}
</style>