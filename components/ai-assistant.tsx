"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
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

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-text">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[12px] dark:bg-white/10"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

interface ContentBlock {
  type: "heading" | "bullet" | "number" | "paragraph";
  level?: number;
  text?: string;
  items?: { num?: string; text: string }[];
  lines?: string[];
}

function parseBlocks(text: string): ContentBlock[] {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let currentGroup: ContentBlock | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentGroup) {
        blocks.push(currentGroup);
        currentGroup = null;
      }
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    const numberMatch = line.match(/^(\d+)[\.)]\s+(.*)$/);
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);

    if (bulletMatch) {
      if (currentGroup && currentGroup.type === "bullet") {
        currentGroup.items!.push({ text: bulletMatch[1] });
      } else {
        if (currentGroup) blocks.push(currentGroup);
        currentGroup = { type: "bullet", items: [{ text: bulletMatch[1] }] };
      }
    } else if (numberMatch) {
      if (currentGroup && currentGroup.type === "number") {
        currentGroup.items!.push({ num: numberMatch[1], text: numberMatch[2] });
      } else {
        if (currentGroup) blocks.push(currentGroup);
        currentGroup = {
          type: "number",
          items: [{ num: numberMatch[1], text: numberMatch[2] }],
        };
      }
    } else if (headingMatch) {
      if (currentGroup) blocks.push(currentGroup);
      currentGroup = null;
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
    } else {
      if (currentGroup && currentGroup.type === "paragraph") {
        currentGroup.lines!.push(line);
      } else {
        if (currentGroup) blocks.push(currentGroup);
        currentGroup = { type: "paragraph", lines: [line] };
      }
    }
  }

  if (currentGroup) {
    blocks.push(currentGroup);
  }

  return blocks;
}

function MessageBody({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{content}</div>;
  }

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-text">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <h4
              key={idx}
              className="border-b border-border/40 pb-1 pt-1 text-[13.5px] font-bold text-text"
            >
              {renderInline(block.text || "")}
            </h4>
          );
        }

        if (block.type === "bullet") {
          return (
            <ul key={idx} className="my-1.5 space-y-1.5 pl-0.5">
              {block.items?.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="flex-1">{renderInline(item.text)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "number") {
          return (
            <ol key={idx} className="my-1.5 space-y-1.5 pl-0.5">
              {block.items?.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs font-semibold text-primary">
                    {item.num || itemIdx + 1}.
                  </span>
                  <span className="flex-1">{renderInline(item.text)}</span>
                </li>
              ))}
            </ol>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {block.lines?.map((line, lineIdx) => (
              <span key={lineIdx}>
                {lineIdx > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi! I'm your Inventra Inventory Assistant. Ask me about stock status, expiring batches, warehouse allocations, or reorder forecasts.",
    },
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
    // Skip the initial AI greeting (index 0) — it's a UI artefact, not a real model turn
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

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Fallback if response is non-JSON
      }

      if (res.ok && data?.message) {
        setMsgs((m) => [...m, { role: "ai", text: data.message }]);
      } else {
        let errorMsg = "Unable to get a response. Please try again in a moment.";
        if (typeof data?.error === "string") {
          try {
            const parsed = JSON.parse(data.error);
            errorMsg = parsed?.error?.message || parsed?.message || data.error;
          } catch {
            errorMsg = data.error;
          }
        } else if (data?.error?.message) {
          errorMsg = data.error.message;
        } else if (res.status === 503) {
          errorMsg = "AI assistant is not configured. Please verify your GROQ_API_KEY.";
        }
        setMsgs((m) => [...m, { role: "ai", text: errorMsg }]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "Network connection error — please check your internet and try again." },
      ]);
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
        <div className="fixed bottom-24 right-4 z-40 flex h-[32rem] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-fade-in sm:right-6 sm:h-[35rem] sm:w-[26rem]">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={14} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Inventra Assistant</p>
                <p className="text-[11px] leading-tight text-muted">Live inventory intelligence</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-text"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm",
                    m.role === "user"
                      ? "rounded-tr-xs bg-primary text-primary-foreground"
                      : "rounded-tl-xs border border-border/60 bg-surface2 text-text"
                  )}
                >
                  <MessageBody content={m.text} isUser={m.role === "user"} />
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border/60 bg-surface2 px-4 py-2.5 text-[13px] text-muted">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  <span className="ml-1 text-xs">Analyzing inventory data…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border bg-surface p-2.5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={thinking}
                  className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
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
                className="h-9 flex-1 rounded-xl border border-border bg-surface2 px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
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
