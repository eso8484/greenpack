import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve the SMTP host to an IPv4 address. Setting `dns.setDefaultResultOrder`
 * is unreliable across multi-record providers (Gmail rotates between several
 * IPv6/IPv4 addresses and Node sometimes still picks the AAAA result first),
 * so we explicitly grab an A record and pass the IPv4 string to nodemailer,
 * keeping the original hostname for TLS SNI.
 *
 * Cached per process — the first call resolves, subsequent calls reuse.
 */
let cachedSmtpIpv4: string | null = null;
async function resolveSmtpIpv4(host: string): Promise<string> {
  if (cachedSmtpIpv4) return cachedSmtpIpv4;
  const addresses = await dns.resolve4(host);
  if (!addresses.length) throw new Error(`No IPv4 address for ${host}`);
  cachedSmtpIpv4 = addresses[0];
  return cachedSmtpIpv4;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Rate limit: max 3 OTPs per email in last 5 minutes
    const { count } = await supabase
      .from("verification_otps")
      .select("*", { count: "exact", head: true })
      .eq("identifier", email.toLowerCase())
      .eq("type", "email")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    const smtpConfigured =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;

    // Fail loudly when email transport is not configured.
    if (!smtpConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email delivery is not configured yet. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, and SMTP_FROM in .env.local.",
        },
        { status: 503 }
      );
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (expires in 10 minutes)
    await supabase.from("verification_otps").insert({
      identifier: email.toLowerCase(),
      code,
      type: "email",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    if (smtpConfigured) {
      // Use Nodemailer if SMTP is configured
      const nodemailer = await import("nodemailer");
      const smtpHost = process.env.SMTP_HOST!;
      const smtpIpv4 = await resolveSmtpIpv4(smtpHost);
      const transporter = nodemailer.createTransport({
        host: smtpIpv4,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        // Keep the original hostname for TLS Server Name Indication so
        // Gmail's cert chain still validates against smtp.gmail.com.
        tls: { servername: smtpHost },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Green Pack Delight" <${process.env.SMTP_FROM || "noreply@greenpackdelight.com"}>`,
        to: email,
        subject: "Verify your email - Green Pack Delight",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #22c55e; font-size: 24px; margin: 0;">Green Pack Delight</h1>
            </div>
            <h2 style="color: #111; font-size: 20px; text-align: center;">Verify your email</h2>
            <p style="color: #666; text-align: center;">Enter this code to complete your signup:</p>
            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/verify/send-email", err);
    return NextResponse.json(
      { success: false, error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
