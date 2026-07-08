## 1. Planning

- [x] 确认新版 1.2 模板取消项目编号字段
- [x] 确认项目编号归属移到 1.3
- [x] 确认 1.3 通知累计清单需求
- [x] 确认不接文件平台/PDF/不新增资料项

## 2. Implementation

- [x] 更新 1.2 schema：移除 projectCode，替换新版商务/技术评分项
- [x] 新增 1.2 项目开展模式必填单选字段：自研模式 / 供应链模式
- [x] 更新 1.2 manifest：新版模板路径/version/mapping
- [x] 更新 1.2 manifest：项目开展模式勾选新版模板中的自研模式或供应链模式
- [x] 更新 1.2 生成 smoke：断言不写项目编号，断言新版字段位置
- [x] 更新 1.2 生成 smoke：断言正确勾选自研模式或供应链模式
- [x] 更新 1.3 schema：projectCode 可编辑必填
- [x] 更新 1.3 提交逻辑：校验 projectCode 唯一并写入 projects.project_code
- [x] 实现 projectCode 并发唯一性防护：数据库唯一索引、命名锁、串行化事务或等价机制
- [x] 移除 1.3 “提交前必须已有项目编号”的旧门禁
- [x] 实现 1.3 累计项目清单查询
- [x] 实现 1.3 累计清单 cutoff：仅包含 submitted_at <= 当前项目 1.3 submitted_at 的项目
- [x] 扩展 docx renderer 支持多行表格写入/克隆/删除空白行
- [x] 更新 1.3 manifest：写累计清单而不是单行当前项目
- [x] 更新前端表单和提示文案
- [x] 商务负责人未填项目开展模式时不能提交商务部分
- [x] 更新 smoke 覆盖 1.2/1.3 新流程
- [x] 禁用立项流程项目通过独立 project-code 更新接口绕过 1.3
- [x] 遗留独立 project-code 更新路径复用项目编号命名锁
- [x] 1.2 项目开展模式生成保留 D20/G20 富文本，仅替换 checkbox run

## 3. Verification

- [x] API check
- [x] Web build
- [x] OpenSpec strict/all
- [x] 并发/重复项目编号 smoke：两个 1.3 并发提交同编号只能一个成功
- [x] 1.3 通知重试 smoke：重试旧通知不得包含 cutoff 之后提交的项目
- [x] 验证项目开展模式不写入 projects.project_mode、不影响项目主数据项目模式
- [x] 手动下载 1.2 新版审批表核对字段
- [x] 手动下载 1.3 通知核对累计清单和落款日期分页
- [x] smoke：1.2 总经理通过且 1.3 未保存草稿时，独立 updateProjectCode 被拒绝
- [x] smoke：独立 updateProjectCode 与 1.3 提交并发同编号时不产生重复
- [x] smoke：两个独立 updateProjectCode 并发同编号时不产生重复
- [x] smoke：自研模式/供应链模式生成文件均保留中文 run 宋体和 checkbox run/effective Wingdings 2
- [x] smoke：生成文件不包含整格 `☑/□ + 项目开展模式` 替换文本

## 4. Future Boundaries

- [x] 不接文件平台
- [x] 不生成 PDF
- [x] 不新增资料项
- [x] 不改变 71 项数量
- [x] 不迁移旧项目历史数据
