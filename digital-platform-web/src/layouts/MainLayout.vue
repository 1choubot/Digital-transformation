<template>
  <el-container class="app-shell">
    <el-header class="app-header">
      <div class="brand-logo-area">
        <img class="company-logo" :src="companyLogo" alt="重庆凯尔夫智能测控技术有限责任公司 Logo" />
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
          <span class="brand-subtitle">重庆凯尔夫智能测控技术</span>
        </div>
      </div>

      <div class="header-main">
        <div class="header-main__top">
          <el-menu class="primary-nav" mode="horizontal" :default-active="activeMenuCode" :ellipsis="false"
            @select="handlePrimarySelect">
            <el-menu-item v-for="menu in visibleMenus" :key="menu.code" :index="menu.code"
              @mouseenter="loadModuleNavigation(menu.code)">
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
                <svg v-else class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round">
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
          <el-menu class="secondary-nav" mode="horizontal" :default-active="activeSubRoute" :ellipsis="false"
            @select="handleSecondarySelect">
            <el-menu-item v-for="item in activeModuleItems" :key="item.code" :index="item.route">
              {{ item.name }}
            </el-menu-item>
          </el-menu>
          <span v-if="isModuleLoading(activeMenuCode)" class="secondary-nav__state">菜单加载中...</span>
          <span v-else-if="moduleErrors[activeMenuCode]" class="secondary-nav__state secondary-nav__state--error">
            {{ moduleErrors[activeMenuCode] }}
          </span>

          <!-- 右侧占位容器：镜像上方 header-right 结构（visibility:hidden），确保上下两层菜单中心对齐 -->
          <div class="header-right-spacer">
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
              <button type="button" class="logout-button" tabindex="-1">
                <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </el-header>

    <aside class="mobile-sidebar" :class="{ 'mobile-sidebar--open': isSidebarOpen }">
      <div class="mobile-brand-area">
        <img class="company-logo" :src="companyLogo" alt="重庆凯尔夫智能测控技术有限责任公司 Logo" />
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-for="menu in visibleMenus" :key="menu.code" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': activeMenuCode === menu.code }"
            @click="toggleMenu(menu.code)">
            <div class="header-left-inner">
              <span>{{ menu.name }}</span>
            </div>
            <svg class="chevron-icon" :class="{ rotated: openMenus[menu.code] }" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus[menu.code] }">
            <div class="nav-children-inner">
              <button v-for="item in getVisibleModuleItems(menu.code)" :key="item.code" type="button"
                class="nav-child-item" :class="{ active: isSubRouteActive(item.route) }"
                @click="handleNavigate(item.route)">
                {{ item.name }}
              </button>
              <span v-if="isModuleLoading(menu.code)" class="nav-child-item nav-child-item--muted">菜单加载中...</span>
              <span v-else-if="moduleErrors[menu.code]" class="nav-child-item nav-child-item--muted">
                {{ moduleErrors[menu.code] }}
              </span>
              <span v-else-if="moduleNavigationLoaded[menu.code] && getVisibleModuleItems(menu.code).length === 0"
                class="nav-child-item nav-child-item--muted">
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
        <template v-for="(item, index) in breadcrumbLabels" :key="`${index}-${item}`">
          <span v-if="index" class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item" :class="{ 'breadcrumb-item--active': index === breadcrumbLabels.length - 1 }">
            {{ item }}
          </span>
        </template>
      </div>

      <el-main
        ref="appMainRef"
        class="app-main animate-content"
        :class="{ 'app-main--workspace': route.name === 'project-detail' }"
      >
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import companyLogo from '../assets/company-logo.png';
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
  breadcrumbItems: {
    type: Array,
    default: () => []
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
const breadcrumbLabels = computed(() => {
  if (props.route.name === 'project-detail' && props.breadcrumbItems.length) {
    return ['数字化管理平台', '项目总览', ...props.breadcrumbItems];
  }

  return ['数字化管理平台', currentRouteLabel.value];
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
