# Digital Platform Web

数字化管理平台前端工程 —— 基于 Vue 3 + Vite 构建的单页面应用（SPA），为项目管理、日报/周报协同、用户与组织治理提供交互界面。

## 功能概览

### 1. 基础平台与认证

- **登录页**：账号密码登录，Token 基于 session 管理
- **退出登录**：清除本地 Token 与会话状态
- **登录态恢复**：页面刷新后自动 `GET /api/auth/me` 恢复用户信息
- **用户状态维护**：全局保存 `organizationRole`、`department`、`role`、`isPlatformAdmin`
- **入口控制**：`system_admin + isPlatformAdmin` 才显示"用户管理"导航入口

### 2. 用户管理

- 用户列表展示（账号、姓名、部门、组织角色、岗位、启用状态、平台管理员标识）
- 新增用户：填写账号、姓名、组织角色、部门、岗位、初始密码
- 编辑用户：修改姓名、组织角色、部门、岗位、启用状态、平台管理员标识
- 启用/禁用用户（切换）
- 重置密码
- 保底提示：如果操作会导致无启用系统管理员，展示错误消息
- 组织角色固定 5 种、部门固定 4 个 —— 表单下拉/单选，不做自由文本

### 3. 项目列表

- 按当前用户权限展示可见项目
- 项目编号（`projectCode`）、项目名称、客户、模式、项目经理、状态、当前阶段
- 项目编号为空时展示"待生成"文案
- 点击进入项目详情

### 4. 新建项目

- 项目名称、客户名称（必填）
- 项目模式选择：自研模式 / 供应链/外包模式
- 项目经理用户选择（从启用用户中筛选）
- 参与部门复选（运营中心、营销中心、制造中心、研发中心）
- 计划时间（开始/结束日期）
- 备注
- 权限：仅总经理和中心负责人可创建

### 5. 项目详情

- **基础信息**：项目编号、名称、客户、模式、项目经理、参与部门、计划时间、创建人
- **阶段状态**：8 阶段进度展示，当前阶段高亮
- **阶段资料清单**：按 8 阶段分组建表展示资料项
  - 资料编号、名称、是否必填、负责人、状态、提交方式
  - 提交/确认/退回操作按钮（按角色显示）
  - 不适用标记/恢复适用（含原因输入）
  - 资料责任人分配/清空（从候选人列表选择）
  - 附件管理：上传、列表、下载、删除
- **齐套摘要**：每阶段的适用门禁资料完成率、缺失项列表
- **阶段审批**：阶段级提交/通过/退回/重新提交，审批历史
- **阶段推进**：当前阶段齐套后可推进至下一阶段
- **业务日志**：只读展示项目维度的关键业务操作记录

### 6. 我的资料任务

- 列出分配给当前用户的所有适用阶段资料项
- 状态筛选：待提交、已提交、已退回、已确认、全部
- 项目关键字搜索
- 点击任务跳转到对应项目详情页

### 7. 项目总览

- 顶部汇总指标：项目总数、进行中、已完成、风险/延期、我的待办资料
- "我的待办资料"指标可点击进入我的资料任务页
- 筛选：项目状态（正常/风险/暂停/延期/已完成）、当前阶段（1-8）、关键字
- 项目列表：编号、名称、客户、模式、项目经理、状态、当前阶段、齐套率、未完成资料数
- 点击项目进入详情

### 8. 日报模块

- 日报填写：日期、关联项目（多选搜索）、事项列表、计划列表、总结、附件
- 我的日报列表：按日期排序，编辑/删除
- 权限：员工角色可写日报，系统管理员和总经理助理不显示写日报入口

### 9. 周报模块

- 周报填写：自动绑定自然周、日报明细对比、总结、下周计划、附件
- 我的周报列表：按周排序，编辑/删除
- 周报详情/评审：展示周报内容和 AI/规则评分结果
- 周报汇总及考评：中心负责人或总经理查看所有提交周报、评分、写评语

### 10. 中心日报汇总

- 按中心 + 日期查询所有日报
- 部门范围控制：中心负责人只显示本中心
- Excel 导出

### 已挂载页面一览

| 路由 | 页面 | 说明 |
|------|------|------|
| `#/login` | 登录页 | 账号密码登录 |
| `#/projects` | 项目列表 | 默认首页 |
| `#/projects/new` | 新建项目 | 总经理/中心负责人可访问 |
| `#/projects/:id` | 项目详情 | 含阶段资料、审批、日志 |
| `#/projects/overview-dashboard` | 项目总览 | 跨项目看板 |
| `#/users` | 用户管理 | 系统管理员专用 |
| `#/my-stage-document-tasks` | 我的资料任务 | 当前用户资料待办 |
| `#/daily-report` | 日报填写 | 员工写日报 |
| `#/daily-reports` | 我的日报列表 | 历史日报 |
| `#/daily-report/:id` | 日报详情/编辑 | 查看或修改日报 |
| `#/weekly-report` | 周报填写 | 绑定自然周 |
| `#/weekly-reports` | 我的周报列表 | 历史周报 |
| `#/weekly-report/:id` | 周报详情/评审 | 查看或评审 |
| `#/weekly-overview` | 周报汇总及考评 | 全局/中心汇总 |
| `#/center-daily-report` | 中心日报汇总 | 按中心/日期查询 |

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建工具 | Vite 6 |
| 路由 | 自实现 Hash 路由（`useHashRouter`），基于 `window.location.hash` |
| HTTP 请求 | 原生 `fetch`，封装 `apiClient`（自动注入 Authorization、401 重定向登录） |
| 状态管理 | Vue `provide/inject` + 响应式 `ref`/`reactive`（无 Vuex/Pinia） |
| CSS | 自编写样式（无第三方 UI 组件库） |
| 代码规范 | ESLint（Vite 推荐配置） |

## 项目结构

```
digital-platform-web/
├── public/                 # 静态资源
├── src/
│   ├── App.vue             # 根组件：布局、导航、路由出口
│   ├── router.js           # Hash 路由定义与解析
│   ├── api.js              # API 客户端封装（fetch + Token 管理）
│   ├── auth.js             # 认证状态管理（登录/退出/恢复）
│   ├── pages/              # 页面组件
│   │   ├── LoginPage.vue
│   │   ├── ProjectListPage.vue
│   │   ├── ProjectCreatePage.vue
│   │   ├── ProjectDetailPage.vue
│   │   ├── ProjectOverviewDashboardPage.vue
│   │   ├── UserManagementPage.vue
│   │   ├── MyStageDocumentTasksPage.vue
│   │   ├── DailyReportPage.vue
│   │   ├── DailyReportListPage.vue
│   │   ├── WeeklyReportPage.vue
│   │   ├── WeeklyReportListPage.vue
│   │   ├── WeeklyReportReviewListPage.vue
│   │   └── CenterDailyReportPage.vue
│   └── components/         # 可复用组件
│       └── project-detail/ # 项目详情子组件（模块化拆分）
│           ├── ProjectBasicInfoPanel.vue
│           ├── ProjectStageListPanel.vue
│           ├── ProjectStageApprovalPanel.vue
│           ├── ProjectStageAdvancePanel.vue
│           ├── ProjectOperationLogPanel.vue
│           └── ...
├── .env.example            # 环境变量模板
├── vite.config.js          # Vite 配置（代理、插件）
├── index.html              # HTML 入口
└── package.json
```

## 快速开始

### 前置条件

- Node.js >= 20（兼容后端 `engines` 要求）
- npm
- 后端服务已启动（默认 `http://localhost:3001`）

### 安装与启动

```bash
# 1. 进入前端目录
cd digital-platform-web

# 2. 安装依赖
npm install

# 3. （可选）配置后端代理地址
cp .env.example .env
# 编辑 .env，设置 VITE_API_PROXY_TARGET 指向后端地址

# 4. 启动开发服务器
npm run dev
```

默认在 `http://localhost:5173` 启动。Vite proxy 将 `/api` 请求转发到 `http://127.0.0.1:3001`。

### 构建生产版本

```bash
npm run build      # 输出到 dist/
npm run preview    # 预览构建结果
```

## 配置

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `VITE_API_BASE_URL` | API 基础路径（生产环境使用） | 空（使用 proxy） |
| `VITE_API_PROXY_TARGET` | 开发环境代理目标 | `http://127.0.0.1:3001` |

### 代理配置

`vite.config.js` 中的 proxy 规则：

```js
server: {
  proxy: {
    '/api': {
      target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
      changeOrigin: true
    }
  }
}
```

开发时无需单独处理 CORS，所有 `/api` 请求由 Vite dev server 代理转发至后端。

### 生产部署

构建后 `dist/` 目录为纯静态文件，可通过以下方式部署：

1. **Nginx**：配置反向代理，将 `/api` 转发到后端，其余请求走 `dist/` 静态文件
2. **Express 静态托管**：后端 Express 直接 `app.use(express.static('dist'))`
3. **CDN + API 分离**：前端部署到 CDN，API 通过 `VITE_API_BASE_URL` 指定后端地址

## 使用示例

### 首次使用流程

1. 后端执行 `npm run init-auth` 初始化系统管理员账号
2. 浏览器打开 `http://localhost:5173`
3. 使用 `admin` / `Admin@123456` 登录
4. 在"用户管理"中创建组织成员（总经理、中心负责人、员工）
5. 以总经理身份登录，在"新建项目"中创建项目
6. 在项目详情中为每个阶段资料分配责任人
7. 责任人登录后，在"我的资料任务"中看到待提交资料
8. 提交资料后，中心负责人可在项目详情中确认/退回
9. 全部齐套后，有权限的用户可推进阶段

### 角色典型操作路径

**系统管理员**：登录 → 用户管理 → 创建/编辑/禁用用户 → 重置密码

**总经理**：登录 → 新建项目 → 项目详情查看全局进度 → 分配责任人 → 标记不适用 → 推进阶段 → 周报汇总及考评

**中心负责人**：登录 → 项目列表（本中心相关）→ 项目详情 → 确认/退回资料 → 分配责任人 → 推进阶段 → 中心日报汇总 → 周报评分

**员工**：登录 → 我的资料任务 → 提交资料 → 上传附件 → 写日报 → 写周报

## 前端设计规范

### 权限判断

前端按以下规则控制界面元素可见性，但最终权限由后端强制校验：

- **用户管理入口**：`organizationRole === 'system_admin' && isPlatformAdmin`
- **新建项目入口**：`organizationRole === 'general_manager' || 'center_manager'`
- **资料操作按钮**：根据后端返回的资料项 `permissions` 字段动态渲染（`canSubmitDocument`、`canReviewDocument` 等）
- **阶段推进按钮**：根据用户角色与项目关系判断可见性
- **日报写入口**：`organizationRole === 'employee'`
- **周报评分入口**：`organizationRole === 'general_manager' || 'general_manager_assistant' || 'center_manager'`

### 数据流

```
组件 props 接收数据 → 事件通知页面容器 → 页面容器调用 API →
后端处理 → 返回数据 → 页面容器刷新状态 → 子组件重渲染
```

项目详情页模块化拆分后，子组件（如 `ProjectStageApprovalPanel`）不自行发起后端请求，而是通过事件（`emit`）通知页面容器组件执行操作。此设计确保请求逻辑集中在页面层，便于调试和维护。

### 错误处理

- API 请求使用统一 `apiClient` 封装
- 401 自动跳转登录页
- 业务错误展示后端返回的 `error.message`
- 未预期的网络错误展示"网络异常，请稍后重试"

## 贡献指南

### 代码规范

1. **组件拆分**：页面级组件放 `pages/`，可复用组件放 `components/`，项目详情子组件放 `components/project-detail/`
2. **数据请求**：统一通过 `api.js` 中的 `apiClient` 发起请求，不要在组件中直接使用 `fetch`
3. **路由管理**：新增页面后在 `router.js` 中添加路由匹配规则
4. **命名风格**：Vue 组件使用 PascalCase 命名，页面文件以 `Page.vue` 结尾
5. **状态管理**：跨组件共享状态通过 `provide/inject`，页面内状态使用 `ref`/`reactive`
6. **字段一致性**：请求使用 `displayName`，展示使用 `name`；组织角色和部门使用后端枚举值

### 添加新页面的步骤

1. 在 `src/pages/` 中创建新页面组件（以 `Page.vue` 结尾）
2. 在 `src/router.js` 的 `parseHash()` 中添加路由匹配规则
3. 在 `src/App.vue` 中导入并加入 `v-if` 路由条件渲染
4. 如需要导航入口，在 `App.vue` 的导航栏中添加链接
5. 页面中的 API 调用通过 `api.js` 的 `apiClient` 完成
6. 运行 `npm run check` 确认构建无报错

### API 调用示例

```js
// 在页面容器中
import { apiClient } from '../api.js';

const projects = ref([]);
const loading = ref(false);
const error = ref(null);

async function fetchProjects() {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiClient('/api/projects');
    projects.value = data;
  } catch (err) {
    error.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
}
```

### 样式约定

- 使用 `<style scoped>` 避免样式污染
- CSS 类名使用 kebab-case
- 颜色和尺寸直接使用具体值（非 CSS 变量），保证各组件独立
- 表单和表格使用统一的间距和字号（以项目详情页为参考基准）
- 错误状态使用红色（`#e74c3c`），成功状态使用绿色（`#27ae60`），警告状态使用橙色（`#f39c12`）

## License

Private — 重庆凯尔夫智能测控技术有限责任公司内部使用。
