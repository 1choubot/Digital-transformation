## ADDED Requirements

### Requirement: 自动推进复用单一阶段门禁计算
自动阶段推进 SHALL reuse the single stage gate completeness calculation.

#### Scenario: 不复制齐套逻辑
- **WHEN** 系统判断是否自动推进阶段
- **THEN** 自动推进 SHALL 调用共享阶段齐套/门禁 resolver
- **AND** 自动推进 SHALL NOT 在业务动作处理器中复制资料完成判断

#### Scenario: 专用 workflow 通过 projection 接入
- **WHEN** 阶段资料由专用 workflow 管理
- **THEN** 自动推进 SHALL 通过通用 projection / derived completion 机制读取完成状态
- **AND** 自动推进 SHALL NOT 直接读取专用 workflow 内部状态形成并行门禁

### Requirement: 自动推进服务必须幂等
自动阶段推进 SHALL be idempotent.

#### Scenario: 重复触发不重复推进
- **WHEN** 同一业务动作被重复提交或重试
- **THEN** 自动推进 SHALL NOT 重复完成同一阶段
- **AND** 自动推进 SHALL NOT 重复写成功日志

#### Scenario: 并发触发以项目当前阶段为边界
- **WHEN** 多个动作并发触发自动推进
- **THEN** 自动推进 SHALL 使用项目当前阶段和事务锁作为幂等边界
- **AND** 自动推进 SHALL 防止阶段跳跃或重复初始化下一阶段

### Requirement: 旧阶段关口审批保持 legacy 边界
架构 SHALL treat the existing stage gate approval mechanism as legacy for stage advance.

#### Scenario: legacy API 不驱动主流程推进
- **WHEN** 后续实现自动阶段推进
- **THEN** 架构 SHALL NOT require legacy submit / approve / return / resubmit / history approval state for stage transition
- **AND** 架构 MAY keep those APIs and repositories for compatibility or audit history
