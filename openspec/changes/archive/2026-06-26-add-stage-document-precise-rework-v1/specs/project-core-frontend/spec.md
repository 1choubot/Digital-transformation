## MODIFIED Requirements

### Requirement: 项目详情页资料手工状态操作

项目详情页 MUST 按资料项 `completionMode` 展示提交、确认和退回操作，并 MUST 使用后端返回的派生完成状态、返工标记、可选返工候选刷新资料列表、齐套摘要和缺失资料列表。

#### Scenario: submit_only 不展示确认退回
- **WHEN** 页面展示 `completionMode = submit_only` 的资料项
- **THEN** 页面 MUST 将主操作表达为提交、上传或完成
- **AND** 页面 MUST NOT 展示确认、审核通过或退回操作作为主流程入口

#### Scenario: approval_required submitted 展示确认退回
- **WHEN** 页面展示 `completionMode = approval_required` 且基础状态为 `submitted` 的资料项
- **AND** `revision_required` 不是 true，或后端已明确该资料是返工重提后的审核待办
- **THEN** 页面可以按当前用户资料级审核权限展示确认/审核通过和退回操作
- **AND** 页面 MUST 表达该操作对象是单个资料项

#### Scenario: A 类退回展示固定候选多选
- **WHEN** 用户退回 A 类审批资料
- **THEN** 页面 MUST 展示后端返回的固定返工候选多选控件，并将选择结果提交为 `revisionTargetDocumentIds`
- **AND** 候选展示 MUST 包含资料编号、资料名称、责任人、当前状态、完成规则和是否适用
- **AND** 页面 MUST NOT 使用 `designChangeTargetDocumentIds` 提交 A 类返工候选

#### Scenario: A 类未选择候选不能提交
- **WHEN** 用户退回 A 类审批资料但未选择任何返工候选
- **THEN** 页面 MUST 阻止提交退回
- **AND** 页面 MUST 提示至少选择 1 个返工资料

#### Scenario: B 类只展示退回原因
- **WHEN** 用户退回 B 类或其他没有明确上游候选的普通审批资料
- **THEN** 页面 MUST 只展示退回原因输入
- **AND** 页面 MUST NOT 展示上游返工候选选择器

#### Scenario: C 类展示设计变更触发选项
- **WHEN** 用户退回 `5.12 安装调试记录（厂内）`
- **THEN** 页面 MUST 允许用户勾选 `5.13-5.16` 设计变更触发项，并将选择结果提交为 `designChangeTargetDocumentIds`
- **AND** 页面 MUST 表达被勾选资料会被设置为适用且需返工
- **AND** 页面 MUST NOT 使用 `revisionTargetDocumentIds` 提交 C 类设计变更触发项

#### Scenario: C 类未选择设计变更项不能提交
- **WHEN** 用户退回 `5.12 安装调试记录（厂内）`
- **AND** 未选择任何 `5.13-5.16` 设计变更触发项
- **THEN** 页面 MUST 阻止提交退回
- **AND** 页面 MUST 提示至少选择 1 个设计变更资料

#### Scenario: 操作后刷新派生摘要
- **WHEN** 用户完成资料提交、确认、退回或返工完成操作
- **THEN** 页面必须重新获取或刷新后端返回的 `completionMode` 派生完成状态、返工标记、阶段齐套摘要和缺失资料列表

### Requirement: 项目详情页阶段资料齐套展示

项目详情页 MUST 按当前 20260625 `completionMode` 与 `revision_required` 派生完成口径展示阶段资料齐套情况，不得把“已确认资料数”作为唯一完成口径，也不得隐藏需返工资料对推进门禁的影响。

#### Scenario: 展示已完成资料数
- **WHEN** 页面展示阶段齐套摘要
- **THEN** 页面 MUST 展示已完成资料数、适用资料总数、未完成资料数和完成比例
- **AND** 已完成资料数 MUST 使用后端 `completedRequiredCount` 或等价 `completionMode` 与 `revision_required` 派生完成数量

#### Scenario: 兼容 confirmedRequiredCount
- **WHEN** 后端为兼容旧前端返回 `confirmedRequiredCount`
- **THEN** 页面只可将其作为派生完成数量的兼容字段使用
- **AND** 页面 MUST NOT 将其解释为仅 `status = confirmed` 的资料数量

#### Scenario: 缺失列表展示返工信息
- **WHEN** 页面展示缺失或未完成资料列表
- **THEN** 每项 MUST 展示或可查看 `documentCode`、`documentName`、基础 `status`、`completionMode`、派生完成状态和返工标记
- **AND** 对 `revision_required = true` 的资料 MUST 显示需返工原因或可查看来源审批资料

#### Scenario: 需返工阻塞推进
- **WHEN** 当前阶段存在 `revision_required = true` 的适用资料
- **THEN** 页面 MUST 将其展示为门禁未完成原因
- **AND** 页面 MUST NOT 因资料基础状态为 `submitted` 或 `confirmed` 将其显示为可推进

### Requirement: 我的资料任务页面

我的资料任务页面 MUST 使用 `completionMode`、`revision_required` 和派生完成状态展示、筛选和排序任务，默认 pending 视图不得混入已完成的 `submit_only + submitted` 资料，但必须包含当前用户负责的需返工资料。

#### Scenario: pending 包含需返工资料
- **WHEN** 用户打开我的资料任务默认 pending 视图
- **THEN** 页面 MUST 展示后端返回的当前用户负责且 `revision_required = true` 的资料任务

#### Scenario: pending 排除已完成 submit_only
- **WHEN** 用户打开我的资料任务默认 pending 视图
- **THEN** 页面 MUST NOT 展示 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料作为待办

#### Scenario: 任务状态按 completionMode 和返工标记展示
- **WHEN** 页面展示资料任务
- **THEN** 页面 MUST 优先展示 `revision_required = true` 的任务为需返工
- **AND** `submit_only + submitted` 且无返工 MUST 显示为已完成或已提交完成
- **AND** `approval_required + submitted` 且无返工 MUST 显示为待审核

#### Scenario: 任务字段包含返工信息
- **WHEN** 页面展示资料任务列表
- **THEN** 页面 MUST 展示或可查看 `completionMode`
- **AND** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价字段表达业务完成状态
- **AND** 页面 MUST 展示或可查看返工标记、返工原因和来源审批资料

### Requirement: 项目详情页资料附件展示与操作

项目详情页资料附件区域 MUST 继续使用在线平台附件能力，并 MUST 以后端返回的 `completionMode` 与 `revision_required` 派生完成状态判断上传、提交或返工完成后的资料完成表现；附件操作不得表达为文件平台归档完成。

#### Scenario: 上传后完成状态以后端为准
- **WHEN** 用户上传或提交资料附件后页面刷新资料项
- **THEN** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价派生状态展示资料是否完成
- **AND** 页面 MUST NOT 将“附件上传一定不等于资料完成”作为通用规则

#### Scenario: submit_only 返工需要明确完成动作
- **WHEN** `submit_only` 或 `conditional_submit` 资料 `revision_required = true`
- **AND** 用户完成上传或修改
- **THEN** 页面 MUST 提供或引导执行明确返工完成动作
- **AND** 页面 MUST NOT 仅因附件存在就绕过后端返工清除权限

#### Scenario: approval_required 返工不直接清除
- **WHEN** `approval_required` 资料 `revision_required = true`
- **THEN** 页面 MUST 显示“返工重提”或等价入口
- **AND** 页面 MUST NOT 提供绕过审核的清除返工主流程入口

#### Scenario: approval_required 返工重提后展示待审核
- **WHEN** `approval_required` 资料执行返工重提后后端返回 `status = submitted`
- **AND** `revision_required = true`
- **THEN** 页面 MUST 展示该资料为待审核且仍需审核确认清除返工
- **AND** 页面 MUST NOT 将重提动作本身展示为已完成

#### Scenario: 附件不表达文件平台归档
- **WHEN** 页面展示附件列表、上传、下载或删除操作
- **THEN** 页面 MUST NOT 将附件存在、附件上传成功、资料提交成功或返工完成表达为文件平台归档完成

### Requirement: 我的工作台页面

前端 MUST 将当前“我的资料任务”升级或改名为“我的工作台 / 我的待办”，并 MUST 展示当前用户的资料责任待办、资料审核待办和阶段推进待办；当前 20260625 在线平台内部资料闭环 MUST NOT 展示阶段关口审批待办分类或入口，且 MUST 展示需返工资料待办。

#### Scenario: 工作台展示待办分类
- **WHEN** 工作台接口返回待办数据
- **THEN** 页面必须展示我负责的资料、待我审核的资料和待我推进阶段等分类或筛选
- **AND** 页面 MUST 支持将 `revision_required = true` 的资料责任待办展示为“需返工资料”或等价文案
- **AND** 页面 MUST NOT 展示阶段关口审批待办分类
- **AND** 页面 MUST NOT 展示“待我阶段关口审批”、“待阶段关口审批”或等价筛选/入口

#### Scenario: 审核待办只来自 approval_required
- **WHEN** 工作台展示待审核资料
- **THEN** 普通待审核资料 MUST 只来自 `completionMode = approval_required`、`status = submitted` 且 `revision_required` 不是 true 的资料项
- **AND** `revision_required = true` 的资料必须已返工重提，并由后端作为审核待办返回后，前端才可展示为待审核资料
- **AND** 页面 MUST NOT 将未重新提交的 `revision_required` 资料、`submit_only`、未触发的 `conditional_submit` 或泛化阶段审批事项展示为资料审核待办

#### Scenario: approval_required 返工重提后进入审核视图
- **WHEN** 工作台返回 `completionMode = approval_required`、`revision_required = true`、`status = submitted` 且已返工重提的资料审核待办
- **THEN** 页面 MUST 将其展示为待审核
- **AND** 页面 MUST 表达审核确认后才会恢复完成

#### Scenario: 阶段推进待办按 completionMode 返工门禁和权限
- **WHEN** 工作台展示阶段推进待办
- **THEN** 阶段推进待办 MUST 只按当前阶段适用资料的 `completionMode` 完成情况、`revision_required` 清除情况和当前用户推进权限展示
- **AND** 页面 MUST NOT 因 `approval_status` 生成阶段关口审批待办
- **AND** 页面 MUST NOT 因 `approval_status != approved` 隐藏符合资料完成、返工清除和推进权限条件的阶段推进待办

#### Scenario: 点击返工待办进入资料项
- **WHEN** 用户点击需返工资料待办
- **THEN** 页面 MUST 导航到对应资料项处理位置或受限资料任务视图
- **AND** 页面 MUST NOT 进入阶段关口审批处理页

### Requirement: 前端按 completionMode 展示资料操作

前端 MUST 根据后端返回的 `completionMode`、`revision_required` 和派生完成状态展示资料项按钮、状态和文案，不得继续把所有资料统一表达为提交审核。

#### Scenario: 使用派生完成状态
- **WHEN** 阶段资料列表展示资料项
- **THEN** 前端 MUST 使用后端返回的 `completionStatus`、`isComplete` 或等价派生完成状态展示业务完成状态
- **AND** 前端 MUST NOT 仅凭基础 `status = submitted` 将所有资料显示为待审核

#### Scenario: revision_required 优先显示需返工
- **WHEN** 资料项 `revision_required = true`
- **THEN** 前端 MUST 将该资料显示为需返工或等价未完成状态
- **AND** 前端 MUST NOT 将其显示为阶段推进已满足

#### Scenario: submit_only 不展示审核动作
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 前端 MUST NOT 将主操作展示为提交审核
- **AND** 前端 MUST NOT 展示审核通过、退回或审核待办入口

#### Scenario: approval_required 展示审核流程
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 前端 MUST 展示提交、待审核、审核通过和退回修改等状态或操作
- **AND** 退回修改 MUST 按精准返工 A/B/C 规则展示允许的返工选择

#### Scenario: approval_required 返工重提入口
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **THEN** 前端 MUST 展示“返工重提”或等价入口
- **AND** 前端 MUST NOT 展示直接清除返工入口

## ADDED Requirements

### Requirement: 精准退回候选选择器

前端 MUST 在 A 类审批资料退回时展示固定候选选择器，并 MUST 防止用户提交空候选；C 类 `5.12` MUST 使用独立设计变更触发项选择器。

#### Scenario: 候选字段展示
- **WHEN** A 类退回弹窗展示返工候选
- **THEN** 每个候选 MUST 展示资料编号、资料名称、责任人、当前状态、完成规则和是否适用

#### Scenario: 候选范围不自由扩展
- **WHEN** 用户打开 A 类退回弹窗
- **THEN** 页面 MUST 只展示后端返回的固定候选
- **AND** 页面 MUST NOT 提供自由搜索或勾选本阶段全部资料的入口

#### Scenario: 5.12 设计变更触发项选择器
- **WHEN** 用户打开 `5.12` 退回弹窗
- **THEN** 页面 MUST 只展示 `5.13`、`5.14`、`5.15`、`5.16` 作为设计变更触发项
- **AND** 页面 MUST 使用 `designChangeTargetDocumentIds` 提交选择结果
- **AND** 页面 MUST 防止用户选择其他资料

### Requirement: 需返工资料展示

前端 MUST 在项目详情资料卡片、缺失资料列表和工作台中展示需返工资料。

#### Scenario: 资料卡片显示需返工
- **WHEN** 资料项 `revision_required = true`
- **THEN** 资料卡片 MUST 显示“需返工”或等价状态
- **AND** 页面 MUST 展示或可查看返工原因和来源审批资料

#### Scenario: 未分配责任人提示
- **WHEN** 资料项 `revision_required = true` 且没有责任人
- **THEN** 项目详情 MUST 显示“需返工但未分配责任人”或等价提示
- **AND** 页面 MUST 引导项目经理或有权限负责人先分配责任人

### Requirement: 精准返工前端边界

前端 MUST 将精准返工限定为资料级审批 NO 后的资料返工能力。

#### Scenario: 不做推送通知入口
- **WHEN** 前端展示或处理精准返工
- **THEN** 页面 MUST NOT 新增推送通知、站内信、短信或邮件配置入口

#### Scenario: 不展示文件平台返工入口
- **WHEN** 前端展示需返工资料
- **THEN** 页面 MUST NOT 展示文件平台归档状态、文件平台文件列表、folder id 或归档重试入口

#### Scenario: 不解决 1.2 多节点审批
- **WHEN** 前端展示 `1.2 项目立项审批表` 的退回能力
- **THEN** 本 change MUST 只规划审批 NO 后对 `1.1` 的精准返工选择
- **AND** 页面 MUST NOT 因本 change 新增商务评价、技术评价、总经理多节点在线审批流程 UI
