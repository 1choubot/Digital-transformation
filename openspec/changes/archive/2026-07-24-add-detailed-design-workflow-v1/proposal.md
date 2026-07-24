## Why

详细设计阶段目前仍主要依赖 v20260629 资料模板和旧蓝图节点展示，无法表达 7.20 业务流程中的角色分配、设计评审在线表单、图纸审查双子状态、返工版本和自动推进规则。需要为阶段 4 建立专用 workflow，让详细设计业务成为可执行、可审计、可导航和可测试的主流程。

## What Changes

- 新增详细设计阶段专用 workflow，覆盖阶段 4 的唯一主流程入口。
- 详细设计 workflow 使用 7.20 口述流程作为当前业务基线，不把 v20260629 的 71 项资料清单作为新 change 的硬性约束；该 71 项只保留为兼容、归档和派生展示基线。
- 明确详细设计阶段建立的是 7.20 detailed design workflow 执行基线，而不是新的普通资料模板基线：stage 4 的权威执行入口/执行合同是 detailed design workflow DTO，普通资料清单只做 v20260629 兼容、归档、派生展示和追溯，且不得驱动节点动作、权限、待办、门禁或自动推进。
- v20260629 的 C25-C41 只能作为历史/兼容参考，实施时必须显式列出复用、改名、废弃、新增和兼容处理方式。
- 保持 8 个外层阶段不被破坏，阶段 4 仍为 `detailedDesign`，自动推进目标阶段必须使用现有生产制作阶段 `manufacturing`。
- 详细设计 workflow 节点来自后端 DTO 和 workspace/navigation 单一来源；旧蓝图节点不能与专用 workflow 并列形成两个入口。
- 设计评审使用在线表单和 `D:\Digital transformation\智能制造项目管理文件模板\设计评审记录表-模板.xlsx` 生成文件。
- 内部图纸审查必须建模“图纸审查负责人通过/退回”和“研发中心负责人审批”两个子状态。
- 本轮只创建 OpenSpec change 文档，不实现业务代码、不新增 migration、不修改前后端源码。

## Baseline Decision

- 本 change 暂不新建 `v20260720` 全量普通资料模板。
- 本 change 暂不改变全项目普通资料总数和当前 template 初始化机制。
- `v20260629` 的 71 项保留为兼容、归档和派生展示基线。
- 详细设计阶段的业务执行基线是 7.20 detailed design workflow。
- 普通资料数量本轮暂不作为业务约束改变，但 workflow 门禁和待办以 7.20 流程为准。
- 后续如果要正式改变普通资料总数或编码，必须另开 change 处理新模板版本、migration、初始化、历史数据迁移和兼容显示。

## Capabilities

### New Capabilities

- None. The detailed design workflow is specified as changes to existing project, frontend, checklist, architecture, and operation log capabilities.

### Modified Capabilities

- `project-core`: 增加详细设计阶段专用 workflow 的节点、状态机、权限、阶段门禁、自动推进和工作台待办要求。
- `project-core-frontend`: 增加详细设计 workflow 前端页面、路由、DTO 消费和唯一入口要求。
- `stage-document-checklist`: 增加详细设计 7.20 workflow 执行基线、v20260629 兼容、C25 归属和旧资料处理要求。
- `technical-architecture`: 增加详细设计 workflow 的 domain/schema/repository/API/导航/门禁/生成文件/下载/事务边界架构要求。
- `business-operation-log`: 增加详细设计 workflow 各节点上传、分配、评审、图纸审查、会签和自动推进日志要求。

## Impact

- 未来实现将影响 `digital-platform-api` 的 detailed design workflow domain、schema ensure、正式 migration、repository、routes、workspace/navigation、stage advance、workbench、operation log 和 stage document derived completion。
- 未来实现将影响 `digital-platform-web` 的 detailed design workflow API、composable、节点页面、导航恢复、工作台展示和日志中文映射。
- 未来实现需要新增后端、前端和集成测试，覆盖完整状态机、权限、门禁、版本、生成文件、下载和兼容策略。
- 本 change 不新增通用 BPM，不改立项阶段、方案设计阶段、合同签订阶段流程，不开始实现详细设计 workflow。
