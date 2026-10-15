import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SooVers | آکادمی کنترل صنعتی",
  description: "آموزش تعاملی کنترل صنعتی، فرایند، اندازه‌گیری و شواهد OT.",
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
