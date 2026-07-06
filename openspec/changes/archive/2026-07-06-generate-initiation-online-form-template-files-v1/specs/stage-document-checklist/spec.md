## ADDED Requirements

### Requirement: 模板文件生成不新增资料项

阶段资料清单能力 MUST 将 `1.1 / 1.2 / 1.3` 生成文件视为原资料项的产出表现形态，而不是新增资料项；本能力 MUST NOT 改变 v20260629 / 71 项资料数量。

#### Scenario: 1.1 / 1.2 / 1.3 仍是原资料项
- **WHEN** 系统规划或实现立项模板文件生成
- **THEN** `1.1 项目需求表` MUST 仍是原资料项
- **AND** `1.2 项目立项审批表` MUST 仍是原资料项
- **AND** `1.3 项目立项通知` MUST 仍是原资料项

#### Scenario: 不新增三个文件资料项
- **WHEN** 系统为立项在线表单生成模板文件
- **THEN** 系统 MUST NOT 新增 `项目需求表文件`
- **AND** 系统 MUST NOT 新增 `立项审批表文件`
- **AND** 系统 MUST NOT 新增 `立项通知文件`

#### Scenario: 71 项资料数量不变
- **WHEN** 系统初始化或校验 v20260629 项目资料模板
- **THEN** 资料数量 MUST 继续保持 71 项
- **AND** 生成文件 MUST NOT 被计入新的资料项数量

### Requirement: 在线表单入口和兼容资料区边界

阶段资料清单能力 MUST 保留 `1.1 / 1.2 / 1.3` 在线表单填写入口；本 change MUST NOT 删除、隐藏或物理移除兼容资料区。

#### Scenario: 在线表单仍为填写入口
- **WHEN** 用户处理 `1.1 / 1.2 / 1.3`
- **THEN** 阶段资料清单 MUST 继续提供在线表单填写入口
- **AND** 生成文件 MUST 作为提交后的产出查看形态

#### Scenario: 兼容资料区不在本 change 删除
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 删除或隐藏兼容资料区
- **AND** 兼容资料区清理 MUST 通过后续独立 change 处理

### Requirement: 立项模板文件生成文件平台边界

阶段资料清单能力 MUST NOT 在本 change 中接入文件平台或创建文件平台资料映射。

#### Scenario: 不调用文件平台
- **WHEN** 本 planning change 完成
- **THEN** 阶段资料清单 MUST NOT 调用文件管理平台 API
- **AND** 阶段资料清单 MUST NOT 创建文件平台目录、文件映射或归档状态
