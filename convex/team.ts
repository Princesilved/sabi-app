import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember, requirePermission, requireOwner } from "./auth";
import { PLAN_LIMITS, PlanId } from "./plans";
import { ASSIGNABLE_ROLES } from "./permissions";

/**
 * List active members + pending invites for a business.
 * Any member can view the team list.
 */
export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.businessId);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    const members = [];
    for (const m of memberships) {
      const u = await ctx.db.get(m.userId);
      members.push({
        membershipId: m._id,
        userId: m.userId,
        role: m.role,
        status: m.status,
        name: u?.name ?? null,
        email: u?.email ?? m.invitedEmail ?? null,
      });
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    const pending = invites
      .filter((i) => i.status === "pending")
      .map((i) => ({
        inviteId: i._id,
        email: i.email,
        role: i.role,
        status: "pending" as const,
      }));

    return { members, pending };
  },
});

/**
 * Invite someone by email. Requires invite_members permission.
 * Enforces per-business staff limit based on the OWNER's plan.
 */
export const invite = mutation({
  args: {
    businessId: v.id("businesses"),
    email: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const { business } = await requirePermission(
      ctx,
      args.businessId,
      "invite_members"
    );

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email address");

    if (!ASSIGNABLE_ROLES.includes(args.role as any)) {
      throw new Error("Invalid role");
    }

    // Staff limit from owner's plan
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", business.ownerId))
      .first();
    const plan = (sub?.plan ?? "hustler") as PlanId;
    const limit = PLAN_LIMITS[plan].maxStaffPerBusiness;

    if (limit !== "unlimited") {
      const activeCount = (
        await ctx.db
          .query("memberships")
          .withIndex("by_business", (q) =>
            q.eq("businessId", args.businessId)
          )
          .collect()
      ).length;
      const pendingCount = (
        await ctx.db
          .query("invites")
          .withIndex("by_business", (q) =>
            q.eq("businessId", args.businessId)
          )
          .collect()
      ).filter((i) => i.status === "pending").length;

      // limit counts total seats incl. owner
      if (activeCount + pendingCount >= limit) {
        throw new Error(
          `Your ${plan} plan allows ${limit} ${limit === 1 ? "person" : "people"} per business. Upgrade to add more.`
        );
      }
    }

    // Already a member?
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingUser) {
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_business", (q) =>
          q.eq("userId", existingUser._id).eq("businessId", args.businessId)
        )
        .first();
      if (existingMembership) {
        throw new Error("That person is already a member of this business");
      }
      // Create active membership directly
      const { user } = await requireMember(ctx, args.businessId);
      await ctx.db.insert("memberships", {
        businessId: args.businessId,
        userId: existingUser._id,
        role: args.role,
        status: "active",
        invitedEmail: email,
        invitedBy: user._id,
      });
      return { linked: true };
    }

    // Otherwise create a pending invite (accepted when they sign up)
    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", email).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("businessId"), args.businessId))
      .first();
    if (existingInvite) throw new Error("Invite already sent to that email");

    const { user } = await requireMember(ctx, args.businessId);
    await ctx.db.insert("invites", {
      businessId: args.businessId,
      email,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });
    return { linked: false };
  },
});

export const changeRole = mutation({
  args: { membershipId: v.id("memberships"), role: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Member not found");
    await requirePermission(ctx, membership.businessId, "invite_members");

    if (membership.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }
    if (!ASSIGNABLE_ROLES.includes(args.role as any)) {
      throw new Error("Invalid role");
    }
    await ctx.db.patch(args.membershipId, { role: args.role });
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) return;
    await requirePermission(ctx, membership.businessId, "remove_members");
    if (membership.role === "owner") {
      throw new Error("Cannot remove the owner");
    }
    await ctx.db.delete(args.membershipId);
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return;
    await requirePermission(ctx, invite.businessId, "invite_members");
    await ctx.db.patch(args.inviteId, { status: "revoked" });
  },
});
