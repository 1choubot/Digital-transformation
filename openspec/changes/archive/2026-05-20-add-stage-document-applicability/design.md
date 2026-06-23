## 背景

当前数字化管理平台已经有 8 阶段项目流程、`project_stage_documents` 项目级阶段资料清单、资料项手工状态流转和阶段必填资料齐套摘要。齐套摘要当前基于“必填资料 + 当前手工状态”计算，但默认所有必填资料都适用于所有项目。

真实项目会因为合同范围、项目类型或交付内容差异，导致部分默认必填资料在某个项目中不需要提交。例如合同范围不含软件、纯软件项目不涉及机械/电气/生产制作，或项目只交付部分阶段内容。第一版需要提供项目级资料项“适用 / 不适用”的人工业务判断能力，让齐套摘要排除明确不适用的资料项。

## 目标 / 非目标

**目标：**

- 为项目级阶段资料项增加独立适用性字段，默认适用。
- 支持已登录用户手工标记资料项不适用，并要求填写非空不适用原因。
- 支持已登录用户将不适用资料项恢复为适用，并清空当前不适用原因。
- 保存标记不适用和恢复适用的最小追溯字段。
- 阶段资料清单查询返回资料项适用性、不适用原因和追溯字段。
- 已不适用资料项不得继续执行提交、确认或退回状态操作。
- 阶段齐套摘要只统计“适用且必填”的资料项。
- 项目详情页展示适用性、原因和追溯信息，并提供手工标记不适用、恢复适用操作。
- 页面文案明确“不适用”是人工业务判断，不代表资料已提交、已确认或已归档。

**非目标：**

- 不实现项目类型模板或自动项目类型识别。
- 不根据项目类型、合同范围或阶段批量自动标记不适用。
- 不实现阶段推进、阶段门禁或管理层看板。
- 不实现文件上传、文件下载或文件管理平台联动。
- 不实现在线表单填写、表单草稿或表单生成归档文件。
- 不实现业务日志、责任人分配、个人待办或通知。
- 不实现复杂权限、角色权限或轻角色校验；本变更只使用 `requireAuth`。

## 设计决策

### 决策一：使用独立布尔字段表示适用性

建议在 `project_stage_documents` 上增加：

- `is_applicable BOOLEAN NOT NULL DEFAULT TRUE`
- `not_applicable_by_user_id BIGINT UNSIGNED NULL`
- `not_applicable_at DATETIME NULL`
- `not_applicable_reason VARCHAR(1000) NULL`
- `restored_applicable_by_user_id BIGINT UNSIGNED NULL`
- `restored_applicable_at DATETIME NULL`

接口响应映射为：

- `isApplicable`
- `notApplicableByUserId`
- `notApplicableAt`
- `notApplicableReason`
- `restoredApplicableByUserId`
- `restoredApplicableAt`

备选方案是新增 `not_applicable` 状态枚举。第一版不采用该方案，因为“不适用”是资料项是否纳入项目范围的业务判断，不是提交、确认、退回状态的一环。保持独立字段可以不破坏已有 `not_submitted`、`submitted`、`confirmed`、`returned` 状态机，也便于恢复适用后继续使用原状态。

### 决策二：恢复适用不自动修改原有 `status`

标记不适用时只修改适用性字段和不适用追溯字段，不自动改变 `status`。恢复适用时同样只恢复适用性字段，清空当前不适用原因和当前不适用人/时间，记录恢复人/时间，不自动修改 `status`。

这样可以保留资料项在标记不适用前的状态事实。例如一个资料项已被退回后被判定合同范围不需要，恢复适用时仍保持 `returned`，由用户按原有状态机处理。第一版不做自动状态重置，避免隐藏历史状态或制造额外流转规则。

适用性操作状态机为：

- 只有当前 `is_applicable = true` 的资料项才能标记不适用。
- 只有当前 `is_applicable = false` 的资料项才能恢复适用。
- 对已不适用资料项再次标记不适用、对已适用资料项恢复适用，均属于非法适用性流转，后端必须拒绝，并且不得改变适用性字段、`status` 或任何追溯字段。

追溯字段清理规则为：

- 标记不适用成功时，写入 `not_applicable_by_user_id`、`not_applicable_at`、`not_applicable_reason`，并清空 `restored_applicable_by_user_id` 和 `restored_applicable_at`。
- 恢复适用成功时，清空 `not_applicable_by_user_id`、`not_applicable_at`、`not_applicable_reason`，并写入 `restored_applicable_by_user_id` 和 `restored_applicable_at`。
- 恢复适用仍不得自动修改原有 `status`。

### 决策三：不适用资料项阻止提交、确认、退回

资料项一旦 `is_applicable = false`，后端必须拒绝提交、确认和退回操作。前端也应隐藏或禁用这些状态操作，只展示恢复适用操作。

备选方案是允许不适用资料项继续改变状态。该方案会让“不适用但已确认”等组合产生歧义，也会影响齐套摘要解释，因此第一版不允许。

### 决策四：提供显式适用性操作接口

建议新增接口：

- `POST /api/projects/:projectId/stage-documents/:documentId/mark-not-applicable`
- `POST /api/projects/:projectId/stage-documents/:documentId/restore-applicable`

两个接口都必须使用 `requireAuth`，并先校验资料项属于 URL 中的项目。标记不适用接口必须要求请求体提供非空 `notApplicableReason`。恢复适用接口不需要原因。

备选方案是使用通用 `PATCH` 接口修改 `isApplicable`。显式动作接口更容易固定校验规则和追溯字段写入方式，也避免前端直接传任意字段。

### 决策五：齐套摘要只统计适用且必填资料

阶段齐套摘要口径调整为：

- 只统计 `is_required = true` 且 `is_applicable = true` 的资料项。
- `confirmed` 计为已完成。
- `not_submitted`、`submitted`、`returned` 计为未完成。
- `is_applicable = false` 的资料项不计入 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`，也不出现在 `incompleteRequiredDocuments`。
- 建议资料项仍不计入齐套摘要。
- `requiredTotal = 0` 时继续返回 `completionPercent = 100` 和空缺失列表。

齐套摘要仍然基于当前手工状态和人工适用性判断，不代表文件已上传、文件已归档或在线表单已提交。

## 风险 / 取舍

- [用户误解不适用为资料已完成] -> 页面文案必须说明“不适用”表示项目不需要该资料，不代表提交、确认或归档。
- [恢复适用后状态保留可能让用户困惑] -> 设计中明确恢复适用不自动改状态，前端应同时展示当前状态和适用性。
- [没有角色权限意味着任意已登录用户可改适用性] -> 第一版明确只做 `requireAuth`，角色权限留给后续变更。
- [不适用原因只保存当前原因，不保留完整历史] -> 本变更只要求最小追溯字段，不实现业务日志。
- [齐套摘要口径变化影响已查看数据] -> 这是预期行为；被标记不适用的必填资料将不再作为缺失资料。

## 迁移计划

1. 新增数据库迁移，为 `project_stage_documents` 增加 `is_applicable` 和适用性追溯字段。
2. 更新数据表初始化逻辑，确保全新环境创建项目级资料项时默认 `is_applicable = true`。
3. 对现有资料项，迁移默认设置为适用，并保持原有 `status` 和追溯字段不变。
4. 如需回滚，应先确认业务实现不再读取这些字段，再移除新增字段；原有 `status` 字段不受影响。

## 待确认问题

当前第一版没有待确认问题。字段命名采用 `is_applicable` 及用户提出的追溯字段名；接口响应使用现有前端风格的 camelCase 字段。
