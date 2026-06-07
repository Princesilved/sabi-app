import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import {
  getCurrentUser,
  requireUser,
  requireMember,
  requirePermission,
  requireOwner,
} from "./auth";
import { roleHasPermission, ROLE_PERMISSIONS } from "./permissions";
import { PLAN_LIMITS, PlanId } from "./plans";

/**
 * List businesses the current user can access (as owner or member),
 * each annotated with the caller's role.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const results = [];
    for (const m of memberships) {
      if (m.status !== "active") continue;
      const business = await ctx.db.get(m.businessId);
      if (business) {
        results.push({ ...business, role: m.role });
      }
    }
    return results;
  },
});

export const get = query({
  args: { id: v.id("businesses") },
  handler: async (ctx, args) => {
    const access = await requireMember(ctx, args.id).catch(() => null);
    if (!access) return null;
    return { ...access.business, role: access.membership.role };
  },
});

/**
 * Create a business. Enforces plan limits on number of businesses.
 * The creator becomes owner with an owner membership.
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Count businesses this user OWNS
    const owned = await ctx.db
      .query("businesses")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Determine plan
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const plan = (sub?.plan ?? "hustler") as PlanId;
    const limit = PLAN_LIMITS[plan].maxBusinesses;

    if (limit !== "unlimited" && owned.length >= limit) {
      throw new Error(
        `Your ${plan} plan allows ${limit} business${limit === 1 ? "" : "es"}. Upgrade to add more.`
      );
    }

    const businessId = await ctx.db.insert("businesses", {
      ownerId: user._id,
      name: args.name,
      type: args.type,
      location: args.location,
      currency: "NGN",
      healthScore: 75,
    });

    // Owner membership
    await ctx.db.insert("memberships", {
      businessId,
      userId: user._id,
      role: "owner",
      status: "active",
    });

    return businessId;
  },
});

export const update = mutation({
  args: {
    id: v.id("businesses"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.id, "edit_business");
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

/**
 * Delete a business. Owner-only. Requires confirmation token = exact name.
 * (UI also makes the user type the name + a second confirm.)
 */
export const remove = mutation({
  args: { id: v.id("businesses"), confirmName: v.string() },
  handler: async (ctx, args) => {
    const { business } = await requireOwner(ctx, args.id);
    if (args.confirmName !== business.name) {
      throw new Error("Confirmation text does not match the business name");
    }

    // Cascade delete related data
    const tables = [
      "transactions",
      "inventory",
      "customers",
      "receipts",
      "memberships",
      "conversations",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_business", (q) => q.eq("businessId", args.id))
        .collect();
      for (const row of rows) {
        // Delete messages under conversations
        if (table === "conversations") {
          const msgs = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
              q.eq("conversationId", row._id as any)
            )
            .collect();
          for (const m of msgs) await ctx.db.delete(m._id);
        }
        await ctx.db.delete(row._id);
      }
    }

    // Delete invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_business", (q) => q.eq("businessId", args.id))
      .collect();
    for (const inv of invites) await ctx.db.delete(inv._id);

    await ctx.db.delete(args.id);
  },
});

/**
 * Dashboard stats. Requires view_revenue permission.
 * Roles without view_revenue (sales_rep, marketer, inventory_clerk) get a
 * permission error here and the UI shows a restricted view instead.
 */
export const stats = query({
  args: { businessId: v.id("businesses"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { membership } = await requireMember(ctx, args.businessId);

    // If the role can't view revenue, return a restricted snapshot only.
    const canViewMoney = roleHasPermission(membership.role, "view_revenue");

    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    const lowStock = inventory.filter(
      (i) => i.lowStockThreshold && i.quantity <= i.lowStockThreshold
    );

    if (!canViewMoney) {
      // Restricted: no money figures at all
      return {
        restricted: true,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.slice(0, 5),
        inventoryItemCount: inventory.length,
      };
    }

    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_business_date", (q) =>
        q.eq("businessId", args.businessId).gte("date", since)
      )
      .collect();

    let revenue = 0,
      expenses = 0,
      revenueToday = 0,
      expensesToday = 0;
    for (const t of txns) {
      if (t.type === "revenue") {
        revenue += t.amount;
        if (t.date >= todayStart.getTime()) revenueToday += t.amount;
      } else {
        expenses += t.amount;
        if (t.date >= todayStart.getTime()) expensesToday += t.amount;
      }
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    const totalDebt = customers.reduce((s, c) => s + (c.debt || 0), 0);
    const inventoryValue = inventory.reduce(
      (s, i) => s + i.costPrice * i.quantity,
      0
    );

    return {
      restricted: false,
      revenue,
      expenses,
      profit: revenue - expenses,
      revenueToday,
      expensesToday,
      profitToday: revenueToday - expensesToday,
      transactionCount: txns.length,
      lowStockCount: lowStock.length,
      customerCount: customers.length,
      totalDebt,
      inventoryValue,
      lowStockItems: lowStock.slice(0, 5),
    };
  },
});

/**
 * The set of permissions the current user has on a business — the UI uses
 * this to show/hide features. Server still enforces independently.
 */
export const myPermissions = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const access = await requireMember(ctx, args.businessId).catch(() => null);
    if (!access) return null;
    return {
      role: access.membership.role,
      permissions:
        ROLE_PERMISSIONS[
          access.membership.role as keyof typeof ROLE_PERMISSIONS
        ] ?? [],
    };
  },
});

// ---- internal (for AI action context) ----
export const _internalGet = internalQuery({
  args: { id: v.id("businesses") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const _internalStats = internalQuery({
  args: { businessId: v.id("businesses"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_business_date", (q) =>
        q.eq("businessId", args.businessId).gte("date", since)
      )
      .collect();
    let revenue = 0,
      expenses = 0,
      revenueToday = 0,
      expensesToday = 0;
    for (const t of txns) {
      if (t.type === "revenue") {
        revenue += t.amount;
        if (t.date >= todayStart.getTime()) revenueToday += t.amount;
      } else {
        expenses += t.amount;
        if (t.date >= todayStart.getTime()) expensesToday += t.amount;
      }
    }
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      revenueToday,
      expensesToday,
      profitToday: revenueToday - expensesToday,
      transactionCount: txns.length,
      lowStockCount: inventory.filter(
        (i) => i.lowStockThreshold && i.quantity <= i.lowStockThreshold
      ).length,
      customerCount: customers.length,
      totalDebt: customers.reduce((s, c) => s + (c.debt || 0), 0),
      inventoryValue: inventory.reduce(
        (s, i) => s + i.costPrice * i.quantity,
        0
      ),
    };
  },
});
