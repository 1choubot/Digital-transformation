<template>
  <el-container class="app-shell">
    <el-header class="app-header">
      <div class="brand-logo-area">
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
          <span class="brand-subtitle">DIGITAL MANAGEMENT</span>
        </div>
      </div>

      <div class="header-main">
        <div class="header-main__top">
          <el-menu
            class="primary-nav"
            mode="horizontal"
            :default-active="activeMenuCode"
            :ellipsis="false"
            @select="handlePrimarySelect"
          >
            <el-menu-item
              v-for="menu in visibleMenus"
              :key="menu.code"
              :index="menu.code"
              @mouseenter="loadModuleNavigation(menu.code)"
            >
              {{ menu.name }}
            </el-menu-item>
          </el-menu>

          <div class="header-right">
            <div class="current-user">
              <div class="user-avatar">{{ String(currentUser.name || 'U').charAt(0) }}</div>
              <div class="user-info">
                <strong class="user-name">{{ currentUser.name }}</strong>
                <span class="user-role-desc">
                  {{ formatOrganizationRole(currentUser.organizationRole) }}
                  <span class="divider">/</span>
                  {{ currentUser.department ? formatBusinessDepartment(currentUser.department) : '全局级' }}
                </span>
              </div>
              <button type="button" class="logout-button" :disabled="loggingOut" title="退出系统" @click="$emit('logout')">
                <span v-if="loggingOut" class="spinner"></span>
                <svg
                  v-else
                  class="logout-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>

            <button type="button" class="mobile-menu-toggle" aria-label="切换侧边栏" @click="toggleSidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="header-main__bottom">
          <el-menu
            class="secondary-nav"
            mode="horizontal"
            :default-active="activeSubRoute"
            :ellipsis="false"
            @select="handleSecondarySelect"
          >
            <el-menu-item
              v-for="item in activeModuleItems"
              :key="item.code"
              :index="item.route"
            >
              {{ item.name }}
            </el-menu-item>
          </el-menu>
          <span v-if="isModuleLoading(activeMenuCode)" class="secondary-nav__state">菜单加载中...</span>
          <span v-else-if="moduleErrors[activeMenuCode]" class="secondary-nav__state secondary-nav__state--error">
            {{ moduleErrors[activeMenuCode] }}
          </span>
        </div>
      </div>
    </el-header>

    <aside class="mobile-sidebar" :class="{ 'mobile-sidebar--open': isSidebarOpen }">
      <div class="mobile-brand-area">
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-for="menu in visibleMenus" :key="menu.code" class="mobile-nav-group">
          <div
            class="mobile-nav-header"
            :class="{ 'is-active': activeMenuCode === menu.code }"
            @click="toggleMenu(menu.code)"
          >
            <div class="header-left-inner">
              <span>{{ menu.name }}</span>
            </div>
            <svg
              class="chevron-icon"
              :class="{ rotated: openMenus[menu.code] }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus[menu.code] }">
            <div class="nav-children-inner">
              <button
                v-for="item in getVisibleModuleItems(menu.code)"
                :key="item.code"
                type="button"
                class="nav-child-item"
                :class="{ active: isSubRouteActive(item.route) }"
                @click="handleNavigate(item.route)"
              >
                {{ item.name }}
              </button>
              <span v-if="isModuleLoading(menu.code)" class="nav-child-item nav-child-item--muted">菜单加载中...</span>
              <span v-else-if="moduleErrors[menu.code]" class="nav-child-item nav-child-item--muted">
                {{ moduleErrors[menu.code] }}
              </span>
              <span
                v-else-if="moduleNavigationLoaded[menu.code] && getVisibleModuleItems(menu.code).length === 0"
                class="nav-child-item nav-child-item--muted"
              >
                暂无可用入口
              </span>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <div v-if="isSidebarOpen" class="sidebar-overlay" @click="closeSidebar"></div>

    <el-container class="main-wrapper">
      <div class="page-breadcrumb-bar">
        <span class="breadcrumb-item">数字化管理平台</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item breadcrumb-item--active">{{ currentRouteLabel }}</span>
      </div>

      <el-main ref="appMainRef" class="app-main animate-content">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { getModuleNavigation } from '../api/navigation.js';
import {
  canAccessNavigationRoute,
  mainMenus
} from '../config/mainMenus.js';
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
  route: {
    type: Object,
    required: true
  },
  loggingOut: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['navigate', 'logout', 'auth-expired']);

const appMainRef = ref(null);
const isSidebarOpen = ref(false);
const openMenus = reactive({});
const moduleNavigation = reactive({});
const moduleNavigationLoaded = reactive({});
const moduleLoading = reactive({});
const moduleErrors = reactive({});

const visibleMenus = computed(() => mainMenus.filter((menu) => menu.visible(props.currentUser)));
const activeMenuCode = computed(() => {
  const activeMenu = visibleMenus.value.find((menu) => menu.activeRouteNames.includes(props.route.name));
  return activeMenu?.code || visibleMenus.value[0]?.code || '';
});
const activeSubRoute = computed(() => {
  const activeItems = getVisibleModuleItems(activeMenuCode.value);
  const exactMatch = activeItems.find((item) => isSubRouteActive(item.route));
  return exactMatch?.route || activeItems[0]?.route || '';
});
const activeModuleItems = computed(() => getVisibleModuleItems(activeMenuCode.value));
const currentRouteLabel = computed(() => {
  const item = visibleMenus.value
    .flatMap((menu) => getVisibleModuleItems(menu.code))
    .find((entry) => isSubRouteActive(entry.route));

  if (item) {
    return item.name;
  }

  switch (props.route.name) {
    case 'project-detail':
      return '项目详情控制台';
    case 'weekly-report-review':
      return '周报详情';
    default:
      return '管理驾驶舱';
  }
});

function isModuleLoading(code) {
  return Boolean(moduleLoading[code]);
}

function getVisibleModuleItems(code) {
  return (moduleNavigation[code] || []).filter((item) => canAccessNavigationRoute(item.route, props.currentUser));
}

function isSubRouteActive(route) {
  if (props.route.path === route) {
    return true;
  }

  if (route === '/projects') {
    return ['projects', 'project-overview-dashboard', 'project-detail'].includes(props.route.name);
  }

  if (route === '/weekly-reports') {
    return ['weekly-reports', 'weekly-report-review'].includes(props.route.name) && props.route.query?.from !== 'overview';
  }

  if (route === '/weekly-overview') {
    return props.route.name === 'weekly-report-overview' || props.route.query?.from === 'overview';
  }

  return false;
}

async function loadModuleNavigation(code) {
  if (!code || moduleNavigationLoaded[code] || moduleLoading[code]) {
    return;
  }

  moduleLoading[code] = true;
  moduleErrors[code] = '';

  try {
    moduleNavigation[code] = await getModuleNavigation(code, props.authToken);
    moduleNavigationLoaded[code] = true;
  } catch (error) {
    const message = error?.message || '菜单加载失败';
    moduleErrors[code] = message;

    if (error?.code === 'UNAUTHENTICATED') {
      emit('auth-expired', message);
    }
  } finally {
    moduleLoading[code] = false;
  }
}

async function handleTopMenuClick(menu) {
  await loadModuleNavigation(menu.code);
  const firstRoute = getVisibleModuleItems(menu.code)[0]?.route;
  if (firstRoute) {
    handleNavigate(firstRoute);
  }
}

async function handlePrimarySelect(code) {
  const menu = visibleMenus.value.find((item) => item.code === code);
  if (menu) {
    await handleTopMenuClick(menu);
  }
}

function handleSecondarySelect(route) {
  handleNavigate(route);
}

async function toggleMenu(code) {
  openMenus[code] = !openMenus[code];
  await loadModuleNavigation(code);
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
}

function closeSidebar() {
  isSidebarOpen.value = false;
}

function handleNavigate(path) {
  emit('navigate', path);
  closeSidebar();
}

watch(
  visibleMenus,
  (menus) => {
    for (const menu of menus) {
      if (!(menu.code in openMenus)) {
        openMenus[menu.code] = true;
      }
    }
  },
  { immediate: true }
);

watch(
  () => activeMenuCode.value,
  (code) => {
    loadModuleNavigation(code);
  },
  { immediate: true }
);

watch(
  () => props.route,
  () => {
    nextTick(() => {
      appMainRef.value?.$el?.scrollTo?.({ top: 0 });
      appMainRef.value?.scrollTo?.({ top: 0 });
    });
  }
);

onMounted(() => {
  for (const menu of visibleMenus.value) {
    loadModuleNavigation(menu.code);
  }
});
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f4f6f9;
  color: #333333;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.app-header {
  min-height: 88px;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  flex-shrink: 0;
  padding: 0;
  border-bottom: 1px solid #ebeef5;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 21, 41, 0.04);
  z-index: 100;
}

.header-right {
  display: flex;
  align-items: center;
  height: 100%;
}

.header-right {
  gap: 1rem;
}

.brand-logo-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 220px;
  flex-shrink: 0;
  padding: 0 24px;
  border-right: 1px solid #e5eaf3;
}

.logo-svg {
  width: 28px;
  height: 28px;
  color: #3e63dd;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-title {
  color: #303133;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
}

.brand-subtitle {
  margin-top: 2px;
  color: #909399;
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.header-main {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-rows: minmax(56px, 1fr) 28px;
}

.header-main__top,
.header-main__bottom {
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.header-main__top {
  justify-content: space-between;
}

.header-main__bottom {
  align-items: center;
}

.primary-nav,
.secondary-nav {
  border-bottom: 0;
  background: transparent;
}

.primary-nav {
  min-height: 56px;
  flex: 1;
  min-width: 0;
}

.primary-nav :deep(.el-menu-item) {
  height: 100%;
  min-width: 112px;
  justify-content: center;
  border-bottom: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 700;
}

.primary-nav :deep(.el-menu-item:hover),
.primary-nav :deep(.el-menu-item.is-active) {
  background: #eaf4ff;
  color: #2563eb;
  border-bottom: 0;
}

.secondary-nav {
  height: 28px;
  min-width: 0;
  margin-left: 20px;
}

.secondary-nav :deep(.el-menu-item) {
  height: 28px;
  min-width: 88px;
  justify-content: center;
  border-bottom: 0;
  color: #111827;
  font-size: 14px;
}

.secondary-nav :deep(.el-menu-item:hover),
.secondary-nav :deep(.el-menu-item.is-active) {
  background: #eaf4ff;
  color: #2563eb;
  border-bottom: 0;
}

.secondary-nav__state {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin-left: 28px;
  color: #909399;
  font-size: 13px;
}

.secondary-nav__state--error {
  color: #f56c6c;
}

.current-user {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  color: #303133;
  font-size: 0.875rem;
  font-weight: 600;
}

.user-role-desc {
  color: #909399;
  font-size: 0.725rem;
  font-weight: 500;
}

.divider {
  margin: 0 0.1rem;
  color: #c0c4cc;
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: transparent;
  color: #606266;
  cursor: pointer;
  padding: 0.45rem;
  transition: all 0.2s;
}

.logout-button:hover:not(:disabled) {
  border-color: #fbc4c4;
  background: #fef0f0;
  color: #f56c6c;
}

.logout-icon {
  width: 16px;
  height: 16px;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(245, 108, 108, 0.2);
  border-top: 2px solid #f56c6c;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-breadcrumb-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.5rem;
  padding: 0.8rem 2rem;
  border-bottom: 1px solid #ebeef5;
  background: #ffffff;
  color: #909399;
  font-size: 0.85rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
}

.breadcrumb-separator {
  margin: 0 0.25rem;
  color: #c0c4cc;
}

.breadcrumb-item--active {
  color: #303133;
  font-weight: 600;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: #f4f6f9;
}

.app-main::-webkit-scrollbar {
  width: 6px;
}

.app-main::-webkit-scrollbar-track {
  background: transparent;
}

.app-main::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.animate-content {
  animation: contentFadeIn 0.35s ease-out;
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-menu-toggle,
.mobile-sidebar,
.sidebar-overlay {
  display: none;
}

@media (max-width: 1024px) {
  .app-header {
    height: 64px;
    min-height: 64px;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
  }

  .app-header .brand-logo-area {
    width: auto;
    border-right: 0;
    padding: 0;
  }

  .header-main {
    display: flex;
    flex: 1;
    justify-content: flex-end;
  }

  .header-main__top {
    flex: 1;
    justify-content: flex-end;
  }

  .header-main__bottom,
  .primary-nav,
  .secondary-nav,
  .secondary-nav__state {
    display: none;
  }

  .mobile-menu-toggle {
    display: flex;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #606266;
    cursor: pointer;
    padding: 0.35rem;
  }

  .mobile-menu-toggle svg {
    width: 24px;
    height: 24px;
  }

  .page-breadcrumb-bar {
    padding: 0.8rem 1.5rem;
  }

  .mobile-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 110;
    display: flex;
    flex-direction: column;
    width: 250px;
    border-right: 1px solid #ebeef5;
    background: #ffffff;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mobile-sidebar--open {
    transform: translateX(0);
  }

  .mobile-brand-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    border-bottom: 1px solid #ebeef5;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    padding: 1.25rem 1rem;
  }

  .mobile-nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 6px;
    color: #303133;
    cursor: pointer;
    padding: 0.7rem 0.85rem;
    transition: background 0.2s, color 0.2s;
  }

  .mobile-nav-header:hover,
  .mobile-nav-header.is-active {
    color: #3e63dd;
    background: #f4f6f9;
  }

  .header-left-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-left-inner span {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .chevron-icon {
    width: 16px;
    height: 16px;
    color: #909399;
    transition: transform 0.3s;
  }

  .chevron-icon.rotated {
    transform: rotate(180deg);
  }

  .mobile-nav-children {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mobile-nav-children.is-open {
    grid-template-rows: 1fr;
  }

  .nav-children-inner {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    overflow: hidden;
    margin-top: 0.25rem;
    margin-left: 1.35rem;
    padding-left: 1.15rem;
    border-left: 1px solid #ebeef5;
  }

  .nav-child-item {
    width: 100%;
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #606266;
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.6rem 0.85rem;
    text-align: left;
    transition: all 0.2s;
  }

  .nav-child-item:hover,
  .nav-child-item.active {
    background: #ecf5ff;
    color: #3e63dd;
    font-weight: 600;
  }

  .nav-child-item--muted {
    cursor: default;
    color: #909399;
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 105;
    display: block;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
  }
}

@media (max-width: 768px) {
  .app-header {
    height: 60px;
    padding: 0 1rem;
  }

  .page-breadcrumb-bar {
    padding: 0.8rem 1rem;
  }

  .user-info,
  .brand-text {
    display: none;
  }

  .brand-logo-area {
    padding-right: 0;
  }
}
</style>
