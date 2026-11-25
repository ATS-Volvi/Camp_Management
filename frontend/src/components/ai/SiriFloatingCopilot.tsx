import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  X,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Bot,
  User,
  ArrowRight,
  SlidersHorizontal,
  Compass,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AIReportMessage from "@/components/ai-reports/AIReportMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
  reportAction?: any;
}

function resolveCopilotChatUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) {
    const clean = envUrl.trim().replace(/\/+$/, "");
    const base = clean.endsWith("/api") ? clean : `${clean}/api`;
    return `${base}/ai/chat`;
  }
  // Auto-detect Render deployment: if running on *.onrender.com
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    const currentHost = window.location.hostname;
    // e.g. camp-management-frontend.onrender.com -> camp-management-backend.onrender.com
    const backendHost = currentHost.replace("frontend", "backend");
    return `https://${backendHost}/api/ai/chat`;
  }
  return "http://localhost:3001/api/ai/chat";
}

export default function SiriFloatingCopilot() {
  const location = useLocation();
  const navigate = useNavigate();

  const isCatering = useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith("/catering") ||
      p.startsWith("/mess-catering") ||
      p.startsWith("/grocery-inventory") ||
      p.startsWith("/meal-management") ||
      p.startsWith("/food-cancellation") ||
      p.startsWith("/department-lunch") ||
      p.startsWith("/cook-requests") ||
      p.startsWith("/pantry-command-center")
    );
  }, [location.pathname]);

  const defaultGreeting = useMemo(() => {
    if (isCatering) {
      return "**Hello Executive Chef & Catering Manager! I am your Catering-365 AI Copilot.**\n\nI can calculate leave batch reductions, audit pantry DoC stockouts, prepare diabetic & medical dietary rosters, or optimize HACCP zero-waste production.";
    }
    return "**Hello! I am your Camp-365 AI Copilot.**\n\nAsk me anything about camp capacity, department workforce, bed tariffs, maintenance alerts, or ask me to build a custom dynamic report.";
  }, [isCatering]);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "**Hello! I am your Camp-365 AI Copilot.**\n\nAsk me anything about camp capacity, department workforce, bed tariffs, maintenance alerts, or ask me to build a custom dynamic report.",
    },
  ]);

  // Update greeting when navigating into/out of Catering
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: defaultGreeting }];
      }
      return prev;
    });
  }, [defaultGreeting]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Global Keyboard Shortcut: Cmd+J or Ctrl+J to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Context-aware suggested prompts based on the current page
  const contextualPrompts = useMemo(() => {
    const p = location.pathname;
    if (isCatering) {
      return [
        {
          label: "🌴 Leave Batch Deductions",
          prompt: "Calculate meal batch reductions and grocery savings based on worker vacation leaves (e.g. 42 workers on leave = 840 SAR saved/day).",
        },
        {
          label: "🩺 Diabetic & Medical Diets",
          prompt: "Generate the medical and diabetic dietary roster including carbohydrate-controlled, hypertensive and allergen-free meal trays.",
        },
        {
          label: "🛢️ 5-Day Stockout Risk",
          prompt: "Scan pantry Days of Cover (DoC) across camps and highlight critical cooking ingredients running below 5 days safety stock.",
        },
        {
          label: "❄️ HACCP Leftover Rescue",
          prompt: "Audit food waste disposition and calculate value saved through HACCP chilled blast storage and zero-waste next-shift reuse.",
        },
      ];
    }
    if (p.includes("dynamic-reports")) {
      return [
        { label: "📊 3D Department Matrix", prompt: "Build a 3D bar chart showing department workforce across camps" },
        { label: "💰 Monthly Billing by Category", prompt: "Compare total charges for HERD, PMTA and MBS across room categories" },
        { label: "⚠️ Tariff Discrepancy", prompt: "Identify potential billing leaks where room tariffs deviate from standard rates" },
      ];
    }
    if (p.includes("camps")) {
      return [
        { label: "🏨 Occupancy Rates", prompt: "Show camp-wise occupancy summary with capacity utilization rates" },
        { label: "🔮 Predict Vacancies", prompt: "Which camps have the highest number of vacant beds available for new contracts?" },
        { label: "🛠️ Maintenance Costs", prompt: "Break down repair tickets and estimated maintenance costs per camp" },
      ];
    }
    if (p.includes("employees") || p.includes("reports")) {
      return [
        { label: "👥 Workforce by Dept", prompt: "Summarize total headcounts, active and vacation inmates for HERD and PMTA" },
        { label: "🌍 Nationality Mix", prompt: "Show nationality distribution across all active employees in camps" },
        { label: "📦 Supplier Breakdown", prompt: "Which suppliers have the largest resident headcount across our facilities?" },
      ];
    }
    if (p.includes("catering") || p.includes("meal")) {
      return [
        { label: "🍽️ Breakfast Cost Audit", prompt: "What is the per-head cost of breakfast and catering spend across camps?" },
        { label: "❌ Meal Cancellations", prompt: "List top departments with approved food cancellations and cost saved" },
      ];
    }
    return [
      { label: "📊 Executive Occupancy", prompt: "Show camp-wise occupancy summary with capacity utilization rates" },
      { label: "💰 Profitability & Costs", prompt: "Which camp delivers the highest operational revenue vs rent and catering?" },
      { label: "⚠️ Anomaly Scan", prompt: "Scan the database for irregular room occupancy and low inventory items" },
    ];
  }, [location.pathname]);

  // Speech Recognition (Web Speech API)
  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript.trim());
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  // Send Prompt to AI
  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend };
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
      const token =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      const chatEndpoint = resolveCopilotChatUrl();
      const resp = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: textToSend }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Server returned HTTP ${resp.status}` }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";

      // Handle standard JSON response
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        const content = data.report || data.content || data.message || JSON.stringify(data);
        setMessages((prev) => [...prev, { role: "assistant", content }]);
        return;
      }

      if (!resp.body) throw new Error("No response stream available");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) upsertAssistant(delta);
            } catch {
              // Ignore partial stream parse errors
            }
          }
        }
      }

      // If buffer has leftover text and assistantSoFar is empty, handle plain text stream
      if (!assistantSoFar && buffer.trim()) {
        upsertAssistant(buffer.trim());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reach AI Copilot");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Unable to complete analysis**: ${err.message || "Network error"}. Please verify backend connection or API keys.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Siri Glowing Orb Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/90 dark:bg-slate-950/90 text-white shadow-2xl backdrop-blur-xl border border-white/20 hover:scale-105 transition-all duration-300"
            title={isCatering ? "Open Catering Copilot (⌘J)" : "Open Camp Copilot (⌘J)"}
          >
            {/* Multi-layered animated glowing background orb */}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden">
              <span
                className={`absolute inset-0 bg-gradient-to-tr ${
                  isCatering
                    ? "from-amber-400 via-orange-500 to-rose-500"
                    : "from-cyan-400 via-indigo-500 to-fuchsia-500"
                } animate-spin opacity-90 blur-[1px]`}
              />
              <span className="absolute inset-0.5 bg-slate-950 rounded-full" />
              {isCatering ? (
                <ChefHat size={14} className="relative z-10 text-amber-300 animate-pulse" />
              ) : (
                <Sparkles size={14} className="relative z-10 text-cyan-300 animate-pulse" />
              )}
            </div>
            <span
              className={`text-xs font-semibold tracking-wide bg-gradient-to-r ${
                isCatering
                  ? "from-amber-300 via-orange-200 to-amber-400"
                  : "from-cyan-300 via-white to-fuchsia-300"
              } bg-clip-text text-transparent`}
            >
              {isCatering ? "Catering Copilot" : "Camp Copilot"}
            </span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/15 text-white/70">
              ⌘J
            </span>
          </button>
        )}
      </div>

      {/* Floating Glassmorphism Assistant Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? "inset-4 sm:inset-10 md:inset-16 w-auto h-auto"
              : "bottom-6 right-6 w-[430px] max-w-[94vw] h-[620px] max-h-[88vh]"
          }`}
          role="dialog"
          aria-label={isCatering ? "Catering Copilot AI Assistant" : "Camp Copilot AI Assistant"}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Animated Siri Orb in Header */}
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden shrink-0 shadow-md">
                <span
                  className={`absolute inset-0 bg-gradient-to-tr ${
                    isCatering
                      ? "from-amber-400 via-orange-500 to-rose-500"
                      : "from-cyan-400 via-indigo-500 to-fuchsia-500"
                  } animate-spin blur-[1px]`}
                />
                <span className="absolute inset-0.5 bg-slate-950 rounded-full" />
                {isCatering ? (
                  <ChefHat size={13} className="relative z-10 text-amber-300" />
                ) : (
                  <Sparkles size={13} className="relative z-10 text-cyan-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold leading-none">
                    {isCatering ? "Catering Copilot AI" : "Camp Copilot AI"}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 font-mono ${
                      isCatering
                        ? "border-amber-500/30 text-amber-500"
                        : "border-cyan-500/30 text-cyan-500"
                    }`}
                  >
                    {isCatering ? "Culinary RAG" : "RAG v2.0"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isCatering ? "Executive Chef & Kitchen Intelligence" : "Live Operational Intelligence"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setMessages([{ role: "assistant", content: "Chat cleared. What can I analyze for you?" }])}
                title="Clear Chat"
              >
                <RotateCcw size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restore Size" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
                title="Close (Esc)"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="px-3 py-1.5 bg-primary/5 border-b flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <span className="flex items-center gap-1 truncate">
              <Compass size={12} className="text-primary shrink-0" />
              <span>Context:</span>
              <strong className="text-foreground truncate">{location.pathname}</strong>
            </span>
            <span className="text-[10px] opacity-70">Aramco Compliant</span>
          </div>

          {/* Chat Messages Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-br-none shadow-xs"
                      : "bg-muted/60 border rounded-tl-none shadow-xs text-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="space-y-2">
                      <AIReportMessage content={m.content} />
                      {/* One-click Action to open in Dynamic Reports */}
                      {(m.content.toLowerCase().includes("report") || m.content.toLowerCase().includes("breakdown")) && (
                        <div className="pt-2 border-t border-border/50 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigate("/dynamic-reports");
                              setIsOpen(false);
                            }}
                            className="h-6 text-[10px] gap-1 bg-background hover:bg-muted"
                          >
                            <SlidersHorizontal size={11} />
                            <span>Open Dynamic Reports Studio</span>
                            <ArrowRight size={10} />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-muted-foreground animate-pulse">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <span>Analyzing operational database...</span>
              </div>
            )}
          </div>

          {/* Quick Context Prompts */}
          <div className="px-3 py-2 border-t bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {contextualPrompts.map((cp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(cp.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-card border hover:bg-muted hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                {cp.label}
              </button>
            ))}
          </div>

          {/* Input Box Footer */}
          <div className="p-3 border-t bg-card shrink-0">
            {isListening && (
              <div className="flex items-center gap-2 px-2 py-1 mb-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-600 text-[11px] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>Listening via microphone... Speak your operational query now</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-2.5 py-1.5 border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleListening}
                className={`h-7 w-7 rounded-lg shrink-0 transition-colors ${
                  isListening ? "bg-red-500 text-white hover:bg-red-600" : "text-muted-foreground hover:text-foreground"
                }`}
                title={isListening ? "Stop Listening" : "Voice Dictation"}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </Button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Ask Camp Copilot (or dictate)..."
                className="flex-1 bg-transparent border-0 focus:outline-none text-xs resize-none max-h-24 py-1 text-foreground placeholder:text-muted-foreground"
              />

              <Button
                type="button"
                size="icon"
                disabled={!input.trim() || isLoading}
                onClick={() => handleSend()}
                className="h-7 w-7 rounded-lg shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                title="Send Message"
              >
                <Send size={12} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
