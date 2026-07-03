## Context

当前系统运行模板仍为 20260625 64 项；v20260629 71 项目标模板已经作为配置存在，并已通过 workspace card 覆盖当前 64 项资料。`LC33 / LC54` 是为旧模板合同审核资料补充的 workspace 兼容输出，不属于 v20260629 71 项目标模板。

本 change 是后续实现“新项目默认使用 v20260629 71 项模板”的规划和边界固化。本轮不修改业务代码；implementation 阶段才会切换新项目初始化入口。

## Goals / Non-Goals

**Goals:**

- 后续新建项目默认初始化 v20260629 71 项资料模板。
- 旧项目继续使用既有 20260625 64 项资料记录，不迁移、不补初始化。
- `LC33 / LC54` 继续只作为旧项目兼容 workspace 输出，不进入新项目 71 项模板。
- 立项 `1.1 / 1.2 / 1.3` 继续沿用现有在线表单和 `1.2` 专用评价审批。
- 非立项阶段默认文件上传或附件上传。
- 保留兼容资料区，不删除、不隐藏。

**Non-Goals:**

- 不改数据库 schema，不写 migration。
- 不迁移旧项目，不重置旧项目资料。
- 不处理文件平台联动。
- 不新增 BPM、通用流程引擎、付款流、发票流或项目模式分支。
- 不把 `3.3 / 5.4` 或 `LC33 / LC54` 计入 v20260629 71 项模板。

## Decisions

### Decision 1: 切换新项目默认模板入口，而不是迁移存量项目

后续 implementation MUST 先修改新项目创建链路使用的默认模板版本和模板项来源。当前需要重点核查的入口包括：

- `digital-platform-api/src/domain/stageDocumentTemplates.js`：当前 `STAGE_DOCUMENT_TEMPLATE_VERSION`、`EXPECTED_STAGE_DOCUMENT_ITEM_COUNT`、模板加载和校验。
- `digital-platform-api/src/repositories/stageDocuments/checklistRepository.js`：`ensureStageDocumentTemplates`、`initializeProjectStageDocuments`。
- `digital-platform-api/src/repositories/projects/coreRepository.js`：`createProject` 中调用项目阶段资料初始化的位置。
- `digital-platform-api/scripts/check-stage-document-ownership.js`：新建项目资料数量、模板版本、阶段分布和兼容输出断言。

理由：旧项目已有 `project_stage_documents` 记录，这些记录应继续作为事实来源；通过迁移或补初始化改写旧项目会扩大风险。

### Decision 2: v20260629 71 项目标输出与 compatibility outputs 分开

后续 implementation MUST 使用 `V20260629_TARGET_TEMPLATE_OUTPUTS` 作为新模板来源，并保持 `V20260629_TARGET_TEMPLATE_OUTPUT_COUNT = 71`。`V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS`、`LC33`、`LC54` 只用于旧项目兼容 workspace 展示。

实现切换前 MUST 先固化 71 项 stage document template item 的稳定字段映射，包括 documentCode、documentName、stageOrder、stageKey、documentOrder、ownerDepartment、reviewDepartment、completionMode、submitMode、isRequired 和 applicability 口径，并明确是否使用 targetOutputCode 作为 documentCode。该映射必须作为后续实现输入，不允许在编码时临时决定。

### Decision 3: 旧项目按项目实际资料版本运行

后续查询、阶段推进、工作台、项目工作区和兼容资料区 MUST 以项目已有资料记录为准。旧项目仍返回 64 项；新项目返回 71 项。任何阶段推进和齐套计算 MUST 基于项目实际资料集合，不得假设全库只有一个模板版本。

### Decision 4: 立项能力继续走现有专用实现

v20260629 新项目中的 `1.1 / 1.2 / 1.3` MUST 继续绑定现有在线表单、责任人规则和 `1.2` 专用评价审批，不允许回退为普通文件上传，也不允许新增普通提交路径绕过在线表单。

### Decision 5: 回滚只回滚默认模板，不自动回滚项目数据

如果启用后需要回滚，后续实现可以将默认模板版本切回 20260625；但已经创建的 v20260629 项目不自动回滚为 64 项。已创建项目的数据回滚或迁移必须通过后续独立 change 规划。

### Decision 6: 兼容资料区文案必须按模板版本中性表达

兼容资料区继续保留，但其摘要、标题和提示文案 MUST 适配 20260625 旧项目和 v20260629 新项目。后续 implementation MUST 移除或改写固定表达“当前 64 项资料已迁移”等只适用于旧项目的文案，避免新项目显示错误说明。

## Risks / Trade-offs

- [Risk] 模板版本常量被全局假设为单一运行版本。Mitigation：implementation 必须审查查询、阶段推进、工作台和 smoke，确保按项目资料记录/模板版本判断。
- [Risk] `LC33 / LC54` 被误计入 71 项。Mitigation：保持 target outputs 与 compatibility outputs 分开，smoke 明确断言新项目不包含 `3.3 / 5.4`。
- [Risk] 立项在线表单因模板切换回退。Mitigation：验收必须覆盖 `1.1 / 1.2 / 1.3` 在线表单和 `1.2` 专用评价审批。
- [Risk] 回滚预期不清。Mitigation：明确默认模板可回滚，但已创建项目不自动回滚。
- [Risk] 兼容资料区固定写“64 项”导致 v20260629 新项目误导。Mitigation：implementation 必须使用模板版本中性文案，或按项目实际模板版本显示说明。

## Migration Plan

本 change 不执行迁移。后续 implementation 的上线步骤应为：

1. 固化 v20260629 71 项项目级阶段资料模板 item 字段映射，明确 documentCode 是否使用 targetOutputCode。
2. 将新项目默认模板版本切换到 v20260629。
3. 调整模板确保和初始化逻辑，使新项目初始化 71 项。
4. 保持旧项目资料记录不变。
5. 调整兼容资料区文案，使其不固定表达“当前 64 项资料已迁移”。
6. 调整 smoke，覆盖新项目 71 项、旧项目 64 项、`LC33 / LC54` 不进入新项目。
7. 如需回滚，只切回默认模板版本；不自动回滚已创建项目。

## Implementation Prerequisites

- 后续实现切换默认模板前，必须产出 71 项字段映射清单，至少包括 documentCode、documentName、stageOrder、stageKey、documentOrder、completionMode、submitMode、isRequired。
- 字段映射清单必须明确 documentCode 是否直接使用 targetOutputCode；如不使用，必须列出稳定业务编号映射。
- completionMode、submitMode、isRequired 不能在编码时临时决定；如沿用候选配置，必须在实现说明和 smoke 中显式校验。
- 兼容资料区文案必须先纳入实现范围，确保新项目不会显示“当前 64 项资料已迁移”这类旧项目专属说明。
