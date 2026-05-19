import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const supabase = await createClient();

    // Detect UUID first — Postgres raises invalid_text_representation when a
    // slug like "my-shop" is compared against the UUID id column, which
    // previously short-circuited the slug fallback and caused 404s.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId);

    let data: Record<string, unknown> | null = null;

    if (isUuid) {
      const res = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .maybeSingle();
      if (!res.error && res.data) data = res.data;
    }

    if (!data) {
      const res = await supabase
        .from("shops")
        .select("*")
        .eq("slug", shopId)
        .maybeSingle();
      if (res.error && isUuid) {
        // Both lookups failed with errors — surface
        throw res.error;
      }
      data = res.data ?? null;
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/shops/[shopId]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch shop" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Fetch existing shop to compare location & determine if we need to (re)geocode
    const { data: existing } = await supabase
      .from("shops")
      .select("location, lat, lng")
      .eq("id", shopId)
      .eq("owner_id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("shops")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", shopId)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: "Shop not found or not yours" }, { status: 404 });
    }

    // Decide whether we need to (re)geocode
    const oldLoc = (existing?.location ?? {}) as {
      address?: string;
      city?: string;
      state?: string;
    };
    const newLoc = (data.location ?? {}) as {
      address?: string;
      city?: string;
      state?: string;
    };
    const addressChanged =
      oldLoc.address !== newLoc.address ||
      oldLoc.city !== newLoc.city ||
      oldLoc.state !== newLoc.state;
    const missingCoords =
      existing?.lat == null || existing?.lng == null || data.lat == null || data.lng == null;

    if ((addressChanged || missingCoords) && (newLoc.address || newLoc.city || newLoc.state)) {
      try {
        const geo = await geocodeAddress(
          newLoc.address ?? "",
          newLoc.city,
          newLoc.state
        );
        if (geo) {
          const admin = createAdminClient();
          const { data: updated, error: geoUpdateError } = await admin
            .from("shops")
            .update({ lat: geo.lat, lng: geo.lng, updated_at: new Date().toISOString() })
            .eq("id", shopId)
            .select()
            .single();
          if (geoUpdateError) {
            console.warn("Failed to persist geocoded coords for shop", shopId, geoUpdateError);
          } else if (updated) {
            return NextResponse.json({ success: true, data: updated });
          }
        } else {
          console.warn("Geocoding returned no result for shop", shopId, newLoc);
        }
      } catch (geoErr) {
        console.warn("Geocoding failed for shop", shopId, geoErr);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PUT /api/shops/[shopId]", err);
    return NextResponse.json({ success: false, error: "Failed to update shop" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("shops")
      .delete()
      .eq("id", shopId)
      .eq("owner_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/shops/[shopId]", err);
    return NextResponse.json({ success: false, error: "Failed to delete shop" }, { status: 500 });
  }
}
