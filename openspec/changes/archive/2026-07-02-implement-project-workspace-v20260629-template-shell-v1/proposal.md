## Why

20260629 目标模板规划已经确认下一版资料模板应以图面产出 + 4 个草稿修正形成 71 项候选，但当前系统仍主要依赖旧资料清单承载非立项阶段操作。需要先实现一个“大框架 shell 第一版”，把非运行默认的 `v20260629` 配置、8 阶段、蓝色模块、产出卡片外壳和旧资料清单兼容边界落地，同时避免本 change 直接进入模板切换、旧项目迁移或通用操作迁移。

## What Changes

- 收窄 `docs/9.22_20260629目标模板与项目工作区大框架第一版规划_20260702.md` 对应 implementation 口径为 shell 第一版。
- 实现项目工作区 shell 第一版，并允许定义新模板版本 `v20260629` 的非运行默认配置。
- 明确本 change 不默认把新项目切到 `v20260629`；只能定义配置或受控开关设计，真正切换新项目模板必须另开 change。
- 明确旧项目第一版不自动补初始化、不迁移、不改 64 项资料状态；旧项目迁移必须另开 change。
- 实现项目工作区 shell：左侧 8 阶段，右侧阶段内显示蓝色模块，蓝色模块下显示产出卡片。
- 实现产出卡片 shell 第一版入口和状态展示：责任人、状态、阻塞原因、附件/提交/审核处理入口。
- 明确非立项阶段产出卡片处理入口必须定位到旧资料清单对应资料，不直接执行上传、提交、审核或退回。
- 明确通用文件上传、提交、审核/退回从旧资料清单迁移到产出卡片属于后续逐阶段 implementation，不在本 change 默认完成。
- 规划非立项阶段第一版默认文件上传/附件上传；立项 `1.1 / 1.2 / 1.3` 保持现有在线表单和专用审批规则。
- 规划下方旧资料清单降级为兼容区，不物理删除。
- 明确本 change 实现项目工作区 shell，但不切换新项目默认模板、不迁移旧项目、不迁移通用执行能力、不改数据库、不写 migration。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `stage-document-checklist`: 规划 `v20260629` 71 项目标模板配置和第一版默认文件上传规则，但不作为运行默认模板。
- `project-core`: 规划新项目模板切换必须另开 change、旧项目不自动迁移和阶段推进运行安全边界。
- `project-core-frontend`: 规划项目工作区上方蓝色模块产出卡片 shell 作为未来主操作入口，旧资料清单作为兼容区。
- `technical-architecture`: 规划不引入流程引擎、不做在线表单大扩展、不做文件平台联动的架构边界。

## Impact

- Affected docs: 新增 `docs/9.22_20260629目标模板与项目工作区大框架第一版规划_20260702.md`。
- Affected OpenSpec: 新增 `openspec/changes/implement-project-workspace-v20260629-template-shell-v1/` 下 proposal、design、tasks 和 spec deltas。
- Affected backend scope in implementation: limited to non-runtime-default `v20260629` config and read-only workspace shell data if needed.
- Affected frontend scope in implementation: project workspace shell rendering for 8 stages, blue modules, output cards, and legacy checklist positioning.
- No database or migration changes.
