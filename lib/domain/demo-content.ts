/** @deprecated T009A 视觉原型留档；T010 公开页面必须使用 /api/v1/assets。 */
export type DemoAsset = {
  id: string;
  title: string;
  category: "人物" | "物件/道具" | "场景";
  price: number;
  image: string;
  alternateImages?: string[];
  aspect: "4:3";
  certified: boolean;
  creator: string;
  tags: string[];
  summary: string;
};

export const demoAssets: DemoAsset[] = [
  {
    id: "YSK-P-000128",
    title: "都市青年｜自然光人物参考",
    category: "人物",
    price: 50,
    image: "/material-previews/3fe3a4b6-61f1-4a10-a923-4d2c3a310001.png",
    alternateImages: ["/material-previews/79bc2d1e-1e54-4f53-8eaa-78c6a60f0002.png"],
    aspect: "4:3",
    certified: true,
    creator: "示例上传者 · 青隅",
    tags: ["青年", "自然光", "都市", "写实"],
    summary: "适用于 AI 视频、短剧广告与游戏概念设计的人物视觉参考。"
  },
  {
    id: "YSK-O-000067",
    title: "复古金属台灯｜工业质感",
    category: "物件/道具",
    price: 10,
    image: "/material-previews/a6e9c4f1-d1a8-4cee-966b-8f39c49a0003.png",
    aspect: "4:3",
    certified: true,
    creator: "示例上传者 · 木相",
    tags: ["台灯", "金属", "复古", "室内"],
    summary: "带真实磨损细节的工业风桌面道具素材。"
  },
  {
    id: "YSK-S-000214",
    title: "废弃厂房｜阴天工业场景",
    category: "场景",
    price: 50,
    image: "/material-previews/e8b2c7d5-bd34-46ad-a174-24fa474d0004.png",
    aspect: "4:3",
    certified: true,
    creator: "示例上传者 · 灰域",
    tags: ["厂房", "工业", "阴天", "废墟"],
    summary: "适用于末世、悬疑与工业题材的环境设计参考。"
  }
];

export const demoAsset = demoAssets[0];
