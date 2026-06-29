# technical-architecture Specification

## Purpose
TBD - created by archiving change define-technical-architecture. Update Purpose after archive.
## Requirements
### Requirement: 前端技术栈

数字化管理平台第一版前端 MUST 采用 Vue + Vite 构建，并通过后端 API 获取正式业务数据。

#### Scenario: 正式前端技术栈确认

- **WHEN** 团队创建或整理数字化管理平台正式前端工程
- **THEN** 前端工程必须采用 Vue + Vite 作为第一版正式技术栈

#### Scenario: 前端数据来源

- **WHEN** 正式前端展示项目、阶段、资料或文件联动状态
- **THEN** 前端必须通过数字化平台后端 API 获取数据，不能使用 Demo 静态数据作为正式数据来源

### Requirement: 后端技术栈

数字化管理平台第一版后端 MUST 采用 Node.js + Express，并作为独立服务端承载业务 API。

#### Scenario: 正式后端技术栈确认

- **WHEN** 团队创建数字化管理平台正式后端服务
- **THEN** 后端服务必须采用 Node.js + Express

#### Scenario: 独立服务端边界

- **WHEN** 前端或外部系统访问数字化平台业务能力
- **THEN** 请求必须进入数字化平台独立服务端，不能只依赖前端本地逻辑处理正式业务

### Requirement: 独立 MySQL 数据库

数字化管理平台第一版 MUST 使用 MySQL 保存自己的业务数据，并 MUST 与文件管理平台数据库保持边界隔离。

#### Scenario: 数字化平台保存业务数据

- **WHEN** 数字化平台需要保存项目、阶段、资料、表单、状态或映射等业务数据
- **THEN** 系统必须将这些数据保存到数字化平台自己的 MySQL 数据库或独立 MySQL schema 中

#### Scenario: 不直接共用文件平台数据库

- **WHEN** 数字化平台需要读取或更新文件相关信息
- **THEN** 数字化平台不能直接读取或写入文件管理平台数据库

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

### Requirement: 内网同服务器部署

数字化管理平台第一版 MUST 作为内网 Web 系统部署，并 MUST 与文件管理平台部署在同一服务器上，同时保持独立服务边界。

#### Scenario: 内网访问

- **WHEN** 用户访问数字化管理平台第一版
- **THEN** 系统必须通过公司内网 Web 地址提供访问

#### Scenario: 同服务器部署

- **WHEN** 数字化管理平台第一版部署上线
- **THEN** 数字化平台和文件管理平台必须部署在同一服务器上

#### Scenario: 独立服务运行

- **WHEN** 两个平台部署在同一服务器
- **THEN** 数字化平台必须作为独立 Web 服务运行，并保持独立端口、配置和服务进程边界

### Requirement: Demo 使用边界

前端 Demo MUST 只作为页面参考，不能作为正式数据架构、接口架构或持久化方案。

#### Scenario: 使用 Demo 参考页面

- **WHEN** 团队设计正式系统页面布局或交互
- **THEN** 可以参考前端 Demo 的页面形态

#### Scenario: 禁止复用 Demo 数据架构

- **WHEN** 团队实现正式系统数据模型、接口或持久化逻辑
- **THEN** 不能将前端 Demo 的静态数据结构、模拟接口或本地状态作为正式架构依据

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

### Requirement: 查看权限与业务操作权限分离

系统 MUST 在权限架构上分离项目查看、阶段资料查看、附件查看/下载、业务日志查看与业务操作授权，后续实现不得把查看 helper 与操作 helper 合并为同一授权入口。

#### Scenario: 查看 helper 可按本 change 放宽

- **WHEN** 系统判断项目列表/详情可见性、阶段资料条目可见性、附件查看/下载或完整业务日志查看
- **THEN** 后续实现 MAY 调整 `visibility.js`、`canViewStageDocumentItem`、`canViewStageDocumentAttachments`、`canDownloadStageDocumentAttachment`、`canViewProjectOperationLogs` 或等价 business-operation-log view helper

#### Scenario: legacy 阶段审批历史 helper 不随业务日志放宽

- **WHEN** 系统判断 legacy 阶段审批历史查看权限
- **THEN** 系统 MUST 使用 `canViewCompleteProjectAudit` 或等价 legacy helper
- **AND** 系统 MUST NOT 因本 change 放宽业务日志查看权限而放宽 legacy 阶段审批历史查看权限
- **AND** 总经理助理、中心负责人、项目创建人不得仅因项目/日志全量查看权获得 legacy 阶段审批历史查看权

#### Scenario: 操作 helper 不得因查看放宽

- **WHEN** 系统判断资料提交、资料审核、资料退回、精准返工退回、责任人分配、适用性管理、附件上传、附件删除、阶段推进或项目编号填写
- **THEN** 后续实现 MUST NOT 放宽 `canReviewStageDocument`、`canSubmitStageDocument`、`canManageProjectResponsibility`、`canManageStageDocumentApplicability`、`canAdvanceProjectStage`、精准返工退回权限或等价操作函数
- **AND** 系统 MUST NOT 将“可查看项目”作为上述操作的充分授权条件

#### Scenario: buildStageDocumentPermissions 仅调整查看下载字段

- **WHEN** 后续实现调整阶段资料权限字段构建
- **THEN** 本 change 只允许调整 `canViewAttachments` 和 `canDownloadAttachment`
- **AND** 后续实现 MUST NOT 因本 change 调整 `canUploadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility` 或 `canChangeApplicability`

#### Scenario: 不联动文件管理平台

- **WHEN** 系统实现项目全量查看、附件列表、附件下载或业务日志查看
- **THEN** 系统 MUST 继续使用在线平台现有附件能力
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台 folder mapping、同步文件平台权限或恢复文件平台归档状态

#### Scenario: 不新增报表生成

- **WHEN** 系统实现全量项目和业务日志查看
- **THEN** 系统 MUST NOT 新增日报、周报、项目一览表生成、日志导出或管理层报表生成能力

#### Scenario: 不实现 1.2 多节点审批

- **WHEN** 系统实现项目、资料、附件或日志查看权限调整
- **THEN** 系统 MUST NOT 实现 `1.2 项目立项审批表` 的商务评价、技术评价或总经理多节点在线审批

