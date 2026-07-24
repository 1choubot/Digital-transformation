import BlankProjectNodePage from '../pages/project-node/project-approval/BlankProjectNodePage.vue';
import MarketResearchPage from '../pages/project-node/project-approval/MarketResearchPage.vue';
import ProjectApprovalPage from '../pages/project-node/project-approval/ProjectApprovalPage.vue';
import ProjectInputPage from '../pages/project-node/project-approval/ProjectInputPage.vue';
import ProjectNoticePage from '../pages/project-node/project-approval/ProjectNoticePage.vue';
import SolutionAnalysisPage from '../pages/project-node/solution-design/SolutionAnalysisPage.vue';
import SolutionCostEstimationPage from '../pages/project-node/solution-design/SolutionCostEstimationPage.vue';
import SolutionCustomerReviewPage from '../pages/project-node/solution-design/SolutionCustomerReviewPage.vue';
import SolutionDesignPage from '../pages/project-node/solution-design/SolutionDesignPage.vue';
import SolutionFinanceCostPage from '../pages/project-node/solution-design/SolutionFinanceCostPage.vue';
import SolutionInternalReviewPage from '../pages/project-node/solution-design/SolutionInternalReviewPage.vue';
import SolutionManufacturingCostPage from '../pages/project-node/solution-design/SolutionManufacturingCostPage.vue';
import SolutionMarketingCostPage from '../pages/project-node/solution-design/SolutionMarketingCostPage.vue';
import SolutionPreparationPage from '../pages/project-node/solution-design/SolutionPreparationPage.vue';
import SolutionQuotationTenderPage from '../pages/project-node/solution-design/SolutionQuotationTenderPage.vue';
import ContractAdvancePaymentPage from '../pages/project-node/contract-signing/ContractAdvancePaymentPage.vue';
import ContractPreparationPage from '../pages/project-node/contract-signing/ContractPreparationPage.vue';
import ContractSigningPage from '../pages/project-node/contract-signing/ContractSigningPage.vue';
import DetailedCustomerReviewPage from '../pages/project-node/detailed-design/DetailedCustomerReviewPage.vue';
import DetailedCustomerDrawingCountersignPage from '../pages/project-node/detailed-design/DetailedCustomerDrawingCountersignPage.vue';
import DetailedDesignFilesPage from '../pages/project-node/detailed-design/DetailedDesignFilesPage.vue';
import DetailedDesignPreparationPage from '../pages/project-node/detailed-design/DetailedDesignPreparationPage.vue';
import DetailedDrawingReviewPage from '../pages/project-node/detailed-design/DetailedDrawingReviewPage.vue';
import DetailedInternalReviewPage from '../pages/project-node/detailed-design/DetailedInternalReviewPage.vue';
import DetailedPartsListPage from '../pages/project-node/detailed-design/DetailedPartsListPage.vue';
import DetailedProductPlanDrawingPage from '../pages/project-node/detailed-design/DetailedProductPlanDrawingPage.vue';
import DetailedProjectKickoffMeetingPage from '../pages/project-node/detailed-design/DetailedProjectKickoffMeetingPage.vue';

export const nodePages = {
  project_input: ProjectInputPage,
  market_research: MarketResearchPage,
  initiation_approval: ProjectApprovalPage,
  initiation_notice: ProjectNoticePage,
  solution_preparation: SolutionPreparationPage,
  solution_analysis: SolutionAnalysisPage,
  solution_design: SolutionDesignPage,
  internal_solution_review: SolutionInternalReviewPage,
  customer_solution_review: SolutionCustomerReviewPage,
  rd_cost_estimation: SolutionCostEstimationPage,
  manufacturing_cost_estimation: SolutionManufacturingCostPage,
  marketing_cost_estimation: SolutionMarketingCostPage,
  finance_cost_estimation: SolutionFinanceCostPage,
  quotation_or_tender: SolutionQuotationTenderPage,
  contract_preparation: ContractPreparationPage,
  contract_signing: ContractSigningPage,
  advance_payment: ContractAdvancePaymentPage,
  project_kickoff_meeting: DetailedProjectKickoffMeetingPage,
  detailed_design_preparation: DetailedDesignPreparationPage,
  detailed_design: DetailedDesignFilesPage,
  internal_design_review: DetailedInternalReviewPage,
  customer_design_review: DetailedCustomerReviewPage,
  product_plan_drawing: DetailedProductPlanDrawingPage,
  parts_list: DetailedPartsListPage,
  drawing_review: DetailedDrawingReviewPage,
  customer_drawing_countersign: DetailedCustomerDrawingCountersignPage
};

export function resolveNodePage(nodeCode) {
  return nodePages[nodeCode] || BlankProjectNodePage;
}
