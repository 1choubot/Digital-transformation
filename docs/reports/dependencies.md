# 依赖清单

更新时间：2026-06-24

## digital-platform-api

| 依赖 | 当前安装版本 | 用途 |
|---|---:|---|
| busboy | 1.6.0 | multipart 附件上传解析 |
| dotenv | 16.6.1 | 环境变量加载 |
| exceljs | 4.4.0 | M3 个人日报 Excel 模板导出 |
| express | 4.22.2 | API 服务 |
| mysql2 | 3.22.3 | MySQL 连接与查询 |

## digital-platform-web

| 依赖 | 当前安装版本 | 用途 |
|---|---:|---|
| @vitejs/plugin-vue | 5.2.4 | Vite Vue 插件 |
| vite | 6.4.2 | 前端构建 |
| vue | 3.5.34 | 前端框架 |

## 服务器迁移提示

- API 项目需执行 `npm.cmd install` 或在服务器上用等价 npm 命令安装 `package-lock.json` 锁定的依赖。
- M3 起 API 运行时依赖 `exceljs`，服务器部署时必须同步更新 `digital-platform-api/package.json` 与 `digital-platform-api/package-lock.json`。
- Excel 模板目录仍由 `REPORT_TEMPLATE_ROOT` 指向，导出目录仍由 `REPORT_EXPORT_ROOT` 指向。
