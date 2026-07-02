## 1. Planning

- [x] 1.1 创建 `audit-workspace-card-coverage-before-legacy-checklist-cleanup-v1` change scaffold。
- [x] 1.2 撰写 proposal，明确本 change 只规划覆盖率核查，不切换 71 模板、不隐藏/删除旧清单、不迁移旧项目。
- [x] 1.3 撰写 design，拆分定义 workspace 覆盖状态、目标模板状态、核查维度和旧资料清单清理前置判断口径。
- [x] 1.4 撰写 project-core-frontend、stage-document-checklist、project-core、technical-architecture 增量 specs。
- [x] 1.5 新增 `docs/9.24_项目工作区产出卡片覆盖率核查与旧清单清理前置规划_20260702.md`，预留覆盖率核查表模板。

## 2. Coverage Audit

- [x] 2.1 从当前运行模板整理 20260625 64 项资料主表，包含 documentCode、documentName、stageOrder 和 stageKey。
- [x] 2.2 从 workspace 输出结构整理每项资料对应的 output/card、documentId 或稳定 documentCode 绑定情况。
- [x] 2.3 对照 v20260629 71 项目标模板，标记当前 64 项在目标模板中的存在、拆分、删除或需确认状态。
- [x] 2.4 为每项当前运行资料标记 `workspaceCoverageStatus`：`covered_by_workspace_card`、`legacy_only`、`shell_placeholder_only`、`needs_mapping_fix`、`needs_business_confirmation`。
- [x] 2.5 为每项当前运行资料标记 `targetTemplateStatus`：`kept_in_v20260629`、`removed_in_v20260629`、`split_in_v20260629`、`renamed_or_mapped_in_v20260629`、`needs_business_confirmation`。
- [x] 2.6 标记每项资料是否能在上方处理通用操作，是否仍只能依赖下方旧资料清单。
- [x] 2.7 输出覆盖率核查表，记录结论和后续动作。

## 3. Cleanup Decision

- [x] 3.1 汇总 `legacy_only`、`shell_placeholder_only`、`needs_mapping_fix`、`needs_business_confirmation` 阻塞项。
- [x] 3.2 判断旧资料清单是否可进入默认折叠、隐藏或删除的后续独立 change。
- [x] 3.3 对仍需旧清单支撑的资料给出保留、补映射或业务确认建议。
- [x] 3.4 明确本 change 不隐藏、不折叠、不物理删除旧资料清单组件。

## 4. Verification

- [x] 4.1 运行 `cmd /c openspec validate audit-workspace-card-coverage-before-legacy-checklist-cleanup-v1 --strict`。
- [x] 4.2 运行 `cmd /c openspec validate --all --strict`。
- [x] 4.3 运行 `cmd /c openspec list`，确认本 change 与其他 active changes 状态符合预期。
- [x] 4.4 验证核查表字段覆盖 documentCode、documentName、stage、64模板存在、workspaceCoverageStatus、targetTemplateStatus、workspace卡片状态、操作覆盖、结论和后续动作。
- [x] 4.5 验证本 change 未修改 `digital-platform-api/src/**`、`digital-platform-web/src/**`、数据库 schema 或 migration。
- [x] 4.6 验证本 change 未切换 v20260629 71 项模板、未迁移旧项目、未隐藏或删除旧资料清单。

## 5. Future Boundaries

- [x] 5.1 记录：旧资料清单默认折叠、隐藏或删除必须通过后续独立 change 实施，不在本 change 执行。
- [x] 5.2 记录：v20260629 71 项模板默认启用必须通过后续独立 change 评估，不在本 change 执行。
- [x] 5.3 记录：旧项目迁移、补初始化或 64 项到 71 项映射调整必须通过后续独立 change 明确策略和验收。
