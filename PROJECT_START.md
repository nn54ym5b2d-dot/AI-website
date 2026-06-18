# 源素库项目启动入口

版本：v1.6
日期：2026-06-18
适用项目：源素库 / 虚拟素材网站 / AI 数字素材交易平台

## 1. 当前项目状态

当前已完成：

- 已读取 `虚拟素材网站产品文档_v1.docx`。
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
- 已完成轻量代码 review，并修正后台权限 helper 与依赖版本固定问题。
- 已验证 GitHub Actions CI 通过。
- 已建立 `docs/项目总控.md`，作为 Notion 总控页的本地同步源。

当前未完成：

- 业务功能尚未正式开发。
- GitHub Issues 和 GitHub Projects 尚未正式建立。
- Notion 总控页已创建，需要与 `docs/项目总控.md` 保持同步。
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
8. `docs/测试验收清单.md`
9. `docs/决策记录.md`

## 4. 当前推荐推进顺序

1. Robert 验收 T005 网站代码框架是否可以从 Review 改为 Done。
2. 把 T006-T016 拆成 GitHub Issue 草稿，先由 Robert 审核。
3. 创建 GitHub Issues，并建立或接入 GitHub Projects 看板。
4. 执行 T006，细化第一版页面结构和导航。
5. 同步准备腾讯云账号、腾讯云 COS、腾讯云备案资料和部署环境。

## 5. 当前最高优先级

当前最高优先级不是直接写代码，而是先确认：

- 产品规则是否理解正确。
- 第一版到底哪些页面必须做。
- 管理后台权限边界是否正确。
- 腾讯云账号、COS Bucket、备案资料和部署环境如何实际开通。
- T006-T016 如何拆成 Robert 容易管理的 GitHub Issue 任务卡。
- 第一版页面结构和导航如何细化。

确认后再进入核心功能开发会更稳。

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
