import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "@/components/Providers";
import HeaderAuth from "@/components/HeaderAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CashFlow",
  description: "個人事業主向け収支管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers>
          <header className="app-header">
            <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              📊 CashFlow
            </div>
            <nav className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
              <Link href="/" className="nav-link">ダッシュボード</Link>
              <Link href="/income" className="nav-link">収入</Link>
              <Link href="/expenses" className="nav-link">支出</Link>
              <Link href="/ledger" className="nav-link">元帳</Link>
              <Link href="/reports" className="nav-link">決算書</Link>
              <Link href="/settings" className="nav-link">設定</Link>
              <HeaderAuth />
            </nav>
          </header>
          <main className="container animate-fade-in">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
