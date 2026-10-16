/**
 * Image-byte validation, shared by every route that stores an image.
 *
 * Two callers, one rule: `/api/upload` (a vendor's file) and
 * `/api/seller/shop/image` (bytes returned by an image model). The second is the
 * reason this is shared at all — a model's output is untrusted input exactly like
 * an uploaded file, so it must clear the same check before it reaches Storage.
 */

/** Storage bucket every shop image lands in. */
export const SHOP_ASSETS_BUCKET = "shop-assets";

export const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Detect the real image type from magic bytes. A client-supplied `file.type` —
 * and, for generated images, a provider's declared content type — is trivially
 * spoofable, so we never trust either for the content check: a file disguised as
 * image/png but actually HTML/SVG is rejected here.
 */
export function sniffImageType(buf: Buffer): string | null {
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

/** File extension for a MIME type `sniffImageType()` returned. */
export function extForMimeType(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/** Extension from a user-supplied filename, for the upload path. */
export function extFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
}
