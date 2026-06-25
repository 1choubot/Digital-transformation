import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEvaluateWeeklyReport,
  canFinalizeWeeklyReport,
  canManageWeeklyRestMode,
  canReadAllCenters,
  canReadCenterDailyReport,
  canReadManagedWeeklyReport,
  canReadWeeklyReviewOverview,
  canReviewCenterManagerWeeklyReport,
  canReviewEmployeeWeeklyReport,
  canWriteDailyReport,
  canWriteWeeklyReport,
  OrganizationRole
} from '../../src/domain/reports.js';

// Build a minimal safe-user object with the report permission fields.
function user(organizationRole, overrides = {}) {
  return {
    id: 1,
    department: 'rd_center',
    organizationRole,
    isPlatformAdmin: false,
    ...overrides
  };
}

// Daily report writes are employee-only and are not granted by admin status.
test('daily report writer permission is employee-only', () => {
  assert.equal(canWriteDailyReport(user(OrganizationRole.EMPLOYEE)), true);
  assert.equal(canWriteDailyReport(user(OrganizationRole.CENTER_MANAGER)), false);
  assert.equal(canWriteDailyReport(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), false);
});

// Weekly report writes are limited to employees and center managers.
test('weekly report writer permission allows employee and center manager', () => {
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.EMPLOYEE)), true);
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.GENERAL_MANAGER)), false);
});

// Center daily reports are available to center managers and broader management.
test('center daily report reader permission follows management matrix', () => {
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.GENERAL_MANAGER_ASSISTANT)), true);
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.EMPLOYEE)), false);
});

// Cross-center reads are broader than center-manager reads.
test('all-center read permission excludes ordinary center managers', () => {
  assert.equal(canReadAllCenters(user(OrganizationRole.CENTER_MANAGER)), false);
  assert.equal(canReadAllCenters(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canReadAllCenters(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), true);
});

// Weekly rest anchors can be configured by general managers and platform admins.
test('weekly rest mode manager permission is restricted', () => {
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.EMPLOYEE, { isPlatformAdmin: true })), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.CENTER_MANAGER)), false);
});

// Weekly review overview excludes employees and system admins from the P0 business review surface.
test('weekly review overview permission follows M5 reviewer matrix', () => {
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.GENERAL_MANAGER_ASSISTANT)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.EMPLOYEE)), false);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), false);
});

// Center managers can review and AI-evaluate only ordinary employees in their own center.
test('center manager weekly employee review is department-scoped', () => {
  const reviewer = user(OrganizationRole.CENTER_MANAGER, { id: 10, department: 'rd_center' });
  const employee = user(OrganizationRole.EMPLOYEE, { id: 11, department: 'rd_center' });
  const otherCenterEmployee = user(OrganizationRole.EMPLOYEE, { id: 12, department: 'manufacturing_center' });
  const centerManagerSelf = user(OrganizationRole.CENTER_MANAGER, { id: 10, department: 'rd_center' });

  assert.equal(canReviewEmployeeWeeklyReport(reviewer, employee), true);
  assert.equal(canEvaluateWeeklyReport(reviewer, employee), true);
  assert.equal(canReadManagedWeeklyReport(reviewer, employee), true);
  assert.equal(canReviewEmployeeWeeklyReport(reviewer, otherCenterEmployee), false);
  assert.equal(canReviewEmployeeWeeklyReport(reviewer, centerManagerSelf), false);
});

// General managers score center managers manually; assistants can only read those reports.
test('general manager and assistant weekly center-manager review permissions are separated', () => {
  const centerManager = user(OrganizationRole.CENTER_MANAGER, { id: 20, department: 'rd_center' });
  const generalManager = user(OrganizationRole.GENERAL_MANAGER, { id: 21, department: null });
  const assistant = user(OrganizationRole.GENERAL_MANAGER_ASSISTANT, { id: 22, department: null });

  assert.equal(canReviewCenterManagerWeeklyReport(generalManager, centerManager), true);
  assert.equal(canFinalizeWeeklyReport(generalManager, centerManager), true);
  assert.equal(canReadManagedWeeklyReport(generalManager, centerManager), true);
  assert.equal(canReviewCenterManagerWeeklyReport(assistant, centerManager), false);
  assert.equal(canFinalizeWeeklyReport(assistant, centerManager), false);
  assert.equal(canReadManagedWeeklyReport(assistant, centerManager), true);
  assert.equal(canEvaluateWeeklyReport(generalManager, centerManager), false);
  assert.equal(canEvaluateWeeklyReport(assistant, centerManager), false);
});
