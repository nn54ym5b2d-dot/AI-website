# 源素库项目启动入口

版本：v4.8
日期：2026-07-19
适用项目：源素库 / 虚拟素材网站 / AI 数字素材交易平台

## 1. 当前项目状态

当前已完成：

- 原始需求 Word `虚拟素材网站产品文档_v1.docx` 的有效内容已拆分进 `docs/`；Robert 已于 2026-07-19 主动删除旧 Word，不需要恢复。当前规则以 `docs/决策记录.md`、相关 `docs/` 和 Robert 最新明确指令为准。
- 已读取 `docs/工具协作流程规划.md`。
- 已建立本地 `docs/` 项目资料体系。
- 已建立 Codex 项目工作规则 `AGENTS.md`。
- 已建立首批任务清单和验收资料。
- 已初始化本地 Git 仓库，主分支为 `main`。
- 已添加 `.gitignore`，避免提交系统文件、依赖目录、构建产物和密钥文件。
- 已创建首个本地提交：`Initialize project workspace`。
- 已设置远程仓库地址：`https://github.com/nn54ym5b2d-dot/AI-website.git`。
- 已合并远程仓库初始 `README.md`。
- GitHub 远程仓库已连接：`nn54ym5b2d-dot/AI-website`。
- 本地 `main` 分支已推送到 GitHub，并跟踪 `origin/main`。
- 已建立 Next.js + TypeScript + Tailwind CSS 网站代码框架。
- 已添加前台首页、上传者入口、管理后台入口和健康检查 API。
- 已添加数据库、腾讯云 COS、权限、环境变量模板和 GitHub Actions CI 骨架。
- 已完成全项目代码与文档审核，修正后台基础角色/子角色边界、观察员越权风险、导航权限元数据、依赖安全、Next.js 规则和真实单元测试。
- 已验证 GitHub Actions CI 曾通过；最新推送后的远程运行状态以 GitHub Actions 页面为准。
- 已建立 `docs/项目总控.md`，作为 Notion 总控页的本地同步源。
- 已完成一次协作状态审计：GitHub 仓库、GitHub Actions 和 Notion 总控页已连接；当时 GitHub Issues/PR 为空，现已创建 T006-T016 Issues #1-#11，并已接入 GitHub Project #1。
- Robert 已确认 T005 网站代码框架通过，状态改为 Done。
- 已生成 T006-T016 GitHub Issue 草稿：`docs/GitHub Issue 草稿.md`。
- 已按 Robert 审核确认，将 T006-T016 创建为 GitHub Issues #1-#11。
- 已创建 GitHub Project #1：`源素库 MVP 开发`，并加入 Issues #1-#11。
- 已创建 T017 GitHub Issue #16 并加入 Project #1，用于 T016 后的真实外部服务接入与上线准备。
- 已启用 GitHub `main` 主分支保护 ruleset：`Protect main branch`，状态为 Active，应用到 `main`，要求 Pull Request、`verify` 状态检查，禁止删除和强推。
- T006 第一版页面结构和导航骨架已完成；已按 Robert 审核反馈将管理后台和外部观察员入口降权为低显眼内部入口，并已审核通过。
- T007 数据库表结构细化版已获 Robert 审核确认并通过 PR #14 完成，覆盖用户、素材、认证、订单、支付、退款、授权、下载、收益、后台权限、外部观察员汇总和敏感字段边界。
- 已确认 T007 首版规则：人物/场景素材 50 元、物件/道具素材 10 元；上传者 80%、平台 20%、观察员 0%；永久授权；下载入口默认 365 天；认证费长期独立；TencentDB for PostgreSQL；财务管理员可发起退款。
- T008 核心 API 审核修订版已获 Robert 批准并通过 PR #15 合并到 `main`，覆盖 `/api/v1`、Cookie/CSRF、角色权限、COS 直传、支付回调、完整订单明细退款、ZIP 下载、条款接受、收益、后台和观察员汇总。
- T008 完成状态、本地数据库方案和后续任务口径已通过 PR #17 同步到 `main`。
- Robert 已确认：素材购买只能按完整订单明细退款；多角度原文件打包 ZIP 下载；实名认证延期到 MVP 后；只有人物素材要求必要证明材料。
- Robert 已确认 T009 本地数据库采用 Docker Compose + PostgreSQL 16 + Prisma；TencentDB for PostgreSQL 继续作为生产数据库，在 T017 接入。
- T009 已完成并通过 PR #19 合并到 `main`：PostgreSQL 16 Compose、Prisma 7 身份 schema、首个 migration、非真实 seed、手机号/邮箱本地验证码 provider、微信 adapter 入口、注册登录退出、当前用户、CSRF、邀请码激活、角色守卫和真实数据库自动化测试均已落地。
- 项目资料冲突与后续任务依赖同步已通过 PR #18 合并到 `main`。
- PR #19 已通过 Robert 验收并合并到 `main`，GitHub Issue #4 已自动关闭。
- T009A 已完成并通过 PR #24 压缩合并到 `main`（合并提交 `cbfd8ad`）：方向 A 六组响应式原型、统一登录/注册入口、差异化回跳、登录态头部、退出登录、账号绑定规则和上传者邀请码激活均已落地；桌面/390px 手机 QA、真实本地登录回跳、PostgreSQL 完整测试 14/14、lint、typecheck、build 和 GitHub Actions `verify` 均通过。
- 已修复本地重复执行 `db:seed` 会错误复活已使用上传者邀请码的问题：旧邀请码按既有上传者资料恢复为已使用，新测试邀请码独立创建；激活接口会把遗留关联识别为已使用而不是返回模糊 500。隔离 PostgreSQL 身份测试继续 14/14 通过。
- Robert 已确认登录/注册顶部直接展示手机号和微信、不显示“主要方式”，邮箱为下方独立辅助入口、首版不做 QQ；手机号是新账号主身份，邮箱注册和首次微信登录必须验证绑定手机号，注册昵称由服务端生成。真实微信 OAuth/二维码仍在 T017 接入。
- T009A 第一轮参考网站研究和设计简报校准已确认：保留 A 专业创作市场、B AI 影像实验室、C 数字素材档案馆三套方向，三套方案共同保持正式、专业、简约、现实影像优先和认证可信。
- GitHub CLI 已重新连接账号 `nn54ym5b2d-dot`，并获得仓库、Actions 和 Project 管理权限；Project #1 的状态规则已统一为 `Backlog / Ready / In Progress / Review / Blocked / Done`。
- GitHub Project #1 已于 2026-07-19 同步：T006-T010、T009A 为 Done，T011、T013 为 Ready，T012、T014-T016 为 Blocked，T017 为 Backlog，与本地任务清单一致。
- Robert 已确认素材水印交付架构：原文件、证明材料和购买后的 ZIP 始终存放于私有存储；系统从原文件异步预生成独立水印预览图和缩略图，公开页面经 CDN 只分发这些衍生文件；购买后由应用服务校验授权并签发私有 ZIP 的短时下载地址。Next.js 只处理元数据、权限和签名，不读取或处理图片文件正文。真实腾讯云 COS、数据万象/图片处理和 CDN 接入仍统一在 T017 完成。
- T010 / Issue #5 已由 Robert 验收并通过 PR #28 压缩合并到 `main`（`5072265`），状态为 Done：素材、标签、文件 Prisma 模型和 migration，非真实三类素材 seed，公开素材列表/详情/分类/标签 API，首页、分类、搜索筛选和详情页真实数据库闭环，以及固化水印的本地公开衍生图均已落地；原文件元数据保持私有，页面请求不处理图片正文。

当前未完成：

- 上传、审核、交易、下载和收益功能尚未正式开发；后续任务必须延续本地真实 PostgreSQL/Prisma、可替换 provider 和自动化测试，不得回退到无法运行的 mock。
- T011 和 T013 的 T010 前置条件已经满足，当前均进入 Ready；推荐优先执行 T011，先补齐上传、文件确认和水印衍生图处理状态，再执行依赖该流程的 T012。
- Notion 总控页已创建，本轮按 `docs/项目总控.md` 的统一状态同步并重新读取确认。
- 尚未接入微信支付、支付宝、认证、腾讯云 COS、腾讯云生产部署等外部服务。

## 2. 项目一句话说明

源素库是一个面向 AI 视频、游戏、短剧广告和虚拟内容制作方的数字素材交易平台。第一版做 Web 网站和管理后台，支持人物、物件/道具、场景图片素材的认证上传、审核上架、单次购买、下载授权、收益记录和后台权限管理。

## 3. 本地资料入口

建议按以下顺序阅读：

1. `docs/README.md`
2. `docs/项目总控.md`
3. `docs/PRD.md`
4. `docs/业务规则.md`
5. `docs/页面清单.md`
6. `docs/角色权限.md`
7. `docs/任务清单.md`
8. `docs/视觉设计基线.md`
9. `docs/测试验收清单.md`
10. `docs/决策记录.md`

## 4. 当前推荐推进顺序

1. 读取 GitHub Issue #6 和相关 docs，执行 T011：上传者素材提交流程。
2. T013 也已解除 T010 阻塞，但为减少并行复杂度，当前优先完成 T011；同时可准备腾讯云账号、COS、备案资料和部署环境，真实外部接入仍统一在 T017 完成。

## 5. 当前最高优先级

当前最高优先级是 GitHub Issue #6 / T011 `开发上传者素材提交流程`。T010 已完成并成为 T011、T013 的素材数据基础；真实外部接入仍统一在 T017 完成。

## 6. 给 Codex 的常用指令

继续整理产品资料：

```text
请读取 PROJECT_START.md、docs/项目总控.md、AGENTS.md 和 docs/，检查当前产品资料是否有遗漏或冲突。
```

开始拆任务：

```text
请根据 docs/任务清单.md，把 T00X 拆成可执行的开发任务。
```

开始开发：

```text
请执行 T00X。
要求：先读取 AGENTS.md 和相关 docs/，只做本任务范围，完成后说明如何验收。
```

阶段总结：

```text
请根据当前 docs/ 和任务清单，总结项目进度、阻塞、风险和建议下一步。
```
