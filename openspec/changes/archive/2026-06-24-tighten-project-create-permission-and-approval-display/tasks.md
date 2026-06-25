## 1. OpenSpec 文档

- [x] 1.1 创建 `tighten-project-create-permission-and-approval-display` OpenSpec change scaffold
- [x] 1.2 编写 `proposal.md`，说明测试暴露的问题、范围和影响
- [x] 1.3 编写 `design.md`，明确项目创建权限、用户展示和审批表达决策
- [x] 1.4 编写 `project-core` spec delta
- [x] 1.5 编写 `project-core-frontend` spec delta
- [x] 1.6 编写 `stage-document-checklist` spec delta
- [x] 1.7 编写后续实现任务清单

## 2. 后端项目创建权限

- [x] 2.1 在 `POST /api/projects` 后端路径增加项目创建权限校验
- [x] 2.2 允许 `general_manager` 创建项目
- [x] 2.3 允许 `center_manager` 创建项目
- [x] 2.4 禁止 `employee` 创建项目并返回 `FORBIDDEN_OPERATION`
- [x] 2.5 禁止 `general_manager_assistant` 创建项目并返回 `FORBIDDEN_OPERATION`
- [x] 2.6 禁止 `system_admin` 创建项目并返回 `FORBIDDEN_OPERATION`
- [x] 2.7 确保创建权限失败时不插入项目、阶段、资料或业务日志
- [x] 2.8 保持有权限创建成功时初始化 8 阶段和 54 项 v20260610 资料
- [x] 2.9 保持有权限创建成功时写入 `project.created` 业务日志

## 3. 前端项目创建权限

- [x] 3.1 根据当前用户 `organizationRole` 控制创建项目入口显示
- [x] 3.2 无创建权限用户直接访问项目创建页时展示无权限提示或禁止提交
- [x] 3.3 为 `FORBIDDEN_OPERATION` 创建项目失败补充可读中文提示

## 4. 用户展示格式优化

- [x] 4.1 梳理项目列表、项目详情、项目总览、资料责任人和审批历史中的用户展示 helper
- [x] 4.2 将普通业务页面用户主文本调整为姓名
- [x] 4.3 将普通业务页面用户辅助文本调整为部门和岗位/职务
- [x] 4.4 避免在普通业务页面把 `organizationRole` 和 `role` 拼成一行
- [x] 4.5 保留用户管理和审批角色上下文中的组织角色展示

## 5. 资料级审核和阶段关口审批文案

- [x] 5.1 将资料提交、确认、退回区域文案调整为资料级审核语义
- [x] 5.2 将阶段审批区域文案调整为“阶段关口审批”或等价表达
- [x] 5.3 在附件区域表达上传附件不等于提交审核
- [x] 5.4 在阶段关口审批区域表达适用必填资料需先全部审核通过
- [x] 5.5 在阶段推进区域表达需要同时满足资料审核通过和阶段关口审批通过

## 6. README

- [x] 6.1 更新 `digital-platform-api/README.md`，说明项目创建权限边界
- [x] 6.2 更新 `digital-platform-web/README.md`，说明用户展示和审批概念文案边界

## 7. 验证

- [x] 7.1 后端 check：`cmd /c npm.cmd run check`
- [x] 7.2 前端 build：`cmd /c npm.cmd run build`
- [x] 7.3 OpenSpec validate：`cmd /c openspec validate tighten-project-create-permission-and-approval-display --strict`
- [x] 7.4 OpenSpec all validate：`cmd /c openspec validate --all --strict`
- [x] 7.5 验证项目详情用户展示格式清晰
- [x] 7.6 验证阶段资料清单页面文案区分资料级审核和阶段关口审批
- [x] 7.7 验证无创建权限用户不显示创建项目入口
- [x] 7.8 验证有创建权限用户显示创建项目入口
- [x] 7.9 验证无创建权限用户直接访问创建页不能提交
- [x] 7.10 验证审批历史、责任人和附件上传人展示不拼接组织角色与岗位

## 8. HTTP Smoke

- [x] 8.1 员工创建项目失败，返回 `FORBIDDEN_OPERATION`
- [x] 8.2 总经理助理创建项目失败，返回 `FORBIDDEN_OPERATION`
- [x] 8.3 系统管理员创建项目失败，返回 `FORBIDDEN_OPERATION`
- [x] 8.4 总经理创建项目成功
- [x] 8.5 中心负责人创建项目成功
- [x] 8.6 创建失败不插入项目主数据
- [x] 8.7 创建失败不插入项目阶段
- [x] 8.8 创建失败不插入项目级阶段资料
- [x] 8.9 创建失败不写 `project.created` 或其他成功业务日志
