import { pool } from '../../db/pool.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { STANDARD_PROJECT_STAGES, STAGE_STATUS } from '../../domain/stages.js';
import { buildStageCompletenessSummary, mapGateDocument } from '../stageDocuments/shared.js';
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

async function selectProjectForUpdate(connection, projectId) {
  const [rows] = await connection.execute('SELECT * FROM projects WHERE id = ? LIMIT 1 FOR UPDATE', [projectId]);

  if (rows.length === 0) {
    throw new ProjectNotFoundError(projectId);
  }

  return rows[0];
}

async function buildCurrentStageGateSummary(connection, projectId, stageOrder) {
  const [rows] = await connection.execute(
    `SELECT id, document_code, document_name, is_required, status, is_applicable
    FROM project_stage_documents
    WHERE project_id = ?
      AND stage_order = ?
    ORDER BY document_order ASC
    FOR UPDATE`,
    [projectId, stageOrder]
  );

  if (rows.length === 0) {
    throw new ProjectStageAdvanceError(
      'STAGE_ADVANCE_CHECKLIST_NOT_INITIALIZED',
      'Current stage document checklist is not initialized'
    );
  }

  return buildStageCompletenessSummary(rows.map(mapGateDocument));
}

export async function advanceProjectStage(projectId, userId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectForUpdate(connection, projectId);
    assertCanAdvanceProject(projectRow);

    const stageRows = await selectProjectStagesForUpdate(connection, projectId);
    const currentStage = assertSingleCurrentStage(stageRows);
    const gateSummary = await buildCurrentStageGateSummary(connection, projectId, currentStage.stage_order);

    if (gateSummary.incompleteRequiredCount > 0) {
      throw new ProjectStageAdvanceError(
        'STAGE_ADVANCE_INCOMPLETE_REQUIRED_DOCUMENTS',
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
      actorUserId: userId,
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
        actorUserId: userId,
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
