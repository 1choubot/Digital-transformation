import { AuthError, getBearerToken } from '../domain/auth.js';
import { findUserBySessionToken } from '../repositories/sessionRepository.js';
import { asyncHandler } from './asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);
  const user = await findUserBySessionToken(token);

  if (!user) {
    throw new AuthError('UNAUTHENTICATED', 'Authentication required', 401);
  }

  if (!user.isEnabled) {
    throw new AuthError('USER_DISABLED', 'User is disabled', 403);
  }

  req.auth = {
    token,
    user
  };

  next();
});

export const requirePlatformAdmin = asyncHandler(async (req, res, next) => {
  if (!req.auth?.user?.isPlatformAdmin) {
    throw new AuthError('PLATFORM_ADMIN_REQUIRED', 'Platform admin required', 403);
  }

  next();
});
