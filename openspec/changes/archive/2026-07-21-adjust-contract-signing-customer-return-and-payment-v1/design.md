## Context

合同签订 workflow 已经具备 4 个后端驱动节点、上传槽、current file、revision、工作台待办、operation log 和资料完成派生。当前 `contract_signing` 节点把两个扫描件做成可分别确认“线下签署结果通过/不通过”的动作，不通过会退回对应准备线；但业务希望客户退回源合同文件和扫描件齐备后完成签订分开表达。预付款节点当前总经理等待状态只有一个笼统放行通过动作，无法记录等待期间客户已付款的情况。

## Goals / Non-Goals

**Goals:**

- 将签订节点改为“客户退回源文件 + 上传扫描件 + 统一完成”的状态机。
- 客户退回只影响对应准备线，另一条准备线的已通过状态不受影响。
- 源文件客户退回时失效对应扫描件 current file 或完成状态，防止旧扫描件继续满足完成条件。
- 预付款总经理等待状态下提供“未付款并通过”和“已付款通过”两个动作，并写入可区分日志。
- DTO、工作台待办和前端按钮只根据后端权限渲染。

**Non-Goals:**

- 不新增合同阶段节点。
- 不新增资料项，不改变 8 大阶段和 71 项资料数量。
- 不改立项、方案设计、详细设计。
- 不改采购合同、生产制作合同、通用付款或发票流程。
- 不重新引入旧蓝图节点或 C24 非主流程资料区。
- 不归档、不提交、不 push。

## Decisions

### Decision 1: 客户退回是签订节点动作，退回目标仍是准备线

商务负责人在 `contract_signing` 节点可执行“退回技术协议”和“退回销售合同”。动作会把对应准备线 slot 置为 `returned`，准备节点置为可处理状态，并把签订节点回到阻塞/待处理状态；未退回的另一条准备线保持 `approved`。

退回源文件时，对应扫描件 slot 一并回到 `pending` 并清空 current file 指向、确认状态和退回原因。这样后续重新审批源文件后必须重新上传对应扫描件，旧扫描件不会继续派生 C21/C23 完成结果。

### Decision 2: 签订节点完成由统一完成动作驱动

扫描件上传后不再提供通过/不通过确认。商务负责人只有在两个扫描件都有 current file、两个准备线均为 `approved`、签订节点处于可处理状态时看到 `canCompleteSigning`。点击完成后签订节点置为 `approved`，C21/C23 派生完成，激活 `advance_payment`。

保留 scan slot 的 current file 和 revision 结构，不新增表或字段。旧 `confirmation_status` 字段可不再作为新完成逻辑依据；实现可以把完成后的扫描件 slot 状态置为 `approved`。

### Decision 3: 总经理等待态拆成两个结果动作

商务负责人申请未完成支付待总经理审批后，`advance_payment` 与 `paymentFlow` 仍进入 `waiting_general_manager`。总经理在该状态下看到两个互斥动作：

- `canApprovePaymentReleaseUnpaid`：客户仍未付款但允许项目继续，`paymentFlow.status=released`。
- `canApprovePaymentReleasePaid`：等待期间客户已付款，`paymentFlow.status=completed`。

两个动作都完成 `advance_payment` 并激活 `project_kickoff_notice`，但 operation log action type 和 details 必须区分。

### Decision 4: 旧总经理笼统放行入口不得默认选择未付款通过

旧 `/payment/approve-release` 不得继续映射到 `approve-release-unpaid`。实现保留旧 HTTP route 作为兼容拒绝入口时，必须返回 410 并提示改用 `/payment/approve-release-unpaid` 或 `/payment/approve-release-paid`；旧 repository 方法也必须直接拒绝，不能开启事务或改变 `advance_payment`、`paymentFlow`、`project_kickoff_notice` 或 operation log。

前端不得继续调用旧 approve-release API，只能根据后端 DTO 权限展示并调用两个明确结果动作。

### Decision 5: 路由沿用合同 workflow 命名空间

新增或调整接口仍挂在 `/api/projects/:projectId/contract-signing-workflow` 下，不走通用付款、发票或资料卡片接口。旧扫描件 signing-result 接口可以移除前端调用；后端可保留但不再暴露权限，或替换为新的客户退回与完成接口，测试必须覆盖旧权限不再出现在 DTO 中。

## Risks / Trade-offs

- [Risk] 清空扫描件 current file 会隐藏历史上传记录。 -> Mitigation: 只清 current file，保留 upload files 历史和 operation log；下载入口只面向 current file。
- [Risk] 旧前端仍调用 signing-result 接口。 -> Mitigation: 后端 DTO 不再暴露旧权限，前端移除按钮；后端测试覆盖旧权限不存在。
- [Risk] 复用 `completed` 表示总经理等待期间已付款可能和商务负责人直接完成支付混淆。 -> Mitigation: operation log 使用不同 action type 和 details 区分来源。

## Migration Plan

- 不新增 migration。
- 现有已在签订节点、扫描件已确认的测试数据按当前 slot 状态读取；新完成逻辑以两个扫描件 current file 和准备线 approved 为准。
- 如已有等待总经理放行数据，新的 DTO 会显示两个总经理通过按钮。
- 回滚时可恢复旧前端按钮和旧 repository 方法，不涉及表结构回滚。

## Open Questions

- None.
