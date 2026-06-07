import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requirePermission } from "./auth";

export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_customers");
    return await ctx.db
      .query("customers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

export const debtors = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_customers");
    const all = await ctx.db
      .query("customers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
    return all.filter((c) => c.debt > 0).sort((a, b) => b.debt - a.debt);
  },
});

export const create = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "edit_customers");
    return await ctx.db.insert("customers", {
      ...args,
      debt: 0,
      totalSpent: 0,
      visitCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const recordPayment = mutation({
  args: { customerId: v.id("customers"), amount: v.number() },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    const { user } = await requirePermission(
      ctx,
      customer.businessId,
      "record_payment"
    );
    await ctx.db.patch(args.customerId, {
      debt: Math.max(0, customer.debt - args.amount),
    });
    await ctx.db.insert("transactions", {
      businessId: customer.businessId,
      type: "revenue",
      amount: args.amount,
      description: `Debt payment from ${customer.name}`,
      category: "debt_payment",
      customerId: args.customerId,
      date: Date.now(),
      createdAt: Date.now(),
      isCredit: false,
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.id);
    if (!customer) throw new Error("Customer not found");
    await requirePermission(ctx, customer.businessId, "edit_customers");
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.id);
    if (!customer) return;
    await requirePermission(ctx, customer.businessId, "edit_customers");
    await ctx.db.delete(args.id);
  },
});

export const _internalList = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("customers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect(),
});
