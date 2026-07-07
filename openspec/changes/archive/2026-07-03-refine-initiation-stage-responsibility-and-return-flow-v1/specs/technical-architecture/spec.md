## ADDED Requirements

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

