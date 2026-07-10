## ADDED Requirements

### Requirement: 自动阶段推进记录业务日志
系统 SHALL write operation logs when a project stage is automatically advanced.

#### Scenario: 自动推进写 stage.advanced 日志
- **WHEN** 系统自动推进项目阶段
- **THEN** 系统 SHALL 写入 `stage.advanced` 业务日志
- **AND** 日志 SHALL 记录推进前阶段、推进后阶段和阶段齐套摘要
- **AND** 日志 SHALL 标明推进方式为系统自动推进
- **AND** 由用户业务动作触发的自动推进 SHALL 使用触发动作用户作为 `actorUserId`

#### Scenario: 自动推进日志记录触发来源
- **WHEN** 自动推进由业务动作触发
- **THEN** 日志 metadata SHALL 记录触发动作类型
- **AND** metadata SHALL include `advanceMode: automatic`
- **AND** metadata SHALL include `triggerAction`
- **AND** 如适用，metadata SHALL 记录触发的 documentCode、nodeKey、stageOrder 或 actionType
- **AND** 日志 SHALL NOT 记录敏感 storageKey 或内部文件路径

#### Scenario: 后台任务 actor 另行定义
- **WHEN** 未来需要后台修复任务触发自动推进
- **THEN** 系统 SHALL first define a system actor policy in a separate design
- **AND** 系统 SHALL NOT silently invent an actorUserId for background automatic advance

#### Scenario: 自动推进失败不写成功日志
- **WHEN** 业务动作触发自动推进判断
- **AND** 阶段齐套门禁已满足
- **AND** 自动推进发生系统错误
- **THEN** 系统 SHALL NOT 写入成功的 `stage.advanced` 日志
- **AND** 系统 SHALL 在同一事务中回滚触发业务动作和自动推进
- **AND** 系统 SHALL 返回受控错误

### Requirement: 第 8 阶段自动完成项目记录日志
系统 SHALL write project completion logs when the final stage is automatically completed.

#### Scenario: 第 8 阶段齐套后写完成日志
- **WHEN** 第 8 阶段齐套后系统自动完成项目
- **THEN** 系统 SHALL 写入项目完成日志
- **AND** 日志 SHALL 标明该完成由自动阶段推进触发
