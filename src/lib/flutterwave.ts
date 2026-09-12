/**
 * Flutterwave REST API helpers.
 *
 * All helpers require `FLW_SECRET_KEY` and run on the server only. Keeping
 * provider calls here prevents secret-key handling from leaking into routes or
 * client components.
 */

export const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

function getSecret(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) {
    throw new Error("FLW_SECRET_KEY is not configured");
  }
  return key;
}

interface FlutterwaveResponse<T> {
  status: "success" | "error" | string;
  message?: string;
  data?: T | null;
}

async function flutterwaveFetch<T>(
  path: string,
  init: RequestInit & { method?: string } = {}
): Promise<T> {
  const response = await fetch(`${FLUTTERWAVE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: FlutterwaveResponse<T>;
  try {
    payload = (await response.json()) as FlutterwaveResponse<T>;
  } catch {
    throw new Error(
      `Flutterwave returned an invalid response (status ${response.status})`
    );
  }

  if (!response.ok || payload.status !== "success" || payload.data == null) {
    throw new Error(
      typeof payload.message === "string" && payload.message.length > 0
        ? payload.message
        : `Flutterwave request failed (status ${response.status})`
    );
  }

  return payload.data;
}

// ─── Hosted payments ───────────────────────────────────────────────────────

export interface CreateFlutterwavePaymentParams {
  txRef: string;
  amount: number;
  currency: "NGN";
  redirectUrl: string;
  customer: {
    email: string;
    name?: string;
    phoneNumber?: string;
  };
  subaccounts?: Array<{
    id: string;
    transaction_charge_type: "flat";
    transaction_charge: number;
  }>;
  meta?: Record<string, unknown>;
}

export interface FlutterwavePaymentLink {
  link: string;
}

/** Create a Flutterwave Standard hosted checkout link. Amounts are in naira. */
export async function flutterwaveCreatePaymentLink(
  params: CreateFlutterwavePaymentParams
): Promise<FlutterwavePaymentLink> {
  return flutterwaveFetch<FlutterwavePaymentLink>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: String(params.amount),
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customer.email,
        ...(params.customer.name ? { name: params.customer.name } : {}),
        ...(params.customer.phoneNumber
          ? { phonenumber: params.customer.phoneNumber }
          : {}),
      },
      customizations: {
        title: "Green Pack Delight payment",
      },
      ...(params.subaccounts?.length
        ? { subaccounts: params.subaccounts }
        : {}),
      ...(params.meta ? { meta: params.meta } : {}),
    }),
  });
}

export interface FlutterwaveTransaction {
  id: number | string;
  tx_ref: string;
  amount: number | string;
  currency: string;
  status: string;
  [key: string]: unknown;
}

/** Verify the final state of a Flutterwave payment or charge. */
export async function flutterwaveVerifyTransaction(
  transactionId: string | number
): Promise<FlutterwaveTransaction> {
  return flutterwaveFetch<FlutterwaveTransaction>(
    `/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    { method: "GET" }
  );
}

// ─── Bank accounts and marketplace subaccounts ─────────────────────────────

export interface FlutterwaveBank {
  id?: number;
  code: string;
  name: string;
  [key: string]: unknown;
}

/** List Nigerian banks supported by Flutterwave. */
export async function flutterwaveListBanks(): Promise<FlutterwaveBank[]> {
  return flutterwaveFetch<FlutterwaveBank[]>("/banks/NG", { method: "GET" });
}

export interface FlutterwaveResolvedAccount {
  account_number: string;
  account_name: string;
}

/** Resolve a Nigerian account number against its Flutterwave bank code. */
export async function flutterwaveResolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<FlutterwaveResolvedAccount> {
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Account number must be 10 digits");
  }
  if (!bankCode) {
    throw new Error("Bank code is required");
  }

  return flutterwaveFetch<FlutterwaveResolvedAccount>("/accounts/resolve", {
    method: "POST",
    body: JSON.stringify({
      account_number: accountNumber,
      account_bank: bankCode,
    }),
  });
}

export interface FlutterwaveSubaccount {
  id: number;
  subaccount_id: string;
  account_number: string;
  account_bank: string;
  full_name?: string;
  bank_name?: string;
}

export interface CreateFlutterwaveSubaccountParams {
  accountBank: string;
  accountNumber: string;
  businessName: string;
  businessEmail: string;
  businessMobile: string;
}

/**
 * Create a collection subaccount for a vendor. The default 3% split is a
 * safety net; each checkout overrides it with the exact platform + delivery
 * fee for that order.
 */
export async function flutterwaveCreateSubaccount(
  params: CreateFlutterwaveSubaccountParams
): Promise<FlutterwaveSubaccount> {
  return flutterwaveFetch<FlutterwaveSubaccount>("/subaccounts", {
    method: "POST",
    body: JSON.stringify({
      account_bank: params.accountBank,
      account_number: params.accountNumber,
      business_name: params.businessName,
      business_email: params.businessEmail,
      business_mobile: params.businessMobile,
      country: "NG",
      split_type: "percentage",
      split_value: 0.03,
    }),
  });
}

export type FlutterwaveSubaccountCheck =
  | { status: "valid"; subaccount: FlutterwaveSubaccount }
  | { status: "not_found" }
  | { status: "unavailable"; message: string };

const SUBACCOUNT_PAGE_SIZE = 100;
// A single merchant accumulates one subaccount per shop, so this ceiling is
// far above any real account. Hitting it means something is unusual, and the
// caller is told "unavailable" rather than "gone" — see below.
const SUBACCOUNT_MAX_PAGES = 10;

interface FlutterwaveListResponse<T> {
  status: string;
  message?: string;
  data?: T[] | null;
}

/**
 * Confirm a stored subaccount still exists for the merchant behind the current
 * secret key.
 *
 * Subaccount IDs are scoped to the Flutterwave account that created them, so a
 * key switch (sandbox ↔ live, or a different merchant) leaves stale IDs in the
 * database that look valid — non-null — but are rejected later when the payment
 * link is created. Callers must distinguish a definite "not found" from a
 * provider outage: only the former means the stored ID is genuinely dead.
 *
 * Deliberately does NOT use `GET /subaccounts/:id`. That endpoint answers
 * `400 {"message":"Subaccount not found"}` even for a subaccount that exists
 * and is returned by the list endpoint, so trusting it reports every live
 * subaccount as dead — which would block checkout for correctly-configured
 * shops and clear their stored IDs. The list endpoint is authoritative, so we
 * page through it and look for the ID.
 */
export async function flutterwaveCheckSubaccount(
  subaccountId: string
): Promise<FlutterwaveSubaccountCheck> {
  try {
    for (let page = 1; page <= SUBACCOUNT_MAX_PAGES; page++) {
      const response = await fetch(
        `${FLUTTERWAVE_BASE_URL}/subaccounts?page=${page}&size=${SUBACCOUNT_PAGE_SIZE}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${getSecret()}`,
            "Content-Type": "application/json",
          },
        }
      );

      const payload = (await response.json()) as FlutterwaveListResponse<FlutterwaveSubaccount>;
      if (!response.ok || payload.status !== "success") {
        return {
          status: "unavailable",
          message:
            payload.message ?? `Flutterwave request failed (status ${response.status})`,
        };
      }

      // A merchant with no subaccounts answers with `data: null`, not `[]`.
      const pageItems = Array.isArray(payload.data) ? payload.data : [];
      const match = pageItems.find((s) => s.subaccount_id === subaccountId);
      if (match) return { status: "valid", subaccount: match };

      // A short page means we reached the end of the merchant's list, so the
      // ID genuinely is not theirs.
      if (pageItems.length < SUBACCOUNT_PAGE_SIZE) {
        return { status: "not_found" };
      }
    }

    // Scanned the ceiling without finding it. Report inconclusive rather than
    // "not_found" so callers never clear a possibly-live ID on a technicality.
    return {
      status: "unavailable",
      message: `Scanned ${SUBACCOUNT_PAGE_SIZE * SUBACCOUNT_MAX_PAGES} subaccounts without finding ${subaccountId}`,
    };
  } catch (err) {
    return {
      status: "unavailable",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Courier transfers ─────────────────────────────────────────────────────

export interface FlutterwaveTransfer {
  id: number | string;
  reference: string;
  status: string;
  complete_message?: string;
  [key: string]: unknown;
}

export interface InitiateFlutterwaveTransferParams {
  accountBank: string;
  accountNumber: string;
  amountNaira: number;
  narration: string;
  reference: string;
  callbackUrl?: string;
}

/** Start an NGN transfer to a courier's verified bank account. */
export async function flutterwaveInitiateTransfer(
  params: InitiateFlutterwaveTransferParams
): Promise<FlutterwaveTransfer> {
  if (!Number.isFinite(params.amountNaira) || params.amountNaira <= 0) {
    throw new Error("Transfer amount must be a positive number");
  }

  return flutterwaveFetch<FlutterwaveTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      account_bank: params.accountBank,
      account_number: params.accountNumber,
      amount: params.amountNaira,
      narration: params.narration,
      currency: "NGN",
      debit_currency: "NGN",
      reference: params.reference,
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
    }),
  });
}
