## ADDED Requirements

### Requirement: v20260629 新项目默认模板启用架构边界

技术架构 MUST 将本 change 限定为新项目默认模板版本切换和必要 smoke 更新；实现 MUST NOT 改数据库 schema、写 migration、迁移旧项目、处理文件平台联动、删除兼容资料区或新增第二套业务状态机。

#### Scenario: 复用现有模板版本和初始化结构
- **WHEN** 团队实现 v20260629 新项目默认模板启用
- **THEN** 实现 MUST 优先复用现有模板版本、阶段资料模板、项目级资料初始化和阶段资料查询结构
- **AND** 实现 MUST NOT 新增数据库表、修改 schema 或写 migration

#### Scenario: 新旧项目并存
- **WHEN** 系统同时存在 20260625 旧项目和 v20260629 新项目
- **THEN** 架构 MUST 允许按项目已有资料记录和模板版本判断资料集合、阶段推进、工作台和项目工作区状态
- **AND** 系统 MUST NOT 假设全库项目只有一个阶段资料模板版本

#### Scenario: 兼容输出与目标模板分层
- **WHEN** 实现使用 v20260629 目标模板初始化新项目
- **THEN** 架构 MUST 区分 `V20260629_TARGET_TEMPLATE_OUTPUTS` 和 `V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS`
- **AND** `LC33 / LC54` MUST NOT 进入新项目初始化、目标模板计数或模板校验

#### Scenario: 不处理文件平台联动
- **WHEN** v20260629 新项目默认模板启用
- **THEN** 系统 MUST 继续使用当前在线平台附件边界
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台目录或恢复文件平台归档状态

#### Scenario: 不新增流程引擎
- **WHEN** v20260629 71 项模板包含草稿合同、供应商评价、生产记录或资料移交等资料
- **THEN** 第一版实现 MUST 默认按文件上传或附件上传能力承载非立项资料
- **AND** 系统 MUST NOT 因模板启用新增 BPM、通用流程引擎、付款流、发票流或项目模式分支

#### Scenario: 不删除兼容资料区
- **WHEN** 新项目默认模板切换到 v20260629
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 继续通过后续独立 change 决定

#### Scenario: 分层验证
- **WHEN** 本 change implementation 修改模板默认版本、项目初始化或 smoke
- **THEN** 团队 MUST 验证 API check、OpenSpec validate、必要 Web build 和人工/代码路径验收
- **AND** 验收 MUST 覆盖新建项目 71 项、旧项目 64 项、`LC33 / LC54` 不进入新项目、立项在线表单不回退、兼容资料区不删除
