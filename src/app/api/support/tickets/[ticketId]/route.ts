import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateSupportTicketSchema = z.object({
  action: z.enum(["resolve"]),
});

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
