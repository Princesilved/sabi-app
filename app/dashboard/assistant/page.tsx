"use client";

import { useState, useRef, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useBusiness } from "@/components/dashboard/business-context";
import { Send, Sparkles, Loader2, Plus, History, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { promptsForLanguage } from "@/lib/quick-prompts";

export default function AssistantPage() {
  const { businessId } = useBusiness();
  const me = useQuery(api.users.me);
  const chat = useAction(api.ai.chat);

  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.conversations.messages,
    conversationId ? { conversationId } : "skip"
  );

  const pastChats = useQuery(
    api.conversations.listForBusiness,
    businessId ? { businessId } : "skip"
  );
  const deleteConversation = useMutation(api.conversations.remove);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  if (!businessId) return null;

  const lang = me?.preferredLanguage;
  const quickPrompts = promptsForLanguage(lang);

  const startNewChat = () => {
    setConversationId(null);
    setHistoryOpen(false);
  };

  const handleSend = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setInput("");
    setSending(true);
    try {
      const result = await chat({
        businessId,
        conversationId: conversationId ?? undefined,
        message,
        language: me?.preferredLanguage || "english",
        model: me?.preferredAIModel || "gemini",
      });
      if (!conversationId) setConversationId(result.conversationId);
    } catch (e: any) {
      toast.error(
        e.message?.includes("GEMINI_API_KEY")
          ? "Set GEMINI_API_KEY in Convex env (see README)"
          : e.message || "Failed to get response"
      );
    } finally {
      setSending(false);
    }
  };

  const showEmpty = !messages || messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen">
      {/* Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-ink/10 bg-paper">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jollof to-gold flex items-center justify-center">
              <span className="font-display italic text-white text-xl">S</span>
            </div>
            <div>
              <div className="font-display text-2xl leading-none">
                Sabi Assistant
              </div>
              <div className="text-xs text-ink/50 mt-1">
                <span className="text-moss">●</span> Online ·{" "}
                {me?.preferredLanguage || "english"} · Gemini
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="sabi-btn-secondary !py-2 !px-3 text-xs"
              title="New chat"
            >
              <Plus className="w-4 h-4" /> New
            </button>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="sabi-btn-secondary !py-2 !px-3 text-xs"
              title="Chat history"
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>
        </div>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div
          className="px-6 lg:px-10 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg-deep)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="sabi-label !mb-0">Past conversations</span>
            <button onClick={() => setHistoryOpen(false)} className="text-[var(--text-muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          {(!pastChats || pastChats.length === 0) && (
            <p className="text-sm text-[var(--text-muted)] py-2">
              No past chats yet. Start talking and they'll show up here.
            </p>
          )}
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {pastChats?.map((c: any) => (
              <div
                key={c._id}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-[var(--paper)] transition"
                style={{
                  background:
                    conversationId === c._id ? "var(--paper)" : "transparent",
                }}
              >
                <button
                  onClick={() => {
                    setConversationId(c._id);
                    setHistoryOpen(false);
                  }}
                  className="flex-1 text-left text-sm truncate"
                >
                  {c.title || "Conversation"}
                  <span className="text-[var(--text-muted)] text-xs ml-2">
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </span>
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Delete this conversation?")) {
                      await deleteConversation({ id: c._id });
                      if (conversationId === c._id) setConversationId(null);
                      toast.success("Chat deleted");
                    }
                  }}
                  className="text-[var(--text-muted)] hover:text-jollof p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
        {showEmpty && (
          <div className="max-w-2xl mx-auto py-12 text-center">
            <Sparkles className="w-10 h-10 text-jollof mx-auto mb-5" />
            <h2 className="font-display text-4xl mb-3">
              How can I <span className="italic text-jollof">help you</span>{" "}
              today?
            </h2>
            <p className="text-ink/60 mb-8">
              I can see your sales, stock, customers, and debts. Ask me anything
              about your business.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="px-4 py-2 bg-paper border border-ink/15 rounded-full text-sm hover:border-jollof hover:bg-jollof/5 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages && messages.length > 0 && (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m: any) => (
              <div
                key={m._id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-ink text-cream rounded-br-md"
                      : "bg-paper border border-ink/10 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-paper border border-ink/10 rounded-bl-md">
                  <Loader2 className="w-4 h-4 animate-spin text-ink/40" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-ink/10 px-6 lg:px-10 py-4 bg-paper">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            className="sabi-input flex-1"
            placeholder={
              lang === "pidgin"
                ? "Ask Sabi anything…"
                : "Ask anything about your business…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="sabi-btn-jollof !px-5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
