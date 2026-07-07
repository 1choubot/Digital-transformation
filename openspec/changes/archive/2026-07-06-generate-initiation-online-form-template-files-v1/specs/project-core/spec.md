## ADDED Requirements

### Requirement: 立项在线表单模板文件生成方向

项目核心能力 MUST 支持将 `1.1 / 1.2 / 1.3` 在线表单结构化数据生成对应真实模板文件作为后续实现方向；本 planning change MUST NOT 直接生成 Excel、Word、PDF 或文件平台文件。文件生成能力 MUST 作为可复用能力设计，不能只针对立项阶段硬编码。

#### Scenario: 1.1 提交后生成项目需求表文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.1 项目需求表` 在线表单提交成功
- **THEN** 系统 SHOULD 基于 `项目需求表-模板.xlsx` 生成项目需求表文件
- **AND** 生成文件 MUST 归属于原 `1.1` 资料项

#### Scenario: 1.2 总经理最终通过后生成项目立项审批表文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.2 项目立项审批表` 总经理最终通过
- **THEN** 系统 SHOULD 基于 `项目立项审批表-模板.xlsx` 生成正式项目立项审批表文件
- **AND** 系统 MUST NOT 因生成文件绕过商务评价、技术评价或总经理审批

#### Scenario: 1.3 提交后生成项目立项通知文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.3 项目立项通知` 在线表单提交成功
- **THEN** 系统 SHOULD 基于 `关于确定项目名称及编号的通知-模板.docx` 生成项目立项通知文件
- **AND** 生成文件 MUST 归属于原 `1.3` 资料项

### Requirement: 立项模板文件生成时机与版本

项目核心能力 MUST 规划模板文件生成时机和版本策略；第一版 SHOULD 保留文件版本，不应静默覆盖旧文件。默认查看 SHOULD 指向最新有效版本。

#### Scenario: 重新填写后生成新版本
- **WHEN** 资料退回、返工或重新填写后再次达到生成条件
- **THEN** 系统 SHOULD 生成新版本文件或将旧版本标记为失效
- **AND** 系统 MUST 能区分最新有效版本和历史版本

#### Scenario: 文件状态可追踪
- **WHEN** 系统处理模板文件生成
- **THEN** 文件记录 MUST 能表达生成中、已生成、生成失败、已被替代或等价状态
- **AND** 文件生成失败 MUST 记录失败原因或可诊断信息

#### Scenario: 文件生成失败不得假装成功
- **WHEN** 模板文件生成失败
- **THEN** 系统 MUST NOT 将文件状态展示为已生成
- **AND** 系统 MUST 保留失败状态以供后续查看、排查或重试

#### Scenario: 文件生成失败不回滚 1.1 提交
- **WHEN** `1.1 项目需求表` 在线表单提交成功
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚在线表单提交结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 文件生成失败不回滚 1.2 审批
- **WHEN** `1.2 项目立项审批表` 总经理最终通过
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚商务评价、技术评价或总经理审批结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 文件生成失败不回滚 1.3 提交
- **WHEN** `1.3 项目立项通知` 在线表单提交成功
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚在线表单提交结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 阶段推进门禁后续明确
- **WHEN** 文件生成失败但在线表单提交或审批状态已经成功
- **THEN** 本 planning change MUST NOT 承诺生成失败自动阻塞阶段推进
- **AND** 是否将文件生成成功作为阶段推进硬门禁 MUST 由后续实现 change 明确

### Requirement: 立项模板文件记录与权限

项目核心能力 MUST 为生成文件规划后端文件记录和权限检查；无资料查看权限的用户不得查看或下载生成文件。

#### Scenario: 文件记录包含关键元数据
- **WHEN** 后续实现文件记录持久化
- **THEN** 文件记录 SHOULD 包含项目、资料、在线表单、模板、版本、状态、文件名、存储路径、生成操作者、生成时间和失败原因等关键元数据
- **AND** 文件记录 SHOULD 包含源表单提交时间或版本、源表单数据 hash、不可变源快照引用、触发事件、审批快照、模板版本或模板 hash

#### Scenario: 历史文件可追溯生成时数据
- **WHEN** 用户查看历史生成文件元数据
- **THEN** 系统 SHOULD 能追溯到生成时的表单内容、审批意见和模板版本
- **AND** 系统 MUST NOT 只依赖会变化的当前 formId 来解释历史文件

#### Scenario: 重新填写后源快照变化
- **WHEN** 资料退回、返工或重新填写后再次生成文件
- **THEN** 新文件版本 SHOULD 关联新的源快照或源数据 hash
- **AND** 旧版本 SHOULD 保留其生成时的源快照或源数据 hash

#### Scenario: 1.2 记录审批快照
- **WHEN** `1.2 项目立项审批表` 总经理最终通过后生成文件
- **THEN** 文件记录 SHOULD 包含商务评价、技术评价、总经理审批意见、人员和时间的生成时快照

#### Scenario: 有权限用户查看生成文件
- **WHEN** 用户对项目和资料有查看权限
- **AND** 目标资料已有最新有效生成文件
- **THEN** 系统 SHOULD 允许用户查看或下载生成文件

#### Scenario: 无权限用户不得查看或下载
- **WHEN** 用户没有项目或资料查看权限
- **THEN** 系统 MUST NOT 允许用户查看或下载生成文件
- **AND** 系统 MUST NOT 通过文件接口泄露文件路径或元数据

### Requirement: 立项模板字段映射先行

项目核心能力 MUST 要求模板文件生成实现前先建立 `1.1 / 1.2 / 1.3` mapping manifest；mapping manifest MUST 与真实模板字段一致，不得依赖字段名猜测或扩展模板外字段。

#### Scenario: mapping manifest 包含关键映射信息
- **WHEN** 后续实现模板文件生成
- **THEN** 系统 MUST 为每个模板维护 mapping manifest
- **AND** mapping manifest MUST 包含 templateKey、templatePath、fileType、outputDocumentCode、目标位置、来源字段、必填字段、格式保留要求、生成触发事件和失败时应记录的映射错误

#### Scenario: 映射必须与真实模板一致
- **WHEN** 团队实现 `1.1 / 1.2 / 1.3` 文件生成
- **THEN** mapping manifest MUST 对齐真实模板字段、单元格、表格区域、Word 占位符或段落位置
- **AND** 系统 MUST NOT 为生成文件新增真实模板外字段

#### Scenario: 禁止字段名猜测填充
- **WHEN** 文件渲染器填充模板
- **THEN** 系统 MUST 使用 mapping manifest 指定的目标位置和来源字段
- **AND** 系统 MUST NOT 仅根据在线表单字段名自动猜测模板填充位置

### Requirement: 文件生成不改变资料项数量

项目核心能力 MUST 将生成文件视为原资料项的产出形态，而不是新增资料项；本能力 MUST NOT 改变 v20260629 / 71 项资料数量。

#### Scenario: 不新增资料项
- **WHEN** 系统为 `1.1 / 1.2 / 1.3` 生成模板文件
- **THEN** 系统 MUST NOT 新增 `项目需求表文件`、`立项审批表文件`、`立项通知文件` 或等价资料项
- **AND** 生成文件 MUST 作为原资料项的文件产出记录

#### Scenario: 71 项数量不变
- **WHEN** 系统初始化或校验 v20260629 项目资料模板
- **THEN** 资料数量 MUST 继续保持 71 项
- **AND** 文件生成能力 MUST NOT 改变原资料清单数量
