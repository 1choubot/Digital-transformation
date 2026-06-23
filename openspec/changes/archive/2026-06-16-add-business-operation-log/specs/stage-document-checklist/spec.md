## MODIFIED Requirements

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转、资料项适用性、阶段资料齐套摘要、项目阶段推进门禁和项目业务操作日志不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态、手工变更资料项适用性、计算阶段资料齐套摘要、检查阶段推进齐套门禁或记录项目业务操作日志
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 资料清单能力本身不推进阶段

- **WHEN** 用户查看或系统处理阶段资料清单、资料项手工状态操作或资料项适用性操作
- **THEN** 阶段资料清单能力本身不得执行阶段推进；阶段推进只能由项目核心阶段推进接口按其规格执行，并可读取当前阶段齐套摘要作为门禁输入

#### Scenario: 不实现其他排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除既有项目核心阶段推进接口读取当前阶段齐套摘要作为门禁输入、既有手工资料项适用性、既有只读阶段资料齐套摘要和项目业务操作日志能力定义的最小业务日志外，系统不得实现在线表单填写、表单生成归档文件、管理层看板、复杂权限、角色权限、轻角色校验、责任人分配或个人待办

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 在后端统一校验状态机和资料项适用性；状态流转成功后 MUST 记录项目业务操作日志。

#### Scenario: 标记待提交资料为已提交

- **WHEN** 已登录用户将状态为 `not_submitted` 且适用的项目级资料项标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，并记录 `submitted_by_user_id` 和 `submitted_at`

#### Scenario: 标记已退回资料为已提交

- **WHEN** 已登录用户将状态为 `returned` 且适用的项目级资料项重新标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，记录新的 `submitted_by_user_id` 和 `submitted_at`，并清空 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 确认已提交资料

- **WHEN** 已登录用户确认状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `confirmed`，并记录 `confirmed_by_user_id` 和 `confirmed_at`

#### Scenario: 退回已提交资料

- **WHEN** 已登录用户填写非空退回原因并退回状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `returned`，并记录 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 不适用资料项不能状态流转

- **WHEN** 已登录用户请求提交、确认或退回已标记不适用的项目级资料项
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态、状态追溯字段或适用性字段

#### Scenario: 退回原因必填

- **WHEN** 已登录用户退回资料项但未提供非空退回原因
- **THEN** 系统必须拒绝退回，并且不得改变资料项状态或追溯字段

#### Scenario: 非法状态流转

- **WHEN** 用户请求未被允许的资料项状态流转
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态或追溯字段

#### Scenario: 状态操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项状态操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 状态操作不做角色权限

- **WHEN** 已登录用户请求资料项状态操作
- **THEN** 系统必须只校验登录态、状态机和资料项适用性，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项状态

#### Scenario: 标记提交成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项标记为 `submitted`
- **THEN** 系统必须在同一事务中记录 `action_type = document.submitted` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 确认成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项确认为 `confirmed`
- **THEN** 系统必须在同一事务中记录 `action_type = document.confirmed` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 退回成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项退回为 `returned`
- **THEN** 系统必须在同一事务中记录 `action_type = document.returned` 且 `target_type = stage_document` 的项目业务操作日志，并在 `details_json` 中包含 `returnReason`

#### Scenario: 状态操作日志失败回滚状态变更

- **WHEN** 资料项状态和追溯字段已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚资料项状态流转，不得改变资料项状态或追溯字段

### Requirement: 手工状态流转边界

资料项手工状态流转 MUST 只更新数字化平台中的资料项状态、最小追溯字段和项目业务操作日志，不能表示真实文件上传、在线表单提交或文件平台归档。

#### Scenario: 标记提交不创建文件或表单记录

- **WHEN** 用户手工标记资料项为已提交
- **THEN** 除 `document.submitted` 项目业务操作日志外，系统不得创建文件上传记录、在线表单记录、归档文件或文件平台文件映射

#### Scenario: 状态操作不推进阶段或生成看板

- **WHEN** 用户手工变更资料项状态
- **THEN** 系统不得在状态操作接口中推进阶段或生成管理层看板指标；阶段资料齐套摘要只能在阶段资料清单查询结果中基于当前手工状态只读返回

#### Scenario: 退回资料不创建个人待办

- **WHEN** 用户手工退回资料项
- **THEN** 系统不得在本能力中创建个人待办、发送通知或分配责任人

### Requirement: 资料项适用性

系统 MUST 为项目级阶段资料项保存独立适用性，资料项默认适用，并 MUST 支持手工标记不适用和恢复适用；适用性操作成功后 MUST 记录项目业务操作日志。

#### Scenario: 新资料项默认适用

- **WHEN** 系统生成项目级阶段资料项
- **THEN** 资料项必须默认保存为适用状态

#### Scenario: 标记资料项不适用

- **WHEN** 已登录用户填写非空不适用原因并标记当前适用的项目级资料项不适用
- **THEN** 系统必须将该资料项保存为不适用，记录 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并清空 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 不适用原因必填

- **WHEN** 已登录用户标记资料项不适用但未提供非空不适用原因
- **THEN** 系统必须拒绝该操作，并且不得改变资料项适用性、`status` 或追溯字段

#### Scenario: 恢复资料项适用

- **WHEN** 已登录用户将不适用资料项恢复为适用
- **THEN** 系统必须将该资料项保存为适用，清空 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并记录 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 只有适用资料可标记不适用

- **WHEN** 已登录用户请求将已不适用资料项再次标记为不适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 只有不适用资料可恢复适用

- **WHEN** 已登录用户请求将当前适用资料项恢复适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 恢复适用不自动修改状态

- **WHEN** 系统恢复资料项适用
- **THEN** 系统必须保留该资料项原有 `status`，不得自动改为 `not_submitted`、`submitted`、`confirmed` 或 `returned`

#### Scenario: 适用性操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项适用性操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 适用性操作不做角色权限

- **WHEN** 已登录用户请求资料项适用性操作
- **THEN** 系统必须只校验登录态、资料项归属和操作规则，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项适用性
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项

#### Scenario: 标记不适用成功记录业务日志

- **WHEN** 已登录用户成功标记资料项不适用
- **THEN** 系统必须在同一事务中记录 `action_type = document.marked_not_applicable` 且 `target_type = stage_document` 的项目业务操作日志，并在 `details_json` 中包含 `notApplicableReason`

#### Scenario: 恢复适用成功记录业务日志

- **WHEN** 已登录用户成功恢复资料项适用
- **THEN** 系统必须在同一事务中记录 `action_type = document.restored_applicable` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 适用性日志失败回滚适用性变更

- **WHEN** 资料项适用性和追溯字段已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚资料项适用性操作，不得改变资料项适用性、`status` 或追溯字段

### Requirement: 适用性边界

资料项适用性 MUST 表示人工业务判断，不能表示资料已提交、已确认、已归档或已上传。

#### Scenario: 不适用不创建文件或表单记录

- **WHEN** 用户手工标记资料项不适用
- **THEN** 除 `document.marked_not_applicable` 项目业务操作日志外，系统不得创建文件上传记录、在线表单记录、归档文件或文件平台文件映射

#### Scenario: 不适用不推进阶段

- **WHEN** 用户手工标记资料项不适用或恢复适用
- **THEN** 系统不得推进阶段、生成阶段门禁结果、生成管理层看板指标、创建个人待办、发送通知或分配责任人

#### Scenario: 不适用不改变状态含义

- **WHEN** 资料项被标记为不适用
- **THEN** 系统不得把该资料项解释为已提交、已确认、已上传文件或已归档
