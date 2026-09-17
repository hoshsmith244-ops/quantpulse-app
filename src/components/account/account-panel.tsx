"use client";

import {
  AlertTriangle,
  Check,
  CloudOff,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import {
  getLocalSummary,
  getServerSummary,
  subscribeLocalSummary,
} from "@/lib/sync";
import { useAccount } from "@/lib/use-account";
import { cn } from "@/lib/utils";

/**
 * Sign-in and sync.
 *
 * Optional by design, and the copy says so: the tool is fully usable without an
 * account, and signing out never deletes anything from this browser.
 */
export function AccountPanel() {
  const {
    configured,
    ready,
    session,
    email,
    status,
    error,
    lastSyncedAt,
    signIn,
    signOut,
    syncNow,
  } = useAccount();

  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // What this browser would contribute, so the offer is concrete. Read through
  // an external store rather than an effect: localStorage does not exist during
  // SSR, and the server snapshot (null) keeps the first client render identical
  // to the server markup.
  const local = React.useSyncExternalStore(
    subscribeLocalSummary,
    getLocalSummary,
    getServerSummary,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      const res = await signIn(draft);
      setNotice({ ok: res.ok, text: res.message });
      if (res.ok) setDraft("");
    } finally {
      setSending(false);
    }
  };

  // --- Not configured -----------------------------------------------------
  if (!configured) {
    return (
      <Panel>
        <PanelHead
          title="Account"
          right={
            <Tag tone="neutral">
              <CloudOff className="size-2.5" />
              sync off
            </Tag>
          }
        />
        <div className="space-y-2 p-4">
          <p className="prose-face max-w-2xl text-[13px] leading-relaxed text-text">
            Sync is not set up on this deployment, so everything lives in this
            browser only. That is a complete, working state — nothing is
            missing, and your watchlist and settings persist here as normal.
          </p>
          <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-dim">
            To switch it on, create a free Supabase project, run{" "}
            <code className="text-muted">supabase/schema.sql</code> in its SQL
            editor, and set{" "}
            <code className="text-muted">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-muted">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            The README has the steps.
          </p>
        </div>
      </Panel>
    );
  }

  if (!ready) {
    return (
      <Panel>
        <PanelHead title="Account" />
        <div className="flex items-center gap-2.5 p-6 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin text-amber" />
          Checking your session…
        </div>
      </Panel>
    );
  }

  // --- Signed out ---------------------------------------------------------
  if (!session) {
    return (
      <Panel>
        <PanelHead
          title="Account"
          right={<Tag tone="neutral">not signed in</Tag>}
        />
        <div className="space-y-4 p-4">
          <div>
            <p className="prose-face max-w-2xl text-[13px] leading-relaxed text-text">
              Optional. Sign in to carry your watchlist, appearance and
              notification history between devices. Everything works without it
              — an account only moves what you already have.
            </p>
            {local ? (
              <p className="prose-face mt-2 text-[12px] leading-relaxed text-dim">
                This browser currently holds{" "}
                <span className="text-muted">
                  {local.watched} watched{" "}
                  {local.watched === 1 ? "position" : "positions"}
                </span>{" "}
                and{" "}
                <span className="text-muted">
                  {local.events} recorded{" "}
                  {local.events === 1 ? "signal" : "signals"}
                </span>
                . Signing in merges that with anything already saved rather than
                replacing either side.
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="label">Email</span>
              <input
                type="email"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-8 w-[240px] border border-edge bg-base px-2.5 text-[13px] text-bright outline-none transition-colors placeholder:text-faint hover:border-dim focus-visible:border-amber"
              />
            </label>
            <Button type="submit" size="sm" variant="primary" disabled={sending}>
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mail />
              )}
              {sending ? "Sending…" : "Email me a link"}
            </Button>
          </form>

          {notice ? (
            <p
              className={cn(
                "prose-face flex items-start gap-2 text-[12px] leading-relaxed",
                notice.ok ? "text-up" : "text-down",
              )}
            >
              {notice.ok ? (
                <Check className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              )}
              {notice.text}
            </p>
          ) : null}

          <p className="prose-face flex items-start gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
            <ShieldCheck className="mt-0.5 size-3 shrink-0" />
            <span>
              There is no password. Sign-in is a one-time link sent to your
              email, so this app never asks for, handles or stores a password.
              The only thing kept about you is the email address and the
              settings you see below.
            </span>
          </p>
        </div>
      </Panel>
    );
  }

  // --- Signed in ----------------------------------------------------------
  return (
    <Panel>
      <PanelHead
        title="Account"
        right={
          <span className="flex items-center gap-2">
            <SyncTag status={status} lastSyncedAt={lastSyncedAt} />
            <Tag tone="up">signed in</Tag>
          </span>
        }
      />

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="label block">Signed in as</span>
            <span className="mt-0.5 block text-[13px] text-bright">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => syncNow()}>
              <RefreshCw />
              Sync now
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>

        {error ? (
          <p className="prose-face flex items-start gap-2 border border-down/40 bg-down/[0.06] p-2.5 text-[12px] leading-relaxed text-text">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-down" />
            <span>
              <span className="text-down">Sync failed.</span> {error} Your data
              is safe in this browser either way.
            </span>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {[
            { label: "Watchlist", value: "synced" },
            { label: "Appearance", value: "synced" },
            { label: "Notifications", value: "synced" },
            { label: "Scan history", value: "per device" },
          ].map((s) => (
            <div key={s.label} className="bg-panel px-3 py-2.5">
              <span className="label block truncate">{s.label}</span>
              <span
                className={cn(
                  "mt-1 block text-[12px]",
                  s.value === "synced" ? "text-up" : "text-dim",
                )}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>

        <p className="prose-face border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
          Watchlists merge rather than overwrite, so adding a ticker on one
          device never deletes one added on another. What each browser has
          already scanned stays local on purpose — copying it across would
          either suppress an alert the second device should raise or replay one
          you have already dealt with. Signing out leaves everything here
          untouched.
        </p>
      </div>
    </Panel>
  );
}

function SyncTag({
  status,
  lastSyncedAt,
}: {
  status: string;
  lastSyncedAt: number | null;
}) {
  if (status === "syncing") {
    return (
      <Tag tone="amber">
        <Loader2 className="size-2.5 animate-spin" />
        syncing
      </Tag>
    );
  }
  if (status === "error") return <Tag tone="down">sync error</Tag>;
  if (status === "saved" || lastSyncedAt) {
    return (
      <Tag tone="up">
        <Check className="size-2.5" />
        saved
      </Tag>
    );
  }
  return null;
}
