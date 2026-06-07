"use client";

import { useState, useRef, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { toast } from "sonner";
import { nairaToKobo, formatNaira } from "@/lib/currency";
import {
  ScanLine,
  Upload,
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type DraftItem = {
  name: string;
  quantity: number;
  costPriceNaira: number;
  sellingPriceNaira?: number;
  unit?: string;
};

export default function ReceiptsPage() {
  const { businessId, can } = useBusiness();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const registerUpload = useMutation(api.receipts.registerUpload);
  const removeReceipt = useMutation(api.receipts.remove);
  const processReceipt = useAction(api.ai.processReceipt);

  const receipts = useQuery(
    api.receipts.list,
    businessId ? { businessId } : "skip"
  );

  if (!businessId) return null;

  if (!can("upload_receipts")) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-3xl">
        <h1 className="font-display text-4xl mb-3">Receipts</h1>
        <p className="text-[var(--text-muted)]">
          Your role doesn't include receipt scanning.
        </p>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // 1. get upload URL
        const url = await generateUploadUrl({ businessId });
        // 2. upload bytes
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await res.json();
        // 3. register row
        const receiptId = await registerUpload({ businessId, storageId });
        // 4. kick off AI processing (await so we can surface errors)
        toast.loading("Reading receipt…", { id: receiptId });
        const result = await processReceipt({ receiptId });
        if (result.ok) {
          toast.success("Receipt read — review and confirm", { id: receiptId });
          setActiveReceiptId(receiptId);
        } else {
          toast.error(result.error || "Could not read receipt", { id: receiptId });
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Receipts & Invoices
          </div>
          <h1 className="font-display text-5xl leading-none">
            Snap it. <span className="italic">Sabi reads it.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-3 max-w-md">
            Upload a photo of any receipt or supplier invoice — even in Chinese.
            Sabi extracts the items and amounts, you confirm, and it logs the
            expense and stock for you.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className="sabi-card border-dashed text-center py-12 mb-8 cursor-pointer"
        style={{ borderWidth: 2, borderColor: "var(--border-strong)" }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>Uploading & reading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-jollof/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-jollof" />
            </div>
            <div className="font-display text-2xl">Drop receipts here</div>
            <div className="text-[var(--text-muted)] text-sm">
              or click to choose photos · you can select several at once
            </div>
          </div>
        )}
      </div>

      {/* Receipt list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {receipts?.map((r: any) => (
          <div
            key={r._id}
            className="sabi-card sabi-card-hover !p-0 overflow-hidden relative group"
          >
            {/* Delete X — only for receipts not yet confirmed */}
            {r.status !== "confirmed" && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      "Delete this receipt? This can't be undone. (Only unsaved receipts can be deleted.)"
                    )
                  ) {
                    try {
                      await removeReceipt({ id: r._id });
                      toast.success("Receipt deleted");
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }
                }}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                style={{ background: "var(--jollof)", color: "#fff" }}
                title="Delete receipt"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setActiveReceiptId(r._id)}
              className="block w-full text-left"
            >
              {r.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.imageUrl}
                  alt="receipt"
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-3">
                <StatusBadge status={r.status} />
                <div className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {r.extracted?.vendor || "Unknown vendor"}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {activeReceiptId && (
        <ConfirmDialog
          receiptId={activeReceiptId}
          onClose={() => setActiveReceiptId(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    uploaded: { label: "Uploaded", color: "var(--text-muted)", icon: Loader2 },
    processing: { label: "Reading…", color: "var(--gold)", icon: Loader2 },
    extracted: { label: "Needs review", color: "var(--jollof)", icon: AlertCircle },
    confirmed: { label: "Confirmed", color: "var(--moss)", icon: CheckCircle2 },
    failed: { label: "Failed", color: "var(--jollof)", icon: AlertCircle },
  };
  const s = map[status] || map.uploaded;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: s.color }}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function ConfirmDialog({
  receiptId,
  onClose,
}: {
  receiptId: string;
  onClose: () => void;
}) {
  const receipt = useQuery(api.receipts.get, { id: receiptId as any });
  const confirm = useMutation(api.receipts.confirm);
  const processReceipt = useAction(api.ai.processReceipt);
  const [reprocessing, setReprocessing] = useState(false);

  // local editable state, seeded from extracted data
  const [vendor, setVendor] = useState<string>("");
  const [createExpense, setCreateExpense] = useState(true);
  const [expenseNaira, setExpenseNaira] = useState<number>(0);
  const [addToInventory, setAddToInventory] = useState(true);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed editable state once extraction data arrives
  useEffect(() => {
    if (receipt?.extracted && !seeded) {
      const ex = receipt.extracted;
      setVendor(ex.vendor || "");
      setExpenseNaira(typeof ex.total === "number" ? ex.total : 0);
      setItems(
        (ex.items || []).map((it: any) => ({
          name: it.name || it.originalName || "Item",
          quantity: it.quantity || 1,
          costPriceNaira: it.unitPrice || 0,
          sellingPriceNaira: it.unitPrice
            ? Math.round(it.unitPrice * 1.2)
            : undefined,
          unit: "pcs",
        }))
      );
      setSeeded(true);
    }
  }, [receipt, seeded]);

  const nonNaira =
    receipt?.extracted?.currency && receipt.extracted.currency !== "NGN";

  const updateItem = (i: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { name: "", quantity: 1, costPriceNaira: 0, unit: "pcs" },
    ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await confirm({
        receiptId: receiptId as any,
        createExpense,
        expenseAmount: createExpense ? nairaToKobo(expenseNaira) : undefined,
        expenseDescription: vendor ? `Purchase from ${vendor}` : undefined,
        vendor: vendor || undefined,
        addToInventory,
        items: addToInventory
          ? items
              .filter((it) => it.name.trim())
              .map((it) => ({
                name: it.name.trim(),
                quantity: it.quantity,
                costPrice: nairaToKobo(it.costPriceNaira),
                sellingPrice: it.sellingPriceNaira
                  ? nairaToKobo(it.sellingPriceNaira)
                  : undefined,
                unit: it.unit,
              }))
          : undefined,
      });
      toast.success("Saved! Expense and stock updated.");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const r = await processReceipt({ receiptId: receiptId as any });
      if (r.ok) {
        setSeeded(false); // re-seed from new extraction
        toast.success("Re-read the receipt");
      } else {
        toast.error(r.error || "Could not read");
      }
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className="rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-rise my-auto"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl">
            Review <span className="italic text-jollof">before saving</span>
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!receipt && (
          <div className="py-12 text-center text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        )}

        {receipt && receipt.status === "failed" && (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-jollof mx-auto mb-3" />
            <p className="text-[var(--text-muted)] mb-4">
              {receipt.error || "Couldn't read this one clearly."}
            </p>
            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="sabi-btn-primary"
            >
              {reprocessing ? "Trying again…" : "Try reading again"}
            </button>
          </div>
        )}

        {receipt && receipt.extracted && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image preview */}
            <div>
              {receipt.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receipt.imageUrl}
                  alt="receipt"
                  className="w-full rounded-xl border"
                  style={{ borderColor: "var(--border)" }}
                />
              )}
              {receipt.detectedLanguage && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Detected language:{" "}
                  <span className="capitalize">{receipt.detectedLanguage}</span>
                </p>
              )}
              {nonNaira && (
                <div className="mt-3 rounded-xl p-3 text-xs bg-jollof/10 text-jollof">
                  This receipt is in {receipt.extracted.currency}. The amounts
                  below are the original numbers — please convert them to Naira
                  before saving.
                </div>
              )}
            </div>

            {/* Editable form */}
            <div>
              <label className="sabi-label">Vendor / Supplier</label>
              <input
                className="sabi-input mb-4"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Alaba Market supplier"
              />

              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createExpense}
                  onChange={(e) => setCreateExpense(e.target.checked)}
                />
                <span className="text-sm font-medium">Log total as an expense</span>
              </label>
              {createExpense && (
                <div className="mb-4">
                  <label className="sabi-label">Total expense (₦)</label>
                  <input
                    type="number"
                    className="sabi-input"
                    value={expenseNaira || ""}
                    onChange={(e) => setExpenseNaira(Number(e.target.value))}
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {formatNaira(nairaToKobo(expenseNaira || 0))}
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToInventory}
                  onChange={(e) => setAddToInventory(e.target.checked)}
                />
                <span className="text-sm font-medium">Add items to inventory</span>
              </label>
            </div>

            {/* Items table spanning full width */}
            {addToInventory && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="sabi-label !mb-0">Items</label>
                  <button
                    onClick={addItem}
                    className="text-xs text-jollof flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <input
                        className="sabi-input !py-2 col-span-5"
                        placeholder="Item name"
                        value={it.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                      />
                      <input
                        type="number"
                        className="sabi-input !py-2 col-span-2"
                        placeholder="Qty"
                        value={it.quantity || ""}
                        onChange={(e) =>
                          updateItem(i, { quantity: Number(e.target.value) })
                        }
                      />
                      <input
                        type="number"
                        className="sabi-input !py-2 col-span-2"
                        placeholder="Cost ₦"
                        value={it.costPriceNaira || ""}
                        onChange={(e) =>
                          updateItem(i, { costPriceNaira: Number(e.target.value) })
                        }
                      />
                      <input
                        type="number"
                        className="sabi-input !py-2 col-span-2"
                        placeholder="Sell ₦"
                        value={it.sellingPriceNaira || ""}
                        onChange={(e) =>
                          updateItem(i, {
                            sellingPriceNaira: Number(e.target.value),
                          })
                        }
                      />
                      <button
                        onClick={() => removeItem(i)}
                        className="col-span-1 text-jollof flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] py-2">
                      No items detected. Add rows manually if needed.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button onClick={onClose} className="sabi-btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="sabi-btn-jollof flex-1"
              >
                {saving ? "Saving…" : "Confirm & save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
