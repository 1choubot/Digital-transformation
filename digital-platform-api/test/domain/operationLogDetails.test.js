import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeOperationLogDetails } from '../../src/repositories/operationLogRepository.js';

test('finance approval comments are removed for viewers without finance detail access', () => {
  const details = {
    nodeKey: 'finance_cost_estimation',
    approvalComment: '包含敏感成本信息',
    confidentialFileDetailsFiltered: true
  };
  assert.deepEqual(sanitizeOperationLogDetails(details, { includeFinanceApprovalComments: false }), {
    nodeKey: 'finance_cost_estimation',
    confidentialFileDetailsFiltered: true
  });
  assert.equal(details.approvalComment, '包含敏感成本信息');
});

test('authorized finance viewers and non-finance logs keep approval comments', () => {
  const financeDetails = { nodeKey: 'finance_cost_estimation', approvalComment: '同意' };
  const otherDetails = { nodeKey: 'rd_cost_estimation', approvalComment: '同意' };
  assert.deepEqual(
    sanitizeOperationLogDetails(financeDetails, { includeFinanceApprovalComments: true }),
    financeDetails
  );
  assert.deepEqual(
    sanitizeOperationLogDetails(otherDetails, { includeFinanceApprovalComments: false }),
    otherDetails
  );
});
