## ADDED Requirements

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
