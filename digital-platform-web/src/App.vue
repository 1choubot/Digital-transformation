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

  <!-- 登录后的高保真主控制台外壳 (全新顶部导航布局) -->
  <div v-else class="app-shell">
    
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <div class="brand-logo-area">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="brand-text">
            <span class="brand-title">数字化管理平台</span>
            <span class="brand-subtitle">DIGITAL MANAGEMENT</span>
          </div>
        </div>

        <!-- 桌面端横向导航 -->
        <nav class="desktop-nav">
          
          <!-- 项目主数据 -->
          <div v-if="!canAccessUserManagement" class="nav-group">
            <div class="nav-group-title" :class="{ 'is-active': isGroupActive('projects') }">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>项目主数据</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="nav-dropdown">
              <button class="dropdown-item" :class="{ active: route.name === 'projects' }" @click="handleNavigate('/projects')">项目列表</button>
              <button class="dropdown-item" :class="{ active: route.name === 'project-create' }" @click="handleNavigate('/projects/new')">新建项目</button>
            </div>
          </div>
          
          <!-- 日报管理 (拆分后的一级目录) -->
          <div 
            v-if="!canAccessUserManagement && (isDailyReportUser || canAccessCenterDailyReport)" 
            class="nav-group"
          >
            <div class="nav-group-title" :class="{ 'is-active': isGroupActive('dailyReports') }">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>日报管理</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="nav-dropdown">
              <button class="dropdown-item" :class="{ active: route.name === 'daily-report' }" @click="handleNavigate('/daily-report')">日报填写</button>
              <button class="dropdown-item" :class="{ active: route.name === 'daily-reports' }" @click="handleNavigate('/daily-reports')">我的日报列表</button>
              <button class="dropdown-item" v-if="canAccessCenterDailyReport" :class="{ active: route.name === 'center-daily-report' }" @click="handleNavigate('/center-daily-report')">中心日报汇总</button>
            </div>
          </div>

          <!-- 周报管理 (拆分后的一级目录) -->
          <div 
            v-if="!canAccessUserManagement && (isWeeklyReportUser || canAccessWeeklyReports || canAccessWeeklyOverview)" 
            class="nav-group"
          >
            <div class="nav-group-title" :class="{ 'is-active': isGroupActive('weeklyReports') }">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>周报管理</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="nav-dropdown nav-dropdown--wide">
              <button class="dropdown-item" v-if="isWeeklyReportUser" :class="{ active: route.name === 'weekly-report' }" @click="handleNavigate('/weekly-report')">周报填写</button>
              <button class="dropdown-item" v-if="canAccessWeeklyReports" :class="{ active: ['weekly-reports', 'weekly-report-review'].includes(route.name) && route.query?.from !== 'overview' }" @click="handleNavigate('/weekly-reports')">我的周报列表</button>
              <button class="dropdown-item" v-if="canAccessWeeklyOverview" :class="{ active: route.name === 'weekly-report-overview' || (route.name === 'weekly-report-review' && route.query?.from === 'overview') }" @click="handleNavigate('/weekly-overview')">周报汇总及考评</button>
            </div>
          </div>

          <!-- 过程追踪看板 -->
          <div v-if="!canAccessUserManagement" class="nav-group">
            <div class="nav-group-title" :class="{ 'is-active': isGroupActive('dashboards') }">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke-linecap="round"/>
                <path d="M22 12A10 10 0 0 0 12 2v10z" stroke-linecap="round"/>
              </svg>
              <span>过程追踪看板</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="nav-dropdown">
              <button class="dropdown-item" :class="{ active: route.name === 'project-overview-dashboard' }" @click="handleNavigate('/projects/overview-dashboard')">项目总览</button>
              <button class="dropdown-item" :class="{ active: route.name === 'my-stage-document-tasks' }" @click="handleNavigate('/my-stage-document-tasks')">我的资料任务</button>
            </div>
          </div>

          <!-- 系统设置 -->
          <div v-if="canAccessUserManagement" class="nav-group">
            <div class="nav-group-title" :class="{ 'is-active': isGroupActive('admin') }">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>系统设置</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="nav-dropdown">
              <button class="dropdown-item" :class="{ active: route.name === 'users' }" @click="handleNavigate('/users')">用户管理</button>
            </div>
          </div>
        </nav>
      </div>

      <div class="header-right">
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
        
        <!-- 移动端侧边栏切换按钮 -->
        <button type="button" class="mobile-menu-toggle" @click="toggleSidebar" aria-label="切换侧边栏">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 移动端侧边栏抽屉 (保留供小屏幕使用) -->
    <aside class="mobile-sidebar" :class="{ 'mobile-sidebar--open': isSidebarOpen }">
      <div class="mobile-brand-area">
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="brand-text">
          <span class="brand-title">数字化管理平台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- 项目主数据 -->
        <div v-if="!canAccessUserManagement" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': isGroupActive('projects') }" @click="toggleMenu('projects')">
            <div class="header-left-inner">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>项目主数据</span>
            </div>
            <svg class="chevron-icon" :class="{ 'rotated': openMenus.projects }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus.projects }">
            <div class="nav-children-inner">
              <button class="nav-child-item" :class="{ active: route.name === 'projects' }" @click="handleNavigate('/projects')">项目列表</button>
              <button class="nav-child-item" :class="{ active: route.name === 'project-create' }" @click="handleNavigate('/projects/new')">新建项目</button>
            </div>
          </div>
        </div>
        
        <!-- 日报管理 -->
        <div v-if="!canAccessUserManagement && (isDailyReportUser || canAccessCenterDailyReport)" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': isGroupActive('dailyReports') }" @click="toggleMenu('dailyReports')">
            <div class="header-left-inner">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>日报管理</span>
            </div>
            <svg class="chevron-icon" :class="{ 'rotated': openMenus.dailyReports }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus.dailyReports }">
            <div class="nav-children-inner">
              <button class="nav-child-item" :class="{ active: route.name === 'daily-report' }" @click="handleNavigate('/daily-report')">日报填写</button>
              <button class="nav-child-item" :class="{ active: route.name === 'daily-reports' }" @click="handleNavigate('/daily-reports')">我的日报列表</button>
              <button class="nav-child-item" v-if="canAccessCenterDailyReport" :class="{ active: route.name === 'center-daily-report' }" @click="handleNavigate('/center-daily-report')">中心日报汇总</button>
            </div>
          </div>
        </div>

        <!-- 周报管理 -->
        <div v-if="!canAccessUserManagement && (isWeeklyReportUser || canAccessWeeklyReports || canAccessWeeklyOverview)" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': isGroupActive('weeklyReports') }" @click="toggleMenu('weeklyReports')">
            <div class="header-left-inner">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>周报管理</span>
            </div>
            <svg class="chevron-icon" :class="{ 'rotated': openMenus.weeklyReports }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus.weeklyReports }">
            <div class="nav-children-inner">
              <button class="nav-child-item" v-if="isWeeklyReportUser" :class="{ active: route.name === 'weekly-report' }" @click="handleNavigate('/weekly-report')">周报填写</button>
              <button class="nav-child-item" v-if="canAccessWeeklyReports" :class="{ active: ['weekly-reports', 'weekly-report-review'].includes(route.name) && route.query?.from !== 'overview' }" @click="handleNavigate('/weekly-reports')">我的周报列表</button>
              <button class="nav-child-item" v-if="canAccessWeeklyOverview" :class="{ active: route.name === 'weekly-report-overview' || (route.name === 'weekly-report-review' && route.query?.from === 'overview') }" @click="handleNavigate('/weekly-overview')">周报汇总及考评</button>
            </div>
          </div>
        </div>

        <!-- 过程追踪看板 -->
        <div v-if="!canAccessUserManagement" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': isGroupActive('dashboards') }" @click="toggleMenu('dashboards')">
            <div class="header-left-inner">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke-linecap="round"/>
                <path d="M22 12A10 10 0 0 0 12 2v10z" stroke-linecap="round"/>
              </svg>
              <span>过程追踪看板</span>
            </div>
            <svg class="chevron-icon" :class="{ 'rotated': openMenus.dashboards }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus.dashboards }">
            <div class="nav-children-inner">
              <button class="nav-child-item" :class="{ active: route.name === 'project-overview-dashboard' }" @click="handleNavigate('/projects/overview-dashboard')">项目总览</button>
              <button class="nav-child-item" :class="{ active: route.name === 'my-stage-document-tasks' }" @click="handleNavigate('/my-stage-document-tasks')">我的资料任务</button>
            </div>
          </div>
        </div>

        <!-- 系统设置 -->
        <div v-if="canAccessUserManagement" class="mobile-nav-group">
          <div class="mobile-nav-header" :class="{ 'is-active': isGroupActive('admin') }" @click="toggleMenu('admin')">
            <div class="header-left-inner">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>系统设置</span>
            </div>
            <svg class="chevron-icon" :class="{ 'rotated': openMenus.admin }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="mobile-nav-children" :class="{ 'is-open': openMenus.admin }">
            <div class="nav-children-inner">
              <button class="nav-child-item" :class="{ active: route.name === 'users' }" @click="handleNavigate('/users')">用户管理</button>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <div 
      v-if="isSidebarOpen" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>

    <!-- 主体内区域容器 -->
    <div class="main-wrapper">
      
      <!-- 面包屑 (独立于副头部条中) -->
      <div class="page-breadcrumb-bar">
        <span class="breadcrumb-item">数字化管理平台</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item breadcrumb-item--active">{{ currentRouteLabel }}</span>
      </div>

      <!-- 动态路由页面内容 -->
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
      </main>
    </div>

    <!-- 全局提示框 -->
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
import { computed, onMounted, ref, watch, nextTick, onUnmounted, reactive } from 'vue';
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
import CenterDailyReportPage from './pages/CenterDailyReportPage.vue';
import WeeklyReportListPage from './pages/WeeklyReportListPage.vue';
import WeeklyReportPage from './pages/WeeklyReportPage.vue';
import WeeklyReportReviewPage from './pages/WeeklyReportReviewPage.vue';
import WeeklyReportReviewListPage from './pages/WeeklyReportReviewListPage.vue';
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

// ===== 自定义导航 =====
const { route, navigate: baseNavigate } = useHashRouter();

const navigate = (path, options = {}) => {
  baseNavigate(path);
};

const authLoading = ref(true);
const loggingOut = ref(false);
const authToken = ref('');
const currentUser = ref(null);
const authMessage = ref('');
const appMainRef = ref(null);

const isSidebarOpen = ref(false);

const openMenus = reactive({
  projects: true,
  dailyReports: true,
  weeklyReports: true,
  dashboards: true,
  admin: true
});

function toggleMenu(menuName) {
  openMenus[menuName] = !openMenus[menuName];
}

function isGroupActive(groupName) {
  const map = {
    projects: ['projects', 'project-create', 'project-detail'],
    dailyReports: ['daily-report', 'daily-reports', 'center-daily-report'],
    weeklyReports: ['weekly-report', 'weekly-reports', 'weekly-report-review', 'weekly-report-overview'],
    dashboards: ['project-overview-dashboard', 'my-stage-document-tasks'],
    admin: ['users']
  };
  return map[groupName]?.includes(route.value.name);
}

const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function toggleSidebar() { isSidebarOpen.value = !isSidebarOpen.value; }
function closeSidebar() { isSidebarOpen.value = false; }
function handleNavigate(path) { navigate(path); closeSidebar(); }

const currentRouteLabel = computed(() => {
  switch (route.value.name) {
    case 'projects': return '项目列表';
    case 'project-create': return '新建项目';
    case 'project-overview-dashboard': return '项目总览';
    case 'project-detail': return '项目详情控制台';
    case 'my-stage-document-tasks': return '我的资料任务';
    case 'users': return '用户管理';
    case 'daily-report': return '日报填写';
    case 'daily-reports': return '我的日报列表';
    case 'weekly-report': return '周报填写';
    case 'weekly-reports': return '我的周报列表';
    case 'weekly-report-review': return '周报详情';
    case 'weekly-report-overview': return '周报汇总及考评';
    case 'center-daily-report': return '中心日报汇总';
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

// 权限计算
const canAccessUserManagement = computed(
  () => currentUser.value?.isPlatformAdmin && currentUser.value?.organizationRole === 'system_admin'
);
const isDailyReportUser = computed(() => currentUser.value?.organizationRole === 'employee');
const isWeeklyReportUser = computed(() => ['employee', 'center_manager'].includes(currentUser.value?.organizationRole));
const canAccessWeeklyReports = computed(() =>
  ['employee', 'center_manager', 'general_manager', 'general_manager_assistant'].includes(
    currentUser.value?.organizationRole
  )
);
const canAccessCenterDailyReport = computed(() =>
  ['center_manager', 'general_manager', 'general_manager_assistant', 'system_admin'].includes(
    currentUser.value?.organizationRole
  )
);
const canAccessWeeklyOverview = computed(() =>
  ['center_manager', 'general_manager', 'general_manager_assistant'].includes(
    currentUser.value?.organizationRole
  )
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
  const isAdmin = result.user.isPlatformAdmin && result.user.organizationRole === 'system_admin';
  const targetPath = isAdmin ? '/users' : '/projects';
  navigate(targetPath);
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
  display: flex; flex-direction: column; height: 100vh; width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333; background: #f4f6f9; overflow: hidden; position: relative;
}

/* ================== 加载页 ================== */
.app-loading-screen {
  display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f6f9;
}
.loading-container { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.loading-wave { display: flex; gap: 6px; }
.wave-bar {
  width: 4px; height: 24px; background: #3e63dd; border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}
.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }
@keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
.app-loading-screen p { font-size: 0.9rem; color: #909399; font-weight: 500; }

/* ================== 全局 Header ================== */
.app-header {
  height: 64px; background-color: #ffffff; border-bottom: 1px solid #ebeef5;
  display: flex; align-items: center; justify-content: space-between; padding: 0 2rem;
  flex-shrink: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,21,41,0.03);
}
.header-left {
  display: flex; align-items: center; height: 100%;
}
.header-right {
  display: flex; align-items: center; gap: 1rem;
}

/* 品牌 Logo 区 */
.brand-logo-area {
  display: flex; align-items: center; gap: 0.75rem; padding-right: 2rem;
}
.logo-svg { width: 28px; height: 28px; color: #3e63dd; }
.brand-text { display: flex; flex-direction: column; line-height: 1.25; }
.brand-title { font-size: 1.15rem; font-weight: 700; color: #303133; }
.brand-subtitle { font-size: 0.55rem; font-weight: 600; color: #909399; letter-spacing: 0.05em; margin-top: 2px;}

/* ================== 桌面端横向导航 ================== */
.desktop-nav {
  display: flex; align-items: center; height: 100%; gap: 0.5rem; border-left: 1px solid #ebeef5; padding-left: 1.5rem;
}
.nav-group {
  position: relative; height: 100%; display: flex; align-items: center;
}
.nav-group-title {
  display: flex; align-items: center; gap: 0.5rem; padding: 0 1.15rem; height: 42px;
  border-radius: 6px; cursor: pointer; color: #606266; font-weight: 500; font-size: 0.9rem;
  transition: all 0.2s ease; user-select: none;
}
.nav-group:hover .nav-group-title { color: #3e63dd; background-color: #f4f6f9; }
.nav-group-title.is-active { color: #3e63dd; background-color: #ecf5ff; font-weight: 600; }

.nav-icon { width: 18px; height: 18px; stroke: currentColor; flex-shrink: 0; }
.chevron-icon { width: 14px; height: 14px; color: #909399; transition: transform 0.2s; flex-shrink: 0; }
.nav-group:hover .chevron-icon { transform: rotate(180deg); color: #3e63dd; }

/* 悬浮下拉菜单 */
.nav-dropdown {
  position: absolute; top: calc(100% - 6px); left: 0; min-width: 160px;
  background: #ffffff; border: 1px solid #ebeef5; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08); padding: 0.5rem; z-index: 200;
  opacity: 0; visibility: hidden; transform: translateY(10px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-dropdown--wide { min-width: 180px; }
.nav-group:hover .nav-dropdown { opacity: 1; visibility: visible; transform: translateY(0); }

/* 下拉菜单项 */
.dropdown-item {
  width: 100%; text-align: left; background: none; border: none; padding: 0.65rem 1rem;
  border-radius: 4px; font-size: 0.85rem; color: #606266; cursor: pointer;
  transition: all 0.2s ease; display: block;
}
.dropdown-item:hover { background-color: #f4f6f9; color: #3e63dd; }
.dropdown-item.active { background-color: #ecf5ff; color: #3e63dd; font-weight: 600; }

.dropdown-divider {
  height: 1px; background-color: #ebeef5; margin: 0.5rem 0;
}

/* ================== 用户信息区 ================== */
.current-user { display: flex; align-items: center; gap: 0.85rem; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%);
  color: #ffffff; font-weight: 600; font-size: 0.95rem;
  display: flex; align-items: center; justify-content: center;
}
.user-info { display: flex; flex-direction: column; line-height: 1.3; }
.user-name { font-size: 0.875rem; font-weight: 600; color: #303133; }
.user-role-desc { font-size: 0.725rem; color: #909399; font-weight: 500; }
.divider { color: #c0c4cc; margin: 0 0.1rem; }

.logout-button {
  background: transparent; border: 1px solid #dcdfe6; padding: 0.45rem;
  border-radius: 4px; color: #606266; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.logout-button:hover:not(:disabled) { border-color: #fbc4c4; color: #f56c6c; background-color: #fef0f0; }
.logout-button:disabled { opacity: 0.6; cursor: not-allowed; }
.logout-icon { width: 16px; height: 16px; }
.spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(245, 108, 108, 0.2); border-top: 2px solid #f56c6c;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

/* ================== 面包屑及主页面结构 ================== */
.main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.page-breadcrumb-bar {
  padding: 0.8rem 2rem; background: #ffffff; border-bottom: 1px solid #ebeef5;
  display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #909399;
  flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.01);
}
.breadcrumb-separator { color: #c0c4cc; margin: 0 0.25rem; }
.breadcrumb-item--active { color: #303133; font-weight: 600; }

.app-main {
  flex: 1; overflow-y: auto; overflow-x: hidden; max-width: 100%; width: 100%;
  margin: 0 auto; padding: 0; background: #f4f6f9;
}
.app-main::-webkit-scrollbar { width: 6px; }
.app-main::-webkit-scrollbar-track { background: transparent; }
.app-main::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.app-main::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }
.animate-content { animation: contentFadeIn 0.35s ease-out; }
@keyframes contentFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* 页面空状态/错误 */
.state-panel {
  text-align: center; padding: 5rem 2rem; background: #ffffff; border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04); border: none; margin: 1.5rem;
}
.state-panel h2 { font-size: 1.25rem; font-weight: 600; color: #303133; margin-bottom: 0.5rem; }
.state-panel p { font-size: 0.9rem; color: #909399; margin-bottom: 1.5rem; }
.primary-button {
  background: #3e63dd; border: none; padding: 0.5rem 1.5rem; border-radius: 4px;
  font-weight: 500; font-size: 0.875rem; color: #ffffff; cursor: pointer; transition: all 0.2s;
  height: 36px;
}
.primary-button:hover { background: #5275e7; }

/* ================== Toast 提示 ================== */
.toast {
  position: fixed; top: 2rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem;
  border-radius: 4px; background: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem; font-weight: 500; color: #303133; z-index: 10000;
  border: 1px solid #ebeef5; max-width: 90%;
}
.toast--error { border-left: 4px solid #f56c6c; }
.toast--error .toast-icon { stroke: #f56c6c; flex-shrink: 0; width: 20px; height: 20px; }
.toast--success { border-left: 4px solid #67c23a; }
.toast--success .toast-icon { stroke: #67c23a; flex-shrink: 0; width: 20px; height: 20px; }
.toast-close {
  display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border: none; background: transparent; cursor: pointer; padding: 0; margin-left: 0.5rem;
  flex-shrink: 0; border-radius: 50%; transition: background 0.2s; color: #c0c4cc;
}
.toast-close:hover { background: #f4f4f5; }
.toast-close svg { width: 14px; height: 14px; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

/* ================== 移动端特有逻辑及适配 ================== */
.mobile-menu-toggle { display: none; }
.mobile-sidebar { display: none; }
.sidebar-overlay { display: none; }

@media (min-width: 1025px) {
  /* 确保桌面端下不会显示移动端菜单 */
  .mobile-sidebar, .sidebar-overlay, .mobile-menu-toggle { display: none !important; }
}

@media (max-width: 1024px) {
  .desktop-nav { display: none; }
  .mobile-menu-toggle {
    display: flex; background: none; border: none; color: #606266; cursor: pointer;
    padding: 0.35rem; border-radius: 4px; transition: background-color 0.2s;
  }
  .mobile-menu-toggle:hover { background-color: #f4f6f9; }
  .mobile-menu-toggle svg { width: 24px; height: 24px; }
  
  .app-header { padding: 0 1.5rem; }
  .page-breadcrumb-bar { padding: 0.8rem 1.5rem; }
  
  /* 移动端抽屉栏 */
  .mobile-sidebar {
    display: flex; flex-direction: column; width: 250px; height: 100vh; background-color: #ffffff; 
    position: fixed; top: 0; bottom: 0; left: 0; z-index: 110; border-right: 1px solid #ebeef5;
    transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mobile-sidebar--open { transform: translateX(0); }
  
  .mobile-brand-area {
    padding: 1.5rem; display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #ebeef5;
  }
  
  .sidebar-nav {
    flex: 1; padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto;
  }
  .mobile-nav-group { display: flex; flex-direction: column; }
  .mobile-nav-header {
    display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0.85rem;
    border-radius: 6px; cursor: pointer; color: #303133; transition: background-color 0.2s, color 0.2s;
  }
  .mobile-nav-header:hover { background-color: #f4f6f9; color: #3e63dd; }
  .mobile-nav-header.is-active { color: #3e63dd; }
  
  .header-left-inner { display: flex; align-items: center; gap: 0.75rem; }
  .header-left-inner span { font-size: 0.9rem; font-weight: 600; }
  .mobile-nav-header .chevron-icon { width: 16px; height: 16px; color: #909399; transition: transform 0.3s ease; }
  .mobile-nav-header .chevron-icon.rotated { transform: rotate(180deg); }
  
  .mobile-nav-children {
    display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mobile-nav-children.is-open { grid-template-rows: 1fr; }
  .nav-children-inner {
    overflow: hidden; display: flex; flex-direction: column; margin-left: 1.35rem;
    padding-left: 1.15rem; border-left: 1px solid #ebeef5; margin-top: 0.25rem; gap: 0.2rem;
  }
  
  .nav-child-item {
    width: 100%; padding: 0.6rem 0.85rem; background: transparent; border: none; border-radius: 4px;
    display: flex; align-items: center; cursor: pointer; transition: all 0.2s ease;
    font-family: inherit; color: #606266; text-align: left; font-size: 0.85rem; font-weight: 500;
  }
  .nav-child-item:hover { background-color: #f4f6f9; color: #3e63dd; }
  .nav-child-item.active { background-color: #ecf5ff; color: #3e63dd; font-weight: 600; }

  .sidebar-overlay {
    display: block; position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px); z-index: 105; animation: fadeInOverlay 0.25s ease-out;
  }
  @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
}

@media (max-width: 768px) {
  .app-header { height: 60px; padding: 0 1rem; }
  .page-breadcrumb-bar { padding: 0.8rem 1rem; }
  .user-info { display: none; }
  .brand-text { display: none; } /* 移动端过小可隐藏顶部文字，仅留Logo */
  .brand-logo-area { padding-right: 0; }
  .state-panel { margin: 1rem; }
}
</style>