import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flutterwaveCheckSubaccount } from "@/lib/flutterwave";
import { z } from "zod";

const OrderItemSchema = z.object({
  shop_id: z.string().uuid(),
  item_type: z.enum(["product", "service"]),
  // Required: server re-fetches the row to enforce canonical price/name.
  item_id: z.string().uuid(),
  name: z.string(),
  // `price` is accepted from the client only as a display hint; the server
  // recomputes it from the products/services table before persisting.
  price: z.number().positive(),
  quantity: z.number().int().positive().max(99),
  image: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const CreateOrderSchema = z.object({
  total_amount: z.number().positive(),
  subtotal: z.number().nonnegative().optional(),
  delivery_fee: z.number().nonnegative().optional(),
  delivery_distance_km: z.number().nonnegative().nullable().optional(),
  customer_info: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    address: z.string().optional(),
    message: z.string().optional(),
    // Coords from the customer's selected delivery address — used to compute
    // courier distance + navigation on the delivery record.
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
  }),
  needs_delivery: z.boolean().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items, ...orderData } = parsed.data;

    // SECURITY: recompute every line-item price server-side from the canonical
    // products/services row. Client-supplied `price` is ignored to prevent
    // payment-amount tampering (audit issue: a customer could send price=1 for
    // a ₦50,000 item and pay ₦1). The server uses item_id + item_type as the
    // source of truth.
    const productIds = items
      .filter((i) => i.item_type === "product" && i.item_id)
      .map((i) => i.item_id as string);
    const serviceIds = items
      .filter((i) => i.item_type === "service" && i.item_id)
      .map((i) => i.item_id as string);

    const [productRows, serviceRows] = await Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("id, price, shop_id, name").in("id", productIds)
        : Promise.resolve({ data: [] as Array<{ id: string; price: number; shop_id: string; name: string }>, error: null }),
      serviceIds.length > 0
        ? supabase.from("services").select("id, price, shop_id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] as Array<{ id: string; price: number; shop_id: string; name: string }>, error: null }),
    ]);

    if (productRows.error) throw productRows.error;
    if (serviceRows.error) throw serviceRows.error;

    const priceByProductId = new Map((productRows.data ?? []).map((r) => [r.id, r]));
    const priceByServiceId = new Map((serviceRows.data ?? []).map((r) => [r.id, r]));

    const verifiedItems: typeof items = [];
    let verifiedSubtotal = 0;
    for (const item of items) {
      if (!item.item_id) {
        return NextResponse.json(
          { success: false, error: `Missing item_id for ${item.item_type} '${item.name}'` },
          { status: 400 }
        );
      }
      const source =
        item.item_type === "product"
          ? priceByProductId.get(item.item_id)
          : priceByServiceId.get(item.item_id);
      if (!source) {
        return NextResponse.json(
          { success: false, error: `${item.item_type} not found: ${item.item_id}` },
          { status: 400 }
        );
      }
      if (source.shop_id !== item.shop_id) {
        return NextResponse.json(
          { success: false, error: `shop_id mismatch for ${item.item_type} ${item.item_id}` },
          { status: 400 }
        );
      }
      const canonicalPrice = Number(source.price);
      verifiedSubtotal += canonicalPrice * item.quantity;
      verifiedItems.push({
        ...item,
        name: source.name,
        price: canonicalPrice,
      });
    }

    // ── Payment readiness ────────────────────────────────────────────────────
    // A shop can only take an order once its vendor holds a live Flutterwave
    // subaccount. This check used to live in
    // /api/payments/flutterwave/initialize, which runs *after* the order row
    // exists — so an unpayable shop still produced a pending/unpaid order and
    // the customer hit a payment error instead of a checkout error. Validate
    // first and write nothing that cannot be paid.
    const shopIds = Array.from(new Set(verifiedItems.map((item) => item.shop_id)));
    const { data: orderShops, error: orderShopsError } = await supabase
      .from("shops")
      .select("id, name, flutterwave_subaccount_id")
      .in("id", shopIds);
    if (orderShopsError) throw orderShopsError;

    const shopById = new Map((orderShops ?? []).map((shop) => [shop.id, shop]));
    const unpayable: string[] = [];
    let missingShop = false;

    for (const id of shopIds) {
      const shop = shopById.get(id);
      if (!shop) {
        missingShop = true;
        continue;
      }
      if (!shop.flutterwave_subaccount_id) {
        unpayable.push(shop.name);
        continue;
      }
      // Non-null is not the same as valid. A subaccount created under a
      // different Flutterwave account still reads as set but is rejected at
      // payment time, so confirm it against the provider.
      const check = await flutterwaveCheckSubaccount(shop.flutterwave_subaccount_id);
      if (check.status === "not_found") {
        unpayable.push(shop.name);
        // Clear the dead ID so the shop is honestly reported as not
        // payment-enabled and its vendor is prompted to redo payout setup.
        // Admin client: shops are owner-writable only under RLS.
        await createAdminClient()
          .from("shops")
          .update({
            flutterwave_subaccount_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shop.id);
      }
      // status "unavailable" means the provider is unreachable — fall through
      // and let initialize surface it rather than blocking checkout outright.
    }

    if (missingShop) {
      return NextResponse.json(
        {
          success: false,
          error: "A shop in your cart is no longer available. Please remove it and try again.",
        },
        { status: 409 }
      );
    }

    if (unpayable.length > 0) {
      const label = unpayable.join(", ");
      return NextResponse.json(
        {
          success: false,
          error:
            unpayable.length === 1
              ? `${label} can't accept payments yet — the vendor still needs to finish payout setup, so this order wasn't placed.`
              : `These shops can't accept payments yet: ${label}. Remove them from your cart to continue.`,
        },
        { status: 409 }
      );
    }

    const verifiedDeliveryFee = Number(orderData.delivery_fee ?? 0);
    const verifiedTotal = verifiedSubtotal + verifiedDeliveryFee;

    // Create order with SERVER-COMPUTED totals (ignore body total_amount/subtotal).
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        ...orderData,
        total_amount: verifiedTotal,
        subtotal: verifiedSubtotal,
        delivery_fee: verifiedDeliveryFee,
        customer_id: user.id,
        payment_provider: "flutterwave",
        payment_currency: "NGN",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items with verified prices.
    const { error: itemsError } = await supabase.from("order_items").insert(
      verifiedItems.map((item) => ({ ...item, order_id: order.id }))
    );

    if (itemsError) {
      // Best-effort cleanup so failed item writes do not leave orphan orders.
      await supabase.from("orders").delete().eq("id", order.id).eq("customer_id", user.id);
      throw itemsError;
    }

    // Note: Delivery creation moved to payment verification step
    // (only create delivery AFTER payment is confirmed)

    // Return order with items
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    return NextResponse.json({ success: true, data: fullOrder }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders", err);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (shopId) {
      const role = profile?.role;
      if (!role || !["vendor", "admin"].includes(role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      if (role !== "admin") {
        const { data: shop, error: shopError } = await supabase
          .from("shops")
          .select("owner_id")
          .eq("id", shopId)
          .single();

        if (shopError || !shop || shop.owner_id !== user.id) {
          return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
      }

      query = supabase
        .from("orders")
        .select("*, order_items!inner(*)")
        .eq("order_items.shop_id", shopId)
        .order("created_at", { ascending: false });
    } else {
      query = query.eq("customer_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/orders", err);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
