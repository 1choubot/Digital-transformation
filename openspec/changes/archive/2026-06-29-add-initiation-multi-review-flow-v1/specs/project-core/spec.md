## MODIFIED Requirements

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、当前 20260625 64 项项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入，并 MUST NOT 因 `projectCode` 为空拒绝创建。`1.2 项目立项审批表` 后置项目编号门禁 MUST 使用专用多节点最终通过状态，而不是普通单资料 `confirmed` 状态。

#### Scenario: 后置项目编号触发点

- **WHEN** `1.2 项目立项审批表` 的商务评价审批、技术评价审批和总经理审批均最终通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **AND** `1.1 项目需求表` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **AND** `1.2 项目立项审批表` 不存在待审、退回、未通过或其他专用多节点阻塞状态
- **THEN** 系统 MUST 允许具备项目维护权限、项目经理权限或等价业务项目编号维护权限的用户填写或生成 `projectCode`
- **AND** 系统 MUST NOT 将仅系统管理员身份解释为业务项目编号维护权限

#### Scenario: 单节点通过不得填写项目编号

- **WHEN** `1.2 项目立项审批表` 只有商务评价、技术评价或总经理审批中的单个节点通过
- **THEN** 系统 MUST NOT 因该单节点通过允许填写或生成 `projectCode`
- **AND** 系统 MUST 返回可理解的门禁未满足原因

### Requirement: 阶段推进齐套门禁

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化，并 MUST 只按当前阶段适用资料的 `completionMode`、基础状态、适用性、`revision_required` 和特殊资料派生完成规则判断阶段推进门禁；`1.2 项目立项审批表` MUST 由专用多节点最终审批状态派生完成，不得只按普通单资料 `confirmed` 判断。

#### Scenario: 1.2 多节点未全通过阻塞推进

- **WHEN** 第 1 阶段包含适用的 `1.2 项目立项审批表`
- **AND** 商务评价审批、技术评价审批或总经理审批中任一必需节点尚未通过
- **THEN** 系统 MUST 将 `1.2` 视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进

#### Scenario: 1.2 单个中心负责人确认不放行

- **WHEN** `1.2 项目立项审批表` 已被某个中心负责人或单个资料审核动作确认
- **AND** `1.2` 的商务评价、技术评价和总经理审批尚未全部最终通过
- **THEN** 系统 MUST NOT 将 `1.2` 计为阶段齐套完成
- **AND** 系统 MUST NOT 因该单次确认允许第 1 阶段推进

#### Scenario: 1.2 相关返工阻塞推进

- **WHEN** `1.2 项目立项审批表` 退回已触发 `1.1 项目需求表` 精准返工
- **AND** `1.1` 存在未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 相关门禁视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进
- **AND** 系统 MUST NOT 要求或依赖 `1.2 revision_required` 表达该阻塞

#### Scenario: 1.2 自身状态阻塞推进

- **WHEN** `1.2 项目立项审批表` 存在待审、退回、未通过或其他专用多节点阻塞状态
- **THEN** 系统 MUST 将 `1.2` 视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进
- **AND** 系统 MUST NOT 将 `1.2` 自身作为返工目标写入 `revision_required`

#### Scenario: 1.2 多节点全部通过后参与普通齐套

- **WHEN** `1.2 项目立项审批表` 商务评价、技术评价和总经理审批均最终通过
- **AND** `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 按专用派生完成规则计为已完成
- **AND** 第 1 阶段仍 MUST 继续检查其他适用资料是否按各自 `completionMode` 完成

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核、`1.2` 专用多节点审批和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份；当前内部资料闭环 MUST NOT 返回泛化阶段关口审批待办，且 MUST 将有责任人的精准返工资料纳入资料责任待办。

#### Scenario: 1.2 商务评价待办只给营销中心负责人

- **WHEN** `1.2 项目立项审批表` 进入商务评价审批节点
- **THEN** 工作台 MUST 只向营销中心负责人返回对应待办
- **AND** 工作台 MUST NOT 因用户是任意中心负责人而返回该待办

#### Scenario: 1.2 技术评价待办只给研发中心负责人

- **WHEN** `1.2 项目立项审批表` 进入技术评价审批节点
- **THEN** 工作台 MUST 只向研发中心负责人返回对应待办
- **AND** 工作台 MUST NOT 因用户是任意中心负责人而返回该待办

#### Scenario: 1.2 商务技术并行待办同时出现

- **WHEN** `1.2 项目立项审批表` 基础状态达到 `submitted`
- **OR** 既有兼容数据中的 `1.2` 基础状态为 `confirmed`
- **THEN** 工作台 MUST 同时向营销中心负责人返回 `business_review` 待办、向研发中心负责人返回 `technical_review` 待办
- **AND** 当营销中心负责人查询工作台时，系统 MUST 返回 `business_review` 待办
- **AND** 当研发中心负责人查询工作台时，系统 MUST 返回 `technical_review` 待办
- **AND** 二者 MUST NOT 互相等待或互相阻塞

#### Scenario: 1.2 未提交不生成商务技术待办

- **WHEN** `1.2 项目立项审批表` 基础状态为 `not_submitted`
- **AND** `business_review`、`technical_review` 和 `general_review` 节点已预创建
- **THEN** 工作台 MUST NOT 向营销中心负责人返回 `business_review` 待办
- **AND** 工作台 MUST NOT 向研发中心负责人返回 `technical_review` 待办

#### Scenario: 1.2 returned 重新提交前不生成商务技术待办

- **WHEN** `1.2 项目立项审批表` 基础状态为 `returned`
- **THEN** 工作台 MUST NOT 向营销中心负责人返回 `business_review` 待办
- **AND** 工作台 MUST NOT 向研发中心负责人返回 `technical_review` 待办
- **AND** 系统 MUST 等待普通 `1.2` 资料重新提交后再激活商务评价和技术评价审批
- **AND** 该 `returned` 只表示历史或兼容的普通资料基础状态 `returned`
- **AND** 系统 MUST NOT 将 `business_review`、`technical_review` 或 `general_review` 节点退回映射为普通资料基础状态 `returned`

#### Scenario: 1.2 总经理审批待办后置生成

- **WHEN** `1.2 项目立项审批表` 的商务评价审批和技术评价审批均已通过
- **THEN** 工作台 MUST 生成总经理审批待办
- **AND** 工作台 MUST 只向总经理返回对应待办
- **AND** 工作台 MUST NOT 向总经理助理、中心负责人或项目创建人自动返回该审批待办

#### Scenario: 1.2 总经理审批待办不得提前生成

- **WHEN** `business_review` 或 `technical_review` 任一节点尚未 `approved`
- **THEN** 工作台 MUST NOT 生成 `general_review` 总经理审批待办

#### Scenario: 1.2 多节点审批不恢复泛化阶段关口待办

- **WHEN** 系统生成 `1.2 项目立项审批表` 多节点审批待办
- **THEN** 工作台 MUST 使用专用 `1.2` 发起/审批待办类型或等价资料专项待办
- **AND** 工作台 MUST NOT 生成 `stage_gate_approval` 或泛化阶段关口审批待办

### Requirement: 在线平台项目编号后置

系统 MUST 支持项目创建初期没有正式项目编号，并 MUST 在 `1.2 项目立项审批表` 多节点最终审批通过且 `1.3 项目立项通知` 提交或上传完成后填写或生成正式 `projectCode`。

#### Scenario: 后置项目编号节点

- **WHEN** `1.2 项目立项审批表` 商务评价审批、技术评价审批和总经理审批均最终通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **AND** `1.1 项目需求表` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **AND** `1.2 项目立项审批表` 不存在待审、退回、未通过或其他专用多节点阻塞状态
- **THEN** 系统 MUST 允许填写或生成 `projectCode`
- **AND** 系统 MUST 沿用项目维护权限、项目经理或等价业务项目编号维护权限，不新增复杂权限模型
- **AND** 系统 MUST NOT 因当前用户仅具备系统管理员身份而允许填写或生成 `projectCode`

#### Scenario: 商务或技术单独通过不生成编号

- **WHEN** `1.2 项目立项审批表` 仅商务评价审批通过或仅技术评价审批通过
- **THEN** 系统 MUST NOT 将项目编号填写门禁视为满足
- **AND** 系统 MUST NOT 因单个节点通过提前生成正式 `projectCode`

#### Scenario: 系统管理员不默认拥有项目编号填写权限

- **WHEN** 当前用户仅具备系统管理员身份
- **AND** 不具备项目维护权限、项目经理权限或等价业务项目编号维护权限
- **THEN** 系统 MUST NOT 允许其填写或生成 `projectCode`
- **AND** 系统 MUST NOT 将系统管理员平台维护职责解释为业务项目编号维护职责

## ADDED Requirements

### Requirement: 1.2 项目立项多节点审批

系统 MUST 将 `1.2 项目立项审批表` 规划为专用多节点审批资料；该能力只适用于 `1.2`，不得扩展为通用审批流引擎。

#### Scenario: 1.2 必须多节点最终通过

- **WHEN** 系统判断 `1.2 项目立项审批表` 是否最终完成
- **THEN** 系统 MUST 同时要求商务评价审批通过、技术评价审批通过和总经理审批通过
- **AND** 系统 MUST 要求 `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **AND** 系统 MUST 要求 `1.2` 自身不存在待审、退回、未通过或其他专用多节点阻塞状态

#### Scenario: 1.2 保持在 64 项模板内

- **WHEN** 系统规划或初始化 20260625 阶段资料模板
- **THEN** `1.2 项目立项审批表` MUST 仍是 64 项普通阶段资料之一
- **AND** `1.2` MUST 仍计入既有 `approval_required` 数量口径

#### Scenario: 既有项目初始化 1.2 审批节点

- **WHEN** 后续 migration 或幂等初始化逻辑处理既有项目中适用的 `1.2 项目立项审批表`
- **THEN** 系统 MUST 创建 `business_review`、`technical_review` 和 `general_review` 三类专用审批节点
- **AND** 当 `1.2 status = not_submitted` 时，`business_review` 和 `technical_review` MUST 等待资料提交且不得生成审批待办，`general_review` MUST 为未开始或等待前置
- **AND** 当 `1.2 status = submitted` 时，`business_review` 和 `technical_review` MUST 初始化为待处理或可处理状态，`general_review` MUST 为未开始或等待前置
- **AND** 当既有 `1.2 status = confirmed` 时，系统 MUST 将其作为资料已提交过的兼容输入，使 `business_review` 和 `technical_review` 初始化为待处理或可处理状态，`general_review` MUST 为未开始或等待前置
- **AND** 当 `1.2 status = returned` 时，`business_review` 和 `technical_review` MUST 等待普通 `1.2` 资料重新提交且不得生成审批待办

#### Scenario: 旧 confirmed 不得绕过多节点门禁

- **WHEN** 既有项目的 `1.2 项目立项审批表` 在普通资料状态中已经是 `confirmed`
- **AND** 专用多节点审批尚未满足 `business_review approved`、`technical_review approved` 和 `general_review approved`
- **THEN** 系统 MUST NOT 将旧 `confirmed` 解释为 `1.2` 多节点最终通过
- **AND** 系统 MUST NOT 因旧 `confirmed` 放行第 1 阶段推进或项目编号填写门禁

#### Scenario: 商务技术并行审批

- **WHEN** `1.2 项目立项审批表` 基础状态达到 `submitted`
- **OR** 既有兼容数据中的 `1.2` 基础状态为 `confirmed`
- **THEN** `business_review` 和 `technical_review` MUST 并行进入可处理状态
- **AND** 系统 MUST NOT 要求商务评价先于技术评价或技术评价先于商务评价

#### Scenario: 普通 1.2 资料提交激活多节点审批

- **WHEN** 用户通过既有资料提交或上传入口将 `1.2 项目立项审批表` 基础状态提交为 `submitted`
- **THEN** 系统 MUST 激活 `business_review` 和 `technical_review`
- **AND** 系统 MUST NOT 要求前端调用单独的 `1.2` 节点提交动作
- **AND** `general_review` MUST 继续等待商务评价和技术评价均通过

#### Scenario: 审批人规则已确认

- **WHEN** 系统设计 `1.2` 商务评价审批人和技术评价审批人
- **THEN** 商务评价审批人 MUST 固定为营销中心负责人
- **AND** 技术评价审批人 MUST 固定为研发中心负责人
- **AND** 总经理审批人 MUST 为总经理

#### Scenario: 总经理节点前置条件

- **WHEN** `business_review` 和 `technical_review` 均已 `approved`
- **THEN** 系统 MUST 生成或激活 `general_review`
- **AND** 在二者均通过前，`general_review` MUST 保持未开始、等待前置或不可处理状态

#### Scenario: 商务退回保留技术通过并失效总经理节点

- **WHEN** `business_review` 被退回
- **THEN** `business_review` MUST 进入退回阻塞状态，并在关联 `1.1` 返工清除后由后端自动回到待处理或可处理状态
- **AND** 系统 MUST NOT 将 `1.2` 普通资料基础状态置为 `returned`
- **AND** 已 `approved` 的 `technical_review` MUST 保留通过结果
- **AND** 已生成或已通过的 `general_review` MUST 失效、清空或回到 `not_started`

#### Scenario: 技术退回保留商务通过并失效总经理节点

- **WHEN** `technical_review` 被退回
- **THEN** `technical_review` MUST 进入退回阻塞状态，并在关联 `1.1` 返工清除后由后端自动回到待处理或可处理状态
- **AND** 系统 MUST NOT 将 `1.2` 普通资料基础状态置为 `returned`
- **AND** 已 `approved` 的 `business_review` MUST 保留通过结果
- **AND** 已生成或已通过的 `general_review` MUST 失效、清空或回到 `not_started`

#### Scenario: 总经理退回保留商务技术通过

- **WHEN** `general_review` 被退回
- **THEN** `general_review` MUST 进入退回阻塞状态，并在关联 `1.1` 返工清除后由后端自动回到待处理或可处理状态
- **AND** 系统 MUST NOT 将 `1.2` 普通资料基础状态置为 `returned`
- **AND** 已 `approved` 的 `business_review` 和 `technical_review` MUST 保留通过结果

#### Scenario: 节点退回返工清除后无需普通 1.2 重新提交

- **WHEN** `business_review`、`technical_review` 或 `general_review` 节点退回并触发 `1.1 revision_required`
- **AND** `1.1 revision_required` 已清除
- **THEN** 系统 MUST 按专用节点状态自动将被退回节点回到待审批或可处理状态
- **AND** 系统 MUST 将该节点重新返回给对应节点审批人的待办
- **AND** 系统 MUST NOT 要求普通 `1.2` 资料重新提交

#### Scenario: 不放宽业务操作权限

- **WHEN** 总经理助理、中心负责人、项目创建人或项目经理因项目查看规则能查看项目和 `1.2` 状态
- **THEN** 系统 MUST NOT 因查看权限授予其商务评价、技术评价或总经理审批操作权限

#### Scenario: 不处理文件平台和推送

- **WHEN** 系统处理 `1.2` 多节点审批
- **THEN** 系统 MUST NOT 调用文件管理平台
- **AND** 系统 MUST NOT 因节点状态变化发送推送通知、站内信、短信或邮件
