import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { success: false, error: "PAYSTACK_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const { reference } = await params;
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Payment reference is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: profile }, { data: order, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("orders")
        .select("id, customer_id, payment_status, status")
        .eq("payment_reference", reference)
        .single(),
    ]);

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.customer_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        data: { orderId: order.id, payment_status: "paid", order_status: order.status },
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackPayload = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackPayload.status || !paystackPayload.data) {
      return NextResponse.json(
        {
          success: false,
          error:
            typeof paystackPayload.message === "string"
              ? paystackPayload.message
              : "Unable to verify transaction",
        },
        { status: 502 }
      );
    }

    const transactionStatus = paystackPayload.data.status as string;
    if (transactionStatus !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment status is '${transactionStatus}', not successful yet`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const nextOrderStatus = order.status === "pending" ? "confirmed" : order.status;

    // Update order payment status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: nextOrderStatus,
        payment_provider: "paystack",
        payment_verified_at: now,
        payment_metadata: paystackPayload.data,
        updated_at: now,
      })
      .eq("id", order.id);

    if (updateError) throw updateError;

    // Create delivery if order needs delivery and payment is now confirmed
    const { data: fullOrder, error: fetchError } = await supabase
      .from("orders")
      .select("needs_delivery, customer_info, id")
      .eq("id", order.id)
      .single();

    if (fetchError) throw fetchError;

    if (fullOrder?.needs_delivery && fullOrder.customer_info) {
      const deliveryAddress = fullOrder.customer_info.address || "";
      const { error: deliveryError } = await supabase
        .from("deliveries")
        .insert({
          order_id: order.id,
          pickup_address: {
            address: deliveryAddress,
            instructions: fullOrder.customer_info.message || "",
          },
          delivery_address: {
            address: deliveryAddress,
            instructions: fullOrder.customer_info.message || "",
          },
          courier_fee: 0,
          status: "pending",
          created_at: now,
        });

      if (deliveryError) {
        console.error("Failed to create delivery after payment verification", {
          orderId: order.id,
          error: deliveryError,
        });
        // Log error but don't fail the payment verification - order is already paid
      }
    }

    return NextResponse.json({
      success: true,
      data: { orderId: order.id, payment_status: "paid", order_status: nextOrderStatus },
    });
  } catch (err) {
    console.error("POST /api/payments/paystack/verify/[reference]", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
