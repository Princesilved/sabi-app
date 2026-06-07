"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { formatNaira, nairaToKobo } from "@/lib/currency";
import { timeAgo } from "@/lib/utils";
import { Plus, X, Phone } from "lucide-react";
import { toast } from "sonner";

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const customers = useQuery(
    api.customers.list,
    businessId ? { businessId } : "skip"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [paying, setPaying] = useState<any>(null);

  if (!businessId) return null;

  const sorted = customers
    ? [...customers].sort((a, b) => b.debt - a.debt || b.totalSpent - a.totalSpent)
    : [];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Customers
          </div>
          <h1 className="font-display text-5xl leading-none">
            Your <span className="italic">regulars.</span>
          </h1>
        </div>
        <button onClick={() => setAddOpen(true)} className="sabi-btn-jollof">
          <Plus className="w-4 h-4" /> Add customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers === undefined && (
          <div className="text-ink/50 text-sm">Loading…</div>
        )}
        {customers && customers.length === 0 && (
          <div className="sabi-card col-span-full p-12 text-center">
            <div className="font-display text-2xl mb-2">No customers yet.</div>
            <p className="text-ink/50 text-sm mb-5">
              Add your regulars to track debts, visits, and spend.
            </p>
            <button onClick={() => setAddOpen(true)} className="sabi-btn-primary">
              <Plus className="w-4 h-4" /> Add first customer
            </button>
          </div>
        )}
        {sorted.map((c) => (
          <div key={c._id} className="sabi-card sabi-card-hover">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-display text-2xl leading-none mb-1">
                  {c.name}
                </div>
                {c.phone && (
                  <div className="text-xs text-ink/50 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </div>
                )}
              </div>
              {c.debt > 0 && (
                <span className="px-2 py-1 bg-jollof/10 text-jollof text-[10px] uppercase tracking-wider font-medium rounded-full">
                  Owing
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink/50">Debt</span>
                <span
                  className={`font-display text-lg ${
                    c.debt > 0 ? "text-jollof" : "text-ink/40"
                  }`}
                >
                  {formatNaira(c.debt)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink/50">Total spent</span>
                <span className="font-medium">
                  {formatNaira(c.totalSpent, { compact: true })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink/50">Visits</span>
                <span className="font-medium">{c.visitCount}</span>
              </div>
              {c.lastVisit && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink/50">Last visit</span>
                  <span className="text-ink/70 text-xs">
                    {timeAgo(c.lastVisit)}
                  </span>
                </div>
              )}
            </div>

            {c.debt > 0 && (
              <button
                onClick={() => setPaying(c)}
                className="w-full text-sm py-2 border border-ink/15 rounded-full hover:border-jollof hover:text-jollof transition"
              >
                Record payment
              </button>
            )}
          </div>
        ))}
      </div>

      {addOpen && (
        <AddCustomerDialog
          businessId={businessId}
          onClose={() => setAddOpen(false)}
        />
      )}
      {paying && (
        <RecordPaymentDialog
          customer={paying}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}

function AddCustomerDialog({
  businessId,
  onClose,
}: {
  businessId: any;
  onClose: () => void;
}) {
  const create = useMutation(api.customers.create);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSubmitting(true);
    try {
      await create({
        businessId,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success("Customer added");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-paper rounded-2xl w-full max-w-md p-6 shadow-2xl animate-rise">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl">
            New <span className="italic text-jollof">customer</span>
          </h2>
          <button onClick={onClose} className="text-ink/50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="sabi-label">Name</label>
            <input
              className="sabi-input"
              placeholder="e.g. Mama Bukky"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="sabi-label">Phone (optional)</label>
            <input
              type="tel"
              className="sabi-input"
              placeholder="+234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="sabi-btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="sabi-btn-primary flex-1"
          >
            {submitting ? "Saving…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentDialog({
  customer,
  onClose,
}: {
  customer: any;
  onClose: () => void;
}) {
  const recordPayment = useMutation(api.customers.recordPayment);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await recordPayment({
        customerId: customer._id,
        amount: nairaToKobo(amt),
      });
      toast.success("Payment recorded");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-paper rounded-2xl w-full max-w-md p-6 shadow-2xl animate-rise">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl">Payment from {customer.name}</h2>
          <button onClick={onClose} className="text-ink/50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-ink/60 mb-4">
          Outstanding: <span className="text-jollof font-medium">{formatNaira(customer.debt)}</span>
        </p>
        <div className="mb-6">
          <label className="sabi-label">Amount paid (₦)</label>
          <input
            type="number"
            className="sabi-input text-2xl font-display"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="sabi-btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="sabi-btn-primary flex-1"
          >
            {submitting ? "Recording…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
