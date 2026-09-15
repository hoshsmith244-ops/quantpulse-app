import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans-src",
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
    default: "QuantPulse — find alpha in market data",
    template: "%s · QuantPulse",
  },
  description:
    "Test whether a trading signal actually predicts the next move. Real quant factor research — information coefficient, decay and quintile analysis — on live Yahoo Finance data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-base text-text antialiased">{children}</body>
    </html>
  );
}
