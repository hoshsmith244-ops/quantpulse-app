import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QuantPulse — Backtest, signal, execute",
    template: "%s · QuantPulse",
  },
  description:
    "Backtest quantitative strategies against real market structure, then route the signals straight to your broker over a secure webhook. Sub-20ms execution.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-base text-text antialiased">
        {children}
      </body>
    </html>
  );
}
