import type { AdminSection, AssetTypeSummary, CoreModule, RoleSummary } from "@/types/domain";

export const coreModules: CoreModule[] = [
  {
    name: "素材浏览",
    description: "首页、分类、搜索、筛选和素材详情。"
  },
  {
    name: "认证上传",
    description: "图片素材上传、认证上传费、初审、政府认证记录和证书保存。"
  },
  {
    name: "购买授权",
    description: "多素材订单、微信支付/支付宝、永久授权记录和默认 365 天 ZIP 下载入口。"
  },
  {
    name: "后台管理",
    description: "素材审核、认证核验、收益记录、权限控制和外部观察员看板。"
  }
];

export const roleSummaries: RoleSummary[] = [
  {
    name: "购买用户",
    description: "浏览、购买、下载已购素材并查看授权记录。"
  },
  {
    name: "上传者",
    description: "通过邀请码激活后上传素材，并查看审核状态和收益记录。"
  },
  {
    name: "管理员",
    description: "处理审核、认证、订单、支付、收益和系统设置。"
  },
  {
    name: "外部观察员",
    description: "只读查看上传量、下载量、收益汇总和合作方分成字段；首版分成比例为 0。"
  }
];

export const assetTypes: AssetTypeSummary[] = [
  {
    name: "人物素材",
    rule: "需要必要证明材料，并获得认证证书后才能上架。"
  },
  {
    name: "物件/道具素材",
    rule: "不强制必要证明材料，但必须获得认证证书后才能上架。"
  },
  {
    name: "场景素材",
    rule: "不强制必要证明材料，但必须获得认证证书后才能上架。"
  }
];

export const adminSections: AdminSection[] = [
  {
    name: "素材审核",
    description: "审核上传素材，处理通过、驳回、上架和下架。",
    priority: "P0"
  },
  {
    name: "认证记录",
    description: "录入证书编号、凭证、认证状态，并保存认证证书文件。",
    priority: "P0"
  },
  {
    name: "订单支付",
    description: "查看订单、支付、退款和授权生成状态。",
    priority: "P0"
  },
  {
    name: "收益记录",
    description: "查看上传者收益、平台收益和后续结算扩展字段。",
    priority: "P0"
  },
  {
    name: "外部观察员看板",
    description: "只读展示上传量、下载量、净收益和合作方分成字段；首版比例为 0。",
    priority: "P0"
  },
  {
    name: "操作日志",
    description: "记录关键后台操作，支撑审计和问题追踪。",
    priority: "P1"
  }
];
