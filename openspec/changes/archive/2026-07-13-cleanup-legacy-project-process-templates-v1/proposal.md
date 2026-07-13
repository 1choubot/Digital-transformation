## Why

项目流程/阶段资料模板已经切换到 `v20260629` 71 项运行基线，但仓库里仍保留 `v20260610`、`v20260624` 命名文件和历史规划引用。需要先盘点旧模板版本引用，规划安全删除已无运行入口的版本，避免旧快照继续被误认为 active 模板。

## What Changes

- 本 change 实现范围只删除无运行入口的 `v20260610` 旧模板快照。
- 从 `digital-platform-api/package.json` check 脚本移除已删除的 `stageDocumentTemplateItemsV20260610.js`。
- 保留当前有效模板版本 `v20260629`，并保留仍用于既有项目兼容判断的 legacy `v20260625` 语义。
- `v20260624` 命名文件和 `reset-stage-documents-v20260624.js` 脚本只盘点、不删除、不重命名。
- 明确清理不得改变标准 8 大阶段、`v20260629` 71 项资料数量、资料编码、项目创建、阶段推进、工作台和项目工作区行为。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 增加项目流程模板版本清理边界，要求只使用当前有效模板创建新项目，并保护 8 大阶段、71 项资料和既有项目资料状态。
- `technical-architecture`: 增加旧模板清理治理要求，要求先盘点引用并禁止借清理重构阶段引擎、权限、前端或合同业务。

## Impact

- OpenSpec:
  - `openspec/changes/cleanup-legacy-project-process-templates-v1/`
- Implementation:
  - Delete `digital-platform-api/src/domain/stageDocumentTemplateItemsV20260610.js`.
  - Update `digital-platform-api/package.json` to remove the deleted file from `scripts.check`.
- Inventoried but unchanged:
  - `digital-platform-api/src/domain/stageDocumentTemplateItemsV20260624.js`
  - `digital-platform-api/src/domain/stageDocumentTemplates.js`
  - `digital-platform-api/scripts/check-stage-document-ownership.js`
  - `digital-platform-api/scripts/reset-stage-documents-v20260624.js`
  - README/docs/OpenSpec historical wording unless a later change explicitly handles naming cleanup.
- Non-Goals:
  - 不实现合同签订阶段业务。
  - 不下线旧关口审批。
  - 不改自动推进语义。
  - 不改前端。
  - 不改 migration。
  - 不改变 8 大阶段。
  - 不改变 `v20260629` 71 项资料数量。
  - 不删除或重命名 `v20260624` 命名文件和 reset 脚本。
  - 不删除或修改 `v20260625` legacy 兼容。
  - 不 push。
