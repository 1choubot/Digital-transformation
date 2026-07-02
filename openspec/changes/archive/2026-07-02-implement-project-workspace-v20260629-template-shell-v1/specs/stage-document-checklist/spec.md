## ADDED Requirements

### Requirement: v20260629 目标模板 shell 配置边界

阶段资料清单能力 MUST 允许定义 20260629 PDF 图面产出 + 4 个草稿修正形成的 71 项目标模板配置，但该配置在本 change 中 MUST NOT 成为运行默认模板；当前 change 只实现 shell 配置边界，不改变当前运行模板、项目初始化或旧项目资料状态。

#### Scenario: 目标模板以 71 项为配置输入
- **WHEN** 本 shell change 定义非运行默认的 `v20260629` 目标模板配置
- **THEN** 模板 MUST 以 20260629 图面产出 + 4 个草稿修正形成的 71 项为输入
- **AND** 模板 MUST 记录阶段、蓝色模块、产出卡片、资料名称、草稿/成品、责任中心、必填性和 completionMode 候选
- **AND** 该配置 MUST NOT 在本 change 中自动成为新项目默认模板

#### Scenario: 新项目默认切换必须独立
- **WHEN** 团队准备让新项目默认使用 `v20260629`
- **THEN** 团队 MUST 通过后续独立 change 明确模板切换、版本记录、回滚策略和验收
- **AND** 本 shell change MUST NOT 改变项目创建使用的当前模板

#### Scenario: 旧项目不自动补初始化
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 shell change MUST NOT 自动补初始化 `v20260629` 资料
- **AND** 本 shell change MUST NOT 迁移旧项目或改写旧项目 64 项资料状态

#### Scenario: 非立项阶段默认文件上传
- **WHEN** `v20260629` 第一版目标模板定义非立项阶段资料
- **THEN** 这些资料 MUST 默认使用文件上传或附件上传能力承载
- **AND** 系统 MUST NOT 因目标模板定义自动新增复杂在线表单、专用审批流或流程引擎

#### Scenario: 立项在线表单继续沿用
- **WHEN** `v20260629` 第一版目标模板包含 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 系统 MUST 继续沿用当前已实现的在线表单、责任人、评价审批、返工和前置门禁规则
- **AND** 系统 MUST NOT 将这三项回退为普通文件上传主入口

#### Scenario: 当前运行模板不被 shell 实现改变
- **WHEN** 本 shell change 完成
- **THEN** 当前系统 MUST 继续以 20260625 64 项模板运行
- **AND** 系统 MUST NOT 初始化 `v20260629` 资料、迁移旧项目或改写现有项目资料状态
