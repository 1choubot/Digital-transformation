## Why

方案设计阶段三张在线表单的生成文件字段与真实 Excel 模板不一致，导致关键字段漏填或生成内容不可读。当前 C05 项目方案分析表字段过少，C15/C16 方案评审记录表存在评审类型、项目目标描述和记录人写入问题，需要在实现前明确统一的表单字段、保存字段和模板填充口径。

## What Changes

- 修复范围限定为方案设计阶段三张在线表单生成文件：
  - C05 项目方案分析表。
  - C15 内部方案评审记录表。
  - C16 客户方案评审记录表。
- C05 字段需要对齐 `项目方案分析表-模板.xlsx`，补足环境要求、场地情况、工件描述、作业工艺、目标说明等模板字段。
- C05 支持场地情况、工件描述、作业工艺、目标四类图片上传，并在生成 Excel 时嵌入模板对应区域。
- C05 图片上传/删除后必须使旧生成文件失效，且图片锚点兼容 `C05` 和 legacy `2.2` 资料行。
- C05 继续保留项目编号、项目名称、客户名称等只读自动带入字段。
- C15/C16 修复评审类型生成口径，保证生成后为可读中文且与内部/甲方评审上下文一致。
- C15/C16 修复项目目标描述生成乱码或错误写入问题，支持多行/数组结构并按模板预留行写入，且覆盖模板继承的 Wingdings 2 样式。
- C15/C16 修复记录人写入，表单、后端保存和生成文件必须一致，并写入 A42 合并单元格为 `记录人：xxx`。
- 下载生成文件时，字段必须可读、无乱码、无关键字段漏填。

## Non-Goals

- 不改方案设计状态机。
- 不改自动推进。
- 不改合同签订阶段。
- 不改变 8 大阶段和 v20260629 / 71 项资料数量。
- 不接文件平台。
- 不生成 PDF。
- 不改 C17 成本估算、C18 报价、C19 投标。
- 不要求 C15/C16 自动继承前序内容。
- 不新增无模板依据的业务字段。
- 不保留 C05 旧的客户需求、技术风险、方案范围字段；C15/C16 评审表中的项目需求分析、项目风险评估字段不受影响。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 明确 C05、C15、C16 在线表单生成文件的字段、模板填充和兜底规则。
- `project-core-frontend`: 明确 C05、C15、C16 前端表单字段展示、只读自动带入、记录人和多行输入提交要求。
- `technical-architecture`: 明确方案设计在线表单模板生成必须有单元格级和图片嵌入测试，并优先复用既有在线表单图片存储与 OOXML 渲染能力。

## Impact

- Affected backend areas: solution design analysis form normalization, C05 image permissions and generation snapshot, review form normalization, generated Excel template mapping, generated file metadata and download results.
- Affected frontend areas: C05 analysis form fields and images, C15/C16 review form recorder display and payload, repeatable project target description input.
- Affected testing areas: cell-level Excel assertions for C05 key fields, C05 image media/drawing assertions, C15/C16 review type, project target description, font style and recorder.
