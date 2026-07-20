import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNodeUploadSlots } from '../src/composables/project-stage/solution-design/solutionDesignUploadSlots.js';

const costSlots = [
  buildSlot('rd_cost_estimation_file', 'rd_cost_estimation', 11),
  buildSlot('manufacturing_cost_estimation_file', 'manufacturing_cost_estimation', 12),
  buildSlot('marketing_cost_estimation_file', 'marketing_cost_estimation', 13),
  buildSlot('finance_cost_estimation_file', 'finance_cost_estimation', 14)
];

function buildSlot(slotKey, nodeKey, slotOrder) {
  return {
    slotKey,
    nodeKey,
    slotOrder,
    permissions: {
      canUpload: true,
      canDownload: true,
      canMarkExemption: true,
      canCancelExemption: true
    }
  };
}

function slotKeysFor(nodeKey) {
  return buildNodeUploadSlots(costSlots, nodeKey).map((slot) => slot.slotKey);
}

test('cost-estimation pages only show the current slot and its immediate predecessor', () => {
  assert.deepEqual(slotKeysFor('rd_cost_estimation'), [
    'rd_cost_estimation_file'
  ]);
  assert.deepEqual(slotKeysFor('manufacturing_cost_estimation'), [
    'rd_cost_estimation_file',
    'manufacturing_cost_estimation_file'
  ]);
  assert.deepEqual(slotKeysFor('marketing_cost_estimation'), [
    'manufacturing_cost_estimation_file',
    'marketing_cost_estimation_file'
  ]);
  assert.deepEqual(slotKeysFor('finance_cost_estimation'), [
    'marketing_cost_estimation_file',
    'finance_cost_estimation_file'
  ]);
});

test('the immediate predecessor is read-only while the current slot keeps its permissions', () => {
  const slots = buildNodeUploadSlots(costSlots, 'marketing_cost_estimation');
  const [previousSlot, currentSlot] = slots;

  assert.deepEqual(previousSlot.permissions, {
    canUpload: false,
    canDownload: true,
    canMarkExemption: false,
    canCancelExemption: false
  });
  assert.deepEqual(currentSlot.permissions, costSlots[2].permissions);
});
