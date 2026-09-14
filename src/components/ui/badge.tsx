import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] leading-none",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-muted",
        profit: "border-profit/30 bg-profit/10 text-profit",
        loss: "border-loss/30 bg-loss/10 text-loss",
        accent: "border-accent/30 bg-accent/10 text-accent",
        warn: "border-warn/30 bg-warn/10 text-warn",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
