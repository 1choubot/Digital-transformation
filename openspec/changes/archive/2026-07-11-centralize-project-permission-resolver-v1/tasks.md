## 1. 规划和 OpenSpec 校验

- [x] 1.1 创建 `centralize-project-permission-resolver-v1` change。
- [x] 1.2 扫描代表性权限判断位置，覆盖身份、查看和操作权限锚点。
- [x] 1.3 编写 proposal，明确统一项目权限 resolver 的目标、范围和 Non-Goals。
- [x] 1.4 编写 design，包含现状盘点、三批边界、参数化优先原则和风险控制。
- [x] 1.5 编写 `technical-architecture` 和 `project-core` spec delta。
- [x] 1.6 编写 tasks。
- [x] 1.7 运行 OpenSpec strict 校验。

## 2. Batch 1 实现准备

- [x] 2.1 穷尽枚举当前散落权限判断位置，形成实现前迁移清单。
- [x] 2.2 确认统一身份 helper/resolver 的目标文件位置和导出边界。
- [x] 2.3 确认 Batch 1 只覆盖基础身份和低风险 user/project/document like helper，不迁移复杂操作权限。

## 3. Batch 1 身份 helper 实现

- [x] 3.1 新增统一身份 helper/resolver 文件或收敛现有 `organization.js` 导出。
- [x] 3.2 实现 `hasOrganizationRole(user, role)`。
- [x] 3.3 实现 `isCenterManager(user)` 和 `isCenterManagerOf(user, department)`。
- [x] 3.4 实现 `isProjectManagerOf(user, projectLike)`。
- [x] 3.5 实现 `isResponsibleUserOf(user, documentLike)`。
- [x] 3.6 将少量低风险重复身份判断迁移到 Batch 1 helper。

## 4. 回归测试

- [x] 4.1 补或复用权限 helper 单测，覆盖总经理、总经理助理、系统管理员、中心负责人、项目经理、资料责任人。
- [x] 4.2 覆盖 `BUSINESS_DEPARTMENT` 实际枚举的参数化中心负责人判断。
- [x] 4.3 确认 Batch 1 不改变立项、方案设计、阶段资料和自动推进权限结果。

## 5. 校验

- [x] 5.1 运行 `cmd /c npm.cmd run test:initiation-workflow`。
- [x] 5.2 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 5.3 运行 `cmd /c npm.cmd run test:reports`。
- [x] 5.4 运行 `cmd /c npm.cmd run check`。
- [x] 5.5 运行 `cmd /c openspec validate centralize-project-permission-resolver-v1 --strict`。
- [x] 5.6 运行 `cmd /c openspec validate --all --strict`。
- [x] 5.7 运行 `git diff --check`。

## 6. 收尾

- [x] 6.1 归档 change。
- [x] 6.2 提交实现。
