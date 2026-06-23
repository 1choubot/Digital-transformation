import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const STAGE_DOCUMENT_ATTACHMENT_MAX_FILE_SIZE = 50 * 1024 * 1024;

const DEFAULT_ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'stage-document-attachments'
);

export function getStageDocumentAttachmentStorageDir() {
  return env.attachments.storageDir
    ? path.resolve(env.attachments.storageDir)
    : DEFAULT_ATTACHMENT_STORAGE_DIR;
}

export function createStageDocumentAttachmentStorageKey({ projectId, documentId }) {
  return path.join(String(projectId), String(documentId), `${Date.now()}-${randomUUID()}`);
}

export function getStageDocumentAttachmentPath(storageKey) {
  const storageDir = getStageDocumentAttachmentStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid attachment storage key');
  }

  return resolved;
}

export async function writeStageDocumentAttachmentFile(storageKey, buffer) {
  const filePath = getStageDocumentAttachmentPath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertStageDocumentAttachmentFileReadable(storageKey) {
  const filePath = getStageDocumentAttachmentPath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function cleanupStageDocumentAttachmentFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getStageDocumentAttachmentPath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Best-effort cleanup: preserve original business error path.
    }
  }
}
