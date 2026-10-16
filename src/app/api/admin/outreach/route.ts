import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendTransactionalEmail, transactionalEmailConfigured, emailContactHtml, emailContactText } from "@/lib/email";
import { EMAIL_LOGO_URL } from "@/lib/constants";
import { vendorUrl } from "@/lib/hosts";

// Vendor image outreach — the admin-facing half of the listing rule.
//
// A shop is displayable only with a thumbnail, a banner, and at least one
// gallery image (migration 021, `shops.images_complete`). The vendor is told
// this on /seller/dashboard and /seller/shop — but only if they come back. This
// endpoint is how an admin reaches the ones who did not.
//
// GET  — the unlisted shops, each with what it is missing and whether it has
//        already been emailed.
// POST — send: `mode: "test"` mails the calling admin a sample; `mode: "send"`
//        mails real vendors and records it in shop_image_outreach.

// Duplicated per admin route file by convention (see src/app/api/admin/vendors).
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

// ---------------------------------------------------------------------------
// Which pieces are missing — for the email copy only
// ---------------------------------------------------------------------------
// This describes a verdict that SQL already made; it is NOT a second
// implementation of the listing rule and must never become one. The list comes
// from `.eq("images_complete", false)` and nothing here can change it.
//
// It mirrors shopImagesComplete() in src/lib/utils.ts piece for piece, including
// the deliberate quirk that gallery counts array *length*, not non-blank
// entries: `[]` and `[""]` both read as missing. A helper that disagreed would
// reintroduce exactly the SQL/JS divergence migration 021 warns about.

type MissingPiece = "thumbnail" | "banner" | "gallery";

function missingPieces(images: unknown): MissingPiece[] {
  const img = (images ?? {}) as { thumbnail?: unknown; banner?: unknown; gallery?: unknown };
  const missing: MissingPiece[] = [];

  if (!(typeof img.thumbnail === "string" && img.thumbnail.trim())) missing.push("thumbnail");
  if (!(typeof img.banner === "string" && img.banner.trim())) missing.push("banner");
  if (!(Array.isArray(img.gallery) && img.gallery.length >= 1)) missing.push("gallery");

  return missing;
}

// ---------------------------------------------------------------------------
// The email
// ---------------------------------------------------------------------------
// Built on the template in src/app/api/verify/send-email/route.ts, with the
// same inline-styled wrapper, logo, palette, and plain-text fallback.

const ALL_PIECES: MissingPiece[] = ["thumbnail", "banner", "gallery"];

const PIECE_COPY: Record<MissingPiece, string> = {
  thumbnail: "A thumbnail — the small picture customers see on listing cards",
  banner: "A banner — the wide picture at the top of your shop page",
  gallery: "At least one gallery image — the extra pictures under your shop photos",
};

const SHOP_EDITOR_URL = vendorUrl("/login?mode=vendor&redirect=/shop");
const GEMINI_URL = "https://gemini.google.com/app";
const FLOW_URL = "https://labs.google/fx/tools/flow";

const ROUTE_BUTTON =
  "display: inline-block; padding: 12px 20px; border-radius: 10px; background: #22c55e; color: #ffffff; text-decoration: none; font-weight: bold;";

/** Vendor-supplied shop names go into HTML — escape rather than trust. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOutreachEmail(shopName: string, missing: MissingPiece[]) {
  const name = escapeHtml(shopName);

  // Guard 2: if the description came out empty while SQL still calls the shop
  // incomplete, fall back to the generic checklist rather than printing an empty
  // list. Drift degrades the copy; it never changes who receives an email.
  const specific = missing.length > 0;
  const pieces = specific ? missing : ALL_PIECES;
  const listHeading = specific
    ? "Still needed:"
    : "Your shop needs all three of these to be listed:";

  const listItems = pieces
    .map((piece) => `<li style="margin-bottom: 6px;">${PIECE_COPY[piece]}</li>`)
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${EMAIL_LOGO_URL}" alt="Green Pack Delight" width="64" height="64" style="width: 64px; height: 64px; border-radius: 12px; display: inline-block;" />
        <h1 style="color: #22c55e; font-size: 22px; margin: 12px 0 0;">Green Pack Delight</h1>
      </div>

      <h2 style="color: #111; font-size: 20px; text-align: center;">${name} isn't listed on GreenPack yet</h2>

      <p style="color: #666;">Everything you've saved is safe. But customers can't find ${name} in browse, search, or your category until your shop has a thumbnail, a banner, and at least one gallery image.</p>

      <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="color: #111; font-weight: bold; margin: 0 0 12px;">${listHeading}</p>
        <ul style="color: #666; margin: 0; padding-left: 20px;">${listItems}</ul>
      </div>

      <p style="color: #111; font-weight: bold; margin-bottom: 4px;">How to add them</p>
      <ol style="color: #666; margin-top: 0; padding-left: 20px;">
        <li style="margin-bottom: 6px;">Open your dashboard and go to <strong>Shop</strong>.</li>
        <li style="margin-bottom: 6px;">Upload the pictures above and save.</li>
        <li>Your shop appears in browse, search, and your category straight away.</li>
      </ol>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${SHOP_EDITOR_URL}" style="${ROUTE_BUTTON}">Open my shop editor</a>
      </div>

      <p style="color: #111; font-weight: bold; margin-bottom: 4px;">No pictures yet? Make them free</p>
      <p style="color: #666; margin-top: 0;">You don't need a photographer. Either of these turns a written description into a picture:</p>

      <div style="text-align: center; margin: 16px 0;">
        <a href="${GEMINI_URL}" style="${ROUTE_BUTTON}">Open Gemini</a>
        <a href="${FLOW_URL}" style="${ROUTE_BUTTON} margin-left: 8px;">Open Flow</a>
      </div>

      <p style="color: #666; font-size: 13px;"><strong>Gemini:</strong> start your prompt with "Create an image of ..." — asked plainly, it replies with text instead of a picture.</p>
      <p style="color: #666; font-size: 13px;"><strong>Flow:</strong> hard as it tries, Flow starts on <em>video</em>. Switch it to image with the model-name button <strong>inside</strong> the prompt box — that is the step everyone misses.</p>

      <p style="color: #999; font-size: 13px;">You are receiving this because ${name} is registered on Green Pack Delight with this email address.</p>
${emailContactHtml()}
    </div>
  `;

  const text = [
    "Green Pack Delight",
    "",
    `${shopName} isn't listed on GreenPack yet.`,
    "",
    `Everything you've saved is safe. But customers can't find ${shopName} in browse, search, or your category until your shop has a thumbnail, a banner, and at least one gallery image.`,
    "",
    listHeading,
    ...pieces.map((piece) => `- ${PIECE_COPY[piece]}`),
    "",
    "How to add them:",
    "1. Open your dashboard and go to Shop.",
    "2. Upload the pictures above and save.",
    "3. Your shop appears in browse, search, and your category straight away.",
    "",
    `Open your shop editor: ${SHOP_EDITOR_URL}`,
    "",
    "No pictures yet? Make them free:",
    `- Gemini: ${GEMINI_URL}`,
    '  Start your prompt with "Create an image of ..." or it replies with text.',
    `- Flow: ${FLOW_URL}`,
    "  Flow starts on video — switch it to image with the model-name button inside the prompt box.",
    "",
    ...emailContactText(),
  ].join("\n");

  return { subject: `${shopName} isn't listed on GreenPack yet`, html, text };
}

// ---------------------------------------------------------------------------
// GET — the queue
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const admin = createAdminClient();

    // SQL decides who is unlisted. This is the only place the list is derived:
    // nothing downstream re-computes the rule in JavaScript.
    const { data: shopRows, error: shopsError } = await admin
      .from("shops")
      .select("id, name, slug, owner_id, images, created_at")
      .eq("images_complete", false)
      .order("created_at", { ascending: false });

    if (shopsError) throw shopsError;

    const shops = shopRows ?? [];

    // Early return so the follow-up `in()` queries never run with an empty array.
    if (shops.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          shops: [],
          counts: { unlisted: 0, neverEmailed: 0, emailed: 0 },
          emailConfigured: transactionalEmailConfigured(),
        },
      });
    }

    const ownerIds = Array.from(
      new Set(
        shops
          .map((shop) => shop.owner_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const shopIds = shops.map((shop) => shop.id);

    // One batched round trip each, joined in memory — the vendors route's shape.
    const [profilesResult, outreachResult] = await Promise.all([
      admin.from("profiles").select("id, full_name, email").in("id", ownerIds),
      admin
        .from("shop_image_outreach")
        .select("shop_id, to_email, sent_at")
        .in("shop_id", shopIds)
        .order("sent_at", { ascending: false }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (outreachResult.error) throw outreachResult.error;

    const profileById = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));

    // The ledger read is newest-first, so the first row seen per shop is the
    // latest send and the total count is a plain tally.
    const latestByShop = new Map<string, { to_email: string; sent_at: string }>();
    const countByShop = new Map<string, number>();
    for (const row of outreachResult.data ?? []) {
      countByShop.set(row.shop_id, (countByShop.get(row.shop_id) ?? 0) + 1);
      if (!latestByShop.has(row.shop_id)) latestByShop.set(row.shop_id, row);
    }

    const data = shops.map((shop) => {
      const profile = profileById.get(shop.owner_id) ?? null;
      const latest = latestByShop.get(shop.id) ?? null;
      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        ownerName: profile?.full_name ?? null,
        // A shop with no address stays in the list and is shown as unreachable —
        // never silently dropped, or the count would quietly disagree with the queue.
        email: profile?.email ?? null,
        missing: missingPieces(shop.images),
        lastEmailedAt: latest?.sent_at ?? null,
        lastEmailedTo: latest?.to_email ?? null,
        emailCount: countByShop.get(shop.id) ?? 0,
      };
    });

    const neverEmailed = data.filter((shop) => shop.emailCount === 0).length;

    return NextResponse.json({
      success: true,
      data: {
        shops: data,
        counts: {
          unlisted: data.length,
          neverEmailed,
          emailed: data.length - neverEmailed,
        },
        // So the page can disable the send buttons with a reason instead of
        // offering a control that can only 503.
        emailConfigured: transactionalEmailConfigured(),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/outreach", err);
    return NextResponse.json(
      { success: false, error: "Failed to load the outreach queue" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — the send
// ---------------------------------------------------------------------------

const OutreachSchema = z.object({
  mode: z.enum(["test", "send"]),
  shopIds: z.array(z.string().uuid()).max(20).optional(),
  shopId: z.string().uuid().optional(), // test only: which shop to use as the sample
});

const SHOP_COLUMNS = "id, name, slug, owner_id, images, images_complete";

export async function POST(request: Request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = OutreachSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

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

    if (!(await rateLimit(`admin-outreach:${access.userId}`, 20, 3600))) {
      return tooManyRequests("Too many outreach sends in this hour. Wait a little and try again.");
    }

    const admin = createAdminClient();

    // -----------------------------------------------------------------------
    // Test — one sample, to the admin themselves, nothing recorded
    // -----------------------------------------------------------------------
    if (parsed.data.mode === "test") {
      const sampleQuery = parsed.data.shopId
        ? admin.from("shops").select(SHOP_COLUMNS).eq("id", parsed.data.shopId).maybeSingle()
        : admin
            .from("shops")
            .select(SHOP_COLUMNS)
            .eq("images_complete", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      const { data: sample, error: sampleError } = await sampleQuery;
      if (sampleError) throw sampleError;
      if (!sample) {
        return NextResponse.json(
          { success: false, error: "There is no unlisted shop to preview." },
          { status: 404 }
        );
      }
      if (sample.images_complete) {
        return NextResponse.json(
          { success: false, error: `"${sample.name}" is already listed, so it is not in the queue.` },
          { status: 400 }
        );
      }

      // The recipient is resolved server-side and is never a parameter: a
      // `testTo` field would turn an admin endpoint into an open relay. The
      // auth-user fallback is safe *here* only because an admin account has no
      // split identity — it is explicitly not a pattern for vendor addresses.
      const { data: adminProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", access.userId)
        .maybeSingle();

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const testTo = adminProfile?.email ?? user?.email ?? null;

      if (!testTo) {
        return NextResponse.json(
          { success: false, error: "Your admin account has no email address to send the test to." },
          { status: 400 }
        );
      }

      const message = buildOutreachEmail(sample.name, missingPieces(sample.images));
      const ok = await sendTransactionalEmail({ to: testTo, ...message });

      if (!ok) {
        return NextResponse.json(
          { success: false, error: "Could not deliver the test email." },
          { status: 502 }
        );
      }

      // Deliberately no ledger row: a test is not outreach, and writing one
      // would mark a real vendor as already emailed.
      return NextResponse.json({
        success: true,
        data: { mode: "test", to: testTo, shopId: sample.id, shopName: sample.name },
      });
    }

    // -----------------------------------------------------------------------
    // Send — real vendors, recorded on success only
    // -----------------------------------------------------------------------
    const requested = parsed.data.shopIds ?? [];
    if (requested.length === 0) {
      return NextResponse.json(
        { success: false, error: "Select at least one shop to email." },
        { status: 400 }
      );
    }

    const uniqueIds = Array.from(new Set(requested));

    const { data: shopRows, error: shopsError } = await admin
      .from("shops")
      .select(SHOP_COLUMNS)
      .in("id", uniqueIds);
    if (shopsError) throw shopsError;

    const shopById = new Map((shopRows ?? []).map((shop) => [shop.id, shop]));

    const ownerIds = Array.from(
      new Set(
        (shopRows ?? [])
          .map((shop) => shop.owner_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const { data: profileRows, error: profilesError } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);
    if (profilesError) throw profilesError;

    const emailByOwner = new Map(
      (profileRows ?? [])
        .filter((p) => typeof p.email === "string" && p.email.length > 0)
        .map((p) => [p.id, p.email as string])
    );

    type Skipped = { shopId: string; shopName: string; reason: string };
    const skipped: Skipped[] = [];
    const eligible: string[] = [];

    for (const id of uniqueIds) {
      const shop = shopById.get(id);
      if (!shop) {
        skipped.push({ shopId: id, shopName: "Unknown shop", reason: "Shop not found" });
        continue;
      }
      // Re-checked at send time, not trusted from the client: a vendor may have
      // finished their shop between the page load and the button press.
      if (shop.images_complete) {
        skipped.push({ shopId: id, shopName: shop.name, reason: "Already listed" });
        continue;
      }
      const email = emailByOwner.get(shop.owner_id);
      if (!email) {
        skipped.push({ shopId: id, shopName: shop.name, reason: "No address on file" });
        continue;
      }
      eligible.push(id);
    }

    type Sent = { shopId: string; shopName: string; to: string };
    type Failed = { shopId: string; shopName: string; error: string };
    const sent: Sent[] = [];
    const failed: Failed[] = [];

    // Chunks of five with allSettled: one bad address cannot abort the batch.
    const CHUNK = 5;
    for (let i = 0; i < eligible.length; i += CHUNK) {
      const chunk = eligible.slice(i, i + CHUNK);

      const results = await Promise.allSettled(
        chunk.map(async (id): Promise<Sent> => {
          const shop = shopById.get(id)!;
          const to = emailByOwner.get(shop.owner_id)!;

          const message = buildOutreachEmail(shop.name, missingPieces(shop.images));
          const ok = await sendTransactionalEmail({ to, ...message });
          if (!ok) throw new Error("The email service refused the message");

          const { error: ledgerError } = await admin.from("shop_image_outreach").insert({
            shop_id: shop.id,
            owner_id: typeof shop.owner_id === "string" ? shop.owner_id : null,
            to_email: to,
            sent_by: access.userId,
          });

          // The mail is already gone, so this is not a plain failure — saying
          // "failed" would invite a re-send that duplicates a delivered email.
          if (ledgerError) {
            throw new Error(
              `Delivered to ${to}, but the send history could not be recorded. Do not re-send without checking.`
            );
          }

          return { shopId: shop.id, shopName: shop.name, to };
        })
      );

      results.forEach((result, index) => {
        const id = chunk[index]!;
        const shop = shopById.get(id)!;
        if (result.status === "fulfilled") {
          sent.push(result.value);
        } else {
          failed.push({
            shopId: id,
            shopName: shop.name,
            error: result.reason instanceof Error ? result.reason.message : "Send failed",
          });
        }
      });
    }

    return NextResponse.json({ success: true, data: { sent, failed, skipped } });
  } catch (err) {
    console.error("POST /api/admin/outreach", err);
    return NextResponse.json(
      { success: false, error: "Failed to send the outreach email" },
      { status: 500 }
    );
  }
}
