## 1. 规划

- [x] 1.1 创建 `adjust-initiation-mode-and-add-marketing-cost-node-v1` change。
- [x] 1.2 盘点立项 `projectExecutionMode` 当前表单责任、模板生成来源、总经理审批入口和退回语义。
- [x] 1.3 盘点方案设计当前研发、制造、财务三段成本链路、上传槽、C17 派生和自动推进口径。
- [x] 1.4 写 proposal、design、spec delta 和 tasks。
- [x] 1.5 运行 OpenSpec 校验和 `git diff --check`。

## 2. Batch 1 - 立项项目开展模式调整

- [x] 2.1 后端从 `1.2 项目立项审批表` 商务负责人协同填写 schema 中移除 `projectExecutionMode` 必填责任。
- [x] 2.2 后端扩展 `approveInitiationReviewNode` 总经理审批通过 payload，要求 `projectExecutionMode` 为自研模式或供应链模式。
- [x] 2.3 后端确保总经理审批不通过时不校验、不要求 `projectExecutionMode`。
- [x] 2.4 后端在总经理审批通过事务中将 `projectExecutionMode` 写回 `1.2` 表单数据。
- [x] 2.5 后端确保 `projectExecutionMode` 仍只用于生成/查看 `1.2 项目立项审批表`，不写入 `projects.project_mode`。
- [x] 2.6 后端在 `1.2` 被退回重走时使旧总经理项目开展模式选择失效，重新审批通过时重新选择。
- [x] 2.7 后端记录总经理选择项目开展模式 operation log。
- [x] 2.8 前端在总经理审批通过弹层增加项目开展模式选择控件。
- [x] 2.9 前端在总经理审批不通过时不展示、不校验项目开展模式。
- [x] 2.10 后端将 `1.3 项目立项通知` 注册模板切换为 `项目立项通知-模板.docx`。
- [x] 2.11 后端为 `1.3` 表单 schema 增加只读 `projectExecutionMode` 字段。
- [x] 2.12 后端在 `1.3` 提交时从已通过 `1.2` 总经理选择带入当前项目开展模式，并写入 `1.3` 表单快照。
- [x] 2.13 后端生成 `1.3` 累计项目清单时每行带入各自项目开展模式。
- [x] 2.14 后端在 `1.3` Word 生成映射中新增“开展模式”列。
- [x] 2.15 补 initiation workflow 测试：商务负责人不再填写该字段、总经理通过必须选择、退回不要求、写回表单、`1.2` 生成文件勾选、旧选择失效、不写 `projects.project_mode`。
- [x] 2.16 补 initiation workflow 测试：`1.3` 生成文件包含自研/供应链开展模式，且不会把当前项目模式错误套到所有项目行。
- [x] 2.17 补 initiation workflow 测试：`1.3` 不允许手动修改开展模式，不写入 `projects.project_mode`。

## 3. Batch 2 - 方案设计营销成本估算节点

- [x] 3.1 新增正式 migration，扩展 `project_solution_design_nodes.node_key`、`project_solution_design_upload_slots.node_key`、`project_solution_design_upload_slots.slot_key`、`project_solution_design_upload_files.slot_key` MySQL enum。
- [x] 3.2 扩展 solution design node 定义，新增 `marketing_cost_estimation` 节点，顺序在制造成本估算之后、财务成本估算之前。
- [x] 3.3 扩展 upload slot 定义，新增 `marketing_cost_estimation_file`，名称为“营销中心成本估算表”。
- [x] 3.4 后端实现商务负责人上传/提交营销成本估算文件。
- [x] 3.5 后端实现营销中心负责人审批通过/退回营销成本估算。
- [x] 3.6 后端调整制造成本估算审批通过后激活营销成本估算，营销成本估算审批通过后激活财务成本估算。
- [x] 3.7 后端调整营销成本估算退回后停在该节点，商务负责人可复用旧 current file 或重新上传后重提。
- [x] 3.8 后端调整财务总经理退回到成本链路时的重置/重提范围，包含研发、制造、营销、财务四段。
- [x] 3.9 后端调整报价被拒返回成本链路时的重置/重提范围，包含研发、制造、营销、财务四段。
- [x] 3.10 后端调整 C17 派生完成、阶段齐套和自动推进，要求四段成本节点都 approved 且四个 current 文件齐套。
- [x] 3.11 后端调整工作台待办，生成商务负责人营销成本估算处理待办和营销中心负责人审批待办。
- [x] 3.12 后端补营销成本估算提交、审批、退回、总经理退回、报价拒绝返回和 C17 派生 operation log。
- [x] 3.13 前端展示营销成本估算节点、上传槽、提交/审批/退回按钮、待办入口和阻塞原因。
- [x] 3.14 补 solution design workflow 测试：制造到营销到财务流转、权限、退回复用 current file、四段 C17 派生、自动推进、待办、operation log、8 阶段和 71 项数量不变。

## 4. Batch 3 - 总体验证和收尾

- [x] 4.1 运行 `cmd /c npm.cmd run test:initiation-workflow`。
- [x] 4.2 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 4.3 运行 `cmd /c npm.cmd run check`。
- [x] 4.4 如改前端，运行 `digital-platform-web` 下 `cmd /c npm.cmd run build`。
- [x] 4.5 运行 `cmd /c openspec validate adjust-initiation-mode-and-add-marketing-cost-node-v1 --strict`。
- [x] 4.6 运行 `cmd /c openspec validate --all --strict`。
- [x] 4.7 运行 `git diff --check`。
- [x] 4.8 归档 change。
- [x] 4.9 提交实现。

## 5. Review 前收口

- [x] 5.1 按 `digital-platform-api/.env` 指向的测试库执行并复核 `028_add_solution_design_marketing_cost_estimation.sql`，确认四个 enum 均包含营销成本估算新值。
- [x] 5.2 清理空 `node_key` 和旧 9 节点测试 workflow 数据，重新初始化为 10 个节点和 17 个上传槽。
- [x] 5.3 统一方案设计导航来源：左侧导航和工作区方案设计阶段均使用 solution design workflow 节点定义。
- [x] 5.4 修复不存在或已下线 nodeKey 静默回退，避免 URL 指向旧方案设计蓝图节点时自动跳回方案设计准备。
- [x] 5.5 补回归测试：未进入方案设计阶段不暴露旧成本/报价/投标节点，进入方案设计阶段后返回 10 个专属节点并包含营销成本估算。
- [x] 5.6 用前端构建作为最小验证，覆盖左侧导航不再在立项前后切换两套节点。
