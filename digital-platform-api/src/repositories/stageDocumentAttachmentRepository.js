import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from './operationLogRepository.js';
import { pool } from '../db/pool.js';
import { ProjectNotFoundError } from './projectRepository.js';
import { StageDocumentNotFoundError } from './stageDocumentRepository.js';
import {
  STAGE_DOCUMENT_ATTACHMENT_MAX_FILE_SIZE,
  assertStageDocumentAttachmentFileReadable,
  cleanupStageDocumentAttachmentFile,
  createStageDocumentAttachmentStorageKey,
  writeStageDocumentAttachmentFile
} from '../storage/stageDocumentAttachmentStorage.js';

export const STAGE_DOCUMENT_ATTACHMENT_ERROR = {
  INVALID_ATTACHMENT_FILE: 'INVALID_ATTACHMENT_FILE',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_STAGE_DOCUMENT_ID: 'INVALID_STAGE_DOCUMENT_ID',
  INVALID_ATTACHMENT_ID: 'INVALID_ATTACHMENT_ID',
  STAGE_DOCUMENT_NOT_APPLICABLE: 'STAGE_DOCUMENT_NOT_APPLICABLE',
  ATTACHMENT_NOT_FOUND: 'ATTACHMENT_NOT_FOUND',
  ATTACHMENT_FILE_MISSING: 'ATTACHMENT_FILE_MISSING'
};

export class StageDocumentAttachmentError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentAttachmentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DEFAULT_ATTACHMENT_MIME_TYPE = 'application/octet-stream';
const MAX_ATTACHMENT_TEXT_FIELD_LENGTH = 255;

function throwInvalidAttachmentFile() {
  throw new StageDocumentAttachmentError(
    STAGE_DOCUMENT_ATTACHMENT_ERROR.INVALID_ATTACHMENT_FILE,
    'Invalid attachment file',
    400,
    ['file']
  );
}

function mapUploadedByUser(row) {
  return {
    id: row.uploaded_by_user_id,
    account: row.uploaded_by_account,
    name: row.uploaded_by_display_name
  };
}

function mapAttachment(row) {
  return {
    id: row.id,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    uploadedByUser: mapUploadedByUser(row)
  };
}

function sanitizeOriginalFileName(filename) {
  return String(filename || '').replace(/\\/g, '/').split('/').pop().trim();
}

function normalizeAttachmentMimeType(mimeType) {
  const normalized = String(mimeType || '').trim();
  return normalized || DEFAULT_ATTACHMENT_MIME_TYPE;
}

function normalizeUploadFile(file) {
  if (!file || file.tooLarge || !Buffer.isBuffer(file.buffer)) {
    throwInvalidAttachmentFile();
  }

  const size = Number(file.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > STAGE_DOCUMENT_ATTACHMENT_MAX_FILE_SIZE ||
    file.buffer.length !== size
  ) {
    throwInvalidAttachmentFile();
  }

  const originalFileName = sanitizeOriginalFileName(file.originalFileName);
  const mimeType = normalizeAttachmentMimeType(file.mimeType);

  if (
    !originalFileName ||
    originalFileName.length > MAX_ATTACHMENT_TEXT_FIELD_LENGTH ||
    mimeType.length > MAX_ATTACHMENT_TEXT_FIELD_LENGTH
  ) {
    throwInvalidAttachmentFile();
  }

  return {
    ...file,
    originalFileName,
    mimeType,
    size
  };
}

function assertDocumentApplicable(document) {
  if (document.is_applicable === 0 || document.is_applicable === false) {
    throw new StageDocumentAttachmentError(
      STAGE_DOCUMENT_ATTACHMENT_ERROR.STAGE_DOCUMENT_NOT_APPLICABLE,
      'Stage document is not applicable',
      409,
      ['documentId']
    );
  }
}

async function assertProjectExists(executor, projectId) {
  const [rows] = await executor.execute('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }
}

async function selectStageDocument(executor, projectId, documentId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_documents
    WHERE project_id = ?
      AND id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentNotFoundError(projectId, documentId);
  }

  return rows[0];
}

async function selectAttachment(executor, projectId, documentId, attachmentId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_attachments
    WHERE project_id = ?
      AND stage_document_id = ?
      AND id = ?
      AND deleted_at IS NULL
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentId, attachmentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentAttachmentError(
      STAGE_DOCUMENT_ATTACHMENT_ERROR.ATTACHMENT_NOT_FOUND,
      'Attachment not found',
      404,
      ['attachmentId']
    );
  }

  return rows[0];
}

async function selectAttachmentWithUploader(executor, attachmentId) {
  const [rows] = await executor.execute(
    `SELECT
      a.*,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_stage_document_attachments a
    LEFT JOIN users u
      ON u.id = a.uploaded_by_user_id
    WHERE a.id = ?
    LIMIT 1`,
    [attachmentId]
  );

  return rows[0];
}

function buildAttachmentLogDetails(document, attachment) {
  return {
    documentId: document.id,
    documentCode: document.document_code,
    documentName: document.document_name,
    attachmentId: attachment.id,
    originalFileName: attachment.original_file_name,
    fileSize: Number(attachment.file_size)
  };
}

function buildAttachmentUploadLog({ projectId, userId, document, attachment }) {
  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_ATTACHMENT_UPLOADED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: document.id,
    summary: `上传资料附件：${document.document_name} / ${attachment.original_file_name}`,
    details: buildAttachmentLogDetails(document, attachment)
  };
}

function buildAttachmentDeleteLog({ projectId, userId, document, attachment }) {
  return {
    projectId,
    actorUserId: userId,
    actionType: OPERATION_ACTION_TYPE.DOCUMENT_ATTACHMENT_DELETED,
    targetType: OPERATION_TARGET_TYPE.STAGE_DOCUMENT,
    targetId: document.id,
    summary: `删除资料附件：${document.document_name} / ${attachment.original_file_name}`,
    details: buildAttachmentLogDetails(document, attachment)
  };
}

export async function assertStageDocumentAttachmentUploadTarget({ projectId, documentId }) {
  await assertProjectExists(pool, projectId);
  const document = await selectStageDocument(pool, projectId, documentId);
  assertDocumentApplicable(document);
}

export async function listStageDocumentAttachments({ projectId, documentId }) {
  await assertProjectExists(pool, projectId);
  await selectStageDocument(pool, projectId, documentId);

  const [rows] = await pool.execute(
    `SELECT
      a.id,
      a.original_file_name,
      a.mime_type,
      a.file_size,
      a.uploaded_by_user_id,
      a.uploaded_at,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_stage_document_attachments a
    LEFT JOIN users u
      ON u.id = a.uploaded_by_user_id
    WHERE a.project_id = ?
      AND a.stage_document_id = ?
      AND a.deleted_at IS NULL
    ORDER BY a.uploaded_at DESC, a.id DESC`,
    [projectId, documentId]
  );

  return rows.map(mapAttachment);
}

export async function uploadStageDocumentAttachment({ projectId, documentId, userId, file }) {
  const uploadFile = normalizeUploadFile(file);

  const storageKey = createStageDocumentAttachmentStorageKey({ projectId, documentId });
  let fileWritten = false;
  let committed = false;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await assertProjectExists(connection, projectId);
    const document = await selectStageDocument(connection, projectId, documentId, { forUpdate: true });
    assertDocumentApplicable(document);

    const stored = await writeStageDocumentAttachmentFile(storageKey, uploadFile.buffer);
    fileWritten = true;

    if (stored.size !== uploadFile.size) {
      throw new StageDocumentAttachmentError(
        STAGE_DOCUMENT_ATTACHMENT_ERROR.INVALID_ATTACHMENT_FILE,
        'Invalid attachment file',
        400,
        ['file']
      );
    }

    const [result] = await connection.execute(
      `INSERT INTO project_stage_document_attachments (
        project_id,
        stage_document_id,
        original_file_name,
        storage_key,
        mime_type,
        file_size,
        uploaded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        documentId,
        uploadFile.originalFileName,
        storageKey,
        uploadFile.mimeType,
        uploadFile.size,
        userId
      ]
    );

    const attachmentRow = await selectAttachmentWithUploader(connection, result.insertId);
    await insertOperationLog(
      connection,
      buildAttachmentUploadLog({ projectId, userId, document, attachment: attachmentRow })
    );
    await connection.commit();
    committed = true;

    return mapAttachment(attachmentRow);
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }

    if (fileWritten) {
      await cleanupStageDocumentAttachmentFile(storageKey);
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function getStageDocumentAttachmentDownload({ projectId, documentId, attachmentId }) {
  await assertProjectExists(pool, projectId);
  await selectStageDocument(pool, projectId, documentId);
  const attachment = await selectAttachment(pool, projectId, documentId, attachmentId);

  try {
    const filePath = await assertStageDocumentAttachmentFileReadable(attachment.storage_key);

    return {
      filePath,
      originalFileName: attachment.original_file_name,
      mimeType: attachment.mime_type || 'application/octet-stream',
      fileSize: Number(attachment.file_size)
    };
  } catch {
    throw new StageDocumentAttachmentError(
      STAGE_DOCUMENT_ATTACHMENT_ERROR.ATTACHMENT_FILE_MISSING,
      'Attachment file missing',
      404,
      ['attachmentId']
    );
  }
}

export async function deleteStageDocumentAttachment({ projectId, documentId, attachmentId, userId }) {
  let committed = false;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await assertProjectExists(connection, projectId);
    const document = await selectStageDocument(connection, projectId, documentId, { forUpdate: true });
    const attachment = await selectAttachment(connection, projectId, documentId, attachmentId, { forUpdate: true });

    await connection.execute(
      `UPDATE project_stage_document_attachments
      SET deleted_by_user_id = ?,
        deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND deleted_at IS NULL`,
      [userId, attachmentId]
    );

    await insertOperationLog(
      connection,
      buildAttachmentDeleteLog({ projectId, userId, document, attachment })
    );
    await connection.commit();
    committed = true;
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
