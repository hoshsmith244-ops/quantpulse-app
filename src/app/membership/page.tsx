import { Check, Lock, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Membership",
  description: "QuantPulse membership tiers and account access.",
};

const TIERS = [
  {
    name: "Open",
    price: "Free",
    per: "",
    blurb: "The full terminal on daily bars. No account needed.",
    cta: "Currently active",
    featured: false,
    features: [
      { label: "All five factors", on: true },
      { label: "Any Yahoo Finance ticker", on: true },
      { label: "3 years of daily history", on: true },
      { label: "IC, decay and quintile analysis", on: true },
      { label: "Saved studies", on: false },
      { label: "Multi-ticker factor scan", on: false },
      { label: "Export to CSV", on: false },
    ],
  },
  {
    name: "Researcher",
    price: "$19",
    per: "/mo",
    blurb: "For working through a watchlist rather than one name at a time.",
    cta: "Join waitlist",
    featured: true,
    features: [
      { label: "Everything in Open", on: true },
      { label: "Saved studies and notebooks", on: true },
      { label: "Scan a factor across 50 tickers", on: true },
      { label: "10 years of history", on: true },
      { label: "Export results to CSV", on: true },
      { label: "Custom factor builder", on: false },
      { label: "Weekly factor digest", on: false },
    ],
  },
  {
    name: "Quant",
    price: "$49",
    per: "/mo",
    blurb: "Build and combine your own factors, not just the library.",
    cta: "Join waitlist",
    featured: false,
    features: [
      { label: "Everything in Researcher", on: true },
      { label: "Custom factor builder", on: true },
      { label: "Multi-factor combination and weighting", on: true },
      { label: "Cross-sectional universe ranking", on: true },
      { label: "Walk-forward validation", on: true },
      { label: "Weekly factor digest", on: true },
      { label: "API access", on: true },
    ],
  },
];

export default function MembershipPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 lg:px-6">
        <Tag tone="amber">Membership</Tag>
        <h1 className="mt-4 text-[28px] font-medium leading-tight tracking-[-0.01em] text-bright">
          Accounts
        </h1>
        <p className="prose-face mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          The terminal is free and open while QuantPulse is in early access.
          Paid tiers below describe what is being built next — nothing is
          charged yet.
        </p>

        {/* Account panel — deliberately inert for now */}
        <div className="mt-8 grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="border-0">
            <PanelHead
              title="Account"
              right={<Tag tone="neutral">Not signed in</Tag>}
            />
            <div className="flex flex-col items-start gap-3 p-5">
              <div className="flex items-center gap-2 text-dim">
                <Lock className="size-3.5" />
                <span className="text-[12px] uppercase tracking-[0.1em]">
                  Authentication not yet wired
                </span>
              </div>
              <p className="prose-face max-w-md text-[12px] leading-relaxed text-muted">
                Sign-in, saved studies and billing are the next build step. The
                form below is the intended shape of it, but it does not submit
                anywhere and no data is stored.
              </p>

              <form
                className="mt-2 w-full max-w-sm space-y-3"
                aria-label="Sign in (not yet functional)"
              >
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    disabled
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    disabled
                    className="mt-1.5"
                  />
                </div>
                <Button type="button" variant="outline" disabled className="w-full">
                  Sign in — coming soon
                </Button>
              </form>
            </div>
          </Panel>

          <Panel className="border-0">
            <PanelHead title="Current access" />
            <div className="space-y-3 p-5">
              <div>
                <Label>Plan</Label>
                <p className="mt-1 text-[15px] text-amber">Open · early access</p>
              </div>
              <div className="border-t border-line pt-3">
                <Label>Included</Label>
                <ul className="mt-2 space-y-1.5">
                  {[
                    "Unlimited analyses",
                    "All factors and horizons",
                    "Any supported ticker",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[12px] text-text"
                    >
                      <Check className="mt-0.5 size-3 shrink-0 text-up" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line pt-3">
                <Button variant="primary" asChild className="w-full">
                  <Link href="/dashboard">Open terminal</Link>
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Tiers */}
        <div className="mt-10">
          <Label>Planned tiers</Label>
          <div className="mt-4 grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "flex flex-col bg-panel p-5",
                  t.featured && "bg-raised",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[14px] text-bright">{t.name}</h3>
                  {t.featured ? <Tag tone="amber">Next up</Tag> : null}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="tnum text-[28px] font-medium text-bright">
                    {t.price}
                  </span>
                  <span className="text-[12px] text-dim">{t.per}</span>
                </div>

                <p className="prose-face mt-2 text-[12px] leading-relaxed text-muted">
                  {t.blurb}
                </p>

                <Button
                  variant={t.featured ? "primary" : "outline"}
                  disabled
                  className="mt-4 w-full"
                >
                  {t.cta}
                </Button>

                <ul className="mt-5 space-y-2 border-t border-line pt-4">
                  {t.features.map((f) => (
                    <li
                      key={f.label}
                      className={cn(
                        "flex items-start gap-2 text-[12px]",
                        f.on ? "text-text" : "text-faint",
                      )}
                    >
                      {f.on ? (
                        <Check className="mt-0.5 size-3 shrink-0 text-up" />
                      ) : (
                        <Minus className="mt-0.5 size-3 shrink-0 text-faint" />
                      )}
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="prose-face mt-8 text-[11px] leading-relaxed text-faint">
          No payment is processed and no account data is collected. Pricing shown
          is indicative and may change before launch.
        </p>
      </div>
    </AppShell>
  );
}
