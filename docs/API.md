# API 草案

版本：v1.2  
日期：2026-06-16  
状态：草案，技术方向已确认，待代码框架确认后细化

## 1. 说明

本文件先记录第一版可能需要的接口。具体路径、参数、鉴权方式和错误码，等技术栈确认后再细化。

## 2. 用户与认证

| 接口 | 用途 |
|---|---|
| `POST /api/auth/register` | 注册购买用户，支持手机号或邮箱 |
| `POST /api/auth/login` | 登录，支持手机号、邮箱或微信 |
| `POST /api/auth/wechat` | 微信登录或绑定 |
| `POST /api/auth/logout` | 退出登录 |
| `GET /api/me` | 获取当前用户信息 |
| `POST /api/invite/activate` | 使用邀请码激活上传者身份 |

## 3. 素材浏览

| 接口 | 用途 |
|---|---|
| `GET /api/assets` | 素材列表、搜索、筛选 |
| `GET /api/assets/:id` | 素材详情 |
| `GET /api/categories` | 分类列表 |
| `GET /api/tags` | 标签列表 |

## 4. 素材上传

| 接口 | 用途 |
|---|---|
| `POST /api/uploader/assets` | 创建素材草稿 |
| `POST /api/uploader/assets/:id/files` | 上传素材文件、预览图；人物素材上传必要证明材料 |
| `POST /api/uploader/assets/:id/submit` | 提交审核并进入认证上传费支付流程 |
| `GET /api/uploader/assets` | 查看自己的上传 |
| `GET /api/uploader/assets/:id` | 查看自己的素材详情和状态 |

## 5. 订单与支付

| 接口 | 用途 |
|---|---|
| `POST /api/orders` | 创建订单，可包含多个素材 |
| `GET /api/orders` | 查看自己的订单 |
| `GET /api/orders/:id` | 查看订单详情 |
| `POST /api/orders/:id/pay` | 发起支付，支持微信支付或支付宝 |
| `POST /api/payments/wechat/webhook` | 微信支付回调 |
| `POST /api/payments/alipay/webhook` | 支付宝回调 |

## 6. 下载与授权

| 接口 | 用途 |
|---|---|
| `GET /api/authorizations` | 查看自己的授权记录 |
| `GET /api/authorizations/:id` | 查看授权详情 |
| `POST /api/download-links` | 为已购买素材生成腾讯云 COS 限时下载链接 |
| `GET /api/downloads` | 查看自己的下载记录 |

## 7. 上传者收益

| 接口 | 用途 |
|---|---|
| `GET /api/uploader/revenue` | 查看自己的收益记录 |
| `GET /api/uploader/revenue/summary` | 查看收益汇总 |

## 8. 管理后台

| 接口 | 用途 |
|---|---|
| `GET /api/admin/dashboard` | 后台首页数据 |
| `GET /api/admin/assets` | 后台素材列表 |
| `POST /api/admin/assets/:id/review` | 审核通过或驳回 |
| `POST /api/admin/assets/:id/listing` | 上架或下架 |
| `GET /api/admin/certifications` | 认证记录列表 |
| `POST /api/admin/certifications/:id/verify` | 录入或核验证书信息，并保存认证证书文件 |
| `GET /api/admin/invite-codes` | 邀请码列表 |
| `POST /api/admin/invite-codes` | 创建邀请码 |
| `POST /api/admin/invite-codes/:id/disable` | 禁用邀请码 |
| `GET /api/admin/users` | 用户列表 |
| `GET /api/admin/orders` | 订单列表 |
| `GET /api/admin/payments` | 支付记录 |
| `GET /api/admin/refunds` | 退款记录 |
| `POST /api/admin/refunds/:id/confirm` | 财务确认退款记录 |
| `GET /api/admin/authorizations` | 授权记录 |
| `GET /api/admin/revenue` | 收益记录 |
| `GET /api/admin/audit-logs` | 操作日志 |
| `GET /api/admin/settings` | 系统设置 |
| `PATCH /api/admin/settings` | 修改系统设置，仅超级管理员 |

## 9. 外部观察员后台

| 接口 | 用途 |
|---|---|
| `GET /api/observer/dashboard` | 外部观察员首页汇总 |
| `GET /api/observer/platform-metrics` | 查看平台上传量、下载量、订单和收益汇总 |
| `GET /api/observer/assets-summary` | 查看人物/物件/场景素材上传、上架、认证汇总 |
| `GET /api/observer/downloads-summary` | 查看下载量汇总和趋势 |
| `GET /api/observer/revenue-summary` | 查看平台收益、退款、净收益和分成基数 |
| `GET /api/observer/share-records` | 查看合作方预计分成、已结算和待结算金额 |

外部观察员 API 只返回只读汇总或脱敏字段，不提供导出接口。

## 10. 待确认

- 微信支付和支付宝接入后，需要补充回调签名验证细节。
- 文件上传方式：前端直传腾讯云 COS，还是先传应用服务器。
- 后台权限校验的具体实现方式。
- 是否需要向合作方开放独立 API；当前默认不开放，只提供后台只读页面。
