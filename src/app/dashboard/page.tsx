import type { Metadata } from "next";

import { Workspace } from "@/components/terminal/workspace";

export const metadata: Metadata = { title: "Alpha terminal" };

export default function TerminalPage() {
  return <Workspace />;
}
