## Why

通用资料操作已经迁移到上方项目工作区产出卡片，但在清理、默认折叠或隐藏下方旧资料清单前，必须确认当前运行的 20260625 64 项资料是否都能在上方找到对应主入口。

本 change 用于建立覆盖率核查口径和清理前置依据，避免在仍有资料依赖旧清单时过早清理兼容区。

## What Changes

- 建立当前 64 项运行资料与 workspace 输出卡片的覆盖清单口径。
- 为每项资料标记 `workspaceCoverageStatus`，包括 `covered_by_workspace_card`、`legacy_only`、`shell_placeholder_only`、`needs_mapping_fix`、`needs_business_confirmation`。
- 为每项资料单独标记 `targetTemplateStatus`，包括 `kept_in_v20260629`、`removed_in_v20260629`、`split_in_v20260629`、`renamed_or_mapped_in_v20260629`、`needs_business_confirmation`。
- 找出仍依赖下方旧资料清单的资料，并要求说明原因。
- 给出旧资料清单默认折叠、隐藏或删除前的清理建议和阻塞项。
- 旧资料清单清理判断主要依据 `workspaceCoverageStatus`；`targetTemplateStatus` 只作为后续切换 71 模板的参考，不能直接决定当前旧清单清理。
- 新增 9.24 规划文档，预留覆盖率核查表模板。

不做：

- 不切换 v20260629 71 项模板。
- 不改数据库 schema，不写 migration。
- 不迁移旧项目，不补初始化旧项目。
- 不隐藏、折叠或删除旧资料清单。
- 不新增上传、提交、审核、退回、返工或不适用执行逻辑。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-core-frontend`: 项目工作区和旧资料清单清理前 MUST 支持覆盖率核查口径，明确哪些资料已由 workspace card 覆盖。
- `stage-document-checklist`: 旧资料清单隐藏或删除前 MUST 基于覆盖清单判断仍依赖旧清单的资料和原因。
- `project-core`: 项目核心 MUST 支持以当前运行模板资料、workspace 输出和目标模板候选为核查输入，不改变运行模板或旧项目状态。
- `technical-architecture`: 技术架构 MUST 将本 change 限定为核查口径和规划，不切换 71 模板、不改数据库、不迁移旧项目、不删除旧清单。

## Impact

- 影响 OpenSpec 规划、覆盖率核查文档和后续旧资料清单清理决策。
- 后续执行阶段可能读取当前运行模板配置、workspace 聚合结果、v20260629 目标模板配置和旧资料清单状态，但本 planning change 不改业务代码。
- 本 change 不修改 `digital-platform-api/src/**`、不修改 `digital-platform-web/src/**`、不新增数据库 migration、不提交旧项目迁移、不处理其他 active changes。
