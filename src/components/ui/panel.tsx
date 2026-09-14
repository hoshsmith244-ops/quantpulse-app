import * as React from "react";

import { cn } from "@/lib/utils";

/** The base container for every dense data surface in the app. */
function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-[13px] font-medium tracking-tight text-bright",
        className,
      )}
      {...props}
    />
  );
}

/** Small uppercase label used above metrics and in table headers. */
function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.14em] text-dim",
        className,
      )}
      {...props}
    />
  );
}

function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export { Panel, PanelHeader, PanelTitle, PanelBody, Eyebrow };
