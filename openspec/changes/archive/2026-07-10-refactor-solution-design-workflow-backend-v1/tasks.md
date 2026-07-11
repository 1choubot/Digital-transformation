## 1. 规划和校验

- [x] 1.1 创建 `refactor-solution-design-workflow-backend-v1` change。
- [x] 1.2 盘点 `solutionDesignWorkflowRepository.js`、`solutionDesignWorkflow.js`、`onlineFormImageRepository.js`、`solutionDesignWorkflow.test.js` 和相关 OpenSpec specs。
- [x] 1.3 编写 proposal，明确无行为变化重构目标、Non-Goals、风险和验收口径。
- [x] 1.4 编写 design，明确模块拆分方向、优先级、事务边界和回滚策略。
- [x] 1.5 编写 `technical-architecture` spec delta。
- [x] 1.6 编写 `project-core` spec delta。
- [x] 1.7 运行 OpenSpec strict 校验。

## 2. 模板生成逻辑拆分

- [x] 2.1 抽出 C05/C15/C16 generated file source builder。
- [x] 2.2 抽出 template cell mapping 和 image mapping 处理。
- [x] 2.3 抽出 Excel generation adapter 调用边界。
- [x] 2.4 抽出 review recorder、review type、repeat rows 和中文字体样式处理。
- [x] 2.5 保持 C05/C15/C16 生成文件单元格、样式、图片、文件名和状态流转不变。

## 3. 表单 normalize / DTO 拆分

- [x] 3.1 抽出 C05 analysis form normalize。
- [x] 3.2 抽出 C15/C16 review form normalize。
- [x] 3.3 抽出 form DTO mapping。
- [x] 3.4 抽出 generatedFile DTO mapping。
- [x] 3.5 抽出 save/submit 中可安全移动的非事务纯逻辑。
- [x] 3.6 保持 API DTO 字段、nullability、权限字段和 blockingReasons 不变。

## 4. 权限逻辑拆分

- [x] 4.1 抽出 `canProcessAnalysisForm` 和 review form 处理权限。
- [x] 4.2 抽出 `canSubmitNode` 和 `canReviewSolutionDesignNode`。
- [x] 4.3 抽出 upload slot permissions。
- [x] 4.4 抽出 finance confidential permissions。
- [x] 4.5 抽出 quotation/tender permissions。
- [x] 4.6 不引入全局统一 permission resolver 大重构。

## 5. 查询 helper 拆分

- [x] 5.1 抽出 roles 查询 helper。
- [x] 5.2 抽出 nodes 查询 helper。
- [x] 5.3 抽出 upload slots 查询 helper。
- [x] 5.4 抽出 analysis/review forms 查询 helper。
- [x] 5.5 抽出 quotation/tender 查询 helper。
- [x] 5.6 保持 `forUpdate`、锁顺序、选取字段和事务边界不变。

## 6. Repository 对外 API 保持与回归

- [x] 6.1 保留 `solutionDesignWorkflowRepository.js` 对外 export 和 public facade。
- [x] 6.2 保持现有业务动作的事务编排、日志写入顺序和 storage cleanup 行为不变。
- [x] 6.3 保持自动推进触发点和失败回滚语义不变。
- [x] 6.4 保持 C04-C19 派生完成和阶段门禁语义不变。
- [x] 6.5 保持 workbench todo 和 finance confidential DTO 行为不变。

## 7. 校验、归档、提交

- [x] 7.1 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 7.2 运行 `cmd /c npm.cmd run check`。
- [x] 7.3 未改前端，确认不需要运行 `digital-platform-web` build。
- [x] 7.4 运行 `cmd /c openspec validate refactor-solution-design-workflow-backend-v1 --strict`。
- [x] 7.5 运行 `cmd /c openspec validate --all --strict`。
- [x] 7.6 归档 change。
- [x] 7.7 提交实现。
