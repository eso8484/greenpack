"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { faqItems } from "@/lib/data/faqs";
import { formatPrice } from "@/lib/utils";

type Message = {
  id: string;
  sender: "user" | "assistant" | "agent" | "system";
  text: string;
  time: string;
};

type SupportOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type ApiSupportTicket = {
  id: string;
  status: "open" | "queued" | "assigned" | "resolved" | "closed";
  assigned_agent_name?: string | null;
};

type ApiSupportMessage = {
  id: string;
  sender_type: "customer" | "assistant" | "agent" | "system";
  message: string;
  created_at: string;
};

type AssistantContext = {
  orders: SupportOrder[];
  selectedOrderId: string | null;
  greetingCount: number;
};

type AssistantReply = {
  text: string;
  suggestEscalation?: boolean;
  selectedOrderId?: string | null;
};

const QUICK_TOPICS = [
  "I can't log in",
  "My order is delayed",
  "I was charged twice",
  "Vendor complaint",
  "Report a bug",
  "Track my last order",
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "system",
    text: "Free support mode is active. Start with assistant chat, then connect to a live agent at no cost.",
    time: formatTime(new Date()),
  },
  {
    id: "m2",
    sender: "assistant",
    text: "Hi, I am GreenPack Assistant. Tell me your issue and I will try to resolve it quickly before escalation.",
    time: formatTime(new Date()),
  },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function getOrderRef(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

function getIntent(input: string) {
  const text = input.toLowerCase();

  if (/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text)) {
    return "greeting" as const;
  }

  if (text.includes("last order") || text.includes("recent order") || text.includes("previous order")) {
    return "recent-order" as const;
  }

  if (text.includes("track") || text.includes("delivery") || text.includes("where is") || text.includes("order")) {
    return "order" as const;
  }

  if (text.includes("payment") || text.includes("charge") || text.includes("debit") || text.includes("twice")) {
    return "payment" as const;
  }

  if (text.includes("login") || text.includes("sign in") || text.includes("password") || text.includes("account")) {
    return "account" as const;
  }

  if (text.includes("bug") || text.includes("error") || text.includes("crash") || text.includes("broken")) {
    return "bug" as const;
  }

  if (text.includes("agent") || text.includes("human") || text.includes("person")) {
    return "escalate" as const;
  }

  return "general" as const;
}

function matchFaq(input: string) {
  const text = normalize(input);
  let bestScore = 0;
  let best: (typeof faqItems)[number] | null = null;

  for (const item of faqItems) {
    let score = 0;

    if (text.includes(item.question.toLowerCase())) {
      score += 5;
    }

    for (const keyword of item.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 3) return null;
  return best;
}

function findOrderFromMessage(input: string, orders: SupportOrder[]) {
  const text = normalize(input);

  for (const order of orders) {
    const shortRef = getOrderRef(order.id).toLowerCase();
    if (text.includes(order.id.toLowerCase()) || text.includes(shortRef)) {
      return order;
    }
  }

  return null;
}

function buildOrderSummary(order: SupportOrder) {
  const orderDate = new Date(order.created_at).toLocaleDateString();
  return `Order ${getOrderRef(order.id)} is currently ${order.status}. Total: ${formatPrice(
    order.total_amount
  )}. Created: ${orderDate}.`;
}

function getAssistantReply(input: string, context: AssistantContext): AssistantReply {
  const intent = getIntent(input);
  const faqMatch = matchFaq(input);

  if (intent === "greeting") {
    const replies = [
      "Hi. I can help with orders, payments, account access, or vendor issues. What do you want to resolve first?",
      "Hello. If you want, I can start by checking your recent order activity or account issues.",
      "Hey. Tell me what happened, and I will guide you step by step or connect you to a live agent.",
    ];

    const index = context.greetingCount % replies.length;
    return { text: replies[index] };
  }

  if (intent === "escalate") {
    return {
      text: "No problem. I can connect you to a live agent immediately from this chat.",
      suggestEscalation: true,
    };
  }

  if (intent === "recent-order") {
    if (!context.orders.length) {
      return {
        text: "I could not find any recent orders on this account yet. If you ordered without login, share the order reference and I will still help.",
      };
    }

    const recent = context.orders[0];
    return {
      text: `${buildOrderSummary(recent)} Do you want me to escalate this to a live delivery agent?`,
      selectedOrderId: recent.id,
      suggestEscalation: true,
    };
  }

  if (intent === "order") {
    if (!context.orders.length) {
      return {
        text: "I can track orders, but I could not load any order on this account yet. Share your order reference so I can continue.",
      };
    }

    const mentionedOrder = findOrderFromMessage(input, context.orders);
    if (mentionedOrder) {
      return {
        text: `${buildOrderSummary(mentionedOrder)} If this looks delayed, I can connect a live agent now.`,
        selectedOrderId: mentionedOrder.id,
        suggestEscalation: true,
      };
    }

    if (context.selectedOrderId) {
      const selected = context.orders.find((o) => o.id === context.selectedOrderId);
      if (selected) {
        return {
          text: `${buildOrderSummary(selected)} Want me to follow up with a live agent for this order?`,
          suggestEscalation: true,
        };
      }
    }

    const recent = context.orders[0];
    return {
      text: `I found your most recent order. ${buildOrderSummary(recent)} You can also send a specific reference if this is not the one.`,
      selectedOrderId: recent.id,
    };
  }

  if (intent === "account") {
    return {
      text:
        "For account access, try password reset first. If Google sign-in fails, use only localhost and retry once. If it still fails, I can escalate to a human agent.",
      suggestEscalation: true,
    };
  }

  if (intent === "payment") {
    return {
      text:
        "Please share your order reference and the exact debit time. I will prepare a billing check and move it to a live billing agent if needed.",
      suggestEscalation: true,
    };
  }

  if (intent === "bug") {
    return {
      text:
        "Thanks for flagging that bug. Share the page and what action triggered it. I will create a report and can hand this to a live support specialist.",
      suggestEscalation: true,
    };
  }

  if (faqMatch) {
    return {
      text: `${faqMatch.answer} If you want, I can also hand this over to a live agent right now.`,
      suggestEscalation: faqMatch.categoryId === "support" || faqMatch.categoryId === "tracking",
    };
  }

  return {
    text:
      "I understand. Share your order reference or account email and tell me what happened. I will suggest a direct fix first, then escalate if needed.",
  };
}

function getLiveAgentReply(text: string, selectedOrder: SupportOrder | null) {
  const normalized = normalize(text);

  if (normalized.includes("thank") || normalized.includes("ok") || normalized.includes("alright")) {
    return "You are welcome. I am still here and monitoring this case for you.";
  }

  if ((normalized.includes("track") || normalized.includes("order")) && selectedOrder) {
    return `I am reviewing order ${getOrderRef(selectedOrder.id)} now. Current status is ${selectedOrder.status}. I will push an update to the vendor and confirm back here.`;
  }

  if (normalized.includes("payment") || normalized.includes("charge") || normalized.includes("debit")) {
    return "I have opened a billing review ticket and flagged this as payment-sensitive. Please allow a few minutes while I validate the transaction trail.";
  }

  if (normalized.includes("bug") || normalized.includes("error")) {
    return "Thanks. I have sent this to our engineering queue with priority. I will follow up with a status update in this chat.";
  }

  return "I have noted that. I am checking this now and will provide a concrete update shortly.";
}

function mapApiMessage(message: ApiSupportMessage): Message {
  const senderMap: Record<ApiSupportMessage["sender_type"], Message["sender"]> = {
    customer: "user",
    assistant: "assistant",
    agent: "agent",
    system: "system",
  };

  return {
    id: message.id,
    sender: senderMap[message.sender_type],
    text: message.message,
    time: formatTime(new Date(message.created_at)),
  };
}

export default function ContactSupportPage() {
  const { user } = useAuth();

  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"assistant" | "queue" | "live-agent">("assistant");
  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [greetingCount, setGreetingCount] = useState(0);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);

  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders", { credentials: "include" });
        const result = (await response.json()) as { success?: boolean; data?: SupportOrder[] };
        if (response.ok && result.success && Array.isArray(result.data)) {
          setOrders(result.data);
          if (result.data.length > 0) {
            setSelectedOrderId(result.data[0].id);
          }
        }
      } catch {
        // Ignore order fetch failures.
      }
    };

    loadOrders();
  }, []);

  const fetchTicket = async (ticketId: string) => {
    const response = await fetch(`/api/support/tickets/${ticketId}`, { credentials: "include" });
    const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket };

    if (!response.ok || !result.success || !result.data) {
      return null;
    }

    return result.data;
  };

  const fetchTicketMessages = async (ticketId: string) => {
    const response = await fetch(`/api/support/tickets/${ticketId}/messages`, { credentials: "include" });
    const result = (await response.json()) as { success?: boolean; data?: ApiSupportMessage[] };

    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      return null;
    }

    return result.data;
  };

  const syncTicketState = async (ticketId: string) => {
    const [ticket, ticketMessages] = await Promise.all([fetchTicket(ticketId), fetchTicketMessages(ticketId)]);

    if (!ticket) return;

    if (ticket.status === "assigned") {
      setMode("live-agent");
    } else if (ticket.status === "queued" || ticket.status === "open") {
      setMode("queue");
    } else {
      setMode("assistant");
    }

    if (ticketMessages && ticketMessages.length > 0) {
      setMessages(ticketMessages.map(mapApiMessage));
    }
  };

  useEffect(() => {
    if (!user) return;

    const loadLatestTicket = async () => {
      try {
        const response = await fetch("/api/support/tickets", { credentials: "include" });
        const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket[] };

        if (!response.ok || !result.success || !Array.isArray(result.data) || result.data.length === 0) {
          return;
        }

        const preferred = result.data.find((ticket) =>
          ["open", "queued", "assigned"].includes(ticket.status)
        );

        const ticket = preferred ?? result.data[0];
        setActiveTicketId(ticket.id);
        await syncTicketState(ticket.id);
      } catch {
        // Ignore ticket loading failure.
      }
    };

    loadLatestTicket();
  }, [user]);

  useEffect(() => {
    if (!activeTicketId || mode !== "live-agent") return;

    const poll = window.setInterval(() => {
      syncTicketState(activeTicketId);
    }, 7000);

    return () => window.clearInterval(poll);
  }, [activeTicketId, mode]);

  const persistMessage = async (
    ticketId: string,
    message: string,
    senderType: "customer" | "assistant" | "system"
  ) => {
    await fetch(`/api/support/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, sender_type: senderType }),
    });
  };

  const ensureTicket = async (initialMessage: string) => {
    if (activeTicketId) {
      return { ticketId: activeTicketId, createdWithFirstMessage: false };
    }

    if (!user) {
      return { ticketId: null, createdWithFirstMessage: false };
    }

    const response = await fetch("/api/support/tickets", {
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

    const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket };
    if (!response.ok || !result.success || !result.data) {
      return { ticketId: null, createdWithFirstMessage: false };
    }

    setActiveTicketId(result.data.id);
    return { ticketId: result.data.id, createdWithFirstMessage: true };
  };

  const queueForLiveAgent = async () => {
    if (mode !== "assistant" && mode !== "queue") return;

    if (!user) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "system",
          text: "Please log in first so we can create and track your live support ticket.",
          time: formatTime(new Date()),
        },
      ]);
      return;
    }

    setMode("queue");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "system",
        text: "Looking for an available live support agent...",
        time: formatTime(new Date()),
      },
    ]);

    const ensured = await ensureTicket("Live-agent handoff requested from support widget.");
    if (!ensured.ticketId) {
      const fallbackTimer = window.setTimeout(() => {
        setMode("live-agent");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "system",
            text: "You are connected. Agent Amina joined the chat.",
            time: formatTime(new Date()),
          },
          {
            id: crypto.randomUUID(),
            sender: "agent",
            text: "Hi, I am Amina from GreenPack Support. I can help here while backend ticket sync is still being prepared.",
            time: formatTime(new Date()),
          },
        ]);
      }, 1200);

      timers.current.push(fallbackTimer);
      return;
    }

    const queueTimer = window.setTimeout(async () => {
      await fetch(`/api/support/tickets/${ensured.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "assign_demo_agent" }),
      });
      await syncTicketState(ensured.ticketId);
    }, 1200);

    timers.current.push(queueTimer);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = new Date();
    const intent = getIntent(trimmed);
    if (intent === "greeting") {
      setGreetingCount((prev) => prev + 1);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmed,
      time: formatTime(now),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const ensured = await ensureTicket(trimmed);
    const ticketId = ensured.ticketId;

    if (ticketId && !ensured.createdWithFirstMessage) {
      await persistMessage(ticketId, trimmed, "customer");
    }

    if (mode === "live-agent") {
      setIsTyping(true);
      const liveReplyTimer = window.setTimeout(async () => {
        setIsTyping(false);

        if (!ticketId) {
          const selectedOrder = selectedOrderId
            ? orders.find((order) => order.id === selectedOrderId) ?? null
            : null;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "agent",
              text: getLiveAgentReply(trimmed, selectedOrder),
              time: formatTime(new Date()),
            },
          ]);
          return;
        }

        await fetch(`/api/support/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "agent_auto_reply", user_message: trimmed }),
        });

        await syncTicketState(ticketId);
      }, 900);

      timers.current.push(liveReplyTimer);
      return;
    }

    const assistantReply = getAssistantReply(trimmed, {
      orders,
      selectedOrderId,
      greetingCount,
    });

    if (assistantReply.selectedOrderId) {
      setSelectedOrderId(assistantReply.selectedOrderId);
    }

    setIsTyping(true);
    const replyTimer = window.setTimeout(async () => {
      setIsTyping(false);

      const assistantText = assistantReply.suggestEscalation
        ? `${assistantReply.text} If you want, tap Connect Live Agent.`
        : assistantReply.text;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text: assistantText,
          time: formatTime(new Date(now.getTime() + 1000)),
        },
      ]);

      if (ticketId) {
        await persistMessage(ticketId, assistantText, "assistant");
      }
    }, 850);

    timers.current.push(replyTimer);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900 pb-28">
      <section className="relative overflow-hidden border-b border-green-200/60 dark:border-green-900/50 bg-[radial-gradient(circle_at_15%_20%,rgba(34,197,94,0.18),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(21,128,61,0.22),transparent_36%),linear-gradient(180deg,#f0fdf4_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_10%_15%,rgba(34,197,94,0.22),transparent_35%),radial-gradient(circle_at_85%_5%,rgba(22,101,52,0.3),transparent_35%),linear-gradient(180deg,#0b1220_0%,#0f172a_100%)]">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-3xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
              Free Support Experience
            </p>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
              Smart Assistant + Live Agent Handoff
            </h1>
            <p className="mt-4 text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
              The widget at the bottom-right works like modern ecommerce support chat. It now uses context from your support conversation and can reference your recent orders.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href="https://wa.me/2348000000000?text=Hi%20GreenPack%20Support%2C%20I%20need%20help%20with%20my%20account."
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 p-4 hover:-translate-y-0.5 transition-transform"
            >
              <p className="font-semibold text-gray-900 dark:text-white">WhatsApp</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fast support on chat</p>
            </a>
            <a
              href="mailto:support@greenpackdelight.com"
              className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 p-4 hover:-translate-y-0.5 transition-transform"
            >
              <p className="font-semibold text-gray-900 dark:text-white">Email Support</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">support@greenpackdelight.com</p>
            </a>
            <a
              href="tel:+2348000000000"
              className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 p-4 hover:-translate-y-0.5 transition-transform"
            >
              <p className="font-semibold text-gray-900 dark:text-white">Call Center</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">+234 800 000 0000</p>
            </a>
            <button
              onClick={queueForLiveAgent}
              className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 p-4 text-left hover:-translate-y-0.5 transition-transform"
            >
              <p className="font-semibold text-gray-900 dark:text-white">Connect Live Agent</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Join human support queue</p>
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">How this works</p>
            <ol className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. Open the floating widget at the bottom-right.</li>
              <li>2. Chat with assistant for context-aware support and order lookup.</li>
              <li>3. Tap Connect Live Agent if still unresolved.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-5">
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">Account context</p>
            <p className="mt-2 text-sm text-green-800 dark:text-green-300">
              {orders.length > 0
                ? `I found ${orders.length} order${orders.length > 1 ? "s" : ""} on this account. Try: \"track my last order\" in chat.`
                : "No recent orders found yet. You can still get support using your order reference or account email."}
            </p>
            <Link
              href="/help"
              className="inline-block mt-3 text-sm font-semibold text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
            >
              Go to Help Center
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed right-3 bottom-3 md:right-5 md:bottom-5 z-50 w-[calc(100vw-1.5rem)] md:w-[380px]">
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_20px_55px_rgba(0,0,0,0.22)]"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-90">GreenPack Support</p>
                <p className="text-sm font-semibold">
                  {mode === "live-agent"
                    ? "Live Agent Connected"
                    : mode === "queue"
                    ? "Finding an Agent"
                    : "Assistant Online"}
                </p>
              </div>
              <button
                onClick={() => setIsWidgetOpen(false)}
                aria-label="Minimize support chat"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="h-[360px] overflow-y-auto bg-[#f7faf8] dark:bg-gray-900/70 px-3 py-3 space-y-2.5">
              {messages.map((message) => {
                const isUser = message.sender === "user";
                const isSystem = message.sender === "system";
                const isAgent = message.sender === "agent";

                return (
                  <div
                    key={message.id}
                    className={`max-w-[86%] rounded-xl px-3 py-2.5 ${
                      isSystem
                        ? "mx-auto bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900 text-center"
                        : isUser
                        ? "ml-auto bg-green-600 text-white"
                        : isAgent
                        ? "bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-800"
                        : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`mt-1 text-[10px] ${isUser ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                      {message.time}
                    </p>
                  </div>
                );
              })}

              {isTyping && (
                <div className="max-w-[86%] rounded-xl px-3 py-2.5 bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => sendMessage(topic)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-500 hover:text-green-700 dark:hover:text-green-300"
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 text-sm font-semibold"
                >
                  Send
                </button>
              </form>

              {mode !== "live-agent" && (
                <button
                  onClick={queueForLiveAgent}
                  className="mt-2 text-xs font-semibold text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
                >
                  Connect Live Agent
                </button>
              )}
            </div>

            <button
              onClick={() => setIsWidgetOpen(false)}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center"
              aria-label="Collapse chat widget"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7" />
              </svg>
            </button>
          </motion.div>
        )}

        {!isWidgetOpen && (
          <button
            onClick={() => setIsWidgetOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-full bg-green-600 text-white px-4 py-3 shadow-lg shadow-green-700/30 hover:bg-green-700"
            aria-label="Open support chat"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m-9 7l1.405-1.405A2.032 2.032 0 017.158 19H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2.159c.538 0 1.055.214 1.436.595L10 21z" />
            </svg>
            Chat Support
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
