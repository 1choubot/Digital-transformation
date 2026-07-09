import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getModuleNavigation } from '../services/mainNavigationService.js';

export const navigationRouter = Router();

navigationRouter.get(
  '/:moduleCode',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      data: getModuleNavigation(req.params.moduleCode)
    });
  })
);
