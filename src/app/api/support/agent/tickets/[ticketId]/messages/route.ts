import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateAgentMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  sender_type: z.enum(["agent", "system"]).default("agent"),
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

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/support/agent/tickets/[ticketId]/messages", err);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { ticketId } = await params;
    const body = await request.json();
    const parsed = CreateAgentMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: parsed.data.sender_type,
        message: parsed.data.message,
      })
      .select("*")
      .single();

    if (error) throw error;

    await admin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/support/agent/tickets/[ticketId]/messages", err);
    return NextResponse.json({ success: false, error: "Failed to create message" }, { status: 500 });
  }
}
