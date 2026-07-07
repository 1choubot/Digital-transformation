## Why

当前运行 64 项资料已经全部由上方项目工作区 workspace card 覆盖，旧资料清单不应继续作为项目详情页的并列主内容铺开。现在需要把下方旧资料清单弱化为默认折叠的兼容资料区，为后续是否隐藏或删除旧清单提供更稳妥的过渡。

## What Changes

- 将项目详情页下方旧资料清单默认折叠。
- 将旧资料清单区域标题调整为“兼容资料区”或等价旧资料兼容语义。
- 在折叠状态展示简短摘要，说明资料已迁移到上方项目工作区处理，本区域仅用于旧模板兼容查看。
- 增加展开/收起按钮，允许用户继续访问旧资料清单。
- 展开后保留现有旧资料清单内容、只读状态、附件摘要、阻塞原因、兼容提示和定位上方产出卡片入口。
- 保持上方项目工作区作为唯一主操作区，不恢复已迁移资料在旧清单中的主操作按钮。

不做：

- 不删除、物理移除或完全隐藏旧资料清单组件。
- 不切换 v20260629 71 项模板为新项目默认模板。
- 不迁移旧项目，不补初始化旧项目。
- 不修改数据库 schema，不写 migration。
- 不新增后端 API、第二套资料状态机、流程引擎或资料执行规则。
- 不处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-core-frontend`: 项目详情页必须将旧资料清单展示为默认折叠的兼容资料区，并保持上方 workspace card 为唯一主操作区。
- `stage-document-checklist`: 阶段资料清单作为旧模板兼容区继续可访问，但默认折叠，展开后仍不得恢复主操作按钮。
- `technical-architecture`: 本 change 只能调整前端展示层，不得引入后端 API、数据库 migration、71 模板切换、旧项目迁移或旧清单删除。

## Impact

- 修改前端：`digital-platform-web/src/pages/ProjectDetailPage.vue`、`digital-platform-web/src/components/project-detail/ProjectStageDocumentChecklist.vue`、`digital-platform-web/src/styles.css`。
- 新增 9.26 规划文档。
- 新增 OpenSpec change artifacts 和 delta specs。
- 不修改后端 API、数据库、migration、项目初始化、旧项目资料记录、阶段推进或资料通用操作逻辑。
