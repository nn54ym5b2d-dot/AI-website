# 源素库 / AI-website

AI 数字素材交易平台 MVP。

## 当前阶段

- T009 用户注册登录和角色基础已完成并通过 PR #19 合并。
- T009A `源素库 MVP 视觉设计基线与核心页面原型` 已由 Robert 验收；PR #24 已合并，状态同步 PR #25 已合并到 `main`（`fe7dcb4`）。
- 页面顶部直接展示手机号与微信，不显示“主要方式”；邮箱位于下方独立区域。邮箱注册和首次微信登录必须绑定手机号，注册昵称由服务端生成，首版不接 QQ。
- 本地 PostgreSQL 完整测试 14/14 以及 lint、typecheck、build 已通过；真实短信、邮件和微信 OAuth/二维码仍在 T017 接入。
- T010 / Issue #5 当前为 `Ready`，尚未开始功能开发；下一步读取 Issue #5 和相关资料后执行。
- 本地任务清单和 GitHub Project #1 统一使用 `Backlog / Ready / In Progress / Review / Blocked / Done` 六种状态。

## 当前技术方向

- Next.js
- TypeScript
- Tailwind CSS
- 本地开发：Docker Compose + PostgreSQL 16 + Prisma
- 生产数据库：TencentDB for PostgreSQL + Prisma
- 腾讯云 COS
- 腾讯云生产部署

## 常用命令

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## T009 本地启动

1. 复制 `.env.example` 为 `.env`，把 `AUTH_SECRET` 改为至少 24 个字符的本地随机值。示例数据库账号和密码只允许本地开发使用。
2. 运行 `npm install` 安装依赖并生成 Prisma Client。
3. 运行 `npm run db:up` 启动隔离的 PostgreSQL 16。项目默认使用本机端口 `54329`，避免占用常见的 `5432`。
4. 运行 `npm run db:migrate` 应用已审查的 migration，再运行 `npm run db:seed` 载入非真实最小测试数据。
5. 运行 `npm run dev`，打开统一认证入口 `http://localhost:3000/login`。旧 `/register` 会安全转向该页面。

手机号和邮箱验证码由本地测试 provider 随机生成，不会写入普通日志。请求验证码后，运行：

```bash
npm run auth:outbox
```

该命令只读取被 Git 忽略的 `.local/auth-outbox.jsonl`。当前可用的本地测试上传者邀请码为 `YSK-LOCAL-UPLOADER-2026-02`；它不是生产邀请码。旧测试码如已关联上传者会永久保持已使用，重复运行 `npm run db:seed` 只补充缺失测试码，不会把已使用、禁用或过期的邀请码重新开放。

完整测试会先检查数据库名必须以 `_test` 结尾，再重置隔离的 `yuansu_test` 数据库：

```bash
npm test
```

结束本地数据库服务：

```bash
npm run db:down
```

当前未接入真实短信、邮件、微信、TencentDB 或生产凭证。`AUTH_LOCAL_ENABLED=true` 只用于明确启用本地测试 provider，生产环境不得设置。

## 项目资料

- `PROJECT_START.md`：项目启动入口
- `AGENTS.md`：Codex 工作规则
- `docs/项目总控.md`：项目总控、当前进度、路线图和同步规则
- `docs/视觉设计基线.md`：T009A 设计简报、执行顺序、视觉规范字段和验收边界
- `docs/`：产品、业务、权限、数据库、API 和验收资料
