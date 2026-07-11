# Digital-transformation 项目阶段前端页面拆分与风格统一通用规则

> 适用范围：后续所有采用“后端先交付阶段 API 与通用页面，前端再完成节点页面拆分和风格统一”的项目阶段。  
> 适用工程：`digital-platform-web`。  
> 配套规范：`Digital-transformation-前端统一样式规范与重构方案.md`、`Digital-transformation-前端统一样式分步骤实施计划.md`。  
> 核心原则：先完成业务等价拆分，再进行视觉迁移；不得长期保留仅按 `nodeKey` 切换内容的伪拆分页面。

## 1. 目标与最终形态

后端提供阶段 API、DTO、状态机和一版可运行的阶段通用页面，用于验证业务闭环。前端接手后，必须将通用页面拆成独立节点页面，并统一为项目既定视觉体系。

最终结构应满足：

```text
阶段 API / DTO / 权限 / 状态机
              ↓
阶段级 composable 和 API adapter
              ↓
节点独立页面 + 少量业务共享组件
              ↓
NodePageRouter / nodePages.js 注册
              ↓
ProjectDetailLayout 统一刷新和导航
```

不接受以下结构作为最终交付：

```text
NodeA.vue ─┐
NodeB.vue ─┼─> CommonStagePanel.vue 根据 nodeKey 显示所有节点
NodeC.vue ─┘
```

这种结构只能作为短期迁移桥接。节点页面若仅传递 `nodeKey`，展示、API 调用和操作仍全部集中在总面板中，则不算完成页面拆分。

## 2. 后端通用页面的定位

后端交付的通用页面是业务参考实现，不是最终前端架构。其职责是证明：

- API 可完成保存、提交、审批、退回、上传、下载和自动推进；
- DTO 已包含节点状态、权限、阻塞原因和当前 revision；
- 不同角色能完成阶段业务闭环；
- 错误码和生成文件状态可被前端正确消费。

前端可以重组通用页面的组件结构和视觉表现，但不得自行改变：

- API 路径、请求方法和 payload 字段；
- DTO 字段、枚举值和权限语义；
- 节点顺序、状态机、revision 和阶段门禁；
- 保存、提交、审批、退回和重新提交规则；
- 自动推进触发条件和幂等行为；
- 文件鉴权、大小限制、生成文件状态和下载协议。

若通用页面逻辑与 API 文档或 DTO 不一致，必须先确认后端契约，不能通过前端硬编码角色或状态绕过。

## 3. 强制实施顺序

每个新项目阶段必须按以下顺序实施。

### 步骤 1：冻结业务基线

在拆分前记录：

- 阶段节点清单、`nodeKey`、节点顺序和角色；
- 每个节点可见、可编辑、可提交、可审批和可退回条件；
- API、payload、DTO、错误码和文件接口；
- 节点间前置条件、阻塞原因和自动推进规则；
- 通用页面可运行的完整业务场景。

必须先运行后端该阶段专项测试。没有专项测试时，至少建立人工回归清单，不能只以页面可打开作为基线。

### 步骤 2：建立节点目录和路由注册

阶段目录统一放置在：

```text
src/pages/project-node/<stage-name>/
```

每个业务节点对应一个具名页面：

```text
<NodeName>Page.vue
```

节点注册统一维护在：

- `src/config/nodePages.js`
- `src/pages/project-node/project-approval/NodePageRouter.vue`

项目详情布局继续由 `ProjectDetailLayout.vue` 负责，不在阶段页面中复制项目导航和刷新逻辑。

### 步骤 3：先拆共享逻辑，再迁移节点 UI

从阶段通用页面中优先抽取：

```text
src/composables/project-stage/<stage-name>/
  use<StageName>Workflow.js
  use<NodeName>Form.js          # 仅节点确有独立复杂状态时
```

composable 可以负责：

- API 调用编排；
- DTO 到页面状态的无损适配；
- pending、错误和消息状态；
- 文件上传、下载和生成文件处理；
- 节点操作后的统一刷新通知；
- 可复用且不改变业务语义的 payload builder。

composable 不得负责：

- 页面 DOM 和布局；
- 用前端角色名称重新推导后端权限；
- 改写节点状态机；
- 跨越现有 API 的乐观状态推进；
- 吞掉业务错误并伪造成功状态。

### 步骤 4：完成真正的独立节点页面

每个节点页面必须直接拥有本节点的：

- 展示结构；
- 表单和操作入口；
- 权限绑定；
- loading、error、empty、readonly 状态；
- 对 composable 或 API adapter 的调用；
- `business-state-changed` 上抛。

允许共享组件，但共享粒度应是稳定业务能力，例如：

- 生成文件状态卡；
- 受控文件上传区；
- 审批意见和审批记录；
- 角色选择器；
- 通用在线表单字段渲染器。

禁止重新创建一个包含整个阶段所有节点分支的大型共享面板。

### 步骤 5：验证业务等价

结构拆分完成后，先停止视觉改造并验证：

- props、emits、API 和 payload 不变；
- 权限按钮与拆分前一致；
- 保存、提交、审批、退回和重新提交正常；
- 文件上传、下载、删除和生成正常；
- 节点操作后刷新项目详情、节点导航和当前节点；
- 自动推进后定位新的当前阶段；
- URL 刷新仍能打开正确节点页面。

业务等价验证通过后，才允许进入风格统一。

### 步骤 6：在独立页面上统一风格

标准业务控件统一使用 Element Plus：

| 场景 | 组件 |
|---|---|
| 普通、主要、危险操作 | `el-button` |
| 文本和多行文本 | `el-input` |
| 数字 | `el-input-number` |
| 选择、单选、复选 | `el-select`、`el-radio`、`el-checkbox` |
| 日期 | `el-date-picker`，显式设置 `value-format` |
| 表单与校验 | `el-form`、`el-form-item` |
| 状态 | `el-tag` |
| 错误和持续提示 | `el-alert` |
| 加载和空状态 | `el-skeleton`、`v-loading`、`el-empty` |
| 危险操作确认 | `ElMessageBox.confirm` |
| 短反馈 | `ElMessage` |
| 上传入口 | 受控 `el-upload` + `http-request` |

流程树、节点专用图、复杂业务网格和图片预览布局可以保留原生结构，但其中的标准输入和操作控件仍应使用 Element Plus。

### 步骤 7：删除迁移桥接和旧样式

所有节点完成后必须：

- 删除不再使用的阶段总面板；
- 删除只传递 `nodeKey` 的空壳页面或共享壳；
- 删除旧 `.primary-button`、`.ghost-button`、`.form-control` 等引用；
- 删除重复 Toast、Spinner、Alert、Badge 和确认弹窗；
- 删除失效局部 CSS；
- 使用 `rg` 证明旧实现无引用后再删除文件。

## 4. 页面、组件和 composable 的职责边界

### 4.1 节点页面

节点页面负责页面级编排，并且只关心一个业务节点。建议控制在可读范围内；模板或脚本持续膨胀时，应拆稳定业务组件，而不是重新合并成阶段总面板。

### 4.2 阶段共享组件

共享组件必须满足至少两个节点确实复用，并拥有一致的数据和事件语义。仅视觉相似但业务字段不同的表单不应过早抽象。

共享组件通过明确 props/emits 通信，不直接读取路由、全局页面对象或兄弟节点状态。

### 4.3 阶段 composable

阶段 composable 负责跨节点可复用的请求和状态协调。页面卸载、节点切换和并发请求时必须避免旧请求结果覆盖新节点状态，必要时使用请求序号或取消机制。

### 4.4 项目详情层

项目详情层继续统一负责：

- 当前项目、阶段和节点上下文；
- 路由和节点页面选择；
- `business-state-changed` 后重新加载；
- 自动推进后的阶段和节点定位；
- 项目级错误和认证失效。

节点页面不得复制完整项目加载流程。

## 5. 固定前端接口

所有项目节点页面继续接受项目节点体系约定的上下文 props，具体字段以现有路由为准。新增阶段不得绕过 `NodePageRouter` 自建第二套路由协议。

节点业务变化统一上抛：

```js
emit('business-state-changed', {
  source: '<stage-name>',
  nodeKey: props.nodeKey,
  changedDocumentIds: [] // 有资料变化时填写
});
```

要求：

- 保留调用方依赖的原 payload 字段；
- 不在子页面直接刷新整个浏览器；
- 不在多个层级重复触发相同刷新；
- pending 结束前防止重复提交；
- 操作失败时不得上抛成功刷新事件。

## 6. 数据和交互兼容规则

### 6.1 表单数据

- 日期必须保持后端要求的字符串格式；
- 数字控件迁移后核对数字与字符串类型；
- 动态数组必须使用稳定业务 key；
- 新字段与 legacy 字段并存时，由 API adapter 明确兼容策略；
- 不得在展示层静默丢弃后端仍要求的字段。

### 6.2 权限

- 按钮显示和禁用以 DTO permissions 为第一依据；
- 不新增“某角色名称即可操作”的散落判断；
- 只读用户仍应看到必要的状态、历史和文件；
- 前端隐藏按钮不能代替后端鉴权。

### 6.3 文件

- `el-upload` 只负责选择文件和 UI；
- 网络请求继续使用现有 API 客户端和 Bearer token；
- 保留 MIME、大小、数量、revision 和只读限制；
- 下载继续使用后端文件名和 Blob；
- 上传或删除导致生成文件失效时，页面必须立即反映 DTO 定义的状态。

### 6.4 危险操作

退回、删除、结束项目、废弃资料等操作使用 `ElMessageBox.confirm`。用户取消时不得发送请求，不得改变本地状态，也不得触发 `business-state-changed`。

## 7. 样式归属规则

全局设计变量、Element Plus 主题、页面布局原语和响应式断点放在 `src/styles.css`。

节点页面局部 CSS 只允许描述：

- 本节点独有业务布局；
- 专用流程、时间轴或图形；
- 复杂网格列定义；
- 图片预览和定位；
- 少量仅该组件使用的动画。

局部 CSS 禁止重新定义：

- 通用按钮、输入框和选择器皮肤；
- Toast、Spinner、Alert、Badge；
- 硬编码品牌色、状态色、圆角和阴影；
- 大范围 `.el-button`、`.el-input` 内部覆盖；
- 无说明的 `!important`。

页面布局优先复用已有变量和组合类。需要新增全局规则时，必须证明至少有多个页面使用，避免把单页补丁放进全局样式。

## 8. 分批提交和回滚规则

每个阶段至少拆成以下提交：

1. `refactor: split <stage> shared workflow state`
2. `refactor: add dedicated <stage> node pages`
3. `refactor: migrate <stage> controls to element plus`
4. `refactor: remove legacy <stage> panel and styles`

禁止把以下修改混入同一提交：

- 后端 API 或数据库迁移；
- 节点状态机和权限规则调整；
- 页面拆分和大规模视觉重写；
- 自动推进逻辑和路由结构重写；
- 与本阶段无关的全局 CSS 清理。

每个提交应可独立回滚，且回滚后不会留下半套节点注册或失效 import。

## 9. 验证门禁

### 9.1 自动检查

每批必须执行：

```powershell
cd digital-platform-web
npm.cmd run build
npm.cmd run check
git diff --check
```

同时使用 `rg` 检查：

- 阶段总面板是否仍被节点页面引用；
- 是否残留原生业务按钮、输入框、选择器和 textarea；
- 是否残留旧按钮、表单、Toast、Spinner 和 Alert 类；
- 删除文件是否仍有 import 或路由注册。

后端有阶段专项测试时必须同步执行，例如：

```powershell
cd digital-platform-api
npm.cmd run check
npm.cmd run test:<stage-name>
```

### 9.2 功能回归

每个阶段至少覆盖：

- 所有节点可打开并支持 URL 刷新；
- 各角色的可见、可编辑和只读状态；
- 保存、提交、审批、退回、重新提交；
- 上传、下载、删除、生成文件；
- API 失败后的状态恢复；
- 重复点击和并发请求；
- 节点状态、项目详情和工作台同步刷新；
- 自动推进和退回整改后的当前节点定位。

### 9.3 视觉回归

至少验证：

- 1280px 桌面；
- 768px 平板；
- 375px 手机；
- loading、empty、error、readonly、disabled；
- 长文本、大量数据和无数据；
- 键盘 Tab、Enter、Space 基本操作。

## 10. 完成定义

一个项目阶段只有同时满足以下条件才算完成前端交付：

1. 每个业务节点拥有独立页面，而不是只传递 `nodeKey` 的包装页。
2. 阶段总面板已删除，或仅保留确有跨节点展示价值且不包含节点表单分支的组件。
3. API、DTO、权限、状态机、刷新协议和自动推进保持不变。
4. 标准业务控件已统一使用 Element Plus。
5. 旧通用控件类和失效局部 CSS 已清理。
6. 后端专项测试、前端构建和检查均通过。
7. 所有角色和关键业务路径完成回归。
8. 桌面、平板和手机视觉回归通过。

## 11. 针对方案设计阶段的纠偏要求

当前 `src/pages/project-node/solution-design/` 下的节点页面仍通过 `SolutionDesignNodePageShell.vue` 使用 `ProjectSolutionDesignWorkflowPanel.vue`。这属于迁移桥接状态，不是本规则定义的最终拆分。

后续处理方案设计阶段时，应按以下顺序纠偏：

1. 先抽取方案设计 API、pending、文件和刷新 composable；
2. 优先迁移 C05 `SolutionAnalysisPage.vue`；
3. 再迁移 C15/C16 内部评审和客户评审页面；
4. 迁移准备、设计、成本估算和报价/投标页面；
5. 每批完成业务等价验证后再做 Element Plus 迁移；
6. 最终删除 `SolutionDesignNodePageShell.vue` 和总面板中的节点分支。

后续项目阶段必须直接遵守本规则，避免再次形成“先创建空壳节点页、长期依赖阶段总面板、之后二次拆分”的重复成本。

