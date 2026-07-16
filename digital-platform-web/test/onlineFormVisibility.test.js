import test from 'node:test';
import assert from 'node:assert/strict';

import { isOnlineFormContentVisible } from '../src/utils/onlineFormVisibility.js';

test('online form content is visible before submission and after rework return', () => {
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'waiting_submission', formStatus: 'draft' }), true);
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'returned', formStatus: 'submitted' }), true);
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'returned_for_rework', formStatus: 'draft' }), true);
});

test('online form content stays hidden after submission, approval, completion or project end', () => {
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'pending_review', formStatus: 'submitted' }), false);
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'approved', formStatus: 'submitted' }), false);
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'completed', formStatus: 'submitted' }), false);
  assert.equal(isOnlineFormContentVisible({ nodeStatus: 'ended', formStatus: 'submitted' }), false);
});
