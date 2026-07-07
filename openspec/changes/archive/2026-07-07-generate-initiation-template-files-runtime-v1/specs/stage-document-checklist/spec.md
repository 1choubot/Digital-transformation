## ADDED Requirements

### Requirement: 生成文件不改变资料清单数量
阶段资料清单能力 MUST 将 `1.1 / 1.2 / 1.3` 生成文件视为原资料项的产出记录，不得新增、删除、拆分或改名资料项。

#### Scenario: 不新增文件资料项
- **WHEN** 系统为 `1.1 / 1.2 / 1.3` 生成模板文件
- **THEN** 系统 MUST NOT 新增 `项目需求表文件`、`立项审批表文件`、`立项通知文件` 或等价资料项
- **AND** 生成文件 MUST 关联原资料项

#### Scenario: 71 项数量不变
- **WHEN** 系统初始化或校验 v20260629 项目资料模板
- **THEN** 资料数量 MUST 继续保持 71 项
- **AND** 生成文件记录 MUST NOT 被计入资料项数量

#### Scenario: 在线表单图片不新增资料项
- **WHEN** 用户为 `1.1 项目需求表` 上传场地、工件或作业工艺图片
- **THEN** 图片 MUST remain online-form-owned supporting data for the existing `1.1` item
- **AND** 每个区域最多 3 张图片仍 MUST be counted as supporting data, not new stage-document items
- **AND** 系统 MUST NOT create additional stage-document items or change the 71-item count

#### Scenario: 在线表单入口仍存在
- **WHEN** 用户处理 `1.1 / 1.2 / 1.3`
- **THEN** 阶段资料清单和工作区 MUST 继续表达这些资料以在线表单为填写入口
- **AND** 生成文件 MUST 作为提交或审批后的产出查看形态

### Requirement: 文件平台边界保持
阶段资料清单能力 MUST NOT 因本 change 接入文件平台或创建文件平台资料映射。

#### Scenario: 不调用文件平台
- **WHEN** 系统生成、查询或下载立项模板文件
- **THEN** 系统 MUST NOT 调用文件管理平台 API
- **AND** 系统 MUST NOT 创建文件平台目录、归档状态或文件平台文件映射
