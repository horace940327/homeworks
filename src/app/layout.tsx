import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "字旋戰陀｜Next.js MVP",
  description: "選字、寫字、評分、能力轉換與自動陀螺對戰的 Next.js MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
