import { pool } from '../../db/pool.js';
import {
  canAdvanceProjectStage,
  isCenterManagerUser,
  isValidBusinessDepartment
} from '../../domain/organization.js';
import { PROJECT_STATUS } from '../../domain/projects.js';
import { PROJECT_APPROVAL_ERROR } from '../../domain/projectApproval.js';
import { STANDARD_PROJECT_STAGES, STAGE_STATUS } from '../../domain/stages.js';
import {
  attachSolutionDesignDerivedCompletionToStageDocumentRows,
  buildStageCompletenessSummary,
  mapGateDocument
} from '../stageDocuments/shared.js';
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
import { SOLUTION_DESIGN_STAGE } from '../../domain/solutionDesignWorkflow.js';
import { materializeSolutionDesignWorkflow } from './solutionDesignWorkflowMaterialization.js';

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
      d.project_id,
      d.stage_order,
      d.document_order,
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
  const rowsWithDerivedCompletion = await attachSolutionDesignDerivedCompletionToStageDocumentRows(
    connection,
    rowsWithInitiationReview
  );
  return buildStageCompletenessSummary(rowsWithDerivedCompletion.map(mapGateDocument));
}

function isSameId(left, right) {
  return String(left) === String(right);
}

function matchesExpectedCurrentStage(currentStage, { expectedStageId = null, expectedStageOrder = null } = {}) {
  if (expectedStageId !== null && expectedStageId !== undefined && !isSameId(currentStage.id, expectedStageId)) {
    return false;
  }

  if (
    expectedStageOrder !== null &&
    expectedStageOrder !== undefined &&
    Number(currentStage.stage_order) !== Number(expectedStageOrder)
  ) {
    return false;
  }

  return true;
}

function buildSkippedAutoAdvanceResult(reason, extra = {}) {
  return {
    attempted: true,
    advanced: false,
    reason,
    ...extra
  };
}

function buildStageAdvanceLogDetails({
  mode,
  triggerAction = null,
  triggerMetadata = {},
  currentStage,
  nextStage,
  gateSummary
}) {
  const details = {
    advanceMode: mode,
    fromStageKey: currentStage.stage_key,
    fromStageName: currentStage.stage_name,
    fromStageOrder: Number(currentStage.stage_order),
    toStageKey: nextStage ? nextStage.stage_key : null,
    toStageName: nextStage ? nextStage.stage_name : null,
    toStageOrder: nextStage ? Number(nextStage.stage_order) : null,
    completenessSummary: gateSummary
  };

  if (mode === 'automatic') {
    details.triggerAction = triggerAction;
    Object.assign(details, triggerMetadata || {});
  }

  return details;
}

function buildStageAdvanceSummary({ mode, currentStage, nextStage }) {
  if (mode === 'automatic') {
    return nextStage
      ? `系统自动推进阶段：${currentStage.stage_name} -> ${nextStage.stage_name}`
      : `系统自动推进阶段：${currentStage.stage_name} -> 项目完成`;
  }

  return nextStage
    ? `手工推进阶段：${currentStage.stage_name} -> ${nextStage.stage_name}`
    : `手工完成阶段：${currentStage.stage_name}`;
}

async function applyProjectStageAdvance(connection, {
  projectId,
  user,
  currentStage,
  nextStage,
  gateSummary,
  mode,
  triggerAction = null,
  triggerMetadata = {}
}) {
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

    if (nextStage.stage_key === SOLUTION_DESIGN_STAGE.STAGE_KEY) {
      // The project row is already locked by advanceCurrentStageIfGateSatisfied.
      // Keep materialization in this transaction so no partial solution stage is observable.
      await materializeSolutionDesignWorkflow(connection, projectId, { projectAlreadyLocked: true });
    }
  } else {
    await connection.execute('UPDATE projects SET status = ? WHERE id = ?', [PROJECT_STATUS.COMPLETED, projectId]);
  }

  await insertOperationLog(connection, {
    projectId,
    actorUserId: user.id,
    actionType: OPERATION_ACTION_TYPE.STAGE_ADVANCED,
    targetType: OPERATION_TARGET_TYPE.STAGE,
    targetId: currentStage.id,
    summary: buildStageAdvanceSummary({ mode, currentStage, nextStage }),
    details: buildStageAdvanceLogDetails({
      mode,
      triggerAction,
      triggerMetadata,
      currentStage,
      nextStage,
      gateSummary
    })
  });

  if (!nextStage) {
    await insertOperationLog(connection, {
      projectId,
      actorUserId: user.id,
      actionType: OPERATION_ACTION_TYPE.PROJECT_COMPLETED,
      targetType: OPERATION_TARGET_TYPE.PROJECT,
      targetId: projectId,
      summary: mode === 'automatic'
        ? `系统自动完成项目：${currentStage.stage_name}`
        : `项目完成：${currentStage.stage_name}`,
      details: {
        advanceMode: mode,
        triggerAction: mode === 'automatic' ? triggerAction : null,
        completedStageKey: currentStage.stage_key,
        completedStageName: currentStage.stage_name,
        completedStageOrder: Number(currentStage.stage_order)
      }
    });
  }

  return {
    attempted: true,
    advanced: true,
    completedProject: !nextStage,
    reason: nextStage ? 'advanced' : 'project_completed',
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
      : null,
    completenessSummary: gateSummary
  };
}

async function advanceCurrentStageIfGateSatisfied(connection, {
  projectId,
  user,
  mode,
  triggerAction = null,
  triggerMetadata = {},
  expectedStageId = null,
  expectedStageOrder = null,
  throwWhenIncomplete = false
}) {
  const projectRow = await selectProjectForUpdate(connection, projectId, user);
  if (projectRow.status === PROJECT_STATUS.COMPLETED) {
    if (throwWhenIncomplete) {
      assertCanAdvanceProject(projectRow);
    }
    return buildSkippedAutoAdvanceResult('project_completed');
  }

  if (projectRow.status === PROJECT_STATUS.ENDED) {
    if (throwWhenIncomplete) {
      assertCanAdvanceProject(projectRow);
    }
    return buildSkippedAutoAdvanceResult('project_ended');
  }

  const stageRows = await selectProjectStagesForUpdate(connection, projectId);
  const currentStage = assertSingleCurrentStage(stageRows);
  if (!matchesExpectedCurrentStage(currentStage, { expectedStageId, expectedStageOrder })) {
    return buildSkippedAutoAdvanceResult('stage_mismatch', {
      currentStage: mapStage(currentStage)
    });
  }

  const gateSummary = await buildCurrentStageGateSummary(connection, projectId, currentStage.stage_order);
  if (gateSummary.incompleteRequiredCount > 0) {
    if (throwWhenIncomplete) {
      throw new ProjectStageAdvanceError(
        PROJECT_APPROVAL_ERROR.PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE,
        'Current stage has incomplete applicable required documents',
        {
          completenessSummary: gateSummary,
          incompleteRequiredDocuments: gateSummary.incompleteRequiredDocuments
        }
      );
    }

    return buildSkippedAutoAdvanceResult('stage_gate_incomplete', {
      currentStage: mapStage(currentStage),
      completenessSummary: gateSummary,
      incompleteRequiredDocuments: gateSummary.incompleteRequiredDocuments
    });
  }

  const nextStage = assertNextStageCanReceiveAdvance(stageRows, currentStage);
  return applyProjectStageAdvance(connection, {
    projectId,
    user,
    currentStage,
    nextStage,
    gateSummary,
    mode,
    triggerAction,
    triggerMetadata
  });
}

export async function tryAutoAdvanceProjectStage({
  projectId,
  user,
  triggerAction,
  expectedStageId = null,
  expectedStageOrder = null,
  triggerMetadata = {}
}, db = pool) {
  const ownsConnection = typeof db?.getConnection === 'function';
  const connection = ownsConnection ? await db.getConnection() : db;

  try {
    if (ownsConnection) {
      await connection.beginTransaction();
    }

    const result = await advanceCurrentStageIfGateSatisfied(connection, {
      projectId,
      user,
      mode: 'automatic',
      triggerAction,
      triggerMetadata,
      expectedStageId,
      expectedStageOrder,
      throwWhenIncomplete: false
    });

    if (ownsConnection) {
      await connection.commit();
    }

    return result;
  } catch (error) {
    if (ownsConnection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (ownsConnection) {
      connection.release();
    }
  }
}

export async function advanceProjectStage(projectId, user, db = pool) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const projectRow = await selectProjectForUpdate(connection, projectId, user);
    assertCanAdvanceProject(projectRow);
    assertUserCanAdvanceProject(user, projectRow);
    const transition = await advanceCurrentStageIfGateSatisfied(connection, {
      projectId,
      user,
      mode: 'manual_fallback',
      throwWhenIncomplete: true
    });

    const detail = await selectProjectDetailWithConnection(connection, projectId);
    await connection.commit();

    return {
      ...detail,
      advancedStage: transition.advancedStage,
      nextStage: transition.nextStage,
      stageAdvance: transition
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
