import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "234" + cleaned.slice(1);
  }
  if (cleaned.startsWith("234")) return cleaned;
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);
    const supabase = createAdminClient();

    // Rate limit: max 3 OTPs per phone in last 5 minutes
    const { count } = await supabase
      .from("verification_otps")
      .select("*", { count: "exact", head: true })
      .eq("identifier", normalized)
      .eq("type", "phone")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (expires in 10 minutes)
    await supabase.from("verification_otps").insert({
      identifier: normalized,
      code,
      type: "phone",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    // Send SMS via Termii
    const termiiKey = process.env.TERMII_API_KEY;

    if (termiiKey && termiiKey !== "your_termii_api_key") {
      const res = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalized,
          from: "GreenPack",
          sms: `Your Green Pack Delight verification code is: ${code}. It expires in 10 minutes.`,
          type: "plain",
          api_key: termiiKey,
          channel: "generic",
        }),
      });
      if (!res.ok) {
        console.error("Termii SMS failed:", await res.text());
      }
    } else {
      // Dev mode: log OTP to console
      console.log(`\n📱 PHONE OTP for ${phone} (${normalized}): ${code}\n`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/verify/send-phone", err);
    return NextResponse.json(
      { success: false, error: "Failed to send verification SMS" },
      { status: 500 }
    );
  }
}
