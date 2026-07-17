import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApprovalActionState } from '../src/components/approval/approvalActionRules.js';

test('ordinary approval allows an empty approve comment but requires return and end reasons', () => {
  const state = buildApprovalActionState({ comment: '' });
  assert.equal(state.approveDisabled, false);
  assert.equal(state.returnDisabled, true);
  assert.equal(state.endDisabled, true);
});

test('required evaluations disable approval until a comment is entered', () => {
  assert.equal(buildApprovalActionState({ approveCommentRequired: true }).approveDisabled, true);
  assert.equal(buildApprovalActionState({ approveCommentRequired: true, comment: '评价通过' }).approveDisabled, false);
});

test('an incomplete required selection locks the input and every action', () => {
  const state = buildApprovalActionState({
    selectionRequired: true,
    selectionComplete: false,
    comment: '已有意见'
  });
  assert.equal(state.interactionLocked, true);
  assert.equal(state.approveDisabled, true);
  assert.equal(state.returnDisabled, true);
  assert.equal(state.endDisabled, true);
});
