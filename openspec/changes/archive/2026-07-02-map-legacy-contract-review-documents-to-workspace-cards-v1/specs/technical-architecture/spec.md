## ADDED Requirements

### Requirement: 旧模板兼容 workspace 输出架构边界

技术架构 MUST 支持将当前运行 64 项中的旧模板兼容资料映射到 workspace card，同时 MUST 区分 v20260629 71 项目标模板输出和旧模板兼容输出。

#### Scenario: 兼容输出不改变 71 项目标模板计数
- **WHEN** 系统为 `3.3` 和 `5.4` 增加 workspace card
- **THEN** 技术实现 MUST NOT 将这两个兼容输出追加计入 `V20260629_TARGET_TEMPLATE_OUTPUT_COUNT`
- **AND** v20260629 目标模板输出数量 MUST 继续为 71
- **AND** 系统 MUST NOT 因兼容输出把 71 项目标模板解释为 73 项

#### Scenario: 兼容输出只绑定现有资料
- **WHEN** workspace shell 返回 `3.3` 或 `5.4` 兼容 output/card
- **THEN** 该 output/card MUST 通过 `legacyDocumentCode` 绑定当前运行资料
- **AND** 系统 MUST NOT 创建新资料模板项、写入项目资料记录、补初始化旧项目或执行旧项目迁移

#### Scenario: 复用现有状态和操作架构
- **WHEN** 用户通过 `3.3` 或 `5.4` 兼容卡片处理资料
- **THEN** 系统 MUST 复用现有资料状态、权限、附件、业务日志和通用操作接口
- **AND** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工、不适用或恢复适用规则
- **AND** 系统 MUST NOT 引入合同审核流、采购审核流、BPM 或流程引擎

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或实现阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界
