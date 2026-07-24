## Context

### Existing Implementation Pattern Summary

- 方案设计 workflow 使用 `domain/solutionDesignWorkflow.js` 定义阶段、节点、角色、上传槽、表单定义、状态和错误；`solutionDesignWorkflowSchema.js` 创建 roles、nodes、role history、upload slots/files、analysis/review/quotation forms 和 quotation flow；repository 负责初始化、DTO、权限、上传、在线表单生成、审批、退回、工作台待办、日志和自动推进；routes 暴露 `/solution-design-workflow` 系列接口；前端通过 API/composable/节点页只消费后端 DTO。
- 合同签订 workflow 使用 `domain/contractSigningWorkflow.js` 定义阶段 3 的 3 个主节点、上传槽、付款状态和角色映射；schema 维护 nodes、upload slots/files、payment flows；repository 负责初始化、DTO、权限、客户退回、签订完成、预付款动作、生成项目启动通知、工作台待办、日志和自动推进；workspace/navigation 用 DTO 替换旧蓝图节点；前端合同页面也只消费后端 DTO。
- 阶段推进由 `stageAdvanceRepository.js` 统一执行。通用门禁先检查当前阶段资料齐套；专用 workflow 可以追加阶段级附加门禁。自动推进必须调用 `tryAutoAdvanceProjectStage`，不得直接手写项目阶段字段。
- 项目导航由 `workspaceRepository.js` 和 `navigationService.js` 生成。方案设计和合同签订阶段已有专用 workflow 节点单一来源，不再把旧蓝图节点作为主流程并列返回。
- 工作台由 `stageDocuments/workbenchRepository.js` 汇总资料责任、资料审核、立项协同、方案设计 workflow 和合同签订 workflow 待办。专用 workflow 待办应直接基于 DTO permissions 生成，target route 指向项目详情节点。
- 操作日志通过 `operationLogRepository.js` 统一记录 action type、target type、summary 和 details，前端 `stageDocumentViewHelpers.js` 维护中文映射。
- 资料派生完成由 `stageDocuments/shared.js` 将专用 workflow 状态投影到普通资料清单。方案设计和合同签订已将主流程资料从普通卡片转为 workflow 派生完成。
- 资料责任人和中心负责人机制来自组织模型：项目角色通常存 workflow role 表，中心负责人按组织角色动态判断。普通资料责任仍由 stage document responsibility 体系管理。
- 当前详细设计阶段在 v20260629 模板中使用旧蓝图节点：`project_kickoff_meeting`、`detailed_design_preparation`、`detailed_design`、`internal_design_review`、`customer_design_review`、`product_plan_drawing`、`parts_list`、`drawing_review`、`customer_drawing_countersign`。对应资料 C25-C41 是历史基线，其中 C25/4.1 已回归详细设计阶段 `项目启动书`，合同项目启动通知不再占用 C25。

### Baseline Principle

本 change 建立的是 7.20 detailed design workflow 执行基线，不是新的普通资料模板基线。7.20 口述流程是当前业务依据，v20260629 的 71 项资料清单只能作为历史/兼容参考；不得把“保持 71 项”写成详细设计新 change 的硬性约束。stage 4 的权威执行入口和执行合同是 detailed design workflow DTO，普通资料清单只能消费 workflow 派生状态，用于兼容、归档、追溯和展示，且不得反向驱动节点动作、权限、待办、门禁或自动推进。

本 change 暂不新建 `v20260720` 全量普通资料模板，也不改变全项目普通资料总数和当前 template 初始化机制。普通资料数量本轮不作为业务约束改变；只有 workflow 门禁、待办、节点状态和自动推进以 7.20 workflow 执行基线为准。若后续要正式改变普通资料总数或编码，必须另开 change，单独处理模板版本、migration、初始化、历史数据迁移和兼容显示。

### Implementation Notes for the 7.20 Baseline

- Stage 4 的权威执行源必须是 detailed design workflow backend state 和 DTO；workspace、navigation、workbench、节点页按钮、阶段门禁和自动推进都从该 DTO/backend state 派生。
- 普通 v20260629 71 项资料清单只保留为兼容、归档、派生展示和追溯视图。本 change 不新增 `v20260720` 普通资料模板，不改变普通资料总数，也不改变当前 template 初始化机制。
- 普通资料上传、提交、审核、返工完成、责任人和附件写入口不得反向驱动 detailed design workflow；C25-C30、C32-C41 只能展示 workflow 派生完成态和 traceability。
- C31 / `4.7` `控制逻辑流程图` 是兼容资料，不进入详细设计主 workflow，不产生待办，不参与门禁，也不得阻塞详细设计完成或自动进入 `manufacturing`。

## Goals / Non-Goals

**Goals:**

- 新增阶段 4 `detailedDesign` 专用 workflow，成为详细设计阶段唯一主流程入口。
- 按 7.20 流程定义 9 个节点：项目启动会、详细设计准备、详细设计、内部设计评审、客户设计评审、绘制产品平面图、编写零部件清单、内部图纸审查、客户图纸会签。
- 支持项目启动书上传、角色分配、8 个详细设计文件上传、两个设计评审在线表单生成和审批、图纸审查双子状态、客户图纸会签和自动进入生产制作阶段。
- 明确文件版本、current file、返工、图纸审查记录历史、权限、工作台待办、导航、门禁、日志和普通资料边界。
- 明确 C25 只能表达详细设计项目启动书，不能再与合同项目启动通知关联。

**Non-Goals:**

- 不新增通用 BPM 或通用审批引擎。
- 不修改 8 个外层阶段定义，不自行编造生产制作 stage key。
- 不改立项、方案设计、合同签订、采购合同、生产制作合同或通用付款/发票流程。
- 不把专业组成员纳入详细设计 workflow 主流程；专业组成员只为周报、日报能力预留。
- 不设计研发中心多人会签；研发中心负责人按一个负责人处理。
- 不把未明确的角色增加为审批人。
- 本轮不实现业务代码、不新增 migration、不修改前端源码、不归档、不提交。

## Decisions

### 1. Stage and Node Model

详细设计阶段使用现有外层阶段 `stageKey=detailedDesign`、`stageOrder=4`。客户图纸会签完成后自动推进到现有生产制作阶段 `stageKey=manufacturing`、`stageOrder=5`。

详细设计 workflow 节点定义如下，节点 key 优先复用当前 v20260629 语义相同的旧蓝图 key，避免既有深链和工作区上下文完全断裂：

| Order | Node Key | Node Name | Primary Owner | Completion |
| --- | --- | --- | --- | --- |
| 1 | `project_kickoff_meeting` | 项目启动会 | 制造中心负责人 | 上传项目启动书后提交节点完成 |
| 2 | `detailed_design_preparation` | 详细设计准备 | 研发中心负责人、项目经理 | 完成角色分配、上传工作计划后由项目经理提交节点完成 |
| 3 | `detailed_design` | 详细设计 | 技术负责人 | 8 个详细设计文件均上传或标记无需上传后提交节点完成 |
| 4 | `internal_design_review` | 内部设计评审 | 技术负责人、研发中心负责人 | 表单生成后提交，审批通过后完成 |
| 5 | `customer_design_review` | 客户设计评审 | 技术负责人、研发中心负责人 | 表单生成后提交，审批通过后完成 |
| 6 | `product_plan_drawing` | 绘制产品平面图 | 技术负责人 | 上传产品平面图后提交节点完成 |
| 7 | `parts_list` | 编写零部件清单 | 技术负责人 | 上传零部件清单后提交节点完成 |
| 8 | `drawing_review` | 内部图纸审查 | 图纸审查负责人、研发中心负责人 | 审查负责人通过后进入研发审批，研发审批通过后完成 |
| 9 | `customer_drawing_countersign` | 客户图纸会签 | 商务负责人 | 上传客户会签图纸扫描件后提交节点完成并自动推进 |

详细设计 workflow 节点必须来自后端 DTO。workspace/navigation 不得同时返回 v20260629 旧蓝图节点作为详细设计主流程节点。

### 2. Roles and Permissions

研发中心负责人在详细设计准备节点分配以下角色：

- 项目经理。
- 商务负责人。
- 技术负责人。
- 采购负责人。
- 财务会计。
- 图纸审查负责人。
- 专业组成员。

单人角色应写入 workflow role assignment；专业组成员应支持多成员存储，但本 change 只为周报、日报预留，不参与详细设计 workflow 节点权限和门禁。

权限规则：

- 制造中心负责人只负责项目启动会上传项目启动书。
- 研发中心负责人只作为角色分配人、设计评审审批人、内部图纸审查最终审批人。
- 技术负责人只负责详细设计 8 个技术文件、内部/客户设计评审表单填写生成、产品平面图和零部件清单上传。
- 项目经理只负责详细设计阶段工作计划上传。
- 商务负责人只负责客户图纸会签扫描件上传。
- 图纸审查负责人只负责内部图纸审查的下载、问题记录上传、退回和通过动作。
- 采购负责人和财务会计只在本 change 中完成角色分配入库，不参与详细设计 workflow 主动作。
- 已结束项目禁止所有写操作。
- 未激活节点、错误角色、重复操作、缺少 current file 或缺少必要前置状态时必须拒绝。

### 3. 7.20 Detailed Design Workflow Execution Baseline

本 change 建立新的 7.20 detailed design workflow 执行基线，不能把 v20260629 的 71 项作为普通资料硬约束。旧 C25-C41 的处理方式：

| v20260629 Code | Old Name | 7.20 Handling |
| --- | --- | --- |
| C25 / 4.1 | 项目启动书 | 复用为详细设计项目启动书，只能归属 `project_kickoff_meeting`。 |
| C26 / 4.2 | 详细设计工作计划 | 复用为详细设计准备节点工作计划。 |
| C27 / 4.3 | 3D模型（详细设计） | 可复用为 3D 模型槽位，但 completion 由 workflow current file 派生。 |
| C28 / 4.4 | 电气原理图 | 可复用为电气原理图槽位。 |
| C29 / 4.5 | 电气接线图 | 可复用为电气接线图槽位。 |
| C30 / 4.6 | 电气布置图 | 可复用为电气布置图槽位。 |
| C31 / 4.7 | 控制逻辑流程图 | 7.20 口述流程未要求，废弃为详细设计 workflow 主流程资料；可保留为历史兼容资料或归档资料。 |
| C32 / 4.8 | 自动化程序 | 可复用为自动化程序槽位。 |
| C33 / 4.9 | 软件开发说明文档 | 可复用。 |
| C34 / 4.10 | UI界面设计PPT | 改名为软件 UI 界面设计 PPT。 |
| C35 / 4.11 | 软件代码 | 可复用。 |
| C36 / 4.12 | 设计评审记录表（内部设计评审） | 复用语义，但由技术负责人在线表单生成，研发中心负责人审批。 |
| C37 / 4.13 | 设计评审记录表（客户设计评审） | 复用语义，但由技术负责人在线表单生成，研发中心负责人审批。 |
| C38 / 4.14 | 产品平面图 | 复用为产品平面图 current file。 |
| C39 / 4.15 | 产品零部件清单 | 复用为零部件清单 current file。 |
| C40 / 4.16 | 图纸审查记录 | 复用为内部图纸审查问题记录历史，不再用普通资料状态代替双子状态。 |
| C41 / 4.17 | 客户会签记录 | 改名为客户会签图纸扫描件。 |

新增内容不是新增普通资料数量的硬要求，而是新增 detailed design workflow 业务实体：nodes、roles、professional members、upload slots/files、review forms、drawing review records/actions。实施时如决定变更 stage document checklist 总数或编码，必须通过 migration 和兼容规则显式处理；不得把“保持 71 项”作为验收条件。C25-C41 在这里仅是 workflow 输出到普通清单的派生/兼容展示，不是 workflow 的执行来源。

C31 作为兼容/归档资料项保留时，不得作为 7.20 detailed design workflow 主流程门禁条件；如果普通资料清单仍展示它，必须呈现为不适用、兼容归档或非 workflow 主流程项，而不是待办或阻塞项。C40 作为条件性历史记录项保留时，只有在图纸审查发现问题时才要求上传；无问题且从未上传过历史记录时不得阻塞阶段推进，若历史上已上传过则只保留历史并供后续下载/审计。

### 4. File and Version Strategy

- 所有上传槽必须支持 current file、revision、uploaded_by、uploaded_at、replaced_at 和下载权限。
- 项目启动书、详细设计工作计划、产品平面图、零部件清单、客户会签图纸扫描件均必须先有 current file，再由对应角色显式提交节点后完成；上传动作只保存或替换文件，不推进节点。
- 上传类节点的负责角色在节点可处理时应看到“提交节点”动作；提交条件未满足时按钮应禁用并展示 DTO 提供的阻塞原因，只有 `canSubmit` 为 true 时才允许调用提交 API。
- 8 个详细设计文件以 current file 或“无需上传”标记作为提交门禁，只有技术负责人显式提交 `detailed_design` 节点后才完成并进入内部设计评审。
- 8 个详细设计文件必须允许文档、压缩包、工程文件、程序源码、程序包等实际文件类型；校验应基于可配置大小上限、扩展名/MIME 安全规则和存储能力，不得仅因文件是压缩包或程序文件拒绝。
- “无需上传”只适用于 8 个详细设计文件 C27-C30、C32-C35，不适用于 C25、C26、C38、C39 或 C41；已上传当前文件的槽位不得再标记无需上传，取消无需上传后该槽位应重新阻塞 `detailed_design` 节点提交。
- 内部设计评审和客户设计评审使用在线表单生成文件，沿用方案设计阶段 generated file 最新版本策略；当前生成文件用于节点提交和审批。除现有 generated file 机制天然保留历史外，本 change 不额外要求保留设计评审历史版本。
- 图纸审查记录表是例外：只要上传过就要保留历史记录。退回、返工、最终通过都不得删除历史审查记录。
- 产品平面图和零部件清单返工时开启新的 drawing revision，但 C38/C39 节点提交门禁以对应 current file 是否存在为准；提交 C39 时必须把当时 C38/C39 current file revision 写入 drawing review flow，作为本轮图纸审查输入追溯。

### 5. Node State Machine

项目启动会：

- 制造中心负责人上传项目启动书。
- 上传成功后仅保存 current file；制造中心负责人提交节点后，项目启动会完成并自动激活详细设计准备。

详细设计准备：

- 研发中心负责人完成角色分配。
- 项目经理上传详细设计阶段工作计划。
- 角色分配和工作计划都完成后，项目经理提交节点；提交成功后节点完成并自动激活详细设计。

详细设计：

- 技术负责人上传 8 个文件：3D 模型、电气原理图、电气接线图、电气布置图、自动化程序、软件开发说明文档、软件 UI 界面设计 PPT、软件代码。
- 技术负责人可对 8 个文件槽位上传 current file，或在未上传 current file 时标记无需上传。
- 8 个文件均已上传或标记无需上传后，技术负责人提交节点；提交成功后节点完成并自动激活内部设计评审。
- 不能继续假设这 8 个文件必须对应旧 C27-C35 连续资料；C31 已从 7.20 主流程中废弃。

内部设计评审和客户设计评审：

- 技术负责人填写在线表单并生成文件。
- 提交后进入研发中心负责人审批。
- 审批不通过返回详细设计重新执行；对应评审节点及后续节点回到未开始或等待状态。
- 审批通过自动进入下一节点。
- 退回后必须开启新的 detailed design revision。
- 技术负责人必须按新 revision 重新上传 8 个详细设计文件，旧 revision 文件只能用于追溯或下载，不能继续满足新 revision 的详细设计、评审或门禁。
- 被退回的评审表单/生成文件不得继续满足新 revision 的评审门禁；只有新 revision 的 8 个当前文件齐套后，后续设计评审才可继续。

绘制产品平面图和编写零部件清单：

- 技术负责人上传当前有效文件后，必须显式提交对应节点。
- 产品平面图提交完成后自动进入编写零部件清单。
- 零部件清单提交完成后自动进入内部图纸审查，并初始化或刷新图纸审查 flow。

内部图纸审查：

- 图纸审查负责人可以下载当前产品平面图和当前零部件清单。
- 如果发现问题，必须先上传图纸审查记录表，再点击退回；未上传审查记录表时退回必须被拒绝。
- 图纸审查负责人退回后，从绘制产品平面图开始重新执行后续流程。
- 如果没有问题，图纸审查负责人可以直接通过，不要求上传图纸审查记录表；通过后进入研发中心负责人审批。
- 如果历史上曾上传过图纸审查记录表，记录必须保留；最后一次无问题通过时不要求再次上传。
- 研发中心负责人审批时，如果存在审查记录历史，可以下载历史/当前有效审查记录、产品平面图和零部件清单；如果从未上传过审查记录，只需审批产品平面图和零部件清单。
- 研发中心负责人审批不通过，返回绘制产品平面图重新执行后续流程。
- 研发中心负责人不生成审批记录表，系统只记录审批动作、结果、人员和时间。
- 图纸审查退回或研发中心负责人图纸审批退回后，workflow MUST 返回 `product_plan_drawing` 并开启新的 drawing revision；技术负责人可以重新上传 C38/C39，也可以在 current file 仍存在时直接重新提交 C38/C39 节点。
- C38/C39 旧上传文件不能按文件 revision 自动等同于新 drawing revision，但只要它仍是该槽位 current file，就可以在重新提交节点时绑定到新 drawing review flow；flow 必须记录提交时的 C38/C39 file revision 用于追溯。
- 新一轮图纸审查通过时仍不要求重复上传图纸审查记录。

### 6. Form Schema Derivation

内部设计评审和客户设计评审的在线表单 schema MUST 在实现前先读取并分析 `D:\Digital transformation\智能制造项目管理文件模板\设计评审记录表-模板.xlsx`。

- 字段定义、必填规则、生成文件映射和模板占位符替换规则 MUST 依据模板结构显式确认。
- 如果模板结构不足以自动推断字段，执行实现前 MUST 回到审查会话确认字段。
- 设计评审表单 schema 任务和测试 MUST 以该模板分析结果为准，不得凭空猜字段。
- 详细设计评审表前端交互使用目标、风险、建议三类矩阵，每条目标/风险/建议右侧一一对应实施计划；提交时每条内容对应的实施计划均为必填。
- 后端 payload 应支持新的 `implementationPlanItems` 矩阵结构，并兼容读取旧草稿中的 `designImplementationPlan`；生成文件时实施计划区域应由目标、风险、建议对应的计划项汇总写入，不再直接使用独立实施计划文本数组作为新提交来源。
- 生成文件的“设计实施计划”区域只写计划内容，不重复写目标/风险/建议原始内容；格式为 `目标1：<目标1对应实施计划>`、`风险1：<风险1对应实施计划>`、`建议1：<建议1对应实施计划>`。

客户图纸会签：

- 商务负责人上传客户会签图纸扫描件。
- 上传成功后仅保存 current file；商务负责人提交节点后，客户图纸会签完成，并调用统一阶段推进逻辑自动进入生产制作阶段。
- 客户图纸会签提交门禁以当前 C41 文件存在为准；图纸返工导致 `customer_drawing_countersign` 节点 revision 大于 1 时，首次上传的 C41 current file 仍可满足提交门禁，不能被 `file revision < node revision` 卡住。
- 不额外增加未明确要求的审批节点。

### 7. Data Model Direction

未来实现应新增正式 migration 和 schema ensure，至少包含：

- `project_detailed_design_nodes`：project_id、node_key、node_name、node_order、status、current_revision、return_reason、activated/submitted/approved/returned timestamps。
- `project_detailed_design_roles`：project_id、project_manager_user_id、business_owner_user_id、technical_owner_user_id、procurement_owner_user_id、finance_accountant_user_id、drawing_review_owner_user_id、assigned_by_user_id、assigned_at、updated_by_user_id、updated_at。
- `project_detailed_design_professional_group_members`：project_id、user_id、assigned_by_user_id、assigned_at、is_active。
- `project_detailed_design_upload_slots` 和 `project_detailed_design_upload_files`：slot_key、node_key、revision、status、current file、return reason、uploaded/submitted/review metadata。
- `project_detailed_design_review_forms`：internal/customer review form data、revision、form_status、generated_file status/storage/template metadata、review status、reviewer、approved/returned info。
- `project_detailed_design_drawing_review_records`：problem record uploads with history, revision, current design revision context, uploaded_by/at, storage metadata。
- `project_detailed_design_drawing_review_flows` or equivalent：drawing reviewer substatus and RD approval substatus, actor, time, comment, return reason.

设计评审生成文件可复用现有 `project_stage_document_generated_files` 体系；图纸审查记录表按上传文件历史保存，不得只保留一个 current file 覆盖历史。

### 8. DTO, Navigation, Workbench, and API

DTO 至少返回：

- `projectId`、`stageKey=detailedDesign`、`isProjectEnded`。
- `nodes`：nodeKey、nodeName、status、nodeOrder、currentRevision、blockingReasons、permissions、nextActions。
- `roles` 和 `professionalGroupMembers`。
- `uploadSlots`：slotKey、slotName、nodeKey、status、revision、currentFile、historyAvailable、returnReason、permissions。
- `reviewForms`：reviewType、nodeKey、status、generatedFile、reviewStatus、reviewer、permissions。
- `drawingReview`：checkerStatus、rdApprovalStatus、recordHistory、downloadableFiles、blockingReasons、permissions。
- `permissions`：阶段级权限和当前用户可执行动作。

API 应保持专用 workflow 风格，例如：

- `GET /api/projects/:projectId/detailed-design-workflow`
- role assignment API。
- uploads list/upload/download API。
- review form get/save/submit/generated-file/download API。
- drawing review record upload/download/history API。
- drawing review checker pass/return API。
- drawing review RD approve/return API。
- customer drawing countersign upload API。

工作台待办类型建议为 `detailed_design_workflow`，并必须直接基于 DTO permissions 生成。target route 统一指向项目详情节点：`/projects/${projectId}?taskMode=detailedDesign&focusNodeKey=${nodeKey}`。

### 9. Stage Gate and Derived Completion

详细设计阶段手工推进和自动推进都必须受 detailed design workflow 门禁约束：

- 只有 `customer_drawing_countersign` 节点完成后，阶段 4 才可进入生产制作。
- 门禁必须从 workflow 表和 generated/upload current file 判断，不得依赖前端状态或旧普通资料卡片。
- 普通资料状态 API 可以展示专用 workflow 派生完成结果和归档文件，但不得成为详细设计主流程动作入口。
- C25 如果继续复用，只能表达详细设计项目启动书，不能与合同项目启动通知产生关联。

### 10. Frontend Direction

前端应新增 detailed design workflow API、composable 和 9 个节点页，复用方案设计/合同签订页面结构。所有按钮显示只依赖后端 DTO permissions。详细设计阶段左侧/顶部节点列表只来自后端 workspace/navigation，不在前端本地拼第二套节点。旧蓝图节点进入时应提示已由详细设计 workflow 接管或映射到对应 workflow 节点，不能形成双入口。

### 11. Operation Log Direction

所有节点关键动作必须写 operation log，包括角色分配、上传、表单保存/提交/生成/生成失败、审批通过/退回、图纸审查记录上传、图纸审查负责人通过/退回、研发中心负责人审批通过/退回、客户图纸会签上传和自动推进生产制作。日志 details 必须包含 nodeKey、slotKey 或 reviewType、revision、文件/生成文件上下文、actor、状态变化和返工原因。

## Risks / Trade-offs

- 7.20 新资料基线可能改变详细设计阶段资料数量或编码。Mitigation: 在 migration 和 stage-document-checklist spec 中明确复用、改名、废弃、新增和兼容策略，不把 71 项作为硬约束。
- 复用旧 nodeKey 可降低路由迁移成本，但容易误以为旧蓝图仍是主流程。Mitigation: workspace/navigation 必须只返回 workflow DTO 节点，旧蓝图只作兼容引用。
- 图纸审查双子状态比普通资料审批复杂。Mitigation: 单独设计 drawing review flow/record 表，不用一个资料状态替代。
- 大文件和程序文件类型可能带来存储和安全压力。Mitigation: 使用可配置大小、扩展名/MIME 安全校验和下载权限，不按旧普通附件限制简单拒绝。
- 专业组成员本轮只入库预留，可能被误用于主流程权限。Mitigation: DTO 和 permissions 明确专业组成员无 workflow 主动作权限。
