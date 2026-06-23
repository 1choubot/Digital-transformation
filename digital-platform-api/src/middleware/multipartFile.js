import Busboy from 'busboy';
import { STAGE_DOCUMENT_ATTACHMENT_MAX_FILE_SIZE } from '../storage/stageDocumentAttachmentStorage.js';

const DEFAULT_MIME_TYPE = 'application/octet-stream';
const MAX_ATTACHMENT_TEXT_FIELD_LENGTH = 255;

function sanitizeOriginalFileName(filename) {
  return String(filename || '').replace(/\\/g, '/').split('/').pop().trim();
}

function normalizeMimeType(mimeType) {
  const normalized = String(mimeType || '').trim();
  return normalized || DEFAULT_MIME_TYPE;
}

function buildFileResult(file, maxFileSize) {
  if (!file) {
    return null;
  }

  const originalFileName = sanitizeOriginalFileName(file.originalFileName);
  const mimeType = normalizeMimeType(file.mimeType);

  if (
    !originalFileName ||
    originalFileName.length > MAX_ATTACHMENT_TEXT_FIELD_LENGTH ||
    mimeType.length > MAX_ATTACHMENT_TEXT_FIELD_LENGTH ||
    file.size <= 0 ||
    file.size > maxFileSize
  ) {
    return null;
  }

  return {
    originalFileName,
    mimeType,
    buffer: Buffer.concat(file.chunks, file.size),
    size: file.size,
    tooLarge: false
  };
}

export async function readMultipartFile(
  req,
  { fieldName = 'file', maxFileSize = STAGE_DOCUMENT_ATTACHMENT_MAX_FILE_SIZE } = {}
) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return null;
  }

  let parser;
  try {
    parser = Busboy({
      headers: req.headers,
      limits: {
        fileSize: maxFileSize
      },
      defParamCharset: 'utf8'
    });
  } catch {
    return null;
  }

  return await new Promise((resolve) => {
    let settled = false;
    let invalid = false;
    let fileCount = 0;
    let file = null;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    }

    parser.on('file', (name, stream, info = {}) => {
      fileCount += 1;

      if (name !== fieldName || fileCount > 1 || !info.filename) {
        invalid = true;
        stream.resume();
        return;
      }

      const currentFile = {
        originalFileName: info.filename,
        mimeType: info.mimeType,
        chunks: [],
        size: 0,
        tooLarge: false
      };
      file = currentFile;

      stream.on('limit', () => {
        invalid = true;
        currentFile.tooLarge = true;
        currentFile.chunks = [];
      });

      stream.on('data', (chunk) => {
        if (currentFile.tooLarge) {
          return;
        }

        currentFile.size += chunk.length;
        currentFile.chunks.push(chunk);
      });

      stream.on('error', () => {
        invalid = true;
      });
    });

    parser.on('filesLimit', () => {
      invalid = true;
    });

    parser.on('error', () => {
      finish(null);
    });

    parser.on('finish', () => {
      if (invalid || fileCount !== 1) {
        finish(null);
        return;
      }

      finish(buildFileResult(file, maxFileSize));
    });

    req.on('aborted', () => {
      finish(null);
    });

    req.on('error', () => {
      finish(null);
    });

    try {
      req.pipe(parser);
    } catch {
      finish(null);
    }
  });
}
