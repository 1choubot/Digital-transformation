## ADDED Requirements

### Requirement: v20260629 运行稳定验证架构边界

技术架构 MUST 将本 change 限定为 v20260629 新项目运行基线验证和阻塞 bug 修复；实现 MUST NOT 借稳定验证引入数据库 migration、旧项目迁移、文件平台联动、复杂流程引擎、第二套资料状态机或兼容资料区删除。

#### Scenario: 验证优先级分层
- **WHEN** 团队执行 v20260629 新项目运行稳定验证
- **THEN** 团队 MUST 先用 API smoke 验证数据层、模板版本、资料集合、权限和阶段推进基础
- **AND** 团队 MUST 再用人工浏览器验收验证页面和交互
- **AND** 浏览器自动化 MAY 使用但不是强制项

#### Scenario: 使用新建测试项目验证
- **WHEN** 团队验证 v20260629 新项目运行基线
- **THEN** 验证 MUST 使用新建测试项目或专门测试数据
- **AND** 团队 MUST NOT 通过迁移旧项目、补初始化旧项目或改写旧项目资料记录来制造测试条件

#### Scenario: 允许修复阻塞 bug
- **WHEN** 验证发现 v20260629 新项目运行阻塞 bug
- **THEN** 本 change MAY 修改既有后端、前端或 smoke 以修复阻塞问题
- **AND** 修复 MUST 优先复用现有项目创建、阶段资料、workspace、workbench、阶段推进、在线表单和兼容资料区入口

#### Scenario: 禁止新增第二套规则
- **WHEN** 本 change 修复 v20260629 新项目运行问题
- **THEN** 系统 MUST NOT 新增第二套资料状态机、第二套上传/提交/审核/退回/返工/不适用规则或通用流程引擎
- **AND** 系统 MUST 继续复用现有资料状态、权限、附件、业务日志和阶段推进边界

#### Scenario: 禁止数据库和迁移
- **WHEN** 本 change 处于规划、实现或验证阶段
- **THEN** 系统 MUST NOT 修改数据库 schema 或写 migration
- **AND** 系统 MUST NOT 迁移旧项目、补初始化旧项目或自动回滚已创建项目

#### Scenario: 文件平台和复杂流程后置
- **WHEN** v20260629 新项目资料涉及附件、草稿合同、供应商评价、生产记录或资料移交
- **THEN** 本 change MUST 继续使用当前在线平台附件边界
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台目录、恢复文件平台归档状态、实现付款流、发票流或项目模式分支

#### Scenario: 兼容资料区继续保留
- **WHEN** 本 change 验证新旧项目兼容资料区
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 继续通过后续独立 change 决定

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划、实现或验证阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界
