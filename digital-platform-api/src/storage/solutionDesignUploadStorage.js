import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const SOLUTION_DESIGN_UPLOAD_MAX_FILE_SIZE = 50 * 1024 * 1024;

const DEFAULT_SOLUTION_DESIGN_UPLOAD_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'solution-design-uploads'
);

export function getSolutionDesignUploadStorageDir() {
  return DEFAULT_SOLUTION_DESIGN_UPLOAD_STORAGE_DIR;
}

export function createSolutionDesignUploadStorageKey({ projectId, slotKey }) {
  return path.join(String(projectId), String(slotKey), `${Date.now()}-${randomUUID()}`);
}

export function getSolutionDesignUploadPath(storageKey) {
  const storageDir = getSolutionDesignUploadStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid solution design upload storage key');
  }

  return resolved;
}

export async function writeSolutionDesignUploadFile(storageKey, buffer) {
  const filePath = getSolutionDesignUploadPath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertSolutionDesignUploadFileReadable(storageKey) {
  const filePath = getSolutionDesignUploadPath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function cleanupSolutionDesignUploadFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getSolutionDesignUploadPath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Best-effort cleanup: preserve original business error path.
    }
  }
}
