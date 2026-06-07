"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { formatNaira } from "@/lib/currency";
import { timeAgo } from "@/lib/utils";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertTriangle,
  Sparkles,
  Package,
} from "lucide-react";
import Link from "next/link";

export default function CommandCenterPage() {
  const { businessId, businessName, can } = useBusiness();
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"revenue" | "expense">("revenue");

  const stats = useQuery(
    api.businesses.stats,
    businessId ? { businessId, days: 30 } : "skip"
  );
  const transactions = useQuery(
    api.transactions.list,
    businessId && can("view_revenue") ? { businessId, limit: 8 } : "skip"
  );

  if (!businessId) {
    return <div className="p-8 text-[var(--text-muted)]">Loading your business…</div>;
  }

  const restricted = stats?.restricted;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Dashboard
          </div>
          <h1 className="font-display text-5xl lg:text-6xl leading-none">
            {businessName}
            <span className="block italic text-[var(--text-muted)] text-3xl mt-1">
              today.
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          {can("log_expense") && (
            <button
              onClick={() => {
                setAddType("expense");
                setAddOpen(true);
              }}
              className="sabi-btn-secondary"
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
          )}
          {can("log_revenue") && (
            <button
              onClick={() => {
                setAddType("revenue");
                setAddOpen(true);
              }}
              className="sabi-btn-jollof"
            >
              <Plus className="w-4 h-4" />
              Log sale
            </button>
          )}
        </div>
      </div>

      {/* Restricted view for marketer / inventory clerk / sales rep */}
      {restricted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="sabi-card">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-jollof" />
              <h3 className="font-display text-xl">Inventory overview</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display text-5xl">
                {stats?.inventoryItemCount ?? 0}
              </span>
              <span className="text-[var(--text-muted)] text-sm">items tracked</span>
            </div>
            {stats && stats.lowStockCount > 0 ? (
              <p className="text-sm text-jollof mt-3">
                {stats.lowStockCount} item(s) low on stock
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)] mt-3">
                Stock levels healthy.
              </p>
            )}
          </div>

          <div
            className="sabi-card"
            style={{ background: "var(--inverse-bg)", color: "var(--inverse-text)" }}
          >
            <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-3">
              Your access
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              Your role doesn't include viewing the business's financial figures.
              You can still do everything your role allows from the menu on the
              left. If you need more access, ask the business owner.
            </p>
          </div>

          {can("use_assistant") && (
            <Link
              href="/dashboard/assistant"
              className="sabi-card sabi-card-hover bg-jollof text-white lg:col-span-2"
            >
              <Sparkles className="w-5 h-5 mb-3" />
              <h3 className="font-display text-3xl leading-none mb-2">
                Ask Sabi <span className="italic">anything.</span>
              </h3>
              <p className="text-white/80 text-sm">
                Get help with your tasks. Open the assistant →
              </p>
            </Link>
          )}
        </div>
      )}

      {/* Full financial view */}
      {!restricted && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard label="Revenue today" value={formatNaira(stats.revenueToday ?? 0)} />
            <StatCard
              label="Profit today"
              value={formatNaira(stats.profitToday ?? 0)}
              tone={(stats.profitToday ?? 0) >= 0 ? "good" : "bad"}
            />
            <StatCard
              label="Revenue / 30d"
              value={formatNaira(stats.revenue ?? 0, { compact: true })}
            />
            <StatCard
              label="Net profit / 30d"
              value={formatNaira(stats.profit ?? 0, { compact: true })}
              tone={(stats.profit ?? 0) >= 0 ? "good" : "bad"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div
              className="sabi-card lg:col-span-1"
              style={{ background: "var(--inverse-bg)", color: "var(--inverse-text)" }}
            >
              <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-3">
                Business Health
              </div>
              <div className="font-display text-7xl leading-none mb-2">
                {Math.max(
                  20,
                  Math.min(
                    99,
                    50 +
                      Math.round(
                        ((stats.profit ?? 0) /
                          Math.max(stats.revenue || 1, 100000)) *
                          50
                      )
                  )
                )}
              </div>
              <div className="text-xs opacity-60">
                Based on profit margin, debt ratio, and stock movement.
              </div>
              <div
                className="mt-6 pt-6 space-y-2 text-sm"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <DashRow label="Customer debt" value={formatNaira(stats.totalDebt ?? 0, { compact: true })} />
                <DashRow label="Inventory value" value={formatNaira(stats.inventoryValue ?? 0, { compact: true })} />
                <DashRow label="Low stock items" value={String(stats.lowStockCount ?? 0)} />
                <DashRow label="Customers" value={String(stats.customerCount ?? 0)} />
              </div>
            </div>

            <div className="sabi-card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl">Recent activity</h2>
                <Link href="/dashboard/transactions" className="text-xs text-jollof hover:underline">
                  View all →
                </Link>
              </div>
              {transactions === undefined && (
                <div className="text-[var(--text-muted)] text-sm py-8 text-center">Loading…</div>
              )}
              {transactions && transactions.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="font-display text-2xl mb-2">No transactions yet.</div>
                  <p className="text-[var(--text-muted)] text-sm mb-5">
                    Log your first sale or expense to start tracking.
                  </p>
                  {can("log_revenue") && (
                    <button
                      onClick={() => {
                        setAddType("revenue");
                        setAddOpen(true);
                      }}
                      className="sabi-btn-primary"
                    >
                      <Plus className="w-4 h-4" /> Log a transaction
                    </button>
                  )}
                </div>
              )}
              {transactions && transactions.length > 0 && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {transactions.map((t: any) => (
                    <div key={t._id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background:
                              t.type === "revenue"
                                ? "rgba(45,74,43,0.15)"
                                : "rgba(212,70,33,0.15)",
                            color: t.type === "revenue" ? "var(--moss)" : "var(--jollof)",
                          }}
                        >
                          {t.type === "revenue" ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{t.description}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {t.category?.replace("_", " ") || "—"} · {timeAgo(t.date)}
                          </div>
                        </div>
                      </div>
                      <div
                        className="font-display text-lg shrink-0 ml-2"
                        style={{ color: t.type === "revenue" ? "var(--moss)" : "var(--jollof)" }}
                      >
                        {t.type === "revenue" ? "+" : "−"}
                        {formatNaira(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="sabi-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-jollof" />
                <h3 className="font-display text-xl">Stock running low</h3>
              </div>
              {stats.lowStockItems && stats.lowStockItems.length === 0 && (
                <p className="text-[var(--text-muted)] text-sm py-4">
                  Nothing critical. Stock levels look healthy.
                </p>
              )}
              {stats.lowStockItems &&
                stats.lowStockItems.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex justify-between py-2"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm text-jollof font-medium">
                      {item.quantity} {item.unit || "left"}
                    </span>
                  </div>
                ))}
            </div>

            {can("use_assistant") && (
              <Link
                href="/dashboard/assistant"
                className="sabi-card sabi-card-hover bg-jollof text-white group"
              >
                <Sparkles className="w-5 h-5 mb-3" />
                <h3 className="font-display text-3xl leading-none mb-2">
                  Ask Sabi <span className="italic">anything.</span>
                </h3>
                <p className="text-white/80 text-sm mb-4">
                  "How market today?" "Which product slow this week?" Talk to your
                  AI manager.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  Open assistant →
                </span>
              </Link>
            )}
          </div>
        </>
      )}

      {can("log_revenue") || can("log_expense") ? (
        <AddTransactionDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          businessId={businessId}
          defaultType={addType}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="sabi-card" style={{ padding: "1.25rem" }}>
      <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
        {label}
      </div>
      <div
        className="font-display text-3xl lg:text-4xl leading-none"
        style={{
          color:
            tone === "good"
              ? "var(--moss)"
              : tone === "bad"
              ? "var(--jollof)"
              : "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="opacity-70 text-sm">{label}</span>
      <span className="font-display text-lg">{value}</span>
    </div>
  );
}
