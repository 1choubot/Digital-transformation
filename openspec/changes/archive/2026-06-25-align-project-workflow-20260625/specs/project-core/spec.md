## ADDED Requirements

### Requirement: 20260625 项目流程依据

系统 MUST 在后续规划中将 `智能制造项目管理流程图20260625.pdf` 作为项目流程、项目编号和阶段资料完成规则的规划依据，并 SHOULD 继续以 `docs/9.10_v20260624阶段资料模板规划_20260624.md` 的 64 项普通产出文件作为资料清单基线。

#### Scenario: 使用 20260625 流程作为后续规划依据
- **WHEN** 系统后续说明或实现项目主流程、项目编号生成、阶段资料完成规则和阶段推进门禁
- **THEN** 系统 SHOULD 以 `智能制造项目管理流程图20260625.pdf` 作为规划依据
- **AND** 普通阶段资料项数量 MUST 继续按 64 项核对

#### Scenario: 排除非普通资料过程节点
- **WHEN** 系统后续维护普通阶段资料模板
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 计入普通 64 项资料模板，除非后续正式确认它们形成独立文件

#### Scenario: 保持 8 阶段主干
- **WHEN** 系统后续初始化或展示项目阶段
- **THEN** 系统 MUST 继续使用立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段

### Requirement: 项目编号后置规划

系统 MUST 在后续规划中支持项目创建时项目编号为空，并 MUST 在项目立项审批通过且 `项目立项通知` 发布后填写或生成正式项目编号。

#### Scenario: 创建项目允许项目编号为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST 继续保存项目名称、客户、项目经理、参与部门、计划时间和创建人等基础信息

#### Scenario: 立项通过后生成项目编号
- **WHEN** 项目立项审批通过且 `项目立项通知` 已发布
- **THEN** 系统 MUST 支持填写或生成正式 `projectCode`
- **AND** 该编号 SHOULD 与项目立项通知形成可追溯关系

#### Scenario: 非空项目编号仍需唯一
- **WHEN** 系统保存或更新非空 `projectCode`
- **THEN** 系统 MUST 校验该编号在项目主数据中唯一

#### Scenario: 空项目编号不参与唯一冲突
- **WHEN** 多个尚未立项的项目暂未生成 `projectCode`
- **THEN** 系统 MUST 允许它们同时保持空项目编号，不得按重复编号拒绝

#### Scenario: 项目查询兼容空编号
- **WHEN** 项目列表、项目详情、搜索、工作台、业务日志或后续文件平台联动读取项目基础信息
- **THEN** 系统 MUST 兼容 `projectCode` 为空，并使用项目 ID 或其他稳定字段完成内部关联

### Requirement: 20260625 阶段推进按资料完成规则判断

系统 MUST 规划阶段推进门禁按每个资料项的完成规则判断当前阶段是否可推进，而不是统一要求所有适用必填资料均为 `confirmed`，也不得额外叠加一个泛化的阶段级审批。

#### Scenario: submit_only 资料提交后计为完成
- **WHEN** 当前阶段适用且参与阶段推进门禁的资料项 `completionMode = submit_only`
- **AND** 该资料项已经提交或上传
- **THEN** 系统 MUST 将该资料项计为阶段齐套已完成

#### Scenario: approval_required 资料确认后计为完成
- **WHEN** 当前阶段适用且参与阶段推进门禁的资料项 `completionMode = approval_required`
- **AND** 该资料项已经确认或审批通过
- **THEN** 系统 MUST 将该资料项计为阶段齐套已完成

#### Scenario: 条件资料未触发不计缺失
- **WHEN** 当前阶段资料项 `completionMode` 为 `conditional_submit` 或 `conditional_approval`
- **AND** 该资料项的业务触发条件尚未发生
- **THEN** 系统 MUST 不将该资料项计入缺失资料或阶段推进阻塞项

#### Scenario: 条件资料触发后按对应规则判断
- **WHEN** 条件资料的业务触发条件已经发生
- **THEN** 系统 MUST 按 `conditional_submit` 或 `conditional_approval` 对应的提交或确认规则判断该资料是否完成

#### Scenario: 不叠加泛化阶段审批
- **WHEN** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化的阶段级审批而拒绝阶段推进

#### Scenario: 只有显式节点资料需要确认审批
- **WHEN** 资料本身对应 20260625 流程图中的明确 YES/NO 或 YES-only 节点
- **THEN** 系统 MUST 按该资料的 `approval_required` 完成规则要求确认或审批通过
- **AND** 没有明确确认/审批节点的产出资料 MUST NOT 被强制要求确认或审批通过

#### Scenario: 发票资料不触发额外流程
- **WHEN** 当前阶段适用资料为 `发票（预付款）`、`发票（发货款）` 或 `发票（尾款）`
- **AND** 该发票资料 `completionMode = submit_only`
- **THEN** 阶段推进 MUST 只要求该发票资料提交或上传完成
- **AND** 系统 MUST NOT 因该发票资料要求付款流、发票审批流或额外确认前置

#### Scenario: 图纸审查 NO 回退不改变上游资料完成规则
- **WHEN** 当前阶段包含 `4.14 产品平面图`、`4.15 产品零部件清单` 和 `4.16 图纸审查记录`
- **THEN** 阶段推进 MUST NOT 因 4.14 或 4.15 是图纸审查 NO 回退目标而要求它们审批通过
- **AND** `4.14 产品平面图` MUST 只需要提交或上传完成
- **AND** `4.15 产品零部件清单` MUST 只需要提交或上传完成
- **AND** `4.16 图纸审查记录` MUST 需要确认或审批通过
- **AND** 如果 4.16 不通过，系统 MAY 提示修改 4.14 或 4.15 后重新发起或提交图纸审查记录，但 MUST NOT 改变 4.14 或 4.15 的 `completionMode`

#### Scenario: NO 回退不改变主线必产属性
- **WHEN** 流程图中主线资料经过 YES/NO 确认节点且 NO 回退到前序修改节点
- **THEN** 系统 MUST 将该资料继续视为主线必产资料
- **AND** 系统 MUST NOT 仅因存在 NO 回退箭头而把该资料改为条件触发资料
