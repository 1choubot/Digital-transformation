## 1. 规划

- [x] 1.1 创建 `adjust-solution-design-workflow-submit-gates-v1` change。
- [x] 1.2 写 proposal，明确三项方案设计提交门禁调整和 Non-Goals。
- [x] 1.3 写 design，记录现状、目标、自动推进、C04-C19 派生、工作台待办和 operation log 影响。
- [x] 1.4 写 `project-core`、`technical-architecture` 和 `project-core-frontend` spec delta。
- [x] 1.5 写 tasks，按三批拆分实现、前端、测试和校验。
- [x] 1.6 运行 OpenSpec 校验和 `git diff --check`。

## 2. Batch 1 - 退回后复用旧文件

- [x] 2.1 穷尽复核退回后 revision 递增和上传槽提交门禁位置，重点覆盖方案设计输出、研发成本估算、制造成本估算和财务/运营成本估算上传槽。
- [x] 2.2 后端调整上传槽有效性判断，允许旧 current file 满足退回后重提门禁。
- [x] 2.3 后端保持重新上传时新文件覆盖旧 current file 的语义。
- [x] 2.4 后端确保非 current 历史文件不得绕过提交、下载、派生和阶段推进门禁。
- [x] 2.5 复核现有前端由后端 DTO 驱动，退回后可直接重提并保留重新上传覆盖入口，无需改动前端代码。
- [x] 2.6 补退回后直接重提、重新上传覆盖、非 current 历史文件拒绝的后端测试。
- [x] 2.7 补财务成本估算总经理退回后研发、制造、财务/运营成本旧 current 文件可直接重提的 C17 链路测试。
- [x] 2.8 复核前端无“必须重新上传同一文件”硬编码提示；本 Batch 未改前端，因此未运行 web build。
- [x] 2.9 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 2.10 运行 `cmd /c npm.cmd run check`。

## 3. Batch 2 - 财务总经理审批时选择报价/投标

- [x] 3.1 复核财务成本估算总经理审批、报价/投标分支选择、工作台待办和 operation log 现状。
- [x] 3.2 后端扩展财务成本估算总经理审批 payload，要求审批通过时提供 `quotation` 或 `tender`。
- [x] 3.3 后端在同一事务中完成审批通过、分支选择、下一节点激活和日志写入。
- [x] 3.4 后端调整报价/投标节点逻辑，进入节点时按已选分支处理，不再要求重复选择。
- [x] 3.5 后端将旧报价/投标节点分支选择接口改为在财务审批已选择分支后拒绝重复选择，返回明确业务错误，不改状态、不写新的分支选择成功 operation log。
- [x] 3.6 前端在财务总经理审批通过弹层或表单中加入报价/投标选择。
- [x] 3.7 前端调整报价/投标节点展示，隐藏重复分支选择主入口。
- [x] 3.8 补审批通过选择报价、选择投标、缺少分支拒绝、旧分支选择接口重复选择拒绝且不改状态、不写新的分支选择成功 operation log 的测试。
- [x] 3.9 补工作台待办和 operation log 口径测试。
- [x] 3.10 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 3.11 如改前端，运行 `digital-platform-web` 下 `cmd /c npm.cmd run build`。

## 4. Batch 3 - 方案设计 8 个产出无需上传豁免

- [x] 4.1 设计 C07-C14 上传槽豁免状态持久化方案，记录操作人、时间、原因或备注。
- [x] 4.2 后端新增标记无需上传和取消无需上传接口或节点操作。
- [x] 4.3 后端调整方案设计节点提交门禁为“已上传或已豁免”。
- [x] 4.4 后端调整 C04-C19 派生齐套和自动推进，复用同一上传/豁免满足结果。
- [x] 4.5 后端调整工作台待办，已上传或已豁免产出不再生成待上传待办。
- [x] 4.6 后端写入标记无需上传、取消无需上传和重新上传自动取消豁免的 operation log。
- [x] 4.7 前端为 8 个产出展示无需上传入口、原因或备注输入、豁免状态、操作人和时间。
- [x] 4.8 前端展示豁免产出为已满足或等价不阻塞状态，未上传且未豁免继续阻塞。
- [x] 4.9 补单项豁免、取消豁免、重新上传自动取消豁免、提交门禁、派生齐套、自动推进和待办测试。
- [x] 4.10 断言本 change 不改变 8 大阶段和 71 项资料数量。
- [x] 4.11 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 4.12 如改前端，运行 `digital-platform-web` 下 `cmd /c npm.cmd run build`。

## 5. 总体验证

- [x] 5.1 运行 `cmd /c npm.cmd run test:initiation-workflow`。
- [x] 5.2 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 5.3 运行 `cmd /c npm.cmd run check`。
- [x] 5.4 运行 `cmd /c openspec validate adjust-solution-design-workflow-submit-gates-v1 --strict`。
- [x] 5.5 运行 `cmd /c openspec validate --all --strict`。
- [x] 5.6 运行 `git diff --check`。

## 6. 收尾

- [x] 6.1 归档 change。
- [x] 6.2 提交实现。
