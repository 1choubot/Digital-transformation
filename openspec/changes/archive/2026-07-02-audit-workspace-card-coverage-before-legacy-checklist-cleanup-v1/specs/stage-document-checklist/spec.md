## ADDED Requirements

### Requirement: 旧资料清单清理前覆盖核查

阶段资料清单能力 MUST 在旧资料清单默认折叠、隐藏或删除前，要求完成当前运行资料的 workspace card 覆盖核查；未覆盖资料 MUST 明确说明仍依赖旧清单的原因。

#### Scenario: 清理前必须有覆盖清单
- **WHEN** 团队准备默认折叠、隐藏或删除下方旧资料清单
- **THEN** 团队 MUST 先形成当前 64 项运行资料与 workspace card 的覆盖清单
- **AND** 覆盖清单 MUST 标明每项资料是否仍依赖下方旧资料清单

#### Scenario: 未覆盖资料阻塞旧清单删除
- **WHEN** 覆盖清单存在 `legacy_only`、`shell_placeholder_only`、`needs_mapping_fix` 或 `needs_business_confirmation` 的资料
- **THEN** 系统和清理建议 MUST 将这些资料视为旧资料清单清理阻塞项
- **AND** 旧资料清单 MUST NOT 因本核查 change 被隐藏或删除

#### Scenario: 已覆盖资料仍需保留核查记录
- **WHEN** 某项资料标记为 `covered_by_workspace_card`
- **THEN** 覆盖清单 MUST 保留对应 workspace card、documentId 或 documentCode、操作覆盖结论和验收依据
- **AND** 后续清理 change MUST 能追溯该资料为何不再依赖旧清单主入口

#### Scenario: 本 change 不改变旧清单职责
- **WHEN** 本 change 仅建立覆盖率核查口径
- **THEN** 旧资料清单 MUST 继续保持兼容区职责
- **AND** 本 change MUST NOT 隐藏、折叠、物理删除旧资料清单组件或移除旧资料清单入口

