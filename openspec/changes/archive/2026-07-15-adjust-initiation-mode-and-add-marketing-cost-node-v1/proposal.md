## Why

立项 `1.2 项目立项审批表` 当前要求商务负责人提前填写项目开展模式，但该判断实际应由总经理在最终审批通过时确定。方案设计阶段的 C17 成本估算链路当前只有研发、制造、财务三段，缺少营销中心成本估算节点，不能完整表达报价前的营销成本评估责任。

## What Changes

- `1.2 项目立项审批表` 的项目开展模式从商务负责人协同填写改为总经理审批通过时选择。
- 总经理审批不通过 `1.2` 时不要求选择项目开展模式。
- 总经理选择后将 `projectExecutionMode` 写回 `1.2` 表单数据，用于生成和查看项目立项审批表，但仍不写入 `projects.project_mode`。
- 如果 `1.2` 被退回重走，旧的总经理项目开展模式选择失效，重新审批通过时重新选择。
- `1.3 项目立项通知` 使用新版 `项目立项通知-模板.docx`，不再继续使用旧模板名 `关于确定项目名称及编号的通知-模板.docx`。
- 新版 `1.3` 通知表格新增“开展模式”列，来源于总经理审批通过 `1.2 项目立项审批表` 时选择的 `projectExecutionMode`。
- `1.3` 通知仍不写入 `projects.project_mode`，仍不改变 8 阶段和 71 项资料数量。
- 方案设计阶段新增 `marketing_cost_estimation` 内部节点，名称为“营销成本估算”，位于制造成本估算之后、财务成本估算之前。
- 新增 `marketing_cost_estimation_file` 上传槽，名称为“营销中心成本估算表”，由商务负责人上传，营销中心负责人审批。
- C17“成本估算表”仍为一个资料项，完成条件从研发、制造、财务三段扩展为研发、制造、营销、财务四段成本节点均完成且四个 current 文件齐套。
- 本 change 按 Batch 1/2/3 分批实施；归档和提交在实现与校验完成后按 tasks 收尾执行。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整立项项目开展模式责任点，并扩展方案设计 C17 成本估算链路为四段。
- `project-core-frontend`: 调整 `1.2` 协同填写和总经理审批弹层展示，并增加营销成本估算节点前端展示要求。
- `technical-architecture`: 约束项目开展模式审批写回、成本节点 enum/migration、上传槽、派生完成、待办和自动推进架构。
- `business-operation-log`: 增加总经理选择项目开展模式和营销成本估算相关业务日志口径。

## Impact

- Backend areas:
  - `digital-platform-api/src/repositories/stageDocuments/onlineFormRepository.js`
  - `digital-platform-api/src/repositories/stageDocuments/initiationReviewRepository.js`
  - `digital-platform-api/src/domain/initiationTemplateFileManifest.js`
  - `digital-platform-api/src/repositories/stageDocuments/generatedFileRepository.js`
  - `digital-platform-api/src/domain/solutionDesignWorkflow.js`
  - `digital-platform-api/src/db/solutionDesignWorkflowSchema.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/permissions.js`
  - `digital-platform-api/src/repositories/stageDocuments/shared.js`
  - `digital-platform-api/src/repositories/operationLogRepository.js`
  - `digital-platform-api/test/projects/initiationWorkflow.test.js`
  - initiation workflow tests covering the `1.3` notice generated file's project execution mode column
  - `digital-platform-api/test/projects/solutionDesignWorkflow.test.js`
- Frontend areas:
  - `digital-platform-web/src/components/project-workspace/ProjectInitiationReviewPanel.vue` or equivalent `1.2` approval UI
  - `digital-platform-web/src/components/project-workspace/ProjectSolutionDesignWorkflowPanel.vue`
  - `digital-platform-web/src/api/projects.js`
- Database:
  - Formal migration is required for MySQL enum expansion on solution design nodes and upload slots.
- Non-Goals:
  - 不改变 8 阶段。
  - 不改变 71 项资料数量。
  - 不改合同签订阶段。
  - 不改报价单在线表单。
  - 不处理旧关口审批下线。
  - 不处理无关 untracked。
  - 归档和提交按 tasks 收尾执行。
