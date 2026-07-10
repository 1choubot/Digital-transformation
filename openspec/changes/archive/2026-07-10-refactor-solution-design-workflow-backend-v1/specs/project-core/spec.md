## ADDED Requirements

### Requirement: 方案设计 workflow 重构保持业务语义
项目核心 MUST treat the solution design backend refactor as an internal code-organization change that preserves the current solution design workflow business behavior.

#### Scenario: 方案设计状态机保持不变
- **WHEN** 后续实现 `solutionDesignWorkflowRepository.js` 的模块拆分
- **THEN** 系统 MUST keep the existing solution design internal node order, node statuses, revision rules, approval rules, return rules and project-ended rules unchanged
- **AND** 系统 MUST NOT change the quotation/tender branch semantics or the requirement that current revision data satisfies the gate

#### Scenario: API 和 DTO 保持不变
- **WHEN** 前端或工作台调用方案设计 workflow、上传槽、表单、下载、待办或审批接口
- **THEN** 系统 MUST return the same DTO field names, permission fields, blocking reasons, generatedFile fields and route context as before the refactor
- **AND** 系统 MUST preserve existing business error codes and authorization failures

#### Scenario: 自动推进和阶段门禁保持不变
- **WHEN** 报价接受、投标通过、资料写操作或 manual fallback API 触发阶段门禁判断
- **THEN** 系统 MUST use the same derived completion and automatic advance behavior as before the refactor
- **AND** 系统 MUST NOT change automatic advance trigger points, idempotency behavior, operation logs or manual fallback API semantics

#### Scenario: C05 C15 C16 生成文件保持不变
- **WHEN** 技术负责人提交 C05 项目方案分析表、C15 内部方案评审记录表或 C16 客户方案评审记录表
- **THEN** 系统 MUST generate the same Excel template outputs, target cells, styles, image anchors, recorder values, review type values, generated file status transitions and download behavior as before the refactor
- **AND** 系统 MUST NOT change the existing C05 image permissions, legacy C05 anchor compatibility or generated file invalidation behavior

#### Scenario: 不改变阶段资料和数据库边界
- **WHEN** 后续实施本重构
- **THEN** 系统 MUST NOT add, remove or rename the 8 project stages or 71 stage documents
- **AND** 系统 MUST NOT add database migration, file platform integration, contract signing business, initiation-stage behavior changes or frontend behavior changes
