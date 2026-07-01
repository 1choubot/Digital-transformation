## Why

立项阶段 `1.1 / 1.2` 的责任人分配已由项目工作区上方产出卡片承载，前端完全依赖后端返回的 `permissions.canManageResponsibility` 决定是否展示可操作控件。当前权限返回与实际保存接口校验不一致，会导致有权限用户看不到按钮，或无权限用户看到但保存失败。

## What Changes

- 为 `1.1 项目需求表` 和 `1.2 项目立项审批表` 明确专用责任人分配权限：仅营销中心负责人可分配。
- 统一阶段资料清单/项目工作区权限返回与责任人保存、清空接口的实际校验。
- 明确 `1.3 项目立项通知` 不展示、不要求、不依赖单独责任人分配。
- 增加 API smoke 覆盖营销中心负责人、研发中心负责人、总经理助理、系统管理员等角色的返回权限和接口拒绝行为。
- 不改变 `1.1 / 1.2` 在线表单填写/提交权限：仍只有被分配责任人可填写/提交。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `stage-document-checklist`: 补充立项阶段在线表单资料责任人分配权限返回必须与保存接口一致的规则。
- `technical-architecture`: 补充责任人分配操作权限 helper 与通用查看/管理权限分离的架构边界。

## Impact

- 后端阶段资料权限计算与责任人分配 repository。
- API smoke：`digital-platform-api/scripts/check-stage-document-ownership.js`。
- OpenSpec delta 与简短规划文档。
- 不涉及数据库、migration、第二阶段补录、文件平台联动、日报周报、通知推送、账号管理或通用审批流。
