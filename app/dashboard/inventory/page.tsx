"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { formatNaira, nairaToKobo, koboToNaira } from "@/lib/currency";
import { Plus, X, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hintsForType } from "@/lib/business-hints";

export default function InventoryPage() {
  const { businessId, can, businessType } = useBusiness();
  const items = useQuery(
    api.inventory.list,
    businessId ? { businessId } : "skip"
  );
  const velocity = useQuery(
    api.inventory.velocity,
    businessId ? { businessId, days: 14 } : "skip"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const canEdit = can("edit_inventory");

  if (!businessId) return null;

  const runningOut = velocity?.filter(
    (v: any) => v.daysLeft !== null && v.daysLeft <= 7
  );

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Inventory
          </div>
          <h1 className="font-display text-5xl leading-none">
            Stock that <span className="italic">talks.</span>
          </h1>
        </div>
        {canEdit && (
          <button onClick={() => setAddOpen(true)} className="sabi-btn-jollof">
            <Plus className="w-4 h-4" /> Add item
          </button>
        )}
      </div>

      {/* Running out soon (velocity) */}
      {runningOut && runningOut.length > 0 && (
        <div
          className="sabi-card mb-6"
          style={{ borderColor: "var(--jollof)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-jollof" />
            <h3 className="font-display text-xl">Running out soon</h3>
          </div>
          <div className="space-y-2">
            {runningOut.map((v: any) => (
              <div
                key={v._id}
                className="flex items-center justify-between text-sm py-1"
              >
                <span>{v.name}</span>
                <span className="text-jollof">
                  ~{v.daysLeft} day{v.daysLeft === 1 ? "" : "s"} left
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    ({v.perDay}/day)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sabi-card !p-0 overflow-hidden">
        {items === undefined && (
          <div className="p-8 text-center text-ink/50 text-sm">Loading…</div>
        )}
        {items && items.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-display text-2xl mb-2">No items yet.</div>
            <p className="text-ink/50 text-sm mb-5">
              Add your first product to start tracking stock levels.
            </p>
            {canEdit && (
              <button onClick={() => setAddOpen(true)} className="sabi-btn-primary">
                <Plus className="w-4 h-4" /> Add first item
              </button>
            )}
          </div>
        )}
        {items && items.length > 0 && (
          <div>
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-cream-deep/40 text-xs uppercase tracking-wider text-ink/50">
              <div className="col-span-4">Item</div>
              <div className="col-span-2">Stock</div>
              <div className="col-span-2">Cost</div>
              <div className="col-span-2">Selling</div>
              <div className="col-span-1">Margin</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-ink/8">
              {items.map((item: any) => {
                const margin =
                  item.sellingPrice > 0
                    ? Math.round(
                        ((item.sellingPrice - item.costPrice) /
                          item.sellingPrice) *
                          100
                      )
                    : 0;
                const isLow =
                  item.lowStockThreshold &&
                  item.quantity <= item.lowStockThreshold;
                return (
                  <div
                    key={item._id}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-cream-deep/20 transition"
                  >
                    <div className="col-span-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-ink/50">
                        {item.category || "—"}
                        {item.supplier && ` · ${item.supplier}`}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`font-display text-lg ${
                          isLow ? "text-jollof" : "text-ink"
                        }`}
                      >
                        {item.quantity}
                      </span>{" "}
                      <span className="text-xs text-ink/50">
                        {item.unit || ""}
                      </span>
                      {isLow && (
                        <div className="text-[10px] text-jollof flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> low stock
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm">
                      {formatNaira(item.costPrice)}
                    </div>
                    <div className="col-span-2 text-sm font-medium">
                      {formatNaira(item.sellingPrice)}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`text-sm ${
                          margin >= 20
                            ? "text-moss"
                            : margin >= 10
                            ? "text-ink"
                            : "text-jollof"
                        }`}
                      >
                        {margin}%
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {canEdit && (
                        <button
                          onClick={() => setEditing(item)}
                          className="p-2 text-ink/50 hover:text-ink"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(addOpen || editing) && (
        <InventoryDialog
          businessId={businessId}
          item={editing}
          bizType={businessType}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function InventoryDialog({
  businessId,
  item,
  bizType,
  onClose,
}: {
  businessId: any;
  item?: any;
  bizType?: string | null;
  onClose: () => void;
}) {
  const create = useMutation(api.inventory.create);
  const update = useMutation(api.inventory.update);
  const remove = useMutation(api.inventory.remove);

  const [name, setName] = useState(item?.name || "");
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || "0");
  const [unit, setUnit] = useState(item?.unit || "pcs");
  const [costPrice, setCostPrice] = useState(
    item ? koboToNaira(item.costPrice).toString() : ""
  );
  const [sellingPrice, setSellingPrice] = useState(
    item ? koboToNaira(item.sellingPrice).toString() : ""
  );
  const [category, setCategory] = useState(item?.category || "");
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [producer, setProducer] = useState(item?.producer || "");
  const [threshold, setThreshold] = useState(
    item?.lowStockThreshold?.toString() || "5"
  );
  // "Money runs inventory" — how was this new stock paid for?
  const [recordCost, setRecordCost] = useState<"none" | "expense" | "borrowed">(
    "none"
  );
  const [costNeighborId, setCostNeighborId] = useState("");
  const neighbors = useQuery(
    api.neighbors.list,
    !item ? { businessId } : "skip"
  );
  const [submitting, setSubmitting] = useState(false);

  const hints = hintsForType(bizType);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const cost = parseFloat(costPrice) || 0;
    const sell = parseFloat(sellingPrice) || 0;
    setSubmitting(true);
    try {
      if (item) {
        await update({
          id: item._id,
          name: name.trim(),
          quantity: parseInt(quantity) || 0,
          unit,
          costPrice: nairaToKobo(cost),
          sellingPrice: nairaToKobo(sell),
          category: category || undefined,
          supplier: supplier || undefined,
          producer: producer || undefined,
          lowStockThreshold: parseInt(threshold) || undefined,
        });
        toast.success("Item updated");
      } else {
        if (recordCost === "borrowed" && !costNeighborId) {
          toast.error("Choose which neighbor you took this stock from");
          setSubmitting(false);
          return;
        }
        await create({
          businessId,
          name: name.trim(),
          quantity: parseInt(quantity) || 0,
          unit,
          costPrice: nairaToKobo(cost),
          sellingPrice: nairaToKobo(sell),
          category: category || undefined,
          supplier: supplier || undefined,
          producer: producer || undefined,
          lowStockThreshold: parseInt(threshold) || undefined,
          recordCost,
          neighborId:
            recordCost === "borrowed"
              ? (costNeighborId as any)
              : undefined,
        });
        toast.success("Item added");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm(`Delete "${item.name}"?`)) return;
    await remove({ id: item._id });
    toast.success("Item deleted");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/30 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-paper rounded-2xl w-full max-w-md p-6 shadow-2xl animate-rise">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl">
            {item ? "Edit" : "New"} <span className="italic text-jollof">item</span>
          </h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="sabi-label">Product name</label>
            <input
              className="sabi-input"
              placeholder={hints.itemName}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sabi-label">Quantity</label>
              <input
                type="number"
                className="sabi-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="sabi-label">Unit</label>
              <select
                className="sabi-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="pcs">pieces</option>
                <option value="carton">carton</option>
                <option value="bag">bag</option>
                <option value="kg">kg</option>
                <option value="L">litres</option>
                <option value="pack">pack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sabi-label">Cost price (₦)</label>
              <input
                type="number"
                step={1000}
                className="sabi-input"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="sabi-label">Selling price (₦)</label>
              <input
                type="number"
                step={1000}
                className="sabi-input"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sabi-label">Category</label>
              <input
                className="sabi-input"
                placeholder="provisions, drinks…"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="sabi-label">Low stock at</label>
              <input
                type="number"
                className="sabi-input"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sabi-label">Producer / Brand</label>
              <input
                className="sabi-input"
                placeholder={hints.producerExample}
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
              />
            </div>
            <div>
              <label className="sabi-label">Supplier</label>
              <input
                className="sabi-input"
                placeholder="Who you buy from"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          {/* Money runs inventory — record how this new stock was paid for */}
          {!item && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-deep)" }}
            >
              <label className="sabi-label">How did you pay for this stock?</label>
              <div className="flex flex-col gap-2">
                {[
                  { v: "none", label: "Don't record now" },
                  { v: "expense", label: "Record as an expense (I paid for it)" },
                  { v: "borrowed", label: "Borrowed from a neighbor (on credit)" },
                ].map((opt) => (
                  <label
                    key={opt.v}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="recordCost"
                      checked={recordCost === (opt.v as any)}
                      onChange={() => setRecordCost(opt.v as any)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {recordCost === "borrowed" && (
                <select
                  className="sabi-input mt-3"
                  value={costNeighborId}
                  onChange={(e) => setCostNeighborId(e.target.value)}
                >
                  <option value="">Select neighbor…</option>
                  {neighbors?.map((n: any) => (
                    <option key={n._id} value={n._id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              )}
              {recordCost !== "none" && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {recordCost === "expense"
                    ? "An expense of cost × quantity will be logged automatically."
                    : "You'll owe this neighbor cost × quantity, added to your ledger."}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {item && (
            <button
              onClick={handleDelete}
              className="px-4 py-3 text-jollof hover:bg-jollof/10 rounded-full text-sm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="sabi-btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="sabi-btn-primary flex-1"
          >
            {submitting ? "Saving…" : item ? "Save" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
}
