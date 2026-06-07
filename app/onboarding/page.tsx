"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { Check } from "lucide-react";

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
    sub: "forever",
    tagline: "Solo trader getting started",
    features: ["1 business", "Just you", "All core features", "AI + receipt scanning"],
  },
  {
    id: "trader",
    name: "Trader",
    price: "₦5,000",
    sub: "/month",
    tagline: "Growing shop with a small team",
    features: ["Up to 3 businesses", "Up to 5 staff", "Team roles", "3 months free trial"],
  },
  {
    id: "empire",
    name: "Empire",
    price: "₦20,000",
    sub: "/month",
    tagline: "Multiple locations, serious scale",
    features: ["Unlimited businesses", "Unlimited staff", "Advanced analytics", "3 months free trial"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const businesses = useQuery(api.businesses.list);
  const ensureUser = useMutation(api.users.ensureUser);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const createBusiness = useMutation(api.businesses.create);
  const startTrial = useMutation(api.subscriptions.startTrial);

  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("english");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [plan, setPlan] = useState("hustler");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (me === null) ensureUser().catch(() => {});
  }, [me, ensureUser]);

  useEffect(() => {
    if (me?.onboarded && businesses && businesses.length > 0) {
      router.replace("/dashboard");
    }
  }, [me, businesses, router]);

  const handleFinish = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter a business name");
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding({ preferredLanguage: language, phone });
      await createBusiness({
        name: businessName.trim(),
        type: businessType || "Other",
        location: location.trim() || undefined,
      });
      // Paid plans: start the 3-month trial (free at backend for now)
      if (plan === "trader" || plan === "empire") {
        try {
          await startTrial({ plan });
        } catch {
          /* non-fatal; they can choose later in Settings */
        }
      }
      toast.success("Welcome to Sabi! 🎉");
      router.replace("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-3 h-3 bg-jollof rounded-full" />
          <span className="font-display text-2xl italic">Sabi</span>
        </div>

        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition"
              style={{ background: s <= step ? "var(--jollof)" : "var(--border)" }}
            />
          ))}
        </div>

        {/* Step 1 — language */}
        {step === 1 && (
          <div className="animate-rise">
            <h1 className="font-display text-5xl leading-none mb-3">
              First, <span className="italic text-jollof">how do you talk?</span>
            </h1>
            <p className="text-[var(--text-muted)] mb-8">
              Pick the language Sabi defaults to. You can change anytime and mix
              languages mid-conversation.
            </p>
            <div className="space-y-2 mb-8">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className="w-full text-left px-5 py-4 rounded-xl border transition"
                  style={{
                    borderColor: language === l.value ? "var(--jollof)" : "var(--border)",
                    background: language === l.value ? "rgba(212,70,33,0.05)" : "transparent",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="sabi-btn-primary w-full">
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — business details */}
        {step === 2 && (
          <div className="animate-rise">
            <h1 className="font-display text-5xl leading-none mb-3">
              Tell me about your <span className="italic text-jollof">business</span>
            </h1>
            <p className="text-[var(--text-muted)] mb-8">You can add more later.</p>

            <div className="mb-6">
              <label className="sabi-label">Business name</label>
              <input
                type="text"
                className="sabi-input"
                placeholder="e.g. Mama Bukky Provisions"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="sabi-label">Type of business</label>
              <Combobox
                options={BUSINESS_TYPES}
                value={businessType}
                onChange={setBusinessType}
                placeholder="Start typing… e.g. pharmacy, POS, frozen foods"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Type to search, or enter your own.
              </p>
            </div>

            <div className="mb-8">
              <label className="sabi-label">Location (optional)</label>
              <input
                type="text"
                className="sabi-input"
                placeholder="e.g. Ajah, Lagos"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="sabi-btn-secondary">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="sabi-btn-primary flex-1"
                disabled={!businessName.trim()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — plan */}
        {step === 3 && (
          <div className="animate-rise">
            <h1 className="font-display text-5xl leading-none mb-3">
              Choose your <span className="italic text-jollof">plan</span>
            </h1>
            <p className="text-[var(--text-muted)] mb-8">
              Paid plans come with a full 3-month free trial — no card needed now.
            </p>

            <div className="space-y-3 mb-8">
              {PLANS.map((p) => {
                const active = plan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className="w-full text-left rounded-xl border p-5 transition"
                    style={{
                      borderColor: active ? "var(--jollof)" : "var(--border)",
                      background: active ? "rgba(212,70,33,0.05)" : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-display text-2xl">{p.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{p.tagline}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-2xl text-jollof">{p.price}</span>
                        <span className="text-xs text-[var(--text-muted)]">{p.sub}</span>
                      </div>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
                      {p.features.map((f) => (
                        <li key={f} className="text-xs flex items-start gap-1">
                          <Check className="w-3 h-3 text-[var(--moss)] mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="sabi-btn-secondary">
                ← Back
              </button>
              <button onClick={() => setStep(4)} className="sabi-btn-primary flex-1">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — confirm */}
        {step === 4 && (
          <div className="animate-rise">
            <h1 className="font-display text-5xl leading-none mb-3">
              One last <span className="italic text-jollof">thing</span>
            </h1>
            <p className="text-[var(--text-muted)] mb-8">
              Your WhatsApp number, so Sabi can send reports later.
            </p>

            <div className="mb-8">
              <label className="sabi-label">WhatsApp number (optional)</label>
              <input
                type="tel"
                className="sabi-input"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div
              className="rounded-xl p-5 mb-8"
              style={{ background: "var(--bg-deep)" }}
            >
              <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
                You're setting up
              </div>
              <div className="font-display text-2xl mb-1">{businessName}</div>
              <div className="text-sm text-[var(--text-muted)]">
                {businessType || "Business"}
                {location ? ` · ${location}` : ""}
                {" · "}
                {LANGUAGES.find((l) => l.value === language)?.label}
              </div>
              <div className="mt-2 text-sm">
                Plan:{" "}
                <span className="text-jollof font-medium">
                  {PLANS.find((p) => p.id === plan)?.name}
                </span>
                {plan !== "hustler" && " (3-month free trial)"}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="sabi-btn-secondary"
                disabled={submitting}
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                className="sabi-btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? "Setting up…" : "Open dashboard →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
