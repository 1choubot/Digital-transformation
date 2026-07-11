## Why

当前项目权限判断分散在多个 repository、route 和 helper 中，中心负责人、总经理、项目经理、资料责任人、方案设计角色、立项评价角色等判断存在重复表达。后续合同签订阶段和共享阶段机制会继续复用这些权限边界，需要先收敛基础 resolver，降低重复判断和语义漂移风险。

## What Changes

- 规划统一项目权限 resolver/helper，先收敛基础身份 helper 和低风险项目上下文判断。
- 明确查看权限和操作权限分离，避免“可查看项目”被误用为“可操作项目/资料/节点”。
- 第一批实现只迁移低风险身份 helper，不改变现有 API、DTO、SQL、状态机、工作台待办、operation log 或自动推进语义。
- 后续批次再逐步迁移项目上下文 resolver 和复杂操作权限，不在本轮规划中直接实现。
- 本 change 只创建规划和规格约束，不实现代码。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `technical-architecture`: 增加项目权限 resolver/helper 的分层、行为保持和后续开发约束。
- `project-core`: 增加项目核心权限判断逐步复用统一 helper、且迁移时保持现有权限结果的要求。

## Impact

- Planning scope:
  - `digital-platform-api/src/domain/organization.js`
  - 后续可能新增 `digital-platform-api/src/domain/projectPermissionResolver.js` 或等价后端权限 helper 模块。
  - 后续逐步迁移 stage documents、project visibility、stage advance、online forms、initiation review、solution design workflow 等后端权限调用点。
  - `openspec/specs/technical-architecture/spec.md` 与 `openspec/specs/project-core/spec.md` 的权限架构要求。
- Non-Goals:
  - 本轮不实现代码。
  - 不改业务行为。
  - 不改前端。
  - 不改 migration。
  - 不改 8 大阶段或 71 项资料数量。
  - 不重构方案设计复杂节点状态机。
  - 不改立项审批状态机。
  - 不下线旧阶段关口审批。
  - 不实现合同签订阶段。
  - 不 push。
