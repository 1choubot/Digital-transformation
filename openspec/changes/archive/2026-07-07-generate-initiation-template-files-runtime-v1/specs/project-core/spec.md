## ADDED Requirements

### Requirement: 立项模板文件运行时生成
项目核心能力 MUST 在立项阶段按后端 mapping manifest 生成 `1.1 / 1.2 / 1.3` 对应真实模板文件，并 MUST 将生成文件归属于原资料项。

#### Scenario: 1.1 提交后生成项目需求表
- **WHEN** `1.1 项目需求表` 在线表单提交成功
- **THEN** 系统 MUST 基于 `项目需求表-模板.xlsx` 生成 `.xlsx` 文件记录和内部存储文件
- **AND** 生成文件 MUST 归属于原 `1.1` 资料项
- **AND** 系统 MUST 将工件描述、作业工艺、目标写入真实模板填写区而不是覆盖说明行

#### Scenario: 1.1 环境要求按模板句式生成
- **WHEN** `1.1 项目需求表` 生成 `.xlsx`
- **THEN** 工作温度、储存温度、工作湿度和储存湿度 MUST 由 min/max 字段格式化为模板范围句式
- **AND** 噪音、IP 防护等级和海拔高度 MUST 保留模板固定符号和单位
- **AND** 空的可选环境字段 MUST 保留模板原说明或占位文本

#### Scenario: 1.2 总经理通过后生成立项审批表
- **WHEN** `1.2 项目立项审批表` 总经理最终审批通过
- **THEN** 系统 MUST 基于 `项目立项审批表-模板.xlsx` 生成 `.xlsx` 文件记录和内部存储文件
- **AND** 文件记录 MUST 包含商务评价、技术评价和总经理审批的生成时快照

#### Scenario: 1.2 评分区按真实模板列填充
- **WHEN** `1.2 项目立项审批表` 生成 `.xlsx`
- **THEN** 系统 MUST 将表头信息写入真实模板合并区左上角并保留模板标签
- **AND** 商务模块 `8-14` 行和技术模块 `15-18` 行 MUST 只将分值、信息收集说明和责任人写入 `K/L/O` 列
- **AND** 系统 MUST NOT 覆盖 `C` 列条款内容、`H` 列评价标准或 `A22` 备注区
- **AND** 营销中心、研发中心和总经理意见 MUST 写入 `A19/A20/A21`
- **AND** 签字栏 `I19/I20/I21` MUST NOT 自动写入审批人姓名
- **AND** 审批日期 `M19/M20/M21` MUST 使用本地日期格式且不得包含 `T`、UTC 标记或时区偏移

#### Scenario: 1.3 提交后生成立项通知
- **WHEN** `1.3 项目立项通知` 在线表单提交成功
- **THEN** 系统 MUST 基于 `关于确定项目名称及编号的通知-模板.docx` 生成 `.docx` 文件记录和内部存储文件
- **AND** 生成文件 MUST 归属于原 `1.3` 资料项
- **AND** 系统 MUST 按 manifest 指定的 Word 表格单元格填入项目编号、项目名称、客户单位和立项日期
- **AND** 表格中的立项日期 MUST 使用 `initiationDate`
- **AND** 末尾落款日期 MUST 使用 `noticeDate` 格式化为中文日期
- **AND** 系统 MUST NOT 保留模板示例日期 `2026年2月9日`

### Requirement: 立项模板文件记录与失败状态
项目核心能力 MUST 持久化生成文件记录、状态、版本、源数据快照/hash、模板 hash、触发事件和失败原因；生成失败 MUST NOT 回滚在线表单提交或审批通过结果。

#### Scenario: 文件记录包含审计字段
- **WHEN** 系统创建生成文件记录
- **THEN** 记录 MUST 包含项目、资料、在线表单、模板、文件类型、版本、状态、文件名、内部存储键、生成操作者、生成时间、失败原因、源表单 hash、源快照、触发事件和模板 hash
- **AND** 对包含在线表单图片的 `1.1` 生成文件，源快照和源 hash MUST include each rendered image content hash

#### Scenario: 生成失败不回滚业务状态
- **WHEN** 文件生成在 `1.1` 提交、`1.2` 总经理通过或 `1.3` 提交之后失败
- **THEN** 系统 MUST 保留已成功的在线表单或审批状态
- **AND** 生成文件记录 MUST 进入 `failed` 或等价失败状态
- **AND** 系统 MUST NOT 将失败状态展示或记录为 `generated`

#### Scenario: 重新生成保留版本
- **WHEN** 资料返工、退回或重新填写后再次达到生成条件
- **THEN** 系统 MUST 生成新版本或将旧版本标记为 `superseded`
- **AND** 系统 MUST NOT 静默覆盖旧文件和旧源快照

#### Scenario: 新版本失败不遮蔽旧有效文件
- **WHEN** 某资料已有成功生成的文件版本
- **AND** 后续重新生成产生 `failed` 状态
- **THEN** 状态接口 MUST 表达最新生成尝试失败
- **AND** 下载接口 MUST 继续指向最近一个可读取的 `generated` 文件版本
- **AND** 系统 MUST NOT 将失败版本展示为可下载成功文件

### Requirement: 立项模板文件权限与下载
项目核心能力 MUST 提供生成文件状态和下载接口，并 MUST 复用项目和资料查看权限；无权限用户不得查看文件元数据、下载文件或获知本地路径。

#### Scenario: 有权限用户查看下载
- **WHEN** 用户对项目和目标资料有查看权限
- **AND** 目标资料已有可下载生成文件
- **THEN** 系统 MUST 返回生成状态元数据并允许下载文件

#### Scenario: 下载业务错误
- **WHEN** 目标资料没有可下载生成文件或内部存储文件缺失
- **THEN** 系统 MUST 返回业务错误状态
- **AND** 系统 MUST NOT 将该错误处理为 500 系统错误

#### Scenario: 无权限用户不得查看下载
- **WHEN** 用户没有项目或资料查看权限
- **THEN** 系统 MUST 拒绝生成文件状态和下载请求
- **AND** 响应 MUST NOT 泄露模板绝对路径、内部存储路径或其他无权限元数据

### Requirement: 立项模板字段映射运行时约束
项目核心能力 MUST 使用后端 mapping manifest 填充模板；系统 MUST NOT 仅靠字段名猜测模板位置，也 MUST NOT 为生成文件新增真实模板外字段。

#### Scenario: 使用 mapping manifest
- **WHEN** 文件渲染器填充 `1.1 / 1.2 / 1.3` 模板
- **THEN** 系统 MUST 从 manifest 读取 templateKey、documentCode、fileType、目标位置、来源字段、必填字段、格式保留要求和触发事件
- **AND** 系统 MUST NOT 接受前端传入任意模板路径

#### Scenario: 禁止模板外字段
- **WHEN** 系统构建生成文件源数据
- **THEN** 系统 MUST 使用真实模板和现有在线表单/项目/审批字段
- **AND** 系统 MUST NOT 为生成文件新增资料项或在线表单模板外字段

#### Scenario: 1.1 三处图片嵌入项目需求表
- **WHEN** 用户在 `1.1 项目需求表` 的场地情况、工件描述或作业工艺区域上传 png/jpg/jpeg 图片
- **THEN** 图片 MUST 归属于当前 `1.1` 在线表单
- **AND** 每个区域 MUST allow at most 3 active images and reject the fourth active image with a business error
- **AND** 生成的项目需求表 `.xlsx` MUST 将图片按上传顺序嵌入 manifest 声明的 Excel 区域
- **AND** 生成时 MUST 在目标区域内等比缩放图片，MUST NOT 拉伸变形
- **AND** 图片区域 MUST NOT 覆盖同一模板区域内的文字内容；系统 MUST 将文字和图片写入互不重叠的可视子区域
- **AND** 生成记录的源快照 MUST include each image content hash so the generated file can be audited against the uploaded image bytes
- **AND** 图片 MUST NOT 新增资料项或改变 v20260629 / 71 项数量
- **AND** 系统 MUST NOT 嵌入非图片附件、OLE 对象、文件平台文件或 PDF

### Requirement: 1.2 协同填写前置 1.1 提交
项目核心能力 MUST 在 `1.1 项目需求表` 首次提交或完成之前阻止 `1.2 项目立项审批表` 商务/技术协同填写进入可处理状态。

#### Scenario: 1.1 未提交时 1.2 仅可查看不可编辑
- **WHEN** 有查看权限用户直接打开 `1.2` 在线表单
- **AND** 同项目 `1.1` 尚未提交或完成
- **THEN** 后端 MUST 返回 `canEdit=false` and `canSubmit=false`
- **AND** blockingReasons MUST include `请先提交 1.1 项目需求表`

#### Scenario: 1.1 未提交时 1.2 保存提交被拒绝
- **WHEN** 用户直接调用 `1.2` 在线表单保存或提交接口
- **AND** 同项目 `1.1` 尚未提交或完成
- **THEN** 后端 MUST reject the request with `INITIATION_REQUIREMENT_NOT_SUBMITTED`
- **AND** 系统 MUST NOT 只依赖前端隐藏入口

#### Scenario: 1.1 提交后 1.2 协同待办出现
- **WHEN** `1.1 项目需求表` 已提交或完成
- **AND** 不存在未清 `1.1` 返工
- **THEN** 商务负责人和技术负责人 SHOULD see their respective `1.2` collaboration todos until their own part is submitted
