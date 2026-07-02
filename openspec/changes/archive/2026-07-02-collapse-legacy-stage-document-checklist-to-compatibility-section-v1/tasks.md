## 1. Planning

- [x] 1.1 创建 `collapse-legacy-stage-document-checklist-to-compatibility-section-v1` change scaffold。
- [x] 1.2 新增 `docs/9.26_旧资料清单默认折叠为兼容资料区规划_20260702.md`。
- [x] 1.3 撰写 proposal，明确本 change 只把旧资料清单默认折叠为兼容资料区。
- [x] 1.4 撰写 design，明确折叠状态由项目详情页管理，旧清单组件继续保留。
- [x] 1.5 撰写 project-core-frontend、stage-document-checklist、technical-architecture delta specs。

## 2. Implementation - 兼容资料区折叠

- [x] 2.1 在 `ProjectDetailPage.vue` 中为旧资料清单增加页面级展开/收起状态，默认折叠。
- [x] 2.2 将下方旧资料清单区域标题改为“兼容资料区”或等价旧资料兼容语义。
- [x] 2.3 折叠状态显示摘要：当前资料已迁移到上方项目工作区处理，本区域仅用于旧模板兼容查看。
- [x] 2.4 增加展开/收起按钮，并保证按钮可键盘触发、状态文案清晰。
- [x] 2.5 展开后继续渲染现有 `ProjectStageDocumentChecklist`，不删除旧资料清单组件。
- [x] 2.6 确认展开后不恢复已迁移资料的责任人分配、上传、提交、审核、退回、返工、不适用等主操作按钮。
- [x] 2.7 确认“到上方产出卡片处理”的定位入口继续可用。
- [x] 2.8 确认 `1.1 / 1.2 / 1.3` 在线表单和 `1.2` 专用评价审批不受影响。
- [x] 2.9 将主操作成功/错误反馈移动到兼容资料区折叠状态下仍可见的页面级位置。

## 3. Implementation - 样式和响应式

- [x] 3.1 为兼容资料区容器、标题、摘要和展开按钮添加样式。
- [x] 3.2 确保桌面布局下兼容资料区不再视觉上抢占主操作区。
- [x] 3.3 确保移动 viewport 下标题、摘要、按钮和展开内容不重叠、不溢出。

## 4. Verification

- [x] 4.1 在 `digital-platform-web` 运行 `cmd /c npm.cmd run build`。
- [x] 4.2 运行 `cmd /c openspec validate collapse-legacy-stage-document-checklist-to-compatibility-section-v1 --strict`。
- [x] 4.3 运行 `cmd /c openspec validate --all --strict`。
- [x] 4.4 运行 `cmd /c openspec list`，确认 change 状态符合预期。
- [x] 4.5 通过代码路径确认项目详情页默认不直接铺开下方旧资料清单。
- [x] 4.6 通过代码路径确认兼容资料区可展开访问旧资料清单。
- [x] 4.7 通过代码路径确认已迁移资料的旧清单主操作按钮未恢复。
- [x] 4.8 通过代码路径确认定位上方产出卡片入口仍保留。
- [x] 4.9 验证未修改后端 API、数据库/migration、71 模板切换、旧项目迁移或旧资料清单删除。
- [x] 4.10 通过代码路径确认兼容资料区默认折叠时主操作成功/错误反馈仍可见。

## 5. Future Boundaries

- [x] 5.1 记录：隐藏或物理删除旧资料清单必须通过后续独立 change 评估，不在本 change 执行。
- [x] 5.2 记录：v20260629 71 项模板默认启用必须通过后续独立 change 评估，不在本 change 执行。
- [x] 5.3 记录：旧资料清单完全清理前必须继续保留兼容查看和定位入口。
