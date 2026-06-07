"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  Handshake,
  Sparkles,
  Settings,
  ScanLine,
  UserCog,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/components/dashboard/business-context";
import { useTheme } from "@/components/theme-provider";

// each item lists the permission needed to see it (null = always visible to members)
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: null },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt, perm: "view_revenue" },
  { href: "/dashboard/receipts", label: "Receipts", icon: ScanLine, perm: "upload_receipts" },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package, perm: "view_inventory" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, perm: "view_customers" },
  { href: "/dashboard/neighbors", label: "Neighbors", icon: Handshake, perm: "view_neighbors" },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles, perm: "use_assistant" },
  { href: "/dashboard/team", label: "Team", icon: UserCog, perm: "invite_members" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, perm: null },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  accountant: "Accountant",
  sales_rep: "Sales Rep",
  marketer: "Marketer",
  inventory_clerk: "Inventory Clerk",
  viewer: "Viewer",
};

function visibleNav(can: (p: string) => boolean) {
  return NAV.filter((item) => item.perm === null || can(item.perm));
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, icon: Sun },
    { value: "dark" as const, icon: Moon },
    { value: "system" as const, icon: Monitor },
  ];
  return (
    <div
      className="flex gap-1 p-1 rounded-full"
      style={{ background: "var(--bg-deep)" }}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex-1 flex items-center justify-center py-1.5 rounded-full transition",
              active ? "text-white" : "text-[var(--text-muted)]"
            )}
            style={active ? { background: "var(--jollof)" } : undefined}
            aria-label={o.value}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { can, role } = useBusiness();
  const nav = visibleNav(can);

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col px-5 py-6 sticky top-0 h-screen"
      style={{
        background: "var(--paper)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
        <div className="w-3 h-3 bg-jollof rounded-full" />
        <span className="font-display text-2xl italic">Sabi</span>
      </Link>

      {role && (
        <div
          className="mb-6 mx-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: "var(--bg-deep)" }}
        >
          <span className="text-[var(--text-muted)]">Your role: </span>
          <span className="font-medium">{ROLE_LABELS[role] || role}</span>
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition"
              )}
              style={
                isActive
                  ? { background: "var(--inverse-bg)", color: "var(--inverse-text)" }
                  : { color: "var(--text-muted)" }
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 mb-4">
        <ThemeToggle />
      </div>

      <div
        className="pt-4 flex items-center gap-3 px-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
        <div className="text-xs">
          <div className="font-medium">Your account</div>
          <div className="text-[var(--text-muted)]">Manage profile</div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { can } = useBusiness();
  const nav = visibleNav(can).slice(0, 5);
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-2 py-2 flex justify-around"
      style={{
        background: "var(--paper)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {nav.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
            style={{ color: isActive ? "var(--jollof)" : "var(--text-muted)" }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
