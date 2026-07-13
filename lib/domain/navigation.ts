export type RoutePriority = "P0" | "P1";

export type RouteDefinition = {
  title: string;
  href: string;
  description: string;
  priority: RoutePriority;
  roleEntry: string;
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
    roleEntry: "所有访客"
  },
  {
    title: "素材分类页",
    href: "/materials",
    description: "按人物、物件/道具、场景浏览素材，承接首页和导航的素材入口。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客"
  },
  {
    title: "搜索结果页",
    href: "/search",
    description: "展示关键词搜索、素材类型、认证状态和价格区间等筛选骨架。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客"
  },
  {
    title: "素材详情页",
    href: "/materials/demo-asset",
    description: "展示素材预览、价格、认证状态、购买入口和授权提示。",
    priority: "P0",
    roleEntry: "购买用户、上传者、访客",
    slug: "demo-asset"
  },
  {
    title: "登录页",
    href: "/login",
    description: "后续承接手机号、邮箱、微信组合登录。",
    priority: "P0",
    roleEntry: "所有用户"
  },
  {
    title: "注册页",
    href: "/register",
    description: "购买用户注册；上传者通过邀请码激活上传权限。",
    priority: "P0",
    roleEntry: "购买用户、上传者"
  },
  {
    title: "订单支付页",
    href: "/checkout",
    description: "展示订单素材、金额、支付方式和支付状态占位。",
    priority: "P0",
    roleEntry: "购买用户"
  }
];

export const accountRoutes: RouteDefinition[] = [
  {
    title: "个人中心首页",
    href: "/account",
    description: "购买用户和上传者的个人中心总入口。",
    priority: "P0",
    roleEntry: "购买用户、上传者"
  },
  {
    title: "我的购买",
    href: "/account/purchases",
    description: "查看订单和购买记录。",
    priority: "P0",
    roleEntry: "购买用户",
    slug: "purchases"
  },
  {
    title: "我的下载",
    href: "/account/downloads",
    description: "查看已购买素材和限时下载入口。",
    priority: "P0",
    roleEntry: "购买用户",
    slug: "downloads"
  },
  {
    title: "我的授权记录",
    href: "/account/licenses",
    description: "查看已购买素材对应的授权记录。",
    priority: "P0",
    roleEntry: "购买用户",
    slug: "licenses"
  },
  {
    title: "我的上传",
    href: "/account/uploads",
    description: "上传者查看自己提交的素材。",
    priority: "P0",
    roleEntry: "上传者",
    slug: "uploads"
  },
  {
    title: "素材审核状态",
    href: "/account/upload-status",
    description: "上传者查看素材审核、认证和上架状态。",
    priority: "P0",
    roleEntry: "上传者",
    slug: "upload-status"
  },
  {
    title: "收益记录",
    href: "/account/revenue",
    description: "上传者查看素材收益记录。",
    priority: "P0",
    roleEntry: "上传者",
    slug: "revenue"
  },
  {
    title: "上传者资料",
    href: "/account/uploader-profile",
    description: "上传者维护基础资料。",
    priority: "P1",
    roleEntry: "上传者",
    slug: "uploader-profile"
  }
];

export const uploaderRoutes: RouteDefinition[] = [
  {
    title: "认证上传页",
    href: "/upload",
    description: "上传人物、物件/道具、场景素材，提交证明材料和认证上传费流程占位。",
    priority: "P0",
    roleEntry: "上传者"
  },
  ...accountRoutes.filter((route) => route.roleEntry === "上传者")
];

export const adminRoutes: RouteDefinition[] = [
  {
    title: "后台首页",
    href: "/admin",
    description: "查看核心数据概览、待处理事项和后台导航。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员"
  },
  {
    title: "素材审核",
    href: "/admin/review",
    description: "审核上传素材，处理初审通过或驳回。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    slug: "review"
  },
  {
    title: "素材管理",
    href: "/admin/assets",
    description: "查看、上架、下架和维护素材基础信息。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    slug: "assets"
  },
  {
    title: "版权认证记录",
    href: "/admin/certifications",
    description: "录入或核验证书编号、凭证、认证状态和证书文件。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    slug: "certifications"
  },
  {
    title: "邀请码管理",
    href: "/admin/invitations",
    description: "创建、查看、禁用上传者邀请码。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    slug: "invitations"
  },
  {
    title: "用户管理",
    href: "/admin/users",
    description: "查看购买用户、上传者和后台账号。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员",
    slug: "users"
  },
  {
    title: "订单管理",
    href: "/admin/orders",
    description: "查看订单、订单明细和订单状态。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    slug: "orders"
  },
  {
    title: "支付记录",
    href: "/admin/payments",
    description: "查看支付和退款相关记录。",
    priority: "P0",
    roleEntry: "超级管理员、财务管理员",
    slug: "payments"
  },
  {
    title: "授权记录",
    href: "/admin/licenses",
    description: "查看用户购买后生成的授权记录。",
    priority: "P0",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    slug: "licenses"
  },
  {
    title: "收益记录",
    href: "/admin/revenue",
    description: "查看上传者收益、平台分成和后续结算字段。",
    priority: "P0",
    roleEntry: "超级管理员、财务管理员",
    slug: "revenue"
  },
  {
    title: "外部观察员账号管理",
    href: "/admin/observer-accounts",
    description: "创建和管理只读观察账号。",
    priority: "P1",
    roleEntry: "超级管理员",
    slug: "observer-accounts"
  },
  {
    title: "操作日志",
    href: "/admin/audit-logs",
    description: "查看后台关键操作记录。",
    priority: "P1",
    roleEntry: "超级管理员、运营管理员、财务管理员",
    slug: "audit-logs"
  },
  {
    title: "系统设置",
    href: "/admin/settings",
    description: "配置价格、认证上传费、分成比例等。",
    priority: "P1",
    roleEntry: "超级管理员",
    slug: "settings"
  }
];

export const observerRoutes: RouteDefinition[] = [
  {
    title: "外部观察员只读看板",
    href: "/observer",
    description: "合作方只读查看平台上传量、下载量、收益汇总和合作方分成字段，不允许导出。",
    priority: "P0",
    roleEntry: "外部观察员"
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
    routes: accountRoutes.filter((route) => route.roleEntry.includes("购买用户"))
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
    description: "合作方使用独立只读入口查看平台经营汇总和分成相关数据。",
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
    description: "合作方进入独立只读看板，只看平台经营汇总和合作方分成字段。"
  }
];

export const roleEntryRoutes = [...publicRoleEntryRoutes, ...internalEntryRoutes];

export const checkoutSteps = [
  "从素材详情选择购买",
  "登录或注册购买用户账号",
  "确认订单素材和金额",
  "选择微信支付或支付宝",
  "支付成功后生成授权记录和限时下载入口"
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
  "合作方预计分成",
  "已结算金额",
  "待结算金额"
];

export function findRouteBySlug(routes: RouteDefinition[], slug: string) {
  return routes.find((route) => route.slug === slug);
}
