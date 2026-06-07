"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ===================== Gemini config =====================

type ChatMessage = { role: "user" | "assistant"; content: string };

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_VISION_MODEL = "gemini-2.5-flash"; // multimodal

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run: npx convex env set GEMINI_API_KEY your-key"
    );
  }
  return key;
}

async function geminiText(
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const apiKey = requireGeminiKey();
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }
  const data: any = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ||
    "(no response)"
  );
}

// ===================== Vision (receipt OCR) =====================

async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image: ${res.status}`);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  return { base64, mimeType };
}

const RECEIPT_INSTRUCTION = `You are a receipt and invoice reading expert for African small businesses. The image may be a receipt or supplier invoice written in ANY language — English, Nigerian Pidgin, Yorùbá, Igbo, Hausa, Chinese (Simplified or Traditional), or others. Many Nigerian traders import from China, so Chinese invoices are common.

Read the image carefully and extract structured data. Translate item names to English where possible, but keep the original too if useful.

Return ONLY valid JSON (no markdown, no backticks, no commentary) in exactly this shape:
{
  "detectedLanguage": "english|pidgin|yoruba|igbo|hausa|chinese|other",
  "documentType": "expense_receipt|supplier_invoice|sales_receipt|unknown",
  "vendor": "store or supplier name or null",
  "date": "ISO date string or null",
  "currency": "NGN|USD|CNY|other",
  "total": number_in_major_units_or_null,
  "items": [
    { "name": "item in English", "originalName": "as written or null", "quantity": number, "unitPrice": number_in_major_units, "lineTotal": number_or_null }
  ],
  "notes": "anything important, e.g. currency was Chinese Yuan, amounts approximate"
}

Rules:
- Amounts are in MAJOR units (naira, dollars, yuan), NOT kobo/cents. The app converts later.
- If you cannot read a field, use null. Never invent numbers.
- If currency is not Naira, still report the original currency and amounts; note it in "notes".
- quantity defaults to 1 if a line clearly is one item but no qty shown.`;

async function geminiVision(imageUrl: string): Promise<string> {
  const apiKey = requireGeminiKey();
  const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: RECEIPT_INSTRUCTION },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini vision error: ${response.status} ${await response.text()}`);
  }
  const data: any = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") || ""
  );
}

function parseJsonLoose(text: string): any {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ===================== Prompt builder (chat) =====================

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  english: "Respond in clear, professional English.",
  pidgin:
    "Respond in natural Nigerian Pidgin English. Use expressions like 'abeg', 'e dey', 'na so', 'wetin', 'sef', 'sha'. Sound like a real Naija person, not a translator.",
  yoruba:
    "Respond primarily in Yorùbá with English mixed in for technical/numeric terms. Use tone marks.",
  igbo:
    "Respond primarily in Igbo with English mixed in for technical/numeric terms. Use tone marks.",
  hausa:
    "Respond primarily in Hausa with English mixed in for technical/numeric terms.",
  chinese:
    "Respond in Simplified Chinese (简体中文), mixing in English for technical/numeric terms where natural.",
};

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function buildSystemPrompt(
  business: any,
  stats: any,
  transactions: any[],
  inventory: any[],
  customers: any[],
  language: string
) {
  const langInstr = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english;
  const recentTxnsSummary = transactions
    .slice(0, 15)
    .map(
      (t) =>
        `- ${new Date(t.date).toLocaleDateString()}: ${t.type === "revenue" ? "+" : "-"}${formatNaira(t.amount)} (${t.description}${t.category ? `, ${t.category}` : ""})`
    )
    .join("\n");
  const inventorySummary = inventory
    .slice(0, 25)
    .map(
      (i) =>
        `- ${i.name}: ${i.quantity} ${i.unit || "units"} @ ${formatNaira(i.sellingPrice)} (cost ${formatNaira(i.costPrice)})${
          i.producer ? ` [from ${i.producer}]` : ""
        }${
          i.lowStockThreshold && i.quantity <= i.lowStockThreshold ? " ⚠️ LOW STOCK" : ""
        }`
    )
    .join("\n");
  const debtorsSummary = customers
    .filter((c) => c.debt > 0)
    .slice(0, 10)
    .map((c) => `- ${c.name}: owes ${formatNaira(c.debt)}`)
    .join("\n");

  return `You are Sabi, an AI business assistant built for African SMEs. You are talking to the owner of ${business.name} (${business.type}${business.location ? `, ${business.location}` : ""}).

You behave like a smart, no-nonsense business manager who genuinely cares about this business. You're friendly but direct. You give numbers fast.

LANGUAGE: ${langInstr}

FORMATTING:
- Keep replies short and conversational, like WhatsApp.
- Always quote money as ₦ amounts (Nigerian Naira).
- No markdown headers or long lists. One or two short bullets at most.
- If the data doesn't answer something, say so and suggest how to track it next time.

CURRENT BUSINESS SNAPSHOT (last 30 days):
- Revenue: ${formatNaira(stats.revenue)}
- Expenses: ${formatNaira(stats.expenses)}
- Net profit: ${formatNaira(stats.profit)}
- Today's revenue: ${formatNaira(stats.revenueToday)}
- Today's profit: ${formatNaira(stats.profitToday)}
- Transactions: ${stats.transactionCount}
- Customers: ${stats.customerCount}
- Total customer debt: ${formatNaira(stats.totalDebt)}
- Inventory value (cost): ${formatNaira(stats.inventoryValue)}
- Low stock items: ${stats.lowStockCount}

RECENT TRANSACTIONS:
${recentTxnsSummary || "(none yet)"}

INVENTORY:
${inventorySummary || "(no items added yet)"}

CUSTOMERS WITH DEBT:
${debtorsSummary || "(no debtors — good!)"}

You can answer questions, give advice, suggest pricing, flag risks, draft adverts, and explain numbers. You CANNOT modify the database — tell the owner to use the app buttons for that.`;
}

// ===================== Public actions =====================

export const chat = action({
  args: {
    businessId: v.id("businesses"),
    conversationId: v.optional(v.id("conversations")),
    message: v.string(),
    language: v.optional(v.string()),
    model: v.optional(v.string()), // ignored; Gemini-only
  },
  handler: async (
    ctx,
    args
  ): Promise<{ conversationId: Id<"conversations">; message: string }> => {
    const business: any = await ctx.runQuery(internal.businesses._internalGet, {
      id: args.businessId,
    });
    if (!business) throw new Error("Business not found");

    const stats: any = await ctx.runQuery(internal.businesses._internalStats, {
      businessId: args.businessId,
    });
    const transactions: any[] = await ctx.runQuery(
      internal.transactions._internalRecent,
      { businessId: args.businessId, limit: 30 }
    );
    const inventory: any[] = await ctx.runQuery(internal.inventory._internalList, {
      businessId: args.businessId,
    });
    const customers: any[] = await ctx.runQuery(internal.customers._internalList, {
      businessId: args.businessId,
    });

    let conversationId: Id<"conversations"> | undefined = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations._internalCreate, {
        userId: business.ownerId,
        businessId: args.businessId,
      });
    }

    const history: any[] = await ctx.runQuery(
      internal.conversations._internalMessages,
      { conversationId: conversationId! }
    );

    await ctx.runMutation(internal.conversations._internalAddMessage, {
      conversationId: conversationId!,
      role: "user",
      content: args.message,
    });

    const language = args.language || "english";
    const systemPrompt = buildSystemPrompt(
      business,
      stats,
      transactions,
      inventory,
      customers,
      language
    );

    const messages: ChatMessage[] = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: args.message },
    ];

    const assistantMessage = await geminiText(systemPrompt, messages, 1024);

    await ctx.runMutation(internal.conversations._internalAddMessage, {
      conversationId: conversationId!,
      role: "assistant",
      content: assistantMessage,
      metadata: { provider: "gemini" },
    });

    return { conversationId: conversationId!, message: assistantMessage };
  },
});

export const generateAdvert = action({
  args: {
    businessId: v.id("businesses"),
    productName: v.string(),
    channel: v.string(),
    language: v.optional(v.string()),
    tone: v.optional(v.string()),
    model: v.optional(v.string()), // ignored; Gemini-only
  },
  handler: async (ctx, args): Promise<string> => {
    const business: any = await ctx.runQuery(internal.businesses._internalGet, {
      id: args.businessId,
    });
    if (!business) throw new Error("Business not found");

    const language = args.language || "english";
    const tone = args.tone || "friendly";
    const langInstr = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english;
    const channelGuidance: Record<string, string> = {
      whatsapp:
        "WhatsApp broadcast: short, scannable, 1-2 emojis max, clear CTA like 'DM to order'. 3-5 lines.",
      instagram: "Instagram caption: hook, body, then 8-12 hashtags. 80-150 words.",
      tiktok: "TikTok script: hook in 3 seconds, 2-3 beats, CTA. 4-6 short lines.",
      facebook: "Facebook post: conversational, 2-3 short paragraphs, ends with CTA.",
    };

    const systemPrompt = `You are Sabi's advert writer for ${business.name} (${business.type}${business.location ? `, ${business.location}` : ""}).
LANGUAGE: ${langInstr}
TONE: ${tone}
CHANNEL: ${args.channel} — ${channelGuidance[args.channel] || ""}
Write ONE advert. No preamble — just the advert text ready to paste. Make it local and authentic.`;

    return await geminiText(
      systemPrompt,
      [{ role: "user", content: `Write an advert for: ${args.productName}` }],
      600
    );
  },
});

export const processReceipt = action({
  args: { receiptId: v.id("receipts"), model: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ ok: boolean; extracted?: any; error?: string }> => {
    const receipt: any = await ctx.runQuery(internal.receipts._internalGet, {
      id: args.receiptId,
    });
    if (!receipt) throw new Error("Receipt not found");

    await ctx.runMutation(internal.receipts._internalSetStatus, {
      id: args.receiptId,
      status: "processing",
    });

    const imageUrl: string | null = await ctx.runQuery(
      internal.receipts._internalGetImageUrl,
      { storageId: receipt.storageId }
    );
    if (!imageUrl) {
      await ctx.runMutation(internal.receipts._internalSetStatus, {
        id: args.receiptId,
        status: "failed",
        error: "Image not found in storage",
      });
      return { ok: false, error: "Image not found" };
    }

    let raw = "";
    try {
      raw = await geminiVision(imageUrl);
    } catch (err: any) {
      await ctx.runMutation(internal.receipts._internalSetStatus, {
        id: args.receiptId,
        status: "failed",
        error: err.message?.slice(0, 300) || "Vision failed",
      });
      return { ok: false, error: err.message };
    }

    const parsed = parseJsonLoose(raw);
    if (!parsed) {
      await ctx.runMutation(internal.receipts._internalSetStatus, {
        id: args.receiptId,
        status: "failed",
        error: "Could not parse AI output",
      });
      return { ok: false, error: "Could not read receipt clearly. Try a sharper photo." };
    }

    await ctx.runMutation(internal.receipts._internalSetStatus, {
      id: args.receiptId,
      status: "extracted",
      extracted: parsed,
      detectedLanguage: parsed.detectedLanguage,
    });

    return { ok: true, extracted: parsed };
  },
});

export const availableModels = action({
  args: {},
  handler: async (): Promise<{ gemini: boolean; anthropic: boolean }> => ({
    gemini: !!process.env.GEMINI_API_KEY,
    anthropic: false, // Anthropic removed
  }),
});
