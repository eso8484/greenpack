import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateSupportTicketSchema = z.object({
  issue_summary: z.string().min(3).max(1000),
  order_id: z.string().uuid().optional(),
  channel: z.enum(["web_chat", "whatsapp", "email", "phone"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  first_message: z.string().min(1).max(4000).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("support_tickets")
      .select("*")
      .eq("customer_id", user.id)
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/support/tickets", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateSupportTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { first_message, ...ticketInput } = parsed.data;

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        customer_id: user.id,
        ...ticketInput,
        status: "queued",
      })
      .select("*")
      .single();

    if (ticketError) throw ticketError;

    if (first_message) {
      const { error: messageError } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_type: "customer",
        sender_id: user.id,
        message: first_message,
      });

      if (messageError) throw messageError;
    }

    const { error: systemMessageError } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_type: "system",
      message: "Ticket created and queued for live support.",
    });

    if (systemMessageError) throw systemMessageError;

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (err) {
    console.error("POST /api/support/tickets", err);
    return NextResponse.json(
      { success: false, error: "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
