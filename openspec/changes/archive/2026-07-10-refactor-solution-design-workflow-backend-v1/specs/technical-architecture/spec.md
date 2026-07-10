## ADDED Requirements

### Requirement: 方案设计 workflow 后端无行为变化拆分
技术架构 MUST allow `solutionDesignWorkflowRepository.js` to be split into smaller backend modules only when the split preserves the existing solution design workflow behavior.

#### Scenario: 拆分不改变外部行为
- **WHEN** 后续实现拆分方案设计 workflow 后端仓储逻辑
- **THEN** 实现 MUST 保持现有 repository 对外 export、API DTO、错误码、权限结果、blocking reasons、operation log、状态机、自动推进触发点和 generated file 行为不变
- **AND** 实现 MUST NOT 修改数据库表结构、migration、8 大阶段数量或 71 项资料数量

#### Scenario: 优先抽纯函数和独立 adapter
- **WHEN** 后续拆分大型 repository 文件
- **THEN** 实现 SHOULD 优先抽出模板生成 source builder、cell mapping、image mapping、payload normalize、DTO mapping、权限 helper 和查询 helper
- **AND** 实现 SHOULD keep `solutionDesignWorkflowRepository.js` as the public facade and transaction coordinator during the first pass
- **AND** 实现 SHOULD NOT start by rewriting node transition orchestration or creating a new workflow engine

#### Scenario: 事务边界保持
- **WHEN** 后续实现把查询 helper 或 generated file adapter 移出 repository 文件
- **THEN** 实现 MUST preserve the current business transaction boundaries, lock timing and write ordering
- **AND** helper modules MUST receive the existing executor/db context rather than opening separate transactions for the same business action
- **AND** 自动推进调用 MUST remain in the same business action boundary as before

#### Scenario: 以现有测试作为回归基线
- **WHEN** 后续实现方案设计后端重构
- **THEN** 实现 MUST keep `cmd /c npm.cmd run test:solution-design` passing as the primary regression baseline
- **AND** 实现 MUST keep C05/C15/C16 generated file, image, permission, quotation/tender, derived completion and automatic advance tests at least as strict as before
- **AND** 实现 MUST NOT relax tests merely because functions moved to new modules

#### Scenario: 不引入新的全局权限或流程引擎
- **WHEN** 后续拆分权限 helper 或节点编排 helper
- **THEN** 实现 MUST NOT introduce a global stage workflow engine in this change
- **AND** 实现 MUST NOT introduce a broad unified permission resolver rewrite in this change
- **AND** implementation MAY leave existing high-risk orchestration in the facade for later separately planned changes
