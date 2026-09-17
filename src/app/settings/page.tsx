import type { Metadata } from "next";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Accent colour, direction colours, background and grid weight for the QuantPulse terminal.",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[860px] p-4 lg:p-6">
        <AppearanceSettings />
      </div>
    </AppShell>
  );
}
