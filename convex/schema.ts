import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Linked to Clerk via clerkId
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()), // english | pidgin | yoruba | igbo | hausa | chinese
    preferredAIModel: v.optional(v.string()), // kept for back-compat; Gemini-only now
    theme: v.optional(v.string()), // light | dark | system
    onboarded: v.boolean(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  businesses: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    type: v.string(),
    location: v.optional(v.string()),
    currency: v.string(),
    logoUrl: v.optional(v.string()),
    healthScore: v.optional(v.number()),
  }).index("by_owner", ["ownerId"]),

  memberships: defineTable({
    businessId: v.id("businesses"),
    userId: v.id("users"),
    role: v.string(),
    status: v.string(),
    invitedEmail: v.optional(v.string()),
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_business", ["businessId"])
    .index("by_user", ["userId"])
    .index("by_user_business", ["userId", "businessId"])
    .index("by_business_role", ["businessId", "role"]),

  invites: defineTable({
    businessId: v.id("businesses"),
    email: v.string(),
    role: v.string(),
    invitedBy: v.id("users"),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_business", ["businessId"])
    .index("by_email_status", ["email", "status"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.string(), // hustler | trader | empire
    status: v.string(), // trialing | active | past_due | canceled | free
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    paystackCustomerCode: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Producers / suppliers the shop buys from (supply-chain record)
  suppliers: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    type: v.optional(v.string()), // producer | distributor | importer | wholesaler | other
    notes: v.optional(v.string()),
    totalPurchased: v.number(), // kobo, lifetime cost of goods sourced from them
    createdAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_name", ["businessId", "name"]),

  // Fellow shop owners you trade goods with (informal IOUs)
  neighbors: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    // Positive theyOweMe = neighbor owes the shop (we lent them goods).
    // Positive iOwe = the shop owes the neighbor (we borrowed/sold their goods).
    theyOweMe: v.number(), // kobo
    iOwe: v.number(), // kobo
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_name", ["businessId", "name"]),

  // Every movement of goods/credit between the shop and a neighbor.
  neighborLedger: defineTable({
    businessId: v.id("businesses"),
    neighborId: v.id("neighbors"),
    // borrowed = we took their goods (we owe them, at cost price)
    // lent = we gave them our goods (they owe us)
    // settle_i_owe = we repaid them (reduces iOwe)
    // settle_they_owe = they repaid us (reduces theyOweMe)
    direction: v.union(
      v.literal("borrowed"),
      v.literal("lent"),
      v.literal("settle_i_owe"),
      v.literal("settle_they_owe")
    ),
    amount: v.number(), // kobo (cost value of goods, or cash settled)
    goodsName: v.optional(v.string()),
    quantity: v.optional(v.number()),
    productId: v.optional(v.id("inventory")),
    relatedTransactionId: v.optional(v.id("transactions")),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_neighbor", ["neighborId"])
    .index("by_business_date", ["businessId", "createdAt"]),

  transactions: defineTable({
    businessId: v.id("businesses"),
    type: v.union(v.literal("revenue"), v.literal("expense")),
    amount: v.number(), // kobo
    description: v.string(),
    category: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    // Where the sold goods came from
    stockSource: v.optional(
      v.union(v.literal("inventory"), v.literal("borrowed"))
    ),
    neighborId: v.optional(v.id("neighbors")), // set when stockSource = borrowed
    items: v.optional(
      v.array(
        v.object({
          productId: v.optional(v.id("inventory")),
          name: v.string(),
          quantity: v.number(),
          unitPrice: v.number(), // kobo
          costPrice: v.optional(v.number()), // kobo, snapshot for profit + owed calc
          supplierName: v.optional(v.string()), // producer snapshot
        })
      )
    ),
    paymentMethod: v.optional(v.string()), // cash | transfer | pos | credit
    isCredit: v.optional(v.boolean()),
    saleType: v.optional(v.string()), // retail | wholesale
    date: v.number(),
    createdAt: v.number(), // precise timestamp, always set
    receiptId: v.optional(v.id("receipts")),
    createdBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_business", ["businessId"])
    .index("by_business_date", ["businessId", "date"])
    .index("by_business_type", ["businessId", "type"])
    .index("by_customer", ["customerId"])
    .index("by_neighbor", ["neighborId"]),

  inventory: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    sku: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    lowStockThreshold: v.optional(v.number()),
    // Producer / supply chain
    producer: v.optional(v.string()), // who made/produced it
    supplierId: v.optional(v.id("suppliers")),
    supplier: v.optional(v.string()), // free-text fallback / snapshot
    // Velocity tracking
    unitsSold: v.optional(v.number()), // lifetime units sold
    lastSoldAt: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    barcode: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_business", ["businessId"])
    .index("by_business_name", ["businessId", "name"])
    .index("by_supplier", ["supplierId"])
    .index("by_barcode", ["barcode"]),

  // Daily sales tally per product, for velocity / "days of stock left"
  stockMovements: defineTable({
    businessId: v.id("businesses"),
    productId: v.id("inventory"),
    quantity: v.number(), // units sold (positive)
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_date", ["productId", "createdAt"]),

  customers: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    debt: v.number(),
    totalSpent: v.number(),
    visitCount: v.number(),
    firstVisit: v.optional(v.number()),
    lastVisit: v.optional(v.number()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.optional(v.number()),
  })
    .index("by_business", ["businessId"])
    .index("by_business_debt", ["businessId", "debt"])
    .index("by_business_name", ["businessId", "name"]),

  receipts: defineTable({
    businessId: v.id("businesses"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    status: v.string(),
    detectedLanguage: v.optional(v.string()),
    extracted: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_status", ["businessId", "status"]),

  conversations: defineTable({
    userId: v.id("users"),
    businessId: v.id("businesses"),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_business", ["businessId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_conversation", ["conversationId"]),
});
