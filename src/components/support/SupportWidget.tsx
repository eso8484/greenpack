"use client";

/**
 * Global floating support widget — mounted once in the app layout so a chat
 * launcher is available on every page (Intercom/Crisp style).
 *
 * Three-space shell: Home (greeting + resume card + quick help), Messages
 * (conversation list + active thread), Help (FAQ). Backed by the existing
 * /api/support/* routes: deterministic + AI assistant, ticket lifecycle, and
 * live-agent handoff via polling. Resolved conversations are read-only — a new
 * issue always starts a fresh conversation.
 */

import Image from "next/image";
import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { faqItems } from "@/lib/data/faqs";
import { cn } from "@/lib/utils";
import {
  ApiSupportMessage,
  ApiSupportTicket,
  ASSISTANT_INTRO_TEXT,
  AssistantReply,
  ChatMessage,
  formatClock,
  formatDayLabel,
  getAssistantReply,
  getContextualQuickReplies,
  getIntent,
  isResolved,
  LOGIN_INTRO_TEXT,
  mapApiMessage,
  SupportOrder,
  ticketStatusBadge,
} from "@/lib/support-chat";

type Space = "home" | "messages" | "help";
type Mode = "assistant" | "queue" | "live-agent";

// Routes where the launcher would clash with an existing full-screen flow.
const HIDDEN_ON = ["/admin", "/seller", "/courier", "/vendor/dashboard"];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function nowIso() {
  return new Date().toISOString();
}

function introMessage(loggedIn: boolean): ChatMessage {
  return {
    id: uid(),
    sender: "assistant",
    text: loggedIn ? ASSISTANT_INTRO_TEXT : LOGIN_INTRO_TEXT,
    at: nowIso(),
  };
}

export default function SupportWidget() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [space, setSpace] = useState<Space>("home");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<Mode>("assistant");

  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [greetingCount, setGreetingCount] = useState(0);

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ApiSupportTicket["status"] | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage(false)]);
  const [conversations, setConversations] = useState<ApiSupportTicket[]>([]);
  const [convLoading, setConvLoading] = useState(false);

  const [quickReplies, setQuickReplies] = useState<string[]>(
    getContextualQuickReplies(ASSISTANT_INTRO_TEXT, false)
  );
  const [unread, setUnread] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");

  const timers = useRef<number[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loggedIn = !!user;
  const threadReadOnly = activeStatus ? isResolved(activeStatus) : false;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  // Reset intro when auth state flips.
  useEffect(() => {
    setMessages([introMessage(loggedIn)]);
    setQuickReplies(getContextualQuickReplies(loggedIn ? ASSISTANT_INTRO_TEXT : LOGIN_INTRO_TEXT, false));
    setActiveTicketId(null);
    setActiveStatus(null);
    setMode("assistant");
    setAgentName(null);
  }, [loggedIn]);

  // Load the user's orders once (context for the assistant).
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders", { credentials: "include" });
        const json = (await res.json()) as { success?: boolean; data?: SupportOrder[] };
        if (!cancelled && res.ok && json.success && Array.isArray(json.data)) {
          setOrders(json.data);
          if (json.data.length > 0) setSelectedOrderId(json.data[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  // ---- Ticket / message fetching -----------------------------------------

  const fetchTicket = useCallback(async (ticketId: string) => {
    const res = await fetch(`/api/support/tickets/${ticketId}`, { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: ApiSupportTicket };
    return res.ok && json.success ? json.data ?? null : null;
  }, []);

  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    const res = await fetch(`/api/support/tickets/${ticketId}/messages`, { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: ApiSupportMessage[] };
    return res.ok && json.success && Array.isArray(json.data) ? json.data : null;
  }, []);

  const loadConversations = useCallback(async () => {
    if (!loggedIn) return;
    setConvLoading(true);
    try {
      const res = await fetch("/api/support/tickets", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; data?: ApiSupportTicket[] };
      if (res.ok && json.success && Array.isArray(json.data)) setConversations(json.data);
    } catch {
      /* ignore */
    } finally {
      setConvLoading(false);
    }
  }, [loggedIn]);

  const syncTicketState = useCallback(
    async (ticketId: string, opts?: { replace?: boolean }) => {
      const [ticket, ticketMessages] = await Promise.all([
        fetchTicket(ticketId),
        fetchTicketMessages(ticketId),
      ]);
      if (!ticket) return;

      setActiveStatus(ticket.status);
      setAgentName(ticket.assigned_agent_name ?? null);
      // "open" = bot handling, "queued" = waiting for a live agent, "assigned"
      // = live agent engaged. The assistant stays active until a real agent is
      // assigned so a plain "hi" always gets a reply.
      if (ticket.status === "assigned") setMode("live-agent");
      else if (ticket.status === "queued") setMode("queue");
      else setMode("assistant");

      if (ticketMessages && ticketMessages.length > 0) {
        const server = ticketMessages.map(mapApiMessage);
        if (opts?.replace) {
          setMessages(server);
          return;
        }
        // Merge, never blindly replace — keep any local (unpersisted) message
        // and append only server messages we aren't already showing. Dedupe by
        // sender+text so handoff transcript / just-sent lines don't double.
        setMessages((prev) => {
          const sig = (m: ChatMessage) => `${m.sender}|${m.text.trim()}`;
          const seen = new Set(prev.filter((m) => !m.pending).map(sig));
          const additions = server.filter((m) => !seen.has(sig(m)));
          const beforeAgent = prev.filter((m) => m.sender === "agent").length;
          if (additions.length === 0) return prev;
          const afterAgent = beforeAgent + additions.filter((m) => m.sender === "agent").length;
          if (afterAgent > beforeAgent && !open) setUnread((u) => u + (afterAgent - beforeAgent));
          return [...prev, ...additions];
        });
      }
    },
    [fetchTicket, fetchTicketMessages, open]
  );

  // Poll the active conversation while queued or with a live agent.
  useEffect(() => {
    if (!activeTicketId || (mode !== "live-agent" && mode !== "queue")) return;
    const poll = window.setInterval(() => {
      syncTicketState(activeTicketId);
    }, 6000);
    return () => window.clearInterval(poll);
  }, [activeTicketId, mode, syncTicketState]);

  // Clear unread when opening.
  useEffect(() => {
    if (open) setUnread(0);
  }, [open, messages.length]);

  // ---- Scrolling ----------------------------------------------------------

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (space !== "messages") return;
    if (nearBottomRef.current) {
      scrollToBottom("smooth");
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages, isTyping, space, scrollToBottom]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    nearBottomRef.current = near;
    if (near) setShowJump(false);
  }, []);

  // ---- Sending / assistant ------------------------------------------------

  const persistMessage = useCallback(
    async (ticketId: string, message: string, senderType: "customer" | "assistant" | "system") => {
      await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, sender_type: senderType }),
      });
    },
    []
  );

  const ensureTicket = useCallback(
    async (initialMessage: string) => {
      if (activeTicketId) return { ticketId: activeTicketId, created: false, error: null as string | null };
      if (!loggedIn) return { ticketId: null, created: false, error: "Please log in first." };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          issue_summary: initialMessage.slice(0, 220),
          order_id: selectedOrderId ?? undefined,
          first_message: initialMessage,
          channel: "web_chat",
        }),
      });
      const json = (await res.json()) as { success?: boolean; data?: ApiSupportTicket; error?: string };
      if (!res.ok || !json.success || !json.data) {
        return { ticketId: null, created: false, error: json.error ?? "Support ticket creation failed." };
      }
      setActiveTicketId(json.data.id);
      setActiveStatus(json.data.status);
      return { ticketId: json.data.id, created: true, error: null as string | null };
    },
    [activeTicketId, loggedIn, selectedOrderId]
  );

  const getAssistantResponse = useCallback(
    async (message: string): Promise<AssistantReply> => {
      try {
        const res = await fetch("/api/support/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message,
            mode,
            selectedOrderId,
            orders,
            history: messagesRef.current.slice(-12).map((m) => ({ sender: m.sender, text: m.text })),
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { reply?: string; suggestEscalation?: boolean } };
          const aiText = json.data?.reply?.trim();
          if (aiText) return { text: aiText, suggestEscalation: Boolean(json.data?.suggestEscalation) };
        }
      } catch {
        /* fall back */
      }
      return getAssistantReply(message, { orders, selectedOrderId, greetingCount });
    },
    [greetingCount, mode, orders, selectedOrderId]
  );

  const appendSystem = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: uid(), sender: "system", text, at: nowIso() }]);
  }, []);

  const queueForLiveAgent = useCallback(async () => {
    if (mode !== "assistant" && mode !== "queue") return;
    if (!loggedIn) return;

    clearTimers();
    setQuickReplies([]);
    setMode("queue");
    appendSystem("Looking for an available live support agent…");

    const transcript = messagesRef.current;
    const ensured = await ensureTicket("Live-agent handoff requested from support widget.");
    if (!ensured.ticketId) {
      setMode("assistant");
      appendSystem(`Live-agent handoff failed: ${ensured.error ?? "Please try again in a moment."}`);
      return;
    }

    if (ensured.created) {
      for (const m of transcript) {
        if (m.sender === "agent" || !m.text?.trim()) continue;
        const senderType =
          m.sender === "user" ? "customer" : m.sender === "assistant" ? "assistant" : "system";
        try {
          await persistMessage(ensured.ticketId, m.text, senderType);
        } catch {
          /* best effort */
        }
      }
    }

    // Move the ticket into the live-agent queue and notify agents.
    try {
      await fetch(`/api/support/tickets/${ensured.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "escalate" }),
      });
    } catch {
      /* the sync below will still reflect server state */
    }

    await syncTicketState(ensured.ticketId);
    loadConversations();
  }, [appendSystem, clearTimers, ensureTicket, loadConversations, loggedIn, mode, persistMessage, syncTicketState]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !loggedIn || threadReadOnly) return;

      const intent = getIntent(trimmed);
      if (intent === "greeting") setGreetingCount((p) => p + 1);

      setSpace("messages");
      setQuickReplies([]);
      setInput("");
      nearBottomRef.current = true;
      setMessages((prev) => [...prev, { id: uid(), sender: "user", text: trimmed, at: nowIso() }]);

      const ensured = await ensureTicket(trimmed);
      const ticketId = ensured.ticketId;
      if (ticketId && !ensured.created) {
        await persistMessage(ticketId, trimmed, "customer");
      }
      if (ensured.created) loadConversations();

      if (mode === "queue") {
        clearTimers();
        appendSystem("Your message was added to the ticket. Please wait while a live agent responds.");
        if (ticketId) await syncTicketState(ticketId);
        return;
      }

      if (mode === "live-agent") {
        clearTimers();
        if (ticketId) await syncTicketState(ticketId);
        return;
      }

      // Assistant mode
      const reply = await getAssistantResponse(trimmed);
      if (reply.selectedOrderId) setSelectedOrderId(reply.selectedOrderId);

      setIsTyping(true);
      const t = window.setTimeout(async () => {
        setIsTyping(false);
        const assistantText = reply.suggestEscalation
          ? `${reply.text} If you want, tap “Connect Live Agent”.`
          : reply.text;
        setMessages((prev) => [...prev, { id: uid(), sender: "assistant", text: assistantText, at: nowIso() }]);
        setQuickReplies(
          getContextualQuickReplies(assistantText, orders.length > 0, trimmed, quickReplies, Boolean(reply.suggestEscalation))
        );
        if (ticketId) await persistMessage(ticketId, assistantText, "assistant");
      }, 750);
      timers.current.push(t);
    },
    [
      appendSystem,
      clearTimers,
      ensureTicket,
      getAssistantResponse,
      loadConversations,
      loggedIn,
      mode,
      orders.length,
      persistMessage,
      quickReplies,
      syncTicketState,
      threadReadOnly,
    ]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onQuickReply = (option: string) => {
    setQuickReplies([]);
    if (option === "Connect Live Agent") {
      queueForLiveAgent();
      return;
    }
    sendMessage(option);
  };

  const onAttachment = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !loggedIn || threadReadOnly) return;

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (!dataUrl) return;

    setSpace("messages");
    nearBottomRef.current = true;
    setMessages((prev) => [
      ...prev,
      { id: uid(), sender: "user", text: "", at: nowIso(), imageUrl: dataUrl, imageAlt: file.name },
    ]);

    const label = `Screenshot uploaded: ${file.name}`;
    const ensured = await ensureTicket(label);
    if (ensured.ticketId && !ensured.created) await persistMessage(ensured.ticketId, label, "customer");
    if (ensured.created) loadConversations();
  };

  // ---- Navigation between spaces / conversations --------------------------

  const startNewConversation = useCallback(() => {
    clearTimers();
    setActiveTicketId(null);
    setActiveStatus(null);
    setAgentName(null);
    setMode("assistant");
    setMessages([introMessage(loggedIn)]);
    setQuickReplies(getContextualQuickReplies(loggedIn ? ASSISTANT_INTRO_TEXT : LOGIN_INTRO_TEXT, orders.length > 0));
    setSpace("messages");
    nearBottomRef.current = true;
  }, [clearTimers, loggedIn, orders.length]);

  const openConversation = useCallback(
    async (ticket: ApiSupportTicket) => {
      clearTimers();
      setActiveTicketId(ticket.id);
      setActiveStatus(ticket.status);
      setAgentName(ticket.assigned_agent_name ?? null);
      setMessages([]);
      setQuickReplies([]);
      setSpace("messages");
      nearBottomRef.current = true;
      await syncTicketState(ticket.id, { replace: true });
    },
    [clearTimers, syncTicketState]
  );

  const openWidget = useCallback(() => {
    setOpen(true);
    setUnread(0);
    if (loggedIn) loadConversations();
  }, [loadConversations, loggedIn]);

  // Let any page (e.g. /help CTAs, footer) open the widget by dispatching
  // `window.dispatchEvent(new Event("greenpack:open-support"))`.
  useEffect(() => {
    const handler = () => openWidget();
    window.addEventListener("greenpack:open-support", handler);
    return () => window.removeEventListener("greenpack:open-support", handler);
  }, [openWidget]);

  // Resume: when opening with no active thread, deep-link into a conversation
  // ONLY if a live agent is actively engaged (status "assigned") — so the user
  // rejoins a real human chat automatically. Otherwise we land on Home and the
  // assistant stays the default, so a fresh "hi" always gets an assistant reply
  // instead of being dropped into a stale queue.
  useEffect(() => {
    if (!open || !loggedIn || activeTicketId) return;
    const active = conversations.find((c) => c.status === "assigned");
    if (active) openConversation(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loggedIn, conversations]);

  // Derived: grouped message rendering data (day dividers + sender grouping).
  const rendered = useMemo(() => renderRows(messages), [messages]);

  const filteredFaqs = useMemo(() => {
    const q = helpQuery.trim().toLowerCase();
    if (!q) return faqItems.slice(0, 8);
    return faqItems
      .filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.keywords.some((k) => k.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [helpQuery]);

  if (pathname && HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const headerTitle =
    space === "messages" && mode === "live-agent" && agentName
      ? agentName
      : "GreenPack Support";
  const headerSubtitle =
    space === "messages"
      ? mode === "live-agent"
        ? "Live agent · Online"
        : mode === "queue"
        ? "Finding an available agent…"
        : "Assistant · Replies instantly"
      : "We typically reply in a few minutes";

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={openWidget}
            aria-label="Open support chat"
            className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[60] h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white shadow-lg shadow-green-600/30 grid place-items-center"
          >
            <span className="material-symbols-outlined text-[26px]">chat_bubble</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold grid place-items-center ring-2 ring-white dark:ring-gray-900">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed z-[60] flex flex-col overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl inset-0 rounded-none sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[min(660px,calc(100vh-96px))] sm:rounded-2xl"
          >
            {/* Header */}
            <header className="shrink-0 bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white">
              <div className="flex items-center gap-3 px-4 py-3.5">
                {space === "messages" && (
                  <button
                    onClick={() => setSpace(loggedIn ? "messages" : "home")}
                    aria-label="Back"
                    className="h-8 w-8 -ml-1 rounded-full grid place-items-center hover:bg-white/15"
                    style={{ display: activeTicketId || !loggedIn ? undefined : "none" }}
                  >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                  </button>
                )}
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-white/20 grid place-items-center overflow-hidden">
                    {mode === "live-agent" ? (
                      <span className="material-symbols-outlined text-xl">support_agent</span>
                    ) : (
                      <Image src="/logo.png" alt="GreenPack" width={36} height={36} className="object-cover" unoptimized />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-green-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight truncate">{headerTitle}</p>
                  <p className="text-[11px] text-white/80 leading-tight truncate">{headerSubtitle}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Minimize chat"
                  className="h-8 w-8 rounded-full grid place-items-center hover:bg-white/15"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              {space === "home" && (
                <div className="px-5 pb-5 pt-1">
                  <h2 className="text-2xl font-bold leading-snug">
                    Hi{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
                  </h2>
                  <p className="text-white/85 text-sm mt-1">How can we help you today?</p>
                </div>
              )}
            </header>

            {/* Body */}
            <main
              ref={space === "messages" ? scrollRef : undefined}
              onScroll={space === "messages" ? onScroll : undefined}
              className={cn(
                "flex-1 min-h-0 overflow-y-auto overscroll-contain",
                space === "messages" ? "bg-[#f6f8f7] dark:bg-gray-950 px-3 py-3" : "bg-white dark:bg-gray-900"
              )}
            >
              {space === "home" && (
                <HomeSpace
                  loggedIn={loggedIn}
                  conversations={conversations}
                  onResume={openConversation}
                  onNew={startNewConversation}
                  onOpenHelp={() => setSpace("help")}
                  onOpenMessages={() => setSpace("messages")}
                />
              )}

              {space === "messages" && (
                <MessagesSpace
                  loggedIn={loggedIn}
                  activeTicketId={activeTicketId}
                  conversations={conversations}
                  convLoading={convLoading}
                  rendered={rendered}
                  isTyping={isTyping}
                  mode={mode}
                  agentName={agentName}
                  threadReadOnly={threadReadOnly}
                  onOpenConversation={openConversation}
                  onNew={startNewConversation}
                />
              )}

              {space === "help" && (
                <HelpSpace
                  query={helpQuery}
                  setQuery={setHelpQuery}
                  faqs={filteredFaqs}
                  onAsk={(q) => {
                    setSpace("messages");
                    sendMessage(q);
                  }}
                />
              )}
            </main>

            {/* Jump-to-latest pill */}
            {space === "messages" && showJump && (
              <button
                onClick={() => {
                  nearBottomRef.current = true;
                  scrollToBottom("smooth");
                  setShowJump(false);
                }}
                className="absolute left-1/2 -translate-x-1/2 bottom-[132px] z-10 flex items-center gap-1 rounded-full bg-gray-900/90 text-white text-xs px-3 py-1.5 shadow-lg"
              >
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                New messages
              </button>
            )}

            {/* Composer (messages space, active thread, not read-only) */}
            {space === "messages" && activeTicketId !== null || (space === "messages" && loggedIn && !activeTicketId) ? (
              threadReadOnly ? (
                <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                    This conversation was resolved and is now read-only.
                  </p>
                  <button
                    onClick={startNewConversation}
                    className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5"
                  >
                    Start a new conversation
                  </button>
                </div>
              ) : (
                <Composer
                  input={input}
                  setInput={setInput}
                  onSubmit={onSubmit}
                  quickReplies={quickReplies}
                  onQuickReply={onQuickReply}
                  onAttachClick={() => attachmentInputRef.current?.click()}
                  disabled={!loggedIn}
                  disabledHint={!loggedIn ? "Log in to chat with support" : undefined}
                />
              )
            ) : null}

            <input ref={attachmentInputRef} type="file" accept="image/*" className="hidden" onChange={onAttachment} />

            {/* Tab bar */}
            <nav className="shrink-0 grid grid-cols-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {(
                [
                  { id: "home", label: "Home", icon: "home" },
                  { id: "messages", label: "Messages", icon: "chat" },
                  { id: "help", label: "Help", icon: "help" },
                ] as { id: Space; label: string; icon: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSpace(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                    space === tab.id
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  )}
                >
                  <span className="material-symbols-outlined text-[22px] relative">
                    {tab.icon}
                    {tab.id === "messages" && unread > 0 && (
                      <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ===========================================================================
// Rendering helpers
// ===========================================================================

type Row =
  | { kind: "day"; id: string; label: string }
  | { kind: "msg"; id: string; msg: ChatMessage; groupStart: boolean; groupEnd: boolean };

function renderRows(messages: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  messages.forEach((msg, i) => {
    const day = formatDayLabel(msg.at);
    if (day && day !== lastDay) {
      rows.push({ kind: "day", id: `day-${i}-${day}`, label: day });
      lastDay = day;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const groupStart = !prev || prev.sender !== msg.sender || formatDayLabel(prev.at) !== day;
    const groupEnd = !next || next.sender !== msg.sender || formatDayLabel(next.at) !== day;
    rows.push({ kind: "msg", id: msg.id, msg, groupStart, groupEnd });
  });
  return rows;
}

function Bubble({ msg, groupEnd }: { msg: ChatMessage; groupEnd: boolean }) {
  if (msg.sender === "system") {
    return (
      <div className="flex justify-center my-1.5">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60 rounded-full px-3 py-1 text-center max-w-[85%]">
          {msg.text}
        </span>
      </div>
    );
  }

  const isUser = msg.sender === "user";
  const isAgent = msg.sender === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className={cn("w-7 shrink-0", groupEnd ? "" : "opacity-0")}>
          {groupEnd && (
            <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/40 grid place-items-center">
              <span className="material-symbols-outlined text-[16px] text-green-600 dark:text-green-400">
                {isAgent ? "support_agent" : "smart_toy"}
              </span>
            </div>
          )}
        </div>
      )}
      <div className={cn("max-w-[78%] flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-3.5 py-2 text-sm leading-relaxed break-words",
            isUser
              ? "bg-green-600 text-white dark:bg-green-500 rounded-2xl " + (groupEnd ? "rounded-br-md" : "")
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl " +
                  (groupEnd ? "rounded-bl-md" : "")
          )}
        >
          {msg.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={msg.imageUrl} alt={msg.imageAlt ?? "attachment"} className="rounded-lg max-h-48 object-cover" />
          ) : (
            msg.text
          )}
        </div>
        {groupEnd && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 px-1">
            {msg.failed ? "Failed to send" : formatClock(msg.at)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/40 grid place-items-center shrink-0">
        <span className="material-symbols-outlined text-[16px] text-green-600 dark:text-green-400">smart_toy</span>
      </div>
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Spaces
// ===========================================================================

function HomeSpace({
  loggedIn,
  conversations,
  onResume,
  onNew,
  onOpenHelp,
  onOpenMessages,
}: {
  loggedIn: boolean;
  conversations: ApiSupportTicket[];
  onResume: (t: ApiSupportTicket) => void;
  onNew: () => void;
  onOpenHelp: () => void;
  onOpenMessages: () => void;
}) {
  const active = conversations.find((c) => !isResolved(c.status));
  return (
    <div className="p-4 space-y-3">
      {/* Send us a message card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        {active ? (
          <button onClick={() => onResume(active)} className="w-full text-left group">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Continue your conversation</p>
              <span className={cn("text-[11px] font-medium rounded-full px-2 py-0.5", ticketStatusBadge(active.status).className)}>
                {ticketStatusBadge(active.status).label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {active.issue_summary || "Tap to resume where you left off."}
            </p>
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium mt-2 group-hover:gap-2 transition-all">
              Resume <span className="material-symbols-outlined text-base">arrow_forward</span>
            </span>
          </button>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Send us a message</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loggedIn ? "We'll help you resolve it fast." : "Log in to start a conversation with support."}
            </p>
            <button
              onClick={onNew}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2"
            >
              Start a conversation
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </>
        )}
      </div>

      {/* Recent conversations peek */}
      {loggedIn && conversations.length > 0 && (
        <button
          onClick={onOpenMessages}
          className="w-full flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/70"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400">forum</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Your conversations ({conversations.length})
            </span>
          </div>
          <span className="material-symbols-outlined text-gray-400">chevron_right</span>
        </button>
      )}

      {/* Help search shortcut */}
      <button
        onClick={onOpenHelp}
        className="w-full flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/70"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-400">help</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Search help articles</span>
        </div>
        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
      </button>
    </div>
  );
}

function MessagesSpace(props: {
  loggedIn: boolean;
  activeTicketId: string | null;
  conversations: ApiSupportTicket[];
  convLoading: boolean;
  rendered: Row[];
  isTyping: boolean;
  mode: Mode;
  agentName: string | null;
  threadReadOnly: boolean;
  onOpenConversation: (t: ApiSupportTicket) => void;
  onNew: () => void;
}) {
  const {
    loggedIn,
    activeTicketId,
    conversations,
    convLoading,
    rendered,
    isTyping,
    onOpenConversation,
    onNew,
  } = props;

  if (!loggedIn) {
    return (
      <div className="h-full grid place-items-center p-6 text-center">
        <div>
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 grid place-items-center mb-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">lock</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Log in to chat with support</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Your conversations are saved to your account so you can pick up any time.
          </p>
          <Link href="/login?redirect=/help" className="inline-block rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  // Conversation LIST (no active thread)
  if (!activeTicketId) {
    return (
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</p>
          <button onClick={onNew} className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
            <span className="material-symbols-outlined text-base">add</span> New
          </button>
        </div>
        {convLoading && conversations.length === 0 ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">forum</span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No conversations yet.</p>
            <button onClick={onNew} className="mt-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2">
              Start a conversation
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => {
              const badge = ticketStatusBadge(c.status);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onOpenConversation(c)}
                    className="w-full flex items-start gap-3 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-800/60 text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 grid place-items-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-green-600 dark:text-green-400">
                        {c.status === "assigned" ? "support_agent" : "smart_toy"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {c.assigned_agent_name || "GreenPack Support"}
                        </p>
                        <span className={cn("shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5", badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {c.issue_summary || "Support conversation"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Active THREAD
  return (
    <div className="flex flex-col gap-1">
      {rendered.map((row) =>
        row.kind === "day" ? (
          <div key={row.id} className="flex items-center gap-3 my-2 px-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{row.label}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>
        ) : (
          <div key={row.id} className={row.groupStart ? "mt-2" : ""}>
            <Bubble msg={row.msg} groupEnd={row.groupEnd} />
          </div>
        )
      )}
      {isTyping && (
        <div className="mt-2">
          <TypingBubble />
        </div>
      )}
    </div>
  );
}

function HelpSpace({
  query,
  setQuery,
  faqs,
  onAsk,
}: {
  query: string;
  setQuery: (v: string) => void;
  faqs: typeof faqItems;
  onAsk: (q: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="p-4">
      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help…"
          className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />
      </div>
      <ul className="space-y-1.5">
        {faqs.map((f) => (
          <li key={f.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setOpenId(openId === f.id ? null : f.id)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.question}</span>
              <span className={cn("material-symbols-outlined text-gray-400 transition-transform", openId === f.id && "rotate-180")}>
                expand_more
              </span>
            </button>
            {openId === f.id && (
              <div className="px-3.5 pb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.answer}</div>
            )}
          </li>
        ))}
        {faqs.length === 0 && (
          <li className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">No articles match “{query}”.</li>
        )}
      </ul>
      <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300">Still need help?</p>
        <button
          onClick={() => onAsk("I need help from a live agent")}
          className="mt-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2"
        >
          Send us a message
        </button>
      </div>
    </div>
  );
}

function Composer({
  input,
  setInput,
  onSubmit,
  quickReplies,
  onQuickReply,
  onAttachClick,
  disabled,
  disabledHint,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  quickReplies: string[];
  onQuickReply: (q: string) => void;
  onAttachClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {quickReplies.length > 0 && !disabled && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1 no-scrollbar">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => onQuickReply(q)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap",
                q === "Connect Live Agent"
                  ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                  : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex items-end gap-2 p-3">
        <button
          type="button"
          onClick={onAttachClick}
          disabled={disabled}
          aria-label="Attach image"
          className="h-9 w-9 shrink-0 rounded-full grid place-items-center text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-xl">attach_file</span>
        </button>
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as FormEvent);
            }
          }}
          placeholder={disabledHint ?? "Type your message…"}
          className="flex-1 resize-none max-h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          aria-label="Send message"
          className="h-9 w-9 shrink-0 rounded-full grid place-items-center bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </form>
    </div>
  );
}
