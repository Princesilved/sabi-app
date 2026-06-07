import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * Called after Clerk sign-up / first sign-in. Idempotent.
 * Also auto-accepts any pending invites that match the user's email.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: identity.email ?? "",
        name: identity.name ?? undefined,
        onboarded: false,
        theme: "system",
      });
      user = await ctx.db.get(userId);
    }

    // Auto-accept pending invites matching this email
    if (user?.email) {
      const pending = await ctx.db
        .query("invites")
        .withIndex("by_email_status", (q) =>
          q.eq("email", user!.email).eq("status", "pending")
        )
        .collect();

      for (const invite of pending) {
        // Avoid duplicate membership
        const existing = await ctx.db
          .query("memberships")
          .withIndex("by_user_business", (q) =>
            q.eq("userId", user!._id).eq("businessId", invite.businessId)
          )
          .first();
        if (!existing) {
          await ctx.db.insert("memberships", {
            businessId: invite.businessId,
            userId: user!._id,
            role: invite.role,
            status: "active",
            invitedEmail: invite.email,
            invitedBy: invite.invitedBy,
          });
        }
        await ctx.db.patch(invite._id, { status: "accepted" });
      }
    }

    return user?._id;
  },
});

export const completeOnboarding = mutation({
  args: {
    preferredLanguage: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      onboarded: true,
      preferredLanguage: args.preferredLanguage,
      phone: args.phone,
    });

    // Ensure the user has a subscription row (defaults to free Hustler)
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!sub) {
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: "hustler",
        status: "free",
      });
    }
  },
});

export const updateLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { preferredLanguage: args.language });
  },
});

export const updateAIModel = mutation({
  args: { model: v.string() }, // gemini | anthropic
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { preferredAIModel: args.model });
  },
});

export const updateTheme = mutation({
  args: { theme: v.string() }, // light | dark | system
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { theme: args.theme });
  },
});
