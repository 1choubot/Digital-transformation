## ADDED Requirements

### Requirement: C05 项目方案分析表前端字段
项目核心前端 MUST 展示与 C05 项目方案分析表模板和后端保存字段一致的在线表单字段，并 MUST 对齐立项阶段项目需求表中可复用的字段命名和结构。

#### Scenario: C05 展示自动带入和扩展字段
- **WHEN** 技术负责人打开 C05 项目方案分析表在线表单
- **THEN** 前端 MUST 展示项目编号、项目名称、客户名称为只读自动带入字段
- **AND** 前端 MUST 展示环境要求字段，包括工作温度、储存温度、工作湿度、储存湿度、噪音、IP、防腐、海拔、防爆中的适用字段
- **AND** 前端 MUST 展示场地情况字段，包括场地说明、电源、气源、液压源、吊装设备中的适用字段
- **AND** 前端 MUST 展示工件描述、作业工艺和项目目标说明
- **AND** 前端 MUST 展示场地情况、工件描述、作业工艺和目标图片上传/下载/删除入口
- **AND** 前端 MUST NOT 展示 C05 `customerRequirements`、`technicalRisks`、`solutionScope`
- **AND** 字段命名 SHOULD 与立项阶段项目需求表保持一致或清楚映射

#### Scenario: C05 图片字段使用资料行锚点
- **WHEN** 前端加载 C05 项目方案分析表 DTO
- **THEN** DTO MUST 提供 C05 资料行 `stageDocumentId` 和已有图片列表
- **AND** 前端 MUST 使用现有在线表单图片 API 上传、下载和删除 C05 图片
- **AND** 当当前账号或节点状态不可编辑时，图片上传和删除入口 MUST 禁用
- **AND** 当 DTO 使用 legacy `2.2` 资料行作为 `stageDocumentId` 时，前端 MUST 继续启用 C05 图片入口

#### Scenario: C05 图片变更后前端不展示旧生成文件
- **WHEN** 用户在 C05 项目方案分析表中上传或删除图片成功
- **THEN** 前端 MUST 更新图片列表
- **AND** 前端 MUST 将当前生成文件展示为未生成或不可下载
- **AND** 前端 MUST 提示用户重新提交表单以生成包含最新图片的 Excel
- **AND** 前端 MUST NOT 继续展示可下载的旧项目方案分析表文件
- **AND** 前端 MUST 立即禁用 `solution_analysis` 节点提交动作，直到重新提交 C05 表单并生成文件成功

### Requirement: C15 C16 方案评审记录表前端字段
项目核心前端 MUST 在 C15/C16 方案评审记录表中展示可保存和可提交的记录人字段，并 MUST 保持项目目标描述多行输入结构。

#### Scenario: 记录人默认当前用户并随 payload 提交
- **WHEN** 技术负责人打开 C15 或 C16 方案评审记录表
- **THEN** 前端 MUST 将记录人展示为只读字段并默认当前用户可读名
- **AND** 保存草稿和提交时 payload MUST 包含 `recorder`
- **AND** 前端 MUST NOT 仅在界面显示记录人而不提交给后端

#### Scenario: 项目目标描述多行输入保持结构
- **WHEN** 用户编辑 C15 或 C16 的项目目标描述
- **THEN** 前端 MUST 支持多行或数组结构输入
- **AND** 保存或提交前 MUST 保留用户输入顺序和内容
- **AND** 前端 MUST NOT 将多行内容破坏为乱码、不可读 JSON 字符串或单元格外的无结构文本
- **AND** 生成文件修复 MUST NOT 删除 C15/C16 中项目需求分析和项目风险评估字段

#### Scenario: 不自动继承前序评审内容
- **WHEN** 用户新建或编辑 C15/C16 方案评审记录
- **THEN** 前端 MAY 提供空白或后端返回的当前表单内容
- **AND** 本 change 不要求 C15/C16 自动继承前序方案分析、内部评审或客户评审内容
