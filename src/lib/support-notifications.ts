import { createAdminClient } from "@/lib/supabase/admin";

type EmailPayload = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

type QueueAlertInput = {
  ticketId: string;
  issueSummary: string;
  queuedCount: number;
};

type AgentJoinedInput = {
  to: string;
  ticketId: string;
  agentName: string;
  openingReply: string;
};

type AgentReplyInput = {
  to: string;
  ticketId: string;
  replyText: string;
};

function supportAppUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SUPPORT_AI_APP_URL ??
    "http://localhost:3000"
  );
}

function getAgentAlertEmails() {
  return (process.env.SUPPORT_AGENT_ALERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

async function sendSupportEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM;

  if (!payload.to.length) return false;

  if (!apiKey || !from) {
    console.info("Support email skipped (missing RESEND_API_KEY or SUPPORT_EMAIL_FROM)", {
      to: payload.to,
      subject: payload.subject,
    });
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error("Support email send failed", response.status, raw.slice(0, 300));
      return false;
    }

    return true;
  } catch (error) {
    console.error("Support email send error", error);
    return false;
  }
}

export async function lookupUserEmailById(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) {
      console.error("lookupUserEmailById failed", error.message);
      return null;
    }

    return data.user?.email ?? null;
  } catch (error) {
    console.error("lookupUserEmailById threw", error);
    return null;
  }
}

export async function notifyAgentsOfQueuedTicket(input: QueueAlertInput) {
  const agentEmails = getAgentAlertEmails();
  if (!agentEmails.length) return false;

  const dashboardLink = `${supportAppUrl().replace(/\/$/, "")}/admin/support`;
  const shortId = input.ticketId.slice(0, 8).toUpperCase();

  return sendSupportEmail({
    to: agentEmails,
    subject: `New queued support ticket #${shortId}`,
    html: `<p>A new support ticket has entered the queue.</p>
<p><strong>Ticket:</strong> #${shortId}<br/>
<strong>Queued now:</strong> ${input.queuedCount}<br/>
<strong>Summary:</strong> ${input.issueSummary}</p>
<p><a href="${dashboardLink}">Open Support Agent Console</a></p>`,
    text: `A new support ticket has entered the queue.\nTicket: #${shortId}\nQueued now: ${input.queuedCount}\nSummary: ${input.issueSummary}\nOpen console: ${dashboardLink}`,
  });
}

export async function notifyCustomerAgentJoined(input: AgentJoinedInput) {
  const chatLink = `${supportAppUrl().replace(/\/$/, "")}/help?chat=1`;
  const shortId = input.ticketId.slice(0, 8).toUpperCase();

  return sendSupportEmail({
    to: [input.to],
    subject: `GreenPack Support: Agent joined ticket #${shortId}`,
    html: `<p>Your support ticket now has a live agent.</p>
<p><strong>Agent:</strong> ${input.agentName}<br/>
<strong>Ticket:</strong> #${shortId}</p>
<p><strong>Agent message:</strong> ${input.openingReply}</p>
<p>Please continue in your GreenPack support chat: <a href="${chatLink}">${chatLink}</a></p>`,
    text: `Your support ticket now has a live agent.\nAgent: ${input.agentName}\nTicket: #${shortId}\nAgent message: ${input.openingReply}\nContinue in chat: ${chatLink}`,
  });
}

export async function notifyCustomerAgentReply(input: AgentReplyInput) {
  const chatLink = `${supportAppUrl().replace(/\/$/, "")}/help?chat=1`;
  const shortId = input.ticketId.slice(0, 8).toUpperCase();

  return sendSupportEmail({
    to: [input.to],
    subject: `GreenPack Support: New reply on ticket #${shortId}`,
    html: `<p>You received a new agent reply on your support ticket.</p>
<p><strong>Ticket:</strong> #${shortId}<br/>
<strong>Reply:</strong> ${input.replyText}</p>
<p>Open GreenPack support chat to continue: <a href="${chatLink}">${chatLink}</a></p>`,
    text: `You received a new agent reply on your support ticket.\nTicket: #${shortId}\nReply: ${input.replyText}\nContinue in chat: ${chatLink}`,
  });
}