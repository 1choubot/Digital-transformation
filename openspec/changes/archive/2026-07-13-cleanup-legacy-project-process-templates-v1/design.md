## Context

当前项目创建和阶段资料初始化已经以 `v20260629` 作为默认运行模板。代码中 `digital-platform-api/src/domain/stageDocumentTemplates.js` 将 `STAGE_DOCUMENT_TEMPLATE_VERSION` 指向 `V20260629_TARGET_TEMPLATE_VERSION`，`EXPECTED_STAGE_DOCUMENT_ITEM_COUNT` 指向 71；`digital-platform-api/scripts/init-stage-documents.js` 无参数调用 `loadStageDocumentTemplateItems()`，运行时加载 `STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260629`。

仓库仍保留几类历史模板痕迹：

- `v20260610`：独立旧模板快照文件仍存在，但未被运行时代码 import。
- `v20260624`：历史规划和文件名仍存在；实际运行代码中的 `stageDocumentTemplateItemsV20260624.js` 导出的是 `STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260625` legacy 64 项。
- `v20260625`：旧项目兼容版本，仍由 `LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION`、旧项目校验和 workspace 兼容输出使用。
- `v20260629`：当前有效模板版本，71 项资料，必须保留。

本 change 第一批实现只清理无运行入口的 `v20260610` 快照，并同步移除对该已删除文件的 syntax check；`v20260624` 命名文件、reset 脚本和 `v20260625` legacy 兼容逻辑保持不变。

## Goals / Non-Goals

**Goals:**

- 盘点旧项目流程/阶段资料模板版本引用。
- 规划删除已无运行入口和兼容价值的旧模板实现。
- 保留当前有效 `v20260629` 71 项运行模板。
- 保留仍支撑既有项目的 `v20260625` legacy 兼容语义。
- 明确后续实现必须保持 8 大阶段、71 项资料数量、资料编码、阶段推进、工作台和项目工作区行为不变。

**Non-Goals:**

- 不实现合同签订阶段业务。
- 不下线旧关口审批。
- 不改自动推进语义。
- 不改前端。
- 不改 migration。
- 不删除旧项目已有资料记录。
- 不将 `v20260625` 旧项目迁移到 `v20260629`。

## Reference Inventory

| 旧版本 | 引用位置 | 当前是否仍被使用 | 处理建议 |
| --- | --- | --- | --- |
| `v20260610` | `digital-platform-api/src/domain/stageDocumentTemplateItemsV20260610.js`；`digital-platform-api/package.json` 的 `npm run check` 对该文件做 `node --check`；`digital-platform-api/scripts/check-stage-document-ownership.js` 断言当前模板 item 不等于 `v20260610`；历史 docs 中有 20260610 规划引用 | 未发现运行时代码 import；不参与 `loadStageDocumentTemplateItems()`、项目创建或 init/reset 流程 | 后续实现可删除该快照文件；同步从 `package.json` check 脚本移除；保留或调整 ownership check 中“不回退到 54 项/旧版本”的断言 |
| `v20260624` / 20260624 旧口径 | 历史 docs/OpenSpec 规格中多处记载；`stageDocumentTemplates.js` 的解析错误信息仍称 `v20260624 planning table`；`digital-platform-api/scripts/reset-stage-documents-v20260624.js` 文件名保留历史命名；主规格 `stage-document-checklist` 仍有部分旧 requirement 文案 | 不作为当前运行模板；但文件名和部分历史文案仍可能误导；reset 脚本实际清空模拟资料后再由当前 init 路径初始化 `v20260629` | 后续实现优先更新误导性文案/脚本名或 README 解释；不要仅按文件名删除 reset 脚本；若改名脚本，必须保留 npm script 兼容入口或明确迁移 |
| `v20260625` legacy 64 项 | `stageDocumentTemplates.js` 中 `LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION = 'v20260625'`、`LEGACY_STAGE_DOCUMENT_ITEM_COUNT = 64`；`stageDocumentTemplateItemsV20260624.js` 导出 `STAGE_DOCUMENT_TEMPLATE_ITEMS_V20260625`；`check-stage-document-ownership.js` 允许旧项目保持 legacy 64 项；README 明确旧项目不迁移 | 仍被旧项目兼容和校验使用，不能删除 | 保留兼容语义；可考虑将文件名从 `stageDocumentTemplateItemsV20260624.js` 重命名为更准确的 legacy/v20260625 命名，但这属于谨慎重构，必须保持导出兼容或同步全部 import |
| `v20260629` current 71 项 | `stageDocumentTemplateItemsV20260629.js`；`stageDocumentTemplates.js`；`workspaceRepository.js`；`checklistRepository.js`；`init-stage-documents.js`；`check-stage-document-ownership.js`；`solutionDesignWorkflow.test.js`、`initiationWorkflow.test.js` | 当前有效模板版本；新项目默认 71 项；项目工作区和阶段资料初始化依赖它 | 必须保留；清理旧模板时用现有测试和 check 脚本确认 71 项数量、8 阶段分布和 completionMode 统计不变 |

## Decisions

### Decision 1: 只删除无运行入口的旧快照

本 change 第一批只处理 `v20260610`，因为它未被运行时代码 import，且只在 syntax check、历史文件和防回退断言中出现。

Alternative considered: 同时删除 `stageDocumentTemplateItemsV20260624.js`。该文件虽然命名旧，但当前承载 `v20260625` legacy 64 项和新旧项目并存校验，直接删除会破坏旧项目兼容。

### Decision 2: 保留 `v20260625` legacy 兼容

旧项目的项目级资料记录可能仍保存 `template_version = v20260625`。`check-stage-document-ownership.js` 明确允许项目使用 `STAGE_DOCUMENT_TEMPLATE_VERSION` 或 `LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION`，并拒绝其他 stale 版本。后续清理必须保留这条兼容路径。

Alternative considered: 清理时把所有旧项目也迁移到 `v20260629`。这会改变既有项目资料状态、附件、责任人和阶段门禁，不属于本 cleanup 范围。

### Decision 3: 脚本清理要区分文件名和行为

`reset-stage-documents-v20260624.js` 是历史命名脚本，但 README 当前解释它是兼容脚本名，reset 后仍通过 `init-stage-documents` 初始化当前默认 `v20260629`。后续可以改名或增加新脚本别名，但必须避免破坏现有 npm script。

Alternative considered: 因文件名含 20260624 直接删除 reset 脚本。该脚本仍是本地模拟数据 reset 工具，不能作为旧模板实现直接删除。

### Decision 4: 规格清理不等于旧资料清单下线

OpenSpec 主规格中仍有历史 requirement 记录 `v20260624`、20260625 和 20260629 迁移过程。后续实现可修正文案中已经过时或冲突的 active 模板描述，但不得借此下线旧关口审批或旧资料兼容区。

## Risks / Trade-offs

- 删除 `v20260610` 后 package check 仍引用该文件 -> 后续实现必须同步更新 `digital-platform-api/package.json`。
- 误删 `v20260625` legacy 数据 -> 旧项目清单、工作区兼容输出和 ownership check 会失败；后续实现必须保留 legacy version 常量和旧项目校验。
- 重命名 `stageDocumentTemplateItemsV20260624.js` 引发 import 漏改 -> 如执行重命名，必须跑 `npm run check`、`test:initiation-workflow`、`test:solution-design` 和 ownership smoke。
- 更新 OpenSpec 历史文案过度扩大范围 -> 只修正当前 active 事实和 cleanup 规则，不重写历史 archived changes。

## Migration Plan

### 本 change 执行

1. 删除 `stageDocumentTemplateItemsV20260610.js`。
2. 从 `package.json` check 脚本移除已删除的 `stageDocumentTemplateItemsV20260610.js`。
3. 保留 `check-stage-document-ownership.js` 中的 ownership 防回退断言，继续保护当前模板版本、71 项数量和 legacy 兼容边界。
4. 保留 `stageDocumentTemplateItemsV20260624.js` 文件名、`reset-stage-documents-v20260624.js` 脚本和 `v20260625` legacy 兼容逻辑。

### 后续独立 change 才考虑

1. 是否重命名 `stageDocumentTemplateItemsV20260624.js`。
2. 是否重命名或补充 `reset-stage-documents-v20260624.js` 脚本别名。
3. 是否整理 README/OpenSpec 历史文案中已经过时的 active 模板描述。

## Decisions

- 本 change 不重命名 `reset-stage-documents-v20260624.js`。
- 本 change 不重命名 `stageDocumentTemplateItemsV20260624.js`。
- 本 change 不大范围整理 README 或 OpenSpec 历史规格文案。
