## Why

20260629 版《智能制造项目（自研模式）管理流程图》已经细化后 7 阶段的业务节点、产出文件和 YES/NO 回退关系。当前系统已经以 20260625 64 项资料模板、项目总览入口、项目工作区框架和立项阶段在线表单为运行基线，因此需要先做影响分析，避免直接按新版流程图改代码造成资料模板、completionMode 或状态机误伤。

## What Changes

- 新增 20260629 自研模式流程图影响分析规划文档。
- 新增流程图变化分类机制，要求后续流程图更新先分类再进入实现 change。
- 明确 20260629 流程图不推翻当前 8 阶段、项目总览入口、项目工作区框架和立项阶段 `1.1 / 1.2 / 1.3` 当前实现。
- 明确当前运行基线仍是 20260625 64 项资料模板；20260629 中疑似新增、改名、阶段移动或 completionMode 变化必须由后续独立 change 逐项确认。
- 明确 20260629 PDF 图面红色产出数为 67，按业务修正后的逻辑产出候选为 71；差异来自 4 处“准备/签订共用成品产出”应拆为“草稿 + 成品”。
- 明确 `成本估算表` 是当前唯一保留的真实多节点协作同一产出例外，技术协议、销售合同和采购合同的准备/签订不应长期作为伪多对一处理。
- 明确后续阶段节点和产出映射必须逐阶段迁移，不得一次性删除旧资料清单辅助区。
- 本 change 只做影响分析、规划和规格边界更新，不直接修改资料模板，不实现业务代码、不改前端、不改 API、不改数据库、不写 migration。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 增加 20260629 自研模式流程图作为后续阶段节点迁移输入的项目核心边界。
- `project-core-frontend`: 增加 20260629 流程图不推翻项目总览和项目工作区前端信息架构的边界。
- `stage-document-checklist`: 增加当前 20260625 64 项资料模板仍为运行基线、20260629 变化需独立确认的边界。
- `technical-architecture`: 增加流程图变化分类机制和不得直接按流程图更新改代码的架构边界。

## Impact

- Affected docs: 新增 `docs/9.20_自研模式流程图20260629影响分析与后续迁移规划_20260702.md`。
- Affected OpenSpec: 新增 `openspec/changes/review-self-developed-process-flow-20260629-v1/` 下 proposal、design、tasks 和 spec deltas。
- No API changes.
- No frontend implementation changes.
- No database or migration changes.
- No changes to `digital-platform-api/src/**` or `digital-platform-web/src/**`.
