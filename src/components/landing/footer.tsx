import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Backtester", href: "/dashboard" },
      { label: "Webhook hub", href: "/dashboard/webhooks" },
      { label: "API keys", href: "/dashboard/api-keys" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { label: "TradingView", href: "/dashboard/webhooks" },
      { label: "Alpaca", href: "/dashboard/settings" },
      { label: "Interactive Brokers", href: "/dashboard/settings" },
      { label: "Paper trading", href: "/dashboard/settings" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Documentation", href: "/dashboard/webhooks" },
      { label: "Status", href: "/dashboard" },
      { label: "Terms", href: "/" },
      { label: "Privacy", href: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="py-12 lg:py-16">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo className="size-5" />
              <span className="text-[14px] font-semibold tracking-tight text-bright">
                QuantPulse
              </span>
            </div>
            <p className="mt-3 max-w-[22ch] text-[12px] leading-relaxed text-dim">
              Signal research and webhook execution for systematic traders.
            </p>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
                {g.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-muted transition-colors hover:text-bright"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-faint">
            © {new Date().getFullYear()} QuantPulse Labs. A demonstration
            application — market data is simulated.
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-faint">
            Nothing here is investment advice. Trading involves substantial risk
            of loss.
          </p>
        </div>
      </div>
    </footer>
  );
}
