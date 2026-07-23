# Digital-transformation 项目阶段前端页面拆分与风格统一通用规则

> 适用工程：`digital-platform-web`。
>
> 适用范围：后续项目阶段节点页面新增、从通用阶段实现拆分节点页面，以及阶段页面体验统一。
>
> 样式治理依据：`docs/Vue样式集中治理记录_20260720.md`。
>
> 正式业务与架构契约：`openspec/specs/` 下 active specs；`openspec/changes/archive/` 仅用于追溯历史背景。

## 1. 总体原则

项目阶段前端应形成“项目工作区统一编排、节点页面拥有业务结构、阶段能力按稳定语义复用”的架构。页面拆分和视觉调整不得改变后端业务状态机、权限模型、API、DTO、数据库结构、节点推进结果或资料版本语义。

```text
阶段 API / DTO / permissions / blockingReasons / status
                         ↓
阶段 composable 与 API adapter
                         ↓
具名节点页面 + 稳定业务共享组件
                         ↓
nodePages.js + NodePageRouter.vue
                         ↓
ProjectDetailLayout 统一项目上下文、刷新和节点定位
```

前端不得根据角色名称、部门文案或本地状态重新推导权限或节点推进结果。现有字段不足时，应记录为独立 OpenSpec change，不得在页面中硬编码补齐。

## 2. 当前架构基线

- `src/pages/project-detail/ProjectDetailPage.vue` 是项目详情薄入口；
- `ProjectDetailLayout.vue` 负责项目、工作区、阶段、节点上下文及统一业务刷新；
- `src/config/nodePages.js` 负责节点代码到页面组件的注册；
- `src/pages/project-node/project-approval/NodePageRouter.vue` 负责向节点页面传递统一上下文；
- 立项节点位于 `src/pages/project-node/project-approval/`；
- 方案设计节点位于 `src/pages/project-node/solution-design/`；
- 阶段共享请求和状态协调位于 `src/composables/project-stage/<stage-name>/`；
- 跨节点的稳定业务组件位于 `src/components/project-workspace/<stage-name>/`，通用节点能力可位于 `src/components/node/` 和 `src/composables/node/`；
- `nodePageContext` 是项目详情层向节点页提供的统一上下文和动作边界，不是节点页自行扩展状态机的入口；
- 未注册节点由 `BlankProjectNodePage.vue` 兜底，不另建第二套路由协议。

方案设计阶段的旧总面板和迁移壳已退出运行路径。分析、评审、成本和报价/投标节点均已通过当前节点页面体系注册。

## 3. 页面拆分实施顺序

### 3.1 冻结业务基线

拆分前必须记录：

- 节点清单、顺序、角色和状态；
- 每个节点的可见、可编辑、可提交、可审批和可退回条件；
- API、payload、DTO、错误码、文件接口和 revision；
- 前置条件、阻塞原因、自动推进和退回重提规则；
- active OpenSpec 对该阶段的 MUST / MUST NOT 场景；
- 后端专项测试或可执行人工回归清单。

归档 change 只能解释历史决策，不能覆盖 active specs 和当前 API 行为。

### 3.2 建立节点注册

阶段节点页面统一放置在：

```text
src/pages/project-node/<stage-name>/<NodeName>Page.vue
```

节点统一注册到 `src/config/nodePages.js`，并通过现有 `NodePageRouter.vue` 接收项目上下文。不得在阶段内部新增平行路由、复制项目详情加载或自行刷新浏览器。

节点注册页可以是具名薄入口，将 props 和 `business-state-changed` 原样转交给稳定共享业务组件；但文件名、注册项和节点代码必须保持一一可追踪。不得为了减少文件数量而把多个业务不同的节点重新合并为按 `nodeKey` 分支的总面板。

### 3.3 抽取阶段共享能力

阶段 composable 可以负责：

- API 调用和 payload builder；
- DTO 到页面状态的无损适配；
- pending、错误、消息和并发请求失效；
- 上传、下载、生成文件和 Blob 保存；
- 操作成功后的统一刷新通知。

阶段 composable 不得负责 DOM、页面布局、本地权限推导、状态机改写或伪造乐观推进结果。

共享业务组件负责同构节点的布局、表单和动作组合。共享条件必须来自稳定业务语义，例如相同的上传型节点、成本节点或评审模型；仅仅“页面长得相似”不足以合并。项目、工作区、导航和当前节点的全量刷新仍由 `ProjectDetailLayout.vue` 统一协调，阶段 composable 和节点页不得复制这套加载链路。

### 3.4 完成节点业务页面

节点页面负责：

- 本节点页面结构和操作编排；
- DTO 权限、阻塞原因和状态绑定；
- loading、empty、error、readonly、disabled；
- 调用阶段 composable；
- 上抛 `business-state-changed`。

禁止把所有节点表单和操作重新集中到一个按 `nodeKey` 大量分支的阶段总面板。

允许具名节点注册页复用稳定共享页面，但必须满足：

- 节点业务结构、数据和事件语义确实一致；
- 节点上下文仍能区分独立资料、revision、审批历史和生成文件；
- 共享页面不包含整个阶段其他节点的条件分支。

C15 内部评审和 C16 客户评审可以复用评审页面能力，但不得合并为一个资料项或不可区分的记录上下文。标准上传型节点可以复用上传页面，但各节点权限、上传槽和状态仍以后端 DTO 为准。

## 4. 固定前端接口

节点页面继续接受路由约定的项目上下文 props，当前包括：

- `projectId`
- `authToken`
- `currentUser`
- `project`
- `workspace`
- `stage`
- `node`
- `nodeCode`
- `nodePageContext`

业务变化统一上抛：

```js
emit('business-state-changed', {
  source: '<stage-name>',
  nodeKey: props.nodeCode,
  changedDocumentIds: [],
  affectedNodeCodes: [],
  refreshCurrentDetail: false,
  clearCurrentDetail: false
});
```

要求：

- `source`、`nodeKey` 和 `changedDocumentIds` 是基础追踪字段；只有确有跨节点影响时才提供 `affectedNodeCodes`；
- `refreshCurrentDetail: true` 表示刷新后保留并重载当前在线表单详情，`clearCurrentDetail: true` 表示刷新前清空当前详情，二者不得同时为 `true`；
- 未设置的可选字段由项目详情层按 `false` 或空集合处理，不得由节点页赋予新的隐式语义；
- 保留调用方依赖的 payload 字段；
- pending 结束前阻止重复操作；
- 失败或用户取消时不得上抛成功刷新事件；
- 不在多个层级重复刷新；
- 自动推进后由项目详情层根据刷新前后导航状态重新定位当前阶段和节点；节点页不得自行猜测下一个节点。

## 5. 权限、状态和错误边界

- 按钮可见性和禁用状态以 DTO 的 `permissions`、在线表单权限、`blockingReasons` 和 `status` 为依据；
- 前端隐藏按钮不能代替后端鉴权；
- 前端不得用项目查看权限、部门、姓名或角色文案放宽操作权限；
- 操作失败必须展示可读业务错误，不得伪造成功状态；
- 生成文件失败不得展示节点已提交成功；
- 后端未自动推进时展示后端返回的缺项和阻塞原因，不在前端复制门禁。

## 6. 在线表单规则

### 6.1 保存与提交

- 保存草稿不强制完成全部提交必填项；
- 正式提交前校验当前用户负责范围内的必填字段；
- 未填字段使用红色边框和字段级提示，并汇总提示、滚动及聚焦首个缺项；
- 校验失败、接口失败或用户取消不得清空已填写数据；
- 日期和数字类型必须保持后端协议，不得因控件替换改变 payload 类型；
- 动态数组和结构化实施计划必须保留用户输入顺序和内容。

### 6.2 提交确认与自动推进

C05、C15、C16 点击“提交表单”时必须确认；用户取消不得调用接口。这些在线表单页面以“提交表单”作为节点推进入口，不得同时展示手动“提交节点”。

前端按后端结果分别展示：

- 表单、生成文件和节点自动提交均成功；
- 表单提交成功但仍有其他缺项；
- 生成文件失败；
- 节点门禁未满足。

前端不得维护 Excel 单元格、Word 表格或模板文本映射。

## 7. 文件和危险操作

- `el-upload` 只负责选择文件和 UI，网络请求继续使用现有 API 客户端和 Bearer token；
- 保留 MIME、大小、数量、revision、只读和后端下载文件名规则；
- 无权用户不得看到已缓存的敏感文件名或附件明细；
- 上传、删除或表单字段变化导致生成文件失效时，页面必须反映最新 DTO 状态；
- 退回、删除、结束项目、废弃资料等危险操作使用 `ElMessageBox.confirm`；
- 用户取消时不发送请求、不改变本地状态、不触发刷新事件。

## 8. Element Plus 和样式职责

普通业务控件统一使用 Element Plus：

| 场景 | 组件 |
|---|---|
| 操作按钮 | `el-button` |
| 文本、多行文本和数字 | `el-input`、`el-input-number` |
| 选择、单选和复选 | `el-select`、`el-radio`、`el-checkbox` |
| 日期 | `el-date-picker`，显式设置 `value-format` |
| 表单 | `el-form`、`el-form-item` |
| 表格和状态 | `el-table`、`el-tag` |
| 错误、加载和空状态 | `el-alert`、`v-loading`、`el-empty` |
| 确认和短反馈 | `ElMessageBox.confirm`、`ElMessage` |
| 上传 | 受控 `el-upload` + `http-request` |

流程树、节点导航、复杂业务表格和图片布局可保留原生结构，其中的标准输入和操作仍使用 Element Plus。

样式职责：

- `styles.css` 负责设计变量、主题、App shell、共享布局原语、项目工作区和响应式边界；
- scoped 样式负责组件专属复杂业务结构；
- 禁止同一职责同时存在于全局和局部样式；
- `:deep()` 必须受组件根类约束，并仅在组件公开能力不足时使用；
- Vue 局部样式禁止 `!important` 和硬编码品牌/状态色；
- 不得为了追求 scoped 为零而把单组件规则堆入 `styles.css`。

新增样式必须通过 `scripts/check-style-governance.mjs`。

## 9. 工作区宽度与滚动

根据 active OpenSpec：

- 桌面端 `.app-main` 不因节点内容新增页面级横向或纵向滚动；
- 左侧流程树和右侧节点业务卡片分别承担纵向滚动；
- 节点根元素和普通内容不得超过父业务卡片宽度；
- 固定最小宽度表格必须在局部容器横向滚动；
- 工作区容器不超过760px时，恢复 `.app-main` 页面级纵向滚动，节点卡片自然增高并使用 `overflow: visible`；
- 宽表格在窄屏仍可保留局部横向滚动。

## 10. 业务等价与清理

页面拆分后、视觉迁移前先验证：

- props、emits、API、payload、权限和状态语义不变；
- 保存、提交、审批、退回、重提和文件操作正常；
- 自动推进、工作台待办和当前节点同步；
- URL 刷新仍能打开正确节点；
- API 失败、用户取消和重复点击状态可恢复。

确认无引用后删除旧总面板、空壳迁移组件、失效 import 和重复 CSS。必须使用 `rg` 证明无引用，不得凭文件名直接删除兼容实现。

## 11. 验证门禁

前端每批必须执行：

```powershell
cd digital-platform-web
npm.cmd run check

cd ..
openspec validate --all --strict
git diff --check
```

同时静态检查：

- 节点注册和 fallback 完整；
- 旧总面板、旧控件类和失效 import 无残留；
- 原生表单控件、scoped 样式、`:deep()` 和全局预算符合治理清单；
- 删除文件未被路由、测试、README、docs 或 OpenSpec 引用。

人工视觉回归至少覆盖1280px、768px、375px，以及 loading、empty、error、readonly、disabled、长文本、大量数据、无数据、键盘操作和表格溢出。

## 12. 完成定义

项目阶段前端交付同时满足以下条件才算完成：

1. 节点通过统一注册体系进入项目工作区，不依赖包含全阶段分支的总面板。
2. 共享页面只承载业务语义一致的稳定能力，独立资料和节点上下文未被合并。
3. API、DTO、权限、状态机、revision、刷新协议和自动推进保持后端权威。
4. 在线表单具备提交校验、错误提示、数据保留和生成状态反馈。
5. 标准控件使用 Element Plus，样式职责符合自动治理门禁。
6. 桌面、窄屏和宽表格滚动行为符合 active OpenSpec。
7. 前端检查、OpenSpec strict validate、diff check 和关键业务回归通过。
8. 未把未执行的人工视觉检查声明为通过。
