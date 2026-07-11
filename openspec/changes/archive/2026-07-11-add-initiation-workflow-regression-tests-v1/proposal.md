## Why

方案设计阶段已经有较厚的 repository 级自动化测试保护，但立项阶段 `1.1 / 1.2 / 1.3` 的提交、审批、退回、重提、项目编号和自动推进关键链路缺少专门回归测试。后续权限 resolver、共享阶段机制和合同签订阶段开发都会触碰项目阶段与资料状态边界，需要先为立项关键路径补上后端保护网。

## What Changes

- 规划补齐立项阶段关键路径后端回归测试，覆盖 `1.1 项目需求表`、`1.2 项目立项审批表`、`1.3 项目立项通知` 的提交、审批、退回、重提、项目编号唯一性和阶段自动推进。
- 规划覆盖工作台待办在立项关键路径中的稳定性，避免关键处理项漏掉或普通待办乱增。
- 规划覆盖方案设计完成后 C04-C19 派生齐套并自动推进到第 3 阶段的集成链路，防止“断链派生 + 自动推进”组合回归。
- 本 change 只增加测试规划和规格约束，不改变现有业务行为。
- 本 change 不改前端、不改 migration、不改数据库表、不改 8 大阶段和 71 项资料数量。
- 本 change 不实现合同签订阶段，不清理旧模板，不下线旧阶段关口审批。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 增加立项关键路径与方案设计派生自动推进链路必须具备后端自动化回归保护的要求。
- `technical-architecture`: 增加测试架构约束，要求后续权限 resolver、共享阶段机制和合同阶段开发前具备立项关键路径 repository 级回归保护。

## Impact

- Affected planning scope:
  - `digital-platform-api/test/projects/` 下后续新增或扩展立项关键路径测试。
  - 可能新增 npm test script 用于独立运行立项 workflow 回归测试。
  - `openspec/specs/project-core/spec.md` 与 `openspec/specs/technical-architecture/spec.md` 的测试保障要求。
- No runtime impact in this planning round:
  - 不改业务代码。
  - 不改前端代码。
  - 不改 migration 或数据库结构。
  - 不改现有 API、DTO、状态机、权限、operation log、阶段推进或模板生成行为。
