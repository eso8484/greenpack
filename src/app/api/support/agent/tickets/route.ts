import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: Request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const limitParam = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 100);

    let query = admin
      .from("support_tickets")
      .select(
        "id, customer_id, order_id, status, channel, priority, issue_summary, assigned_agent_name, created_at, updated_at, resolved_at"
      )
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("issue_summary", `%${search}%`);
    }

    const { data: tickets, error: ticketError } = await query;
    if (ticketError) throw ticketError;

    const ticketList = tickets ?? [];
    if (ticketList.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const customerIds = Array.from(new Set(ticketList.map((ticket) => ticket.customer_id)));
    const ticketIds = ticketList.map((ticket) => ticket.id);

    const [{ data: profiles, error: profileError }, { data: recentMessages, error: messageError }] = await Promise.all([
      admin.from("profiles").select("id, full_name, phone").in("id", customerIds),
      admin
        .from("support_messages")
        .select("ticket_id, sender_type, message, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false }),
    ]);

    if (profileError) throw profileError;
    if (messageError) throw messageError;

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const latestMessageByTicket = new Map<string, { sender_type: string; message: string; created_at: string }>();

    for (const message of recentMessages ?? []) {
      if (!latestMessageByTicket.has(message.ticket_id)) {
        latestMessageByTicket.set(message.ticket_id, message);
      }
    }

    const data = ticketList.map((ticket) => {
      const profile = profileById.get(ticket.customer_id);
      const latestMessage = latestMessageByTicket.get(ticket.id);

      return {
        ...ticket,
        customer: {
          id: ticket.customer_id,
          full_name: profile?.full_name ?? null,
          phone: profile?.phone ?? null,
        },
        latest_message: latestMessage
          ? {
              sender_type: latestMessage.sender_type,
              message: latestMessage.message,
              created_at: latestMessage.created_at,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/support/agent/tickets", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent support tickets" },
      { status: 500 }
    );
  }
}
