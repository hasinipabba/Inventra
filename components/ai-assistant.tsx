"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { products, warehouses, aiInsights } from "@/lib/mock-data";

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

function answer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("restock")) {
    const low = products.filter((p) => p.status === "low" || p.status === "out").slice(0, 4);
    return `${low.length} products need restocking soon: ${low.map((p) => p.name).join(", ")}. I'd prioritize items already at zero stock.`;
  }
  if (q.includes("expired") && !q.includes("expire this")) {
    const expired = products.filter((p) => p.status === "expired").slice(0, 4);
    return expired.length
      ? `${expired.length} expired products on record: ${expired.map((p) => p.name).join(", ")}. Recommend routing these to disposal or supplier return.`
      : "No expired products right now — nice work.";
  }
  if (q.includes("low inventory") || q.includes("warehouse")) {
    const w = [...warehouses].sort((a, b) => b.used / b.capacity - a.used / a.capacity)[0];
    return `${w.name} is running the tightest, at ${Math.round((w.used / w.capacity) * 100)}% capacity. Warehouse C currently has the most headroom.`;
  }
  if (q.includes("expire this week")) {
    const expiring = products.filter((p) => p.status === "expiring").slice(0, 5);
    return `42 products expire this week, including ${expiring.map((p) => p.name).slice(0, 3).join(", ")}. Full breakdown is on the Expiry timeline in Analytics.`;
  }
  if (q.includes("slow")) {
    return "Slow-moving stock right now: Cadbury Dairy Milk 55g and 6 other SKUs with no movement in 90+ days, concentrated in Warehouse B.";
  }
  if (q.includes("report")) {
    return "Today: 738 in stock, 64 low stock, 18 out of stock, 34 restocked, 16 transfers in progress. Full report is ready under Reports.";
  }
  if (q.includes("transfer")) {
    return "Recommended: move 80 units of Paracetamol 500mg from Warehouse A to Warehouse D, and redistribute excess stock from Warehouse B to Warehouse C.";
  }
  return "Here's what I found based on current inventory data — for a deeper look, check AI Insights or Analytics.";
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: `Hi Ananya, I'm the Inventra assistant. ${aiInsights[0].title}. Ask me anything about your inventory.` },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function send(text: string) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", text }, { role: "ai", text: answer(text) }]);
    setInput("");
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
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-2.5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-primary hover:text-primary"
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
                className="h-9 flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
              />
              <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
