import { cn } from "@/lib/utils";

/** Mark: a pulse traced through a rising channel. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="22.5"
        rx="5.25"
        fill="#0f1521"
        stroke="#2b3a52"
        strokeWidth="1.5"
      />
      <path
        d="M4 15.5L7.75 15.5L9.75 8.5L12.5 18L15 12.5L16.75 12.5"
        stroke="#10b981"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.25" cy="12.5" r="1.9" fill="#3b82f6" />
    </svg>
  );
}
