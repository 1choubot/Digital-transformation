## 1. Planning

- [x] 1.1 创建 `map-legacy-contract-review-documents-to-workspace-cards-v1` change scaffold。
- [x] 1.2 撰写 proposal，明确本 change 只补 `3.3`、`5.4` workspace 兼容卡片，不切换 71 模板、不迁移旧项目、不清理旧清单。
- [x] 1.3 撰写 design，区分 71 项目标输出和旧模板兼容输出。
- [x] 1.4 撰写 project-core、project-core-frontend、stage-document-checklist、technical-architecture delta specs。
- [x] 1.5 新增 `docs/9.25_旧模板合同审核记录补入项目工作区产出卡片规划_20260702.md`。

## 2. Implementation

- [x] 2.1 在 v20260629 workspace shell 配置中新增 `3.3 合同审核记录表（销售合同）` 兼容 output/card。
- [x] 2.2 在 v20260629 workspace shell 配置中新增 `5.4 采购合同审核记录表` 兼容 output/card。
- [x] 2.3 确保两个兼容 output 使用 `legacyDocumentCode=3.3`、`legacyDocumentCode=5.4` 绑定现有资料。
- [x] 2.4 确保两个兼容 output 不计入 `V20260629_TARGET_TEMPLATE_OUTPUT_COUNT=71`。
- [x] 2.5 确保 workspace output lookup 能解析 71 项目标输出和旧模板兼容输出。
- [x] 2.6 确保两个兼容卡片能复用上方产出卡片通用资料操作。
- [x] 2.7 确保下方旧资料清单对这两个资料降级为兼容只读区和定位入口。
- [x] 2.8 确认未切换新项目默认模板、未迁移旧项目、未改数据库/migration。

## 3. Coverage Verification

- [x] 3.1 核查当前运行 64 项资料补映射后 `covered_by_workspace_card=64`。
- [x] 3.2 核查 `legacy_only=0`、`shell_placeholder_only=0`、`needs_mapping_fix=0`、`needs_business_confirmation=0`。
- [x] 3.3 核查 `3.3` 挂到合同签订阶段“签订销售合同”附近。
- [x] 3.4 核查 `5.4` 挂到生产制作阶段“签订采购合同”附近。
- [x] 3.5 核查 `3.3`、`5.4` 的 `targetTemplateStatus` 仍为 `removed_in_v20260629` 语义，不被重新算进 71 项目标模板。

## 4. OpenSpec / Build Verification

- [x] 4.1 在 `digital-platform-api` 运行 `cmd /c npm.cmd run check`。
- [x] 4.2 运行 `cmd /c openspec validate map-legacy-contract-review-documents-to-workspace-cards-v1 --strict`。
- [x] 4.3 运行 `cmd /c openspec validate --all --strict`。
- [x] 4.4 运行 `cmd /c openspec list`，确认 active changes 状态符合预期。
- [x] 4.5 若修改前端源码，运行 `cmd /c npm.cmd run build`；未改前端源码则记录不需要。
- [x] 4.6 验证未修改数据库/migration、未切换 71 模板、未迁移旧项目、未隐藏/折叠/删除旧资料清单。

## 5. Future Boundaries

- [x] 5.1 记录：旧资料清单默认折叠、隐藏或删除必须通过后续独立 change 实施，不在本 change 执行。
- [x] 5.2 记录：v20260629 71 项模板默认启用必须通过后续独立 change 评估，不在本 change 执行。
- [x] 5.3 记录：`3.3`、`5.4` 后续是否并入草稿审核过程或从下一版模板删除，必须通过后续独立 change 业务确认。
