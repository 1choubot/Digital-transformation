## 1. Confirmed Planning Items

- [x] 1.1 项目总览作为项目主入口。
- [x] 1.2 项目列表入口弱化。
- [x] 1.3 项目工作区左侧 8 阶段导航。
- [x] 1.4 蓝色节点作为业务语境入口。
- [x] 1.5 点击节点先看产出，再进入在线表单。
- [x] 1.6 第一版只完整落地立项阶段。
- [x] 1.7 第一版不新增后端接口。

## 2. Future Implementation Tasks

- [x] 2.1 调整前端主导航。
- [x] 2.2 将 `/projects` 路由进入项目总览或等价项目总览体验，不进入旧项目列表。
- [x] 2.3 在项目总览补齐进入项目工作区 `/projects/:id` 的入口。
- [x] 2.4 重构 `ProjectDetailPage.vue` 为项目工作区布局。
- [x] 2.5 拆分阶段导航组件。
- [x] 2.6 拆分蓝色节点列表组件。
- [x] 2.7 拆分节点产出工作区组件。
- [x] 2.8 保留立项阶段在线表单入口。
- [x] 2.9 其他阶段展示占位或旧资料清单入口。
- [x] 2.10 清理主导航和页面内“项目列表/返回项目列表”旧文案。
- [x] 2.11 将返回项目入口统一指向项目总览。
- [x] 2.12 确认没有用户可见的独立项目列表入口残留。
- [x] 2.13 执行前端 build 校验。
- [x] 2.14 浏览器验证 `/projects` 进入项目总览。
- [x] 2.15 浏览器验证主导航不显示独立“项目列表”入口。
- [x] 2.16 浏览器验证项目总览显示项目摘要，并提供新建项目入口。
- [x] 2.17 浏览器验证项目总览点击项目进入 `/projects/:id` 项目工作区。
- [x] 2.18 浏览器验证项目工作区左侧显示 8 阶段导航。
- [x] 2.19 浏览器验证点击立项阶段蓝色节点后先显示节点产出工作区，不直接打开在线表单。
- [x] 2.20 浏览器验证点击“填写资料/查看在线表单”后才打开在线表单。
- [x] 2.21 浏览器验证其他 7 阶段显示占位、旧资料清单入口或后续配置。
- [x] 2.22 浏览器验证桌面和移动 viewport 下导航、节点、产出工作区不重叠、不溢出。
- [x] 2.23 执行 OpenSpec 校验。
- [x] 2.24 Fix workbench deep-link routing so `taskMode` / `documentId` / `nodeKey` selects the matching stage node without opening the online form.
- [x] 2.25 Browser validate workbench initiationReview deep link opens the project workspace with the initiation approval node selected.
- [x] 2.26 Browser validate document responsibility deep link selects the matching output node without opening online form.
- [x] 2.27 Browser validate stage advance deep link selects the matching stage.
- [x] 2.28 Fix non-initiation document workbench deep links by falling back to checklist stage selection when workspace outputs are unavailable.
- [x] 2.29 Browser validate non-initiation document responsibility deep link selects the matching stage and shows placeholder or legacy checklist entry without opening online form.
- [x] 2.30 Replace the legacy checklist hash link with a component event and page-level `scrollIntoView()` so the SPA route is not changed.
- [x] 2.31 Move initiation `1.1` and `1.2` responsibility assignment into the project workspace output cards, using backend `canManageResponsibility`.
- [x] 2.32 Keep `1.3` as marketing-center-manager handled and do not show a separate responsibility assignment control.
- [x] 2.33 Downgrade the lower legacy checklist for `1.1` / `1.2` / `1.3` to status and auxiliary display without responsibility assignment, ordinary submit, revision completion, or review/approval main actions.
- [x] 2.34 Distinguish output-panel empty states between “select a blue node” and “this stage has no configured nodes”.
- [x] 2.35 Browser validate initiation output cards are the main entry for responsibility assignment and online forms while the lower legacy checklist no longer exposes initiation main actions.
