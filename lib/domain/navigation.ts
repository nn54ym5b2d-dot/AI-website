export type RoutePriority = "P0" | "P1";
export type RouteAudience =
  | "public"
  | "buyer"
  | "uploader"
  | "super_admin"
  | "operator"
  | "finance"
  | "observer";

export type RouteDefinition = {
  title: string;
  href: string;
  description: string;
  priority: RoutePriority;
  roleEntry: string;
  audiences: RouteAudience[];
  slug?: string;
  notes?: string;
};

export type RouteGroup = {
  title: string;
  description: string;
  routes: RouteDefinition[];
};

export const primaryNavItems = [
  { href: "/", label: "首页" },
  { href: "/materials", label: "素材" },
  { href: "/upload", label: "上传者" },
  { href: "/account", label: "个人中心" }
];

export const publicRoutes: RouteDefinition[] = [
  {
    title: "首页",
    href: "/",
    description: "展示平台定位、素材入口、推荐分类、搜索入口和角色入口。",
    priority: "P0",
    roleEntry: "所有访客",
    audiences: ["public"]
  },
  {
    title: "素材分类页",
    href: "/materials",
    description: "按人物、物件/道具、场景浏览素材，承接首页和导航的素材入口。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客",
    audiences: ["public", "buyer", "uploader"]
  },
  {
    title: "搜索结果页",
    href: "/search",
    description: "展示关键词搜索、素材类型、价格区间、上架时间和排序等筛选骨架。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客",
    audiences: ["public", "buyer", "uploader"]
  },
  {
    title: "素材详情页",
    href: "/materials/demo-asset",
    description: "展示素材预览、价格、认证状态、购买入口和授权提示。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客",
    audiences: ["public", "buyer", "uploader"],
    slug: "demo-asset"
  },
  {
    title: "登录/注册页",
    href: "/login",
    description: "统一认证入口；手机号与微信位于顶部，邮箱作为下方辅助方式。",
    priority: "P0",
    roleEntry: "所有用户",
    audiences: ["public"]
  },
  {
    title: "旧注册链接",
    href: "/register",
    description: "兼容旧链接并安全转向统一登录/注册页。",
    priority: "P1",
    roleEntry: "购买用户、上传者",
    audiences: ["public", "buyer", "uploader"]
  },
  {
    title: "订单支付页",
    href: "/checkout",
    description: "展示订单素材、金额、支付方式和支付状态占位。",
    priority: "P0",
    roleEntry: "购买用户",
    audiences: ["buyer"]
  }
];

export const accountRoutes: RouteDefinition[] = [
  {
    title: "个人中心首页",
    href: "/account",
    description: "购买用户和上传者的个人中心总入口。",
    priority: "P0",
    roleEntry: "购买用户、上传者",
    audiences: ["buyer", "uploader"]
  },
  {
    title: "我的购买",
    href: "/account/purchases",
    description: "查看订单和购买记录。",
    priority: "P0",
    roleEntry: "购买用户",
    audiences: ["buyer"],
    slug: "purchases"
  },
  {
    title: "我的下载",
    href: "/account/downloads",
    description: "查看已购买素材和默认有效 365 天的下载入口。",
    priority: "P0",
    roleEntry: "购买用户",
    audiences: ["buyer"],
    slug: "downloads"
  },
  {
    title: "我的授权记录",
    href: "/account/licenses",
    description: "查看已购买素材对应的授权记录。",
    priority: "P0",
    roleEntry: "购买用户",
    audiences: ["buyer"],
    slug: "licenses"
  },
  {
    title: "我的上传",
    href: "/account/uploads",
    description: "上传者查看自己提交的素材。",
    priority: "P0",
    roleEntry: "上传者",
    audiences: ["uploader"],
    slug: "uploads"
  },
  {
    title: "素材审核状态",
    href: "/account/upload-status",
    description: "上传者查看素材审核、认证和上架状态。",
    priority: "P0",
    roleEntry: "上传者",
    audiences: ["uploader"],
    slug: "upload-status"
  },
  {
    title: "收益记录",
    href: "/account/revenue",
    description: "上传者查看素材收益记录。",
    priority: "P0",
    roleEntry: "上传者",
    audiences: ["uploader"],
    slug: "revenue"
  },
  {
    title: "上传者资料",
    href: "/account/uploader-profile",
    description: "上传者维护基础资料。",
    priority: "P1",
    roleEntry: "上传者",
    audiences: ["uploader"],
    slug: "uploader-profile"
  }
];

export const uploaderRoutes: RouteDefinition[] = [
  {
    title: "认证上传页",
    href: "/upload",
    description: "上传人物、物件/道具、场景素材；仅人物提交必要证明材料，并进入认证上传费流程。",
    priority: "P0",
    roleEntry: "上传者",
    audiences: ["uploader"]
  },
  ...accountRoutes.filter((route) => route.audiences.includes("uploader"))
];

export const adminRoutes: RouteDefinition[] = [
  {
    title: "后台首页",
    href: "/admin",
    description: "查看核心数据概览、待处理事项和后台导航。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    audiences: ["super_admin", "operator", "finance"]
  },
  {
    title: "素材审核",
    href: "/admin/review",
    description: "审核上传素材，处理初审通过或驳回。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    audiences: ["super_admin", "operator"],
    slug: "review"
  },
  {
    title: "素材管理",
    href: "/admin/assets",
    description: "查看、上架、下架和维护素材基础信息。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    audiences: ["super_admin", "operator"],
    slug: "assets"
  },
  {
    title: "版权认证记录",
    href: "/admin/certifications",
    description: "录入或核验证书编号、凭证、认证状态和证书文件。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    audiences: ["super_admin", "operator"],
    slug: "certifications"
  },
  {
    title: "邀请码管理",
    href: "/admin/invitations",
    description: "创建、查看、禁用上传者邀请码。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    audiences: ["super_admin", "operator"],
    slug: "invitations"
  },
  {
    title: "用户管理",
    href: "/admin/users",
    description: "查看购买用户、上传者和后台账号。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    audiences: ["super_admin", "operator"],
    slug: "users"
  },
  {
    title: "订单管理",
    href: "/admin/orders",
    description: "查看订单、订单明细和订单状态。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    audiences: ["super_admin", "operator", "finance"],
    slug: "orders"
  },
  {
    title: "支付记录",
    href: "/admin/payments",
    description: "查看支付和退款相关记录。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员（只读）、财务管理员",
    audiences: ["super_admin", "operator", "finance"],
    slug: "payments"
  },
  {
    title: "授权记录",
    href: "/admin/licenses",
    description: "查看用户购买后生成的授权记录。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    audiences: ["super_admin", "operator", "finance"],
    slug: "licenses"
  },
  {
    title: "收益记录",
    href: "/admin/revenue",
    description: "查看上传者 80%、平台 20% 的首版收益记录和后续结算字段。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员（只读）、财务管理员",
    audiences: ["super_admin", "operator", "finance"],
    slug: "revenue"
  },
  {
    title: "外部观察员账号管理",
    href: "/admin/observer-accounts",
    description: "创建和管理只读观察账号。",
    priority: "P1",
    roleEntry: "超级管理员",
    audiences: ["super_admin"],
    slug: "observer-accounts"
  },
  {
    title: "操作日志",
    href: "/admin/audit-logs",
    description: "查看后台关键操作记录。",
    priority: "P1",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    audiences: ["super_admin", "operator", "finance"],
    slug: "audit-logs"
  },
  {
    title: "系统设置",
    href: "/admin/settings",
    description: "配置价格、认证上传费、分成比例等。",
    priority: "P1",
    roleEntry: "超级管理员可修改；运营和财务只读",
    audiences: ["super_admin", "operator", "finance"],
    slug: "settings"
  }
];

export const observerRoutes: RouteDefinition[] = [
  {
    title: "外部观察员只读看板",
    href: "/observer",
    description: "合作方只读查看平台上传量、下载量、收益汇总和合作方分成字段；首版分成比例为 0，不允许导出。",
    priority: "P0",
    roleEntry: "外部观察员",
    audiences: ["observer"]
  }
];

export const publicPageRouteGroups: RouteGroup[] = [
  {
    title: "前台浏览与交易入口",
    description: "访客和购买用户从这里浏览、搜索、查看详情、登录注册和进入订单支付。",
    routes: publicRoutes
  },
  {
    title: "购买用户个人中心",
    description: "购买用户查看订单、下载和授权记录。",
    routes: accountRoutes.filter((route) => route.audiences.includes("buyer"))
  },
  {
    title: "上传者中心",
    description: "上传者从上传入口提交素材，并在个人中心查看上传、审核状态和收益。",
    routes: uploaderRoutes
  }
];

export const internalPageRouteGroups: RouteGroup[] = [
  {
    title: "管理后台",
    description: "超级管理员、运营管理员和财务管理员按权限进入后台模块。",
    routes: adminRoutes
  },
  {
    title: "外部观察员后台",
    description: "合作方使用独立只读入口查看平台经营汇总和分成字段，首版分成比例为 0。",
    routes: observerRoutes
  }
];

export const pageRouteGroups: RouteGroup[] = [...publicPageRouteGroups, ...internalPageRouteGroups];

export const publicRoleEntryRoutes = [
  {
    role: "访客",
    href: "/materials",
    entry: "首页导航的“素材”",
    description: "可浏览分类、搜索、查看素材详情；购买前需要登录。"
  },
  {
    role: "购买用户",
    href: "/account",
    entry: "首页 CTA、顶部“个人中心”",
    description: "可查看购买、下载、授权记录，并从素材详情进入订单支付。"
  },
  {
    role: "上传者",
    href: "/upload",
    entry: "顶部“上传者”",
    description: "通过邀请码激活后进入认证上传，再到个人中心查看审核和收益。"
  }
];

export const internalEntryRoutes = [
  {
    role: "管理员",
    href: "/admin",
    entry: "页面底部内部入口",
    description: "超级管理员、运营管理员、财务管理员进入同一后台，再按权限显示模块。"
  },
  {
    role: "外部观察员",
    href: "/observer",
    entry: "页面底部内部入口",
    description: "合作方进入独立只读看板，只看平台经营汇总和合作方分成字段；首版比例为 0。"
  }
];

export const roleEntryRoutes = [...publicRoleEntryRoutes, ...internalEntryRoutes];

export const checkoutSteps = [
  "从素材详情选择购买",
  "登录或注册购买用户账号",
  "确认订单素材和金额",
  "选择微信支付或支付宝",
  "支付成功后生成永久授权记录和默认有效 365 天的下载入口"
];

export const uploadSteps = [
  "邀请码激活上传者身份",
  "选择人物、物件/道具或场景素材",
  "填写素材名称和类型，说明可选填",
  "上传原文件、预览图、缩略图；人物素材补充必要证明材料",
  "支付认证上传费并等待平台初审",
  "初审通过后跳转政府认证，平台保存证书文件和认证信息"
];

export const observerMetrics = [
  "统计周期",
  "总上传素材数",
  "已上架素材数",
  "已认证素材数",
  "总下载次数",
  "平台订单总额",
  "退款金额",
  "净收益",
  "合作方分成基数",
  "合作方分成比例（首版 0%）",
  "合作方预计分成（首版 0 元）",
  "已结算金额（首版 0 元）",
  "待结算金额（首版 0 元）"
];

export function findRouteBySlug(routes: RouteDefinition[], slug: string) {
  return routes.find((route) => route.slug === slug);
}

export function routesForAudience(routes: RouteDefinition[], audience: RouteAudience) {
  return routes.filter((route) => route.audiences.includes(audience));
}
