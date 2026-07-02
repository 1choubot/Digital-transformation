## ADDED Requirements

### Requirement: 覆盖核查架构边界

技术架构 MUST 将 `audit-workspace-card-coverage-before-legacy-checklist-cleanup-v1` 限定为旧资料清单清理前的覆盖率核查口径和规划；本 change MUST NOT 切换 71 模板、删除或隐藏旧资料清单、改数据库、迁移旧项目或新增执行逻辑。

#### Scenario: 禁止数据库和 migration
- **WHEN** 本 change 建立覆盖率核查口径
- **THEN** 系统 MUST NOT 修改数据库 schema 或写 migration
- **AND** 覆盖核查 MUST 复用现有模板配置、workspace 聚合结果和阶段资料状态作为输入

#### Scenario: 禁止 71 模板切换
- **WHEN** 覆盖核查引用 v20260629 71 项目标模板配置
- **THEN** 系统 MUST NOT 将 v20260629 71 项设为新项目默认模板
- **AND** 系统 MUST NOT 把 71 项候选落库或补初始化旧项目

#### Scenario: 禁止旧清单清理执行
- **WHEN** 覆盖核查形成旧资料清单清理建议
- **THEN** 本 change MUST NOT 隐藏、折叠、删除旧资料清单组件或移除旧资料清单入口
- **AND** 清理执行 MUST 通过后续独立 change 管理

#### Scenario: 禁止新增业务执行逻辑
- **WHEN** 覆盖核查识别上方 workspace card 操作覆盖
- **THEN** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工或不适用执行规则
- **AND** 覆盖核查 MUST 只判断现有主入口和现有能力覆盖情况

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或后续执行阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

