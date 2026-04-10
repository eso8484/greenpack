import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateSupportTicketSchema = z.object({
  action: z.enum(["assign_demo_agent", "agent_auto_reply", "resolve"]),
  user_message: z.string().max(4000).optional(),
});

function getAgentAutoReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("order") || text.includes("track") || text.includes("delivery")) {
    return "I am escalating this to our delivery desk now and I will send your next tracking update shortly.";
  }

  if (text.includes("payment") || text.includes("debit") || text.includes("charge")) {
    return "I have flagged this for a billing review. Please keep this chat open while I verify the payment trail.";
  }

  if (text.includes("bug") || text.includes("error") || text.includes("crash")) {
    return "Thank you for the report. I have logged this for engineering review and marked it as priority support.";
  }

  if (text.includes("thank")) {
    return "You are welcome. I am still monitoring this case and will keep you updated here.";
  }

  return "I have received that update and I am actively working on your case. I will respond shortly with the next action.";
}

async function getTicketForUser(supabase: Awaited<ReturnType<typeof createClient>>, ticketId: string, userId: string) {
  return supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("customer_id", userId)
    .single();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await getTicketForUser(supabase, ticketId, user.id);
    if (error || !data) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/support/tickets/[ticketId]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch support ticket" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateSupportTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await getTicketForUser(supabase, ticketId, user.id);
    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    if (parsed.data.action === "assign_demo_agent") {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          status: "assigned",
          assigned_agent_name: "Amina",
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select("*")
        .single();

      if (error) throw error;

      await supabase.from("support_messages").insert([
        {
          ticket_id: ticketId,
          sender_type: "system",
          message: "You are connected. Agent Amina joined the chat.",
        },
        {
          ticket_id: ticketId,
          sender_type: "agent",
          message: "Hi, I am Amina from GreenPack Support. I can see your chat history and I am taking this over now.",
        },
      ]);

      return NextResponse.json({ success: true, data });
    }

    if (parsed.data.action === "agent_auto_reply") {
      const reply = getAgentAutoReply(parsed.data.user_message ?? "");

      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_type: "agent",
          message: reply,
        })
        .select("*")
        .single();

      if (error) throw error;

      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return NextResponse.json({ success: true, data });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_type: "system",
      message: "This support ticket has been marked as resolved.",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/support/tickets/[ticketId]", err);
    return NextResponse.json({ success: false, error: "Failed to update support ticket" }, { status: 500 });
  }
}
