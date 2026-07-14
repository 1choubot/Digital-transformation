## Why

方案设计 workflow 已覆盖主要节点，但三个提交门禁仍与实际操作习惯不一致：退回后必须重新上传旧文件、报价/投标选择晚于财务总经理审批、方案设计 8 个产出全部强制上传。需要先统一规划这些门禁调整，为后续实现和测试建立清晰边界。

## What Changes

- 退回后不强制重新上传旧文件；旧有效文件可继续满足重提门禁，用户也可重新上传覆盖为新的 current file。
- 财务成本估算总经理审批通过时必须同步选择 `quotation` 或 `tender` 分支；后续报价/投标节点只展示已选分支流程，不再重复选择。
- 方案设计节点 8 个产出支持单项标记“无需上传”，提交门禁按“已上传或已豁免”判断。
- 产出豁免必须记录操作人、时间、原因或备注，并参与 DTO、工作台待办、operation log 和 C04-C19 派生完成口径。
- 本轮规划只创建 OpenSpec 文档，不实现代码、不归档、不提交、不 push。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整方案设计 workflow 的重提、报价/投标分支选择、8 个产出提交门禁和 C04-C19 派生规则。
- `technical-architecture`: 约束方案设计上传槽、节点状态、待办、日志和自动推进的实现边界。
- `project-core-frontend`: 约束项目工作区中重提、财务总经理审批分支选择、产出“无需上传”交互展示。

## Impact

- Backend areas:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/`
  - `digital-platform-api/src/domain/solutionDesignWorkflow.js`
  - `digital-platform-api/src/db/solutionDesignWorkflowSchema.js` if exemption state needs persistence
  - `digital-platform-api/src/repositories/stageDocuments/shared.js`
  - `digital-platform-api/src/repositories/projects/stageAdvanceRepository.js`
  - `digital-platform-api/test/projects/solutionDesignWorkflow.test.js`
- Frontend areas:
  - `digital-platform-web/src/components/project-workspace/ProjectSolutionDesignWorkflowPanel.vue`
  - `digital-platform-web/src/api/projects.js`
- OpenSpec/spec areas:
  - `project-core`
  - `project-core-frontend`
  - `technical-architecture`
- Non-Goals:
  - 不做精确返工范围。
  - 不改报价单在线表单。
  - 不改合同签订阶段。
  - 不改变 8 大阶段和 71 项资料数量。
  - 不处理旧关口审批。
  - 不处理无关 untracked。
  - 本轮规划不实现、不归档、不提交、不 push。
