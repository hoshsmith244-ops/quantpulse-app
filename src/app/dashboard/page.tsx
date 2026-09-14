import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";

import { BacktestWorkspace } from "@/components/backtest/workspace";
import { PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Backtesting workspace" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Backtesting workspace"
        description="Tune the strategy, watch the equity curve and trade log recompute, then promote the configuration to a live webhook signal."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download />
              Export report
            </Button>
            <Button size="sm">
              <Plus />
              New strategy
            </Button>
          </>
        }
      />
      <BacktestWorkspace />
    </>
  );
}
