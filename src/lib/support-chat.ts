/**
 * Pure, framework-free helpers for the support chat widget: intent detection,
 * contextual quick replies, FAQ matching, and the deterministic assistant
 * fallback. Kept out of the component so the widget file stays about UI.
 */

import { faqItems } from "@/lib/data/faqs";
import { formatPrice } from "@/lib/utils";

export type ChatSender = "user" | "assistant" | "agent" | "system";

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  /** ISO timestamp — formatted for display at render time. */
  at: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Optimistic send state, for the "sending / failed" affordance. */
  pending?: boolean;
  failed?: boolean;
};

export type SupportOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export type ApiSupportTicket = {
  id: string;
  status: "open" | "queued" | "assigned" | "resolved" | "closed";
  assigned_agent_name?: string | null;
  issue_summary?: string | null;
  updated_at?: string;
  created_at?: string;
};

export type ApiSupportMessage = {
  id: string;
  sender_type: "customer" | "assistant" | "agent" | "system";
  message: string;
  created_at: string;
};

export type AssistantReply = {
  text: string;
  suggestEscalation?: boolean;
  selectedOrderId?: string | null;
};

export const ASSISTANT_INTRO_TEXT =
  "Hi 👋 I'm the GreenPack Assistant. Tell me what's going on — orders, payments, account, or vendor issues — and I'll help right away or connect you to a live agent.";

export const LOGIN_INTRO_TEXT =
  "Hi 👋 I'm the GreenPack Assistant. Log in and I can help with account access, payments, delivery tracking, and connecting you to a live agent.";

export function getOrderRef(orderId: string) {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

export function getIntent(input: string) {
  const value = input.toLowerCase();
  if (/^(hi|hello|hey|good\s+(morning|afternoon|evening))\b/.test(value)) return "greeting" as const;
  if (/(human|agent|representative|real person|escalat|live support)/.test(value)) return "escalate" as const;
  if (/(recent order|last order|latest order|track my last)/.test(value)) return "recent-order" as const;
  if (/(order|delivery|tracking|courier|dispatch|rider|package)/.test(value)) return "order" as const;
  if (/(login|log in|password|account|sign in|signin|otp|verification)/.test(value)) return "account" as const;
  if (/(payment|charged|charge|refund|debit|card|billing)/.test(value)) return "payment" as const;
  if (/(bug|error|broken|not working|issue on page|crash)/.test(value)) return "bug" as const;
  return "general" as const;
}

function matchFaq(input: string) {
  const value = input.toLowerCase();
  return faqItems.find((faq) => {
    const questionMatch = faq.question.toLowerCase().includes(value);
    const keywordMatch = faq.keywords.some((keyword) => value.includes(keyword.toLowerCase()));
    return questionMatch || keywordMatch;
  });
}

function findOrderFromMessage(text: string, orders: SupportOrder[]) {
  for (const order of orders) {
    const shortRef = getOrderRef(order.id).toLowerCase();
    if (text.includes(order.id.toLowerCase()) || text.includes(shortRef)) return order;
  }
  return null;
}

function buildOrderSummary(order: SupportOrder) {
  const orderDate = new Date(order.created_at).toLocaleDateString();
  return `Order ${getOrderRef(order.id)} is currently ${order.status}. Total: ${formatPrice(
    order.total_amount
  )}. Created: ${orderDate}.`;
}

export function getContextualQuickReplies(
  text: string,
  hasOrders: boolean,
  userFocus?: string,
  previousOptions: string[] = [],
  requireLiveAgentOption = false
) {
  const source = (userFocus ?? text).toLowerCase();

  let primary = ["Track my last order", "I can't log in", "I was charged twice", "Vendor complaint"];
  let secondary = ["My order is delayed", "Reset my password", "Where is my refund?", "Report a bug"];

  if (source.includes("login") || source.includes("account") || source.includes("password") || source.includes("otp")) {
    primary = ["Reset my password", "I didn't get OTP", "Google sign-in failed", "Connect Live Agent"];
    secondary = ["Account verification issue", "Still cannot log in", "Try another login method", "Connect Live Agent"];
  } else if (
    source.includes("order") ||
    source.includes("delivery") ||
    source.includes("tracking") ||
    source.includes("courier") ||
    source.includes("rider")
  ) {
    primary = hasOrders
      ? ["Track my last order", "My order is delayed", "Courier has not arrived", "Connect Live Agent"]
      : ["Track my order", "I don't have my order reference", "Delivery issue", "Connect Live Agent"];
    secondary = ["Order marked delivered but not received", "Wrong order received", "Change delivery address", "Connect Live Agent"];
  } else if (source.includes("payment") || source.includes("charged") || source.includes("refund") || source.includes("debit")) {
    primary = ["Where is my refund?", "I was charged twice", "Payment failed", "Connect Live Agent"];
    secondary = ["Card debited but order failed", "Need invoice", "Dispute a charge", "Connect Live Agent"];
  } else if (source.includes("vendor") || source.includes("complaint") || source.includes("service")) {
    primary = ["Vendor complaint", "Bad service quality", "Request escalation", "Connect Live Agent"];
    secondary = ["Vendor is unresponsive", "Wrong service delivered", "Request refund from vendor", "Connect Live Agent"];
  } else if (source.includes("bug") || source.includes("error") || source.includes("not working") || source.includes("crash")) {
    primary = ["Report a bug", "Page not loading", "App is slow", "Connect Live Agent"];
    secondary = ["Share screenshot", "When did this start?", "Issue on checkout page", "Connect Live Agent"];
  } else if (source.includes("queue") || source.includes("agent") || source.includes("escalat")) {
    primary = ["Connect Live Agent", "Still waiting", "I need urgent help", "Check ticket status"];
    secondary = ["Agent has not joined", "Escalate priority", "Share my callback number", "Check queue time"];
  }

  const selected = (userFocus ?? "").toLowerCase();
  const sanitize = (items: string[]) =>
    items.filter((item, index, list) => {
      const normalized = item.toLowerCase();
      return normalized !== selected && list.findIndex((entry) => entry.toLowerCase() === normalized) === index;
    });

  const cleanedPrimary = sanitize(primary);
  const cleanedSecondary = sanitize(secondary);
  const previousSignature = previousOptions.join("||");
  const primarySignature = cleanedPrimary.join("||");
  const selectedOptions = (primarySignature === previousSignature ? cleanedSecondary : cleanedPrimary).slice(0, 4);

  if (!requireLiveAgentOption) return selectedOptions;

  const hasLiveAgent = selectedOptions.some((option) => option.toLowerCase() === "connect live agent");
  if (hasLiveAgent) return selectedOptions;
  if (selectedOptions.length >= 4) return [...selectedOptions.slice(0, 3), "Connect Live Agent"];
  return [...selectedOptions, "Connect Live Agent"];
}

export function getAssistantReply(
  input: string,
  context: { orders: SupportOrder[]; selectedOrderId: string | null; greetingCount: number }
): AssistantReply {
  const intent = getIntent(input);
  const faqMatch = matchFaq(input);

  if (intent === "greeting") {
    const replies = [
      "Hi. I can help with orders, payments, account access, or vendor issues. What do you want to resolve first?",
      "Hello. If you want, I can start by checking your recent order activity or account issues.",
      "Hey. Tell me what happened, and I will guide you step by step or connect you to a live agent.",
    ];
    return { text: replies[context.greetingCount % replies.length] };
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
        text: "I couldn't find any recent orders on this account yet. If you ordered without logging in, share the order reference and I'll still help.",
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
        text: "I can track orders, but I couldn't load any order on this account yet. Share your order reference so I can continue.",
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
      text: `I found your most recent order. ${buildOrderSummary(recent)} You can also send a specific reference if this isn't the one.`,
      selectedOrderId: recent.id,
    };
  }

  if (intent === "account") {
    return {
      text: "For account access, try password reset first. If Google sign-in fails, retry once. If it still fails, I can escalate to a human agent.",
      suggestEscalation: true,
    };
  }

  if (intent === "payment") {
    return {
      text: "Please share your order reference and the exact debit time. I'll prepare a billing check and move it to a live billing agent if needed.",
      suggestEscalation: true,
    };
  }

  if (intent === "bug") {
    return {
      text: "Thanks for flagging that bug. Share the page and what action triggered it. I'll create a report and can hand this to a live support specialist.",
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
    text: "I understand. Share your order reference or account email and tell me what happened. I'll suggest a direct fix first, then escalate if needed.",
  };
}

export function mapApiMessage(message: ApiSupportMessage): ChatMessage {
  const senderMap: Record<ApiSupportMessage["sender_type"], ChatSender> = {
    customer: "user",
    assistant: "assistant",
    agent: "agent",
    system: "system",
  };
  return {
    id: message.id,
    sender: senderMap[message.sender_type],
    text: message.message,
    at: message.created_at,
  };
}

/** Human-friendly clock time for a message row. */
export function formatClock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Day-divider label: Today / Yesterday / explicit date. */
export function formatDayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** Status → badge label + tailwind classes for the conversation list. */
export function ticketStatusBadge(status: ApiSupportTicket["status"]) {
  switch (status) {
    case "assigned":
      return { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    case "queued":
    case "open":
      return { label: "Queued", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
    case "resolved":
    case "closed":
      return { label: "Resolved", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
  }
}

export function isResolved(status: ApiSupportTicket["status"]) {
  return status === "resolved" || status === "closed";
}
