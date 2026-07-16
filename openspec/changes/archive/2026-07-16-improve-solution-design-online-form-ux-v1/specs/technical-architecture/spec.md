## MODIFIED Requirements

### Requirement: 方案设计在线表单生成架构
技术架构 MUST 复用立项阶段在线表单和模板文件生成机制支持项目方案分析表、C15 内部方案评审记录表、C16 客户方案评审记录表和 C18 报价单，并 MUST 支持 C05/C15/C16 表单提交生成成功后的节点自动提交尝试。

#### Scenario: 项目方案分析表在线表单
- **WHEN** 项目方案分析表通过在线表单生成文件
- **THEN** 架构 MUST 支持在线表单保存、提交、审批前置状态和模板文件生成状态
- **AND** 模板文件生成 MUST 使用 `项目方案分析表-模板.xlsx`
- **AND** 表单提交生成成功后 MUST 复用 `solution_analysis` 节点提交编排和门禁自动尝试提交节点
- **AND** 产品功能框图缺失时 MUST 保留表单提交成功并返回缺项结果

#### Scenario: C15 C16 方案评审记录表多上下文
- **WHEN** 内部方案评审和客户方案评审记录通过在线表单生成文件
- **THEN** 架构 MUST 保留 C15 方案评审记录表（内部方案评审）和 C16 方案评审记录表（客户方案评审）两个独立产出/资料项
- **AND** 架构 MUST 支持二者复用同一 `方案评审记录表-模板.xlsx` 在不同评审类型或节点上下文下生成文件
- **AND** 架构 MUST 分别保留 C15 和 C16 的多次评审记录版本、审批历史和最新有效版本
- **AND** 架构 MUST NOT 将 C15 和 C16 合并为一个资料项或减少 71 项资料数量
- **AND** 表单提交生成成功后 MUST 复用对应 review 节点提交编排和门禁自动尝试提交节点

#### Scenario: C18 报价单 Word 模板生成
- **WHEN** 报价单在线表单提交并生成文件
- **THEN** 架构 MUST 支持在线表单保存、提交、生成状态、生成失败原因和生成文件下载状态
- **AND** 报价单生成 MUST 使用 `报价单-模板.docx`
- **AND** 报价单生成文件格式 MUST 为 `.docx`
- **AND** 后端 SHOULD 复用现有 `renderDocxTemplate()` 或同等 OOXML 渲染能力
- **AND** 后端 MUST NOT 为报价单生成引入外部文档服务或浏览器端模板填充

#### Scenario: 不在前端填充模板
- **WHEN** 用户查看或下载项目方案分析表、方案评审记录表或报价单生成文件
- **THEN** 前端 MUST 只调用后端状态、查看或下载接口
- **AND** 前端 MUST NOT 维护 Excel 单元格、Word 表格或 Word 文本替换映射

### Requirement: 方案设计提交门禁调整架构
技术架构 MUST 统一方案设计 workflow 的上传槽有效性、分支选择、豁免状态、待办、日志和自动推进判断，避免多套门禁结果。

#### Scenario: 上传槽有效性不只依赖节点 current revision
- **WHEN** 后端判断退回后的方案设计上传槽是否满足提交门禁
- **THEN** 架构 MUST 使用 current file 有效性判断
- **AND** 架构 MUST NOT 仅以文件 revision 等于节点 current revision 作为唯一门禁
- **AND** 架构 MUST 继续防止非 current 历史文件绕过门禁
- **AND** 架构 MUST 覆盖 C17 研发、制造、财务/运营成本估算上传槽在总经理退回后的重提门禁

#### Scenario: 分支选择和财务总经理审批同事务
- **WHEN** 总经理审批通过财务成本估算并选择报价或投标
- **THEN** 架构 MUST 在同一事务中完成审批状态更新、分支记录、下一节点激活和 operation log
- **AND** 失败时 MUST 回滚审批通过和分支选择
- **AND** 后续报价/投标节点 MUST 消费已记录分支，而不是创建第二套选择状态
- **AND** 旧报价/投标节点分支选择接口 MUST 在分支已存在时拒绝重复选择，不改状态且不写新的成功选择日志

#### Scenario: 方案设计产出豁免状态集中记录
- **WHEN** 系统支持 C07-C14 单项无需上传
- **THEN** 架构 MUST 将豁免状态与对应方案设计上传槽或等价 workflow 对象绑定
- **AND** 架构 MUST 记录操作人和操作时间
- **AND** 架构 MAY 记录空的原因或备注
- **AND** 架构 MUST 将该状态提供给 DTO、提交门禁、C04-C19 派生、工作台待办和 operation log
- **AND** 重新上传已豁免槽位文件时 MUST 自动清除该槽位豁免并写入 operation log

#### Scenario: 自动推进消费统一派生结果
- **WHEN** 后端判断方案设计阶段是否可自动推进到合同签订阶段
- **THEN** 架构 MUST 复用 C04-C19 派生齐套结果
- **AND** 架构 MUST NOT 在自动推进中重新实现一套不同的 C07-C14 上传或豁免判断

## ADDED Requirements

### Requirement: 方案设计在线表单自动提交结果架构
技术架构 MUST 将 C05/C15/C16 表单提交、模板生成和节点自动提交尝试作为一个后端编排结果返回，并 MUST 复用现有完整节点提交编排和门禁。

#### Scenario: 自动提交复用完整节点提交编排
- **WHEN** C05、C15 或 C16 表单生成文件成功
- **THEN** 后端 MUST 调用或抽取现有手动节点提交编排
- **AND** 后端 MUST 复用现有节点提交门禁、状态更新、operation log、工作台待办收敛和 blocking reason 更新
- **AND** 后端 MUST NOT 复制一套独立的表单专用节点提交判断
- **AND** 后端 MUST NOT 只手写局部节点状态来模拟提交成功

#### Scenario: 自动提交结果 DTO
- **WHEN** C05、C15 或 C16 表单提交接口返回
- **THEN** DTO MUST 包含表单提交状态、生成文件状态和自动节点提交结果
- **AND** 自动节点提交结果 MUST 能表达 attempted、submitted、node status 和 blocking reasons

#### Scenario: 失败边界
- **WHEN** 生成文件失败或节点自动提交失败
- **THEN** 后端 MUST 保留可解释状态
- **AND** 生成失败 MUST 阻止节点自动提交
- **AND** 节点门禁失败 MUST NOT 回滚已成功生成的表单文件

### Requirement: C15 C16 结构化实施计划架构
技术架构 MUST 在 C15/C16 表单 JSON payload 中保存结构化 `implementationPlanItems`，并 MUST 在后端根据来源字段重新 normalize。

#### Scenario: 后端重新生成来源项
- **WHEN** 后端保存或提交 C15/C16 表单 payload
- **THEN** 后端 MUST 根据项目需求分析、项目目标描述、项目风险评估和项目方案建议重新计算来源项
- **AND** 后端 MUST 忽略前端提交的不存在来源项
- **AND** 当 payload 包含 `implementationPlanItems` 时，后端 MUST 保留用户提交的空 `planText` 并在提交时按必填规则校验
- **AND** 后端 MUST 仅在 payload 完全没有 `implementationPlanItems` 时从旧 `actionItems` 兼容迁移计划内容
- **AND** 同一 `sourceType` 的来源条目数量未变化时，后端 MUST 优先按 `sourceType + sourceIndex` 保留同位置 `planText`
- **AND** 来源文本编辑后出现重复 `sourceText` 时，后端 MUST NOT 因文本匹配抢占其他同文案条目的 `planText`
- **AND** 同一 `sourceType` 的来源条目数量发生增删时，后端 SHOULD 优先按同一 `sourceType + sourceText` 保留与有效来源项匹配的实施计划内容
- **AND** 来源条目删除后后端 MUST 删除对应计划项
- **AND** 来源条目新增后后端 MUST 创建空 `planText` 计划项

#### Scenario: 不新增 migration
- **WHEN** 实现结构化实施计划
- **THEN** 架构 MUST 优先使用现有表单 JSON 存储
- **AND** 架构 MUST NOT 为第一版结构化实施计划新增数据库 migration

#### Scenario: 模板渲染保持后端负责
- **WHEN** C15/C16 生成 Excel 文件
- **THEN** 后端 MUST 将项目需求分析映射为 B9-B11 `repeatRows`
- **AND** 超过 3 条项目需求分析时，后端 MUST 沿用现有 `repeatRows` 规则将第 3 条及后续内容合并到 B11
- **AND** 后端 MUST 将结构化计划拼接为模板当前单元格文本
- **AND** 拼接顺序 MUST 固定为需求、目标、风险、建议
- **AND** 每项 MUST 使用 `需求1：内容` 等标签加中文冒号格式，并以 Excel 单元格换行分隔
- **AND** 前端 MUST NOT 维护 Excel 单元格映射

### Requirement: 报价结果按钮 payload 架构
技术架构 MUST 将报价结果三个按钮映射到现有报价结果 API payload，避免引入新的报价结果状态机。

#### Scenario: 三按钮 payload 映射
- **WHEN** 前端提交报价结果
- **THEN** 客户接受报价 MUST 映射为现有 `accepted`
- **AND** 结束项目 MUST 映射为现有 `rejected` + `end_project`
- **AND** 审批不通过 MUST 映射为现有 `rejected` + `return_to_rd_cost`

#### Scenario: 后端状态机不新增枚举
- **WHEN** 实现报价结果三按钮
- **THEN** 后端 MUST 继续使用现有报价结果和拒绝动作枚举
- **AND** 后端 MUST NOT 新增第三套报价审批状态
