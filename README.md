# 源素库 / AI-website

AI 数字素材交易平台 MVP。

## 当前阶段

- T009-T012A 已完成用户身份、视觉基线、素材浏览、上传、后台审核认证和基础管理闭环。
- T013 / Issue #8 已由 Robert 验收并通过 PR #37 压缩合并到 `main`（`e524f9e`），状态为 `Done`：多素材订单、本地测试支付/退款、授权、下载资格和初始收益均已接入 PostgreSQL。
- T014 / Issue #9 已由 Robert 验收并通过 PR #39 压缩合并到 `main`（`aa42ad5`），状态为 `Done`：真实本机 ZIP、逐次短时地址、下载记录、收益冲正、真实热门排序、`buyer + uploader` 双角色及购买者/上传者双中心均已落地。
- T014 最终验收记录为 24/24 自动化测试、lint、typecheck、build、桌面与 390×844 浏览器复核和远程 `verify` 通过。
- T015 / Issue #10 已完成本地实现与检查并创建草稿 PR #42，状态为 `Review`，等待 Robert 验收；T016 为 `Blocked`，T017 为 `Backlog`。
- T015 已落地管理员分级、最后一名超级管理员保护、观察员账号生命周期、六个只读聚合接口和真实观察员看板；27/27、lint、typecheck、build、桌面与 390×844 浏览器复核通过。
- 真实短信、邮件、微信 OAuth/二维码、微信支付/支付宝、COS、图片处理、CDN 和腾讯云生产部署仍未接入，统一属于 T017。
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
npm run preview:local
npm run preview:stop
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## 本地启动

### 一键预览（macOS）

在 Finder 中打开项目文件夹，双击 `启动本机预览.command`。脚本会自动：

1. 检查 Node.js 24、npm 和 Docker Desktop。
2. 必要时启动 Docker Desktop，并启动本地 PostgreSQL。
3. 首次运行时安装依赖、创建仅限本机使用的 `.env` 和随机认证密钥。
4. 应用已审查的 migration，幂等补充非真实测试数据。
5. 启动 Next.js 开发服务器并自动打开 `http://127.0.0.1:3000`。

预览期间请保持启动脚本的终端窗口打开；页面支持代码热更新。结束时在该窗口按 `Control+C`，或者双击 `停止本机预览.command`。停止脚本会关闭网站和 PostgreSQL，但保留数据库内容。

也可以在终端运行：

```bash
npm run preview:local
```

首次双击 `.command` 文件若被 macOS 阻止，可在 Finder 中右键文件，选择“打开”，确认一次后以后即可直接双击。

### 手动启动

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

T011 的 `ASSET_STORAGE_PROVIDER=local_test` 与 `ASSET_LOCAL_TEST_ENABLED=true` 只用于本地元数据流程：浏览器计算文件哈希，Next.js 保存上传意图和文件元数据，但不接收图片正文；本地处理适配器生成独立预览/缩略对象记录，不代表真实 COS、图片水印处理或 CDN 已接通。

## 项目资料

- `PROJECT_START.md`：项目启动入口
- `AGENTS.md`：Codex 工作规则
- `docs/项目总控.md`：项目总控、当前进度、路线图和同步规则
- `docs/视觉设计基线.md`：T009A 设计简报、执行顺序、视觉规范字段和验收边界
- `docs/`：产品、业务、权限、数据库、API 和验收资料
