import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE 卡片生成器｜Flex Message 生成器",
  description: "視覺化編輯、即時預覽並匯出屬於你的 LINE Flex Message 輪播卡片。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
