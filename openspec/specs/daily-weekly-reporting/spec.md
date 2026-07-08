# daily-weekly-reporting Specification

## Purpose
TBD - created by archiving change integrate-daily-weekly-reporting-from-legacy-branch-v1. Update Purpose after archive.
## Requirements
### Requirement: 日报填报与补录
系统 MUST 支持用户按工作日填写、保存、提交和查看日报，并 MUST 支持有权限用户补录日报。

#### Scenario: 填写当日日报
- **WHEN** 有权限用户填写当日日报内容并保存或提交
- **THEN** 系统 MUST 保存日报主记录和日报明细
- **AND** 系统 MUST 记录提交人和提交时间

#### Scenario: 已提交日报只读
- **WHEN** 日报已正式提交
- **THEN** 后端 MUST 拒绝再次更新该日报或将其改回草稿
- **AND** 后端 MUST 拒绝继续上传或删除该日报附件
- **AND** 前端 MUST 将该日报详情展示为只读
- **AND** 系统 MUST 保留提交人、提交时间和已提交来源数据

#### Scenario: 草稿自动保存
- **WHEN** 用户首次上传日报照片前系统自动保存草稿
- **THEN** 草稿明细 MUST 允许完成时间为空
- **AND** 系统 MUST NOT 因空草稿行阻塞照片上传

#### Scenario: 日报补录
- **WHEN** 有权限用户补录历史日期日报
- **THEN** 系统 MUST 允许保存对应日期的日报内容
- **AND** 系统 MUST 保留该日报的实际归属日期和操作追溯信息

#### Scenario: 日报附件
- **WHEN** 用户为日报上传附件
- **THEN** 系统 MUST 将附件保存在数字化平台内部日报附件存储中
- **AND** 系统 MUST NOT 调用文件管理平台或改变阶段资料附件表语义

### Requirement: 周报生成与日报预填
系统 MUST 支持用户按周创建、编辑、提交周报，并 MUST 支持从本周日报内容确定性预填周报总结和计划；在 AI 已配置时，系统 MAY 在确定性预填结果基础上提供 AI 文案整理。

#### Scenario: 从日报预填周报
- **WHEN** 用户在周报页面请求从日报预填
- **THEN** 系统 MUST 汇总该用户本周可用日报内容
- **AND** 系统 MUST 生成可编辑的周报总结、计划或等价预填内容
- **AND** 确定性预填 MUST 在 AI 不可用时仍可使用

#### Scenario: 预填后仍可编辑
- **WHEN** 周报已从日报预填或 AI 整理
- **THEN** 用户 MUST 能继续编辑周报内容
- **AND** 系统 MUST NOT 将预填或 AI 整理内容视为不可修改的最终文本

#### Scenario: 周报缺少日报时
- **WHEN** 本周没有可用日报内容
- **THEN** 系统 MUST 返回可理解的空状态或提示
- **AND** 系统 MUST NOT 伪造日报来源内容

#### Scenario: 周日报对比保留仅日报证据
- **WHEN** 某个工作日存在已提交日报但没有对应周报总结
- **THEN** 周日报对比 MUST 输出 `daily_only` 记录
- **AND** 系统 MUST NOT 因该日期缺少周报总结而遗漏日报证据
- **AND** 系统 MUST 使用日报明细稳定标识区分重复日报行

### Requirement: 周报审批
系统 MUST 支持周报提交后的审批或考评流程，并 MUST 保存审批历史。

#### Scenario: 提交周报进入审批
- **WHEN** 用户提交周报
- **THEN** 系统 MUST 将周报置为待审批或等价状态
- **AND** 系统 MUST 记录提交时间和提交人
- **AND** 周报 API MUST 直接返回提交人和提交时间

#### Scenario: 审批通过或退回
- **WHEN** 有审批权限用户处理周报
- **THEN** 系统 MUST 保存审批结果、审批意见、审批人和审批时间
- **AND** 系统 MUST 将审批动作写入周报审批历史

#### Scenario: 中心负责人周报审批
- **WHEN** 中心负责人提交周报
- **THEN** 周报 MUST 进入待审批状态
- **AND** 总经理 MUST 能审批该中心负责人周报

### Requirement: 中心日报汇总
系统 MUST 支持中心日报或中心级日报汇总能力，用于按中心查看成员日报填报和汇总情况。

#### Scenario: 中心日报查询
- **WHEN** 有权限用户查询中心日报
- **THEN** 系统 MUST 返回该中心范围内的日报汇总数据
- **AND** 系统 MUST 按当前权限边界过滤用户和日报内容

#### Scenario: 中心日报计划任务
- **WHEN** 系统启用中心日报计划或调度能力
- **THEN** 系统 MUST 使用数字化平台后端受控调度逻辑
- **AND** 系统 MUST 允许部署环境关闭或配置该调度能力
- **AND** 前端 MUST 为有权限用户提供计划开关和时间保存入口

### Requirement: 报表前端入口
前端 MUST 在当前主线应用壳、路由和导航内接入日报、周报、周报审批和中心日报页面。

#### Scenario: 报表页面接入当前路由
- **WHEN** 用户访问日报、周报、周报审批或中心日报页面
- **THEN** 前端 MUST 通过当前 `router` 和应用导航进入页面
- **AND** 前端 MUST NOT 覆盖当前项目详情、立项工作区或生成文件入口
- **AND** 页面内部程序化跳转 MUST 同步当前 hash-router 状态

#### Scenario: 报表 API 使用当前 HTTP 客户端
- **WHEN** 报表页面调用后端 API
- **THEN** 前端 MUST 使用当前主线 HTTP 客户端、登录态和错误处理方式
- **AND** 前端 MUST NOT 带回旧分支中与当前登录态冲突的拦截器逻辑

### Requirement: 报表能力边界
日报/周报能力 MUST 与项目阶段资料、立项模板文件生成和文件平台集成保持边界。

#### Scenario: 不改变阶段资料数量
- **WHEN** 系统实现日报、周报或中心日报能力
- **THEN** 系统 MUST NOT 新增或删除 v20260629 / 71 项阶段资料项
- **AND** 系统 MUST NOT 将日报或周报伪装为立项阶段资料项

#### Scenario: 不回退立项流程
- **WHEN** 系统接入日报/周报能力
- **THEN** 系统 MUST NOT 回退 `1.1 / 1.2 / 1.3` 在线表单、模板文件生成、项目编号后置到 `1.3` 或新版 `1.2` 审批表流程

#### Scenario: 导出和 AI 能力边界
- **WHEN** 系统接入本切片导出、AI、评分或最终评审能力
- **THEN** 系统 MUST NOT 调用文件管理平台
- **AND** 系统 MUST NOT 生成 PDF
- **AND** 系统 MUST NOT 改变阶段资料清单或立项阶段流程
- **AND** AI 预填、AI 评分和最终评审 MUST 保留后续独立增强边界

### Requirement: 报表 Excel 导出
系统 MUST 支持在当前鉴权和权限边界内导出日报、周报和中心日报 Excel 文件。

#### Scenario: 日报导出
- **WHEN** 日报填写人请求导出自己有权查看的日报
- **THEN** 后端 MUST 生成并返回 `.xlsx` 日报文件
- **AND** 导出 MUST 包含日报主信息、完成项、计划项和可嵌入的日报图片附件
- **AND** 导出 MUST NOT 调用文件管理平台或生成 PDF

#### Scenario: 周报导出
- **WHEN** 周报填写人请求导出自己有权查看的周报
- **THEN** 后端 MUST 生成并返回 `.xlsx` 周报文件
- **AND** 导出 MUST 包含周报周期、总结、计划、提交状态和必要的评分/评审信息
- **AND** 导出 MUST NOT 绕过当前周报读取权限

#### Scenario: 中心日报导出
- **WHEN** 有中心日报权限的用户请求导出指定中心和日期的中心日报
- **THEN** 后端 MUST 按当前中心可见范围生成并返回 `.xlsx` 中心日报文件
- **AND** 中心负责人 MUST 只能导出自己中心范围
- **AND** 总经理或具备全中心权限的用户 MAY 导出被授权中心范围

#### Scenario: 导出失败
- **WHEN** 模板缺失、数据不可读或导出生成失败
- **THEN** 后端 MUST 返回明确业务错误
- **AND** 系统 MUST NOT 泄露本地模板绝对路径
- **AND** 系统 MUST NOT 将可预期导出失败落成未处理 500

### Requirement: 周报 AI 预填整理
系统 MUST 支持在 AI 已配置时对周报预填内容进行 AI 整理，并 MUST 在 AI 未配置时安全降级。

#### Scenario: AI 已配置时整理预填草稿
- **WHEN** 用户基于当前周报预填 basis 请求 AI 整理
- **THEN** 后端 MUST 校验 basis 未变化
- **AND** 后端 MUST 仅允许 AI 改写可编辑的草稿文本字段
- **AND** AI 输出 MUST NOT 自动保存或提交周报
- **AND** 响应 MUST 标明 AI 来源和生成时间

#### Scenario: AI 未配置时不可用
- **WHEN** AI 开关关闭、缺少 endpoint、model 或 key
- **THEN** 后端 MUST 通过鉴权能力接口或 AI 请求返回明确不可用状态或降级信息
- **AND** 前端 MUST 隐藏或禁用 AI 入口并展示可理解原因
- **AND** 能力接口 MUST NOT 泄露 AI endpoint、model 或 key
- **AND** 普通日报、周报保存、提交和确定性预填 MUST 不受影响

#### Scenario: AI basis 变化
- **WHEN** 用户请求 AI 整理时提交的 basisHash 与后端当前 basisHash 不一致
- **THEN** 后端 MUST 拒绝使用过期 basis
- **AND** 响应 SHOULD 返回最新确定性预填建议供用户重新确认

### Requirement: 周报评分与最终评审
系统 MUST 支持周报 AI/规则评分和最终人工评分/评审，并 MUST 使用后端权限和状态门禁。

#### Scenario: 周报评分
- **WHEN** 有评分权限的用户对已提交且满足评分状态的周报发起评分
- **THEN** 后端 MUST 生成 AI 或确定性规则评分结果
- **AND** 后端 MUST 保存评分来源、评分时间和失败原因
- **AND** 后端 MUST 返回总分、等级、评分来源和评分组成

#### Scenario: AI 不可用时规则评分
- **WHEN** AI 不可用但允许规则评分
- **THEN** 后端 MUST 使用确定性规则评分
- **AND** 响应 MUST 标明评分来源为规则或等价来源
- **AND** 系统 MUST NOT 因 AI 不可用阻塞普通周报审批流程

#### Scenario: 最终人工评分
- **WHEN** 有最终评审权限的用户保存最终评分
- **THEN** 后端 MUST 校验评分权限和周报状态
- **AND** 后端 MUST 保存最终分数、等级、评语、评审人和评审时间
- **AND** 前端 MUST 展示最终评分和最终评审信息

#### Scenario: 打回和再提交后的评分处理
- **WHEN** 周报被打回、编辑或再提交
- **THEN** 后端 MUST 防止旧评分被误认为当前版本最终结果
- **AND** 系统 MUST 清空、失效或重新生成与旧内容绑定的评分/最终评审

#### Scenario: 无权限评分
- **WHEN** 无评分或最终评审权限的用户调用评分接口
- **THEN** 后端 MUST 拒绝请求
- **AND** 前端 MUST 不展示可操作评分入口或展示不可操作原因

