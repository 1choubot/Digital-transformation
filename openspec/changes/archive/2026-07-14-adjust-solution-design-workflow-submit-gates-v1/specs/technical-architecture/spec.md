## ADDED Requirements

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
- **AND** 架构 MUST 记录操作人、操作时间和原因或备注
- **AND** 架构 MUST 将该状态提供给 DTO、提交门禁、C04-C19 派生、工作台待办和 operation log
- **AND** 重新上传已豁免槽位文件时 MUST 自动清除该槽位豁免并写入 operation log

#### Scenario: 自动推进消费统一派生结果
- **WHEN** 后端判断方案设计阶段是否可自动推进到合同签订阶段
- **THEN** 架构 MUST 复用 C04-C19 派生齐套结果
- **AND** 架构 MUST NOT 在自动推进中重新实现一套不同的 C07-C14 上传或豁免判断

#### Scenario: 保持边界
- **WHEN** 实现本 change 的三批门禁调整
- **THEN** 架构 MUST NOT 改报价单在线表单生成规则
- **AND** 架构 MUST NOT 改合同签订阶段业务
- **AND** 架构 MUST NOT 改 8 大阶段或 71 项资料数量
- **AND** 架构 MUST NOT 重启旧关口审批作为主流程入口
