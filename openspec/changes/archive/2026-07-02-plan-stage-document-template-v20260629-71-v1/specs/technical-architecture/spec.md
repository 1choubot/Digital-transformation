## ADDED Requirements

### Requirement: 20260629 71 项候选规划不得产生运行时架构变更

技术架构 MUST 将 `plan-stage-document-template-v20260629-71-v1` 限定为资料模板候选规划 change；该 change MUST NOT 产生数据库迁移、资料初始化、状态机、权限、API 或前端运行时变更。

#### Scenario: 不产生 migration 或新初始化
- **WHEN** 本 change 完成规划和 OpenSpec 校验
- **THEN** 系统 MUST NOT 新增、修改或执行数据库 migration
- **AND** 系统 MUST NOT 初始化 71 项候选模板或改写既有项目资料数据

#### Scenario: 71 项规划不等同于运行时模板
- **WHEN** 团队完成 20260629 图面产出 + 4 个草稿修正形成的 71 项候选规划
- **THEN** 技术架构 MUST 仍将其视为目标模板输入
- **AND** 运行时模板切换 MUST 由后续独立 implementation change 完成

#### Scenario: 不改变状态机和权限来源
- **WHEN** 71 项候选清单暗示新的审批、签收、责任人或返工关系
- **THEN** 系统 MUST NOT 在本 change 中修改状态机、权限判断、工作台任务生成、阶段推进门禁或业务日志语义
- **AND** 后续如需实现，MUST 通过独立 change 明确规格和验证

#### Scenario: 不实现在线表单或复杂流程引擎
- **WHEN** 71 项候选包含成本估算、草稿合同、供应商评价、生产记录或资料移交等可能需要结构化表单或复杂审批的资料
- **THEN** 系统 MUST NOT 在本 change 中新增在线表单、专用审批流、通用流程引擎或复杂状态机
- **AND** 第一版目标模板 MUST 默认按文件上传或附件上传能力规划

#### Scenario: 不临时扩展接口字段
- **WHEN** 候选清单包含当前 API 尚未返回的资料、节点或状态
- **THEN** 后端 MUST NOT 在本 change 中新增接口字段或临时返回候选资料
- **AND** 前端 MUST NOT 依赖规划文档硬编码候选资料

#### Scenario: 文件平台和项目模式不混入
- **WHEN** 后续评审 71 项候选模板
- **THEN** 团队 MUST NOT 将文件平台联动、自研/外采项目模式、第二阶段补录或流程引擎能力混入本 planning change
- **AND** 这些能力如需实现 MUST 由独立 change 管理

#### Scenario: 后续拆分目标模板实现和工作区迁移
- **WHEN** 团队准备实施 20260629 目标资料模板和项目工作区调整
- **THEN** 团队 SHOULD 将后续工作拆分为目标模板实现 change 和逐阶段工作区迁移 change
- **AND** 团队 MUST NOT 在本 planning change 中同时处理模板切换、蓝色模块迁移、在线表单和复杂审批
