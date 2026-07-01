import { closePool, pool } from '../src/db/pool.js';
import {
  ensureProjectWorkspaceSchema,
  inspectProjectWorkspaceSchema
} from '../src/db/projectWorkspaceSchema.js';

async function main() {
  const connection = await pool.getConnection();
  try {
    await ensureProjectWorkspaceSchema(connection);
    const [databaseRows] = await connection.query('SELECT DATABASE() AS currentDatabase');
    const schemaStatus = await inspectProjectWorkspaceSchema(connection);

    const result = {
      currentDatabase: databaseRows[0]?.currentDatabase ?? null,
      ...schemaStatus
    };

    console.log(JSON.stringify(result, null, 2));

    if (!Object.values(schemaStatus).every(Boolean)) {
      throw new Error('Project workspace initiation forms migration verification failed');
    }
  } finally {
    connection.release();
    await closePool();
  }
}

await main();
