import { createAdminClient } from "@/lib/supabase/admin";
import { buildDeliveryNodes } from "@/lib/delivery";

interface FulfillFlutterwavePaymentParams {
  orderId: string;
  reference: string;
  transaction: Record<string, unknown>;
}

interface FulfilledOrder {
  orderId: string;
  orderStatus: string;
  alreadyPaid: boolean;
}

/**
 * Mark a verified Flutterwave payment as paid and create its delivery work.
 *
 * This is used by both the customer return flow and the webhook so they share
 * the same fulfilment rules. It is deliberately idempotent: a second provider
 * notification only returns the existing paid order.
 */
export async function fulfillFlutterwavePayment(
  params: FulfillFlutterwavePaymentParams
): Promise<FulfilledOrder> {
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status, payment_status, needs_delivery, customer_info, delivery_fee")
    .eq("id", params.orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  if (order.payment_status === "paid") {
    return {
      orderId: order.id,
      orderStatus: order.status,
      alreadyPaid: true,
    };
  }

  const now = new Date().toISOString();
  const nextOrderStatus = order.status === "pending" ? "confirmed" : order.status;
  const { data: updatedOrder, error: updateError } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: nextOrderStatus,
      payment_provider: "flutterwave",
      payment_reference: params.reference,
      payment_verified_at: now,
      payment_metadata: params.transaction,
      updated_at: now,
    })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  // The customer return and the provider webhook can arrive together. Only the
  // request that changed `unpaid` → `paid` creates delivery rows.
  if (!updatedOrder) {
    const { data: current, error: currentError } = await admin
      .from("orders")
      .select("status, payment_status")
      .eq("id", order.id)
      .single();
    if (currentError || !current) throw new Error("Order payment update failed");
    if (current.payment_status !== "paid") {
      throw new Error("Order payment update failed");
    }
    return {
      orderId: order.id,
      orderStatus: current.status,
      alreadyPaid: true,
    };
  }

  if (order.needs_delivery && order.customer_info) {
    await createDeliveryIfNeeded({
      admin,
      orderId: order.id,
      customerInfo: order.customer_info,
      courierFee: Number(order.delivery_fee ?? 0),
      now,
    });
  }

  return {
    orderId: order.id,
    orderStatus: nextOrderStatus,
    alreadyPaid: false,
  };
}

async function createDeliveryIfNeeded({
  admin,
  orderId,
  customerInfo,
  courierFee,
  now,
}: {
  admin: ReturnType<typeof createAdminClient>;
  orderId: string;
  customerInfo: Record<string, unknown>;
  courierFee: number;
  now: string;
}): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);
  if (existingError) throw existingError;
  if ((existing?.length ?? 0) > 0) return;

  const { data: orderItems, error: orderItemsError } = await admin
    .from("order_items")
    .select("item_type, item_id, shop_id")
    .eq("order_id", orderId);
  if (orderItemsError) throw orderItemsError;

  const serviceIds = (orderItems ?? [])
    .filter((item) => item.item_type === "service" && item.item_id)
    .map((item) => item.item_id as string);

  let hasPickupReturn = false;
  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await admin
      .from("services")
      .select("service_type")
      .in("id", serviceIds);
    if (servicesError) throw servicesError;
    hasPickupReturn = (services ?? []).some(
      (service) => service.service_type === "pickup_return"
    );
  }

  const shopId = (orderItems ?? []).find((item) => item.shop_id)?.shop_id as
    | string
    | undefined;
  let shopRow = null;
  if (shopId) {
    const { data, error: shopError } = await admin
      .from("shops")
      .select("name, lat, lng, location, contact")
      .eq("id", shopId)
      .single();
    if (shopError) throw shopError;
    shopRow = data;
  }

  const { customerNode, shopNode } = await buildDeliveryNodes(customerInfo, shopRow);
  const perLegFee = Math.round((courierFee / 2) * 100) / 100;
  const { error: deliveryError } = hasPickupReturn
    ? await admin.from("deliveries").insert([
        {
          order_id: orderId,
          pickup_address: customerNode,
          shop_address: shopNode,
          delivery_address: customerNode,
          courier_fee: perLegFee,
          leg: "pickup",
          status: "pending",
          created_at: now,
        },
        {
          order_id: orderId,
          pickup_address: customerNode,
          shop_address: shopNode,
          delivery_address: customerNode,
          courier_fee: perLegFee,
          leg: "return",
          status: "pending",
          created_at: now,
        },
      ])
    : await admin.from("deliveries").insert({
        order_id: orderId,
        pickup_address: customerNode,
        shop_address: shopNode,
        delivery_address: customerNode,
        courier_fee: courierFee,
        leg: "single",
        status: "pending",
        created_at: now,
      });

  if (deliveryError) throw deliveryError;
}

/** Stamp the parent order after every delivery leg has been paid to its courier. */
export async function markOrderCourierPaidIfSettled(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: legs, error } = await admin
    .from("deliveries")
    .select("paid_to_courier_at")
    .eq("order_id", orderId);
  if (error) throw error;
  if (!legs?.length || !legs.every((leg) => leg.paid_to_courier_at)) return;

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("orders")
    .update({ courier_paid_at: now, updated_at: now })
    .eq("id", orderId)
    .is("courier_paid_at", null);
  if (updateError) throw updateError;
}
