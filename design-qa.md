# Design QA：T009A 方向 A / 方向 1

日期：2026-07-16（最终测试及 Robert 页面标注复核：2026-07-17）
目标：`artifacts/t009a/visual-directions/a-professional-creative-marketplace.png`
对照：`artifacts/t009a/qa/direction-a-vs-home-desktop.png`
本轮源视觉事实：Robert 在 Browser Comments 中提供的首页头部、注册页手机号和页脚截图标注（会话附件，无本地文件路径）。

## 证据

- 桌面首页：`artifacts/t009a/qa/home-desktop-1280.png`
- 桌面搜索：`artifacts/t009a/qa/search-desktop-1280.png`
- 桌面详情：`artifacts/t009a/qa/detail-desktop-1280.png`
- 桌面登录：`artifacts/t009a/qa/login-desktop-1280.png`
- 手机首页：`artifacts/t009a/qa/home-mobile-390x844.png`
- 手机搜索：`artifacts/t009a/qa/search-mobile-390x844.png`
- 手机详情：`artifacts/t009a/qa/detail-mobile-390x844.png`
- 手机登录：`artifacts/t009a/qa/login-mobile-390x844.png`
- Robert 标注修正后的桌面首页头部：`artifacts/t009a/qa/home-header-review-817x735.png`
- Robert 标注修正后的桌面手机号注册：`artifacts/t009a/qa/register-phone-review-817x735.png`
- Robert 标注修正后的手机菜单：`artifacts/t009a/qa/home-menu-review-390x844.png`
- Robert 标注修正后的手机手机号注册：`artifacts/t009a/qa/register-phone-review-390x844.png`

## 首轮问题与修正

| 等级 | 问题 | 修正 | 状态 |
|---|---|---|---|
| P1 | 首页主标题在 1280px 下最后一个字单独换行 | 扩大标题容器并调整桌面字号 | 已修正 |
| P1 | 首版首页的分类带与目标稿层级不同、垂直节奏偏长 | 将三类素材移回搜索下方，信任信息置于分类之后，并压缩首屏间距 | 已修正 |
| P1 | 目标稿物件/道具和场景价格存在图像生成文字误差 | 按已确认规则固定人物/场景 ¥50、物件/道具 ¥10 | 已修正 |
| P2 | 原骨架蓝灰色、通用卡片和按钮与选中方向不一致 | 建立品牌红、暖白纸面、暖灰边框、统一按钮/输入/素材卡片 token | 已修正 |
| P2 | 原页面使用空白占位框 | 使用三张 4:3 现实感演示素材和同一人物侧面图 | 已修正 |

## Robert 页面标注迭代

同一 817×735 视口下，将 Robert 的标注截图与修正后的首页头部、注册页手机号截图共同检查；390×844 另行检查手机菜单与手机号组合输入。聚焦区域足以覆盖本轮三个标注，不需要重新比较未改动的素材图片和页面主体。

| 等级 | 标注问题 | 修正 | 修正后证据 | 状态 |
|---|---|---|---|---|
| P2 | 首页头部缺少直接注册入口，独立放大镜不符合本轮要求 | 在登录旁加入描边注册按钮，删除桌面头部独立放大镜；主搜索框和手机菜单文字搜索保留 | `home-header-review-817x735.png`、`home-menu-review-390x844.png` | 已修正 |
| P2 | 手机号要求用户自行填写国家/地区代码 | 标签简化为“手机号”，增加默认 `+86 中国大陆` 的国家/地区代码下拉，并将所选区号与号码提交给原身份 API | `register-phone-review-817x735.png`、`register-phone-review-390x844.png` | 已修正 |
| P3 | 页脚重复提供“注册”入口 | 删除页脚注册链接，保留头部注册和注册页“返回登录” | 桌面/手机注册页 DOM 复核 | 已修正 |

## 交互检查

- 首页、导航、搜索和素材卡片可跳转。
- 搜索关键词、素材类型、认证开关和排序可操作；空结果可清除。
- 详情页两张人物预览可切换，演示购买清单有成功反馈。
- 登录邮箱/手机号模式可切换；原验证码、条款、CSRF 和会话流程保留。
- 手机号模式默认 `+86 中国大陆`，可切换其他国家/地区代码；实测切换 `+44 英国` 并输入非真实测试号码后，后端成功创建本地验证码挑战。
- `/upload` 在无登录状态下仍跳转 `/login?next=%2Fupload`，未绕过服务端角色守卫。
- 390×844 真实视口下，首页、搜索、详情和登录页的视口宽度、文档宽度和 `body` 宽度均为 390px，无横向溢出。
- 手机菜单开启/关闭、登录/注册/上传三项操作布局、搜索结果筛选、详情图切换、演示购买反馈、登录方式切换、区号下拉和表单按钮启用状态均已操作验证。
- 本轮浏览器控制台无页面错误或警告。

## 检查结果

- [x] 1280px 桌面页面和 390px 手机真实视口的截图与交互检查。
- [x] 选中方向与首页实现并排对比，P1/P2 可见差异已迭代修正。
- [x] `npm run lint`、`npm run typecheck`、`npm run test:unit` 和 `npm run build`。
- [x] 完整本地 `npm test`：Docker Compose PostgreSQL 16 为 `healthy`；隔离的 `yuansu_test` 已完成 reset、migration、seed 和真实身份 API 测试，10/10 通过。
- [x] GitHub Actions `verify`：PR #24 检查通过。
- [x] Robert 三项 Browser Comments 已按 817×735 桌面和 390×844 手机视口复核；字体、间距、颜色、现有图片质量和页面文案没有因本轮局部调整产生新的 P0/P1/P2 问题。

## 非阻塞项

- 本地控制台只有 `/favicon.ico` 404；不影响可见页面、交互、路由或本阶段验收，列为 P3 后续品牌资产项。

final result: passed
