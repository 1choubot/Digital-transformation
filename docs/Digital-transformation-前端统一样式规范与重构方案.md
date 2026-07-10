# Digital-transformation-v4 前端统一样式规范与重构方案

> 适用基线：Digital-transformation。当前版本只制定规范和迁移计划，不修改源码。

## 1. 最终决策

v4 前端统一采用以下策略：

1. `MainLayout.vue` 顶部主导航及与其直接关联的导航按钮保留原生 `<button>` 和现有专属样式。
2. 除顶部主导航外，业务页面的通用交互控件优先使用 Element Plus。
3. `styles.css` 不再自建一套与 Element Plus 平行的完整控件库，主要负责：设计变量、Element Plus 主题覆盖、全局布局、业务组合样式、少量例外控件和响应式规则。
4. Vue 文件原则上不定义按钮、输入框、选择器、表格、弹窗、提示等基础视觉样式。
5. 迁移只改变表现层和交互组件，不改变 API、权限、业务状态、事件和刷新机制。

推荐方向可概括为：

```text
顶部主导航：原生控件 + 导航专属样式
业务页面控件：Element Plus
页面布局和业务结构：全局 styles.css
无法标准化的业务可视化：少量组件局部样式
```

这里所说的“顶部导航”实际主要位于 `src/layouts/MainLayout.vue`，而非 `App.vue`。`App.vue` 中非导航性质的 Toast、错误提示等仍应迁移到统一反馈机制。

## 2. 采用 Element Plus 的原因

当前项目共有约 53 个原生按钮、21 个原生输入框、10 个原生选择器和多套手工表格/提示样式，而 Element Plus 控件使用量很少。结果是：

- `.primary-button`、`.ghost-button`、`.row-btn` 在多个页面重复定义；
- 输入框高度、圆角、focus、disabled 和错误态不统一；
- 日报、周报、项目管理形成不同视觉体系；
- `styles.css` 已有 4192 行，Vue 局部 CSS 约 4680 行；
- 后续新增页面仍需重复编写控件状态和响应式样式。

Element Plus 已经覆盖按钮、表单、日期、表格、分页、对话框、消息和加载等基础能力。统一使用后，可以把维护重点放在业务布局而不是控件细节。

## 3. 适用边界

### 3.1 必须优先使用 Element Plus

以下业务页面控件默认使用 Element Plus：

| 场景 | 统一组件 |
|---|---|
| 普通操作按钮 | `el-button` |
| 文本、数字、密码输入 | `el-input` / `el-input-number` |
| 多行文本 | `el-input type="textarea"` |
| 单选下拉 | `el-select` + `el-option` |
| 日期、日期范围、时间 | `el-date-picker` / `el-time-picker` |
| 复选与单选 | `el-checkbox` / `el-radio` |
| 表单布局和校验 | `el-form` + `el-form-item` |
| 数据表格 | `el-table` + `el-table-column` |
| 分页 | `el-pagination` |
| 对话框 | `el-dialog` |
| 二次确认 | `ElMessageBox.confirm` |
| 操作反馈 | `ElMessage` / `ElNotification` |
| 页面警告 | `el-alert` |
| 空状态 | `el-empty` |
| 加载状态 | `v-loading` / `el-skeleton` |
| 状态标签 | `el-tag` |
| 上传 | `el-upload`，必要时使用受控自定义请求 |
| Tooltip | `el-tooltip` |

“优先使用”意味着：Element Plus 能直接满足需求时，不再创建功能等价的原生控件和 CSS。

### 3.2 明确保留原生控件

以下情况允许继续使用原生元素：

1. `MainLayout.vue` 顶部主导航按钮、移动端导航切换按钮和退出入口。
2. 文件下载使用的程序化链接或浏览器原生能力。
3. 对无障碍语义有直接价值、且 Element Plus 不提供对应组件的基础元素。
4. 极简单的无视觉隐藏文件输入，但可见上传入口必须由 `el-upload` 或 `el-button` 承载。
5. 与特定业务图形强绑定、并非通用表单控件的交互元素。

例外必须有明确理由，不能仅因为“原代码已经这样写”就保留。

### 3.3 不建议强行替换

以下结构不应只为追求 Element Plus 覆盖率而重写：

- 项目阶段时间轴和流程树；
- 节点导航和方案设计专用流程图；
- 日报/周报中编辑态结构复杂、需要固定列宽和自定义单元格交互的网格；
- 在线表单中的图片预览、动态数组和模板专属结构；
- 专属页面的业务卡片排版。

这些结构可继续使用原生 HTML/CSS，但其中的按钮、输入框、选择器、日期和反馈仍应使用 Element Plus。

## 4. `styles.css` 的新职责

`styles.css` 仍是唯一全局样式入口，建议按以下顺序组织：

```css
/* 01. Design tokens */
/* 02. Reset and document defaults */
/* 03. Element Plus theme variables */
/* 04. Element Plus approved global overrides */
/* 05. Application shell and top navigation */
/* 06. Page layout primitives */
/* 07. Business composition styles */
/* 08. Utility classes */
/* 09. Responsive rules */
```

### 4.1 应放入 `styles.css`

- 品牌色、语义色、间距、圆角、字号、阴影等变量；
- Element Plus 全局主题变量；
- 顶部导航专属按钮样式；
- 页面宽度、标题区、工具栏、卡片排列、表单网格；
- 项目工作区、日报周报等业务组合结构；
- 全局响应式断点；
- Element Plus 无法通过变量控制的少量统一覆盖。

### 4.2 不应继续放入 `styles.css`

- 自建 `.primary-button`、`.ghost-button` 的完整按钮体系；
- 自建 `.form-control`、`.filter-select` 的完整表单体系；
- 与 `el-table` 重复的通用表格皮肤；
- 与 `ElMessage` 重复的页面 Toast；
- 仅为覆盖某个页面 Element Plus 控件而新增的页面级深层选择器。

## 5. 主题变量规范

推荐统一使用蓝紫色 `#3e63dd` 作为全局主色，并桥接到 Element Plus。若后续确定青绿色为品牌色，只替换变量值，不修改页面 CSS。

```css
:root {
  --app-color-primary: #3e63dd;
  --app-color-primary-hover: #5275e7;
  --app-color-success: #22a06b;
  --app-color-warning: #d97706;
  --app-color-danger: #dc2626;
  --app-color-info: #2563eb;

  --app-text-primary: #17212f;
  --app-text-secondary: #4f5f70;
  --app-text-muted: #7a8897;
  --app-page-bg: #f4f6f9;
  --app-surface: #ffffff;
  --app-border: #d9e1ea;

  --app-space-1: 4px;
  --app-space-2: 8px;
  --app-space-3: 12px;
  --app-space-4: 16px;
  --app-space-6: 24px;
  --app-space-8: 32px;

  --app-radius-sm: 4px;
  --app-radius-md: 6px;
  --app-radius-lg: 8px;
  --app-shadow-sm: 0 1px 3px rgb(15 23 42 / 8%);
  --app-page-max-width: 1280px;

  /* Element Plus theme bridge */
  --el-color-primary: var(--app-color-primary);
  --el-color-success: var(--app-color-success);
  --el-color-warning: var(--app-color-warning);
  --el-color-danger: var(--app-color-danger);
  --el-color-info: var(--app-color-info);
  --el-text-color-primary: var(--app-text-primary);
  --el-text-color-regular: var(--app-text-secondary);
  --el-border-color: var(--app-border);
  --el-border-radius-base: var(--app-radius-md);
  --el-component-size: 36px;
}
```

Vue 文件中禁止新增硬编码品牌色、状态色、圆角和阴影。

## 6. 控件替换映射

### 6.1 按钮

| 现有写法 | Element Plus 写法 |
|---|---|
| `.primary-button` | `<el-button type="primary">` |
| `.ghost-button` | `<el-button>` 或 `plain` |
| `.row-btn.action-btn` | `<el-button type="primary" link>` |
| `.action-btn--danger` | `<el-button type="danger" link>` |
| 保存草稿 | 默认按钮或 `plain` |
| 提交、审批通过 | `type="primary"` |
| 删除、退回、禁用 | `type="danger"` |
| 成功类确认 | 必要时 `type="success"` |

示例：

```vue
<el-button :loading="saving" @click="saveDraft">保存草稿</el-button>
<el-button type="primary" :loading="submitting" @click="submitReport">
  提交
</el-button>
<el-button type="danger" plain @click="returnDocument">退回</el-button>
```

按钮加载时优先使用 `loading`，不要只用 `disabled` 和手工修改文字。

### 6.2 输入与选择

| 现有写法 | Element Plus 写法 |
|---|---|
| `<input type="text">` | `<el-input>` |
| `<input type="password">` | `<el-input type="password" show-password>` |
| `<textarea>` | `<el-input type="textarea">` |
| `<select>` | `<el-select>` + `<el-option>` |
| `<input type="date">` | `<el-date-picker type="date">` |
| 日期范围 | `<el-date-picker type="daterange">` |
| `<input type="time">` | `<el-time-picker>` |
| 数字字段 | `<el-input-number>` |

替换时必须确认 `v-model` 数据类型和 API 格式。`el-date-picker` 默认可能返回 Date 对象，应通过 `value-format="YYYY-MM-DD"` 保持当前后端字符串协议：

```vue
<el-date-picker
  v-model="filters.date"
  type="date"
  value-format="YYYY-MM-DD"
  placeholder="选择日期"
/>
```

这是迁移中最容易产生隐性业务错误的地方。

### 6.3 表单和校验

新增或重构页面统一使用：

```vue
<el-form ref="formRef" :model="form" :rules="rules" label-position="top">
  <el-form-item label="项目名称" prop="projectName">
    <el-input v-model.trim="form.projectName" maxlength="100" show-word-limit />
  </el-form-item>
</el-form>
```

要求：

- 业务最终校验仍由后端负责；
- 前端规则用于即时反馈，不代替后端权限与状态校验；
- 错误提示使用 `el-form-item`，不再为每个页面自建错误文本样式；
- 动态数组字段必须使用稳定 prop 路径和 key。

### 6.4 表格

列表查询页面优先迁移为 `el-table`：

- 项目列表、日报列表、周报列表、审批列表、用户列表；
- 统一 loading、empty、stripe、row-key；
- 行内操作使用 `el-button link`；
- 分页使用 `el-pagination`。

复杂编辑网格可以暂时保留 CSS Grid，但单元格内使用 Element Plus 控件。不要在第一轮为了 `el-table` 强行重写动态编辑逻辑。

### 6.5 上传

普通上传入口优先使用 `el-upload`，但必须复用现有 API 客户端和鉴权。推荐 `http-request` 自定义上传，不让组件绕过当前 Bearer token 和错误处理：

```vue
<el-upload
  :show-file-list="false"
  :http-request="uploadAttachment"
  :before-upload="validateFile"
>
  <el-button type="primary">上传附件</el-button>
</el-upload>
```

现有的文件大小、空文件、资料适用性、提交后只读等后端规则必须保持。

### 6.6 提示、确认和加载

| 现有机制 | 目标机制 |
|---|---|
| 页面复制 `.toast` | `ElMessage` |
| 删除/退回手工确认 | `ElMessageBox.confirm` |
| 页面错误区 | `el-alert` |
| 空数据面板 | `el-empty` |
| 自定义 spinner | `v-loading` 或 `el-skeleton` |

API 业务错误仍通过现有 HTTP 客户端解析，但展示层统一调用 Element Plus。

## 7. 顶部导航例外规范

顶部主导航保留原生按钮，原因是它同时承担应用壳、模块切换、激活状态、窄屏侧栏和自定义布局，直接替换为 `el-menu` 会带来较大结构变化，但收益有限。

允许保留的导航类包括：

- `.app-nav` 及其按钮；
- `.module-nav`、`.secondary-nav` 等应用壳导航；
- `.mobile-menu-toggle`；
- `.logout-button`；
- 与侧边栏折叠、遮罩和激活状态直接相关的类。

边界要求：

- 这些类只在 `MainLayout.vue` 应用壳中使用；
- 业务页面不能借用导航按钮类；
- 导航颜色也必须逐步引用全局变量；
- 顶部导航以外的“页面 Tab”优先评估 `el-tabs`，不要自动归入导航例外。

## 8. Vue 局部样式边界

业务 Vue 中可以保留：

- 流程树、时间轴、专用评审链等强业务结构；
- 复杂编辑网格的列布局；
- 图片预览和业务图形定位；
- 仅该组件使用的动画。

业务 Vue 中不得继续保留：

- `.primary-button`、`.ghost-button`、`.row-btn`；
- `.form-control`、`.filter-input`、`.filter-select`；
- 通用 Toast、Spinner、Alert、Badge；
- 与 Element Plus 基础控件重复的 hover、focus、disabled、error 样式。

保留的局部样式必须使用全局变量，并建议控制在每个 Vue 100 行以内。

## 9. 迁移顺序

### 阶段 0：准备和保护

1. 修复前端依赖执行权限并保证 `npm run check` 可运行。
2. 对桌面 1280px、平板 768px、手机 375px 截取关键页面基准图。
3. 确认唯一品牌主色。
4. 增加 Element Plus 全局主题变量。
5. 保持顶部导航不动，避免扩大第一轮影响面。

### 阶段 1：低风险列表页面

优先迁移：

1. `DailyReportListPage.vue`；
2. `WeeklyReportListPage.vue`；
3. `WeeklyReportReviewListPage.vue`；
4. `ProjectOverviewDashboardPage.vue`；
5. `MyStageDocumentTasksPage.vue`；
6. `UserManagementPage.vue`。

迁移内容：筛选表单、按钮、表格、状态标签、加载、空状态和分页。列表页业务状态较简单，适合先验证统一主题。

### 阶段 2：普通编辑页面

1. `LoginPage.vue`；
2. `ProjectCreatePage.vue`；
3. `DailyReportPage.vue`；
4. `WeeklyReportPage.vue`；
5. `CenterDailyReportPage.vue`。

重点验证：表单校验、日期字符串格式、动态行、附件上传、只读状态和提交 loading。

### 阶段 3：审批和项目节点

1. `WeeklyReportReviewPage.vue`；
2. `ProjectInputPage.vue`；
3. `MarketResearchPage.vue`；
4. `ProjectApprovalPage.vue`；
5. `ProjectNoticePage.vue`；
6. `DesignPreparePage.vue`；
7. `NodeOnlineFormEditor.vue`。

审批、退回和在线表单涉及权限与状态门禁，必须在基础控件稳定后迁移。

### 阶段 4：复杂项目工作区

最后处理：

- `ProjectDetailLayout.vue`；
- `ProjectSolutionDesignWorkflowPanel.vue`；
- 阶段资料附件、责任人、审批和推进组件。

只替换其中的标准控件，保留流程树、节点布局和专用状态机视图，避免一次性重写复杂业务结构。

### 阶段 5：清理

- 删除已经无引用的 `.primary-button` 等旧公共类；
- 删除页面复制的 Toast、Spinner、表格皮肤；
- 删除 Vue 中已失效的 `<style>`；
- 扫描硬编码颜色、`!important`、裸控件和重复选择器；
- 对所有关键业务流程做视觉与功能回归。

## 10. 单页面迁移步骤

每个页面统一按以下步骤处理：

1. 盘点原生控件、状态和局部 CSS。
2. 先替换按钮和输入控件，不改变数据结构。
3. 替换日期控件并显式设置 `value-format`。
4. 替换反馈、确认、loading 和空状态。
5. 再评估表格是否适合改为 `el-table`。
6. 删除已失效 CSS，保留业务布局。
7. 检查 props、emits、事件和 API payload 未变化。
8. 构建并验证桌面、窄屏和键盘操作。

禁止在同一个提交中同时进行控件迁移和业务流程重构。

## 11. 风险与控制

### 11.1 数据类型变化

日期、时间、数字和多选组件可能改变 `v-model` 类型。必须显式使用 `value-format`，并在提交前核对 payload。

### 11.2 事件语义变化

原生 `change/input` 与 Element Plus 的 `change/update:modelValue` 时机可能不同。自动保存、筛选和联动字段必须重点验证。

### 11.3 上传鉴权

直接设置 `action` 可能绕过现有 HTTP 客户端、Bearer token 和错误映射。统一使用 `http-request` 调用现有 API 封装。

### 11.4 表格性能与布局

`el-table` 适合列表展示，但动态编辑表格大量嵌入输入组件时可能更重。复杂日报/周报编辑网格第一轮不强制替换容器。

### 11.5 全局覆盖污染

禁止编写 `.el-button { ... }` 大范围重置内部结构。优先使用 Element Plus CSS 变量；必要覆盖必须写明原因并集中管理。

### 11.6 Bundle 体积

当前已全量 `app.use(ElementPlus)` 并引入完整样式，扩大组件使用不会明显改变现有加载方式。后续如需优化，再单独评估按需导入，不能与本轮视觉统一混做。

## 12. 验收标准

第一轮完成后应满足：

- 顶部导航视觉和交互保持不变；
- 业务页面新增控件全部优先使用 Element Plus；
- 旧 `.primary-button`、`.ghost-button`、`.form-control` 等公共类不再被业务页面使用；
- 原生与 Element Plus 双控件体系显著收敛；
- Vue 局部 CSS 总量减少至少 70%；
- Element Plus 主色、状态色、圆角、字号和控件高度一致；
- 日期、时间、数字等 API payload 与改造前完全一致；
- 上传继续走当前鉴权和错误处理；
- 保存、提交、审批、退回、删除等 loading/disabled 状态正确；
- 桌面、平板、手机页面没有新增布局回归；
- 项目业务状态刷新和权限控制未发生变化。

## 13. 后续页面编写规范

新增页面按以下顺序选择能力：

1. 先查 Element Plus 是否已有对应组件。
2. 再查项目是否已有业务组合组件。
3. 用 `styles.css` 中的布局类组合页面。
4. 只有强业务结构才新增局部 CSS。

新增页面不得自行创建：

- 新的主按钮颜色；
- 新的输入框 focus 样式；
- 新的 Toast 或 loading 动画；
- 新的通用表格皮肤；
- 与 `el-dialog` 功能等价的手工弹窗。

## 14. 最终建议

采用“顶部导航保留、业务控件 Element Plus 化”的边界是合理的。它保留了现有应用壳的低风险稳定性，同时消除了业务页面维护两套按钮、表单、表格和反馈控件的主要成本。

实施时不要追求一次性把所有 DOM 都换成 Element Plus。优先统一真正的控件和反馈机制；流程树、业务网格、专属节点排版仍由项目自己的结构样式承载。这样既能获得一致性，也不会让组件库反过来限制复杂业务页面。
