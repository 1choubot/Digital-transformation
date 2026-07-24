import { Router } from 'express';
import { requireAuth, requireReportProjectSearchUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  advanceProjectStageHandler,
  assignDetailedDesignRolesHandler,
  assignSolutionDesignRolesHandler,
  approveDetailedDesignDrawingReviewHandler,
  approveDetailedDesignWorkflowNodeHandler,
  approveContractSigningPreparationFileHandler,
  approveContractSigningPaymentReleasePaidHandler,
  approveContractSigningPaymentReleaseUnpaidHandler,
  approveInitiationReviewNodeHandler,
  approveSolutionDesignWorkflowNodeHandler,
  approveStageApprovalHandler,
  confirmContractSigningScanFileHandler,
  completeContractSigningAdvancePaymentHandler,
  completeContractSigningNodeHandler,
  confirmStageDocumentHandler,
  completeStageDocumentRevisionHandler,
  createProjectHandler,
  cancelDetailedDesignUploadNoUploadHandler,
  downloadSolutionDesignAnalysisGeneratedFileHandler,
  downloadSolutionDesignQuotationGeneratedFileHandler,
  downloadSolutionDesignReviewGeneratedFileHandler,
  deleteStageDocumentAttachmentHandler,
  deleteStageDocumentOnlineFormImageHandler,
  downloadContractSigningWorkflowFileHandler,
  downloadContractSigningKickoffNoticeGeneratedFileHandler,
  downloadDetailedDesignDrawingReviewRecordHandler,
  downloadDetailedDesignReviewGeneratedFileHandler,
  downloadDetailedDesignWorkflowFileHandler,
  downloadSolutionDesignWorkflowFileHandler,
  downloadStageDocumentAttachmentHandler,
  downloadStageDocumentGeneratedFileHandler,
  downloadStageDocumentOnlineFormImageHandler,
  generateStageDocumentOnlineFormFileHandler,
  getContractSigningWorkflowHandler,
  getDetailedDesignReviewFormHandler,
  getDetailedDesignWorkflowHandler,
  getProjectDetailHandler,
  getProjectNavigationHandler,
  getProjectOverviewDashboardHandler,
  getProjectWorkspaceHandler,
  getSolutionDesignAnalysisFormHandler,
  getSolutionDesignQuotationFormHandler,
  getSolutionDesignReviewFormHandler,
  getSolutionDesignWorkflowHandler,
  getStageDocumentOnlineFormHandler,
  getStageDocumentGeneratedFileStatusHandler,
  listStageApprovalHistoryHandler,
  getStageDocumentChecklistHandler,
  listProjectOperationLogsHandler,
  listProjectsHandler,
  listSolutionDesignUploadsHandler,
  listMyActiveProjectsHandler,
  listStageDocumentAttachmentsHandler,
  markDetailedDesignUploadNoUploadHandler,
  markStageDocumentNotApplicableHandler,
  markSolutionDesignUploadExemptionHandler,
  processSolutionDesignQuotationResultHandler,
  passDetailedDesignDrawingReviewHandler,
  restoreStageDocumentApplicableHandler,
  returnContractSigningPreparationFileHandler,
  returnContractSigningSalesContractForCustomerHandler,
  returnContractSigningTechnicalAgreementForCustomerHandler,
  returnDetailedDesignDrawingReviewApprovalHandler,
  returnDetailedDesignDrawingReviewHandler,
  returnDetailedDesignWorkflowNodeHandler,
  rejectDeprecatedContractSigningPaymentReleaseHandler,
  requestContractSigningPaymentReleaseHandler,
  returnStageApprovalHandler,
  returnInitiationReviewNodeHandler,
  returnSolutionDesignWorkflowNodeHandler,
  returnStageDocumentHandler,
  resubmitStageApprovalHandler,
  cancelSolutionDesignUploadExemptionHandler,
  saveDetailedDesignReviewFormHandler,
  saveStageDocumentOnlineFormHandler,
  saveSolutionDesignAnalysisFormHandler,
  saveSolutionDesignQuotationFormHandler,
  saveSolutionDesignReviewFormHandler,
  selectSolutionDesignQuotationTenderBranchHandler,
  submitSolutionDesignAnalysisFormHandler,
  submitSolutionDesignQuotationFormHandler,
  submitSolutionDesignQuotationHandler,
  submitDetailedDesignReviewFormHandler,
  submitDetailedDesignWorkflowNodeHandler,
  submitSolutionDesignReviewFormHandler,
  submitSolutionDesignWorkflowNodeHandler,
  submitStageDocumentHandler,
  submitStageDocumentOnlineFormHandler,
  submitStageApprovalHandler,
  updateProjectCodeHandler,
  uploadDetailedDesignDrawingReviewRecordHandler,
  uploadContractSigningWorkflowFileHandler,
  uploadDetailedDesignWorkflowFileHandler,
  updateStageDocumentResponsibleUserHandler,
  uploadSolutionDesignWorkflowFileHandler,
  uploadStageDocumentAttachmentHandler,
  uploadStageDocumentOnlineFormImageHandler
} from './projectRouteHandlers.js';

export const projectsRouter = Router();

projectsRouter.get('/', requireAuth, asyncHandler(listProjectsHandler));
projectsRouter.post('/', requireAuth, asyncHandler(createProjectHandler));

projectsRouter.get(
  '/my-active',
  requireAuth,
  requireReportProjectSearchUser,
  asyncHandler(listMyActiveProjectsHandler)
);

projectsRouter.put(
  '/:projectId/project-code',
  requireAuth,
  asyncHandler(updateProjectCodeHandler)
);

projectsRouter.get(
  '/overview-dashboard',
  requireAuth,
  asyncHandler(getProjectOverviewDashboardHandler)
);

projectsRouter.get(
  '/:projectId/operation-logs',
  requireAuth,
  asyncHandler(listProjectOperationLogsHandler)
);

projectsRouter.get(
  '/:projectId/stage-document-checklist',
  requireAuth,
  asyncHandler(getStageDocumentChecklistHandler)
);

projectsRouter.get(
  '/:projectId/workspace',
  requireAuth,
  asyncHandler(getProjectWorkspaceHandler)
);

projectsRouter.get(
  '/:projectId/navigation',
  requireAuth,
  asyncHandler(getProjectNavigationHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow',
  requireAuth,
  asyncHandler(getSolutionDesignWorkflowHandler)
);

projectsRouter.get(
  '/:projectId/contract-signing-workflow',
  requireAuth,
  asyncHandler(getContractSigningWorkflowHandler)
);

projectsRouter.get(
  '/:projectId/detailed-design-workflow',
  requireAuth,
  asyncHandler(getDetailedDesignWorkflowHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/roles',
  requireAuth,
  asyncHandler(assignDetailedDesignRolesHandler)
);

projectsRouter.get(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/review-form',
  requireAuth,
  asyncHandler(getDetailedDesignReviewFormHandler)
);

projectsRouter.put(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/review-form',
  requireAuth,
  asyncHandler(saveDetailedDesignReviewFormHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/review-form/submit',
  requireAuth,
  asyncHandler(submitDetailedDesignReviewFormHandler)
);

projectsRouter.get(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/review-form/generated-file/download',
  requireAuth,
  asyncHandler(downloadDetailedDesignReviewGeneratedFileHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review-record',
  requireAuth,
  asyncHandler(uploadDetailedDesignDrawingReviewRecordHandler)
);

projectsRouter.get(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review-records/:recordId/download',
  requireAuth,
  asyncHandler(downloadDetailedDesignDrawingReviewRecordHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review/pass',
  requireAuth,
  asyncHandler(passDetailedDesignDrawingReviewHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review/return',
  requireAuth,
  asyncHandler(returnDetailedDesignDrawingReviewHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review/approve',
  requireAuth,
  asyncHandler(approveDetailedDesignDrawingReviewHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/drawing_review/drawing-review/rd-return',
  requireAuth,
  asyncHandler(returnDetailedDesignDrawingReviewApprovalHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/approve',
  requireAuth,
  asyncHandler(approveDetailedDesignWorkflowNodeHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/return',
  requireAuth,
  asyncHandler(returnDetailedDesignWorkflowNodeHandler)
);

projectsRouter.get(
  '/:projectId/detailed-design-workflow/uploads/:slotKey/download',
  requireAuth,
  asyncHandler(downloadDetailedDesignWorkflowFileHandler)
);

projectsRouter.put(
  '/:projectId/detailed-design-workflow/uploads/:slotKey/exemption',
  requireAuth,
  asyncHandler(markDetailedDesignUploadNoUploadHandler)
);

projectsRouter.delete(
  '/:projectId/detailed-design-workflow/uploads/:slotKey/exemption',
  requireAuth,
  asyncHandler(cancelDetailedDesignUploadNoUploadHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/nodes/:nodeKey/submit',
  requireAuth,
  asyncHandler(submitDetailedDesignWorkflowNodeHandler)
);

projectsRouter.post(
  '/:projectId/detailed-design-workflow/uploads/:slotKey',
  requireAuth,
  asyncHandler(uploadDetailedDesignWorkflowFileHandler)
);

projectsRouter.get(
  '/:projectId/contract-signing-workflow/uploads/:slotKey/download',
  requireAuth,
  asyncHandler(downloadContractSigningWorkflowFileHandler)
);

projectsRouter.get(
  '/:projectId/contract-signing-workflow/kickoff-notice/generated-file/download',
  requireAuth,
  asyncHandler(downloadContractSigningKickoffNoticeGeneratedFileHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/uploads/:slotKey',
  requireAuth,
  asyncHandler(uploadContractSigningWorkflowFileHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/uploads/:slotKey/approve',
  requireAuth,
  asyncHandler(approveContractSigningPreparationFileHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/uploads/:slotKey/return',
  requireAuth,
  asyncHandler(returnContractSigningPreparationFileHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/uploads/:slotKey/signing-result',
  requireAuth,
  asyncHandler(confirmContractSigningScanFileHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/signing/return-technical-agreement',
  requireAuth,
  asyncHandler(returnContractSigningTechnicalAgreementForCustomerHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/signing/return-sales-contract',
  requireAuth,
  asyncHandler(returnContractSigningSalesContractForCustomerHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/signing/complete',
  requireAuth,
  asyncHandler(completeContractSigningNodeHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/payment/complete',
  requireAuth,
  asyncHandler(completeContractSigningAdvancePaymentHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/payment/request-general-manager-release',
  requireAuth,
  asyncHandler(requestContractSigningPaymentReleaseHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/payment/approve-release',
  requireAuth,
  asyncHandler(rejectDeprecatedContractSigningPaymentReleaseHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/payment/approve-release-unpaid',
  requireAuth,
  asyncHandler(approveContractSigningPaymentReleaseUnpaidHandler)
);

projectsRouter.post(
  '/:projectId/contract-signing-workflow/payment/approve-release-paid',
  requireAuth,
  asyncHandler(approveContractSigningPaymentReleasePaidHandler)
);

projectsRouter.put(
  '/:projectId/solution-design-workflow/roles',
  requireAuth,
  asyncHandler(assignSolutionDesignRolesHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/quotation-tender/select',
  requireAuth,
  asyncHandler(selectSolutionDesignQuotationTenderBranchHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/quotation-tender/quotation/submit',
  requireAuth,
  asyncHandler(submitSolutionDesignQuotationHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/quotation-tender/quotation/result',
  requireAuth,
  asyncHandler(processSolutionDesignQuotationResultHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/quotation-tender/quotation-form',
  requireAuth,
  asyncHandler(getSolutionDesignQuotationFormHandler)
);

projectsRouter.put(
  '/:projectId/solution-design-workflow/quotation-tender/quotation-form',
  requireAuth,
  asyncHandler(saveSolutionDesignQuotationFormHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/quotation-tender/quotation-form/submit',
  requireAuth,
  asyncHandler(submitSolutionDesignQuotationFormHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/quotation-tender/quotation-form/generated-file/download',
  requireAuth,
  asyncHandler(downloadSolutionDesignQuotationGeneratedFileHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/analysis-form',
  requireAuth,
  asyncHandler(getSolutionDesignAnalysisFormHandler)
);

projectsRouter.put(
  '/:projectId/solution-design-workflow/analysis-form',
  requireAuth,
  asyncHandler(saveSolutionDesignAnalysisFormHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/analysis-form/submit',
  requireAuth,
  asyncHandler(submitSolutionDesignAnalysisFormHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/analysis-form/generated-file/download',
  requireAuth,
  asyncHandler(downloadSolutionDesignAnalysisGeneratedFileHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/review-form',
  requireAuth,
  asyncHandler(getSolutionDesignReviewFormHandler)
);

projectsRouter.put(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/review-form',
  requireAuth,
  asyncHandler(saveSolutionDesignReviewFormHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/review-form/submit',
  requireAuth,
  asyncHandler(submitSolutionDesignReviewFormHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/review-form/generated-file/download',
  requireAuth,
  asyncHandler(downloadSolutionDesignReviewGeneratedFileHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/uploads',
  requireAuth,
  asyncHandler(listSolutionDesignUploadsHandler)
);

projectsRouter.get(
  '/:projectId/solution-design-workflow/uploads/:slotKey/download',
  requireAuth,
  asyncHandler(downloadSolutionDesignWorkflowFileHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/uploads/:slotKey/exemption',
  requireAuth,
  asyncHandler(markSolutionDesignUploadExemptionHandler)
);

projectsRouter.delete(
  '/:projectId/solution-design-workflow/uploads/:slotKey/exemption',
  requireAuth,
  asyncHandler(cancelSolutionDesignUploadExemptionHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/uploads/:slotKey',
  requireAuth,
  asyncHandler(uploadSolutionDesignWorkflowFileHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/submit',
  requireAuth,
  asyncHandler(submitSolutionDesignWorkflowNodeHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/approve',
  requireAuth,
  asyncHandler(approveSolutionDesignWorkflowNodeHandler)
);

projectsRouter.post(
  '/:projectId/solution-design-workflow/nodes/:nodeKey/return',
  requireAuth,
  asyncHandler(returnSolutionDesignWorkflowNodeHandler)
);

projectsRouter.post(
  '/:projectId/stages/advance',
  requireAuth,
  asyncHandler(advanceProjectStageHandler)
);

projectsRouter.post(
  '/:projectId/stages/:stageId/approval/submit',
  requireAuth,
  asyncHandler(submitStageApprovalHandler)
);

projectsRouter.post(
  '/:projectId/stages/:stageId/approval/approve',
  requireAuth,
  asyncHandler(approveStageApprovalHandler)
);

projectsRouter.post(
  '/:projectId/stages/:stageId/approval/return',
  requireAuth,
  asyncHandler(returnStageApprovalHandler)
);

projectsRouter.post(
  '/:projectId/stages/:stageId/approval/resubmit',
  requireAuth,
  asyncHandler(resubmitStageApprovalHandler)
);

projectsRouter.get(
  '/:projectId/stages/:stageId/approval/history',
  requireAuth,
  asyncHandler(listStageApprovalHistoryHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/submit',
  requireAuth,
  asyncHandler(submitStageDocumentHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/confirm',
  requireAuth,
  asyncHandler(confirmStageDocumentHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/return',
  requireAuth,
  asyncHandler(returnStageDocumentHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/revision/complete',
  requireAuth,
  asyncHandler(completeStageDocumentRevisionHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/online-form',
  requireAuth,
  asyncHandler(getStageDocumentOnlineFormHandler)
);

projectsRouter.put(
  '/:projectId/stage-documents/:documentId/online-form',
  requireAuth,
  asyncHandler(saveStageDocumentOnlineFormHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/online-form/submit',
  requireAuth,
  asyncHandler(submitStageDocumentOnlineFormHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/online-form/generated-file',
  requireAuth,
  asyncHandler(generateStageDocumentOnlineFormFileHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/online-form/images/:fieldKey',
  requireAuth,
  asyncHandler(uploadStageDocumentOnlineFormImageHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/online-form/images/:imageId/download',
  requireAuth,
  asyncHandler(downloadStageDocumentOnlineFormImageHandler)
);

projectsRouter.delete(
  '/:projectId/stage-documents/:documentId/online-form/images/:imageId',
  requireAuth,
  asyncHandler(deleteStageDocumentOnlineFormImageHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/generated-file',
  requireAuth,
  asyncHandler(getStageDocumentGeneratedFileStatusHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/generated-file/download',
  requireAuth,
  asyncHandler(downloadStageDocumentGeneratedFileHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/initiation-review/:nodeKey/approve',
  requireAuth,
  asyncHandler(approveInitiationReviewNodeHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/initiation-review/:nodeKey/return',
  requireAuth,
  asyncHandler(returnInitiationReviewNodeHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/mark-not-applicable',
  requireAuth,
  asyncHandler(markStageDocumentNotApplicableHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/restore-applicable',
  requireAuth,
  asyncHandler(restoreStageDocumentApplicableHandler)
);

projectsRouter.put(
  '/:projectId/stage-documents/:documentId/responsible-user',
  requireAuth,
  asyncHandler(updateStageDocumentResponsibleUserHandler)
);

projectsRouter.post(
  '/:projectId/stage-documents/:documentId/attachments',
  requireAuth,
  asyncHandler(uploadStageDocumentAttachmentHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/attachments',
  requireAuth,
  asyncHandler(listStageDocumentAttachmentsHandler)
);

projectsRouter.get(
  '/:projectId/stage-documents/:documentId/attachments/:attachmentId/download',
  requireAuth,
  asyncHandler(downloadStageDocumentAttachmentHandler)
);

projectsRouter.delete(
  '/:projectId/stage-documents/:documentId/attachments/:attachmentId',
  requireAuth,
  asyncHandler(deleteStageDocumentAttachmentHandler)
);

projectsRouter.get('/:projectId', requireAuth, asyncHandler(getProjectDetailHandler));
