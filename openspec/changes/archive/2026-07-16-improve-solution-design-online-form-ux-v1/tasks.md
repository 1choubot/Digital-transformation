## 1. Planning

- [x] 1.1 创建 `improve-solution-design-online-form-ux-v1` change。
- [x] 1.2 编写 proposal、design、project-core/project-core-frontend/technical-architecture spec delta。
- [x] 1.3 运行 OpenSpec 规划校验和 `git diff --check`。

## 2. 在线表单提交后自动推进节点

- [x] 2.1 复核 C05、C15、C16、C18 在线表单 submit 路径和当前节点提交门禁。
- [x] 2.2 后端扩展 C05 表单提交成功后的自动节点提交尝试，复用手动节点提交编排，缺 C06 产品功能框图时返回缺项提示且不阻止表单提交。
- [x] 2.3 后端扩展 C15/C16 表单提交成功后的自动节点提交尝试，复用手动节点提交编排，成功后进入待研发中心负责人审批。
- [x] 2.4 后端确保生成失败时不自动推进节点，并返回明确失败状态或业务错误。
- [x] 2.5 后端 submit DTO 返回 `autoSubmit` 或等价结构，包含 attempted/submitted/nodeKey/nodeStatus/blockingReasons/message。
- [x] 2.6 前端点击 C05/C15/C16 “提交表单”时弹确认框。
- [x] 2.7 前端按后端 `autoSubmit` 展示提交成功、自动进入待审批或仍缺资料提示。
- [x] 2.8 复核 C18 报价单在线表单提交生成口径，必要时补提示和测试但不改报价字段/模板规则。
- [x] 2.9 补后端测试：C05 表单 + C06 齐套时自动提交节点。
- [x] 2.10 补后端测试：C05 缺 C06 时表单提交成功但节点不推进并返回缺项。
- [x] 2.11 补后端测试：C15/C16 表单提交成功后进入待研发中心负责人审批，并验证状态更新、operation log 和待办收敛与手动提交等价。
- [x] 2.12 补后端测试：生成失败不推进节点。
- [x] 2.13 前端在 C05、C15、C16 在线表单页面隐藏手动“提交节点”按钮，并保留审批通过/审批退回动作。
- [x] 2.14 前端在在线表单页面隐藏手动“提交节点”后，若无审批/退回动作则不渲染节点动作空态。

## 3. C07-C14 无需上传取消备注

- [x] 3.1 后端调整豁免 reason normalize，允许 `exemption_reason` 为空。
- [x] 3.2 后端保持标记/取消豁免权限、门禁、DTO 和 operation log 语义。
- [x] 3.3 前端移除 C07-C14 “无需上传”备注输入框。
- [x] 3.4 前端点击“无需上传”按钮即可调用标记豁免接口。
- [x] 3.5 前端保留“取消无需上传”按钮和豁免状态展示。
- [x] 3.6 补测试：空备注可豁免。
- [x] 3.7 补测试：取消豁免后无 current file 时恢复提交门禁。
- [x] 3.8 补测试：重新上传仍自动取消豁免并写 operation log。

## 4. C15/C16 结构化实施计划

- [x] 4.1 后端定义 C15/C16 `implementationPlanItems` payload schema 和 normalize helper。
- [x] 4.2 后端从项目需求分析、项目目标描述、项目风险评估、项目方案建议按非空来源条目生成需求/目标/风险/建议计划项，并按 `sourceType + sourceIndex` 保留已有计划内容。
- [x] 4.3 后端保存草稿时允许计划内容不完整，但校验数据结构和长度。
- [x] 4.4 后端提交时要求每个自动生成项都有非空实施计划内容。
- [x] 4.5 后端生成 Excel 时将结构化实施计划按需求、目标、风险、建议顺序拼接写入当前“项目实施计划”单元格，每项一行，格式为 `需求1：内容`。
- [x] 4.6 前端将 C15/C16 “项目实施计划”从 textarea 改为结构化输入区。
- [x] 4.7 前端按四个来源字段实时生成计划项，忽略空来源条目并保留顺序。
- [x] 4.8 前端对每个计划项展示来源标签和对应实施计划输入。
- [x] 4.9 补测试：多行需求/目标/风险/建议生成多条计划。
- [x] 4.10 补测试：空来源条目忽略。
- [x] 4.11 补测试：缺计划内容提交失败。
- [x] 4.12 补测试：生成 Excel 内容格式、顺序正确且 C15/C16 不串数据。
- [x] 4.13 前端新增 C15/C16 四类来源字段显式加行控件，条目内回车只作为当前条目换行。
- [x] 4.14 前端 review form composable 增加来源条目更新、添加、删除方法，并保持实施计划实时联动。
- [x] 4.15 补前端 helper 测试：数组输入、删除首条不串计划、同位置编辑保留计划、删除来源清理计划项、空来源条目忽略。
- [x] 4.16 补后端测试断言：C15/C16 接收数组来源字段并生成正确 `implementationPlanItems`。
- [x] 4.17 前后端实施计划匹配改为同数量优先按 `sourceType + sourceIndex` 保留计划，并补重复来源文本不丢计划测试。
- [x] 4.18 将 C15/C16 项目需求分析模板映射改为 B9-B11 `repeatRows`，并补超过 3 条需求合并到 B11 的后端测试。

## 5. 报价结果三按钮

- [x] 5.1 前端将报价结果下拉选择改为三个按钮：客户接受报价、结束项目、审批不通过。
- [x] 5.2 前端“客户接受报价”提交 existing accepted payload。
- [x] 5.3 前端“结束项目”弹窗确认并提交 existing rejected + end_project payload。
- [x] 5.4 前端“审批不通过”弹窗确认并提交 existing rejected + return_to_rd_cost payload。
- [x] 5.5 前端移除报价结果下拉菜单和多字段手工组合入口。
- [x] 5.6 补测试或构建验证：三个按钮分别触发正确后端 payload 和状态流转。
- [x] 5.7 前端新增报价金额计算 helper，覆盖数量 4 位小数、单价 2 位小数、行金额四舍五入和按行汇总总金额。
- [x] 5.8 前端报价明细表实时只读展示行金额，并在新增、删除、编辑明细后同步刷新总金额预览。
- [x] 5.9 保持报价单提交 payload 不提交可篡改的行金额或总金额，后端仍作为唯一权威计算方。
- [x] 5.10 补前端 `test:quotation-amounts`，覆盖金额计算、无效行不计入总金额和删除行后的总金额。
- [x] 5.11 前端报价单实时显示人民币大写预览，并补 `test:quotation-amounts` 覆盖后端一致的大写金额格式。

## 6. Regression

- [x] 6.1 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 6.2 运行 `cmd /c npm.cmd run check`。
- [x] 6.3 如改前端，运行 `digital-platform-web` 下 `cmd /c npm.cmd run check`，其中包含 Vite build、`test:implementation-plan` 和 `test:quotation-amounts`。
- [x] 6.4 运行 `cmd /c openspec validate improve-solution-design-online-form-ux-v1 --strict`。
- [x] 6.5 运行 `cmd /c openspec validate --all --strict`。
- [x] 6.6 运行 `git diff --check`。
- [x] 6.7 手动测试方案设计阶段 C05、C15、C16、C18。

## 7. Review And Closeout

- [x] 7.1 review 实现和规格，确认未改立项阶段后端、未改 8 阶段/71 项资料数量、未改合同阶段。
- [x] 7.2 归档 change。
- [x] 7.3 提交实现。
- [x] 7.4 不 push，并确认无关 untracked 未处理。
