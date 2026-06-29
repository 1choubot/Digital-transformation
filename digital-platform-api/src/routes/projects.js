import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  advanceProjectStageHandler,
  approveInitiationReviewNodeHandler,
  approveStageApprovalHandler,
  confirmStageDocumentHandler,
  completeStageDocumentRevisionHandler,
  createProjectHandler,
  deleteStageDocumentAttachmentHandler,
  downloadStageDocumentAttachmentHandler,
  getProjectDetailHandler,
  getProjectOverviewDashboardHandler,
  listStageApprovalHistoryHandler,
  getStageDocumentChecklistHandler,
  listProjectOperationLogsHandler,
  listProjectsHandler,
  listStageDocumentAttachmentsHandler,
  markStageDocumentNotApplicableHandler,
  restoreStageDocumentApplicableHandler,
  returnStageApprovalHandler,
  returnInitiationReviewNodeHandler,
  returnStageDocumentHandler,
  resubmitStageApprovalHandler,
  submitStageDocumentHandler,
  submitStageApprovalHandler,
  updateProjectCodeHandler,
  updateStageDocumentResponsibleUserHandler,
  uploadStageDocumentAttachmentHandler
} from './projectRouteHandlers.js';

export const projectsRouter = Router();

projectsRouter.get('/', requireAuth, asyncHandler(listProjectsHandler));
projectsRouter.post('/', requireAuth, asyncHandler(createProjectHandler));

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
