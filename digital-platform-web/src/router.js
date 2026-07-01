import { ref } from 'vue';

function parseHash() {
  const rawPath = window.location.hash.replace(/^#/, '') || '/projects';
  const [path, queryString = ''] = rawPath.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString));

  if (path === '/' || path === '/projects') {
    return { name: 'project-overview-dashboard', path: '/projects', query };
  }

  if (path === '/projects/new') {
    return { name: 'project-create', path, query };
  }

  if (path === '/projects/overview-dashboard') {
    return { name: 'project-overview-dashboard', path: '/projects', query };
  }

  if (path === '/users') {
    return { name: 'users', path, query };
  }

  if (path === '/my-workbench' || path === '/my-stage-document-tasks') {
    return { name: 'my-workbench', path, query };
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
