## Why

`implement-solution-design-workflow-v1` 已将方案设计阶段做成专用 workflow，并能完成 9 个内部节点：方案设计准备、项目方案分析、方案设计、内部方案评审、客户方案评审、研发成本估算、制造成本估算、财务成本估算、报价/投标。

当前仍存在一处阶段推进断链：通用阶段齐套/推进仍按阶段资料 C04-C19 的普通资料状态和 `completionMode` 派生完成判断。由于 C04-C19 已被方案设计专用 workflow 接管，且旧普通资料 submit/confirm/return 入口被拒绝，workflow 完成后这些资料在通用资料状态上仍可能保持 `not_submitted` 或未确认，导致第 2 阶段齐套不完成，项目无法手工推进到第 3 阶段。

这是“方案设计专用 workflow 与通用阶段齐套门禁未对接”的断链 bug。需要规划一个稳定的派生完成规则，让专用 workflow 的完成结果参与通用阶段齐套和阶段推进门禁，而不是重新开放旧普通资料入口或批量篡改资料基础状态。

## What Changes

- 在通用阶段齐套/推进链路中规划方案设计 C04-C19 的派生完成规则。
- 明确 C04-C19 不通过旧普通资料接口完成，而是由方案设计专用状态机、上传槽、在线表单生成文件、审批结果和报价/投标分支结果派生完成。
- 明确报价/投标是二选一路径：报价路径完成 C18 并让 C19 不阻塞；投标路径完成 C19 并让 C18 不阻塞。
- 明确报价/投标节点通过后只表示第 2 阶段推进门禁满足，项目仍需用户手工点击阶段推进进入第 3 阶段。
- 保持旧普通资料 submit/confirm/return 对 C04-C19 的拒绝，不允许绕过专用 workflow。
- 前端继续消费后端返回的齐套和缺失资料派生状态，阶段推进按钮只按后端门禁展示。

## Non-Goals

- 本轮仅创建 OpenSpec 规划，不在本轮实现代码；后续实现任务按 `tasks.md` 第 7-11 节执行。
- 不新增或修改 migration。
- 不自动推进项目阶段。
- 不改变 8 大阶段。
- 不改变 v20260629 / 71 项资料数量。
- 不接文件平台。
- 不实现合同签订阶段业务。
- 不重新开放 C04-C19 的普通资料提交、确认或退回入口。
- 不生成 PDF、Word 或 Excel 成品文件。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 增加方案设计 C04-C19 专用 workflow 派生完成规则，并要求阶段推进门禁使用该派生结果。
- `project-core-frontend`: 增加项目详情页对后端派生齐套状态、缺失资料列表和阶段推进按钮可用性的展示要求。
- `technical-architecture`: 增加专用 workflow 接入通用阶段齐套/推进机制的架构约束，避免后续阶段继续形成专用 workflow 与通用阶段门禁断链。

## Impact

- Affected backend planning areas: stage document completion derivation, stage completeness summary, stage advance gate, solution design workflow DTO integration, legacy stage document status boundary.
- Affected frontend planning areas: project detail stage completeness display, missing document list, solution design ready-for-contract message, stage advance button state.
- Affected testing areas: quotation path, tender path, incomplete workflow blocking, branch not-selected blocking, legacy C04-C19 entry rejection, no automatic contract stage advance.
