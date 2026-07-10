## Why

当前项目阶段齐套后仍需要用户额外点击阶段推进，和“资料/专用 workflow 完成即进入下一阶段”的业务期望不一致。`stage_advance` 工作台待办因此变成额外操作；同时旧阶段关口审批已不在主流程中，但相关代码/API 仍保留，容易让用户和后续实现混淆。

## What Changes

- 实现“阶段完成后自动进入下一阶段”的阶段推进口径。
- 明确自动推进复用现有阶段齐套/门禁计算，不形成第二套齐套逻辑。
- 明确旧阶段关口审批机制为 legacy，不再作为阶段推进前置条件。
- 明确手动阶段推进接口可作为兜底保留，但不再是主用户流程。
- 工作台和项目详情页去除正常阶段推进额外操作；manual fallback 仅保留为 API / 运维兜底能力，用于处理已齐套但错过自动推进写触发的历史项目或异常项目，不作为主前端入口。

## Non-Goals

- 不改 migration。
- 不删除旧阶段关口审批表、API 或仓库。
- 不实现合同签订阶段业务。
- 不接文件平台。
- 不改变 8 大阶段数量。
- 不改变 v20260629 / 71 项资料数量。
- 不处理无关 dirty/untracked。
- 不归档、不提交、不 push。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 阶段齐套满足后自动推进到下一阶段，并将旧阶段关口审批标记为 legacy，不作为推进前置。
- `project-core-frontend`: 项目详情和工作台不再要求用户完成正常的手动阶段推进操作。
- `stage-document-checklist`: 阶段完成判定继续来自既有 completionMode、适用性和专用 workflow 派生结果。
- `business-operation-log`: 自动阶段推进必须记录可审计日志，并标明自动推进触发来源。
- `technical-architecture`: 自动推进必须复用单一阶段齐套/门禁计算链路，避免复制判断。

## Impact

- Affected backend areas: stage gate completeness calculation, stage advance orchestration, legacy stage gate approval boundary, operation log metadata, project lifecycle completion.
- Affected frontend areas: project detail stage display, workbench todo types, refresh behavior after actions that may trigger automatic advance.
- Affected testing areas: automatic advance idempotency, not-complete blocking, stage 8 project completion, legacy approval non-dependency, operation log metadata, fallback manual endpoint behavior.
