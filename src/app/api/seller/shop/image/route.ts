/**
 * AI shop-image generation for the shop editor.
 *
 * ⚠ CURRENTLY UNREFERENCED — nothing in the UI calls this route.
 *
 * The client half was removed on 2026-10-09 (see `MakeImageWithGoogle.tsx`, which is
 * what `AiImageButton.tsx` became). The reason was not that the route is broken but
 * that it cannot succeed on a $0 provider balance: `imageConfig()` checks
 * *configuration*, never the account balance, so a key that is present but unfunded
 * passes the check and the button appears — and the first real generation returns
 * `402 "Insufficient credits"`. Verification on 2026-10-09 confirmed there is no free
 * image tier on OpenRouter to fall back to: only 2 of the 61 image models listed are
 * all-zero-priced, both in the `ming-image` family, and that family carries **no
 * `:free` suffix** — so it is a regular paid endpoint whose listed price happens to be
 * zero, and a non-`:free` endpoint requires a funded account whatever it lists.
 *
 * The route is kept rather than deleted because it is complete, correct, and the
 * cheapest thing to restore: funding the account (or wiring a Google Developer Program
 * Cloud credit) brings it back with a client-side re-mount and no server work. It was
 * deliberately not removed on the grounds that the request was to remove the vendor-facing
 * *option*, not the capability.
 *
 * Before restoring it in the UI, note that Google's own image API is **not** a drop-in
 * substitute for this route: Gemini is `POST /v1beta/models/{model}:generateContent`
 * returning `candidates[0].content.parts[].inlineData.data`, where this route speaks
 * OpenRouter's `POST {baseUrl}/images` → `data[0].b64_json`. Repointing
 * `SHOP_IMAGE_AI_BASE_URL` at Google would be a code change, not an env change.
 *
 * Two halves, and the split matters:
 *
 *  - `GET`  — capability + quota, so the client can decide what to render. This is
 *             what lets the Generate button be *absent* when the feature is off,
 *             rather than present and failing.
 *  - `POST` — one image, capped per vendor per 24h.
 *
 * Modelled on `src/app/api/support/assistant/route.ts` (env pair with defaults,
 * attribution headers, the same error path) with two deliberate differences:
 *
 *  1. **This costs money per call.** There is no free image tier — unlike the
 *     support assistant's `:free` text model — so a daily cap is load-bearing, not
 *     a nicety. It is enforced from a durable table, never from client state.
 *  2. **The provider's output is untrusted.** It is a remote service's bytes on
 *     their way into our Storage bucket, so it clears the exact same magic-byte
 *     validation an uploaded file does, via the shared `src/lib/image-bytes.ts`.
 *
 * Endpoint note: OpenRouter's image API is `POST {baseUrl}/images`, **not**
 * `/images/generations`, and it returns base64 inline (`data[0].b64_json`) with no
 * `url` field at all. There is therefore no remote image URL to fetch — which is
 * also why there is no server-side URL-fetch path here to worry about.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/hosts";
import {
  ALLOWED_TYPES,
  MAX_SIZE_BYTES,
  SHOP_ASSETS_BUCKET,
  extForMimeType,
  sniffImageType,
} from "@/lib/image-bytes";

export const runtime = "nodejs";
// Image generation is a 10–40s round trip. `maxDuration` stays comfortably above
// REQUEST_TIMEOUT_MS so a slow provider ends as our own clean 504 with a message,
// not as the platform killing the function mid-flight with nothing to say.
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_DAILY_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 50_000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const APP_NAME = "GreenPack";

const GenerateSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Describe your shop first.")
    .max(300, "Keep the description under 300 characters."),
  // Optional, and only ever stored after we confirm the caller owns it.
  shopId: z.string().uuid().nullable().optional(),
});

type ImageConfig = { apiKey: string; model: string; baseUrl: string };

/**
 * `null` when the feature is off — which is the default, and the reason the
 * button can be hidden rather than shown broken.
 *
 * `SHOP_IMAGE_AI_MODEL` has **no fallback on purpose**. A text model id is
 * harmless to guess wrong (the support assistant ships with a `:free` default);
 * an image model id that guesses wrong either 400s or silently bills at a rate
 * nobody chose. Requiring it explicitly means an unconfigured deploy generates
 * nothing and costs nothing.
 */
function imageConfig(): ImageConfig | null {
  const apiKey = process.env.SHOP_IMAGE_AI_API_KEY;
  const model = process.env.SHOP_IMAGE_AI_MODEL;
  if (!apiKey || !model) return null;
  const baseUrl = (process.env.SHOP_IMAGE_AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { apiKey, model, baseUrl };
}

function dailyLimit(): number {
  const raw = Number.parseInt(process.env.SHOP_IMAGE_AI_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_LIMIT;
}

/**
 * The vendor's description is untrusted text on its way into a model prompt, so it
 * is fenced rather than concatenated bare: framing goes after it, and the framing
 * is what asks for a listing-shaped image. Sent as prompt text rather than as
 * `aspect_ratio`/`size` parameters because provider support for those varies and
 * an unsupported parameter is a hard 400 — a sentence works everywhere.
 */
function buildPrompt(description: string): string {
  return `${description}

A clean, well-lit product photograph for a shop listing on an online marketplace.
Landscape 4:3 framing, uncluttered background, natural colours.
No text, no logos, no watermarks.`;
}

type ImageApiResponse = {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  usage?: { cost?: number };
};

type AdminClient = ReturnType<typeof createAdminClient>;

/** Rows this owner created in the last 24h — the cap's numerator. */
async function usageLast24h(admin: AdminClient, ownerId: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await admin
    .from("shop_image_generations")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * `GET` — is the feature on, and how much of today's quota is left.
 *
 * Never throws for a missing ledger: an unusable quota is reported as
 * `available: false`, which the client renders as "Google link only". That is the
 * honest state, and it fails closed — a button shown against a table that does not
 * exist would only fail later, in POST, after the vendor had typed a description.
 */
export async function GET() {
  const limit = dailyLimit();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, available: false, used: 0, limit, error: "Sign in required" },
      { status: 401 }
    );
  }

  const config = imageConfig();
  if (!config) {
    return NextResponse.json({ success: true, available: false, used: 0, limit });
  }

  try {
    const used = await usageLast24h(createAdminClient(), user.id);
    return NextResponse.json({ success: true, available: true, used, limit });
  } catch (err) {
    console.error("GET /api/seller/shop/image — usage lookup failed", err);
    return NextResponse.json({ success: true, available: false, used: 0, limit });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Sign in required" }, { status: 401 });
    }

    const config = imageConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: "AI image generation is not available right now." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      // Same shape as the assistant route, but flattened to a single string: this
      // one is rendered inline under a textarea, not mapped over a form's fields.
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json(
        { success: false, error: typeof first === "string" ? first : "Invalid request." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const limit = dailyLimit();

    let used: number;
    try {
      used = await usageLast24h(admin, user.id);
    } catch (err) {
      console.error("POST /api/seller/shop/image — usage lookup failed", err);
      return NextResponse.json(
        { success: false, error: "AI image generation is not available right now." },
        { status: 503 }
      );
    }

    // The cap is what bounds spend, so it is checked before the paid call and
    // counted from the ledger the service role alone can write — a vendor cannot
    // reset it (no DELETE policy on `shop_image_generations`).
    if (used >= limit) {
      return NextResponse.json(
        {
          success: false,
          used,
          limit,
          // No "see the link below": the link's position relative to this message
          // is the client's layout decision, so the copy must not assume one.
          error: `You've used all ${limit} free AI images for today. You can make one with Google instead, then upload it here.`,
        },
        { status: 429 }
      );
    }

    // Attribute the row to a shop only when the caller actually owns it. A bad or
    // foreign id is dropped rather than rejected: the image itself is fine, and
    // `shop_id` is bookkeeping.
    let shopId: string | null = null;
    const requestedShopId = parsed.data.shopId ?? null;
    if (requestedShopId) {
      const { data: owned } = await admin
        .from("shops")
        .select("id")
        .eq("id", requestedShopId)
        .eq("owner_id", user.id)
        .maybeSingle();
      shopId = owned?.id ?? null;
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          // OpenRouter recommends attribution headers; harmless elsewhere.
          "HTTP-Referer": siteUrl("/"),
          "X-Title": APP_NAME,
        },
        body: JSON.stringify({ model: config.model, prompt: buildPrompt(parsed.data.description) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      console.error("POST /api/seller/shop/image — provider request failed", err);
      return NextResponse.json(
        {
          success: false,
          error: timedOut
            ? "Image generation took too long. Please try again, or make one with Google instead."
            : "Could not reach the image generator. Please try again, or make one with Google instead.",
        },
        { status: 504 }
      );
    }

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      // 402 is the provider's "this account has no credit"; 401/403 is a key that is
      // missing, revoked, or not permitted for the model. All three are billing or
      // configuration states on *our* side, and none of them can be fixed by the
      // vendor. They must not reach the content branch below, whose advice ("try
      // describing it differently") would be a lie the vendor could act on forever
      // without ever succeeding.
      const notOurVendorsFault =
        response.status === 402 || response.status === 401 || response.status === 403;
      // Logged in full, returned in outline: provider error bodies can carry
      // account and quota detail that is ours, not the vendor's.
      console.error(
        `POST /api/seller/shop/image — provider ${response.status}: ${raw.slice(0, 300)}` +
          (notOurVendorsFault
            ? "  ← account-level failure (no credit / bad key), not the vendor's prompt"
            : "")
      );
      return NextResponse.json(
        {
          success: false,
          error:
            response.status === 429
              ? "The image generator is busy right now. Please try again shortly, or make one with Google instead."
              : notOurVendorsFault
                ? "Image generation isn't available right now. Make one with Google instead, then upload it here."
                : "The image generator could not make that image. Try describing it differently, or make one with Google instead.",
        },
        { status: 502 }
      );
    }

    const payload = (await response.json().catch(() => null)) as ImageApiResponse | null;
    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("POST /api/seller/shop/image — provider returned no b64_json");
      return NextResponse.json(
        { success: false, error: "The image generator returned nothing. Please try again." },
        { status: 502 }
      );
    }

    // ── Untrusted bytes from here down ──────────────────────────────────────
    // Identical treatment to an upload: a non-image, a truncated payload, or a
    // disguised HTML/SVG document is rejected before it can reach Storage. The
    // declared `media_type` is ignored for the same reason `file.type` is.
    const buffer = Buffer.from(b64, "base64");
    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "The generated image was too large. Please try again." },
        { status: 502 }
      );
    }
    const sniffedType = sniffImageType(buffer);
    if (!sniffedType || !ALLOWED_TYPES.includes(sniffedType)) {
      console.error("POST /api/seller/shop/image — provider output failed the magic-byte check");
      return NextResponse.json(
        { success: false, error: "The image generator returned an unusable file. Please try again." },
        { status: 502 }
      );
    }

    // `<userId>/shops/generated/…` rather than a bare `shops/generated/…`, so every
    // object in the bucket keeps the same `<userId>/…` first segment that
    // `/api/upload` guarantees — one shape to reason about, and one a future
    // bucket policy can key on.
    const path = `${user.id}/shops/generated/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extForMimeType(sniffedType)}`;

    const { error: uploadError } = await admin.storage
      .from(SHOP_ASSETS_BUCKET)
      .upload(path, buffer, { contentType: sniffedType, cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("POST /api/seller/shop/image — storage upload failed", uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message || "Could not save the generated image." },
        { status: 500 }
      );
    }

    const { data: publicData } = admin.storage.from(SHOP_ASSETS_BUCKET).getPublicUrl(path);
    if (!publicData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: "Could not resolve the generated image URL." },
        { status: 500 }
      );
    }

    // The ledger write is what makes the cap real, so a failure here is logged
    // loudly — but it does not fail the request. The generation has already been
    // billed; discarding it would spend the vendor's quota and the money and hand
    // back nothing. Both writes go through the same service-role client, so one
    // succeeding and the other failing is close to impossible, and this path is
    // monitored rather than silent.
    const cost = payload?.usage?.cost;
    if (typeof cost === "number") {
      console.log(
        `shop-image generation: model=${config.model} cost_usd=${cost} owner=${user.id}`
      );
    }
    const { error: logError } = await admin.from("shop_image_generations").insert({
      owner_id: user.id,
      shop_id: shopId,
      model: config.model,
      cost_usd: typeof cost === "number" ? cost : null,
    });
    if (logError) {
      console.error("POST /api/seller/shop/image — usage ledger write failed", logError);
    }

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      path,
      used: used + 1,
      limit,
    });
  } catch (err) {
    console.error("POST /api/seller/shop/image", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Image generation failed." },
      { status: 500 }
    );
  }
}
