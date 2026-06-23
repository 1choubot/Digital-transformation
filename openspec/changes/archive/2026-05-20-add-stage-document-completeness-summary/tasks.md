## 1. 后端阶段资料齐套摘要

- [x] 1.1 确认阶段资料清单查询结果的阶段分组结构，并确定每个阶段新增 `completenessSummary` 的响应位置
- [x] 1.2 基于 `project_stage_documents` 当前状态实现每阶段必填资料统计
- [x] 1.3 确认统计只包含 `is_required = true` 的资料项，建议资料项继续展示但不计入摘要
- [x] 1.4 确认 `confirmed` 计为完成，`not_submitted`、`submitted`、`returned` 计为未完成
- [x] 1.5 实现 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`
- [x] 1.6 确认 `requiredTotal = 0` 时返回 `completionPercent = 100` 且缺失必填资料列表为空
- [x] 1.7 确认齐套摘要不调用文件管理平台、不判断真实文件、不推进阶段、不生成看板指标

## 2. 前端项目详情页展示

- [x] 2.1 更新项目阶段资料清单数据类型或接口适配，接收每阶段 `completenessSummary`
- [x] 2.2 在项目详情页每个阶段资料清单分组上展示必填资料总数、已确认数、未完成数和完成百分比
- [x] 2.3 展示 `incompleteRequiredDocuments` 缺失必填资料列表，并显示资料项名称和当前状态
- [x] 2.4 为无缺失必填资料的阶段展示可读空状态
- [x] 2.5 添加文案说明齐套情况基于“当前手工状态”，不代表文件已上传或已归档
- [x] 2.6 确认资料项手工状态操作成功后刷新清单时，同步刷新阶段齐套摘要和缺失必填资料列表
- [x] 2.7 确认页面没有新增文件上传/下载、在线表单、文件平台联动、阶段推进、管理层看板、业务日志、责任人分配、个人待办或权限配置入口

## 3. 验证

- [x] 3.1 验证包含 `not_submitted`、`submitted`、`returned` 和 `confirmed` 的必填资料时，摘要计数和缺失列表符合统计口径
- [x] 3.2 验证建议资料项状态变化不影响 `completionPercent`
- [x] 3.3 验证 `requiredTotal = 0` 的阶段返回 100% 且缺失列表为空
- [x] 3.4 验证资料项从未完成状态变为 `confirmed` 后，刷新清单会更新对应阶段摘要
- [x] 3.5 验证资料项从 `confirmed` 变为其他状态不在本变更中提供入口
- [x] 3.6 运行后端基础检查或等价测试
- [x] 3.7 运行前端构建或等价检查
- [x] 3.8 运行 `cmd /c openspec validate add-stage-document-completeness-summary --strict`
