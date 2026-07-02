import { ref } from 'vue';

function parseHash() {
  let hash = window.location.hash.replace(/^#/, '') || '/projects';
  // 分离路径和查询字符串
  let path = hash;
  let query = {};
  const queryIndex = hash.indexOf('?');
  if (queryIndex !== -1) {
    path = hash.substring(0, queryIndex);
    const queryString = hash.substring(queryIndex + 1);
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params) {
      query[key] = value;
    }
  }

  if (!path) path = '/projects';

  // 路由匹配
  if (path === '/' || path === '/projects') {
    return { name: 'projects', path: '/projects', query };
  }

  if (path === '/projects/new') {
    return { name: 'project-create', path, query };
  }

  if (path === '/projects/overview-dashboard') {
    return { name: 'project-overview-dashboard', path, query };
  }

  const oldDetailMatch = path.match(/^\/projects-old\/(\d+)$/);
  if (oldDetailMatch) {
    return { name: 'project-detail-old', path, params: { projectId: oldDetailMatch[1] }, query };
  }

  if (path === '/users') {
    return { name: 'users', path, query };
  }

  if (path === '/my-stage-document-tasks') {
    return { name: 'my-stage-document-tasks', path, query };
  }

  if (path === '/daily-report') {
    return { name: 'daily-report', path, query };
  }

  if (path === '/daily-reports') {
    return { name: 'daily-reports', path, query };
  }

  if (path === '/weekly-report') {
    return { name: 'weekly-report', path, query };
  }

  if (path === '/weekly-reports') {
    return { name: 'weekly-reports', path, query };
  }

  if (path === '/weekly-overview') {
    return { name: 'weekly-report-overview', path, query };
  }

  if (path === '/center-daily-report') {
    return { name: 'center-daily-report', path, query };
  }

  const dailyReportMatch = path.match(/^\/daily-report\/(\d+)$/);
  if (dailyReportMatch) {
    return { name: 'daily-report', path, params: { reportId: dailyReportMatch[1] }, query };
  }

  const weeklyReportMatch = path.match(/^\/weekly-report\/(\d+)$/);
  if (weeklyReportMatch) {
    return { name: 'weekly-report', path, params: { reportId: weeklyReportMatch[1] }, query };
  }

  const weeklyReportReviewMatch = path.match(/^\/weekly-report-review\/(\d+)$/);
  if (weeklyReportReviewMatch) {
    return { name: 'weekly-report-review', path, params: { reportId: weeklyReportReviewMatch[1] }, query };
  }

  const detailWithViewMatch = path.match(/^\/projects\/(\d+)\/(.+)$/);
  if (detailWithViewMatch) {
    return { name: 'project-detail', path, params: { projectId: detailWithViewMatch[1], view: detailWithViewMatch[2] }, query };
  }

  const detailMatch = path.match(/^\/projects\/(\d+)$/);
  if (detailMatch) {
    return { name: 'project-detail', path, params: { projectId: detailMatch[1] }, query };
  }

  return { name: 'not-found', path, query };
}

export function useHashRouter() {
  const route = ref(parseHash());

  function syncRoute() {
    route.value = parseHash();
  }

  window.addEventListener('hashchange', syncRoute);

  function navigate(path) {
    const hash = `#${path}`;
    if (window.location.hash === hash) {
      syncRoute();
      return;
    }
    window.location.hash = hash;
  }

  if (!window.location.hash) {
    navigate('/projects');
  }

  return {
    route,
    navigate
  };
}