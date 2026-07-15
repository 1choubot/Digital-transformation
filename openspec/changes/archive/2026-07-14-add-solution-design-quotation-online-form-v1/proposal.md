## Why

方案设计报价路径当前把 C18 报价单作为 `quotation_file` 上传槽处理，无法保证文件内容与领导确认的 `报价单-模板.docx` 保持一致。需要将报价单改为在线表单填写并由后端生成 Word 文件，让报价资料提交、下载和阶段齐套使用同一个可验证的生成结果。

## What Changes

- 报价流程选择后，在报价/投标节点的报价分支展示报价单在线表单。
- 商务负责人填写并提交报价单在线表单后，后端按 `报价单-模板.docx` 生成 `.docx` 报价单。
- 生成成功后，该报价单视为 C18 报价资料已提交；生成失败时不得显示为已完成。
- 下载报价单时下载后端生成的 `.docx`，而不是要求下载新上传的 `quotation_file`。
- 报价流程下 C18 报价单以在线表单生成文件为唯一当前提交、下载和完成口径；旧测试上传数据不做兼容、不迁移。
- 本轮实现完成后不归档、不提交、不 push。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整方案设计报价路径，要求 C18 报价单由在线表单生成 Word 文件，并以生成成功作为报价资料提交和下载依据。
- `technical-architecture`: 约束方案设计报价单生成复用现有 OOXML/docx 渲染能力，不新增外部文档服务。

## Impact

- Backend areas:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/`
  - `digital-platform-api/src/domain/solutionDesignWorkflow.js`
  - `digital-platform-api/src/db/solutionDesignWorkflowSchema.js` if implementation chooses a new quotation form table
  - `digital-platform-api/src/utils/ooxmlRenderer.js` only if existing `renderDocxTemplate()` cannot cover required mapping
  - `digital-platform-api/test/projects/solutionDesignWorkflow.test.js`
- Frontend areas:
  - 方案设计报价节点表单入口、保存、提交、生成状态和下载入口。
- Template:
  - `D:\Digital transformation\智能制造项目管理文件模板\报价单-模板.docx`
- Non-Goals:
  - 本 change 不调整“报价/投标选择提前到财务成本估算节点”。
  - 本 change 不调整退回精确返工逻辑。
  - 本 change 不改合同签订阶段。
  - 本 change 不改 8 大阶段和 71 项资料数量。
  - 本 change 不为旧 `quotation_file` 测试上传数据设计兼容或迁移路径。
  - 本轮实现完成后不归档、不提交、不 push。
