## Why

方案设计在线表单生成文件下载仍按 `form.revision === node.current_revision` 判断可下载，但节点提交门禁已使用 `form.revision >= node.current_revision`。当 C05 图片变更后重新生成更高 revision 文件，而节点仍要求旧 revision 时，节点门禁可通过但下载会被错误拒绝。

## What Changes

- 将 C05 项目方案分析表、C15 内部方案评审记录表、C16 客户方案评审记录表的生成文件下载 readiness 与节点提交门禁 revision 规则对齐。
- 下载允许 `form.revision >= node.current_revision`，同时继续要求表单已提交、生成状态为 `generated`、`generated_file_storage_key` 非空、存储文件可读。
- 保持表单不存在、未提交、revision 低于节点要求、生成状态非 `generated`、storage key 为空、存储文件丢失等错误拒绝。
- 补充 C05/C15/C16 回归测试，覆盖高 revision 已生成文件可下载和无效生成文件仍拒绝。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 收口方案设计 C05/C15/C16 在线表单生成文件下载与节点提交门禁一致的 revision 规则。

## Impact

- API:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
- Referenced helper:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/permissions.js`
- Tests:
  - `digital-platform-api/test/projects/solutionDesignWorkflow.test.js`
- OpenSpec:
  - `openspec/changes/fix-solution-design-generated-form-download-revision-v1/specs/project-core/spec.md`
- Non-Goals:
  - 不改前端。
  - 不改 migration。
  - 不改方案设计状态机。
  - 不改节点或表单版本递增规则。
  - 不改 C05/C15/C16 模板生成内容。
  - 不改生成文件存储文件可读校验。
  - 本轮实现不归档、不提交、不 push。
