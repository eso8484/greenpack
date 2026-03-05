import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const OrderItemSchema = z.object({
  shop_id: z.string().uuid(),
  item_type: z.enum(["product", "service"]),
  item_id: z.string().uuid().optional(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  image: z.string().optional(),
  notes: z.string().optional(),
});

const CreateOrderSchema = z.object({
  total_amount: z.number().positive(),
  customer_info: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    address: z.string().optional(),
    message: z.string().optional(),
  }),
  needs_delivery: z.boolean().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
  delivery: z
    .object({
      pickup_address: z.record(z.string(), z.unknown()),
      delivery_address: z.record(z.string(), z.unknown()),
      courier_fee: z.number(),
      pickup_time: z.string().optional(),
      special_instructions: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items, delivery, ...orderData } = parsed.data;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        ...orderData,
        customer_id: user?.id ?? null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({ ...item, order_id: order.id }))
    );

    if (itemsError) throw itemsError;

    // Create delivery record if needed
    if (orderData.needs_delivery && delivery) {
      await supabase.from("deliveries").insert({
        order_id: order.id,
        ...delivery,
        status: "pending",
      });
    }

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

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (shopId) {
      // Vendor viewing their shop orders
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
