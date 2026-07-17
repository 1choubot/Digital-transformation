import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findBackendActiveNavigationTarget,
  findNavigationStageTarget,
  findProjectNavigationTarget,
  shouldAutoSwitchAfterNodeRefresh
} from '../src/utils/projectNavigation.js';

test('switches only when the navigation status enters completed or returned', () => {
  assert.equal(shouldAutoSwitchAfterNodeRefresh('PROCESSING', 'COMPLETED'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('WAIT_APPROVAL', 'RETURNED'), true);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('PROCESSING', 'WAIT_APPROVAL'), false);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('COMPLETED', 'COMPLETED'), false);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('RETURNED', 'RETURNED'), false);
  assert.equal(shouldAutoSwitchAfterNodeRefresh('in_progress', 'completed'), false);
});

test('selects processing before approval and returned nodes', () => {
  const target = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'rework', status: 'RETURNED', route: '/rework' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'approval', status: 'WAIT_APPROVAL', route: '/approval' }] },
      { stageKey: 'delivery', children: [{ nodeCode: 'next', status: 'PROCESSING', route: '/next' }] }
    ]
  });

  assert.deepEqual(target, { stageKey: 'delivery', nodeKey: 'next', route: '/next' });
});

test('prefers the new current stage when a stage advance produces equal-priority nodes', () => {
  const target = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'old-active', status: 'PROCESSING', route: '/old' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'new-active', status: 'PROCESSING', route: '/new' }] }
    ]
  }, { preferCurrentStage: true });

  assert.deepEqual(target, { stageKey: 'solution', nodeKey: 'new-active', route: '/new' });
});

test('keeps backend order without a stage advance and returns null without an active node', () => {
  const orderedTarget = findBackendActiveNavigationTarget({
    currentStageKey: 'solution',
    children: [
      { stageKey: 'initiation', children: [{ nodeCode: 'first', status: 'WAIT_APPROVAL', route: '/first' }] },
      { stageKey: 'solution', children: [{ nodeCode: 'second', status: 'WAIT_APPROVAL', route: '/second' }] }
    ]
  });
  assert.deepEqual(orderedTarget, { stageKey: 'initiation', nodeKey: 'first', route: '/first' });

  assert.equal(findBackendActiveNavigationTarget({
    children: [{ stageKey: 'closeout', children: [{ nodeCode: 'done', status: 'COMPLETED' }] }]
  }), null);
});

test('selects a stage target from navigation status and falls back to backend order', () => {
  const activeTarget = findNavigationStageTarget({
    stageKey: 'initiation',
    children: [
      { nodeCode: 'raw-conflict', status: 'RETURNED', nodeStatus: 'in_progress', route: '/returned' },
      { nodeCode: 'approval', status: 'WAIT_APPROVAL', nodeStatus: 'completed', route: '/approval' }
    ]
  });
  assert.deepEqual(activeTarget, { stageKey: 'initiation', nodeKey: 'approval', route: '/approval' });

  const fallbackTarget = findNavigationStageTarget({
    stageKey: 'closeout',
    children: [
      { nodeCode: 'failed', status: 'FAILED', route: '/failed' },
      { nodeCode: 'pending', status: 'PENDING', route: '/pending' }
    ]
  });
  assert.deepEqual(fallbackTarget, { stageKey: 'closeout', nodeKey: 'failed', route: '/failed' });

  assert.equal(findNavigationStageTarget({
    stageKey: 'empty',
    children: [{ nodeCode: 'missing-route', status: 'PROCESSING' }]
  }), null);
});

test('resolves stage hints before current-stage fallbacks', () => {
  const navigation = {
    currentStageKey: 'solution',
    children: [
      {
        stageId: 10,
        stageOrder: 1,
        stageKey: 'initiation',
        children: [{ nodeCode: 'review', status: 'WAIT_APPROVAL', route: '/review' }]
      },
      {
        stageId: 20,
        stageOrder: 2,
        stageKey: 'solution',
        isCurrent: true,
        children: [{ nodeCode: 'processing', status: 'PROCESSING', route: '/processing' }]
      }
    ]
  };

  assert.deepEqual(findProjectNavigationTarget(navigation, { stageId: 10 }), {
    stageKey: 'initiation', nodeKey: 'review', route: '/review'
  });
  assert.deepEqual(findProjectNavigationTarget(navigation, { stageOrder: 2 }), {
    stageKey: 'solution', nodeKey: 'processing', route: '/processing'
  });
  assert.deepEqual(findProjectNavigationTarget(navigation, { stageKey: 'missing' }), {
    stageKey: 'solution', nodeKey: 'processing', route: '/processing'
  });
});

test('uses isCurrent when currentStageKey is absent and returns null without a target stage', () => {
  assert.deepEqual(findProjectNavigationTarget({
    children: [{
      stageKey: 'delivery',
      isCurrent: true,
      children: [{ nodeCode: 'pending', status: 'PENDING', route: '/pending' }]
    }]
  }), { stageKey: 'delivery', nodeKey: 'pending', route: '/pending' });

  assert.equal(findProjectNavigationTarget({ children: [] }), null);
});
