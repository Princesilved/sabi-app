import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, requireMember } from "./auth";

/**
 * Step 1: get a short-lived upload URL for the client to POST the image to.
 */
export const generateUploadUrl = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "upload_receipts");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Step 2: after upload, register the receipt row (status: uploaded).
 * Returns receiptId; the client then calls ai.processReceipt (an action).
 */
export const registerUpload = mutation({
  args: {
    businessId: v.id("businesses"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await requirePermission(
      ctx,
      args.businessId,
      "upload_receipts"
    );
    return await ctx.db.insert("receipts", {
      businessId: args.businessId,
      uploadedBy: user._id,
      storageId: args.storageId,
      status: "uploaded",
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "upload_receipts");
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .order("desc")
      .take(50);
    // attach signed URLs for display
    return await Promise.all(
      receipts.map(async (r) => ({
        ...r,
        imageUrl: await ctx.storage.getUrl(r.storageId),
      }))
    );
  },
});

export const get = query({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.id);
    if (!receipt) return null;
    await requireMember(ctx, receipt.businessId);
    return {
      ...receipt,
      imageUrl: await ctx.storage.getUrl(receipt.storageId),
    };
  },
});

/**
 * Step 4: user confirms (possibly edited) extracted data.
 * Creates an expense transaction and/or inventory items, then marks confirmed.
 */
export const confirm = mutation({
  args: {
    receiptId: v.id("receipts"),
    // The (possibly edited) data the user approved:
    createExpense: v.boolean(),
    expenseAmount: v.optional(v.number()), // kobo
    expenseDescription: v.optional(v.string()),
    vendor: v.optional(v.string()),
    addToInventory: v.boolean(),
    items: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          costPrice: v.number(), // kobo
          sellingPrice: v.optional(v.number()),
          unit: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    const { user } = await requirePermission(
      ctx,
      receipt.businessId,
      "confirm_receipts"
    );

    // Create expense
    if (args.createExpense && args.expenseAmount && args.expenseAmount > 0) {
      await ctx.db.insert("transactions", {
        businessId: receipt.businessId,
        type: "expense",
        amount: args.expenseAmount,
        description:
          args.expenseDescription ||
          `Purchase${args.vendor ? ` from ${args.vendor}` : ""}`,
        category: "stock_purchase",
        date: Date.now(),
        createdAt: Date.now(),
        receiptId: args.receiptId,
        createdBy: user._id,
      });
    }

    // Add items to inventory
    if (args.addToInventory && args.items) {
      for (const item of args.items) {
        await ctx.runMutation(
          internal.inventory._internalUpsertFromReceipt,
          {
            businessId: receipt.businessId,
            name: item.name,
            quantity: item.quantity,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            unit: item.unit,
            supplier: args.vendor,
          }
        );
      }
    }

    await ctx.db.patch(args.receiptId, { status: "confirmed" });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.id);
    if (!receipt) return;
    await requirePermission(ctx, receipt.businessId, "upload_receipts");
    // Only unconfirmed receipts can be deleted — confirmed ones are part of the records.
    if (receipt.status === "confirmed") {
      throw new Error(
        "This receipt is already saved to your records and can't be deleted."
      );
    }
    await ctx.storage.delete(receipt.storageId);
    await ctx.db.delete(args.id);
  },
});

// ---- internal helpers for the vision action ----

export const _internalGet = internalQuery({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const _internalGetImageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => await ctx.storage.getUrl(args.storageId),
});

export const _internalSetStatus = internalMutation({
  args: {
    id: v.id("receipts"),
    status: v.string(),
    extracted: v.optional(v.any()),
    detectedLanguage: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});
