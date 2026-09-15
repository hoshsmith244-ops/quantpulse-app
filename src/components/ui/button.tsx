import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border text-[12px] uppercase tracking-[0.08em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-amber disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-amber bg-amber text-black hover:bg-amber/85 hover:border-amber/85 font-medium",
        outline:
          "border-edge bg-transparent text-text hover:border-amber hover:text-amber",
        ghost:
          "border-transparent text-muted hover:text-bright hover:bg-raised",
        danger: "border-down bg-down/10 text-down hover:bg-down/20",
      },
      size: {
        sm: "h-7 px-2.5 [&_svg]:size-3",
        md: "h-8 px-3.5 [&_svg]:size-3.5",
        lg: "h-10 px-5 text-[13px] [&_svg]:size-4",
        icon: "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { Button, buttonVariants };
