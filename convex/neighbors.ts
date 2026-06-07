import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePermission } from "./auth";

export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_neighbors");
    return await ctx.db
      .query("neighbors")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("neighbors") },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.id);
    if (!neighbor) return null;
    await requirePermission(ctx, neighbor.businessId, "view_neighbors");
    return neighbor;
  },
});

export const ledger = query({
  args: { neighborId: v.id("neighbors") },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.neighborId);
    if (!neighbor) return [];
    await requirePermission(ctx, neighbor.businessId, "view_neighbors");
    return await ctx.db
      .query("neighborLedger")
      .withIndex("by_neighbor", (q) => q.eq("neighborId", args.neighborId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "manage_neighbors");
    return await ctx.db.insert("neighbors", {
      businessId: args.businessId,
      name: args.name.trim(),
      phone: args.phone,
      notes: args.notes,
      theyOweMe: 0,
      iOwe: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Record borrowing goods FROM a neighbor (we now owe them, at cost price)
 * or lending goods TO a neighbor (they now owe us).
 */
export const recordEntry = mutation({
  args: {
    neighborId: v.id("neighbors"),
    direction: v.union(v.literal("borrowed"), v.literal("lent")),
    amount: v.number(), // kobo (cost value)
    goodsName: v.optional(v.string()),
    quantity: v.optional(v.number()),
    productId: v.optional(v.id("inventory")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.neighborId);
    if (!neighbor) throw new Error("Neighbor not found");
    const { user } = await requirePermission(
      ctx,
      neighbor.businessId,
      "manage_neighbors"
    );

    const now = Date.now();
    await ctx.db.insert("neighborLedger", {
      businessId: neighbor.businessId,
      neighborId: args.neighborId,
      direction: args.direction,
      amount: args.amount,
      goodsName: args.goodsName,
      quantity: args.quantity,
      productId: args.productId,
      note: args.note,
      createdBy: user._id,
      createdAt: now,
    });

    if (args.direction === "borrowed") {
      await ctx.db.patch(args.neighborId, {
        iOwe: neighbor.iOwe + args.amount,
      });
      // If lending us a known product, optionally increase our sellable stock?
      // We deliberately DON'T add to inventory — borrowed goods aren't our stock.
    } else {
      // lent: they owe us; if from our inventory, reduce our stock
      await ctx.db.patch(args.neighborId, {
        theyOweMe: neighbor.theyOweMe + args.amount,
      });
      if (args.productId && args.quantity) {
        const product = await ctx.db.get(args.productId);
        if (product) {
          await ctx.db.patch(args.productId, {
            quantity: Math.max(0, product.quantity - args.quantity),
          });
        }
      }
    }
  },
});

/**
 * Settle part/all of a balance. settleIOwe = we paid them back;
 * settleTheyOwe = they paid us back.
 */
export const settle = mutation({
  args: {
    neighborId: v.id("neighbors"),
    which: v.union(v.literal("i_owe"), v.literal("they_owe")),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.neighborId);
    if (!neighbor) throw new Error("Neighbor not found");
    const { user } = await requirePermission(
      ctx,
      neighbor.businessId,
      "manage_neighbors"
    );

    const now = Date.now();
    if (args.which === "i_owe") {
      await ctx.db.patch(args.neighborId, {
        iOwe: Math.max(0, neighbor.iOwe - args.amount),
      });
      await ctx.db.insert("neighborLedger", {
        businessId: neighbor.businessId,
        neighborId: args.neighborId,
        direction: "settle_i_owe",
        amount: args.amount,
        note: args.note,
        createdBy: user._id,
        createdAt: now,
      });
    } else {
      await ctx.db.patch(args.neighborId, {
        theyOweMe: Math.max(0, neighbor.theyOweMe - args.amount),
      });
      await ctx.db.insert("neighborLedger", {
        businessId: neighbor.businessId,
        neighborId: args.neighborId,
        direction: "settle_they_owe",
        amount: args.amount,
        note: args.note,
        createdBy: user._id,
        createdAt: now,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("neighbors"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.id);
    if (!neighbor) throw new Error("Neighbor not found");
    await requirePermission(ctx, neighbor.businessId, "manage_neighbors");
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, val]) => val !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("neighbors") },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.id);
    if (!neighbor) return;
    await requirePermission(ctx, neighbor.businessId, "manage_neighbors");
    // delete ledger entries
    const entries = await ctx.db
      .query("neighborLedger")
      .withIndex("by_neighbor", (q) => q.eq("neighborId", args.id))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);
    await ctx.db.delete(args.id);
  },
});

/**
 * Used by transactions.create when a sale's goods were borrowed from a neighbor:
 * raises what we owe them by the cost value of the goods sold.
 */
export const _internalAddIOwe = internalMutation({
  args: {
    neighborId: v.id("neighbors"),
    amount: v.number(),
    goodsName: v.optional(v.string()),
    quantity: v.optional(v.number()),
    relatedTransactionId: v.optional(v.id("transactions")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const neighbor = await ctx.db.get(args.neighborId);
    if (!neighbor) return;
    await ctx.db.patch(args.neighborId, {
      iOwe: neighbor.iOwe + args.amount,
    });
    await ctx.db.insert("neighborLedger", {
      businessId: neighbor.businessId,
      neighborId: args.neighborId,
      direction: "borrowed",
      amount: args.amount,
      goodsName: args.goodsName,
      quantity: args.quantity,
      relatedTransactionId: args.relatedTransactionId,
      note: "Auto: sold borrowed goods",
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});
