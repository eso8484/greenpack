import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAgentsOfQueuedTicket } from "@/lib/support-notifications";

const UpdateSupportTicketSchema = z.object({
  action: z.enum(["resolve", "escalate"]),
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

    // ── Escalate: customer explicitly requests a live agent ──────────────
    if (parsed.data.action === "escalate") {
      // Already with/awaiting an agent — nothing to do.
      if (ticket.status === "assigned" || ticket.status === "queued") {
        return NextResponse.json({ success: true, data: ticket });
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .update({ status: "queued", updated_at: new Date().toISOString() })
        .eq("id", ticketId)
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("support_messages").insert({
        ticket_id: ticketId,
        sender_type: "system",
        message: "You've been placed in the live-agent queue. An agent will join this conversation shortly.",
      });

      // Fire-and-forget queue side effects (count + agent notification). Never
      // fail the escalation because of email/counting problems.
      try {
        const admin = createAdminClient();
        const thresholdRaw = Number(process.env.SUPPORT_QUEUE_DELAY_THRESHOLD ?? "5");
        const queueDelayThreshold = Number.isNaN(thresholdRaw) ? 5 : Math.max(1, thresholdRaw);
        const { count: queuedCount } = await admin
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["queued", "open"]);
        const currentQueued = queuedCount ?? 0;
        if (currentQueued >= queueDelayThreshold) {
          await supabase.from("support_messages").insert({
            ticket_id: ticketId,
            sender_type: "system",
            message: `High support demand right now (${currentQueued} in queue), so a reply may take a little longer. A live agent will respond as soon as one is free.`,
          });
        }
        await notifyAgentsOfQueuedTicket({
          ticketId,
          issueSummary: ticket.issue_summary,
          queuedCount: currentQueued,
        });
      } catch (sideEffectError) {
        console.error("PATCH escalate side-effect error", sideEffectError);
      }

      return NextResponse.json({ success: true, data });
    }

    // ── Resolve ──────────────────────────────────────────────────────────
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
