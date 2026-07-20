const costSlotKeysByNode = Object.freeze({
  rd_cost_estimation: ['rd_cost_estimation_file'],
  manufacturing_cost_estimation: [
    'rd_cost_estimation_file',
    'manufacturing_cost_estimation_file'
  ],
  marketing_cost_estimation: [
    'manufacturing_cost_estimation_file',
    'marketing_cost_estimation_file'
  ],
  finance_cost_estimation: [
    'marketing_cost_estimation_file',
    'finance_cost_estimation_file'
  ]
});

function asReadOnlyDownloadSlot(slot) {
  return {
    ...slot,
    permissions: {
      ...slot.permissions,
      canUpload: false,
      canMarkExemption: false,
      canCancelExemption: false
    }
  };
}

export function hasCurrentProductFunctionDiagram(slots = []) {
  return slots.some(
    (slot) => slot.slotKey === 'product_function_diagram' && Boolean(slot.currentFile)
  );
}

// Cost-estimation nodes can reference completed upstream files without being able to modify them.
export function buildNodeUploadSlots(allSlots, nodeKey, workflow = null) {
  const slots = Array.isArray(allSlots) ? allSlots : [];
  const costSlotKeys = costSlotKeysByNode[nodeKey];
  const visibleSlots = costSlotKeys
    ? slots.filter((item) => costSlotKeys.includes(item.slotKey))
    : slots.filter((item) => item.nodeKey === nodeKey);

  return visibleSlots
    .filter((item) => !(
      nodeKey === 'quotation_or_tender' &&
      item.slotKey === 'quotation_file' &&
      workflow?.quotationTender?.branchType === 'quotation'
    ))
    .map((item) => costSlotKeys && item.nodeKey !== nodeKey ? asReadOnlyDownloadSlot(item) : item)
    .sort((a, b) => Number(a.slotOrder || 0) - Number(b.slotOrder || 0));
}
