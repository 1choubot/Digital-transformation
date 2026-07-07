## ADDED Requirements

### Requirement: 旧资料清单折叠架构边界

技术架构 MUST 将本 change 限定为前端展示层调整：旧资料清单可默认折叠为兼容资料区，但 MUST NOT 引入数据库 migration、后端 API 变更、v20260629 71 项模板切换、旧项目迁移、旧清单删除或第二套资料执行规则。

#### Scenario: 不修改后端和数据库
- **WHEN** 本 change 实现兼容资料区默认折叠
- **THEN** 系统 MUST NOT 修改后端 API、数据库 schema 或 migration
- **AND** 系统 MUST NOT 新增或修改项目资料初始化、阶段推进、业务日志、附件或权限后端逻辑

#### Scenario: 不切换模板或迁移旧项目
- **WHEN** 本 change 完成
- **THEN** 系统 MUST NOT 将 v20260629 71 项模板切换为新项目默认模板
- **AND** 系统 MUST NOT 迁移旧项目、补初始化旧项目或把 71 项候选落库

#### Scenario: 不删除旧资料清单组件
- **WHEN** 前端将旧资料清单默认折叠为兼容资料区
- **THEN** 实现 MUST NOT 删除、物理移除或完全隐藏旧资料清单组件
- **AND** 隐藏或删除旧资料清单 MUST 继续通过后续独立 change 决定

#### Scenario: 不新增第二套执行规则
- **WHEN** 用户通过上方 workspace card 或展开后的兼容资料区查看资料
- **THEN** 系统 MUST 继续复用现有资料状态、权限、附件、业务日志和通用操作接口
- **AND** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工、不适用或恢复适用规则

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或实现阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界
