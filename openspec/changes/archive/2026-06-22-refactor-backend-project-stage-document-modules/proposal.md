## Why

项目、阶段资料和项目路由相关后端模块已经承载项目创建、阶段初始化、资料清单、资料状态、适用性、齐套摘要、阶段推进、责任人、我的资料任务、项目总览和附件等多项能力，单文件规模继续增长会提高后续文件管理平台联动、在线表单和权限扩展的维护风险。

本 change 只做行为保持型后端结构治理，通过拆分仓储和路由内部职责边界降低复杂度，不引入新业务能力。

## What Changes

- 拆分 `stageDocumentRepository.js` 的职责边界，将阶段资料清单查询/初始化、资料状态流转、资料适用性、齐套摘要、责任人分配和我的资料任务等能力迁移到更小的后端模块。
- 拆分 `projectRepository.js` 的职责边界，将项目创建/列表/详情、项目阶段初始化/阶段查询、阶段推进和项目总览看板等能力迁移到更小的后端模块。
- 保持阶段资料附件能力的独立模块边界；如只需调整 import，必须保持附件上传、列表、下载、删除、事务和业务日志规则不变。
- 整理 `routes/projects.js` 内部 handler/helper，使路由层保持较薄，但所有对外 API 路径和中间件顺序不变。
- 保持所有请求字段、响应字段、HTTP 状态码、错误码、权限要求、数据库结构、业务日志规则、阶段推进规则、资料状态机、资料适用性规则、责任人规则、我的资料任务规则、项目总览规则和附件规则不变。
- 不新增数据库迁移、不修改前端 UI、不新增文件管理平台联动、在线表单、权限模型、消息提醒或其他业务能力。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-core`: 增加项目核心后端模块拆分的行为保持要求，确保项目创建、列表、详情、阶段初始化、阶段推进和项目总览看板对外行为不变。
- `stage-document-checklist`: 增加阶段资料后端模块拆分的行为保持要求，确保资料清单、状态流转、适用性、齐套摘要、责任人、我的资料任务和附件能力对外行为不变。
- `business-operation-log`: 增加业务日志模块 import/调用边界的行为保持要求，确保拆分后日志动作、详情、事务一致性和失败不写日志规则不变。

## Impact

- 后端：影响 `digital-platform-api/src/repositories/stageDocumentRepository.js`、`digital-platform-api/src/repositories/projectRepository.js`、`digital-platform-api/src/routes/projects.js` 及拆分后的新仓储/服务/helper 模块。
- 前端：原则上不修改；仅在实现时如因 import 或构建必需进行最小调整，但不得改变 UI、路由、接口调用或用户可见行为。
- 数据库：不新增迁移，不修改表结构、索引、字段或初始化数据。
- API：所有既有路径、请求、响应、错误码、HTTP 状态码和权限要求保持不变。
- 验证：后端 check、前端 build、OpenSpec strict validate，以及覆盖现有关键链路的 HTTP/MySQL smoke。
