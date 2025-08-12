import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
    title: "Forex Backtester",
    description: "Train, backtest, and tune forex trading models",
    icons: {
        icon: "/favicon.png",
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen antialiased`}
      >
        <aside className="flex flex-col w-64 bg-slate-950 text-white min-h-screen border-r border-slate-700 shadow-lg z-20">
          <div className="h-20 flex items-center justify-center border-b border-slate-700">
            <span className="text-2xl font-bold tracking-tight">Forex Backtester</span>
          </div>
          <nav className="flex-1 px-6 py-4">
            <ul className="space-y-2">
              <li>
                <Link href="/" className="block px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium">
                  Config
                </Link>
              </li>
              <li>
                <Link href="/history" className="block px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium">
                  History
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-800 dark:bg-slate-800 p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
