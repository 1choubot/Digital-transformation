## Why

当前前端入口仍容易把“项目列表”和“项目详情资料清单”作为主要路径，业务人员进入单个项目后需要先理解资料列表，再反推流程位置和节点产出。上一轮已完成项目工作区与立项在线表单规则，本 change 进一步固化前端信息架构：项目总览作为项目主入口，项目工作区内部通过 8 阶段导航和蓝色节点组织项目工作。

## What Changes

- 将“项目总览”定位为项目主入口，用于展示项目、项目状态、当前阶段、齐套/进度信息，并提供“新建项目”和进入项目工作区的入口。
- 主导航第一版不再展示独立“项目列表”入口；`/projects` 第一版必须进入项目总览或等价项目总览体验，不作为旧项目列表入口。
- 暂不删除 `ProjectListPage.vue`，但第一版只保留源码文件，不作为用户可见产品入口，不新增 `/projects/list` 或其他可见旧列表路由。
- 清理用户可见的旧项目入口文案，项目返回入口统一使用“项目总览”“返回项目总览”或等价项目入口语义。
- 将 `/projects/:id` 的项目详情定位为项目工作区。
- 项目工作区左侧固定展示 8 阶段导航，右侧展示当前阶段内容。
- 阶段导航只属于项目内部工作区，不放在项目总览页。
- 蓝色节点作为阶段内业务语境入口：点击阶段后展示阶段蓝色节点，点击节点后展示节点关联产出。
- 节点产出工作区先展示产出状态、责任人、阻塞原因和动作入口，不在点击蓝色节点时直接进入在线表单。
- 第一版完整支持立项阶段节点；其他 7 个阶段只展示占位、旧资料清单入口或“后续配置”状态。
- 第一版不新增后端接口，复用现有接口：`/api/projects/overview-dashboard`、`/api/projects/:id`、`/api/projects/:id/workspace`、`/api/projects/:id/stage-document-checklist`、`/api/projects/:id/stage-documents/:documentId/online-form`。

## Capabilities

### New Capabilities

- None. 本 change 不新增独立 capability，只调整现有项目核心、前端和技术架构规格的入口与导航口径。

### Modified Capabilities

- `project-core-frontend`: 调整项目入口、主导航、项目工作区布局、蓝色节点和在线表单入口层级的前端要求。
- `project-core`: 固化项目总览作为项目入口、项目工作区作为单项目内部工作入口，并限定第一版复用现有项目核心接口。
- `technical-architecture`: 固化第一版不新增后端接口、不改数据库、不新增权限模型的前端信息架构实现边界。

## Impact

- 后续实现主要影响前端路由、主导航、项目总览入口、`ProjectDetailPage.vue` 布局和项目工作区组件拆分。
- 后续实现不得要求新增后端接口、数据库表、migration 或新权限模型。
- 本轮只做规划文档和 OpenSpec change，不修改 `digital-platform-web/src/**`、不修改 `digital-platform-api/src/**`、不提交、不归档。

## Out of Scope

- 不实现代码。
- 不新增后端接口。
- 不改数据库或 migration。
- 不改立项阶段状态机。
- 不补齐其他 7 个阶段完整蓝色节点映射。
- 不把其他阶段在线表单化。
- 不恢复文件平台联动。
- 不做日报/周报。
- 不做通知推送。
- 不改账号管理。
- 不新增后端权限模型。
- 不处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`。
