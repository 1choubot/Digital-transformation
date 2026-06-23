import { Router } from 'express';
import { assertPasswordInput, AuthError, generateSessionToken, getBearerToken, verifyPassword } from '../domain/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createSession, revokeSessionToken } from '../repositories/sessionRepository.js';
import { findUserByAccount } from '../repositories/userRepository.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const account = String(req.body?.account || '').trim();
    const password = String(req.body?.password || '');

    assertPasswordInput(account, password);

    const user = await findUserByAccount(account);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid account or password', 401);
    }

    if (!user.isEnabled) {
      throw new AuthError('USER_DISABLED', 'User is disabled', 403);
    }

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
