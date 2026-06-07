"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useBusiness } from "@/components/dashboard/business-context";
import { formatNaira, nairaToKobo } from "@/lib/currency";
import { toast } from "sonner";
import {
  Handshake,
  Plus,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from "lucide-react";

function dateTime(ts: number) {
  return new Date(ts).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NeighborsPage() {
  const { businessId, can } = useBusiness();
  const neighbors = useQuery(
    api.neighbors.list,
    businessId ? { businessId } : "skip"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!businessId) return null;

  if (!can("view_neighbors")) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-3xl">
        <h1 className="font-display text-4xl mb-3">Neighbors</h1>
        <p className="text-[var(--text-muted)]">
          Your role doesn't include the neighbor ledger.
        </p>
      </div>
    );
  }

  const canManage = can("manage_neighbors");
  const totalIOwe = neighbors?.reduce((s: number, n: any) => s + n.iOwe, 0) ?? 0;
  const totalTheyOwe = neighbors?.reduce((s: number, n: any) => s + n.theyOweMe, 0) ?? 0;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Neighbor Ledger
          </div>
          <h1 className="font-display text-5xl leading-none">
            Give and <span className="italic">take.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-3 max-w-md">
            Track goods you borrow from fellow traders and goods you lend out —
            the records you'd normally keep on paper.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="sabi-btn-jollof">
            <Plus className="w-4 h-4" /> Add neighbor
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="sabi-card">
          <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
            You owe (total)
          </div>
          <div className="font-display text-3xl text-jollof">
            {formatNaira(totalIOwe)}
          </div>
        </div>
        <div className="sabi-card">
          <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
            They owe you (total)
          </div>
          <div className="font-display text-3xl" style={{ color: "var(--moss)" }}>
            {formatNaira(totalTheyOwe)}
          </div>
        </div>
      </div>

      {/* Neighbor list */}
      <div className="space-y-3">
        {neighbors?.length === 0 && (
          <div className="sabi-card text-center py-12">
            <Handshake className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
            <div className="font-display text-2xl mb-2">No neighbors yet.</div>
            <p className="text-[var(--text-muted)] text-sm">
              Add a fellow trader you exchange goods with.
            </p>
          </div>
        )}
        {neighbors?.map((n: any) => (
          <button
            key={n._id}
            onClick={() => setSelected(n._id)}
            className="sabi-card sabi-card-hover w-full text-left flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-lg">{n.name}</div>
              {n.phone && (
                <div className="text-xs text-[var(--text-muted)]">{n.phone}</div>
              )}
            </div>
            <div className="text-right">
              {n.iOwe > 0 && (
                <div className="text-sm text-jollof">
                  You owe {formatNaira(n.iOwe)}
                </div>
              )}
              {n.theyOweMe > 0 && (
                <div className="text-sm" style={{ color: "var(--moss)" }}>
                  Owes you {formatNaira(n.theyOweMe)}
                </div>
              )}
              {n.iOwe === 0 && n.theyOweMe === 0 && (
                <div className="text-sm text-[var(--text-muted)]">Settled</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {addOpen && (
        <AddNeighborDialog
          businessId={businessId}
          onClose={() => setAddOpen(false)}
        />
      )}
      {selected && (
        <NeighborDetailDialog
          neighborId={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AddNeighborDialog({
  businessId,
  onClose,
}: {
  businessId: Id<"businesses">;
  onClose: () => void;
}) {
  const createNeighbor = useMutation(api.neighbors.create);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    setSubmitting(true);
    try {
      await createNeighbor({ businessId, name: name.trim(), phone: phone || undefined });
      toast.success("Neighbor added");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog title="Add neighbor" onClose={onClose}>
      <label className="sabi-label">Name</label>
      <input
        className="sabi-input mb-4"
        placeholder="e.g. Miracle"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <label className="sabi-label">Phone (optional)</label>
      <input
        className="sabi-input mb-6"
        placeholder="080..."
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div className="flex gap-3">
        <button onClick={onClose} className="sabi-btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="sabi-btn-jollof flex-1"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
    </Dialog>
  );
}

function NeighborDetailDialog({
  neighborId,
  canManage,
  onClose,
}: {
  neighborId: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const neighbor = useQuery(api.neighbors.get, { id: neighborId as Id<"neighbors"> });
  const ledger = useQuery(api.neighbors.ledger, {
    neighborId: neighborId as Id<"neighbors">,
  });
  const recordEntry = useMutation(api.neighbors.recordEntry);
  const settle = useMutation(api.neighbors.settle);

  const [mode, setMode] = useState<"none" | "borrowed" | "lent" | "settle_i_owe" | "settle_they_owe">(
    "none"
  );
  const [amount, setAmount] = useState("");
  const [goods, setGoods] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode("none");
    setAmount("");
    setGoods("");
    setQty("");
  };

  const submitEntry = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      if (mode === "borrowed" || mode === "lent") {
        await recordEntry({
          neighborId: neighborId as Id<"neighbors">,
          direction: mode,
          amount: nairaToKobo(amt),
          goodsName: goods || undefined,
          quantity: qty ? Number(qty) : undefined,
        });
        toast.success("Recorded");
      } else if (mode === "settle_i_owe") {
        await settle({
          neighborId: neighborId as Id<"neighbors">,
          which: "i_owe",
          amount: nairaToKobo(amt),
        });
        toast.success("Settled");
      } else if (mode === "settle_they_owe") {
        await settle({
          neighborId: neighborId as Id<"neighbors">,
          which: "they_owe",
          amount: nairaToKobo(amt),
        });
        toast.success("Settled");
      }
      reset();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const dirLabel: Record<string, string> = {
    borrowed: "You borrowed",
    lent: "You lent",
    settle_i_owe: "You repaid",
    settle_they_owe: "They repaid",
  };

  return (
    <Dialog title={neighbor?.name || "Neighbor"} onClose={onClose} wide>
      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-3" style={{ background: "var(--bg-deep)" }}>
          <div className="text-[10px] uppercase text-[var(--text-muted)]">You owe</div>
          <div className="font-display text-2xl text-jollof">
            {formatNaira(neighbor?.iOwe ?? 0)}
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-deep)" }}>
          <div className="text-[10px] uppercase text-[var(--text-muted)]">They owe you</div>
          <div className="font-display text-2xl" style={{ color: "var(--moss)" }}>
            {formatNaira(neighbor?.theyOweMe ?? 0)}
          </div>
        </div>
      </div>

      {/* Actions */}
      {canManage && mode === "none" && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => setMode("borrowed")} className="sabi-btn-secondary text-xs">
            <ArrowDownLeft className="w-4 h-4" /> I borrowed goods
          </button>
          <button onClick={() => setMode("lent")} className="sabi-btn-secondary text-xs">
            <ArrowUpRight className="w-4 h-4" /> I lent goods
          </button>
          {(neighbor?.iOwe ?? 0) > 0 && (
            <button onClick={() => setMode("settle_i_owe")} className="sabi-btn-secondary text-xs">
              Repay what I owe
            </button>
          )}
          {(neighbor?.theyOweMe ?? 0) > 0 && (
            <button onClick={() => setMode("settle_they_owe")} className="sabi-btn-secondary text-xs">
              They paid me back
            </button>
          )}
        </div>
      )}

      {canManage && mode !== "none" && (
        <div className="rounded-xl p-4 mb-5" style={{ background: "var(--bg-deep)" }}>
          <div className="font-medium text-sm mb-3">{dirLabel[mode]}</div>
          {(mode === "borrowed" || mode === "lent") && (
            <>
              <label className="sabi-label">Goods (optional)</label>
              <input
                className="sabi-input mb-3"
                placeholder="e.g. 2 cartons of milk"
                value={goods}
                onChange={(e) => setGoods(e.target.value)}
              />
              <label className="sabi-label">Quantity (optional)</label>
              <input
                type="number"
                className="sabi-input mb-3"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </>
          )}
          <label className="sabi-label">
            {mode === "borrowed"
              ? "Cost value (what you'll owe) ₦"
              : mode === "lent"
              ? "Cost value (what they'll owe) ₦"
              : "Amount ₦"}
          </label>
          <input
            type="number"
            className="sabi-input mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={reset} className="sabi-btn-secondary flex-1 text-sm">
              Cancel
            </button>
            <button
              onClick={submitEntry}
              disabled={busy}
              className="sabi-btn-jollof flex-1 text-sm"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <div className="sabi-label">History</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {ledger?.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm py-4">No entries yet.</p>
          )}
          {ledger?.map((e: any) => (
            <div
              key={e._id}
              className="flex items-start justify-between py-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{dirLabel[e.direction]}</div>
                {e.goodsName && (
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {e.quantity ? `${e.quantity} × ` : ""}
                    {e.goodsName}
                  </div>
                )}
                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {dateTime(e.createdAt)}
                </div>
              </div>
              <div
                className="font-display text-lg shrink-0 ml-2"
                style={{
                  color:
                    e.direction === "borrowed" || e.direction === "settle_they_owe"
                      ? "var(--jollof)"
                      : "var(--moss)",
                }}
              >
                {formatNaira(e.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className={`rounded-2xl w-full ${wide ? "max-w-lg" : "max-w-md"} p-6 shadow-2xl animate-rise my-auto`}
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-3xl">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
