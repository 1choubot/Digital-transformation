## 1. OpenSpec 文档

- [x] 1.1 创建 `add-project-approval-workflow` OpenSpec change scaffold
- [x] 1.2 编写 `proposal.md`，明确审批流动机、范围和排除能力
- [x] 1.3 编写 `design.md`，明确审批状态、动作、角色边界、记录模型和阶段推进关系
- [x] 1.4 编写 `project-core` spec delta
- [x] 1.5 编写 `stage-document-checklist` spec delta
- [x] 1.6 编写 `project-core-frontend` spec delta
- [x] 1.7 编写 `business-operation-log` spec delta
- [x] 1.8 补充第一版审批节点规则
- [x] 1.9 明确第一版只做阶段级审批
- [x] 1.10 删除历史查询审批动作口径
- [x] 1.11 固定审批错误码
- [x] 1.12 固定阶段审批接口路径
- [x] 1.13 补充中心负责人审批范围
- [x] 1.14 补充总经理审批范围
- [x] 1.15 补充历史查询只读要求
- [x] 1.16 明确审批历史为空返回空列表
- [x] 1.17 移除第一版无单条记录接口下的 `PROJECT_APPROVAL_RECORD_NOT_FOUND`
- [x] 1.18 修正 `Open Questions` 标题

## 2. 数据库迁移

- [x] 2.1 设计并新增项目阶段当前审批状态字段迁移
- [x] 2.2 设计并新增阶段审批历史记录表迁移
- [x] 2.3 为审批记录增加项目、阶段、审批状态、审批人和时间字段
- [x] 2.4 为审批记录查询增加必要索引
- [x] 2.5 验证迁移不修改 8 阶段和 54 项资料模板结构

## 3. 后端领域模型

- [x] 3.1 新增审批状态枚举和审批动作枚举
- [x] 3.2 新增审批错误码映射
- [x] 3.3 实现审批状态机校验
- [x] 3.4 实现审批记录安全映射
- [x] 3.5 实现 8 个阶段第一版审批节点规则

## 4. 后端接口

- [x] 4.1 实现 `POST /api/projects/:projectId/stages/:stageId/approval/submit`
- [x] 4.2 实现 `POST /api/projects/:projectId/stages/:stageId/approval/approve`
- [x] 4.3 实现 `POST /api/projects/:projectId/stages/:stageId/approval/return`
- [x] 4.4 实现 `POST /api/projects/:projectId/stages/:stageId/approval/resubmit`
- [x] 4.5 实现 `GET /api/projects/:projectId/stages/:stageId/approval/history`
- [x] 4.6 实现 `projectId` 和 `stageId` 严格正整数校验
- [x] 4.7 实现阶段属于项目的归属校验
- [x] 4.8 在项目详情或阶段返回中补充审批状态字段

## 5. 权限校验

- [x] 5.1 校验项目经理只能提交或重新提交自己负责项目的阶段审批
- [x] 5.2 校验项目经理不能替代中心负责人或总经理审批
- [x] 5.3 校验中心负责人只能审批第一版审批节点规则中匹配本中心的阶段
- [x] 5.4 校验总经理只能处理阶段 1、阶段 3、阶段 8 的 `pending_general_manager`
- [x] 5.5 拒绝总经理助理审批、退回、推进或代替总经理审批
- [x] 5.6 拒绝系统管理员参与业务审批
- [x] 5.7 确认越权失败不改变审批状态、项目状态、阶段状态或业务日志

## 6. 审批状态机

- [x] 6.1 实现 `not_submitted` 到 `pending_center_manager`
- [x] 6.2 实现不需要总经理审批阶段从 `pending_center_manager` 到 `approved`
- [x] 6.3 实现需要总经理审批阶段从 `pending_center_manager` 到 `pending_general_manager`
- [x] 6.4 实现 `pending_center_manager` 到 `returned_by_center_manager`
- [x] 6.5 实现 `pending_general_manager` 到 `approved`
- [x] 6.6 实现 `pending_general_manager` 到 `returned_by_general_manager`
- [x] 6.7 实现退回后重新提交复用同一个阶段审批状态
- [x] 6.8 校验非法动作返回 `INVALID_APPROVAL_ACTION`
- [x] 6.9 校验退回原因必填并返回 `INVALID_APPROVAL_COMMENT`

## 7. 阶段推进和资料齐套

- [x] 7.1 提交审批前校验当前阶段适用必填资料全部 `confirmed`
- [x] 7.2 审批通过前重新校验资料齐套状态
- [x] 7.3 阶段推进前校验当前阶段审批状态为 `approved`
- [x] 7.4 审批未通过时阶段推进返回 `PROJECT_APPROVAL_NOT_APPROVED`
- [x] 7.5 保持阶段推进仍按标准 8 阶段顺序执行
- [x] 7.6 确认资料提交、附件上传和责任人变更不自动提交或通过审批

## 8. 业务日志

- [x] 8.1 增加 `approval.submitted` 日志
- [x] 8.2 增加 `approval.center_approved` 日志
- [x] 8.3 增加 `approval.center_returned` 日志
- [x] 8.4 增加 `approval.general_approved` 日志
- [x] 8.5 增加 `approval.general_returned` 日志
- [x] 8.6 增加 `approval.resubmitted` 日志
- [x] 8.7 保证审批状态、审批记录和业务日志同事务
- [x] 8.8 验证审批历史查询不写业务日志
- [x] 8.9 验证失败审批操作不写成功日志

## 9. 前端页面

- [x] 9.1 项目详情页展示阶段审批状态
- [x] 9.2 阶段 1、阶段 3、阶段 8 展示二级审批进度
- [x] 9.3 阶段 2、阶段 4、阶段 5、阶段 6、阶段 7 不展示总经理审批入口
- [x] 9.4 项目经理可见提交审批和重新提交入口
- [x] 9.5 中心负责人只在 `pending_center_manager` 且审批中心匹配时可见审批入口
- [x] 9.6 总经理只在 `pending_general_manager` 时可见审批入口
- [x] 9.7 总经理助理只读查看且不显示审批或推进入口
- [x] 9.8 系统管理员不显示业务审批入口
- [x] 9.9 审批退回前端校验非空原因
- [x] 9.10 展示只读审批历史
- [x] 9.11 增加审批错误码中文提示

## 10. README

- [x] 10.1 更新后端 README，说明审批状态、动作、错误码和角色边界
- [x] 10.2 更新前端 README，说明审批入口展示、只读角色和审批历史
- [x] 10.3 明确本 change 不做文件平台联动、消息通知、日报周报或复杂工作流引擎

## 11. 验证

- [x] 11.1 运行后端 `cmd /c npm.cmd run check`
- [x] 11.2 运行前端 `cmd /c npm.cmd run build`
- [x] 11.3 运行 `cmd /c openspec validate add-project-approval-workflow --strict`
- [x] 11.4 运行 `cmd /c openspec validate --all --strict`
- [x] 11.5 运行 `cmd /c openspec list --json`

## 12. HTTP/MySQL smoke

- [x] 12.1 验证 8 个阶段审批节点规则
- [x] 12.2 验证阶段 1、阶段 3、阶段 8 需要总经理审批
- [x] 12.3 验证阶段 2、阶段 4、阶段 5、阶段 6、阶段 7 中心负责人通过后直接 `approved`
- [x] 12.4 验证非本中心负责人审批失败
- [x] 12.5 验证总经理审批非总经理节点失败
- [x] 12.6 验证审批历史查询不写业务日志
- [x] 12.7 验证 `PROJECT_APPROVAL_NOT_APPROVED` 会阻止阶段推进
- [x] 12.8 验证阶段 8 项目经理没有有效业务部门时不能提交审批
- [x] 12.9 项目经理在齐套后成功提交阶段审批
- [x] 12.10 当前阶段未齐套时提交审批失败
- [x] 12.11 总经理助理审批、退回、推进均失败
- [x] 12.12 系统管理员业务审批失败
- [x] 12.13 项目经理不能替代中心负责人或总经理审批
- [x] 12.14 审批退回必须填写原因
- [x] 12.15 审批通过后阶段推进成功
- [x] 12.16 审批未通过时阶段推进失败
- [x] 12.17 审批历史按 `createdAt ASC, id ASC` 返回
- [x] 12.18 审批成功写业务日志
- [x] 12.19 审批失败不写成功日志
- [x] 12.20 审批历史为空时返回空列表，且不写业务日志

## 13. 归档前修复

- [x] 13.1 修复审批通过后资料不齐套时阶段推进错误码
- [x] 13.2 修复阶段资料清单为空时不得提交或通过审批
- [x] 13.3 验证失败路径无审批状态、审批历史、业务日志副作用

## 14. 归档前补充验证

- [x] 14.1 审批通过后将当前阶段必填资料改为未确认，再推进阶段，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- [x] 14.2 当前阶段资料清单为空时提交审批失败，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- [x] 14.3 当前阶段资料清单为空时审批通过失败，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- [x] 14.4 上述失败均不写审批历史、不写业务日志、不改变审批状态
