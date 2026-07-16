# Design QA：T009A 方向 A / 方向 1

日期：2026-07-16
目标：`artifacts/t009a/visual-directions/a-professional-creative-marketplace.png`
对照：`artifacts/t009a/qa/direction-a-vs-home-desktop.png`

## 证据

- 桌面首页：`artifacts/t009a/qa/home-desktop-1280.png`
- 桌面搜索：`artifacts/t009a/qa/search-desktop-1280.png`
- 桌面详情：`artifacts/t009a/qa/detail-desktop-1280.png`
- 桌面登录：`artifacts/t009a/qa/login-desktop-1280.png`
- 手机首页：`artifacts/t009a/qa/home-mobile-390x844.png`
- 手机搜索：`artifacts/t009a/qa/search-mobile-390x844.png`
- 手机详情：`artifacts/t009a/qa/detail-mobile-390x844.png`
- 手机登录：`artifacts/t009a/qa/login-mobile-390x844.png`

## 首轮问题与修正

| 等级 | 问题 | 修正 | 状态 |
|---|---|---|---|
| P1 | 首页主标题在 1280px 下最后一个字单独换行 | 扩大标题容器并调整桌面字号 | 已修正 |
| P1 | 首版首页的分类带与目标稿层级不同、垂直节奏偏长 | 将三类素材移回搜索下方，信任信息置于分类之后，并压缩首屏间距 | 已修正 |
| P1 | 目标稿物件/道具和场景价格存在图像生成文字误差 | 按已确认规则固定人物/场景 ¥50、物件/道具 ¥10 | 已修正 |
| P2 | 原骨架蓝灰色、通用卡片和按钮与选中方向不一致 | 建立品牌红、暖白纸面、暖灰边框、统一按钮/输入/素材卡片 token | 已修正 |
| P2 | 原页面使用空白占位框 | 使用三张 4:3 现实感演示素材和同一人物侧面图 | 已修正 |

## 交互检查

- 首页、导航、搜索和素材卡片可跳转。
- 搜索关键词、素材类型、认证开关和排序可操作；空结果可清除。
- 详情页两张人物预览可切换，演示购买清单有成功反馈。
- 登录邮箱/手机号模式可切换；原验证码、条款、CSRF 和会话流程保留。
- `/upload` 在无登录状态下仍跳转 `/login?next=%2Fupload`，未绕过服务端角色守卫。
- 390×844 真实视口下，首页、搜索、详情和登录页的视口宽度、文档宽度和 `body` 宽度均为 390px，无横向溢出。
- 手机菜单开启/关闭、搜索结果筛选、详情图切换、演示购买反馈、登录方式切换和表单按钮启用状态均已操作验证。

## 检查结果

- [x] 1280px 桌面页面和 390px 手机真实视口的截图与交互检查。
- [x] 选中方向与首页实现并排对比，P1/P2 可见差异已迭代修正。
- [x] `npm run lint`、`npm run typecheck`、`npm run test:unit` 和 `npm run build`。
- [ ] 完整本地 `npm test`：当前环境无 Docker Compose / PostgreSQL 测试库，由 GitHub Actions 的 PostgreSQL service 补充验证。
- [ ] GitHub Actions `verify`：推送草稿 PR 后检查。

## 非阻塞项

- 本地控制台只有 `/favicon.ico` 404；不影响可见页面、交互、路由或本阶段验收，列为 P3 后续品牌资产项。

final result: passed
