import { createRouter, createWebHashHistory } from 'vue-router';
import CenterDailyReportPage from './pages/CenterDailyReportPage.vue';
import DailyReportListPage from './pages/DailyReportListPage.vue';
import DailyReportPage from './pages/DailyReportPage.vue';
import MyStageDocumentTasksPage from './pages/MyStageDocumentTasksPage.vue';
import ProjectCreatePage from './pages/ProjectCreatePage.vue';
import ProjectDetailPage from './pages/project-detail/ProjectDetailPage.vue';
import ProjectOverviewDashboardPage from './pages/ProjectOverviewDashboardPage.vue';
import UserManagementPage from './pages/UserManagementPage.vue';
import WeeklyReportListPage from './pages/WeeklyReportListPage.vue';
import WeeklyReportPage from './pages/WeeklyReportPage.vue';
import WeeklyReportReviewListPage from './pages/WeeklyReportReviewListPage.vue';
import WeeklyReportReviewPage from './pages/WeeklyReportReviewPage.vue';

const NotFoundPage = {
  template: `
    <section class="state-panel">
      <h2>页面不存在</h2>
      <p>当前页面无法在数字化平台路由映射表中找到，可能已经被删除或搬迁。</p>
      <button type="button" class="primary-button" @click="$router.push('/projects')">返回主控制台</button>
    </section>
  `
};

const routes = [
  {
    path: '/',
    redirect: '/projects'
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectOverviewDashboardPage
  },
  {
    path: '/projects/overview-dashboard',
    name: 'project-overview-dashboard',
    component: ProjectOverviewDashboardPage
  },
  {
    path: '/projects/new',
    name: 'project-create',
    component: ProjectCreatePage
  },
  {
    path: '/projects/:projectId/:nodePrefix(node)?/:nodeCode?',
    name: 'project-detail',
    component: ProjectDetailPage
  },
  {
    path: '/my-stage-document-tasks',
    name: 'my-stage-document-tasks',
    component: MyStageDocumentTasksPage
  },
  {
    path: '/daily-report/:reportId?',
    name: 'daily-report',
    component: DailyReportPage
  },
  {
    path: '/daily-reports',
    name: 'daily-reports',
    component: DailyReportListPage
  },
  {
    path: '/weekly-report/:reportId?',
    name: 'weekly-report',
    component: WeeklyReportPage
  },
  {
    path: '/weekly-reports',
    name: 'weekly-reports',
    component: WeeklyReportListPage
  },
  {
    path: '/weekly-report-review/:reportId',
    name: 'weekly-report-review',
    component: WeeklyReportReviewPage
  },
  {
    path: '/weekly-overview',
    name: 'weekly-report-overview',
    component: WeeklyReportReviewListPage
  },
  {
    path: '/center-daily-report',
    name: 'center-daily-report',
    component: CenterDailyReportPage
  },
  {
    path: '/users',
    name: 'users',
    component: UserManagementPage
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
