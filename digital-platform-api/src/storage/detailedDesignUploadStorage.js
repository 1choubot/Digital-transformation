import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DETAILED_DESIGN_UPLOAD_MAX_FILE_SIZE = 200 * 1024 * 1024;

const DEFAULT_DETAILED_DESIGN_UPLOAD_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'detailed-design-uploads'
);

export function getDetailedDesignUploadStorageDir() {
  return DEFAULT_DETAILED_DESIGN_UPLOAD_STORAGE_DIR;
}

export function createDetailedDesignUploadStorageKey({ projectId, slotKey }) {
  return path.join(String(projectId), String(slotKey), `${Date.now()}-${randomUUID()}`);
}

export function getDetailedDesignUploadPath(storageKey) {
  const storageDir = getDetailedDesignUploadStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid detailed design upload storage key');
  }

  return resolved;
}

export async function writeDetailedDesignUploadFile(storageKey, buffer) {
  const filePath = getDetailedDesignUploadPath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertDetailedDesignUploadFileReadable(storageKey) {
  const filePath = getDetailedDesignUploadPath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function cleanupDetailedDesignUploadFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getDetailedDesignUploadPath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Best-effort cleanup: preserve the original business error.
    }
  }
}
