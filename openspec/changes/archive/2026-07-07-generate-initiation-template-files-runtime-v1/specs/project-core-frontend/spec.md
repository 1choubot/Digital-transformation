## ADDED Requirements

### Requirement: 立项产出卡片生成文件入口
项目核心前端 MUST 在 `1.1 / 1.2 / 1.3` 产出卡片上展示后端生成文件状态和下载入口，同时 MUST 保留在线表单填写或浏览入口。

#### Scenario: 在线表单入口保留
- **WHEN** 用户查看 `1.1 / 1.2 / 1.3` 产出卡片
- **THEN** 前端 MUST 继续展示后端允许的在线表单填写或浏览入口
- **AND** 前端 MUST NOT 用普通附件上传或文件下载替代在线表单入口

#### Scenario: 1.1 图片输入控件可用
- **WHEN** 用户填写 `1.1 项目需求表`
- **THEN** 前端 MUST 展示工件描述、作业工艺和目标的大文本字段
- **AND** 前端 MUST 在场地情况、工件描述和作业工艺区域展示后端 schema 声明的图片上传控件
- **AND** 前端 MUST 只允许 png/jpg/jpeg 图片，并 MUST NOT 提供非图片附件、OLE、PDF 或文件平台上传入口
- **AND** 每个区域 MUST show the uploaded image list in stable order with sequence, file name, size, download, and delete entry
- **AND** 每个区域达到 3 张后 MUST disable or block further upload with a clear message
- **AND** 移动端 MUST NOT 因大文本字段、说明文字或图片控件横向裁切

#### Scenario: 已生成时展示下载入口
- **WHEN** 后端返回生成文件状态为 `generated`
- **THEN** 前端 MUST 在产出卡片展示生成文件下载或查看入口
- **AND** 下载动作 MUST 调用后端生成文件下载接口

#### Scenario: 1.2 前置 1.1 时隐藏协同处理状态
- **WHEN** `1.1 项目需求表` 尚未提交或完成
- **AND** 用户打开 `1.2 项目立项审批表` 在线表单
- **THEN** 前端 MUST 根据后端 permissions 展示不可编辑、不可提交状态
- **AND** 前端 MUST 展示 `请先提交 1.1 项目需求表` 或等价阻塞原因
- **AND** 工作台 MUST NOT 展示可处理的 `1.2` 商务或技术协同待办

### Requirement: 前端不填充模板
项目核心前端 MUST 只消费后端文件状态和下载接口，不得在浏览器端填充 Excel 或 Word 模板，也不得维护 mapping manifest。

#### Scenario: 前端不负责模板映射
- **WHEN** 前端展示生成文件状态或处理下载动作
- **THEN** 前端 MUST NOT 维护 Excel 单元格、Word 占位符或字段 mapping manifest
- **AND** 前端 MUST NOT 读取并填充真实模板文件

#### Scenario: 桌面移动基础可用
- **WHEN** 用户在桌面端或移动端查看产出卡片
- **THEN** 文件状态、在线表单入口和下载入口 MUST 可换行或自适应
- **AND** 关键按钮 MUST NOT 被横向裁切

## MODIFIED Requirements

### Requirement: 生成状态展示
项目核心前端 MUST 展示模板文件生成状态，包括未生成/待生成、生成中、已生成和生成失败或等价状态；失败状态不得被表达为在线表单未提交或审批未通过。

#### Scenario: 未生成时展示待生成状态
- **WHEN** 资料尚未达到生成条件或尚未生成文件
- **THEN** 产出卡片 SHOULD 展示未生成、待生成或等价状态
- **AND** 前端 MUST NOT 展示虚假的文件下载入口

#### Scenario: 生成中时展示状态
- **WHEN** 后端文件状态为生成中
- **THEN** 前端 SHOULD 展示生成中状态
- **AND** 前端 SHOULD 避免让用户误以为文件已经可下载

#### Scenario: 已生成时展示下载入口
- **WHEN** 后端返回生成文件状态为 `generated`
- **THEN** 前端 MUST 展示已生成状态
- **AND** 前端 MUST 展示后端允许的生成文件下载或查看入口

#### Scenario: 生成失败时展示错误摘要
- **WHEN** 后端文件状态为生成失败
- **THEN** 前端 SHOULD 展示失败状态和可理解错误摘要
- **AND** 前端 MUST NOT 将失败状态展示为已生成或 `generated`
- **AND** 前端 MUST NOT 将失败状态表达为在线表单未提交或审批未通过
- **AND** 前端 MUST NOT 声称在线表单提交或审批被回滚

#### Scenario: 失败后仍有最近成功版本
- **WHEN** 后端返回最新生成尝试为 `failed`
- **AND** 返回存在最近成功可下载版本
- **THEN** 前端 MUST 展示失败状态
- **AND** 前端 MAY 展示最近成功版本的下载入口
- **AND** 前端 MUST NOT 将失败版本本身表达为已生成

#### Scenario: 不展示伪造文件平台归档状态
- **WHEN** 本 change 未接入文件平台
- **THEN** 前端 MUST NOT 展示已归档到文件平台、已同步文件平台或等价假状态

#### Scenario: 重试入口受权限和后端能力控制
- **WHEN** 后续实现允许重试文件生成
- **THEN** 前端 SHOULD 仅在后端返回可重试且用户有权限时展示重试入口
- **AND** 前端 MUST NOT 在无权限或后端未开放重试时伪造重试入口
