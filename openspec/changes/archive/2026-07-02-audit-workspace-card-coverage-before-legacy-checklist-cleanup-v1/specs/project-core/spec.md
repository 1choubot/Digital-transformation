## ADDED Requirements

### Requirement: 项目核心覆盖核查输入边界

项目核心能力 MUST 支持以当前运行模板资料、workspace 输出卡片和 v20260629 目标模板配置作为覆盖率核查输入，但核查 MUST NOT 改变项目运行模板、项目资料记录或旧项目状态。

#### Scenario: 当前 64 项作为运行基线
- **WHEN** 执行 workspace card 覆盖率核查
- **THEN** 核查 MUST 以当前运行的 20260625 64 项资料作为主表
- **AND** v20260629 71 项目标模板 MUST 仅作为参照，不得替代当前运行基线

#### Scenario: 核查不写项目资料
- **WHEN** 生成覆盖率核查结论
- **THEN** 项目核心 MUST NOT 创建、补初始化、删除或改写项目阶段资料记录
- **AND** 系统 MUST NOT 将 71 项候选资料落库

#### Scenario: 核查不迁移旧项目
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 change MUST NOT 迁移旧项目、改写旧项目资料状态、改写责任人或改写附件
- **AND** 旧项目迁移 MUST 通过后续独立 change 明确映射和验收

#### Scenario: 覆盖状态和目标模板状态分离
- **WHEN** 某项资料完成覆盖核查
- **THEN** 项目核心核查结论 MUST 使用 `workspaceCoverageStatus` 标记 `covered_by_workspace_card`、`legacy_only`、`shell_placeholder_only`、`needs_mapping_fix` 或 `needs_business_confirmation` 之一
- **AND** 项目核心核查结论 MUST 使用 `targetTemplateStatus` 单独标记 `kept_in_v20260629`、`removed_in_v20260629`、`split_in_v20260629`、`renamed_or_mapped_in_v20260629` 或 `needs_business_confirmation` 之一
- **AND** 后续旧清单清理 MUST 主要依据 `workspaceCoverageStatus` 识别阻塞项，MUST NOT 仅因 `targetTemplateStatus` 决定当前旧清单清理
