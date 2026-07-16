import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findBackendActiveNavigationTarget,
  shouldAutoSwitchAfterNodeRefresh
} from '../src/pages/project-detail/flowNodeNavigation.js';

test('switches only when the refreshed node enters a completed or returned state', () => {
  assert.equal(shouldAutoSwitchAfterNodeRefresh('in_progress', 'completed'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('pending_review', 'approved'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('pending_review', 'returned'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('in_progress', 'returned_blocked_by_rework'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('in_progress', 'pending_review'), false);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('completed', 'completed'), false);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('returned', 'returned'), false);
});

test('selects returned nodes before processing and approval nodes in backend order', () => {
  const target = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'rework', status: 'RETURNED' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'next', status: 'PROCESSING' }] }
    ]
  });

  assert.deepEqual(target, { stageKey: 'initiation', nodeKey: 'rework' });
});

test('prefers the new current stage when a stage advance produces equal-priority nodes', () => {
  const target = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'old-active', status: 'PROCESSING' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'new-active', status: 'PROCESSING' }] }
    ]
  }, { preferCurrentStage: true });

  assert.deepEqual(target, { stageKey: 'solution', nodeKey: 'new-active' });
});

test('keeps backend order without a stage advance and returns null without an active node', () => {
  const orderedTarget = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'first', status: 'WAIT_APPROVAL' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'second', status: 'WAIT_APPROVAL' }] }
    ]
  });
  assert.deepEqual(orderedTarget, { stageKey: 'initiation', nodeKey: 'first' });

  assert.equal(findBackendActiveNavigationTarget({
    children: [{ stageKey: 'closeout', children: [{ nodeCode: 'done', status: 'COMPLETED' }] }]
  }), null);
});

