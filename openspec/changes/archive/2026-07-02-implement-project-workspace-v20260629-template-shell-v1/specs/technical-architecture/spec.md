## ADDED Requirements

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
