import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE 卡片实验室｜Flex Message 生成器",
  description: "可视化编辑、实时预览并导出属于你的 LINE Flex Message 轮播卡片。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
