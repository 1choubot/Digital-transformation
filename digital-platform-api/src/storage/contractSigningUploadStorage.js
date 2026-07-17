import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const CONTRACT_SIGNING_UPLOAD_MAX_FILE_SIZE = 50 * 1024 * 1024;

const DEFAULT_CONTRACT_SIGNING_UPLOAD_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'contract-signing-uploads'
);

export function getContractSigningUploadStorageDir() {
  return DEFAULT_CONTRACT_SIGNING_UPLOAD_STORAGE_DIR;
}

export function createContractSigningUploadStorageKey({ projectId, slotKey }) {
  return path.join(String(projectId), String(slotKey), `${Date.now()}-${randomUUID()}`);
}

export function getContractSigningUploadPath(storageKey) {
  const storageDir = getContractSigningUploadStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid contract signing upload storage key');
  }

  return resolved;
}

export async function writeContractSigningUploadFile(storageKey, buffer) {
  const filePath = getContractSigningUploadPath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertContractSigningUploadFileReadable(storageKey) {
  const filePath = getContractSigningUploadPath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function cleanupContractSigningUploadFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getContractSigningUploadPath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Best-effort cleanup: preserve the original business error.
    }
  }
}
