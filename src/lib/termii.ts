/**
 * Termii SMS utility — Nigerian SMS API for courier notifications.
 * Docs: https://developers.termii.com
 */

const TERMII_BASE_URL = "https://api.ng.termii.com/api";
const TERMII_SENDER_ID = "GreenPack";

export async function sendSMS(to: string, message: string): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY;

  if (!apiKey || apiKey === "your_termii_api_key") {
    console.log(`[SMS Mock] To: ${to} | Message: ${message}`);
    return;
  }

  // Normalize Nigerian phone number to international format
  const normalized = normalizePhone(to);

  const payload = {
    to: normalized,
    from: TERMII_SENDER_ID,
    sms: message,
    type: "plain",
    api_key: apiKey,
    channel: "generic",
  };

  const res = await fetch(`${TERMII_BASE_URL}/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Termii SMS failed: ${err}`);
  }
}

export async function notifyCouriersOfJob(
  jobId: string,
  courierPhones: string[]
): Promise<void> {
  const message = `GreenPack: New delivery job available! Job #${jobId.slice(0, 8).toUpperCase()}. Log in to accept: greenpackdelight.com/courier/dashboard`;
  await Promise.all(courierPhones.map((phone) => sendSMS(phone, message)));
}

export async function notifyCustomerCourierAssigned(
  customerPhone: string,
  courierName: string,
  courierPhone: string
): Promise<void> {
  const message = `GreenPack: Your courier ${courierName} (${courierPhone}) is on the way to pick up your item. Track your delivery at greenpackdelight.com`;
  await sendSMS(customerPhone, message);
}

export async function notifyVendorItemArrived(
  vendorPhone: string,
  orderRef: string
): Promise<void> {
  const message = `GreenPack: A courier has arrived with order #${orderRef}. Please hand over the item. Thank you!`;
  await sendSMS(vendorPhone, message);
}

export async function notifyCustomerDeliveryComplete(
  customerPhone: string,
  orderRef: string
): Promise<void> {
  const message = `GreenPack: Your order #${orderRef} has been delivered successfully. We hope you're satisfied! Rate your experience at greenpackdelight.com`;
  await sendSMS(customerPhone, message);
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "234" + cleaned.slice(1);
  }
  if (cleaned.startsWith("234")) return cleaned;
  return cleaned;
}
