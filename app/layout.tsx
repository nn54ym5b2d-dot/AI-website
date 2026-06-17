import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "源素库",
  description: "AI 数字素材交易平台 MVP"
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
