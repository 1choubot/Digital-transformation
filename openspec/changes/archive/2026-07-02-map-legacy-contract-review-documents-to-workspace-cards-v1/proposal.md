## Why

旧资料清单清理前，当前运行的 20260625 64 项资料必须都能在上方项目工作区产出卡片找到主入口。覆盖率核查已确认 62/64 项覆盖完成，但 `3.3 合同审核记录表（销售合同）` 和 `5.4 采购合同审核记录表` 仍是 `legacy_only`。

## What Changes

- 在 v20260629 workspace shell 中为 `3.3`、`5.4` 增加两个旧模板兼容产出卡片。
- 两个兼容卡片分别使用 `legacyDocumentCode=3.3` 和 `legacyDocumentCode=5.4` 绑定当前运行资料。
- `3.3` 挂到合同签订阶段的“签订销售合同”附近，作为“销售合同审核记录兼容项”。
- `5.4` 挂到生产制作阶段的“签订采购合同”附近，作为“采购合同审核记录兼容项”。
- 上方卡片继续复用现有阶段资料状态、权限、责任人、附件和通用资料操作。
- 下方旧资料清单继续作为兼容区，不删除、不隐藏、不折叠。
- 补映射后覆盖率核查口径更新为 64/64：`covered_by_workspace_card=64`、`legacy_only=0`。

不做：

- 不切换 v20260629 71 项模板为新项目默认模板。
- 不迁移旧项目，不补初始化旧项目。
- 不删除、隐藏或折叠旧资料清单。
- 不新增业务规则、第二套状态机、流程引擎或复杂合同/采购审批流。
- 不改数据库 schema，不写 migration。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-core`: 当前运行 64 项资料的 workspace card 主入口覆盖率必须达到 64/64，且 `3.3`、`5.4` 作为旧模板兼容卡片绑定现有资料。
- `project-core-frontend`: 前端必须能将 `3.3`、`5.4` 的上方产出卡片作为主操作入口，并复用现有通用操作组件和权限状态。
- `stage-document-checklist`: 下方旧资料清单必须将 `3.3`、`5.4` 视为已迁移资料，降级为兼容只读区和定位入口。
- `technical-architecture`: 技术架构必须区分 71 项目标模板和旧模板兼容 workspace 输出，不得因兼容卡片把 71 项目标模板变成 73 项。

## Impact

- 修改 v20260629 workspace shell 配置：`digital-platform-api/src/domain/stageDocumentTemplateItemsV20260629.js`。
- 新增 9.25 规划和覆盖率更新文档。
- 新增 OpenSpec change artifacts 和 delta specs。
- 不修改数据库、migration、前端源码、项目创建初始化、旧项目资料记录、阶段推进或通用资料操作接口。
