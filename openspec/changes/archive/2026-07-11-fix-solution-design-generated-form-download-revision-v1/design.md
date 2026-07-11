## Context

C05、C15、C16 在线表单提交成功后会生成 Excel 文件。节点提交门禁通过 `isAnalysisFormGeneratedForRevision(formRow, node.current_revision)` 或 `isReviewFormGeneratedForRevision(formRow, node.current_revision)` 判断生成文件是否满足当前节点要求。这些 helper 要求表单已提交、`form.revision >= requiredRevision`、生成状态为 `generated` 且 storage key 非空。

下载路径目前单独在 `assertGeneratedFormFileReady()` 中判断，且使用 `form.revision === node.current_revision`。该严格相等会在表单生成文件 revision 高于节点当前 revision 时误拒绝下载。

## Goals / Non-Goals

**Goals:**

- C05/C15/C16 生成文件下载与节点提交门禁使用一致 revision 规则。
- 保留现有错误码和错误信息，避免 API 客户端行为漂移。
- 保留存储文件可读校验和缺失文件业务错误。
- 增加回归测试覆盖高 revision 可下载和无效状态仍拒绝。

**Non-Goals:**

- 不改前端。
- 不改 migration。
- 不改方案设计状态机。
- 不改节点或表单版本递增规则。
- 不改模板生成字段、样式、图片锚点或文件命名。
- 不改权限可见性、operation log 或自动推进语义。

## Decisions

### 1. 下载 readiness 复用门禁 helper

`assertGeneratedFormFileReady()` 增加 form type 参数：

- C05 使用 `isAnalysisFormGeneratedForRevision(formRow, nodeRow.current_revision)`。
- C15/C16 使用 `isReviewFormGeneratedForRevision(formRow, nodeRow.current_revision)`。

这样下载 readiness 和节点提交 readiness 对齐，避免两个位置维护不同 revision 语义。

### 2. 存储可读校验保持在 `buildGeneratedFormDownload()`

`assertGeneratedFormFileReady()` 只判断业务状态和 storage key 是否存在。真实文件是否可读继续由 `buildGeneratedFormDownload()` 调用 storage adapter 校验，缺失文件继续抛 `GENERATED_FILE_MISSING`。

### 3. 错误兼容

表单不存在、未提交、revision 不满足、生成状态非 `generated`、storage key 为空继续使用 `GENERATED_FILE_NOT_FOUND` 和现有错误信息。存储文件缺失继续使用 `GENERATED_FILE_MISSING`。

## Risks / Trade-offs

- 复用 helper 会让下载接受高 revision 文件，这是预期修复，但必须确保仍拒绝未提交或低 revision 文件。
- C15/C16 复用同一个评审 helper，测试必须分别覆盖内部评审和客户评审，避免只修一个节点。
- fake db 测试需要显式构造 `node.current_revision` 与 `form.revision` 不相等的场景，避免只覆盖默认 v1。
