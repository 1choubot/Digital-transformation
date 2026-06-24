import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canManageWeeklyRestMode,
  canReadAllCenters,
  canReadCenterDailyReport,
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
  assert.equal(canReadAllCenters(user(OrganizationRole.EMPLOYEE, { isPlatformAdmin: true })), true);
});

// Weekly rest anchors can be configured by general managers and platform admins.
test('weekly rest mode manager permission is restricted', () => {
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.GENERAL_MANAGER)), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.EMPLOYEE, { isPlatformAdmin: true })), true);
  assert.equal(canManageWeeklyRestMode(user(OrganizationRole.CENTER_MANAGER)), false);
});
