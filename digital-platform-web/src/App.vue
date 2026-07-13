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
    <RouterView v-slot="{ Component, route: matchedRoute }">
      <component
        :is="Component"
        v-bind="pageProps(matchedRoute)"
        @auth-expired="handleAuthExpired"
      />
    </RouterView>
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
import { RouterView, useRoute, useRouter } from 'vue-router';
import { getCurrentUser, logout as logoutRequest } from './api/auth.js';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  updateStoredUser
} from './auth/session.js';
import MainLayout from './layouts/MainLayout.vue';
import LoginPage from './pages/LoginPage.vue';

const route = useRoute();
const router = useRouter();

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
  router.push(path);
}

function routeParam(value) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function routeQuery(value) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function pageProps(targetRoute) {
  const commonProps = {
    authToken: authToken.value,
    currentUser: currentUser.value,
    navigate
  };

  switch (targetRoute.name) {
    case 'project-detail':
      return {
        ...commonProps,
        projectId: routeParam(targetRoute.params.projectId),
        taskMode: routeQuery(targetRoute.query?.taskMode),
        focusDocumentId: routeQuery(targetRoute.query?.documentId),
        focusStageId: routeQuery(targetRoute.query?.stageId),
        focusNodeKey:
          routeParam(targetRoute.params?.nodeCode) ||
          routeQuery(targetRoute.query?.focusNodeKey) ||
          routeQuery(targetRoute.query?.nodeKey)
      };
    case 'daily-report':
    case 'weekly-report':
      return {
        ...commonProps,
        reportId: routeParam(targetRoute.params?.reportId)
      };
    case 'weekly-report-review':
      return {
        ...commonProps,
        reportId: routeParam(targetRoute.params?.reportId),
        route: targetRoute
      };
    case 'not-found':
      return {};
    default:
      return commonProps;
  }
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
