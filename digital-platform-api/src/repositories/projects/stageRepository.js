import { buildInitialStages } from '../../domain/stages.js';

export async function insertInitialStages(connection, projectId, projectMode = null) {
  const stages = buildInitialStages(projectMode);
  const placeholders = stages.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const values = stages.flatMap((stage) => [
    projectId,
    stage.stageOrder,
    stage.stageKey,
    stage.stageName,
    stage.stageStatus,
    stage.isCurrent ? 1 : 0
  ]);

  await connection.execute(
    `INSERT INTO project_stages (
      project_id,
      stage_order,
      stage_key,
      stage_name,
      stage_status,
      is_current
    ) VALUES ${placeholders}`,
    values
  );
}

export async function selectProjectStages(connection, projectId) {
  const [rows] = await connection.execute(
    'SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC',
    [projectId]
  );

  return rows;
}

export async function selectProjectStagesForUpdate(connection, projectId) {
  const [rows] = await connection.execute(
    'SELECT * FROM project_stages WHERE project_id = ? ORDER BY stage_order ASC FOR UPDATE',
    [projectId]
  );

  return rows;
}
