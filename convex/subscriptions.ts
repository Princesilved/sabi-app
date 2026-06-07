import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./auth";
import { PLAN_LIMITS, isTrialActive } from "./plans";

/**
 * Get the current user's subscription, computing live trial status.
 */
export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    let sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!sub) {
      return {
        plan: "hustler",
        status: "free",
        trialActive: false,
        trialEndsAt: null,
        daysLeftInTrial: 0,
      };
    }

    const trialActive = isTrialActive(sub);
    const daysLeft =
      trialActive && sub.trialEndsAt
        ? Math.ceil((sub.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

    return {
      plan: sub.plan,
      status: sub.status,
      trialActive,
      trialEndsAt: sub.trialEndsAt ?? null,
      daysLeftInTrial: daysLeft,
    };
  },
});

/**
 * Start a free trial on a paid plan. No payment required up front.
 * (Paystack subscription is set up later, before trial ends.)
 */
export const startTrial = mutation({
  args: { plan: v.string() }, // trader | empire
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.plan !== "trader" && args.plan !== "empire") {
      throw new Error("Trials are only for Trader or Empire plans");
    }

    const trialDays = PLAN_LIMITS[args.plan as "trader" | "empire"].trialDays;
    const now = Date.now();
    const trialEndsAt = now + trialDays * 24 * 60 * 60 * 1000;

    let sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (sub) {
      // Don't allow restarting a trial on the same plan
      if (sub.trialStartedAt && sub.plan === args.plan) {
        throw new Error("You've already used the trial for this plan");
      }
      await ctx.db.patch(sub._id, {
        plan: args.plan,
        status: "trialing",
        trialStartedAt: now,
        trialEndsAt,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: args.plan,
        status: "trialing",
        trialStartedAt: now,
        trialEndsAt,
      });
    }
    return { trialEndsAt };
  },
});

/**
 * Downgrade back to free Hustler.
 */
export const downgradeToFree = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (sub) {
      await ctx.db.patch(sub._id, {
        plan: "hustler",
        status: "free",
      });
    }
  },
});
