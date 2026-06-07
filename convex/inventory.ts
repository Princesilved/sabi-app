import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requirePermission } from "./auth";

export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_inventory");
    return await ctx.db
      .query("inventory")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;
    await requirePermission(ctx, item.businessId, "view_inventory");
    return item;
  },
});

export const create = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    sku: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    lowStockThreshold: v.optional(v.number()),
    producer: v.optional(v.string()),
    supplier: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    expiryDate: v.optional(v.number()),
    barcode: v.optional(v.string()),
    // "Money runs inventory": optionally record how this stock was paid for.
    recordCost: v.optional(
      v.union(v.literal("none"), v.literal("expense"), v.literal("borrowed"))
    ),
    neighborId: v.optional(v.id("neighbors")), // when recordCost = borrowed
  },
  handler: async (ctx, args) => {
    const { user } = await requirePermission(
      ctx,
      args.businessId,
      "edit_inventory"
    );
    const now = Date.now();
    const { recordCost, neighborId, ...itemFields } = args;

    const itemId = await ctx.db.insert("inventory", {
      ...itemFields,
      unitsSold: 0,
      createdAt: now,
    });

    const totalCost = args.costPrice * args.quantity;

    if (recordCost === "expense" && totalCost > 0) {
      await ctx.db.insert("transactions", {
        businessId: args.businessId,
        type: "expense",
        amount: totalCost,
        description: `Stock purchase: ${args.quantity} ${args.unit || "pcs"} ${args.name}`,
        category: "stock_purchase",
        date: now,
        createdAt: now,
        createdBy: user._id,
      });
    } else if (recordCost === "borrowed" && neighborId && totalCost > 0) {
      const neighbor = await ctx.db.get(neighborId);
      if (neighbor) {
        await ctx.db.patch(neighborId, { iOwe: neighbor.iOwe + totalCost });
        await ctx.db.insert("neighborLedger", {
          businessId: args.businessId,
          neighborId,
          direction: "borrowed",
          amount: totalCost,
          goodsName: args.name,
          quantity: args.quantity,
          productId: itemId,
          note: "Stock taken on credit from neighbor",
          createdBy: user._id,
          createdAt: now,
        });
      }
    }

    return itemId;
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    producer: v.optional(v.string()),
    supplier: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    expiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    await requirePermission(ctx, item.businessId, "edit_inventory");
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const adjustStock = mutation({
  args: { id: v.id("inventory"), delta: v.number() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    await requirePermission(ctx, item.businessId, "edit_inventory");
    await ctx.db.patch(args.id, {
      quantity: Math.max(0, item.quantity + args.delta),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await requirePermission(ctx, item.businessId, "edit_inventory");
    await ctx.db.delete(args.id);
  },
});

/**
 * Stock velocity: for each item, average daily units sold over the last N days,
 * and estimated days of stock remaining. Powers "running out soon" alerts.
 */
export const velocity = query({
  args: { businessId: v.id("businesses"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_inventory");
    const days = args.days ?? 14;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    const results = [];
    for (const item of items) {
      const movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_product_date", (q) =>
          q.eq("productId", item._id).gte("createdAt", since)
        )
        .collect();
      const soldInWindow = movements.reduce((s, m) => s + m.quantity, 0);
      const perDay = soldInWindow / days;
      const daysLeft =
        perDay > 0 ? Math.floor(item.quantity / perDay) : null;
      results.push({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        soldInWindow,
        perDay: Math.round(perDay * 10) / 10,
        daysLeft, // null = no recent sales
      });
    }
    // Sort: items running out soonest first (nulls last)
    results.sort((a, b) => {
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
    return results;
  },
});

export const _internalList = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("inventory")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect(),
});

// Used by receipt confirmation to add/merge stock
export const _internalUpsertFromReceipt = internalMutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    quantity: v.number(),
    costPrice: v.number(),
    sellingPrice: v.optional(v.number()),
    unit: v.optional(v.string()),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find existing item by name
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_business_name", (q) =>
        q.eq("businessId", args.businessId).eq("name", args.name)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
        costPrice: args.costPrice || existing.costPrice,
        supplier: args.supplier ?? existing.supplier,
      });
      return existing._id;
    }
    return await ctx.db.insert("inventory", {
      businessId: args.businessId,
      name: args.name,
      quantity: args.quantity,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice ?? Math.round(args.costPrice * 1.2),
      unit: args.unit ?? "pcs",
      supplier: args.supplier,
      lowStockThreshold: 5,
    });
  },
});
