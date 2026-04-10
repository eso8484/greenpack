import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateSupportMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  sender_type: z.enum(["customer", "assistant", "system"]).default("customer"),
});

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

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("customer_id", user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/support/tickets/[ticketId]/messages", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch support messages" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = CreateSupportMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("customer_id", user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: parsed.data.sender_type,
        sender_id: user.id,
        message: parsed.data.message,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/support/tickets/[ticketId]/messages", err);
    return NextResponse.json(
      { success: false, error: "Failed to create support message" },
      { status: 500 }
    );
  }
}
