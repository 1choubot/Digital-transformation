## Why

当前系统已经支持阶段资料项责任人分配，但登录用户只能进入具体项目详情查看自己负责的资料项，缺少集中查看“分配给我的资料项”的入口。第一版“我的资料任务”用于把已分配给当前用户且仍需跟进的阶段资料项集中展示，减少用户跨项目查找资料责任项的成本。

该能力基于现有阶段资料清单、责任人字段、资料状态和适用性判断实现，只提供查询和展示，不改变资料业务状态。

## What Changes

- 新增 `GET /api/me/stage-document-tasks` 后端查询接口。
- 接口必须要求登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`。
- 接口只返回 `responsible_user_id = 当前登录用户 id` 的项目级阶段资料项。
- 默认 `status=pending`，仅返回 `not_submitted`、`submitted`、`returned` 且适用的资料项。
- 支持 `status=not_submitted|submitted|returned|confirmed|pending|all` 筛选。
- 支持可选 `projectId` 筛选。
- 非法 `status` 返回稳定错误码。
- 查询结果按固定优先级稳定排序：`returned`、`not_submitted`、`submitted`、`confirmed`，同状态下再按责任人更新时间和项目/阶段/资料顺序排序。
- 前端新增“我的资料任务”或“我的责任资料”页面，从主导航进入。
- 页面展示分配给当前登录用户的阶段资料项任务列表，支持状态筛选和项目关键字筛选。
- 点击任务跳转到对应项目详情页；第一版不强制实现资料项锚点定位。
- README 补充接口、筛选规则、页面能力和边界说明。
- 明确第一版不做文件上传/下载、文件平台联动、在线表单、消息提醒、超期提醒、个人工作台大看板、跨项目统计、批量操作、复杂权限或业务日志。

## Capabilities

### New Capabilities

- 无。本变更基于现有阶段资料清单和项目核心前端能力扩展，不新增独立 capability。

### Modified Capabilities

- `stage-document-checklist`: 增加“我的阶段资料任务”查询接口、筛选、返回字段、排序和边界要求。
- `project-core-frontend`: 增加“我的资料任务”页面、主导航入口、筛选、任务列表展示和项目详情跳转要求。

## Impact

本变更影响后端 API 路由、阶段资料项查询仓储、前端路由/导航、API 客户端、任务列表页面和 README。无需新增数据库表或迁移，不改变现有资料状态流转、适用性、责任人分配、阶段推进和业务日志写入逻辑。
