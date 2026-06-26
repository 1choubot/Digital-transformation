import { ref } from 'vue';

function parseHash() {
  const rawPath = window.location.hash.replace(/^#/, '') || '/projects';
  const [path, queryString = ''] = rawPath.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString));

  if (path === '/' || path === '/projects') {
    return { name: 'projects', path: '/projects', query: {} };
  }

  if (path === '/projects/new') {
    return { name: 'project-create', path, query };
  }

  if (path === '/projects/overview-dashboard') {
    return { name: 'project-overview-dashboard', path, query };
  }

  if (path === '/users') {
    return { name: 'users', path, query };
  }

  if (path === '/my-workbench' || path === '/my-stage-document-tasks') {
    return { name: 'my-workbench', path, query };
  }

  // Daily report routes are employee-only at page/API level.
  if (path === '/daily-report') {
    return { name: 'daily-report', path };
  }

  if (path === '/daily-reports') {
    return { name: 'daily-reports', path };
  }

  // Weekly report routes are guarded again at page/API level.
  if (path === '/weekly-report') {
    return { name: 'weekly-report', path };
  }

  if (path === '/weekly-reports') {
    return { name: 'weekly-reports', path };
  }

  // Center daily report routes are guarded again at page/API level.
  if (path === '/center-daily-report') {
    return { name: 'center-daily-report', path };
  }

  const dailyReportMatch = path.match(/^\/daily-report\/(\d+)$/);
  if (dailyReportMatch) {
    return { name: 'daily-report', path, params: { reportId: dailyReportMatch[1] } };
  }

  const weeklyReportMatch = path.match(/^\/weekly-report\/(\d+)$/);
  if (weeklyReportMatch) {
    return { name: 'weekly-report', path, params: { reportId: weeklyReportMatch[1] } };
  }

  const weeklyReportReviewMatch = path.match(/^\/weekly-report-review\/(\d+)$/);
  if (weeklyReportReviewMatch) {
    return { name: 'weekly-report-review', path, params: { reportId: weeklyReportReviewMatch[1] } };
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
