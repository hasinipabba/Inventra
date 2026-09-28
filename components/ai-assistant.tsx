"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Sparkles, X, Send, Mic, MicOff, Volume2, VolumeX, Square, Radio, Loader2 } from "lucide-react";
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

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/^\d+[\.)]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function MessageBody({
  content,
  isUser,
  onSpeak,
  isSpeakingThis,
}: {
  content: string;
  isUser: boolean;
  onSpeak?: () => void;
  isSpeakingThis?: boolean;
}) {
  if (isUser) {
    return <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{content}</div>;
  }

  const blocks = parseBlocks(content);

  return (
    <div className="relative space-y-2.5 text-[13px] leading-relaxed text-text">
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

      {onSpeak && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onSpeak}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
              isSpeakingThis
                ? "bg-primary/20 text-primary font-medium"
                : "text-muted hover:bg-border/40 hover:text-text"
            )}
            title="Read out aloud"
          >
            <Volume2 size={13} className={isSpeakingThis ? "animate-pulse" : ""} />
            <span>{isSpeakingThis ? "Speaking…" : "Listen"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi! I'm your Inventra Voice & AI Inventory Assistant. You can speak to me with your microphone or type your questions.",
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcribingAudio, setTranscribingAudio] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, thinking, isListening]);

  // Clean up speech and recognition on close or unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  function speak(text: string, msgIndex?: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Jenny"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (typeof msgIndex === "number") setSpeakingIndex(msgIndex);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingIndex(null);
  }

  function startListening() {
    if (isSpeaking) stopSpeaking();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setInput(currentText.trim());
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.warn("Browser SpeechRecognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            fallbackMediaRecorder();
          }
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn("SpeechRecognition init failed, falling back to AssemblyAI MediaRecorder", e);
      }
    }

    fallbackMediaRecorder();
  }

  async function fallbackMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setTranscribingAudio(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "speech.webm");
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.text?.trim()) {
            setInput(data.text.trim());
            send(data.text.trim());
          }
        } catch (err) {
          console.error("AssemblyAI transcription failed:", err);
        } finally {
          setTranscribingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone permission was denied. Please allow microphone access in your browser.");
      setIsListening(false);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    setIsListening(false);
  }

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    stopListening();
    if (isSpeaking) stopSpeaking();

    const userMsg: Msg = { role: "user", text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setThinking(true);

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
        const newMsgIndex = next.length;
        setMsgs((m) => [...m, { role: "ai", text: data.message }]);
        if (voiceEnabled) {
          speak(data.message, newMsgIndex);
        }
      } else {
        let errorMsg = "Unable to get a response. Please try again in a moment.";
        if (typeof data?.error === "string") {
          const raw = data.error.replace(/^\d+\s*/, "").trim();
          try {
            const parsed = JSON.parse(raw);
            const inner = parsed?.error?.message || parsed?.message;
            if (
              parsed?.code === "rate_limit_exceeded" ||
              parsed?.type === "tokens" ||
              (typeof inner === "string" && inner.includes("TPM"))
            ) {
              errorMsg =
                "The AI token limit was reached. Please ask a shorter question or wait a few moments.";
            } else {
              errorMsg = inner || data.error;
            }
          } catch {
            if (data.error.includes("rate_limit_exceeded") || data.error.includes("TPM")) {
              errorMsg =
                "The AI token limit was reached. Please ask a shorter question or wait a few moments.";
            } else {
              errorMsg = data.error;
            }
          }
        } else if (data?.error?.message) {
          errorMsg = data.error.message;
        } else if (res.status === 503) {
          errorMsg = "AI assistant is not configured. Please verify your GROQ_API_KEY.";
        }
        setMsgs((m) => [...m, { role: "ai", text: errorMsg }]);
        if (voiceEnabled) {
          speak(errorMsg);
        }
      }
    } catch {
      const errNetwork = "Network connection error — please check your internet and try again.";
      setMsgs((m) => [...m, { role: "ai", text: errNetwork }]);
      if (voiceEnabled) speak(errNetwork);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* Floating Launcher Button with Voice Status Indicator */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-popover transition-transform hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
        aria-label="Open AI voice assistant"
      >
        {open ? (
          <X size={20} />
        ) : isSpeaking ? (
          <Radio size={22} className="animate-pulse text-white" />
        ) : (
          <Sparkles size={20} />
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[34rem] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-fade-in sm:right-6 sm:h-[36rem] sm:w-[27rem]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isSpeaking ? (
                  <Radio size={16} className="animate-pulse text-primary" />
                ) : (
                  <Sparkles size={16} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Inventra Voice AI</p>
                <p className="text-[11px] leading-tight text-muted">
                  Powered by Groq & AssemblyAI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Voice toggle */}
              <button
                onClick={() => {
                  if (voiceEnabled && isSpeaking) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                  voiceEnabled
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "border border-border bg-surface2 text-muted"
                )}
                title={voiceEnabled ? "Voice Output Active" : "Voice Output Muted"}
              >
                {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span>{voiceEnabled ? "Voice ON" : "Voice OFF"}</span>
              </button>

              {/* Stop Speaking button if active */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/20"
                  title="Stop speaking"
                >
                  <Square size={11} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )}

              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  setOpen(false);
                }}
                className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-text"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Speaking Status Bar */}
          {isSpeaking && (
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-1.5 text-xs text-primary">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                <span className="font-medium">Speaking response aloud…</span>
              </div>
              <button onClick={stopSpeaking} className="underline hover:opacity-80">
                Cancel
              </button>
            </div>
          )}

          {/* Active Listening / Mic Status Bar */}
          {isListening && (
            <div className="flex items-center justify-between border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-500">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />
                <span className="font-semibold">Listening to your voice… speak now</span>
              </div>
              <button onClick={stopListening} className="font-medium underline hover:opacity-80">
                Done Speaking
              </button>
            </div>
          )}

          {/* AssemblyAI transcribing status */}
          {transcribingAudio && (
            <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary">
              <Loader2 size={13} className="animate-spin" />
              <span>Transcribing audio with AssemblyAI…</span>
            </div>
          )}

          {/* Message Feed */}
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
                  <MessageBody
                    content={m.text}
                    isUser={m.role === "user"}
                    onSpeak={
                      m.role === "ai"
                        ? () => {
                            if (isSpeaking && speakingIndex === i) {
                              stopSpeaking();
                            } else {
                              speak(m.text, i);
                            }
                          }
                        : undefined
                    }
                    isSpeakingThis={isSpeaking && speakingIndex === i}
                  />
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border/60 bg-surface2 px-4 py-2.5 text-[13px] text-muted">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  <span className="ml-1 text-xs">Analyzing inventory & preparing voice…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions & Input Footer */}
          <div className="border-t border-border bg-surface p-2.5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={thinking || isListening}
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
                placeholder={
                  isListening ? "Listening… speak now" : "Type or click mic to speak…"
                }
                disabled={thinking || transcribingAudio}
                className={cn(
                  "h-9 flex-1 rounded-xl border bg-surface2 px-3 text-sm outline-none transition-all focus:border-primary disabled:opacity-50",
                  isListening ? "border-red-500 ring-2 ring-red-500/20" : "border-border"
                )}
              />

              {/* Microphone Voice Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={thinking || transcribingAudio}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                    : "border border-border bg-surface2 text-muted hover:border-primary hover:text-primary active:scale-95"
                )}
                title={isListening ? "Stop listening" : "Talk with your voice"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={thinking || !input.trim() || transcribingAudio}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                title="Send message"
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
