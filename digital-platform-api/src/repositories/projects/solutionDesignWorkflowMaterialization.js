import {
  SOLUTION_DESIGN_NODES,
  SOLUTION_DESIGN_NODE_STATUS,
  SOLUTION_DESIGN_UPLOAD_SLOTS,
  SOLUTION_DESIGN_UPLOAD_SLOT_STATUS,
  buildInitialSolutionDesignNodes
} from '../../domain/solutionDesignWorkflow.js';

async function lockProject(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT id FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
    [projectId]
  );

  return rows[0] || null;
}

async function selectExistingNodeKeys(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT node_key FROM project_solution_design_nodes WHERE project_id = ?',
    [projectId]
  );
  return new Set(rows.map((row) => row.node_key));
}

async function selectExistingSlotKeys(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT slot_key FROM project_solution_design_upload_slots WHERE project_id = ?',
    [projectId]
  );
  return new Set(rows.map((row) => row.slot_key));
}

/**
 * Materialize the complete solution-design workflow in one transaction.
 * Lock order is intentionally fixed: project row, nodes, then upload slots.
 */
export async function materializeSolutionDesignWorkflow(executor, projectId, { projectAlreadyLocked = false } = {}) {
  if (!projectAlreadyLocked) {
    const project = await lockProject(executor, projectId);
    if (!project) {
      return { nodeCount: 0, uploadSlotCount: 0 };
    }
  }

  const existingNodeKeys = await selectExistingNodeKeys(executor, projectId);
  for (const node of buildInitialSolutionDesignNodes()) {
    if (existingNodeKeys.has(node.nodeKey)) {
      continue;
    }

    await executor.execute(
      `INSERT IGNORE INTO project_solution_design_nodes (
        project_id, node_key, node_name, node_order, status, activated_at
      ) VALUES (?, ?, ?, ?, ?, ${node.status === SOLUTION_DESIGN_NODE_STATUS.PENDING ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [projectId, node.nodeKey, node.nodeName, node.nodeOrder, node.status]
    );
  }

  const existingSlotKeys = await selectExistingSlotKeys(executor, projectId);
  for (const slot of SOLUTION_DESIGN_UPLOAD_SLOTS) {
    if (existingSlotKeys.has(slot.slotKey)) {
      continue;
    }

    await executor.execute(
      `INSERT IGNORE INTO project_solution_design_upload_slots (
        project_id, node_key, slot_key, slot_name, slot_order,
        is_required, revision, status
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        projectId,
        slot.nodeKey,
        slot.slotKey,
        slot.slotName,
        slot.slotOrder,
        SOLUTION_DESIGN_UPLOAD_SLOT_STATUS.PENDING
      ]
    );
  }

  return {
    nodeCount: SOLUTION_DESIGN_NODES.length,
    uploadSlotCount: SOLUTION_DESIGN_UPLOAD_SLOTS.length
  };
}
