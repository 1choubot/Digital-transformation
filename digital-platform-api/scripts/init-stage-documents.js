import { closePool, pool } from '../src/db/pool.js';
import { ensureStageDocumentSchema } from '../src/db/stageDocumentSchema.js';
import { loadStageDocumentTemplateItems } from '../src/domain/stageDocumentTemplates.js';
import {
  initializeProjectStageDocuments,
  listProjectsForStageDocumentBackfill,
  upsertStageDocumentTemplates
} from '../src/repositories/stageDocumentRepository.js';

function parseProjectIdArg(argv) {
  const arg = argv.find((value) => value.startsWith('--project-id='));
  if (!arg) {
    return null;
  }

  const value = Number.parseInt(arg.slice('--project-id='.length), 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('--project-id must be a positive integer');
  }

  return value;
}

async function backfillProject(projectId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await initializeProjectStageDocuments(connection, projectId);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const projectIdArg = parseProjectIdArg(process.argv.slice(2));
  const templateItems = await loadStageDocumentTemplateItems();

  await ensureStageDocumentSchema(pool);
  await upsertStageDocumentTemplates(pool, templateItems);

  const allProjects = await listProjectsForStageDocumentBackfill(pool);
  const projects = projectIdArg ? allProjects.filter((project) => project.id === projectIdArg) : allProjects;

  if (projectIdArg && projects.length === 0) {
    throw new Error(`Project not found: ${projectIdArg}`);
  }

  let insertedCount = 0;
  for (const project of projects) {
    const result = await backfillProject(project.id);
    insertedCount += result.insertedCount;
    console.log(
      `Stage document checklist ready for project ${project.id} (${project.projectCode}): ${result.insertedCount}/${result.expectedCount} inserted`
    );
  }

  console.log(`Stage document templates ready: ${templateItems.length}`);
  console.log(`Backfilled projects: ${projects.length}`);
  console.log(`Inserted project stage document rows: ${insertedCount}`);
}

try {
  await main();
} finally {
  await closePool();
}
