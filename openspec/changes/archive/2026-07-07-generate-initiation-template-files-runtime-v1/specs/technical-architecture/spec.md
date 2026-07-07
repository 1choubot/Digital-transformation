## ADDED Requirements

### Requirement: 后端统一模板文件生成治理
技术架构 MUST 将模板注册、mapping manifest、模板渲染、文件记录、内部存储、权限检查和下载接口统一放在后端治理，不得散落到前端或单个 route handler。

#### Scenario: 后端统一生成
- **WHEN** 系统生成 `1.1 / 1.2 / 1.3` 模板文件
- **THEN** 生成逻辑 MUST 通过后端统一 service 或 repository 执行
- **AND** route handler 和前端组件 MUST NOT 直接填充模板

#### Scenario: mapping registry 统一治理
- **WHEN** 系统解析模板字段映射
- **THEN** 后端 MUST 使用统一 mapping registry 或 manifest
- **AND** mapping 逻辑 MUST NOT 散落硬编码在控制器、页面组件或单个流程函数中

#### Scenario: 不追加模板外快照内容
- **WHEN** 后端渲染 Excel 或 Word 模板
- **THEN** 渲染器 MUST 只写入 mapping manifest 指定的单元格、表格区域、占位符或等价目标位置
- **AND** 渲染器 MUST NOT 在模板外追加系统生成内容快照区域

#### Scenario: Excel 模板单元格精准替换
- **WHEN** 后端渲染 `.xlsx` 模板
- **THEN** 渲染器 MUST 精准替换当前行内的目标 cell
- **AND** 渲染器 MUST 同时支持 `<c .../>` 自闭合 cell 和 `<c ...>...</c>` cell
- **AND** 渲染器 MUST NOT 因写入目标 cell 删除相邻标签 cell

#### Scenario: Excel 图片嵌入由 manifest 和受控存储驱动
- **WHEN** 后端渲染 `1.1 项目需求表` `.xlsx`
- **THEN** 图片嵌入 MUST 只消费 manifest 声明的 `excelImage` 目标区域
- **AND** 图片源 MUST 来自后端受控的 `1.1` 在线表单图片存储
- **AND** 渲染器 MUST 写入必要的 OOXML media、drawing、relationship 和 content-type 条目
- **AND** 渲染器 MUST support up to 3 images per target area and place them in stable upload order
- **AND** 渲染器 MUST aspect-fit each image within its allocated subregion and MUST NOT stretch images to a mismatched rectangle
- **AND** 渲染器 MUST keep image anchors out of the text subregions for site, workpiece, and operation-process sections
- **AND** 当图片存在时，渲染器 MUST split or adjust merged regions so text remains visible and images do not obscure the filled text
- **AND** 渲染器 MUST NOT 接受前端传入的图片本地路径、任意 OOXML drawing 规则或文件平台文件
- **AND** 未上传图片时 MUST 保持文本生成可用且不报错

#### Scenario: 模板空值保留和格式化填充
- **WHEN** manifest 声明空值保留模板原文
- **THEN** 渲染器 MUST 在源值为空时不清空模板说明或占位文本
- **AND** 后端 mapping MUST 支持 value builder 或等价机制生成带固定符号、单位和前缀的模板句式

#### Scenario: 1.2 Excel 评分列按 manifest 写入
- **WHEN** 后端渲染 `1.2 项目立项审批表`
- **THEN** manifest MUST 将表头、评分、信息收集说明、责任人和审批意见映射到真实模板的合并区左上角或填充列
- **AND** 渲染器 MUST NOT 将在线表单评分值写入固定条款内容列或评价标准列
- **AND** 渲染器 MUST preserve `C/H` 固定模板内容 and `A22` remarks when writing `K/L/O` scoring values
- **AND** manifest MUST NOT map reviewer names into signer cells `I19/I20/I21`
- **AND** date value builders MUST format review dates without UTC serialization artifacts

#### Scenario: DOCX 表格 target 由 manifest 驱动
- **WHEN** 后端渲染 `1.3 项目立项通知`
- **THEN** 渲染器 MUST 消费 manifest 中声明的 Word 表格单元格 target
- **AND** 渲染器 MUST NOT 只依赖未声明的固定数组或隐式字段顺序

#### Scenario: DOCX 固定文本替换由 manifest 驱动
- **WHEN** 后端渲染 `1.3 项目立项通知` 的落款日期
- **THEN** 渲染器 MUST 只执行 manifest 声明的固定文本替换 target
- **AND** API callers MUST NOT provide arbitrary DOCX paths or arbitrary replacement rules
- **AND** missing fixed replacement text MUST fail generation instead of silently preserving the template sample date

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
技术架构 MUST 使用数字化平台内部存储保存第一版生成文件，并 MUST 为历史文件保存生成时源快照、源 hash、审批快照和模板 hash。

#### Scenario: 历史文件可追溯
- **WHEN** 用户审计历史生成文件
- **THEN** 系统 MUST 能通过记录中的源快照、源 hash、触发事件、模板 hash 和可选审批快照解释文件来源
- **AND** 对图片参与生成的文件，源快照和源 hash MUST include uploaded image content hashes, not only image ids or file names
- **AND** 系统 MUST NOT 只依赖当前可变表单数据解释历史文件

#### Scenario: 1.2 审批快照
- **WHEN** 系统生成 `1.2 项目立项审批表`
- **THEN** 记录 MUST 保存商务评价、技术评价和总经理审批意见、人员、时间的生成时快照

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
