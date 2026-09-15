import { cn } from "@/lib/utils";

/** Mark: a signal spike breaking a baseline. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="19" height="19" stroke="#2a3446" />
      <path d="M2.5 13.5h3l2-7 2.5 10 2-5h3" stroke="#ffb020" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
