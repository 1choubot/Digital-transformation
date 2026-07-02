## ADDED Requirements

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
