## ADDED Requirements

### Requirement: 方案设计阶段齐套展示使用派生结果
项目核心前端 MUST 使用后端返回的方案设计 C04-C19 派生完成状态展示第 2 阶段齐套情况和阶段推进入口。

#### Scenario: workflow 完成后阶段推进按钮可用
- **WHEN** 后端返回方案设计 workflow 已满足第 2 阶段 C04-C19 派生完成规则
- **THEN** 项目详情页 MUST 展示第 2 阶段齐套满足
- **AND** 对有权限用户 MUST 展示可用的阶段推进按钮
- **AND** 前端 MUST NOT 仅凭普通资料基础状态将阶段判断为未齐套

#### Scenario: workflow 未完成时展示派生阻塞
- **WHEN** 后端返回 C04-C19 中存在未满足派生完成规则的资料
- **THEN** 项目详情页 MUST 在缺失资料列表或阻塞原因中展示对应方案设计专用资料的派生状态
- **AND** 前端 MUST NOT 提示用户通过旧普通资料 submit/confirm/return 入口补齐 C04-C19

#### Scenario: 报价投标分支不适用展示
- **WHEN** 后端返回报价路径下 C19 不适用，或投标路径下 C18 不适用
- **THEN** 前端 MUST 将该不适用结果视为不阻塞阶段齐套
- **AND** 前端 MAY 展示该资料因分支选择不适用
- **AND** 前端 MUST NOT 将非当前分支资料列为缺失阻塞项

### Requirement: 合同签订门禁文案保持手工推进口径
项目核心前端 MUST 清楚表达 `canAdvanceToContract=true` 只是第 2 阶段手工推进门禁满足，不代表已经进入合同签订阶段。

#### Scenario: 门禁文案不暗示自动推进
- **WHEN** 方案设计报价/投标节点通过，且后端返回 `canAdvanceToContract=true`
- **THEN** 前端 MUST 展示可手工推进到合同签订阶段的提示
- **AND** 前端 MUST NOT 显示项目已自动进入合同签订阶段
- **AND** 前端 MUST NOT 展示合同签订阶段业务已完成或已初始化的承诺

### Requirement: C04-C19 普通资料入口仍不可绕过
项目核心前端 MUST 保持 C04-C19 的普通资料 submit/confirm/return 入口隐藏或禁用，并 MUST 引导用户使用方案设计专用 workflow。

#### Scenario: 专用资料不显示旧普通操作
- **WHEN** 用户在第 2 阶段查看 C04-C19 资料
- **THEN** 前端 MUST NOT 展示普通资料提交、普通资料确认或普通资料退回入口
- **AND** 前端 MUST 展示方案设计专用 workflow 节点入口或可读说明

#### Scenario: 普通入口异常失败提示
- **WHEN** 历史入口或异常路径触发普通资料操作且后端返回专用 workflow 错误
- **THEN** 前端 MUST 展示必须使用方案设计专用 workflow 的可读提示
- **AND** 前端 MUST 刷新阶段齐套和方案设计节点状态
