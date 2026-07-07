## ADDED Requirements

### Requirement: 旧资料清单通用操作迁移架构边界

技术架构 MUST 将 `migrate-stage-document-common-actions-to-workspace-cards-v1` 限定为把现有旧资料清单通用操作迁移到项目工作区产出卡片的规划和第一版实现边界；本 change MUST 禁止第二套状态机、复杂流程引擎、v20260629 71 项模板切换和数据库 migration。

#### Scenario: 禁止数据库 migration
- **WHEN** 本 change 规划或实现产出卡片通用操作迁移
- **THEN** 系统 MUST NOT 新增资料表结构、修改数据库 schema 或写 migration
- **AND** 第一版 MUST 复用现有资料、附件、权限、状态和日志数据结构

#### Scenario: 禁止第二套状态机和流程引擎
- **WHEN** 产出卡片承载上传、提交、审核、退回、返工或适用性操作
- **THEN** 系统 MUST NOT 引入第二套资料状态机、通用 BPM 或复杂流程引擎
- **AND** 系统 MUST 复用现有阶段资料状态流转和阶段推进边界

#### Scenario: 禁止第二套执行规则
- **WHEN** 前端从旧资料清单迁移通用操作到上方产出卡片
- **THEN** 系统 MUST NOT 创建第二套上传、提交、审核、退回、返工、不适用或恢复适用规则
- **AND** 产出卡片 MUST 调用或封装现有能力，而不是重新定义执行语义

#### Scenario: 禁止 71 模板切换
- **WHEN** 本 change 完成规划或第一版实现
- **THEN** 系统 MUST NOT 将 v20260629 71 项模板设为新项目默认模板
- **AND** 系统 MUST NOT 把新增 71 项候选落库或补初始化旧项目

#### Scenario: 文件平台联动不在本 change 处理
- **WHEN** 产出卡片承载附件上传、附件下载或附件删除
- **THEN** 系统 MUST 继续遵守当前在线平台附件边界
- **AND** 系统 MUST NOT 在本 change 中处理 file-platform-integration-v1 或恢复文件平台联动

#### Scenario: 分阶段验证
- **WHEN** 本 change 后续 implementation 修改后端资料接口、项目工作区数据聚合或前端产出卡片
- **THEN** 团队 MUST 分别验证 API check、Web build、OpenSpec validate 和浏览器/人工验收
- **AND** 验收 MUST 覆盖上方产出卡片通用操作、下方旧资料清单降级、立项在线表单不回退、71 模板未切换、旧项目未迁移，以及桌面/移动不重叠不溢出

