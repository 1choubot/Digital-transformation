## Why

`digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js` 已约 6400 行，方案设计表单、模板生成、图片读取、权限判断、查询、状态编排、日志和自动推进触发混在同一仓储文件中。继续在该文件内叠加 C05/C15/C16、报价/投标和派生齐套逻辑会提高回归风险，也让后续缺陷定位和 review 成本持续上升。

本 change 规划一次后端无行为变化的结构治理：先拆纯函数和低风险 adapter，保留现有对外仓储 API 与事务编排，降低最明显的混乱，而不是引入新的工作流引擎或业务规则。

## What Changes

- 规划拆分 `solutionDesignWorkflowRepository.js` 中的方案设计后端逻辑，优先拆出模板生成、表单 normalize/DTO、权限 helper、查询 helper 等低风险模块。
- 保留 `solutionDesignWorkflowRepository.js` 作为对外 repository facade 和事务编排入口，抽出模块由该仓储调用。
- 明确后续实现必须保持外部行为不变：API DTO、错误码、权限结果、operation log、状态机、自动推进触发点、generated file 状态流转和 C05/C15/C16 模板生成结果均不得改变。
- 明确后续实现不得修改数据库表结构、migration、8 大阶段、71 项资料数量、合同签订阶段、立项阶段或文件平台边界。
- 本轮仅创建 OpenSpec 规划，不在本轮实现代码；后续实现按 `tasks.md` 第 2-7 节执行。

Non-Goals:

- 不改前端。
- 不改合同签订阶段。
- 不改立项阶段。
- 不迁移立项到统一引擎。
- 不做全局阶段 workflow engine。
- 不做统一权限 resolver 大重构。
- 不改 8 大阶段。
- 不改 71 项资料数量。
- 不改 migration。
- 不接文件平台。
- 本轮不归档、不提交、不 push。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `technical-architecture`: 增加方案设计 workflow 后端无行为变化拆分的架构约束、模块边界、事务边界和回归基线。
- `project-core`: 增加方案设计业务语义保持约束，确保拆分不改变 API、状态机、自动推进、日志、模板生成和资料数量。

## Impact

- Affected planning scope:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
  - future extracted modules under `digital-platform-api/src/repositories/projects/` or a small `solutionDesignWorkflow/` subdirectory.
- Behavioral compatibility:
  - Existing API routes and repository exports remain the contract.
  - Existing database schema and migration set remain unchanged.
  - Existing `test:solution-design` remains the primary regression baseline.
- Risks to control during implementation:
  - Accidentally changing transaction boundaries while extracting helper modules.
  - Accidentally changing permissions, blocking reasons, DTO fields or error codes.
  - Accidentally changing C05/C15/C16 generated file cell values, styles, images or generated-file lifecycle.
  - Accidentally changing automatic stage advance trigger timing or operation log content.
