import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-line bg-raised px-3 text-[13px] text-bright outline-none transition-colors",
        "placeholder:text-faint",
        "hover:border-line-strong focus-visible:border-accent/70 focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Input with a fixed leading or trailing affix, e.g. $ or %. */
function AffixInput({
  prefix,
  suffix,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="group relative flex h-9 items-center rounded-md border border-line bg-raised transition-colors focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/25 hover:border-line-strong">
      {prefix ? (
        <span className="tnum pl-3 pr-1 text-[13px] text-dim">{prefix}</span>
      ) : null}
      <input
        className={cn(
          "tnum h-full w-full bg-transparent text-[13px] text-bright outline-none placeholder:text-faint",
          prefix ? "pl-0" : "pl-3",
          suffix ? "pr-1" : "pr-3",
          className,
        )}
        {...props}
      />
      {suffix ? (
        <span className="tnum pr-3 text-[13px] text-dim">{suffix}</span>
      ) : null}
    </div>
  );
}

export { Input, AffixInput };
