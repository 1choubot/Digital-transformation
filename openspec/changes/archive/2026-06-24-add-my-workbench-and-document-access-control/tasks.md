## 1. OpenSpec 文档

- [x] 1.1 创建 `add-my-workbench-and-document-access-control` OpenSpec change scaffold
- [x] 1.2 编写 `proposal.md`，明确工作台和资料访问控制背景、目标与非目标
- [x] 1.3 编写 `design.md`，明确本地附件存储、工作台待办类型、角色边界和资料项级附件权限
- [x] 1.4 编写 `project-core` spec delta
- [x] 1.5 编写 `project-core-frontend` spec delta
- [x] 1.6 编写 `stage-document-checklist` spec delta
- [x] 1.7 编写后续实现和验证任务清单
- [x] 1.8 收紧“我的工作台”四类待办口径，明确可处理待办与状态信息边界
- [x] 1.9 明确资料审核人规则和“本中心相关资料”的第一版判断依据
- [x] 1.10 收紧附件列表、下载、上传、删除的资料项级权限和无副作用要求
- [x] 1.11 明确总经理助理和系统管理员不得默认获得业务资料附件权限
- [x] 1.12 明确普通员工待办 `targetRoute` 必须进入受限任务视图或受限详情
- [x] 1.13 补充资料清单和工作台返回后端权限字段，避免前端硬猜权限
- [x] 1.14 补充本轮新增的后续实现验证任务
- [x] 1.15 收紧第一版附件上传权限为资料责任人本人
- [x] 1.16 明确 `canUploadAttachment` 不得复用宽泛 `canSubmitStageDocument`
- [x] 1.17 将资料审核和资料责任待办从“可以纳入”修正为“必须纳入”

## 2. 后端工作台接口

- [x] 2.1 设计并实现 `GET /api/me/workbench`
- [x] 2.2 返回工作台汇总计数
- [x] 2.3 返回 `document_responsibility` 待办
- [x] 2.4 返回 `document_review` 待办
- [x] 2.5 返回 `stage_gate_approval` 待办
- [x] 2.6 返回 `stage_advance` 待办
- [x] 2.7 确保工作台查询只使用当前登录态用户，不信任前端传入用户 ID
- [x] 2.8 确保工作台查询只读且不写业务日志

## 3. 后端资料访问与附件权限

- [x] 3.1 实现普通员工资料清单过滤，只返回自己负责资料
- [x] 3.2 实现资料审核人可查看待审核资料
- [x] 3.3 保持项目经理查看自己负责项目完整资料
- [x] 3.4 保持总经理查看完整项目资料
- [x] 3.5 收敛中心负责人资料清单为本中心相关资料
- [x] 3.6 实现附件列表资料项级权限校验
- [x] 3.7 实现附件下载资料项级权限校验
- [x] 3.8 实现附件上传资料项级权限校验
- [x] 3.9 实现附件删除资料项级权限校验
- [x] 3.10 确保无权附件上传不保存文件、不新增附件记录、不写成功业务日志
- [x] 3.11 确保无权附件删除不软删除附件、不写成功业务日志
- [x] 3.12 确保第一版 `canUploadAttachment` 只在 `responsibleUserId = 当前用户 id` 时为真
- [x] 3.13 确保项目经理、中心负责人、总经理不能因管理、审核或审批权限代替责任人上传附件

## 4. 前端我的工作台

- [x] 4.1 将“我的资料任务”升级或改名为“我的工作台 / 我的待办”
- [x] 4.2 展示我的资料责任任务
- [x] 4.3 展示待我审核资料
- [x] 4.4 展示待我阶段关口审批
- [x] 4.5 展示待我推进阶段
- [x] 4.6 支持按待办类型筛选
- [x] 4.7 展示待办摘要计数
- [x] 4.8 点击待办进入对应处理位置

## 5. 前端受限任务视图与附件入口

- [x] 5.1 实现普通员工任务视图或受限项目详情
- [x] 5.2 普通员工任务视图不展示无关资料项
- [x] 5.3 无权资料项不展示附件列表
- [x] 5.4 无权资料项不展示附件下载按钮
- [x] 5.5 无权资料项不展示附件上传按钮
- [x] 5.6 无权资料项不展示附件删除按钮
- [x] 5.7 项目经理和总经理保留有权完整项目视图
- [x] 5.8 中心负责人视图按本中心相关资料收敛
- [x] 5.9 为附件 `FORBIDDEN_OPERATION` 提供中文错误提示

## 6. README

- [x] 6.1 更新 `digital-platform-api/README.md`，说明 `GET /api/me/workbench` 和资料项级附件权限
- [x] 6.2 更新 `digital-platform-web/README.md`，说明“我的工作台”、受限任务视图和附件按钮权限

## 7. 验证

- [x] 7.1 后端 check：`cmd /c npm.cmd run check`
- [x] 7.2 前端 build：`cmd /c npm.cmd run build`
- [x] 7.3 OpenSpec validate：`cmd /c openspec validate add-my-workbench-and-document-access-control --strict`
- [x] 7.4 OpenSpec all validate：`cmd /c openspec validate --all --strict`

## 8. HTTP Smoke

- [x] 8.1 普通员工只能看到自己负责资料
- [x] 8.2 普通员工直接打开项目详情或直接调用资料清单 API 时，也只能看到自己有权资料
- [x] 8.3 普通员工不能下载别人资料附件
- [x] 8.4 责任人提交资料审核后，对应中心负责人工作台出现 `document_review`
- [x] 8.5 资料审核通过或退回后，审核待办消失
- [x] 8.6 资料被退回后，责任人工作台重新出现 `document_responsibility`
- [x] 8.7 中心负责人能看到待审核资料
- [x] 8.8 中心负责人跨中心附件下载失败
- [x] 8.9 项目经理能看自己项目完整资料
- [x] 8.10 总经理能看全部项目和资料
- [x] 8.11 阶段关口待审批时，对应中心负责人或总经理工作台出现 `stage_gate_approval`
- [x] 8.12 阶段审批通过且资料仍齐套时，项目经理工作台出现 `stage_advance`
- [x] 8.13 第 8 阶段不错误生成普通 `stage_advance`
- [x] 8.14 总经理助理没有提交、审核、审批、推进待办
- [x] 8.15 系统管理员不能访问业务附件
- [x] 8.16 无权附件上传失败后不产生文件、附件记录或成功业务日志
- [x] 8.17 无权附件删除失败后不改变附件记录或成功业务日志
- [x] 8.18 项目经理、中心负责人、总经理在不是资料责任人时上传附件失败，返回 `FORBIDDEN_OPERATION`
- [x] 8.19 `canSubmitStageDocument` 或等价宽泛提交权限为真时，若当前用户不是资料责任人，`canUploadAttachment` 仍为假

## 9. 前端 Smoke

- [x] 9.1 我的工作台展示待办分类
- [x] 9.2 审核待办可直接进入处理位置
- [x] 9.3 普通员工任务视图不展示无关资料
- [x] 9.4 普通员工从工作台进入时只看到自己负责资料
- [x] 9.5 无权资料项不展示附件列表、下载、上传或删除入口
- [x] 9.6 前端使用后端权限字段控制资料项和附件按钮，不用 `organizationRole` 硬猜最终权限
- [x] 9.7 项目经理和总经理仍可进入有权完整项目视图
- [x] 9.8 项目经理、中心负责人、总经理不是资料责任人时不显示附件上传入口

## 10. 归档前修复

- [x] 10.1 修复附件删除权限，要求当前附件访问权、本人上传、资料未审核通过且排除系统管理员/总经理助理
- [x] 10.2 修复责任人变更后旧责任人不得凭历史上传人身份删除当前无权附件
- [x] 10.3 修复业务日志接口，避免普通员工仅因资料项可见项目时读取整项目业务日志
- [x] 10.4 修复阶段关口审批历史接口，避免普通员工仅读取资料任务时读取整项目审批历史
- [x] 10.5 修复前端受限视图，不展示整项目业务日志和阶段审批历史
- [x] 10.6 更新 OpenSpec 文档，补充归档前边界修复规则
- [x] 10.7 后端 check：`cmd /c npm.cmd run check`
- [x] 10.8 前端 build：`cmd /c npm.cmd run build`
- [x] 10.9 OpenSpec validate：`cmd /c openspec validate add-my-workbench-and-document-access-control --strict`
- [x] 10.10 OpenSpec all validate：`cmd /c openspec validate --all --strict`
- [x] 10.11 HTTP/MySQL smoke：旧责任人失权后删除旧附件失败且无副作用
- [x] 10.12 HTTP/MySQL smoke：普通员工不能通过 operation logs / approval history API 查看整项目审计信息
