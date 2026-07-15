import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword } from '../../src/domain/auth.js';
import { findLoginUserByIdentifier } from '../../src/repositories/userRepository.js';
import { authenticateLogin } from '../../src/services/authenticationService.js';

function userRow({ id, account, displayName, password = 'Password@123', isEnabled = 1 }) {
  return {
    id,
    account,
    display_name: displayName,
    password_hash: hashPassword(password),
    is_enabled: isEnabled,
    is_platform_admin: 0
  };
}

function fakeExecutor(users) {
  return {
    async execute(sql, params) {
      const identifier = params[0];
      if (sql.includes('WHERE account = ?')) {
        return [[users.find((user) => user.account === identifier)].filter(Boolean)];
      }
      if (sql.includes('WHERE display_name = ?')) {
        return [users.filter((user) => user.display_name === identifier).slice(0, 2)];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
}

async function finderFor(users, identifier) {
  return findLoginUserByIdentifier(identifier, fakeExecutor(users));
}

test('login identifier uses account before another user display name', async () => {
  const accountOwner = userRow({ id: 1, account: '张三', displayName: '账号本人' });
  const nameOwner = userRow({ id: 2, account: 'zhangsan', displayName: '张三' });
  const match = await finderFor([accountOwner, nameOwner], '张三');

  assert.equal(match.isAmbiguous, false);
  assert.equal(match.user.id, accountOwner.id);
});

test('unique Chinese display name can authenticate with surrounding whitespace trimmed', async () => {
  const user = userRow({ id: 1, account: 'zhangsan', displayName: '张三' });
  const authenticated = await authenticateLogin(
    '  张三  ',
    'Password@123',
    (identifier) => finderFor([user], identifier)
  );

  assert.equal(authenticated.id, user.id);
});

test('duplicate display name is rejected before password matching', async () => {
  const users = [
    userRow({ id: 1, account: 'zhangsan-1', displayName: '张三' }),
    userRow({ id: 2, account: 'zhangsan-2', displayName: '张三' })
  ];

  await assert.rejects(
    () => authenticateLogin('张三', 'Password@123', (identifier) => finderFor(users, identifier)),
    (error) => error.code === 'AMBIGUOUS_LOGIN_IDENTIFIER' && error.statusCode === 409
  );
});

test('account login remains available for users with duplicate display names', async () => {
  const users = [
    userRow({ id: 1, account: 'zhangsan-1', displayName: '张三' }),
    userRow({ id: 2, account: 'zhangsan-2', displayName: '张三' })
  ];
  const authenticated = await authenticateLogin(
    'zhangsan-2',
    'Password@123',
    (identifier) => finderFor(users, identifier)
  );

  assert.equal(authenticated.id, 2);
});

test('missing input, unknown users and wrong passwords use invalid credentials', async () => {
  const user = userRow({ id: 1, account: 'zhangsan', displayName: '张三' });
  const finder = (identifier) => finderFor([user], identifier);

  await assert.rejects(() => authenticateLogin('', 'Password@123', finder), { code: 'INVALID_CREDENTIALS' });
  await assert.rejects(() => authenticateLogin('不存在', 'Password@123', finder), { code: 'INVALID_CREDENTIALS' });
  await assert.rejects(() => authenticateLogin('张三', 'wrong-password', finder), { code: 'INVALID_CREDENTIALS' });
});

test('disabled user is rejected after valid credentials', async () => {
  const user = userRow({ id: 1, account: 'disabled', displayName: '禁用用户', isEnabled: 0 });

  await assert.rejects(
    () => authenticateLogin('禁用用户', 'Password@123', (identifier) => finderFor([user], identifier)),
    (error) => error.code === 'USER_DISABLED' && error.statusCode === 403
  );
});
