import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireMember, requirePermission } from "./auth";

export const listForBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.businessId, "use_assistant");
    return await ctx.db
      .query("conversations")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .order("desc")
      .take(20);
  },
});

export const messages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return [];
    await requireMember(ctx, conv.businessId);
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const create = mutation({
  args: { businessId: v.id("businesses"), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requirePermission(
      ctx,
      args.businessId,
      "use_assistant"
    );
    return await ctx.db.insert("conversations", {
      userId: user._id,
      businessId: args.businessId,
      title: args.title,
      language: user.preferredLanguage,
      lastMessageAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.id);
    if (!conv) return;
    await requireMember(ctx, conv.businessId);
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(args.id);
  },
});

export const _internalCreate = internalMutation({
  args: {
    userId: v.id("users"),
    businessId: v.id("businesses"),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("conversations", {
      userId: args.userId,
      businessId: args.businessId,
      language: args.language,
      lastMessageAt: Date.now(),
    }),
});

export const _internalMessages = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect(),
});

export const _internalAddMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", args);
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
  },
});
