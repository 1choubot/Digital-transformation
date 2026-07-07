## Context

`1.1 / 1.2 / 1.3` 已被收敛为立项在线表单产出。前端项目工作区通过后端 `output.permissions.canManageResponsibility` 决定是否允许在上方产出卡片分配责任人，但责任人保存接口仍可能走更宽或不同的全局责任人管理 helper，导致返回权限与实际接口行为不一致。

## Goals / Non-Goals

**Goals:**

- 对 `1.1 / 1.2` 建立小范围专用责任人分配 helper。
- 同步权限返回和责任人保存/清空接口校验。
- 保持 `1.3` 不作为单独责任人分配资料。
- 保持其他阶段资料责任人分配规则不变。
- 补齐 smoke 覆盖关键角色和在线表单提交责任人边界。

**Non-Goals:**

- 不实现第二阶段补录。
- 不放宽全局责任人分配权限。
- 不修改数据库或 migration。
- 不改变在线表单提交状态机。
- 不处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`。

## Design

### Dedicated helper

新增 `canManageInitiationOnlineFormResponsibility(user, document)`，用于表达 `1.1 / 1.2` 的专用责任人分配权限。

规则：

- `documentCode` 是 `1.1` 或 `1.2`。
- `user.organizationRole === 'center_manager'`。
- `user.department === 'marketing_center'`。
- 用户不是 `system_admin`。
- 用户不是 `general_manager_assistant`。

`1.3` 返回 false，继续由营销中心负责人默认处理，不进行单独责任人分配。

### Integration points

- `buildStageDocumentPermissions()`：对 `1.1 / 1.2 / 1.3` 先使用立项在线表单责任人专用规则返回 `canManageResponsibility`，避免落入全局项目责任人管理口径。
- `responsibilityRepository.js`：保存和清空责任人时复用同一 helper。`1.1 / 1.2` 不再使用全局 helper 判定，`1.3` 拒绝单独分配。
- 其他阶段资料继续使用现有责任人分配权限规则，不因本修复改变。

### Smoke coverage

Smoke 需要覆盖：

- 营销中心负责人看到 `1.1 / 1.2 canManageResponsibility=true`，并可成功分配责任人。
- 研发中心负责人、总经理助理、系统管理员看到 `1.1 / 1.2 canManageResponsibility=false`，直接调用分配接口被拒绝。
- `1.3 canManageResponsibility=false`。
- 被分配责任人仍可保存/提交在线表单，非责任人或未分配时仍不可提交。

## Risks / Trade-offs

- [Risk] 直接放宽全局责任人管理 helper 会误伤其他阶段。Mitigation: 使用立项在线表单专用 helper，只在 `1.1 / 1.2` 分支生效。
- [Risk] 前端误把 `1.3` 当成可分配资料。Mitigation: 后端 `canManageResponsibility=false` 且保存接口拒绝 `1.3` 分配。
- [Risk] 返回权限与保存接口再次分叉。Mitigation: 两处复用同一 helper，并用 smoke 覆盖返回字段和直接接口调用。
