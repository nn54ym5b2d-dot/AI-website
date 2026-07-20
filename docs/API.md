# 核心 API 细化版

版本：v3.9
日期：2026-07-20
状态：T008 接口合同已批准；T009 身份基础、T010 公开素材接口、T011 上传者素材提交流程、T012 后台审核认证已完成；T012A 本地实现完成并进入 Review；T013-T016 Blocked

## 1. 文档定位

本文件定义源素库 MVP 的第一版核心 API 合同，供 T009-T015 开发使用。接口覆盖用户登录、邀请码激活、素材浏览、素材上传、审核认证、订单支付、授权下载、收益记录、管理后台和外部观察员只读看板。

T012A 实现状态：管理员邀请码列表/创建/禁用、系统设置读取/修改、管理员用户只读列表/详情、上传者资料读写和个人中心摘要均已形成真实本地 API；公开素材响应增加安全认证摘要。完整邀请码仅在创建成功响应中出现一次，设置写入仅允许超级管理员并记录审计，私有认证文件和用户完整联系方式不进入非授权响应。

本次只确定接口边界，不实现完整 API，不接入真实微信支付、支付宝、腾讯云 COS、短信、邮件、微信登录或政府认证网站，也不生成正式 OpenAPI 文件。

T009 实现状态：第 2-4 节的条款查询、手机号/邮箱验证码挑战、注册、登录、退出、当前用户、CSRF、微信 adapter 入口和邀请码激活已形成可运行本地 API。真实短信、邮件和微信服务仍未接入；开发环境使用明确标识的本地 provider，验证码不在 API 响应或普通日志中返回。

T010 实现状态：第 5 节的素材列表、详情、分类和标签接口已基于本地 PostgreSQL/Prisma 落地，列表支持合同中定义的筛选、排序和游标分页。公开响应只包含安全展示字段和已处理成功的水印衍生图 URL；真实 COS、图片处理和 CDN 仍未接入。

数据模型以 `docs/数据库设计.md` v3.1 为准。首版业务默认值：

| 配置 | 首版值 |
|---|---:|
| 人物素材价格 | 5000 分（50 元） |
| 场景素材价格 | 5000 分（50 元） |
| 物件/道具素材价格 | 1000 分（10 元） |
| 认证上传费 | 1000 分（10 元） |
| 上传者 / 平台 / 外部观察员分成 | 80% / 20% / 0% |
| 商业授权 | 永久有效，特殊情况可撤销 |
| 用户下载入口 | 默认 365 天 |
| 实际 COS 下载地址 | 每次下载时短时签发，建议不超过 10 分钟 |
| 多角度原始素材交付 | 每份素材打包为一个 ZIP 下载 |

实名认证不在 MVP API 范围内，后续版本如启用需另行设计开关、身份服务和隐私合规方案。人物素材必须提交必要证明材料；物件/道具和场景素材不要求该证明材料。

## 2. 通用约定

### 2.1 基础约定

| 项目 | 约定 |
|---|---|
| API 前缀 | `/api/v1` |
| 数据格式 | 除文件直传、支付回调和下载跳转外，统一使用 `application/json; charset=utf-8` |
| ID | 数据库主键和路径参数使用 UUID 字符串 |
| 时间 | ISO 8601 UTC 字符串，例如 `2026-07-13T08:30:00Z` |
| 金额 | 整数分，例如 50 元返回 `5000`；币种默认 `CNY` |
| 百分比 | 小数快照，例如 80% 返回 `0.8000` |
| 布尔值 | 使用 `true` / `false`，不使用 `0` / `1` |
| 删除 | MVP 核心业务优先软删除或状态变更，不通过 API 物理删除交易记录 |
| 跟踪编号 | 每个响应返回 `requestId`；后台日志、支付回调和错误排查用该编号关联 |

路径统一使用复数名词和 `{id}` 形式，例如 `/api/v1/orders/{orderId}`。本文件中的“允许角色”表示服务端必须校验的最低权限，不能只依赖前端隐藏按钮。

### 2.2 角色标识

| 文档名称 | 数据库角色 |
|---|---|
| 购买用户 | `buyer` |
| 上传者 | `uploader` |
| 超级管理员 | `admin` + `super_admin` |
| 运营管理员 | `admin` + `operator` |
| 财务管理员 | `admin` + `finance` |
| 外部观察员 | `observer` |

同一用户可以拥有多个角色。接口按当前有效角色集合判断权限；角色被禁用后，已有 Cookie 会话也不得继续使用该角色能力。

### 2.3 鉴权与会话

- Web 第一版使用服务端会话，不把登录令牌存入 `localStorage`。
- 登录成功后，服务端设置 `HttpOnly`、`Secure`、`SameSite=Lax` Cookie；生产环境建议使用 `__Host-` 前缀、`Path=/` 且不设置 `Domain`。
- `GET`、`HEAD` 等只读请求仍需按接口要求检查会话和角色。
- 所有使用 Cookie 鉴权的修改类请求必须同时校验 `Origin` / `Sec-Fetch-Site` 和 `X-CSRF-Token`。
- `GET /api/v1/auth/csrf` 返回当前会话的 CSRF token。该 token 不是登录令牌，不授予任何权限。
- 支付平台回调不使用用户 Cookie 和 CSRF token，而使用第三方签名、时间戳、随机串和商户配置验签。
- 未登录返回 `401`；已登录但角色或资源归属不符合要求返回 `403`。

### 2.4 幂等与并发

以下修改操作必须接受 `Idempotency-Key` 请求头，并至少在 24 小时内按“用户 + 接口 + key”去重：

- 创建素材购买订单。
- 为订单或认证上传费发起支付。
- 提交素材审核。
- 创建退款或重试退款处理。

同一个 key 携带不同请求体时返回 `409 IDEMPOTENCY_CONFLICT`。状态变更应使用数据库事务和条件更新，避免重复回调、重复点击或并发请求生成重复授权、收益或退款。

支付和退款回调不依赖客户端提供 `Idempotency-Key`，而是以第三方事件唯一标识或可验证的交易组合键写入 `webhook_events` 去重；重复有效回调返回第三方要求的成功响应，但不得重复生成业务记录。

### 2.5 成功响应

普通单对象响应：

```json
{
  "data": {
    "id": "7cfc4f69-0d59-4c9f-a2ae-05af728cc812"
  },
  "requestId": "req_01J2Y0M7C3"
}
```

列表响应使用游标分页：

```json
{
  "data": [],
  "meta": {
    "nextCursor": null,
    "hasMore": false
  },
  "requestId": "req_01J2Y0M7C3"
}
```

默认 `limit=20`，最大 `limit=100`。禁止让外部观察员通过放大分页或遍历 ID 获得业务明细。

### 2.6 错误响应

```json
{
  "error": {
    "code": "STATE_TRANSITION_INVALID",
    "message": "当前素材状态不允许上架",
    "details": {
      "currentStatus": "pending_review"
    }
  },
  "requestId": "req_01J2Y0M7C3"
}
```

`message` 用于界面展示，不能包含数据库语句、密钥、COS object key、第三方完整响应或内部堆栈。`details` 只返回有助于用户修正输入的非敏感字段。

### 2.7 运行时支撑数据

`docs/数据库设计.md` v2.4 定义的是核心业务表。实现本接口合同时，还需要会话、验证码挑战、幂等记录、短期上传意图和第三方回调去重等运行时支撑数据。T009、T011、T013 应在各自实现阶段补充最小必要的 Prisma 模型、受控缓存或等价持久化方案，例如：

- `user_sessions`：保存会话哈希、用户、过期和撤销时间。
- `auth_challenges`：保存手机号/邮箱挑战哈希、用途、次数和过期时间。
- `idempotency_records`：保存作用域、请求摘要和已生成的响应资源。
- `upload_intents`：保存资源归属、预期文件元数据、对象引用和过期时间。
- `webhook_events`：保存第三方事件唯一标识、处理状态和必要摘要。

这些记录不得保存明文验证码、会话 Cookie、完整签名 URL、支付密钥或无必要的完整第三方载荷；新增模型应通过对应任务的 Prisma migration 和 PR 审核，不改变 T007 已确认的核心业务关系。

## 3. 通用状态码和错误码

| HTTP | 错误码 | 使用场景 |
|---:|---|---|
| 400 | `INVALID_REQUEST` | JSON、查询参数或请求头格式错误 |
| 400 | `CSRF_VALIDATION_FAILED` | Cookie 鉴权的修改请求未通过 CSRF 校验 |
| 401 | `AUTH_REQUIRED` | 未登录 |
| 401 | `SESSION_INVALID` | 会话失效、被撤销或用户已禁用 |
| 403 | `FORBIDDEN` | 已登录但角色、资源归属或操作范围不允许 |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在，或为避免泄露而对无权资源按不存在处理 |
| 409 | `RESOURCE_CONFLICT` | 唯一值冲突或重复业务对象 |
| 409 | `IDEMPOTENCY_CONFLICT` | 相同幂等 key 对应不同请求 |
| 409 | `STATE_TRANSITION_INVALID` | 当前状态不允许目标操作 |
| 422 | `VALIDATION_ERROR` | 字段缺失、枚举错误、金额或时间范围不合法 |
| 429 | `RATE_LIMITED` | 登录、验证码、上传签名或其他接口超过频率限制 |
| 502 | `UPSTREAM_RESPONSE_INVALID` | 第三方返回无法验证或格式异常 |
| 503 | `UPSTREAM_UNAVAILABLE` | COS、支付、短信、邮件或微信服务暂不可用 |
| 500 | `INTERNAL_ERROR` | 未预期内部错误；只向客户端返回通用信息 |

核心业务错误码：

| 错误码 | 建议 HTTP | 说明 |
|---|---:|---|
| `CHALLENGE_INVALID` | 422 | 手机或邮箱验证码无效 |
| `CHALLENGE_EXPIRED` | 422 | 验证挑战已过期 |
| `TERMS_ACCEPTANCE_REQUIRED` | 422 | 新用户未接受当前有效条款版本 |
| `PHONE_BINDING_REQUIRED` | 422 | 邮箱注册或首次微信登录尚未完成手机号验证绑定 |
| `INVITE_CODE_INVALID` | 422 | 邀请码不存在或格式错误 |
| `INVITE_CODE_USED` | 409 | 邀请码已使用 |
| `INVITE_CODE_DISABLED` | 409 | 邀请码已禁用 |
| `INVITE_CODE_EXPIRED` | 409 | 邀请码已过期 |
| `UPLOADER_ALREADY_ACTIVE` | 409 | 用户已经是有效上传者 |
| `ASSET_FILES_INCOMPLETE` | 422 | 原文件、预览图或缩略图不完整 |
| `PERSON_PROOF_REQUIRED` | 422 | 人物素材缺少必要证明材料 |
| `CERTIFICATE_REQUIRED` | 422 | 上架前缺少有效证书编号或证书文件 |
| `UPLOAD_INTENT_EXPIRED` | 409 | 短期上传地址已过期 |
| `UPLOAD_FILE_REJECTED` | 422 | 文件类型、大小、哈希或实际对象校验失败 |
| `ASSET_NOT_PURCHASABLE` | 409 | 素材未上架、未认证、已下架或价格无效 |
| `ALREADY_AUTHORIZED` | 409 | 当前用户已拥有该素材的有效授权 |
| `PAYMENT_ALREADY_SUCCESS` | 409 | 支付已成功，不允许重复发起 |
| `PAYMENT_SIGNATURE_INVALID` | 401 | 支付回调验签失败 |
| `PAYMENT_AMOUNT_MISMATCH` | 409 | 回调金额、币种或商户订单号与本地记录不一致 |
| `REFUND_AMOUNT_EXCEEDED` | 422 | 退款金额超过可退金额 |
| `AUTHORIZATION_REVOKED` | 409 | 授权已撤销 |
| `DOWNLOAD_LINK_EXPIRED` | 410 | 平台下载入口已过期 |
| `DOWNLOAD_LINK_REVOKED` | 410 | 平台下载入口已撤销 |

## 4. 用户登录与邀请码激活

手机号和邮箱第一版统一使用验证码挑战；微信使用 OAuth 临时 `code`。页面采用“验证即登录/注册”：同一入口验证后先查已有身份，已存在则登录，不存在才进入建号或绑定流程。手机号是新账号的主身份：手机号验证后可直接创建账号；新邮箱必须同时通过邮箱和手机号两个注册挑战；首次微信使用必须通过手机号注册挑战，已绑定微信的账号可直接登录。短信、邮件和微信开放平台尚未接入，开发时必须通过 provider adapter 隔离，不得在代码中写入真实密钥或固定万能验证码。

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `GET /api/v1/legal-documents/current` | 公开 | `type: terms_of_service\|privacy_policy\|commercial_license` | 当前生效文档的 `id`、`version`、`title`、`effectiveAt` 和公开正文/地址 | `RESOURCE_NOT_FOUND` |
| `POST /api/v1/auth/challenges` | 公开 | `method: phone\|email`、`identifier`、`purpose: register\|login` | `challengeId`、`expiresAt`、`resendAfterSeconds`；不返回验证码 | `VALIDATION_ERROR`、`RATE_LIMITED`、`UPSTREAM_UNAVAILABLE` |
| `POST /api/v1/auth/register` | 公开 | `purpose=register` 主验证的 `challengeId`、`verificationCode`；创建新账号时必填 `acceptedTermsVersion`；新邮箱另需 `phoneChallengeId`、`phoneVerificationCode` | 统一登录/注册：已有手机号或邮箱返回 `200` 并登录；新手机号返回 `201` 并建号；新邮箱验证后要求绑定手机号，手机号已有账号时绑定而不重复建号；设置会话 Cookie并返回 `isNewUser` | `CHALLENGE_INVALID`、`CHALLENGE_EXPIRED`、`TERMS_ACCEPTANCE_REQUIRED`、`PHONE_BINDING_REQUIRED`、`RESOURCE_CONFLICT` |
| `POST /api/v1/auth/login` | 公开 | `purpose=login` 的 `challengeId`、`verificationCode` | 保留给旧客户端和内部测试的明确登录接口；设置会话 Cookie并返回 `user`、`roles` | `CHALLENGE_INVALID`、`SESSION_INVALID` |
| `POST /api/v1/auth/wechat` | 公开 | `code`、`redirectUri`；首次使用另需 `phoneChallengeId`、`phoneVerificationCode`；创建新用户时必填 `acceptedTermsVersion` | 已绑定微信直接登录；首次使用把微信绑定到已验证手机号对应账号，手机号不存在时才创建账号；设置会话 Cookie并返回 `isNewUser` | `PHONE_BINDING_REQUIRED`、`TERMS_ACCEPTANCE_REQUIRED`、`RESOURCE_CONFLICT`、`UPSTREAM_UNAVAILABLE` |
| `GET /api/v1/auth/csrf` | 已登录 | 无 | `csrfToken`、`expiresAt` | `AUTH_REQUIRED` |
| `POST /api/v1/auth/logout` | 已登录 | 无 | 清除当前会话 Cookie，返回 `loggedOut: true` | `CSRF_VALIDATION_FAILED` |
| `GET /api/v1/me` | 已登录 | 无 | 当前用户非敏感资料、有效角色、上传者/管理员/观察员摘要 | `AUTH_REQUIRED`、`SESSION_INVALID` |
| `POST /api/v1/invites/activate` | 已登录，尚非上传者 | `code`、`uploaderDisplayName` | `uploaderProfile`、更新后的 `roles` | `INVITE_CODE_*`、`UPLOADER_ALREADY_ACTIVE` |

邀请码激活必须在一个事务中锁定邀请码、写入使用者、创建 `uploader_profiles` 并增加 `uploader` 角色，避免同一邀请码并发使用。邀请码只要已有 `usedByUserId` 或 `uploaderProfile` 关联，即使遗留状态错误地显示为 `unused`，也必须返回 `INVITE_CODE_USED`，不得继续写入并泄漏数据库唯一约束错误。接口不返回邀请码创建者、其他使用者或内部备注。

手机号注册、邮箱加手机号注册和微信加手机号首次创建账号都必须在同一事务中记录当前条款版本的接受事实。邮箱、手机号或微信身份之间的绑定必须在验证码消费和身份唯一性检查的同一事务中完成；如果两种已验证身份分别属于不同账号，返回冲突并停止自动合并。已有用户登录不重复写入，但当未来条款需要重新同意时，应走独立确认流程，不能伪造历史接受时间。

注册表单不再接收用户填写的 `displayName`。手机号或邮箱首次建号时由服务端生成 `源素用户·XXXXXXXX` 格式的随机昵称；微信首次建号优先使用经清理和长度限制的授权昵称，未提供有效昵称时同样随机生成。昵称不是登录凭证、允许重复；已有账号绑定邮箱或微信时不得覆盖原昵称。

## 5. 公开素材浏览

公开接口只返回 `listing_status=listed`、`review_status=approved` 且 `certification_status=certified` 的素材。未上架素材即使 ID 正确也返回 `404`，上传者查看自己的未上架素材应使用第 6 节接口。

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `GET /api/v1/assets` | 公开 | `q`、`type: person\|object\|scene`、`tag`、`minPriceCents`、`maxPriceCents`、`listedAfter`、`sort: newest\|popular\|price_asc\|price_desc`、`cursor`、`limit` | 素材卡片列表：`id`、`title`、`type`、`priceCents`、`currency`、`certificationStatus`、已生成水印缩略图/预览图的 CDN 地址 | `VALIDATION_ERROR` |
| `GET /api/v1/assets/{assetId}` | 公开 | 无 | 详情：基础信息、标签、带水印的预览文件、价格、授权摘要，以及可公开的认证状态、证书编号、来源和签发日期；不含原文件、证明材料、证书/凭证文件或内部备注 | `RESOURCE_NOT_FOUND` |
| `GET /api/v1/categories` | 公开 | 无 | 首版固定三类素材及展示名称 | 无 |
| `GET /api/v1/tags` | 公开 | `q`、`limit` | 已上架素材使用的标签建议 | `VALIDATION_ERROR` |
| `GET /api/v1/legal-documents/current?type=terms_of_service\|privacy_policy\|commercial_license` | 公开 | 文档类型 | 当前有效版本、标题、正文、版本号和生效时间；非正式本地文本带明确环境标记 | `RESOURCE_NOT_FOUND`、`VALIDATION_ERROR` |

搜索参数必须限制长度并做数据库参数化查询。公开接口只返回已经生成成功的独立水印预览图/缩略图 CDN 地址；不得在公开请求中临时读取原图加工，也不能由预览地址推导原文件地址。T010 使用本地种子或受控适配器提供已生成衍生图，真实腾讯云图片处理和 CDN 在 T017 接入。

T010 当前没有可验证的浏览热度/下载量字段，`sort=popular` 暂时使用稳定的最新上架顺序作为回退；T014/T015 建立真实统计数据后再接入热度排序。该回退必须在界面和验收说明中保持透明，不得声称已经实现真实热门度算法。

## 6. 上传者素材与文件上传

### 6.1 素材草稿

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `POST /api/v1/uploader/assets` | 上传者 | `type`、`title`、可选 `description`、`tags[]` | 素材草稿；价格由系统规则写入，不接受上传者定价 | `FORBIDDEN`、`VALIDATION_ERROR` |
| `GET /api/v1/uploader/profile` | 上传者 | 无 | 当前上传者公开资料和状态；不返回邀请码明文 | `FORBIDDEN` |
| `PATCH /api/v1/uploader/profile` | 上传者 | `displayName?`、`bio?` | 更新后的上传者资料 | `FORBIDDEN`、`VALIDATION_ERROR` |
| `GET /api/v1/uploader/assets` | 上传者 | `reviewStatus`、`listingStatus`、`certificationStatus`、分页参数 | 仅当前上传者的素材列表和状态摘要 | `FORBIDDEN` |
| `GET /api/v1/uploader/assets/{assetId}` | 素材所属上传者 | 无 | 草稿详情、文件摘要、审核/认证/上架状态、驳回原因和认证费摘要 | `RESOURCE_NOT_FOUND` |
| `PATCH /api/v1/uploader/assets/{assetId}` | 素材所属上传者 | 可修改 `title`、`description`、`tags[]` | 更新后的素材；不接受价格、审核、认证或上架状态 | `STATE_TRANSITION_INVALID`、`VALIDATION_ERROR` |
| `DELETE /api/v1/uploader/assets/{assetId}/files/{fileId}` | 素材所属上传者 | 无 | `deleted: true` | `STATE_TRANSITION_INVALID`、`RESOURCE_NOT_FOUND` |

只有 `draft` 状态可自由编辑和移除文件。`rejected` 素材的重新提交与再次收费规则仍待确认；首版实现不得自动重复扣费，可保留编辑能力但在重新提交时返回 `STATE_TRANSITION_INVALID`。

### 6.2 COS 直传合同

文件不通过 Next.js 应用服务器中转。应用服务只负责鉴权、生成短期上传地址、确认对象和写数据库记录：

```text
浏览器 -> 应用服务申请上传地址
应用服务 -> 返回绑定专用暂存 object key 的短期签名 PUT 地址
浏览器 -> 直接上传到私有 COS
浏览器 -> 应用服务确认上传完成
应用服务 -> 通过 COS HEAD/元数据校验后写 asset_files
```

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `POST /api/v1/uploader/assets/{assetId}/file-uploads` | 素材所属上传者 | `fileType: original\|person_proof\|supporting_proof`、`fileName`、`mimeType`、`sizeBytes`、`sha256` | `uploadId`、短期 `uploadUrl`、`method: PUT`、`requiredHeaders`、`expiresAt`、`maxBytes` | `STATE_TRANSITION_INVALID`、`UPLOAD_FILE_REJECTED`、`RATE_LIMITED` |
| `POST /api/v1/uploader/assets/{assetId}/file-uploads/{uploadId}/complete` | 素材所属上传者 | 可选 `etag` | 经服务端核验后的 `fileId`、`fileType`、`status: ready`、`derivativeStatus: pending\|not_applicable`、非敏感元数据 | `UPLOAD_INTENT_EXPIRED`、`UPLOAD_FILE_REJECTED` |
| `POST /api/v1/uploader/assets/{assetId}/processing-jobs/{jobId}/run` | 素材所属上传者；仅本地测试 | 无 | 本地任务状态和已生成的 preview/thumbnail 非敏感摘要 | `RESOURCE_NOT_FOUND`、`STATE_TRANSITION_INVALID` |

安全要求：

- COS Bucket 必须为私有；签名上传地址建议 5-15 分钟失效，只允许指定暂存 key、方法、MIME 和大小范围。签名本身不能保证网络层“只使用一次”，业务层必须让每个 `upload_intent` 只成功完成一次。
- 接口不单独返回 `cos_bucket`、`cos_region` 或 `cos_object_key`；`uploadUrl` 是临时敏感值，前端不得持久化，服务端日志不得记录其查询字符串。
- `complete` 不能只相信前端，应通过 COS 查询对象是否存在，并核对大小、MIME、哈希或上传元数据；校验通过后复制/移动到不可变最终 key 并登记，失败或过期对象进入清理流程。
- 未完成的上传意图过期后失效，孤立对象由后续清理任务删除。
- `person_proof` 只允许人物素材且提交前必需；`supporting_proof` 只允许物件/道具和场景素材且为选填。两类证明材料都保持私有；认证证书使用管理员专用上传接口。
- `preview` 和 `thumbnail` 不接受上传者直接指定为公开文件；原文件确认成功后，由受控异步处理任务生成独立水印预览图/缩略图，并把处理状态、来源文件 ID 和水印模板版本写入文件元数据。
- 衍生图处理失败时保持素材不可上架并允许受控重试；不得把私有原文件地址作为回退值返回。Next.js 只触发/查询任务和保存元数据，不读取或处理图片正文。
- 文件大小、MIME 白名单和图片像素上限作为配置项实现；准确数值待 COS 方案确认，不改变本接口形状。

T011 当前实现说明：`ASSET_STORAGE_PROVIDER=local_test` 时，接口会明确返回 `mode=metadata_only` 和未接真实存储的说明，只验证浏览器提交的文件名、MIME、大小、SHA-256 与数据库状态，不接收文件正文。`uploadUrl` 是本地测试协议地址而非可访问的 COS 签名地址；暂存和最终内部定位从不返回给前端。上述 `processing-jobs/.../run` 路由只用于本地验收可替换处理适配器，T017 接入真实异步处理后应由任务系统消费而不是公开手动触发。

### 6.3 提交审核和认证上传费

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `POST /api/v1/uploader/assets/{assetId}/submit` | 素材所属上传者 | 无；要求 `Idempotency-Key` | 素材状态和独立的 `certificationFeeCharge`：`id`、`amountCents=1000`、`status=pending` | `ASSET_FILES_INCOMPLETE`、`PERSON_PROOF_REQUIRED`、`STATE_TRANSITION_INVALID` |
| `POST /api/v1/certification-fee-charges/{chargeId}/payments` | 费用所属上传者 | `provider: wechat_pay\|alipay`；要求 `Idempotency-Key` | `paymentId`、`paymentNo`、`status`、第三方拉起支付所需的非敏感 `paymentAction` | `PAYMENT_ALREADY_SUCCESS`、`UPSTREAM_UNAVAILABLE` |
| `GET /api/v1/certification-fee-charges/{chargeId}` | 费用所属上传者 | 无 | 费用金额、支付和退款状态；不含完整第三方流水 | `RESOURCE_NOT_FOUND` |

提交时创建或复用该素材的认证费记录。认证费支付成功回调后，素材才能进入 `pending_review`；客户端支付成功页面不能直接改变审核状态。

T011 已实现提交前校验：至少一个原文件、每个原文件的衍生任务均为 `ready`，人物素材另需至少一个 `person_proof`；物件/道具和场景可以提交私有 `supporting_proof`，但不作为提交前置。提交与重复请求使用 `Idempotency-Key` 复用同一认证费记录；本阶段只设置 `certificationStatus=pending_payment`，`reviewStatus` 继续保持 `draft`。前端提交成功后切换到独立待支付结果页，不会伪造支付成功或进入后台审核。

## 7. 管理员审核与认证

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `GET /api/v1/admin/assets` | 超级、运营 | 类型、审核/认证/上架状态、分页参数 | 后台素材列表；人物证明材料只返回“是否存在”，不直接返回文件地址 | `FORBIDDEN` |
| `GET /api/v1/admin/dashboard` | 超级、运营 | 无 | 待审核、认证中、认证异常和已上架数量 | `FORBIDDEN` |
| `GET /api/v1/admin/assets/{assetId}` | 超级、运营 | 无 | 素材、文件摘要、审核事件和认证记录 | `RESOURCE_NOT_FOUND` |
| `PATCH /api/v1/admin/assets/{assetId}` | 超级、运营 | `title?`、`description?`、`tags?`、`category?` | 更新后的素材基础信息；写入操作日志 | `VALIDATION_ERROR`、`FORBIDDEN` |
| `POST /api/v1/admin/assets/{assetId}/review` | 超级、运营 | `decision: approve\|reject`；驳回时必填 `reason` | 新审核状态、认证状态、`reviewedAt` | `STATE_TRANSITION_INVALID`、`VALIDATION_ERROR` |
| `POST /api/v1/admin/assets/{assetId}/listing` | 超级、运营 | `action: list\|delist`、可选 `reason` | 新上架状态、`listedAt` | `CERTIFICATE_REQUIRED`、`STATE_TRANSITION_INVALID` |
| `GET /api/v1/admin/certifications` | 超级、运营 | 状态、素材类型、分页参数 | 认证记录列表 | `FORBIDDEN` |
| `GET /api/v1/admin/certifications/{certificationId}` | 超级、运营 | 无 | 认证详情和证书文件摘要 | `RESOURCE_NOT_FOUND` |
| `POST /api/v1/admin/certifications/{certificationId}/file-uploads` | 超级、运营 | 与第 6.2 节相同，`fileType: certificate_file\|certificate_snapshot` | 管理员专用短期上传信息 | `UPLOAD_FILE_REJECTED` |
| `POST /api/v1/admin/certifications/{certificationId}/file-uploads/{uploadId}/complete` | 超级、运营 | 可选 `etag` | 经核验的证书文件 ID | `UPLOAD_INTENT_EXPIRED`、`UPLOAD_FILE_REJECTED` |
| `POST /api/v1/admin/certifications/{certificationId}/verify` | 超级、运营 | `status: certifying\|certified\|exception`、`governmentSiteName?`、`certificateNo?`、`certificateFileId?`、`snapshotFileId?`、`issuedAt?`、`notes?` | 更新后的认证记录 | `CERTIFICATE_REQUIRED`、`STATE_TRANSITION_INVALID` |
| `GET /api/v1/admin/files/{fileId}/view` | 超级、运营 | 无 | 校验文件用途后记录敏感文件访问，并 `302` 跳转到不超过 5 分钟的签名查看地址 | `RESOURCE_NOT_FOUND`、`FORBIDDEN` |
| `GET /api/v1/admin/audit-logs` | 超级、运营 | 动作、素材 ID | 最近 100 条脱敏操作日志 | `FORBIDDEN` |

该查看接口只用于审核所需的人物证明、认证证书和凭证；财务管理员、外部观察员和普通用户无权访问。响应不返回 object key，短期地址不得写日志或持久化，访问人、文件、素材、时间和 `requestId` 必须进入操作日志。

审核驳回时创建认证上传费退款请求；退款最终成功状态只能来自已验证的支付平台回调或主动查询结果，不能由前端或管理员任意写成成功。所有审核、上架、下架和认证操作必须写入审核事件或操作日志。

T012 实现状态：上述接口已由本地 PostgreSQL/Prisma 实现并通过 19/19 集成测试。证书上传和敏感文件查看在 `local_test` provider 下只验证元数据和 5 分钟 HMAC token，不读取或保存文件正文；`/local-view` 仅显示明确的本地测试说明。生产环境不得沿用该查看页，必须在 T017 替换为真实私有 COS 对象校验和短时签名地址。

## 8. 订单与支付

### 8.1 用户订单

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `POST /api/v1/orders` | 购买用户或上传者 | `assetIds[]`，1-50 个；要求 `Idempotency-Key` | 订单、订单明细价格快照和服务端计算的总额 | `ASSET_NOT_PURCHASABLE`、`ALREADY_AUTHORIZED`、`VALIDATION_ERROR` |
| `GET /api/v1/orders` | 已登录购买方 | 状态、分页参数 | 仅当前用户的订单列表 | `AUTH_REQUIRED` |
| `GET /api/v1/orders/{orderId}` | 订单购买方 | 无 | 订单、明细、支付摘要、授权生成状态 | `RESOURCE_NOT_FOUND` |
| `POST /api/v1/orders/{orderId}/cancel` | 订单购买方 | 无 | `status=cancelled` | `STATE_TRANSITION_INVALID` |
| `POST /api/v1/orders/{orderId}/payments` | 订单购买方 | `provider: wechat_pay\|alipay`；要求 `Idempotency-Key` | `paymentId`、`paymentNo`、`status=pending`、非敏感 `paymentAction` | `PAYMENT_ALREADY_SUCCESS`、`STATE_TRANSITION_INVALID`、`UPSTREAM_UNAVAILABLE` |
| `GET /api/v1/payments/{paymentId}` | 付款用户 | 无 | 支付用途、金额、平台、状态和时间；第三方流水号只返回掩码 | `RESOURCE_NOT_FOUND` |

创建订单时必须由服务端重新读取素材状态和价格，客户端不得提交或覆盖金额、认证状态、分成比例。订单明细保存成交快照；购物车页面显示的旧价格不能作为最终计费依据。

### 8.2 支付回调

| 方法与路径 | 调用方 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `POST /api/v1/webhooks/payments/wechat` | 微信支付 | 保留原始请求体和平台签名头 | 微信支付要求的确认响应 | `PAYMENT_SIGNATURE_INVALID`、`PAYMENT_AMOUNT_MISMATCH` |
| `POST /api/v1/webhooks/payments/alipay` | 支付宝 | 保留原始表单/请求体和平台签名字段 | 支付宝要求的确认响应 | `PAYMENT_SIGNATURE_INVALID`、`PAYMENT_AMOUNT_MISMATCH` |
| `POST /api/v1/webhooks/refunds/wechat` | 微信支付 | 退款通知原文和签名头 | 平台要求的确认响应 | `PAYMENT_SIGNATURE_INVALID` |
| `POST /api/v1/webhooks/refunds/alipay` | 支付宝 | 退款通知原文和签名字段 | 平台要求的确认响应 | `PAYMENT_SIGNATURE_INVALID` |

回调边界：

1. 必须基于原始请求体验签，并校验时间戳、随机串、商户号、平台订单号、金额和币种。
2. 使用第三方通知 ID 或“平台支付单号 + 第三方交易号 + 状态”做幂等去重。
3. 验签和金额校验通过后，在数据库事务中更新支付状态。
4. 素材购买支付成功时，在同一事务中更新订单、为每个订单明细创建一条授权、默认 365 天下载资格和收益记录；ZIP 可在事务提交后按不可变原文件清单生成，未就绪时下载接口返回处理中状态。
5. 认证上传费支付成功时，只更新 `certification_fee_charges` 和素材审核/认证状态，不创建购买订单收益。
6. 已处理的重复成功回调返回第三方要求的成功确认，不重复生成授权、下载入口或收益。
7. 回调日志只能保存必要摘要和哈希，不保存密钥、完整支付账户或完整原始敏感载荷。
8. 客户端轮询支付状态仅用于显示，不能代替回调验签和服务端状态变更。

## 9. 授权、下载与收益

### 9.1 授权和下载

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `GET /api/v1/authorizations` | 已登录购买方 | 状态、分页参数 | 当前用户的授权列表、素材摘要和下载入口状态 | `AUTH_REQUIRED` |
| `GET /api/v1/authorizations/{authorizationId}` | 授权所属用户 | 无 | 授权文本版本/快照、认证状态快照、状态、授予/撤销信息 | `RESOURCE_NOT_FOUND` |
| `POST /api/v1/authorizations/{authorizationId}/download-links` | 授权所属用户 | 无；可复用仍有效入口 | `downloadLinkId`、`format: zip`、`bundleStatus`、`expiresAt`、`status`；不返回 token 或 COS object key | `AUTHORIZATION_REVOKED`、`STATE_TRANSITION_INVALID` |
| `GET /api/v1/download-links/{downloadLinkId}/file` | 下载入口所属用户 | 无 | 校验后记录一次素材包下载并 `302` 跳转到不超过 10 分钟的 ZIP 签名 URL | `DOWNLOAD_LINK_EXPIRED`、`DOWNLOAD_LINK_REVOKED`、`AUTHORIZATION_REVOKED` |
| `GET /api/v1/downloads` | 已登录购买方 | 素材、时间、分页参数 | 当前用户下载记录；不返回历史 COS URL、token、IP 或 object key | `AUTH_REQUIRED` |

下载安全边界：

- 365 天的是平台下载资格，不是 365 天 COS URL。
- 下载入口以登录会话和资源归属校验为主，API 不返回原始 token。
- 每份素材的所有有效 `original` 文件按固定清单生成一个 ZIP；文件清单变化时生成新版本素材包，已成交授权继续按成交时/授权时快照规则交付，不能悄悄替换内容。
- 下载入口在 365 天内可重复使用，状态为 `active`、`expired` 或 `revoked`；一次成功下载不会把入口改成 `used`。
- 实际 COS 签名 URL 仅通过 `302 Location` 短时交付，不放入 JSON，不写访问日志查询字符串。
- 每次下载前重新校验用户、授权、入口状态、文件归属和有效期；跳转前或成功确认后写下载记录。
- 授权撤销或退款成功时，应同步撤销对应下载入口。

### 9.2 上传者收益

| 方法与路径 | 允许角色 | 请求 | 成功返回 | 主要错误 |
|---|---|---|---|---|
| `GET /api/v1/uploader/revenue` | 上传者 | 状态、时间范围、分页参数 | 仅当前上传者的收益记录和订单明细摘要 | `FORBIDDEN` |
| `GET /api/v1/uploader/revenue/summary` | 上传者 | `startAt?`、`endAt?` | 累计、周期内、已冲正和待结算金额；使用整数分 | `VALIDATION_ERROR` |

收益接口不返回购买者手机号、邮箱、支付账号、完整订单支付流水或其他上传者数据。

## 10. 管理后台接口

后台接口全部要求有效管理员角色；字段权限继续按角色裁剪。所有列表支持分页和必要筛选，不能通过前端传入 `role=super_admin` 等参数提升权限。

| 方法与路径 | 超级 | 运营 | 财务 | 说明 |
|---|:---:|:---:|:---:|---|
| `GET /api/v1/admin/dashboard` | 可 | 可 | 可 | 按角色返回待审核、订单、退款、收益等概览 |
| `GET /api/v1/admin/invite-codes` | 可 | 可 | 否 | 邀请码列表，code 默认掩码 |
| `POST /api/v1/admin/invite-codes` | 可 | 可 | 否 | 请求 `expiresAt?`、`note?`；返回一次完整 code，之后默认掩码 |
| `POST /api/v1/admin/invite-codes/{inviteId}/disable` | 可 | 可 | 否 | 只能禁用未使用的有效邀请码 |
| `GET /api/v1/admin/users` | 可 | 可 | 否 | 运营默认只看掩码联系方式 |
| `GET /api/v1/admin/users/{userId}` | 可 | 可 | 否 | 按角色裁剪敏感字段 |
| `PATCH /api/v1/admin/users/{userId}/roles` | 可 | 否 | 否 | 管理用户基础角色、后台角色和状态；禁止移除最后一个有效超级管理员 |
| `GET /api/v1/admin/orders` | 可 | 可 | 可 | 订单和明细；联系方式、第三方流水按角色掩码 |
| `GET /api/v1/admin/payments` | 可 | 可 | 可 | 运营只看非敏感摘要；财务可看对账所需字段 |
| `GET /api/v1/admin/refunds` | 可 | 否 | 可 | 退款记录 |
| `POST /api/v1/admin/refunds` | 可 | 否 | 可 | `paymentId`、`items: [{orderItemId, amountCents}]`、`reason`；认证费退款使用 `certificationFeeChargeId`；要求 `Idempotency-Key` |
| `POST /api/v1/admin/refunds/{refundId}/process` | 可 | 否 | 可 | 只允许 `submit\|retry\|cancel`，不能直接把状态写为成功 |
| `GET /api/v1/admin/authorizations` | 可 | 可 | 可 | 授权记录列表 |
| `POST /api/v1/admin/authorizations/{authorizationId}/revoke` | 可 | 否 | 否 | 特殊争议处理；必填 `reason`，自动撤销下载入口 |
| `GET /api/v1/admin/revenue` | 可 | 可 | 可 | 收益记录和冲正状态 |
| `GET /api/v1/admin/audit-logs` | 可 | 可 | 限财务相关 | 财务由服务端固定过滤财务操作类型 |
| `GET /api/v1/admin/settings` | 可 | 可 | 可 | 只返回业务配置，不返回任何密钥或第三方凭证 |
| `PATCH /api/v1/admin/settings` | 可 | 否 | 否 | 修改价格、认证费、分成和下载入口期限；记录旧值和新值 |
| `GET /api/v1/admin/observer-accounts` | 可 | 否 | 否 | 外部观察员账号列表 |
| `POST /api/v1/admin/observer-accounts` | 可 | 否 | 否 | 创建观察员资料并授予 `observer` 角色 |
| `PATCH /api/v1/admin/observer-accounts/{observerId}` | 可 | 否 | 否 | 修改合作方名称、状态和后续分成配置 |

第 7 节的素材审核、上架和认证接口也属于管理后台。关键后台修改必须记录 `actor_user_id`、动作、目标、必要差异摘要、时间和 `requestId`；日志不得保存密码、Cookie、CSRF token、COS 签名 URL 或支付密钥。

素材购买退款只能按完整订单明细退款：每个 `items[].amountCents` 必须等于该 `order_item` 尚未退款的完整成交金额，不允许对单个明细拆分金额。`refund.amount_cents` 必须等于所有退款明细之和。退款成功后的事务至少包括：更新退款和订单状态、按 `refund_items` 撤销授权与下载入口、创建收益冲正记录。订单中未退款的明细继续有效；客户端不得自行指定收益冲正金额。

## 11. 外部观察员只读接口

以下接口只允许有效 `observer` 角色访问，只读取 `platform_metric_snapshots`、`platform_asset_type_metric_snapshots` 和当前观察员自己的 `observer_share_records`。观察员不能通过这些接口读取订单、用户、支付、下载或素材文件明细。

通用查询参数：`periodType: day|week|month|custom`、`startAt?`、`endAt?`。当 `periodType=custom` 时，`startAt` 和 `endAt` 必填，结束时间不得早于开始时间，单次自定义区间最大跨度为一年。

| 方法与路径 | 成功返回 |
|---|---|
| `GET /api/v1/observer/dashboard` | 最新周期上传量、下载量、已支付订单金额、退款金额、净收益和当前观察员分成摘要 |
| `GET /api/v1/observer/platform-metrics` | 周期快照和趋势：上传、上架、审核、认证、订单、授权、下载和收益汇总 |
| `GET /api/v1/observer/assets-summary` | 人物、物件/道具、场景的上传、上架、认证和下载数量汇总 |
| `GET /api/v1/observer/downloads-summary` | 总下载、付费下载、按周期和类型的趋势汇总 |
| `GET /api/v1/observer/revenue-summary` | 订单总额、已支付金额、退款、净收益、平台和上传者分成汇总 |
| `GET /api/v1/observer/share-records` | 仅当前观察员的分成基数、比例、预计、已结算、待结算和状态；首版比例与金额为 0 |

强制限制：

- 只允许 `GET`，不存在观察员 `POST`、`PATCH`、`DELETE` 或导出接口。
- 不提供 CSV、Excel、PDF、批量下载、邮件导出或异步导出任务。
- 不返回用户 ID、手机号、邮箱、证件、支付账户、完整流水号、单笔订单、单笔授权、单次下载、IP、内部日志、COS 信息、原文件、证明材料或证书文件。
- `share-records` 由会话确定 `observer_profile_id`，不接受客户端指定其他合作方 ID。
- 即使管理员接口存在相同数据，观察员角色也不得访问 `/api/v1/admin/*`。
- 第一版 `shareRate`、`expectedShareAmountCents`、`settledShareAmountCents` 和 `pendingShareAmountCents` 均返回 0，但字段保留。

## 12. 状态流转与原子操作

### 12.1 素材与认证

```text
创建草稿
  -> 提交并创建认证费：certification=pending_payment
  -> 认证费支付成功：review=pending_review, certification=pending_review
  -> 初审驳回：review=rejected, certification=not_started，并发起原路退款
  -> 初审通过：review=approved, certification=certifying
  -> 证书核验通过：certification=certified
  -> 上架：listing=listed
  -> 运营下架：listing=delisted
```

上架操作必须在服务端同时检查 `review=approved`、`certification=certified`、证书编号、证书文件和必要素材文件。接口不得接受客户端直接传入任意状态值绕过流转。

### 12.2 购买支付成功

支付成功回调处理必须在一个事务中完成或整体回滚：

1. 锁定支付和订单并确认金额。
2. 把支付更新为 `success`，订单更新为 `paid`。
3. 为每个 `order_item` 创建唯一授权记录。
4. 为每个授权创建默认 365 天下载资格，并关联/排队生成该素材的 ZIP 下载包。
5. 为每个订单明细创建一条包含成交时 80% / 20% 比例及上传者、平台金额快照的收益记录。
6. 写入必要操作/业务事件，提交事务后再执行非关键通知。

数据库唯一约束和幂等逻辑必须保证一个 `order_item` 最多生成一条有效初始授权和一组初始收益记录。

### 12.3 退款成功

退款成功后按 `refund_items` 在事务中更新订单为 `refunded` 或 `partial_refunded`，撤销被完整退款订单明细对应的授权和下载入口，并创建反向收益记录。历史成交快照和原收益记录保留，不直接覆盖为零；不允许对单个订单明细做金额拆分退款。

## 13. 安全与隐私要求

- 请求体、查询参数和文件元数据必须做 schema 校验；数据库查询使用参数化方式。
- 登录、验证码、邀请码、上传签名、支付和下载接口设置按用户、IP 或设备摘要的频率限制。
- Cookie、CSRF token、支付密钥、COS 密钥、签名 URL、完整回调载荷和验证码不写普通日志。
- 敏感字段在日志、后台列表和错误详情中做掩码；外部观察员完全不可见。
- 支付回调保存原始请求体仅限验签所需的短生命周期处理；持久化只保存必要摘要。
- 水印预览文件/缩略图与原文件使用不同对象和权限，公开 CDN 只允许访问水印衍生图，不能通过替换路径参数访问原文件。
- Next.js 不代理、缓存、解码或处理图片文件正文；水印生成由异步处理 provider 完成，购买后只对通过授权校验的私有 ZIP 签发短时下载地址。
- 后台和观察员入口不是安全边界；所有权限必须在 API 服务端实施。
- 生产环境只使用 HTTPS，并设置合理的 CSP、HSTS、Cookie 和跨域策略；MVP 默认不开放跨站 API 调用。
- 不在 API 返回或源代码中暴露腾讯云、微信、支付宝、短信、邮件或数据库凭证。

## 14. 后续任务对应关系

| 后续任务 | 主要实现章节 |
|---|---|
| T009 用户注册登录和角色基础 | 第 2-4 节 |
| T010 素材浏览和详情页 | 第 5 节 |
| T011 上传者素材提交流程 | 第 6 节 |
| T012 后台审核和认证记录 | 第 7、10 节 |
| T012A 后台基础管理与现有入口补全 | 第 4-6、10、13 节 |
| T013 订单、支付测试流程和授权记录 | 第 8、12 节 |
| T014 ZIP 下载和收益记录 | 第 9、12 节 |
| T015 后台权限和外部观察员 | 第 10-11、13 节 |
| T016 全流程和无占位收口 | 第 2-13 节全部正式路由 |
| T017 生产 provider 和正式法律文本 | 第 2、4-13 节外部服务边界 |

## 15. 仍待确认但不阻塞接口结构

- 政府认证网站名称、跳转路径、证书样式和异常重提规则。
- 统一商业授权协议正式文本和首个版本号。
- 腾讯云 COS Bucket 名称、地域、权限策略、生命周期、精确文件大小和 MIME 白名单。
- 短信、邮件、微信登录、微信支付和支付宝的真实账号及 provider 配置。
- 超级管理员是否增加二次验证。
- 是否在 API 实现稳定后引入 Apifox；当前不需要提前增加工具。

上述项目使用 provider adapter 或配置项隔离，确认后补充配置和第三方字段，不应改变本文件的核心资源路径、角色边界、成功/错误结构和状态流转。
