import BlankProjectNodePage from '../pages/project-node/project-approval/BlankProjectNodePage.vue';
import MarketResearchPage from '../pages/project-node/project-approval/MarketResearchPage.vue';
import ProjectApprovalPage from '../pages/project-node/project-approval/ProjectApprovalPage.vue';
import ProjectInputPage from '../pages/project-node/project-approval/ProjectInputPage.vue';
import ProjectNoticePage from '../pages/project-node/project-approval/ProjectNoticePage.vue';

export const nodePages = {
  project_input: ProjectInputPage,
  market_research: MarketResearchPage,
  initiation_approval: ProjectApprovalPage,
  initiation_notice: ProjectNoticePage
};

export function resolveNodePage(nodeCode) {
  return nodePages[nodeCode] || BlankProjectNodePage;
}
