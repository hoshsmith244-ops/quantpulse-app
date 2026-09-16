"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unread } = useNotifications();

  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      className={cn(
        "relative flex items-center border px-2 py-1 transition-colors",
        unread > 0
          ? "border-amber text-amber"
          : "border-edge text-dim hover:border-amber hover:text-amber",
      )}
    >
      <Bell className="size-3.5" />
      {unread > 0 ? (
        <span className="tnum ml-1.5 text-[11px]">{unread}</span>
      ) : null}
    </Link>
  );
}
