## 1. OpenSpec 文档

- [x] 1.1 创建 `add-organization-roles-and-project-governance` change 结构
- [x] 1.2 编写 `proposal.md`，明确背景、范围和排除项
- [x] 1.3 编写 `design.md`，明确组织角色、项目模式、项目经理和权限边界
- [x] 1.4 编写 user-management、basic-users-auth、project-core、stage-document-checklist、project-core-frontend spec deltas
- [x] 1.5 运行 OpenSpec status 和 strict validate
- [x] 1.6 修正文档，收紧系统管理员保护、项目经理权威字段、后端权限拒绝和责任人候选用户口径

## 2. 数据库/后端模型

- [x] 2.1 新增用户组织角色字段 `organization_role`
- [x] 2.2 约束组织角色枚举：总经理、系统管理员、总经理助理、中心负责人、员工
- [x] 2.3 约束部门枚举：运营中心、营销中心、制造中心、研发中心
- [x] 2.4 约束总经理、系统管理员、总经理助理部门为空
- [x] 2.5 约束中心负责人、员工必须隶属于四个业务部门之一
- [x] 2.6 保留 `role` 作为岗位/职务展示文本
- [x] 2.7 确保 `organizationRole = system_admin` 必须对应 `isPlatformAdmin = true`
- [x] 2.8 确保至少保留一个同时满足 `isEnabled = true`、`organizationRole = system_admin`、`isPlatformAdmin = true` 的账号
- [x] 2.9 禁止用户管理操作导致上述系统管理账号数量变成 0
- [x] 2.10 如需旧数据恢复，仅通过初始化/修复脚本处理，不作为长期运行时权限口径

## 3. 用户管理与认证

- [x] 3.1 用户新增/编辑支持 `organizationRole` 和部门规则校验
- [x] 3.2 用户列表和详情返回 `organizationRole`、`department`、`role`、`isPlatformAdmin`
- [x] 3.3 登录响应和 `/api/auth/me` 返回 `organizationRole` 和 `department`
- [x] 3.4 责任人候选用户仅返回启用的中心负责人或员工，且必须隶属于四个业务部门之一
- [x] 3.5 保持安全用户模型不返回密码字段
- [x] 3.6 责任人候选用户不返回总经理、系统管理员、总经理助理、禁用用户、密码字段或非展示必需的平台管理员内部字段
- [x] 3.7 保持系统管理员和业务角色边界清晰

## 4. 项目模式与项目经理

- [x] 4.1 新增项目模式字段 `projectMode`
- [x] 4.2 支持 `self_developed` 和 `outsourced` 两种项目模式
- [x] 4.3 新增项目经理用户关联字段 `projectManagerUserId`
- [x] 4.4 项目响应返回 `projectManagerUser`
- [x] 4.5 校验项目经理必须是启用的中心负责人或员工
- [x] 4.6 校验总经理、系统管理员、总经理助理不能被指定为项目经理
- [x] 4.7 保持自研/外包共用同一 8 阶段和 54 项资料
- [x] 4.8 保持项目模式不改变阶段推进、资料状态机、适用性和附件规则
- [x] 4.9 项目创建/编辑接口以 `projectManagerUserId` 为项目经理权威字段
- [x] 4.10 旧 `projectManager` 文本不得作为权限判断依据；如保留响应字段，只能从 `projectManagerUser.name` 派生
- [x] 4.11 非法项目经理 ID 返回 `INVALID_PROJECT_MANAGER_USER_ID`
- [x] 4.12 项目经理不存在或被禁用返回 `PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED`
- [x] 4.13 项目经理角色不允许返回 `PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED`

## 5. 资料责任人/项目参与人派生

- [x] 5.1 沿用 `responsibleUserId` 表达资料项责任人
- [x] 5.2 不新增技术负责人表
- [x] 5.3 不新增项目参与人表
- [x] 5.4 按项目内至少负责一项资料派生项目参与人
- [x] 5.5 允许项目经理同时作为资料责任人
- [x] 5.6 明确资料责任人负责提交/整理资料，不代表审批权

## 6. 权限边界

- [x] 6.1 实现或校验系统管理员只默认拥有系统配置、账号和组织管理能力
- [x] 6.2 实现或校验总经理全局查看和关键审批边界
- [x] 6.3 实现或校验总经理助理全局查看、生成、汇总边界，且后端拒绝其资料确认、资料退回、阶段推进、责任人分配/清空和代替总经理审批
- [x] 6.4 实现或校验中心负责人本中心相关资料审批、责任人分配和阶段推进边界；中心负责人用户管理维护能力保留为后续能力
- [x] 6.5 实现或校验员工只能查看自己相关项目和资料任务
- [x] 6.6 实现或校验项目经理可查看自己负责项目全量进度、分配责任人、催办和齐套后推进阶段
- [x] 6.7 确认项目经理身份不自动授予资料审批权
- [x] 6.8 非该项目项目经理不得仅凭普通员工身份推进该项目
- [x] 6.9 非该项目项目经理、非中心负责人、非系统允许角色不得分配/调整该项目资料责任人
- [x] 6.10 后端权限拒绝返回 `FORBIDDEN_OPERATION` 或既有统一权限错误码
- [x] 6.11 不实现复杂 RBAC 或阶段审批流引擎

## 7. 前端页面

- [x] 7.1 用户管理页面展示和维护组织角色、部门、岗位文本
- [x] 7.2 当前用户展示组织角色和部门
- [x] 7.3 项目创建/编辑页面选择项目模式
- [x] 7.4 项目创建/编辑页面选择项目经理用户并提交 `projectManagerUserId`
- [x] 7.5 项目详情展示项目模式、`projectManagerUser`、资料责任人
- [x] 7.6 项目总览展示项目模式和项目经理用户信息
- [x] 7.7 总经理助理可查看全局但不显示审批、退回、阶段推进和责任人分配入口
- [x] 7.8 前端不新增日报周报、文件平台联动或自动通知入口
- [x] 7.9 前端不以旧 `projectManager` 文本判断项目经理权限
- [x] 7.10 前端正确展示项目经理 ID、禁用用户和角色不允许的稳定错误码
- [x] 7.11 责任人候选用户不展示总经理、系统管理员、总经理助理、禁用用户或内部敏感字段

## 8. README

- [x] 8.1 更新后端 README，说明组织角色、部门、项目模式和项目经理用户关联
- [x] 8.2 更新前端 README，说明用户管理和项目页面的新展示字段
- [x] 8.3 明确第一版不做日报周报、文件平台联动、自动通知、复杂 RBAC 和完整审批流

## 9. 验证和 Smoke

- [x] 9.1 运行后端 `cmd /c npm.cmd run check`
- [x] 9.2 运行前端 `cmd /c npm.cmd run build`
- [x] 9.3 运行 `cmd /c openspec validate add-organization-roles-and-project-governance --strict`
- [x] 9.4 运行 `cmd /c openspec validate --all --strict`
- [x] 9.5 运行 `cmd /c openspec list --json`
- [x] 9.6 Smoke：用户组织角色和部门校验
- [x] 9.7 Smoke：登录态和安全用户模型字段
- [x] 9.8 Smoke：项目模式和项目经理创建/详情/列表/总览
- [x] 9.9 Smoke：资料责任人派生项目参与人
- [x] 9.10 Smoke：总经理助理不显示审批、退回、阶段推进和责任人分配入口
- [x] 9.11 Smoke：系统管理员保护，不能禁用/降级最后一个启用的 `system_admin + isPlatformAdmin` 用户
- [x] 9.12 Smoke：总经理助理直接调用资料确认接口被拒绝
- [x] 9.13 Smoke：总经理助理直接调用资料退回接口被拒绝
- [x] 9.14 Smoke：总经理助理直接调用阶段推进接口被拒绝
- [x] 9.15 Smoke：总经理助理直接调用资料责任人分配接口被拒绝
- [x] 9.16 Smoke：非项目经理不能推进不属于自己的项目
- [x] 9.17 Smoke：项目经理可以推进自己负责项目，前提是齐套门禁满足
- [x] 9.18 Smoke：项目经理不能仅凭项目经理身份确认/退回资料
- [x] 9.19 Smoke：非法项目经理 ID 返回稳定错误
- [x] 9.20 Smoke：禁用用户不能被设为项目经理
- [x] 9.21 Smoke：总经理、系统管理员、总经理助理不能被设为项目经理
- [x] 9.22 Smoke：责任人候选用户不返回总经理、系统管理员、总经理助理或禁用用户
- [x] 9.23 Smoke：旧 `projectManager` 文本不作为权限判断依据

## 10. 归档前权限修复

- [x] 10.1 为 `GET /api/projects` 和 `GET /api/projects/:projectId` 保持 `requireAuth`
- [x] 10.2 项目列表、项目详情和项目总览看板按当前用户过滤可见项目
- [x] 10.3 阶段资料清单和项目业务日志读取按项目可见范围拒绝无权访问
- [x] 10.4 明确并实现系统管理员不自动获得业务项目全局查看、审批、推进、责任人分配或适用性变更权限
- [x] 10.5 收紧中心负责人权限为本中心相关项目或资料范围，拒绝跨中心确认、退回、分配责任人和推进阶段
- [x] 10.6 不适用和恢复适用接口传入完整当前用户并在后端按项目/资料/部门上下文校验权限
- [x] 10.7 前端项目详情页按资料项和项目上下文控制提交、确认/退回、责任人分配、阶段推进、不适用和恢复适用入口
- [x] 10.8 修正 README、design 和 spec delta，明确项目可见性、中心负责人范围、不适用操作权限和中心负责人用户管理后续口径
- [x] 10.9 Smoke：未登录访问 `GET /api/projects` 返回 401
- [x] 10.10 Smoke：未登录访问 `GET /api/projects/:projectId` 返回 401
- [x] 10.11 Smoke：普通员工只能看到自己负责资料或自己作为项目经理的项目，直接访问无关项目详情被拒绝
- [x] 10.12 Smoke：总经理助理可查看全局项目，但直接确认、退回、推进、分配责任人和标记不适用均被拒绝
- [x] 10.13 Smoke：系统管理员不能直接执行业务审批、推进、责任人分配或不适用操作
- [x] 10.14 Smoke：中心负责人跨中心确认、退回、分配责任人、推进被拒绝，本中心允许范围内操作通过
- [x] 10.15 Smoke：项目经理能推进自己负责且齐套的项目，但不能仅凭项目经理身份确认或退回资料
- [x] 10.16 Smoke：失败权限操作不改变资料状态、适用性、责任人、阶段状态，也不写业务日志
- [x] 10.17 运行后端 `cmd /c npm.cmd run check`
- [x] 10.18 运行前端 `cmd /c npm.cmd run build`
- [x] 10.19 运行 OpenSpec strict validate 和 active change 列表确认

## 11. 归档前附件与参与部门修复

- [x] 11.1 四个阶段资料附件接口先校验当前用户项目可见性
- [x] 11.2 无权附件上传在读取 multipart 或写文件前返回 `FORBIDDEN_OPERATION`
- [x] 11.3 无权附件列表、下载和删除返回 `FORBIDDEN_OPERATION`
- [x] 11.4 无权附件删除不软删除附件、不新增业务日志
- [x] 11.5 后端 `participatingDepartments` 只接受四个业务部门枚举数组
- [x] 11.6 后端允许参与部门为空或空数组，重复枚举去重保存
- [x] 11.7 后端拒绝中文部门名、未知值和非数组非空参与部门，返回 `INVALID_PARTICIPATING_DEPARTMENT`
- [x] 11.8 前端新建项目页将参与部门自由文本输入改为四个业务部门复选框，并提交枚举数组
- [x] 11.9 前端补充 `INVALID_PARTICIPATING_DEPARTMENT` 中文错误提示
- [x] 11.10 更新 README、design 和 spec delta，明确附件项目可见性与参与部门稳定枚举口径
- [x] 11.11 Smoke：未登录访问四个附件接口均返回 401
- [x] 11.12 Smoke：无权用户访问不可见项目附件列表、下载、上传、删除均返回 `FORBIDDEN_OPERATION`
- [x] 11.13 Smoke：无权上传失败后不产生文件、不产生附件记录、不写业务日志
- [x] 11.14 Smoke：无权删除失败后附件仍存在且业务日志不新增
- [x] 11.15 Smoke：有权用户在可见项目内可正常上传、列表、下载、删除附件
- [x] 11.16 Smoke：合法 `participatingDepartments` 枚举数组可保存并返回
- [x] 11.17 Smoke：中文部门名或非法部门值返回 `INVALID_PARTICIPATING_DEPARTMENT`
- [x] 11.18 Smoke：中心负责人能通过合法 `participatingDepartments` 枚举看到本中心相关项目
- [x] 11.19 Smoke：非法或自由文本参与部门不能造成中心负责人预期外权限
- [x] 11.20 运行后端 `cmd /c npm.cmd run check`
- [x] 11.21 运行前端 `cmd /c npm.cmd run build`
- [x] 11.22 运行 OpenSpec strict validate 和 active change 列表确认
