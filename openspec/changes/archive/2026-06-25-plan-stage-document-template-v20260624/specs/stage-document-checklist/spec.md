## ADDED Requirements

### Requirement: v20260624 阶段资料模板

系统 MUST 支持以 20260624 版项目管理流程图为来源的 `v20260624` 阶段资料模板，并 MUST 将普通阶段资料模板口径限定为流程图直接产出文件。

#### Scenario: 当前 active 模板版本

- **WHEN** 系统加载当前阶段资料模板
- **THEN** 当前 active 模板版本 MUST 为 `v20260624`

#### Scenario: v20260624 模板包含 64 个产出文件

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 模板 MUST 包含 64 个阶段产出文件

#### Scenario: v20260624 阶段分布

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 各阶段资料数量 MUST 分别为立项 3、方案设计 15、合同签订 4、详细设计 17、生产制作 17、预验收 2、终验收 4、结题 2
- **AND** `4.1` MUST 为 `项目启动书`
- **AND** `5.1` MUST 为 `采购申请表`
- **AND** `7.1` MUST 为 `发货单`
- **AND** `7.2` MUST 为 `安装调试记录（现场）`
- **AND** `8.1` MUST 为 `发票（尾款）`
- **AND** `8.2` MUST 为 `项目结题报告`

#### Scenario: 排除非普通资料节点

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 模板 MUST NOT 将 `7.P1 随机资料移交` 和 `8.P1 资料服务器核查` 计入普通阶段资料模板，除非后续业务确认它们形成独立文件

#### Scenario: 模板字段规划

- **WHEN** 系统定义 `v20260624` 阶段资料模板项
- **THEN** 每个资料项 MUST 包含稳定 `documentCode`、阶段、文件名、模板默认必填、适用条件、`ownerDepartment`、`reviewDepartment`、提交方式和备注
- **AND** `ownerDepartment` 和 `reviewDepartment` MUST 为空或属于现有 `BUSINESS_DEPARTMENT`
- **AND** 总经理、客户、项目经理、供应商或相关负责人等非中心审核/确认对象 MUST 只写入备注字段，不得写入 `ownerDepartment` 或 `reviewDepartment`
- **AND** 模板默认必填 MUST 使用布尔口径
- **AND** 条件性资料 MUST 通过适用条件说明，不得将自由文本必填值写入模板默认必填字段

#### Scenario: Markdown 规划表备用解析

- **WHEN** 系统从 `docs/9.10_v20260624阶段资料模板规划_20260624.md` 解析阶段资料模板
- **THEN** 系统 MUST 支持该文档当前 10 列规划表
- **AND** 解析结果 MUST 包含 64 个普通资料项
- **AND** 解析结果阶段分布 MUST 为 3/15/4/17/17/2/4/2
- **AND** 解析结果 MUST NOT 包含 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查`

### Requirement: 阶段推进沿用资料齐套口径

系统使用 `v20260624` 阶段资料模板时，阶段推进 MUST 继续沿用现有资料齐套和阶段审批口径，并 MUST NOT 因本 change 新增复杂审批流。

#### Scenario: 适用必填资料全部审核通过才允许推进

- **WHEN** 系统判断项目是否可从当前阶段推进
- **THEN** 当前阶段适用且必填资料 MUST 全部审核通过

#### Scenario: 阶段资料汇总展示全部产出口径

- **WHEN** 用户查看项目详情阶段资料清单
- **THEN** 阶段汇总 MUST 展示本阶段资料总数、适用资料总数、适用必填总数和非必填/条件性资料口径
- **AND** 非必填/条件性资料 MUST 在阶段资料详情中显示状态和适用性
- **AND** 非必填/条件性资料 MUST NOT 计入适用必填齐套门禁

#### Scenario: 不改变阶段推进状态机

- **WHEN** 系统使用 `v20260624` 阶段资料模板
- **THEN** 系统 MUST NOT 因本规划改变现有阶段推进状态机

#### Scenario: 不新增复杂审批流

- **WHEN** 系统使用 `v20260624` 阶段资料模板
- **THEN** 系统 MUST NOT 因本规划新增合同审批流、付款流、采购审批流、设计变更自动触发流程或资料服务器核查流程

### Requirement: 模拟数据重置策略

实现 `v20260624` 模板时 MAY 基于当前模拟数据性质重置旧项目资料，并 MUST NOT 将旧模拟资料兼容作为本 change 要求。

#### Scenario: 可重置模拟项目资料

- **WHEN** 本 change 将运行模板切换到 `v20260624`
- **THEN** 实现 MAY 清理当前模拟项目资料并重新初始化 `v20260624` 64 项模板
- **AND** reset MUST 将项目状态重置为 `normal`
- **AND** reset MUST 将每个项目第 1 阶段重置为 `current` 且审批状态为 `not_submitted`
- **AND** reset MUST 将每个项目第 2-8 阶段重置为 `not_started` 且审批状态为 `not_submitted`
- **AND** reset MUST 清理旧阶段审批历史、阶段推进/审批/资料业务日志、阶段资料附件记录、附件物理文件、项目阶段资料和旧模板
- **AND** reset MUST 在数据库事务提交成功后再删除附件物理文件
- **AND** reset MUST 拒绝清理明显过宽或非阶段资料附件目录

#### Scenario: 不要求兼容旧模拟数据

- **WHEN** 系统切换到 `v20260624` 模板
- **THEN** 本规划 MUST NOT 要求兼容旧模拟数据

#### Scenario: 不要求保留 v20260610 项目资料

- **WHEN** 系统切换到 `v20260624` 模板并重置模拟数据
- **THEN** 本规划 MUST NOT 要求保留 `v20260610` 项目资料
