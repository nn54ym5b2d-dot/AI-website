# 源素库 / AI-website

AI 数字素材交易平台 MVP。

## 当前阶段

- T009 用户注册登录和角色基础已完成并通过 PR #19 合并。
- T009A `源素库 MVP 视觉设计基线与核心页面原型` 已创建为 GitHub Issue #21，并已加入 GitHub Project #1；项目资料同步见 PR #22。
- T009A 当前为 `Ready`；T010 在视觉基线验收完成前保持 `Blocked`。
- 本轮只建立设计任务和资料，不代表三套视觉方向或正式页面视觉已经完成。

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
5. 运行 `npm run dev`，打开 `http://localhost:3000/register` 或 `/login`。

手机号和邮箱验证码由本地测试 provider 随机生成，不会写入普通日志。请求验证码后，运行：

```bash
npm run auth:outbox
```

该命令只读取被 Git 忽略的 `.local/auth-outbox.jsonl`。本地测试上传者邀请码为 `YSK-LOCAL-UPLOADER-2026`；它不是生产邀请码。

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
