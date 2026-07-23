import {
  CONTRACT_SIGNING_NODES,
  CONTRACT_SIGNING_NODE_STATUS,
  CONTRACT_SIGNING_PAYMENT_STATUS,
  CONTRACT_SIGNING_UPLOAD_SLOTS,
  CONTRACT_SIGNING_UPLOAD_SLOT_STATUS,
  buildInitialContractSigningNodes
} from '../../domain/contractSigningWorkflow.js';

async function lockProject(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT id FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
    [projectId]
  );

  return rows[0] || null;
}

async function selectExistingNodeKeys(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT node_key FROM project_contract_signing_nodes WHERE project_id = ?',
    [projectId]
  );
  return new Set(rows.map((row) => row.node_key));
}

async function selectExistingSlotKeys(executor, projectId) {
  const [rows] = await executor.execute(
    'SELECT slot_key FROM project_contract_signing_upload_slots WHERE project_id = ?',
    [projectId]
  );
  return new Set(rows.map((row) => row.slot_key));
}

async function ensurePaymentFlow(executor, projectId) {
  await executor.execute(
    `INSERT IGNORE INTO project_contract_signing_payment_flows (
      project_id, status
    ) VALUES (?, ?)`,
    [projectId, CONTRACT_SIGNING_PAYMENT_STATUS.NOT_STARTED]
  );
}

/**
 * Materialize the complete contract-signing workflow in one transaction.
 * Lock order is intentionally fixed: project row, nodes, upload slots, payment flow.
 */
export async function materializeContractSigningWorkflow(executor, projectId, { projectAlreadyLocked = false } = {}) {
  if (!projectAlreadyLocked) {
    const project = await lockProject(executor, projectId);
    if (!project) {
      return { nodeCount: 0, uploadSlotCount: 0, paymentFlowCount: 0 };
    }
  }

  const existingNodeKeys = await selectExistingNodeKeys(executor, projectId);
  for (const node of buildInitialContractSigningNodes()) {
    if (existingNodeKeys.has(node.nodeKey)) {
      continue;
    }

    await executor.execute(
      `INSERT IGNORE INTO project_contract_signing_nodes (
        project_id, node_key, node_name, node_order, status, activated_at
      ) VALUES (?, ?, ?, ?, ?, ${node.status === CONTRACT_SIGNING_NODE_STATUS.PENDING ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [projectId, node.nodeKey, node.nodeName, node.nodeOrder, node.status]
    );
  }

  const existingSlotKeys = await selectExistingSlotKeys(executor, projectId);
  for (const slot of CONTRACT_SIGNING_UPLOAD_SLOTS) {
    if (existingSlotKeys.has(slot.slotKey)) {
      continue;
    }

    await executor.execute(
      `INSERT IGNORE INTO project_contract_signing_upload_slots (
        project_id, node_key, slot_key, slot_name, slot_order,
        is_required, revision, status
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        projectId,
        slot.nodeKey,
        slot.slotKey,
        slot.slotName,
        slot.slotOrder,
        CONTRACT_SIGNING_UPLOAD_SLOT_STATUS.PENDING
      ]
    );
  }

  await ensurePaymentFlow(executor, projectId);

  return {
    nodeCount: CONTRACT_SIGNING_NODES.length,
    uploadSlotCount: CONTRACT_SIGNING_UPLOAD_SLOTS.length,
    paymentFlowCount: 1
  };
}
