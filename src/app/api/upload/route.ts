import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "shop-assets";

function safeFolder(input: string | null): string {
  if (!input) return "misc";
  return input
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 100) || "misc";
}

function extFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
}

/**
 * Detect the real image type from magic bytes. The client-supplied `file.type`
 * is trivially spoofable, so we never trust it for the content check — a file
 * disguised as image/png but actually HTML/SVG would be rejected here.
 */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // "RIFF"
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }
  return null;
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

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = safeFolder(formData.get("folder") as string | null);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type (${file.type || "unknown"}). Use JPEG, PNG, WebP, or GIF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate by content, not the client-declared MIME. Reject anything whose
    // bytes aren't one of the allowed image formats, and store using the
    // sniffed type so the object is always served as a real image.
    const sniffedType = sniffImageType(buffer);
    if (!sniffedType || !ALLOWED_TYPES.includes(sniffedType)) {
      return NextResponse.json(
        { success: false, error: "File content is not a recognized image." },
        { status: 400 }
      );
    }

    const ext = extFromName(file.name || "upload.jpg");
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: sniffedType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("POST /api/upload — storage upload failed", uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
    if (!publicData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: "Could not resolve public URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: publicData.publicUrl, path });
  } catch (err) {
    console.error("POST /api/upload", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
