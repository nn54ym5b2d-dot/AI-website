# 源素库全站 UI · Figma 导入记录

> 历史设计/验收快照：保留原日期、证据及结论，不代表 PRD v2.3 的微信小程序、会员、漫剧形象及权证链流程已设计或验收。新版页面要求见 `docs/页面清单.md`，后续工作见 T018–T023。

日期：2026-09-06

[Figma 文件与阅读说明](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=69-2)

已导入 58 个 1280px 桌面画板，按 8 个模块排列。内容依据当前本地实现，保留文字、矢量与图片图层，并标注中文页面名和路由。包含页面默认状态及部分有记录、空状态、上传草稿/待支付和登录方式状态。

## 范围与边界

- 这是现有网站 UI 快照；没有重做视觉风格、独立手机版、完整交互原型或复用组件库。
- 后台与补充交易状态使用独立本地数据库 `yuansu_figma_ui_20260906` 的仓库虚构 seed 和本次新增虚构订单；没有复制原数据库。演示数据库保留，预览进程已停止。
- 已有本地测试上传者界面保留原测试记录；设计稿中测试、待接入说明保持原样，不代表真实支付/COS 已接通。
- `/register` 是登录兼容跳转，没有独立界面；未知动态 section 对应 404。验证码箱属于本地开发工具，未导入验证码或凭据。
- 导入文字保留源站 PingFang SC；截图可正常渲染，但 Figma MCP 的可用字体列表未提供该字体，编辑时可能需配置本地字体。
- 临时采集脚本和转发接口已撤出网站；业务代码无本次保留修改。原有 `next-env.d.ts` 修改和用户文件保持原样。

## 核验

- 逐项核对 58 个画板的节点、名称、路由、尺寸及可编辑文本。
- 抽查 Figma 实际渲染：首页、原文件/证明上传编辑、后台有订单状态、观察员看板；未发现明显裁切或重叠。
- 首页与详情的水印素材图片图层已核对存在。
- 本次没有修改业务逻辑，不运行业务测试；不把结构检查称为所有页面的完整视觉验收。
- 不改变 T016 Ready / T017 Backlog，不代表 MVP 测试或外部服务上线完成。
- 最终结构检查：58 个画板、58 个唯一节点，全部宽 1280px、均含文字，画板之间没有重叠。说明封面不计入 58 个业务画板。
- 最后尝试调整并复核说明封面时，Figma 返回 Starter 计划 MCP 调用额度已耗尽；该最后一步未执行。业务画板已完成导入与结构核对，但封面完整文字显示尚未完成最终复核。推荐直接从 [首页画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=2-2) 开始查看。

## 画板目录

| 模块 | 画板 | 路由 | Figma |
|---|---|---|---|
| 01 素材浏览 | 首页 | `/` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=2-2) |
| 01 素材浏览 | 发现素材 | `/materials` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=11-2) |
| 01 素材浏览 | 人物筛选 | `/search?type=person` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=3-2) |
| 01 素材浏览 | 物件筛选 | `/search?type=object` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=4-2) |
| 01 素材浏览 | 场景筛选 | `/search?type=scene` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=9-2) |
| 01 素材浏览 | 素材详情 | `/materials/[assetId]` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=10-2) |
| 02 登录注册 | 手机号登录 | `/login` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=5-2) |
| 02 登录注册 | 邮箱登录展开 | `/login` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=60-2) |
| 02 登录注册 | 微信登录待接入 | `/login` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=62-2) |
| 02 登录注册 | 登录页 · 已登录头部状态 | `/login` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=59-2) |
| 03 购买者中心 | 购买者中心 | `/account` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=15-2) |
| 03 购买者中心 | 我的购买 · 有订单 | `/account/purchases` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=51-2) |
| 03 购买者中心 | 我的下载 · 有授权 | `/account/downloads` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=50-2) |
| 03 购买者中心 | 我的授权 · 有记录 | `/account/licenses` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=54-2) |
| 03 购买者中心 | 订单结算 · 待支付 | `/checkout` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=56-2) |
| 03 购买者中心 | 我的购买 · 空状态 | `/account/purchases` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=14-2) |
| 03 购买者中心 | 我的下载 · 空状态 | `/account/downloads` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=13-2) |
| 03 购买者中心 | 我的授权 · 空状态 | `/account/licenses` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=16-2) |
| 03 购买者中心 | 结算 · 无待支付订单 | `/checkout` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=21-2) |
| 04 上传者中心 | 上传者中心 | `/account/uploader` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=17-2) |
| 04 上传者中心 | 邀请码激活 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=52-2) |
| 04 上传者中心 | 人物素材表单 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=22-2) |
| 04 上传者中心 | 物件场景共用表单 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=25-2) |
| 04 上传者中心 | 原文件与证明上传编辑 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=63-2) |
| 04 上传者中心 | 提交成功 · 等待认证费 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=26-2) |
| 04 上传者中心 | 认证上传费结算 | `/checkout` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=27-2) |
| 04 上传者中心 | 我的上传 | `/account/uploads` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=18-2) |
| 04 上传者中心 | 审核状态 | `/account/upload-status` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=19-2) |
| 04 上传者中心 | 上传收益 | `/account/revenue` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=23-2) |
| 04 上传者中心 | 上传者资料 | `/account/uploader-profile` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=20-2) |
| 04 上传者中心 | 人物表单 · 隔离演示样本 | `/upload` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=61-2) |
| 05 管理后台 | 后台概览 | `/admin` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=32-2) |
| 05 管理后台 | 素材审核 | `/admin/review` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=28-2) |
| 05 管理后台 | 素材管理 | `/admin/assets` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=31-2) |
| 05 管理后台 | 素材管理详情 | `/admin/assets/[assetId]` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=42-2) |
| 05 管理后台 | 版权认证记录 | `/admin/certifications` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=36-2) |
| 05 管理后台 | 邀请码管理 | `/admin/invitations` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=29-2) |
| 05 管理后台 | 用户管理 | `/admin/users` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=30-2) |
| 05 管理后台 | 用户详情与权限表单 | `/admin/users/[userId]` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=44-2) |
| 05 管理后台 | 观察员账号 | `/admin/observer-accounts` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=40-2) |
| 05 管理后台 | 系统设置 | `/admin/settings` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=41-2) |
| 05 管理后台 | 操作日志 | `/admin/audit-logs` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=39-2) |
| 06 订单与财务后台 | 订单管理 · 有记录 | `/admin/orders` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=45-2) |
| 06 订单与财务后台 | 支付记录 · 有记录 | `/admin/payments` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=46-2) |
| 06 订单与财务后台 | 退款管理 · 有记录 | `/admin/refunds` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=47-2) |
| 06 订单与财务后台 | 授权管理 · 有记录 | `/admin/licenses` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=48-2) |
| 06 订单与财务后台 | 收益记录 · 有记录 | `/admin/revenue` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=49-2) |
| 06 订单与财务后台 | 订单管理 · 空状态 | `/admin/orders` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=37-2) |
| 06 订单与财务后台 | 支付记录 · 空状态 | `/admin/payments` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=33-2) |
| 06 订单与财务后台 | 退款管理 · 空状态 | `/admin/refunds` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=34-2) |
| 06 订单与财务后台 | 授权管理 · 空状态 | `/admin/licenses` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=35-2) |
| 06 订单与财务后台 | 收益记录 · 空状态 | `/admin/revenue` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=38-2) |
| 07 观察员 | 外部观察员只读看板 | `/observer` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=57-2) |
| 08 协议与异常页面 | 服务条款 | `/terms` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=6-2) |
| 08 协议与异常页面 | 隐私政策 | `/privacy` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=7-2) |
| 08 协议与异常页面 | 商业授权 | `/license` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=8-2) |
| 08 协议与异常页面 | 无权限 | `/forbidden` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=55-2) |
| 08 协议与异常页面 | 页面不存在 | `404` | [打开画板](https://www.figma.com/design/XTQucGQoLAgrJdPKFKAaob?node-id=53-2) |
