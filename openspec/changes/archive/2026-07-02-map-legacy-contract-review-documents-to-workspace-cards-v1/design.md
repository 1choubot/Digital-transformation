## Context

`audit-workspace-card-coverage-before-legacy-checklist-cleanup-v1` 已完成覆盖率核查：当前运行 64 项资料中 62 项已由上方 workspace card 覆盖，剩余 `3.3 合同审核记录表（销售合同）` 和 `5.4 采购合同审核记录表` 仍只能依赖下方旧资料清单。

这两项在 v20260629 目标模板中为 `removed_in_v20260629`，不应重新计入 71 项目标模板；但它们仍属于当前运行 64 项资料，旧项目和当前运行项目仍需要主操作入口。

## Goals / Non-Goals

**Goals:**

- 为 `3.3` 和 `5.4` 增加上方项目工作区兼容产出卡片。
- 通过 `legacyDocumentCode` 绑定当前运行资料，不创建新资料记录。
- 让上方产出卡片继续复用现有责任人、附件、提交、审核、退回、返工和适用性操作。
- 将当前运行 64 项 workspace 覆盖率提升到 64/64。

**Non-Goals:**

- 不切换 v20260629 71 项为新项目默认模板。
- 不把 `3.3`、`5.4` 重新算入 v20260629 71 项目标模板。
- 不迁移旧项目，不补初始化旧项目。
- 不删除、隐藏或折叠旧资料清单。
- 不新增合同审核流、采购审核流、第二套状态机或流程引擎。
- 不改数据库 schema，不写 migration。

## Decisions

### Decision 1: 兼容输出与 71 项目标输出分开统计

本 change MUST 新增旧模板兼容 workspace 输出，而不是把 `3.3`、`5.4` 追加到 `V20260629_TARGET_TEMPLATE_OUTPUTS`。

理由：`V20260629_TARGET_TEMPLATE_OUTPUT_COUNT` 必须继续为 71，`3.3`、`5.4` 的 `targetTemplateStatus` 仍是 `removed_in_v20260629`。兼容卡片只解决当前运行 64 项的 workspace 主入口覆盖，不改变目标模板口径。

### Decision 2: 3.3 挂到签订销售合同附近

`3.3 合同审核记录表（销售合同）` MUST 放在合同签订阶段，并挂到“签订销售合同”附近，作为“销售合同审核记录兼容项”。

建议实现为同阶段新蓝色模块或相邻模块，输出卡片文案必须包含旧模板兼容项语义，避免误解为 v20260629 新目标产出。

### Decision 3: 5.4 挂到签订采购合同附近

`5.4 采购合同审核记录表` MUST 放在生产制作阶段，并挂到“签订采购合同”附近，作为“采购合同审核记录兼容项”。

建议实现为同阶段新蓝色模块或相邻模块，输出卡片文案必须包含旧模板兼容项语义，避免误解为 v20260629 新目标产出。

### Decision 4: 操作能力完全复用现有阶段资料

两个兼容卡片 MUST 使用 `legacyDocumentCode` 绑定 checklist 返回的当前运行资料，并由 workspace 聚合逻辑补齐 `documentId/documentCode/status/permissions/responsibleUser/blockingReasons`。

上方卡片的责任人、附件、提交、审核、退回、返工、不适用和恢复适用入口 MUST 继续复用当前产出卡片通用操作组件和现有后端接口。

### Decision 5: 下方旧清单保持兼容区

补映射后，`3.3`、`5.4` 会进入已迁移资料集合；下方旧资料清单 MUST 对这两项移除主操作按钮，仅保留只读状态、附件摘要、阻塞原因、兼容提示和定位到上方产出卡片入口。

本 change MUST NOT 隐藏、折叠或物理删除旧资料清单组件。

## Risks / Trade-offs

- [Risk] 兼容输出被误认为 71 项目标模板新增项。Mitigation：单独定义 compatibility outputs，不改变目标输出计数，并在 notes/documentName 中标明“旧模板兼容项”。
- [Risk] 新卡片不被 workspace 聚合识别。Mitigation：统一 output lookup 同时覆盖 71 项目标输出和兼容输出，assert 仍确保全部模块 outputCode 可解析。
- [Risk] 下方旧清单继续显示主操作。Mitigation：现有 `migratedWorkspaceDocumentKeys` 以 workspace 绑定资料为准，补映射后自动把 `3.3`、`5.4` 纳入已迁移集合。

## Migration Plan

本 change 不做数据迁移。

1. 新增 `V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS`，只包含 `3.3`、`5.4`。
2. 让 workspace output lookup 同时识别目标输出和兼容输出。
3. 在蓝色模块配置中加入两个兼容模块或相邻模块 outputCode。
4. 保持 `V20260629_TARGET_TEMPLATE_OUTPUT_COUNT=71` 和 `V20260629_TARGET_TEMPLATE_OUTPUTS.length=71` 校验不变。
5. 运行 API check 和 OpenSpec 校验。

## Open Questions

- 后续 71 模板切换时，`3.3`、`5.4` 是永久删除、并入草稿资料审核过程，还是保留为新模板兼容项，需要后续独立 change 业务确认。
