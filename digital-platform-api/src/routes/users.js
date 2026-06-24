import { Router } from 'express';
import { hashPassword } from '../domain/auth.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createManagedUser,
  getManagedUserById,
  listManagedUsers,
  resetManagedUserPassword,
  setManagedUserEnabled,
  updateManagedUser,
  listResponsibilityCandidateUsers,
  UserManagementError,
  USER_MANAGEMENT_ERROR
} from '../repositories/userRepository.js';

export const usersRouter = Router();

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text === '' ? null : text;
}

function normalizeBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }

  throw new UserManagementError('USER_INVALID_FIELD', 'Invalid user field', 400, ['isEnabled', 'isPlatformAdmin']);
}

function parseUserId(rawValue) {
  const id = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== String(rawValue)) {
    throw new UserManagementError(USER_MANAGEMENT_ERROR.NOT_FOUND, 'User not found', 404);
  }

  return id;
}

function assertNoForbiddenEditFields(payload) {
  const forbiddenFields = ['account', 'password', 'passwordHash', 'password_hash'];
  const found = forbiddenFields.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));

  if (found.length > 0) {
    throw new UserManagementError(
      USER_MANAGEMENT_ERROR.FORBIDDEN_FIELD,
      'User field cannot be changed by this endpoint',
      400,
      found
    );
  }
}

function assertRequiredFields(payload, fields) {
  const missing = fields.filter((field) => normalizeText(payload[field]) === '');

  if (missing.length > 0) {
    throw new UserManagementError(USER_MANAGEMENT_ERROR.REQUIRED_FIELDS, 'Missing required user fields', 400, missing);
  }
}

function normalizeCreateUserInput(payload) {
  assertRequiredFields(payload, ['account', 'displayName', 'department', 'role', 'password']);

  return {
    account: normalizeText(payload.account),
    displayName: normalizeText(payload.displayName),
    department: normalizeText(payload.department),
    // Report permissions use organizationRole; role remains the legacy job/role text.
    organizationRole: normalizeText(payload.organizationRole || payload.role || 'employee'),
    role: normalizeText(payload.role),
    // Weekly report exports read jobTitle when filling the template header.
    jobTitle: normalizeNullableText(payload.jobTitle),
    password: String(payload.password),
    isEnabled: normalizeBoolean(payload.isEnabled, true),
    isPlatformAdmin: normalizeBoolean(payload.isPlatformAdmin, false),
    filePlatformUserId: normalizeNullableText(payload.filePlatformUserId)
  };
}

function normalizeUpdateUserInput(payload) {
  assertNoForbiddenEditFields(payload);

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'displayName')) {
    patch.displayName = normalizeText(payload.displayName);
    if (!patch.displayName) {
      throw new UserManagementError(
        USER_MANAGEMENT_ERROR.REQUIRED_FIELDS,
        'Missing required user fields',
        400,
        ['displayName']
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'department')) {
    patch.department = normalizeText(payload.department);
    if (!patch.department) {
      throw new UserManagementError(
        USER_MANAGEMENT_ERROR.REQUIRED_FIELDS,
        'Missing required user fields',
        400,
        ['department']
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    patch.role = normalizeText(payload.role);
    if (!patch.role) {
      throw new UserManagementError(USER_MANAGEMENT_ERROR.REQUIRED_FIELDS, 'Missing required user fields', 400, [
        'role'
      ]);
    }
  }

  // Keep organizationRole editable for report permission assignments.
  if (Object.prototype.hasOwnProperty.call(payload, 'organizationRole')) {
    patch.organizationRole = normalizeText(payload.organizationRole);
    if (!patch.organizationRole) {
      throw new UserManagementError(
        USER_MANAGEMENT_ERROR.REQUIRED_FIELDS,
        'Missing required user fields',
        400,
        ['organizationRole']
      );
    }
  }

  // Keep jobTitle optional because legacy users may not have one yet.
  if (Object.prototype.hasOwnProperty.call(payload, 'jobTitle')) {
    patch.jobTitle = normalizeNullableText(payload.jobTitle);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isEnabled')) {
    patch.isEnabled = normalizeBoolean(payload.isEnabled, true);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isPlatformAdmin')) {
    patch.isPlatformAdmin = normalizeBoolean(payload.isPlatformAdmin, false);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'filePlatformUserId')) {
    patch.filePlatformUserId = normalizeNullableText(payload.filePlatformUserId);
  }

  return patch;
}

function normalizePasswordInput(payload) {
  const password = String(payload?.password || '');

  if (!password) {
    throw new UserManagementError(USER_MANAGEMENT_ERROR.PASSWORD_REQUIRED, 'Password is required', 400, ['password']);
  }

  return password;
}

usersRouter.get(
  '/responsibility-candidates',
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await listResponsibilityCandidateUsers();

    res.json({
      data: users
    });
  })
);

usersRouter.use(requireAuth, requirePlatformAdmin);

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await listManagedUsers();

    res.json({
      data: users
    });
  })
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = normalizeCreateUserInput(req.body || {});
    const created = await createManagedUser({
      ...user,
      passwordHash: hashPassword(user.password)
    });

    res.status(201).json({
      data: {
        user: created
      }
    });
  })
);

usersRouter.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const user = await getManagedUserById(userId);

    if (!user) {
      throw new UserManagementError(USER_MANAGEMENT_ERROR.NOT_FOUND, 'User not found', 404);
    }

    res.json({
      data: {
        user
      }
    });
  })
);

usersRouter.patch(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const patch = normalizeUpdateUserInput(req.body || {});
    const user = await updateManagedUser(userId, patch);

    res.json({
      data: {
        user
      }
    });
  })
);

usersRouter.put(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const patch = normalizeUpdateUserInput(req.body || {});
    const user = await updateManagedUser(userId, patch);

    res.json({
      data: {
        user
      }
    });
  })
);

usersRouter.post(
  '/:userId/enable',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const user = await setManagedUserEnabled(userId, true);

    res.json({
      data: {
        user
      }
    });
  })
);

usersRouter.post(
  '/:userId/disable',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const user = await setManagedUserEnabled(userId, false);

    res.json({
      data: {
        user
      }
    });
  })
);

usersRouter.post(
  '/:userId/reset-password',
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.userId);
    const password = normalizePasswordInput(req.body || {});
    const user = await resetManagedUserPassword(userId, hashPassword(password));

    res.json({
      data: {
        user
      }
    });
  })
);
