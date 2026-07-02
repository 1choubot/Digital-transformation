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

在线平台 MUST 先完成项目编号后置、`completionMode`、资料提交/审核、精准返工、`1.2 项目立项审批表` 专用多节点审批、审核待办和阶段推进闭环，不得通过文件平台或复杂流程引擎绕开这些规则。

#### Scenario: 不解决 1.2 多节点在线审批

- **WHEN** 系统处理 `1.2 项目立项审批表` 的审批 NO
- **THEN** 精准返工能力本身 MUST 仅处理审批 NO 后对 `1.1` 的固定返工目标
- **AND** `1.2` 的商务评价、技术评价、总经理多节点在线审批 MUST 由 `add-initiation-multi-review-flow-v1` 专用规划覆盖
- **AND** 系统 MUST NOT 因该专用规划引入通用审批流引擎

#### Scenario: 1.2 专用多节点审批不绕开 completionMode

- **WHEN** 系统规划或实现 `1.2 项目立项审批表` 多节点审批
- **THEN** `1.2` MUST 仍保留在当前 64 项资料模板和 `approval_required` 统计中
- **AND** 系统 MUST 通过专用派生完成规则补充 `completionMode` 判断，而不是改变总体完成规则数量口径

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

系统 MUST 在权限架构上分离项目查看、阶段资料查看、附件查看/下载、业务日志查看与业务操作授权，后续实现不得把查看 helper 与操作 helper 合并为同一授权入口；`1.2` 多节点审批操作不得因全量查看而放宽。

#### Scenario: 查看权限不授予 1.2 节点审批

- **WHEN** 总经理助理、中心负责人、项目创建人或项目经理因查看规则能看到 `1.2 项目立项审批表` 多节点状态
- **THEN** 系统 MUST NOT 因查看权限授予商务评价、技术评价或总经理审批节点操作权限
- **AND** 节点审批操作 MUST 使用独立业务操作授权判断

#### Scenario: 操作 helper 不得因 1.2 规划放宽

- **WHEN** 系统判断资料提交、资料审核、资料退回、精准返工退回、责任人分配、适用性管理、附件上传、附件删除、阶段推进、项目编号填写或 `1.2` 节点审批
- **THEN** 系统 MUST NOT 将“可查看项目”或“可查看 `1.2` 节点状态”作为充分授权条件

### Requirement: 1.2 专用多节点审批架构

系统 MUST 使用专用架构规划 `1.2 项目立项审批表` 的评价/最终审批，不得复用 legacy 阶段审批流作为当前主路径，也不得引入通用审批流引擎。该架构 MUST 从旧 approval nodes 口径调整为营销评价、研发评价和总经理最终审批。

#### Scenario: 使用专用评价审批结构

- **WHEN** 后续实现 `1.2 项目立项审批表` 评价/审批
- **THEN** 系统 SHOULD 新增 `project_initiation_evaluations`、`project_initiation_approval`、扩展 `project_initiation_review_nodes` 或等价专用结构保存评价和最终审批状态
- **AND** 结构 MUST 能表达营销评价文本、研发评价文本、总经理审批结果、意见、操作人和时间

#### Scenario: 不再用商务技术通过状态表达评价

- **WHEN** 系统保存营销评价或研发评价
- **THEN** 系统 MUST 保存评价文本、评价人和评价时间
- **AND** 系统 MUST NOT 要求营销评价或研发评价保存通过/不通过结果

#### Scenario: 总经理审批状态

- **WHEN** 系统保存总经理最终审批
- **THEN** 系统 MUST 保存审批结果、审批意见、审批人和审批时间
- **AND** 系统 MUST 支持审批通过和审批不通过

#### Scenario: 总经理审批前置校验

- **WHEN** 总经理尝试审批 `1.2 项目立项审批表`
- **THEN** 后端 MUST 校验营销评价和研发评价均已完成
- **AND** 后端 MUST 在两项评价完成前拒绝审批动作

#### Scenario: 总经理不通过事务

- **WHEN** 总经理审批不通过 `1.2 项目立项审批表`
- **THEN** 系统 MUST 在同一事务中保存审批不通过状态、触发 `1.1` 精准返工、标记 `1.2` 需重新填写并记录业务日志

#### Scenario: 项目阶段资料状态仍保留

- **WHEN** 系统保存 `1.2` 评价和审批状态
- **THEN** `project_stage_documents.status` MUST 仍保留资料基础状态
- **AND** `1.2` 最终完成 MUST 由基础状态、在线表单、评价、审批和精准返工状态共同派生

#### Scenario: 不复用 legacy 阶段审批主路径

- **WHEN** 系统实现 `1.2` 评价/审批
- **THEN** 系统 MUST NOT 将 legacy 阶段审批流作为当前主路径
- **AND** legacy 阶段审批历史不得成为第 1 阶段推进或项目编号门禁依据

#### Scenario: 不做通用审批流引擎

- **WHEN** 系统实现 `1.2` 评价/审批
- **THEN** 系统 MUST 将能力限定为 `1.2 项目立项审批表` 专用流程
- **AND** 系统 MUST NOT 新增 BPM、可视化流程编排、任意节点配置器或通用审批流引擎

#### Scenario: 文件平台仍暂停

- **WHEN** 系统处理 `1.2` 在线表单、评价、审批、业务日志、精准返工或阶段推进门禁
- **THEN** 系统 MUST NOT 调用文件管理平台 API
- **AND** 系统 MUST NOT 恢复文件平台 folder mapping、归档状态或文件平台下载入口

### Requirement: 项目阶段节点工作区架构

系统 MUST 支持以稳定后端配置或稳定枚举提供项目阶段节点视图，并 MUST 将节点状态从关联产出和业务状态派生，而不是为蓝色节点建立独立完成状态。第一版后端节点配置/稳定枚举只必须覆盖立项阶段完整映射；8 阶段导航框架是全局骨架，不等同于 8 阶段全部节点映射一次性完成。

#### Scenario: 节点配置来源
- **WHEN** 后端提供项目工作区阶段节点视图
- **THEN** 系统 MUST 使用后端配置、稳定枚举或等价受控结构表达 8 阶段导航框架和已配置节点
- **AND** 系统 MUST NOT 依赖前端硬编码完整业务流程作为权威来源

#### Scenario: 节点到产出映射
- **WHEN** 后端返回节点工作区数据
- **THEN** 系统 MUST 返回节点与一个或多个阶段资料产出的映射
- **AND** 第一版 MUST 支持立项阶段节点到 `1.1`、`1.2`、`1.3` 的映射

#### Scenario: 其他阶段映射可暂缺
- **WHEN** 后端返回方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段的节点视图
- **THEN** 这些阶段的节点映射 MAY 为空、占位或指向旧资料清单入口
- **AND** 系统 MUST NOT 要求本 change 一次性补齐其他 7 个阶段的全部节点和产出映射
- **AND** 后续阶段节点和产出映射 MUST 通过后续 change 逐步补齐

#### Scenario: 节点状态派生
- **WHEN** 系统计算节点状态
- **THEN** 系统 MUST 从阶段资料项、在线表单、评价/审批记录、精准返工和 `completionMode` 派生状态
- **AND** 系统 MUST NOT 为蓝色节点保存独立完成状态

#### Scenario: 节点状态派生第一版范围
- **WHEN** 系统实现节点状态派生逻辑
- **THEN** 第一版只 MUST 完整覆盖立项阶段节点状态派生规则
- **AND** 系统 MUST NOT 因其他阶段节点状态派生尚未完整实现而阻塞立项阶段规则

#### Scenario: 节点视图不替代资料清单
- **WHEN** 系统实现项目工作区
- **THEN** 系统 MUST 保留 64 项阶段资料作为产出数据底座
- **AND** 系统 MUST NOT 建立脱离阶段资料体系的第二套产出状态

### Requirement: 在线表单架构规划

系统 MUST 为立项阶段在线表单规划 schema、表单数据、提交记录和权限校验能力，并 MUST 将表单提交结果与阶段资料完成状态保持一致。

#### Scenario: 表单 schema
- **WHEN** 系统实现 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 系统 MUST 有结构化 form schema 或等价字段定义
- **AND** 字段定义 SHOULD 来源于对应 xlsx/docx 模板的业务字段设计

#### Scenario: 表单数据
- **WHEN** 用户保存在线表单草稿或提交在线表单
- **THEN** 系统 MUST 保存结构化表单数据、操作人和操作时间
- **AND** 系统 MUST 能关联项目、阶段和阶段资料项

#### Scenario: 表单提交回写资料状态
- **WHEN** 用户提交 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 系统 MUST 将提交结果回写或派生到对应阶段资料项基础状态和完成状态
- **AND** 系统 MUST 保持阶段推进和项目编号门禁读取同一派生完成口径

#### Scenario: 在线表单是立项表单产出的唯一提交入口
- **WHEN** 系统处理 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 的提交
- **THEN** 系统 MUST 只允许在线表单提交服务驱动对应资料基础状态变化
- **AND** 普通阶段资料提交接口 MUST 被后端拒绝，除非调用方是在线表单提交事务内部的受控服务路径
- **AND** 受控内部路径 MUST 使用明确的内部标记或等价机制，普通路由不得传递该标记
- **AND** 系统 MUST NOT 为旧数据状态保留绕过在线表单提交的兼容路径

#### Scenario: 立项在线表单产出写入口收敛
- **WHEN** 系统处理 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 的基础状态、完成状态或精准返工状态
- **THEN** 系统 MUST 将这些资料视为 initiation online form only documents
- **AND** 普通资料提交接口 MUST NOT 改变这些资料的提交或完成状态
- **AND** 普通返工完成接口 MUST NOT 清除这些资料的 `revision_required` 或写入返工完成状态
- **AND** 旧资料确认/退回接口 MUST NOT 承载 `1.2` 评价或最终审批
- **AND** 允许写入口 MUST 限定为在线表单提交、`1.2` 专用评价/审批、总经理审批不通过触发的 `1.1` 精准返工和必要的责任人分配/适用性维护
- **AND** 系统 MUST NOT 因旧资料清单、工作台 target route 或旧数据状态绕过这些写入口边界

#### Scenario: 在线表单重提清除返工
- **WHEN** `1.1` 或 `1.3` 这类在线表单专用 submit-only 资料存在 `revision_required`
- **AND** 责任人按权限重新提交在线表单
- **THEN** 系统 MUST 在在线表单提交事务内清除返工标记并写入返工完成追溯字段
- **AND** 系统 MUST 写入在线表单提交日志和返工完成日志
- **AND** 系统 MUST NOT 允许普通返工完成接口完成同一状态变化

#### Scenario: 在线表单提交事务一致性
- **WHEN** 用户提交 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 表单 upsert、资料状态更新、`1.2` 评价/审批激活或重置、业务日志 MUST 在同一事务中提交或回滚
- **AND** 系统 MUST NOT 出现表单已提交但资料基础状态未提交的半状态
- **AND** 提交成功响应 MUST 基于提交后的最新资料状态重新计算在线表单权限
- **AND** 当资料状态已为 `submitted`、`confirmed` 或等价完成状态时，响应中的 `canEdit` 和 `canSubmit` MUST 为 false

#### Scenario: 表单权限校验
- **WHEN** 用户填写、编辑或提交在线表单
- **THEN** 系统 MUST 按资料责任人、营销中心负责人、总经理或后端权限字段校验
- **AND** 系统 MUST NOT 因项目查看权限、日志查看权限或节点查看权限放宽表单操作权限

#### Scenario: canSubmitDocument 不表达立项在线表单提交能力
- **WHEN** 后端返回阶段资料清单、工作台资料责任待办或其他通用资料权限字段
- **THEN** `canSubmitDocument` MUST 只表示普通资料提交接口的可用性
- **AND** `1.1 项目需求表`、`1.2 项目立项审批表` 和 `1.3 项目立项通知` 的 `canSubmitDocument` MUST 为 false
- **AND** 这些资料的填写、保存和提交能力 MUST 由在线表单接口返回的 `permissions.canEdit` 和 `permissions.canSubmit` 表达
- **AND** 前端 MUST NOT 用 `canSubmitDocument` 决定这些资料是否可以在线表单提交

#### Scenario: 1.2 重填前置由服务端统一校验
- **WHEN** 系统处理 `1.2 项目立项审批表` 在线表单保存、在线表单提交或评价/审批节点激活
- **AND** 同项目 `1.1 项目需求表` 存在关联来源为该 `1.2` 的未清除返工
- **THEN** 后端 MUST 拒绝保存、提交或激活评价节点
- **AND** 后端 MUST 使用稳定错误码表达需先完成 `1.1` 返工
- **AND** 工作台查询 MUST NOT 返回可处理的 `1.2` 评价或最终审批待办

### Requirement: 旧字段和旧审批数据兼容策略

系统 MUST 兼容已有项目字段，并 MUST 在实现新 `1.2` 评价/审批模型前设计旧三节点审批数据的迁移或解释策略。

#### Scenario: 旧项目字段保留
- **WHEN** 既有项目包含项目经理、项目模式、参与中心、计划时间或立项日期
- **THEN** 系统 MUST 继续读取和展示这些字段
- **AND** 系统 MUST NOT 因新建项目轻量化而删除既有字段

#### Scenario: 新项目创建字段放宽
- **WHEN** 新项目创建请求只包含项目名称、客户和客户联系方式
- **THEN** 系统 MUST 支持创建项目
- **AND** 系统 MUST NOT 要求项目经理、项目模式、参与中心、计划时间或立项日期作为创建必填字段
- **AND** 第二阶段补录能力 MUST 通过后续 change 另行规划和实现

#### Scenario: 旧三节点审批数据不得直接视为新模型完成
- **WHEN** 既有项目存在 `business_review`、`technical_review` 或 `general_review` 等旧三节点审批数据
- **THEN** 系统 MUST 在实现前明确迁移或解释策略
- **AND** 系统 MUST NOT 直接将旧三节点审批通过解释为新模型中的营销评价完成、研发评价完成和总经理最终审批通过，除非迁移规则显式确认

### Requirement: 项目入口与工作区导航前端架构边界

技术架构 MUST 将本 change 限定为前端信息架构调整：项目总览作为跨项目入口，项目工作区作为单项目内部导航与产出工作入口；第一版 MUST 复用现有后端接口，不新增数据库结构或后端权限模型。

#### Scenario: 前端路由和导航调整为主
- **WHEN** 团队实现本 change
- **THEN** 实现重点 MUST 放在前端主导航、路由入口、项目总览入口和项目工作区布局
- **AND** 系统 MUST NOT 因本 change 新增后端服务模块、数据库表、migration 或后端权限模型

#### Scenario: 旧项目列表组件不是产品入口
- **WHEN** 团队实施 `/projects` 路由和主导航调整
- **THEN** `/projects` MUST 进入项目总览或等价项目总览体验
- **AND** `ProjectListPage.vue` MAY 仅作为源码文件和开发回退能力保留
- **AND** 前端 MUST NOT 新增 `/projects/list` 或其他用户可见旧项目列表产品入口

#### Scenario: 复用现有接口
- **WHEN** 前端实现项目总览和项目工作区导航
- **THEN** 前端 MUST 复用 `/api/projects/overview-dashboard`、`/api/projects/:id`、`/api/projects/:id/workspace`、`/api/projects/:id/stage-document-checklist` 和 `/api/projects/:id/stage-documents/:documentId/online-form`
- **AND** 第一版 MUST NOT 要求新增项目入口、蓝色节点点击或产出工作区后端接口

#### Scenario: 权限来源仍以后端为准
- **WHEN** 前端展示节点产出、在线表单、评价或审批入口
- **THEN** 前端 MUST 使用现有后端接口返回的权限字段、online form permissions 和 blockingReasons
- **AND** 前端 MUST NOT 通过主导航、路由或蓝色节点本地状态自行推断业务操作权限

### Requirement: 项目工作区组件拆分架构

前端架构 SHOULD 将项目工作区拆分为阶段导航、蓝色节点列表和节点产出工作区等可维护组件；该拆分 MUST 保持项目总览和项目工作区职责分离。

#### Scenario: 项目总览不承载阶段导航
- **WHEN** 前端展示项目总览
- **THEN** 页面 MUST 只承担跨项目入口、项目摘要、新建项目和进入工作区职责
- **AND** 页面 MUST NOT 承载单项目 8 阶段内部导航

#### Scenario: 项目工作区承载内部导航
- **WHEN** 前端展示项目工作区
- **THEN** 页面 MUST 承载左侧 8 阶段导航、阶段蓝色节点和节点产出工作区
- **AND** 组件拆分 MUST NOT 改变后端接口职责或业务状态来源

#### Scenario: 节点产出工作区不直接等于表单
- **WHEN** 前端实现节点产出工作区组件
- **THEN** 组件 MUST 先展示产出状态、责任人、阻塞原因和动作入口
- **AND** 在线表单 MUST 由用户点击填写资料或查看在线表单后打开
- **AND** 组件 MUST NOT 将点击蓝色节点直接实现为进入编辑表单

### Requirement: 第一版阶段范围架构边界

技术架构 MUST 将第一版完整范围限定为立项阶段，其他 7 个阶段只允许占位、旧资料清单入口或后续配置状态，不得因本 change 扩大为全阶段节点重建。

#### Scenario: 立项阶段完整落地
- **WHEN** 第一版实现项目工作区导航
- **THEN** 立项阶段 MUST 完整展示项目输入、项目市场调研、项目立项审批和项目立项通知节点
- **AND** 立项阶段 MUST 保留既有在线表单入口、评价/审批入口和阻塞原因展示

#### Scenario: 其他阶段不在线表单化
- **WHEN** 第一版展示其他 7 个阶段
- **THEN** 系统 MAY 展示占位、旧资料清单入口或后续配置状态
- **AND** 技术架构 MUST NOT 要求本 change 补齐其他 7 个阶段完整蓝色节点映射
- **AND** 技术架构 MUST NOT 要求本 change 将其他阶段产出在线表单化

#### Scenario: 不恢复排除能力
- **WHEN** 团队实施项目入口和工作区导航调整
- **THEN** 系统 MUST NOT 因本 change 恢复文件平台联动
- **AND** 系统 MUST NOT 新增日报、周报、通知推送、账号管理或通用审批流能力

### Requirement: 立项责任人分配授权 helper 边界

技术架构 MUST 使用专用授权 helper 表达立项在线表单责任人分配权限，避免通过全局项目责任人管理权限或项目查看权限放宽 `1.1 / 1.2` 分配能力。

#### Scenario: 专用 helper 范围
- **WHEN** 后端判断 `1.1 项目需求表` 或 `1.2 项目立项审批表` 的责任人分配权限
- **THEN** 后端 MUST 使用 `canManageInitiationOnlineFormResponsibility` 或等价专用 helper
- **AND** 该 helper MUST 只允许营销中心负责人
- **AND** 该 helper MUST 排除总经理助理、系统管理员、研发中心负责人和非营销中心负责人

#### Scenario: 返回权限和写接口复用同一口径
- **WHEN** 后端构建阶段资料清单、项目工作区产出权限或执行责任人保存/清空接口
- **THEN** `1.1 / 1.2` 的 `canManageResponsibility` 返回值和写接口授权 MUST 复用同一专用 helper 或等价共享逻辑
- **AND** 系统 MUST NOT 在返回权限与实际写接口之间维护两套不一致规则

#### Scenario: 不放宽全局责任人管理 helper
- **WHEN** 实现该修复
- **THEN** 后端 MUST NOT 直接放宽全局 `canManageProjectResponsibility` 或等价全局 helper
- **AND** 其他阶段资料责任人分配权限 MUST 保持既有规则

#### Scenario: 1.3 不进入责任人分配 helper
- **WHEN** 后端判断 `1.3 项目立项通知`
- **THEN** 专用责任人分配 helper MUST 返回 false
- **AND** 系统 MUST NOT 通过资料责任人分配接口表达 `1.3` 默认处理人

### Requirement: 前端体验统一架构边界

前端信息架构和视觉体验统一 MUST 不改变后端业务状态机、权限模型、数据库结构或接口边界。前端 MUST 继续以 API 返回的 `permissions`、`blockingReasons`、`status` 和在线表单权限字段驱动按钮可用性和状态展示。

#### Scenario: 不改变后端业务状态机
- **WHEN** 团队实施前端项目入口、项目工作区、旧资料清单辅助区或工作台深链体验统一
- **THEN** 实现 MUST NOT 改变立项阶段 `1.1 / 1.2 / 1.3` 已确认业务规则
- **AND** 实现 MUST NOT 新增或改变后端资料提交、在线表单提交、评价审批、返工清除或阶段推进状态机

#### Scenario: 不新增权限判断来源
- **WHEN** 前端展示节点产出、在线表单、责任人分配、评价审批或旧资料清单操作
- **THEN** 前端 MUST 使用后端返回的权限字段、在线表单权限、`blockingReasons` 和状态字段控制入口可见性与可用性
- **AND** 前端 MUST NOT 因 UI 统一新增本地业务权限来源

#### Scenario: 不新增后端接口
- **WHEN** 第一版统一项目总览、项目工作区、我的工作台和旧资料清单体验
- **THEN** 前端 MUST 复用现有项目总览、项目详情、项目工作区、阶段资料清单和在线表单接口
- **AND** 本 change MUST NOT 要求新增后端接口、数据库表、migration 或后端权限模型

#### Scenario: API 字段不足记录为后续 change
- **WHEN** 实施 UI 统一时发现现有 API 字段不足以表达按钮权限、阻塞原因、状态或深链定位
- **THEN** 团队 MUST 记录为后续独立 change
- **AND** 团队 MUST NOT 在本 change 中临时扩展接口或用前端推断替代后端字段

#### Scenario: 样式和组件边界收敛
- **WHEN** 后续实现前端体验统一
- **THEN** 前端 MUST 收敛 App shell、页面头部、阶段导航、蓝色节点列表、节点产出区、在线表单动作区和旧清单辅助区的组件边界
- **AND** 样式实现 MUST 避免继续向全局 `styles.css` 无序堆叠与页面职责强耦合的规则

### Requirement: 流程图变化分类机制

技术架构 MUST 要求后续流程图更新先完成变化分类和影响分析，再进入实现；团队 MUST NOT 直接按流程图视觉变化修改业务代码、数据库、接口、权限或前端入口。

#### Scenario: 流程图更新先分类
- **WHEN** 团队收到新的项目流程图或流程图修订版
- **THEN** 团队 MUST 先将变化分类为文案/备注变化、资料模板变化、蓝色节点变化、审批/返工规则变化、在线表单变化或项目模式变化
- **AND** 团队 MUST 在分类完成前不得直接修改业务代码

#### Scenario: 蓝色节点变化不等同于资料模板变化
- **WHEN** 流程图只新增、拆分或调整蓝色业务节点而未确认新增产出资料
- **THEN** 技术架构 MUST 将其优先视为项目工作区节点映射变化
- **AND** 系统 MUST NOT 因蓝色节点变化自动新增数据库字段、资料模板或 completionMode

#### Scenario: 资料模板变化必须独立评审
- **WHEN** 流程图变化疑似涉及新增资料、删除资料、资料改名、阶段移动、必填性变化或 completionMode 变化
- **THEN** 团队 MUST 通过独立 change 评审阶段资料模板、初始化、齐套、工作台、返工和归档触发影响
- **AND** 团队 MUST NOT 将该变化混入纯前端节点映射 change

#### Scenario: 草稿和成品拆分原则
- **WHEN** 流程图中准备节点和签订节点共用一个成品产出块
- **THEN** 技术架构 MUST 优先将其识别为流程图漏画草稿产出
- **AND** 后续实现 MUST 按草稿产出候选和成品产出候选分别评审模板、状态、权限和完成规则

#### Scenario: 不长期支持伪多对一
- **WHEN** 后续迁移技术协议、销售合同或采购合同相关准备/签订节点
- **THEN** 系统 MUST NOT 长期用同一个成品资料状态承载准备、审核、签订和成品完成多个业务状态
- **AND** 团队 MUST 通过独立 change 明确草稿资料和成品资料的关系

#### Scenario: 成本估算表为多节点协作例外
- **WHEN** 后续迁移成本估算和价格估算相关节点
- **THEN** 技术架构 MAY 允许 `成本估算表` 作为真实多人或多节点协作同一产出
- **AND** 该例外 MUST NOT 放宽其他准备/签订类资料的草稿和成品拆分原则

#### Scenario: 架构边界保持当前状态机
- **WHEN** 本 change 完成 20260629 流程图影响分析
- **THEN** 系统 MUST 继续保持当前后端业务状态机、权限模型、数据库结构和接口边界
- **AND** 系统 MUST NOT 因本 change 修改立项阶段在线表单、`1.2` 专用评价审批、精准返工或阶段推进逻辑

#### Scenario: 旧资料清单辅助区不得一次性删除
- **WHEN** 后续逐阶段迁移 20260629 蓝色节点
- **THEN** 技术架构 MUST 允许旧资料清单作为辅助兼容区继续存在
- **AND** 团队 MUST NOT 因流程图更新一次性删除其他 7 阶段旧资料操作入口

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

### Requirement: v20260629 工作区大框架架构边界

技术架构 MUST 将 `implement-project-workspace-v20260629-template-shell-v1` 限定为目标模板配置和项目工作区 shell 第一版实现边界；本 shell 实现 MUST 避免在同一 change 中引入新项目默认模板切换、旧项目迁移、通用操作迁移、流程引擎、在线表单大扩展、文件平台联动、付款流或项目模式分支。

#### Scenario: shell change 不切换运行模板
- **WHEN** 本 change 定义 `v20260629` 配置或受控开关设计
- **THEN** 系统 MUST NOT 将其作为新项目默认运行模板
- **AND** 新项目默认模板切换 MUST 由后续独立 change 实现

#### Scenario: shell change 不迁移旧项目
- **WHEN** 系统存在 20260625 64 项旧项目
- **THEN** 本 change MUST NOT 自动补初始化、迁移或改写旧项目资料状态
- **AND** 旧项目迁移 MUST 由后续独立 change 实现

#### Scenario: 不引入通用流程引擎
- **WHEN** 后续实现 `v20260629` 目标模板和产出卡片
- **THEN** 技术架构 MUST NOT 将蓝色模块或产出卡片实现为通用 BPM/流程引擎
- **AND** 第一版 MUST 优先复用阶段资料、附件、状态、权限和操作日志等既有边界

#### Scenario: 产出卡片第一版不迁移通用操作执行
- **WHEN** shell 第一版显示产出卡片
- **THEN** 系统 MAY 展示非立项资料的处理入口，并将用户定位到旧资料清单对应资料
- **AND** 系统 MUST NOT 在本 change 中默认迁移通用文件上传、提交、审核或退回执行能力
- **AND** 系统 MUST NOT 创建第二套上传、提交、审核或退回执行逻辑
- **AND** 这些执行能力 MUST 后续按阶段独立迁移

#### Scenario: 不做在线表单大扩展
- **WHEN** 后续迁移非立项阶段产出卡片
- **THEN** 系统 MUST 默认按文件上传或附件上传能力实现
- **AND** 哪些资料升级为在线表单、专用审批或复杂状态机 MUST 由后续逐阶段 change 单独确认

#### Scenario: 不做文件平台联动
- **WHEN** 产出卡片承载附件上传或文件上传入口
- **THEN** 第一版 MUST NOT 调用文件管理平台、创建文件平台目录或依赖文件平台权限
- **AND** 文件平台联动如需恢复 MUST 继续由独立 change 管理

#### Scenario: 不混入付款发票项目模式
- **WHEN** `v20260629` 目标模板包含发票、付款、启动通知、发货通知或项目模式相关语义
- **THEN** 本大框架第一版 MUST NOT 实现付款流、发票流、自研/外采项目模式分支或第二阶段补录
- **AND** 这些能力必须后续独立规划和实现

#### Scenario: shell 实现必须分层验证
- **WHEN** 本 shell change 修改后端模板配置、工作区接口或前端工作区
- **THEN** 团队 MUST 分别验证 API check、Web build、OpenSpec validate 和浏览器/人工验收
- **AND** 验收 MUST 覆盖 8 阶段、蓝色模块、产出卡片、旧资料清单兼容区和立项在线表单不回退

### Requirement: 旧资料清单通用操作迁移架构边界

技术架构 MUST 将 `migrate-stage-document-common-actions-to-workspace-cards-v1` 限定为把现有旧资料清单通用操作迁移到项目工作区产出卡片的规划和第一版实现边界；本 change MUST 禁止第二套状态机、复杂流程引擎、v20260629 71 项模板切换和数据库 migration。

#### Scenario: 禁止数据库 migration
- **WHEN** 本 change 规划或实现产出卡片通用操作迁移
- **THEN** 系统 MUST NOT 新增资料表结构、修改数据库 schema 或写 migration
- **AND** 第一版 MUST 复用现有资料、附件、权限、状态和日志数据结构

#### Scenario: 禁止第二套状态机和流程引擎
- **WHEN** 产出卡片承载上传、提交、审核、退回、返工或适用性操作
- **THEN** 系统 MUST NOT 引入第二套资料状态机、通用 BPM 或复杂流程引擎
- **AND** 系统 MUST 复用现有阶段资料状态流转和阶段推进边界

#### Scenario: 禁止第二套执行规则
- **WHEN** 前端从旧资料清单迁移通用操作到上方产出卡片
- **THEN** 系统 MUST NOT 创建第二套上传、提交、审核、退回、返工、不适用或恢复适用规则
- **AND** 产出卡片 MUST 调用或封装现有能力，而不是重新定义执行语义

#### Scenario: 禁止 71 模板切换
- **WHEN** 本 change 完成规划或第一版实现
- **THEN** 系统 MUST NOT 将 v20260629 71 项模板设为新项目默认模板
- **AND** 系统 MUST NOT 把新增 71 项候选落库或补初始化旧项目

#### Scenario: 文件平台联动不在本 change 处理
- **WHEN** 产出卡片承载附件上传、附件下载或附件删除
- **THEN** 系统 MUST 继续遵守当前在线平台附件边界
- **AND** 系统 MUST NOT 在本 change 中处理 file-platform-integration-v1 或恢复文件平台联动

#### Scenario: 分阶段验证
- **WHEN** 本 change 后续 implementation 修改后端资料接口、项目工作区数据聚合或前端产出卡片
- **THEN** 团队 MUST 分别验证 API check、Web build、OpenSpec validate 和浏览器/人工验收
- **AND** 验收 MUST 覆盖上方产出卡片通用操作、下方旧资料清单降级、立项在线表单不回退、71 模板未切换、旧项目未迁移，以及桌面/移动不重叠不溢出

