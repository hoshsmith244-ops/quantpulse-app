"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Terminal" },
  { href: "/guide", label: "Guide" },
  { href: "/membership", label: "Membership" },
];

/** Thin top chrome. The tool gets the screen; navigation stays out of the way. */
export function AppShell({ children }: { children: React.ReactNode }) {
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

  return (
    <header className="flex h-11 shrink-0 items-center gap-5 border-b border-line bg-panel px-4">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="size-[18px]" />
        <span className="text-[13px] font-medium tracking-[0.02em] text-bright">
          QUANTPULSE
        </span>
      </Link>

      <nav className="flex items-center">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "border-b-2 px-3 py-[11px] text-[12px] uppercase tracking-[0.1em] transition-colors",
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

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="size-1.5 bg-up" />
          <span className="text-[10px] uppercase tracking-[0.12em] text-dim">
            Yahoo Finance
          </span>
        </span>
        <Link
          href="/membership"
          className="border border-edge px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-amber hover:text-amber"
        >
          Sign in
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
