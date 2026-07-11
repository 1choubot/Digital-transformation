import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_DEPARTMENT,
  ORGANIZATION_ROLE,
  hasOrganizationRole,
  isCenterManager,
  isCenterManagerOf,
  isCenterManagerUser,
  isGeneralManagerAssistantUser,
  isGeneralManagerUser,
  isProjectManagerForProject,
  isProjectManagerOf,
  isResponsibleUserOf,
  isSystemAdminUser
} from '../../src/domain/organization.js';

function user(overrides = {}) {
  return {
    id: 10,
    department: BUSINESS_DEPARTMENT.RD_CENTER,
    organizationRole: ORGANIZATION_ROLE.EMPLOYEE,
    ...overrides
  };
}

test('organization role helpers return false for empty input and match exact roles', () => {
  assert.equal(hasOrganizationRole(null, ORGANIZATION_ROLE.GENERAL_MANAGER), false);
  assert.equal(hasOrganizationRole(undefined, ORGANIZATION_ROLE.GENERAL_MANAGER), false);
  assert.equal(hasOrganizationRole(user(), null), false);

  assert.equal(isGeneralManagerUser(user({ organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER })), true);
  assert.equal(
    isGeneralManagerAssistantUser(user({ organizationRole: ORGANIZATION_ROLE.GENERAL_MANAGER_ASSISTANT })),
    true
  );
  assert.equal(isSystemAdminUser(user({ organizationRole: ORGANIZATION_ROLE.SYSTEM_ADMIN })), true);
  assert.equal(isCenterManager(user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER })), true);
  assert.equal(isCenterManagerUser(user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER })), true);
  assert.equal(isCenterManager(user({ organizationRole: ORGANIZATION_ROLE.EMPLOYEE })), false);
});

test('center manager helper is parameterized by actual business departments', () => {
  for (const department of Object.values(BUSINESS_DEPARTMENT)) {
    assert.equal(
      isCenterManagerOf(user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER, department }), department),
      true
    );
    assert.equal(isCenterManagerOf(user({ organizationRole: ORGANIZATION_ROLE.EMPLOYEE, department }), department), false);
  }

  assert.equal(
    isCenterManagerOf(
      user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER, department: BUSINESS_DEPARTMENT.RD_CENTER }),
      BUSINESS_DEPARTMENT.MARKETING_CENTER
    ),
    false
  );
  assert.equal(isCenterManagerOf(null, BUSINESS_DEPARTMENT.RD_CENTER), false);
  assert.equal(isCenterManagerOf(user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER }), null), false);
  assert.equal(isCenterManagerOf(user({ organizationRole: ORGANIZATION_ROLE.CENTER_MANAGER }), 'unknown'), false);
});

test('project manager helper supports snake_case and camelCase project rows', () => {
  const projectManager = user({ id: 42 });

  assert.equal(isProjectManagerOf(projectManager, { project_manager_user_id: 42 }), true);
  assert.equal(isProjectManagerOf(projectManager, { project_manager_user_id: '42' }), true);
  assert.equal(isProjectManagerOf(projectManager, { projectManagerUserId: 42 }), true);
  assert.equal(isProjectManagerForProject(projectManager, { projectManagerUserId: 42 }), true);
  assert.equal(isProjectManagerOf(projectManager, { project_manager_user_id: 7 }), false);
  assert.equal(isProjectManagerOf(projectManager, null), false);
  assert.equal(isProjectManagerOf(null, { project_manager_user_id: 42 }), false);
});

test('responsible user helper supports snake_case and camelCase document rows', () => {
  const responsibleUser = user({ id: 18 });

  assert.equal(isResponsibleUserOf(responsibleUser, { responsible_user_id: 18 }), true);
  assert.equal(isResponsibleUserOf(responsibleUser, { responsible_user_id: '18' }), true);
  assert.equal(isResponsibleUserOf(responsibleUser, { responsibleUserId: 18 }), true);
  assert.equal(isResponsibleUserOf(responsibleUser, { responsible_user_id: 19 }), false);
  assert.equal(isResponsibleUserOf(responsibleUser, null), false);
  assert.equal(isResponsibleUserOf(null, { responsible_user_id: 18 }), false);
});
