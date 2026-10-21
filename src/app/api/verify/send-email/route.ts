import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNumericOtp } from "@/lib/security";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import {
  sendTransactionalEmail,
  transactionalEmailConfigured,
  emailContactHtml,
  emailContactText,
} from "@/lib/email";
import { EMAIL_LOGO_URL } from "@/lib/constants";
import {
  checkRegistrationEmail,
  type RegistrationRole,
} from "@/lib/account-identity";

const ROLES: RegistrationRole[] = ["customer", "vendor", "courier"];

/**
 * Step 1 of email-verified registration — all four forms POST here before the
 * OTP input appears (customer `/register`, `/signup`, `/vendor/register`,
 * `/courier/register`, submit and resend each).
 *
 * The existence check runs **here**, ahead of the code, and it is scoped to the
 * lane being applied for. Two consequences, both intended:
 *
 *   - A conflict is reported on the form, before anything is emailed. Asking
 *     the person to fetch a code and type it, only to refuse them afterwards,
 *     spends their time and our mail quota to answer a question we could have
 *     answered immediately.
 *   - A customer account is **not** a conflict on the courier or vendor lane.
 *     Those are separate lanes (see src/lib/account-identity.ts); refusing an
 *     existing customer is the bug this endpoint used to have.
 *
 * Note this is an enumeration oracle by construction — the caller learns that
 * an address is taken *in that lane*. That is the requested behaviour; it is
 * kept as narrow as it can be (role-scoped answers, a generic refusal for
 * admins) and both rate limiters below still apply.
 *
 * The vendor lane may also send the shop `slug`, checked here for the same
 * reason: a taken shop URL is a form-field conflict, and `/api/vendor/register`
 * can only report it after the code has been fetched and typed.
 */
export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`send-email:${clientIp(request)}`, 8, 3600))) {
      return tooManyRequests();
    }
    const body = (await request.json()) as {
      email?: unknown;
      role?: unknown;
      slug?: unknown;
    };
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Absent or unrecognised → the customer lane, which is what every caller
    // predating this field was. The lane only ever narrows the check; it never
    // widens who may register.
    const role: RegistrationRole = ROLES.includes(body.role as RegistrationRole)
      ? (body.role as RegistrationRole)
      : "customer";

    // ─── The pre-OTP gate ───────────────────────────────────────────────────
    const supabase = createAdminClient();

    const check = await checkRegistrationEmail(normalizedEmail, role);
    if (!check.ok) {
      return NextResponse.json(
        { success: false, error: check.error },
        { status: check.status }
      );
    }

    // ─── The vendor shop URL, checked here too ──────────────────────────────
    // /api/vendor/register refuses a duplicate slug in step 3 — ahead of
    // consuming the OTP, deliberately — but by then the person has already
    // fetched a code and typed it. The slug is part of the form they filled in,
    // so this is the same question, answerable at the same moment as the email.
    // Only the vendor lane sends one; absent means "nothing to check", which is
    // what every caller predating this field is.
    if (role === "vendor" && typeof body.slug === "string" && body.slug.trim()) {
      const slug = body.slug.trim();
      const { data: slugOwner, error: slugError } = await supabase
        .from("shops")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      // A failed read is not evidence the slug is free — refuse rather than
      // send a code for a registration that will be rejected on submit.
      if (slugError) {
        console.error("POST /api/verify/send-email — slug lookup failed:", slugError);
        return NextResponse.json(
          { success: false, error: "We couldn't check this email just now. Please try again in a moment." },
          { status: 500 }
        );
      }
      if (slugOwner) {
        return NextResponse.json(
          { success: false, error: "That shop URL is taken — pick a different slug." },
          { status: 409 }
        );
      }
    }

    // Rate limit: max 3 OTPs per email in last 5 minutes
    const { count } = await supabase
      .from("verification_otps")
      .select("*", { count: "exact", head: true })
      .eq("identifier", normalizedEmail)
      .eq("type", "email")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    // Fail loudly when email transport is not configured.
    if (!transactionalEmailConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email delivery is not configured. Set RESEND_API_KEY (preferred) or SMTP_HOST/USER/PASS in .env.local.",
        },
        { status: 503 }
      );
    }

    // Generate 6-digit OTP (cryptographically secure)
    const code = generateNumericOtp(6);

    // Check the insert result. Dropping it means a CHECK-constraint failure on
    // `type` looks like success: the person receives a code that was never
    // stored, then sees "Invalid or expired verification code" for a code that
    // is correct. This is the same bite email-otp/start already grew a check
    // for — keep the two in step.
    const { error: insertError } = await supabase
      .from("verification_otps")
      .insert({
        identifier: normalizedEmail,
        code,
        type: "email",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    if (insertError) {
      console.error("POST /api/verify/send-email — OTP insert failed:", insertError);
      return NextResponse.json(
        { success: false, error: "Could not send a verification code — please try again." },
        { status: 500 }
      );
    }

    const ok = await sendTransactionalEmail({
      to: normalizedEmail,
      subject: "Verify your email - Green Pack Delight",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${EMAIL_LOGO_URL}" alt="Green Pack Delight" width="64" height="64" style="width: 64px; height: 64px; border-radius: 12px; display: inline-block;" />
            <h1 style="color: #22c55e; font-size: 22px; margin: 12px 0 0;">Green Pack Delight</h1>
          </div>
          <h2 style="color: #111; font-size: 20px; text-align: center;">Verify your email</h2>
          <p style="color: #666; text-align: center;">Enter this code to complete your signup:</p>
          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">This code expires in 10 minutes. Do not share it with anyone.</p>
${emailContactHtml()}
        </div>
      `,
      text: [
        `Your Green Pack Delight verification code: ${code}`,
        "",
        "This code expires in 10 minutes.",
        "",
        ...emailContactText(),
      ].join("\n"),
    });

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Could not deliver the verification email." },
        { status: 502 }
      );
    }

    // `existingAccount` lets a page say what will happen *before* the code is
    // typed — on the courier lane, that the application will be added to an
    // account this address already has, rather than a password being created.
    return NextResponse.json({
      success: true,
      existingAccount: check.existingAccount,
    });
  } catch (err) {
    console.error("POST /api/verify/send-email", err);
    return NextResponse.json(
      { success: false, error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
