## ADDED Requirements

### Requirement: 旧模板合同审核资料 workspace 兼容卡片

项目核心能力 MUST 为当前运行 64 项资料中剩余的 `3.3 合同审核记录表（销售合同）` 和 `5.4 采购合同审核记录表` 提供上方 workspace card 主入口，并 MUST 保持 v20260629 71 项目标模板口径不变。

#### Scenario: 3.3 作为销售合同审核兼容卡片
- **WHEN** 系统构建合同签订阶段 workspace shell
- **THEN** 系统 MUST 返回绑定 `legacyDocumentCode=3.3` 的 `合同审核记录表（销售合同）` 兼容 output/card
- **AND** 该卡片 MUST 位于合同签订阶段，并靠近或归属于销售合同签订语境
- **AND** 该卡片 MUST 使用当前运行资料的 documentId 或稳定 documentCode 作为绑定依据

#### Scenario: 5.4 作为采购合同审核兼容卡片
- **WHEN** 系统构建生产制作阶段 workspace shell
- **THEN** 系统 MUST 返回绑定 `legacyDocumentCode=5.4` 的 `采购合同审核记录表` 兼容 output/card
- **AND** 该卡片 MUST 位于生产制作阶段，并靠近或归属于采购合同签订语境
- **AND** 该卡片 MUST 使用当前运行资料的 documentId 或稳定 documentCode 作为绑定依据

#### Scenario: 当前 64 项覆盖率达到 64/64
- **WHEN** 团队执行旧资料清单清理前覆盖率核查
- **THEN** 当前运行 64 项资料 MUST 全部可在上方 workspace card 找到主入口
- **AND** `workspaceCoverageStatus` 汇总 MUST 为 `covered_by_workspace_card=64`、`legacy_only=0`、`shell_placeholder_only=0`、`needs_mapping_fix=0`、`needs_business_confirmation=0`

#### Scenario: 兼容卡片不改变目标模板状态
- **WHEN** 系统为 `3.3` 或 `5.4` 返回 workspace 兼容卡片
- **THEN** 系统 MUST NOT 将这两个资料重新计入 v20260629 71 项目标模板
- **AND** 覆盖核查中的 `targetTemplateStatus` MUST 继续允许将这两个资料标记为 `removed_in_v20260629`
- **AND** 系统 MUST NOT 因兼容卡片创建、补初始化或迁移任何项目资料记录
