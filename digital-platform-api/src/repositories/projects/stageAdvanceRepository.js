import { pool } from '../../db/pool.js';
import {
  canAdvanceProjectStage,
  isCenterManagerUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { PROJECT_APPROVAL_ERROR } from '../../domain/projectApproval.js';
import { STANDARD_PROJECT_STAGES, STAGE_STATUS } from '../../domain/stages.js';
import { buildStageCompletenessSummary, mapGateDocument } from '../stageDocuments/shared.js';
import { attachInitiationReviewToStageDocumentRows } from '../stageDocuments/initiationReviewRepository.js';
import {
  insertOperationLog,
  OPERATION_ACTION_TYPE,
  OPERATION_TARGET_TYPE
} from '../operationLogRepository.js';
import {
  mapStage,
  ProjectNotFoundError,
  ProjectStageAdvanceError
} from './shared.js';
import { selectProjectDetailWithConnection } from './coreRepository.js';
import { selectProjectStagesForUpdate } from './stageRepository.js';

function assertCanAdvanceProject(projectRow) {
  if (projectRow.status === PROJECT_STATUS.COMPLETED) {
    throw new ProjectStageAdvanceError(
      'PROJECT_ALREADY_COMPLETED',
      'Project is already completed and cannot be advanced'
    );
  }

  if (projectRow.status === PROJECT_STATUS.ENDED) {
    throw new ProjectStageAdvanceError(
      'PROJECT_ALREADY_ENDED',
      'Project has ended and cannot be advanced'
    );
  }
}

function assertUserCanAdvanceProject(user, projectRow) {
  if (!canAdvanceProjectStage(user, projectRow)) {
    throw new ProjectStageAdvanceError(
      'FORBIDDEN_OPERATION',
      'Current user cannot advance this project stage',
      ['projectId'],
      403
    );
  }
}

function assertSingleCurrentStage(stageRows) {
  const currentStages = stageRows.filter((stage) => Boolean(stage.is_current));

  if (currentStages.length !== 1) {
    throw new ProjectStageAdvanceError(
      'INVALID_PROJECT_CURRENT_STAGE',
      'Project must have exactly one current stage'
    );
  }

  const currentStage = currentStages[0];
  if (currentStage.stage_status !== STAGE_STATUS.CURRENT) {
    throw new ProjectStageAdvanceError(
      'INVALID_PROJECT_STAGE_STATE',
      'Current stage must have current status'
    );
  }

  const expectedStage = STANDARD_PROJECT_STAGES.find((stage) => stage.stageOrder === currentStage.stage_order);
  if (!expectedStage || expectedStage.stageKey !== currentStage.stage_key) {
    throw new ProjectStageAdvanceError(
      'INVALID_PROJECT_STAGE_STATE',
      'Current stage is not a standard project stage'
    );
  }

  return currentStage;
}

function assertNextStageCanReceiveAdvance(stageRows, currentStage) {
  if (currentStage.stage_order === STANDARD_PROJECT_STAGES.length) {
    return null;
  }

  const expectedNextOrder = currentStage.stage_order + 1;
  const nextStage = stageRows.find((stage) => stage.stage_order === expectedNextOrder);

  if (!nextStage) {
    throw new ProjectStageAdvanceError(
      'INVALID_NEXT_PROJECT_STAGE',
      'Next project stage does not exist'
    );
  }

  if (
    nextStage.stage_order !== expectedNextOrder ||
    nextStage.stage_status !== STAGE_STATUS.NOT_STARTED ||
    Boolean(nextStage.is_current)
  ) {
    throw new ProjectStageAdvanceError(
      'INVALID_NEXT_PROJECT_STAGE',
      'Next project stage cannot receive advance'
    );
  }

  return nextStage;
}

async function selectProjectForUpdate(connection, projectId, user) {
  if (isCenterManagerUser(user) && isValidBusinessDepartment(user.department)) {
    const [rows] = await connection.execute(
      `SELECT
        p.*,
        EXISTS (
          SELECT 1
          FROM project_stage_documents d
          LEFT JOIN users u
            ON u.id = d.responsible_user_id
          WHERE d.project_id = p.id
            AND (
              d.owner_department = ?
              OR d.review_department = ?
              OR (
                d.owner_department IS NULL
                AND d.review_department IS NULL
                AND u.department = ?
              )
            )
        ) AS has_department_responsible
      FROM projects p
      WHERE p.id = ?
      LIMIT 1
      FOR UPDATE`,
      [user.department, user.department, user.department, projectId]
    );

    if (rows.length === 0) {
      throw new ProjectNotFoundError(projectId);
    }

    return rows[0];
  }

  const [rows] = await connection.execute(
    'SELECT *, 0 AS has_department_responsible FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
    [projectId]
  );

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

async function buildCurrentStageGateSummary(connection, projectId, stageOrder) {
  const [rows] = await connection.execute(
    `SELECT
      d.id,
      d.document_code,
      d.document_name,
      d.is_required,
      d.completion_mode,
      d.status,
      d.is_applicable,
      d.revision_required,
      d.revision_reason,
      d.revision_source_document_id,
      d.revision_requested_at,
      d.revision_resubmitted_by_user_id,
      d.revision_resubmitted_at,
      source.document_code AS revision_source_document_code,
      source.document_name AS revision_source_document_name
    FROM project_stage_documents
      d
    LEFT JOIN project_stage_documents source
      ON source.id = d.revision_source_document_id
    WHERE d.project_id = ?
      AND d.stage_order = ?
    ORDER BY d.document_order ASC
    FOR UPDATE`,
    [projectId, stageOrder]
  );

  if (rows.length === 0) {
    throw new ProjectStageAdvanceError(
      'STAGE_ADVANCE_CHECKLIST_NOT_INITIALIZED',
      'Current stage document checklist is not initialized'
    );
  }

  const rowsWithInitiationReview = await attachInitiationReviewToStageDocumentRows(connection, rows);
  return buildStageCompletenessSummary(rowsWithInitiationReview.map(mapGateDocument));
}

export async function advanceProjectStage(projectId, user) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectForUpdate(connection, projectId, user);
    assertCanAdvanceProject(projectRow);
    assertUserCanAdvanceProject(user, projectRow);

    const stageRows = await selectProjectStagesForUpdate(connection, projectId);
    const currentStage = assertSingleCurrentStage(stageRows);
    const gateSummary = await buildCurrentStageGateSummary(connection, projectId, currentStage.stage_order);

    if (gateSummary.incompleteRequiredCount > 0) {
      throw new ProjectStageAdvanceError(
        PROJECT_APPROVAL_ERROR.PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE,
        'Current stage has incomplete applicable required documents',
        {
          completenessSummary: gateSummary,
          incompleteRequiredDocuments: gateSummary.incompleteRequiredDocuments
        }
      );
    }

    const nextStage = assertNextStageCanReceiveAdvance(stageRows, currentStage);

    await connection.execute(
      `UPDATE project_stages
      SET stage_status = ?,
        is_current = 0,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [STAGE_STATUS.COMPLETED, currentStage.id]
    );

    if (nextStage) {
      await connection.execute(
        `UPDATE project_stages
        SET stage_status = ?,
          is_current = 1,
          started_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [STAGE_STATUS.CURRENT, nextStage.id]
      );
    } else {
      await connection.execute('UPDATE projects SET status = ? WHERE id = ?', [PROJECT_STATUS.COMPLETED, projectId]);
    }

    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.STAGE_ADVANCED,
      targetType: OPERATION_TARGET_TYPE.STAGE,
      targetId: currentStage.id,
      summary: nextStage
        ? `手工推进阶段：${currentStage.stage_name} -> ${nextStage.stage_name}`
        : `手工完成阶段：${currentStage.stage_name}`,
      details: {
        fromStageKey: currentStage.stage_key,
        fromStageName: currentStage.stage_name,
        toStageKey: nextStage ? nextStage.stage_key : null,
        toStageName: nextStage ? nextStage.stage_name : null,
        completenessSummary: gateSummary
      }
    });

    if (!nextStage) {
      await insertOperationLog(connection, {
        projectId,
        actorUserId: user.id,
        actionType: OPERATION_ACTION_TYPE.PROJECT_COMPLETED,
        targetType: OPERATION_TARGET_TYPE.PROJECT,
        targetId: projectId,
        summary: `项目完成：${currentStage.stage_name}`,
        details: {
          completedStageKey: currentStage.stage_key,
          completedStageName: currentStage.stage_name
        }
      });
    }

    const detail = await selectProjectDetailWithConnection(connection, projectId);
    await connection.commit();

    return {
      ...detail,
      advancedStage: mapStage({
        ...currentStage,
        stage_status: STAGE_STATUS.COMPLETED,
        is_current: 0
      }),
      nextStage: nextStage
        ? mapStage({
            ...nextStage,
            stage_status: STAGE_STATUS.CURRENT,
            is_current: 1
          })
        : null
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
