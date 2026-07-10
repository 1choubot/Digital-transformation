## ADDED Requirements

### Requirement: 前端不要求手动推进阶段
项目核心前端 SHALL NOT require users to click manual stage advance after a stage is completed.

#### Scenario: 业务动作完成后展示新阶段
- **WHEN** 用户完成可能触发自动阶段推进的业务动作
- **AND** 后端已自动推进项目阶段
- **THEN** 项目详情页 SHALL 刷新并展示新的当前阶段
- **AND** 项目详情页 SHALL NOT 要求用户额外点击阶段推进按钮

#### Scenario: 未自动推进时展示阻塞原因
- **WHEN** 后端未自动推进项目阶段
- **THEN** 项目详情页 SHALL 展示后端返回的阶段齐套摘要、缺失资料和阻塞原因
- **AND** 项目详情页 SHALL NOT 使用本地硬编码判断替代后端门禁

### Requirement: 工作台不显示正常阶段推进待办
工作台 SHALL NOT show normal `stage_advance` todos as part of the primary workflow.

#### Scenario: 阶段齐套后不产生手动推进待办
- **WHEN** 当前阶段齐套门禁满足
- **AND** 系统能够自动推进项目阶段
- **THEN** 工作台 SHALL NOT 显示普通 `stage_advance` 待办
- **AND** 工作台 SHALL 通过项目当前阶段变化反映自动推进结果

#### Scenario: manual fallback 不作为主前端入口
- **WHEN** 后端返回当前阶段齐套门禁已满足
- **AND** 项目仍停留在该阶段
- **THEN** 项目详情页 SHALL NOT expose manual fallback as a primary workflow action
- **AND** manual fallback SHALL remain an API / operations fallback outside the normal project detail workflow
- **AND** 工作台 SHALL NOT 恢复普通 `stage_advance` 待办

### Requirement: 旧阶段关口审批面板不作为主流程入口
项目详情页 SHALL NOT display the legacy `ProjectStageApprovalPanel` as a required primary workflow step.

#### Scenario: 项目详情页隐藏 legacy 审批入口
- **WHEN** 用户查看项目详情页
- **THEN** 项目详情页 SHALL NOT 要求用户通过 legacy 阶段关口审批面板完成阶段推进
- **AND** 项目详情页 SHALL 使用阶段资料和专用 workflow 的状态展示阶段完成情况
