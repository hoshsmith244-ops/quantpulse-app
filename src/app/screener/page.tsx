import type { Metadata } from "next";

import { ScreenerView } from "@/components/screener/screener-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Screener — QuantPulse",
  description:
    "Every strategy tested against every ticker, filtered by sector, market cap and P/E. Find where an edge might exist before you go looking.",
};

export default function ScreenerPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1280px] p-4 lg:p-6">
        <ScreenerView />
      </div>
    </AppShell>
  );
}
