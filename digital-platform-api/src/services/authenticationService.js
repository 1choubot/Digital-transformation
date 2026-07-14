import { assertLoginInput, AuthError, verifyPassword } from '../domain/auth.js';
import { findLoginUserByIdentifier } from '../repositories/userRepository.js';

export async function authenticateLogin(identifier, password, loginUserFinder = findLoginUserByIdentifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedPassword = String(password || '');
  assertLoginInput(normalizedIdentifier, normalizedPassword);

  const match = await loginUserFinder(normalizedIdentifier);
  if (match?.isAmbiguous) {
    throw new AuthError(
      'AMBIGUOUS_LOGIN_IDENTIFIER',
      'Multiple users share this display name; use account instead',
      409
    );
  }

  const user = match?.user || null;
  if (!user || !verifyPassword(normalizedPassword, user.passwordHash)) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid login identifier or password', 401);
  }

  if (!user.isEnabled) {
    throw new AuthError('USER_DISABLED', 'User is disabled', 403);
  }

  return user;
}
