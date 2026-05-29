import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cash Management App",
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
        <header className="app-header">
          <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            💸 CashFlow
          </div>
          <nav className="nav-links">
            <Link href="/" className="nav-link">ダッシュボード</Link>
            <Link href="/income" className="nav-link">収入</Link>
            <Link href="/expenses" className="nav-link">支出</Link>
            <Link href="/settings" className="nav-link" style={{ marginLeft: '1rem', color: 'var(--accent-color)' }}>
              ⚙️ 設定
            </Link>
          </nav>
        </header>
        <main className="container animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}
