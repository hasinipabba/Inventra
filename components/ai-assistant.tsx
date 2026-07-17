"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "Which products need restocking?",
  "Show expired products.",
  "Which warehouse has low inventory?",
  "Which products expire this week?",
  "Show slow-moving products.",
  "Generate today's inventory report.",
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi, I'm the Inventra assistant. Ask me anything about your inventory." },
  ]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, thinking]);

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const userMsg: Msg = { role: "user", text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setThinking(true);

    // Convert internal msg history to OpenAI-compatible format for the API.
    // Skip the initial AI greeting (index 0) — it's a UI artefact, not a real
    // model turn; sending it as an "assistant" message confuses the context.
    const apiMessages = next.slice(1).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      const reply = res.ok ? (data.message ?? "No response.") : (data.error ?? "Something went wrong.");
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Network error — please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-popover transition-transform hover:scale-105"
        style={{ width: 52, height: 52 }}
        aria-label="Open AI assistant"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-xl2 border border-border bg-surface shadow-popover animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Inventra Assistant</p>
              <p className="text-[11px] text-muted leading-tight">Live inventory Q&A</p>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface2 text-text"
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <p className="max-w-[85%] rounded-xl bg-surface2 px-3 py-2 text-[13px] text-muted">
                  Thinking…
                </p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-2.5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={thinking}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your inventory…"
                disabled={thinking}
                className="h-9 flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={thinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
