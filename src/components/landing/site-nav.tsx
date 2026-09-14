"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#backtest", label: "Backtester" },
  { href: "#workflow", label: "Execution" },
  { href: "#pricing", label: "Pricing" },
  { href: "/dashboard", label: "Docs" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-line bg-base/85 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-6 px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-[22px]" />
          <span className="text-[15px] font-semibold tracking-tight text-bright">
            QuantPulse
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-raised hover:text-bright"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>

        <button
          className="rounded-md p-2 text-muted hover:bg-raised hover:text-bright md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-line bg-base px-5 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2 text-[13px] text-muted hover:bg-raised hover:text-bright"
            >
              {l.label}
            </Link>
          ))}
          <Button className="mt-2 w-full" size="sm" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
