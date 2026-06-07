"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { useTheme } from "@/components/theme-provider";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, Sun, Moon, Monitor, Check, Plus } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { BUSINESS_TYPES } from "@/lib/business-types";

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "pidgin", label: "Nigerian Pidgin" },
  { value: "yoruba", label: "Yorùbá" },
  { value: "igbo", label: "Igbo" },
  { value: "hausa", label: "Hausa" },
  { value: "chinese", label: "中文 (Chinese)" },
];

const PLANS = [
  {
    id: "hustler",
    name: "Hustler",
    price: "Free",
    tagline: "Solo trader getting started",
    features: ["1 business", "Just you", "All core features", "AI + receipts"],
  },
  {
    id: "trader",
    name: "Trader",
    price: "₦5,000/mo",
    tagline: "Growing shop with a small team",
    features: ["Up to 3 businesses", "Up to 5 staff", "Team roles", "3 months free"],
  },
  {
    id: "empire",
    name: "Empire",
    price: "₦20,000/mo",
    tagline: "Multiple locations, serious scale",
    features: ["Unlimited businesses", "Unlimited staff", "Advanced analytics", "3 months free"],
  },
];

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const me = useQuery(api.users.me);
  const updateLanguage = useMutation(api.users.updateLanguage);
  const updateThemeMutation = useMutation(api.users.updateTheme);
  const checkModels = useAction(api.ai.availableModels);
  const { theme, setTheme } = useTheme();

  const subscription = useQuery(api.subscriptions.mySubscription);
  const startTrial = useMutation(api.subscriptions.startTrial);

  const { businesses, businessId, switchBusiness, role } = useBusiness();

  const [addBizOpen, setAddBizOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<{
    anthropic: boolean;
    gemini: boolean;
  } | null>(null);

  useEffect(() => {
    checkModels({})
      .then(setAvailableModels)
      .catch(() => setAvailableModels({ anthropic: false, gemini: false }));
  }, [checkModels]);

  if (!me) return null;

  const handleLangChange = async (lang: string) => {
    await updateLanguage({ language: lang });
    toast.success("Language updated");
  };

  const handleThemeChange = async (t: "light" | "dark" | "system") => {
    setTheme(t);
    try {
      await updateThemeMutation({ theme: t });
    } catch {
      /* non-critical */
    }
  };

  const handleStartTrial = async (plan: string) => {
    try {
      await startTrial({ plan });
      toast.success(`${plan === "trader" ? "Trader" : "Empire"} trial started — 3 months free!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isOwner = role === "owner";

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl">
      <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
        Settings
      </div>
      <h1 className="font-display text-5xl mb-10 leading-none">
        Your <span className="italic">account.</span>
      </h1>

      {/* Account */}
      <section className="sabi-card mb-6">
        <h2 className="font-display text-2xl mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <Row label="Name" value={user?.fullName || "—"} />
          <Row label="Email" value={user?.primaryEmailAddress?.emailAddress} />
          <Row label="Phone" value={me.phone || "—"} />
        </div>
      </section>

      {/* Appearance / Theme */}
      <section className="sabi-card mb-6">
        <h2 className="font-display text-2xl mb-2">Appearance</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Choose how Sabi looks. System follows your device setting.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((o) => {
            const Icon = o.icon;
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                onClick={() => handleThemeChange(o.value)}
                className="px-4 py-4 rounded-xl border transition flex flex-col items-center gap-2"
                style={{
                  borderColor: active ? "var(--jollof)" : "var(--border)",
                  background: active ? "rgba(212,70,33,0.06)" : "transparent",
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: active ? "var(--jollof)" : "var(--text-muted)" }}
                />
                <span className="text-sm">{o.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Subscription / Plan */}
      <section className="sabi-card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl">Plan & billing</h2>
          {subscription && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-jollof/10 text-jollof capitalize">
              {subscription.plan}
              {subscription.trialActive ? " · trial" : ""}
            </span>
          )}
        </div>

        {subscription?.trialActive && (
          <p className="text-sm text-[var(--moss)] mb-4">
            You're on a free trial — {subscription.daysLeftInTrial} days left.
          </p>
        )}

        {!isOwner && (
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Only the business owner can change the plan.
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          {PLANS.map((p) => {
            const isCurrent = subscription?.plan === p.id;
            return (
              <div
                key={p.id}
                className="rounded-xl border p-4 flex flex-col"
                style={{
                  borderColor: isCurrent ? "var(--jollof)" : "var(--border)",
                  background: isCurrent ? "rgba(212,70,33,0.05)" : "transparent",
                }}
              >
                <div className="font-display text-xl">{p.name}</div>
                <div className="text-jollof font-medium text-sm mb-1">{p.price}</div>
                <div className="text-xs text-[var(--text-muted)] mb-3">{p.tagline}</div>
                <ul className="space-y-1 mb-4 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs flex items-start gap-1">
                      <Check className="w-3 h-3 text-[var(--moss)] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isOwner && !isCurrent && p.id !== "hustler" && (
                  <button
                    onClick={() => handleStartTrial(p.id)}
                    className="sabi-btn-primary !py-2 text-xs w-full"
                  >
                    Start 3-month trial
                  </button>
                )}
                {isCurrent && (
                  <span className="text-xs text-center text-[var(--text-muted)] py-2">
                    Current plan
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Payment is handled when your trial ends — no card needed to start. (Paystack
          billing is coming soon.)
        </p>
      </section>

      {/* AI engine — Gemini only */}
      <section className="sabi-card mb-6">
        <h2 className="font-display text-2xl mb-2">AI engine</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Sabi runs on Google Gemini — fast, with a generous free tier. It powers
          the assistant, advert writer, and receipt scanning.
        </p>
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "var(--bg-deep)" }}
        >
          <Zap className="w-5 h-5 text-jollof shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Gemini</div>
            <div className="text-xs text-[var(--text-muted)]">
              {availableModels === null
                ? "Checking…"
                : availableModels.gemini
                ? "Connected and ready"
                : "Not configured — set GEMINI_API_KEY in Convex env"}
            </div>
          </div>
          {availableModels?.gemini && (
            <span className="text-xs uppercase tracking-wider text-[var(--moss)]">
              Active
            </span>
          )}
        </div>
      </section>

      {/* Language */}
      <section className="sabi-card mb-6">
        <h2 className="font-display text-2xl mb-2">Language</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Sabi will default to this language. You can mix languages mid-conversation.
        </p>
        <div className="space-y-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              onClick={() => handleLangChange(l.value)}
              className="w-full text-left px-4 py-3 rounded-xl border transition"
              style={{
                borderColor:
                  me.preferredLanguage === l.value ? "var(--jollof)" : "var(--border)",
                background:
                  me.preferredLanguage === l.value
                    ? "rgba(212,70,33,0.05)"
                    : "transparent",
              }}
            >
              {l.label}
              {me.preferredLanguage === l.value && (
                <span className="float-right text-jollof text-xs uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Businesses */}
      <section className="sabi-card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl">Businesses</h2>
          {isOwner && (
            <button
              onClick={() => setAddBizOpen(true)}
              className="sabi-btn-jollof !py-2 !px-3 text-xs"
            >
              <Plus className="w-4 h-4" /> Add business
            </button>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Switch between businesses you own or belong to.
          {subscription && (
            <>
              {" "}Your <span className="capitalize">{subscription.plan}</span> plan
              {subscription.plan === "hustler" && " allows 1 business."}
              {subscription.plan === "trader" && " allows up to 3 businesses."}
              {subscription.plan === "empire" && " allows unlimited businesses."}
            </>
          )}
        </p>
        <div className="space-y-2">
          {businesses?.map((b) => (
            <button
              key={b._id}
              onClick={() => switchBusiness(b._id)}
              className="w-full text-left px-4 py-3 rounded-xl border transition"
              style={{
                borderColor: businessId === b._id ? "var(--jollof)" : "var(--border)",
                background:
                  businessId === b._id ? "rgba(212,70,33,0.05)" : "transparent",
              }}
            >
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-[var(--text-muted)] capitalize">
                {b.type} {b.location ? `· ${b.location}` : ""} · {b.role}
              </div>
            </button>
          ))}
        </div>
      </section>

      {addBizOpen && (
        <AddBusinessDialog onClose={() => setAddBizOpen(false)} />
      )}

      {/* Danger zone — owner only */}
      {isOwner && businessId && (
        <DangerZone
          businessId={businessId}
          businessName={businesses?.find((b) => b._id === businessId)?.name || ""}
          onDeleted={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}

function DangerZone({
  businessId,
  businessName,
  onDeleted,
}: {
  businessId: any;
  businessName: string;
  onDeleted: () => void;
}) {
  const removeBusiness = useMutation(api.businesses.remove);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== businessName) {
      toast.error("The name doesn't match");
      return;
    }
    setDeleting(true);
    try {
      await removeBusiness({ id: businessId, confirmName: confirmText });
      toast.success("Business deleted");
      localStorage.removeItem("sabi:activeBusinessId");
      onDeleted();
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  return (
    <section
      className="rounded-2xl p-6 mb-6"
      style={{ border: "1px solid var(--jollof)", background: "rgba(212,70,33,0.04)" }}
    >
      <h2 className="font-display text-2xl mb-2 text-jollof">Danger zone</h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Deleting a business permanently removes all its transactions, inventory,
        customers, receipts, and team. This cannot be undone.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="sabi-btn-secondary"
          style={{ borderColor: "var(--jollof)", color: "var(--jollof)" }}
        >
          Delete this business
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="sabi-label">
              Type the business name to confirm:{" "}
              <span className="font-medium text-[var(--text)]">{businessName}</span>
            </label>
            <input
              className="sabi-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={businessName}
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={finalConfirm}
              onChange={(e) => setFinalConfirm(e.target.checked)}
              className="mt-1"
            />
            <span>
              I understand this will permanently delete everything in this
              business and cannot be reversed.
            </span>
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setFinalConfirm(false);
              }}
              className="sabi-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={
                deleting || confirmText !== businessName || !finalConfirm
              }
              className="sabi-btn-jollof flex-1"
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      className="flex justify-between py-2"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function AddBusinessDialog({ onClose }: { onClose: () => void }) {
  const createBusiness = useMutation(api.businesses.create);
  const { switchBusiness } = useBusiness();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Enter a business name");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createBusiness({
        name: name.trim(),
        type: type || "Other",
        location: location.trim() || undefined,
      });
      switchBusiness(id);
      toast.success("Business added");
      onClose();
    } catch (e: any) {
      // Plan-limit errors come back here with a clear message
      toast.error(e.message || "Could not add business");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className="rounded-2xl w-full max-w-md p-6 shadow-2xl animate-rise my-auto"
        style={{ background: "var(--paper)" }}
      >
        <h2 className="font-display text-3xl mb-5">
          Add a <span className="italic text-jollof">business</span>
        </h2>
        <label className="sabi-label">Business name</label>
        <input
          className="sabi-input mb-4"
          placeholder="e.g. Mama Bukky Provisions"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <label className="sabi-label">Type of business</label>
        <div className="mb-4">
          <Combobox
            options={BUSINESS_TYPES}
            value={type}
            onChange={setType}
            placeholder="Start typing… e.g. pharmacy, POS"
          />
        </div>
        <label className="sabi-label">Location (optional)</label>
        <input
          className="sabi-input mb-6"
          placeholder="e.g. Ajah, Lagos"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
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
            {submitting ? "Adding…" : "Add business"}
          </button>
        </div>
      </div>
    </div>
  );
}
