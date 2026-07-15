## ADDED Requirements

### Requirement: 方案设计退回后复用旧文件重提
系统 MUST 支持方案设计内部节点退回后复用当前有效上传文件重新提交，并 MUST 允许用户重新上传覆盖旧文件。

#### Scenario: 退回后旧 current 文件满足重提门禁
- **WHEN** 方案设计内部节点被退回并进入新一轮处理
- **AND** 某上传槽存在旧 revision 的 current file
- **AND** 该文件未被删除、未被替换且仍是该槽位 current file
- **THEN** 系统 MUST 允许该文件满足对应上传槽的重新提交门禁
- **AND** 系统 MUST NOT 仅因文件 revision 小于节点 current revision 而强制用户重新上传同一文件

#### Scenario: 财务成本估算总经理退回后成本文件可直接重提
- **WHEN** 财务成本估算被总经理退回并重新进入成本估算链路
- **AND** 研发成本估算、制造成本估算、财务/运营成本估算上传槽存在旧 revision 的 current file
- **AND** 这些文件未被删除、未被替换且仍是各自槽位 current file
- **THEN** 系统 MUST 允许研发、制造、财务成本节点直接使用这些旧 current file 重新提交或审批
- **AND** 系统 MUST NOT 强制用户重新上传相同的 C17 成本估算链路文件

#### Scenario: 重新上传覆盖旧文件
- **WHEN** 用户在退回后重新上传某上传槽文件
- **THEN** 新文件 MUST 成为该槽位 current file
- **AND** 新文件 MUST 优先满足后续提交、下载、派生完成和工作台待办计算
- **AND** 旧文件 MUST NOT 继续作为该槽位 current file 满足门禁

#### Scenario: 非 current 历史文件不得绕过门禁
- **WHEN** 某上传槽只存在历史文件但不存在 current file
- **THEN** 系统 MUST 阻止该槽位满足提交门禁
- **AND** 系统 MUST 返回明确缺失文件或节点不可提交错误

### Requirement: 财务成本估算审批选择报价投标分支
系统 MUST 在财务成本估算总经理审批通过时记录报价/投标分支，并 MUST 让报价/投标节点按已选分支继续处理。

#### Scenario: 总经理审批通过时选择报价分支
- **WHEN** 总经理审批通过财务成本估算
- **AND** 请求选择 `quotation` 分支
- **THEN** 系统 MUST 记录报价分支、选择人和选择时间
- **AND** 系统 MUST 激活报价/投标节点并进入报价流程处理
- **AND** 系统 MUST 记录财务成本估算审批通过和报价分支选择的 operation log

#### Scenario: 总经理审批通过时选择投标分支
- **WHEN** 总经理审批通过财务成本估算
- **AND** 请求选择 `tender` 分支
- **THEN** 系统 MUST 记录投标分支、选择人和选择时间
- **AND** 系统 MUST 激活报价/投标节点并进入投标流程处理
- **AND** 系统 MUST 记录财务成本估算审批通过和投标分支选择的 operation log

#### Scenario: 缺少分支选择时拒绝审批通过
- **WHEN** 总经理请求审批通过财务成本估算
- **AND** 请求未提供有效 `quotation` 或 `tender` 分支
- **THEN** 系统 MUST 拒绝审批通过
- **AND** 系统 MUST NOT 激活报价/投标节点
- **AND** 系统 MUST NOT 记录分支选择日志

#### Scenario: 报价投标节点不重复选择
- **WHEN** 项目进入报价/投标节点
- **AND** 财务成本估算总经理审批已记录分支
- **THEN** 报价/投标节点 MUST 根据已选分支展示报价流程或投标流程
- **AND** 系统 MUST NOT 再要求总经理在报价/投标节点重复选择分支

#### Scenario: 旧分支选择接口拒绝重复选择
- **WHEN** 财务成本估算总经理审批已记录报价或投标分支
- **AND** 用户调用旧报价/投标节点分支选择接口
- **THEN** 系统 MUST 拒绝该重复选择并返回明确业务错误
- **AND** 系统 MUST NOT 改变已记录分支、节点状态或报价/投标流程状态
- **AND** 系统 MUST NOT 写入新的分支选择成功 operation log

### Requirement: 方案设计八项产出无需上传豁免
系统 MUST 支持 C07-C14 方案设计 8 个产出按单项标记“无需上传”，并 MUST 以“已上传或已豁免”判断方案设计节点提交门禁。

#### Scenario: 标记单项产出无需上传
- **WHEN** 技术负责人将某个方案设计产出标记为“无需上传”
- **THEN** 系统 MUST 记录豁免状态、操作人、操作时间和原因或备注
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
