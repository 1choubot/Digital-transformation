## 1. OpenSpec 规划

- [x] 1.1 创建 `auto-advance-project-stage-v1` change。
- [x] 1.2 编写 proposal，明确问题、目标和 Non-Goals。
- [x] 1.3 编写 design，区分 legacy 阶段关口审批、手动推进和自动推进设计。
- [x] 1.4 编写 project-core / project-core-frontend / stage-document-checklist / business-operation-log / technical-architecture spec deltas。
- [x] 1.5 执行 OpenSpec strict 校验。

## 2. 后续实现：后端自动推进

- [x] 2.1 实现统一自动阶段推进服务，复用现有阶段齐套/门禁计算。
- [x] 2.2 实现前枚举每个触发点对应的后端函数和业务动作，至少覆盖立项最终节点通过、方案设计报价接受、方案设计投标通过、普通资料提交/确认、在线表单提交成功、适用性变化、revision 重提完成。
- [x] 2.3 只在配置的写操作触发点或手动兜底推进接口调用后尝试自动推进，GET/detail/workbench/navigation/read-only 接口不得触发阶段变更。
- [x] 2.4 实现同事务边界：齐套未满足不是错误；齐套满足但自动推进系统错误时回滚业务动作并返回受控错误。
- [x] 2.5 保证自动推进幂等，避免重复推进、无控制连跳多阶段和重复成功日志。
- [x] 2.6 第 8 阶段齐套满足后自动完成项目。
- [x] 2.7 保留手动推进接口作为兜底，并继续复用同一门禁。

触发点枚举：

- 立项最终节点通过：`stageDocuments/initiationReviewRepository.js` 的 `approveInitiationReviewNode` 在 `general_review` 审批完成后触发。
- 方案设计报价客户接受：`projects/solutionDesignWorkflowRepository.js` 的 `processSolutionDesignQuotationResult` 在 `accepted` 结果写入后触发。
- 方案设计投标总经理通过：`projects/solutionDesignWorkflowRepository.js` 的 `approveSolutionDesignWorkflowNode` 在 `quotation_or_tender` 投标审批通过后触发。
- 普通资料提交/确认：`stageDocuments/statusRepository.js` 的 `updateProjectStageDocumentStatus` 在 `SUBMIT` / `CONFIRM` 成功后触发。
- 在线表单提交且生成文件成功：`stageDocuments/onlineFormRepository.js` 的 `submitStageDocumentOnlineForm` 在表单提交和资料状态更新成功后触发。
- 资料 mark not applicable / restore applicable：`stageDocuments/applicabilityRepository.js` 的 `updateProjectStageDocumentApplicability` 在适用性变更成功后触发。
- revision 重提完成：`stageDocuments/statusRepository.js` 的 `completeProjectStageDocumentRevision` 在 revision 完成成功后触发。
- GET/detail/workbench/navigation/checklist/read-only 接口不接入 `tryAutoAdvanceProjectStage`，不得触发阶段变更。

## 3. 后续实现：前端和工作台

- [x] 3.1 项目详情页在可能触发自动推进的动作成功后刷新项目详情、阶段资料和工作台。
- [x] 3.2 工作台不再显示正常 `stage_advance` 待办。
- [x] 3.3 前端不再要求用户在阶段完成后点击手动推进按钮。
- [x] 3.4 旧阶段关口审批入口继续保持非主流程或隐藏状态。

## 4. 后续测试

- [x] 4.1 覆盖阶段 1-7 齐套后自动进入下一阶段。
- [x] 4.2 覆盖第 8 阶段齐套后自动完成项目。
- [x] 4.3 覆盖项目 ended / completed、未齐套、并发重复触发不推进或不重复推进。
- [x] 4.4 覆盖旧阶段关口审批不作为推进前置。
- [x] 4.5 覆盖 GET/detail/workbench/navigation/read-only 接口不会触发阶段变更。
- [x] 4.6 覆盖自动推进日志 actorUserId、advanceMode、triggerAction metadata 和失败路径不写成功日志。
- [x] 4.7 覆盖齐套满足但自动推进系统错误时业务动作同事务回滚。
- [x] 4.8 覆盖工作台不显示正常 `stage_advance` 待办。

## 5. 后续文档、校验与收尾

- [x] 5.1 更新必要 README 或接口说明。
- [x] 5.2 执行后端测试、前端构建和 OpenSpec strict 校验。
- [x] 5.3 归档 change。
- [x] 5.4 提交实现。

## 6. Review 修复：自动推进后的前端交互

- [x] 6.1 修复合同阶段自动推进后默认选中首个待处理节点，避免优先选中过程说明节点。
- [x] 6.2 修复方案设计普通节点提交责任人视角下提交按钮始终可见，未满足条件时 disabled 并保留后端阻塞原因展示；审批人和旁观者不显示无关提交按钮。

## 7. Review 修复：自动推进后的导航展示

- [x] 7.1 修复自动推进到下一阶段后，左侧流程树当前阶段显示进行中。
- [x] 7.2 修复过程节点不再误显示为已完成。
- [x] 7.3 修复当前阶段首个待提交节点不再显示未开始。

## 8. Review 修复：真实项目阶段核查与导航边界

- [x] 8.1 核查 KRF01 / 0710 自动推进后的真实阶段状态，区分后端阶段未推进与前端/导航刷新问题。
- [x] 8.2 修复合同阶段默认选中过程节点，优先选中首个待处理业务节点。
- [x] 8.3 修复 `process_node` 在当前、未来、已完成阶段的导航状态边界。
- [x] 8.4 兼容 v20260629 方案设计 legacy document code，使 `2.1`-`2.15` 资料继续按 C04-C18 派生完成规则参与阶段门禁。

## 9. Review 修复：错过自动推进触发的 API/运维兜底

- [x] 9.1 撤销项目详情页受控阶段兜底推进入口，manual fallback 仅保留为 API / 运维兜底能力。
- [x] 9.2 保持 GET/detail/workbench/navigation/checklist/read-only 接口不触发阶段变更，且工作台不恢复普通 `stage_advance` 待办。
- [x] 9.3 补充已完成方案设计 workflow 但错过写触发时，通过 manual fallback API 推进到合同阶段的回归测试。
- [x] 9.4 更新 proposal/design/spec 口径，移除“仅规划、不实现代码”的过期描述。
- [x] 9.5 更新前端规格口径，明确项目详情不提供 manual fallback 主流程入口。
- [x] 9.6 修复项目详情刷新默认选择策略，普通操作刷新保留当前节点，阶段变化或显式不保留时才重选节点。
- [x] 9.7 修复自动推进后旧节点路由焦点残留问题，阶段变化时强制选择新当前阶段首个活跃节点并更新 URL。

## 10. Post-archive review 修复：自动推进后历史方案设计阶段查看

- [x] 10.1 修复自动进入合同后点击方案设计节点仍展示方案设计专用面板。
- [x] 10.2 收口自动推进相关旧规格冲突。
- [x] 10.3 保持不恢复手动推进入口。
