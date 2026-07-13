## 1. 规划盘点

- [x] 1.1 创建 `cleanup-legacy-project-process-templates-v1` change。
- [x] 1.2 搜索 `v20260610`、`v20260624`、`v20260625`、`v20260629` 和项目流程模板引用。
- [x] 1.3 记录旧版本引用清单和处理建议。
- [x] 1.4 编写 proposal，明确清理范围、Non-Goals 和当前有效模板保护边界。
- [x] 1.5 编写 design，包含盘点表、三类版本处理策略和风险控制。
- [x] 1.6 编写 `project-core` 和 `technical-architecture` spec delta。
- [x] 1.7 编写 tasks。
- [x] 1.8 运行 `cmd /c openspec validate cleanup-legacy-project-process-templates-v1 --strict`。
- [x] 1.9 运行 `cmd /c openspec validate --all --strict`。
- [x] 1.10 运行 `cmd /c git diff --check`。
- [x] 1.11 运行 `cmd /c openspec list` 和 `git status --short --branch`。

## 2. 实现删除：第一批只清理 `v20260610`

- [x] 2.1 删除无运行入口的 `v20260610` 旧模板快照。
- [x] 2.2 从 `digital-platform-api/package.json` check 脚本移除已删除旧快照文件。
- [x] 2.3 复核 `check-stage-document-ownership.js` 中旧版本防回退断言，确认无需修改且仍防止当前模板回退到旧数量/旧版本。
- [x] 2.4 已决策：`reset-stage-documents-v20260624.js` 命名和 README 说明不在本 change 处理，留到后续命名整理或 legacy cleanup change。
- [x] 2.5 确认未删除 `stageDocumentTemplateItemsV20260624.js`，未修改 `LEGACY_STAGE_DOCUMENT_TEMPLATE_VERSION = 'v20260625'`，legacy 兼容逻辑保持不变。
- [x] 2.6 已决策：本 change 不重命名 `stageDocumentTemplateItemsV20260624.js`，留到后续命名整理或 legacy cleanup change。
- [x] 2.7 复核现有 check/test 已覆盖 `v20260629` 当前有效模板和 71 项数量，本 change 不新增重复断言。
- [x] 2.8 已决策：README 或主规格中过时 active 模板描述不在本 change 大范围整理，留到后续命名整理或 legacy cleanup change。
- [x] 2.9 运行 `cmd /c npm.cmd run test:initiation-workflow`。
- [x] 2.10 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 2.11 运行 `cmd /c npm.cmd run check`。
- [x] 2.12 运行 `node scripts/check-stage-document-ownership.js` 或等价 npm check 覆盖的 ownership smoke。
- [x] 2.13 运行 OpenSpec 校验和 `git diff --check`。

## 3. 收尾

- [x] 3.1 归档 change。
- [x] 3.2 提交实现。
