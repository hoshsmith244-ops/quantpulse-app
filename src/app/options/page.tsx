import type { Metadata } from "next";

import { OptionsView } from "@/components/options/options-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Options",
  description:
    "Buying calls and puts: whether options on a stock are expensive today, the move the price already assumes, every strike's breakeven and odds, and the payoff at expiry.",
};

export default function OptionsPage() {
  return (
    <AppShell>
      <OptionsView />
    </AppShell>
  );
}
