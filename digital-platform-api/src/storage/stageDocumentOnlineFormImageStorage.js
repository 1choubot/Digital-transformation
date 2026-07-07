import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024;

const DEFAULT_ONLINE_FORM_IMAGE_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'stage-document-online-form-images'
);

export function getStageDocumentOnlineFormImageStorageDir() {
  return env.onlineFormImages.storageDir
    ? path.resolve(env.onlineFormImages.storageDir)
    : DEFAULT_ONLINE_FORM_IMAGE_STORAGE_DIR;
}

export function createStageDocumentOnlineFormImageStorageKey({ projectId, documentId, fieldKey, extension }) {
  const safeExtension = String(extension || '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'img';
  return path.join(
    String(projectId),
    String(documentId),
    String(fieldKey),
    `${Date.now()}-${randomUUID()}.${safeExtension}`
  );
}

export function getStageDocumentOnlineFormImagePath(storageKey) {
  const storageDir = getStageDocumentOnlineFormImageStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid online form image storage key');
  }

  return resolved;
}

export async function writeStageDocumentOnlineFormImageFile(storageKey, buffer) {
  const filePath = getStageDocumentOnlineFormImagePath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertStageDocumentOnlineFormImageFileReadable(storageKey) {
  const filePath = getStageDocumentOnlineFormImagePath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function readStageDocumentOnlineFormImageFile(storageKey) {
  return fs.readFile(getStageDocumentOnlineFormImagePath(storageKey));
}

export async function cleanupStageDocumentOnlineFormImageFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getStageDocumentOnlineFormImagePath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Best-effort cleanup: preserve the original business error.
    }
  }
}
