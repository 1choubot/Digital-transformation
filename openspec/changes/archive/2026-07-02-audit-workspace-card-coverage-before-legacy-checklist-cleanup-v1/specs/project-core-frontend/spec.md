## ADDED Requirements

### Requirement: 项目工作区卡片覆盖率核查

项目核心前端能力 MUST 支持旧资料清单清理前的 workspace card 覆盖率核查口径；核查结果 MUST 能明确当前运行资料是否已有上方项目工作区产出卡片作为主入口。

#### Scenario: 核查每项运行资料是否有上方卡片
- **WHEN** 团队执行旧资料清单清理前覆盖率核查
- **THEN** 每项当前 64 项运行资料 MUST 标明是否存在对应 workspace output/card
- **AND** 已覆盖资料 MUST 标明其上方卡片是否绑定 documentId 或稳定 documentCode

#### Scenario: 未覆盖资料必须说明原因
- **WHEN** 某项当前运行资料没有有效 workspace card 主入口
- **THEN** 核查结果 MUST 将其标记为 `legacy_only`、`shell_placeholder_only`、`needs_mapping_fix` 或 `needs_business_confirmation`
- **AND** 前端清理建议 MUST NOT 将该资料视为可脱离旧资料清单

#### Scenario: 旧清单清理前不得只看上方 UI
- **WHEN** 上方项目工作区展示某个 shell 产出或候选产出
- **THEN** 只有该产出绑定当前运行资料 documentId 或稳定 documentCode 且可承载主入口时，才能标记为 `covered_by_workspace_card`
- **AND** 仅存在 shell 占位 MUST 标记为 `shell_placeholder_only`

#### Scenario: 本 change 不隐藏旧清单
- **WHEN** 本 change 完成规划或后续核查口径实现
- **THEN** 前端 MUST NOT 因本 change 隐藏、折叠或删除旧资料清单组件
- **AND** 旧资料清单清理 MUST 通过后续独立 change 实施

### Requirement: 覆盖率核查表前端字段

项目核心前端能力 MUST 在覆盖率核查结果中保留足以支持人工验收和清理决策的字段。

#### Scenario: 核查表字段完整
- **WHEN** 生成或维护覆盖率核查表
- **THEN** 每行 MUST 包含 documentCode、documentName、stageOrder 或 stageKey、64模板存在、workspaceCoverageStatus、targetTemplateStatus、workspace卡片状态、操作覆盖、结论和后续动作
- **AND** 71目标存在 MAY 作为 `targetTemplateStatus` 的辅助说明，但 MUST NOT 替代 `targetTemplateStatus`
- **AND** 清理建议 MUST 能基于这些字段判断旧资料清单是否仍需保留主入口
