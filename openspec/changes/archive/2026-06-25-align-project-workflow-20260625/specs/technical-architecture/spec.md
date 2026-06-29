## ADDED Requirements

### Requirement: 20260625 完成规则优先于文件平台实施

系统 MUST 在 20260625 资料完成规则稳定后再实施文件平台联动或在线表单能力，避免按旧的统一 `confirmed` 口径触发归档或生成文件。

#### Scenario: 重审文件平台归档触发
- **WHEN** `file-platform-integration-v1` 后续准备进入实现
- **THEN** 实现计划 MUST 先根据 20260625 `completionMode` 重新审查归档触发规则
- **AND** 系统 MUST NOT 仅以资料状态 `confirmed` 作为所有资料的归档触发条件

#### Scenario: 归档触发按 completionMode 判断
- **WHEN** 后续文件平台联动启用且资料存在待归档附件
- **THEN** 数字化平台 MUST 按该资料项 `completionMode` 判断资料是否已达到可归档状态

#### Scenario: completionMode 归档触发规则
- **WHEN** 后续文件平台联动设计归档触发点
- **THEN** `submit_only` MUST 在提交或上传完成后才可归档
- **AND** `approval_required` MUST 在确认或审批通过后才可归档
- **AND** `conditional_submit` MUST 在条件触发且提交或上传完成后才可归档
- **AND** `conditional_approval` MUST 在条件触发且确认或审批通过后才可归档

#### Scenario: 在线表单等待完成规则稳定
- **WHEN** 后续规划在线表单填写、草稿、提交或生成归档文件
- **THEN** 系统 MUST 先确认 20260625 资料完成规则和资料状态表达，再规划表单生成和归档触发点

### Requirement: 文件平台继续保持文件职责边界

系统 MUST 保持文件管理平台只承担文件能力，不得因 20260625 资料完成规则变化而把文件平台扩展成项目流程或资料审批系统。

#### Scenario: 文件平台不判断资料完成
- **WHEN** 数字化平台向文件平台归档或读取文件
- **THEN** 文件平台 MUST NOT 判断资料是否完成、是否确认、是否满足阶段推进或是否触发条件

#### Scenario: 数字化平台负责完成规则
- **WHEN** 系统判断资料是否完成、阶段是否齐套或是否允许阶段推进
- **THEN** 判断 MUST 由数字化平台根据项目、阶段、资料适用性、资料状态和 `completionMode` 完成

#### Scenario: 不新增复杂业务流
- **WHEN** 系统处理合同、采购、付款、发票、设计变更、随机资料移交或资料服务器核查相关产出
- **THEN** 技术架构 MUST NOT 因本规划新增合同审批流、采购审批流、付款流、发票流转、设计变更流程引擎、随机资料移交流程或资料服务器核查流程
