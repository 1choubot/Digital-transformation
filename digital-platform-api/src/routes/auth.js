import { Router } from 'express';
import { generateSessionToken, getBearerToken } from '../domain/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createSession, revokeSessionToken } from '../repositories/sessionRepository.js';
import { authenticateLogin } from '../services/authenticationService.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const identifier = String(req.body?.identifier ?? req.body?.account ?? '').trim();
    const password = String(req.body?.password || '');

    const user = await authenticateLogin(identifier, password);

    const token = generateSessionToken();
    const session = await createSession(user.id, token);

    delete user.passwordHash;

    res.json({
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        user
      }
    });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeSessionToken(req.auth.token || getBearerToken(req));

    res.json({
      data: {
        ok: true
      }
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      data: {
        user: req.auth.user
      }
    });
  })
);
