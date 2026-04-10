"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type SupportStatus = "open" | "queued" | "assigned" | "resolved" | "closed";

type AgentTicket = {
  id: string;
  customer_id: string;
  order_id: string | null;
  status: SupportStatus;
  channel: "web_chat" | "whatsapp" | "email" | "phone";
  priority: "low" | "normal" | "high" | "urgent";
  issue_summary: string;
  assigned_agent_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  customer: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  latest_message: {
    sender_type: "customer" | "assistant" | "agent" | "system";
    message: string;
    created_at: string;
  } | null;
};

type AgentMessage = {
  id: string;
  ticket_id: string;
  sender_type: "customer" | "assistant" | "agent" | "system";
  sender_id: string | null;
  message: string;
  created_at: string;
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function statusClass(status: SupportStatus) {
  if (status === "assigned") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
  if (status === "resolved" || status === "closed") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (status === "queued" || status === "open") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketFilter, setTicketFilter] = useState<"all" | SupportStatus>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  const loadTickets = async (keepSelection = true) => {
    setLoadingTickets(true);
    try {
      const query = ticketFilter === "all" ? "" : `?status=${ticketFilter}`;
      const response = await fetch(`/api/support/agent/tickets${query}`, { credentials: "include" });
      const result = (await response.json()) as { success?: boolean; data?: AgentTicket[] };

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        setTickets([]);
        return;
      }

      setTickets(result.data);

      if (!keepSelection) {
        setSelectedTicketId(result.data[0]?.id ?? null);
        return;
      }

      if (!selectedTicketId) {
        setSelectedTicketId(result.data[0]?.id ?? null);
      } else if (!result.data.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId(result.data[0]?.id ?? null);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/support/agent/tickets/${ticketId}/messages`, {
        credentials: "include",
      });
      const result = (await response.json()) as { success?: boolean; data?: AgentMessage[] };

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        setMessages([]);
        return;
      }

      setMessages(result.data);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadTickets(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFilter]);

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedTicketId);
  }, [selectedTicketId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadTickets(true);
      if (selectedTicketId) {
        loadMessages(selectedTicketId);
      }
    }, 6000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId, ticketFilter]);

  const runTicketAction = async (action: "assign" | "resolve" | "reopen") => {
    if (!selectedTicketId) return;

    setBusyAction(action);
    try {
      const response = await fetch(`/api/support/agent/tickets/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          agent_name: "GreenPack Agent",
        }),
      });

      if (!response.ok) return;
      await loadTickets(true);
      await loadMessages(selectedTicketId);
    } finally {
      setBusyAction(null);
    }
  };

  const onSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;

    const text = messageInput.trim();
    if (!text) return;

    setBusyAction("send");
    try {
      const response = await fetch(`/api/support/agent/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, sender_type: "agent" }),
      });

      if (!response.ok) return;

      setMessageInput("");
      await loadTickets(true);
      await loadMessages(selectedTicketId);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Support Agent Console</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage live support queue, assign tickets, and reply to customers from one place.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {(["all", "queued", "assigned", "resolved"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setTicketFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  ticketFilter === status
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
                }`}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
            <button
              onClick={() => loadTickets(true)}
              className="ml-auto rounded-lg bg-white border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            <aside className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Tickets</p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {loadingTickets && (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading tickets...</p>
                )}

                {!loadingTickets && tickets.length === 0 && (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No tickets found.</p>
                )}

                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${
                      selectedTicketId === ticket.id ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        #{ticket.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {ticket.issue_summary}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {ticket.customer.full_name ?? "Unknown customer"}
                    </p>
                    {ticket.latest_message && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {ticket.latest_message.sender_type}: {ticket.latest_message.message}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              {!selectedTicket && (
                <div className="p-8 text-sm text-gray-500 dark:text-gray-400">Select a ticket to view details.</div>
              )}

              {selectedTicket && (
                <>
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Ticket #{selectedTicket.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {selectedTicket.channel}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {selectedTicket.priority}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{selectedTicket.issue_summary}</p>

                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 grid grid-cols-1 md:grid-cols-2 gap-1">
                      <p>Customer: {selectedTicket.customer.full_name ?? selectedTicket.customer.id}</p>
                      <p>Phone: {selectedTicket.customer.phone ?? "N/A"}</p>
                      <p>Created: {formatTime(selectedTicket.created_at)}</p>
                      <p>Updated: {formatTime(selectedTicket.updated_at)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => runTicketAction("assign")}
                        disabled={busyAction !== null}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold"
                      >
                        {busyAction === "assign" ? "Assigning..." : "Assign"}
                      </button>
                      <button
                        onClick={() => runTicketAction("resolve")}
                        disabled={busyAction !== null}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold"
                      >
                        {busyAction === "resolve" ? "Resolving..." : "Resolve"}
                      </button>
                      <button
                        onClick={() => runTicketAction("reopen")}
                        disabled={busyAction !== null}
                        className="rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold"
                      >
                        {busyAction === "reopen" ? "Reopening..." : "Reopen"}
                      </button>
                    </div>
                  </div>

                  <div className="h-[420px] overflow-y-auto bg-[#f7faf8] dark:bg-gray-900/70 px-4 py-3 space-y-2">
                    {loadingMessages && <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>}

                    {!loadingMessages && messages.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet for this ticket.</p>
                    )}

                    {messages.map((message) => {
                      const isAgent = message.sender_type === "agent";
                      const isSystem = message.sender_type === "system";

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[90%] rounded-xl px-3 py-2.5 ${
                            isSystem
                              ? "mx-auto bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900 text-center"
                              : isAgent
                              ? "ml-auto bg-green-600 text-white"
                              : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                          }`}
                        >
                          <p className="text-xs uppercase tracking-wide opacity-85 mb-1">{message.sender_type}</p>
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          <p className={`mt-1 text-[10px] ${isAgent ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={onSendMessage} className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="flex gap-2">
                      <input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Write an agent reply..."
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                      />
                      <button
                        type="submit"
                        disabled={busyAction !== null}
                        className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3.5 py-2 text-sm font-semibold"
                      >
                        {busyAction === "send" ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
