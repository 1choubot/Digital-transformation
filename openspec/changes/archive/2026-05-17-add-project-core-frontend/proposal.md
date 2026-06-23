## Why

`add-project-core` 已经完成后端项目创建、项目列表和项目详情基础 API。下一步需要让正式前端接入 `digital-platform-api`，把项目核心能力从接口能力落到可操作页面。

本变更只实现项目核心前端页面和 API base URL 配置，避免把在线表单、文件联动、权限、日志、看板、阶段推进和资料齐套率提前混入。

## What Changes

- 新增项目列表页，调用 `GET /api/projects` 展示项目基础信息和当前阶段。
- 新增新建项目页，调用 `POST /api/projects` 创建项目。
- 新增项目详情页，调用 `GET /api/projects/:projectId` 展示项目基础信息、当前阶段和 8 阶段基础状态。
- 新增前端 API base URL 配置，使正式前端可以指向 `digital-platform-api`。
- 页面可参考前端 Demo 的布局和交互形态，但不能使用 Demo 静态数据作为正式数据来源。
- 明确不实现在线表单、文件上传/下载、文件管理平台联动、权限/登录、日志、看板指标、阶段推进和资料齐套率。

## Capabilities

### New Capabilities

- `project-core-frontend`: 覆盖项目核心前端页面、API base URL 配置，以及对 `digital-platform-api` 的项目列表、创建和详情接口接入。

### Modified Capabilities

- 无。

## Impact

- 后续实现会影响正式前端工程的路由、API 客户端、项目列表页、新建项目页和项目详情页。
- 前端需要读取 API base URL 配置，并通过 HTTP 调用 `digital-platform-api`。
- 不要求修改后端 API、数据库、文件管理平台、权限体系、日志体系或看板模块。
