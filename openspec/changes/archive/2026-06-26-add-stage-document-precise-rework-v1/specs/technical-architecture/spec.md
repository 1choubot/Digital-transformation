## MODIFIED Requirements

### Requirement: 文件管理平台简单归档边界

当前 20260625 在线平台内部资料闭环阶段 MUST 暂停数字化平台与文件管理平台归档联动；在线平台 MUST 自己负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要和阶段推进状态，且当前职责不包含泛化阶段关口审批。

#### Scenario: 当前阶段文件平台职责暂停
- **WHEN** 当前阶段处理项目、阶段、资料、附件、精准返工或阶段推进
- **THEN** 系统 MUST NOT 要求文件管理平台负责目录、归档、文件列表、下载权限、文件日志或返工状态

#### Scenario: 数字化平台职责
- **WHEN** 数字化平台处理阶段资料
- **THEN** 数字化平台必须负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要和阶段推进状态
- **AND** 数字化平台 MUST NOT 把泛化阶段关口审批作为当前在线平台内部资料闭环的阶段推进前置

#### Scenario: 不通过文件平台实现复杂业务流
- **WHEN** 系统处理合同审核记录表、采购申请表、采购合同审核记录表、发票、设计变更资料、随机资料移交、资料服务器核查或精准返工
- **THEN** 系统不得通过文件管理平台实现合同审批流、采购审批流、付款流、发票流转、设计变更流程引擎、随机资料移交流程、资料服务器核查流程或返工流转

#### Scenario: 后续文件平台集成独立实施
- **WHEN** 后续实现文件管理平台联动
- **THEN** 系统 MUST 通过独立 change 规划和实现文件夹绑定、归档、文件列表、下载权限和文件日志
- **AND** 后续联动不得反向改变本 change 的精准返工状态归属

### Requirement: 当前阶段暂停文件平台联动

当前在线平台内部资料闭环和精准返工阶段 MUST NOT 调用文件管理平台，文件平台联动 MUST 等后续独立 change 恢复。

#### Scenario: 不调用文件管理平台
- **WHEN** 在线平台创建项目、初始化阶段资料、上传附件、提交资料、审核资料、请求返工、完成返工、计算齐套或推进阶段
- **THEN** 系统 MUST NOT 调用文件管理平台 API

#### Scenario: 不要求文件平台配置
- **WHEN** 系统部署或运行当前在线平台内部资料闭环及精准返工能力
- **THEN** 系统 MUST NOT 要求配置 file-platform base URL、integration token、服务账号、目标部门或模板 code

#### Scenario: 不实现文件平台适配器
- **WHEN** 系统实现当前在线平台内部资料闭环及精准返工能力
- **THEN** 系统 MUST NOT 新增 `filePlatformClient`、文件平台 adapter、文件平台归档上传编排、文件平台下载入口或文件平台返工映射

#### Scenario: file-platform-integration-v1 保持暂停
- **WHEN** 后续需要恢复文件平台联动
- **THEN** `file-platform-integration-v1` 或新的独立 change MUST 重新经过 review
- **AND** 归档触发 MUST 按 `completionMode` 和精准返工门禁重新确认

### Requirement: 在线平台内部完成规则优先

在线平台 MUST 先完成项目编号后置、`completionMode`、资料提交/审核、精准返工、审核待办和阶段推进闭环，不得通过文件平台或复杂流程引擎绕开这些规则。

#### Scenario: 在线平台判断资料完成
- **WHEN** 系统判断资料是否完成
- **THEN** 判断 MUST 由在线平台根据资料适用性、触发状态、资料状态、`completionMode` 和 `revision_required` 完成

#### Scenario: 在线平台判断阶段推进
- **WHEN** 系统判断当前阶段是否可推进
- **THEN** 判断 MUST 由在线平台根据当前阶段适用资料的 `completionMode` 完成情况、`revision_required` 清除情况和推进权限完成

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统处理合同、采购、付款、发票、设计变更或精准返工相关资料
- **THEN** 系统 MUST NOT 新增合同审批流、采购审批流、付款流、发票审批流、设计变更流程引擎或通用审批流引擎

#### Scenario: 不解决 1.2 多节点在线审批
- **WHEN** 系统处理 `1.2 项目立项审批表` 的审批 NO
- **THEN** 本 change MUST 仅处理审批 NO 后对 `1.1` 的精准返工目标
- **AND** 系统 MUST NOT 因本 change 实现商务评价、技术评价、总经理多节点在线审批

## ADDED Requirements

### Requirement: 精准返工架构边界

精准返工 MUST 是在线平台内部资料状态能力，不得扩展为通用流程引擎、推送通知系统或文件平台能力。

#### Scenario: 不做通用审批流引擎
- **WHEN** 系统实现精准返工
- **THEN** 系统 MUST 使用固定 A/B/C 规则和资料状态字段
- **AND** 系统 MUST NOT 引入通用工作流、BPM 或可配置审批流引擎作为本 change 范围

#### Scenario: 不做推送通知
- **WHEN** 返工被请求或完成
- **THEN** 系统 MUST NOT 因本 change 新增推送通知、站内信、短信或邮件能力

#### Scenario: 不改变 completionMode 模板口径
- **WHEN** 系统实现精准返工
- **THEN** 系统 MUST 保持 `submit_only 33`、`approval_required 24`、`conditional_submit 7`、`conditional_approval 0`
