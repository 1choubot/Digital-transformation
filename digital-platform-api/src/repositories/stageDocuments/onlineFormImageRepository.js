import { createHash } from 'node:crypto';
import { pool } from '../../db/pool.js';
import {
  INITIATION_REWORK_TARGET_DOCUMENT_CODE
} from '../../domain/initiationReview.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { ProjectNotFoundError } from '../projectRepository.js';
import { canViewStageDocumentItem } from './accessControl.js';
import { StageDocumentNotFoundError } from './shared.js';
import {
  STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_FILE_SIZE,
  assertStageDocumentOnlineFormImageFileReadable,
  cleanupStageDocumentOnlineFormImageFile,
  createStageDocumentOnlineFormImageStorageKey,
  readStageDocumentOnlineFormImageFile,
  writeStageDocumentOnlineFormImageFile
} from '../../storage/stageDocumentOnlineFormImageStorage.js';

export const ONLINE_FORM_IMAGE_FIELD = Object.freeze({
  SITE_CONDITION: 'siteConditionImages',
  WORKPIECE: 'workpieceImages',
  OPERATION_PROCESS: 'operationProcessImages'
});

export const STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_ACTIVE_PER_FIELD = 3;

export const ONLINE_FORM_IMAGE_FIELDS = Object.freeze({
  [ONLINE_FORM_IMAGE_FIELD.SITE_CONDITION]: Object.freeze({
    fieldKey: ONLINE_FORM_IMAGE_FIELD.SITE_CONDITION,
    label: '可用场地尺寸/场地情况图片'
  }),
  [ONLINE_FORM_IMAGE_FIELD.WORKPIECE]: Object.freeze({
    fieldKey: ONLINE_FORM_IMAGE_FIELD.WORKPIECE,
    label: '工件描述图片'
  }),
  [ONLINE_FORM_IMAGE_FIELD.OPERATION_PROCESS]: Object.freeze({
    fieldKey: ONLINE_FORM_IMAGE_FIELD.OPERATION_PROCESS,
    label: '作业工艺图片'
  })
});

export const STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR = Object.freeze({
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_STAGE_DOCUMENT_ID: 'INVALID_STAGE_DOCUMENT_ID',
  INVALID_IMAGE_ID: 'INVALID_ONLINE_FORM_IMAGE_ID',
  INVALID_FIELD_KEY: 'INVALID_ONLINE_FORM_IMAGE_FIELD',
  INVALID_IMAGE_FILE: 'INVALID_ONLINE_FORM_IMAGE_FILE',
  IMAGE_LIMIT_EXCEEDED: 'ONLINE_FORM_IMAGE_LIMIT_EXCEEDED',
  FORBIDDEN_OPERATION: 'FORBIDDEN_OPERATION',
  IMAGE_NOT_FOUND: 'ONLINE_FORM_IMAGE_NOT_FOUND',
  IMAGE_FILE_MISSING: 'ONLINE_FORM_IMAGE_FILE_MISSING'
});

export class StageDocumentOnlineFormImageError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = 'StageDocumentOnlineFormImageError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const IMAGE_MIME_TO_EXTENSION = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg'
});

const MAX_IMAGE_TEXT_FIELD_LENGTH = 255;

function sanitizeOriginalFileName(filename) {
  return String(filename || '').replace(/\\/g, '/').split('/').pop().trim();
}

function normalizeFieldKey(fieldKey) {
  const normalized = String(fieldKey || '').trim();
  if (!ONLINE_FORM_IMAGE_FIELDS[normalized]) {
    throw new StageDocumentOnlineFormImageError(
      STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.INVALID_FIELD_KEY,
      'Invalid online form image field',
      400,
      ['fieldKey']
    );
  }

  return normalized;
}

function fileExtensionFromName(filename) {
  const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function isPng(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  );
}

function throwInvalidImageFile() {
  throw new StageDocumentOnlineFormImageError(
    STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.INVALID_IMAGE_FILE,
    'Invalid online form image file',
    400,
    ['file']
  );
}

function calculateImageContentHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function normalizeUploadImageFile(file) {
  if (!file || file.tooLarge || !Buffer.isBuffer(file.buffer)) {
    throwInvalidImageFile();
  }

  const size = Number(file.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_FILE_SIZE ||
    file.buffer.length !== size
  ) {
    throwInvalidImageFile();
  }

  const originalFileName = sanitizeOriginalFileName(file.originalFileName);
  const mimeType = String(file.mimeType || '').trim().toLowerCase();
  const extension = fileExtensionFromName(originalFileName);
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const expectedExtension = IMAGE_MIME_TO_EXTENSION[mimeType];

  if (
    !originalFileName ||
    originalFileName.length > MAX_IMAGE_TEXT_FIELD_LENGTH ||
    !expectedExtension ||
    !['png', 'jpg', 'jpeg'].includes(extension) ||
    (expectedExtension === 'png' && normalizedExtension !== 'png') ||
    (expectedExtension === 'jpg' && !['jpg', 'jpeg'].includes(extension)) ||
    (expectedExtension === 'png' && !isPng(file.buffer)) ||
    (expectedExtension === 'jpg' && !isJpeg(file.buffer))
  ) {
    throwInvalidImageFile();
  }

  return {
    ...file,
    originalFileName,
    mimeType: expectedExtension === 'png' ? 'image/png' : 'image/jpeg',
    extension: expectedExtension,
    size,
    contentHash: calculateImageContentHash(file.buffer)
  };
}

function isProjectEnded(project) {
  return project?.status === PROJECT_STATUS.ENDED;
}

function isRequirementDocumentEditable(document) {
  const status = document?.status ?? DOCUMENT_STATUS.NOT_SUBMITTED;
  const revisionRequired = document?.revision_required === 1 || document?.revision_required === true;
  return [DOCUMENT_STATUS.NOT_SUBMITTED, DOCUMENT_STATUS.RETURNED].includes(status) || revisionRequired;
}

function isCurrentResponsible(user, document) {
  const responsibleUserId = document?.responsible_user_id ?? document?.responsibleUserId ?? null;
  return Boolean(responsibleUserId) && String(responsibleUserId) === String(user?.id);
}

function throwForbiddenOnlineFormImageOperation(details = ['documentId']) {
  throw new StageDocumentOnlineFormImageError(
    STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.FORBIDDEN_OPERATION,
    'Current user cannot access this online form image',
    403,
    details
  );
}

async function selectProject(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      id,
      project_manager_user_id,
      business_responsible_user_id,
      technical_responsible_user_id,
      created_by_user_id,
      participating_departments,
      status
    FROM projects
    WHERE id = ?
    LIMIT 1`,
    [projectId]
  );

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

async function selectDocument(executor, projectId, documentId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      d.*,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
      AND d.id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentId]
  );

  if (rows.length === 0) {
    throw new StageDocumentNotFoundError(projectId, documentId);
  }

  return rows[0];
}

function assertCanViewOnlineFormImages({ user, project, document }) {
  if (!canViewStageDocumentItem(user, { project, document })) {
    throwForbiddenOnlineFormImageOperation(['documentId']);
  }
}

function assertCanMutateOnlineFormImages({ user, project, document }) {
  if (String(document.document_code ?? document.documentCode ?? '') !== INITIATION_REWORK_TARGET_DOCUMENT_CODE) {
    throwForbiddenOnlineFormImageOperation(['documentCode']);
  }
  if (document.is_applicable === 0 || document.is_applicable === false) {
    throwForbiddenOnlineFormImageOperation(['documentId']);
  }
  if (isProjectEnded(project)) {
    throwForbiddenOnlineFormImageOperation(['projectId']);
  }
  if (!isRequirementDocumentEditable(document)) {
    throw new StageDocumentOnlineFormImageError(
      'FORM_DOCUMENT_NOT_EDITABLE',
      'Current stage document form image cannot be changed from this status',
      409,
      ['documentId', 'status']
    );
  }
  if (!isCurrentResponsible(user, document)) {
    throwForbiddenOnlineFormImageOperation(['responsibleUserId']);
  }
}

function mapUploadedByUser(row) {
  return {
    id: row.uploaded_by_user_id,
    account: row.uploaded_by_account,
    name: row.uploaded_by_display_name
  };
}

function buildImagePermissions({ user, project, document }) {
  return {
    canDownload: canViewStageDocumentItem(user, { project, document }),
    canDelete:
      String(document.document_code ?? '') === INITIATION_REWORK_TARGET_DOCUMENT_CODE &&
      !isProjectEnded(project) &&
      isRequirementDocumentEditable(document) &&
      isCurrentResponsible(user, document)
  };
}

function mapOnlineFormImage(row, permissions = {}, { includePrivate = false } = {}) {
  const mapped = {
    id: row.id,
    fieldKey: row.field_key,
    fieldLabel: ONLINE_FORM_IMAGE_FIELDS[row.field_key]?.label ?? row.field_key,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    contentHash: row.content_sha256 ?? null,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    uploadedByUser: mapUploadedByUser(row),
    permissions,
    ...permissions
  };

  if (includePrivate) {
    mapped.storageKey = row.storage_key;
  }

  return mapped;
}

async function selectImageWithUploader(executor, imageId) {
  const [rows] = await executor.execute(
    `SELECT
      i.*,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_stage_document_form_images i
    LEFT JOIN users u
      ON u.id = i.uploaded_by_user_id
    WHERE i.id = ?
    LIMIT 1`,
    [imageId]
  );

  return rows[0] || null;
}

async function selectActiveImage(executor, projectId, documentId, imageId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_form_images
    WHERE project_id = ?
      AND stage_document_id = ?
      AND id = ?
      AND deleted_at IS NULL
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentId, imageId]
  );

  if (rows.length === 0) {
    throw new StageDocumentOnlineFormImageError(
      STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.IMAGE_NOT_FOUND,
      'Online form image not found',
      404,
      ['imageId']
    );
  }

  return rows[0];
}

export async function listStageDocumentOnlineFormImagesForDocument({
  executor,
  projectId,
  documentId,
  user,
  project = null,
  document = null
}) {
  const queryExecutor = executor || pool;
  const selectedProject = project || (await selectProject(queryExecutor, projectId));
  const selectedDocument = document || (await selectDocument(queryExecutor, projectId, documentId));
  assertCanViewOnlineFormImages({ user, project: selectedProject, document: selectedDocument });

  const [rows] = await queryExecutor.execute(
    `SELECT
      i.*,
      u.account AS uploaded_by_account,
      u.display_name AS uploaded_by_display_name
    FROM project_stage_document_form_images i
    LEFT JOIN users u
      ON u.id = i.uploaded_by_user_id
    WHERE i.project_id = ?
      AND i.stage_document_id = ?
      AND i.deleted_at IS NULL
    ORDER BY i.field_key ASC, i.uploaded_at ASC, i.id ASC`,
    [projectId, documentId]
  );

  const permissions = buildImagePermissions({ user, project: selectedProject, document: selectedDocument });
  return rows.map((row) => mapOnlineFormImage(row, permissions));
}

export async function listStageDocumentOnlineFormImagesForGeneration(executor, projectId, documentId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_stage_document_form_images
    WHERE project_id = ?
      AND stage_document_id = ?
      AND deleted_at IS NULL
    ORDER BY field_key ASC, uploaded_at ASC, id ASC`,
    [projectId, documentId]
  );

  return rows.map((row) => ({
    id: row.id,
    fieldKey: row.field_key,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    contentHash: row.content_sha256 ?? null,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    storageKey: row.storage_key
  }));
}

function buildImageLogDetails(document, image) {
  return {
    documentId: document.id,
    documentCode: document.document_code,
    documentName: document.document_name,
    imageId: image.id,
    fieldKey: image.field_key,
    originalFileName: image.original_file_name,
    fileSize: Number(image.file_size)
  };
}

function throwImageLimitExceeded(fieldKey) {
  throw new StageDocumentOnlineFormImageError(
    STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.IMAGE_LIMIT_EXCEEDED,
    `Online form image field allows at most ${STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_ACTIVE_PER_FIELD} active images`,
    409,
    {
      fieldKey,
      maxImages: STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_ACTIVE_PER_FIELD
    }
  );
}

export async function uploadStageDocumentOnlineFormImage({ projectId, documentId, fieldKey, user, file }) {
  const normalizedFieldKey = normalizeFieldKey(fieldKey);
  const uploadFile = normalizeUploadImageFile(file);
  const storageKey = createStageDocumentOnlineFormImageStorageKey({
    projectId,
    documentId,
    fieldKey: normalizedFieldKey,
    extension: uploadFile.extension
  });
  let fileWritten = false;
  let committed = false;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const project = await selectProject(connection, projectId);
    const document = await selectDocument(connection, projectId, documentId, { forUpdate: true });
    assertCanMutateOnlineFormImages({ user, project, document });

    const [activeRows] = await connection.execute(
      `SELECT id
      FROM project_stage_document_form_images
      WHERE project_id = ?
        AND stage_document_id = ?
        AND field_key = ?
        AND deleted_at IS NULL
      ORDER BY uploaded_at ASC, id ASC
      FOR UPDATE`,
      [projectId, documentId, normalizedFieldKey]
    );
    if (activeRows.length >= STAGE_DOCUMENT_ONLINE_FORM_IMAGE_MAX_ACTIVE_PER_FIELD) {
      throwImageLimitExceeded(normalizedFieldKey);
    }

    const stored = await writeStageDocumentOnlineFormImageFile(storageKey, uploadFile.buffer);
    fileWritten = true;
    if (stored.size !== uploadFile.size) {
      throwInvalidImageFile();
    }

    const [result] = await connection.execute(
      `INSERT INTO project_stage_document_form_images (
        project_id,
        stage_document_id,
        field_key,
        original_file_name,
        storage_key,
        mime_type,
        file_size,
        content_sha256,
        uploaded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        documentId,
        normalizedFieldKey,
        uploadFile.originalFileName,
        storageKey,
        uploadFile.mimeType,
        uploadFile.size,
        uploadFile.contentHash,
        user.id
      ]
    );

    const imageRow = await selectImageWithUploader(connection, result.insertId);
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.FORM_IMAGE_UPLOADED,
      targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
      targetId: documentId,
      summary: `上传在线表单图片：${document.document_name} / ${ONLINE_FORM_IMAGE_FIELDS[normalizedFieldKey].label}`,
      details: buildImageLogDetails(document, imageRow)
    });

    await connection.commit();
    committed = true;

    return mapOnlineFormImage(
      imageRow,
      buildImagePermissions({ user, project, document })
    );
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }

    if (fileWritten) {
      await cleanupStageDocumentOnlineFormImageFile(storageKey);
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function getStageDocumentOnlineFormImageDownload({ projectId, documentId, imageId, user }) {
  const project = await selectProject(pool, projectId);
  const document = await selectDocument(pool, projectId, documentId);
  assertCanViewOnlineFormImages({ user, project, document });
  const image = await selectActiveImage(pool, projectId, documentId, imageId);

  try {
    const filePath = await assertStageDocumentOnlineFormImageFileReadable(image.storage_key);
    return {
      filePath,
      originalFileName: image.original_file_name,
      mimeType: image.mime_type,
      fileSize: Number(image.file_size)
    };
  } catch {
    throw new StageDocumentOnlineFormImageError(
      STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.IMAGE_FILE_MISSING,
      'Online form image file missing',
      404,
      ['imageId']
    );
  }
}

export async function readOnlineFormImageForGeneration(image) {
  return readStageDocumentOnlineFormImageFile(image.storageKey);
}

export async function deleteStageDocumentOnlineFormImage({ projectId, documentId, imageId, user }) {
  let committed = false;
  let storageKey = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const project = await selectProject(connection, projectId);
    const document = await selectDocument(connection, projectId, documentId, { forUpdate: true });
    assertCanMutateOnlineFormImages({ user, project, document });
    const image = await selectActiveImage(connection, projectId, documentId, imageId, { forUpdate: true });
    storageKey = image.storage_key;

    await connection.execute(
      `UPDATE project_stage_document_form_images
      SET deleted_by_user_id = ?,
        deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND deleted_at IS NULL`,
      [user.id, imageId]
    );
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.FORM_IMAGE_DELETED,
      targetType: OPERATION_TARGET_TYPE.ONLINE_FORM,
      targetId: documentId,
      summary: `删除在线表单图片：${document.document_name} / ${ONLINE_FORM_IMAGE_FIELDS[image.field_key]?.label ?? image.field_key}`,
      details: buildImageLogDetails(document, image)
    });

    await connection.commit();
    committed = true;
    await cleanupStageDocumentOnlineFormImageFile(storageKey);
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
