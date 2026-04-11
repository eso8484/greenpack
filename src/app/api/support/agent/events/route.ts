import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const AgentEventSchema = z.object({
  action: z.enum(["assign", "reply", "resolve", "reopen"]),
  ticket_id: z.string().uuid(),
  message: z.string().max(4000).optional(),
  agent_name: z.string().max(120).optional(),
});

function isAuthorized(request: Request) {
  const incoming = request.headers.get("x-support-agent-key");
  const configured = process.env.SUPPORT_AGENT_API_KEY;

  if (!configured) return false;
  if (!incoming) return false;

  return incoming === configured;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = AgentEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, ticket_id, message, agent_name } = parsed.data;
    const admin = createAdminClient();

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    if (action === "assign") {
      const assignedName = agent_name ?? "Live Agent";

      const { data, error } = await admin
        .from("support_tickets")
        .update({
          status: "assigned",
          assigned_agent_name: assignedName,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id)
        .select("*")
        .single();

      if (error) throw error;

      await admin.from("support_messages").insert([
        {
          ticket_id,
          sender_type: "system",
          message: `You are connected. Agent ${assignedName} joined the chat.`,
        },
        {
          ticket_id,
          sender_type: "agent",
          message:
            message ??
            `Hi, I am ${assignedName} from GreenPack Support. I can see the chat history and I am taking this case now.`,
        },
      ]);

      return NextResponse.json({ success: true, data });
    }

    if (action === "reply") {
      if (!message) {
        return NextResponse.json(
          { success: false, error: "message is required for reply action" },
          { status: 400 }
        );
      }

      const { data, error } = await admin
        .from("support_messages")
        .insert({
          ticket_id,
          sender_type: "agent",
          message,
        })
        .select("*")
        .single();

      if (error) throw error;

      await admin
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticket_id);

      return NextResponse.json({ success: true, data });
    }

    if (action === "resolve") {
      const { data, error } = await admin
        .from("support_tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id)
        .select("*")
        .single();

      if (error) throw error;

      await admin.from("support_messages").insert({
        ticket_id,
        sender_type: "system",
        message: message ?? "Your issue was marked as resolved by support.",
      });

      return NextResponse.json({ success: true, data });
    }

    const { data, error } = await admin
      .from("support_tickets")
      .update({
        status: "queued",
        resolved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id)
      .select("*")
      .single();

    if (error) throw error;

    await admin.from("support_messages").insert({
      ticket_id,
      sender_type: "system",
      message: message ?? "This ticket has been reopened and queued for support.",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/support/agent/events", err);
    return NextResponse.json(
      { success: false, error: "Failed to process agent event" },
      { status: 500 }
    );
  }
}
