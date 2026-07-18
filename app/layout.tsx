import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "源素库｜可信赖的 AI 创作素材市场",
    template: "%s｜源素库"
  },
  description: "面向 AI 视频、游戏与虚拟内容制作方的认证数字素材市场。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
