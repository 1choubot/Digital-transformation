import { Router } from 'express';
import {
  getMyWorkbench,
  listMyStageDocumentTasks,
  normalizeStageDocumentTaskFilters
} from '../repositories/stageDocumentRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const meRouter = Router();

meRouter.get(
  '/workbench',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await getMyWorkbench(req.auth.user);
    res.json({ data: result });
  })
);

meRouter.get(
  '/stage-document-tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = normalizeStageDocumentTaskFilters(req.query);
    const tasks = await listMyStageDocumentTasks(req.auth.user.id, filters);

    res.json({
      data: tasks
    });
  })
);
