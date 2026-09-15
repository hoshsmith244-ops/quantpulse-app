import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "tnum h-8 w-full border border-edge bg-base px-2.5 text-[13px] text-bright outline-none transition-colors",
        "placeholder:text-faint hover:border-dim focus-visible:border-amber",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
