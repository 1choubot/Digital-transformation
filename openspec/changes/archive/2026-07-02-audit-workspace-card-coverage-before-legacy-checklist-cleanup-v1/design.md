## Context

当前系统已经完成两个前置步骤：项目工作区 shell 已展示 8 阶段、蓝色模块和产出卡片；现有阶段资料的通用操作已迁移到上方产出卡片，下方旧资料清单降级为兼容区。

在进入旧资料清单默认折叠、隐藏或删除前，需要先核查当前运行的 20260625 64 项资料是否都被上方 workspace card 覆盖。否则旧清单清理可能导致部分资料失去主入口。

## Goals / Non-Goals

**Goals:**

- 定义 64 项运行资料与 workspace 输出卡片的覆盖率核查口径。
- 拆分定义 workspace 覆盖状态、目标模板状态和核查维度。
- 建立旧资料清单清理前的前置判断标准。
- 明确未覆盖资料必须标明原因和后续动作。

**Non-Goals:**

- 不切换 v20260629 71 项模板为新项目默认模板。
- 不迁移旧项目，不补初始化旧项目，不把 71 项候选落库。
- 不隐藏、折叠或物理删除旧资料清单组件。
- 不新增上传、提交、审核、退回、返工或不适用执行逻辑。
- 不改数据库 schema，不写 migration。
- 不处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`。

## Decisions

### Decision 1: 以当前运行 64 项为核查主表

覆盖核查 MUST 以当前运行的 20260625 64 项资料为主表，逐项判断是否有上方 workspace output/card 覆盖。

理由：旧资料清单清理影响的是当前运行项目和当前资料入口，不能以 v20260629 71 项候选替代运行基线。

### Decision 2: 拆分 workspace 覆盖状态和目标模板状态

每项资料 MUST 单独标记 `workspaceCoverageStatus` 和 `targetTemplateStatus`。

`workspaceCoverageStatus` 用于判断当前资料是否已有上方项目工作区产出卡片主入口，取值为：

- `covered_by_workspace_card`
- `legacy_only`
- `shell_placeholder_only`
- `needs_mapping_fix`
- `needs_business_confirmation`

`targetTemplateStatus` 用于记录当前资料在 v20260629 目标模板中的差异关系，取值为：

- `kept_in_v20260629`
- `removed_in_v20260629`
- `split_in_v20260629`
- `renamed_or_mapped_in_v20260629`
- `needs_business_confirmation`

理由：是否被上方 workspace card 覆盖，和 71 目标模板是否保留、删除、拆分或更名，是两个不同维度。旧资料清单是否可以清理主要看 `workspaceCoverageStatus`；`targetTemplateStatus` 只能作为后续切换 71 模板的参考，不能直接决定当前旧资料清单清理。

### Decision 3: 核查维度覆盖运行模板、目标模板和实际 workspace card

每项资料的核查记录 MUST 至少包含：

- `documentCode`
- `documentName`
- `stageOrder / stageKey`
- 当前 64 项运行模板中是否存在
- v20260629 目标模板中是否存在
- `workspaceCoverageStatus`
- `targetTemplateStatus`
- 是否有 workspace output/card
- 是否绑定 `documentId` 或稳定 `documentCode`
- 是否能在上方处理通用操作
- 是否仍只能依赖下方旧资料清单
- 对旧资料清单清理的影响

理由：只看配置不足以证明可清理旧清单；必须同时检查运行资料、目标模板和实际工作区入口。

### Decision 4: 清理建议不能等同于执行清理

本 change 只能形成旧资料清单清理建议和阻塞项列表，MUST NOT 隐藏、折叠或删除旧资料清单。

理由：覆盖核查是清理前置依据，不是清理实施 change。

### Decision 5: 71 模板切换继续后置

v20260629 71 项目标模板 MAY 作为核查参照，但 MUST NOT 因本 change 成为新项目默认模板，也 MUST NOT 触发旧项目迁移或补初始化。

理由：覆盖核查和模板切换是两个不同风险面，必须由独立 change 管理。

## Risks / Trade-offs

- [Risk] 只核查配置而未核查实际 workspace 绑定，导致误判为已覆盖。→ Mitigation：核查维度要求同时记录 output/card、documentId 或 documentCode 绑定。
- [Risk] 旧清单清理建议被误解为已经允许删除旧清单。→ Mitigation：tasks 和 specs 明确本 change 不隐藏、不删除旧清单。
- [Risk] v20260629 目标模板差异被误解为当前运行模板切换依据。→ Mitigation：将 71 项模板限定为参照，不改变运行基线。
- [Risk] 需要业务确认的资料被技术判断直接清理。→ Mitigation：使用 `needs_business_confirmation` 状态并要求后续动作。

## Migration Plan

本 change 不做数据迁移和运行时迁移。

后续执行阶段建议按以下顺序推进：

1. 从当前运行模板整理 64 项资料主表。
2. 对照 workspace 输出卡片和 v20260629 目标模板配置，生成覆盖率核查表。
3. 标记未覆盖资料、映射问题和需业务确认资料。
4. 输出旧资料清单默认折叠、隐藏或删除的清理建议。
5. 只有覆盖验收通过后，才能通过后续独立 change 实施旧资料清单清理。

## Open Questions

- 覆盖率核查表后续存放在 docs、OpenSpec artifact，还是作为运行时导出报表，需要在执行阶段确认。
- `targetTemplateStatus` 为 `removed_in_v20260629` 或 `split_in_v20260629` 的资料，在后续切换 71 模板前是否需要业务签字确认，需要后续执行阶段确认。
