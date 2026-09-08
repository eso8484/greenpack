import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateFeeBreakdown } from "@/lib/utils";
import { flutterwaveCreatePaymentLink } from "@/lib/flutterwave";

const InitializeSchema = z.object({
  orderId: z.string().uuid(),
  email: z.string().email(),
  customerName: z.string().trim().min(1).max(120).optional(),
  phoneNumber: z.string().trim().min(3).max(30).optional(),
});

export async function POST(request: Request) {
  try {
    if (!process.env.FLW_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "FLW_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = InitializeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, total_amount, payment_status, delivery_fee, subtotal")
      .eq("id", parsed.data.orderId)
      .single();
    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (order.customer_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (order.payment_status === "paid") {
      return NextResponse.json(
        { success: false, error: "Order is already paid" },
        { status: 409 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("shop_id, price, quantity")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;
    if (!items?.length) {
      return NextResponse.json(
        { success: false, error: "Order has no items" },
        { status: 400 }
      );
    }

    const shopIds = Array.from(new Set(items.map((item) => item.shop_id)));
    if (shopIds.length !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Order contains items from multiple shops. Please check out one shop at a time.",
        },
        { status: 400 }
      );
    }

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, flutterwave_subaccount_id")
      .eq("id", shopIds[0])
      .single();
    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found for this order" },
        { status: 404 }
      );
    }
    if (!shop.flutterwave_subaccount_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor is not yet payment-enabled. Please contact support.",
        },
        { status: 400 }
      );
    }

    const itemsSubtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity ?? 1),
      0
    );
    const deliveryFee = Number(order.delivery_fee ?? 0);
    const subtotal =
      Number(order.subtotal) > 0
        ? Number(order.subtotal)
        : itemsSubtotal > 0
          ? itemsSubtotal
          : Math.max(0, Number(order.total_amount) - deliveryFee);
    const breakdown = calculateFeeBreakdown(subtotal, deliveryFee);
    if (!Number.isFinite(breakdown.total) || breakdown.total <= 0) {
      return NextResponse.json(
        { success: false, error: "Order amount is invalid for payment" },
        { status: 400 }
      );
    }

    // Keep the full checkout calculation before asking the payment provider to
    // create a link. It is re-validated on the return/webhook verification.
    const { error: preUpdateError } = await supabase
      .from("orders")
      .update({
        subtotal: breakdown.subtotal,
        delivery_fee: breakdown.deliveryFee,
        platform_fee: breakdown.platformFee,
        vendor_payout: breakdown.vendorPayout,
        courier_payout: breakdown.courierPayout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("customer_id", user.id);
    if (preUpdateError) throw preUpdateError;

    const reference = `gpf_${order.id.replace(/-/g, "")}_${Date.now()}`;
    const callbackUrl = `${new URL(request.url).origin}/checkout`;
    const platformAndDeliveryFee = breakdown.platformFee + breakdown.deliveryFee;
    const payment = await flutterwaveCreatePaymentLink({
      txRef: reference,
      amount: breakdown.total,
      currency: "NGN",
      redirectUrl: callbackUrl,
      customer: {
        email: parsed.data.email,
        name: parsed.data.customerName,
        phoneNumber: parsed.data.phoneNumber,
      },
      // Flutterwave sends the subaccount the remainder after this commission;
      // the platform retains its fee plus the delivery fee for courier payout.
      subaccounts: [
        {
          id: shop.flutterwave_subaccount_id,
          transaction_charge_type: "flat",
          transaction_charge: platformAndDeliveryFee,
        },
      ],
      meta: {
        order_id: order.id,
        customer_id: order.customer_id,
        shop_id: shop.id,
        subtotal: breakdown.subtotal,
        delivery_fee: breakdown.deliveryFee,
        platform_fee: breakdown.platformFee,
        vendor_payout: breakdown.vendorPayout,
        courier_payout: breakdown.courierPayout,
        total: breakdown.total,
      },
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_provider: "flutterwave",
        payment_currency: "NGN",
        payment_reference: reference,
        payment_metadata: {
          flutterwave_payment_link: payment.link,
          flutterwave_subaccount_id: shop.flutterwave_subaccount_id,
          platform_and_delivery_fee: platformAndDeliveryFee,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("customer_id", user.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: { authorization_url: payment.link, reference },
    });
  } catch (err) {
    console.error("POST /api/payments/flutterwave/initialize", err);
    return NextResponse.json(
      { success: false, error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
