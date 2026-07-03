## Why

v20260629 71 项资料模板已经启用为新项目默认模板。现在需要一个独立 change 验证新项目真实运行基线，及时修复阻塞 bug，避免 64/71 并存状态下项目工作区、阶段资料、我的工作台或阶段推进出现回归。

## What Changes

- 建立 v20260629 新项目运行基线验收范围，覆盖项目创建、资料模板、项目工作区、阶段资料清单、我的工作台、阶段推进和兼容资料区。
- 使用 API smoke 先验证数据层、模板版本、资料数量、权限和状态派生。
- 使用人工浏览器验收验证项目总览、项目详情、工作区产出卡片、兼容资料区、我的工作台和立项在线表单交互。
- 发现 v20260629 新项目运行阻塞 bug 时，允许在本 change 内修复。
- 修复必须复用现有入口、现有资料状态、现有权限、现有附件和现有业务日志，不新增业务规则或第二套状态机。

不做：

- 不新增业务规则。
- 不新增复杂在线表单、专用审批流、付款流、发票流、项目模式分支或 BPM/流程引擎。
- 不处理文件平台联动。
- 不迁移旧项目，不补初始化旧项目。
- 不删除、不隐藏、不物理移除兼容资料区。
- 不改数据库 schema，不写 migration。
- 不处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-core`: 增加 v20260629 新项目运行基线验证和阻塞 bug 修复边界，要求项目创建、阶段推进、工作台和旧项目保持按项目实际资料集合判断。
- `project-core-frontend`: 增加 v20260629 新项目页面验收边界，要求项目工作区、产出卡片、兼容资料区、我的工作台和立项在线表单在新旧项目并存时正确展示。
- `stage-document-checklist`: 增加 v20260629 新项目阶段资料清单运行验收边界，要求 71 项新项目、64 项旧项目、LC33/LC54 兼容项和非立项通用资料操作保持一致。
- `technical-architecture`: 增加稳定验证 change 的架构边界，禁止借稳定验证引入新状态机、数据库 migration、文件平台联动或旧项目迁移。

## Impact

- 本轮只新增规划文档和 OpenSpec change artifacts，不修改业务代码。
- 后续 implementation / verification 预计会运行 API check、Web build、OpenSpec validate、API smoke 和人工浏览器验收。
- 若验证发现阻塞 bug，后续实现可能修改既有后端、前端或 smoke，但必须保持不新增业务规则、不改数据库、不迁移旧项目、不处理文件平台。
