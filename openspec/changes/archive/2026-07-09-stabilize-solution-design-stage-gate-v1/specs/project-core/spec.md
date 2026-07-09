## ADDED Requirements

### Requirement: 方案设计资料派生完成接入阶段齐套
系统 MUST 将方案设计专用 workflow 的完成状态纳入第 2 阶段 C04-C19 的派生完成规则，并 MUST 在阶段齐套和阶段推进门禁中使用该派生结果。

#### Scenario: C04-C17 由专用 workflow 派生完成
- **WHEN** 系统计算方案设计阶段资料齐套
- **THEN** C04 方案设计工作计划 MUST 由方案设计准备节点 `approved` 派生完成
- **AND** C05 项目方案分析表 MUST 由项目方案分析节点 `approved` 且当前 revision 表单生成文件成功派生完成
- **AND** C06 产品功能框图 MUST 由项目方案分析节点 `approved` 且当前 revision 产品功能框图已上传派生完成
- **AND** C07 3D模型 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C08 布局图 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C09 工艺时序图 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C10 节拍表 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C11 演示动画 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C12 电气功能框图 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C13 软件功能框图 MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C14 项目方案PPT MUST 由方案设计节点 `approved` 且当前 revision 对应上传槽齐套派生完成
- **AND** C15 内部方案评审记录表 MUST 由内部方案评审节点 `approved` 且当前 revision 生成文件成功派生完成
- **AND** C16 客户方案评审记录表 MUST 由客户方案评审节点 `approved` 且当前 revision 生成文件成功派生完成
- **AND** C17 成本估算表 MUST 由研发、制造、财务成本估算三段均 `approved` 派生完成

#### Scenario: C07-C14 归属方案设计专用节点
- **WHEN** 系统派生 C07-C14 方案设计产出完成状态
- **THEN** 系统 MUST 按已归档方案设计 workflow 口径将 C07-C14 归属 `solution_design` 节点
- **AND** 系统 MUST NOT 回退到旧普通资料节点口径判断 C07-C14 是否完成

#### Scenario: 专用资料未完成时阻止阶段推进
- **WHEN** C04-C17 任一资料对应的专用 workflow 节点、上传槽、在线表单生成文件或审批结果未达到派生完成条件
- **THEN** 系统 MUST 将该资料计入第 2 阶段未齐套结果
- **AND** 系统 MUST 阻止第 2 阶段推进
- **AND** 系统 MUST 返回可解释的缺失或阻塞原因

#### Scenario: 普通资料基础状态不作为专用资料唯一真相
- **WHEN** C04-C19 的普通资料基础状态仍为 `not_submitted` 或其它未完成状态，但专用 workflow 已满足对应派生完成规则
- **THEN** 系统 MUST 允许该资料按派生完成结果参与阶段齐套
- **AND** 系统 MUST NOT 要求用户通过旧普通资料 submit/confirm/return 入口补齐这些资料

### Requirement: 报价投标分支资料不阻塞规则
系统 MUST 在 C18 报价单和 C19 投标书中按报价/投标分支派生完成或不适用结果，且 MUST 保持 71 项资料数量不变。

#### Scenario: 报价路径完成 C18 且 C19 不阻塞
- **WHEN** 报价/投标节点选择报价分支，且商务负责人确认客户接受报价
- **THEN** C18 报价单 MUST 派生完成
- **AND** C19 投标书 MUST 派生为不适用或等价不阻塞
- **AND** 系统 MUST NOT 因 C19 未上传投标书而阻止第 2 阶段推进
- **AND** 系统 MUST 使用当前分支、当前 revision 和当前报价/投标节点结果派生 C18/C19
- **AND** 系统 MUST NOT 复用历史报价或投标文件绕过当前 revision

#### Scenario: 投标路径完成 C19 且 C18 不阻塞
- **WHEN** 报价/投标节点选择投标分支，且投标经总经理审批通过
- **THEN** C19 投标书 MUST 派生完成
- **AND** C18 报价单 MUST 派生为不适用或等价不阻塞
- **AND** 系统 MUST NOT 因 C18 未上传报价单而阻止第 2 阶段推进
- **AND** 系统 MUST 使用当前分支、当前 revision 和当前报价/投标节点结果派生 C18/C19
- **AND** 系统 MUST NOT 复用历史报价或投标文件绕过当前 revision

#### Scenario: 分支未完成时阻止推进
- **WHEN** 报价/投标节点未选择分支，或已选择分支但报价未被接受或投标未审批通过
- **THEN** 系统 MUST 将报价/投标相关资料视为未满足阶段推进门禁
- **AND** 系统 MUST 阻止第 2 阶段推进

### Requirement: 方案设计阶段手工推进门禁
系统 MUST 在报价/投标通过后开放第 2 阶段手工推进门禁，但 MUST NOT 自动进入合同签订阶段。

#### Scenario: 报价投标通过后允许手工推进
- **WHEN** 方案设计 workflow 已满足 C04-C19 派生完成规则，且报价/投标节点已 `approved`
- **THEN** 系统 MUST 将第 2 阶段齐套视为满足
- **AND** 系统 MUST 允许有权限用户手工推进到第 3 阶段
- **AND** 系统 MUST 保持项目当前阶段不自动变化，直到用户执行阶段推进动作

#### Scenario: 不实现合同签订阶段业务
- **WHEN** 第 2 阶段齐套满足或 `canAdvanceToContract=true`
- **THEN** 系统 MUST NOT 将该状态解释为合同签订阶段业务已实现
- **AND** 系统 MUST NOT 自动创建合同签订阶段业务数据

### Requirement: 方案设计旧普通资料入口继续拒绝
系统 MUST 保持 C04-C19 旧普通资料 submit/confirm/return 入口拒绝，不能通过普通资料入口绕过方案设计专用 workflow。

#### Scenario: 直接调用普通资料入口被拒绝
- **WHEN** 用户直接调用普通资料提交、确认或退回接口处理 C04-C19
- **THEN** 系统 MUST 返回必须使用方案设计专用 workflow 的业务错误
- **AND** 系统 MUST NOT 改写专用 workflow 节点状态
- **AND** 系统 MUST NOT 通过普通资料状态让第 2 阶段齐套
