"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { formatNaira } from "@/lib/currency";
import { formatDateTime } from "@/lib/utils";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function TransactionsPage() {
  const { businessId } = useBusiness();
  const [filter, setFilter] = useState<"all" | "revenue" | "expense">("all");
  const [addOpen, setAddOpen] = useState(false);

  const transactions = useQuery(
    api.transactions.list,
    businessId
      ? {
          businessId,
          limit: 200,
          type: filter === "all" ? undefined : filter,
        }
      : "skip"
  );

  if (!businessId) return null;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Transactions
          </div>
          <h1 className="font-display text-5xl leading-none">
            Every <span className="italic">naira,</span> in and out.
          </h1>
        </div>
        <button onClick={() => setAddOpen(true)} className="sabi-btn-jollof">
          <Plus className="w-4 h-4" /> New transaction
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-ink/10">
        {(["all", "revenue", "expense"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              filter === f
                ? "border-jollof text-ink"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {f === "all" ? "All" : f === "revenue" ? "Sales / Revenue" : "Expenses"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="sabi-card !p-0 overflow-hidden">
        {transactions === undefined && (
          <div className="p-8 text-center text-ink/50 text-sm">Loading…</div>
        )}
        {transactions && transactions.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-display text-2xl mb-2">No transactions yet.</div>
            <p className="text-ink/50 text-sm mb-5">
              Click "New transaction" to log your first sale or expense.
            </p>
          </div>
        )}
        {transactions && transactions.length > 0 && (
          <div className="divide-y divide-ink/8">
            {transactions.map((t: any) => (
              <div
                key={t._id}
                className="flex items-center justify-between px-5 py-4 hover:bg-cream-deep/30 transition"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      t.type === "revenue"
                        ? "bg-moss/15 text-moss"
                        : "bg-jollof/15 text-jollof"
                    }`}
                  >
                    {t.type === "revenue" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.description}</div>
                    <div className="text-xs text-ink/50 flex gap-2 mt-0.5">
                      <span>{t.category?.replace("_", " ") || "—"}</span>
                      {t.paymentMethod && (
                        <>
                          <span>·</span>
                          <span>{t.paymentMethod}</span>
                        </>
                      )}
                      {t.customerName && (
                        <>
                          <span>·</span>
                          <span>{t.customerName}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{formatDateTime(t.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div
                    className={`font-display text-xl ${
                      t.type === "revenue" ? "text-moss" : "text-jollof"
                    }`}
                  >
                    {t.type === "revenue" ? "+" : "−"}
                    {formatNaira(t.amount)}
                  </div>
                  {t.type === "revenue" &&
                    Array.isArray(t.items) &&
                    t.items.some((it: any) => it.costPrice) && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        profit{" "}
                        <span style={{ color: "var(--moss)" }}>
                          {formatNaira(
                            t.items.reduce(
                              (p: number, it: any) =>
                                p +
                                (it.unitPrice - (it.costPrice || 0)) * it.quantity,
                              0
                            )
                          )}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTransactionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        businessId={businessId}
      />
    </div>
  );
}
