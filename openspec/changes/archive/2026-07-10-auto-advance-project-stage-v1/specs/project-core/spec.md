## ADDED Requirements

### Requirement: 阶段齐套后自动推进
系统 SHALL automatically advance a project to the next stage only when a configured write-operation trigger or the manual fallback advance endpoint invokes the shared stage gate check and the current stage gate is satisfied.

#### Scenario: 配置的写操作触发后进入下一阶段
- **WHEN** 配置的写操作触发点完成业务写入
- **AND** 该触发点调用自动推进判断
- **AND** 当前阶段的阶段资料齐套门禁满足
- **AND** 项目状态不是 `ended` 或 `completed`
- **THEN** 系统 SHALL 自动将当前阶段标记为完成
- **AND** 系统 SHALL 自动将下一阶段标记为当前阶段
- **AND** 系统 SHALL NOT 要求用户再点击手动阶段推进按钮

#### Scenario: 读接口不得触发阶段变更
- **WHEN** 用户调用项目详情、工作台、阶段导航、资料清单或其它 GET/read-only 接口
- **THEN** 系统 SHALL NOT 自动推进项目阶段
- **AND** 系统 SHALL NOT 因读接口刷新而写入阶段推进日志

#### Scenario: 自动推进不得无控制连跳多阶段
- **WHEN** 一个写操作触发自动推进判断
- **THEN** 系统 SHALL 最多推进触发时的当前阶段一次
- **AND** 系统 SHALL NOT 在同一触发动作中连续跨越多个阶段

#### Scenario: 未齐套时不推进
- **WHEN** 当前阶段仍存在未完成或阻塞的阶段资料
- **THEN** 系统 SHALL NOT 自动推进项目阶段
- **AND** 系统 SHALL 保留现有阻塞原因和未完成资料列表

#### Scenario: 齐套未满足不是业务动作错误
- **WHEN** 配置的写操作触发点完成业务写入
- **AND** 当前阶段齐套门禁仍未满足
- **THEN** 系统 SHALL 保留业务动作成功结果
- **AND** 系统 SHALL NOT 将未齐套视为自动推进错误

#### Scenario: ended 或 completed 项目不推进
- **WHEN** 项目状态为 `ended` 或 `completed`
- **THEN** 系统 SHALL NOT 自动推进项目阶段
- **AND** 系统 SHALL NOT 创建新的阶段推进日志

#### Scenario: 第 8 阶段齐套后完成项目
- **WHEN** 第 8 阶段齐套门禁满足
- **THEN** 系统 SHALL 自动将项目标记为完成
- **AND** 系统 SHALL NOT 创建第 9 阶段
- **AND** 系统 SHALL 保持 8 大阶段数量不变

### Requirement: 手动推进接口作为兜底
系统 MAY keep the manual stage advance endpoint as a fallback, but SHALL NOT require it as the primary user workflow.

#### Scenario: 手动推进接口保留兜底能力
- **WHEN** 用户或运维场景调用 `POST /api/projects/:projectId/stages/advance`
- **THEN** 系统 SHALL 使用与自动推进相同的阶段齐套门禁计算
- **AND** 系统 SHALL NOT 使用单独的手动推进判断逻辑
- **AND** 系统 SHALL NOT 依赖 legacy stage gate approval 作为推进前置

#### Scenario: 已自动推进后重复调用手动推进
- **WHEN** 阶段已由自动推进完成
- **AND** 用户再次调用手动推进接口
- **THEN** 系统 SHALL NOT 重复推进同一阶段
- **AND** 系统 SHALL 返回幂等结果或受控错误

### Requirement: 旧阶段关口审批不作为推进前置
系统 SHALL NOT require legacy stage gate approval for stage advance.

#### Scenario: legacy stage gate approval 不阻塞推进
- **WHEN** 当前阶段齐套门禁满足
- **AND** 旧阶段关口审批记录不存在、未提交或未审批
- **THEN** 系统 SHALL 仍可按自动推进规则推进阶段
- **AND** 系统 SHALL NOT 要求用户完成 legacy stage gate approval

#### Scenario: legacy stage gate approval 保持非主流程
- **WHEN** 系统处理阶段推进
- **THEN** 系统 SHALL treat the submit / approve / return / resubmit / history stage gate approval mechanism as legacy
- **AND** 系统 SHALL NOT 将该机制作为主流程阶段推进前置条件
