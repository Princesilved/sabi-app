"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { nairaToKobo, koboToNaira, formatNaira } from "@/lib/currency";
import { toast } from "sonner";
import { X, Plus, Trash2, UserPlus, Package } from "lucide-react";
import { useBusiness } from "@/components/dashboard/business-context";
import { hintsForType } from "@/lib/business-hints";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: Id<"businesses">;
  defaultType?: "revenue" | "expense";
}

const EXPENSE_CATEGORIES = [
  "stock_purchase",
  "transport",
  "rent",
  "salary",
  "utilities",
  "marketing",
  "supplies",
  "other",
];
const PAYMENT_METHODS = ["cash", "transfer", "pos", "credit"];

type LineItem = {
  productId?: Id<"inventory">;
  name: string;
  quantity: number;
  unitPriceNaira: number;
  costPriceNaira: number;
  supplierName?: string;
};

export function AddTransactionDialog({
  open,
  onClose,
  businessId,
  defaultType = "revenue",
}: Props) {
  const { businessType } = useBusiness();
  const hints = hintsForType(businessType);
  const create = useMutation(api.transactions.create);
  const createCustomer = useMutation(api.customers.create);

  const inventory = useQuery(
    api.inventory.list,
    open ? { businessId } : "skip"
  );
  const customers = useQuery(
    api.customers.list,
    open ? { businessId } : "skip"
  );
  const neighbors = useQuery(
    api.neighbors.list,
    open ? { businessId } : "skip"
  );

  const [type, setType] = useState<"revenue" | "expense">(defaultType);
  const [submitting, setSubmitting] = useState(false);

  // Sale state
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [items, setItems] = useState<LineItem[]>([
    { name: "", quantity: 1, unitPriceNaira: 0, costPriceNaira: 0 },
  ]);
  const [customerId, setCustomerId] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [stockSource, setStockSource] = useState<"inventory" | "borrowed">(
    "inventory"
  );
  const [neighborId, setNeighborId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Expense state
  const [expAmount, setExpAmount] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expCategory, setExpCategory] = useState("");

  const saleTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (it.unitPriceNaira || 0) * (it.quantity || 0),
        0
      ),
    [items]
  );

  if (!open) return null;

  const pickProduct = (index: number, productId: string) => {
    const product = inventory?.find((p: any) => p._id === productId);
    if (!product) return;
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              productId: product._id,
              name: product.name,
              unitPriceNaira: koboToNaira(product.sellingPrice),
              costPriceNaira: koboToNaira(product.costPrice),
              supplierName: product.producer || product.supplier || undefined,
            }
          : it
      )
    );
  };

  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { name: "", quantity: 1, unitPriceNaira: 0, costPriceNaira: 0 },
    ]);
  const removeItem = (i: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const id = await createCustomer({
        businessId,
        name: newCustomerName.trim(),
      });
      setCustomerId(id);
      setNewCustomerName("");
      setAddingCustomer(false);
      toast.success("Customer added");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resetAndClose = () => {
    setItems([{ name: "", quantity: 1, unitPriceNaira: 0, costPriceNaira: 0 }]);
    setCustomerId("");
    setStockSource("inventory");
    setNeighborId("");
    setExpAmount("");
    setExpDescription("");
    setExpCategory("");
    onClose();
  };

  const handleSaleSubmit = async () => {
    const validItems = items.filter((it) => it.name.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (stockSource === "borrowed" && !neighborId) {
      toast.error("Choose which neighbor the goods were borrowed from");
      return;
    }
    setSubmitting(true);
    try {
      const description =
        validItems.length === 1
          ? `Sold ${validItems[0].quantity} ${validItems[0].name}`
          : `Sold ${validItems.length} items`;

      await create({
        businessId,
        type: "revenue",
        amount: nairaToKobo(saleTotal),
        description,
        category: "sales",
        customerId: customerId ? (customerId as Id<"customers">) : undefined,
        saleType,
        stockSource,
        neighborId:
          stockSource === "borrowed" ? (neighborId as Id<"neighbors">) : undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          name: it.name.trim(),
          quantity: it.quantity,
          unitPrice: nairaToKobo(it.unitPriceNaira),
          costPrice: nairaToKobo(it.costPriceNaira),
          supplierName: it.supplierName,
        })),
        paymentMethod,
        isCredit: paymentMethod === "credit",
        date: Date.now(),
      });
      toast.success(`Logged ${formatNaira(nairaToKobo(saleTotal))} sale`);
      resetAndClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async () => {
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!expDescription.trim()) return toast.error("Add a short description");
    setSubmitting(true);
    try {
      await create({
        businessId,
        type: "expense",
        amount: nairaToKobo(amt),
        description: expDescription.trim(),
        category: expCategory || undefined,
        paymentMethod,
        date: Date.now(),
      });
      toast.success(`Logged ${formatNaira(nairaToKobo(amt))} expense`);
      resetAndClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className="rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-rise my-auto"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-3xl">
            Log a <span className="italic text-jollof">{type === "revenue" ? "sale" : "expense"}</span>
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type switcher */}
        <div
          className="flex gap-2 mb-5 p-1 rounded-full"
          style={{ background: "var(--bg-deep)" }}
        >
          {(["revenue", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 rounded-full text-sm font-medium transition"
              style={
                type === t
                  ? { background: "var(--inverse-bg)", color: "var(--inverse-text)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {t === "revenue" ? "Sale / Revenue" : "Expense"}
            </button>
          ))}
        </div>

        {type === "revenue" ? (
          <>
            {/* Sale type */}
            <div className="mb-4">
              <label className="sabi-label">Sale type</label>
              <div className="flex gap-2">
                {(["retail", "wholesale"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSaleType(s)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border transition capitalize"
                    style={{
                      borderColor: saleType === s ? "var(--jollof)" : "var(--border)",
                      background: saleType === s ? "rgba(212,70,33,0.06)" : "transparent",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock source */}
            <div className="mb-4">
              <label className="sabi-label">Where are these goods from?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStockSource("inventory")}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border transition"
                  style={{
                    borderColor: stockSource === "inventory" ? "var(--jollof)" : "var(--border)",
                    background: stockSource === "inventory" ? "rgba(212,70,33,0.06)" : "transparent",
                  }}
                >
                  My inventory
                </button>
                <button
                  onClick={() => setStockSource("borrowed")}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border transition"
                  style={{
                    borderColor: stockSource === "borrowed" ? "var(--jollof)" : "var(--border)",
                    background: stockSource === "borrowed" ? "rgba(212,70,33,0.06)" : "transparent",
                  }}
                >
                  Borrowed from neighbor
                </button>
              </div>
              {stockSource === "borrowed" && (
                <div className="mt-2">
                  <select
                    className="sabi-input"
                    value={neighborId}
                    onChange={(e) => setNeighborId(e.target.value)}
                  >
                    <option value="">Select neighbor…</option>
                    {neighbors?.map((n: any) => (
                      <option key={n._id} value={n._id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    You'll owe them the cost value of what you sell. Stock won't be
                    deducted from your inventory.
                  </p>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="sabi-label !mb-0">Items</label>
                <button
                  onClick={addItem}
                  className="text-xs text-jollof flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {stockSource === "inventory" && inventory && inventory.length > 0 ? (
                        <select
                          className="sabi-input !py-2 flex-1"
                          value={it.productId || ""}
                          onChange={(e) => {
                            if (e.target.value) pickProduct(i, e.target.value);
                            else updateItem(i, { productId: undefined, name: "" });
                          }}
                        >
                          <option value="">— pick product —</option>
                          {inventory.map((p: any) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.quantity} {p.unit || "left"})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="sabi-input !py-2 flex-1"
                          placeholder={hints.itemName}
                          value={it.name}
                          onChange={(e) => updateItem(i, { name: e.target.value })}
                        />
                      )}
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(i)}
                          className="text-jollof p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">Qty</span>
                        <input
                          type="number"
                          className="sabi-input !py-1.5"
                          value={it.quantity || ""}
                          onChange={(e) =>
                            updateItem(i, { quantity: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">Unit ₦</span>
                        <input
                          type="number"
                          step={1000}
                          className="sabi-input !py-1.5"
                          value={it.unitPriceNaira || ""}
                          onChange={(e) =>
                            updateItem(i, { unitPriceNaira: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">Cost ₦</span>
                        <input
                          type="number"
                          step={1000}
                          className="sabi-input !py-1.5"
                          value={it.costPriceNaira || ""}
                          onChange={(e) =>
                            updateItem(i, { costPriceNaira: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    {it.supplierName && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                        <Package className="w-3 h-3" /> from {it.supplierName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div className="mb-4">
              <label className="sabi-label">Customer (optional, builds loyalty data)</label>
              {!addingCustomer ? (
                <div className="flex gap-2">
                  <select
                    className="sabi-input flex-1"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Walk-in / no customer</option>
                    {customers?.map((c: any) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                        {c.debt > 0 ? ` (owes ${formatNaira(c.debt)})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setAddingCustomer(true)}
                    className="sabi-btn-secondary !px-3"
                    title="New customer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="sabi-input flex-1"
                    placeholder="New customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleAddCustomer} className="sabi-btn-jollof !px-3">
                    Add
                  </button>
                  <button
                    onClick={() => setAddingCustomer(false)}
                    className="sabi-btn-secondary !px-3"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="mb-5">
              <label className="sabi-label">Payment</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((p: any) => (
                  <button
                    key={p}
                    onClick={() => setPaymentMethod(p)}
                    className="px-3 py-1.5 rounded-full text-xs border transition capitalize"
                    style={
                      paymentMethod === p
                        ? { background: "var(--jollof)", color: "#fff", borderColor: "var(--jollof)" }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
              {paymentMethod === "credit" && !customerId && (
                <p className="text-xs text-jollof mt-2">
                  Pick a customer so the debt is tracked against them.
                </p>
              )}
            </div>

            {/* Total + submit */}
            <div
              className="flex items-center justify-between mb-4 pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span className="text-[var(--text-muted)] text-sm">Total</span>
              <span className="font-display text-3xl text-jollof">
                {formatNaira(nairaToKobo(saleTotal))}
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="sabi-btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSaleSubmit}
                disabled={submitting}
                className="sabi-btn-jollof flex-1"
              >
                {submitting ? "Saving…" : "Log sale"}
              </button>
            </div>
          </>
        ) : (
          /* ===== Expense form ===== */
          <>
            <div className="mb-4">
              <label className="sabi-label">Amount (₦)</label>
              <input
                type="number"
                step={1000}
                className="sabi-input text-2xl font-display"
                placeholder="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="sabi-label">What for?</label>
              <input
                className="sabi-input"
                placeholder={hints.expenseExample}
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="sabi-label">Category</label>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((c: any) => (
                  <button
                    key={c}
                    onClick={() => setExpCategory(c)}
                    className="px-3 py-1.5 rounded-full text-xs border transition"
                    style={
                      expCategory === c
                        ? { background: "var(--inverse-bg)", color: "var(--inverse-text)", borderColor: "var(--inverse-bg)" }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    {c.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="sabi-label">Payment</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.filter((p) => p !== "credit").map((p: any) => (
                  <button
                    key={p}
                    onClick={() => setPaymentMethod(p)}
                    className="px-3 py-1.5 rounded-full text-xs border transition capitalize"
                    style={
                      paymentMethod === p
                        ? { background: "var(--jollof)", color: "#fff", borderColor: "var(--jollof)" }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="sabi-btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleExpenseSubmit}
                disabled={submitting}
                className="sabi-btn-primary flex-1"
              >
                {submitting ? "Saving…" : "Log expense"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
