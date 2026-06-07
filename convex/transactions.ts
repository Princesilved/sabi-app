import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission } from "./auth";

export const list = query({
  args: {
    businessId: v.id("businesses"),
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("revenue"), v.literal("expense"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "view_revenue");
    const limit = args.limit ?? 50;

    let q;
    if (args.type) {
      q = ctx.db
        .query("transactions")
        .withIndex("by_business_type", (qq) =>
          qq.eq("businessId", args.businessId).eq("type", args.type!)
        );
    } else {
      q = ctx.db
        .query("transactions")
        .withIndex("by_business", (qq) => qq.eq("businessId", args.businessId));
    }
    const results = await q.order("desc").take(limit);

    const enriched = await Promise.all(
      results.map(async (t) => {
        let customerName: string | undefined;
        let neighborName: string | undefined;
        if (t.customerId) {
          const c = await ctx.db.get(t.customerId);
          customerName = c?.name;
        }
        if (t.neighborId) {
          const n = await ctx.db.get(t.neighborId);
          neighborName = n?.name;
        }
        return { ...t, customerName, neighborName };
      })
    );
    return enriched;
  },
});

export const create = mutation({
  args: {
    businessId: v.id("businesses"),
    type: v.union(v.literal("revenue"), v.literal("expense")),
    amount: v.number(),
    description: v.string(),
    category: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    saleType: v.optional(v.string()), // retail | wholesale
    stockSource: v.optional(
      v.union(v.literal("inventory"), v.literal("borrowed"))
    ),
    neighborId: v.optional(v.id("neighbors")),
    items: v.optional(
      v.array(
        v.object({
          productId: v.optional(v.id("inventory")),
          name: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          costPrice: v.optional(v.number()),
          supplierName: v.optional(v.string()),
        })
      )
    ),
    paymentMethod: v.optional(v.string()),
    isCredit: v.optional(v.boolean()),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    receiptId: v.optional(v.id("receipts")),
  },
  handler: async (ctx, args) => {
    const perm = args.type === "revenue" ? "log_revenue" : "log_expense";
    const { user } = await requirePermission(ctx, args.businessId, perm);

    const now = Date.now();
    const stockSource = args.stockSource ?? "inventory";

    const txnId = await ctx.db.insert("transactions", {
      businessId: args.businessId,
      type: args.type,
      amount: args.amount,
      description: args.description,
      category: args.category,
      customerId: args.customerId,
      saleType: args.saleType,
      stockSource: args.type === "revenue" ? stockSource : undefined,
      neighborId: stockSource === "borrowed" ? args.neighborId : undefined,
      items: args.items,
      paymentMethod: args.paymentMethod,
      isCredit: args.isCredit ?? false,
      date: args.date ?? now,
      createdAt: now,
      notes: args.notes,
      receiptId: args.receiptId,
      createdBy: user._id,
    });

    // Stock + velocity handling only for sales of OUR inventory
    if (args.type === "revenue" && args.items) {
      if (stockSource === "inventory") {
        for (const item of args.items) {
          if (item.productId) {
            const product = await ctx.db.get(item.productId);
            if (product) {
              await ctx.db.patch(item.productId, {
                quantity: Math.max(0, product.quantity - item.quantity),
                unitsSold: (product.unitsSold ?? 0) + item.quantity,
                lastSoldAt: now,
              });
              // velocity record
              await ctx.db.insert("stockMovements", {
                businessId: args.businessId,
                productId: item.productId,
                quantity: item.quantity,
                createdAt: now,
              });
            }
          }
        }
      } else if (stockSource === "borrowed" && args.neighborId) {
        // We owe the neighbor the COST value of goods sold
        const owedCost = args.items.reduce(
          (sum, it) => sum + (it.costPrice ?? 0) * it.quantity,
          0
        );
        if (owedCost > 0) {
          await ctx.runMutation(internal.neighbors._internalAddIOwe, {
            neighborId: args.neighborId,
            amount: owedCost,
            goodsName: args.items.map((i) => i.name).join(", "),
            quantity: args.items.reduce((s, i) => s + i.quantity, 0),
            relatedTransactionId: txnId,
            createdBy: user._id,
          });
        }
      }
    }

    // Customer loyalty data
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (customer) {
        const patch: Record<string, any> = {
          lastVisit: now,
          visitCount: customer.visitCount + 1,
        };
        if (!customer.firstVisit) patch.firstVisit = now;
        if (args.type === "revenue") {
          patch.totalSpent = customer.totalSpent + args.amount;
          if (args.isCredit) patch.debt = customer.debt + args.amount;
        }
        await ctx.db.patch(args.customerId, patch);
      }
    }

    return txnId;
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const txn = await ctx.db.get(args.id);
    if (!txn) return;
    await requirePermission(ctx, txn.businessId, "delete_transaction");
    await ctx.db.delete(args.id);
  },
});

export const _internalRecent = internalQuery({
  args: { businessId: v.id("businesses"), limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    await ctx.db
      .query("transactions")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .order("desc")
      .take(args.limit ?? 30),
});
