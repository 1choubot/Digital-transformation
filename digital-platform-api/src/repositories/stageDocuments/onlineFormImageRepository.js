import { createHash } from 'node:crypto';
import { pool } from '../../db/pool.js';
import {
  INITIATION_REWORK_TARGET_DOCUMENT_CODE
} from '../../domain/initiationReview.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { DOCUMENT_STATUS } from '../../domain/stageDocumentTemplates.js';
import {
  SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_NODE_KEY,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_ROLE_KEY,
  SOLUTION_DESIGN_STAGE,
  isSolutionDesignAnalysisFormDocumentCode
} from '../../domain/solutionDesignWorkflow.js';
import {
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE,
  insertOperationLog
} from '../operationLogRepository.js';
import { ProjectNotFoundError } from '../projects/shared.js';
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
  OPERATION_PROCESS: 'operationProcessImages',
  PROJECT_TARGET: 'projectTargetImages'
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
  }),
  [ONLINE_FORM_IMAGE_FIELD.PROJECT_TARGET]: Object.freeze({
    fieldKey: ONLINE_FORM_IMAGE_FIELD.PROJECT_TARGET,
    label: '目标图片'
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
const INITIATION_ONLINE_FORM_IMAGE_FIELD_KEYS = new Set([
  ONLINE_FORM_IMAGE_FIELD.SITE_CONDITION,
  ONLINE_FORM_IMAGE_FIELD.WORKPIECE,
  ONLINE_FORM_IMAGE_FIELD.OPERATION_PROCESS
]);
const SOLUTION_DESIGN_ANALYSIS_IMAGE_FIELD_KEYS = new Set([
  ONLINE_FORM_IMAGE_FIELD.SITE_CONDITION,
  ONLINE_FORM_IMAGE_FIELD.WORKPIECE,
  ONLINE_FORM_IMAGE_FIELD.OPERATION_PROCESS,
  ONLINE_FORM_IMAGE_FIELD.PROJECT_TARGET
]);

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

function getDocumentCode(document) {
  return String(document?.document_code ?? document?.documentCode ?? '').trim();
}

function isInitiationRequirementDocument(document) {
  return getDocumentCode(document) === INITIATION_REWORK_TARGET_DOCUMENT_CODE;
}

function assertFieldAllowedForDocument(fieldKey, document) {
  const documentCode = getDocumentCode(document);
  const allowedFields = isSolutionDesignAnalysisFormDocumentCode(documentCode)
    ? SOLUTION_DESIGN_ANALYSIS_IMAGE_FIELD_KEYS
    : documentCode === INITIATION_REWORK_TARGET_DOCUMENT_CODE
      ? INITIATION_ONLINE_FORM_IMAGE_FIELD_KEYS
      : null;

  if (!allowedFields?.has(fieldKey)) {
    throw new StageDocumentOnlineFormImageError(
      STAGE_DOCUMENT_ONLINE_FORM_IMAGE_ERROR.INVALID_FIELD_KEY,
      'Online form image field is not allowed for this document',
      400,
      ['fieldKey', 'documentCode']
    );
  }
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

function isSolutionDesignAnalysisDocument(document) {
  return isSolutionDesignAnalysisFormDocumentCode(getDocumentCode(document));
}

function isCurrentResponsible(user, document) {
  const responsibleUserId = document?.responsible_user_id ?? document?.responsibleUserId ?? null;
  return Boolean(responsibleUserId) && String(responsibleUserId) === String(user?.id);
}

function isCurrentSolutionStage(project) {
  return (
    String(project?.current_stage_key ?? project?.currentStageKey ?? '') === SOLUTION_DESIGN_STAGE.STAGE_KEY ||
    Number(project?.current_stage_order ?? project?.currentStageOrder ?? 0) === SOLUTION_DESIGN_STAGE.STAGE_ORDER
  );
}

async function selectSolutionDesignImageMutationContext(executor, projectId) {
  const [roleRows] = await executor.execute(
    `SELECT
      p.project_manager_user_id,
      r.technical_owner_user_id,
      r.business_owner_user_id,
      r.procurement_owner_user_id,
      r.finance_accountant_user_id,
      r.finance_owner_user_id
    FROM projects p
    LEFT JOIN project_solution_design_roles r
      ON r.project_id = p.id
    WHERE p.id = ?
    LIMIT 1`,
    [projectId]
  );
  const [nodeRows] = await executor.execute(
    `SELECT node_key, status
    FROM project_solution_design_nodes
    WHERE project_id = ?
      AND node_key = ?
    LIMIT 1`,
    [projectId, SOLUTION_DESIGN_NODE_KEY.ANALYSIS]
  );

  return {
    roles: roleRows[0] || null,
    analysisNode: nodeRows[0] || null
  };
}

function isSolutionDesignRoleUser(user, roles) {
  return [
    roles?.project_manager_user_id,
    roles?.technical_owner_user_id,
    roles?.business_owner_user_id,
    roles?.procurement_owner_user_id,
    roles?.finance_accountant_user_id,
    roles?.finance_owner_user_id
  ].some((userId) => Boolean(userId) && String(userId) === String(user?.id));
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
      p.id,
      s.stage_key AS current_stage_key,
      s.stage_order AS current_stage_order,
      p.project_manager_user_id,
      p.business_responsible_user_id,
      p.technical_responsible_user_id,
      p.created_by_user_id,
      p.participating_departments,
      p.status
    FROM projects p
    LEFT JOIN project_stages s
      ON s.project_id = p.id
      AND s.is_current = 1
    WHERE p.id = ?
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

async function canViewOnlineFormImages({ executor, user, project, document }) {
  if (canViewStageDocumentItem(user, { project, document })) {
    return true;
  }

  if (isSolutionDesignAnalysisDocument(document)) {
    const context = await selectSolutionDesignImageMutationContext(executor, project.id);
    return isSolutionDesignRoleUser(user, context.roles);
  }

  return false;
}

async function assertCanViewOnlineFormImages({ executor, user, project, document }) {
  if (!(await canViewOnlineFormImages({ executor, user, project, document }))) {
    throwForbiddenOnlineFormImageOperation(['documentId']);
  }
}

async function canMutateSolutionDesignAnalysisImages({ executor, user, project, document }) {
  if (!isSolutionDesignAnalysisDocument(document)) {
    return false;
  }

  if (document.is_applicable === 0 || document.is_applicable === false || isProjectEnded(project) || !isCurrentSolutionStage(project)) {
    return false;
  }

  const context = await selectSolutionDesignImageMutationContext(executor, project.id);
  return (
    String(context.roles?.technical_owner_user_id ?? '') === String(user?.id ?? '') &&
    context.analysisNode?.node_key === SOLUTION_DESIGN_NODE_KEY.ANALYSIS &&
    [SOLUTION_DESIGN_NODE_STATUS.PENDING, SOLUTION_DESIGN_NODE_STATUS.RETURNED].includes(context.analysisNode.status)
  );
}

async function assertCanMutateOnlineFormImages({ executor, user, project, document }) {
  if (!isInitiationRequirementDocument(document)) {
    if (await canMutateSolutionDesignAnalysisImages({ executor, user, project, document })) {
      return;
    }
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

async function buildImagePermissions({ executor, user, project, document }) {
  const canDownload = await canViewOnlineFormImages({ executor, user, project, document });
  const canDelete = isInitiationRequirementDocument(document)
    ? !isProjectEnded(project) &&
      isRequirementDocumentEditable(document) &&
      isCurrentResponsible(user, document)
    : await canMutateSolutionDesignAnalysisImages({ executor, user, project, document });

  return {
    canDownload,
    canDelete
  };
}

function mapUploadedByUser(row) {
  return {
    id: row.uploaded_by_user_id,
    account: row.uploaded_by_account,
    name: row.uploaded_by_display_name
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
  await assertCanViewOnlineFormImages({
    executor: queryExecutor,
    user,
    project: selectedProject,
    document: selectedDocument
  });

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

  const permissions = await buildImagePermissions({
    executor: queryExecutor,
    user,
    project: selectedProject,
    document: selectedDocument
  });
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

async function invalidateSolutionDesignAnalysisGeneratedFileIfNeeded(executor, { projectId, document, actorUserId }) {
  if (!isSolutionDesignAnalysisDocument(document)) {
    return;
  }

  await executor.execute(
    `UPDATE project_solution_design_analysis_forms
    SET generated_file_status = ?,
      generated_file_storage_key = NULL,
      generated_file_name = NULL,
      generated_file_mime_type = NULL,
      generated_file_size = NULL,
      generated_file_template_name = ?,
      generated_at = NULL,
      generated_by_user_id = NULL,
      generation_error_message = NULL,
      updated_by_user_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?
      AND is_current = 1
      AND generated_file_status <> ?`,
    [
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED,
      SOLUTION_DESIGN_ANALYSIS_FORM_DEFINITION.templateName,
      actorUserId,
      projectId,
      SOLUTION_DESIGN_GENERATED_FILE_STATUS.NOT_STARTED
    ]
  );
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
    await assertCanMutateOnlineFormImages({ executor: connection, user, project, document });
    assertFieldAllowedForDocument(normalizedFieldKey, document);

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
    await invalidateSolutionDesignAnalysisGeneratedFileIfNeeded(connection, {
      projectId,
      document,
      actorUserId: user.id
    });

    await connection.commit();
    committed = true;

    return mapOnlineFormImage(
      imageRow,
      await buildImagePermissions({ executor: connection, user, project, document })
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
  await assertCanViewOnlineFormImages({ executor: pool, user, project, document });
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
    await assertCanMutateOnlineFormImages({ executor: connection, user, project, document });
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
    await invalidateSolutionDesignAnalysisGeneratedFileIfNeeded(connection, {
      projectId,
      document,
      actorUserId: user.id
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
