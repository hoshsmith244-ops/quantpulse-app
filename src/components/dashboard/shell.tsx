"use client";

import { Bell, Menu, Search, X } from "lucide-react";
import * as React from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-base">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-y-0 left-0 w-[248px] animate-slide-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/60 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-bright lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>

      <div className="relative hidden min-w-0 max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
        <input
          placeholder="Search strategies, symbols, signals…"
          className="h-8 w-full rounded-md border border-line bg-raised pl-8 pr-14 text-[12px] text-bright outline-none transition-colors placeholder:text-faint hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <kbd className="tnum pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-base px-1.5 py-0.5 text-[10px] text-faint">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 md:flex">
          <span className="size-1.5 rounded-full bg-profit animate-pulse-dot" />
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
            Markets open
          </span>
        </span>

        <span className="tnum hidden text-[11px] text-dim lg:inline">
          NYSE 14:32:07 ET
        </span>

        <button
          className="relative rounded-md p-1.5 text-muted hover:bg-raised hover:text-bright"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-loss" />
        </button>

        <div className="flex size-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
          JT
        </div>
      </div>
    </header>
  );
}

/** Page header used inside each dashboard route. */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-line px-4 py-5 sm:flex-row sm:items-start sm:justify-between lg:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-bright">
            {title}
          </h1>
          {badge ? <Badge tone="accent">{badge}</Badge> : null}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export { X };
