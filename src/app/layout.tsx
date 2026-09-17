import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { InlineScript } from "@/components/inline-script";

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

/**
 * Applies the saved appearance before first paint.
 *
 * Has to be inline and synchronous: React cannot help here, because by the time
 * a component runs the browser has already painted the default theme and the
 * user sees it snap. Deliberately tiny, fully wrapped in try/catch, and it
 * silently does nothing when storage is unavailable — a themed page is not
 * worth risking a blank one.
 *
 * The key and attribute names mirror src/lib/appearance.ts; they are duplicated
 * rather than imported because this string runs before any bundle loads.
 */
const APPEARANCE_SCRIPT = `
try {
  var a = JSON.parse(localStorage.getItem("qp:appearance") || "{}");
  var d = document.documentElement.dataset;
  var pick = function (v, allowed, fallback) {
    return allowed.indexOf(v) === -1 ? fallback : v;
  };
  d.accent = pick(a.accent, ["amber","cyan","violet","lime","sky"], "amber");
  d.market = pick(a.market, ["classic","colorblind","inverted"], "classic");
  d.surface = pick(a.surface, ["midnight","ink","slate"], "midnight");
  d.grid = pick(a.grid, ["sharp","subtle","bold"], "sharp");
  if (a.texture === true) d.texture = "on";
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning because the script above sets data-* attributes
    // on this element before React hydrates. Without it React discards the DOM
    // and re-renders from the payload, which is exactly the flash the script
    // exists to prevent.
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={APPEARANCE_SCRIPT} />
      </head>
      <body className="min-h-dvh bg-base text-text antialiased">{children}</body>
    </html>
  );
}
