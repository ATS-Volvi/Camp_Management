import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2, RotateCcw, Plus, Bot, User, ArrowDown } from "lucide-react";
import VoiceDictationButton from "@/components/maintenance/VoiceDictationButton";
import { toast } from "@/hooks/use-toast";
import AIReportMessage from "@/components/ai-reports/AIReportMessage";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = [
  { label: "📊 Occupancy Report", prompt: "Show camp-wise occupancy summary with capacity utilization rates" },
  { label: "👥 Supplier Distribution", prompt: "Which all camps the employees of each supplier are distributed? Show camp-wise breakdown" },
  { label: "💰 Breakfast Cost", prompt: "What is the cost of breakfast across all camps? Show per-head cost comparison" },
  { label: "📈 Bottomline Analysis", prompt: "Which camp is giving better bottomline? Compare revenue vs costs for all camps" },
  { label: "🚫 Blacklisted Staff", prompt: "List all blacklisted employees with reasons and camp details" },
  { label: "🔧 Maintenance Summary", prompt: "Generate maintenance ticket summary by priority, status and cost analysis" },
  { label: "🏠 Room Utilization", prompt: "Which rooms have been empty for more than a month? Show block-wise vacancy report" },
  { label: "📦 Inventory Alerts", prompt: "Show inventory items below minimum alert level with reorder recommendations" },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";
const CHAT_URL = `${BACKEND_URL}/ai/chat`;

export default function AIReports() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollDown(!atBottom);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length > 0]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const sendPrompt = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles size={18} className="text-primary" />
          </div>
          <span className="font-semibold text-foreground">LodgiX AI</span>
        </div>
        {hasMessages && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => setMessages([])}>
            <Plus size={16} /> New chat
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {!hasMessages ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full px-4 max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Camp-365 AI Reports</h1>
            <p className="text-muted-foreground text-sm mb-8 text-center">
              Ask anything about your camp operations — type or use voice 🎙️ to query occupancy, costs, suppliers, maintenance & more.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
              {SUGGESTED_PROMPTS.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => sendPrompt(s.prompt)}
                  className="text-left p-3 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all group"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {s.label}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div className={`text-sm ${
                  msg.role === "user"
                    ? "bg-muted rounded-2xl rounded-br-md px-4 py-3 max-w-[75%] text-foreground"
                    : "max-w-full min-w-0 flex-1"
                }`}>
                  {msg.role === "assistant" ? (
                    <AIReportMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="flex items-center gap-2 py-3">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scroll-to-bottom button */}
        {showScrollDown && (
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ArrowDown size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Input area — ChatGPT style */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-muted/50 border border-border rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              placeholder="Ask about your camp data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt(input);
                }
              }}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[200px] py-1.5"
              rows={1}
            />
            <VoiceDictationButton
              onTranscript={(text) => setInput(text)}
              disabled={isLoading}
            />
            <button
              onClick={() => sendPrompt(input)}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            LodgiX AI can make mistakes. Verify important data from reports.
          </p>
        </div>
      </div>
    </div>
  );
}
