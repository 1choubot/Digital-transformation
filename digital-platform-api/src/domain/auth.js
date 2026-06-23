import crypto from 'node:crypto';

const PASSWORD_HASH_ALGORITHM = 'sha256';
const PASSWORD_HASH_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_HASH_PREFIX = 'pbkdf2_sha256';

export class AuthError extends Error {
  constructor(code, message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_HASH_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_HASH_ALGORITHM)
    .toString('hex');

  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [prefix, iterationsText, salt, expectedHash] = storedHash.split('$');
  const iterations = Number.parseInt(iterationsText, 10);

  if (prefix !== PASSWORD_HASH_PREFIX || !Number.isSafeInteger(iterations) || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(String(password), salt, iterations, Buffer.from(expectedHash, 'hex').length, PASSWORD_HASH_ALGORITHM)
    .toString('hex');

  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function getBearerToken(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function assertPasswordInput(account, password) {
  if (!String(account || '').trim() || !String(password || '')) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid account or password', 401);
  }
}
