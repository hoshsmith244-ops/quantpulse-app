"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/shell/notification-bell";
import { useAccount } from "@/lib/use-account";
import { useSignalWatch } from "@/lib/use-signal-watch";
import { useSyncPush } from "@/lib/use-sync-push";
import { cn } from "@/lib/utils";

/**
 * The four places you actually work.
 *
 * Guide and Membership were here too, and both already had a second entrance —
 * Guide sits in the status bar, Membership is the button on the right. Listing
 * them twice cost a third of the navigation to say nothing new, and pushed the
 * things you open daily further apart.
 */
const NAV = [
  { href: "/today", label: "Today" },
  { href: "/dashboard", label: "Terminal" },
  { href: "/screener", label: "Screener" },
  { href: "/watchlist", label: "Watchlist" },
];

/** Thin top chrome. The tool gets the screen; navigation stays out of the way. */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Keeps the bell meaningful on every page, not just the watchlist.
  useSignalWatch();
  // Keeps the synced copy current on every page, not just the account panel.
  // No-op when sync is unconfigured or nobody is signed in.
  const { session } = useAccount();
  useSyncPush(session?.user.id ?? null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <TopBar />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const { session, email } = useAccount();

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 sm:gap-5 sm:px-4">
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <Logo className="size-[18px]" />
        {/* The wordmark is the first thing to go when space is tight. */}
        <span className="hidden text-[13px] font-medium tracking-[0.02em] text-bright sm:inline">
          QUANTPULSE
        </span>
      </Link>

      <nav className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "shrink-0 border-b-2 px-2.5 py-[11px] text-[12px] uppercase tracking-[0.1em] transition-colors sm:px-3",
                active
                  ? "border-amber text-amber"
                  : "border-transparent text-dim hover:text-bright",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NotificationBell />
        {/* Icon rather than a nav item: appearance is something you set once. */}
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className={cn(
            "flex size-7 items-center justify-center border transition-colors",
            pathname === "/settings"
              ? "border-amber text-amber"
              : "border-transparent text-dim hover:border-edge hover:text-bright",
          )}
        >
          <Settings className="size-3.5" />
        </Link>
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="size-1.5 bg-up" />
          <span className="text-[10px] uppercase tracking-[0.12em] text-dim">
            Yahoo Finance
          </span>
        </span>
        {/*
          Said "Sign in" whether or not you were, which is both wrong and the
          only place the shell could have told you which account it is syncing
          to. The email is truncated rather than dropped: on a tool that emails
          you trade instructions, "which address" is worth a glance.
        */}
        <Link
          href="/membership"
          title={session ? `Signed in as ${email}` : "Sign in to sync across devices"}
          className={cn(
            "max-w-[11rem] truncate border px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] transition-colors",
            session
              ? "border-up/40 text-up hover:border-up"
              : "border-edge text-muted hover:border-amber hover:text-amber",
          )}
        >
          {session ? (email ?? "Account") : "Sign in"}
        </Link>
      </div>
    </header>
  );
}

function StatusBar() {
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-line bg-panel px-4 text-[10px] uppercase tracking-[0.12em] text-faint">
      <span>Daily bars · 3Y window</span>
      <span className="hidden sm:inline">Research tool — not investment advice</span>
      <Link href="/guide" className="ml-auto hover:text-amber">
        Guide
      </Link>
    </footer>
  );
}
