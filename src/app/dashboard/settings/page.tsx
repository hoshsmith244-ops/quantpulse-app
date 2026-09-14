"use client";

import { Building2, CheckCircle2, Plug, ShieldAlert } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AffixInput, Input } from "@/components/ui/input";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const BROKERS = [
  {
    name: "Alpaca",
    desc: "Commission-free US equities and crypto. Paper and live accounts.",
    connected: true,
    account: "PA3X••••8821",
    mode: "Paper",
  },
  {
    name: "Interactive Brokers",
    desc: "Global multi-asset routing via the Client Portal Web API.",
    connected: true,
    account: "U48••••27",
    mode: "Live",
  },
  {
    name: "Tradier",
    desc: "US equities and options with a simple REST interface.",
    connected: false,
    account: null,
    mode: null,
  },
];

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line-soft px-4 py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-bright">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [autoExecute, setAutoExecute] = React.useState(true);
  const [killSwitch, setKillSwitch] = React.useState(false);
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [pushAlerts, setPushAlerts] = React.useState(false);
  const [failureAlerts, setFailureAlerts] = React.useState(true);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Broker connections, execution guardrails and how QuantPulse tells you when something fires."
        actions={<Button size="sm">Save changes</Button>}
      />

      <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
        {/* Brokers */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Building2 className="size-3.5 text-dim" />
              Broker connections
            </PanelTitle>
          </PanelHeader>
          <div>
            {BROKERS.map((b) => (
              <div
                key={b.name}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft px-4 py-3.5 last:border-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-raised">
                    <Plug className="size-4 text-dim" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-bright">
                      {b.name}
                      {b.connected ? (
                        <Badge tone={b.mode === "Live" ? "profit" : "neutral"}>
                          {b.mode}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                      {b.desc}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {b.connected ? (
                    <>
                      <span className="tnum hidden text-[11px] text-dim sm:inline">
                        {b.account}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-profit">
                        <CheckCircle2 className="size-3.5" />
                        Connected
                      </span>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm">
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Execution */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <ShieldAlert className="size-3.5 text-dim" />
              Execution guardrails
            </PanelTitle>
          </PanelHeader>
          <div>
            <Row
              title="Auto-execute webhook signals"
              description="When off, inbound alerts are logged and staged but no order is sent."
            >
              <Switch
                checked={autoExecute}
                onCheckedChange={setAutoExecute}
                aria-label="Auto-execute webhook signals"
              />
            </Row>

            <Row
              title="Max notional per order"
              description="Orders above this size are rejected at the gateway before reaching the broker."
            >
              <div className="w-40">
                <AffixInput
                  prefix="$"
                  type="number"
                  defaultValue={25000}
                  aria-label="Max notional per order"
                />
              </div>
            </Row>

            <Row
              title="Max open positions"
              description="Signals that would exceed this count are queued until a slot frees up."
            >
              <div className="w-40">
                <Input
                  type="number"
                  defaultValue={8}
                  className="tnum"
                  aria-label="Max open positions"
                />
              </div>
            </Row>

            <Row
              title="Daily loss limit"
              description="Trading halts for the rest of the session once realised losses cross this threshold."
            >
              <div className="w-40">
                <AffixInput
                  suffix="%"
                  type="number"
                  defaultValue={4}
                  step={0.5}
                  aria-label="Daily loss limit"
                />
              </div>
            </Row>

            <Row
              title="Default order type"
              description="Applied when an inbound payload omits the order_type field."
            >
              <div className="w-40">
                <Select defaultValue="market">
                  <SelectTrigger aria-label="Default order type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Row>

            <Row
              title="Kill switch"
              description="Immediately blocks every inbound signal across all endpoints until re-enabled."
            >
              <Switch
                checked={killSwitch}
                onCheckedChange={setKillSwitch}
                aria-label="Kill switch"
              />
            </Row>
          </div>
        </Panel>

        {/* Notifications */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Notifications</PanelTitle>
          </PanelHeader>
          <div>
            <Row
              title="Email alerts"
              description="A digest whenever a signal fires and when an order fills."
            >
              <Switch
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
                aria-label="Email alerts"
              />
            </Row>
            <Row
              title="Mobile push"
              description="Real-time push to the QuantPulse mobile app."
            >
              <Switch
                checked={pushAlerts}
                onCheckedChange={setPushAlerts}
                aria-label="Mobile push"
              />
            </Row>
            <Row
              title="Delivery failures"
              description="Notify immediately on 4xx or 5xx responses from the broker."
            >
              <Switch
                checked={failureAlerts}
                onCheckedChange={setFailureAlerts}
                aria-label="Delivery failure alerts"
              />
            </Row>
          </div>
        </Panel>

        <div className="flex justify-end gap-2 pb-4">
          <Button variant="ghost" size="sm">
            Discard
          </Button>
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </>
  );
}
