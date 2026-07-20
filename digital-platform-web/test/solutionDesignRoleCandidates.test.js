import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSolutionDesignRoleCandidates } from '../src/composables/project-stage/solution-design/roleCandidates.js';

const candidates = [
  { id: 1, organizationRole: 'general_manager', department: null, isEnabled: true },
  { id: 2, organizationRole: 'general_manager_assistant', department: null, isEnabled: true },
  { id: 3, organizationRole: 'system_admin', department: null, isEnabled: true },
  { id: 4, organizationRole: 'employee', department: 'marketing_center', isEnabled: true },
  { id: 5, organizationRole: 'employee', department: 'rd_center', isEnabled: true },
  { id: 6, organizationRole: 'employee', department: 'operations_center', isEnabled: true },
  { id: 7, organizationRole: 'employee', department: 'manufacturing_center', isEnabled: true },
  { id: 8, organizationRole: 'employee', department: 'rd_center', isEnabled: false }
];

function ids(role) {
  return filterSolutionDesignRoleCandidates(role, candidates).map((candidate) => candidate.id);
}

test('project manager candidates include all enabled non-system-admin users', () => {
  assert.deepEqual(ids({ roleKey: 'project_manager' }), [1, 2, 4, 5, 6, 7]);
});

test('department roles only include candidates from the configured center', () => {
  assert.deepEqual(ids({ requiredDepartment: 'marketing_center' }), [4]);
  assert.deepEqual(ids({ requiredDepartment: 'rd_center' }), [5]);
  assert.deepEqual(ids({ requiredDepartment: 'operations_center' }), [6]);
  assert.deepEqual(ids({ requiredDepartment: 'manufacturing_center' }), [7]);
});
