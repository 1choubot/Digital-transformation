## ADDED Requirements

### Requirement: 立项 workflow 回归测试架构
技术架构 MUST 在后续权限 resolver、共享阶段机制和合同阶段开发前，为立项关键路径提供后端自动化回归保护。

#### Scenario: 后续共享机制开发前具备保护网
- **WHEN** 团队后续实现权限 resolver、共享阶段机制、阶段资料派生重构或合同签订阶段业务
- **THEN** 后端 MUST 已具备覆盖 `1.1 / 1.2 / 1.3` 立项关键路径的自动化回归测试
- **AND** 这些测试 MUST 覆盖提交、审批、退回、精准返工、返工重提、项目编号唯一性、工作台待办和阶段自动推进

#### Scenario: 复用现有后端测试模式
- **WHEN** 实现立项 workflow 回归测试
- **THEN** 测试 SHOULD 优先复用现有 Node test runner、fake db、mock storage 和 repository 级测试模式
- **AND** 测试 SHOULD 能直接断言数据库行、DTO、权限、blocking reasons、operation log、工作台待办和阶段状态

#### Scenario: 不引入外部运行依赖
- **WHEN** 实现立项关键路径回归测试
- **THEN** 测试 MUST NOT 依赖真实 MySQL migration、真实文件平台、真实外部服务或浏览器环境才能运行
- **AND** 测试 MUST NOT 通过新增 migration 或改变 schema 来满足测试夹具

#### Scenario: 不用前端 E2E 替代后端关键路径
- **WHEN** 团队补充立项阶段测试覆盖
- **THEN** 前端 E2E 或手工 smoke MAY 作为补充验证
- **AND** 前端 E2E 或手工 smoke MUST NOT 替代后端 repository 级关键路径测试

#### Scenario: 测试脚本保持可独立运行
- **WHEN** 后续新增立项 workflow 测试文件或 npm script
- **THEN** 该测试 SHOULD 支持独立运行以便快速回归
- **AND** `cmd /c npm.cmd run check` MUST 继续覆盖新增测试文件的语法检查或等价静态检查入口
