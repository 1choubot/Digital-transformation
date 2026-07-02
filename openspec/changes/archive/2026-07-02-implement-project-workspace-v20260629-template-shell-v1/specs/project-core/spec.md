## ADDED Requirements

### Requirement: v20260629 shell 不改变项目初始化与旧项目状态

项目核心能力 MUST 将本 change 限定为 `v20260629` 配置和项目工作区 shell 实现边界；本 change MUST NOT 默认把新项目切到 `v20260629`，也 MUST NOT 自动补初始化、迁移或改写旧项目 64 项资料状态。

#### Scenario: 新项目默认模板不在本 change 切换
- **WHEN** 本 shell change 定义 `v20260629` 目标模板配置或受控开关设计
- **THEN** 项目创建 MUST 继续使用当前运行模板
- **AND** 系统 MUST NOT 因本 change 默认将新项目初始化为 `v20260629`
- **AND** 真正切换新项目模板 MUST 通过后续独立 change 实现

#### Scenario: 旧项目不自动补初始化或迁移
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 shell change MUST NOT 自动补初始化 71 项目标模板资料
- **AND** 本 shell change MUST NOT 迁移旧项目、改写 64 项资料状态、改写责任人、改写附件或改变阶段推进结果
- **AND** 旧项目迁移或补初始化 MUST 通过后续独立 change 明确映射、保留项、废弃项、草稿/成品拆分和追溯规则

#### Scenario: 阶段推进边界保持受控
- **WHEN** 项目使用 `v20260629` 或仍使用 20260625 模板
- **THEN** 阶段推进 MUST 基于该项目实际模板版本、项目级资料状态、completionMode、适用性和返工字段判断
- **AND** 本 shell change MUST NOT 改变任何项目的阶段推进结果

#### Scenario: 工作区 shell 不改变项目核心状态机
- **WHEN** 项目工作区返回或渲染 8 阶段、蓝色模块和产出卡片 shell
- **THEN** 项目核心 MUST NOT 因 shell 展示改变项目状态机、阶段推进门禁、工作台任务生成或项目编号规则
- **AND** 产出卡片入口和状态展示 MUST 读取既有后端状态，不创建第二套项目完成状态

#### Scenario: 工作台和业务日志不在 shell 中改变
- **WHEN** 本 shell change 只实现大框架 shell
- **THEN** 系统 MUST NOT 修改工作台任务生成、项目业务日志语义、项目编号规则或状态机
- **AND** 这些运行时变化 MUST 由后续 implementation change 明确规格和验证
