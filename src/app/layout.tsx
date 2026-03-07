/**
 * 根布局
 */

import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "数据管理系统",
  description: "多租户网站数据管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
