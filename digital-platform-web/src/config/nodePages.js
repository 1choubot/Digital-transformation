import GenericProjectNodePage from '../pages/project-node/GenericProjectNodePage.vue';
import DesignPreparePage from '../pages/project-node/DesignPreparePage.vue';
import MarketResearchPage from '../pages/project-node/MarketResearchPage.vue';
import ProjectApprovalPage from '../pages/project-node/ProjectApprovalPage.vue';
import ProjectInputPage from '../pages/project-node/ProjectInputPage.vue';
import ProjectNoticePage from '../pages/project-node/ProjectNoticePage.vue';

export const nodePages = {
  project_input: ProjectInputPage,
  market_research: MarketResearchPage,
  initiation_approval: ProjectApprovalPage,
  initiation_notice: ProjectNoticePage,
  solution_preparation: DesignPreparePage,
  '*': GenericProjectNodePage
};

export function resolveNodePage(nodeCode) {
  return nodePages[nodeCode] || nodePages['*'];
}
