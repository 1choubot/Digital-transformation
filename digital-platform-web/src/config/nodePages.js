import GenericProjectNodePage from '../pages/project-node/GenericProjectNodePage.vue';

export const nodePages = {
  project_input: GenericProjectNodePage,
  market_research: GenericProjectNodePage,
  initiation_approval: GenericProjectNodePage,
  initiation_notice: GenericProjectNodePage,
  '*': GenericProjectNodePage
};

export function resolveNodePage(nodeCode) {
  return nodePages[nodeCode] || nodePages['*'];
}
