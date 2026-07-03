## ADDED Requirements

### Requirement: 新项目默认使用 v20260629 模板且旧项目不迁移

项目核心能力 MUST 在本 change implementation 完成后让新建项目默认使用 v20260629 71 项资料模板，并 MUST 保持旧项目按其已有项目资料记录运行。

#### Scenario: 创建新项目生成 71 项资料
- **WHEN** 用户创建新项目
- **THEN** 项目创建事务 MUST 初始化标准 8 阶段和 v20260629 71 项项目级阶段资料
- **AND** 项目创建 MUST 继续记录创建人和 `project.created` 业务日志
- **AND** 项目创建 MUST NOT 因项目编号、项目经理、项目模式、参与中心、计划时间或立项日期为空被拒绝

#### Scenario: 71 项模板字段映射必须先封口
- **WHEN** 团队实现 v20260629 新项目默认模板启用
- **THEN** 项目核心 MUST 在切换默认模板前固化 71 项字段映射清单
- **AND** 字段映射清单 MUST 至少包含 documentCode、documentName、stageOrder、stageKey、documentOrder、completionMode、submitMode 和 isRequired
- **AND** 字段映射清单 MUST 明确 documentCode 是否使用 targetOutputCode，且 completionMode、submitMode、isRequired MUST NOT 在编码时临时决定

#### Scenario: 旧项目不迁移
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 项目核心 MUST NOT 自动补初始化 71 项资料
- **AND** 项目核心 MUST NOT 迁移旧项目、改写旧项目 64 项资料状态、改写责任人、改写附件或改变阶段推进结果

#### Scenario: 阶段推进按项目实际资料集合判断
- **WHEN** 系统判断阶段齐套、阶段推进门禁、工作台待办或项目工作区状态
- **THEN** 判断 MUST 基于该项目实际存在的阶段资料记录、completionMode、适用性、状态和返工字段
- **AND** 系统 MUST 支持 v20260629 新项目和 20260625 旧项目并存

#### Scenario: LC33 LC54 不进入新项目
- **WHEN** 项目创建事务初始化 v20260629 新项目资料
- **THEN** 项目核心 MUST NOT 创建 `3.3`、`5.4`、`LC33` 或 `LC54` 对应项目资料记录
- **AND** `LC33 / LC54` MUST 仅用于旧项目或 64 项项目的 workspace 兼容展示

#### Scenario: 回滚不自动改写已创建项目
- **WHEN** 团队将默认模板版本从 v20260629 回滚到旧模板版本
- **THEN** 回滚 MUST 只影响后续新建项目默认初始化
- **AND** 已按 v20260629 创建的项目 MUST NOT 自动回滚、删除资料或改写为 64 项

#### Scenario: 立项主流程不回退
- **WHEN** v20260629 新项目处理 `1.1 / 1.2 / 1.3`
- **THEN** 项目核心 MUST 继续使用现有在线表单、`1.2` 专用评价审批、精准返工和项目编号前置门禁
- **AND** 项目核心 MUST NOT 新增普通提交、普通审核或普通退回路径绕过立项专用规则
