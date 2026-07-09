# ProjectDetailPage 工作区保留与精简 — 完成报告

## 执行结果

### 文件变更
| 文件 | 操作 | 行数 |
|------|------|------|
| `src/pages/project-detail/ProjectDetailPage.vue` | 新建（薄入口） | 51 |
| `src/pages/project-detail/ProjectDetailLayout.vue` | 新建（工作区主链路） | 1581 |
| `src/App.vue` | 修改 import 路径 | 1 行变更 |
| `src/pages/ProjectDetailPage.vue`（原） | 保留作为备份 | 1777 |

### 删除的内容
- **UI 区域**：ProjectOperationLogPanel 渲染块、ProjectStageDocumentChecklist 兼容资料区渲染块（含展开/收起按钮、兼容查看提示）
- **组件 import**：ProjectOperationLogPanel、ProjectStageDocumentChecklist
- **API import**：getProjectOperationLogs
- **状态变量**：operationLogsLoading、operationLogsErrorMessage、operationLogs、isLegacyChecklistExpanded
- **计算属性**：isChecklistEmpty、canViewProjectAudit、migratedWorkspaceDocumentKeys
- **函数**：loadOperationLogs、scrollToStageDocumentChecklist、locateWorkspaceOutputCard、findWorkspaceOutputCard、focusWorkspaceOutputCard、findStageDocumentChecklistCard、focusStageDocumentChecklistCard
- **模板事件**：@open-legacy-checklist（从 ProjectWorkspaceNodeList 和 ProjectWorkspaceOutputPanel 移除）

### 保留的内容（工作区主链路）
- 项目加载（getProjectDetail）、项目流程树（ProjectProcessTree）、节点切换、工作区节点卡片
- 节点产出面板（ProjectWorkspaceOutputPanel）、文档操作、附件操作、在线表单、审批操作
- 阶段推进（ProjectStageAdvancePanel + advanceCurrentStage）
- 路由同步：`/projects/:projectId/node/:nodeCode` + 任务入口定位
- 刷新链路：文档/附件/表单/审批操作后统一刷新 detail/workspace/navigation

### 关键决策：保留 getProjectStageDocumentChecklist 作为内部数据源
计划要求删除 `getProjectStageDocumentChecklist`，但分析发现：
- `getOutputDocument` 通过 `allStageDocuments`（来自 checklist 数据）查找文档的 permissions、completionStatus、reworkClass 等详情
- `currentStageCompleteness` 依赖 `currentChecklistStage`（来自 checklist 数据）供给阶段推进面板
- `syncResponsibilitySelectionsFromChecklist` 责任人选择数据来自 checklist
- workspace API 不含完整文档详情，删除该调用会彻底破坏工作区功能

因此保留 API 调用和 `checklist` 状态作为内部数据源，仅删除其 UI 渲染。代码中已用注释明确说明原因。

### 构建验证
`vite build` 成功：1640 modules transformed，23.63s，无错误。

### 待确认
- 旧文件 `src/pages/ProjectDetailPage.vue` 是否需要删除？当前保留作为备份。
- `getProjectStageDocumentChecklist` 保留为数据源的方案是否认可？若后续 workspace API 增强包含文档详情，可再移除。
