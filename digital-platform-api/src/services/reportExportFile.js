import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from '../config/env.js';

const DEFAULT_EXPORT_DIR = path.resolve(os.tmpdir(), 'digital-platform-report-downloads');

export function sanitizeReportFileNamePart(value, fallback = 'report') {
  const text = String(value || '').trim() || fallback;
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, '_').slice(0, 120);
}

function reportExportRoot() {
  return path.resolve(env.reports.exportRoot || DEFAULT_EXPORT_DIR);
}

export async function writeReportExportFile({ scope, fileName, buffer }) {
  const safeScope = sanitizeReportFileNamePart(scope, 'reports');
  const safeFileName = sanitizeReportFileNamePart(fileName, 'report.xlsx').replace(/_xlsx$/i, '.xlsx');
  const directory = path.join(reportExportRoot(), safeScope);
  await fs.mkdir(directory, { recursive: true });

  const uniquePrefix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filePath = path.join(directory, `${uniquePrefix}-${safeFileName}`);
  await fs.writeFile(filePath, buffer);

  return {
    directory,
    fileName: safeFileName,
    filePath,
    fileSize: buffer.length
  };
}

export async function cleanupReportExportFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(reportExportRoot())) {
      return;
    }
    await fs.unlink(resolved);
  } catch {
    // Download cleanup is best-effort; stale temp files do not affect business state.
  }
}

