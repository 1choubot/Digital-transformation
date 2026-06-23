## 1. 后端接口与查询

- [x] 1.1 新增 `GET /api/me/stage-document-tasks` 路由
- [x] 1.2 为我的资料任务接口添加 `requireAuth`
- [x] 1.3 确保我的资料任务接口不要求 `requirePlatformAdmin`
- [x] 1.4 服务端从当前登录态读取用户 ID，不接收或信任前端传入责任人 ID
- [x] 1.5 实现只查询 `responsible_user_id = 当前登录用户 id` 的项目级阶段资料项
- [x] 1.6 默认 `status=pending`，返回 `not_submitted`、`submitted`、`returned`
- [x] 1.7 支持 `status=not_submitted`
- [x] 1.8 支持 `status=submitted`
- [x] 1.9 支持 `status=returned`
- [x] 1.10 支持 `status=confirmed`
- [x] 1.11 支持 `status=pending`
- [x] 1.12 支持 `status=all`
- [x] 1.13 非法 `status` 返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`
- [x] 1.14 默认排除 `is_applicable = 0` 的资料项
- [x] 1.15 支持可选 `projectId` 筛选
- [x] 1.16 校验 `projectId` 如提供必须为正整数
- [x] 1.17 非法 `projectId` 返回 `INVALID_PROJECT_ID`
- [x] 1.18 合法 `projectId` 无匹配任务时返回空列表
- [x] 1.19 通过统一 `errorHandler` 返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`，HTTP 状态建议为 400
- [x] 1.20 通过统一 `errorHandler` 返回 `INVALID_PROJECT_ID`，HTTP 状态建议为 400
- [x] 1.21 确保第一版不按项目状态、阶段状态或阶段是否当前过滤任务结果
- [x] 1.22 查询结果关联项目基础字段 `projectCode`、`projectName`
- [x] 1.23 查询结果关联阶段字段 `stageId`、`stageName`、`stageOrder`
- [x] 1.24 查询结果返回资料字段 `documentId`、`documentCode`、`documentName`、`isRequired`
- [x] 1.25 查询结果返回状态和追溯字段 `status`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt`
- [x] 1.26 查询结果返回 `isApplicable` 和 `responsibilityUpdatedAt`
- [x] 1.27 实现状态优先级排序：`returned`、`not_submitted`、`submitted`、`confirmed`
- [x] 1.28 实现同状态下按 `responsibilityUpdatedAt` 倒序且空值排后排序
- [x] 1.29 实现项目/阶段/资料顺序稳定排序兜底
- [x] 1.30 确认查询接口不写业务日志
- [x] 1.31 确认查询接口不改变资料状态、适用性、责任人、齐套摘要或阶段推进状态

## 2. 前端页面

- [x] 2.1 封装 `GET /api/me/stage-document-tasks` API 客户端方法
- [x] 2.2 新增“我的资料任务”或“我的责任资料”页面
- [x] 2.3 在主导航中新增我的资料任务入口
- [x] 2.4 页面加载时携带登录态请求我的资料任务接口
- [x] 2.5 未登录或登录态失效时按现有机制跳转登录或显示未登录提示
- [x] 2.6 展示任务列表或表格
- [x] 2.7 展示项目编号和项目名称
- [x] 2.8 展示阶段名称或阶段序号
- [x] 2.9 展示资料编号和资料名称
- [x] 2.10 展示必填或建议标识
- [x] 2.11 展示资料状态
- [x] 2.12 展示退回原因
- [x] 2.13 展示责任更新时间
- [x] 2.14 支持状态筛选并调用后端接口
- [x] 2.15 支持项目关键字筛选
- [x] 2.16 处理加载中、失败和空任务状态
- [x] 2.17 点击任务跳转到对应项目详情页
- [x] 2.18 页面文案说明这里展示的是分配给我的资料项
- [x] 2.19 页面文案说明状态为手工标记状态，不代表文件已上传或在线表单已填写
- [x] 2.20 不新增文件上传/下载、在线表单、通知、超期提醒、批量操作、复杂权限或统计入口
- [x] 2.21 在 `http.js` 为 `INVALID_STAGE_DOCUMENT_TASK_STATUS` 增加中文提示
- [x] 2.22 在 `http.js` 为 `INVALID_PROJECT_ID` 增加中文提示

## 3. README 文档

- [x] 3.1 更新 `digital-platform-api/README.md`，说明 `GET /api/me/stage-document-tasks`
- [x] 3.2 更新 `digital-platform-api/README.md`，说明登录态、非平台管理员边界和不做复杂权限
- [x] 3.3 更新 `digital-platform-api/README.md`，说明 status 筛选枚举、默认值和非法状态错误码
- [x] 3.4 更新 `digital-platform-api/README.md`，说明 projectId 筛选和稳定排序规则
- [x] 3.5 更新 `digital-platform-api/README.md`，说明非法 `projectId` 返回 `INVALID_PROJECT_ID`，合法无匹配返回空列表
- [x] 3.6 更新 `digital-platform-api/README.md`，说明第一版不按项目状态、阶段状态或阶段是否当前过滤
- [x] 3.7 更新 `digital-platform-api/README.md`，说明该接口不写业务日志、不改变业务状态
- [x] 3.8 更新 `digital-platform-web/README.md`，说明我的资料任务页面、导航入口和筛选能力
- [x] 3.9 更新 `digital-platform-web/README.md`，说明页面边界：手工状态、不代表文件上传或在线表单填写

## 4. 验证

- [x] 4.1 验证未登录调用 `GET /api/me/stage-document-tasks` 返回 401
- [x] 4.2 验证非平台管理员可调用我的资料任务接口
- [x] 4.3 验证只返回当前登录用户负责的资料项
- [x] 4.4 验证默认只返回 `not_submitted`、`submitted`、`returned` 且适用的资料项
- [x] 4.5 验证 `status=confirmed` 可返回已确认资料项
- [x] 4.6 验证 `status=all` 返回四种状态且仍排除不适用资料项
- [x] 4.7 验证非法 `status` 返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`
- [x] 4.7a 验证显式传入空 `status`（`?status=`）返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`
- [x] 4.8 验证 `projectId` 筛选只返回对应项目的任务
- [x] 4.9 验证非法 `projectId` 返回 `INVALID_PROJECT_ID`
- [x] 4.10 验证合法 `projectId` 无匹配任务时返回空列表
- [x] 4.11 验证 `INVALID_STAGE_DOCUMENT_TASK_STATUS` 和 `INVALID_PROJECT_ID` 均通过统一错误处理返回明确 HTTP 状态
- [x] 4.12 验证前端对 `INVALID_STAGE_DOCUMENT_TASK_STATUS` 和 `INVALID_PROJECT_ID` 展示中文提示
- [x] 4.13 验证项目状态和阶段状态不影响任务返回，非当前阶段或已完成项目中的匹配责任资料仍按筛选规则返回
- [x] 4.14 验证返回字段包含项目、阶段、资料、状态、适用性、退回原因和责任更新时间
- [x] 4.15 验证排序规则为退回优先、待提交其次、已提交其次、已确认最后，并且同状态下顺序稳定
- [x] 4.16 验证查询接口不写业务日志
- [x] 4.17 验证查询接口不改变资料状态、适用性、责任人、齐套摘要或阶段推进状态
- [x] 4.18 验证前端页面可加载我的资料任务列表
- [x] 4.19 验证前端状态筛选和项目关键字筛选
- [x] 4.20 验证点击任务跳转项目详情页
- [x] 4.21 验证页面展示手工状态和边界说明
- [x] 4.22 运行后端 `npm.cmd run check`
- [x] 4.23 运行前端 `cmd /c npm.cmd run build`
- [x] 4.24 运行 `cmd /c openspec validate add-my-stage-document-tasks --strict`
- [x] 4.25 运行 `cmd /c openspec validate --all --strict`
- [x] 4.26 运行 `cmd /c openspec list --json`
