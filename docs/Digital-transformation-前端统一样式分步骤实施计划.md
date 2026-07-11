# Digital-transformation 前端统一样式分步骤实施计划

> 依据：`docs/Digital-transformation-前端统一样式规范与重构方案.md`  
> 基线日期：2026-07-10  
> 适用目录：`digital-platform-web`  
> 本文件仅制定实施计划，不包含源码修改。

## 1. 结论与实施方向

采用“应用壳保持稳定、业务控件逐批 Element Plus 化、旧样式最后统一删除”的渐进式方案。

实施边界如下：

1. `MainLayout.vue` 顶部主导航、移动端菜单和退出入口继续使用原生按钮及导航专属样式。
2. 业务页面中的按钮、输入、选择、日期、表单、表格、提示、确认、加载和上传优先迁移到 Element Plus。
3. 流程树、项目阶段导航、方案设计流程、复杂日报/周报编辑网格继续保留业务结构，不为追求组件覆盖率重写。
4. 每一批只改表现层和组件绑定，不调整 API、权限、状态机、路由、节点拆分或刷新协议。
5. 旧 `.primary-button`、`.ghost-button` 等公共类在所有调用方迁移完成后再删除，避免中途造成跨页面回归。

## 2. 当前代码基线

### 2.1 结构现状

- 全局样式入口：`digital-platform-web/src/styles.css`，当前约 4221 行。
- Element Plus 已在项目中安装并全量使用，但业务页面覆盖率仍低。
- `ProjectOverviewDashboardPage.vue` 已较多使用 Element Plus，可作为首批统一样式的参考页面。
- 立项节点页面已移动至 `src/pages/project-node/project-approval/`。
- 方案设计节点页面已位于 `src/pages/project-node/solution-design/`，共享方案设计流程能力。
- 原规范中的 `DesignPreparePage.vue` 已不再是当前迁移目标，不能继续按旧文件清单执行。
- `NodePageRouter.vue` 当前位于 `project-approval/`，但仍承担所有项目节点页面的通用路由职责；样式迁移期间不调整其位置。

### 2.2 控件与样式存量

基于当前源码扫描：

| 项目 | 当前数量 |
|---|---:|
| 原生 `<button>` | 约 105 |
| 原生 `<input>` | 约 50 |
| 原生 `<select>` | 约 21 |
| 原生 `<textarea>` | 约 12 |
| `.primary-button` 引用 | 约 65 |
| `.ghost-button` 引用 | 约 86 |
| `styles.css` | 约 4221 行 |

局部样式体量最大的页面：

| 文件 | 局部样式约数 |
|---|---:|
| `DailyReportPage.vue` | 668 行 |
| `WeeklyReportPage.vue` | 585 行 |
| `MainLayout.vue` | 528 行 |
| `WeeklyReportReviewPage.vue` | 526 行 |
| `DailyReportListPage.vue` | 459 行 |
| `WeeklyReportListPage.vue` | 433 行 |
| `CenterDailyReportPage.vue` | 364 行 |
| `LoginPage.vue` | 344 行 |
| `WeeklyReportReviewListPage.vue` | 338 行 |
| `ProjectSolutionDesignWorkflowPanel.vue` | 258 行 |

### 2.3 当前验证能力

- `npm.cmd run build` 可运行。
- `npm.cmd run check` 当前实际等同于 Vite 生产构建。
- 尚未看到专门的前端单元测试、组件测试或视觉回归测试脚本。
- 因此迁移前必须建立页面基准图和人工业务回归清单，不能只以“构建通过”作为验收标准。

## 3. 实施原则

### 3.1 每批修改约束

每批次必须满足：

1. 只迁移有限的一组页面或共享组件。
2. 不同时修改后端接口和数据库。
3. 不改变 props、emits、API payload 和权限条件。
4. 不改变 `business-state-changed` 等统一刷新协议。
5. 日期组件显式使用 `value-format`，保持后端字符串格式。
6. 上传使用 `http-request` 调用现有 API 封装，不能直接绕过鉴权。
7. 完成构建、桌面/平板/手机检查及页面业务回归后再进入下一批。

### 3.2 样式归属

- 设计变量、Element Plus 主题桥接、全局布局原语和响应式规则放入 `styles.css`。
- 强业务结构的布局可以保留在 Vue 局部样式中。
- Vue 局部样式不得继续定义通用按钮、输入框、Toast、Spinner、Alert 和 Badge 皮肤。
- 新增颜色、圆角、间距和阴影必须引用全局变量。

## 4. 分步骤修改计划

## 阶段 0：建立迁移保护基线

### 目标

在不改变页面外观和业务行为的前提下，建立可比较、可回滚的迁移基线。

### 步骤

1. 固化当前工作区修改范围，样式迁移分支不得混入节点路由、自动推进等业务重构。
2. 记录以下页面在 1280px、768px、375px 下的基准截图：
   - 登录页；
   - 项目总览；
   - 我的工作台；
   - 项目立项节点页；
   - 方案设计节点页；
   - 日报列表与编辑页；
   - 周报列表、编辑和审批页；
   - 用户管理页。
3. 为保存、提交、审批、退回、上传、删除、筛选和分页建立人工回归清单。
4. 确认品牌主色使用规范建议的 `#3e63dd`；如产品侧未确认，暂停主题色替换，仅先建立变量。
5. 运行并保存初始构建结果和主要 bundle 大小。

### 验收

- 有可复查的基准截图和业务回归清单。
- `npm.cmd run build` 与 `npm.cmd run check` 均通过。
- 本阶段不产生页面视觉变化。

## 阶段 1：整理设计变量和 Element Plus 主题桥接

### 修改范围

- `src/styles.css`
- Element Plus 初始化入口，仅在确有主题接入需要时修改。

### 步骤

1. 在 `styles.css` 顶部建立设计变量区：品牌色、语义色、文字色、背景、边框、间距、圆角、阴影和页面宽度。
2. 增加 Element Plus CSS 变量桥接，不直接重置 `.el-button` 等内部结构。
3. 将 `styles.css` 按以下章节增加清晰注释，暂不大规模移动选择器：
   - Design tokens；
   - Reset；
   - Element Plus theme；
   - Application shell；
   - Layout primitives；
   - Business composition；
   - Utilities；
   - Responsive。
4. 只替换确认安全的全局硬编码色值；暂不删除旧类。
5. 确认 `MainLayout.vue` 顶部导航视觉完全不变。

### 验收

- Element Plus 按钮、输入框、选择器和状态色统一引用应用变量。
- 顶部导航无布局和颜色回归。
- 不出现大范围 `.el-*` 强制覆盖或新增无说明的 `!important`。

## 阶段 2：迁移低风险列表和总览页面

### 批次 2A：已部分 Element Plus 化的页面

修改文件：

- `ProjectOverviewDashboardPage.vue`
- `MyStageDocumentTasksPage.vue`

步骤：

1. 以项目总览现有 `el-card/el-form/el-select/el-button/el-skeleton/el-alert/el-empty` 为基准统一尺寸和间距。
2. 将我的工作台筛选、按钮、状态标签、加载、错误和空状态迁移为 Element Plus。
3. 保留卡片点击、`targetRoute` 和当前节点定位逻辑不变。
4. 删除这两个页面中失效的旧控件样式。

### 批次 2B：日报和周报列表

修改文件：

- `DailyReportListPage.vue`
- `WeeklyReportListPage.vue`
- `WeeklyReportReviewListPage.vue`

步骤：

1. 先迁移筛选表单和按钮。
2. 将 loading、错误、空状态统一为 `v-loading/el-skeleton/el-alert/el-empty`。
3. 评估展示列表是否适合 `el-table`；没有复杂编辑行为的列表使用 `el-table`。
4. 行操作使用 `el-button link`，危险操作使用 `type="danger"`。
5. 分页统一使用 `el-pagination`。

### 批次 2C：用户与项目普通列表

修改文件：

- `UserManagementPage.vue`
- `ProjectListPage.vue`

重点：

- 用户启用/禁用和删除类操作必须保留原权限与确认逻辑。
- 项目列表路由及查看详情行为不得变化。

### 阶段验收

- 列表页不再使用 `.primary-button/.ghost-button/.row-btn`。
- 筛选条件、分页参数和默认值与迁移前一致。
- 列表空状态、加载和错误状态均可验证。
- 1280px、768px、375px 无横向溢出回归。

## 阶段 3：迁移普通表单页面

### 批次 3A：登录和项目创建

修改文件：

- `LoginPage.vue`
- `ProjectCreatePage.vue`

步骤：

1. 使用 `el-form/el-form-item/el-input/el-select/el-date-picker`。
2. 密码输入使用 `show-password`。
3. 日期字段显式设置 `value-format="YYYY-MM-DD"`。
4. 提交按钮使用 `loading`，保留现有认证和创建项目 API。
5. 错误展示迁移至 `el-alert` 或统一消息机制。

### 批次 3B：日报编辑

修改文件：

- `DailyReportPage.vue`
- 日报相关共享组件。

步骤：

1. 先迁移页面顶部操作、普通字段和日期控件。
2. 保留复杂编辑网格容器，逐个迁移网格内输入控件。
3. 上传改为受控 `el-upload`，继续调用现有附件 API。
4. 保存草稿和提交分别验证 payload、loading、重复点击和失败恢复。
5. 分批删除局部基础控件样式，保留网格列宽和业务布局。

### 批次 3C：周报和中心日报编辑

修改文件：

- `WeeklyReportPage.vue`
- `CenterDailyReportPage.vue`

要求与日报一致，额外验证：

- 周期、日期范围的数据类型；
- 动态行的稳定 key；
- 复制、汇总和自动填充行为；
- 只读与可编辑状态切换。

### 阶段验收

- 日期、时间、数字字段提交 payload 与改造前一致。
- 表单校验不会替代或绕过后端校验。
- 上传仍携带当前 Bearer token，并保留原错误映射。
- 页面刷新、离开和重复提交行为无变化。

## 阶段 4：迁移审批和立项节点页面

### 修改范围

- `WeeklyReportReviewPage.vue`
- `src/pages/project-node/project-approval/ProjectInputPage.vue`
- `src/pages/project-node/project-approval/MarketResearchPage.vue`
- `src/pages/project-node/project-approval/ProjectApprovalPage.vue`
- `src/pages/project-node/project-approval/ProjectNoticePage.vue`
- `src/components/node/NodeOnlineFormEditor.vue`

### 步骤

1. 先迁移无状态风险的普通输入和按钮。
2. 审批通过、退回和删除统一使用 Element Plus 按钮及确认框。
3. 退回原因使用 `el-input type="textarea"`，保留必填校验和原事件参数。
4. 在线表单日期字段保持字符串格式，图片上传继续走现有 API。
5. 保留节点页面的 `business-state-changed` 事件及父级刷新语义。
6. 过程节点、审批退回和自动恢复状态只做视觉组件替换，不修改状态派生规则。

### 验收

- 不同角色看到的按钮与迁移前一致。
- 提交、审批、退回后仍刷新正确节点和导航状态。
- 退回整改、待审批、处理中、已完成状态标签映射正确。
- 在线表单保存、提交、下载和图片操作全部回归。

## 阶段 5：迁移方案设计节点和复杂项目工作区

### 修改范围

- `ProjectDetailLayout.vue`
- `ProjectSolutionDesignWorkflowPanel.vue`
- `src/pages/project-node/solution-design/*`
- `ProjectStageDocumentActions.vue`
- `ProjectStageApprovalPanel.vue`
- `ProjectStageDocumentAttachments.vue`
- `ProjectStageDocumentResponsibility.vue`
- 其他阶段资料相关组件。

### 步骤

1. 保留 `ProjectProcessTree`、阶段导航和节点路由结构。
2. 将方案设计共享面板中的按钮、选择器、文本域和上传入口迁移到 Element Plus。
3. 逐节点回归角色分配、文件上传、方案分析、内部评审、客户评审、成本估算和报价/投标。
4. 将附件、责任人、审批和退回控件迁移为统一组件。
5. loading 使用组件原生状态，避免只改变按钮文字。
6. 不在本阶段继续拆分方案设计业务组件；如需拆分，另开独立业务重构任务。
7. 不调整自动阶段推进、过程节点状态派生和导航优先级。

### 验收

- 节点切换、URL 定位和刷新协议不变。
- 权限控制完全由现有后端 DTO 和前端条件驱动，不新增角色硬编码。
- 自动推进后仍能定位新的当前阶段。
- 所有文件上传、下载、审批和退回路径正常。

## 阶段 6：统一反馈、确认和应用级状态

### 修改范围

- `App.vue`
- 各页面重复 Toast、错误面板、确认弹窗和 spinner。

### 步骤

1. 盘点页面内重复的成功/失败消息实现。
2. 普通短反馈迁移为 `ElMessage`。
3. 需要持续展示的业务错误保留页面 `el-alert`。
4. 危险操作统一使用 `ElMessageBox.confirm`。
5. 全局认证失效和系统级错误保留集中处理，不在页面重复弹多次消息。
6. 删除已无引用的 Toast 和 spinner DOM/CSS。

### 验收

- 同一错误不会同时出现 Toast 和页面错误两份提示。
- 认证失效仍能正确退出或跳转登录。
- 确认框取消操作不会产生 API 请求。

## 阶段 7：清理全局旧样式和局部重复 CSS

### 前置条件

只有在全仓确认无业务页面引用后才执行。

### 步骤

1. 使用 `rg` 扫描并清除：
   - `.primary-button`；
   - `.ghost-button`；
   - `.row-btn`；
   - `.form-control`；
   - `.filter-input`；
   - `.filter-select`；
   - 旧 Toast、Spinner、Alert 和 Badge 类。
2. 删除 Vue 文件中已经失效的基础控件 CSS。
3. 合并 `styles.css` 中重复的页面布局、卡片、工具栏和响应式选择器。
4. 将保留的硬编码品牌色、圆角和阴影替换为设计变量。
5. 检查 `!important`、深层 `.el-*` 覆盖和高特异性选择器。
6. 记录清理前后的 CSS 行数与 bundle 大小。

### 验收

- 业务页面不再引用旧通用控件类。
- 顶部导航例外类只在 `MainLayout.vue` 使用。
- Vue 局部 CSS 总量相对当前基线下降至少 70%。
- 删除旧样式后所有关键页面视觉回归通过。

## 5. 每批次统一验证清单

### 自动检查

1. `npm.cmd run build`
2. `npm.cmd run check`
3. `git diff --check`
4. `rg` 检查本批目标页面是否仍使用旧类和裸业务控件。

### 功能检查

- 查询筛选参数正确；
- 日期和数字 payload 类型不变；
- 保存、提交、审批、退回和删除事件参数不变；
- loading 期间不能重复提交；
- API 失败后控件恢复可操作；
- 权限不足时不展示越权按钮；
- 上传鉴权、大小限制和错误处理不变；
- 节点操作后刷新到正确业务状态。

### 视觉与交互检查

- 1280px 桌面；
- 768px 平板；
- 375px 手机；
- 键盘 Tab、Enter、Space 基本操作；
- hover、focus、disabled、loading 和 error 状态；
- 长文本、空数据和大量数据场景。

## 6. 提交与回滚策略

建议一个批次一个提交，示例顺序：

1. `style: add design tokens and element plus theme bridge`
2. `refactor: migrate overview and task list controls`
3. `refactor: migrate report list controls`
4. `refactor: migrate ordinary form controls`
5. `refactor: migrate approval node controls`
6. `refactor: migrate project workspace controls`
7. `refactor: remove legacy control styles`

每个提交必须可以独立回滚。禁止把以下内容混入样式提交：

- API 字段调整；
- 数据库迁移；
- 权限规则修改；
- 项目阶段自动推进修改；
- 节点状态派生修改；
- 页面路由或目录再次重构。

## 7. 主要风险与控制措施

| 风险 | 控制措施 |
|---|---|
| 日期组件将字符串变为 Date | 强制设置 `value-format`，对比请求 payload |
| `change/input` 触发时机变化 | 对自动筛选、联动和自动保存逐项验证 |
| `el-upload` 绕过现有鉴权 | 统一使用 `http-request` 调用现有 API |
| 表格迁移破坏复杂编辑布局 | 复杂编辑网格保留容器，只迁移单元格控件 |
| 全局 `.el-*` 覆盖污染其他页面 | 优先 CSS 变量，覆盖集中且写明原因 |
| 旧类提前删除导致未迁移页面失效 | 最后阶段统一删除，并先用 `rg` 证明零引用 |
| 样式迁移夹带业务重构 | 每批审查 API、props、emits、路由和状态逻辑 diff |
| 当前工作区已有未提交修改 | 样式批次独立提交，避免覆盖或重写现有修改 |

## 8. 完成标准

全部阶段完成后应满足：

1. 顶部导航视觉和交互保持稳定。
2. 业务页面标准控件统一使用 Element Plus。
3. 旧通用按钮和表单样式不再被业务页面引用。
4. `styles.css` 职责清晰，不再维护第二套完整控件库。
5. Vue 局部 CSS 总量至少减少 70%。
6. API payload、权限、状态机、节点刷新和自动推进无变化。
7. 上传继续复用现有鉴权和错误处理。
8. 桌面、平板和手机关键页面均通过视觉回归。
9. 所有迁移批次构建通过，并有对应业务回归记录。

## 9. 推荐首个执行批次

建议先执行“阶段 0 + 阶段 1”，然后以 `MyStageDocumentTasksPage.vue` 作为第一个完整页面迁移样板。

原因：

- 项目总览已经部分 Element Plus 化，可用于校准主题变量；
- 我的工作台业务结构清晰，但覆盖按钮、筛选、状态、错误和空状态等常见场景；
- 不涉及复杂动态编辑网格；
- 可以较低风险验证统一控件、全局变量和响应式规则，再推广到日报、周报和项目节点。
