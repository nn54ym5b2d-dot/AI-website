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
    image: "/demo-assets/urban-young-man.png",
    alternateImages: ["/demo-assets/urban-young-man-side.png"],
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
    image: "/demo-assets/vintage-metal-lamp.png",
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
    image: "/demo-assets/abandoned-factory.png",
    aspect: "4:3",
    certified: true,
    creator: "示例上传者 · 灰域",
    tags: ["厂房", "工业", "阴天", "废墟"],
    summary: "适用于末世、悬疑与工业题材的环境设计参考。"
  }
];

export const demoAsset = demoAssets[0];
