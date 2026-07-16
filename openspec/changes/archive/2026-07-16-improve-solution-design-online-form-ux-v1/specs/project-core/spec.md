## MODIFIED Requirements

### Requirement: 方案设计八项产出无需上传豁免
系统 MUST 支持 C07-C14 方案设计 8 个产出按单项标记“无需上传”，并 MUST 以“已上传或已豁免”判断方案设计节点提交门禁。

#### Scenario: 标记单项产出无需上传
- **WHEN** 技术负责人将某个方案设计产出标记为“无需上传”
- **THEN** 系统 MUST 记录豁免状态、操作人和操作时间
- **AND** 系统 MAY 记录空的原因或备注
- **AND** 系统 MUST 写入 operation log
- **AND** 系统 MUST NOT 删除该资料项或改变 71 项资料数量

#### Scenario: 已上传或已豁免均满足提交门禁
- **WHEN** 技术负责人提交方案设计节点
- **AND** C07-C14 每个产出均已上传 current file 或已标记无需上传
- **THEN** 系统 MUST 允许提交方案设计节点
- **AND** 被豁免的产出 MUST NOT 阻塞提交

#### Scenario: 重新上传自动取消无需上传豁免
- **WHEN** 某方案设计产出已标记无需上传
- **AND** 技术负责人对该产出重新上传文件
- **THEN** 系统 MUST 自动取消该产出的无需上传豁免
- **AND** 新上传文件 MUST 成为该产出的 current file
- **AND** 系统 MUST 写入重新上传取消豁免的 operation log

#### Scenario: 未上传且未豁免仍阻塞提交
- **WHEN** 技术负责人提交方案设计节点
- **AND** C07-C14 任一产出既没有 current file 也没有无需上传豁免
- **THEN** 系统 MUST 阻止提交方案设计节点
- **AND** 系统 MUST 返回缺失产出的明确门禁错误

#### Scenario: 豁免参与 C04-C19 派生齐套和自动推进
- **WHEN** 方案设计节点已批准
- **AND** C07-C14 产出通过 current file 或无需上传豁免满足门禁
- **THEN** 系统 MUST 将对应 C07-C14 资料派生为完成或等价满足状态
- **AND** 系统 MUST 在 C04-C19 阶段齐套和自动推进门禁中使用同一满足结果
- **AND** 系统 MUST NOT 因被豁免产出未上传文件而阻止第 2 阶段推进

#### Scenario: 工作台待办按豁免结果收敛
- **WHEN** 方案设计 8 个产出中某项已上传或已豁免
- **THEN** 系统 MUST NOT 为该产出继续生成待上传或待提交待办
- **AND** 未上传且未豁免的产出 MUST 继续生成技术负责人处理待办

## ADDED Requirements

### Requirement: 方案设计在线表单提交后自动尝试节点提交
项目核心能力 MUST 在 C05、C15、C16 在线表单提交并生成文件成功后自动尝试提交当前方案设计 workflow 节点，并 MUST 不因其他资料缺失而回滚已成功提交的在线表单。

#### Scenario: C05 表单和产品功能图齐套后自动提交节点
- **WHEN** 技术负责人提交 C05 项目方案分析表在线表单
- **AND** C05 生成文件成功
- **AND** C06 产品功能框图 current file 已满足当前门禁
- **THEN** 系统 MUST 自动提交 `solution_analysis` 节点
- **AND** 系统 MUST 将节点置为待研发中心负责人审批

#### Scenario: C05 缺产品功能图时只提交表单
- **WHEN** 技术负责人提交 C05 项目方案分析表在线表单
- **AND** C05 生成文件成功
- **AND** C06 产品功能框图未满足当前门禁
- **THEN** 系统 MUST 保持 C05 表单已提交和生成文件成功
- **AND** 系统 MUST NOT 自动提交 `solution_analysis` 节点
- **AND** 系统 MUST 返回产品功能框图缺失或等价缺项提示

#### Scenario: C15 C16 表单提交成功后自动进入待审批
- **WHEN** 技术负责人提交 C15 内部方案评审或 C16 客户方案评审在线表单
- **AND** 对应 Excel 生成文件成功
- **AND** 当前评审节点无其他提交门禁阻塞
- **THEN** 系统 MUST 自动提交对应评审节点
- **AND** 系统 MUST 将该节点置为待研发中心负责人审批

#### Scenario: 在线表单生成失败不推进节点
- **WHEN** C05、C15 或 C16 在线表单提交时生成文件失败
- **THEN** 系统 MUST 返回明确失败状态或业务错误
- **AND** 系统 MUST NOT 自动提交对应 workflow 节点
- **AND** 系统 MUST NOT 将节点显示为待审批

#### Scenario: 自动提交结果可解释
- **WHEN** C05、C15 或 C16 在线表单提交接口返回
- **THEN** 返回 DTO MUST 表达是否尝试自动提交、是否已提交节点、当前节点状态和阻塞原因
- **AND** 前端 MUST 能据此区分“表单已提交”与“节点已进入待审批”

#### Scenario: 自动提交复用完整节点提交编排
- **WHEN** C05、C15 或 C16 在线表单生成文件成功并触发自动提交
- **THEN** 系统 MUST 调用或抽取与手动提交方案设计 workflow 节点等价的提交编排
- **AND** 自动提交成功 MUST 产生与手动提交相同的节点状态更新、operation log、工作台待办收敛和阻塞原因更新
- **AND** 系统 MUST NOT 只手写局部节点状态来绕过既有提交流程

#### Scenario: C18 报价单提交口径保持
- **WHEN** 商务负责人提交 C18 报价单在线表单
- **THEN** 系统 MUST 继续按当前报价单生成 Word 文件和报价结果处理门禁执行
- **AND** 若生成失败，系统 MUST NOT 处理报价结果或完成 C18

### Requirement: C15 C16 方案评审实施计划结构化联动
项目核心能力 MUST 将 C15/C16 方案评审记录表的项目实施计划保存为结构化计划项，并 MUST 由项目需求分析、项目目标描述、项目风险评估和项目方案建议的来源条目自动生成计划项。

#### Scenario: 四类来源字段生成计划项
- **WHEN** 用户保存或提交 C15/C16 方案评审记录表
- **THEN** 系统 MUST 从项目需求分析非空来源条目生成 `需求1`、`需求2` 等计划项
- **AND** 系统 MUST 从项目目标描述非空来源条目生成 `目标1`、`目标2` 等计划项
- **AND** 系统 MUST 从项目风险评估非空来源条目生成 `风险1`、`风险2` 等计划项
- **AND** 系统 MUST 从项目方案建议非空来源条目生成 `建议1`、`建议2` 等计划项
- **AND** 系统 MUST 忽略空来源条目
- **AND** 系统 MAY 对 legacy 字符串 payload 按非空行兼容拆分

#### Scenario: 提交时必须填写每个计划项
- **WHEN** 技术负责人提交 C15/C16 方案评审记录表
- **AND** 任一自动生成计划项缺少实施计划内容
- **THEN** 系统 MUST 拒绝提交
- **AND** 系统 MUST 返回缺少实施计划内容的明确错误

#### Scenario: 草稿允许计划项部分填写
- **WHEN** 技术负责人保存 C15/C16 方案评审记录表草稿
- **THEN** 系统 MAY 保存未填完整的结构化实施计划
- **AND** 系统 MUST 仍校验 payload 结构、文本长度和来源项一致性

#### Scenario: 来源变化时保留或清理计划项
- **WHEN** 用户修改 C15/C16 的项目需求分析、项目目标描述、项目风险评估或项目方案建议
- **THEN** 系统 MUST 按当前非空来源条目重新生成计划项
- **AND** 当 payload 包含 `implementationPlanItems` 时，系统 MUST 保留用户提交的空 `planText` 并在提交时按必填规则校验
- **AND** 系统 MUST 仅在 payload 完全没有 `implementationPlanItems` 时从旧 `actionItems` 兼容迁移计划内容
- **AND** 同一 `sourceType` 的来源条目数量未变化时，系统 MUST 优先按 `sourceType + sourceIndex` 保留同位置 `planText`
- **AND** 来源文本编辑后出现重复 `sourceText` 时，系统 MUST NOT 因文本匹配抢占其他同文案条目的 `planText`
- **AND** 同一 `sourceType` 的来源条目数量发生增删时，系统 SHOULD 优先按同一 `sourceType + sourceText` 保留 `planText`，避免来源条目删除或插入后计划内容串行
- **AND** 来源条目删除后对应计划项 MUST 删除
- **AND** 新增来源条目后对应计划项 MUST 以空 `planText` 创建，并在提交时要求补齐

#### Scenario: Excel 生成拼接结构化实施计划
- **WHEN** C15/C16 方案评审记录表提交并生成 Excel 文件
- **THEN** 系统 MUST 将结构化计划项按需求、目标、风险、建议的固定来源顺序拼接写入模板当前“项目实施计划”单元格
- **AND** 系统 MUST 将项目需求分析来源条目写入 B9-B11
- **AND** 第 1 条项目需求分析 MUST 写入 B9
- **AND** 第 2 条项目需求分析 MUST 写入 B10
- **AND** 第 3 条及后续项目需求分析 MUST 按现有 `repeatRows` 规则合并写入 B11
- **AND** 系统 MUST NOT 丢弃超过 3 条的项目需求分析内容
- **AND** 生成内容 MUST 固定按需求、目标、风险、建议顺序输出
- **AND** 每项 MUST 使用 `需求1：实施计划内容`、`目标1：实施计划内容`、`风险1：实施计划内容`、`建议1：实施计划内容` 等格式
- **AND** 每项 MUST 使用 Excel 单元格换行分隔
- **AND** C15 和 C16 MUST 使用各自当前 revision 的结构化计划，不得串用数据

### Requirement: 报价结果处理三动作口径
项目核心能力 MUST 将报价结果处理表达为客户接受报价、结束项目、审批不通过三个业务动作，并 MUST 复用现有报价结果状态机。

#### Scenario: 客户接受报价
- **WHEN** 商务负责人选择客户接受报价
- **THEN** 系统 MUST 按现有 `accepted` 报价结果处理
- **AND** 系统 MUST 将报价/投标节点置为已通过

#### Scenario: 结束项目
- **WHEN** 商务负责人选择结束项目
- **THEN** 系统 MUST 按现有 `rejected` + `end_project` 处理
- **AND** 系统 MUST 标记项目已结束并阻止合同签订及后续阶段操作

#### Scenario: 审批不通过
- **WHEN** 商务负责人选择审批不通过
- **THEN** 系统 MUST 按现有 `rejected` + `return_to_rd_cost` 处理
- **AND** 系统 MUST 返回研发成本估算节点并重新走成本链路

#### Scenario: 原因要求沿用现有规则
- **WHEN** 结束项目或审批不通过动作需要原因
- **THEN** 系统 MUST 使用现有 return reason 校验规则
- **AND** 系统 MUST NOT 引入新的报价结果状态枚举
