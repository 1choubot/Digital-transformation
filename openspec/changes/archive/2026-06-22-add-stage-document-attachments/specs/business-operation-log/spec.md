## ADDED Requirements

### Requirement: 阶段资料附件业务日志动作
系统 MUST 支持阶段资料附件上传和删除的项目业务操作日志动作，并 MUST 明确下载附件第一版不写业务日志。

#### Scenario: 支持附件上传动作
- **WHEN** 阶段资料附件上传成功
- **THEN** 系统必须记录 `action_type = document.attachment_uploaded` 且 `target_type = stage_document` 的业务日志

#### Scenario: 支持附件删除动作
- **WHEN** 阶段资料附件删除成功
- **THEN** 系统必须记录 `action_type = document.attachment_deleted` 且 `target_type = stage_document` 的业务日志

#### Scenario: 附件下载不写日志
- **WHEN** 用户下载阶段资料附件
- **THEN** 系统第一版不得写入文件下载日志、全局审计日志或项目业务操作日志

#### Scenario: 附件失败操作不记录日志
- **WHEN** 阶段资料附件上传、下载或删除失败
- **THEN** 系统不得写入 `document.attachment_uploaded` 或 `document.attachment_deleted` 业务日志

### Requirement: 阶段资料附件日志详情
系统 MUST 在阶段资料附件上传和删除日志中保存可读摘要和结构化详情，供项目详情页业务日志展示。

#### Scenario: 附件上传日志详情
- **WHEN** 系统记录 `document.attachment_uploaded` 日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`

#### Scenario: 附件删除日志详情
- **WHEN** 系统记录 `document.attachment_deleted` 日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`

#### Scenario: 附件日志中文摘要
- **WHEN** 系统记录阶段资料附件上传或删除日志
- **THEN** 系统必须保存可读中文 `summary`，并且摘要应能表达附件上传或删除动作、资料项和附件名称

### Requirement: 阶段资料附件日志事务一致性
系统 MUST 保证阶段资料附件上传或删除与对应业务操作日志在同一事务中提交。

#### Scenario: 附件上传日志同事务
- **WHEN** 已登录用户成功上传阶段资料附件
- **THEN** 附件记录保存和 `document.attachment_uploaded` 日志写入必须在同一事务中提交

#### Scenario: 附件删除日志同事务
- **WHEN** 已登录用户成功删除阶段资料附件
- **THEN** 附件软删除标记和 `document.attachment_deleted` 日志写入必须在同一事务中提交

#### Scenario: 附件日志失败回滚附件变更
- **WHEN** 附件上传记录或删除标记已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚附件记录变更，不得出现附件变更成功但缺少业务日志的结果

#### Scenario: 附件日志不触发其他能力
- **WHEN** 系统记录阶段资料附件上传或删除日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办、执行审批流、调用文件管理平台或改变资料状态
