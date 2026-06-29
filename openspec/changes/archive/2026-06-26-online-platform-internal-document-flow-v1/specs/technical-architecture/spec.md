## MODIFIED Requirements

### Requirement: 文件存储边界

当前 20260625 在线平台内部资料闭环阶段，阶段资料附件 MUST 先保存在在线平台现有附件系统中；文件管理平台归档存储边界 MUST 暂停到后续独立 change 恢复。

#### Scenario: 当前阶段附件在线平台保存
- **WHEN** 用户上传阶段资料附件
- **THEN** 数字化平台 MUST 使用在线平台附件表、附件权限和附件存储路径保存文件
- **AND** 系统 MUST NOT 要求文件平台作为当前阶段资料文件主存储

#### Scenario: 不保存文件平台关联信息
- **WHEN** 当前阶段保存资料附件或资料状态
- **THEN** 数字化平台 MUST NOT 保存 file-platform folder mapping、file id、log id、archive status 或 archive retry 字段

#### Scenario: 未来归档单独恢复
- **WHEN** 后续重新启用文件管理平台归档
- **THEN** 系统 MUST 通过独立 change 重新定义文件平台存储、归档触发和元数据映射

### Requirement: HTTP API 联动

当前 20260625 在线平台内部资料闭环阶段，数字化管理平台 MUST NOT 调用文件管理平台 HTTP API；后续如恢复文件管理平台联动，仍 MUST 通过 HTTP API 而不是共享数据库或内部模块完成。

#### Scenario: 当前阶段不调用文件平台能力
- **WHEN** 数字化平台创建项目、初始化阶段资料、上传附件、提交资料、审核资料、计算齐套或推进阶段
- **THEN** 数字化平台 MUST NOT 调用文件管理平台 HTTP API

#### Scenario: 当前阶段不要求文件平台配置
- **WHEN** 系统部署或运行当前在线平台内部资料闭环能力
- **THEN** 系统 MUST NOT 要求配置 file-platform base URL、integration token、服务账号、目标部门或模板 code

#### Scenario: 未来联动禁止绕过 HTTP API
- **WHEN** 后续独立 change 恢复文件平台数据读取或动作触发
- **THEN** 数字化平台不能通过直接访问文件平台数据库、共享文件平台内部模块或手工操作文件平台存储目录来完成正式联动

### Requirement: 文件管理平台简单归档边界

当前 20260625 在线平台内部资料闭环阶段 MUST 暂停数字化平台与文件管理平台归档联动；在线平台 MUST 自己负责项目、阶段、资料项、适用性、责任人、资料完成状态、资料审核待办、齐套摘要和阶段推进状态，且当前职责不包含泛化阶段关口审批。

#### Scenario: 当前阶段文件平台职责暂停
- **WHEN** 当前阶段处理项目、阶段、资料、附件或阶段推进
- **THEN** 系统 MUST NOT 要求文件管理平台负责目录、归档、文件列表、下载权限或文件日志

#### Scenario: 数字化平台职责
- **WHEN** 数字化平台处理阶段资料
- **THEN** 数字化平台必须负责项目、阶段、资料项、适用性、责任人、资料完成状态、资料审核待办、齐套摘要和阶段推进状态
- **AND** 数字化平台 MUST NOT 把泛化阶段关口审批作为当前在线平台内部资料闭环的阶段推进前置

#### Scenario: 不通过文件平台实现复杂业务流
- **WHEN** 系统处理合同审核记录表、采购申请表、采购合同审核记录表、发票、设计变更资料、随机资料移交或资料服务器核查
- **THEN** 系统不得通过文件管理平台实现合同审批流、采购审批流、付款流、发票流转、设计变更流程引擎、随机资料移交流程或资料服务器核查流程

#### Scenario: 后续文件平台集成独立实施
- **WHEN** 后续实现文件管理平台联动
- **THEN** 系统 MUST 通过独立 change 规划和实现文件夹绑定、归档、文件列表、下载权限和文件日志

## ADDED Requirements

### Requirement: 当前阶段暂停文件平台联动

当前在线平台内部资料闭环阶段 MUST NOT 调用文件管理平台，文件平台联动 MUST 等后续独立 change 恢复。

#### Scenario: 不调用文件管理平台
- **WHEN** 在线平台创建项目、初始化阶段资料、上传附件、提交资料、审核资料、计算齐套或推进阶段
- **THEN** 系统 MUST NOT 调用文件管理平台 API

#### Scenario: 不要求文件平台配置
- **WHEN** 系统部署或运行当前在线平台内部资料闭环能力
- **THEN** 系统 MUST NOT 要求配置 file-platform base URL、integration token、服务账号、目标部门或模板 code

#### Scenario: 不实现文件平台适配器
- **WHEN** 系统实现当前在线平台内部资料闭环
- **THEN** 系统 MUST NOT 新增 `filePlatformClient`、文件平台 adapter、文件平台归档上传编排或文件平台下载入口

#### Scenario: file-platform-integration-v1 保持暂停
- **WHEN** 后续需要恢复文件平台联动
- **THEN** `file-platform-integration-v1` 或新的独立 change MUST 重新经过 review
- **AND** 归档触发 MUST 按 `completionMode` 重新确认

### Requirement: 当前阶段使用在线平台附件存储

当前阶段资料文件 MUST 使用在线平台附件存储作为默认保存位置，不得要求文件平台作为正式归档存储。

#### Scenario: 附件保存在在线平台
- **WHEN** 用户上传阶段资料附件
- **THEN** 系统 MUST 使用在线平台附件表、附件权限和附件存储路径保存文件

#### Scenario: 附件权限仍由在线平台判断
- **WHEN** 用户查看、下载、上传或删除阶段资料附件
- **THEN** 系统 MUST 使用在线平台当前资料项权限边界判断访问权限

#### Scenario: 不产生文件平台归档字段
- **WHEN** 系统保存阶段资料附件或资料状态
- **THEN** 系统 MUST NOT 要求文件平台 folder mapping、file id、log id、archive status 或 archive retry 字段

### Requirement: 在线平台内部完成规则优先

在线平台 MUST 先完成项目编号后置、`completionMode`、资料提交/审核、审核待办和阶段推进闭环，不得通过文件平台或复杂流程引擎绕开这些规则。

#### Scenario: 在线平台判断资料完成
- **WHEN** 系统判断资料是否完成
- **THEN** 判断 MUST 由在线平台根据资料适用性、触发状态、资料状态和 `completionMode` 完成

#### Scenario: 在线平台判断阶段推进
- **WHEN** 系统判断当前阶段是否可推进
- **THEN** 判断 MUST 由在线平台根据当前阶段适用资料的 `completionMode` 完成情况和推进权限完成

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统处理合同、采购、付款、发票或设计变更相关资料
- **THEN** 系统 MUST NOT 新增合同审批流、采购审批流、付款流、发票审批流或设计变更流程引擎
