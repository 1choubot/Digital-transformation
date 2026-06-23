import { ref } from 'vue';

function parseHash() {
  const path = window.location.hash.replace(/^#/, '') || '/projects';

  if (path === '/' || path === '/projects') {
    return { name: 'projects', path: '/projects' };
  }

  if (path === '/projects/new') {
    return { name: 'project-create', path };
  }

  if (path === '/projects/overview-dashboard') {
    return { name: 'project-overview-dashboard', path };
  }

  if (path === '/users') {
    return { name: 'users', path };
  }

  if (path === '/my-stage-document-tasks') {
    return { name: 'my-stage-document-tasks', path };
  }

  const detailMatch = path.match(/^\/projects\/(\d+)$/);
  if (detailMatch) {
    return { name: 'project-detail', path, params: { projectId: detailMatch[1] } };
  }

  return { name: 'not-found', path };
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
