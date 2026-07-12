/**
 * Unified transactional email helper.
 *
 * Prefers Resend API (using the verified custom domain) so emails come from
 * your professional address — e.g. `Green Pack Delight <noreply@greenpackdelight.com>`.
 * Falls back to Gmail SMTP if Resend is not configured.
 *
 * Configure via:
 *   RESEND_API_KEY         — Resend API key
 *   EMAIL_FROM             — From address, e.g. `Green Pack Delight <noreply@greenpackdelight.com>`
 *                           (falls back to SUPPORT_EMAIL_FROM, then SMTP_FROM)
 *   SMTP_HOST/USER/PASS    — Optional fallback if Resend is unset
 */

import { Resolver } from "node:dns/promises";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional sender override (e.g. a no-reply address for auth emails). */
  from?: string;
};

function resolvedFrom(override?: string): string {
  return (
    override ||
    process.env.EMAIL_FROM ||
    process.env.SUPPORT_EMAIL_FROM ||
    `Green Pack Delight <noreply@greenpackdelight.com>`
  );
}

async function sendViaResend(input: SendInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolvedFrom(input.from),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error(
        "[email] Resend send failed",
        response.status,
        raw.slice(0, 300)
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Resend threw", error);
    return false;
  }
}

async function resolveSmtpIpv4(host: string): Promise<string> {
  // WSL/IPv6 environments sometimes hang on getaddrinfo; pin to A record.
  try {
    const resolver = new Resolver();
    resolver.setServers(["1.1.1.1", "8.8.8.8"]);
    const addrs = await resolver.resolve4(host);
    return addrs[0] ?? host;
  } catch {
    return host;
  }
}

async function sendViaSmtp(input: SendInput): Promise<boolean> {
  const smtpConfigured =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;
  if (!smtpConfigured) return false;

  try {
    const nodemailer = await import("nodemailer");
    const smtpHost = process.env.SMTP_HOST!;
    const smtpIpv4 = await resolveSmtpIpv4(smtpHost);
    const transporter = nodemailer.createTransport({
      host: smtpIpv4,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      tls: { servername: smtpHost },
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: resolvedFrom(input.from),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (error) {
    console.error("[email] SMTP send failed", error);
    return false;
  }
}

/**
 * Send a transactional email. Returns true if delivery succeeded.
 *
 * Routing: Resend (preferred) → SMTP fallback → return false if neither configured.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<boolean> {
  const okResend = await sendViaResend(input);
  if (okResend) return true;

  const okSmtp = await sendViaSmtp(input);
  if (okSmtp) return true;

  console.error(
    "[email] Neither Resend nor SMTP is configured; cannot send email",
    { to: input.to, subject: input.subject }
  );
  return false;
}

export function transactionalEmailConfigured(): boolean {
  return (
    !!process.env.RESEND_API_KEY ||
    (!!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS)
  );
}
