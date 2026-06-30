## ADDED Requirements

### Requirement: 阶段资料提交权限边界

系统 MUST 将阶段资料提交权限限定为资料项当前责任人权限；完整资料查看权、项目经理身份、总经理身份、中心负责人身份、系统管理员身份、总经理助理身份或资料审核权限均不得自动授予 `canSubmitDocument` 或提交接口权限。

#### Scenario: 责任人可提交本人负责资料
- **WHEN** 当前用户是某适用阶段资料项的 `responsibleUserId` 或 `responsible_user_id`
- **THEN** 系统 MUST 返回 `canSubmitDocument = true`
- **AND** 提交接口 MUST 按资料状态机和完成规则继续处理该用户的提交请求

#### Scenario: 未分配责任人资料不可提交
- **WHEN** 阶段资料项没有分配责任人且当前用户具备该项目或资料的查看权限
- **THEN** 系统 MUST 允许该资料项按查看权限展示
- **AND** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 提交接口 MUST 拒绝该用户提交该资料项

#### Scenario: 完整查看不授予提交权限
- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理仅因完整项目或完整资料查看口径可查看某资料项
- **THEN** 系统 MUST NOT 因该查看权限返回 `canSubmitDocument = true`
- **AND** 系统 MUST NOT 因该查看权限允许调用提交接口

#### Scenario: 审核权限不授予提交权限
- **WHEN** 当前用户对某已提交资料项具备 `canReviewDocument = true` 但不是该资料项责任人
- **THEN** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 系统 MUST 继续允许其按资料审核规则审核该已提交资料项
- **AND** 系统 MUST NOT 允许其把未提交资料项制造成已提交或完成状态

#### Scenario: 系统角色不授予业务提交权限
- **WHEN** 当前用户仅具备 `system_admin` 或 `general_manager_assistant` 组织角色且不是资料项责任人
- **THEN** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 提交接口 MUST 拒绝该用户提交阶段资料

#### Scenario: 项目经理作为责任人可提交
- **WHEN** 当前用户是项目经理且同时被分配为该资料项责任人
- **THEN** 系统 MUST 基于责任人身份返回 `canSubmitDocument = true`
- **AND** 系统 MUST NOT 基于项目经理身份本身授予其他资料项提交权限
