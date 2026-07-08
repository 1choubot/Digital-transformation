import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

function user(organizationRole, overrides = {}) {
  return {
    id: 1,
    department: 'rd_center',
    organizationRole,
    isPlatformAdmin: false,
    ...overrides
  };
}

test('daily report write permission is employee-only', () => {
  assert.equal(canWriteDailyReport(user(OrganizationRole.EMPLOYEE)), true);
  assert.equal(canWriteDailyReport(user(OrganizationRole.CENTER_MANAGER)), false);
  assert.equal(canWriteDailyReport(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), false);
});

test('weekly report write permission allows employees and center managers', () => {
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.EMPLOYEE)), true);
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canWriteWeeklyReport(user(OrganizationRole.GENERAL_MANAGER)), false);
});

test('center daily report read permission follows the current organization model', () => {
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.GENERAL_MANAGER_ASSISTANT)), true);
  assert.equal(canReadCenterDailyReport(user(OrganizationRole.EMPLOYEE)), false);
});

test('all-center read permission excludes ordinary center managers', () => {
  assert.equal(canReadAllCenters(user(OrganizationRole.CENTER_MANAGER)), false);
  assert.equal(canReadAllCenters(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canReadAllCenters(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), true);
});

test('weekly rest mode manager permission is restricted to management or platform admin', () => {
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.EMPLOYEE, { isPlatformAdmin: true })), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.CENTER_MANAGER)), false);
});

test('weekly review overview permission follows reviewer matrix', () => {
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.CENTER_MANAGER)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.GENERAL_MANAGER_ASSISTANT)), true);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.EMPLOYEE)), false);
  assert.equal(canReadWeeklyReviewOverview(user(OrganizationRole.SYSTEM_ADMIN, { isPlatformAdmin: true })), false);
});

test('center manager weekly employee review is department-scoped', () => {
  const reviewer = user(OrganizationRole.CENTER_MANAGER, { id: 10, department: 'rd_center' });
  const employee = user(OrganizationRole.EMPLOYEE, { id: 11, department: 'rd_center' });
  const otherCenterEmployee = user(OrganizationRole.EMPLOYEE, { id: 12, department: 'manufacturing_center' });
  const centerManagerSelf = user(OrganizationRole.CENTER_MANAGER, { id: 10, department: 'rd_center' });

  assert.equal(canReviewEmployeeWeeklyReport(reviewer, employee), true);
  assert.equal(canReadManagedWeeklyReport(reviewer, employee), true);
  assert.equal(canReviewEmployeeWeeklyReport(reviewer, otherCenterEmployee), false);
  assert.equal(canReviewEmployeeWeeklyReport(reviewer, centerManagerSelf), false);
});

test('general manager and assistant center-manager review permissions are separated', () => {
  const centerManager = user(OrganizationRole.CENTER_MANAGER, { id: 20, department: 'rd_center' });
  const generalManager = user(OrganizationRole.GENERAL_MANAGER, { id: 21, department: null });
  const assistant = user(OrganizationRole.GENERAL_MANAGER_ASSISTANT, { id: 22, department: null });

  assert.equal(canReviewCenterManagerWeeklyReport(generalManager, centerManager), true);
  assert.equal(canReadManagedWeeklyReport(generalManager, centerManager), true);
  assert.equal(canReviewCenterManagerWeeklyReport(assistant, centerManager), false);
  assert.equal(canReadManagedWeeklyReport(assistant, centerManager), true);
});
