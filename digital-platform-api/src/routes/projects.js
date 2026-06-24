import { Router } from 'express';
import { requireAuth, requireDailyReportWriter } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  advanceProjectStageHandler,
  confirmStageDocumentHandler,
  createProjectHandler,
  deleteStageDocumentAttachmentHandler,
  downloadStageDocumentAttachmentHandler,
  getProjectDetailHandler,
  getProjectOverviewDashboardHandler,
  getStageDocumentChecklistHandler,
  listMyActiveProjectsHandler,
  listProjectOperationLogsHandler,
  listProjectsHandler,
  listStageDocumentAttachmentsHandler,
  markStageDocumentNotApplicableHandler,
  restoreStageDocumentApplicableHandler,
  returnStageDocumentHandler,
  submitStageDocumentHandler,
  updateStageDocumentResponsibleUserHandler,
  uploadStageDocumentAttachmentHandler
} from './projectRouteHandlers.js';

export const projectsRouter = Router();

projectsRouter.get('/', asyncHandler(listProjectsHandler));
projectsRouter.get('/my-active', requireAuth, requireDailyReportWriter, asyncHandler(listMyActiveProjectsHandler));
projectsRouter.post('/', requireAuth, asyncHandler(createProjectHandler));

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

projectsRouter.get('/:projectId', asyncHandler(getProjectDetailHandler));
