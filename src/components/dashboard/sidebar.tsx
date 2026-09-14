"use client";

import {
  ChevronsUpDown,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/backtester", label: "Backtester", icon: FlaskConical },
  { href: "/dashboard/webhooks", label: "Webhook Signals", icon: Webhook, badge: "LIVE" },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-[22px]" />
          <span className="text-[14px] font-semibold tracking-tight text-bright">
            QuantPulse
          </span>
        </Link>
      </div>

      {/* Account switcher */}
      <button className="mx-3 mt-3 flex items-center gap-2.5 rounded-md border border-line bg-raised px-2.5 py-2 text-left transition-colors hover:border-line-strong">
        <span className="flex size-7 shrink-0 items-center justify-center rounded bg-accent/15 text-[11px] font-semibold text-accent">
          AC
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-bright">
            Alpaca · Paper
          </span>
          <span className="tnum block truncate text-[10px] text-dim">
            $104,318.22
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-dim" />
      </button>

      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-raised text-bright"
                  : "text-muted hover:bg-raised/60 hover:text-bright",
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-accent" : "text-dim group-hover:text-muted",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.1em] text-profit">
                  <span className="size-1 rounded-full bg-profit animate-pulse-dot" />
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        <Link
          href="/dashboard/webhooks"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-raised/60 hover:text-bright"
        >
          <LifeBuoy className="size-4 shrink-0 text-dim" />
          Documentation
        </Link>

        <div className="rounded-md border border-line bg-raised p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-bright">
              Basic plan
            </span>
            <span className="tnum text-[10px] text-dim">412 / 500</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full w-[82%] rounded-full bg-accent" />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-dim">
            Backtests this month. Upgrade for unlimited webhook triggers.
          </p>
          <Link
            href="/#pricing"
            className="mt-2.5 block rounded bg-accent px-2 py-1.5 text-center text-[11px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
