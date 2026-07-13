## 1. OpenSpec 规划

- [x] 1.1 创建 `fix-solution-design-generated-form-download-revision-v1` change。
- [x] 1.2 编写 proposal，明确只覆盖方案设计在线表单生成文件下载 revision 规则。
- [x] 1.3 编写 design，记录下载 readiness 与节点提交门禁对齐方案。
- [x] 1.4 编写 `project-core` spec delta。
- [x] 1.5 编写 tasks。

## 2. 后端修复

- [x] 2.1 修改 C05 生成文件下载 readiness，使用 `isAnalysisFormGeneratedForRevision(formRow, node.current_revision)` 语义。
- [x] 2.2 修改 C15/C16 生成文件下载 readiness，使用 `isReviewFormGeneratedForRevision(formRow, node.current_revision)` 语义。
- [x] 2.3 保留 `buildGeneratedFormDownload()` 的存储文件可读校验和缺失文件错误。
- [x] 2.4 保持错误码和错误信息兼容。

## 3. 回归测试

- [x] 3.1 覆盖 C05 节点要求 v1、已生成 v1 可下载。
- [x] 3.2 覆盖 C05 生成 v2 且节点仍要求 v1 时可下载。
- [x] 3.3 覆盖 C05 `form.revision < node.current_revision` 时拒绝下载。
- [x] 3.4 覆盖 C15 当前评审表 revision 高于节点 current_revision 且已生成时可下载。
- [x] 3.5 覆盖 C16 当前评审表 revision 高于节点 current_revision 且已生成时可下载。
- [x] 3.6 覆盖生成状态不是 `generated` 或 storage key 为空时仍拒绝下载。

## 4. 校验

- [x] 4.1 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 4.2 运行 `cmd /c npm.cmd run check`。
- [x] 4.3 运行 `cmd /c openspec validate fix-solution-design-generated-form-download-revision-v1 --strict`。
- [x] 4.4 运行 `cmd /c openspec validate --all --strict`。
- [x] 4.5 运行 `cmd /c git diff --check`。

## 5. 收尾

- [x] 5.1 归档 change。
- [x] 5.2 提交实现。
