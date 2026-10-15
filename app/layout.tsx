import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SooVers | جهان در حال شکل‌گیری",
  description: "SooVers؛ دموی تعاملی لابی و طبقهٔ آموزش امنیت سایبری، با کلاس، تخته و تمرین‌های سه‌بعدی.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
