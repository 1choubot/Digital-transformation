## ADDED Requirements

### Requirement: 查看权限与业务操作权限分离

系统 MUST 在权限架构上分离项目查看、阶段资料查看、附件查看/下载、业务日志查看与业务操作授权，后续实现不得把查看 helper 与操作 helper 合并为同一授权入口。

#### Scenario: 查看 helper 可按本 change 放宽

- **WHEN** 系统判断项目列表/详情可见性、阶段资料条目可见性、附件查看/下载或完整业务日志查看
- **THEN** 后续实现 MAY 调整 `visibility.js`、`canViewStageDocumentItem`、`canViewStageDocumentAttachments`、`canDownloadStageDocumentAttachment`、`canViewProjectOperationLogs` 或等价 business-operation-log view helper

#### Scenario: legacy 阶段审批历史 helper 不随业务日志放宽

- **WHEN** 系统判断 legacy 阶段审批历史查看权限
- **THEN** 系统 MUST 使用 `canViewCompleteProjectAudit` 或等价 legacy helper
- **AND** 系统 MUST NOT 因本 change 放宽业务日志查看权限而放宽 legacy 阶段审批历史查看权限
- **AND** 总经理助理、中心负责人、项目创建人不得仅因项目/日志全量查看权获得 legacy 阶段审批历史查看权

#### Scenario: 操作 helper 不得因查看放宽

- **WHEN** 系统判断资料提交、资料审核、资料退回、精准返工退回、责任人分配、适用性管理、附件上传、附件删除、阶段推进或项目编号填写
- **THEN** 后续实现 MUST NOT 放宽 `canReviewStageDocument`、`canSubmitStageDocument`、`canManageProjectResponsibility`、`canManageStageDocumentApplicability`、`canAdvanceProjectStage`、精准返工退回权限或等价操作函数
- **AND** 系统 MUST NOT 将“可查看项目”作为上述操作的充分授权条件

#### Scenario: buildStageDocumentPermissions 仅调整查看下载字段

- **WHEN** 后续实现调整阶段资料权限字段构建
- **THEN** 本 change 只允许调整 `canViewAttachments` 和 `canDownloadAttachment`
- **AND** 后续实现 MUST NOT 因本 change 调整 `canUploadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility` 或 `canChangeApplicability`

#### Scenario: 不联动文件管理平台

- **WHEN** 系统实现项目全量查看、附件列表、附件下载或业务日志查看
- **THEN** 系统 MUST 继续使用在线平台现有附件能力
- **AND** 系统 MUST NOT 调用文件管理平台 API、创建文件平台 folder mapping、同步文件平台权限或恢复文件平台归档状态

#### Scenario: 不新增报表生成

- **WHEN** 系统实现全量项目和业务日志查看
- **THEN** 系统 MUST NOT 新增日报、周报、项目一览表生成、日志导出或管理层报表生成能力

#### Scenario: 不实现 1.2 多节点审批

- **WHEN** 系统实现项目、资料、附件或日志查看权限调整
- **THEN** 系统 MUST NOT 实现 `1.2 项目立项审批表` 的商务评价、技术评价或总经理多节点在线审批
