"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { faqItems } from "@/lib/data/faqs";
import { formatPrice } from "@/lib/utils";

type Message = {
  id: string;
  sender: "user" | "assistant" | "agent" | "system";
  text: string;
  time: string;
  imageUrl?: string;
  imageAlt?: string;
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

type AssistantAiResponse = {
  success?: boolean;
  data?: {
    reply?: string;
    suggestEscalation?: boolean;
  };
};

type WidgetTab = "home" | "messages" | "help";

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
    id: "m2",
    sender: "assistant",
    text: "Hi, I am GreenPack Assistant. Tell me your issue and I will try to resolve it quickly before escalation.",
    time: "",
  },
];

function buildDefaultMessages(): Message[] {
  return [
    {
      id: crypto.randomUUID(),
      sender: "assistant",
      text: "Hi, I am GreenPack Assistant. Tell me your issue and I will try to resolve it quickly before escalation.",
      time: formatTime(new Date()),
    },
  ];
}

function buildLoginRequiredMessages(): Message[] {
  return [
    {
      id: crypto.randomUUID(),
      sender: "assistant",
      text: "Hi, I am GreenPack Assistant. I can help with account access, payments, delivery tracking, and escalation to a live agent.",
      time: formatTime(new Date()),
    },
  ];
}

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

  if (
    text.includes("login") ||
    text.includes("log in") ||
    text.includes("sign in") ||
    text.includes("password") ||
    text.includes("account")
  ) {
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
  const [widgetTab, setWidgetTab] = useState<WidgetTab>("home");

  const timers = useRef<number[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const clearPendingAssistantReplies = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setIsTyping(false);
  }, []);

  const resetToNewConversation = useCallback(() => {
    clearPendingAssistantReplies();
    setActiveTicketId(null);
    setMode("assistant");
    setMessages(user ? buildDefaultMessages() : buildLoginRequiredMessages());
  }, [clearPendingAssistantReplies, user]);

  useEffect(() => {
    if (!user) {
      setActiveTicketId(null);
      setMode("assistant");
      setMessages(buildLoginRequiredMessages());
      return;
    }

    setMessages((prev) => {
      const hasLegacyLoginPrompt = prev.some((msg) => msg.text.includes("Please log in to use GreenPack Support"));
      const hasLegacyFreeModePrompt = prev.some((msg) => msg.text.includes("Free support mode is active"));
      if (hasLegacyLoginPrompt || hasLegacyFreeModePrompt) return buildDefaultMessages();
      return prev;
    });
  }, [user]);

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

  const fetchTicket = useCallback(async (ticketId: string) => {
    const response = await fetch(`/api/support/tickets/${ticketId}`, { credentials: "include" });
    const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket };

    if (!response.ok || !result.success || !result.data) {
      return null;
    }

    return result.data;
  }, []);

  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    const response = await fetch(`/api/support/tickets/${ticketId}/messages`, { credentials: "include" });
    const result = (await response.json()) as { success?: boolean; data?: ApiSupportMessage[] };

    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      return null;
    }

    return result.data;
  }, []);

  const syncTicketState = useCallback(async (ticketId: string) => {
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
  }, [fetchTicket, fetchTicketMessages]);

  const loadLatestTicket = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/support/tickets", { credentials: "include" });
      const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket[] };

      if (!response.ok || !result.success || !Array.isArray(result.data) || result.data.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "system",
            text: "No previous support conversation was found for this account yet.",
            time: formatTime(new Date()),
          },
        ]);
        return;
      }

      const preferred = result.data.find((ticket) => ["open", "queued", "assigned"].includes(ticket.status));
      const ticket = preferred ?? result.data[0];
      setActiveTicketId(ticket.id);
      await syncTicketState(ticket.id);
    } catch {
      // Ignore ticket loading failure.
    }
  }, [syncTicketState, user]);

  useEffect(() => {
    if (!activeTicketId || (mode !== "live-agent" && mode !== "queue")) return;

    const poll = window.setInterval(() => {
      syncTicketState(activeTicketId);
    }, 7000);

    return () => window.clearInterval(poll);
  }, [activeTicketId, mode, syncTicketState]);

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
      return { ticketId: activeTicketId, createdWithFirstMessage: false, error: null as string | null };
    }

    if (!user) {
      return { ticketId: null, createdWithFirstMessage: false, error: "Please log in first." };
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

    const result = (await response.json()) as { success?: boolean; data?: ApiSupportTicket; error?: string };
    if (!response.ok || !result.success || !result.data) {
      return {
        ticketId: null,
        createdWithFirstMessage: false,
        error: result.error ?? "Support ticket creation failed.",
      };
    }

    setActiveTicketId(result.data.id);
    return { ticketId: result.data.id, createdWithFirstMessage: true, error: null as string | null };
  };

  const queueForLiveAgent = async () => {
    if (mode !== "assistant" && mode !== "queue") return;

    if (!user) {
      setWidgetTab("messages");
      setMessages(buildLoginRequiredMessages());
      return;
    }

    clearPendingAssistantReplies();
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
      setMode("assistant");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "system",
          text: `Live-agent handoff failed: ${ensured.error ?? "Please try again in a moment."}`,
          time: formatTime(new Date()),
        },
      ]);
      return;
    }

    await syncTicketState(ensured.ticketId);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "system",
        text: "Your ticket is queued. A live agent will join this conversation soon.",
        time: formatTime(new Date()),
      },
    ]);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!user) {
      setWidgetTab("messages");
      setMessages(buildLoginRequiredMessages());
      return;
    }

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

    setWidgetTab("messages");
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const ensured = await ensureTicket(trimmed);
    const ticketId = ensured.ticketId;

    if (ticketId && !ensured.createdWithFirstMessage) {
      await persistMessage(ticketId, trimmed, "customer");
    }

    if (mode === "queue") {
      clearPendingAssistantReplies();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "system",
          text: "Your message was added to the ticket. Please wait while a live agent responds.",
          time: formatTime(new Date()),
        },
      ]);

      if (ticketId) {
        await syncTicketState(ticketId);
      }

      return;
    }

    if (mode === "live-agent") {
      clearPendingAssistantReplies();
      if (!ticketId) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "system",
            text: "Message could not be synced to a support ticket. Please reconnect to live support.",
            time: formatTime(new Date()),
          },
        ]);
        return;
      }

      await syncTicketState(ticketId);
      return;
    }

    const assistantReply = await getAssistantResponse(trimmed);

    if (assistantReply.selectedOrderId) {
      setSelectedOrderId(assistantReply.selectedOrderId);
    }

    setIsTyping(true);
    const replyTimer = window.setTimeout(async () => {
      setIsTyping(false);
      setWidgetTab("messages");

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

  const onAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    if (!user) {
      setWidgetTab("messages");
      setMessages(buildLoginRequiredMessages());
      return;
    }

    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Image upload failed"));
      reader.readAsDataURL(selectedFile);
    }).catch(() => "");

    if (!imageDataUrl) return;

    const attachedMessage = `Screenshot uploaded: ${selectedFile.name}`;
    const now = new Date();

    setWidgetTab("messages");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "user",
        text: "",
        time: formatTime(now),
        imageUrl: imageDataUrl,
        imageAlt: selectedFile.name,
      },
    ]);

    const ensured = await ensureTicket(attachedMessage);
    if (ensured.ticketId && !ensured.createdWithFirstMessage) {
      await persistMessage(ensured.ticketId, attachedMessage, "customer");
    }
  };

  const helpCollections = [
    {
      id: "tracking",
      title: "Order Tracking",
      description: "Delivery updates, delays, and courier status.",
      prompt: "My order is delayed",
    },
    {
      id: "account",
      title: "Account & Login",
      description: "Password reset, sign-in issues, and profile access.",
      prompt: "I can't log in",
    },
    {
      id: "payment",
      title: "Payments",
      description: "Double charge, refunds, failed debit, and vouchers.",
      prompt: "I was charged twice",
    },
    {
      id: "vendor",
      title: "Vendor Complaints",
      description: "Service quality concerns and escalation support.",
      prompt: "Vendor complaint",
    },
  ];

  const unreadCount = mode === "live-agent" ? 1 : 0;
  const headerName = mode === "live-agent" ? "Raul" : "GreenPack";
  const headerSubtitle =
    mode === "live-agent"
      ? "Customer Care Supervisor"
      : mode === "queue"
      ? "Finding an available support agent"
      : "Support Assistant";

  const getAssistantResponse = useCallback(
    async (message: string): Promise<AssistantReply> => {
      try {
        const response = await fetch("/api/support/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message,
            mode,
            selectedOrderId,
            orders,
            history: messages.slice(-12).map((msg) => ({ sender: msg.sender, text: msg.text })),
          }),
        });

        if (response.ok) {
          const result = (await response.json()) as AssistantAiResponse;
          const aiText = result.data?.reply?.trim();

          if (aiText) {
            return {
              text: aiText,
              suggestEscalation: Boolean(result.data?.suggestEscalation),
            };
          }
        }
      } catch {
        // Fall back to deterministic assistant behavior.
      }

      return getAssistantReply(message, {
        orders,
        selectedOrderId,
        greetingCount,
      });
    },
    [greetingCount, messages, mode, orders, selectedOrderId]
  );

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

      <div className="fixed right-3 bottom-3 md:right-5 md:bottom-5 z-50 w-[calc(100vw-1.5rem)] md:w-[420px]">
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative h-[min(650px,calc(100dvh-1.5rem))] md:h-[620px] min-h-0 flex flex-col overflow-hidden rounded-[28px] border border-green-200/80 dark:border-gray-700 bg-[#f4f8f5] dark:bg-gray-900 shadow-[0_24px_64px_rgba(0,0,0,0.16)]"
          >
            <div className="px-5 pt-4 pb-3 bg-[#f4f8f5] dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="GreenPack logo"
                    width={28}
                    height={28}
                    className="rounded-md shrink-0"
                    unoptimized
                  />
                  <div className="leading-tight">
                    <p className="text-2xl md:text-[28px] font-semibold text-gray-900 dark:text-white">{headerName}</p>
                    <p className="text-[15px] text-gray-500 dark:text-gray-400">{headerSubtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      resetToNewConversation();
                      setWidgetTab("messages");
                    }}
                    aria-label="Start a new support chat"
                    className="h-10 w-10 rounded-full text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                  >
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsWidgetOpen(false)}
                    aria-label="Close support chat"
                    className="h-10 w-10 rounded-full text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                  >
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="h-px w-full bg-green-200/70 dark:bg-gray-700" />

            {widgetTab === "messages" && (
              <div className="px-5 py-3 bg-[#f4f8f5] dark:bg-gray-900 border-b border-green-100 dark:border-gray-800">
                <p className="text-sm leading-relaxed italic text-gray-900 dark:text-gray-100">
                  We may monitor and record your chat sessions. See our{" "}
                  <Link href="/privacy" className="text-green-700 hover:underline dark:text-green-300">
                    privacy notice
                  </Link>
                </p>
              </div>
            )}

            {widgetTab === "home" && (
              <div className="flex-1 min-h-0 overflow-y-auto bg-[#eef5f1] dark:bg-gray-900/70 px-4 py-4">
                <div className="rounded-[16px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <p className="text-2xl font-semibold leading-tight text-gray-900 dark:text-white">Welcome</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Start a new chat or continue your last support conversation.
                  </p>
                  <button
                    onClick={() => {
                      resetToNewConversation();
                      setWidgetTab("messages");
                    }}
                    className="mt-4 w-full rounded-[12px] bg-green-600 text-white px-4 py-3 text-center font-semibold hover:bg-green-700"
                  >
                    New Conversation
                  </button>

                  <button
                    onClick={async () => {
                      if (!user) {
                        setWidgetTab("messages");
                        setMessages(buildLoginRequiredMessages());
                        return;
                      }

                      setWidgetTab("messages");
                      await loadLatestTicket();
                    }}
                    className="mt-2 w-full rounded-[12px] border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 px-4 py-2.5 text-center text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Continue Conversation
                  </button>
                </div>

                <div className="mt-3 rounded-[16px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Quick topics</p>
                  <div className="mt-2 space-y-1">
                    {helpCollections.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setWidgetTab("messages");
                          sendMessage(item.prompt);
                        }}
                        className="w-full rounded-[12px] px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {widgetTab === "messages" && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#eef5f1] dark:bg-gray-900/70 px-4 py-4 space-y-3">
                  {messages.map((message) => {
                    const isUser = message.sender === "user";
                    const isSystem = message.sender === "system";
                    const isAgent = message.sender === "agent";
                    const systemText = message.text.toLowerCase();
                    const isSystemError =
                      isSystem &&
                      (systemText.includes("failed") ||
                        systemText.includes("error") ||
                        systemText.includes("could not"));
                    const isSystemQueue =
                      isSystem &&
                      !isSystemError &&
                      (systemText.includes("queue") ||
                        systemText.includes("looking for") ||
                        systemText.includes("waiting"));

                    return (
                      <div
                        key={message.id}
                        className={`max-w-[86%] rounded-[12px] px-4 py-3 ${
                          isSystemError
                            ? "mx-auto bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/35 dark:text-rose-200 dark:border-rose-900/60 text-center"
                            : isSystemQueue
                            ? "mx-auto bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700 text-center"
                            : isSystem
                            ? "mx-auto bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700 text-center"
                            : isUser
                            ? "ml-auto rounded-bl-[12px] rounded-tl-[12px] rounded-tr-[12px] bg-green-600 text-white"
                            : isAgent
                            ? "bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-800"
                            : "rounded-br-[12px] rounded-tl-[12px] rounded-tr-[12px] bg-[#e6ece8] text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                      >
                        {message.imageUrl ? (
                          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={message.imageUrl}
                              alt={message.imageAlt ?? "Uploaded screenshot"}
                              className="h-auto max-h-56 w-full max-w-[240px] rounded-[10px] object-cover"
                            />
                          </a>
                        ) : (
                          <p className="text-[16px] leading-relaxed">{message.text}</p>
                        )}
                        {message.time && (
                          <p className={`mt-1 text-[10px] ${isUser ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                            {message.time}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="max-w-[86%] rounded-[12px] rounded-br-[12px] rounded-tl-[12px] rounded-tr-[12px] px-4 py-3 bg-[#e6ece8] text-gray-600 dark:bg-gray-800 dark:text-gray-100">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 pt-3 pb-4 border-t border-green-200/80 dark:border-gray-700 bg-[#f4f8f5] dark:bg-gray-900">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Current conversation</p>
                    <button
                      onClick={resetToNewConversation}
                      className="text-[11px] font-semibold text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
                    >
                      Start New Chat
                    </button>
                  </div>

                  {mode === "assistant" && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {QUICK_TOPICS.slice(0, 3).map((topic) => (
                        <button
                          key={topic}
                          onClick={() => sendMessage(topic)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-500 hover:text-green-700 dark:hover:text-green-300"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 rounded-[16px] border border-green-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 flex items-center gap-2">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={user ? "Type Message..." : "Log in to start support chat"}
                        disabled={!user}
                        className="flex-1 bg-transparent text-[16px] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Upload screenshot"
                        disabled={!user}
                        onClick={() => attachmentInputRef.current?.click()}
                        className="h-8 w-8 shrink-0 text-gray-900 dark:text-gray-100 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-60"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none" />
                          <path d="M4.5 16.5l4.5-4.2 3.2 2.8 2.3-2.1 5 4" />
                        </svg>
                      </button>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAttachmentSelected}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!user}
                      className="h-14 w-16 shrink-0 rounded-[16px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 flex items-center justify-center"
                    >
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 20l17-8L4 4v6l11 2-11 2z" />
                      </svg>
                    </button>
                  </form>

                  <button
                    onClick={queueForLiveAgent}
                    disabled={!user || mode === "live-agent" || mode === "queue"}
                    className="mt-2 text-xs font-semibold text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {!user
                      ? "Log in to connect with live agent"
                      : mode === "live-agent"
                      ? "Live Agent Connected"
                      : mode === "queue"
                      ? "Waiting for live agent..."
                      : "Connect Live Agent"}
                  </button>
                </div>
              </div>
            )}

            {widgetTab === "help" && (
              <div className="flex-1 min-h-0 overflow-y-auto bg-[#eef5f1] dark:bg-gray-900/70 px-4 py-4">
                <div className="rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Help collections</p>
                </div>
                <div className="space-y-2">
                  {helpCollections.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setWidgetTab("messages");
                        sendMessage(item.prompt);
                      }}
                      className="w-full rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 grid grid-cols-3">
              <button
                onClick={() => setWidgetTab("home")}
                className={`py-2.5 text-xs font-semibold ${widgetTab === "home" ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}`}
              >
                Home
              </button>
              <button
                onClick={() => setWidgetTab("messages")}
                className={`relative py-2.5 text-xs font-semibold ${widgetTab === "messages" ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}`}
              >
                Messages
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-[28%] inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setWidgetTab("help")}
                className={`py-2.5 text-xs font-semibold ${widgetTab === "help" ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}`}
              >
                Help
              </button>
            </div>

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
