/**
 * Sabi pricing plans, limits, and trial config.
 * Prices in kobo (₦1 = 100 kobo).
 */

export type PlanId = "hustler" | "trader" | "empire";

export const PLAN_LIMITS: Record<
  PlanId,
  {
    maxBusinesses: number | "unlimited";
    maxStaffPerBusiness: number | "unlimited";
    trialDays: number;
    priceKobo: number; // monthly
  }
> = {
  hustler: {
    maxBusinesses: 1,
    maxStaffPerBusiness: 1, // one-person business
    trialDays: 0,
    priceKobo: 0,
  },
  trader: {
    maxBusinesses: 3,
    maxStaffPerBusiness: 5,
    trialDays: 90, // 3 months
    priceKobo: 500000, // ₦5,000
  },
  empire: {
    maxBusinesses: "unlimited",
    maxStaffPerBusiness: "unlimited",
    trialDays: 90, // 3 months
    priceKobo: 2000000, // ₦20,000
  },
};

export const PLAN_INFO: Record<
  PlanId,
  { name: string; tagline: string; features: string[] }
> = {
  hustler: {
    name: "Hustler",
    tagline: "For the solo trader getting started.",
    features: [
      "1 business",
      "Just you — no extra staff",
      "Log sales, expenses, inventory, customers",
      "AI assistant (Gemini)",
      "Receipt scanning",
    ],
  },
  trader: {
    name: "Trader",
    tagline: "For growing shops with a small team.",
    features: [
      "Up to 3 businesses",
      "Up to 5 staff per business",
      "Team roles & permissions",
      "Everything in Hustler",
      "Priority AI (Claude backup)",
      "3 months free trial",
    ],
  },
  empire: {
    name: "Empire",
    tagline: "For serious operators running multiple locations.",
    features: [
      "Unlimited businesses",
      "Unlimited staff",
      "Full team roles & permissions",
      "Everything in Trader",
      "Advanced analytics",
      "3 months free trial",
    ],
  },
};

export function isTrialActive(sub: {
  status: string;
  trialEndsAt?: number;
}): boolean {
  if (sub.status !== "trialing") return false;
  if (!sub.trialEndsAt) return false;
  return Date.now() < sub.trialEndsAt;
}

export function planRank(plan: string): number {
  return { hustler: 0, trader: 1, empire: 2 }[plan as PlanId] ?? 0;
}
