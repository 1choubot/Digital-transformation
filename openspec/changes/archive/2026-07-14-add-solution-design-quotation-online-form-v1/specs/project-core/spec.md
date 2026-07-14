## MODIFIED Requirements

### Requirement: 报价投标分支流程
系统 MUST 将报价/投标建模为方案设计阶段内的一个节点，并支持报价流程、投标流程和项目结束路径；报价流程的 C18 报价单 MUST 通过在线表单生成 Word 文件提交，投标流程仍使用商务标和技术标上传槽。

#### Scenario: 总经理选择报价或投标
- **WHEN** 财务成本估算总经理审批通过后进入报价/投标节点
- **THEN** 总经理 MUST 能选择报价流程或投标流程
- **AND** 系统 MUST 记录分支选择和选择时间
- **AND** 系统 MUST 根据选择生成对应待办

#### Scenario: 报价流程显示报价单在线表单
- **WHEN** 报价/投标节点选择报价流程
- **THEN** 报价节点 MUST 显示报价单在线表单
- **AND** 商务负责人 MUST 能按当前报价分支 revision 保存和提交报价单在线表单
- **AND** 系统 MUST NOT 要求新报价流程通过上传 `quotation_file` 文件提交 C18 报价单
- **AND** 报价分支选择后，系统 MUST NOT 将 `quotation_file` 作为可操作上传入口暴露
- **AND** 后端 MUST 拒绝报价分支下新的 `quotation_file` 上传并返回明确业务错误
- **AND** 系统 MUST NOT 使用旧 `quotation_file` 上传作为 C18 当前提交、下载或完成依据

#### Scenario: 报价单在线表单提交生成 Word 文件
- **WHEN** 商务负责人提交报价单在线表单
- **THEN** 系统 MUST 按 `报价单-模板.docx` 生成 `.docx` 报价单
- **AND** 生成文件 MUST 包含收件人、报价明细、总金额、大写金额、联系人、联系电话和报价日期等模板字段
- **AND** `TO` MUST 填写收件人人名，称谓 MUST 支持选择 `先生`、`女士` 或等价称谓
- **AND** 明细行 MUST 支持按用户填写的报价明细动态生成
- **AND** 数量 MUST 支持最多 4 位小数，单价、每行金额和总金额 MUST 使用人民币 2 位小数
- **AND** 每行金额 MUST 由后端根据数量和单价计算，并按四舍五入保留 2 位小数，不能信任前端提交的金额
- **AND** 总金额 MUST 由后端汇总已保留 2 位小数的每行金额计算
- **AND** 大写金额 MUST 由后端基于最终总金额按人民币大写金额规则计算
- **AND** 公司名和报价备注 MUST 使用模板固定内容
- **AND** 生成成功后，该生成文件 MUST 视为当前 revision 的 C18 报价资料已提交
- **AND** 系统 MUST 记录提交人、提交时间、生成状态和生成文件存储引用

#### Scenario: 报价单生成失败不得完成
- **WHEN** 商务负责人提交报价单在线表单但 Word 文件生成失败
- **THEN** 系统 MUST 返回明确的生成失败业务错误
- **AND** 系统 MUST NOT 将报价单显示为已完成或已提交
- **AND** 系统 MUST NOT 允许旧的报价生成文件或旧 `quotation_file` 上传绕过当前 revision 的报价单提交门禁

#### Scenario: 报价单生成文件下载
- **WHEN** 用户下载报价单
- **AND** 当前报价单在线表单已提交
- **AND** 当前 revision 生成文件状态为成功
- **AND** 生成文件 storage key 不为空且存储文件可读
- **THEN** 系统 MUST 下载生成后的 `.docx` 报价单
- **AND** 系统 MUST 使用 Word 文档 MIME 类型返回下载

#### Scenario: 报价流程被客户接受
- **WHEN** 商务负责人已提交并成功生成当前 revision 报价单
- **AND** 商务负责人在系统中确认报价被客户接受
- **THEN** 系统 MUST 将报价/投标节点置为已通过
- **AND** 系统 MUST 返回 `permissions.canAdvanceToContract=true`
- **AND** 系统 MUST 记录 `solution_design.ready_for_contract` 门禁日志
- **AND** 本 change MUST NOT 直接实现合同签订阶段业务

#### Scenario: 报价流程未被客户接受
- **WHEN** 客户不同意报价
- **THEN** 商务负责人 MUST 先线下与总经理讨论
- **AND** 商务负责人 MUST 在系统中选择退回研发成本估算或项目结束
- **AND** 选择退回研发成本估算时系统 MUST 重新走研发、制造、财务成本估算和报价/投标选择
- **AND** 选择项目结束时系统 MUST 标记项目已结束并阻止合同签订及后续阶段操作

#### Scenario: 投标流程审批通过
- **WHEN** 商务负责人上传投标商务标且技术负责人上传投标技术标
- **THEN** 系统 MUST 允许提交投标总经理审批
- **AND** 总经理审批通过后系统 MUST 将报价/投标节点置为已通过
- **AND** 系统 MUST 返回 `permissions.canAdvanceToContract=true`
- **AND** 系统 MUST 记录 `solution_design.ready_for_contract` 门禁日志
- **AND** 本 change MUST NOT 直接实现合同签订阶段业务
- **AND** 商务标和技术标 MUST 作为投标书产出下的两个必填上传槽处理

#### Scenario: 投标流程审批不通过
- **WHEN** 总经理审批不通过投标书
- **THEN** 系统 MUST 返回投标节点
- **AND** 商务标和技术标 MUST 重新提交
- **AND** 系统 MUST NOT 默认退回成本估算节点

### Requirement: 报价投标分支资料不阻塞规则
系统 MUST 在 C18 报价单和 C19 投标书中按报价/投标分支派生完成或不适用结果，且 MUST 保持 71 项资料数量不变。

#### Scenario: 报价路径完成 C18 且 C19 不阻塞
- **WHEN** 报价/投标节点选择报价分支
- **AND** 当前 revision 报价单在线表单已提交且 Word 生成文件成功
- **AND** 商务负责人确认客户接受报价
- **THEN** C18 报价单 MUST 派生完成
- **AND** C19 投标书 MUST 派生为不适用或等价不阻塞
- **AND** 系统 MUST NOT 因 C19 未上传投标书而阻止第 2 阶段推进
- **AND** 系统 MUST 使用当前分支、当前 revision、当前报价单生成文件和当前报价/投标节点结果派生 C18/C19
- **AND** 系统 MUST NOT 使用旧 `quotation_file` 上传或历史报价/投标文件绕过当前 revision

#### Scenario: 报价路径生成文件未成功时阻止推进
- **WHEN** 报价/投标节点选择报价分支
- **AND** 当前 revision 报价单在线表单未提交、生成状态不是成功、storage key 为空或存储文件不可读
- **THEN** C18 报价单 MUST 视为未完成
- **AND** 即使存在当前 revision 或历史 revision 的 `quotation_file` 上传，系统也 MUST NOT 将其作为 C18 完成依据
- **AND** 系统 MUST 阻止第 2 阶段推进

#### Scenario: 投标路径完成 C19 且 C18 不阻塞
- **WHEN** 报价/投标节点选择投标分支，且投标经总经理审批通过
- **THEN** C19 投标书 MUST 派生完成
- **AND** C18 报价单 MUST 派生为不适用或等价不阻塞
- **AND** 系统 MUST NOT 因 C18 未提交报价单在线表单而阻止第 2 阶段推进
- **AND** 系统 MUST 使用当前分支、当前 revision 和当前报价/投标节点结果派生 C18/C19
- **AND** 系统 MUST NOT 复用历史报价或投标文件绕过当前 revision

#### Scenario: 分支未完成时阻止推进
- **WHEN** 报价/投标节点未选择分支，或已选择分支但报价未被接受或投标未审批通过
- **THEN** 系统 MUST 将报价/投标相关资料视为未满足阶段推进门禁
- **AND** 系统 MUST 阻止第 2 阶段推进
