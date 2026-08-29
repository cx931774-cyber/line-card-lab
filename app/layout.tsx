import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://linkasmnd.it.com"),
  title: "LINE 卡片生成器｜線上製作 LINE Flex Message 卡片",
  description: "線上選擇樣板、即時編輯與預覽 LINE 卡片，製作屬於你的 LINE Flex Message 輪播卡片。",
  keywords: ["LINE 卡片", "LINE 卡片生成器", "LINE Flex Message", "LINE 輪播卡片"],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "LINE 卡片生成器",
    title: "LINE 卡片生成器｜線上製作 LINE Flex Message 卡片",
    description: "線上選擇樣板、即時編輯與預覽 LINE 卡片，製作屬於你的 LINE Flex Message 輪播卡片。",
    locale: "zh_TW",
  },
  icons: {
    icon: [{ url: "/line-brand-icon.png", type: "image/png" }],
    apple: [{ url: "/line-brand-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
