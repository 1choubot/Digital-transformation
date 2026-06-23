## ADDED Requirements

### Requirement: 阶段资料项模板

系统 MUST 维护第一版阶段资料项模板，模板 MUST 以 `docs/9.1_8阶段流程与阶段定义表.md` 的 8 阶段和 `docs/9.2_阶段资料清单与责任角色表.md` 的资料项清单为来源。

#### Scenario: 模板字段完整

- **WHEN** 系统保存阶段资料项模板
- **THEN** 每个模板项必须包含阶段标识、阶段名称、资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、文件管理平台目标文件夹路径和可空 `targetFolderId`

#### Scenario: 使用标准 8 阶段

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 模板项必须归属到 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 之一

#### Scenario: 提交方式枚举

- **WHEN** 系统保存资料项提交方式
- **THEN** 提交方式必须使用在线表单、文件上传、混合或暂未确定之一

#### Scenario: 不凭空补资料项

- **WHEN** 系统初始化第一版模板
- **THEN** 系统不得添加 `docs/9.2_阶段资料清单与责任角色表.md` 之外的资料项

#### Scenario: 无法可靠解析资料文档

- **WHEN** 实现时无法可靠解析 `docs/9.2_阶段资料清单与责任角色表.md`
- **THEN** 必须暂停实现并说明原因，不得自行编造资料项

#### Scenario: 第一版目录 ID 为空

- **WHEN** 系统初始化第一版模板
- **THEN** 系统必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 能根据阶段资料项模板初始化项目资料项。

#### Scenario: 新项目初始化资料清单

- **WHEN** 项目创建成功
- **THEN** 系统必须按阶段资料项模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`

#### Scenario: 保存模板快照字段

- **WHEN** 系统生成项目级资料项
- **THEN** 项目级资料项必须保存资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath` 和可空 `targetFolderId` 等模板快照字段

#### Scenario: 第一版项目资料项目录 ID 为空

- **WHEN** 系统生成第一版项目级资料项
- **THEN** 项目级资料项必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

#### Scenario: 预留后续能力字段

- **WHEN** 系统保存项目级资料项
- **THEN** 系统必须预留可支持后续文件上传、在线表单、资料齐套率和阶段推进的关联字段或扩展字段

### Requirement: 历史项目补初始化

系统 MUST 支持对已有历史项目通过后端脚本或命令补初始化阶段资料清单，并 MUST 保持幂等。

#### Scenario: 历史项目补初始化

- **WHEN** 已有项目缺少项目级阶段资料清单
- **THEN** 后端脚本或命令必须能按当前阶段资料项模板为该项目补生成资料清单

#### Scenario: 补初始化不重复生成

- **WHEN** 已有项目已经存在部分或全部资料项
- **THEN** 系统必须只补齐缺失资料项，不得重复生成已存在资料项

#### Scenario: 不开放普通用户补初始化接口

- **WHEN** 第一版实现历史项目补初始化
- **THEN** 系统不得提供前端补初始化按钮，也不得开放给普通用户调用的补初始化接口

#### Scenario: 历史项目不影响项目基础状态读取

- **WHEN** 历史项目尚未补初始化资料清单
- **THEN** 系统仍必须允许读取项目列表和项目详情基础状态

### Requirement: 资料项基础状态

系统 MUST 保存和展示项目级资料项基础状态，第一版系统状态枚举只包括 `not_submitted`、`submitted`、`confirmed` 和 `returned`。

#### Scenario: 基础状态枚举

- **WHEN** 系统保存资料项状态
- **THEN** 状态必须是 `not_submitted`、`submitted`、`confirmed` 或 `returned` 之一

#### Scenario: 状态显示口径

- **WHEN** 前端展示资料项状态
- **THEN** `not_submitted` 必须显示为“待提交”，`submitted` 必须显示为“已提交”，`confirmed` 必须显示为“已确认”，`returned` 必须显示为“已退回”

#### Scenario: 初始化状态显示

- **WHEN** 项目资料项初始化为 `not_submitted`
- **THEN** 前端必须显示为“待提交”

#### Scenario: 不实现状态流转

- **WHEN** 用户查看阶段资料清单
- **THEN** 系统只展示资料项状态，不得在本变更中提供提交、确认、退回或状态变更操作

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 按阶段分组返回资料项。

#### Scenario: 查询项目阶段资料清单

- **WHEN** 前端请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回

- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称和该阶段资料项列表

#### Scenario: 资料项字段返回

- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId` 和基础状态

#### Scenario: 项目不存在

- **WHEN** 请求不存在的项目阶段资料清单
- **THEN** 后端必须返回项目不存在错误

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化或查询阶段资料清单
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 不实现排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 系统不得实现在线表单填写、表单生成归档文件、资料齐套率计算、阶段推进、退回/确认操作、复杂权限或业务日志
