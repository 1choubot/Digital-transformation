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

当前 20260625 在线平台内部资料闭环阶段 MUST 暂停数字化平台与文件管理平台归档联动；在线平台 MUST 自己负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要、阶段推进状态和已启用的专用阶段 workflow，且当前职责不包含泛化阶段关口审批。

#### Scenario: 当前阶段文件平台职责暂停
- **WHEN** 当前阶段处理项目、阶段、资料、附件、精准返工或阶段推进
- **THEN** 系统 MUST NOT 要求文件管理平台负责目录、归档、文件列表、下载权限、文件日志或返工状态

#### Scenario: 数字化平台职责
- **WHEN** 数字化平台处理阶段资料
- **THEN** 数字化平台必须负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要、阶段推进状态和已启用的专用阶段 workflow
- **AND** 数字化平台 MUST NOT 把泛化阶段关口审批作为当前在线平台内部资料闭环的阶段推进前置

#### Scenario: 不通过文件平台实现复杂业务流
- **WHEN** 系统处理合同签订 workflow、合同审核记录表、采购申请表、采购合同审核记录表、发票、设计变更资料、随机资料移交、资料服务器核查或精准返工
- **THEN** 系统不得通过文件管理平台实现合同签订 workflow、采购审批流、付款流、发票流转、设计变更流程引擎、随机资料移交流程、资料服务器核查流程或返工流转

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

系统 MUST 保持文件管理平台只承担文件能力，不得因 20260625 资料完成规则变化而把文件平台扩展成项目流程或资料审批系统；合同签订专用 workflow MUST 由数字化平台后端模块承载。

#### Scenario: 文件平台不判断资料完成
- **WHEN** 数字化平台向文件平台归档或读取文件
- **THEN** 文件平台 MUST NOT 判断资料是否完成、是否确认、是否满足阶段推进或是否触发条件

#### Scenario: 数字化平台负责完成规则
- **WHEN** 系统判断资料是否完成、阶段是否齐套或是否允许阶段推进
- **THEN** 判断 MUST 由数字化平台根据项目、阶段、资料适用性、资料状态、`completionMode` 和已启用的专用阶段 workflow 完成

#### Scenario: 不新增无关复杂业务流
- **WHEN** 系统处理合同、采购、付款、发票、设计变更、随机资料移交或资料服务器核查相关产出
- **THEN** 技术架构 MUST NOT 因本规划新增采购审批流、通用付款流、发票流转、设计变更流程引擎、随机资料移交流程或资料服务器核查流程
- **AND** 合同签订阶段 MAY 使用本 change 定义的数字化平台专用 workflow

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

### Requirement: 覆盖核查架构边界

技术架构 MUST 将 `audit-workspace-card-coverage-before-legacy-checklist-cleanup-v1` 限定为旧资料清单清理前的覆盖率核查口径和规划；本 change MUST NOT 切换 71 模板、删除或隐藏旧资料清单、改数据库、迁移旧项目或新增执行逻辑。

#### Scenario: 禁止数据库和 migration
- **WHEN** 本 change 建立覆盖率核查口径
- **THEN** 系统 MUST NOT 修改数据库 schema 或写 migration
- **AND** 覆盖核查 MUST 复用现有模板配置、workspace 聚合结果和阶段资料状态作为输入

#### Scenario: 禁止 71 模板切换
- **WHEN** 覆盖核查引用 v20260629 71 项目标模板配置
- **THEN** 系统 MUST NOT 将 v20260629 71 项设为新项目默认模板
- **AND** 系统 MUST NOT 把 71 项候选落库或补初始化旧项目

#### Scenario: 禁止旧清单清理执行
- **WHEN** 覆盖核查形成旧资料清单清理建议
- **THEN** 本 change MUST NOT 隐藏、折叠、删除旧资料清单组件或移除旧资料清单入口
- **AND** 清理执行 MUST 通过后续独立 change 管理

#### Scenario: 禁止新增业务执行逻辑
- **WHEN** 覆盖核查识别上方 workspace card 操作覆盖
- **THEN** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工或不适用执行规则
- **AND** 覆盖核查 MUST 只判断现有主入口和现有能力覆盖情况

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或后续执行阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

### Requirement: 旧模板兼容 workspace 输出架构边界

技术架构 MUST 支持将当前运行 64 项中的旧模板兼容资料映射到 workspace card，同时 MUST 区分 v20260629 71 项目标模板输出和旧模板兼容输出。

#### Scenario: 兼容输出不改变 71 项目标模板计数
- **WHEN** 系统为 `3.3` 和 `5.4` 增加 workspace card
- **THEN** 技术实现 MUST NOT 将这两个兼容输出追加计入 `V20260629_TARGET_TEMPLATE_OUTPUT_COUNT`
- **AND** v20260629 目标模板输出数量 MUST 继续为 71
- **AND** 系统 MUST NOT 因兼容输出把 71 项目标模板解释为 73 项

#### Scenario: 兼容输出只绑定现有资料
- **WHEN** workspace shell 返回 `3.3` 或 `5.4` 兼容 output/card
- **THEN** 该 output/card MUST 通过 `legacyDocumentCode` 绑定当前运行资料
- **AND** 系统 MUST NOT 创建新资料模板项、写入项目资料记录、补初始化旧项目或执行旧项目迁移

#### Scenario: 复用现有状态和操作架构
- **WHEN** 用户通过 `3.3` 或 `5.4` 兼容卡片处理资料
- **THEN** 系统 MUST 复用现有资料状态、权限、附件、业务日志和通用操作接口
- **AND** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工、不适用或恢复适用规则
- **AND** 系统 MUST NOT 引入合同审核流、采购审核流、BPM 或流程引擎

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或实现阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

### Requirement: 旧资料清单折叠架构边界

技术架构 MUST 将本 change 限定为前端展示层调整：旧资料清单可默认折叠为兼容资料区，但 MUST NOT 引入数据库 migration、后端 API 变更、v20260629 71 项模板切换、旧项目迁移、旧清单删除或第二套资料执行规则。

#### Scenario: 不修改后端和数据库
- **WHEN** 本 change 实现兼容资料区默认折叠
- **THEN** 系统 MUST NOT 修改后端 API、数据库 schema 或 migration
- **AND** 系统 MUST NOT 新增或修改项目资料初始化、阶段推进、业务日志、附件或权限后端逻辑

#### Scenario: 不切换模板或迁移旧项目
- **WHEN** 本 change 完成
- **THEN** 系统 MUST NOT 将 v20260629 71 项模板切换为新项目默认模板
- **AND** 系统 MUST NOT 迁移旧项目、补初始化旧项目或把 71 项候选落库

#### Scenario: 不删除旧资料清单组件
- **WHEN** 前端将旧资料清单默认折叠为兼容资料区
- **THEN** 实现 MUST NOT 删除、物理移除或完全隐藏旧资料清单组件
- **AND** 隐藏或删除旧资料清单 MUST 继续通过后续独立 change 决定

#### Scenario: 不新增第二套执行规则
- **WHEN** 用户通过上方 workspace card 或展开后的兼容资料区查看资料
- **THEN** 系统 MUST 继续复用现有资料状态、权限、附件、业务日志和通用操作接口
- **AND** 系统 MUST NOT 新增第二套上传、提交、审核、退回、返工、不适用或恢复适用规则

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划或实现阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

### Requirement: v20260629 新项目默认模板启用架构边界

技术架构 MUST 将本 change 限定为新项目默认模板版本切换和必要 smoke 更新；实现 MUST NOT 改数据库 schema、写 migration、迁移旧项目、处理文件平台联动、删除兼容资料区或新增第二套业务状态机。

#### Scenario: 复用现有模板版本和初始化结构
- **WHEN** 团队实现 v20260629 新项目默认模板启用
- **THEN** 实现 MUST 优先复用现有模板版本、阶段资料模板、项目级资料初始化和阶段资料查询结构
- **AND** 实现 MUST NOT 新增数据库表、修改 schema 或写 migration

#### Scenario: 新旧项目并存
- **WHEN** 系统同时存在 20260625 旧项目和 v20260629 新项目
- **THEN** 架构 MUST 允许按项目已有资料记录和模板版本判断资料集合、阶段推进、工作台和项目工作区状态
- **AND** 系统 MUST NOT 假设全库项目只有一个阶段资料模板版本

#### Scenario: 兼容输出与目标模板分层
- **WHEN** 实现使用 v20260629 目标模板初始化新项目
- **THEN** 架构 MUST 区分 `V20260629_TARGET_TEMPLATE_OUTPUTS` 和 `V20260629_WORKSPACE_COMPATIBILITY_OUTPUTS`
- **AND** `LC33 / LC54` MUST NOT 进入新项目初始化、目标模板计数或模板校验

#### Scenario: 不处理文件平台联动
- **WHEN** v20260629 新项目默认模板启用
- **THEN** 系统 MUST 继续使用当前在线平台附件边界
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台目录或恢复文件平台归档状态

#### Scenario: 不新增流程引擎
- **WHEN** v20260629 71 项模板包含草稿合同、供应商评价、生产记录或资料移交等资料
- **THEN** 第一版实现 MUST 默认按文件上传或附件上传能力承载非立项资料
- **AND** 系统 MUST NOT 因模板启用新增 BPM、通用流程引擎、付款流、发票流或项目模式分支

#### Scenario: 不删除兼容资料区
- **WHEN** 新项目默认模板切换到 v20260629
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 继续通过后续独立 change 决定

#### Scenario: 分层验证
- **WHEN** 本 change implementation 修改模板默认版本、项目初始化或 smoke
- **THEN** 团队 MUST 验证 API check、OpenSpec validate、必要 Web build 和人工/代码路径验收
- **AND** 验收 MUST 覆盖新建项目 71 项、旧项目 64 项、`LC33 / LC54` 不进入新项目、立项在线表单不回退、兼容资料区不删除

### Requirement: v20260629 运行稳定验证架构边界

技术架构 MUST 将本 change 限定为 v20260629 新项目运行基线验证和阻塞 bug 修复；实现 MUST NOT 借稳定验证引入数据库 migration、旧项目迁移、文件平台联动、复杂流程引擎、第二套资料状态机或兼容资料区删除。

#### Scenario: 验证优先级分层
- **WHEN** 团队执行 v20260629 新项目运行稳定验证
- **THEN** 团队 MUST 先用 API smoke 验证数据层、模板版本、资料集合、权限和阶段推进基础
- **AND** 团队 MUST 再用人工浏览器验收验证页面和交互
- **AND** 浏览器自动化 MAY 使用但不是强制项

#### Scenario: 使用新建测试项目验证
- **WHEN** 团队验证 v20260629 新项目运行基线
- **THEN** 验证 MUST 使用新建测试项目或专门测试数据
- **AND** 团队 MUST NOT 通过迁移旧项目、补初始化旧项目或改写旧项目资料记录来制造测试条件

#### Scenario: 允许修复阻塞 bug
- **WHEN** 验证发现 v20260629 新项目运行阻塞 bug
- **THEN** 本 change MAY 修改既有后端、前端或 smoke 以修复阻塞问题
- **AND** 修复 MUST 优先复用现有项目创建、阶段资料、workspace、workbench、阶段推进、在线表单和兼容资料区入口

#### Scenario: 禁止新增第二套规则
- **WHEN** 本 change 修复 v20260629 新项目运行问题
- **THEN** 系统 MUST NOT 新增第二套资料状态机、第二套上传/提交/审核/退回/返工/不适用规则或通用流程引擎
- **AND** 系统 MUST 继续复用现有资料状态、权限、附件、业务日志和阶段推进边界

#### Scenario: 禁止数据库和迁移
- **WHEN** 本 change 处于规划、实现或验证阶段
- **THEN** 系统 MUST NOT 修改数据库 schema 或写 migration
- **AND** 系统 MUST NOT 迁移旧项目、补初始化旧项目或自动回滚已创建项目

#### Scenario: 文件平台和复杂流程后置
- **WHEN** v20260629 新项目资料涉及附件、草稿合同、供应商评价、生产记录或资料移交
- **THEN** 本 change MUST 继续使用当前在线平台附件边界
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台目录、恢复文件平台归档状态、实现付款流、发票流或项目模式分支

#### Scenario: 兼容资料区继续保留
- **WHEN** 本 change 验证新旧项目兼容资料区
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 继续通过后续独立 change 决定

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 处于规划、实现或验证阶段
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

### Requirement: 立项阶段修正架构边界

技术架构 MUST 将本 change 限定为立项阶段责任人与退回路径修正；后续实现 MAY 修改 API/Web 和必要数据库字段或等价绑定，但 MUST NOT 引入 BPM、通用流程引擎、第二套资料状态机或文件平台联动。

#### Scenario: 规划阶段不改业务代码
- **WHEN** 本 change 处于规划阶段
- **THEN** 团队 MUST NOT 修改 `digital-platform-api/src/**`
- **AND** 团队 MUST NOT 修改 `digital-platform-web/src/**`
- **AND** 团队 MUST NOT 修改数据库 schema 或写 migration

#### Scenario: 后续实现可改现有入口
- **WHEN** 本 change 进入后续实现阶段
- **THEN** 实现 MAY 修改项目创建 API、项目详情 API、立项在线表单 API、评价审批 API、新建项目页面和项目详情页面
- **AND** 实现 MAY 增加商务负责人、技术负责人所需的项目字段或等价稳定绑定
- **AND** 实现 MUST 复用现有权限、在线表单、审批、状态和业务日志能力

#### Scenario: 禁止流程引擎和第二套状态机
- **WHEN** 实现立项阶段责任人和退回路径
- **THEN** 系统 MUST NOT 引入 BPM 或通用流程引擎
- **AND** 系统 MUST NOT 创建第二套资料状态机、第二套审批状态机或第二套上传/提交/审核规则

#### Scenario: 文件平台保持后置
- **WHEN** 在线表单内容需要被查看或理解为流程图中的自动生成文件
- **THEN** 系统 MUST 以在线表单内容浏览作为第一版边界
- **AND** 系统 MUST NOT 导出 Word/PDF、生成附件、调用文件平台 API 或创建文件平台文件

#### Scenario: 旧项目兼容后续明确
- **WHEN** 后续实现需要处理没有商务负责人或技术负责人的旧项目
- **THEN** 旧项目兼容策略 MUST 在实现阶段明确
- **AND** 本 change MUST NOT 在规划阶段迁移旧项目、补初始化旧项目或改写旧项目历史数据

### Requirement: 立项在线表单模板对齐架构边界

技术架构 MUST 支持后续通过在线表单 schema 扩展对齐真实模板，同时 MUST NOT 在本 change 引入文件平台、文件生成、数据库 migration 或第二套流程状态机。

#### Scenario: 在线表单数据复用现有存储
- **WHEN** 后续实现扩展 `1.1`、`1.2`、`1.3` 在线表单 schema
- **THEN** 系统 MUST 优先复用现有在线表单数据存储
- **AND** schema MUST 支持分组、评分项或表格型结构、只读/自动带出字段和通知预览
- **AND** 本 change MUST NOT 引入旧 schema 兼容层
- **AND** 在线表单读取 MUST 以当前 schema 为准
- **AND** 旧简化 `form_data_json` MUST NOT 转换或迁移为新字段结构
- **AND** 实现阶段若证明必须调整数据库结构，MUST 通过独立明确的数据库设计和 migration 评审处理

#### Scenario: 不生成文件不接文件平台
- **WHEN** 用户保存、提交或查看 `1.1`、`1.2`、`1.3` 在线表单
- **THEN** 系统 MUST NOT 生成 Excel、Word、PDF 或普通附件
- **AND** 系统 MUST NOT 调用文件平台或模板套打能力
- **AND** 系统 MUST NOT 将在线表单完成状态绑定到文件平台文件

#### Scenario: 不引入第二套审批或状态机
- **WHEN** 后续实现 `1.2 项目立项审批表` 的商务模块、技术模块和三方意见展示
- **THEN** 系统 MUST 继续复用现有 `1.2` 商务评价、技术评价、总经理审批流
- **AND** 系统 MUST NOT 在普通表单里创建第二套商务评价、技术评价或总经理审批状态机
- **AND** 系统 MUST NOT 改变项目结束、退回、返工主流程

#### Scenario: 本规划 change 不修改业务代码
- **WHEN** 本规划 change 处于 proposal/design/spec/tasks 阶段
- **THEN** 变更 MUST 只包含规划文档和 OpenSpec artifacts
- **AND** 变更 MUST NOT 修改 `digital-platform-api/src/**`
- **AND** 变更 MUST NOT 修改 `digital-platform-web/src/**`
- **AND** 变更 MUST NOT 修改数据库 schema 或 migration

### Requirement: 立项协同表单实现架构边界

技术架构 MUST 支持本 change 在实现阶段修改 API/Web 业务代码和必要的 schema 初始化逻辑；本 change MUST NOT 写独立数据库 migration 文件，MUST NOT 批量迁移旧项目，MUST NOT 生成 Excel / Word / PDF 或接入文件平台。

#### Scenario: 客户联系人持久化
- **WHEN** 系统需要保存新建项目客户联系人
- **THEN** 系统 MUST 使用稳定项目主数据字段或等价持久化能力
- **AND** 旧项目缺少客户联系人时 MUST 允许为空
- **AND** 系统 MUST NOT 批量补写旧项目客户联系人

#### Scenario: 1.2 协同状态持久化
- **WHEN** 系统保存 `1.2` 商务部分和技术部分完成状态
- **THEN** 系统 SHOULD 优先复用现有在线表单数据存储
- **AND** 协同状态 MUST NOT 新增第二套审批状态机或资料状态机

#### Scenario: 不写独立 migration 文件
- **WHEN** 本 change 完成实现
- **THEN** 本 change MUST NOT 新增 migration 文件
- **AND** 若后续生成文件元数据或更复杂协同查询需要结构化字段，MUST 通过后续独立数据库设计处理

### Requirement: 1.2 协同填写复用现有架构

技术架构 MUST 让 `1.2` 协同填写复用现有在线表单、权限、工作台、评价审批、业务日志和阶段资料状态边界，不得引入第二套审批状态机或通用流程引擎。

#### Scenario: 不新增第二套审批流
- **WHEN** 系统实现 `1.2` 商务负责人和技术负责人协同填写
- **THEN** 系统 MUST 继续复用现有商务评价、技术评价、总经理审批节点
- **AND** 系统 MUST NOT 在普通表单里创建第二套商务评价、技术评价或总经理审批流

#### Scenario: 不新增第二套资料状态机
- **WHEN** 系统实现商务部分和技术部分完成状态
- **THEN** 系统 MUST 将其作为 `1.2` 在线表单内部协同状态或等价稳定状态
- **AND** 系统 MUST NOT 创建第二套上传、提交、审核、退回或返工规则

#### Scenario: 不引入 BPM
- **WHEN** 系统实现协同填写和评价审批启动门禁
- **THEN** 系统 MUST NOT 引入 BPM、通用流程引擎、可视化流程编排或任意节点配置器

### Requirement: 模板文件生成后置架构边界

技术架构 MUST 将 Excel / Word / PDF 生成、模板填充、文件存储、下载预览、文件版本和文件平台联动作为后续独立设计点；本 change MUST NOT 表达为已经完成文件生成。

#### Scenario: 本 change 不生成文件
- **WHEN** 本 change 完成实现
- **THEN** 系统 MUST NOT 生成 Excel、Word、PDF、普通附件或文件平台文件
- **AND** 系统 MUST NOT 新增模板填充库、文件生成 worker 或文件存储编排

#### Scenario: 文件生成后续独立设计
- **WHEN** 后续实现模板文件生成
- **THEN** 团队 MUST 独立明确模板填充规则、生成触发点、失败重试、覆盖或版本化策略、存储位置、预览下载权限和业务日志
- **AND** 后续实现 MUST 明确是否接入文件平台

#### Scenario: 文件平台保持独立 change
- **WHEN** 后续需要将生成文件归档或同步到文件平台
- **THEN** 文件平台联动 MUST 通过后续独立 change 处理
- **AND** 本 change MUST NOT 处理 `file-platform-integration-v1`

### Requirement: 旧项目和兼容区保持边界

技术架构 MUST 保持旧项目迁移、旧数据兼容展示和兼容资料区删除为后续独立事项。

#### Scenario: 不迁移旧项目
- **WHEN** 本 change 处于实现阶段
- **THEN** 系统 MUST NOT 自动迁移旧项目
- **AND** 系统 MUST NOT 补初始化旧项目或改写旧项目历史资料状态

#### Scenario: 不删除兼容资料区
- **WHEN** 本 change 完成实现
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 通过后续独立 change 决定

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 完成实现
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界

### Requirement: 文件生成能力可复用

技术架构 MUST 将立项阶段模板文件生成设计为全局文件生成能力的首个竖切；后续其他阶段 SHOULD 能复用同一文件生成、文件记录、权限检查和产出展示模型。

#### Scenario: 后续阶段复用同一模型
- **WHEN** 后续阶段需要从结构化表单或业务数据生成模板文件
- **THEN** 系统 SHOULD 复用同一模板定位、数据映射、渲染、文件记录、权限检查和下载模型
- **AND** 系统 SHOULD 避免为每个资料项复制一次性硬编码生成逻辑

#### Scenario: 立项阶段首个竖切
- **WHEN** 团队实现文件生成能力
- **THEN** `1.1 / 1.2 / 1.3` SHOULD 作为首个端到端竖切
- **AND** 该竖切 SHOULD 暴露后续阶段复用所需的后端边界

### Requirement: 文件生成后端统一治理

技术架构 MUST 由后端统一治理模板路径、生成器、文件记录、权限检查和下载/查看接口；模板填充逻辑 MUST NOT 散落到前端。

#### Scenario: 前端不直接填充模板
- **WHEN** 用户查看或下载生成文件
- **THEN** 前端 SHOULD 调用后端文件状态和下载/查看接口
- **AND** 前端 MUST NOT 直接填充 Excel 或 Word 模板

#### Scenario: 后端统一权限检查
- **WHEN** 用户请求文件状态、元数据、查看或下载
- **THEN** 后端 MUST 统一检查项目和资料查看权限
- **AND** 无权限请求 MUST NOT 泄露存储路径或模板元数据

#### Scenario: 模板和生成器统一治理
- **WHEN** 系统执行模板文件生成
- **THEN** 后端 MUST 统一管理模板路径、模板键、数据映射和渲染器调用
- **AND** 文件生成失败 MUST 可记录和诊断

#### Scenario: mapping registry 统一治理
- **WHEN** 系统执行模板填充
- **THEN** 后端 MUST 通过统一 mapping registry 或 mapping manifest 解析模板目标位置和来源字段
- **AND** mapping 逻辑 MUST NOT 散落硬编码在控制器、页面组件或单个业务流程函数中

#### Scenario: 禁止请求传入任意模板路径
- **WHEN** 业务接口触发文件生成
- **THEN** 接口 MUST NOT 接收任意模板路径参数
- **AND** 后端 MUST 从模板注册表、配置或白名单中解析模板路径

#### Scenario: 模板路径错误可追踪
- **WHEN** 模板缺失、路径不可读或格式不支持
- **THEN** 文件记录 MUST 进入 failed 或等价状态并记录原因
- **AND** 服务 MUST NOT 因模板路径错误崩溃
- **AND** 无权限响应 MUST NOT 泄露本地模板路径

### Requirement: 文件平台保持独立

技术架构 MUST 将文件平台联动、归档、同步和平台权限映射作为后续独立 change；本 change MUST NOT 处理 `file-platform-integration-v1`。

#### Scenario: 不处理文件平台 change
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 修改或实现 `file-platform-integration-v1`
- **AND** 文件平台目录、归档、同步、平台下载权限 MUST 留到后续独立 change

#### Scenario: 本系统内部存储可作为第一版方向
- **WHEN** 后续实现第一版模板文件生成
- **THEN** 系统 MAY 使用本系统内部存储和文件记录
- **AND** 是否接入文件平台 MUST 通过独立设计决定

### Requirement: 文件元数据设计先行

技术架构 MUST 在实现文件生成持久化前明确文件记录模型；规划阶段 MUST NOT 写数据库 migration。

#### Scenario: 规划阶段不写 migration
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 新增数据库 migration
- **AND** 系统 MUST NOT 新增文件记录表实现

#### Scenario: 后续实现前先设计字段
- **WHEN** 后续实现需要文件元数据表
- **THEN** 团队 MUST 先明确项目、资料、表单、模板、版本、状态、文件名、存储路径、生成操作者、生成时间和失败原因等字段
- **AND** 团队 MUST 明确源表单提交时间或版本、源表单数据 hash、不可变源快照引用、触发事件、审批快照、模板版本或模板 hash
- **AND** 旧项目旧表单迁移策略 MUST 独立评估

#### Scenario: 历史文件不依赖可变当前数据解释
- **WHEN** 系统展示或审计历史生成文件
- **THEN** 系统 MUST 能通过生成时源快照、源 hash 和模板版本解释该文件
- **AND** 系统 MUST NOT 只依赖当前在线表单数据或当前审批节点数据解释历史文件

### Requirement: 旧项目和文件格式风险保持边界

技术架构 MUST 将旧项目旧表单迁移、PDF 转换、深度预览和复杂格式保真验证作为后续独立事项。

#### Scenario: 不迁移旧项目
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 自动迁移旧项目
- **AND** 系统 MUST NOT 补旧项目表单数据或生成历史文件

#### Scenario: PDF 转换后续处理
- **WHEN** 后续需要将 Excel 或 Word 转为 PDF
- **THEN** PDF 转换 MUST 通过后续独立 change 或独立设计处理
- **AND** 本 change MUST NOT 承诺 PDF 已生成

### Requirement: 后端统一模板文件生成治理
技术架构 MUST 继续由后端统一治理模板注册、mapping manifest、模板渲染、文件记录、内部存储、权限检查和下载接口，并 MUST 适配新版 `1.2` 模板和 `1.3` 累计通知。

#### Scenario: 1.2 模板 registry 使用新版版本
- **WHEN** 后端解析 `1.2 项目立项审批表` 模板
- **THEN** 模板 registry MUST 指向 `智能制造项目管理文件模板/项目立项审批表-模板.xlsx`
- **AND** registry SHOULD 记录新版 template version，例如 `20260707-initiation-approval-v1`
- **AND** 业务接口 MUST NOT 接收任意模板路径

#### Scenario: 1.2 manifest 显式映射新版字段
- **WHEN** 后端渲染新版 `1.2` 审批表
- **THEN** manifest MUST 显式声明新版表头、商务评分项、技术评分项和意见区目标位置
- **AND** manifest MUST 显式映射 `1.2` 项目开展模式字段到新版模板目标位置
- **AND** manifest MUST 根据字段值勾选自研模式或供应链模式
- **AND** 项目开展模式勾选 MUST 保留模板富文本 run 和字体，仅替换 checkbox 符号 run
- **AND** renderer MUST NOT 用整格 Unicode 复选框文本替换 `D20/G20`
- **AND** manifest MUST NOT 将项目开展模式绑定到系统项目模式、`projects.project_mode` 或项目主数据项目模式字段
- **AND** manifest MUST NOT 通过字段名猜测单元格位置
- **AND** manifest MUST NOT 映射项目编号

#### Scenario: DOCX 表格支持多行数据渲染
- **WHEN** 后端渲染 `1.3 项目立项通知`
- **THEN** renderer MUST support manifest-declared multi-row table rendering
- **AND** renderer MUST clone the template data row for each cumulative project row
- **AND** renderer MUST remove unused empty template rows
- **AND** renderer MUST preserve table style, borders, widths, fonts, and paragraph formatting

#### Scenario: 生成失败不回滚 1.3 提交
- **WHEN** `1.3` 提交已成功写入项目编号但通知文件生成失败
- **THEN** 系统 MUST 记录生成失败状态
- **AND** 系统 MUST NOT 回滚在线表单提交结果或 `projects.project_code`

#### Scenario: 项目编号写入路径统一治理
- **WHEN** 后端处理项目编号写入
- **THEN** `1.3 项目立项通知` 提交 MUST 是立项流程项目写入 `projects.project_code` 的唯一业务入口
- **AND** 独立项目编号更新接口 MUST NOT 对存在 `1.3` 资料项的项目写入 `projects.project_code`
- **AND** 任何保留的遗留写入路径 MUST 复用同一项目编号命名锁或等价并发保护策略
- **AND** 业务错误 MUST NOT 落成 500

### Requirement: 模板路径白名单
技术架构 MUST 通过后端模板注册表、配置或白名单解析模板路径；业务接口不得接收任意模板路径参数。

#### Scenario: 禁止请求传路径
- **WHEN** API 请求生成、查看或下载模板文件
- **THEN** 请求 MUST NOT 携带或影响本地模板路径
- **AND** 后端 MUST 从受控注册表解析 templateKey

#### Scenario: 模板根目录可部署配置
- **WHEN** 部署环境不使用默认本地模板目录
- **THEN** 后端 MAY 通过环境变量或等价配置指定模板根目录
- **AND** 该配置 MUST 只影响后端模板注册表解析
- **AND** 业务接口 MUST NOT 接受任意模板路径参数

#### Scenario: 模板路径错误可追踪
- **WHEN** 模板缺失、路径不可读或格式不支持
- **THEN** 系统 MUST 将生成记录标记为 `failed` 或等价状态并记录原因
- **AND** 服务 MUST NOT 因模板路径错误崩溃
- **AND** 无权限响应 MUST NOT 泄露本地路径

### Requirement: 内部存储和源快照审计
技术架构 MUST 为历史生成文件保存生成时源快照、源 hash、审批快照和模板 hash；`1.3` 累计通知的源快照 MUST 覆盖累计项目清单输入。

#### Scenario: 1.3 累计清单进入源快照
- **WHEN** 系统生成 `1.3 项目立项通知`
- **THEN** 源快照 MUST 包含本次用于渲染的累计项目清单
- **AND** 源快照 MUST 包含当前项目 `1.3` 提交时间 cutoff
- **AND** 源 hash MUST 覆盖 cutoff 以及每行的序号、项目编号、项目名称、客户单位和立项日期
- **AND** 历史生成文件 MUST NOT 只依赖当前可变项目表解释清单内容

#### Scenario: 1.3 重试生成不得引入未来项目
- **WHEN** 系统重试生成旧项目的 `1.3 项目立项通知`
- **THEN** 累计清单查询 MUST 使用该项目原始 `1.3` 提交时间 cutoff
- **AND** 查询 MUST NOT 包含 cutoff 之后提交的项目

#### Scenario: 新版 1.2 模板 hash 可追溯
- **WHEN** 系统生成新版 `1.2 项目立项审批表`
- **THEN** 文件记录 MUST 保存新版模板 hash 或等价模板版本信息
- **AND** 审计时 MUST 能区分旧模板生成文件和新版模板生成文件

### Requirement: 文件平台和 PDF 后置
技术架构 MUST 保持文件平台联动和 PDF 转换为后续独立能力；本 runtime change MUST NOT 处理 `file-platform-integration-v1`。

#### Scenario: 不接文件平台
- **WHEN** 本 change 实现模板文件生成
- **THEN** 系统 MUST 使用数字化平台内部存储和权限
- **AND** 系统 MUST NOT 调用文件管理平台 API 或写入文件平台归档状态

#### Scenario: 不生成 PDF
- **WHEN** 用户下载生成文件
- **THEN** 系统 MUST 返回对应 `.xlsx` 或 `.docx` 文件
- **AND** 系统 MUST NOT 生成 PDF 或承诺 PDF 转换

### Requirement: 旧分支功能移植边界
技术架构 MUST 将 `feat/weekly-report-prefill-from-daily` 视为功能来源分支，而不是可直接整体合并到当前主线的变更。

#### Scenario: 不直接 merge 旧分支
- **WHEN** 团队实现日报/周报移植
- **THEN** 团队 MUST NOT 直接 merge 整个旧分支到当前 `main`
- **AND** 团队 MUST 以当前主线文件为基底手工接入报表模块

#### Scenario: 保留当前主线立项能力
- **WHEN** 团队接入日报、周报、中心日报或周报审批能力
- **THEN** 实现 MUST NOT 回退当前立项阶段模板文件生成、项目编号由 `1.3` 确定、新版 `1.2` 审批表或生成文件权限下载能力

### Requirement: 日报周报 migration 重排
技术架构 MUST 重新生成日报/周报数据库 migration 编号，避免旧分支 migration 与当前主线 migration 冲突。

#### Scenario: 不沿用旧分支 013-027 编号
- **WHEN** 团队实现日报/周报数据库结构
- **THEN** 团队 MUST NOT 直接复制旧分支 `013-027` migration 文件编号
- **AND** 团队 MUST 在当前主线最新 migration 之后重新编号和整理日报/周报 migration

#### Scenario: 保留 SQL 语义但适配当前 schema
- **WHEN** 团队从旧分支移植日报/周报表结构
- **THEN** 团队 SHOULD 参考旧分支 SQL 语义
- **AND** 团队 MUST 检查每个表、索引、外键和用户字段依赖是否适配当前主线 schema
- **AND** 日报表 MUST 记录提交人和提交时间
- **AND** 日报草稿明细完成时间 MUST 支持空值
- **AND** 周报表 MUST 记录提交人和提交时间，并通过周报 DTO 暴露

### Requirement: SQL dump 使用边界
技术架构 MUST 将 `digital_platform_with_data.sql` 作为只读样本数据参考，不得用于覆盖当前数据库。

#### Scenario: 不导入完整 SQL dump
- **WHEN** 团队实现或验证日报/周报移植
- **THEN** 团队 MUST NOT 将 `digital_platform_with_data.sql` 直接导入当前开发库、测试库或生产库以覆盖现有 schema
- **AND** 团队 MUST NOT 用该 dump 替代正式 migration

#### Scenario: 样本数据需独立脚本
- **WHEN** 团队确需使用 dump 中的日报/周报样本数据
- **THEN** 团队 MUST 编写独立测试数据导入脚本
- **AND** 该脚本 MUST 只导入测试库需要的报表样本数据
- **AND** 该脚本 MUST NOT 删除或覆盖当前主线已有项目、阶段资料、在线表单或生成文件数据

### Requirement: 后端报表模块接入当前架构
技术架构 MUST 要求后端报表模块接入当前主线的 Express app、认证、错误处理、用户和组织角色模型。

#### Scenario: 路由接入当前 app
- **WHEN** 团队移植日报、周报或中心日报路由
- **THEN** 路由 MUST 接入当前主线 `app.js` 和当前认证中间件
- **AND** 路由 MUST NOT 覆盖当前项目、阶段资料、立项在线表单或生成文件路由

#### Scenario: 错误处理保持当前协议
- **WHEN** 报表 API 返回业务错误
- **THEN** 后端 MUST 使用当前主线错误处理中间件和业务错误响应格式
- **AND** 业务校验失败 MUST NOT 落成 500

#### Scenario: 用户字段依赖需适配
- **WHEN** 报表模块依赖职位、中心、审批人或责任人信息
- **THEN** 实现 MUST 明确这些字段与当前用户、组织角色和权限模型的映射
- **AND** 实现 MUST NOT 直接用旧分支用户 schema 覆盖当前用户表
- **AND** 本切片 MUST NOT 新增或依赖 `users.job_title`

#### Scenario: AI、导出和评分路由受控启用
- **WHEN** 团队移植旧分支日报/周报剩余能力
- **THEN** 本切片 MAY 挂载报表导出、AI 预填整理、周报评分和最终评分路由
- **AND** 这些路由 MUST 复用当前认证、权限、状态门禁和错误处理
- **AND** 前端 MUST NOT 调用未配置或无权限的 AI/评分能力

#### Scenario: 中心日报受控调度
- **WHEN** 部署环境启用中心日报计划检查
- **THEN** 后端 MUST 通过可关闭的进程内调度器执行受控检查
- **AND** 本切片 MUST NOT 在调度器中生成报表文件或接入外部文件平台

### Requirement: 前端报表模块接入当前架构
技术架构 MUST 要求前端报表页面接入当前主线 router、App shell、导航、HTTP 客户端和样式体系。

#### Scenario: 当前 app shell 为基底
- **WHEN** 团队移植日报、周报、周报审批或中心日报页面
- **THEN** 团队 MUST 以当前主线 `router.js`、`App.vue` 和导航结构为基底手工接入
- **AND** 团队 MUST NOT 用旧分支 app shell 覆盖当前项目工作区体验

#### Scenario: HTTP 客户端冲突单独 review
- **WHEN** 团队移植报表 API 客户端
- **THEN** `digital-platform-web/src/api/http.js` MUST 单独 review 登录态、错误处理和拦截器差异
- **AND** 实现 MUST 保留当前主线已有项目和立项接口行为

### Requirement: 报表移植验证边界
技术架构 MUST 要求日报/周报移植同时验证报表功能和当前立项阶段核心回归。

#### Scenario: 报表验证
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行 API check、Web build、OpenSpec strict/all 和日报/周报相关自动化测试
- **AND** 团队 SHOULD 手动验证日报填写、日报补录、周报预填、周报审批、中心日报查询、导出、AI 不可用/可用状态、评分和最终评审

#### Scenario: 立项回归
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行或等价覆盖立项阶段 smoke
- **AND** 验证 MUST 确认 `1.1 / 1.2 / 1.3` 模板文件生成、项目编号流程和 v20260629 / 71 项数量未回退

### Requirement: 报表导出架构
技术架构 MUST 支持日报、周报和中心日报 Excel 导出，并 MUST 将导出限制在数字化平台内部能力边界内。

#### Scenario: Excel 导出依赖显式声明
- **WHEN** 实现报表 Excel 导出
- **THEN** 所需 npm 依赖 MUST 显式写入 `package.json` 和 lockfile
- **AND** 实现 MUST NOT 依赖未声明的本机全局包或旧分支 node_modules

#### Scenario: 导出模板路径受控
- **WHEN** 报表导出需要模板文件
- **THEN** 后端 MUST 从受控配置或白名单解析模板根目录和模板文件
- **AND** 业务请求 MUST NOT 传入任意本地模板路径
- **AND** 无权限或失败响应 MUST NOT 泄露本地绝对路径

#### Scenario: 导出文件生命周期
- **WHEN** 后端生成报表导出文件
- **THEN** 文件 MUST 写入受控临时目录或内部导出目录
- **AND** 下载后 SHOULD 清理临时文件
- **AND** 导出 MUST NOT 写入文件平台或阶段资料生成文件表

### Requirement: 报表 AI 配置治理
技术架构 MUST 通过环境配置控制 AI 周报预填整理和 AI 评分能力，并 MUST 在未配置时安全降级。

#### Scenario: AI 配置不入库不入代码
- **WHEN** 配置 AI endpoint、model、key 或开关
- **THEN** 配置 MUST 来自环境变量或等价部署配置
- **AND** API key MUST NOT 写死在代码、测试快照或 OpenSpec 文档中

#### Scenario: AI 默认安全
- **WHEN** 部署环境未显式配置 AI
- **THEN** AI 入口 MUST 默认不可用或禁用
- **AND** 普通日报、周报、中心日报和导出流程 MUST 继续可用

#### Scenario: AI 能力状态不泄露配置
- **WHEN** 前端查询周报 AI 能力状态
- **THEN** 后端 MUST 要求已认证会话
- **AND** 响应 MUST 只包含能力布尔值和用户可读提示
- **AND** 响应 MUST NOT 返回 AI endpoint、model、key 或等价敏感配置

#### Scenario: AI 输出隔离
- **WHEN** AI 返回预填整理或评分内容
- **THEN** 后端 MUST 限制可接受字段范围
- **AND** AI MUST NOT 修改项目、日期、审批状态、提交状态或权限相关事实

### Requirement: 报表评分架构
技术架构 MUST 将周报 AI/规则评分和最终人工评审作为周报审批后的受控业务能力。

#### Scenario: 评分状态门禁
- **WHEN** 后端处理评分或最终评审请求
- **THEN** 后端 MUST 校验周报提交状态、审批状态、评分人权限和目标用户角色
- **AND** 后端 MUST NOT 只依赖前端隐藏按钮

#### Scenario: 评分数据可追踪
- **WHEN** 后端保存评分结果
- **THEN** 结果 MUST 包含评分来源、评分时间、总分/等级和失败原因或空失败原因
- **AND** 最终人工评分 MUST 包含评审人和评审时间

#### Scenario: 内容变化后评分失效
- **WHEN** 周报被打回、编辑、再提交或审批状态回到待处理
- **THEN** 后端 MUST 清除或失效旧评分/最终评审字段
- **AND** 列表和详情 MUST NOT 把旧评分展示为当前版本最终评分

### Requirement: 方案设计内部状态机架构
技术架构 MUST 将方案设计阶段内部流程建模为阶段内状态机，并 MUST 与既有项目阶段模型兼容。

#### Scenario: 阶段内状态机存储
- **WHEN** 后续实现方案设计内部流程
- **THEN** 架构 MUST 支持存储 9 个内部节点的状态、当前节点、退回原因、处理人、处理时间和历史记录
- **AND** 架构 MUST 保持项目大阶段仍为既有 8 大阶段

#### Scenario: 节点推进由后端统一控制
- **WHEN** 文件提交、在线表单提交、审批通过、审批退回、分支选择或项目结束发生
- **THEN** 后端 MUST 统一计算下一节点、节点状态和阶段推进门禁
- **AND** 前端 MUST NOT 直接决定节点推进结果

#### Scenario: 项目结束门禁
- **WHEN** 报价未被客户接受且商务负责人线下与总经理讨论后选择项目结束
- **THEN** 架构 MUST 提供统一的项目结束状态和后续阶段操作门禁
- **AND** 合同签订及后续阶段接口 MUST 能拒绝已结束项目的写操作

### Requirement: 方案设计项目内角色权限架构
技术架构 MUST 支持项目内流程角色和既有组织权限共同决定方案设计阶段操作权限。

#### Scenario: 项目内角色模型
- **WHEN** 后续实现方案设计准备节点
- **THEN** 架构 MUST 支持在项目维度记录项目经理、技术负责人、商务负责人、采购负责人、财务会计和财务负责人
- **AND** 技术负责人、商务负责人、采购负责人、财务会计和财务负责人 MUST 与全局组织角色分离
- **AND** 项目经理 MUST 复用项目现有项目经理用户关联，例如 `projectManagerUserId` 或等价字段

#### Scenario: 项目经理变更同步
- **WHEN** 方案设计准备节点重新指定项目经理
- **THEN** 架构 MUST 更新项目现有项目经理关联并记录变更历史和业务日志
- **AND** 架构 MUST 使项目经理工作台、项目详情展示、方案设计工作计划待办和后续项目经理相关权限使用更新后的同一项目经理来源
- **AND** 架构 MUST NOT 长期维护与项目现有项目经理字段冲突的第二套方案设计项目经理字段

#### Scenario: 历史项目项目经理兼容
- **WHEN** 历史项目缺少方案设计准备分配记录
- **THEN** 架构 MUST 使用项目现有项目经理关联作为默认项目经理来源
- **AND** 架构 MUST NOT 为兼容历史项目创建冲突的项目经理来源

#### Scenario: 权限解析结果返回前端
- **WHEN** 前端请求方案设计阶段节点详情或工作台待办
- **THEN** 后端 MUST 返回当前用户可执行动作、不可执行原因和待办信息
- **AND** 前端 MUST NOT 维护独立权限推导规则

#### Scenario: 负责人审批权限
- **WHEN** 系统判断研发中心负责人、制造中心负责人、财务负责人或总经理审批权限
- **THEN** 后端 MUST 基于既有组织字段、项目内角色和项目状态计算权限
- **AND** 后端 MUST NOT 依赖未确认的新全局角色字段

### Requirement: 方案设计在线表单生成架构
技术架构 MUST 复用立项阶段在线表单和模板文件生成机制支持项目方案分析表、C15 内部方案评审记录表、C16 客户方案评审记录表和 C18 报价单，并 MUST 支持 C05/C15/C16 表单提交生成成功后的节点自动提交尝试。

#### Scenario: 项目方案分析表在线表单
- **WHEN** 项目方案分析表通过在线表单生成文件
- **THEN** 架构 MUST 支持在线表单保存、提交、审批前置状态和模板文件生成状态
- **AND** 模板文件生成 MUST 使用 `项目方案分析表-模板.xlsx`
- **AND** 表单提交生成成功后 MUST 复用 `solution_analysis` 节点提交编排和门禁自动尝试提交节点
- **AND** 产品功能框图缺失时 MUST 保留表单提交成功并返回缺项结果

#### Scenario: C15 C16 方案评审记录表多上下文
- **WHEN** 内部方案评审和客户方案评审记录通过在线表单生成文件
- **THEN** 架构 MUST 保留 C15 方案评审记录表（内部方案评审）和 C16 方案评审记录表（客户方案评审）两个独立产出/资料项
- **AND** 架构 MUST 支持二者复用同一 `方案评审记录表-模板.xlsx` 在不同评审类型或节点上下文下生成文件
- **AND** 架构 MUST 分别保留 C15 和 C16 的多次评审记录版本、审批历史和最新有效版本
- **AND** 架构 MUST NOT 将 C15 和 C16 合并为一个资料项或减少 71 项资料数量
- **AND** 表单提交生成成功后 MUST 复用对应 review 节点提交编排和门禁自动尝试提交节点

#### Scenario: C18 报价单 Word 模板生成
- **WHEN** 报价单在线表单提交并生成文件
- **THEN** 架构 MUST 支持在线表单保存、提交、生成状态、生成失败原因和生成文件下载状态
- **AND** 报价单生成 MUST 使用 `报价单-模板.docx`
- **AND** 报价单生成文件格式 MUST 为 `.docx`
- **AND** 后端 SHOULD 复用现有 `renderDocxTemplate()` 或同等 OOXML 渲染能力
- **AND** 后端 MUST NOT 为报价单生成引入外部文档服务或浏览器端模板填充

#### Scenario: 不在前端填充模板
- **WHEN** 用户查看或下载项目方案分析表、方案评审记录表或报价单生成文件
- **THEN** 前端 MUST 只调用后端状态、查看或下载接口
- **AND** 前端 MUST NOT 维护 Excel 单元格、Word 表格或 Word 文本替换映射

### Requirement: 方案设计上传槽和版本架构
技术架构 MUST 支持方案设计阶段文件产出、成本估算四段文件和投标书双上传槽的版本化上传。

#### Scenario: 普通文件产出上传槽
- **WHEN** 后续实现方案设计工作计划、产品功能框图、方案设计 8 个产出或报价单
- **THEN** 架构 MUST 使用阶段资料或节点上传槽记录文件、提交人、提交时间、版本、状态和审批关联
- **AND** 架构 MUST 不接外部文件平台

#### Scenario: 成本估算四段上传槽
- **WHEN** 后续实现 C17 成本估算表
- **THEN** 架构 MUST 在一个主资料项下支持研发成本估算、制造成本估算、营销成本估算、财务/运营成本估算四个内部上传槽
- **AND** 每个上传槽 MUST 保留文件版本和审批历史
- **AND** 后一上传槽 MUST 能引用前一上传槽的文件作为制作基础
- **AND** 营销成本估算上传槽 MUST 使用 `marketing_cost_estimation_file`

#### Scenario: 投标书双上传槽
- **WHEN** 后续实现投标流程
- **THEN** 架构 MUST 在投标书产出下支持商务标和技术标两个必填上传槽
- **AND** 架构 MUST 支持两个上传槽均完成后再提交总经理审批
- **AND** 架构 MUST NOT 新增商务标和技术标资料项

### Requirement: 财务文件后端保密架构
技术架构 MUST 在后端统一保护财务/运营成本估算文件的元数据、预览和下载。

#### Scenario: 元数据过滤
- **WHEN** 非授权用户请求方案设计阶段节点详情、资料清单、附件列表或业务日志
- **THEN** 后端 MUST 过滤财务/运营成本估算文件名、附件明细、预览地址和下载地址
- **AND** 后端 MAY 返回节点状态和审批结果

#### Scenario: 财务文件授权主体
- **WHEN** 后端判断财务/运营成本估算文件查看或下载权限
- **THEN** 权限 MUST 只授予总经理和运营中心授权处理人
- **AND** 运营中心授权处理人 MUST 至少包括本项目财务会计、财务负责人，以及后续规格明确授权的运营中心人员
- **AND** 研发中心负责人、技术负责人、项目经理、商务负责人、采购负责人、制造中心负责人、非授权运营中心人员、总经理助理、系统管理员和其他无关用户 MUST 被视为非授权用户

#### Scenario: 下载预览鉴权
- **WHEN** 用户请求财务/运营成本估算文件下载或预览
- **THEN** 后端 MUST 复用财务文件权限检查
- **AND** 无权用户 MUST 被拒绝

#### Scenario: 权限不可只在前端
- **WHEN** 前端隐藏财务文件入口
- **THEN** 后端 MUST 仍独立执行财务文件权限检查
- **AND** 架构 MUST NOT 依赖前端隐藏作为保密措施

### Requirement: 方案设计专用流程与普通资料审核架构边界
技术架构 MUST 将纳入方案设计内部状态机的资料项和上传槽作为专用流程对象处理，普通资料审核不得形成第二套状态来源。

#### Scenario: 专用对象完成状态派生
- **WHEN** 后端计算项目方案分析、C15 内部方案评审、C16 客户方案评审、C17 成本估算、报价或投标相关资料的完成状态
- **THEN** 完成状态 MUST 从方案设计专用节点状态机派生
- **AND** C17 派生 MUST 消费研发、制造、营销、财务四段成本节点和 current 文件齐套结果
- **AND** 阶段推进门禁 MUST 使用专用节点最终状态和专用完成口径

#### Scenario: 普通审核接口拦截
- **WHEN** 用户直接调用普通阶段资料提交、确认或退回接口处理专用流程对象
- **THEN** 后端 MUST 拒绝请求或返回专用流程错误
- **AND** 普通接口 MUST NOT 绕过或替代项目方案分析节点审批、内部方案评审审批、客户方案评审审批、研发成本估算审批、制造成本估算审批、营销成本估算审批、财务负责人审批、总经理财务成本估算审批、商务负责人报价结果处理或投标审批

#### Scenario: 避免双重真相
- **WHEN** 架构设计方案设计节点状态、资料状态、齐套摘要、阶段推进门禁或工作台待办
- **THEN** 架构 MUST 避免普通资料状态与专用节点状态形成双重真相
- **AND** 工作台待办 MUST 来源于专用节点状态，不得同时生成普通资料审核待办和专用节点审批待办

### Requirement: 方案设计工作台待办架构
技术架构 MUST 提供由后端派生的方案设计阶段待办能力。

#### Scenario: 待办派生输入
- **WHEN** 后端计算方案设计阶段待办
- **THEN** 计算 MUST 使用项目状态、内部节点状态、项目内角色、组织角色、资料提交状态、审批状态、退回状态和财务保密规则
- **AND** 计算 MUST NOT 依赖前端传入的待办类型作为授权依据

#### Scenario: 待办返回操作范围
- **WHEN** 后端返回方案设计阶段待办
- **THEN** 每条待办 MUST 包含项目、节点、目标对象、可执行动作、状态、阻塞原因和跳转上下文
- **AND** 待办 MUST 不泄露无权查看的财务文件信息

### Requirement: 方案设计边界和部署架构
技术架构 MUST 保持本规划的边界，不得因方案设计阶段实现引入未确认的平台能力。

#### Scenario: 不接文件平台
- **WHEN** 后续实现方案设计阶段文件上传、生成文件查看或附件下载
- **THEN** 架构 MUST 使用数字化平台内部文件能力
- **AND** 架构 MUST NOT 调用文件平台、同步文件平台或展示文件平台归档状态

#### Scenario: 不生成 PDF
- **WHEN** 后续实现项目方案分析表、方案评审记录表或其他方案设计文件查看
- **THEN** 架构 MUST NOT 要求生成 PDF
- **AND** 系统 MUST NOT 对用户承诺 PDF 下载

#### Scenario: 不迁移旧项目
- **WHEN** 方案设计阶段内部流程上线
- **THEN** 架构 MUST 不强制迁移旧项目历史数据
- **AND** 历史项目兼容策略 MUST 明确，不得覆盖已有资料或审批记录

#### Scenario: 不导入 SQL dump
- **WHEN** 后续实现或验证方案设计阶段
- **THEN** 架构 MUST 使用可复现 migration 或初始化脚本管理 schema
- **AND** 架构 MUST NOT 依赖导入完整 SQL dump 覆盖当前数据库

### Requirement: 专用 workflow 必须挂接通用阶段门禁
技术架构 MUST 要求阶段内专用 workflow 的完成结果接入通用阶段齐套和阶段推进派生完成规则。

#### Scenario: 专用 workflow 接入阶段齐套
- **WHEN** 某阶段资料由专用 workflow 管理
- **THEN** 架构 MUST 提供派生完成规则、配置或插件机制，将专用 workflow 结果映射到通用阶段资料齐套
- **AND** 架构 MUST NOT 只完成专用 workflow 而让通用阶段推进门禁继续读取失效的普通资料基础状态

#### Scenario: 方案设计 C04-C19 作为派生完成样板
- **WHEN** 系统计算方案设计阶段 C04-C19 的完成结果
- **THEN** 架构 MUST 从方案设计节点、上传槽、在线表单生成文件、审批结果和报价/投标分支状态派生完成
- **AND** 架构 MUST 保持普通资料基础状态与派生完成状态可区分

#### Scenario: 不通过批量状态写回制造完成假象
- **WHEN** 专用 workflow 完成
- **THEN** 架构 SHOULD 优先通过派生规则参与齐套和推进
- **AND** 架构 MUST NOT 依赖批量修改普通资料状态来绕开专用 workflow 与通用门禁断链

### Requirement: 后续阶段复用共享阶段机制
技术架构 MUST 约束后续阶段实现优先复用共享阶段资料、齐套、推进和权限机制，而不是默认新建孤立的阶段专属状态机。

#### Scenario: 新阶段特殊流程挂接共享机制
- **WHEN** 后续阶段需要特殊流程、审批或上传槽
- **THEN** 架构 MUST 优先以派生规则、配置或插件方式挂接通用阶段资料齐套和阶段推进门禁
- **AND** 架构 MUST 明确该特殊流程如何影响通用资料完成、缺失资料列表和阶段推进

#### Scenario: 避免重复专用状态机
- **WHEN** 一个阶段可以用共享阶段资料机制表达
- **THEN** 架构 SHOULD 复用现有阶段资料、在线表单、上传、审批和推进能力
- **AND** 架构 SHOULD NOT 默认复制方案设计式的完整专用状态机

### Requirement: 权限 resolver 收敛
技术架构 MUST 将阶段资料、专用 workflow、工作台待办和阶段推进的权限判断逐步收敛到统一 resolver。

#### Scenario: 权限来源统一
- **WHEN** 系统判断用户是否可查看、上传、提交、审批、退回或推进阶段
- **THEN** 架构 SHOULD 复用共享权限上下文和 resolver
- **AND** 架构 SHOULD 避免在不同仓储、路由或前端组件中分散复制角色判断

#### Scenario: 前端只消费后端权限结果
- **WHEN** 前端展示阶段资料、专用 workflow 或阶段推进入口
- **THEN** 前端 MUST 使用后端返回的权限和阻塞原因
- **AND** 前端 MUST NOT 使用本地硬编码规则绕过统一权限 resolver

### Requirement: 自动推进复用单一阶段门禁计算
自动阶段推进 SHALL reuse the single stage gate completeness calculation.

#### Scenario: 不复制齐套逻辑
- **WHEN** 系统判断是否自动推进阶段
- **THEN** 自动推进 SHALL 调用共享阶段齐套/门禁 resolver
- **AND** 自动推进 SHALL NOT 在业务动作处理器中复制资料完成判断

#### Scenario: 专用 workflow 通过 projection 接入
- **WHEN** 阶段资料由专用 workflow 管理
- **THEN** 自动推进 SHALL 通过通用 projection / derived completion 机制读取完成状态
- **AND** 自动推进 SHALL NOT 直接读取专用 workflow 内部状态形成并行门禁

### Requirement: 自动推进服务必须幂等
自动阶段推进 SHALL be idempotent.

#### Scenario: 重复触发不重复推进
- **WHEN** 同一业务动作被重复提交或重试
- **THEN** 自动推进 SHALL NOT 重复完成同一阶段
- **AND** 自动推进 SHALL NOT 重复写成功日志

#### Scenario: 并发触发以项目当前阶段为边界
- **WHEN** 多个动作并发触发自动推进
- **THEN** 自动推进 SHALL 使用项目当前阶段和事务锁作为幂等边界
- **AND** 自动推进 SHALL 防止阶段跳跃或重复初始化下一阶段

### Requirement: 旧阶段关口审批保持 legacy 边界
架构 SHALL treat the existing stage gate approval mechanism as legacy for stage advance.

#### Scenario: legacy API 不驱动主流程推进
- **WHEN** 后续实现自动阶段推进
- **THEN** 架构 SHALL NOT require legacy submit / approve / return / resubmit / history approval state for stage transition
- **AND** 架构 MAY keep those APIs and repositories for compatibility or audit history

### Requirement: 方案设计在线表单模板生成单元格级测试
技术架构 MUST 要求 C05、C15、C16 生成文件具备单元格级、样式级和图片嵌入自动化测试，测试不得只断言文件存在或模板名称正确。

#### Scenario: C05 关键字段单元格断言
- **WHEN** 后端测试提交 C05 项目方案分析表并生成 Excel 文件
- **THEN** 测试 MUST 读取生成文件目标单元格或模板映射区域
- **AND** 测试 MUST 断言环境要求、场地情况、工件描述、作业工艺和项目目标说明已按提交内容写入
- **AND** 测试 MUST 断言 C05 场地情况、工件描述、作业工艺或目标图片被写入 Excel media、drawing 和 anchor
- **AND** 测试 MUST 断言 C05 图片区域的 merge adjustment 和 anchor 不覆盖文本区域
- **AND** 测试 MUST 断言旧 C05 `customerRequirements`、`technicalRisks`、`solutionScope` 不进入新提交保存结果
- **AND** 测试 MUST NOT 只断言生成状态为成功

#### Scenario: C05 图片一致性回归断言
- **WHEN** 后端测试在 C05 生成文件成功后上传或删除在线表单图片
- **THEN** 测试 MUST 断言当前 C05 生成文件被置为未生成且不可下载
- **AND** 测试 MUST 覆盖 legacy `2.2` 资料行仍可作为 C05 图片锚点
- **AND** 测试 MUST 覆盖方案设计非技术负责人角色可查看 C05 图片但不可删除
- **AND** 测试 MUST 覆盖通用在线表单图片 API 拒绝把 `projectTargetImages` 写入立项项目需求表

#### Scenario: C15 C16 评审字段单元格断言
- **WHEN** 后端测试分别提交 C15 内部方案评审和 C16 客户方案评审
- **THEN** 测试 MUST 读取生成文件目标单元格或模板映射区域
- **AND** 测试 MUST 断言 C15/C16 的评审类型、项目目标描述和记录人写入正确
- **AND** 测试 MUST 断言 B3、B12:B14 写入内容不使用 Wingdings 2 样式
- **AND** 测试 MUST 断言记录人写入 A42 合并单元格，且不依赖 B42
- **AND** 测试 MUST 覆盖 C15/C16 独立生成且不串数据

### Requirement: C05 字段 schema 和模板映射复用原则
技术架构 MUST 优先复用或对齐立项阶段项目需求表既有字段 schema 和模板映射，避免为 C05 再造一套不兼容字段。

#### Scenario: 复用已有字段命名
- **WHEN** C05 需要环境要求、场地情况、工件描述、作业工艺或目标说明字段
- **THEN** 字段 schema SHOULD 优先复用立项阶段项目需求表已有字段命名、分组和归一化逻辑
- **AND** 若必须新增字段名，设计和实现 MUST 说明与立项阶段字段的映射关系

#### Scenario: 模板 mapping 不靠字段名猜测
- **WHEN** 后端生成 C05、C15 或 C16 Excel 文件
- **THEN** 模板填充 MUST 通过 mapping manifest、registry 或等价显式映射定位目标单元格
- **AND** 实现 MUST NOT 仅靠字段名猜测模板位置
- **AND** 实现 MUST NOT 在前端维护 Excel 单元格映射

#### Scenario: 图片能力复用既有基础设施
- **WHEN** C05 需要在线表单图片上传和 Excel 嵌入
- **THEN** 后端 SHOULD 复用现有 `project_stage_document_form_images` 存储和 OOXML 图片渲染能力
- **AND** 权限判断 MUST 对 C05 增加方案设计技术负责人和 analysis 节点可编辑校验
- **AND** 实现 MUST NOT 新增 migration 或图片专用表

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

### Requirement: 项目权限 resolver 分层收敛
技术架构 MUST 逐步收敛项目权限身份判断到统一 resolver/helper，并保持查看权限和操作权限分离。

#### Scenario: 基础身份判断统一
- **WHEN** 后端代码需要判断总经理、总经理助理、系统管理员、中心负责人、项目经理或资料责任人身份
- **THEN** 实现 MUST 优先复用统一 helper/resolver，而不是在 repository、route 或 workflow 模块中新增孤立判断
- **AND** 中心负责人判断 MUST 支持参数化部门输入，覆盖 `BUSINESS_DEPARTMENT` 的实际枚举

#### Scenario: 查看权限不自动升级为操作权限
- **WHEN** resolver 返回用户可查看项目、资料或日志
- **THEN** 系统 MUST NOT 因可查看结果自动授予提交、审批、退回、上传、删除或阶段推进权限
- **AND** 操作权限 MUST 使用单独的操作语义或显式 gate 判断

#### Scenario: 不引入复杂 RBAC 或按钮矩阵
- **WHEN** 后端收敛项目权限 resolver
- **THEN** resolver MUST NOT 引入复杂 RBAC、按钮级权限矩阵或前端驱动的权限配置系统
- **AND** resolver MUST 保持面向现有项目、阶段、资料、节点和角色上下文的后端 helper 形态

#### Scenario: 第一批迁移保持行为不变
- **WHEN** 实现第一批身份 helper 收敛
- **THEN** 实现 MUST 保持现有 API、DTO、SQL、operation log、工作台待办和自动推进语义不变
- **AND** 实现 MUST 通过现有后端回归测试证明权限结果未变化

#### Scenario: 后续阶段流程复用统一权限基础
- **WHEN** 后续实现合同签订阶段、共享阶段机制或新的阶段 workflow
- **THEN** 后端 MUST 复用统一权限 helper/resolver 的基础身份和项目上下文能力
- **AND** 后续流程 MUST NOT 新建孤立权限判断体系

### Requirement: 旧项目流程模板清理架构边界
技术架构 MUST 要求项目流程/阶段资料模板版本清理先完成引用盘点；删除模板版本不得顺手重构阶段引擎、权限体系、前端、合同业务、旧关口审批或数据库结构。

#### Scenario: 清理前必须盘点引用
- **WHEN** 团队准备删除旧项目流程或阶段资料模板版本
- **THEN** 团队 MUST 先盘点运行时代码、初始化脚本、reset 脚本、check 脚本、测试、README/docs、OpenSpec 和数据库初始化路径中的版本引用
- **AND** 盘点 MUST 区分当前有效模板、旧项目兼容模板、历史文档引用和无运行入口的废弃模板

#### Scenario: 删除旧模板不得扩大重构范围
- **WHEN** 团队实现旧模板版本清理
- **THEN** 实现 MUST NOT 在同一 change 中重构阶段推进引擎、权限 resolver、项目工作区前端、合同签订业务或旧关口审批
- **AND** 实现 MUST NOT 引入数据库 migration，除非盘点证明删除旧模板必须调整数据结构并另行评审

#### Scenario: 清理实现必须保护回归基线
- **WHEN** 团队完成旧模板版本删除或引用整理
- **THEN** 实现 MUST 运行并通过现有项目核心、立项、方案设计和模板 ownership 校验
- **AND** 校验 MUST 证明 `v20260629` 仍为当前有效模板、资料数量仍为 71、标准阶段仍为 8 个

### Requirement: 方案设计提交门禁调整架构
技术架构 MUST 统一方案设计 workflow 的上传槽有效性、分支选择、豁免状态、待办、日志和自动推进判断，避免多套门禁结果。

#### Scenario: 上传槽有效性不只依赖节点 current revision
- **WHEN** 后端判断退回后的方案设计上传槽是否满足提交门禁
- **THEN** 架构 MUST 使用 current file 有效性判断
- **AND** 架构 MUST NOT 仅以文件 revision 等于节点 current revision 作为唯一门禁
- **AND** 架构 MUST 继续防止非 current 历史文件绕过门禁
- **AND** 架构 MUST 覆盖 C17 研发、制造、财务/运营成本估算上传槽在总经理退回后的重提门禁

#### Scenario: 分支选择和财务总经理审批同事务
- **WHEN** 总经理审批通过财务成本估算并选择报价或投标
- **THEN** 架构 MUST 在同一事务中完成审批状态更新、分支记录、下一节点激活和 operation log
- **AND** 失败时 MUST 回滚审批通过和分支选择
- **AND** 后续报价/投标节点 MUST 消费已记录分支，而不是创建第二套选择状态
- **AND** 旧报价/投标节点分支选择接口 MUST 在分支已存在时拒绝重复选择，不改状态且不写新的成功选择日志

#### Scenario: 方案设计产出豁免状态集中记录
- **WHEN** 系统支持 C07-C14 单项无需上传
- **THEN** 架构 MUST 将豁免状态与对应方案设计上传槽或等价 workflow 对象绑定
- **AND** 架构 MUST 记录操作人和操作时间
- **AND** 架构 MAY 记录空的原因或备注
- **AND** 架构 MUST 将该状态提供给 DTO、提交门禁、C04-C19 派生、工作台待办和 operation log
- **AND** 重新上传已豁免槽位文件时 MUST 自动清除该槽位豁免并写入 operation log

#### Scenario: 自动推进消费统一派生结果
- **WHEN** 后端判断方案设计阶段是否可自动推进到合同签订阶段
- **THEN** 架构 MUST 复用 C04-C19 派生齐套结果
- **AND** 架构 MUST NOT 在自动推进中重新实现一套不同的 C07-C14 上传或豁免判断

### Requirement: 立项项目开展模式审批写回架构
技术架构 MUST 将 `1.2` 项目开展模式建模为总经理最终审批通过动作的一部分，并 MUST 写回 `1.2` 表单数据供模板生成使用。

#### Scenario: 总经理审批通过写回表单字段
- **WHEN** 总经理审批通过 `1.2 项目立项审批表`
- **THEN** 后端 MUST 在审批通过事务中校验并写回 `formData.projectExecutionMode`
- **AND** 模板生成 MUST 从 `1.2` 表单数据读取该字段
- **AND** 后端 MUST NOT 将该字段写入 `projects.project_mode`

#### Scenario: 总经理退回不校验项目开展模式
- **WHEN** 总经理退回 `1.2 项目立项审批表`
- **THEN** 后端 MUST NOT 校验 `projectExecutionMode`
- **AND** 后端 MUST 保持既有返工和阻断后续语义

### Requirement: 营销成本估算节点迁移架构
技术架构 MUST 通过正式 migration 扩展方案设计成本估算节点和上传槽枚举，并 MUST 将营销成本估算纳入 C17 专用 workflow。

#### Scenario: 正式 migration 扩展 enum
- **WHEN** 实现营销成本估算节点和上传槽
- **THEN** 系统 MUST 新增正式 migration 扩展 MySQL enum
- **AND** migration MUST 覆盖 `project_solution_design_nodes.node_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_slots.node_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_slots.slot_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_files.slot_key`
- **AND** 实现 MUST NOT 只依赖 `ensureSolutionDesignWorkflowSchema()`

#### Scenario: 成本链路统一重置范围
- **WHEN** 财务总经理退回成本估算或报价拒绝返回成本链路
- **THEN** 架构 MUST 将研发、制造、营销、财务四段作为统一重置和重提范围
- **AND** 退回后复用旧 current file 的判断 MUST 覆盖营销成本估算上传槽

### Requirement: 1.3 项目立项通知生成架构
技术架构 MUST 将新版 `1.3 项目立项通知` 模板、累计项目清单和项目开展模式列作为后端模板生成能力统一治理。

#### Scenario: 1.3 通知模板注册切换
- **WHEN** 后端注册 `INITIATION_TEMPLATE_KEY.NOTICE`
- **THEN** registry MUST 使用 `项目立项通知-模板.docx`
- **AND** registry MUST NOT 继续指向 `关于确定项目名称及编号的通知-模板.docx`

#### Scenario: 1.3 累计清单逐项目携带开展模式
- **WHEN** 后端生成 `1.3 项目立项通知` 累计项目清单
- **THEN** 每一行 MUST 携带该项目自己的 `projectExecutionMode`
- **AND** 后端 MUST NOT 只用当前项目的 `1.2` 值填充所有行

#### Scenario: 1.3 模板映射开展模式列
- **WHEN** 后端渲染 `项目立项通知-模板.docx`
- **THEN** 模板映射 MUST 将 `projectExecutionMode` 写入“开展模式”列
- **AND** `projectExecutionMode` MUST 仍不写入 `projects.project_mode`

### Requirement: 方案设计在线表单自动提交结果架构
技术架构 MUST 将 C05/C15/C16 表单提交、模板生成和节点自动提交尝试作为一个后端编排结果返回，并 MUST 复用现有完整节点提交编排和门禁。

#### Scenario: 自动提交复用完整节点提交编排
- **WHEN** C05、C15 或 C16 表单生成文件成功
- **THEN** 后端 MUST 调用或抽取现有手动节点提交编排
- **AND** 后端 MUST 复用现有节点提交门禁、状态更新、operation log、工作台待办收敛和 blocking reason 更新
- **AND** 后端 MUST NOT 复制一套独立的表单专用节点提交判断
- **AND** 后端 MUST NOT 只手写局部节点状态来模拟提交成功

#### Scenario: 自动提交结果 DTO
- **WHEN** C05、C15 或 C16 表单提交接口返回
- **THEN** DTO MUST 包含表单提交状态、生成文件状态和自动节点提交结果
- **AND** 自动节点提交结果 MUST 能表达 attempted、submitted、node status 和 blocking reasons

#### Scenario: 失败边界
- **WHEN** 生成文件失败或节点自动提交失败
- **THEN** 后端 MUST 保留可解释状态
- **AND** 生成失败 MUST 阻止节点自动提交
- **AND** 节点门禁失败 MUST NOT 回滚已成功生成的表单文件

### Requirement: C15 C16 结构化实施计划架构
技术架构 MUST 在 C15/C16 表单 JSON payload 中保存结构化 `implementationPlanItems`，并 MUST 在后端根据来源字段重新 normalize。

#### Scenario: 后端重新生成来源项
- **WHEN** 后端保存或提交 C15/C16 表单 payload
- **THEN** 后端 MUST 根据项目需求分析、项目目标描述、项目风险评估和项目方案建议重新计算来源项
- **AND** 后端 MUST 忽略前端提交的不存在来源项
- **AND** 当 payload 包含 `implementationPlanItems` 时，后端 MUST 保留用户提交的空 `planText` 并在提交时按必填规则校验
- **AND** 后端 MUST 仅在 payload 完全没有 `implementationPlanItems` 时从旧 `actionItems` 兼容迁移计划内容
- **AND** 同一 `sourceType` 的来源条目数量未变化时，后端 MUST 优先按 `sourceType + sourceIndex` 保留同位置 `planText`
- **AND** 来源文本编辑后出现重复 `sourceText` 时，后端 MUST NOT 因文本匹配抢占其他同文案条目的 `planText`
- **AND** 同一 `sourceType` 的来源条目数量发生增删时，后端 SHOULD 优先按同一 `sourceType + sourceText` 保留与有效来源项匹配的实施计划内容
- **AND** 来源条目删除后后端 MUST 删除对应计划项
- **AND** 来源条目新增后后端 MUST 创建空 `planText` 计划项

#### Scenario: 不新增 migration
- **WHEN** 实现结构化实施计划
- **THEN** 架构 MUST 优先使用现有表单 JSON 存储
- **AND** 架构 MUST NOT 为第一版结构化实施计划新增数据库 migration

#### Scenario: 模板渲染保持后端负责
- **WHEN** C15/C16 生成 Excel 文件
- **THEN** 后端 MUST 将项目需求分析映射为 B9-B11 `repeatRows`
- **AND** 超过 3 条项目需求分析时，后端 MUST 沿用现有 `repeatRows` 规则将第 3 条及后续内容合并到 B11
- **AND** 后端 MUST 将结构化计划拼接为模板当前单元格文本
- **AND** 拼接顺序 MUST 固定为需求、目标、风险、建议
- **AND** 每项 MUST 使用 `需求1：内容` 等标签加中文冒号格式，并以 Excel 单元格换行分隔
- **AND** 前端 MUST NOT 维护 Excel 单元格映射

### Requirement: 报价结果按钮 payload 架构
技术架构 MUST 将报价结果三个按钮映射到现有报价结果 API payload，避免引入新的报价结果状态机。

#### Scenario: 三按钮 payload 映射
- **WHEN** 前端提交报价结果
- **THEN** 客户接受报价 MUST 映射为现有 `accepted`
- **AND** 结束项目 MUST 映射为现有 `rejected` + `end_project`
- **AND** 审批不通过 MUST 映射为现有 `rejected` + `return_to_rd_cost`

#### Scenario: 后端状态机不新增枚举
- **WHEN** 实现报价结果三按钮
- **THEN** 后端 MUST 继续使用现有报价结果和拒绝动作枚举
- **AND** 后端 MUST NOT 新增第三套报价审批状态

### Requirement: 合同签订 workflow 架构
技术架构 MUST 由数字化平台内的合同签订 workflow 后端模块承载合同签订业务，并 MUST 通过仓储、DTO、API、导航、工作台待办和 operation log 集成实现；本 change 仅调整既有合同 workflow 内部状态机，不新增第二套流程或资料项。

#### Scenario: 专用模块和 API
- **WHEN** 实现合同签订阶段业务
- **THEN** 后端 MUST 使用 `contractSigningWorkflow` 专用模块
- **AND** API MUST 返回合同节点、上传槽、current file、revision、审批状态、退回原因、阻塞原因和权限
- **AND** API MUST 提供按 slot 下载 current file 的只读接口，并按合同 workflow 权限校验下载人
- **AND** API MUST 为签订协议和合同节点提供客户退回技术协议、客户退回销售合同和签订完成动作
- **AND** API MUST NOT 为前端继续提供扫描件确认通过/确认不通过权限作为签订节点主动作
- **AND** API MUST 为项目预付款支付节点提供合同 workflow 命名空间内的完成支付、申请总经理放行、总经理未付款并通过、总经理已付款通过动作
- **AND** API MUST 在 DTO 中返回 `paymentFlow.status`、申请人、申请时间、放行人、放行时间、预付款权限和阻塞原因
- **AND** 前端 MUST 以该 DTO 作为合同阶段节点导航和节点页面唯一来源

#### Scenario: 旧总经理笼统放行接口不改变 workflow
- **WHEN** 旧 `POST /api/projects/:projectId/contract-signing-workflow/payment/approve-release` 被调用
- **THEN** 后端 MUST 返回明确的弃用错误，状态码 SHOULD 为 410
- **AND** 错误详情 MUST 提供 `/payment/approve-release-unpaid` 和 `/payment/approve-release-paid` 两个替代接口
- **AND** 旧接口 MUST NOT 默认调用未付款并通过动作
- **AND** 旧接口 MUST NOT 修改合同 workflow 节点、`paymentFlow` 或 operation log

#### Scenario: 正式 migration
- **WHEN** 调整合同 workflow 状态机
- **THEN** 实现 MUST 复用现有 `project_contract_signing_nodes`、`project_contract_signing_upload_slots`、`project_contract_signing_upload_files` 和 `project_contract_signing_payment_flows`
- **AND** 实现 MUST NOT 因本 change 新增资料项、阶段或第二套流程表
- **AND** schema ensure MUST 与正式 migration 保持一致

#### Scenario: workflow 状态和资料完成分开建模
- **WHEN** 合同 workflow 上传、审批、客户退回、签订完成、预付款放行或项目启动通知上传成功
- **THEN** 后端 MUST 在合同 workflow 表中保存业务状态
- **AND** 后端 MUST 从 workflow 状态派生或同步既有 71 项资料完成结果
- **AND** 后端 MUST NOT 以普通资料卡片状态替代合同 workflow 状态

#### Scenario: 合同资料元数据展示名修正
- **WHEN** 后端返回合同 workflow DTO 或阶段资料清单
- **THEN** C20 展示名 MUST 为 `技术协议`
- **AND** C22 展示名 MUST 为 `销售合同`
- **AND** C25 展示名 MUST 为 `项目启动通知`
- **AND** 后端 MUST 保留 C20/C22/C25 稳定编码并保持 71 项资料总数不变
- **AND** 后端 MUST NOT 将 C20/C22 旧元数据名中的“草稿”作为上传槽名、DTO 文案或最终展示名

#### Scenario: 事务一致性
- **WHEN** 合同 workflow 写操作成功
- **THEN** 节点状态、上传槽 current file、revision、资料完成派生、工作台待办和 operation log MUST 在同一事务内保持一致

#### Scenario: 阶段导航来源
- **WHEN** 后端返回合同签订阶段导航或工作区
- **THEN** 合同阶段 children MUST 使用合同 workflow 节点定义
- **AND** 后端 MUST NOT 将旧蓝图节点作为可点击主流程节点返回
- **AND** 后端 MUST NOT 同时返回合同 workflow `project_kickoff_notice` 和另一套 C25 主流程节点造成双入口

#### Scenario: 合同阶段主流程和普通资料分离
- **WHEN** 后端返回合同签订阶段工作区 DTO
- **THEN** `nodes` / navigation children MUST 只包含 4 个 contract workflow 主节点
- **AND** 旧蓝图节点和 71 项资料 MUST NOT 被提升为合同阶段主流程节点
- **AND** C20、C22、C21、C23、C25 MUST 由 contract workflow 状态派生或同步资料完成结果
- **AND** C24 `发票（预付款）` MUST 保留在后端资料体系中作为普通/条件性资料项，且 MUST NOT 成为 `advance_payment` 外的第 5 个 workflow 节点
- **AND** 合同 workflow 页面是否展示 C24 MUST NOT 由后端 workflow DTO 主节点承担；本 change 前端不消费 C24 作为合同页面辅助区

#### Scenario: 项目启动通知自动推进
- **WHEN** 商务负责人成功上传项目启动通知
- **THEN** 后端 MUST 将该上传动作映射到 C25 稳定资料编码并完成 C25 资料完成结果
- **AND** 后端 MUST 调用统一阶段门禁推进到详细设计阶段
- **AND** 后端 MUST NOT 跳过合同阶段完成状态或直接手写项目阶段字段绕过门禁
- **AND** 后端 MUST 在同一事务内写入 current file/revision、将 `project_kickoff_notice` 上传槽和节点置为 `approved`、记录上传日志并触发阶段推进
- **AND** 阶段资料派生 MUST 同时支持 C20/C21/C22/C23/C25 目标编码和当前运行资料编码 `3.1`、`3.2`、`4.1`

#### Scenario: 合同阶段手工推进附加门禁
- **WHEN** 后端执行合同签订阶段的手工 `advanceProjectStage`
- **THEN** 后端 MUST 在当前阶段资料齐套检查之外，查询 `project_contract_signing_nodes` 中 `project_kickoff_notice` 节点状态
- **AND** 只有该节点为 `approved` 时才允许推进到详细设计阶段
- **AND** 未完成时 MUST 在 `incompleteRequiredDocuments` 或同等门禁详情中返回 `项目启动通知未上传完成`
- **AND** 该门禁 MUST NOT 查询或依赖 C24 发票、前端 DTO、本地拼接节点或普通资料卡片状态
