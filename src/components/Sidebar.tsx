"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Boxes,
  AudioLines,
  ScrollText,
  BarChart3,
  Terminal,
  BellRing,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: Server },
  { href: "/models", label: "Ollama Models", icon: Boxes },
  { href: "/whisper", label: "Whisper", icon: AudioLines },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/playground", label: "Playground", icon: Terminal },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="w-56 shrink-0 border-r border-border bg-background-secondary flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <h1 className="text-sm font-semibold text-text-primary">EchoLocal AI Control</h1>
        <p className="text-xs text-text-secondary mt-0.5">whisper-api · ollama</p>
      </div>

      <div className="flex-1 py-2 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-background-tertiary text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-tertiary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="px-2 py-3 border-t border-border">
        <button onClick={handleLogout} className="btn-ghost w-full justify-start">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
