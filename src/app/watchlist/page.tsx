import type { Metadata } from "next";

import { AppShell } from "@/components/shell/app-shell";
import { WatchlistView } from "@/components/watchlist/watchlist-view";

export const metadata: Metadata = {
  title: "Watchlist",
  description:
    "Scan your tickers in one pass — which are signalling now, and which of those signals has evidence behind it.",
};

export default function WatchlistPage() {
  return (
    <AppShell>
      <WatchlistView />
    </AppShell>
  );
}
