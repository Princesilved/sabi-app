import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePermission } from "./auth";

export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_inventory");
    return await ctx.db
      .query("suppliers")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

export const create = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    type: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "edit_inventory");
    return await ctx.db.insert("suppliers", {
      businessId: args.businessId,
      name: args.name.trim(),
      phone: args.phone,
      type: args.type,
      notes: args.notes,
      totalPurchased: 0,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    type: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.id);
    if (!supplier) throw new Error("Supplier not found");
    await requirePermission(ctx, supplier.businessId, "edit_inventory");
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, val]) => val !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.id);
    if (!supplier) return;
    await requirePermission(ctx, supplier.businessId, "edit_inventory");
    await ctx.db.delete(args.id);
  },
});

// Find-or-create by name; used when adding inventory with a typed supplier name.
export const _internalEnsure = internalMutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) return null;
    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_business_name", (q) =>
        q.eq("businessId", args.businessId).eq("name", name)
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("suppliers", {
      businessId: args.businessId,
      name,
      totalPurchased: 0,
      createdAt: Date.now(),
    });
  },
});
