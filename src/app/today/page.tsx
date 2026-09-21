import type { Metadata } from "next";

import { AppShell } from "@/components/shell/app-shell";
import { TodayView } from "@/components/today/today-view";

export const metadata: Metadata = {
  title: "Today's list",
  description:
    "The strategy and ticker pairs that survived every test in the latest scan — what entered recently, what is close to triggering, and what each one earned over simply holding.",
};

export default function TodayPage() {
  return (
    <AppShell>
      <TodayView />
    </AppShell>
  );
}
