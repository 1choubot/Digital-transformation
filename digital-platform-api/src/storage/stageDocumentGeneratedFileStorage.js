import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_GENERATED_FILE_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'stage-document-generated-files'
);

export function getStageDocumentGeneratedFileStorageDir() {
  return DEFAULT_GENERATED_FILE_STORAGE_DIR;
}

export function createStageDocumentGeneratedFileStorageKey({ projectId, documentId, version, fileType }) {
  return path.join(
    String(projectId),
    String(documentId),
    `v${version}-${Date.now()}-${randomUUID()}.${fileType}`
  );
}

export function getStageDocumentGeneratedFilePath(storageKey) {
  const storageDir = getStageDocumentGeneratedFileStorageDir();
  const resolved = path.resolve(storageDir, storageKey);

  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new Error('Invalid generated file storage key');
  }

  return resolved;
}

export async function writeStageDocumentGeneratedFile(storageKey, buffer) {
  const filePath = getStageDocumentGeneratedFilePath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const stat = await fs.stat(filePath);

  return {
    filePath,
    size: stat.size
  };
}

export async function assertStageDocumentGeneratedFileReadable(storageKey) {
  const filePath = getStageDocumentGeneratedFilePath(storageKey);
  await fs.access(filePath);
  return filePath;
}

export async function cleanupStageDocumentGeneratedFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(getStageDocumentGeneratedFilePath(storageKey));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Preserve the original generation error path.
    }
  }
}
