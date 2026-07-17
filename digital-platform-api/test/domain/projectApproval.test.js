import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOptionalApprovalComment } from '../../src/domain/projectApproval.js';
import { ProjectApprovalError } from '../../src/repositories/projects/shared.js';

test('optional stage approval comments are trimmed and empty comments stay backward compatible', () => {
  assert.equal(normalizeOptionalApprovalComment('  同意推进  ', ProjectApprovalError), '同意推进');
  assert.equal(normalizeOptionalApprovalComment('', ProjectApprovalError), null);
  assert.equal(normalizeOptionalApprovalComment(undefined, ProjectApprovalError), null);
});

test('stage approval comments reject values longer than 1000 characters', () => {
  assert.throws(
    () => normalizeOptionalApprovalComment('x'.repeat(1001), ProjectApprovalError),
    (error) => error.code === 'INVALID_APPROVAL_COMMENT'
  );
});
