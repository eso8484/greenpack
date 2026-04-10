import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AgentTicketActionSchema = z.object({
  action: z.enum(["assign", "resolve", "reopen"]),
  agent_name: z.string().max(120).optional(),
  message: z.string().max(4000).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { ticketId } = await params;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/support/agent/tickets/[ticketId]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { ticketId } = await params;
    const body = await request.json();
    const parsed = AgentTicketActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("id, status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    if (parsed.data.action === "assign") {
      const assignedName = parsed.data.agent_name ?? "Live Agent";
      const { data, error } = await admin
        .from("support_tickets")
        .update({
          status: "assigned",
          assigned_agent_name: assignedName,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select("*")
        .single();

      if (error) throw error;

      await admin.from("support_messages").insert([
        {
          ticket_id: ticketId,
          sender_type: "system",
          message: `Agent ${assignedName} has been assigned to this case.`,
        },
        {
          ticket_id: ticketId,
          sender_type: "agent",
          message:
            parsed.data.message ??
            `Hi, I am ${assignedName}. I have reviewed your case and I am taking over this conversation now.`,
        },
      ]);

      return NextResponse.json({ success: true, data });
    }

    if (parsed.data.action === "resolve") {
      const { data, error } = await admin
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

      await admin.from("support_messages").insert({
        ticket_id: ticketId,
        sender_type: "system",
        message: parsed.data.message ?? "This support case has been marked as resolved.",
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
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) throw error;

    await admin.from("support_messages").insert({
      ticket_id: ticketId,
      sender_type: "system",
      message: parsed.data.message ?? "This support case has been reopened and moved back to queue.",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/support/agent/tickets/[ticketId]", err);
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 });
  }
}
