import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

const RequestSchema = z.object({
  email: z.string().email(),
});

const RESET_FROM = "Green Pack Delight <no-reply@greenpackdelight.com>";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function buildEmail(actionLink: string) {
  const subject = "Reset your Green Pack Delight password";
  const text = [
    "You asked to reset the password for your Green Pack Delight account.",
    "",
    "Click the link below to choose a new password:",
    actionLink,
    "",
    "This link expires in 1 hour and can be used once. If you didn't request it, you can ignore this email — your password stays unchanged.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8f7;font-family:Inter,Arial,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;padding:32px 0">
      <tr><td align="center">
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:24px 28px">
            <span style="color:#ffffff;font-size:18px;font-weight:700">Green Pack Delight</span>
          </td></tr>
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 8px;font-size:20px;color:#111827">Reset your password</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
            <a href="${actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">
              Reset my password
            </a>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9ca3af">
              This link expires in 1 hour and can only be used once. If you didn't request it, you can safely ignore this email — your password stays unchanged.
            </p>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af">
            Green Pack Delight · Nigeria
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/**
 * POST /api/auth/reset/request  { email }
 *
 * Custom "forgot password" that replaces Supabase's default reset email. We
 * generate a recovery action link via the admin API (Supabase does NOT send an
 * email), then deliver our own branded email from no-reply@greenpackdelight.com
 * via Resend. Clicking the link opens /reset-password, where the user sets a
 * new password and then signs in with it.
 *
 * Always returns success (even for unknown emails) so the endpoint can't be
 * used to enumerate accounts.
 */
export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`reset-request:${clientIp(request)}`, 5, 300))) {
      return tooManyRequests();
    }

    const body = await request.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const admin = createAdminClient();
    const redirectTo = `${siteUrl()}/reset-password`;

    // generateLink returns the action link WITHOUT sending an email. For an
    // unknown email it errors; we swallow that and still return success so the
    // response is identical for existing and non-existing accounts.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (!error && actionLink) {
      await sendTransactionalEmail({
        to: email,
        from: RESET_FROM,
        ...buildEmail(actionLink),
      });
    } else if (error) {
      // Log server-side but never reveal to the caller.
      console.warn("reset request generateLink:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link is on its way.",
    });
  } catch (err) {
    console.error("POST /api/auth/reset/request", err);
    // Still return success shape to avoid leaking internal errors / existence.
    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link is on its way.",
    });
  }
}
