import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { hashSessionToken } from '../domain/auth.js';
import { mapSafeUser } from './userRepository.js';

function buildExpiresAt() {
  const expiresAt = new Date(Date.now() + env.auth.sessionTtlHours * 60 * 60 * 1000);
  return expiresAt.toISOString().slice(0, 19).replace('T', ' ');
}

export async function createSession(userId, token) {
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildExpiresAt();

  await pool.execute('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [
    userId,
    tokenHash,
    expiresAt
  ]);

  return {
    token,
    expiresAt
  };
}

export async function findUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const [rows] = await pool.execute(
    `SELECT
      u.*
    FROM auth_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1`,
    [tokenHash]
  );

  return mapSafeUser(rows[0]);
}

export async function revokeSessionToken(token) {
  if (!token) {
    return;
  }

  const tokenHash = hashSessionToken(token);
  await pool.execute(
    'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = ?',
    [tokenHash]
  );
}
