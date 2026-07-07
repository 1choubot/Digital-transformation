import { pool } from '../../db/pool.js';
import {
  EXPECTED_COMPLETION_MODE_COUNTS,
  DOCUMENT_STATUS,
  EXPECTED_STAGE_DOCUMENT_ITEM_COUNT,
  STAGE_DOCUMENT_TEMPLATE_VERSION
} from '../../domain/stageDocumentTemplates.js';
import { STANDARD_PROJECT_STAGES } from '../../domain/stages.js';
import {
  attachReworkCandidatesToDocuments,
  buildStageCompletenessSummary,
  mapDocument
} from './shared.js';
import {
  attachStageDocumentPermissions,
  filterStageDocumentsForUser
} from './accessControl.js';
import {
  attachInitiationReviewToStageDocumentRows,
  initializeInitiationReviewNodesForProject
} from './initiationReviewRepository.js';

function assertTemplateRowsReady(rows) {
  if (rows.length !== EXPECTED_STAGE_DOCUMENT_ITEM_COUNT) {
    throw new Error(
      `Stage document templates are not ready: expected ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT}, got ${rows.length}`
    );
  }

  const nonEmptyFolderIds = rows.filter((row) => row.target_folder_id !== null);
  if (nonEmptyFolderIds.length > 0) {
    throw new Error('Stage document templates must keep targetFolderId empty');
  }

  const counts = rows.reduce(
    (accumulator, row) => accumulator.set(row.completion_mode, (accumulator.get(row.completion_mode) || 0) + 1),
    new Map()
  );
  for (const [completionMode, expectedCount] of Object.entries(EXPECTED_COMPLETION_MODE_COUNTS)) {
    const actualCount = counts.get(completionMode) || 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Stage document templates are not ready: expected ${expectedCount} ${completionMode}, got ${actualCount}`
      );
    }
  }
}

export async function upsertStageDocumentTemplates(executor, templateItems) {
  if (templateItems.length !== EXPECTED_STAGE_DOCUMENT_ITEM_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_STAGE_DOCUMENT_ITEM_COUNT} stage document template items, got ${templateItems.length}`
    );
  }

  const placeholders = templateItems.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = templateItems.flatMap((item) => [
    item.templateVersion,
    item.stageOrder,
    item.stageKey,
    item.stageName,
    item.documentCode,
    item.documentOrder,
    item.documentName,
    item.isRequired ? 1 : 0,
    item.defaultResponsibilityRole,
    item.confirmRole,
    item.ownerDepartment,
    item.reviewDepartment,
    item.completionMode,
    item.submitMode,
    item.targetFolderPath,
    item.targetFolderId,
    1
  ]);

  await executor.execute(
    `INSERT INTO stage_document_templates (
      template_version,
      stage_order,
      stage_key,
      stage_name,
      document_code,
      document_order,
      document_name,
      is_required,
      default_responsibility_role,
      confirm_role,
      owner_department,
      review_department,
      completion_mode,
      submit_mode,
      target_folder_path,
      target_folder_id,
      is_active
    ) VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      stage_order = VALUES(stage_order),
      stage_key = VALUES(stage_key),
      stage_name = VALUES(stage_name),
      document_order = VALUES(document_order),
      document_name = VALUES(document_name),
      is_required = VALUES(is_required),
      default_responsibility_role = VALUES(default_responsibility_role),
      confirm_role = VALUES(confirm_role),
      owner_department = VALUES(owner_department),
      review_department = VALUES(review_department),
      completion_mode = VALUES(completion_mode),
      submit_mode = VALUES(submit_mode),
      target_folder_path = VALUES(target_folder_path),
      target_folder_id = VALUES(target_folder_id),
      is_active = VALUES(is_active)`,
    values
  );

  await executor.execute(
    `UPDATE stage_document_templates
    SET is_active = 0
    WHERE template_version = ?
      AND document_code NOT IN (${templateItems.map(() => '?').join(', ')})`,
    [STAGE_DOCUMENT_TEMPLATE_VERSION, ...templateItems.map((item) => item.documentCode)]
  );
  await executor.execute(
    `UPDATE stage_document_templates
    SET is_active = 0
    WHERE template_version <> ?`,
    [STAGE_DOCUMENT_TEMPLATE_VERSION]
  );

  await backfillProjectStageDocumentOwnership(executor, templateItems);
}

async function backfillProjectStageDocumentOwnership(executor, templateItems) {
  for (const item of templateItems) {
    await executor.execute(
      `UPDATE project_stage_documents
      SET owner_department = CASE WHEN owner_department IS NULL THEN ? ELSE owner_department END,
        review_department = CASE WHEN review_department IS NULL THEN ? ELSE review_department END,
        completion_mode = ?
      WHERE template_version = ?
        AND document_code = ?
        AND (owner_department IS NULL OR review_department IS NULL OR completion_mode <> ?)`,
      [
        item.ownerDepartment,
        item.reviewDepartment,
        item.completionMode,
        item.templateVersion,
        item.documentCode,
        item.completionMode
      ]
    );
  }
}

async function getActiveTemplateRows(executor) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM stage_document_templates
    WHERE template_version = ?
      AND is_active = 1
    ORDER BY stage_order ASC, document_order ASC`,
    [STAGE_DOCUMENT_TEMPLATE_VERSION]
  );

  assertTemplateRowsReady(rows);
  return rows;
}

export async function initializeProjectStageDocuments(executor, projectId) {
  const templateRows = await getActiveTemplateRows(executor);
  const [beforeRows] = await executor.execute(
    'SELECT COUNT(*) AS count FROM project_stage_documents WHERE project_id = ?',
    [projectId]
  );
  const existingCount = Number(beforeRows[0].count);
  if (existingCount > 0) {
    return {
      expectedCount: templateRows.length,
      insertedCount: 0
    };
  }

  const placeholders = templateRows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = templateRows.flatMap((template) => [
    projectId,
    template.id,
    template.template_version,
    template.stage_order,
    template.stage_key,
    template.stage_name,
    template.document_code,
    template.document_order,
    template.document_name,
    template.is_required,
    template.default_responsibility_role,
    template.confirm_role,
    template.owner_department,
    template.review_department,
    template.completion_mode,
    template.submit_mode,
    template.target_folder_path,
    null,
    DOCUMENT_STATUS.NOT_SUBMITTED,
    1
  ]);

  await executor.execute(
    `INSERT INTO project_stage_documents (
      project_id,
      template_id,
      template_version,
      stage_order,
      stage_key,
      stage_name,
      document_code,
      document_order,
      document_name,
      is_required,
      default_responsibility_role,
      confirm_role,
      owner_department,
      review_department,
      completion_mode,
      submit_mode,
      target_folder_path,
      target_folder_id,
      status,
      is_applicable
    ) VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE id = id`,
    values
  );
  await initializeInitiationReviewNodesForProject(executor, projectId);
  const [afterRows] = await executor.execute(
    'SELECT COUNT(*) AS count FROM project_stage_documents WHERE project_id = ?',
    [projectId]
  );

  return {
    expectedCount: templateRows.length,
    insertedCount: Number(afterRows[0].count) - existingCount
  };
}

export async function listProjectsForStageDocumentBackfill(executor = pool) {
  const [rows] = await executor.execute('SELECT id, project_code, project_name FROM projects ORDER BY id ASC');
  return rows.map((row) => ({
    id: row.id,
    projectCode: row.project_code,
    projectName: row.project_name
  }));
}

async function selectChecklistProject(projectId) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      project_manager_user_id,
      business_responsible_user_id,
      technical_responsible_user_id,
      created_by_user_id,
      participating_departments,
      status,
      ended_reason,
      ended_by_user_id,
      ended_at
    FROM projects
    WHERE id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

export async function getProjectStageDocumentChecklist(projectId, user = null) {
  const [[rows], project] = await Promise.all([
    pool.execute(
    `SELECT
      d.*,
      u.account AS responsible_account,
      u.display_name AS responsible_display_name,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled,
      u.file_platform_user_id AS responsible_file_platform_user_id
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
    ORDER BY d.stage_order ASC, d.document_order ASC`,
    [projectId]
    ),
    selectChecklistProject(projectId)
  ]);

  const rowsWithInitiationReview = await attachInitiationReviewToStageDocumentRows(pool, rows, user);
  const documentsByStage = new Map(STANDARD_PROJECT_STAGES.map((stage) => [stage.stageKey, []]));
  const mappedDocuments = rowsWithInitiationReview.map(mapDocument);
  const documentsById = new Map(mappedDocuments.map((document) => [document.id, document]));
  const documentsWithRevisionSource = mappedDocuments.map((document) => {
    const sourceDocument = documentsById.get(document.revisionSourceDocumentId);
    if (!sourceDocument) {
      return document;
    }

    return {
      ...document,
      revisionSourceDocument: {
        id: sourceDocument.id,
        documentCode: sourceDocument.documentCode,
        documentName: sourceDocument.documentName
      }
    };
  });
  const documentsWithReworkContext = attachReworkCandidatesToDocuments(documentsWithRevisionSource);
  const relatedDocumentsByCode = new Map(
    documentsWithReworkContext.map((document) => [document.documentCode, document])
  );
  const visibleDocuments =
    user && project
      ? filterStageDocumentsForUser({ user, project, documents: documentsWithReworkContext }).map((document) =>
          attachStageDocumentPermissions({ user, project, document, relatedDocumentsByCode })
        )
      : documentsWithReworkContext;

  for (const document of visibleDocuments) {
    const documents = documentsByStage.get(document.stageKey);
    if (documents) {
      documents.push(document);
    }
  }

  return {
    projectId,
    stages: STANDARD_PROJECT_STAGES.map((stage) => {
      const documents = documentsByStage.get(stage.stageKey) || [];

      return {
        stageOrder: stage.stageOrder,
        stageKey: stage.stageKey,
        stageName: stage.stageName,
        completenessSummary: buildStageCompletenessSummary(documents),
        documents
      };
    })
  };
}
